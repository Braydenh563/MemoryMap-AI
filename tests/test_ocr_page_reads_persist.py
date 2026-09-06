"""A page reading survives the workspace being closed.

Reported twice, in the same words the second time: *"ai read the pages 1-3 in my
pdf as I put it, but no text appeared in any of the extracted text areas??
notifications appeared saying the pages were read but nothing happened after
that."*

The second sentence is the diagnosis. A page read is a model round-trip of
several seconds, and the app deliberately announces it as a background task so
the workspace can be closed while it runs (`test_ocr_page_read_tasks.py`) — but
the result only ever existed in the HTTP response and in the DOM that response
painted. Close the window, switch tab, or simply have the read land after you
have moved on, and the reading was gone: reopening the document ran the
*regions* request, which knows nothing about page reads, and painted an empty
pane over work that had genuinely happened.

`PageRead` stores each page as it completes and `GET /{files,media}/{id}/page-reads`
hands back what is known, in the same envelope a range read returns so the
workspace can put it through one renderer.
"""

from __future__ import annotations

import io

import pytest

from memorymap.api import routes_files
from memorymap.core import pdfpages

ONE_PAGE_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]/Contents 4 0 R"
    b"/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
    b"4 0 obj<</Length 44>>stream\nBT /F1 24 Tf 20 40 Td (Hello OCR) Tj ET\n"
    b"endstream endobj\n"
    b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
    b"trailer<</Root 1 0 R>>"
)


def _attach(client, name: str, data: bytes) -> int:
    created = client.post("/entries", json={"content": "host note"}).json()
    upload = client.post(
        f"/entries/{created['id']}/files",
        files={"file": (name, io.BytesIO(data), "application/octet-stream")},
    )
    assert upload.status_code == 201, upload.text
    return upload.json()["attachments"][-1]["id"]


def test_a_document_with_nothing_read_reports_nothing(client):
    attachment_id = _attach(client, "blank.pdf", ONE_PAGE_PDF)
    body = client.get(f"/files/{attachment_id}/page-reads").json()
    assert body["pages"] == []
    assert body["read"] == 0


def test_a_reading_is_stored_and_handed_back(client, monkeypatch):
    """The report, end to end: read a page, then ask as if the window reopened."""
    attachment_id = _attach(client, "scan.pdf", ONE_PAGE_PDF)
    if not pdfpages.available():
        pytest.skip("the PDF rasteriser extra is not installed here")

    monkeypatch.setattr(
        routes_files,
        "_vision_read_page",
        lambda path, index, reader="vision": routes_files.OcrPageReadOut(
            page=index, text="The words on the page.", model="stub-vision"
        ),
    )
    read = client.post(f"/files/{attachment_id}/ocr-page-read?page=0")
    assert read.status_code == 200, read.text
    assert read.json()["text"] == "The words on the page."

    # Now the part that was broken: come back to it later.
    later = client.get(f"/files/{attachment_id}/page-reads").json()
    assert [page["page"] for page in later["pages"]] == [0]
    assert later["pages"][0]["text"] == "The words on the page."
    assert later["pages"][0]["model"] == "stub-vision"
    assert later["read"] == 1


def test_re_reading_a_page_replaces_it_rather_than_stacking(client, monkeypatch):
    attachment_id = _attach(client, "scan.pdf", ONE_PAGE_PDF)
    if not pdfpages.available():
        pytest.skip("the PDF rasteriser extra is not installed here")

    texts = iter(["first attempt", "second, better attempt"])
    monkeypatch.setattr(
        routes_files,
        "_vision_read_page",
        lambda path, index, reader="vision": routes_files.OcrPageReadOut(
            page=index, text=next(texts), model="stub-vision"
        ),
    )
    client.post(f"/files/{attachment_id}/ocr-page-read?page=0")
    client.post(f"/files/{attachment_id}/ocr-page-read?page=0")
    pages = client.get(f"/files/{attachment_id}/page-reads").json()["pages"]
    assert len(pages) == 1, "one page must have one reading, not a history of them"
    assert pages[0]["text"] == "second, better attempt"


def test_an_empty_reading_is_not_stored(client, monkeypatch):
    """"Nothing found on page 4" is not a transcription.

    Storing it would make a later, better reader look like it had nothing to
    add — the pane would show a stored blank instead of asking again.
    """
    attachment_id = _attach(client, "scan.pdf", ONE_PAGE_PDF)
    if not pdfpages.available():
        pytest.skip("the PDF rasteriser extra is not installed here")

    monkeypatch.setattr(
        routes_files,
        "_vision_read_page",
        lambda path, index, reader="vision": routes_files.OcrPageReadOut(
            page=index, text="", message="nothing found"
        ),
    )
    client.post(f"/files/{attachment_id}/ocr-page-read?page=0")
    assert client.get(f"/files/{attachment_id}/page-reads").json()["pages"] == []


def test_a_range_read_stores_every_page_it_managed(client, monkeypatch):
    attachment_id = _attach(client, "scan.pdf", ONE_PAGE_PDF)
    if not pdfpages.available():
        pytest.skip("the PDF rasteriser extra is not installed here")

    monkeypatch.setattr(
        routes_files,
        "_vision_read_page",
        lambda path, index, reader="vision": routes_files.OcrPageReadOut(
            page=index, text=f"page {index + 1}", model="stub-vision"
        ),
    )
    body = client.post(f"/files/{attachment_id}/ocr-range-read?pages=all").json()
    assert body["read"] >= 1
    stored = client.get(f"/files/{attachment_id}/page-reads").json()
    assert [page["text"] for page in stored["pages"]] == ["page 1"]
