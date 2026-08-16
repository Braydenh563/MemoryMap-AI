"""Tag manager endpoints: see, rename/merge, delete tags."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from memorymap.core.deps import get_session
from memorymap.entry import manager

router = APIRouter(prefix="/tags", tags=["tags"])


class RenameBody(BaseModel):
    old: str = Field(min_length=1)
    new: str = Field(min_length=1, max_length=60)


class DeleteBody(BaseModel):
    name: str = Field(min_length=1)


@router.get("")
def list_tags(session: Session = Depends(get_session)) -> dict[str, int]:
    """Every tag in use → how many entries carry it (most used first)."""
    return manager.all_tags(session)


@router.post("/rename")
def rename_tag(body: RenameBody, session: Session = Depends(get_session)) -> dict:
    """Rename a tag everywhere; renaming onto an existing tag merges them."""
    return {"changed": manager.rename_tag(session, body.old, body.new.strip())}


@router.post("/delete")
def delete_tag(body: DeleteBody, session: Session = Depends(get_session)) -> dict:
    return {"changed": manager.delete_tag(session, body.name)}
