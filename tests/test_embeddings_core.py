"""Embeddings: mixed vector dimensions and orphaned-vector cleanup.

Split out of test_antigravity_regressions.py (§40). Grouped separately from
test_semantic_search.py/test_embedding_errors.py because these guard
`embeddings.py`'s own internals rather than the search API surface built on
top of them.
"""

from __future__ import annotations

import json

import numpy as np

from memorymap.ai import embeddings
from memorymap.core.database import Entry


def _note(session, content="a note", tags=None, private=False):
    entry = Entry(content=content, tags=json.dumps(tags or []), is_private=private)
    session.add(entry)
    session.commit()
    return entry


def test_similar_pairs_survives_a_half_finished_reindex():
    """Switching embedding model leaves both widths in the table at once.
    Stacking them raised on the ragged list, which took out the graph's
    similarity edges and link suggestions entirely rather than degrading."""
    vectors = {
        1: np.array([1.0, 0.0, 0.0], dtype="float32"),
        2: np.array([1.0, 0.0, 0.0], dtype="float32"),
        3: np.array([1.0, 0.0], dtype="float32"),  # the odd width out
    }
    pairs = embeddings.similar_pairs(vectors, 0.5)
    assert [(a, b) for a, b, _ in pairs] == [(1, 2)]


def test_similar_pairs_returns_its_best_match_first():
    vectors = {
        1: np.array([1.0, 0.0], dtype="float32"),
        2: np.array([1.0, 0.0], dtype="float32"),
        3: np.array([0.8, 0.6], dtype="float32"),
    }
    scores = [score for _, _, score in embeddings.similar_pairs(vectors, 0.5)]
    assert scores == sorted(scores, reverse=True)


def test_similar_pairs_never_pairs_a_note_with_itself():
    vectors = {i: np.array([1.0, 0.0], dtype="float32") for i in range(4)}
    for a, b, _ in embeddings.similar_pairs(vectors, 0.5):
        assert a != b


def test_orphaned_vectors_are_actually_removed(app_state, session):
    """`clean_orphaned_vectors` was called by the background pass and never
    written; the call sat in a `try/except` wide enough to swallow the
    AttributeError, so the cleanup reported as running and never ran."""
    from sqlalchemy import text

    from memorymap.core import deps
    from memorymap.core.database import EmbeddingRecord

    entry = _note(session, "a real note")
    gone = _note(session, "about to be purged")
    for target in (entry, gone):
        session.add(
            EmbeddingRecord(
                entry_id=target.id, embedding=b"\x00" * 8, dim=2, model_version="fake"
            )
        )
    session.commit()

    # How an orphan is really made: the recycle bin's purge hard-deletes the
    # entry row and nothing touches its vector. Foreign keys are on, so the
    # delete has to go round them the same way the purge's raw SQL does.
    session.execute(text("PRAGMA foreign_keys=OFF"))
    session.execute(text("DELETE FROM entries WHERE id = :id"), {"id": gone.id})
    session.commit()
    session.execute(text("PRAGMA foreign_keys=ON"))

    assert embeddings.clean_orphaned_vectors(deps.get_db().session) == 1
    session.expire_all()
    remaining = [r.entry_id for r in session.query(EmbeddingRecord).all()]
    assert remaining == [entry.id]
