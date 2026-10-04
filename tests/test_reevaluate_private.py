"""Re-evaluating a private note never reaches the model or the search index
(sweep 1004, item 5): locked it would send ciphertext, unlocked it would send
the plain text of a note whose whole point is that no model reads it."""

from __future__ import annotations

import pytest

from memorymap.ai import janitor, librarian
from memorymap.core import vault
from memorymap.search import search_manager


@pytest.fixture
def open_vault(session):
    vault.close()
    vault.create(session, "test-passphrase")
    session.commit()
    yield
    vault.close()


@pytest.fixture
def arm(monkeypatch):
    """Call after the note exists: creating one files it, which is allowed."""
    calls = []

    def arm_now():
        _arm(monkeypatch, calls)
        return calls

    return arm_now


def _arm(monkeypatch, calls):

    def trip(name):
        def _fn(*args, **kwargs):
            calls.append(name)
            raise AssertionError(f"{name} was called for a private note")

        return _fn

    monkeypatch.setattr(janitor, "categorise", trip("categorise"))
    monkeypatch.setattr(librarian, "suggest_tags", trip("suggest_tags"))
    monkeypatch.setattr(search_manager, "semantic_search", trip("semantic_search"))


def _private_note(client):
    note = client.post("/entries", json={"content": "my diagnosis, in detail"}).json()
    assert client.post(f"/entries/{note['id']}/privacy", json={"private": True}).status_code == 200
    return note


def test_an_unlocked_private_note_is_refused_and_nothing_is_sent(client, open_vault, arm):
    note = _private_note(client)
    tripwires = arm()
    out = client.post(f"/entries/{note['id']}/reevaluate")
    assert out.status_code == 400
    assert "private" in out.json()["detail"].lower()
    assert tripwires == []


def test_a_locked_private_note_is_refused_and_nothing_is_sent(client, open_vault, arm):
    note = _private_note(client)
    vault.close()
    tripwires = arm()
    out = client.post(f"/entries/{note['id']}/reevaluate")
    assert out.status_code in (400, 401, 403, 423)
    assert tripwires == []


def test_a_public_note_is_still_reevaluated(client, monkeypatch):
    note = client.post("/entries", json={"content": "buy milk"}).json()
    seen = []
    monkeypatch.setattr(
        janitor, "categorise", lambda *a, **k: (seen.append("categorise"), (None, 0, "none"))[1]
    )
    assert client.post(f"/entries/{note['id']}/reevaluate").status_code == 200
    assert seen == ["categorise"]
