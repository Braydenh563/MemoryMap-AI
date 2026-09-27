"""Two windows, one note (WORLD_CLASS_PLAN 22.1 item 5).

The desktop window and a browser tab, or two devices on the LAN, can edit
the same note or document. Before this, the later save won silently and
the earlier one was lost with no trace but a revision nobody knew to look
for. Now every read carries `content_hash`, a save may send the hash it
started from as `base_hash`, and a save whose base is no longer the text
on the server is refused with 409 and the text that is there, so the
editor can offer "keep mine", "take theirs" or "compare".

Why a hash of the text and not `updated_at`: `Entry.updated_at` has
`onupdate=utcnow`, so it moves on every write to the row (a pin, the AI
filing it, a link resolved), and a check on it would call each of those a
conflict with the person typing. Only the text is what two editors fight
over, so only the text is compared.
"""

from __future__ import annotations


def _note(client, text="First draft"):
    return client.post("/entries", json={"content": text}).json()


def test_every_read_of_a_note_carries_the_hash_of_its_text(client):
    note = _note(client)
    assert isinstance(note["content_hash"], str) and len(note["content_hash"]) >= 16
    again = client.get(f"/entries/{note['id']}").json()
    assert again["content_hash"] == note["content_hash"]
    changed = client.put(f"/entries/{note['id']}", json={"content": "Second draft"}).json()
    assert changed["content_hash"] != note["content_hash"]


def test_a_save_from_the_current_text_goes_through(client):
    note = _note(client)
    saved = client.put(
        f"/entries/{note['id']}",
        json={"content": "Edited here", "base_hash": note["content_hash"]},
    )
    assert saved.status_code == 200
    assert saved.json()["content"] == "Edited here"


def test_a_save_from_text_that_changed_elsewhere_is_refused_with_the_text_that_is_there(client):
    note = _note(client)
    base = note["content_hash"]
    # The other window saves first.
    client.put(f"/entries/{note['id']}", json={"content": "Theirs", "base_hash": base})
    mine = client.put(f"/entries/{note['id']}", json={"content": "Mine", "base_hash": base})
    assert mine.status_code == 409
    detail = mine.json()["detail"]
    assert detail["code"] == "edit_conflict"
    assert "another window" in detail["message"]
    assert detail["current"]["content"] == "Theirs"
    # Nothing was written: the other window's text stands.
    assert client.get(f"/entries/{note['id']}").json()["content"] == "Theirs"
    # "Keep mine" is a save from the text now there.
    kept = client.put(
        f"/entries/{note['id']}",
        json={"content": "Mine", "base_hash": detail["current"]["content_hash"]},
    )
    assert kept.status_code == 200 and kept.json()["content"] == "Mine"


def test_a_change_to_anything_but_the_text_is_not_a_conflict(client):
    note = _note(client)
    base = note["content_hash"]
    client.put(f"/entries/{note['id']}", json={"pinned": True})
    client.put(f"/entries/{note['id']}", json={"tags": ["later"]})
    saved = client.put(f"/entries/{note['id']}", json={"content": "Mine", "base_hash": base})
    assert saved.status_code == 200


def test_two_windows_saving_the_same_text_is_not_a_conflict(client):
    note = _note(client)
    base = note["content_hash"]
    client.put(f"/entries/{note['id']}", json={"content": "Same", "base_hash": base})
    again = client.put(f"/entries/{note['id']}", json={"content": "Same", "base_hash": base})
    assert again.status_code == 200


def test_a_save_without_a_base_is_unchecked_as_before(client):
    # The agent's tools, undo and every other writer that does not edit
    # from an open copy keep their old behaviour.
    note = _note(client)
    client.put(f"/entries/{note['id']}", json={"content": "Theirs"})
    plain = client.put(f"/entries/{note['id']}", json={"content": "Mine"})
    assert plain.status_code == 200 and plain.json()["content"] == "Mine"


def test_documents_refuse_a_stale_save_the_same_way(client):
    doc = client.post("/documents", json={"title": "Essay", "content": "One"}).json()
    base = doc["content_hash"]
    assert client.get(f"/documents/{doc['id']}").json()["content_hash"] == base
    client.put(f"/documents/{doc['id']}", json={"content": "Two", "base_hash": base})
    stale = client.put(f"/documents/{doc['id']}", json={"content": "Three", "base_hash": base})
    assert stale.status_code == 409
    detail = stale.json()["detail"]
    assert detail["code"] == "edit_conflict"
    assert detail["current"]["content"] == "Two"
    assert client.get(f"/documents/{doc['id']}").json()["content"] == "Two"
    # A title-only save carries no text and is never checked.
    titled = client.put(f"/documents/{doc['id']}", json={"title": "Renamed", "base_hash": base})
    assert titled.status_code == 200

