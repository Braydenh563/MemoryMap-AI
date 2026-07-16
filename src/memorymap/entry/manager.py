"""Create/read/update/soft-delete entries, links, and audit logging.

Deliberately AI-free: the API layer decides the category (by asking the
janitor in Phase 2) and this module just stores what it's told. That
keeps capture working even when every AI piece is down (plan §4).
"""

from __future__ import annotations

import json
from datetime import timedelta

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from memorymap.core.database import (
    AuditLog,
    Category,
    EmbeddingRecord,
    Entry,
    EntryLink,
    utcnow,
)

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
    log_action(session, "created", "entry", entry.id)
    session.commit()
    return entry


def list_entries(session: Session, include_deleted: bool = False) -> list[Entry]:
    """Newest first. Deleted entries stay hidden until the recycle bin
    UI (Phase 4) asks for them explicitly."""
    query = select(Entry).order_by(Entry.created_at.desc(), Entry.id.desc())
    if not include_deleted:
        query = query.where(Entry.is_deleted == False)  # noqa: E712
    return list(session.scalars(query))


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
            changed.append(f"category={category_name}")
    if tags is not None:
        entry.tags = json.dumps(tags)
        changed.append("tags")
    if changed:
        log_action(session, "edited", "entry", entry.id, ", ".join(changed))
        session.commit()
    return entry


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


def _hard_delete(session: Session, entries: list[Entry]) -> int:
    """Permanently remove entries plus their vectors and links."""
    ids = [e.id for e in entries]
    if not ids:
        return 0
    session.execute(delete(EmbeddingRecord).where(EmbeddingRecord.entry_id.in_(ids)))
    session.execute(
        delete(EntryLink).where(
            or_(EntryLink.source_entry_id.in_(ids), EntryLink.target_entry_id.in_(ids))
        )
    )
    session.execute(delete(Entry).where(Entry.id.in_(ids)))
    return len(ids)


def empty_recycle_bin(session: Session) -> int:
    """Manual 'empty now' (plan Phase 4). Commits."""
    binned = list(session.scalars(select(Entry).where(Entry.is_deleted == True)))  # noqa: E712
    count = _hard_delete(session, binned)
    if count:
        log_action(session, "purged", "recycle_bin", detail=f"{count} entries")
    session.commit()
    return count


def purge_expired_deleted(session: Session, days: int) -> int:
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
    count = _hard_delete(session, expired)
    if count:
        log_action(session, "purged", "recycle_bin", detail=f"{count} expired entries")
    session.commit()
    return count


def create_link(session: Session, source: Entry, target: Entry) -> EntryLink | None:
    """Manually connect two entries. Returns None if the link already
    exists (either direction) or the user tried to link an entry to
    itself. Commits on success."""
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
    link = EntryLink(source_entry_id=source.id, target_entry_id=target.id)
    session.add(link)
    session.flush()
    log_action(session, "linked", "entry", source.id, f"-> entry {target.id}")
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


def entry_tags(entry: Entry) -> list[str]:
    """Tags are stored as a JSON string; hand callers a real list."""
    try:
        loaded = json.loads(entry.tags)
        return loaded if isinstance(loaded, list) else []
    except json.JSONDecodeError:
        return []
