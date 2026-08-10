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

import json
import logging
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from memorymap.core import deps
from memorymap.core.database import Entry, WhiteboardNode, WhiteboardObject, WhiteboardSketch
from memorymap.core.deps import get_session
from memorymap.entry.manager import apply_title, extract_title, update_entry

router = APIRouter(prefix="/whiteboard", tags=["whiteboard"])

#: An image object's `data.url`, as an allowlist rather than a prefix check.
#:
#: **A `startswith("/media/")` test is not enough, and the difference is a
#: file-deletion vulnerability.** `delete_object` removes the backing file
#: when an image object goes, and `/media/../../../etc/passwd` passes a
#: prefix check while resolving well outside the media folder — so the
#: delete would unlink an arbitrary path. Matching the exact shape
#: `upload_media` actually produces (a uuid4 hex plus a short suffix) closes
#: it at the door, and `_media_path` below refuses to resolve outside the
#: folder as well, because one check standing between a stored string and
#: `unlink()` is one check too few.
MEDIA_URL_RE = re.compile(r"^/media/[A-Za-z0-9][A-Za-z0-9._-]{0,119}$")

#: A sketch is a path list, not an image. Big enough for a page of scribble,
#: small enough that a runaway client can't fill the disk one PUT at a time.
MAX_SKETCH_CHARS = 400_000

#: A text box's own content. Generous — this is a whiteboard note, not a tweet
#: — but still bounded for the same reason every other free-text field here is.
MAX_OBJECT_TEXT_CHARS = 20_000

VALID_OBJECT_KINDS = {"image", "text"}


#: A card/sketch/object's own persisted group — asked for directly (Ctrl+G).
#: Opaque and client-generated (a `crypto.randomUUID()`), not a foreign key:
#: one group spans three different tables, so there's no single row for it
#: to reference. 40 chars is a UUID with room to spare.
GROUP_ID_MAX_LEN = 40


class WhiteboardNodeBase(BaseModel):
    entry_id: int
    board_id: int | None = None
    x: float = 0.0
    y: float = 0.0
    z: int = 0
    #: Asked for directly ("resizing... cards"). `None` means auto-sized —
    #: the same ~250×150 CSS default every card used before this existed.
    width: float | None = Field(default=None, ge=20, le=4000)
    height: float | None = Field(default=None, ge=20, le=4000)
    #: Degrees, clockwise, about the card's own centre. Asked for directly
    #: ("rotations"); `None` renders identically to 0.
    rotation: float | None = Field(default=None, ge=-360, le=360)
    group_id: str | None = Field(default=None, max_length=GROUP_ID_MAX_LEN)


class WhiteboardNodeOut(WhiteboardNodeBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class WhiteboardSketchBase(BaseModel):
    data: str = Field(max_length=MAX_SKETCH_CHARS)
    board_id: int | None = None
    x: float = 0.0
    y: float = 0.0
    z: int = 0
    group_id: str | None = Field(default=None, max_length=GROUP_ID_MAX_LEN)


class WhiteboardSketchOut(WhiteboardSketchBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class WhiteboardObjectData(BaseModel):
    """What `data` actually holds, validated by `kind` rather than left as an
    opaque string the way a sketch's own path data is — an image needs a real
    same-origin URL (never an arbitrary one a client could point anywhere),
    and a text box's content has its own length bound."""

    url: str | None = Field(default=None, max_length=300)
    content: str | None = Field(default=None, max_length=MAX_OBJECT_TEXT_CHARS)
    color: str | None = Field(default=None, max_length=20)
    font_size: int | None = Field(default=None, ge=8, le=200)
    #: A text box's own fill/border — asked for directly (the properties
    #: panel). Images have no use for either; left `None` there.
    bg: str | None = Field(default=None, max_length=20)
    border_color: str | None = Field(default=None, max_length=20)


class WhiteboardObjectBase(BaseModel):
    kind: str
    data: WhiteboardObjectData
    board_id: int | None = None
    x: float = 0.0
    y: float = 0.0
    z: int = 0
    width: float = Field(default=200.0, ge=20, le=4000)
    height: float = Field(default=120.0, ge=20, le=4000)
    rotation: float | None = Field(default=None, ge=-360, le=360)
    group_id: str | None = Field(default=None, max_length=GROUP_ID_MAX_LEN)

    @field_validator("kind")
    @classmethod
    def _known_kind(cls, value: str) -> str:
        if value not in VALID_OBJECT_KINDS:
            raise ValueError(f"Unknown object kind {value!r} — expected image or text")
        return value


class WhiteboardObjectOut(BaseModel):
    id: int
    kind: str
    data: WhiteboardObjectData
    board_id: int | None
    x: float
    y: float
    z: int
    width: float
    height: float
    rotation: float | None
    group_id: str | None


def _object_to_out(obj: WhiteboardObject) -> WhiteboardObjectOut:
    return WhiteboardObjectOut(
        id=obj.id,
        kind=obj.kind,
        data=WhiteboardObjectData(**json.loads(obj.data)),
        board_id=obj.board_id,
        x=obj.x,
        y=obj.y,
        z=obj.z,
        width=obj.width,
        height=obj.height,
        rotation=obj.rotation,
        group_id=obj.group_id,
    )


def _require_object_data(body: WhiteboardObjectBase) -> None:
    if body.kind == "image":
        if not body.data.url or not MEDIA_URL_RE.match(body.data.url):
            raise HTTPException(
                status_code=422, detail="An image object needs a /media/... url"
            )
    elif body.kind == "text" and body.data.content is None:
        raise HTTPException(status_code=422, detail="A text object needs content")


def _media_path(url: str):
    """The file behind a `/media/...` url, or None if it isn't safely inside
    the media folder.

    Second of the two checks (`MEDIA_URL_RE` is the first, on the way in).
    This one is what makes the delete safe even for a row written before
    that pattern existed, or by some future writer that forgets it: resolve
    the path and confirm the media folder is genuinely a parent, rather than
    trusting the string it came from.
    """
    if not MEDIA_URL_RE.match(url):
        return None
    media_dir = (deps.get_config().data_dir / "media").resolve()
    candidate = (media_dir / url.removeprefix("/media/")).resolve()
    return candidate if candidate.is_relative_to(media_dir) else None


class WhiteboardStateOut(BaseModel):
    nodes: list[WhiteboardNodeOut]
    sketches: list[WhiteboardSketchOut]
    objects: list[WhiteboardObjectOut] = []


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
    objects = db.scalars(
        select(WhiteboardObject).where(_board_filter(WhiteboardObject, board_id))
    ).all()
    return WhiteboardStateOut(
        nodes=list(nodes),
        sketches=list(sketches),
        objects=[_object_to_out(o) for o in objects],
    )


class BoardOut(BaseModel):
    #: None is the one unnamed scratch board every notebook starts with.
    id: int | None
    title: str
    node_count: int
    sketch_count: int
    object_count: int = 0


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
    object_counts = dict(
        db.execute(
            select(WhiteboardObject.board_id, func.count())
            .where(WhiteboardObject.board_id.is_not(None))
            .group_by(WhiteboardObject.board_id)
        ).all()
    )
    default_nodes = db.scalar(
        select(func.count()).select_from(WhiteboardNode).where(WhiteboardNode.board_id.is_(None))
    )
    default_sketches = db.scalar(
        select(func.count()).select_from(WhiteboardSketch).where(WhiteboardSketch.board_id.is_(None))
    )
    default_objects = db.scalar(
        select(func.count()).select_from(WhiteboardObject).where(WhiteboardObject.board_id.is_(None))
    )
    boards = [
        BoardOut(
            id=None,
            title="Default board",
            node_count=default_nodes,
            sketch_count=default_sketches,
            object_count=default_objects,
        )
    ]
    board_ids = set(node_counts) | set(sketch_counts) | set(object_counts)
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
                    object_count=object_counts.get(entry.id, 0),
                )
            )
    return boards


class BoardImageOut(BaseModel):
    id: int
    board_id: int | None
    board_title: str
    url: str


@router.get("/images", response_model=list[BoardImageOut])
def list_images(db: Session = Depends(get_session)) -> list[BoardImageOut]:
    """Every image object across every board — asked for directly ("what
    about uploaded images" in the Library). Whiteboard images already have
    a real row (`WhiteboardObject`, unlike an image pasted into a note's own
    markdown, which has none — see ROADMAP item 20a for that still-open
    gap), so this is a flat query, not new plumbing.
    """
    objects = db.scalars(select(WhiteboardObject).where(WhiteboardObject.kind == "image")).all()
    if not objects:
        return []
    board_ids = {o.board_id for o in objects if o.board_id is not None}
    titles: dict[int | None, str] = {None: "Default board"}
    if board_ids:
        for entry in db.scalars(select(Entry).where(Entry.id.in_(board_ids), Entry.is_deleted.is_(False))):
            titles[entry.id] = extract_title(entry.content) or entry.content.strip()[:40] or f"Note {entry.id}"
    out = []
    for obj in objects:
        try:
            url = json.loads(obj.data).get("url")
        except (TypeError, ValueError):
            url = None
        if not url:
            continue
        out.append(
            BoardImageOut(
                id=obj.id,
                board_id=obj.board_id,
                board_title=titles.get(obj.board_id, f"Note {obj.board_id}"),
                url=url,
            )
        )
    return out


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


class BoardRename(BaseModel):
    title: str = Field(min_length=1, max_length=100)


@router.put("/boards/{board_id}", response_model=BoardOut)
def rename_board(board_id: int, body: BoardRename, db: Session = Depends(get_session)) -> BoardOut:
    """A board's title is its underlying note's own first `#` heading line
    (`list_boards`'s own `extract_title` read, above) — so renaming a board
    is the same `apply_title` edit any other note's title goes through, not
    a second stored field. The default scratch board (`board_id=None`) has
    no underlying note to rename; `board_id=0` and negative ids can't
    resolve to a real note either, so both 404 the same way a stale or
    guessed id does.
    """
    entry = db.get(Entry, board_id) if board_id > 0 else None
    if entry is None or entry.is_deleted:
        raise HTTPException(status_code=404, detail=f"No board with id {board_id}")
    title = body.title.strip()
    update_entry(db, entry, content=apply_title(entry.content, title))
    node_count = db.scalar(
        select(func.count()).select_from(WhiteboardNode).where(WhiteboardNode.board_id == board_id)
    )
    sketch_count = db.scalar(
        select(func.count()).select_from(WhiteboardSketch).where(WhiteboardSketch.board_id == board_id)
    )
    object_count = db.scalar(
        select(func.count()).select_from(WhiteboardObject).where(WhiteboardObject.board_id == board_id)
    )
    return BoardOut(
        id=board_id, title=title, node_count=node_count, sketch_count=sketch_count, object_count=object_count
    )


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
    node.width, node.height, node.group_id = node_in.width, node_in.height, node_in.group_id
    node.rotation = node_in.rotation
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
    node.width, node.height, node.group_id = node_in.width, node_in.height, node_in.group_id
    node.rotation = node_in.rotation
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
    sketch.group_id = sketch_in.group_id
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


# --- objects: images and text boxes, neither tied to a note -----------------
#
# Asked for directly: "images can also be attached by copy and pasting into
# the whiteboard as well though they wouldn't be shown in a note and would
# only be accessible from the library and the whiteboard" — and separately,
# "I want the whiteboard to basically be like OneNote and Microsoft
# Whiteboard", which needs a real text box. A card always wraps an existing
# note; a sketch is a path, not a placeable rectangle. Neither fits an image
# or a text box, hence a third kind of thing on the canvas.


@router.post("/objects", response_model=WhiteboardObjectOut, status_code=201)
def create_object(
    body: WhiteboardObjectBase, db: Session = Depends(get_session)
) -> WhiteboardObjectOut:
    _require_board(db, body.board_id)
    _require_object_data(body)
    obj = WhiteboardObject(
        kind=body.kind,
        data=body.data.model_dump_json(exclude_none=True),
        board_id=body.board_id,
        x=body.x,
        y=body.y,
        z=body.z,
        width=body.width,
        height=body.height,
        rotation=body.rotation,
        group_id=body.group_id,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _object_to_out(obj)


@router.put("/objects/{object_id}", response_model=WhiteboardObjectOut)
def update_object(
    object_id: int, body: WhiteboardObjectBase, db: Session = Depends(get_session)
) -> WhiteboardObjectOut:
    obj = db.get(WhiteboardObject, object_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Object not found")
    _require_board(db, body.board_id)
    _require_object_data(body)
    # The kind an object was created as doesn't change — an image resized or
    # moved is still an image; nothing in the UI offers "turn this into a
    # text box", so treating a mismatched kind here as a client bug rather
    # than silently reinterpreting the row is the safer failure.
    if body.kind != obj.kind:
        raise HTTPException(status_code=422, detail="An object's kind can't change")
    obj.data = body.data.model_dump_json(exclude_none=True)
    obj.board_id = body.board_id
    obj.x, obj.y, obj.z = body.x, body.y, body.z
    obj.width, obj.height = body.width, body.height
    obj.rotation = body.rotation
    obj.group_id = body.group_id
    db.commit()
    db.refresh(obj)
    return _object_to_out(obj)


@router.delete("/objects/{object_id}")
def delete_object(object_id: int, db: Session = Depends(get_session)) -> dict:
    obj = db.get(WhiteboardObject, object_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Object not found")
    if obj.kind == "image":
        # The only thing that ever pointed at this file — best-effort, the
        # same rule `_hard_delete` already follows for an attachment's own
        # file: the row goes either way, a stubborn file must not block it.
        # `_media_path` returns None for anything that isn't provably inside
        # the media folder, so a hand-edited or legacy row cannot turn this
        # into "delete any file on disk".
        try:
            path = _media_path(json.loads(obj.data).get("url", "") or "")
            if path is not None:
                path.unlink(missing_ok=True)
        except (OSError, ValueError) as exc:
            # `int(object_id)` rather than the path parameter as it arrived.
            # FastAPI already rejects a non-integer with a 422 before this
            # function runs, so it cannot carry the newline a forged log line
            # would need — but a path parameter reaching a log record is a
            # flow CodeQL flags on principle (py/log-injection), and the
            # explicit conversion keeps that guarantee true even if the
            # signature is ever loosened to a str.
            logging.getLogger("memorymap.whiteboard").warning(
                "couldn't delete the file for whiteboard image %s (%s); "
                "removing the record anyway",
                int(object_id),
                type(exc).__name__,
            )
    db.delete(obj)
    db.commit()
    return {"status": "ok"}
