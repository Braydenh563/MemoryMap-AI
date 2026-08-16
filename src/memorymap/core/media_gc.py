"""Reconciles `/media/` uploads against what still references them.

ROADMAP.md item 20a: `MediaUpload` (added for the Library gallery) tracks
every file `/media/upload` has ever produced, but nothing before this
checked a row against whether any live note, document or whiteboard image
object still points at it — pasting over an image in a note, or deleting
the note entirely, leaves the file on disk with only a manual, one-at-a-time
`DELETE /media/{id}` to ever find it again.

The one thing this has to get right, and would rather be slow about than
wrong about: a private note's content is encrypted at rest, so an image
referenced only inside a private note that's currently locked cannot be
ruled out as "still referenced" — it can only be *not checked*. Rather than
treat "couldn't check" as "not referenced" (which would eventually delete a
real attachment out from under a locked note), any private note this pass
can't read makes the whole pass refuse to delete anything, not just skip
that one note.
"""

from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.core.database import Document, Entry, MediaUpload, WhiteboardObject
from memorymap.entry import manager

# Same shape routes_whiteboard.py's own MEDIA_URL_RE validates on the way in —
# kept independent (not imported) since this only ever reads, never resolves
# a path from user input.
_MEDIA_NAME_RE = re.compile(r"/media/([A-Za-z0-9][A-Za-z0-9._-]{0,119})")


def _referenced_names(text: str) -> set[str]:
    return set(_MEDIA_NAME_RE.findall(text or ""))


def _referenced_filenames(session: Session) -> tuple[set[str], bool]:
    """Every filename this pass can actually see referenced, plus whether a
    locked private note forced it to skip a check.
    """
    from memorymap.core import crypto, vault

    referenced: set[str] = set()
    skipped_private = False

    for obj in session.scalars(select(WhiteboardObject).where(WhiteboardObject.kind == "image")):
        referenced.update(_referenced_names(obj.data))

    for doc in session.scalars(select(Document)):
        referenced.update(_referenced_names(doc.content))

    for entry in session.scalars(select(Entry).where(Entry.is_deleted == False)):  # noqa: E712
        if entry.is_private and crypto.is_encrypted(entry.content) and vault.key() is None:
            skipped_private = True
            continue
        referenced.update(_referenced_names(manager.readable_content(entry)))

    return referenced, skipped_private


def find_orphaned_media(session: Session) -> tuple[list[MediaUpload], bool]:
    """Uploads no live note, document or whiteboard object still points at.

    Returns `(orphans, skipped_private)`. When `skipped_private` is True,
    at least one private note's content could not be checked (vault
    locked) — the list is not exhaustive, and `delete_orphaned_media`
    refuses to act on it.
    """
    referenced, skipped_private = _referenced_filenames(session)
    uploads = session.scalars(select(MediaUpload)).all()
    orphans = [u for u in uploads if u.filename not in referenced]
    return orphans, skipped_private


def delete_orphaned_media(session: Session, media_dir) -> tuple[list[dict], bool]:
    """Deletes every currently-orphaned upload's file and tracking row.

    Returns `(deleted, skipped_private)` — `deleted` holds one
    `{"id", "filename", "original_name"}` dict per row removed, captured
    *before* the delete (a row's fields aren't safely readable through the
    ORM object once `session.commit()` has expired it). Refuses outright
    (deletes nothing) when a locked private note made the reference check
    incomplete — leaving a genuinely orphaned file on disk a while longer
    is the safe side of that trade; deleting one a locked note still
    references is not.
    """
    orphans, skipped_private = find_orphaned_media(session)
    if skipped_private:
        return [], True

    media_dir = media_dir.resolve()
    deleted = [
        {"id": u.id, "filename": u.filename, "original_name": u.original_name}
        for u in orphans
    ]
    for upload in orphans:
        candidate = (media_dir / upload.filename).resolve()
        if candidate.is_relative_to(media_dir):
            candidate.unlink(missing_ok=True)
        session.delete(upload)
    session.commit()
    return deleted, False
