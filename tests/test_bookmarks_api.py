"""Bookmarks: saved links to somewhere outside the notebook (§30)."""

from __future__ import annotations


def test_create_and_list_bookmark(client):
    created = client.post(
        "/bookmarks", json={"url": "example.com", "title": "Example", "note": "handy"}
    ).json()
    assert created["url"] == "https://example.com"
    assert created["title"] == "Example"
    assert created["pinned"] is False

    listed = client.get("/bookmarks").json()
    assert len(listed) == 1
    assert listed[0]["id"] == created["id"]


def test_a_scheme_already_present_is_left_alone(client):
    created = client.post("/bookmarks", json={"url": "http://example.com/path"}).json()
    assert created["url"] == "http://example.com/path"


def test_blank_url_is_rejected(client):
    response = client.post("/bookmarks", json={"url": "   "})
    assert response.status_code == 422


def test_a_javascript_scheme_is_rejected_not_stored(client):
    """INBOX 310, finding 3: `_normalise_url` used to only prepend
    `https://` when a URL had *no* scheme, so `javascript:` passed through
    unchanged and was stored as typed. The 422 must name the allowed
    schemes, and nothing must have been written."""
    response = client.post("/bookmarks", json={"url": "javascript:alert(1)"})
    assert response.status_code == 422
    assert "http:" in response.json()["detail"]
    assert "mailto:" in response.json()["detail"]
    assert client.get("/bookmarks").json() == []


def test_disallowed_schemes_are_rejected_on_update_too(client):
    created = client.post("/bookmarks", json={"url": "a.com"}).json()
    for bad in ("javascript:alert(1)", "data:text/html,<script>1</script>", "vbscript:x"):
        response = client.put(f"/bookmarks/{created['id']}", json={"url": bad})
        assert response.status_code == 422, bad
    # The original, safe URL is still what's stored.
    assert client.get("/bookmarks").json()[0]["url"] == "https://a.com"


def test_mailto_and_tel_schemes_are_allowed(client):
    mail = client.post("/bookmarks", json={"url": "mailto:me@example.com"}).json()
    assert mail["url"] == "mailto:me@example.com"
    tel = client.post("/bookmarks", json={"url": "tel:+15551234567"}).json()
    assert tel["url"] == "tel:+15551234567"


def test_pinned_bookmarks_sort_first(client):
    a = client.post("/bookmarks", json={"url": "a.com"}).json()
    b = client.post("/bookmarks", json={"url": "b.com"}).json()
    client.put(f"/bookmarks/{a['id']}", json={"pinned": True})

    listed = client.get("/bookmarks").json()
    assert listed[0]["id"] == a["id"]
    assert listed[1]["id"] == b["id"]


def test_update_bookmark_fields(client):
    created = client.post("/bookmarks", json={"url": "a.com", "title": "Old"}).json()
    updated = client.put(
        f"/bookmarks/{created['id']}", json={"title": "New", "note": "updated note"}
    ).json()
    assert updated["title"] == "New"
    assert updated["note"] == "updated note"
    assert updated["url"] == "https://a.com"  # untouched


def test_delete_bookmark(client):
    created = client.post("/bookmarks", json={"url": "a.com"}).json()
    response = client.delete(f"/bookmarks/{created['id']}")
    assert response.json() == {"deleted": True}
    remaining = client.get("/bookmarks")
    assert remaining.json() == []


def test_update_missing_bookmark_is_404(client):
    response = client.put("/bookmarks/999999", json={"title": "x"})
    assert response.status_code == 404


def test_delete_missing_bookmark_is_404(client):
    response = client.delete("/bookmarks/999999")
    assert response.status_code == 404


def test_group_name_roundtrips(client):
    created = client.post(
        "/bookmarks", json={"url": "a.com", "group_name": "Work/Reading"}
    ).json()
    assert created["group_name"] == "Work/Reading"
    updated = client.put(
        f"/bookmarks/{created['id']}", json={"group_name": "Personal"}
    ).json()
    assert updated["group_name"] == "Personal"


def test_creating_a_duplicate_url_warns_but_still_creates(client):
    first = client.post("/bookmarks", json={"url": "dup.com"}).json()
    assert "duplicate_of" not in first

    second = client.post("/bookmarks", json={"url": "dup.com"}).json()
    assert second["duplicate_of"] == first["id"]
    assert second["id"] != first["id"]
    assert len(client.get("/bookmarks").json()) == 2


def test_a_normalised_duplicate_is_still_caught(client):
    # "dup.com" and "http://dup.com" normalise to the exact same stored URL
    # (https://dup.com), so this has to compare post-normalisation.
    first = client.post("/bookmarks", json={"url": "https://dup.com"}).json()
    second = client.post("/bookmarks", json={"url": "dup.com"}).json()
    assert second["duplicate_of"] == first["id"]
