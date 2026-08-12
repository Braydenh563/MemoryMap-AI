"""File attachments on entries (Wave B).

Bytes live in the uploads folder under a random name (no path traversal
possible); the original filename is kept only for downloads.
"""

from __future__ import annotations

import base64
import binascii
import re
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from memorymap.api.routes_entries import _existing_entry, _to_out
from memorymap.api.schemas import EntryOut
from memorymap.core import deps
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


@router.post("/entries/{entry_id}/files", response_model=EntryOut, status_code=201)
def upload_file(
    entry_id: int, file: UploadFile, session: Session = Depends(get_session)
) -> EntryOut:
    entry = _existing_entry(session, entry_id)
    uploads_dir: Path = deps.get_config().uploads_dir
    # The folder is created at startup, but it only has to go missing once —
    # a cleanup tool, a synced or unmounted data directory, a restore that
    # didn't include an empty folder — and every upload fails with a 500 and a
    # traceback instead of saving. Sketches are the usual casualty, since the
    # note saves first and only the drawing is lost.
    uploads_dir.mkdir(parents=True, exist_ok=True)

    # Random stored name, original extension kept for double-click opening.
    suffix = Path(file.filename or "file").suffix[:12]
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
    attachment = session.get(Attachment, attachment_id)
    if attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return attachment


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

#: Where generated files land. Beside the notes rather than in the OS Downloads
#: folder, so "where your data is" stays one answer and nothing is written
#: outside the directory the user pointed the app at.
EXPORTS_DIRNAME = "exports"

#: A generated export is text or a small archive, never a media library.
MAX_SAVE_BYTES = 50 * 1024 * 1024


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
    cleaned = Path(str(name)).name  # drops any directory part, "..", drive letters
    cleaned = re.sub(r"[^A-Za-z0-9._ -]", "_", cleaned).strip(". ")
    if not cleaned:
        raise HTTPException(status_code=422, detail="That filename can't be used.")
    return cleaned[:120]


@router.post("/files/save")
def save_generated_file(body: SaveFileBody) -> dict:
    """Write a generated export next to the notes and say where it went."""
    try:
        data = base64.b64decode(body.content_base64, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(status_code=422, detail="That file couldn't be read.") from exc
    if len(data) > MAX_SAVE_BYTES:
        raise HTTPException(status_code=413, detail="That file is too large to save.")

    exports: Path = deps.get_config().data_dir / EXPORTS_DIRNAME
    exports.mkdir(parents=True, exist_ok=True)
    name = safe_filename(body.filename)
    target = exports / name
    # Never silently overwrite: two exports of the same chat on the same day
    # are two files someone may want to compare.
    if target.exists():
        stem, suffix = target.stem, target.suffix
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        target = exports / f"{stem}-{stamp}{suffix}"
    target.write_bytes(data)
    return {"path": str(target), "filename": target.name, "bytes": len(data)}


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
    # `id` lets a caller that changes its mind (the capture form's own
    # attachment chip, removable with a click) call DELETE /media/{id}
    # instead of just detaching the markdown reference and leaving the
    # file behind — asked for directly.
    return {"id": upload.id, "url": f"/media/{stored_name}", "filename": original_name}


class MediaUploadOut(BaseModel):
    id: int
    url: str
    original_name: str


@router.get("/media", response_model=list[MediaUploadOut])
def list_media(session: Session = Depends(get_session)) -> list[MediaUploadOut]:
    """Every upload `/media/upload` has ever produced — asked for directly
    (a gallery for note-attached and whiteboard images alike). Newest first,
    the same convention the Library's own sort defaults to.
    """
    uploads = session.query(MediaUpload).order_by(MediaUpload.created_at.desc()).all()
    return [
        MediaUploadOut(id=u.id, url=f"/media/{u.filename}", original_name=u.original_name)
        for u in uploads
    ]


@router.delete("/media/{upload_id}")
def delete_media(upload_id: int, session: Session = Depends(get_session)) -> dict:
    """Removes the file and its tracking row. Asked for directly — an
    uploaded image "can't be deleted" today, since nothing tracked it at
    all before `MediaUpload` existed. Any note or whiteboard object still
    pointing at this url is left as-is; its own `<img>` fails to load and
    the frontend renders a "this image was deleted" placeholder rather than
    a broken-image glyph, the same live-reported ask.
    """
    upload = session.get(MediaUpload, upload_id)
    if upload is None:
        raise HTTPException(status_code=404, detail="No upload with that id")
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
    upload = session.get(MediaUpload, upload_id)
    if upload is None:
        raise HTTPException(status_code=404, detail="No upload with that id")
    try:
        upload.original_name = manager.validate_attachment_filename(body.original_name)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    session.commit()
    return MediaUploadOut(
        id=upload.id, url=f"/media/{upload.filename}", original_name=upload.original_name
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
