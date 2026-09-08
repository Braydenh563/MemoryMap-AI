"""Resurfacing (WORLD_CLASS_PLAN 15, I4): the spec. Strict-xfail until built.

Three cards a day: notes that are fading (old, unlinked, unopened) and close
to what the person is doing now. The fading score is computed nightly into
`note_scores`; the request-time step multiplies by cosine to a context
vector and drops anything marked "never again" (a correction, I7).
"""

from __future__ import annotations

import pytest

BRIEF = "WORLD_CLASS 15 I4: resurfacing is not built yet"


@pytest.mark.xfail(strict=True, reason=BRIEF)
def test_an_old_unlinked_unopened_note_outranks_a_linked_recent_one(session):
    from datetime import datetime, timedelta

    from memorymap.ai import resurface
    from memorymap.entry import manager

    old = manager.create_entry(session, "interview prep notes from the spring", tags=[])
    old.created_at = datetime.now() - timedelta(days=120)
    fresh = manager.create_entry(session, "notes from today's standup", tags=[])
    other = manager.create_entry(session, "a note linked to today's", tags=[])
    manager.link_entries(session, fresh, other)
    fresh.access_count = 5
    session.commit()
    resurface.compute_scores(session)
    ranked = resurface.ranked(session, limit=10)
    assert [e.id for e in ranked].index(old.id) < [e.id for e in ranked].index(fresh.id)


@pytest.mark.xfail(strict=True, reason=BRIEF)
def test_the_context_vector_reorders_the_top_three(session, fake_embeddings):
    from memorymap.ai import resurface
    from memorymap.entry import manager

    a = manager.create_entry(session, "sourdough starter feeding schedule", tags=[])
    b = manager.create_entry(session, "hiking boots for the weekend trip", tags=[])
    session.commit()
    resurface.compute_scores(session)
    with_context = resurface.for_context(session, context_entry_id=a.id, limit=3)
    assert with_context and with_context[0].id != a.id  # never the context note itself
    assert b.id in [e.id for e in with_context]


@pytest.mark.xfail(strict=True, reason=BRIEF)
def test_never_again_is_honoured_across_restarts(ai_client):
    for i in range(12):
        ai_client.post("/entries", json={"content": f"an old idea number {i} about gardening"})
    ai_client.post("/resurface/compute")
    first = ai_client.get("/resurface").json()["items"]
    assert len(first) == 3
    ai_client.post("/learned/corrections", json={"kind": "dismiss_resurface", "subject": {"entry_id": first[0]["id"]}})
    ai_client.post("/resurface/compute")
    later = ai_client.get("/resurface").json()["items"]
    assert first[0]["id"] not in [item["id"] for item in later]


@pytest.mark.xfail(strict=True, reason=BRIEF)
def test_the_daily_three_are_stable_within_a_day_and_change_across_days(ai_client):
    for i in range(30):
        ai_client.post("/entries", json={"content": f"idea {i} about something forgotten"})
    ai_client.post("/resurface/compute")
    today = ai_client.get("/resurface?as_of=2026-09-08").json()["items"]
    again = ai_client.get("/resurface?as_of=2026-09-08").json()["items"]
    tomorrow = ai_client.get("/resurface?as_of=2026-09-09").json()["items"]
    assert today == again
    assert today != tomorrow


@pytest.mark.xfail(strict=True, reason=BRIEF)
def test_a_small_notebook_returns_nothing_rather_than_the_same_three_forever(ai_client):
    for i in range(5):
        ai_client.post("/entries", json={"content": f"note {i}"})
    ai_client.post("/resurface/compute")
    assert ai_client.get("/resurface").json()["items"] == []


@pytest.mark.xfail(strict=True, reason=BRIEF)
def test_the_endpoint_is_fast_because_scores_are_precomputed(ai_client):
    import time

    for i in range(500):
        ai_client.post("/entries", json={"content": f"idea {i} about topic {i % 20}"})
    ai_client.post("/resurface/compute")
    start = time.perf_counter()
    reply = ai_client.get("/resurface")
    elapsed = time.perf_counter() - start
    assert reply.status_code == 200 and len(reply.json()["items"]) == 3
    assert elapsed < 0.05
