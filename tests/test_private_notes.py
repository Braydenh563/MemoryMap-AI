"""Private notes: encrypted at rest, and kept away from search and the AI.

The three things that must hold, in order of how bad it is to get them wrong:
  1. A private note's text is not in the database in the clear.
  2. Marking a note private never loses it.
  3. A private note never reaches search results or the model's context.
"""

from __future__ import annotations

import pytest
from sqlalchemy import select

from memorymap.core import crypto, vault
from memorymap.core.database import EmbeddingRecord, Entry


@pytest.fixture(autouse=True)
def open_vault(session):
    """Tests don't go through setup/unlock, so open the vault by hand.

    Closed again afterwards so a test that locks it can't leak that state into
    the next one.
    """
    vault.close()
    vault.create(session, "test-passphrase")
    session.commit()
    yield
    vault.close()


def _make_private(client, session, content):
    entry = client.post("/entries", json={"content": content}).json()
    body = client.post(f"/entries/{entry['id']}/privacy", json={"private": True})
    assert body.status_code == 200
    return body.json()


def test_a_private_note_is_not_stored_in_the_clear(client, session):
    secret = "my bank pin is 4715 and the spare key is under the mat"
    _make_private(client, session, secret)

    stored = session.scalars(select(Entry)).all()[-1]
    assert crypto.is_encrypted(stored.content)
    assert secret not in stored.content
    assert stored.is_private is True


def test_a_private_note_still_reads_back_correctly(client, session):
    secret = "the actual text, unchanged"
    marked = _make_private(client, session, secret)
    assert marked["content"] == secret
    assert marked["is_private"] is True

    # And through a normal fetch, not just the response to the change.
    again = client.get(f"/entries/{marked['id']}").json()
    assert again["content"] == secret


def test_making_a_note_private_and_back_again_loses_nothing(client, session):
    original = "round trip me"
    marked = _make_private(client, session, original)

    back = client.post(f"/entries/{marked['id']}/privacy", json={"private": False}).json()
    assert back["content"] == original
    assert back["is_private"] is False

    stored = session.get(Entry, marked["id"])
    assert stored.content == original  # plaintext again on disk


def test_a_private_note_has_its_embedding_removed(client, session):
    """A vector encodes what the note is about — keeping one leaks the point."""
    entry = client.post("/entries", json={"content": "something to embed"}).json()
    session.add(
        EmbeddingRecord(entry_id=entry["id"], embedding=b"\x00" * 8, dim=2, model_version="test")
    )
    session.commit()
    assert session.scalar(
        select(EmbeddingRecord).where(EmbeddingRecord.entry_id == entry["id"])
    ) is not None

    client.post(f"/entries/{entry['id']}/privacy", json={"private": True})
    remaining = session.scalar(
        select(EmbeddingRecord).where(EmbeddingRecord.entry_id == entry["id"])
    )
    assert remaining is None


def test_private_notes_are_kept_out_of_search(client, session):
    from memorymap.search import search_manager

    _make_private(client, session, "pineapple submarine, a very distinctive phrase")
    client.post("/entries", json={"content": "an ordinary public note"})

    found = search_manager.keyword_search(session, "pineapple")
    assert found == []
    recent = search_manager.recent_entries(session)
    assert all(not e.is_private for e in recent)


def test_private_notes_never_reach_the_model(ai_client, fake_ollama, session):
    """The one that matters most: the AI must not be handed a private note.

    The secret is deliberately different from the question, so finding it in
    the prompt can only mean the note leaked — not that the query echoed.
    """
    secret = "codeword ELDERFLOWER opens the safe"
    _make_private(ai_client, session, f"about submarines: {secret}")
    ai_client.post("/entries", json={"content": "an ordinary public note on submarines"})
    fake_ollama.librarian_reply = "Here's what I found."

    body = ai_client.post("/chat", json={"question": "tell me about submarines"}).json()

    assert all("ELDERFLOWER" not in r["content"] for r in body["raw_results"])
    prompt = " ".join(m["content"] for m in fake_ollama.chat_calls[-1])
    assert "ELDERFLOWER" not in prompt


def test_privacy_needs_an_open_vault(client, session):
    """The key only exists in memory while unlocked."""
    entry = client.post("/entries", json={"content": "x"}).json()
    vault.close()
    response = client.post(f"/entries/{entry['id']}/privacy", json={"private": True})
    assert response.status_code == 409
    assert "Unlock" in response.json()["detail"]


def test_a_locked_vault_shows_a_placeholder_rather_than_breaking(client, session):
    """A private note must not take the whole notes list down with it."""
    marked = _make_private(client, session, "secret text")
    vault.close()

    listed = client.get("/entries").json()
    private = next(e for e in listed if e["id"] == marked["id"])
    assert "secret text" not in private["content"]
    assert "🔒" in private["content"]
    # Everything else still lists normally.
    assert isinstance(listed, list)


def test_exports_decrypt_while_unlocked(client, session):
    """An export is for taking notes elsewhere; ciphertext isn't your notes."""
    secret = "ELDERFLOWER export check"
    _make_private(client, session, secret)

    as_json = client.get("/export/json").json()
    assert any(secret in e["content"] for e in as_json["entries"])

    as_csv = client.get("/export/csv").text
    assert secret in as_csv


def test_exports_do_not_leak_when_locked(client, session):
    """With no key there is nothing to decrypt with — say so, don't guess."""
    secret = "ELDERFLOWER locked export"
    _make_private(client, session, secret)
    vault.close()

    as_json = client.get("/export/json").json()
    assert all(secret not in e["content"] for e in as_json["entries"])
    assert any("🔒" in e["content"] for e in as_json["entries"])


def test_an_existing_notebook_upgrades_without_a_reset(tmp_path):
    """Adding encryption must not ask anyone to rebuild their database.

    Simulates a database made before this feature existed: notes and a user,
    but no vault row and no is_private column.
    """
    import bcrypt
    from memorymap.core.database import DatabaseManager, Entry, User, Vault

    db_path = tmp_path / "existing.db"
    manager = DatabaseManager(db_path)
    old = manager.session()
    old.add(
        User(
            username="owner",
            password_hash=bcrypt.hashpw(b"their-password", bcrypt.gensalt()).decode(),
        )
    )
    old.add(Entry(content="a note written months ago", ai_confidence=0))
    old.commit()
    old.close()

    # The app restarts on the new code against the same file.
    upgraded = DatabaseManager(db_path).session()
    vault.close()
    assert vault.open_with(upgraded, "their-password") is True
    upgraded.commit()

    assert len(upgraded.scalars(select(Vault)).all()) == 1
    surviving = upgraded.scalars(select(Entry)).all()
    assert [e.content for e in surviving] == ["a note written months ago"]
    assert all(e.is_private is False for e in surviving)  # backfilled, not null
    upgraded.close()
    vault.close()
