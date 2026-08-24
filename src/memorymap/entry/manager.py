"""Create/read/update/soft-delete entries, links, and audit logging.

Deliberately AI-free: the API layer decides the category (by asking the
janitor) and this module just stores what it's told. That
keeps capture working even when every AI piece is down (plan §4).
"""

from __future__ import annotations

import json
import logging
import re
import threading
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


def _list_entries_filter(query, include_deleted: bool, include_archived: bool):
    """The where-clause `list_entries` and `count_entries` both need — kept
    in one place so a filter added to one can't quietly drift from the
    other and make the count lie about what the list actually shows."""
    if not include_deleted:
        query = query.where(Entry.is_deleted == False)  # noqa: E712
    if not include_archived:
        query = query.where(Entry.archived_at.is_(None))
    return query


def list_entries(
    session: Session,
    include_deleted: bool = False,
    include_archived: bool = False,
    limit: int | None = None,
    offset: int = 0,
) -> list[Entry]:
    """Pinned first, then newest first. Deleted and archived entries stay
    hidden until the recycle bin / archive UI asks for them explicitly —
    archiving is not deleting, but it means the same "out of the way until
    asked for" thing for an ordinary list.

    `limit`/`offset` are optional and `None` means "everything", so every
    existing caller (background jobs, the librarian, tests) that wants the
    whole notebook keeps working unchanged — pagination is additive, not a
    breaking change to this function's contract. `routes_entries.py` is the
    one caller that always passes a bounded `limit`; see its own comment for
    why an HTTP response is a different situation from an in-process call.
    """
    query = select(Entry).order_by(
        Entry.pinned.desc(), Entry.created_at.desc(), Entry.id.desc()
    )
    query = _list_entries_filter(query, include_deleted, include_archived)
    if offset:
        query = query.offset(offset)
    if limit is not None:
        query = query.limit(limit)
    return list(session.scalars(query))


def count_entries(
    session: Session, include_deleted: bool = False, include_archived: bool = False
) -> int:
    """How many `list_entries` would return with no `limit` — the total a
    paginated caller needs to know when it has seen everything."""
    query = _list_entries_filter(select(func.count()).select_from(Entry), include_deleted, include_archived)
    return session.scalar(query) or 0


def entry_id_scope(
    session: Session, *, deleted: bool = False, archived: bool = False
) -> set[int]:
    """Every entry id in one of the three views — live, bin, or archive.

    Exists because the caller that needs this (semantic search's scope check in
    `routes_entries.list_entries_route`) needs *only* ids, and its own comment
    already said so — "ids only, no row bodies — cheap even at real notebook
    scale". The code underneath it did not match: it called `list_entries()`
    and threw every mapped `Entry` away after reading `.id`, which is the exact
    cost `search_manager.semantic_search` was rewritten to stop paying
    (its docstring measures it at ~85% of a search at 20k+ notes — materialising
    entities to score and discard them). A comment describing an optimisation
    the code does not perform is worse than no comment, because the next
    profiler run has to rediscover it.

    Deliberately unpaginated, for the reason the call site gives: this decides
    which semantic hits are *in scope* at all, so a page boundary here would
    silently drop legitimate matches.
    """
    query = select(Entry.id)
    if deleted:
        query = query.where(Entry.is_deleted == True)  # noqa: E712
    elif archived:
        query = query.where(
            Entry.archived_at.is_not(None), Entry.is_deleted == False  # noqa: E712
        )
    else:
        query = _list_entries_filter(query, False, False)
    return set(session.scalars(query))


def most_accessed_entries(session: Session, limit: int = 5) -> list[Entry]:
    """Most-used non-deleted, non-archived entries; untouched entries don't
    qualify."""
    return list(
        session.scalars(
            select(Entry)
            .where(
                Entry.is_deleted == False,  # noqa: E712
                Entry.archived_at.is_(None),
                Entry.access_count > 0,
            )
            .order_by(Entry.access_count.desc(), Entry.id.desc())
            .limit(limit)
        )
    )


def list_deleted_entries(
    session: Session, limit: int | None = None, offset: int = 0
) -> list[Entry]:
    """The recycle bin, most recently deleted first."""
    query = select(Entry).where(Entry.is_deleted == True).order_by(  # noqa: E712
        Entry.deleted_at.desc(), Entry.id.desc()
    )
    if offset:
        query = query.offset(offset)
    if limit is not None:
        query = query.limit(limit)
    return list(session.scalars(query))


def count_deleted_entries(session: Session) -> int:
    return session.scalar(
        select(func.count()).select_from(Entry).where(Entry.is_deleted == True)  # noqa: E712
    ) or 0


def list_archived_entries(
    session: Session, limit: int | None = None, offset: int = 0
) -> list[Entry]:
    """The archive, most recently archived first. Independent of the
    recycle bin — an archived note that's also deleted still belongs to
    the bin, not here (list_entries' own is_deleted filter already keeps
    the two from double-counting in the normal view)."""
    query = select(Entry).where(
        Entry.archived_at.is_not(None), Entry.is_deleted == False  # noqa: E712
    ).order_by(Entry.archived_at.desc(), Entry.id.desc())
    if offset:
        query = query.offset(offset)
    if limit is not None:
        query = query.limit(limit)
    return list(session.scalars(query))


def count_archived_entries(session: Session) -> int:
    return session.scalar(
        select(func.count())
        .select_from(Entry)
        .where(Entry.archived_at.is_not(None), Entry.is_deleted == False)  # noqa: E712
    ) or 0


def get_entry(session: Session, entry_id: int) -> Entry | None:
    return session.get(Entry, entry_id)


def update_entry(
    session: Session,
    entry: Entry,
    content: str | None = None,
    category_name: str | None = None,
    tags: list[str] | None = None,
) -> Entry:
    """Manual override: the user can change anything the
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
            # out of this entry's filing from now on.
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


def archive_entry(session: Session, entry: Entry) -> None:
    """Out of the way, but never deleted — no auto-clear, no purge."""
    entry.archived_at = utcnow()
    log_action(session, "archived", "entry", entry.id)
    session.commit()


def unarchive_entry(session: Session, entry: Entry) -> None:
    entry.archived_at = None
    log_action(session, "unarchived", "entry", entry.id)
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
    # `this week → week of 27 July` chip is an `entry_dates` row — which is
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
    """Manual 'empty now'. Commits."""
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


# --- attachments ------------------------------------------------------


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


# --- tags (tag manager) --------------------------------------------------


_tag_cache_lock = threading.Lock()
_tag_cache: dict | None = None  # (fingerprint, result), one slot — no LRU needed
_tag_cache_reset_registered = False


def _tag_fingerprint(session: Session) -> tuple:
    """Cheap signature of everything that can change a tag count: a new
    entry, an edit, a delete, or a restore. Same shape as routes_graph.py's
    `_graph_fingerprint` — `Entry.updated_at` has `onupdate=utcnow`, so any
    tag edit bumps it, and the live-entry count catches soft-delete/restore
    even on the rare row an edit doesn't touch."""
    from memorymap.core import deps

    live = Entry.is_deleted == False  # noqa: E712
    return (
        str(deps.get_config().data_dir),
        session.scalar(select(func.count(Entry.id)).where(live)) or 0,
        session.scalar(select(func.max(Entry.updated_at)).where(live)),
    )


def reset_tag_cache() -> None:
    """Drop the cached tag counts. For the tests, and for a data restore."""
    global _tag_cache
    with _tag_cache_lock:
        _tag_cache = None


def _ensure_tag_cache_reset_registered() -> None:
    # `deps` imports (transitively, via ai.embeddings -> ai.model_manager)
    # back into this module for `log_action`, so `from memorymap.core import
    # deps` cannot sit at module level here without a circular import at
    # startup — register lazily, on first use, the same way this file
    # already imports `deps` inside `record_dates` for the same reason.
    global _tag_cache_reset_registered
    if _tag_cache_reset_registered:
        return
    from memorymap.core import deps

    deps.register_cache_reset(reset_tag_cache)
    _tag_cache_reset_registered = True


def all_tags(session: Session) -> dict[str, int]:
    """Every tag in use with its entry count.

    Was a full non-deleted-entry scan with a per-row `json.loads`, paid on
    every Library tab open, every `tag_cloud()` call, and every `/tags`
    call — three call sites, the same O(n) cost each time, and no cap the
    way every sibling section of the same responses uses (ROADMAP.md
    "#0 priority"). Cached by notebook fingerprint instead, the same
    pattern `routes_graph.py` already uses for pagerank/similarity — a
    fingerprint miss recomputes once; every other caller within the same
    notebook version gets the cached dict.
    """
    global _tag_cache
    _ensure_tag_cache_reset_registered()
    fingerprint = _tag_fingerprint(session)
    with _tag_cache_lock:
        if _tag_cache is not None and _tag_cache[0] == fingerprint:
            return _tag_cache[1]

    counts: dict[str, int] = {}
    # One column, not one mapped entity per row. `tags` is the only thing this
    # loop reads, and a `select(Entry)` here made SQLAlchemy build — and
    # identity-map — a full `Entry` for every note in the notebook just to
    # reach `.tags`. That is the same cost `search_manager.semantic_search`
    # was rewritten to stop paying (see its docstring: ~85% of a search at
    # 20k+ notes went on materialising entities it then discarded). The
    # fingerprint cache above keeps this off the hot path most of the time;
    # this makes the miss itself cheap instead of merely rare.
    for raw in session.scalars(
        select(Entry.tags).where(Entry.is_deleted == False)  # noqa: E712
    ):
        for tag in tags_from_json(raw):
            counts[tag] = counts.get(tag, 0) + 1
    result = dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))

    with _tag_cache_lock:
        _tag_cache = (fingerprint, result)
    return result


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
AUTO_REASON_TEXT_TEMPORAL = "similar in meaning, and around the same time"
#: How much a shared date pushes a borderline embedding score over
#: AUTO_REASON_THRESHOLD. Asked for directly (ROADMAP.md Tier 2 item 9):
#: two notes both mentioning "next Tuesday", or written the same day, should
#: read as related even when their topics don't overlap semantically enough
#: on their own. Deliberately small and a *rescue*, not a second path to a
#: link — see the `score >= AUTO_REASON_THRESHOLD` early return below, which
#: keeps every pair that already clears the bar on meaning alone exactly as
#: it was (the reason text, the confidence, and every existing test).
TEMPORAL_RESCUE_BOOST = 0.15


def _shares_a_date(session: Session, source_id: int, target_id: int) -> bool:
    """True when the two notes resolve to the same calendar day.

    Two ways in, both day-precision only (a coarser phrase like "last week"
    isn't specific enough to call two notes related on its own): a recorded
    time phrase in both (`EntryDate` — "next Tuesday" in one note and
    "next Tuesday" in another, each resolved against the day it was
    written), or simply being written on the same day, phrase or not.
    """
    dates_by_entry = entry_dates_bulk(session, [source_id, target_id])
    day_sets = {
        entry_id: {d.at.date() for d in dates if d.precision == "day"}
        for entry_id, dates in dates_by_entry.items()
    }
    if day_sets.get(source_id, set()) & day_sets.get(target_id, set()):
        return True

    entries = {
        e.id: e
        for e in session.scalars(
            select(Entry).where(Entry.id.in_((source_id, target_id)))
        )
    }
    source, target = entries.get(source_id), entries.get(target_id)
    if source is None or target is None:
        return False
    return source.created_at.date() == target.created_at.date()


def _deduce_reason(
    session: Session, source_id: int, target_id: int
) -> tuple[str | None, float | None]:
    """Guess why two notes might be linked from how close their embeddings
    are, with a shared date as a tie-breaker for a borderline pair. Returns
    `(None, None)` — "no reason" — when it can't: no embedding for one or
    both notes, a mid-reindex width mismatch, or a score under
    `AUTO_REASON_THRESHOLD` even after the date check. That's deliberately
    the same pair `reason` already had for "nobody gave one", so a weak
    guess never outranks silence — see `EntryLink.reason_confidence`.

    A private note has no embedding (`set_private` deletes it), so this is
    naturally a no-op for one rather than needing its own guard.

    Deliberately cheap — no model call. This used to also ask the AI for a
    specific reason here, synchronously, which meant `create_link` (and so
    every note-linking request, human or agent) stalled on a chat round-trip.
    Wording a *specific* reason is the background audit's job now
    (`ai.links.audit_vague_links`, driven from `ai.autonomous`): this always
    returns immediately with the embedding score's own verdict, the generic
    `AUTO_REASON_TEXT`, and leaves the wording to be upgraded later without
    the person who made the link ever waiting on it.
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
    if score >= AUTO_REASON_THRESHOLD:
        return AUTO_REASON_TEXT, round(score, 2)
    if score + TEMPORAL_RESCUE_BOOST >= AUTO_REASON_THRESHOLD and _shares_a_date(
        session, source_id, target_id
    ):
        return AUTO_REASON_TEXT_TEMPORAL, round(score, 2)
    return None, None


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


def apply_audited_reason(link: EntryLink, reason: str) -> None:
    """Set a link's reason from the background audit — field mutation only,
    no commit, no audit-log row.

    `set_link_reason` is right for a person editing one link: they did one
    thing, so one commit and one "relinked" row is an honest record. The
    background audit (`ai.links.audit_vague_links`) is the opposite shape —
    up to a `limit` of links rewritten in one pass — and calling
    `set_link_reason` per link there was the bug: a 500-link backfill did 500
    commits and left 500 near-identical "relinked" rows in the user's
    activity log, drowning out the log entries a person actually made. This
    just sets the fields; the caller commits once for the whole batch and
    writes one summary log row.

    Same field-level meaning as `set_link_reason`: `reason_confidence` is
    cleared because a reason the AI wrote out in words is no longer a guess
    from embedding similarity — see `EntryLink.reason_confidence`.
    """
    link.reason = (reason or "").strip() or None
    link.reason_confidence = None


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
        return "Private note — unlock to read it."
    try:
        return crypto.decrypt(key, entry.content)
    except crypto.DecryptionError:
        # Kept deliberately non-fatal. The stored bytes are still there, so a
        # key problem is recoverable; crashing the list is not.
        return "This private note couldn't be decrypted."


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


#: Inline markdown markers, matched with their content so stripping keeps
#: the words. An image or link becomes its alt/link text — the URL is never
#: captured, only whichever group actually matched ("first non-None group
#: wins", same trick every alternative here relies on). Originally lived
#: only in routes_graph.py (graph node labels); routes_library.py's Library
#: title/preview needed the identical fix — an image-only note (a sketch,
#: most often, but any note whose whole content is a pasted image works the
#: same way) read as literal `![sketch](/media/...)` there too, one surface
#: at a time, until this was factored out to stop that from happening a
#: third time somewhere else.
_INLINE_MD = re.compile(
    r"\*\*([^*\n]{1,500})\*\*|\*([^*\n]{1,500})\*|__([^_\n]{1,500})__"
    r"|_([^_\n]{1,500})_|~~([^~\n]{1,500})~~|`([^`\n]{1,500})`"
    r"|!\[([^\]\n]{0,200})\]\((?:[^)\n]{1,500})\)"
    r"|\[([^\]\n]{1,200})\]\((?:[^)\n]{1,500})\)"
)


def strip_inline_markdown(text: str) -> str:
    """A note's text as plain words: bold/italic/strike/code markers gone,
    an image or link reduced to its alt/link text. Markers only — block
    structure (headings, blockquotes, wiki-links) is each caller's own
    concern, since callers disagree on what to do with those."""
    return _INLINE_MD.sub(
        lambda m: next(g for g in m.groups() if g is not None), text
    )


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
