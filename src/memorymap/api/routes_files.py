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

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from memorymap.ai import captioning
from memorymap.api.routes_entries import _existing_entry, _to_out
from memorymap.api.schemas import EntryOut
from memorymap.core import deps, media_gc, ocr
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

    **Written with `os.path`, not `pathlib`, and that is the actual fix.**
    The first attempt at this guard used `Path.resolve()` +
    `Path.relative_to()` and CodeQL kept flagging the join regardless — its
    `py/path-injection` sanitiser model is built around the
    `os.path.normpath(os.path.join(...))` + `str.startswith(base + sep)`
    shape (the one GitHub's own CWE-022 remediation examples use), and does
    not extend the same recognition to the equivalent pathlib calls. Same
    containment check, same semantics — `os.path.realpath` resolves `..`
    segments *and* symlinks exactly like `Path.resolve()` did, so a symlink
    planted inside `exports` pointing outside it is still caught — just
    spelled in the vocabulary the query actually models.
    """
    base = os.path.realpath(str(exports))
    candidate = os.path.realpath(os.path.join(base, name))
    if candidate != base and not candidate.startswith(base + os.sep):
        raise HTTPException(status_code=422, detail="That filename can't be used.") from None
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
def upload_media(file: UploadFile, session: Session = Depends(get_session)) -> dict:
    """General file/image upload for drag-and-drop in markdown (documents & notes)."""
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
    # OCR (ROADMAP.md item 30d) runs on a background thread, never on this
    # request — Tesseract can take a second or two per image, and nothing
    # about "was the upload accepted" should wait on it. Raster images only
    # (see ocr.OCR_SUFFIXES); a PDF here just never gets ocr_text, honestly.
    if suffix in ocr.OCR_SUFFIXES:
        ocr.extract_in_background(upload.id, destination)
    # Captioning, same background-thread contract as OCR just above. Whether
    # a vision model is actually resolvable (auto-detected or explicit —
    # ModelManager.resolve_vision_model) is checked *inside*
    # `caption_and_store`, not here: that check itself is a real Ollama
    # round trip, and this request must stay as fast as the OCR branch
    # above, not pay for one on every upload just to decide whether to spawn
    # a thread that would make the same decision a moment later anyway.
    if suffix in captioning.CAPTION_SUFFIXES:
        captioning.caption_in_background(upload.id, destination)
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


@router.get("/media", response_model=list[MediaUploadOut])
def list_media(session: Session = Depends(get_session)) -> list[MediaUploadOut]:
    """Every upload `/media/upload` has ever produced — asked for directly
    (a gallery for note-attached and whiteboard images alike). Newest first,
    the same convention the Library's own sort defaults to.
    """
    uploads = session.query(MediaUpload).order_by(MediaUpload.created_at.desc()).all()
    return [
        MediaUploadOut(
            id=u.id,
            url=f"/media/{u.filename}",
            original_name=u.original_name,
            ocr_text=u.ocr_text or "",
            caption=u.caption or "",
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
        upload.caption = body.text.strip() or None
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
