"""Automatic image captions from a vision-capable model.

Companion to `core/ocr.py`, same shape and same contract: read one image,
best-effort, never raise, store the result on `MediaUpload` and move on.
OCR reads text that is *in* the image; this describes what the image *is* —
useful for a photo with no text at all, and for handing an AI (this one or
another) something to search and reason over besides a filename.

Runs on a background thread after `POST /media/upload`, exactly like OCR —
but only when a vision model is actually resolvable (`ModelManager.
resolve_vision_model`), checked fresh each time rather than cached, since
whether one is installed can change between two uploads in the same
session. Written once and left alone after that: a caption already read and
trusted (by a person, or by this same app's own chat context) must not
silently change under them just because the notebook was reopened. The one
way to get a new one is `POST /media/{id}/caption`, asked for directly by
name.
"""

from __future__ import annotations

import base64
import logging
import mimetypes
import threading
from pathlib import Path

logger = logging.getLogger("memorymap.captioning")

#: Short, factual, no preamble — this is metadata a search box and another
#: AI will read, not a sentence a person is meant to enjoy. Kept as a plain
#: instruction rather than a persona-flavoured prompt on purpose: a caption
#: written in the librarian's voice would be a strange thing to find surfaced
#: back in a *different* persona's answer later.
CAPTION_PROMPT = (
    "Describe this image in one or two short, factual sentences — what it "
    "shows, and any visible text worth naming. No preamble, no opinions, "
    "just the description."
)

#: Same raster-only restriction OCR uses (`ocr.OCR_SUFFIXES`) — a vision
#: model is handed the same file either would open, and a PDF needs the
#: same page-rasterisation step neither of them has.
CAPTION_SUFFIXES = frozenset({".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"})


def caption_text(image_path: Path, model: str, ollama) -> str:
    """Best-effort caption for one image file. Never raises — a missing
    file, an unreachable backend, or a model that ignores the image all
    just mean no caption was produced, exactly as `ocr.extract_text` treats
    every failure as "found nothing", not an error."""
    try:
        data = image_path.read_bytes()
    except OSError:
        return ""
    mime = mimetypes.guess_type(image_path.name)[0] or "image/png"
    uri = f"data:{mime};base64,{base64.b64encode(data).decode('ascii')}"
    try:
        reply = ollama.chat(
            model,
            [{"role": "user", "content": CAPTION_PROMPT, "images": [uri]}],
        )
        return (reply.get("content") or "").strip()
    except Exception:
        # Same reasoning as ocr.extract_text's own bare except: one bad
        # upload (a corrupt file, a model that errors on this specific
        # image) must never take down the background thread it runs on.
        logger.warning("Captioning failed for %s", image_path.name, exc_info=True)
        return ""


def caption_and_store(upload_id: int, image_path: Path, force: bool = False) -> str | None:
    """Runs synchronously and writes the result onto the `MediaUpload` row.

    Returns the new caption, the existing one (when `force` is False and a
    caption is already there — the "don't rewrite unless asked" rule), or
    None if nothing could be produced (no vision model, upload gone, empty
    result). Split out from `caption_in_background` below so a manual
    regenerate request and the tests that cover it can call this directly
    without waiting on a real thread.
    """
    from memorymap.core import deps
    from memorymap.core.database import MediaUpload

    from memorymap.core import taskhistory

    with deps.get_db().session() as session:
        upload = session.get(MediaUpload, upload_id)
        if upload is None:
            return None  # deleted (or its upload never committed) before this ran
        if upload.caption and not force:
            return upload.caption
        model = deps.get_model_manager().resolve_vision_model(deps.get_ollama())
        if not model:
            # Not a failure worth a history entry — every upload on a
            # notebook with no vision model installed would otherwise fill
            # the ring with the same expected, non-actionable line.
            return None
        text = caption_text(image_path, model, deps.get_ollama())
        if not text:
            # A real attempt was made (a model was resolved) and produced
            # nothing — the actual failure the report was about: a caption
            # call failing outright with no visible record of it anywhere
            # but the log console, and Settings → Background tasks showing
            # captioning as if it had never run at all.
            taskhistory.record(
                "caption", f"Captioning {upload.original_name}", "failed", name=model
            )
            return None
        upload.caption = text
        # Which model wrote this, surfaced in the UI so a caption reads as
        # one model's guess rather than the app's own opinion (asked for
        # directly). A fresh AI write always supersedes a manual edit.
        upload.caption_model = model
        upload.caption_edited = False
        session.commit()
        taskhistory.record(
            "caption", f"Captioning {upload.original_name}", "completed", name=model
        )
        return text


def caption_in_background(upload_id: int, image_path: Path) -> None:
    """Fire-and-forget: never blocks the `POST /media/upload` response. A
    real model round-trip is far slower than Tesseract's, so this matters
    even more here than for `ocr.extract_in_background` — the upload is
    already done by the time this runs, and there is nothing about it that
    should make the person who just attached a photo wait."""
    threading.Thread(
        target=caption_and_store,
        args=(upload_id, image_path),
        daemon=True,
        name="caption-extract",
    ).start()
