"""A deleted OCR reading goes to the bin and comes back (WORLD_CLASS_PLAN 28.4 row 2).

Deleting a page's reading, or an image's whole reading, used to take it away
for good. Now each delete answers with the bin row that holds it, Undo
restores it by that id, the Library's Bin lists it, and emptying the bin
takes it for good.
"""

from __future__ import annotations

import io

from memorymap.api import routes_files

PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
    "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082"
)


def _upload(client) -> dict:
    res = client.post(
        "/media/upload",
        files={"file": ("scan.png", io.BytesIO(PNG), "image/png")},
        data={"direct": "true"},
    )
    assert res.status_code in (200, 201), res.text
    return res.json()


def _bin_items(client) -> list[dict]:
    items = client.get("/library?kind=archived").json()
    rows = items if isinstance(items, list) else items.get("items", [])
    return [r for r in rows if r.get("subtype") == "reading"]


def test_a_page_reading_delete_goes_to_the_bin_and_restores(client):
    upload = _upload(client)
    key = routes_files._page_read_key(None, upload["id"])
    routes_files._remember_page_read(
        key, routes_files.OcrPageReadOut(page=0, text="Lecture four, memory.", model="stub"), "vision"
    )
    gone = client.delete(f"/media/{upload['id']}/page-reads/0")
    assert gone.status_code == 200, gone.text
    binned_id = gone.json()["binned_id"]
    assert binned_id
    res = client.get(f"/media/{upload['id']}/page-reads")
    assert res.json()["pages"] == []

    back = client.post(f"/reading-bin/{binned_id}/restore")
    assert back.status_code == 200, back.text
    pages = client.get(f"/media/{upload['id']}/page-reads").json()["pages"]
    assert [p["text"] for p in pages] == ["Lecture four, memory."]
    # Restored once: the bin no longer holds it.
    res = client.post(f"/reading-bin/{binned_id}/restore")
    assert res.status_code == 404


def test_an_image_reading_delete_goes_to_the_bin_and_restores(client):
    upload = _upload(client)
    uid = upload["id"]
    set_text = client.post(f"/media/{uid}/vision-ocr", json={"text": "Read chapter 7."})
    assert set_text.status_code == 200, set_text.text
    gone = client.delete(f"/media/{uid}/readings/vision")
    assert gone.status_code == 200, gone.text
    binned_id = gone.json()["binned_id"]
    assert binned_id
    binned_rows = _bin_items(client)
    assert any(r["id"] == binned_id for r in binned_rows)

    res = client.post(f"/reading-bin/{binned_id}/restore")
    assert res.status_code == 200
    meta = client.get(f"/media/meta/{upload['url'].split('/')[-1]}").json()
    assert meta["vision_ocr_text"] == "Read chapter 7."
    binned_rows = _bin_items(client)
    assert not any(r["id"] == binned_id for r in binned_rows)


def test_a_file_reading_delete_names_its_source(client):
    upload = _upload(client)
    res = client.delete(f"/media/{upload['id']}/readings/nonsense")
    assert res.status_code == 422
    # Nothing to bin is not an error: the state the caller wanted.
    res = client.delete(f"/media/{upload['id']}/readings/tesseract")
    assert res.json()["binned_id"] is None


def test_attachment_routes_and_purge(client):
    created = client.post("/entries", json={"content": "host"}).json()
    up = client.post(
        f"/entries/{created['id']}/files",
        files={"file": ("scan.png", io.BytesIO(PNG), "image/png")},
    )
    assert up.status_code == 201, up.text
    attachment_id = up.json()["attachments"][-1]["id"]
    key = routes_files._page_read_key(attachment_id, None)
    routes_files._remember_page_read(
        key, routes_files.OcrPageReadOut(page=0, text="Page text.", model="stub"), "vision"
    )
    binned_id = client.delete(f"/files/{attachment_id}/page-reads/0").json()["binned_id"]
    assert binned_id
    res = client.delete(f"/files/{attachment_id}/readings/vision")
    assert res.json()["binned_id"] is None
    res = client.delete(f"/reading-bin/{binned_id}/purge")
    assert res.status_code == 200
    res = client.post(f"/reading-bin/{binned_id}/restore")
    assert res.status_code == 404


def test_emptying_the_bin_takes_readings(client):
    upload = _upload(client)
    client.post(f"/media/{upload['id']}/ocr", json={"text": "Spaced repetition."})
    binned_id = client.delete(f"/media/{upload['id']}/readings/tesseract").json()["binned_id"]
    assert binned_id
    res = client.post("/recycle-bin/empty")
    assert res.status_code == 200
    res = client.post(f"/reading-bin/{binned_id}/restore")
    assert res.status_code == 404
