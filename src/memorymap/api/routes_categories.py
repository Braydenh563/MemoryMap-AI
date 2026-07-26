"""Category management: list, rename (merging on collision), and delete.

Categories are created implicitly by the AI as it files notes, so over time
they drift — near-duplicates, typos, ones that stopped being useful. These
endpoints are how the user tidies that up.

Neither operation ever loses a note: renaming onto an existing category merges
the two, and deleting one moves its notes to Uncategorised.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from memorymap.core.deps import get_session
from memorymap.entry import manager

router = APIRouter(prefix="/categories", tags=["categories"])


class RenameBody(BaseModel):
    name: str = Field(min_length=1, max_length=100)


@router.get("")
def list_categories(session: Session = Depends(get_session)) -> list[dict]:
    """Every category with its live note count, biggest first."""
    return manager.all_categories(session)


@router.put("/{category_id}")
def rename_category(
    category_id: int, body: RenameBody, session: Session = Depends(get_session)
) -> dict:
    """Rename a category. Renaming onto an existing one merges them."""
    try:
        return manager.rename_category(session, category_id, body.name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{category_id}")
def delete_category(category_id: int, session: Session = Depends(get_session)) -> dict:
    """Remove a category; its notes survive as Uncategorised."""
    try:
        return manager.delete_category(session, category_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
