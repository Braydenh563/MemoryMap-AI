"""Create/read/update/soft-delete entries, links, and audit logging.

Deliberately AI-free: the API layer decides the category (by asking the
janitor in Phase 2) and this module just stores what it's told. That
keeps capture working even when every AI piece is down (plan §4).
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta

from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from pathlib import Path

from memorymap.core.database import (
    Attachment,
    AuditLog,
    Category,
    EmbeddingRecord,
    Entry,
    DocumentLink,
    EntryDate,
    EntryLink,
    EntryRevision,
    Reminder,
    WhiteboardNode,
    WhiteboardObject,
    WhiteboardSketch,
    utcnow,
)
from memorymap.entry import timewords

# Where entries land when no AI is available or the AI can't decide.
UNCATEGORISED = "Uncategorised"


def log_action(
    session: Session,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    detail: str | None = None,
) -> None:
    """Append to the audit log. Committed with the caller's transaction."""
    session.add(
        AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            detail=detail,
        )
    )


def get_or_create_category(session: Session, name: str) -> Category:
    """Categories are identified by name; create on first use."""
    category = session.scalar(select(Category).where(Category.name == name))
    if category is None:
        category = Category(name=name)
        session.add(category)
        session.flush()  # assigns category.id without committing yet
        log_action(session, "created", "category", category.id, name)
    return category


def create_entry(
    session: Session,
    content: str,
    category_name: str = UNCATEGORISED,
    tags: list[str] | None = None,
    ai_confidence: int = 0,
) -> Entry:
    """Store one thought. Commits the transaction."""
    category = get_or_create_category(session, category_name)
    entry = Entry(
        content=content,
        category_id=category.id,
        tags=json.dumps(tags or []),
        ai_confidence=ai_confidence,
    )
    session.add(entry)
    session.flush()
    record_dates(session, entry)
    log_action(session, "created", "entry", entry.id)
    session.commit()
    return entry


def list_entries(session: Session, include_deleted: bool = False) -> list[Entry]:
    """Pinned first, then newest first. Deleted entries stay hidden until
    the recycle bin UI (Phase 4) asks for them explicitly."""
    query = select(Entry).order_by(
        Entry.pinned.desc(), Entry.created_at.desc(), Entry.id.desc()
    )
    if not include_deleted:
        query = query.where(Entry.is_deleted == False)  # noqa: E712
    return list(session.scalars(query))


def most_accessed_entries(session: Session, limit: int = 5) -> list[Entry]:
    """Most-used non-deleted entries; untouched entries don't qualify."""
    return list(
        session.scalars(
            select(Entry)
            .where(Entry.is_deleted == False, Entry.access_count > 0)  # noqa: E712
            .order_by(Entry.access_count.desc(), Entry.id.desc())
            .limit(limit)
        )
    )


def list_deleted_entries(session: Session) -> list[Entry]:
    """The recycle bin, most recently deleted first."""
    return list(
        session.scalars(
            select(Entry)
            .where(Entry.is_deleted == True)  # noqa: E712
            .order_by(Entry.deleted_at.desc(), Entry.id.desc())
        )
    )


def get_entry(session: Session, entry_id: int) -> Entry | None:
    return session.get(Entry, entry_id)


def update_entry(
    session: Session,
    entry: Entry,
    content: str | None = None,
    category_name: str | None = None,
    tags: list[str] | None = None,
) -> Entry:
    """Manual override (plan Phase 4): the user can change anything the
    AI decided. Only the provided fields change. Commits."""
    changed = []
    if content is not None and content != entry.content:
        entry.content = content
        changed.append("content")
    if category_name is not None:
        category = get_or_create_category(session, category_name)
        if category.id != entry.category_id:
            entry.category_id = category.id
            # A manual move means the user decided — the janitor stays
            # out of this entry's filing from now on (Wave B).
            entry.user_filed = True
            changed.append(f"category={category_name}")
    if tags is not None:
        entry.tags = json.dumps(tags)
        changed.append("tags")
    if "content" in changed:
        # The text is what carries the phrases, so a rewrite re-reads them.
        # Resolved against *now*, not the original capture: the user is
        # writing "tomorrow" today.
        record_dates(session, entry)
    if changed:
        log_action(session, "edited", "entry", entry.id, ", ".join(changed))
        session.commit()
    return entry


def entry_dates(session: Session, entry: Entry) -> list[EntryDate]:
    """The resolved time phrases for one note, in the order they were written."""
    return list(
        session.scalars(
            select(EntryDate)
            .where(EntryDate.entry_id == entry.id)
            .order_by(EntryDate.id)
        )
    )


def entry_dates_bulk(session: Session, entry_ids: list[int]) -> dict[int, list[EntryDate]]:
    """`entry_dates` for several notes in one query, grouped by note id.

    `list_notes`/`summarize_notes` called `entry_dates` once per row inside
    `_note_summary` — an N+1 hit on the agent's most-used read tools
    (ROADMAP.md Tier 1 item 8). This is the batched form for that path;
    single-note callers (`get_note`, etc.) still use `entry_dates` above.
    """
    if not entry_ids:
        return {}
    out: dict[int, list[EntryDate]] = {}
    for date in session.scalars(
        select(EntryDate)
        .where(EntryDate.entry_id.in_(entry_ids))
        .order_by(EntryDate.id)
    ):
        out.setdefault(date.entry_id, []).append(date)
    return out


def record_dates(session: Session, entry: Entry) -> None:
    """Resolve the relative time phrases in a note and store what they meant.

    Best-effort by design (principle 2): a note must save even if this cannot
    run at all, so every failure here is logged and swallowed. Private notes
    are skipped — their text is encrypted at rest, and lifting phrases out of
    it into a plain table would leak the one thing encryption is for.
    """
    try:
        if entry.is_private:
            return
        from memorymap.core.config import user_now
        from memorymap.core import deps

        try:
            now = user_now(deps.get_config())
        except Exception:  # noqa: BLE001 — no app state (a script, a test)
            now = datetime.now()
        session.execute(delete(EntryDate).where(EntryDate.entry_id == entry.id))
        for mention in timewords.find(entry.content or "", now):
            session.add(
                EntryDate(
                    entry_id=entry.id,
                    phrase=mention.phrase[:60],
                    at=datetime(mention.at.year, mention.at.month, mention.at.day),
                    precision=mention.precision,
                )
            )
        session.flush()
    except Exception:  # noqa: BLE001 — never let this stop a note being saved
        logging.getLogger("memorymap.entries").warning(
            "Couldn't resolve the dates in entry %s", entry.id, exc_info=True
        )


# --- notes ↔ documents -------------------------------------------------------
# A note and a document are different things on purpose, but they are usually
# about the same thing. These are the only four functions that know how they
# are joined, so both sides of the relationship can never drift apart.


def link_document(session: Session, document_id: int, entry_id: int) -> bool:
    """Attach a note to a document. False if it already was."""
    existing = session.scalar(
        select(DocumentLink).where(
            DocumentLink.document_id == document_id, DocumentLink.entry_id == entry_id
        )
    )
    if existing is not None:
        return False
    session.add(DocumentLink(document_id=document_id, entry_id=entry_id))
    log_action(session, "linked", "document", document_id, f"note {entry_id}")
    session.commit()
    return True


def unlink_document(session: Session, document_id: int, entry_id: int) -> bool:
    removed = session.execute(
        delete(DocumentLink).where(
            DocumentLink.document_id == document_id, DocumentLink.entry_id == entry_id
        )
    ).rowcount
    if removed:
        log_action(session, "unlinked", "document", document_id, f"note {entry_id}")
        session.commit()
    return bool(removed)


def documents_for_entry(session: Session, entry: Entry) -> list:
    """The documents this note is attached to, oldest link first."""
    from memorymap.core.database import Document

    return list(
        session.scalars(
            select(Document)
            .join(DocumentLink, DocumentLink.document_id == Document.id)
            .where(DocumentLink.entry_id == entry.id)
            .order_by(DocumentLink.id)
        )
    )


def documents_for_entries_bulk(session: Session, entry_ids: list[int]) -> dict[int, list]:
    """`documents_for_entry` for several notes in one query, grouped by note id.

    Same batched-form pattern as `entry_dates_bulk` — built for `GET /entries`,
    which called `documents_for_entry` once per row via `_to_out` (ROADMAP.md
    #0 priority, item 1). Single-note callers keep using the function above.
    """
    from memorymap.core.database import Document

    if not entry_ids:
        return {}
    out: dict[int, list] = {}
    rows = session.execute(
        select(DocumentLink.entry_id, Document)
        .join(Document, DocumentLink.document_id == Document.id)
        .where(DocumentLink.entry_id.in_(entry_ids))
        .order_by(DocumentLink.id)
    )
    for entry_id, document in rows:
        out.setdefault(entry_id, []).append(document)
    return out


def links_for_entries_bulk(
    session: Session, entry_ids: list[int]
) -> dict[int, list[tuple[EntryLink, Entry]]]:
    """`links_for_entry` for several notes in one query, grouped by note id.

    Same batched-form pattern as `entry_dates_bulk` — built for `GET /entries`
    (ROADMAP.md #0 priority, item 1), which resolved each link's other-side
    entry with a separate `session.get` per link inside `_to_out`.
    """
    if not entry_ids:
        return {}
    id_set = set(entry_ids)
    links = list(
        session.scalars(
            select(EntryLink).where(
                or_(
                    EntryLink.source_entry_id.in_(id_set),
                    EntryLink.target_entry_id.in_(id_set),
                )
            )
        )
    )
    touched_ids = set()
    for link in links:
        touched_ids.add(link.target_entry_id)
        touched_ids.add(link.source_entry_id)
    entries_by_id = {e.id: e for e in session.scalars(select(Entry).where(Entry.id.in_(touched_ids)))}

    out: dict[int, list[tuple[EntryLink, Entry]]] = {}
    for link in links:
        if link.source_entry_id in id_set:
            other = entries_by_id.get(link.target_entry_id)
            if other is not None:
                out.setdefault(link.source_entry_id, []).append((link, other))
        if link.target_entry_id in id_set and link.target_entry_id != link.source_entry_id:
            other = entries_by_id.get(link.source_entry_id)
            if other is not None:
                out.setdefault(link.target_entry_id, []).append((link, other))
    return out


def entries_for_document(session: Session, document_id: int) -> list[Entry]:
    """The notes attached to this document. Binned notes drop out on their
    own — a note in the recycle bin should not still be feeding a draft."""
    return list(
        session.scalars(
            select(Entry)
            .join(DocumentLink, DocumentLink.entry_id == Entry.id)
            .where(DocumentLink.document_id == document_id, Entry.is_deleted == False)  # noqa: E712
            .order_by(DocumentLink.id)
        )
    )


def soft_delete_entry(session: Session, entry: Entry) -> None:
    """Into the recycle bin — recoverable until purged. Commits."""
    entry.is_deleted = True
    entry.deleted_at = utcnow()
    log_action(session, "deleted", "entry", entry.id)
    session.commit()


def restore_entry(session: Session, entry: Entry) -> None:
    entry.is_deleted = False
    entry.deleted_at = None
    log_action(session, "restored", "entry", entry.id)
    session.commit()


def _hard_delete(session: Session, entries: list[Entry], uploads_dir: Path | None = None) -> int:
    """Permanently remove entries plus their vectors, links, and files."""
    ids = [e.id for e in entries]
    if not ids:
        return 0
    # Attached files: remove bytes from disk (best effort) then the rows.
    attachments = list(
        session.scalars(select(Attachment).where(Attachment.entry_id.in_(ids)))
    )
    for attachment in attachments:
        if uploads_dir is not None:
            try:
                (uploads_dir / attachment.stored_name).unlink(missing_ok=True)
            except OSError as exc:
                # The row goes either way — a file that won't delete must not
                # block the purge — but a folder that has stopped accepting
                # deletes will otherwise grow forever with nothing said.
                logging.getLogger("memorymap.entries").warning(
                    "couldn't delete the file for attachment %s (%s); "
                    "removing the record anyway",
                    attachment.id,
                    type(exc).__name__,
                )
    session.execute(delete(Attachment).where(Attachment.entry_id.in_(ids)))
    session.execute(delete(EmbeddingRecord).where(EmbeddingRecord.entry_id.in_(ids)))
    session.execute(
        delete(EntryLink).where(
            or_(EntryLink.source_entry_id.in_(ids), EntryLink.target_entry_id.in_(ids))
        )
    )
    # **Everything else that points at an entry, or the delete fails outright.**
    #
    # Reported twice in one sitting — "request failed (500) when I tried to
    # empty the bin", and two particular notes that could not be deleted at
    # all. One cause: `PRAGMA foreign_keys=ON` is set (database.py), so a row
    # left behind in *any* of these tables makes `DELETE FROM entries` raise
    # IntegrityError, which surfaces as a 500 and leaves the bin exactly as it
    # was. The notes in the report both carried a resolved time phrase — the
    # `🕓 this week → week of 27 July` chip is an `entry_dates` row — which is
    # why those two and not the rest.
    #
    # These four were added to the schema after `_hard_delete` was written, and
    # each was invisible until a note happened to have one. Anything that gains
    # a `ForeignKey("entries.id")` from here has to be listed here too; the
    # test added alongside this fails if one is missed.
    session.execute(delete(EntryRevision).where(EntryRevision.entry_id.in_(ids)))
    session.execute(delete(EntryDate).where(EntryDate.entry_id.in_(ids)))
    session.execute(delete(DocumentLink).where(DocumentLink.entry_id.in_(ids)))
    # A whiteboard card *is* its note — with the note gone there is nothing
    # left to show, so the card goes with it, same as a sketch's own delete.
    session.execute(delete(WhiteboardNode).where(WhiteboardNode.entry_id.in_(ids)))
    # `board_id` is a different relationship: it names which board a card or
    # sketch lives *on*, and that board is itself just a note. Purging the
    # board note must not take every card on it with it — that would be
    # "delete this one note" silently wiping an entire whiteboard. Detached to
    # the default board instead, the same "orphan becomes a root" choice
    # already made for `Entry.parent_id` below.
    session.execute(
        WhiteboardNode.__table__.update()
        .where(WhiteboardNode.board_id.in_(ids))
        .values(board_id=None)
    )
    session.execute(
        WhiteboardSketch.__table__.update()
        .where(WhiteboardSketch.board_id.in_(ids))
        .values(board_id=None)
    )
    session.execute(
        WhiteboardObject.__table__.update()
        .where(WhiteboardObject.board_id.in_(ids))
        .values(board_id=None)
    )
    # A reminder's entry is optional, so it is detached rather than deleted:
    # "water the tomatoes" is still a thing you asked to be reminded of after
    # the note that prompted it has gone, and deleting the reminder would throw
    # away something the user set by hand.
    session.execute(
        Reminder.__table__.update()
        .where(Reminder.entry_id.in_(ids))
        .values(entry_id=None)
    )
    # Orphan children of a purged parent become thread roots.
    session.execute(
        Entry.__table__.update()
        .where(Entry.parent_id.in_(ids))
        .values(parent_id=None)
    )
    session.execute(delete(Entry).where(Entry.id.in_(ids)))
    return len(ids)


def purge_entries(
    session: Session, entries: list[Entry], uploads_dir: Path | None = None
) -> int:
    """Permanently delete specific notes. Commits.

    The named half of `_hard_delete`, so "delete this one for good" and "empty
    the bin" destroy a note by exactly the same code — vectors, links, files,
    and re-parenting any replies. Two implementations of permanent deletion is
    how one of them ends up leaving an orphaned embedding behind, which is a
    note that is gone from the list and still findable by search.
    """
    count = _hard_delete(session, entries, uploads_dir=uploads_dir)
    if count:
        log_action(session, "purged", "entry", entries[0].id, f"{count} entries")
    session.commit()
    return count


def empty_recycle_bin(session: Session, uploads_dir: Path | None = None) -> int:
    """Manual 'empty now' (plan Phase 4). Commits."""
    binned = list(session.scalars(select(Entry).where(Entry.is_deleted == True)))  # noqa: E712
    count = _hard_delete(session, binned, uploads_dir=uploads_dir)
    if count:
        log_action(session, "purged", "recycle_bin", detail=f"{count} entries")
    session.commit()
    return count


def purge_expired_deleted(
    session: Session, days: int, uploads_dir: Path | None = None
) -> int:
    """Auto-clear: permanently drop entries binned more than `days` ago.
    Runs at every startup. Commits."""
    cutoff = utcnow() - timedelta(days=days)
    expired = list(
        session.scalars(
            select(Entry).where(
                Entry.is_deleted == True,  # noqa: E712
                Entry.deleted_at < cutoff,
            )
        )
    )
    count = _hard_delete(session, expired, uploads_dir=uploads_dir)
    if count:
        log_action(session, "purged", "recycle_bin", detail=f"{count} expired entries")
    session.commit()
    return count


# --- attachments (Wave B) ------------------------------------------------------


def add_attachment(
    session: Session,
    entry: Entry,
    filename: str,
    stored_name: str,
    mime: str,
    size: int,
) -> Attachment:
    attachment = Attachment(
        entry_id=entry.id,
        filename=filename,
        stored_name=stored_name,
        mime=mime,
        size=size,
    )
    session.add(attachment)
    session.flush()
    log_action(session, "attached", "entry", entry.id, filename)
    session.commit()
    return attachment


def attachments_for(session: Session, entry: Entry) -> list[Attachment]:
    return list(
        session.scalars(
            select(Attachment)
            .where(Attachment.entry_id == entry.id)
            .order_by(Attachment.id)
        )
    )


def delete_attachment(
    session: Session, attachment: Attachment, uploads_dir: Path
) -> None:
    try:
        (uploads_dir / attachment.stored_name).unlink(missing_ok=True)
    except OSError:
        pass  # a stuck file shouldn't block removing the record
    log_action(session, "detached", "entry", attachment.entry_id, attachment.filename)
    session.delete(attachment)
    session.commit()


#: Windows treats these as reserved regardless of extension — `CON.txt` is as
#: unusable as `CON`. Checked against the name's stem, case-insensitively,
#: because this app runs on Windows via start.bat and a name that is fine on
#: Linux but unusable the moment someone opens the same data folder there is
#: the kind of bug that only shows up on the other platform.
_RESERVED_WINDOWS_NAMES = frozenset(
    {"CON", "PRN", "AUX", "NUL"}
    | {f"COM{i}" for i in range(1, 10)}
    | {f"LPT{i}" for i in range(1, 10)}
)

#: Matches `Attachment.filename`'s own column width — a name the DB would
#: truncate silently is rejected instead, before it is ever stored half-cut.
MAX_ATTACHMENT_FILENAME = 255


def validate_attachment_filename(name: str) -> str:
    """A display name safe to store and to echo into a download header.

    This is the *label* a person sees and renames — `stored_name` (a random
    uuid) is what the disk and every path on disk actually use, and never
    changes here. That split is what makes this a strict reject-and-explain
    check rather than `routes_files.safe_filename`'s silent rewrite: nothing
    here is ever written to a filesystem path, so there is no "make it safe"
    fallback to reach for, only "tell the user why their name didn't work."

    Still validated as if it *were* a path component, because the failure
    mode of skipping that is not hypothetical for this app specifically: the
    name is handed to Starlette's `FileResponse(filename=...)` on every
    download, which puts it straight into a `Content-Disposition` header, and
    a control character or a name that is just `..` is exactly the kind of
    input that check is supposed to catch before it reaches a header or a
    person's screen.
    """
    if name is None or not name.strip():
        raise ValueError("A filename is required.")
    if "\x00" in name:
        raise ValueError("Filenames can't contain null bytes.")
    if any(ord(ch) < 0x20 or ord(ch) == 0x7F for ch in name):
        raise ValueError("Filenames can't contain control characters.")
    cleaned = name.strip()
    if len(cleaned) > MAX_ATTACHMENT_FILENAME:
        raise ValueError(f"Filenames can't be longer than {MAX_ATTACHMENT_FILENAME} characters.")
    if "/" in cleaned or "\\" in cleaned:
        raise ValueError("Filenames can't contain a path separator.")
    if ".." in cleaned:
        raise ValueError("Filenames can't contain '..'.")
    if re.match(r"^[A-Za-z]:[/\\]?", cleaned):
        raise ValueError("Filenames can't be an absolute path.")
    if cleaned.startswith("."):
        raise ValueError("Filenames can't start with a dot.")
    stem = cleaned.split(".", 1)[0].strip().upper()
    if stem in _RESERVED_WINDOWS_NAMES:
        raise ValueError(f"'{cleaned}' is a reserved system name and can't be used.")
    return cleaned


def rename_attachment(session: Session, attachment: Attachment, new_filename: str) -> Attachment:
    """Change what a file is *called*, never what it *is* on disk.

    Only `filename` — the Library label and the download's suggested name —
    changes. `stored_name` (the uuid on disk) and `mime` (recorded at upload,
    from the browser's own `Content-Type`) are left alone, which is what lets
    `validate_attachment_filename` above be a strict allowlist instead of an
    extension allowlist: the bytes `/files/{id}` serves back and the
    `Content-Type` it serves them as never change because of a rename, only
    the label on the download dialog does.

    Raises `ValueError` for a name `validate_attachment_filename` rejects,
    and `FileExistsError` if another file on the *same* note already has that
    name — collisions are scoped per-note, the same boundary the Library
    already draws around what's confusable with what.
    """
    cleaned = validate_attachment_filename(new_filename)
    collision = session.scalar(
        select(Attachment).where(
            Attachment.entry_id == attachment.entry_id,
            Attachment.id != attachment.id,
            Attachment.filename == cleaned,
        )
    )
    if collision is not None:
        raise FileExistsError(f"'{cleaned}' is already used on this note.")
    if cleaned != attachment.filename:
        attachment.filename = cleaned
        log_action(session, "renamed", "entry", attachment.entry_id, f"renamed a file to {cleaned}")
        session.commit()
    return attachment


# --- tags (Wave B tag manager) --------------------------------------------------


def all_tags(session: Session) -> dict[str, int]:
    """Every tag in use with its entry count."""
    counts: dict[str, int] = {}
    for entry in session.scalars(
        select(Entry).where(Entry.is_deleted == False)  # noqa: E712
    ):
        for tag in entry_tags(entry):
            counts[tag] = counts.get(tag, 0) + 1
    return dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))


def rename_tag(session: Session, old: str, new: str) -> int:
    """Rename (or merge, if `new` already exists) a tag everywhere.
    Returns how many entries changed. Commits."""
    changed = 0
    for entry in session.scalars(select(Entry)):
        tags = entry_tags(entry)
        if old in tags:
            merged = [t for t in tags if t != old]
            if new not in merged:
                merged.append(new)
            entry.tags = json.dumps(merged)
            changed += 1
    if changed:
        log_action(session, "edited", "tags", detail=f"rename {old} -> {new} ({changed})")
    session.commit()
    return changed


def delete_tag(session: Session, name: str) -> int:
    """Remove a tag from every entry. Returns entries changed. Commits."""
    changed = 0
    for entry in session.scalars(select(Entry)):
        tags = entry_tags(entry)
        if name in tags:
            entry.tags = json.dumps([t for t in tags if t != name])
            changed += 1
    if changed:
        log_action(session, "edited", "tags", detail=f"deleted {name} ({changed})")
    session.commit()
    return changed


# How close two notes' embeddings must be, cosine-wise, before a link left
# with no reason gets one deduced for it. The same bar `/entries/link-
# suggestions` ranks by, so a link made from approving a suggestion and a
# link the AI made unprompted read the same way if they're equally close.
AUTO_REASON_THRESHOLD = 0.55
AUTO_REASON_TEXT = "similar in meaning"


def _deduce_reason(
    session: Session, source_id: int, target_id: int
) -> tuple[str | None, float | None]:
    """Guess why two notes might be linked from how close their embeddings
    are. Returns `(None, None)` — "no reason" — when it can't: no embedding
    for one or both notes, a mid-reindex width mismatch, or a score under
    `AUTO_REASON_THRESHOLD`. That's deliberately the same pair `reason`
    already had for "nobody gave one", so a weak guess never outranks
    silence — see `EntryLink.reason_confidence`.

    A private note has no embedding (`set_private` deletes it), so this is
    naturally a no-op for one rather than needing its own guard.
    """
    from memorymap.ai.embeddings import bytes_to_vector, cosine_similarity

    rows = session.scalars(
        select(EmbeddingRecord).where(EmbeddingRecord.entry_id.in_((source_id, target_id)))
    ).all()
    vectors = {row.entry_id: bytes_to_vector(row.embedding) for row in rows}
    if source_id not in vectors or target_id not in vectors:
        return None, None
    if vectors[source_id].shape != vectors[target_id].shape:
        return None, None  # mid embedding-model change — see search.similar_pairs
    score = cosine_similarity(vectors[source_id], vectors[target_id])
    if score < AUTO_REASON_THRESHOLD:
        return None, None

    # Threshold met: generate a reason with the AI
    from memorymap.ai.librarian import generate_link_reason
    from memorymap.core.deps import get_ollama, get_model_manager
    from memorymap.ai.provider import OllamaError
    from memorymap.core.database import Entry

    source_entry = session.get(Entry, source_id)
    target_entry = session.get(Entry, target_id)
    if not source_entry or not target_entry:
        return AUTO_REASON_TEXT, round(score, 2)

    try:
        ollama = get_ollama()
        model_manager = get_model_manager()
        reason = generate_link_reason(source_entry.content, target_entry.content, model_manager, ollama)
        if not reason:
            return AUTO_REASON_TEXT, round(score, 2)
        return reason, round(score, 2)
    except Exception as e:
        # Fall back gracefully if model is offline or throws an error
        print(f"Failed to generate link reason: {e}")
        return AUTO_REASON_TEXT, round(score, 2)


def create_link(
    session: Session, source: Entry, target: Entry, reason: str | None = None
) -> EntryLink | None:
    """Manually connect two entries. Returns None if the link already
    exists (either direction) or the user tried to link an entry to
    itself. Commits on success.

    `reason` is optional free text — "why are these connected?" — the thing
    a shared tag or a reply thread says on its own and a link doesn't. Not
    required: most links are still obviously why (two notes about the same
    trip), and forcing an explanation on every one would make linking
    slower for the common case to help the uncommon one. When nobody gives
    one, `_deduce_reason` gets a try instead of leaving the link mute.
    """
    if source.id == target.id:
        return None
    existing = session.scalar(
        select(EntryLink).where(
            or_(
                (EntryLink.source_entry_id == source.id)
                & (EntryLink.target_entry_id == target.id),
                (EntryLink.source_entry_id == target.id)
                & (EntryLink.target_entry_id == source.id),
            )
        )
    )
    if existing is not None:
        return None
    reason = (reason or "").strip() or None
    confidence = None
    if reason is None:
        reason, confidence = _deduce_reason(session, source.id, target.id)
    link = EntryLink(
        source_entry_id=source.id,
        target_entry_id=target.id,
        reason=reason,
        reason_confidence=confidence,
    )
    session.add(link)
    session.flush()
    detail = f"-> entry {target.id}" + (f" ({link.reason})" if link.reason else "")
    log_action(session, "linked", "entry", source.id, detail)
    session.commit()
    return link


def backfill_link_reasons(session: Session) -> dict:
    """Give `_deduce_reason` a try on every existing link that has none.

    Asked directly: *"none of my notes have a linked reason yet — is there
    an easy way to give them all a reason?"* There wasn't one — `_deduce_reason`
    only ever ran at the moment `create_link` made a *new* link, so a
    notebook full of links made before that existed (or made without an
    embedding backend running at the time) stays mute forever with no way to
    revisit it. This is that revisit, run once over every link rather than
    one at a time.

    Same rule as a fresh link: a reason a person already gave is never
    touched, and a link that still can't be deduced (no embedding for one or
    both notes, or a score under the threshold) is left exactly as it was —
    "no reason" is still the honest answer, not a false one manufactured to
    fill the field.
    """
    reasonless = list(
        session.scalars(select(EntryLink).where(EntryLink.reason.is_(None)))
    )
    updated = 0
    for link in reasonless:
        reason, confidence = _deduce_reason(
            session, link.source_entry_id, link.target_entry_id
        )
        if reason is not None:
            link.reason = reason
            link.reason_confidence = confidence
            updated += 1
    if updated:
        log_action(session, "backfilled", "entry", detail=f"reasons for {updated} link(s)")
        session.commit()
    return {"checked": len(reasonless), "updated": updated}


def remove_link(session: Session, source: Entry, target: Entry) -> bool:
    """Disconnect two entries, whichever way round the link was made.

    Returns False when there was nothing to remove, so a caller can say "those
    aren't linked" rather than reporting a success that changed nothing.

    Direction-agnostic on purpose, matching `create_link`: a link is a
    connection rather than an arrow, and requiring the caller to know which
    note was the source would make removal fail for half of them depending on
    who made the link.
    """
    link = session.scalar(
        select(EntryLink).where(
            or_(
                (EntryLink.source_entry_id == source.id)
                & (EntryLink.target_entry_id == target.id),
                (EntryLink.source_entry_id == target.id)
                & (EntryLink.target_entry_id == source.id),
            )
        )
    )
    if link is None:
        return False
    delete_link(session, link)
    return True


def set_link_reason(session: Session, link: EntryLink, reason: str | None) -> EntryLink:
    """A person setting, changing, or clearing a link's reason by hand.

    Always wins over whatever `_deduce_reason` guessed: `reason_confidence`
    is cleared here because a person's words aren't a similarity score, and
    null already means "not deduced" — so an edited link and a freshly
    auto-reasoned one that hasn't been touched stay tellable apart.
    """
    link.reason = (reason or "").strip() or None
    link.reason_confidence = None
    detail = f"-> entry {link.target_entry_id}" + (f" ({link.reason})" if link.reason else "")
    log_action(session, "relinked", "entry", link.source_entry_id, detail)
    session.commit()
    return link


def delete_link(session: Session, link: EntryLink) -> None:
    log_action(
        session,
        "unlinked",
        "entry",
        link.source_entry_id,
        f"-> entry {link.target_entry_id}",
    )
    session.delete(link)
    session.commit()


def links_for_entry(session: Session, entry: Entry) -> list[tuple[EntryLink, Entry]]:
    """All links touching this entry, with the entry on the other end."""
    links = session.scalars(
        select(EntryLink).where(
            or_(
                EntryLink.source_entry_id == entry.id,
                EntryLink.target_entry_id == entry.id,
            )
        )
    )
    result = []
    for link in links:
        other_id = (
            link.target_entry_id
            if link.source_entry_id == entry.id
            else link.source_entry_id
        )
        other = session.get(Entry, other_id)
        if other is not None:
            result.append((link, other))
    return result


def category_name_for(session: Session, entry: Entry) -> str:
    """Resolve an entry's category name (entries always have one)."""
    if entry.category_id is None:
        return UNCATEGORISED
    category = session.get(Category, entry.category_id)
    return category.name if category else UNCATEGORISED


def bulk_category_names(session: Session, entries: list[Entry]) -> dict[int | None, str]:
    """Resolve category names for multiple entries efficiently in a single query."""
    ids = {e.category_id for e in entries if e.category_id is not None}
    if not ids:
        return {None: UNCATEGORISED}
    rows = session.scalars(select(Category).where(Category.id.in_(ids)))
    mapping = {c.id: c.name for c in rows}
    mapping[None] = UNCATEGORISED
    return mapping


def tags_from_json(tags_json: str | None) -> list[str]:
    """Parse a tags JSON string directly without an Entry object."""
    if not tags_json:
        return []
    try:
        loaded = json.loads(tags_json)
        return loaded if isinstance(loaded, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def entry_tags(entry: Entry) -> list[str]:
    """Tags are stored as a JSON string; hand callers a real list."""
    return tags_from_json(entry.tags)


# --- category management (rename / delete) -----------------------------------


def all_categories(session: Session) -> list[dict]:
    """Every category with how many live entries sit in it, biggest first.

    Binned entries aren't counted — the number should match what the sidebar
    shows, and the sidebar only ever lists notes you can still see.
    """
    rows = list(session.scalars(select(Category).order_by(Category.name)))
    counts = {
        category_id: total
        for category_id, total in session.execute(
            select(Entry.category_id, func.count(Entry.id))
            .where(Entry.is_deleted == False)  # noqa: E712
            .group_by(Entry.category_id)
        )
    }
    out = [
        {"id": c.id, "name": c.name, "count": counts.get(c.id, 0)}
        for c in rows
    ]
    out.sort(key=lambda c: (-c["count"], c["name"].lower()))
    return out


def rename_category(session: Session, category_id: int, new_name: str) -> dict:
    """Rename a category; renaming onto an existing name merges the two.

    Merging is the useful behaviour rather than an error — "Work" and "work"
    turning up as separate categories is exactly the mess this is here to fix.
    """
    category = session.get(Category, category_id)
    if category is None:
        raise ValueError("That category no longer exists")
    new_name = new_name.strip()
    if not new_name:
        raise ValueError("A category needs a name")
    if new_name == category.name:
        return {"renamed": False, "merged": False, "moved": 0}

    existing = session.scalar(select(Category).where(Category.name == new_name))
    if existing is not None and existing.id != category.id:
        # Merge: move the entries across, then drop the now-empty category.
        moved = _reassign(session, category.id, existing.id)
        log_action(session, "edited", "category", existing.id, f"merged {category.name} → {new_name}")
        session.delete(category)
        session.commit()
        return {"renamed": True, "merged": True, "moved": moved}

    old = category.name
    category.name = new_name
    log_action(session, "edited", "category", category.id, f"{old} → {new_name}")
    session.commit()
    return {"renamed": True, "merged": False, "moved": 0}


def delete_category(session: Session, category_id: int) -> dict:
    """Remove a category. Its notes are kept and become Uncategorised.

    Deleting a category must never delete notes — that would make an organising
    action destructive, which is never what anyone means by "delete category".
    """
    category = session.get(Category, category_id)
    if category is None:
        raise ValueError("That category no longer exists")
    if category.name == UNCATEGORISED:
        raise ValueError("Uncategorised is where notes go; it can't be removed")

    fallback = get_or_create_category(session, UNCATEGORISED)
    moved = _reassign(session, category.id, fallback.id)
    log_action(session, "deleted", "category", category.id, category.name)
    session.delete(category)
    session.commit()
    return {"deleted": True, "moved": moved}


def _reassign(session: Session, from_id: int, to_id: int) -> int:
    """Point every entry in one category at another. Returns how many moved."""
    entries = list(session.scalars(select(Entry).where(Entry.category_id == from_id)))
    for entry in entries:
        entry.category_id = to_id
    return len(entries)


# --- private notes -----------------------------------------------------------
# Encryption lives behind these two helpers so every read and write goes
# through the same place. Scattering encrypt/decrypt calls across the routes is
# how a path gets missed and a note is stored in the clear.


def readable_content(entry: Entry) -> str:
    """The note's text, decrypting it if it's private and the vault is open.

    A locked vault returns a placeholder rather than raising: a private note
    must not break the notes list, the graph, or an export for everything else.
    """
    from memorymap.core import crypto, vault

    if not crypto.is_encrypted(entry.content):
        return entry.content
    key = vault.key()
    if key is None:
        return "🔒 Private note — unlock to read it."
    try:
        return crypto.decrypt(key, entry.content)
    except crypto.DecryptionError:
        # Kept deliberately non-fatal. The stored bytes are still there, so a
        # key problem is recoverable; crashing the list is not.
        return "🔒 This private note couldn't be decrypted."


def _heading_text(stripped: str) -> str | None:
    r"""The text of a leading Markdown heading (1-6 `#`, then a required
    space/tab, then the title) — a `#` three paragraphs into a long note is
    a section break, not what the note is *called*, so this only ever looks
    at one already-stripped line. Requires the space after the hashes, so
    "#recipe" (a tag someone typed at the very top) is never mistaken for a
    heading.

    Hand-rolled instead of a `^#{1,6}[ \t]+(\S.*)$` regex: CodeQL flagged
    that shape as a polynomial-ReDoS risk on note content, which is as
    uncontrolled as input gets in this app. This scan is a single linear
    pass with no backtracking.
    """
    n = 0
    while n < len(stripped) and n < 6 and stripped[n] == "#":
        n += 1
    if n == 0 or n >= len(stripped) or stripped[n] not in " \t":
        return None
    text = stripped[n:].lstrip(" \t")
    if not text or text[0].isspace():
        return None
    return text


def extract_title(content: str) -> str | None:
    """A note's own title, if it wrote one — its first line, when that line
    is a Markdown heading. Not a stored field: there is nothing to fall out
    of sync with the content, and "editing the title" is just editing that
    line, the same as any other (asked for directly, and simpler than a
    second input box fighting the single-box capture flow this app is built
    around).
    """
    for line in (content or "").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        text = _heading_text(stripped)
        return text.strip() if text else None
    return None


def _first_content_line(content: str) -> int | None:
    """Index of the first non-blank line, or None if there isn't one."""
    lines = content.splitlines()
    for i, line in enumerate(lines):
        if line.strip():
            return i
    return None


def apply_title(content: str, title: str) -> str:
    """Set (or replace) a note's title — its first line, as a heading.
    Prepends a new heading line if the note doesn't have one yet; replaces
    the existing one otherwise, so generating a title for a note that
    already has one swaps it rather than stacking two."""
    lines = (content or "").splitlines()
    i = _first_content_line(content or "")
    heading = f"# {title}"
    if i is not None and _heading_text(lines[i].strip()) is not None:
        lines[i] = heading
        return "\n".join(lines)
    return heading if not content else f"{heading}\n{content}"


def remove_title(content: str) -> str:
    """Take a note's title back out, asked for directly — it's just the
    leading heading line, so removing it is removing that line (and one
    blank line right after it, so the body doesn't start with a gap). A
    note with no title is returned unchanged.
    """
    lines = (content or "").splitlines()
    i = _first_content_line(content or "")
    if i is None or _heading_text(lines[i].strip()) is None:
        return content
    del lines[i]
    if i < len(lines) and not lines[i].strip():
        del lines[i]
    return "\n".join(lines)


def set_private(session: Session, entry: Entry, private: bool) -> bool:
    """Encrypt or decrypt one note in place. False if the vault is locked.

    Making a note private also drops its embedding: a vector derived from the
    text would leak what the note is about, which defeats the point.
    """
    from memorymap.core import crypto, vault
    from memorymap.core.database import EmbeddingRecord

    key = vault.key()
    if key is None:
        return False

    if private:
        if not crypto.is_encrypted(entry.content):
            entry.content = crypto.encrypt(key, entry.content)
        entry.is_private = True
        session.execute(delete(EmbeddingRecord).where(EmbeddingRecord.entry_id == entry.id))
        # And the resolved dates, for the same reason as the embedding: a note
        # is marked private *after* it is created, so anything derived from
        # its text and stored in the clear has to be cleared out here too.
        # "The appointment is tomorrow" plus a date is most of the note.
        session.execute(delete(EntryDate).where(EntryDate.entry_id == entry.id))
    else:
        if crypto.is_encrypted(entry.content):
            entry.content = crypto.decrypt(key, entry.content)
        entry.is_private = False
        record_dates(session, entry)  # readable again, so it can be read again
    log_action(session, "edited", "entry", entry.id, f"private={private}")
    return True


# --- [[wiki links]] ----------------------------------------------------------
# Typing [[something]] in a note links it to the note that starts with that
# text. It's the cheapest way to build a real web of notes: no AI, no dialog,
# no leaving the keyboard — and it's what makes the graph fill itself instead
# of waiting for someone to link things by hand.

WIKI_LINK = re.compile(r"\[\[([^\[\]]{1,120})\]\]")


def wiki_link_targets(content: str) -> list[str]:
    """The [[names]] mentioned in some text, de-duplicated, in order."""
    seen = {}
    for match in WIKI_LINK.finditer(content or ""):
        name = match.group(1).strip()
        if name:
            seen.setdefault(name.lower(), name)
    return list(seen.values())


def find_by_wiki_name(session: Session, name: str) -> Entry | None:
    """The note a [[name]] refers to, or None.

    Matched against the start of the note, because a note has no title — its
    opening words are what a person would call it. An exact opening beats a
    partial one, and among equals the oldest wins so a link doesn't silently
    change meaning when a newer note happens to start the same way.
    """
    wanted = (name or "").strip().lower()
    if not wanted:
        return None
    candidates = session.scalars(
        select(Entry)
        .where(
            Entry.is_deleted == False,  # noqa: E712
            Entry.is_private == False,  # noqa: E712
            Entry.content.ilike(f"{wanted}%"),
        )
        .order_by(Entry.id)
    ).all()
    if not candidates:
        return None
    for entry in candidates:
        if entry.content.strip().lower() == wanted:
            return entry  # the whole note is exactly that name
    return candidates[0]


def sync_wiki_links(session: Session, entry: Entry) -> list[str]:
    """Create links for the [[names]] in this note. Returns the unresolved ones.

    Only ever adds. A [[name]] that matches nothing is left alone rather than
    reported as an error — you often write the link before the note it points
    at, and having that fail the save would be worse than useless.
    """
    unresolved = []
    for name in wiki_link_targets(entry.content):
        target = find_by_wiki_name(session, name)
        if target is None or target.id == entry.id:
            if target is None:
                unresolved.append(name)
            continue
        create_link(session, entry, target)
    return unresolved


# --- edit history ------------------------------------------------------------
# The recycle bin covers deletion. Nothing covered editing, so rewriting a note
# destroyed what it used to say with no way back — and the AI can rewrite notes
# too, which makes an undo more than a nicety.

# Per note. Enough to walk back a bad session, few enough that a note edited
# hundreds of times doesn't quietly become the largest thing in the database.
MAX_REVISIONS = 20


def record_revision(session: Session, entry: Entry) -> None:
    """Save the note as it is now, before it's changed.

    Private notes store their ciphertext, which is what's in the column — a
    revision must never be the one place a private note sits in the clear.
    """
    from memorymap.core.database import EntryRevision

    session.add(
        EntryRevision(entry_id=entry.id, content=entry.content, tags=entry.tags or "[]")
    )
    session.flush()

    stale = list(
        session.scalars(
            select(EntryRevision)
            .where(EntryRevision.entry_id == entry.id)
            .order_by(EntryRevision.id.desc())
            .offset(MAX_REVISIONS)
        )
    )
    for revision in stale:
        session.delete(revision)


def revisions_for(session: Session, entry: Entry) -> list:
    """This note's past versions, newest first."""
    from memorymap.core.database import EntryRevision

    return list(
        session.scalars(
            select(EntryRevision)
            .where(EntryRevision.entry_id == entry.id)
            .order_by(EntryRevision.id.desc())
        )
    )
