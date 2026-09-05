"""AI tool handlers for uploaded files: search them, and read one.

**The gap this closes.** Asked for twice: *"is there a way to improve the
backend and function of the notebook further?? better grouping, better
linking, better ai understanding of all features??"* Every other part of the
app is reachable by the model — notes, categories, tags, documents,
whiteboards, reminders, past chats, skills — and files were not, at all. So
"what was in that PDF I uploaded?" or "find the photo of the whiteboard from
March" could not be answered, even though the app had already read those
files: an upload gets Tesseract text, a caption and a vision transcription
(`core/ocr.py`, `ai/captioning.py`, `ai/vision_ocr.py`), and all three sat in
the database with nothing able to look at them.

**Two tables, one answer.** A picture pasted into a note is a `MediaUpload`;
a file attached to a note is an `Attachment`. They are separate tables with
separate id spaces (see `routes_files.py`), so every row here carries its
`kind` and the caller must keep the pair — the same rule the chat transcript's
own touched-items list follows, and for the same reason: id 12 is a different
object in each.

**Private notes stay private.** An attachment belongs to an entry; if that
entry is private, the file is not searchable and not readable here — the same
refusal `_require_note` gives everywhere else in this package.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ._common import DEFAULT_LIST_LIMIT, PREVIEW_CHARS, ToolError, _clip, _limit_arg

#: How much extracted text one `read_file` may return. A scanned page can run
#: to thousands of characters and every one of them is prompt tokens; a
#: caller that needs the rest can say so to the user, who has the file.
FILE_TEXT_CHARS = 2000


def _file_text(row) -> str:  # noqa: ANN001 — MediaUpload or Attachment
    """The best text the app has for this file, and it is not one field.

    A vision model's transcription beats Tesseract's when both exist (it
    reads handwriting and low-contrast photographs Tesseract cannot), and
    either beats nothing. The caption is a *description*, not a reading, so
    it is kept separate rather than folded in here.
    """
    return (getattr(row, "vision_ocr_text", None) or getattr(row, "ocr_text", None) or "").strip()


def _matches(row, needle: str) -> bool:  # noqa: ANN001
    if not needle:
        return True
    haystack = " ".join(
        str(part or "")
        for part in (
            getattr(row, "original_name", None) or getattr(row, "filename", ""),
            getattr(row, "caption", None),
            _file_text(row),
        )
    )
    return needle in haystack.lower()


def _media_row(upload) -> dict:  # noqa: ANN001
    return {
        "kind": "upload",
        "id": upload.id,
        "name": upload.original_name,
        "url": f"/media/{upload.filename}",
        "caption": _clip(upload.caption or "", PREVIEW_CHARS),
        "text": _clip(_file_text(upload), PREVIEW_CHARS),
        "created_at": upload.created_at.isoformat() if upload.created_at else None,
    }


def _attachment_row(attachment, entry) -> dict:  # noqa: ANN001
    return {
        "kind": "attachment",
        "id": attachment.id,
        "name": attachment.filename,
        "url": f"/files/{attachment.id}",
        "caption": _clip(getattr(attachment, "caption", None) or "", PREVIEW_CHARS),
        "text": _clip(_file_text(attachment), PREVIEW_CHARS),
        #: Which note it is attached to, because "the PDF from the lecture
        #: note" is how people actually refer to a file — and it gives the
        #: model a note id it can then read.
        "attached_to_note": entry.id if entry is not None else None,
        "created_at": attachment.created_at.isoformat() if attachment.created_at else None,
    }


def _search_files(session: Session, args: dict) -> dict:
    from memorymap.core.database import Attachment, Entry, MediaUpload

    needle = str(args.get("query") or "").strip().lower()
    limit = _limit_arg(args, default=DEFAULT_LIST_LIMIT)
    rows: list[dict] = []

    for upload in session.scalars(select(MediaUpload).order_by(MediaUpload.id.desc())):
        if _matches(upload, needle):
            rows.append(_media_row(upload))
        if len(rows) >= limit:
            break

    if len(rows) < limit:
        pairs = session.execute(
            select(Attachment, Entry)
            .join(Entry, Entry.id == Attachment.entry_id)
            .where(Entry.is_deleted.is_(False), Entry.is_private.is_(False))
            .order_by(Attachment.id.desc())
        )
        for attachment, entry in pairs:
            if _matches(attachment, needle):
                rows.append(_attachment_row(attachment, entry))
            if len(rows) >= limit:
                break

    return {
        "files": rows,
        "found": len(rows),
        "note_to_model": (
            "`kind` says which table a row is in and the two have separate id "
            "spaces — pass both back to read_file. Text comes from OCR or a "
            "vision model, so it can be imperfect; quote it as what the file "
            "appears to say rather than as fact."
        ),
        "label": f"ph:folder-open Searched files for “{_clip(needle, 30) or 'everything'}”",
    }


def _read_file(session: Session, args: dict) -> dict:
    from memorymap.core.database import Attachment, Entry, MediaUpload

    kind = str(args.get("kind") or "").strip().lower()
    raw_id = args.get("file_id")
    try:
        file_id = int(raw_id)
    except (TypeError, ValueError):
        raise ToolError("file_id must be the number search_files gave you.") from None

    if kind == "upload":
        upload = session.get(MediaUpload, file_id)
        if upload is None:
            raise ToolError(f"No uploaded file with id {file_id}.")
        row = _media_row(upload)
        row["text"] = _clip(_file_text(upload), FILE_TEXT_CHARS)
        row["label"] = f"ph:folder-open Read “{upload.original_name}”"
        return row

    if kind == "attachment":
        attachment = session.get(Attachment, file_id)
        if attachment is None:
            raise ToolError(f"No attached file with id {file_id}.")
        entry = session.get(Entry, attachment.entry_id)
        #: The same refusal a private note gets everywhere else — its
        #: attachments are part of it.
        if entry is None or entry.is_deleted or entry.is_private:
            raise ToolError("That file belongs to a note that isn't available.")
        row = _attachment_row(attachment, entry)
        row["text"] = _clip(_file_text(attachment), FILE_TEXT_CHARS)
        row["label"] = f"ph:folder-open Read “{attachment.filename}”"
        return row

    raise ToolError("kind must be 'upload' or 'attachment' — search_files says which.")
