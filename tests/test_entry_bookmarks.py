"""Attaching a saved bookmark to a note, so it shows up as a reference (§30)."""

from __future__ import annotations


def _make_entry(client):
    return client.post("/entries", json={"content": "A note about something", "tags": []}).json()


def test_attach_and_list_bookmark_on_entry(client):
    entry = _make_entry(client)
    bookmark = client.post("/bookmarks", json={"url": "a.com", "title": "A"}).json()

    response = client.post(f"/entries/{entry['id']}/bookmarks", json={"bookmark_id": bookmark["id"]})
    assert response.status_code == 201

    listed = client.get(f"/entries/{entry['id']}/bookmarks").json()
    assert len(listed) == 1
    assert listed[0]["id"] == bookmark["id"]
    assert listed[0]["url"] == "https://a.com"


def test_attaching_twice_is_idempotent(client):
    entry = _make_entry(client)
    bookmark = client.post("/bookmarks", json={"url": "a.com"}).json()
    client.post(f"/entries/{entry['id']}/bookmarks", json={"bookmark_id": bookmark["id"]})
    client.post(f"/entries/{entry['id']}/bookmarks", json={"bookmark_id": bookmark["id"]})
    assert len(client.get(f"/entries/{entry['id']}/bookmarks").json()) == 1


def test_detach_bookmark(client):
    entry = _make_entry(client)
    bookmark = client.post("/bookmarks", json={"url": "a.com"}).json()
    client.post(f"/entries/{entry['id']}/bookmarks", json={"bookmark_id": bookmark["id"]})

    response = client.delete(f"/entries/{entry['id']}/bookmarks/{bookmark['id']}")
    assert response.json() == {"detached": True}
    attached = client.get(f"/entries/{entry['id']}/bookmarks")
    assert attached.json() == []


def test_attach_to_missing_entry_is_404(client):
    bookmark = client.post("/bookmarks", json={"url": "a.com"}).json()
    response = client.post("/entries/999999/bookmarks", json={"bookmark_id": bookmark["id"]})
    assert response.status_code == 404


def test_attach_missing_bookmark_is_404(client):
    entry = _make_entry(client)
    response = client.post(f"/entries/{entry['id']}/bookmarks", json={"bookmark_id": 999999})
    assert response.status_code == 404


def test_a_note_with_no_bookmarks_returns_empty_list(client):
    entry = _make_entry(client)
    attached = client.get(f"/entries/{entry['id']}/bookmarks")
    assert attached.json() == []
