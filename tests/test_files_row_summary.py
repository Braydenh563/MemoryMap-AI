"""The Files row holds more than a row can (UI_MODERNISATION_PLAN Phase 7.5).

Asked for directly, twice:

    "the card format is difficult with files as they can be quite long and
     large, a single image or ocr caption doesnt fit them"

and then, as the item itself: "OCR text for a long document does not fit where
a photo's caption fits; the row needs a summary plus a way to open the reading,
not a clamped paragraph."

The row used to render the whole transcription and clamp it. Measured at 1440
on a three-page reading before this change: the paragraph was sliced mid-glyph
two lines in, under a "Show more" that turned one row into a wall.

The server half is checked here for real. The DOM half is lints, for the same
reason the rest of this suite's frontend checks are, measured once in
Chromium, pinned here so it cannot quietly regress.
"""

from __future__ import annotations

import io
from pathlib import Path

from memorymap.core import deps
from memorymap.core.database import PageRead

LIBRARY = Path("frontend/library.js").read_text(encoding="utf-8")
APP = Path("frontend/app.js").read_text(encoding="utf-8")
CSS = Path("frontend/css/07-whiteboard-misc.css").read_text(encoding="utf-8")


def _upload_pdf(client) -> int:
    created = client.post(
        "/media/upload",
        files={"file": ("deck.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
    )
    assert created.status_code == 200, created.text
    return created.json()["id"]


def _store(upload_id: int, page: int, text: str, caption: str = "") -> None:
    with deps.get_db().session() as session:
        session.add(
            PageRead(
                kind="upload", source_id=upload_id, page=page, text=text, caption=caption
            )
        )
        session.commit()


def test_the_gallery_says_how_many_pages_have_been_read(client):
    """The row states "N pages read", and counting pages by splitting the
    joined text would miscount any reading containing a blank line."""
    upload_id = _upload_pdf(client)
    _store(upload_id, 0, "Page one.")
    _store(upload_id, 1, "Page two.\n\nWith a blank line in it.")

    row = next(r for r in client.get("/media").json() if r["id"] == upload_id)
    assert row["pages_read"] == 2


def test_a_page_that_is_only_described_is_not_counted_as_read(client):
    """Phase 7.3 made a description-only page possible. Counting it here would
    tell the row a transcription exists where none does."""
    upload_id = _upload_pdf(client)
    _store(upload_id, 0, "Page one.")
    _store(upload_id, 1, "", caption="A bar chart of the quarterly totals.")

    row = next(r for r in client.get("/media").json() if r["id"] == upload_id)
    assert row["pages_read"] == 1


def test_a_file_nothing_has_read_reports_zero(client):
    upload_id = _upload_pdf(client)
    row = next(r for r in client.get("/media").json() if r["id"] == upload_id)
    assert row["pages_read"] == 0


def test_the_attachment_gallery_carries_it_too(client):
    """Two id spaces, one shape, a note's attached PDF is listed by the same
    grid and needs the same number."""
    created = client.post("/entries", json={"content": "host note"}).json()
    attached = client.post(
        f"/entries/{created['id']}/files",
        files={"file": ("deck.pdf", io.BytesIO(b"%PDF-1.4"), "application/octet-stream")},
    )
    attachment_id = attached.json()["attachments"][-1]["id"]
    with deps.get_db().session() as session:
        session.add(
            PageRead(kind="attachment", source_id=attachment_id, page=0, text="Read.")
        )
        session.commit()

    row = next(
        r for r in client.get("/files/gallery").json() if r["id"] == attachment_id
    )
    assert row["pages_read"] == 1


# --- the row itself (lints) ---------------------------------------------------


def test_a_file_row_shows_a_summary_and_an_image_keeps_its_editable_box():
    """A photo's reading is a line or two and correcting it in place is the
    point; a document's is pages of text with no "page 3" reachable from a
    two-line clamp. Measured in Chromium: the Images tile still renders
    `.library-image-vision-ocr` and no `.library-file-summary`; the Files row
    the reverse."""
    assert "mediaReadingSummary" in LIBRARY
    assert "buildFileReadingSummary" in LIBRARY
    branch = LIBRARY.split("const visionField = image._isImage")[1].split(";")[0]
    assert "library-image-vision-ocr" not in branch, "the image branch keeps its own box"
    assert "buildFileReadingSummary" in branch


def test_the_summary_states_the_two_numbers_the_item_asked_for():
    summary = LIBRARY.split("function mediaReadingSummary(row)")[1].split("\nfunction ")[0]
    assert "pages_read" in summary
    assert "word${words === 1" in summary


def test_the_summary_line_cannot_grow_past_one_line():
    """The clip is the rule's point, not a side effect, it is what makes this
    exactly one line at every width, the same treatment the filename above it
    already gets."""
    block = CSS.split(".library-file-summary {")[1].split("}")[0]
    assert "white-space: nowrap" in block
    assert "text-overflow: ellipsis" in block
    assert "overflow: hidden" in block


def test_open_reading_opens_the_lightbox_at_the_reading():
    assert "library-file-open-reading" in LIBRARY
    assert "{ focusReading: true }" in LIBRARY
    lightbox = APP.split("function openLightbox(")[1].split("\n// ")[0]
    assert "opts.focusReading" in lightbox
    assert 'info.scrollIntoView({ block: "end" })' in lightbox
    assert "infoText.focus();" in lightbox
    #: Page 1 of a scan is often a cover, opening "the reading" on a page with
    #: none is the same disappointment as not opening it at all.
    assert "Math.min(...docPagesRead)" in lightbox


def test_both_doors_into_the_lightbox_build_the_same_items():
    """Two copies of that mapping would be two chances for the tile click and
    the Open reading button to open subtly different dialogs."""
    assert LIBRARY.count("function libraryLightboxItems(") == 1
    #: The declaration reads `function libraryLightboxItems(images)`, so it
    #: matches the call text too, subtracted rather than matched around, since
    #: a cleverer pattern here would be a lint about a lint.
    assert LIBRARY.count("libraryLightboxItems(images)") - 1 == 2
