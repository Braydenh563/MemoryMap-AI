"""Wave B: add-context recategorisation, threads, attachments, pins,
duplicates, related entries, tag manager."""

from __future__ import annotations

import io

from memorymap.core import deps


def _save(client, content, **extra):
    response = client.post("/entries", json={"content": content, **extra})
    assert response.status_code == 201
    return response.json()


# --- add context + recategorise --------------------------------------------------


def test_add_context_recategorises(ai_client):
    # Vague note → the fake files it as Misc.
    entry = _save(ai_client, "something I heard today")
    assert entry["category"] == "Misc"

    # Context makes it clearly a joke → janitor refiles it.
    updated = ai_client.post(
        f"/entries/{entry['id']}/context",
        json={"text": "it was a scarecrow joke — outstanding in his field"},
    ).json()
    assert "--- added context ---" in updated["content"]
    assert updated["category"] == "Dad Jokes"
    assert updated["filed_by"] in ("llm", "semantic-match")


def test_add_context_respects_user_filing(ai_client):
    entry = _save(ai_client, "my note", category="Personal")  # user's choice
    updated = ai_client.post(
        f"/entries/{entry['id']}/context",
        json={"text": "a funny joke actually"},
    ).json()
    # The user filed it — the janitor keeps its hands off.
    assert updated["category"] == "Personal"
    assert updated["user_filed"] is True


# --- threads ---------------------------------------------------------------------


def test_thread_child_inherits_parent_category(ai_client):
    parent = _save(ai_client, "a funny scarecrow joke")
    child = _save(ai_client, "and thinking more about it…", parent_id=parent["id"])
    assert child["parent_id"] == parent["id"]
    assert child["category"] == parent["category"]
    assert child["filed_by"] == "thread"


def test_thread_with_missing_parent_404s(client):
    response = client.post("/entries", json={"content": "orphan", "parent_id": 999})
    assert response.status_code == 404


# --- attachments ------------------------------------------------------------------


def test_upload_download_delete_attachment(client):
    entry = _save(client, "note with a file")
    upload = client.post(
        f"/entries/{entry['id']}/files",
        files={"file": ("hello.txt", io.BytesIO(b"file contents"), "text/plain")},
    )
    assert upload.status_code == 201
    attachment = upload.json()["attachments"][0]
    assert attachment["filename"] == "hello.txt"
    assert attachment["is_image"] is False

    download = client.get(f"/files/{attachment['id']}")
    assert download.status_code == 200
    assert download.content == b"file contents"

    removed = client.delete(f"/files/{attachment['id']}").json()
    assert removed["attachments"] == []
    # Bytes are gone from disk too.
    uploads = list(deps.get_config().uploads_dir.iterdir())
    assert uploads == []


def test_hard_delete_removes_attachment_files(client):
    entry = _save(client, "doomed note")
    client.post(
        f"/entries/{entry['id']}/files",
        files={"file": ("bye.txt", io.BytesIO(b"x"), "text/plain")},
    )
    client.delete(f"/entries/{entry['id']}")
    client.post("/recycle-bin/empty")
    assert list(deps.get_config().uploads_dir.iterdir()) == []


# --- pins + duplicates + related ---------------------------------------------------


def test_pin_floats_entry_to_top(client):
    first = _save(client, "older note")
    _save(client, "newer note")
    client.put(f"/entries/{first['id']}", json={"pinned": True})

    listed = client.get("/entries").json()
    assert listed[0]["id"] == first["id"]
    assert listed[0]["pinned"] is True


def test_duplicate_detection_on_save(ai_client):
    _save(ai_client, "a funny scarecrow joke")
    second = _save(ai_client, "a funny scarecrow joke, again")
    # The fake embedder maps both onto the joke axis → similarity 1.0.
    assert second["similar"] is not None
    assert second["similar"]["similarity"] >= 0.9


def test_related_entries(ai_client):
    joke = _save(ai_client, "a funny scarecrow joke")
    _save(ai_client, "another funny pun")
    _save(ai_client, "buy milk and eggs")

    related = ai_client.get(f"/entries/{joke['id']}/related").json()
    contents = [e["content"] for e in related]
    assert "another funny pun" in contents
    assert "buy milk and eggs" not in contents


# --- tag manager -------------------------------------------------------------------


def test_tag_rename_merge_delete(client):
    _save(client, "note one", tags=["joke", "work"])
    _save(client, "note two", tags=["jokes"])

    assert client.get("/tags").json() == {"joke": 1, "jokes": 1, "work": 1}

    # Rename "joke" → "jokes" merges them.
    assert client.post("/tags/rename", json={"old": "joke", "new": "jokes"}).json() == {
        "changed": 1
    }
    assert client.get("/tags").json() == {"jokes": 2, "work": 1}

    assert client.post("/tags/delete", json={"name": "work"}).json() == {"changed": 1}
    assert "work" not in client.get("/tags").json()


# --- capture templates --------------------------------------------------------------


def test_custom_templates_roundtrip(client):
    updated = client.put(
        "/preferences",
        json={"custom_templates": [{"name": "Journal", "content": "Today I…"}]},
    ).json()
    assert updated["custom_templates"] == [{"name": "Journal", "content": "Today I…"}]
