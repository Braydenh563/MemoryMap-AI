"""The exports folder, listed and served back (INBOX 159).

"exported or downloaded files and images etc should appear in the
notifications to be accessible, maybe there should also be an area somewhere
maybe in settings to open the exports folder location and access exported or
downloaded files". The write (`/files/save`) and the reveal (desktop only)
existed; these are the list Settings draws and the download each row carries,
so a browser tab gets its exports back as well.
"""

from __future__ import annotations

import base64

from memorymap.api.routes_files import EXPORTS_DIRNAME, EXPORTS_LIST_LIMIT


def _save(client, filename: str, data: bytes):
    return client.post(
        "/files/save",
        json={"filename": filename, "content_base64": base64.b64encode(data).decode()},
    )


def test_an_empty_or_missing_folder_lists_nothing(client, app_state):
    body = client.get("/files/exports").json()
    assert body["files"] == []
    assert body["path"].endswith(EXPORTS_DIRNAME)


def test_saved_files_are_listed_newest_first_with_their_size(client, app_state):
    _save(client, "first.md", b"one")
    _save(client, "second.png", b"\x89PNG....")
    body = client.get("/files/exports").json()
    names = [row["filename"] for row in body["files"]]
    assert names[0] == "second.png"
    assert set(names) == {"first.md", "second.png"}
    by_name = {row["filename"]: row for row in body["files"]}
    assert by_name["first.md"]["bytes"] == 3
    assert by_name["first.md"]["modified_at"]


def test_a_listed_file_downloads_with_its_own_name(client, app_state):
    _save(client, "chat.md", b"# Hello\n")
    response = client.get("/files/exports/chat.md")
    assert response.status_code == 200
    assert response.content == b"# Hello\n"
    assert "chat.md" in response.headers.get("content-disposition", "")


def test_a_name_that_leaves_the_folder_is_refused(client, app_state):
    """The same two locks the write goes through: a flat whitelisted name and
    a containment check at the point of use."""
    _save(client, "chat.md", b"x")
    assert client.get("/files/exports/..%2F..%2Fnotes.db").status_code in (404, 422)
    assert client.get("/files/exports/missing.md").status_code == 404


def test_the_list_is_capped(client, app_state, monkeypatch):
    for i in range(EXPORTS_LIST_LIMIT + 3):
        _save(client, f"f{i}.txt", b"x")
    body = client.get("/files/exports").json()
    assert len(body["files"]) == EXPORTS_LIST_LIMIT
