"""Capture and read entries.

Handlers are plain `def` (not async) on purpose: FastAPI then runs them
in a threadpool, which keeps the server responsive once blocking AI
calls join in Phase 2 (plan §4).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from memorymap.api.schemas import EntryCreate, EntryOut
from memorymap.core.deps import get_session
from memorymap.entry import manager

router = APIRouter(prefix="/entries", tags=["entries"])


def _to_out(session: Session, entry) -> EntryOut:  # noqa: ANN001
    return EntryOut(
        id=entry.id,
        content=entry.content,
        category=manager.category_name_for(session, entry),
        tags=manager.entry_tags(entry),
        ai_confidence=entry.ai_confidence,
        created_at=entry.created_at,
    )


@router.post("", response_model=EntryOut, status_code=201)
def create_entry(body: EntryCreate, session: Session = Depends(get_session)) -> EntryOut:
    # Phase 1: everything is Uncategorised. Phase 2 will ask the janitor
    # for a (category, confidence) before storing.
    entry = manager.create_entry(session, content=body.content, tags=body.tags)
    return _to_out(session, entry)


@router.get("", response_model=list[EntryOut])
def list_entries(session: Session = Depends(get_session)) -> list[EntryOut]:
    return [_to_out(session, e) for e in manager.list_entries(session)]


@router.get("/{entry_id}", response_model=EntryOut)
def get_entry(entry_id: int, session: Session = Depends(get_session)) -> EntryOut:
    entry = manager.get_entry(session, entry_id)
    if entry is None or entry.is_deleted:
        raise HTTPException(status_code=404, detail="Entry not found")
    return _to_out(session, entry)
