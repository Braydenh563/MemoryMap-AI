"""Note edit history — the undo that the recycle bin never covered.

The bin catches deletion. Rewriting a note destroyed what it used to say with
no way back, and the AI can rewrite notes too, which makes this more than a
nicety.
"""

from __future__ import annotations

from memorymap.entry import manager


def _make(client, content, tags=None):
    return client.post("/entries", json={"content": content, "tags": tags or []}).json()


def test_editing_records_the_previous_version(client):
    entry = _make(client, "the original wording")
    client.put(f"/entries/{entry['id']}", json={"content": "the new wording"})

    history = client.get(f"/entries/{entry['id']}/history").json()
    assert [h["content"] for h in history] == ["the original wording"]


def test_history_is_newest_first(client):
    entry = _make(client, "version one")
    client.put(f"/entries/{entry['id']}", json={"content": "version two"})
    client.put(f"/entries/{entry['id']}", json={"content": "version three"})

    history = client.get(f"/entries/{entry['id']}/history").json()
    assert [h["content"] for h in history] == ["version two", "version one"]


def test_a_new_note_has_no_history(client):
    entry = _make(client, "brand new")
    assert client.get(f"/entries/{entry['id']}/history").json() == []


def test_an_edit_that_changes_nothing_records_nothing(client):
    entry = _make(client, "unchanged")
    client.put(f"/entries/{entry['id']}", json={"content": "unchanged"})
    assert client.get(f"/entries/{entry['id']}/history").json() == []


def test_changing_only_tags_is_still_recorded(client):
    entry = _make(client, "same text", ["one"])
    client.put(f"/entries/{entry['id']}", json={"tags": ["one", "two"]})

    history = client.get(f"/entries/{entry['id']}/history").json()
    assert len(history) == 1
    assert history[0]["tags"] == ["one"]


def test_restoring_puts_the_old_text_back(client):
    entry = _make(client, "the good version")
    client.put(f"/entries/{entry['id']}", json={"content": "a regrettable rewrite"})
    history = client.get(f"/entries/{entry['id']}/history").json()

    restored = client.post(
        f"/entries/{entry['id']}/history/{history[0]['id']}/restore"
    ).json()
    assert restored["content"] == "the good version"


def test_restoring_is_itself_undoable(client):
    """Undoing an undo has to work, or this is a trap rather than a safety net."""
    entry = _make(client, "first")
    client.put(f"/entries/{entry['id']}", json={"content": "second"})
    history = client.get(f"/entries/{entry['id']}/history").json()
    client.post(f"/entries/{entry['id']}/history/{history[0]['id']}/restore")

    after = client.get(f"/entries/{entry['id']}/history").json()
    assert "second" in [h["content"] for h in after]


def test_history_is_capped(client):
    """A note edited hundreds of times must not become the biggest thing here."""
    entry = _make(client, "v0")
    for i in range(1, manager.MAX_REVISIONS + 6):
        client.put(f"/entries/{entry['id']}", json={"content": f"v{i}"})

    history = client.get(f"/entries/{entry['id']}/history").json()
    assert len(history) == manager.MAX_REVISIONS
    assert history[0]["content"] == f"v{manager.MAX_REVISIONS + 4}"  # newest kept


def test_restoring_a_version_from_another_note_is_refused(client):
    mine = _make(client, "mine")
    theirs = _make(client, "theirs")
    client.put(f"/entries/{theirs['id']}", json={"content": "theirs edited"})
    other_revision = client.get(f"/entries/{theirs['id']}/history").json()[0]

    response = client.post(
        f"/entries/{mine['id']}/history/{other_revision['id']}/restore"
    )
    assert response.status_code == 404


def test_a_private_notes_history_is_encrypted_at_rest(client, session):
    """A revision must never be the one place a private note sits in the clear."""
    from sqlalchemy import select

    from memorymap.core import crypto, vault
    from memorymap.core.database import EntryRevision

    vault.close()
    vault.create(session, "test-passphrase")
    session.commit()

    entry = _make(client, "the first secret")
    client.post(f"/entries/{entry['id']}/privacy", json={"private": True})
    client.put(f"/entries/{entry['id']}", json={"content": "the second secret"})

    stored = session.scalars(select(EntryRevision)).all()
    assert stored, "the edit should have been recorded"
    assert all(crypto.is_encrypted(r.content) for r in stored)
    assert not any("first secret" in r.content for r in stored)

    # And it reads back correctly while unlocked.
    history = client.get(f"/entries/{entry['id']}/history").json()
    assert history[0]["content"] == "the first secret"
    vault.close()
