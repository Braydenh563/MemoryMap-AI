"""The Bookmarks sub-tab's backend halves: read state, whole-link restore for
Undo, and paging past the first 200 (INBOX 445 (1))."""

from __future__ import annotations


def test_a_new_bookmark_is_unread_and_can_be_marked_read(client):
    """The Library's "Unread" filter is a reading list: a saved link starts
    unread, opening it (or ticking it) sets `is_read`, and the flag round-trips
    through the list."""
    made = client.post("/bookmarks", json={"url": "read.example"}).json()
    assert made["is_read"] is False
    out = client.put(f"/bookmarks/{made['id']}", json={"is_read": True}).json()
    assert out["is_read"] is True
    assert client.get("/bookmarks").json()[0]["is_read"] is True
    # A later edit that does not mention it leaves it alone.
    client.put(f"/bookmarks/{made['id']}", json={"title": "Renamed"})
    assert client.get("/bookmarks").json()[0]["is_read"] is True


def test_create_carries_pin_and_read_state_so_a_restore_is_whole(client):
    made = client.post(
        "/bookmarks",
        json={"url": "again.example", "pinned": True, "is_read": True, "note": "n", "group_name": "G"},
    ).json()
    assert (made["pinned"], made["is_read"], made["note"], made["group_name"]) == (True, True, "n", "G")


def test_the_list_pages_past_two_hundred(client):
    """The Library page asks for every page; the endpoint has to hand over the
    rest when asked, with a stable order across the page boundary."""
    for i in range(205):
        client.post("/bookmarks", json={"url": f"site{i}.example"})
    first = client.get("/bookmarks", params={"limit": 200}).json()
    rest = client.get("/bookmarks", params={"limit": 200, "offset": 200}).json()
    assert len(first) == 200 and len(rest) == 5
    assert not {b["id"] for b in first} & {b["id"] for b in rest}
