"""WORLD_CLASS_PLAN section 17 row 2: the librarian proposes how to tidy.

Two kinds of proposal, never applied until the person says so: fold a
category into one whose notes are about the same things, and drop one that has
been empty for 30 days. A category the person made or renamed by hand is never
the thing proposed away, and "keep both" is remembered so the same pair is not
offered twice.
"""

from __future__ import annotations

from datetime import timedelta

import numpy as np
import pytest

from memorymap.ai import tidy
from memorymap.ai.embeddings import EmbeddingService, vector_to_bytes
from memorymap.core import deps
from memorymap.core.database import Category, EmbeddingRecord, Entry, utcnow


class DirectedEmbeddings(EmbeddingService):
    """Vectors chosen by the test, so similarity is exact."""

    def __init__(self):
        super().__init__(model_manager=None, ollama_client=None)  # type: ignore[arg-type]

    def backend_id(self) -> str:
        return "test:directed"

    def is_ready(self) -> bool:
        return True


def _note(session, content, category_name, vector):
    category = session.query(Category).filter_by(name=category_name).one_or_none()
    if category is None:
        category = Category(name=category_name, created_at=utcnow() - timedelta(days=90))
        session.add(category)
        session.flush()
    entry = Entry(content=content, category_id=category.id, ai_confidence=100)
    session.add(entry)
    session.flush()
    session.add(
        EmbeddingRecord(
            entry_id=entry.id,
            embedding=vector_to_bytes(np.array(vector, dtype="float32")),
            dim=len(vector),
            model_version="test:directed",
        )
    )
    session.commit()
    return entry


def _two_alike(session):
    _note(session, "ran 5k", "Running", [1.0, 0.0, 0.0])
    _note(session, "ran 10k", "Running", [0.98, 0.1, 0.0])
    _note(session, "gym leg day", "Fitness", [0.97, 0.12, 0.0])
    _note(session, "gym push day", "Fitness", [0.99, 0.05, 0.0])
    _note(session, "pasta recipe", "Cooking", [0.0, 0.0, 1.0])
    _note(session, "bread recipe", "Cooking", [0.0, 0.1, 0.99])


def test_two_categories_about_the_same_things_are_proposed_for_a_merge(session, app_state):
    _two_alike(session)
    found = tidy.proposals(session, DirectedEmbeddings(), app_state)
    merges = [p for p in found if p["kind"] == "merge"]
    assert len(merges) == 1
    pair = {merges[0]["from"]["name"], merges[0]["into"]["name"]}
    assert pair == {"Running", "Fitness"}
    assert merges[0]["similarity"] >= tidy.MERGE_SIMILARITY
    assert "same things" in merges[0]["reason"]
    # The small one folds into the big one; a tie folds the newer.
    assert merges[0]["from"]["count"] <= merges[0]["into"]["count"]


def test_unlike_categories_are_left_alone(session, app_state):
    _two_alike(session)
    names = {p["from"]["name"] for p in tidy.proposals(session, DirectedEmbeddings(), app_state) if p["kind"] == "merge"}
    assert "Cooking" not in names


def test_a_category_of_one_note_proposes_nothing(session, app_state):
    _note(session, "ran 5k", "Running", [1.0, 0.0, 0.0])
    _note(session, "gym", "Fitness", [1.0, 0.0, 0.0])
    assert tidy.proposals(session, DirectedEmbeddings(), app_state) == []


def test_keep_both_is_remembered_for_the_pair(session, app_state):
    _two_alike(session)
    first = [p for p in tidy.proposals(session, DirectedEmbeddings(), app_state) if p["kind"] == "merge"][0]
    tidy.decline(app_state, "merge", first["from"]["name"], first["into"]["name"])
    assert [p for p in tidy.proposals(session, DirectedEmbeddings(), app_state) if p["kind"] == "merge"] == []
    # Either order is the same pair, and the case does not matter.
    tidy.decline(app_state, "merge", first["into"]["name"].upper(), first["from"]["name"].lower())
    assert len(app_state.get_preference("tidy_declined")) == 1


def test_a_category_renamed_by_hand_is_never_the_one_folded_away(session, app_state):
    _two_alike(session)
    both = {p["from"]["name"] for p in tidy.proposals(session, DirectedEmbeddings(), app_state) if p["kind"] == "merge"}
    (source,) = both
    tidy.remember_hand_name(app_state, source)
    assert [p for p in tidy.proposals(session, DirectedEmbeddings(), app_state) if p["kind"] == "merge"] == []


def test_names_that_are_one_name_are_left_to_the_look_alike_row(session, app_state):
    """The panel already offers Recipe and recipes as one merge (by name)."""
    _note(session, "a", "Recipe", [1.0, 0.0, 0.0])
    _note(session, "b", "Recipe", [1.0, 0.0, 0.0])
    _note(session, "c", "Recipes", [1.0, 0.0, 0.0])
    _note(session, "d", "Recipes", [1.0, 0.0, 0.0])
    assert [p for p in tidy.proposals(session, DirectedEmbeddings(), app_state) if p["kind"] == "merge"] == []


def test_an_empty_category_of_thirty_days_is_proposed_for_removal(session, app_state):
    session.add(Category(name="Old idea", created_at=utcnow() - timedelta(days=45)))
    session.add(Category(name="Fresh", created_at=utcnow() - timedelta(days=3)))
    session.commit()
    removals = [p for p in tidy.proposals(session, DirectedEmbeddings(), app_state) if p["kind"] == "remove"]
    assert [p["category"]["name"] for p in removals] == ["Old idea"]
    assert "empty" in removals[0]["reason"].lower()


def test_the_look_alike_key_matches_the_panels(tmp_path):
    """`tidy.look_alike_key` and tag-manager.js `manageLookAlikeKey` are one
    rule written twice; this runs the JS one on the same names."""
    import json
    import re
    import shutil
    import subprocess
    from pathlib import Path

    node = shutil.which("node")
    if node is None:
        pytest.skip("node is not installed")
    source = (Path(__file__).resolve().parents[1] / "frontend" / "js" / "tag-manager.js").read_text(encoding="utf-8")
    function = re.search(r"function manageLookAlikeKey\(name\) \{.*?\n\}\n", source, re.S).group(0)
    names = ["Recipes", "recipe", "to-do", "ToDo", "Ideas", "idea", "Class", "Classes", "Notes_2", "a.b"]
    script = tmp_path / "key.js"
    script.write_text(function + f"\nconsole.log(JSON.stringify({json.dumps(names)}.map(manageLookAlikeKey)));\n")
    out = subprocess.run([node, str(script)], capture_output=True, text=True, check=True).stdout
    assert json.loads(out) == [tidy.look_alike_key(n) for n in names]


def test_a_category_made_by_hand_is_not_proposed_for_removal(session, app_state):
    session.add(Category(name="Waiting room", created_at=utcnow() - timedelta(days=45)))
    session.commit()
    tidy.remember_hand_name(app_state, "Waiting room")
    assert [p for p in tidy.proposals(session, DirectedEmbeddings(), app_state) if p["kind"] == "remove"] == []


def test_uncategorised_is_never_proposed(session, app_state):
    session.add(Category(name="Uncategorised", created_at=utcnow() - timedelta(days=400)))
    session.commit()
    assert tidy.proposals(session, DirectedEmbeddings(), app_state) == []


# --- the routes -----------------------------------------------------------


@pytest.fixture
def directed(monkeypatch):
    monkeypatch.setattr(deps, "get_embeddings", lambda: DirectedEmbeddings())


def test_the_route_lists_proposals_and_declines_one(client, session, directed):
    _two_alike(session)
    out = client.get("/categories/tidy").json()
    assert [p["kind"] for p in out["proposals"]] == ["merge"]
    first = out["proposals"][0]
    response = client.post(
        "/categories/tidy/decline",
        json={"kind": "merge", "name": first["from"]["name"], "other": first["into"]["name"]},
    )
    assert response.status_code == 200
    assert client.get("/categories/tidy").json()["proposals"] == []


def test_a_rename_by_hand_and_a_new_category_are_remembered(client, session, directed):
    made = client.post("/categories", json={"name": "Hand made"})
    assert made.status_code == 201
    cat = session.query(Category).filter_by(name="Hand made").one()
    cat.created_at = utcnow() - timedelta(days=60)
    session.commit()
    assert client.get("/categories/tidy").json()["proposals"] == []
    other = Category(name="Plain", created_at=utcnow() - timedelta(days=60))
    session.add(other)
    session.commit()
    proposals = client.get("/categories/tidy").json()["proposals"]
    assert [p["category"]["name"] for p in proposals] == ["Plain"]
    # Renaming it by hand keeps it from being proposed away.
    assert client.put(f"/categories/{other.id}", json={"name": "Plain renamed"}).status_code == 200
    assert client.get("/categories/tidy").json()["proposals"] == []


def test_the_route_with_no_vectors_still_offers_removals(client, session, directed):
    session.add(Category(name="Stale", created_at=utcnow() - timedelta(days=45)))
    session.commit()
    out = client.get("/categories/tidy").json()
    assert [p["kind"] for p in out["proposals"]] == ["remove"]
