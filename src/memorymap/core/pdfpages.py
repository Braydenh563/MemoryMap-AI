"""Turning a PDF page into an image, so a vision model can read it.

This is the piece `core/docview.py`'s docstring described as missing: a scanned
PDF has no text layer, `ai/vision_ocr.py` reads *images*, and nothing here
turned one into the other. The seam was built and the plug was not.

**Why pypdfium2 and not the alternatives.** Measured rather than assumed —
installed into this project's own venv and run:

- ``pypdfium2`` + ``Pillow``: ~16 MB on disk, installs in seconds from a
  self-contained wheel, no system packages, **no torch**, and renders a page in
  about 20 ms. It is Google's PDFium, the renderer in Chrome, under a BSD
  licence.
- ``PyMuPDF`` renders just as well but is AGPL, which for this project is a
  licensing decision rather than a dependency (see ANALYSIS.md).
- ``pdf2image`` shells out to Poppler, a system package the user has to install
  by hand — the opposite of what a local-first app that must "just run" wants.

Optional, and it stays optional. Everything here degrades to "no pages" if the
library is absent, and `core/extras.py` carries the install button. The rule
that made the extras catalogue exist applies to this too: a new dependency is a
decision, not a side effect.

Deliberately not Tesseract, by direct instruction: *"I basically dont want to
download tesseract and only want to use an ai vision learning and ocr model for
images and scanned documents."* Nothing here reads text. It produces pixels and
hands them to the model.
"""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

#: How many pages of one PDF are ever rendered.
#:
#: A vision model reads a page in seconds, not milliseconds, so a 300-page scan
#: is an hour of GPU time nobody asked for. Eight pages is enough to answer
#: "what is this document" — which is what the viewer is for — and the message
#: says plainly when there was more.
MAX_PAGES = 8

#: Render scale. PDF user units are 1/72 inch, so 2.0 is ~144 DPI.
#:
#: Chosen against what OCR models actually want rather than what looks nice:
#: below about 150 DPI small type stops being legible to them, and above 300
#: the image gets large enough that the *model* becomes the bottleneck twice
#: over — more pixels to encode, and a longer prompt to hold them.
RENDER_SCALE = 2.0

#: Refuse to rasterise anything larger. A PDF is a container format and can
#: hold a single 20,000 x 20,000 page; rendering that at 2x is several
#: gigabytes of bitmap in one allocation. The limit is on the rendered pixel
#: count rather than the file size, because those are unrelated — a 40 KB PDF
#: can declare a page a metre wide.
MAX_PIXELS = 40_000_000


def available() -> bool:
    """Is there a rasteriser in this interpreter?

    Import rather than `pip show`, same reasoning as `extras.is_installed`:
    what matters is whether this process can use it.
    """
    try:
        import pypdfium2  # noqa: F401
        import PIL  # noqa: F401
    except ImportError:
        return False
    return True


def page_count(path: Path) -> int:
    """How many pages, or 0 if it cannot be read at all."""
    if not available():
        return 0
    try:
        import pypdfium2 as pdfium

        document = pdfium.PdfDocument(str(path))
        try:
            return len(document)
        finally:
            document.close()
    except Exception as exc:  # noqa: BLE001 — a viewer must not 500 on a bad file
        logger.debug("couldn't count pages in %s: %s", path, exc)
        return 0


def render_pages(path: Path, limit: int = MAX_PAGES) -> list[bytes]:
    """The first ``limit`` pages as PNG bytes, or [].

    Never raises. Every caller is a viewer or a background job, and a
    malformed, encrypted or truncated PDF is an ordinary thing to be handed —
    the honest answer is "no pages", which the caller already has a message
    for.

    Pages are rendered one at a time and released as they go: holding eight
    decoded bitmaps at once is the difference between tens and hundreds of
    megabytes on a large scan.
    """
    if not available():
        return []
    try:
        import io

        import pypdfium2 as pdfium
    except ImportError:
        return []

    pages: list[bytes] = []
    document = None
    try:
        document = pdfium.PdfDocument(str(path))
        for index in range(min(len(document), max(0, limit))):
            page = document[index]
            try:
                width, height = page.get_size()
                if (width * RENDER_SCALE) * (height * RENDER_SCALE) > MAX_PIXELS:
                    logger.info(
                        "skipping page %d of %s: %dx%d at %.1fx exceeds the "
                        "pixel limit",
                        index + 1, path.name, width, height, RENDER_SCALE,
                    )
                    continue
                image = page.render(scale=RENDER_SCALE).to_pil()
                try:
                    buffer = io.BytesIO()
                    # Greyscale before PNG: a scanned page carries no colour
                    # worth keeping, and this is roughly a third of the bytes
                    # for the model to encode.
                    image.convert("L").save(buffer, format="PNG", optimize=True)
                    pages.append(buffer.getvalue())
                finally:
                    image.close()
            finally:
                page.close()
    except Exception as exc:  # noqa: BLE001 — see the docstring
        logger.info("couldn't rasterise %s: %s", path, exc)
        return pages
    finally:
        if document is not None:
            try:
                document.close()
            except Exception:  # noqa: BLE001
                pass
    return pages
