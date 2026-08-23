"""Local OCR text extraction for uploaded images (ROADMAP.md item 30d).

A whiteboard photo or a scanned page attached via `POST /media/upload`
attaches today as an opaque file nothing reads — "what was on that
whiteboard photo from March" is unanswerable by search. This reads the
image once, in the background, and stores what it found on
`MediaUpload.ocr_text`, so the Library's Image Gallery search (client-side,
same as the rest of the Library's own search box) can find it.

Deliberately **not** wired through `core/extras.py`'s pip-based installer
registry: the actual capability lives in the `tesseract` system binary
(Tesseract OCR), which is not something this app can `pip install` for
someone — unlike `sentence-transformers`, there's no PyPI wheel that ships
the binary. `pytesseract` (the thin Python wrapper this module imports) is
a small, pure-Python package listed directly in `requirements.txt` — safe
by CLAUDE.md's own standing rule, which only bans `torch`/
`sentence-transformers` specifically. When the `tesseract` binary itself
isn't on PATH, this degrades to "extracts nothing," logged once per
process rather than once per upload, never a failed upload — the same
"never blocks or fails the thing it's attached to" contract
`ai/embeddings.py`'s own background retry already follows.
"""

from __future__ import annotations

import logging
import shutil
import threading
from pathlib import Path

logger = logging.getLogger("memorymap.ocr")

#: Only raster formats Tesseract/Pillow can open directly — deliberately
#: excludes PDF (`MEDIA_SUFFIXES` in routes_files.py allows it too), which
#: would need page rasterisation (a poppler/pdf2image dependency this
#: feature doesn't pull in) before Tesseract could see anything at all.
OCR_SUFFIXES = frozenset({".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"})

_binary_missing_logged = False
_package_missing_logged = False


def tesseract_available() -> bool:
    return shutil.which("tesseract") is not None


def extract_text(image_path: Path) -> str:
    """Best-effort OCR text for one image file. Never raises — a missing
    binary, a corrupt image, or an unsupported format all just mean no text
    was found, exactly as if the image genuinely had none."""
    global _binary_missing_logged
    if not tesseract_available():
        if not _binary_missing_logged:
            _binary_missing_logged = True
            logger.info(
                "the 'tesseract' binary isn't on PATH — uploaded images won't "
                "get searchable OCR text until Tesseract OCR is installed "
                "separately (see INSTALL.md); this is not an error"
            )
        return ""
    global _package_missing_logged
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        # The tesseract *binary* is on PATH (checked above) but the
        # `pytesseract`/`Pillow` Python packages aren't installed — a
        # different gap than the binary-missing one, and worth its own
        # once-per-process message rather than a warning on every upload.
        if not _package_missing_logged:
            _package_missing_logged = True
            logger.info(
                "tesseract is installed but the pytesseract/Pillow Python "
                "packages aren't — run: pip install pytesseract Pillow"
            )
        return ""
    try:
        with Image.open(image_path) as img:
            text = pytesseract.image_to_string(img)
        return text.strip()
    except Exception:
        # A single unreadable image (corrupt file, an animated GIF Tesseract
        # chokes on, a format Pillow can't decode) must never take down the
        # background thread it runs on or be mistaken for the binary being
        # missing — logged with the traceback so a real recurring failure is
        # still diagnosable, just not surfaced to the person who uploaded it.
        logger.warning("OCR failed for %s", image_path.name, exc_info=True)
        return ""


def extract_and_store(upload_id: int, image_path: Path) -> None:
    """Runs OCR synchronously and writes the result onto the `MediaUpload`
    row if any text was found. Split out from `extract_in_background` below
    so tests can call this directly without waiting on a real thread."""
    text = extract_text(image_path)
    if not text:
        return
    # Imported here, not at module level: this file has to stay importable
    # (for `tesseract_available()`/`extract_text()` alone) without pulling
    # in the whole app's dependency graph just to check whether a binary
    # exists on PATH.
    from memorymap.core import deps
    from memorymap.core.database import MediaUpload

    with deps.get_db().session() as session:
        upload = session.get(MediaUpload, upload_id)
        if upload is None:
            return  # deleted (or its upload never committed) before OCR finished
        upload.ocr_text = text
        session.commit()


def extract_in_background(upload_id: int, image_path: Path) -> None:
    """Fire-and-forget: never blocks the `POST /media/upload` response.
    Tesseract can take a second or two per image, and the upload itself is
    already done by the time this runs — the same "don't make the caller
    wait for something that isn't the point of the request" reasoning as
    `ai/embeddings.py`'s background reinstall-and-retry."""
    threading.Thread(
        target=extract_and_store,
        args=(upload_id, image_path),
        daemon=True,
        name="ocr-extract",
    ).start()
