"""A Files row asks for a PDF's first page only when the server can draw one.

OPEN.md, Library, "A Files row asks for a PDF first page that this sandbox
cannot render": four `GET /media/pdf-page/<name>/0` 404s per render of the
Files sub-tab, one per document row, on any install without the PDF render
extra (`pdfpages.available()` false). The `<img>` removed itself on error and
left the type glyph, so nothing looked wrong, but every render paid a request
that could only fail and `errors.js` reported each as a console error.

The server knows whether it can render (`pdfpages.available()`), so it says
so on each row as `has_pages`, and the tile asks for a page only then.
"""

from __future__ import annotations

import io
from pathlib import Path

from memorymap.core import pdfpages


def _upload_pdf(client) -> int:
    created = client.post(
        "/media/upload",
        files={"file": ("deck.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
    )
    assert created.status_code == 200, created.text
    return created.json()["id"]


def test_media_rows_say_has_pages_only_when_a_page_can_be_drawn(client, monkeypatch):
    upload_id = _upload_pdf(client)
    monkeypatch.setattr(pdfpages, "available", lambda: False)
    row = next(r for r in client.get("/media").json() if r["id"] == upload_id)
    assert row["has_pages"] is False
    monkeypatch.setattr(pdfpages, "available", lambda: True)
    row = next(r for r in client.get("/media").json() if r["id"] == upload_id)
    assert row["has_pages"] is True


def test_an_image_upload_never_has_pages(client, monkeypatch):
    monkeypatch.setattr(pdfpages, "available", lambda: True)
    png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06"
        b"\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\x0f\x00\x00\x01\x01"
        b"\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    created = client.post("/media/upload", files={"file": ("dot.png", io.BytesIO(png), "image/png")})
    assert created.status_code == 200, created.text
    row = next(r for r in client.get("/media").json() if r["id"] == created.json()["id"])
    assert row["has_pages"] is False


def test_the_tile_asks_for_a_page_on_has_pages_alone():
    """The file-name guess (`/\\.pdf$/`) is what asked a server with no
    rasteriser for a page it could only 404."""
    app = Path("frontend/js/library.js").read_text(encoding="utf-8")
    start = app.index('page.className = "library-file-page"')
    guard = app.rindex("if (", 0, start)
    assert app[guard:start].startswith("if (image.has_pages)"), app[guard:start][:120]
