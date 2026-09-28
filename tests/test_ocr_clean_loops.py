"""Clean up repeated lines" in the OCR workspace/lightbox menu (INBOX 423f).

`cut_reading_loops` (ai/vision_ocr.py) already exists to stop a degenerate
model reply ("Test, Test, Test, ...") from ever being stored, and
`tests/test_vision_ocr.py` covers that function itself. What was missing is a
way to run it on a reading that is *already* stored, one saved before the cut
existed, or one a since-changed model still managed to loop: nothing re-reads
an already-stored reading on its own, so a loop sitting in the database stayed
there forever. These two small POST routes clean a reading in place, and
`frontend/library.js` wires a "Clean up repeated lines" item into the OCR
workspace and lightbox menus for both.
"""

from __future__ import annotations


#: The same shape `test_vision_ocr.py`'s own loop tests use: a word repeated
#: past the collapse threshold, with a last unfinished repeat on the end.
LOOP = "Test " * 30 + "Test"


def _once(text: str, word: str) -> bool:
    return text.count(word) == 1


def test_an_attachment_reading_is_cleaned_in_place(client):
    created = client.post("/entries", json={"content": "host note"}).json()
    files = {"file": ("scan.png", b"\x89PNG\r\n\x1a\n" + b"0" * 32, "image/png")}
    upload = client.post(f"/entries/{created['id']}/files", files=files)
    attachment_id = upload.json()["attachments"][-1]["id"]
    client.post(f"/files/{attachment_id}/analyse", json={"kind": "vision", "text": LOOP})

    response = client.post(f"/files/{attachment_id}/ocr-clean-loops")
    assert response.status_code == 200
    body = response.json()
    assert _once(body["vision_ocr_text"], "Test")
    assert len(body["vision_ocr_text"]) < len(LOOP)

    # And it is actually saved, not just returned once.
    again = client.get("/files/gallery").json()
    row = next(r for r in again if r["id"] == attachment_id)
    assert row["vision_ocr_text"] == body["vision_ocr_text"]


def test_a_media_upload_reading_is_cleaned_in_place(client):
    files = {"file": ("scan.png", b"\x89PNG\r\n\x1a\n" + b"0" * 32, "image/png")}
    upload = client.post("/media/upload", files=files).json()
    upload_id = upload["id"]
    client.post(f"/media/{upload_id}/ocr", json={"text": LOOP})

    response = client.post(f"/media/{upload_id}/ocr-clean-loops")
    assert response.status_code == 200
    body = response.json()
    assert _once(body["ocr_text"], "Test")
    assert len(body["ocr_text"]) < len(LOOP)


def test_cleaning_a_reading_with_no_loop_leaves_it_unchanged(client):
    created = client.post("/entries", json={"content": "host note"}).json()
    files = {"file": ("scan.png", b"\x89PNG\r\n\x1a\n" + b"0" * 32, "image/png")}
    upload = client.post(f"/entries/{created['id']}/files", files=files)
    attachment_id = upload.json()["attachments"][-1]["id"]
    client.post(f"/files/{attachment_id}/analyse", json={"kind": "vision", "text": "An ordinary reading."})

    response = client.post(f"/files/{attachment_id}/ocr-clean-loops")
    assert response.status_code == 200
    assert response.json()["vision_ocr_text"] == "An ordinary reading."


def test_cleaning_is_idempotent(client):
    created = client.post("/entries", json={"content": "host note"}).json()
    files = {"file": ("scan.png", b"\x89PNG\r\n\x1a\n" + b"0" * 32, "image/png")}
    upload = client.post(f"/entries/{created['id']}/files", files=files)
    attachment_id = upload.json()["attachments"][-1]["id"]
    client.post(f"/files/{attachment_id}/analyse", json={"kind": "vision", "text": LOOP})

    first = client.post(f"/files/{attachment_id}/ocr-clean-loops").json()
    second = client.post(f"/files/{attachment_id}/ocr-clean-loops").json()
    assert first["vision_ocr_text"] == second["vision_ocr_text"]


def test_both_fields_are_cleaned_when_both_hold_a_loop(client):
    created = client.post("/entries", json={"content": "host note"}).json()
    files = {"file": ("scan.png", b"\x89PNG\r\n\x1a\n" + b"0" * 32, "image/png")}
    upload = client.post(f"/entries/{created['id']}/files", files=files)
    attachment_id = upload.json()["attachments"][-1]["id"]
    client.post(f"/files/{attachment_id}/analyse", json={"kind": "vision", "text": LOOP})
    client.post(f"/files/{attachment_id}/analyse", json={"kind": "ocr", "text": LOOP})

    body = client.post(f"/files/{attachment_id}/ocr-clean-loops").json()
    assert _once(body["vision_ocr_text"], "Test")
    assert _once(body["ocr_text"], "Test")


def test_a_missing_attachment_is_a_404(client):
    assert client.post("/files/999999/ocr-clean-loops").status_code == 404


def test_a_missing_upload_is_a_404(client):
    assert client.post("/media/999999/ocr-clean-loops").status_code == 404
