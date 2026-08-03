"""The Library's one endpoint (§4, §36F).

Worth a real test file rather than a smoke check, because the Library is the
surface that *replaces* two others: if it silently drops a kind, the only
symptom is a thing you made not being anywhere, and the app has no other list
to fall back to any more.
"""

from __future__ import annotations

import json

from memorymap.core.database import Attachment, Conversation, Document, Entry

# `client` and `session` come from tests/conftest.py: one throwaway data
# directory per test and singletons rebuilt between them. Declaring a second
# `client` here silently shared one database across the file, and the two
# privacy tests below passed alone and failed in a run — which is the worst way
# for a privacy test to behave.


def _kinds(body: dict) -> set[str]:
    return {item["kind"] for item in body["items"]}


def _of_kind(body: dict, kind: str) -> list[dict]:
    return [item for item in body["items"] if item["kind"] == kind]


def test_every_kind_appears_in_one_list(client, session):
    """One call, four kinds. The point of assembling this server-side is that
    a client stitching four fetches together misses the fifth kind whenever
    somebody adds one."""
    session.add(Document(title="Bread notes", content="one two three four five"))
    session.add(
        Conversation(
            title="About sourdough",
            messages=json.dumps(
                [
                    {"role": "user", "content": "how do I prove dough"},
                    {"role": "assistant", "content": "slowly"},
                ]
            ),
        )
    )
    entry = Entry(content="a note with a photo on it")
    session.add(entry)
    session.flush()
    session.add(
        Attachment(
            entry_id=entry.id,
            filename="loaf.png",
            stored_name="abc123.png",
            mime="image/png",
            size=2048,
        )
    )
    binned = Entry(content="something I threw away")
    binned.is_deleted = True
    session.add(binned)
    session.commit()

    body = client.get("/library").json()
    assert _kinds(body) == {"document", "chat", "file", "archived"}
    assert body["counts"] == {"document": 1, "chat": 1, "file": 1, "archived": 1}


def test_a_chat_is_previewed_by_its_first_question(client, session):
    """You remember what you asked far more often than what the chat ended up
    being called — the same reasoning the conversation sidebar already used,
    and it has to survive the move here or the move is a downgrade."""
    session.add(
        Conversation(
            title="Untitled chat",
            messages=json.dumps(
                [
                    {"role": "user", "content": "why do my tomatoes split"},
                    {"role": "assistant", "content": "uneven watering"},
                ]
            ),
        )
    )
    session.commit()

    chat = _of_kind(client.get("/library").json(), "chat")[0]
    assert chat["preview"] == "why do my tomatoes split"
    assert chat["detail"] == "1 turn"


def test_an_attachment_carries_the_note_it_hangs_on(client, session):
    """A filename with no context is a filename. The reason you kept it is the
    note, so the card shows the note and the click can go there."""
    entry = Entry(content="the loaf that finally worked")
    session.add(entry)
    session.flush()
    session.add(
        Attachment(
            entry_id=entry.id,
            filename="loaf.png",
            stored_name="x.png",
            mime="image/png",
            size=4096,
        )
    )
    session.commit()

    item = _of_kind(client.get("/library").json(), "file")[0]
    assert item["entry_id"] == entry.id
    assert item["preview"] == "the loaf that finally worked"
    assert item["detail"] == "4 KB · PNG"


def test_a_private_note_keeps_its_attachments_out_of_the_library(client, session):
    """The Library is a browsing surface over everything you made, which makes
    it exactly the place a private note's contents would otherwise turn up in
    plain sight — as a filename and a preview of the note's own text."""
    entry = Entry(content="the private one")
    entry.is_private = True
    session.add(entry)
    session.flush()
    session.add(
        Attachment(
            entry_id=entry.id,
            filename="secret.pdf",
            stored_name="y.pdf",
            mime="application/pdf",
            size=10,
        )
    )
    session.commit()

    body = client.get("/library").json()
    assert _of_kind(body, "file") == []
    assert "secret.pdf" not in json.dumps(body)


def test_a_private_note_stays_out_of_the_archive_too(client, session):
    """Deleting a private note does not make it public."""
    entry = Entry(content="private and binned")
    entry.is_private = True
    entry.is_deleted = True
    session.add(entry)
    session.commit()

    body = client.get("/library").json()
    assert _of_kind(body, "archived") == []


def test_a_malformed_conversation_costs_its_preview_not_the_library(client, session):
    """A hand-edited or truncated messages blob must not take out the one list
    the app now has for finding anything."""
    conversation = Conversation(title="broken", messages="{not json")
    session.add(conversation)
    session.add(Document(title="still here", content="words"))
    session.commit()

    body = client.get("/library").json()
    assert _of_kind(body, "chat")[0]["preview"] == ""
    assert _of_kind(body, "document")[0]["title"] == "still here"


def test_the_library_is_behind_the_unlock_gate(client):
    """It lists documents, chats, files and binned notes — every kind of thing
    the lock screen exists to keep behind it.

    Asserted by locking the app and knocking, rather than by reading app.py:
    registering a router on the unlocked list is a one-word mistake, and a test
    that reads the same line the mistake is in cannot see it.
    """
    client.post("/auth/setup", json={"password": "a password"})
    client.post("/auth/lock")
    assert client.get("/library").status_code == 401
