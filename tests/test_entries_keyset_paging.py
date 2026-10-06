"""`GET /entries` pages by a cursor as well as an offset (audit 2026-10-05, ARCH-04).

Measured: every unlock read the whole notebook as 26 sequential
`/entries?limit=200&offset=...` pages at 5,000 notes, and offset paging over
a list that changes during the read skips or repeats a note: a note saved
while page two is in flight pushes page one's last row onto page two. A
cursor names the last row seen, `(pinned, created_at, id)`, so the next page
starts after it whatever was added in front.

Backwards compatible: `offset` still works, and `X-Next-Cursor` is only a
header. The client's switch from offsets to the cursor is the frontend
audit's FE-05.
"""

from __future__ import annotations


def _walk(client, limit: int, **extra) -> list[int]:
    seen: list[int] = []
    cursor = ""
    for _ in range(50):
        params = {"limit": limit, **({"after": cursor} if cursor else {})}
        reply = client.get("/entries", params=params)
        assert reply.status_code == 200, reply.text
        seen.extend(row["id"] for row in reply.json())
        if "on_page" in extra:
            extra.pop("on_page")(client)
        cursor = reply.headers.get("X-Next-Cursor", "")
        if not cursor:
            return seen
    raise AssertionError("the cursor never ran out")


def test_the_cursor_walks_the_same_list_the_offsets_do(client):
    ids = [client.post("/entries", json={"content": f"note {i}"}).json()["id"] for i in range(7)]
    client.put(f"/entries/{ids[2]}", json={"pinned": True})
    whole = [row["id"] for row in client.get("/entries", params={"limit": 100}).json()]
    assert _walk(client, 3) == whole
    assert whole[0] == ids[2]


def test_a_note_saved_during_the_walk_neither_repeats_nor_hides_one(client):
    for i in range(6):
        client.post("/entries", json={"content": f"note {i}"})
    before = [row["id"] for row in client.get("/entries", params={"limit": 100}).json()]
    added: list[int] = []

    def save_one(c) -> None:  # noqa: ANN001
        if not added:
            added.append(c.post("/entries", json={"content": "written mid-walk"}).json()["id"])

    walked = _walk(client, 2, on_page=save_one)
    assert len(walked) == len(set(walked)), "a note came back twice"
    assert walked == before, "the walk lost or repeated a note the list held when it started"


def test_a_bad_cursor_is_a_plain_422(client):
    reply = client.get("/entries", params={"after": "not-a-cursor"})
    assert reply.status_code == 422
    assert reply.json()["code"] == "invalid"


def test_the_last_page_has_no_cursor(client):
    client.post("/entries", json={"content": "only one"})
    reply = client.get("/entries", params={"limit": 5})
    assert "X-Next-Cursor" not in reply.headers
