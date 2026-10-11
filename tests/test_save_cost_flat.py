"""A save does not read the notebook (audit 2026-10-05, ARCH-02, ARCH-08, ARCH-20).

Measured at 5,000 notes before this: `POST /entries` 1.7 s p50 for a
400-word note, 0.93 s for one line, and seeding fell from 11 notes a second
at 40 notes to 1 a second at 750. The profile named two pieces of Python that
read the whole notebook on every save:

- `tagging.suggest` read up to 4,000 notes' full text and
  tokenised every one of them to rebuild TF-IDF from scratch (490 ms at 610
  notes);
- `janitor._best_centroid_match` loaded every stored vector as a blob and
  re-averaged every category (539 ms at 610 notes), beside the engine's own
  matrix that already holds them.

The counts below are what a save does in Python per note in the notebook.
They are exact where a timing would be noise on a shared machine, and they
fail on the old shape by a factor of the notebook's size.

ARCH-08: `learning.centroid_excluded` was claimed built (WORLD_CLASS_PLAN I7)
and had no caller; two moves out of a category now keep a no-model save out
of it. ARCH-20: the lexical pass read private notes' ciphertext.
"""

from __future__ import annotations

import json

import numpy as np
import pytest
from fastapi.testclient import TestClient

from memorymap.ai import embeddings as embeddings_module
from memorymap.ai import janitor, lexical_filing, tagging
from memorymap.ai.embeddings import vector_to_bytes
from memorymap.core import deps
from memorymap.core.database import Category, EmbeddingRecord, Entry
from memorymap.search import engine as search_engine
from tests.fakes import FakeEmbeddingService, FakeOllama

#: Notes seeded before the measured save. Large enough that one read per
#: note is unmistakable against the bound, small enough to seed in a blink.
NOTES = 400
#: What one save may tokenise or decode: its own text and a handful more.
BOUND = 40


@pytest.fixture()
def no_model_client(app_state):
    """Embeddings up, no chat model: the path where filing is by meaning."""
    from memorymap.api.app import create_app

    deps.override_ai(ollama=FakeOllama(running=False), embeddings=FakeEmbeddingService(available=True))
    return TestClient(create_app())


def _seed(n: int) -> None:
    rng = np.random.default_rng(7)
    with deps.get_db().session() as session:
        categories = []
        for name in ("Work", "Home", "Health", "Errands", "Ideas"):
            category = Category(name=name)
            session.add(category)
            categories.append(category)
        session.flush()
        for index in range(n):
            category = categories[index % len(categories)]
            entry = Entry(
                content=f"note {index} about {category.name.lower()} and the garden budget plan",
                category_id=category.id,
                tags=json.dumps([category.name.lower(), f"t{index % 7}"]),
                ai_confidence=80,
            )
            session.add(entry)
            session.flush()
            vector = rng.normal(size=4).astype("float32")
            session.add(
                EmbeddingRecord(
                    entry_id=entry.id,
                    embedding=vector_to_bytes(vector),
                    dim=4,
                    model_version="fake:keywords-v1",
                )
            )
        session.commit()


def _counting(monkeypatch, module, name: str) -> list[int]:
    calls = [0]
    real = getattr(module, name)

    def counted(*args, **kwargs):  # noqa: ANN002, ANN003, ANN202
        calls[0] += 1
        return real(*args, **kwargs)

    monkeypatch.setattr(module, name, counted)
    return calls


def test_a_save_reads_a_bounded_amount_of_the_notebook(no_model_client, monkeypatch):
    _seed(NOTES)
    # The first save may build what later saves reuse.
    assert no_model_client.post("/entries", json={"content": "warm up the garden budget plan"}).status_code == 201
    tokenised = _counting(monkeypatch, lexical_filing, "tokens")
    decoded = _counting(monkeypatch, embeddings_module, "bytes_to_vector")
    rebuilt = _counting(monkeypatch, search_engine, "_load_all_vectors")
    labelled = _counting(monkeypatch, janitor, "_labelled_vectors")
    reply = no_model_client.post("/entries", json={"content": "a garden budget note for the spring"})
    assert reply.status_code == 201
    assert labelled[0] == 1, "filing by meaning was not reached, so this measured nothing"
    assert tokenised[0] <= BOUND, f"a save tokenised {tokenised[0]} texts with {NOTES} notes"
    assert decoded[0] <= BOUND, f"a save decoded {decoded[0]} stored vectors with {NOTES} notes"
    assert rebuilt[0] == 0, "a save rebuilt the vector matrix from the table"


def test_tag_suggestions_follow_an_edit_without_a_rebuild(no_model_client):
    """The cache behind the suggestions sees a note's new tags: an edit made
    after the first save is what the second save's suggestions are from."""
    first = no_model_client.post("/entries", json={"content": "sourdough starter feeding schedule", "tags": ["baking"]}).json()
    no_model_client.post("/entries", json={"content": "sourdough loaf crumb and starter", "tags": ["baking"]})
    no_model_client.put(f"/entries/{first['id']}", json={"tags": ["bread"]})
    with deps.get_db().session() as session:
        #: The note says both tags' words: a tag it has no word for is never
        #: offered (WORLD_CLASS 23, decision 5).
        suggested = tagging.suggest(session, "starter for the sourdough bread, a baking day", have=[])
    assert "bread" in suggested and "baking" in suggested


def test_two_moves_out_of_a_category_keep_a_no_model_save_out_of_it(no_model_client):
    """I7's consumer, at the route: the centroid and the neighbours may not
    choose a category the person has twice moved notes like this one out of."""
    client = no_model_client
    # "buy milk" notes read as shopping to the fake embedder (axis 1).
    for text in ("buy milk", "buy eggs", "buy groceries"):
        client.post("/entries", json={"content": text, "category": "Work"})
    # Errands also holds a joke, so its average sits off the shopping axis
    # and Work, untouched by the moves, is strictly the closer centroid: the
    # only thing that can keep the next note out of Work is the corrections.
    client.post("/entries", json={"content": "a pun about a scarecrow", "category": "Errands"})
    moved = []
    for text in ("buy milk for the office", "buy eggs for the team"):
        note = client.post("/entries", json={"content": text, "category": "Work"}).json()
        with deps.get_db().session() as session:
            session.get(Entry, note["id"]).filing_state = "auto"
            session.commit()
        moved.append(note["id"])
    for entry_id in moved:
        assert client.put(f"/entries/{entry_id}", json={"category": "Errands"}).status_code == 200
    after = client.post("/entries", json={"content": "buy milk and groceries"}).json()
    assert after["category"] != "Work"


def test_the_lexical_pass_never_reads_a_private_note(app_state):
    with deps.get_db().session() as session:
        category = Category(name="Gym")
        session.add(category)
        session.flush()
        for _ in range(3):
            session.add(Entry(content="squats deadlift bench", category_id=category.id, tags='["lifting"]'))
        session.add(
            Entry(content="squats secretword", category_id=category.id, tags='["secrettag"]', is_private=True)
        )
        session.commit()
        suggested = tagging.suggest(session, "squats, lifting and secretword", have=[])
    assert "secrettag" not in suggested
    assert "lifting" in suggested
