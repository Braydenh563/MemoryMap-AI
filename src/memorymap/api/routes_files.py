"""File attachments on entries.

Bytes live in the uploads folder under a random name (no path traversal
possible); the original filename is kept only for downloads.
"""

from __future__ import annotations

import base64
import binascii
import os
import re
import subprocess
import sys
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from memorymap.ai import captioning, vision_ocr
from memorymap.api.routes_entries import _existing_entry, _to_out
from memorymap.api.schemas import EntryOut
from memorymap.core import deps, docview, media_gc, media_process, ocr, pdfpages
from memorymap.core.database import Attachment, MediaUpload
from memorymap.core.deps import get_session
from memorymap.entry import manager

router = APIRouter(tags=["files"])

# `/media/{filename}` and `/files/{attachment_id}` are the two routes an
# `<img src>` points at directly rather than something the frontend fetches
# with its own X-Auth-Token header — see `require_unlock_media`'s own
# docstring in routes_auth.py for why they need a separate router (a
# router-level dependency and a route-level one are additive, not an
# override, so the header-only gate on `router` can't be loosened per-route).
media_router = APIRouter(tags=["files"])

MAX_FILE_BYTES = 50 * 1024 * 1024  # a personal notebook, not a fileserver

#: Note attachments, unlike /media/upload above, had no allowlist at all —
#: any file, of any type, attached without a single refusal (asked for
#: directly: "make sure incompatible files are currently refused upon
#: attempted upload with an error message"). This one is broader than
#: MEDIA_SUFFIXES on purpose — attachments are downloaded (FileResponse's
#: default Content-Disposition: attachment, not rendered inline the way
#: /media/{name} is), so the stored-XSS concern that shaped that allowlist
#: doesn't apply here in the same way — but video and audio are still out
#: (no player exists for either yet; audio specifically is tracked as a
#: real feature to add, not a permanent refusal) and so are the obvious
#: executable/script shapes, since nothing in this app ever needs to run
#: an attachment.
ATTACHMENT_SUFFIXES = frozenset(
    {
        # Images
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp", ".ico", ".svg", ".tiff", ".tif",
        # Documents
        ".pdf", ".docx", ".doc", ".odt", ".rtf",
        ".pptx", ".ppt", ".odp",
        ".xlsx", ".xls", ".ods", ".csv",
        # Text & markup
        ".txt", ".md", ".markdown", ".json", ".xml", ".yaml", ".yml", ".html", ".htm", ".css",
        # Code
        ".js", ".ts", ".jsx", ".tsx", ".py", ".java", ".c", ".h", ".cpp", ".hpp", ".cs", ".go",
        ".rs", ".rb", ".php", ".sh", ".sql", ".swift", ".kt",
        # Archives
        ".zip",
    }
)


@router.post("/entries/{entry_id}/files", response_model=EntryOut, status_code=201)
def upload_file(
    entry_id: int, file: UploadFile, session: Session = Depends(get_session)
) -> EntryOut:
    entry = _existing_entry(session, entry_id)
    suffix = Path(file.filename or "file").suffix[:12].lower()
    if suffix not in ATTACHMENT_SUFFIXES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"'{suffix or 'that file type'}' can't be attached. "
                "Images, PDFs, office documents, text and code files are supported — "
                "video and audio attachments aren't yet."
            ),
        )
    uploads_dir: Path = deps.get_config().uploads_dir
    # The folder is created at startup, but it only has to go missing once —
    # a cleanup tool, a synced or unmounted data directory, a restore that
    # didn't include an empty folder — and every upload fails with a 500 and a
    # traceback instead of saving. Sketches are the usual casualty, since the
    # note saves first and only the drawing is lost.
    uploads_dir.mkdir(parents=True, exist_ok=True)

    # Random stored name, original extension kept for double-click opening.
    stored_name = f"{uuid.uuid4().hex}{suffix}"
    destination = uploads_dir / stored_name

    size = 0
    with destination.open("wb") as out:
        while chunk := file.file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_FILE_BYTES:
                out.close()
                destination.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="File is larger than 50 MB")
            out.write(chunk)

    manager.add_attachment(
        session,
        entry,
        filename=file.filename or stored_name,
        stored_name=stored_name,
        mime=file.content_type or "application/octet-stream",
        size=size,
    )
    return _to_out(session, entry)


def _existing_attachment(session: Session, attachment_id: int) -> Attachment:
    return deps.get_or_404(session, Attachment, attachment_id, "Attachment not found")


@media_router.get("/files/{attachment_id}")
def download_file(attachment_id: int, session: Session = Depends(get_session)) -> FileResponse:
    attachment = _existing_attachment(session, attachment_id)
    path = deps.get_config().uploads_dir / attachment.stored_name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File is missing from disk")
    return FileResponse(path, filename=attachment.filename, media_type=attachment.mime)


class AttachedFileTextOut(BaseModel):
    """One attached file, read as text for the in-app viewer."""

    filename: str
    #: "markdown" | "code" | "plain" — how to render `text`, not what the file
    #: is. A converted .docx comes back as markdown, so it renders like one.
    kind: str
    #: "file" | "converted" | "vision-ocr". Shown to the reader, not merely
    #: logged: a vision model's transcription of a scan is a *reading* of the
    #: file, and presenting it identically to text read out of a .txt would be
    #: the app stating a guess as a fact.
    source: str
    text: str = ""
    truncated: bool = False
    #: Why there is no text, when there is none. Never an error status: "this
    #: file has no viewer yet" and "install markitdown" are both answers, and
    #: a 4xx would make the viewer show a failure for a file that is fine.
    message: str = ""


@router.get("/files/{attachment_id}/text", response_model=AttachedFileTextOut)
def attached_file_text(
    attachment_id: int, session: Session = Depends(get_session)
) -> AttachedFileTextOut:
    """An attached file's text, for reading it without leaving the app.

    Deliberately returns *text*, never the file. `download_file` above hands
    the browser the bytes with `Content-Disposition: attachment`, and
    `media_file` at the bottom of this module explains at length why serving
    anything new inline is the thing to avoid. A viewer built by widening
    either of those would inherit that problem once per file type; this one
    cannot, because what it sends has already stopped being a .docx.

    Read-only, and that is a property of the extraction rather than a missing
    feature — see `core/docview.py`'s module docstring. Editing an attached
    file's text would mean writing text back into a format it was never in.
    """
    attachment = _existing_attachment(session, attachment_id)
    path = deps.get_config().uploads_dir / attachment.stored_name
    # The scanned-PDF fallback, passed rather than omitted. `docview` has
    # always taken a `vision_reader` and this — its only caller — passed
    # nothing, so the whole path was wired and never once ran: exactly the
    # "features that never executed" shape CLAUDE.md warns about. It only does
    # any work for a PDF with no text layer, and only when the pdfpages extra
    # and a vision model are both present; every other file returns before it
    # is consulted.
    viewed = docview.extract(path, vision_reader=vision_ocr.pdf_reader_or_none())
    return AttachedFileTextOut(
        filename=attachment.filename,
        kind=viewed.kind,
        source=viewed.source,
        text=viewed.text,
        truncated=viewed.truncated,
        message=viewed.message,
    )


class PdfInfoOut(BaseModel):
    #: Whether the matching pdf-page endpoint can serve anything for this
    #: file — `media_pdf_page` for a `/media/` upload, `attached_file_pdf_page`
    #: for a note's own attachment. Moved up here, ahead of both `pdf-info`
    #: endpoints that return it: a FastAPI route decorator's `response_model`
    #: evaluates at import time, not lazily like a `from __future__ import
    #: annotations` type hint, so this has to exist before either decorator
    #: runs rather than merely before either function is called.
    available: bool
    #: Real page count, or 0 when `available` is False.
    pages: int
    #: Why `available` is False, for a caller that wants to say so rather
    #: than just hide the button. "" when `available` is True.
    message: str = ""


@router.get("/files/{attachment_id}/pdf-info", response_model=PdfInfoOut)
def attached_file_pdf_info(attachment_id: int, session: Session = Depends(get_session)) -> PdfInfoOut:
    """`media_pdf_info`'s sibling for a note's own attached PDF (the
    `Attachment` model, `uploads_dir` — a different file and a different
    table from a `/media/` upload, which is why this is a second endpoint
    rather than one that takes either id). See that docstring for why this
    exists apart from `attached_file_text` at all."""
    attachment = _existing_attachment(session, attachment_id)
    if Path(attachment.filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=422, detail="Not a PDF.")
    path = _within_dir(deps.get_config().uploads_dir, attachment.stored_name)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File is missing from disk")
    if not pdfpages.available():
        return PdfInfoOut(
            available=False,
            pages=0,
            message=(
                "Viewing PDF pages needs a small rasteriser: install "
                "“Read scanned PDFs” in Settings → Extras."
            ),
        )
    count = pdfpages.page_count(path)
    if count == 0:
        return PdfInfoOut(
            available=False,
            pages=0,
            message=(
                "This PDF couldn't be opened. It may be corrupted, "
                "password-protected, or saved in a way this app's reader "
                "doesn't support."
            ),
        )
    return PdfInfoOut(available=True, pages=count)


@media_router.get("/files/{attachment_id}/pdf-page/{index}")
def attached_file_pdf_page(attachment_id: int, index: int, session: Session = Depends(get_session)) -> Response:
    """`media_pdf_page`'s sibling for an attached PDF — see that docstring
    for why this is always a freshly rendered PNG, never the file's own
    bytes. On `media_router`, same reason: loaded via `mediaSrc()`-tokened
    `<img src>`, not `apiJson`."""
    attachment = _existing_attachment(session, attachment_id)
    if Path(attachment.filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=404, detail="Not a PDF.")
    path = _within_dir(deps.get_config().uploads_dir, attachment.stored_name)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File is missing from disk")
    png = pdfpages.render_page(path, index)
    if png is None:
        raise HTTPException(status_code=404, detail="That page doesn't exist.")
    return Response(content=png, media_type="image/png", headers={"Cache-Control": "private, max-age=3600"})


@router.delete("/files/{attachment_id}", response_model=EntryOut)
def delete_file(attachment_id: int, session: Session = Depends(get_session)) -> EntryOut:
    attachment = _existing_attachment(session, attachment_id)
    entry = _existing_entry(session, attachment.entry_id)
    manager.delete_attachment(session, attachment, deps.get_config().uploads_dir)
    return _to_out(session, entry)


class AttachmentRenameBody(BaseModel):
    filename: str = Field(min_length=1, max_length=255)


@router.put("/files/{attachment_id}", response_model=EntryOut)
def rename_file(
    attachment_id: int, body: AttachmentRenameBody, session: Session = Depends(get_session)
) -> EntryOut:
    """Rename a file in the Library — the display name only, never the bytes.

    Mirrors `delete_file` above for the two checks that make this safe to
    expose per-item rather than globally:

    - `_existing_attachment` then `_existing_entry(attachment.entry_id)`, in
      that order, the same as `delete_file`. `Attachment` carries no
      workspace column of its own — its note does, so re-fetching the note
      through the same workspace-filtered query every other route uses is
      what makes an attachment in a workspace this request isn't in 404
      rather than quietly renaming across the boundary.
    - a private note's attachment is refused outright (403), matching the
      Library's own listing (`routes_library._images`), which already hides
      a private note's files from view entirely — renaming one from a
      surface that can't show it would be a hole the same shape as the ones
      CLAUDE.md's review section warns about: the guard here is new, but the
      boundary it enforces already exists elsewhere in the app.
    """
    attachment = _existing_attachment(session, attachment_id)
    entry = _existing_entry(session, attachment.entry_id)
    if entry.is_private:
        raise HTTPException(
            status_code=403,
            detail="This file is on a private note and can't be renamed until the note is readable.",
        )
    try:
        manager.rename_attachment(session, attachment, body.filename)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return _to_out(session, entry)


# --- saving a file the app generated (§35E) ---------------------------------------
#
# Every export in this app builds a Blob in the browser and clicks a hidden
# `<a download>`. That works in a browser tab and does nothing at all in the
# desktop window: pywebview has no download handler, so the click is swallowed
# and the user gets no file and no error. Reported as "I don't think any of the
# file save features in the whole application work on the python desktop app".
#
# The fix is available because this app already runs a local server — it can
# write the file itself and say where it went. That is strictly more reliable
# than a download in every shell, and it is the only thing that works in the
# window.

#: Where generated files land by default. Beside the notes rather than in the
#: OS Downloads folder, so "where your data is" stays one answer unless the
#: user deliberately points it elsewhere — see `_exports_dir` below, added
#: after a direct request for a configurable location ("I have to dig in the
#: app data files to find and access them").
EXPORTS_DIRNAME = "exports"

#: A generated export is text or a small archive, never a media library.
MAX_SAVE_BYTES = 50 * 1024 * 1024


def _exports_dir() -> Path:
    """`export_save_dir` preference if set (validated at save time — see
    `_validated_export_dir` in routes_settings.py — so this is always a real,
    writable directory when non-empty), else the default beside the notes.
    """
    custom = deps.get_config().get_preference("export_save_dir", "")
    return Path(custom) if custom else deps.get_config().data_dir / EXPORTS_DIRNAME


class SaveFileBody(BaseModel):
    """One file the browser built and wants written to disk."""

    filename: str = Field(min_length=1, max_length=120)
    #: Base64, because the same route has to carry a .zip as well as a .md.
    content_base64: str


def safe_filename(name: str) -> str:
    """A filename that cannot escape the exports folder.

    Not a sanitiser that tries to be clever — a whitelist. The name arrives
    from the browser, and the browser is not the trust boundary here even
    though the app is single-user: the AI writes some of these names.
    """
    cleaned = os.path.basename(str(name))  # drops any directory part, "..", drive letters
    cleaned = re.sub(r"[^A-Za-z0-9._ -]", "_", cleaned).strip(". ")
    if not cleaned:
        raise HTTPException(status_code=422, detail="That filename can't be used.")
    return cleaned[:120]


def _within_exports(exports: Path, name: str) -> Path:
    """`exports / name`, refusing anything whose resolved path lands outside
    `exports`. `safe_filename` already whitelists to a flat, traversal-free
    name, but CodeQL's `py/path-injection` still flagged the join as tainted
    (alerts #289/#290) — the same shape HANDOVER.md already documents for
    the update-apply SSRF fix: a query's sanitiser recognition is narrower
    than "the code is provably safe," so the fix is a real containment
    check at the point of use, not a stronger filter upstream of it.

    **Third attempt at the exact recognised shape, not just an equivalent
    check.** `os.path.realpath`/`os.path.normpath`/`os.path.abspath` are all
    modelled by CodeQL's Python library as `Path::PathNormalization` — they
    mark the result "normalised" but do not by themselves clear the taint.
    The actual barrier is `Path::SafeAccessCheck`, whose only recognised
    Python implementation is a bare `<path>.startswith(<base>)` call used as
    a guard's sole condition (`if not fullpath.startswith(base_path): raise`
    — GitHub's own CWE-022 remediation example, and the shape
    `StartswithCall` in the standard library actually matches). The first
    attempt here used `Path.resolve()`/`Path.relative_to()`, which CodeQL's
    Python model does not extend `PathNormalization`/`SafeAccessCheck` to at
    all. The second attempt switched to `os.path` but combined the guard
    with `candidate != base and` and appended `+ os.sep` to the `startswith`
    argument — still flagged, most likely because a compound condition and a
    computed (rather than bare) argument stop the guard-node matcher from
    recognising it as the same `SafeAccessCheck` shape; a query's pattern
    matcher can be exactly this literal about it.

    So: the single-condition, bare-argument form below, and nothing else.
    The dropped nuance (a candidate exactly equal to `base`, and a
    sibling-directory collision like `base-evil` slipping past a
    separator-less prefix check) is not a real gap here specifically —
    `safe_filename` already strips every path separator out of `name`
    before either caller passes it in, so `os.path.join(base, name)` can
    only ever produce `base + os.sep + <flat name>`, never a sibling path or
    `base` itself unless `name` were empty (already rejected upstream).
    """
    base = os.path.realpath(str(exports))
    candidate = os.path.realpath(os.path.join(base, name))
    if not candidate.startswith(base):
        raise HTTPException(status_code=422, detail="That filename can't be used.") from None
    return Path(candidate)


def _within_dir(base_dir: Path, name: str) -> Path:
    """`_within_exports`'s own containment check, generalised to any base
    directory — the PDF-page endpoints' `_media_upload_path` and the two
    attachment `pdf-page`/`pdf-info` routes each build a path from a name
    that traces back to a request parameter (via a DB round trip, but
    CodeQL's `py/path-injection` tracks the taint through the query filter
    regardless), the same shape `_within_exports` already exists to close.
    Kept as its own function rather than reusing `_within_exports` directly:
    that one is precision-tuned to the exact guard shape CodeQL's
    `Path::SafeAccessCheck` recognises (see its own long comment on how many
    equivalent-looking forms it rejected) and duplicating the same five
    lines here is safer than risking that tuning by generalising its name
    or signature for a second, differently-named caller.
    """
    base = os.path.realpath(str(base_dir))
    candidate = os.path.realpath(os.path.join(base, name))
    if not candidate.startswith(base):
        raise HTTPException(status_code=422, detail="That file can't be used.") from None
    return Path(candidate)


@router.post("/files/save")
def save_generated_file(body: SaveFileBody) -> dict:
    """Write a generated export next to the notes and say where it went."""
    try:
        data = base64.b64decode(body.content_base64, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(status_code=422, detail="That file couldn't be read.") from exc
    if len(data) > MAX_SAVE_BYTES:
        raise HTTPException(status_code=413, detail="That file is too large to save.")

    exports = _exports_dir()
    exports.mkdir(parents=True, exist_ok=True)
    name = safe_filename(body.filename)
    target = _within_exports(exports, name)
    # Never silently overwrite: two exports of the same chat on the same day
    # are two files someone may want to compare.
    if target.exists():
        stem, suffix = target.stem, target.suffix
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        target = _within_exports(exports, f"{stem}-{stamp}{suffix}")
    target.write_bytes(data)
    return {"path": str(target), "filename": target.name, "bytes": len(data)}


@router.post("/files/open-exports-folder")
def open_exports_folder() -> dict:
    """Reveal the exports folder in the OS file manager.

    Asked for directly ("I have to dig in the app data files to find and
    access them") after `save_generated_file` above started writing graph
    PNGs, chat exports and the like into `data_dir/exports` with only a
    toast naming the path — real, but no help finding it again later.
    Desktop only: a browser tab has no file manager to hand this to, and
    `webbrowser.open`-ing a `file://` URL from a server request a browser
    could also reach is a foothold a purely local desktop shell doesn't
    have to give a page.
    """
    if os.getenv("MEMORYMAP_DESKTOP") != "1":
        raise HTTPException(
            status_code=409, detail="Only the desktop app can open a file manager window."
        )
    exports = _exports_dir()
    exports.mkdir(parents=True, exist_ok=True)
    try:
        if sys.platform == "win32":
            # Safe even though the path can now be user-configured: passed as
            # a single argument, never through a shell, and _validated_export_dir
            # already refused anything that isn't a real, writable directory.
            os.startfile(exports)
        elif sys.platform == "darwin":
            # Popen, not run(): the launcher forks its own file-manager window
            # and normally returns at once, but this request must not hang
            # waiting on a GUI process either way — same reasoning as
            # `restart_in_console_mode` being fire-and-forget rather than
            # something this response waits on.
            subprocess.Popen(["open", str(exports)])
        else:
            subprocess.Popen(["xdg-open", str(exports)])
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Couldn't open {exports}: {exc}") from exc
    return {"path": str(exports)}


#: What `/media/` will accept and, more to the point, what it will serve.
#:
#: This folder exists for images dropped into markdown, and `/media/{name}`
#: serves its contents from the app's **own origin** — so an `.html` or `.svg`
#: landing here is a script running with the notebook's cookies and unlock
#: token, not a picture. That is a stored-XSS shape even though the app is
#: single-user and local, and it is worth closing for one reason above the
#: others: the AI can write into this folder too, so "the only person who can
#: put a file here is the person at the keyboard" is not true.
#:
#: An allowlist rather than a denylist of dangerous types, because the failure
#: mode of a missing entry is "this image didn't upload", and the failure mode
#: of a missed denylist entry is the paragraph above.
MEDIA_SUFFIXES = frozenset(
    {".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp", ".ico", ".pdf"}
)


@router.post("/media/upload")
def upload_media(
    file: UploadFile,
    direct: bool = Form(False),
    session: Session = Depends(get_session),
) -> dict:
    """General file/image upload for drag-and-drop in markdown (documents &
    notes), and for the Library's own direct "Upload images" button.

    `direct` distinguishes the two: a note, document or chat composer
    upload is *staged* — it may be discarded before ever being saved or
    sent, so nothing runs on it here (see `direct` below) and OCR/
    captioning/vision-OCR instead fire when whatever referenced it is
    actually committed (`core/media_process.py`, called from the note,
    document and conversation save routes). The Library's own upload
    button sends `direct=True`: there is no separate "save" step for it —
    the upload itself *is* the commit, the third case named directly
    ("uploaded directly to the library").
    """
    media_dir = deps.get_config().data_dir / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "file").suffix[:12].lower()
    if suffix not in MEDIA_SUFFIXES:
        raise HTTPException(
            status_code=415,
            detail=(
                "Only images and PDFs can be dropped in here. "
                "Use the note's attachments for anything else."
            ),
        )
    stored_name = f"{uuid.uuid4().hex}{suffix}"
    destination = media_dir / stored_name

    size = 0
    with destination.open("wb") as out:
        while chunk := file.file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_FILE_BYTES:
                out.close()
                destination.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="File is larger than 50 MB")
            out.write(chunk)

    original_name = file.filename or stored_name
    upload = MediaUpload(filename=stored_name, original_name=original_name[:300])
    session.add(upload)
    session.commit()
    session.refresh(upload)
    # OCR, captioning and vision OCR (core/media_process.py) all run on a
    # background thread, never on this request — Tesseract alone can take a
    # second or two per image, and a vision-model round trip far longer.
    # Only fired here for `direct=True` (the Library's own upload button);
    # every staged upload gets processed later, at the moment it's actually
    # committed — see this function's own docstring and media_process.py's.
    if direct:
        media_process.process_committed_upload(upload, media_dir)
    # `id` lets a caller that changes its mind (the capture form's own
    # attachment chip, removable with a click) call DELETE /media/{id}
    # instead of just detaching the markdown reference and leaving the
    # file behind — asked for directly.
    return {"id": upload.id, "url": f"/media/{stored_name}", "filename": original_name}


class MediaUploadOut(BaseModel):
    id: int
    url: str
    original_name: str
    #: "" until OCR finishes (or never, off the tesseract binary, or a PDF)
    #: — never null over the wire, so the frontend can filter on it with a
    #: plain substring match without a null check at every call site.
    ocr_text: str = ""
    #: "" until captioning finishes (or never, no vision model available, or
    #: a PDF) — same never-null convention as ocr_text, same reason.
    caption: str = ""
    #: Which model wrote `caption`, or "" when there is none or it was only
    #: ever typed by hand. Surfaced so a caption reads as one model's guess,
    #: not the app's own opinion (asked for directly).
    caption_model: str = ""
    #: True once a person has typed over an AI caption, or typed one from
    #: scratch — see `MediaUpload.caption_edited`'s docstring.
    caption_edited: bool = False
    #: A vision model's verbatim transcription of text in the image
    #: (`ai/vision_ocr.py`) — distinct from `ocr_text` (Tesseract) and from
    #: `caption` (a description). "" until run, or when a run found no
    #: legible text — same never-null convention as the other two.
    vision_ocr_text: str = ""
    #: Which model wrote `vision_ocr_text`, or "" when there is none.
    vision_ocr_model: str = ""
    #: When it was uploaded, ISO-8601. Asked for with the lightbox rework —
    #: "maybe it can have the image information and other info about it below
    #: the image" — and it is the one fact of that kind the browser cannot
    #: work out for itself: dimensions come from the decoded image, the name
    #: is already here, and a byte count would cost one `stat` per row on
    #: every gallery load for a number nobody asked for.
    created_at: str = ""
    #: **Where this file is actually used** — one entry per note, document or
    #: board that references it, as `{kind, id, label}`. The gallery showed a
    #: thumbnail, a filename and two empty prompts and could not answer the
    #: only question anyone brings to it: what is this attached to? Empty
    #: means genuinely unreferenced (the same condition the orphan check uses
    #: — both read `media_gc.referenced_names`, so they cannot disagree).
    used_by: list[dict] = []
    #: True when a locked private note made the usage scan incomplete, so an
    #: empty `used_by` means "could not check" rather than "not used". The UI
    #: must not call a file unused on this basis.
    usage_incomplete: bool = False


@router.get("/media", response_model=list[MediaUploadOut])
def list_media(session: Session = Depends(get_session)) -> list[MediaUploadOut]:
    """Every upload `/media/upload` has ever produced — asked for directly
    (a gallery for note-attached and whiteboard images alike). Newest first,
    the same convention the Library's own sort defaults to.
    """
    uploads = session.query(MediaUpload).order_by(MediaUpload.created_at.desc()).all()
    # One scan for the whole gallery rather than one per file: `usage_map`
    # walks each table once and inverts the result, so this stays a single
    # pass no matter how many uploads there are.
    used, usage_incomplete = media_gc.usage_map(session)
    return [
        MediaUploadOut(
            id=u.id,
            used_by=used.get(u.filename, []),
            usage_incomplete=usage_incomplete,
            url=f"/media/{u.filename}",
            original_name=u.original_name,
            ocr_text=u.ocr_text or "",
            caption=u.caption or "",
            caption_model=u.caption_model or "",
            caption_edited=u.caption_edited,
            vision_ocr_text=u.vision_ocr_text or "",
            vision_ocr_model=u.vision_ocr_model or "",
            created_at=u.created_at.isoformat() if u.created_at else "",
        )
        for u in uploads
    ]


class MediaOrphansOut(BaseModel):
    orphans: list[MediaUploadOut]
    #: True when a locked private note made the check incomplete — the list
    #: above is not exhaustive in that case, and DELETE refuses to act on it.
    skipped_private: bool
    #: How many uploads DELETE actually removed. Always 0 for the GET dry run.
    deleted: int = 0


# Declared ahead of the `/media/{upload_id}` routes below: FastAPI compiles
# `{upload_id}` as a plain path segment and only rejects a non-integer value
# (like "orphans") when the handler runs, by which point an earlier-declared
# `/media/{upload_id}` would already have claimed the match and returned a
# 422 instead of ever reaching these.
@router.get("/media/orphans", response_model=MediaOrphansOut)
def list_orphaned_media(session: Session = Depends(get_session)) -> MediaOrphansOut:
    """Uploads no live note, document or whiteboard image object still
    points at (ROADMAP.md item 20a). A dry run — nothing is deleted here.
    """
    orphans, skipped_private = media_gc.find_orphaned_media(session)
    return MediaOrphansOut(
        orphans=[
            MediaUploadOut(id=u.id, url=f"/media/{u.filename}", original_name=u.original_name)
            for u in orphans
        ],
        skipped_private=skipped_private,
    )


@router.delete("/media/orphans", response_model=MediaOrphansOut)
def clean_orphaned_media(session: Session = Depends(get_session)) -> MediaOrphansOut:
    """Deletes every currently-orphaned upload's file and tracking row.

    Refuses to delete anything (`skipped_private: true`, `deleted: 0`)
    while a locked private note leaves the check incomplete — see
    `media_gc`'s own docstring for why.
    """
    media_dir = deps.get_config().data_dir / "media"
    deleted, skipped_private = media_gc.delete_orphaned_media(session, media_dir)
    return MediaOrphansOut(
        orphans=[
            MediaUploadOut(
                id=row["id"], url=f"/media/{row['filename']}", original_name=row["original_name"]
            )
            for row in deleted
        ],
        skipped_private=skipped_private,
        deleted=len(deleted),
    )


# Declared ahead of `/media/{upload_id}` for the same reason `/media/orphans`
# above is: "meta" would otherwise be matched as an `{upload_id}` and 422 out
# before ever reaching this handler.
@router.get("/media/meta/{filename}", response_model=MediaUploadOut)
def media_meta(filename: str, session: Session = Depends(get_session)) -> MediaUploadOut:
    """Everything the app knows *about* one upload, looked up by its stored
    filename — which is the only identifier most of the app actually holds.

    Reported directly: the lightbox showed a caption, OCR text and the
    picture's own facts when opened from the Image Gallery and nothing at
    all anywhere else. The cause was not the lightbox — it was that
    `openLightbox` took this metadata as *arguments*, and of its nine
    callers only the gallery had a full `MediaUpload` row to pass. Every
    other one (a note's attachment, a chat image, a graph or dashboard
    thumbnail, a whiteboard object) has a `/media/<filename>` url and
    nothing else, so it passed a filename and a url and the panel below the
    picture stayed empty.

    Handing the lightbox a way to *ask* fixes it in one place instead of
    nine, and keeps working for any caller added later — which is the same
    reason `GET /media` exists rather than each surface keeping its own
    list. Keyed on filename rather than id precisely because a url is what
    those callers have.
    """
    upload = session.query(MediaUpload).filter(MediaUpload.filename == filename).first()
    if not upload:
        # A url can outlive its row: deleting an upload deliberately leaves
        # any note still pointing at it alone (see delete_media below), so a
        # miss here is an ordinary state, not a fault.
        raise HTTPException(status_code=404, detail="No upload by that name.")
    return MediaUploadOut(
        id=upload.id,
        url=f"/media/{upload.filename}",
        original_name=upload.original_name,
        ocr_text=upload.ocr_text or "",
        caption=upload.caption or "",
        caption_model=upload.caption_model or "",
        caption_edited=upload.caption_edited,
        vision_ocr_text=upload.vision_ocr_text or "",
        vision_ocr_model=upload.vision_ocr_model or "",
        created_at=upload.created_at.isoformat() if upload.created_at else "",
    )


@router.get("/media/text/{filename}", response_model=AttachedFileTextOut)
def media_text(filename: str, session: Session = Depends(get_session)) -> AttachedFileTextOut:
    """One uploaded document's *text*, for reading it in the lightbox.

    Asked for directly: the lightbox should become "a sort of document
    preview… for viewing pdfs, word documents, spreadsheets, text files, code
    files etc but in a presentable way that isn't editable".

    Almost none of that is new work, and deliberately so — `docview.extract`
    and its whole format table already existed for **attachments**
    (`GET /files/{id}/text`), and it already returns the `kind`
    (markdown/code/plain) that says how to render and the `source` that says
    whether a human wrote the text or a vision model read it off a scan. The
    only thing missing was that uploads, which is what the Library and the
    lightbox actually hold, had no way to reach it. So this is the same
    extraction pointed at `media/` instead of `uploads/`.

    Deliberately returns **text, never the file**, for the reason
    `read_file_text` above states at length and `media_file` at the bottom of
    this module explains: what this sends has already stopped being a .docx,
    so a viewer built on it cannot inherit the serve-it-inline problem once
    per file type. That is also why the preview is read-only — a property of
    the extraction, not a missing feature. Editing here would mean writing
    text back into a format it was never in.
    """
    upload = session.query(MediaUpload).filter(MediaUpload.filename == filename).first()
    if not upload:
        raise HTTPException(status_code=404, detail="No upload by that name.")
    path = deps.get_config().data_dir / "media" / upload.filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")
    # Same scanned-PDF fallback the attachment viewer passes. It only does any
    # work for a PDF with no text layer, and only when the pdfpages extra and
    # a vision model are both present; every other file returns before it is
    # consulted.
    viewed = docview.extract(path, vision_reader=vision_ocr.pdf_reader_or_none())
    return AttachedFileTextOut(
        filename=upload.original_name,
        kind=viewed.kind,
        source=viewed.source,
        text=viewed.text,
        truncated=viewed.truncated,
        message=viewed.message,
    )


def _media_upload_path(session: Session, filename: str) -> tuple[MediaUpload, Path]:
    upload = session.query(MediaUpload).filter(MediaUpload.filename == filename).first()
    if not upload:
        raise HTTPException(status_code=404, detail="No upload by that name.")
    path = _within_dir(deps.get_config().data_dir / "media", upload.filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")
    return upload, path


@router.get("/media/pdf-info/{filename}", response_model=PdfInfoOut)
def media_pdf_info(filename: str, session: Session = Depends(get_session)) -> PdfInfoOut:
    """Page count for `pdf_page` below to page through — deliberately its
    own round trip rather than folded into `media_text`'s response, so the
    lightbox can show real PDF pages **without ever calling `media_text` (and
    therefore without markitdown or a vision model in the loop at all)**.
    That split is the point: viewing a PDF like a PDF and *reading* it with
    AI are two different questions (`docview.py`'s module docstring answers
    the second one at length), and until now this app only had an answer for
    the second — a scanned lecture PDF got stuck on the AI extraction path
    with no way to just look at the pages, direct instruction: "pdfs and
    documents should be viewable, accessible and manageable without the ai,
    even if the ai cant read them."
    """
    if Path(filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=422, detail="Not a PDF.")
    _upload, path = _media_upload_path(session, filename)
    if not pdfpages.available():
        return PdfInfoOut(
            available=False,
            pages=0,
            message=(
                "Viewing PDF pages needs a small rasteriser: install "
                "“Read scanned PDFs” in Settings → Extras."
            ),
        )
    count = pdfpages.page_count(path)
    if count == 0:
        return PdfInfoOut(
            available=False,
            pages=0,
            message=(
                "This PDF couldn't be opened. It may be corrupted, "
                "password-protected, or saved in a way this app's reader "
                "doesn't support."
            ),
        )
    return PdfInfoOut(available=True, pages=count)


@media_router.get("/media/pdf-page/{filename}/{index}")
def media_pdf_page(filename: str, index: int, session: Session = Depends(get_session)) -> Response:
    """One page of an uploaded PDF, rasterised to a PNG — the actual pixels
    a `<img>` in the lightbox loads, one per page, so a PDF scrolls like a
    PDF. On `media_router` rather than `router`: this is loaded the same
    declarative way `/media/{filename}` already is (`mediaSrc()` in app.js
    appends the unlock token as a query param for exactly these routes,
    since a plain `<img src>` cannot carry a header), not fetched with
    `apiJson` the way `media_pdf_info` above is.

    Always a **freshly rendered PNG**, never the PDF's own bytes — the
    security reasoning `get_media`'s own docstring gives for refusing to
    serve a PDF inline (a script host, from a folder not guaranteed to hold
    only what this app wrote) does not apply to pixels this process drew
    itself. A rasterised page cannot carry a PDF action, an embedded script,
    or anything else a PDF's own structure can.
    """
    if Path(filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=404, detail="Not a PDF.")
    _upload, path = _media_upload_path(session, filename)
    png = pdfpages.render_page(path, index)
    if png is None:
        raise HTTPException(status_code=404, detail="That page doesn't exist.")
    # Regenerated on every request rather than cached to disk: ~20ms/page
    # (measured, pdfpages.py's own docstring) and this app has no existing
    # per-file render cache to hang a second one off. `Cache-Control`
    # still lets the *browser* avoid re-fetching a page it already has.
    return Response(content=png, media_type="image/png", headers={"Cache-Control": "private, max-age=3600"})


@router.delete("/media/{upload_id}")
def delete_media(upload_id: int, session: Session = Depends(get_session)) -> dict:
    """Removes the file and its tracking row. Asked for directly — an
    uploaded image "can't be deleted" today, since nothing tracked it at
    all before `MediaUpload` existed. Any note or whiteboard object still
    pointing at this url is left as-is; its own `<img>` fails to load and
    the frontend renders a "this image was deleted" placeholder rather than
    a broken-image glyph, the same live-reported ask.
    """
    upload = deps.get_or_404(session, MediaUpload, upload_id, "No upload with that id")
    media_dir = (deps.get_config().data_dir / "media").resolve()
    candidate = (media_dir / upload.filename).resolve()
    if candidate.is_relative_to(media_dir):
        candidate.unlink(missing_ok=True)
    session.delete(upload)
    session.commit()
    return {"status": "ok"}


class MediaRenameBody(BaseModel):
    original_name: str = Field(min_length=1, max_length=300)


@router.put("/media/{upload_id}", response_model=MediaUploadOut)
def rename_media(
    upload_id: int, body: MediaRenameBody, session: Session = Depends(get_session)
) -> MediaUploadOut:
    """Rename a Library image — the display name only.

    `original_name` is a label, exactly like `Attachment.filename`: the bytes
    live under `upload.filename`, a generated name, and nothing here touches
    the disk. So it goes through the same validator rather than a laxer one of
    its own — two "rename a file" endpoints in one module with two different
    ideas of what a filename may contain is how the strict one quietly stops
    being the rule.
    """
    upload = deps.get_or_404(session, MediaUpload, upload_id, "No upload with that id")
    try:
        upload.original_name = manager.validate_attachment_filename(body.original_name)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    session.commit()
    return MediaUploadOut(
        id=upload.id, url=f"/media/{upload.filename}", original_name=upload.original_name
    )


class CaptionBody(BaseModel):
    #: The write-once rule (`captioning.caption_and_store`) otherwise leaves
    #: an existing caption alone — this is the one way to overwrite one,
    #: asked for directly: "if one is already there, another doesn't need
    #: to be written unless the user presses the button to rewrite it."
    force: bool = False
    #: A caption typed by hand instead of generated — asked for directly
    #: ("allow for manual input of image captions"). `None` (the default)
    #: means "generate one"; any string, including "", sets the caption to
    #: exactly that text and skips the model entirely — a person editing a
    #: caption is not asking for a second opinion. `""` clears it back to
    #: uncaptioned rather than storing an empty string as if it meant
    #: something, matching the null/"not captioned yet" convention
    #: `MediaUpload.caption` already uses.
    text: str | None = Field(default=None, max_length=2000)


@router.post("/media/{upload_id}/caption", response_model=MediaUploadOut)
def caption_media(
    upload_id: int, body: CaptionBody = CaptionBody(), session: Session = Depends(get_session)
) -> MediaUploadOut:
    """Generate (or, with `force`, regenerate) a caption for one image, or —
    with `text` — set one by hand. The manual-generate trigger and the
    manual-edit field are both reached from the Library and the Notes tab.

    Runs synchronously: captioning one image is a single model round trip,
    no different in shape from the AI-edit or link-reason calls this app
    already blocks on behind a spinner. `caption_and_store` opens its own
    session (the same shape `ocr.extract_and_store` uses from a background
    thread) — `session.refresh` below picks up what it committed.
    """
    upload = deps.get_or_404(session, MediaUpload, upload_id, "No upload with that id")
    if Path(upload.filename).suffix.lower() not in captioning.CAPTION_SUFFIXES:
        raise HTTPException(status_code=415, detail="Only images can be captioned.")
    if body.text is not None:
        # A hand-typed caption needs no model at all — set it and return,
        # skipping every Ollama/vision-model check below.
        stripped = body.text.strip() or None
        upload.caption = stripped
        if stripped:
            # `caption_model` is left as-is: if this text started as one
            # model's caption, the badge can still credit it alongside
            # "edited" instead of losing that history the moment someone
            # fixes a typo (see MediaUpload.caption_edited's docstring).
            upload.caption_edited = True
        else:
            # Cleared back to "no caption" — a full reset, not a caption
            # with nothing to show for whichever model or person last wrote one.
            upload.caption_model = None
            upload.caption_edited = False
        session.commit()
    else:
        if not deps.get_ollama().is_running():
            raise HTTPException(status_code=409, detail="The AI model isn't running.")
        model = deps.get_model_manager().resolve_vision_model(deps.get_ollama())
        if not model:
            raise HTTPException(
                status_code=409,
                detail="No installed model reports it can see images — install or "
                "pick one in Settings → Models.",
            )
        media_dir = deps.get_config().data_dir / "media"
        captioning.caption_and_store(upload.id, media_dir / upload.filename, force=body.force)
        session.refresh(upload)
    return MediaUploadOut(
        id=upload.id,
        url=f"/media/{upload.filename}",
        original_name=upload.original_name,
        ocr_text=upload.ocr_text or "",
        caption=upload.caption or "",
        caption_model=upload.caption_model or "",
        caption_edited=upload.caption_edited,
        vision_ocr_text=upload.vision_ocr_text or "",
        vision_ocr_model=upload.vision_ocr_model or "",
    )


class OcrBody(BaseModel):
    #: A correction typed by hand instead of re-run — asked for directly
    #: ("allow the user to access, view, and edit OCR extracted text"),
    #: same "None means generate, any string sets it exactly" convention as
    #: `CaptionBody.text`. `""` clears it back to "nothing extracted",
    #: matching `ocr_text`'s own null/"not run or found nothing" meaning.
    text: str | None = Field(default=None, max_length=10_000)


@router.post("/media/{upload_id}/ocr", response_model=MediaUploadOut)
def ocr_media(
    upload_id: int, body: OcrBody = OcrBody(), session: Session = Depends(get_session)
) -> MediaUploadOut:
    """Re-read one image with Tesseract, or — with `text` — set the
    extracted text by hand. The manual retry asked for directly: `ocr_text`
    otherwise only ever gets written once, automatically, at the moment the
    image is actually saved into a note/document/chat (`core/media_process.
    py`) — this is the only way to try again (a first Tesseract pass that
    misread something, or ran before Tesseract was installed) or to correct
    what it found.

    `extract_text`/`extract_and_store` (core/ocr.py) have no write-once
    guard of their own — every call re-reads the image, which is exactly
    what "retry" needs, no `force` field required. Runs synchronously:
    local OCR is fast, and the frontend already blocks caption/vision-OCR
    regenerate behind a spinner the same way.
    """
    upload = deps.get_or_404(session, MediaUpload, upload_id, "No upload with that id")
    if Path(upload.filename).suffix.lower() not in ocr.OCR_SUFFIXES:
        raise HTTPException(status_code=415, detail="Only images can be read this way.")
    if body.text is not None:
        upload.ocr_text = body.text.strip() or None
        session.commit()
    else:
        media_dir = deps.get_config().data_dir / "media"
        ocr.extract_and_store(upload.id, media_dir / upload.filename)
        session.refresh(upload)
    return MediaUploadOut(
        id=upload.id,
        url=f"/media/{upload.filename}",
        original_name=upload.original_name,
        ocr_text=upload.ocr_text or "",
        caption=upload.caption or "",
        caption_model=upload.caption_model or "",
        caption_edited=upload.caption_edited,
        vision_ocr_text=upload.vision_ocr_text or "",
        vision_ocr_model=upload.vision_ocr_model or "",
    )


class VisionOcrBody(BaseModel):
    #: Same "already there and not forced, leave it alone" rule as
    #: `CaptionBody.force` — a manual re-read the user pressed the button
    #: for, not a background pass overwriting a reading they already saw.
    force: bool = False
    #: A correction typed by hand, exactly as `OcrBody.text` already allows for
    #: the Tesseract reading — `None` means "read it", any string sets it, and
    #: `""` clears it.
    #:
    #: Reported: a vision model asked to transcribe a picture with no text in
    #: it returned four Pokémon names, and there was no way to remove or edit
    #: them. That failure is inherent to asking a small VLM to read an image
    #: with nothing to read — the prompt already asks it to say so and it
    #: ignored the instruction — so the fix is not a better prompt, it is that
    #: a wrong reading must be correctable like every other AI output in this
    #: app. The Tesseract line has been editable since it shipped; this one
    #: was the odd one out.
    text: str | None = Field(default=None, max_length=10_000)


@router.post("/media/{upload_id}/vision-ocr", response_model=MediaUploadOut)
def vision_ocr_media(
    upload_id: int, body: VisionOcrBody = VisionOcrBody(), session: Session = Depends(get_session)
) -> MediaUploadOut:
    """Read the text in one image with a vision model — the "extractor
    mode" asked for directly, distinct from the local Tesseract pass
    (`ocr_text`, automatic on upload) and from the AI caption (`caption`, a
    description rather than a transcription). Manual only: never triggered
    by `POST /media/upload` itself, unlike captioning.

    Same synchronous, single-round-trip shape as `caption_media` above —
    one model call, no different from the AI-edit or link-reason calls this
    app already blocks on behind a spinner.
    """
    upload = deps.get_or_404(session, MediaUpload, upload_id, "No upload with that id")
    if Path(upload.filename).suffix.lower() not in vision_ocr.VISION_OCR_SUFFIXES:
        raise HTTPException(status_code=415, detail="Only images can be read this way.")
    if body.text is not None:
        # A hand-typed correction, or "" to clear a wrong reading. Checked
        # before the backend is: fixing a bad transcription must not require
        # the model that produced it to still be running.
        upload.vision_ocr_text = body.text.strip() or None
        if not upload.vision_ocr_text:
            # Clearing the text clears the attribution with it — "Read by X"
            # under nothing is a claim about a reading that no longer exists.
            upload.vision_ocr_model = None
        session.commit()
        return MediaUploadOut(
            id=upload.id,
            url=f"/media/{upload.filename}",
            original_name=upload.original_name,
            ocr_text=upload.ocr_text or "",
            caption=upload.caption or "",
            caption_model=upload.caption_model or "",
            caption_edited=upload.caption_edited,
            vision_ocr_text=upload.vision_ocr_text or "",
            vision_ocr_model=upload.vision_ocr_model or "",
        )
    if not deps.get_ollama().is_running():
        raise HTTPException(status_code=409, detail="The AI model isn't running.")
    model = deps.get_model_manager().resolve_ocr_model(deps.get_ollama())
    if not model:
        raise HTTPException(
            status_code=409,
            detail="No installed model reports it can see images — install or "
            "pick one in Settings → Models.",
        )
    media_dir = deps.get_config().data_dir / "media"
    vision_ocr.vision_ocr_and_store(upload.id, media_dir / upload.filename, force=body.force)
    session.refresh(upload)
    return MediaUploadOut(
        id=upload.id,
        url=f"/media/{upload.filename}",
        original_name=upload.original_name,
        ocr_text=upload.ocr_text or "",
        caption=upload.caption or "",
        caption_model=upload.caption_model or "",
        caption_edited=upload.caption_edited,
        vision_ocr_text=upload.vision_ocr_text or "",
        vision_ocr_model=upload.vision_ocr_model or "",
    )


@media_router.get("/media/{filename}")
def get_media(filename: str) -> FileResponse:
    """Serve generic uploaded media.

    The suffix is checked again on the way out, not only on the way in. Upload
    is not the only route into this folder — a restored backup, a synced data
    directory, or a future writer could put something here — and this is the
    endpoint that decides what the browser executes.
    """
    name = safe_filename(filename)
    if Path(name).suffix.lower() not in MEDIA_SUFFIXES:
        raise HTTPException(status_code=404, detail="Media file not found")
    path = deps.get_config().data_dir / "media" / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Media file not found")
    # `nosniff` is already set globally, but the header below is the one that
    # decides whether a PDF opens in the page or downloads — and an inline PDF
    # viewer is a script host. Nothing here needs to render in-place: markdown
    # embeds images with <img>, which ignores Content-Disposition.
    return FileResponse(
        path, headers={"Content-Disposition": f'inline; filename="{name}"'}
    )
