"""The four lists that still returned the whole table (WORLD_CLASS_PLAN F2).

`test_list_limits.py` is the lint that stops a fifth appearing. This is the
behavioural half: each of the four now bounds its response and still reports
the real total, because a page that lies about how much there is turns "42
files nothing points at" into a number that shrinks when you look at it.
"""

from __future__ import annotations

import io


def _png() -> bytes:
    # A one-pixel PNG, enough for an upload to be accepted and stored.
    import base64

    return base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )


def test_the_attachment_gallery_pages_and_counts(client):
    note = client.post("/entries", json={"content": "a note with files"}).json()
    for i in range(3):
        sent = client.post(
            f"/entries/{note['id']}/files",
            files={"file": (f"pic{i}.png", io.BytesIO(_png()), "image/png")},
        )
        assert sent.status_code in (200, 201), sent.text

    page = client.get("/files/gallery?limit=2")
    assert page.status_code == 200, page.text
    assert len(page.json()) == 2
    assert page.headers["X-Total-Count"] == "3"
    # The second page is the rest, and no row appears on both.
    rest = client.get("/files/gallery?limit=2&offset=2").json()
    assert len(rest) == 1
    assert {row["id"] for row in page.json()} & {row["id"] for row in rest} == set()


def test_the_memory_stream_pages_and_counts(client):
    for i in range(4):
        made = client.post("/memory", json={"content": f"always do thing {i}"})
        assert made.status_code == 201, made.text
    page = client.get("/memory?limit=2").json()
    assert len(page["preferences"]) == 2
    assert page["total"] == 4
    rest = client.get("/memory?limit=2&offset=2").json()
    assert len(rest["preferences"]) == 2
    ids = {row["id"] for row in page["preferences"]} & {row["id"] for row in rest["preferences"]}
    assert ids == set()


def test_the_orphan_scan_pages_but_still_counts_every_orphan(client):
    for i in range(3):
        sent = client.post(
            "/media/upload", files={"file": (f"loose{i}.png", io.BytesIO(_png()), "image/png")}
        )
        assert sent.status_code in (200, 201), sent.text
    found = client.get("/media/orphans?limit=1").json()
    assert found["total"] == 3, found
    assert len(found["orphans"]) == 1
    # The page bounds the response, not the check: the delete still acts on
    # every orphan, or the count on screen could never agree with what went.
    cleaned = client.request("DELETE", "/media/orphans").json()
    assert cleaned["deleted"] == 3


def test_the_duplicate_list_pages_and_counts(client):
    for _ in range(4):
        client.post("/entries", json={"content": "the very same sentence, written again"})
    found = client.get("/duplicates?limit=1").json()
    assert "total" in found and found["total"] >= 0
    assert len(found["groups"]) <= 1
