"""File attachments on entries (Wave B).

Bytes live in the uploads folder under a random name (no path traversal
possible); the original filename is kept only for downloads.
"""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
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
