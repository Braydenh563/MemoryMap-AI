"""Whiteboard: note cards and freehand sketches placed on a canvas.

A "board" is itself a note (`board_id` points at an entry), so a board is
something you can search, tag and file like anything else in the notebook —
and `board_id = NULL` is the one unnamed scratch board every notebook starts
with.

Two rules run through all of it, both learned by their absence in the first
version:

- **A node has to point at a note that exists.** Nothing validated `entry_id`,
  so a card could be created for note 9999 and the board would then fail to
  render for good, with no way to remove the card from the UI.
- **A write has to be scoped to the board it claims.** `PUT`/`DELETE` took an
  id and nothing else, so any node on any board could be moved or deleted by
  guessing a number — and `PUT` silently ignored `board_id`, so "move this
  card to that board" quietly did nothing at all.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from memorymap.core.database import Entry, WhiteboardNode, WhiteboardSketch
from memorymap.core.deps import get_session
from memorymap.entry.manager import extract_title

router = APIRouter(prefix="/whiteboard", tags=["whiteboard"])

#: A sketch is a path list, not an image. Big enough for a page of scribble,
#: small enough that a runaway client can't fill the disk one PUT at a time.
MAX_SKETCH_CHARS = 400_000


class WhiteboardNodeBase(BaseModel):
    entry_id: int
    board_id: int | None = None
    x: float = 0.0
    y: float = 0.0
    z: int = 0


class WhiteboardNodeOut(WhiteboardNodeBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class WhiteboardSketchBase(BaseModel):
    data: str = Field(max_length=MAX_SKETCH_CHARS)
    board_id: int | None = None
    x: float = 0.0
    y: float = 0.0
    z: int = 0


class WhiteboardSketchOut(WhiteboardSketchBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class WhiteboardStateOut(BaseModel):
    nodes: list[WhiteboardNodeOut]
    sketches: list[WhiteboardSketchOut]


def _board_filter(model, board_id: int | None):
    """`board_id = N`, or `IS NULL` for the unnamed scratch board.

    `== None` renders as `= NULL` in SQL, which is never true for any row — so
    the default board came back empty however much was on it. SQLAlchemy's
    `is_()` is the difference between a working board and a blank one.
    """
    return model.board_id.is_(None) if board_id is None else model.board_id == board_id


def _require_entry(session: Session, entry_id: int) -> Entry:
    entry = session.get(Entry, entry_id)
    if entry is None or entry.is_deleted:
        raise HTTPException(status_code=404, detail=f"No note with id {entry_id}")
    return entry


def _require_board(session: Session, board_id: int | None) -> None:
    """A board is a note too, and `board_id` is a real foreign key
    (`PRAGMA foreign_keys=ON`) — writing one that doesn't exist doesn't fail
    quietly, it throws `IntegrityError` out of `db.commit()` as a raw 500. A
    board note purged (or hard-deleted) out from under a stale client-side
    `currentBoardId` is exactly how that happens: nothing here re-validates
    the id on write the way `_require_entry` already does for `entry_id`.
    Checked the same permissive way `_board_filter` reads it — `None` always
    means the default scratch board, never "board 0".
    """
    if board_id is None:
        return
    entry = session.get(Entry, board_id)
    if entry is None or entry.is_deleted:
        raise HTTPException(status_code=404, detail=f"No board with id {board_id}")


@router.get("/", response_model=WhiteboardStateOut)
def get_whiteboard_state(
    board_id: int | None = None, db: Session = Depends(get_session)
) -> WhiteboardStateOut:
    nodes = db.scalars(
        select(WhiteboardNode).where(_board_filter(WhiteboardNode, board_id))
    ).all()
    sketches = db.scalars(
        select(WhiteboardSketch).where(_board_filter(WhiteboardSketch, board_id))
    ).all()
    return WhiteboardStateOut(nodes=list(nodes), sketches=list(sketches))


class BoardOut(BaseModel):
    #: None is the one unnamed scratch board every notebook starts with.
    id: int | None
    title: str
    node_count: int
    sketch_count: int


class BoardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


@router.get("/boards", response_model=list[BoardOut])
def list_boards(db: Session = Depends(get_session)) -> list[BoardOut]:
    """Boards actually in use — not, as the client used to build this list
    itself, every note in the notebook.

    Reported directly: "the different board options confuse me." The cause
    wasn't a bug so much as a design choice nobody had reckoned with yet — a
    board being *just a note* (this file's own opening comment) is right for
    the data model, but the picker took that literally and listed every
    single note as a "board", the vast majority of which had never been used
    as one. A notebook with 50 notes had a 50-item "Switch board" dropdown
    with no way to tell which one, if any, was actually a board someone had
    drawn on. This lists only notes with at least one card or sketch on them,
    plus the always-present default board.
    """
    node_counts = dict(
        db.execute(
            select(WhiteboardNode.board_id, func.count())
            .where(WhiteboardNode.board_id.is_not(None))
            .group_by(WhiteboardNode.board_id)
        ).all()
    )
    sketch_counts = dict(
        db.execute(
            select(WhiteboardSketch.board_id, func.count())
            .where(WhiteboardSketch.board_id.is_not(None))
            .group_by(WhiteboardSketch.board_id)
        ).all()
    )
    default_nodes = db.scalar(
        select(func.count()).select_from(WhiteboardNode).where(WhiteboardNode.board_id.is_(None))
    )
    default_sketches = db.scalar(
        select(func.count()).select_from(WhiteboardSketch).where(WhiteboardSketch.board_id.is_(None))
    )
    boards = [
        BoardOut(id=None, title="Default board", node_count=default_nodes, sketch_count=default_sketches)
    ]
    board_ids = set(node_counts) | set(sketch_counts)
    if board_ids:
        entries = db.scalars(
            select(Entry).where(Entry.id.in_(board_ids), Entry.is_deleted.is_(False))
        ).all()
        for entry in entries:
            title = extract_title(entry.content) or entry.content.strip()[:40] or f"Note {entry.id}"
            boards.append(
                BoardOut(
                    id=entry.id,
                    title=title,
                    node_count=node_counts.get(entry.id, 0),
                    sketch_count=sketch_counts.get(entry.id, 0),
                )
            )
    return boards


@router.post("/boards", response_model=BoardOut, status_code=201)
def create_board(body: BoardCreate, db: Session = Depends(get_session)) -> BoardOut:
    """A fresh, empty board — a plain note whose whole job is to be one.

    Named directly (`# {name}` as its first line, the same heading convention
    every note's own title already reads), rather than the previous only way
    in: create an ordinary note somewhere else first, then find it again in a
    dropdown that listed the entire notebook.
    """
    name = body.name.strip()
    entry = Entry(content=f"# {name}")
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return BoardOut(id=entry.id, title=name, node_count=0, sketch_count=0)


@router.post("/nodes", response_model=WhiteboardNodeOut)
def create_node(
    node_in: WhiteboardNodeBase, db: Session = Depends(get_session)
) -> WhiteboardNode:
    _require_entry(db, node_in.entry_id)
    _require_board(db, node_in.board_id)
    # One card per note per board. Dropping the same note on a board twice is
    # a move, not a duplicate — the alternative is two cards stacked exactly
    # on top of each other, which reads as one card that won't drag properly.
    existing = db.scalar(
        select(WhiteboardNode).where(
            WhiteboardNode.entry_id == node_in.entry_id,
            _board_filter(WhiteboardNode, node_in.board_id),
        )
    )
    node = existing or WhiteboardNode(
        entry_id=node_in.entry_id, board_id=node_in.board_id
    )
    node.x, node.y, node.z = node_in.x, node_in.y, node_in.z
    if existing is None:
        db.add(node)
    db.commit()
    db.refresh(node)
    return node


@router.put("/nodes/{node_id}", response_model=WhiteboardNodeOut)
def update_node(
    node_id: int, node_in: WhiteboardNodeBase, db: Session = Depends(get_session)
) -> WhiteboardNode:
    node = db.get(WhiteboardNode, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    _require_entry(db, node_in.entry_id)
    _require_board(db, node_in.board_id)
    node.entry_id = node_in.entry_id
    # `board_id` was read from the body and then never assigned, so moving a
    # card between boards returned 200 and changed nothing.
    node.board_id = node_in.board_id
    node.x, node.y, node.z = node_in.x, node_in.y, node_in.z
    db.commit()
    db.refresh(node)
    return node


@router.delete("/nodes/{node_id}")
def delete_node(node_id: int, db: Session = Depends(get_session)) -> dict:
    node = db.get(WhiteboardNode, node_id)
    if node is None:
        # 404 rather than a cheerful "ok": deleting something that isn't there
        # is how a client finds out its board is stale, and swallowing it left
        # ghost cards on screen until a reload.
        raise HTTPException(status_code=404, detail="Node not found")
    db.delete(node)
    db.commit()
    return {"status": "ok"}


@router.post("/sketches", response_model=WhiteboardSketchOut)
def create_sketch(
    sketch_in: WhiteboardSketchBase, db: Session = Depends(get_session)
) -> WhiteboardSketch:
    _require_board(db, sketch_in.board_id)
    sketch = WhiteboardSketch(**sketch_in.model_dump())
    db.add(sketch)
    db.commit()
    db.refresh(sketch)
    return sketch


@router.put("/sketches/{sketch_id}", response_model=WhiteboardSketchOut)
def update_sketch(
    sketch_id: int, sketch_in: WhiteboardSketchBase, db: Session = Depends(get_session)
) -> WhiteboardSketch:
    sketch = db.get(WhiteboardSketch, sketch_id)
    if sketch is None:
        raise HTTPException(status_code=404, detail="Sketch not found")
    _require_board(db, sketch_in.board_id)
    sketch.data = sketch_in.data
    sketch.board_id = sketch_in.board_id
    sketch.x, sketch.y, sketch.z = sketch_in.x, sketch_in.y, sketch_in.z
    db.commit()
    db.refresh(sketch)
    return sketch


@router.delete("/sketches/{sketch_id}")
def delete_sketch(sketch_id: int, db: Session = Depends(get_session)) -> dict:
    sketch = db.get(WhiteboardSketch, sketch_id)
    if sketch is None:
        raise HTTPException(status_code=404, detail="Sketch not found")
    db.delete(sketch)
    db.commit()
    return {"status": "ok"}
