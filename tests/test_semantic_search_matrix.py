"""`semantic_search` reads the engine's matrix, not the embeddings table.

WORLD_CLASS_PLAN row 1 (F3, §16): the Ask and chat path selected and parsed
every stored vector on every request (24.5 ms median at 5,000 notes of 384
floats, measured 2026-09-24 by `scratchpad/bench_semantic.py`). It now scores
against the process-level matrix `search/engine.py` keeps, which the writes
keep in step and a cheap fingerprint of the table catches up with when a
write went round the ORM (a bulk `delete()` statement).

What these pin, besides "no blob is read per request": the two behaviours the
old scan grew and the matrix must keep. A model swapped inside one backend
leaves rows at the old width (stacking them raised and took every search down
once), and vectors from another backend never score.
"""
from __future__ import annotations

import json

import numpy as np
import pytest
from sqlalchemy import delete, event

from memorymap.ai.embeddings import EmbeddingService
from memorymap.core.database import EmbeddingRecord, Entry
from memorymap.search import engine, search_manager


def _note(session, content):
    entry = Entry(content=content, tags=json.dumps([]))
    session.add(entry)
    session.commit()
    return entry


class _Blobs:
    """Counts statements that read the `embedding` column itself."""

    def __init__(self, session):
        self.statements: list[str] = []
        self._engine = session.get_bind()
        event.listen(self._engine, "before_cursor_execute", self._seen)

    def _seen(self, conn, cursor, statement, params, context, executemany):  # noqa: ANN001
        lowered = statement.lower()
        if "embeddings.embedding" in lowered and lowered.lstrip().startswith("select"):
            self.statements.append(statement)

    def close(self):
        event.remove(self._engine, "before_cursor_execute", self._seen)


@pytest.fixture()
def blobs(session):
    counter = _Blobs(session)
    yield counter
    counter.close()


@pytest.fixture()
def notes(session, fake_embeddings):
    """Eight notes over the fake's four topics, embedded, matrix warm."""
    contents = [
        "a joke about a pun",
        "another joke, funny",
        "bread and a recipe for dinner",
        "cooking a soup recipe",
        "a meeting about the project deadline",
        "work on the project plan",
        "something else entirely",
        "yet another unrelated thought",
    ]
    made = [_note(session, text) for text in contents]
    for entry in made:
        assert fake_embeddings.store_for_entry(session, entry)
    engine.warm_vectors(session, fake_embeddings.backend_id())
    return made


def _scan_only(monkeypatch):
    """Force the table scan, for comparing the two paths."""
    monkeypatch.setattr(engine, "vector_view", lambda *a, **k: None)


def test_a_warm_matrix_means_no_vector_is_read_per_request(session, fake_embeddings, notes, blobs):
    search_manager.semantic_search(session, "tell me a joke", fake_embeddings)  # settles
    blobs.statements.clear()
    for _ in range(3):
        results = search_manager.semantic_search(session, "tell me a joke", fake_embeddings)
        assert results
    assert blobs.statements == [], blobs.statements


def test_the_matrix_answers_what_the_table_scan_answers(session, fake_embeddings, notes, monkeypatch):
    queries = ["tell me a joke", "what is for dinner", "the project deadline", "zzz"]
    fast = {
        q: [(e.id, round(s, 5)) for e, s in search_manager.semantic_search(session, q, fake_embeddings)]
        for q in queries
    }
    _scan_only(monkeypatch)
    slow = {
        q: [(e.id, round(s, 5)) for e, s in search_manager.semantic_search(session, q, fake_embeddings)]
        for q in queries
    }
    assert fast == slow
    assert fast["tell me a joke"], "the comparison must compare something"


def test_a_new_note_is_found_without_a_rescan(session, fake_embeddings, notes, blobs):
    search_manager.semantic_search(session, "funny", fake_embeddings)
    entry = _note(session, "the funniest pun I heard")
    fake_embeddings.store_for_entry(session, entry)
    search_manager.semantic_search(session, "funny", fake_embeddings)  # settles
    blobs.statements.clear()
    found = [e.id for e, _s in search_manager.semantic_search(session, "funny joke", fake_embeddings)]
    assert entry.id in found
    assert blobs.statements == []


def test_an_edited_note_scores_on_its_new_vector(session, fake_embeddings, notes):
    bread = notes[2]
    assert bread.id in [e.id for e, _ in search_manager.semantic_search(session, "recipe", fake_embeddings, limit=20)]
    bread.content = "a pun, a joke, something funny"
    session.commit()
    # The entries route's own shape: a bulk delete the ORM hook cannot see,
    # then a fresh vector stored.
    session.execute(delete(EmbeddingRecord).where(EmbeddingRecord.entry_id == bread.id))
    session.commit()
    fake_embeddings.store_for_entry(session, bread)
    assert bread.id not in [e.id for e, _ in search_manager.semantic_search(session, "recipe", fake_embeddings, limit=20)]
    assert bread.id in [e.id for e, _ in search_manager.semantic_search(session, "joke", fake_embeddings, limit=20)]


def test_a_vector_deleted_round_the_orm_leaves_the_matrix(session, fake_embeddings, notes):
    """A bulk `delete()` (the purge, a category re-embed, a failed re-embed)
    never reaches the flush hook; the table's fingerprint does."""
    joke = notes[0]
    assert joke.id in [e.id for e, _ in search_manager.semantic_search(session, "joke", fake_embeddings, limit=20)]
    session.execute(delete(EmbeddingRecord).where(EmbeddingRecord.entry_id == joke.id))
    session.commit()
    assert joke.id not in [e.id for e, _ in search_manager.semantic_search(session, "joke", fake_embeddings, limit=20)]
    assert joke.id not in engine.vectors_by_id(session)


def test_a_rolled_back_vector_is_not_left_in_the_matrix(session, fake_embeddings, notes):
    """The flush hook runs before the commit: a rollback after it must not
    leave a vector the table never kept."""
    stray = _note(session, "unrelated words here")
    session.add(
        EmbeddingRecord(
            entry_id=stray.id,
            embedding=np.array([1.0, 0, 0, 0], dtype="float32").tobytes(),
            dim=4,
            model_version=fake_embeddings.backend_id(),
        )
    )
    session.flush()
    session.rollback()
    assert stray.id not in [e.id for e, _ in search_manager.semantic_search(session, "joke", fake_embeddings, limit=20)]


class _Width(EmbeddingService):
    """One backend whose model can be swapped for one of another width."""

    def __init__(self, width: int) -> None:
        super().__init__(model_manager=None, ollama_client=None)  # type: ignore[arg-type]
        self.width = width

    def backend_id(self) -> str:
        return "test:width"

    def active_model(self) -> str:
        return f"width-{self.width}"

    def is_ready(self) -> bool:
        return True

    def embed_text(self, text: str):
        vector = np.zeros(self.width, dtype="float32")
        vector[0 if "alpha" in text else 1] = 1.0
        return vector


def _stored(session, entry, vector, backend="test:width"):
    session.add(
        EmbeddingRecord(
            entry_id=entry.id,
            embedding=np.asarray(vector, dtype="float32").tobytes(),
            dim=len(vector),
            model_version=backend,
        )
    )
    session.commit()


def test_rows_of_another_width_are_skipped_and_a_minority_width_still_answers(session, blobs):
    """Mid-reindex: most rows at width 4, two already at width 3. A width-4
    query scores the width-4 rows from the matrix; a width-3 query falls back
    to the scan, which keeps only its own width, rather than failing."""
    wide = [_note(session, f"alpha note {n}") for n in range(6)]
    narrow = [_note(session, f"alpha short {n}") for n in range(2)]
    for entry in wide:
        _stored(session, entry, [1, 0, 0, 0])
    for entry in narrow:
        _stored(session, entry, [1, 0, 0])
    four = _Width(4)
    engine.warm_vectors(session, four.backend_id())

    found = {e.id for e, _ in search_manager.semantic_search(session, "alpha", four, limit=20)}
    assert found == {entry.id for entry in wide}

    three = _Width(3)
    found = {e.id for e, _ in search_manager.semantic_search(session, "alpha", three, limit=20)}
    assert found == {entry.id for entry in narrow}


def test_a_reindex_to_a_new_width_moves_the_matrix_with_it(session, blobs):
    """After the reindex finishes, the new width is the matrix, and a query
    stops reading the table once it has caught up."""
    entries = [_note(session, f"alpha {n}") for n in range(6)]
    for entry in entries:
        _stored(session, entry, [1, 0, 0, 0])
    engine.warm_vectors(session, "test:width")
    three = _Width(3)
    for entry in entries:
        session.execute(delete(EmbeddingRecord).where(EmbeddingRecord.entry_id == entry.id))
        session.commit()
        three.store_for_entry(session, entry)
    search_manager.semantic_search(session, "alpha", three, limit=20)  # catches up
    blobs.statements.clear()
    found = {e.id for e, _ in search_manager.semantic_search(session, "alpha", three, limit=20)}
    assert found == {entry.id for entry in entries}
    assert blobs.statements == []


def test_vectors_from_another_backend_never_score(session):
    mine = [_note(session, f"alpha {n}") for n in range(4)]
    theirs = [_note(session, f"alpha other {n}") for n in range(4)]
    for entry in mine:
        _stored(session, entry, [1, 0, 0, 0])
    for entry in theirs:
        _stored(session, entry, [1, 0, 0, 0], backend="another:backend")
    found = {e.id for e, _ in search_manager.semantic_search(session, "alpha", _Width(4), limit=20)}
    assert found == {entry.id for entry in mine}


def test_the_scan_is_the_fallback_when_the_matrix_cannot_be_had(session, fake_embeddings, notes, monkeypatch):
    def broken(*_a, **_k):
        raise RuntimeError("no matrix")

    monkeypatch.setattr(engine, "current_matrix", broken)
    assert search_manager.semantic_search(session, "tell me a joke", fake_embeddings)
