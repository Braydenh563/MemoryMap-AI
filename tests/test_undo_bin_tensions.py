"""Accepting or dismissing a tension can be taken back (INBOX 898)."""

from __future__ import annotations

from datetime import timedelta

from memorymap.ai import tensions
from memorymap.core.database import Entry, EntryLink, utcnow


def _pair(client, session):
    a = client.post("/entries", json={"content": "The launch is in May."}).json()["id"]
    b = client.post("/entries", json={"content": "The launch slipped to August."}).json()["id"]
    session.get(Entry, a).created_at = utcnow() - timedelta(days=30)
    session.commit()
    tensions.record_event(session, tensions.FOUND, a, b, reason="May against August", model="fake", confidence=0.7)
    session.commit()
    return a, b


def _status(client, a, b):
    rows = client.get("/entries/tensions/known", params={"status": "all"}).json()["tensions"]
    return [r["status"] for r in rows if {r["earlier_id"], r["later_id"]} == {a, b}]


def _kinds(client):
    return [c["kind"] for c in client.get("/learned/corrections").json()]


def test_a_dismissal_is_reopened(client, session):
    a, b = _pair(client, session)
    client.post("/entries/tensions/dismiss", json={"earlier_id": a, "later_id": b})
    assert _status(client, a, b) == ["dismissed"]
    assert "dismiss_tension" in _kinds(client)

    reopened = client.post("/entries/tensions/reopen", json={"earlier_id": a, "later_id": b})
    assert reopened.status_code == 200, reopened.text
    assert _status(client, a, b) == ["open"]
    assert "dismiss_tension" not in _kinds(client)
    #: The dismissed list the scan reads no longer holds the pair either.
    assert client.get("/entries/tensions").json()["status"] in ("no_model", "no_embeddings", "ok", "none")


def test_an_accept_that_made_the_link_is_reopened_with_it(client, session):
    a, b = _pair(client, session)
    client.post("/entries/tensions/accept", json={"earlier_id": a, "later_id": b})
    assert session.query(EntryLink).filter_by(link_type="contradicts").count() == 1
    assert _status(client, a, b) == ["accepted"]

    reopened = client.post("/entries/tensions/reopen", json={"earlier_id": a, "later_id": b, "remove_link": True}).json()
    assert reopened["removed_link"] is True
    session.expire_all()
    assert session.query(EntryLink).filter_by(link_type="contradicts").count() == 0
    assert _status(client, a, b) == ["open"]
    assert "accept_tension" not in _kinds(client)


def test_a_link_the_person_already_had_is_left_when_remove_link_is_off(client, session):
    a, b = _pair(client, session)
    client.post(f"/entries/{a}/links", json={"target_id": b, "link_type": "contradicts"})
    client.post("/entries/tensions/accept", json={"earlier_id": a, "later_id": b})
    client.post("/entries/tensions/reopen", json={"earlier_id": a, "later_id": b})
    session.expire_all()
    assert session.query(EntryLink).filter_by(link_type="contradicts").count() == 1
