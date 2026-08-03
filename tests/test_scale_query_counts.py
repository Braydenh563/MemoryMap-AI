"""Regression test for the two N+1 patterns the roadmap's scale-test found
and fixed (ANALYSIS.md §34): `routes_graph.graph()` was resolving each
entry's category with its own query, and `search_manager.semantic_search()`
materialised a full `Entry` ORM object for every embedded note just to score
and discard most of them. `scripts/scale_test.py` measured both as multi-
second, N-proportional costs at 10k-50k notes; both are now a small, constant
number of queries.

A query *count* rather than a wall-clock timing on purpose: a timing
assertion is flaky under CI load (a slow runner fails a fast function), while
"one query per entry" vs "a fixed handful of queries" is a fact about the
code, not the machine running it.
"""

from __future__ import annotations

import numpy as np
from sqlalchemy import event

from memorymap.ai.embeddings import vector_to_bytes
from memorymap.api import routes_graph
from memorymap.core.database import Category, EmbeddingRecord, Entry
from memorymap.search import search_manager


def _count_queries(session, fn):
    count = 0

    def _before_cursor_execute(*args, **kwargs):
        nonlocal count
        count += 1

    engine = session.get_bind()
    event.listen(engine, "before_cursor_execute", _before_cursor_execute)
    try:
        fn()
    finally:
        event.remove(engine, "before_cursor_execute", _before_cursor_execute)
    return count


def _add_entries(session, n, category_id):
    for i in range(n):
        session.add(Entry(content=f"note {i} about gardens", category_id=category_id))
    session.commit()


def test_graph_endpoint_query_count_does_not_scale_with_entry_count(session):
    category = Category(name="Garden")
    session.add(category)
    session.commit()

    _add_entries(session, 20, category.id)
    small = _count_queries(
        session, lambda: routes_graph.graph(similarity=False, session=session)
    )

    _add_entries(session, 200, category.id)
    large = _count_queries(
        session, lambda: routes_graph.graph(similarity=False, session=session)
    )

    # A handful more is fine — more entries can touch a few more code paths.
    # One extra query *per new entry* (the regression this guards) would be
    # +200, not a handful.
    assert large <= small + 5, (
        f"routes_graph.graph() issued {large} queries for 220 entries vs "
        f"{small} for 20 — looks like the per-entry category lookup is back"
    )


def test_semantic_search_query_count_does_not_scale_with_entry_count(
    session, fake_embeddings
):
    category = Category(name="Garden")
    session.add(category)
    session.commit()

    def _add_embedded_entries(n):
        for i in range(n):
            entry = Entry(content=f"note {i} about gardens", category_id=category.id)
            session.add(entry)
            session.flush()
            session.add(
                EmbeddingRecord(
                    entry_id=entry.id,
                    embedding=vector_to_bytes(np.array([1.0, 0.0, 0.0, 0.0], dtype="float32")),
                    dim=4,
                    model_version=fake_embeddings.backend_id(),
                )
            )
        session.commit()

    _add_embedded_entries(20)
    small = _count_queries(
        session,
        lambda: search_manager.semantic_search(session, "garden", fake_embeddings, limit=5),
    )

    _add_embedded_entries(200)
    large = _count_queries(
        session,
        lambda: search_manager.semantic_search(session, "garden", fake_embeddings, limit=5),
    )

    assert large <= small + 5, (
        f"semantic_search issued {large} queries for 220 embedded entries vs "
        f"{small} for 20 — looks like the per-candidate Entry fetch is back"
    )
