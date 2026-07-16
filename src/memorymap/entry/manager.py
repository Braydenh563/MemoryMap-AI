"""Create/read entries + audit logging.

Deliberately AI-free: the API layer decides the category (by asking the
janitor in Phase 2) and this module just stores what it's told. That
keeps capture working even when every AI piece is down (plan §4).
"""

from __future__ import annotations

import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.core.database import AuditLog, Category, Entry, utcnow

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


def get_entry(session: Session, entry_id: int) -> Entry | None:
    return session.get(Entry, entry_id)


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
