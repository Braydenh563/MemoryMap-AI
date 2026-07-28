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
    EntryDate,
    EntryLink,
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
    # Orphan children of a purged parent become thread roots.
    session.execute(
        Entry.__table__.update()
        .where(Entry.parent_id.in_(ids))
        .values(parent_id=None)
    )
    session.execute(delete(Entry).where(Entry.id.in_(ids)))
    return len(ids)


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
