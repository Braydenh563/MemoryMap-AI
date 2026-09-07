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

#: Captions in flight right now, keyed by upload id → the file's own name.
#: ROADMAP §89.6: a real model round-trip is seconds, not instant, and until
#: now nothing showed it happening anywhere in the UI — `caption_and_store`
#: already recorded the *finished* job in `taskhistory`, but the Tasks panel
#: (routes_tasks.collect, the same list a re-index or a model pull shows up
#: in) had no way to know one was running. A plain dict rather than a class:
#: there is no progress fraction to report, only "is this upload's caption
#: being written right now" — the same shape `embeddings.warmup_running()`
#: already uses for the one other job with nothing to measure.
_running_lock = threading.Lock()
_running: dict[int, str] = {}


def running_captions() -> list[dict]:
    """What `caption_and_store` is working on right now, for the Tasks panel."""
    with _running_lock:
        return [{"upload_id": uid, "name": name} for uid, name in _running.items()]


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

#: **A page of a document is not a photograph, and the prompt above assumes it
#: is.** Reported directly: *"image captioning, how it is done and displayed
#: needs to be refined for pdf documents and other similar documents. with
#: graphs, images and diagrams in them."*
#:
#: `CAPTION_PROMPT` asks "what does this image show", and a vision model handed
#: a rendered slide answers exactly that question — *"a white page with black
#: text and a bar chart"* — which is true, useless, and very nearly the same
#: sentence for every page in the deck. What a reader actually wants from page
#: 7 is what is *in* the figures on page 7.
#:
#: So three changes, each one earning its characters:
#:
#: 1. **It says where it is.** "Page 4 of 18" is context the model cannot see
#:    (a rendered page carries no reliable page number of its own) and it is
#:    what stops the answer describing the document instead of the page.
#: 2. **It names the subjects.** Figures, charts, diagrams and tables — the
#:    things a document has and a photograph does not.
#: 3. **It rules out the photographic reading explicitly.** Without the last
#:    clause the most common failure is a description of the *page* as an
#:    object: its layout, its margins, the colour of the paper.
#:
#: Deliberately not a transcription: `ai/vision_ocr.py` already asks for the
#: words, the reading is stored in the same row's `text`, and asking one call
#: to do both gets a worse version of each.
PAGE_CAPTION_PROMPT = (
    "This is page {page} of {count} of a document, not a photograph. Describe "
    "what the figures, charts, diagrams and tables on this page show — what is "
    "being compared, the trend or the structure — in two or three short, "
    "factual sentences. Do not transcribe the body text and do not describe "
    "the page as an object (its layout, margins or paper). If the page has no "
    "figures, say what the page is about in one sentence."
)


def page_caption_prompt(index: int, count: int) -> str:
    """`PAGE_CAPTION_PROMPT` with this page's position filled in.

    One-based on the way out, because that is what the page rail shows and
    what a person means by "page 1" — the same convention `_parse_page_spec`
    in routes_files.py already keeps for the other direction.
    """
    return PAGE_CAPTION_PROMPT.format(page=max(1, index + 1), count=max(1, count))


def page_caption_text(image_path: Path, index: int, count: int, model: str, ollama) -> str:
    """Best-effort description of one rendered page. Never raises.

    A near-copy of `caption_text` above and deliberately *not* folded into it
    behind a flag: the two differ only in the prompt, and a `caption_text(path,
    model, ollama, page=None)` that silently changes what it asks for based on
    an optional argument is exactly the call shape this project has been caught
    by before ("a guard removed while the shape around it was kept"). The
    failure contract is identical — a missing file, an unreachable backend or a
    model that ignores the image all mean "no description was produced".
    """
    try:
        data = image_path.read_bytes()
    except OSError:
        return ""
    mime = mimetypes.guess_type(image_path.name)[0] or "image/png"
    uri = f"data:{mime};base64,{base64.b64encode(data).decode('ascii')}"
    try:
        reply = ollama.chat(
            model,
            [
                {
                    "role": "user",
                    "content": page_caption_prompt(index, count),
                    "images": [uri],
                }
            ],
        )
        return (reply.get("content") or "").strip()
    except Exception:
        # Same reasoning as `caption_text`'s own bare except: one bad page (a
        # render that produced garbage, a model that errors on this specific
        # image) must never take down the range read looping over it.
        logger.warning("Page captioning failed for %s", image_path.name, exc_info=True)
        return ""


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
        with _running_lock:
            _running[upload_id] = upload.original_name
        try:
            text = caption_text(image_path, model, deps.get_ollama())
        finally:
            with _running_lock:
                _running.pop(upload_id, None)
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
