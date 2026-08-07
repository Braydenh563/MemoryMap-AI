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
from memorymap.core.database import Attachment
from memorymap.core.deps import get_session
from memorymap.entry import manager

router = APIRouter(tags=["files"])

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


@router.get("/files/{attachment_id}")
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


@router.post("/media/upload")
def upload_media(file: UploadFile) -> dict:
    """General file/image upload for drag-and-drop in markdown (documents & notes)."""
    media_dir = deps.get_config().data_dir / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "file").suffix[:12]
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

    return {"url": f"/media/{stored_name}", "filename": file.filename or stored_name}


@router.get("/media/{filename}")
def get_media(filename: str) -> FileResponse:
    """Serve generic uploaded media."""
    name = safe_filename(filename)
    path = deps.get_config().data_dir / "media" / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Media file not found")
    return FileResponse(path)
