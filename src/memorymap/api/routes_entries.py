"""Capture, read, edit, soft-delete, restore, and link entries.

Handlers are plain `def` (not async) on purpose: FastAPI then runs them
in a threadpool, which keeps the server responsive while blocking AI
calls run (plan §4).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete as sa_delete
from sqlalchemy.orm import Session

from memorymap.ai import janitor
from memorymap.api.schemas import EntryCreate, EntryOut, EntryUpdate, LinkOut
from memorymap.core import deps
from memorymap.core.database import EmbeddingRecord, EntryLink
from memorymap.core.deps import get_session
from memorymap.entry import manager

router = APIRouter(prefix="/entries", tags=["entries"])


def _preview(text: str, length: int = 60) -> str:
    return text if len(text) <= length else text[: length - 1] + "…"


def _to_out(session: Session, entry, filed_by: str | None = None) -> EntryOut:  # noqa: ANN001
    return EntryOut(
        id=entry.id,
        content=entry.content,
        category=manager.category_name_for(session, entry),
        tags=manager.entry_tags(entry),
        ai_confidence=entry.ai_confidence,
        access_count=entry.access_count,
        created_at=entry.created_at,
        deleted_at=entry.deleted_at if entry.is_deleted else None,
        links=[
            LinkOut(link_id=link.id, entry_id=other.id, preview=_preview(other.content))
            for link, other in manager.links_for_entry(session, entry)
        ],
        filed_by=filed_by,
    )


def _existing_entry(session: Session, entry_id: int):  # noqa: ANN202
    entry = manager.get_entry(session, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@router.post("", response_model=EntryOut, status_code=201)
def create_entry(body: EntryCreate, session: Session = Depends(get_session)) -> EntryOut:
    if body.category:
        # Guided mode: the user chose — the AI stays out of it entirely.
        category, confidence, filed_by = body.category, 100, "user"
    else:
        # Ask the janitor where this belongs. Whatever goes wrong in AI
        # land, the note still gets saved (plan §4).
        try:
            category, confidence, filed_by = janitor.categorise(
                session,
                body.content,
                deps.get_embeddings(),
                deps.get_model_manager(),
                deps.get_ollama(),
            )
        except Exception:
            category, confidence, filed_by = manager.UNCATEGORISED, 0, "none"

    entry = manager.create_entry(
        session,
        content=body.content,
        category_name=category,
        tags=body.tags,
        ai_confidence=confidence,
    )

    # Best effort: a failed embedding only means this entry is invisible
    # to semantic search until re-indexed — never a failed save.
    try:
        deps.get_embeddings().store_for_entry(session, entry)
    except Exception:
        pass

    return _to_out(session, entry, filed_by=filed_by)


@router.get("", response_model=list[EntryOut])
def list_entries(
    deleted: bool = False, session: Session = Depends(get_session)
) -> list[EntryOut]:
    """Normal list, or the recycle bin when ?deleted=true."""
    if deleted:
        entries = manager.list_deleted_entries(session)
    else:
        entries = manager.list_entries(session)
    return [_to_out(session, e) for e in entries]


# Declared before /{entry_id} so "most-accessed" isn't parsed as an id.
@router.get("/most-accessed", response_model=list[EntryOut])
def most_accessed(session: Session = Depends(get_session)) -> list[EntryOut]:
    """Top entries by how often they've been opened or matched a
    question — the Phase 5 quick-access dashboard."""
    entries = manager.most_accessed_entries(session, limit=5)
    return [_to_out(session, e) for e in entries]


@router.get("/{entry_id}", response_model=EntryOut)
def get_entry(entry_id: int, session: Session = Depends(get_session)) -> EntryOut:
    entry = _existing_entry(session, entry_id)
    if entry.is_deleted:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry.access_count += 1  # opening an entry counts as using it
    session.commit()
    return _to_out(session, entry)


@router.put("/{entry_id}", response_model=EntryOut)
def update_entry(
    entry_id: int, body: EntryUpdate, session: Session = Depends(get_session)
) -> EntryOut:
    """Manual override: the user can correct anything the AI decided
    (plan §4 — the AI is a servant, not a gatekeeper)."""
    entry = _existing_entry(session, entry_id)
    content_changed = body.content is not None and body.content != entry.content
    manager.update_entry(
        session,
        entry,
        content=body.content,
        category_name=body.category,
        tags=body.tags,
    )
    if content_changed:
        # The old vector describes the old text — refresh it, best effort.
        try:
            session.execute(
                sa_delete(EmbeddingRecord).where(EmbeddingRecord.entry_id == entry.id)
            )
            session.commit()
            deps.get_embeddings().store_for_entry(session, entry)
        except Exception:
            pass
    return _to_out(session, entry)


@router.delete("/{entry_id}", response_model=EntryOut)
def delete_entry(entry_id: int, session: Session = Depends(get_session)) -> EntryOut:
    """Soft delete → recycle bin. Restorable until purged."""
    entry = _existing_entry(session, entry_id)
    if not entry.is_deleted:
        manager.soft_delete_entry(session, entry)
    return _to_out(session, entry)


@router.post("/{entry_id}/restore", response_model=EntryOut)
def restore_entry(entry_id: int, session: Session = Depends(get_session)) -> EntryOut:
    entry = _existing_entry(session, entry_id)
    if entry.is_deleted:
        manager.restore_entry(session, entry)
    return _to_out(session, entry)


class LinkBody(BaseModel):
    target_id: int


@router.post("/{entry_id}/links", response_model=EntryOut)
def create_link(
    entry_id: int, body: LinkBody, session: Session = Depends(get_session)
) -> EntryOut:
    source = _existing_entry(session, entry_id)
    target = _existing_entry(session, body.target_id)
    link = manager.create_link(session, source, target)
    if link is None:
        raise HTTPException(
            status_code=400, detail="Already linked (or tried to link an entry to itself)"
        )
    return _to_out(session, source)


@router.delete("/{entry_id}/links/{link_id}", response_model=EntryOut)
def delete_link(
    entry_id: int, link_id: int, session: Session = Depends(get_session)
) -> EntryOut:
    entry = _existing_entry(session, entry_id)
    link = session.get(EntryLink, link_id)
    if link is None or entry.id not in (link.source_entry_id, link.target_entry_id):
        raise HTTPException(status_code=404, detail="Link not found")
    manager.delete_link(session, link)
    return _to_out(session, entry)
