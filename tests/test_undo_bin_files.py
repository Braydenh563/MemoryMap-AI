"""A deleted file or picture can be put back (INBOX 898, undo everywhere).

`DELETE /media/{id}` and `DELETE /files/{id}` keep the row and the bytes in
the undo bin (`core/undo_bin.py`) and answer with a token; `POST /media/restore`
and `POST /files/restore` take it. The browser's Undo is that pair and Redo is
the delete again.
"""

from __future__ import annotations

import io

from tessellate.core import deps, undo_bin
from tessellate.entry import manager

PNG = b"\x89PNG\r\n\x1a\n" + b"x" * 40


def _upload(client, name="shot.png"):
    made = client.post("/media/upload", files={"file": (name, PNG, "image/png")}).json()
    return made


def test_a_deleted_picture_comes_back_with_its_bytes(ai_client):
    made = _upload(ai_client)
    assert ai_client.get(made["url"]).content == PNG
    gone = ai_client.delete(f"/media/{made['id']}").json()
    assert gone["undo_token"]
    assert ai_client.get(made["url"]).status_code == 404

    back = ai_client.post("/media/restore", json={"token": gone["undo_token"]})
    assert back.status_code == 200, back.text
    assert back.json()["id"] == made["id"]
    assert ai_client.get(made["url"]).content == PNG
    #: A token is used once.
    reply_1 = ai_client.post("/media/restore", json={"token": gone["undo_token"]})
    assert reply_1.status_code == 404


def test_redo_of_a_media_delete_is_another_delete(ai_client):
    made = _upload(ai_client)
    first = ai_client.delete(f"/media/{made['id']}").json()["undo_token"]
    ai_client.post("/media/restore", json={"token": first})
    again = ai_client.delete(f"/media/{made['id']}")
    assert again.status_code == 200
    assert again.json()["undo_token"] != first


def test_deleting_with_references_stripped_is_undone_in_the_notes_too(ai_client, session):
    made = _upload(ai_client)
    entry = manager.create_entry(session, f"Before\n\n![shot]({made['url']})\n\nAfter")
    session.commit()
    original = entry.content
    gone = ai_client.delete(f"/media/{made['id']}?strip_references=true").json()
    assert entry.id in gone["cleaned_notes"]
    assert made["url"] not in ai_client.get(f"/entries/{entry.id}").json()["content"]

    ai_client.post("/media/restore", json={"token": gone["undo_token"]})
    assert ai_client.get(f"/entries/{entry.id}").json()["content"] == original


def test_a_note_edited_since_keeps_its_edit_when_the_picture_returns(ai_client, session):
    made = _upload(ai_client)
    entry = manager.create_entry(session, f"![shot]({made['url']})\n\ntext")
    session.commit()
    gone = ai_client.delete(f"/media/{made['id']}?strip_references=true").json()
    ai_client.put(f"/entries/{entry.id}", json={"content": "rewritten by hand"})
    ai_client.post("/media/restore", json={"token": gone["undo_token"]})
    assert ai_client.get(f"/entries/{entry.id}").json()["content"] == "rewritten by hand"


def test_restore_refuses_a_bad_or_foreign_token(ai_client, session):
    reply_2 = ai_client.post("/media/restore", json={"token": "../../etc"})
    assert reply_2.status_code == 404
    reply_3 = ai_client.post("/media/restore", json={"token": "0" * 32})
    assert reply_3.status_code == 404
    #: A token for another kind of thing is not this route's.
    made = _upload(ai_client)
    gone = ai_client.delete(f"/media/{made['id']}").json()["undo_token"]
    reply_4 = ai_client.post("/files/restore", json={"token": gone})
    assert reply_4.status_code == 404


def _note_with_file(client, session):
    entry = manager.create_entry(session, "a note that carries a file")
    session.commit()
    response = client.post(
        f"/entries/{entry.id}/files",
        files={"file": ("lecture.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
    )
    assert response.status_code in (200, 201), response.text
    return entry, client.get(f"/entries/{entry.id}").json()["attachments"][0]["id"]


def test_a_deleted_attachment_comes_back_on_its_note(ai_client, session):
    entry, attachment_id = _note_with_file(ai_client, session)
    gone = ai_client.delete(f"/files/{attachment_id}")
    assert gone.status_code == 200
    token = gone.json()["undo_token"]
    assert ai_client.get(f"/entries/{entry.id}").json()["attachments"] == []
    assert ai_client.get(f"/files/{attachment_id}").status_code == 404

    back = ai_client.post("/files/restore", json={"token": token})
    assert back.status_code == 200, back.text
    attachments = ai_client.get(f"/entries/{entry.id}").json()["attachments"]
    assert [a["id"] for a in attachments] == [attachment_id]
    assert ai_client.get(f"/files/{attachment_id}").content == b"%PDF-1.4 fake"


def test_the_bin_forgets_old_stashes(app_state):
    data_dir = deps.get_config().data_dir
    token = undo_bin.stash(data_dir, "media", {"row": {}}, {})
    folder = data_dir / undo_bin.FOLDER / token
    assert folder.is_dir()
    import os
    import time

    old = time.time() - (undo_bin.KEEP_DAYS + 1) * 86400
    os.utime(folder, (old, old))
    undo_bin.prune(data_dir)
    assert not folder.exists()
