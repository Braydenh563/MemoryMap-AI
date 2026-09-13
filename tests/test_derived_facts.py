"""The derived facts pipeline, past what `test_learned_spec.py` pins.

The spec covers the lifecycle a person meets: list, edit, delete, reset,
switch off, forget, export. This file covers the four things underneath it
that the spec cannot see and that each cost something the last time they were
got wrong somewhere else in this app: the span really is a span, the budget
really stops the pass, a runner really reads its switch, and a derived row
does not make its note undeletable.
"""

from __future__ import annotations

from sqlalchemy import func, select

from memorymap.ai import facts
from memorymap.core.database import DerivedFact


def _entry(client, content: str) -> dict:
    return client.post("/entries", json={"content": content}).json()


def test_every_span_points_at_its_own_text(ai_client, fake_ollama):
    content = (
        "The batch size should stay at 32. Should we move to 64? "
        "The batch size should stay at 32. That is the whole argument, twice."
    )
    saved = _entry(ai_client, content)
    ai_client.post("/night/run", json={"budget": 2000})
    rows = ai_client.get("/learned").json()["items"]
    assert rows
    for row in rows:
        start, end = row["span"]
        assert content[start:end] == row["text"], row
        assert row["entry_id"] == saved["id"]


def test_a_sentence_repeated_in_one_note_is_one_fact(ai_client, fake_ollama):
    """The reason the offsets are carried rather than re-found afterwards.

    A note that says the same thing twice has two spans and one fact; a
    pipeline that searched for the model's wording afterwards would either
    make two identical rows or point both at the first occurrence.
    """
    _entry(ai_client, "The batch size should stay at 32. The batch size should stay at 32.")
    ai_client.post("/night/run", json={"budget": 2000})
    texts = [row["text"] for row in ai_client.get("/learned?kind=claim").json()["items"]]
    assert texts.count("The batch size should stay at 32.") == 1


def test_the_budget_stops_the_pass_and_says_so(ai_client, fake_ollama):
    for i in range(12):
        _entry(ai_client, f"Note {i}. The deployment window should always be a Tuesday morning.")
    reply = ai_client.post("/night/run", json={"budget": facts.TOKENS_PER_NOTE * 3}).json()
    assert reply["stopped_reason"] == "budget"
    assert reply["scanned"] == 3
    assert reply["tokens_spent"] <= facts.TOKENS_PER_NOTE * 3
    # And the notes it never reached are still waiting, not silently declared
    # read: the next pass with room picks them up.
    again = ai_client.post("/night/run", json={"budget": 10_000}).json()
    assert again["scanned"] >= 9


def test_a_second_pass_with_nothing_new_derives_nothing(ai_client, fake_ollama):
    _entry(ai_client, "The deployment window should always be a Tuesday morning.")
    first = ai_client.post("/night/run", json={"budget": 2000}).json()
    assert first["derived"] > 0
    second = ai_client.post("/night/run", json={"budget": 2000}).json()
    assert second["derived"] == 0


def test_the_night_switch_is_read_before_every_pass(ai_client, fake_ollama):
    _entry(ai_client, "The deployment window should always be a Tuesday morning.")
    assert ai_client.put("/learned/switches", json={"night_shift": False}).json()["night_shift"] is False
    assert ai_client.post("/night/run", json={"budget": 2000}).json() == {"paused": True}
    ai_client.put("/learned/switches", json={"night_shift": True})
    assert ai_client.post("/night/run", json={"budget": 2000}).json()["derived"] > 0


def test_the_master_switch_stops_the_resurfacing_runner(ai_client, fake_ollama, session):
    from memorymap.ai import resurface
    from memorymap.core.database import NoteScore

    for i in range(3):
        _entry(ai_client, f"a note about bread number {i}")
    assert resurface.compute_scores(session) > 0
    session.query(NoteScore).delete()
    session.commit()

    ai_client.put("/learned/switches", json={"paused": True})
    assert resurface.compute_scores(session) == 0
    assert session.scalar(select(func.count()).select_from(NoteScore)) == 0


def test_an_unknown_switch_is_refused_rather_than_stored(ai_client):
    refused = ai_client.put("/learned/switches", json={"telepathy": True})
    assert refused.status_code == 422
    assert "telepathy" in refused.json()["detail"]


def test_forgetting_needs_the_confirmation(ai_client, fake_ollama):
    _entry(ai_client, "The deployment window should always be a Tuesday morning.")
    ai_client.post("/night/run", json={"budget": 2000})
    assert ai_client.request("DELETE", "/learned", json={"confirm": False}).status_code == 400
    assert ai_client.get("/learned").json()["items"]


def test_a_note_with_derived_facts_can_still_be_deleted(ai_client, fake_ollama, session):
    """The class of bug that made three of four parents undeletable.

    `PRAGMA foreign_keys=ON` is set, so a `derived_facts` row left pointing at
    a purged note is a 500 and a note that will not go away.
    """
    saved = _entry(ai_client, "The deployment window should always be a Tuesday morning.")
    ai_client.post("/night/run", json={"budget": 2000})
    assert session.scalar(select(func.count()).select_from(DerivedFact)) > 0

    assert ai_client.delete(f"/entries/{saved['id']}").status_code in (200, 204)
    purged = ai_client.delete(f"/entries/{saved['id']}/purge")
    assert purged.status_code in (200, 204), purged.text
    session.expire_all()
    assert session.scalar(select(func.count()).select_from(DerivedFact)) == 0


def test_a_binned_notes_facts_leave_the_listing(ai_client, fake_ollama):
    saved = _entry(ai_client, "The deployment window should always be a Tuesday morning.")
    ai_client.post("/night/run", json={"budget": 2000})
    assert ai_client.get("/learned").json()["items"]
    ai_client.delete(f"/entries/{saved['id']}")
    assert ai_client.get("/learned").json()["items"] == []


def test_a_note_with_no_claim_in_it_derives_nothing(ai_client, fake_ollama):
    _entry(ai_client, "milk, bread, eggs, coffee, a birthday card for Sam")
    ai_client.post("/night/run", json={"budget": 2000})
    assert ai_client.get("/learned").json()["items"] == []
