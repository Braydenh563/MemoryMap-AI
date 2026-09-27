"""Category management: list, create, rename, merge, split, move and delete.

Categories are created implicitly by the AI as it files notes, so over time
they drift: near-duplicates, typos, ones that stopped being useful. These
endpoints are how the user tidies that up.

None of them ever loses a note: renaming onto an existing category merges the
two, and deleting one moves its notes to Uncategorised or to a category named
for them.

**Everything the agent can do, a person can** (INBOX 431 (e), the owner: "the
user needs to be able to easily do anything the ai can do"). Create and merge
call the agent's own tool functions (`ai/tools/categories.py`), so the two
paths cannot come to disagree about what a merge is; moving chosen notes, a
split and a proposed split are what managing by hand needs besides. Every
answer that moves notes names them (`moved_ids`, or `previous` with each
note's old category), which is what the Manage categories panel's undo uses.
"""

from __future__ import annotations

from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.ai.tools._common import ToolError
from memorymap.ai.tools.categories import _create_category, _merge_categories
from memorymap.core.database import Category, Entry
from memorymap.core.deps import get_session
from memorymap.entry import manager

router = APIRouter(prefix="/categories", tags=["categories"])


class RenameBody(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class CreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=100, pattern=r"\S")
    description: str = Field(default="", max_length=500)


class MergeBody(BaseModel):
    into: int


class MoveBody(BaseModel):
    entry_ids: list[int] = Field(min_length=1, max_length=5000)
    category: str = Field(min_length=1, max_length=100)


class SplitBody(BaseModel):
    name: str = Field(min_length=1, max_length=100, pattern=r"\S")
    entry_ids: list[int] = Field(min_length=1, max_length=5000)


def _existing_category(session: Session, category_id: int) -> Category:
    category = session.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=400, detail="That category no longer exists")
    return category


def _ids_in(session: Session, category_id: int) -> list[int]:
    return list(session.scalars(select(Entry.id).where(Entry.category_id == category_id)))


def _move(session: Session, entries: list, name: str) -> list[dict]:
    """Move notes into a category by name (made if new); each note's old one back."""
    previous = []
    for entry in entries:
        before = manager.category_name_for(session, entry)
        if before != name:
            manager.update_entry(session, entry, category_name=name)
            previous.append({"id": entry.id, "category": before})
    session.commit()
    return previous


#: Same reasoning as the tag list: this feeds the sidebar and every filing
#: picker, so it is not a list anyone pages through. The cap exists so one
#: response cannot grow without limit, and `X-Total-Count` says when it bit.
CATEGORIES_PAGE_SIZE = 1000


@router.get("")
def list_categories(
    response: Response,
    limit: int = Query(default=CATEGORIES_PAGE_SIZE, ge=1, le=5000),
    session: Session = Depends(get_session),
) -> list[dict]:
    """Every category with its live note count, biggest first."""
    rows = manager.all_categories(session)
    response.headers["X-Total-Count"] = str(len(rows))
    return rows[:limit]


@router.post("", status_code=201)
def create_category(body: CreateBody, session: Session = Depends(get_session)) -> dict:
    """Make a category (the agent's `create_category`); an existing name is kept."""
    try:
        result = _create_category(session, {"name": body.name, "description": body.description})
    except ToolError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"name": result["name"], "created": result["created"]}


@router.post("/move")
def move_notes(body: MoveBody, session: Session = Depends(get_session)) -> dict:
    """Move chosen notes into a category, made if it does not exist yet."""
    entries = list(session.scalars(select(Entry).where(Entry.id.in_(body.entry_ids), Entry.is_deleted == False)))  # noqa: E712
    previous = _move(session, entries, body.category.strip())
    return {"category": body.category.strip(), "moved": len(previous), "previous": previous}


@router.post("/{category_id}/merge")
def merge_category(category_id: int, body: MergeBody, session: Session = Depends(get_session)) -> dict:
    """Fold this category into another (the agent's `merge_categories`)."""
    source = _existing_category(session, category_id)
    target = _existing_category(session, body.into)
    moved_ids = _ids_in(session, source.id)
    try:
        result = _merge_categories(session, {"from": source.name, "into": target.name})
    except ToolError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"from": result["from"], "into": result["into"], "moved": result["notes_moved"], "moved_ids": moved_ids}


@router.post("/{category_id}/split")
def split_category(category_id: int, body: SplitBody, session: Session = Depends(get_session)) -> dict:
    """Move the chosen notes of this category into a new (or existing) one."""
    source = _existing_category(session, category_id)
    entries = list(
        session.scalars(select(Entry).where(Entry.id.in_(body.entry_ids), Entry.category_id == source.id))
    )
    previous = _move(session, entries, body.name.strip())
    return {"from": source.name, "name": body.name.strip(), "moved_ids": [p["id"] for p in previous]}


#: A proposed split never names a group smaller than this: two notes that
#: share a tag are a theme, one is a coincidence.
SPLIT_MIN_GROUP = 2


@router.post("/{category_id}/split/propose")
def propose_split(category_id: int, session: Session = Depends(get_session)) -> dict:
    """Suggest how this category could split, for the person to review.

    Grouped by the notes' own tags (which the filing AI wrote or the person
    did): each note goes to its most shared tag, a tag is a group when two or
    more notes share it and not every note has it. Nothing is moved; the panel
    shows the groups as a split the person can edit and apply.
    """
    source = _existing_category(session, category_id)
    entries = list(
        session.scalars(select(Entry).where(Entry.category_id == source.id, Entry.is_deleted == False))  # noqa: E712
    )
    tags_of = {e.id: [t.lower() for t in manager.entry_tags(e)] for e in entries}
    shared = Counter(t for tags in tags_of.values() for t in set(tags))
    useful = {t for t, n in shared.items() if SPLIT_MIN_GROUP <= n < len(entries)}
    groups: dict[str, list[int]] = {}
    for entry in entries:
        mine = [t for t in tags_of[entry.id] if t in useful]
        if mine:
            best = max(mine, key=lambda t: (shared[t], t))
            groups.setdefault(best, []).append(entry.id)
    kept = [{"name": name, "entry_ids": ids} for name, ids in groups.items() if len(ids) >= SPLIT_MIN_GROUP]
    kept.sort(key=lambda g: (-len(g["entry_ids"]), g["name"]))
    grouped = {i for g in kept for i in g["entry_ids"]}
    return {"from": source.name, "groups": kept, "rest": len(entries) - len(grouped), "basis": "tags"}


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
def delete_category(
    category_id: int,
    into: int | None = Query(default=None),
    session: Session = Depends(get_session),
) -> dict:
    """Remove a category; its notes move to `into`, or survive as Uncategorised."""
    category = _existing_category(session, category_id)
    name = category.name
    moved_ids = _ids_in(session, category.id)
    if into is not None:
        target = _existing_category(session, into)
        if target.id == category.id:
            raise HTTPException(status_code=400, detail="A category cannot be moved into itself")
        try:
            manager.rename_category(session, category.id, target.name)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {"deleted": True, "name": name, "into": target.name, "moved": len(moved_ids), "moved_ids": moved_ids}
    try:
        result = manager.delete_category(session, category_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {**result, "name": name, "into": None, "moved_ids": moved_ids}
