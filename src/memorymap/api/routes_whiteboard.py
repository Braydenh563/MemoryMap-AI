"""Whiteboard: note cards and freehand sketches placed on a canvas.

A "board" is itself a note (`board_id` points at an entry), so a board is
something you can search, tag and file like anything else in the notebook, 
and `board_id = NULL` is the one unnamed scratch board every notebook starts
with.

Two rules run through all of it, both learned by their absence in the first
version:

- **A node has to point at a note that exists.** Nothing validated `entry_id`,
  so a card could be created for note 9999 and the board would then fail to
  render for good, with no way to remove the card from the UI.
- **A write has to be scoped to the board it claims.** `PUT`/`DELETE` took an
  id and nothing else, so any node on any board could be moved or deleted by
  guessing a number: and `PUT` silently ignored `board_id`, so "move this
  card to that board" quietly did nothing at all.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from memorymap.api import paging
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from memorymap.core import deps, events
from memorymap.core.database import Entry, WhiteboardNode, WhiteboardObject, WhiteboardSketch
from memorymap.core.deps import get_session
from memorymap.entry.manager import apply_title, extract_title, update_entry
from memorymap.whiteboard.service import (
    duplicate_board_copy,
    _apply_board_look, _apply_comments, _board_background, _board_entry, _board_filter,
    _board_layers, _board_numbered, _board_palette, _board_settings, _board_theme, _build_tree,
    _clean_theme, _cross_links, _delete_one_object, _DELETED, _drop_orphan_links,
    _export_freemind, _export_markdown, _export_opml, _export_text, _export_xmind, _first_cycle,
    _flatten_parsed, _forget_links_to, _is_descendant, _is_link_sketch, _is_one_emoji,
    _map_branch_colors, _map_kind_ok, _map_objects, _next_position, _node_state, _note_titles,
    _object_data, _object_state, _object_to_out, _on_current_layer, _outline_covering,
    _outline_from_filing, _outline_from_paste, _outline_rows, _parent_map, _parse_freemind,
    _parse_markdown_outline, _parse_opml, _parse_xmind, _place_map_nodes, _preview_fields,
    _preview_items, _preview_points, _proposal_notes, _record_map_creation, _require_board,
    _require_entry, _require_object_data, _require_reference, _restore_import_links,
    _sketch_preview, _sketch_state, _store_board_background, _store_board_numbered,
    _store_board_settings, _store_board_theme, _strip_outline_numbers, _subtree, _themed_style,
    _without_pins, BOARD_BG_COLOR_RE, BOARD_LAYOUTS, BOARD_TYPES, BoardBackground, BoardCreate,
    BoardImageOut, BoardOut, BoardRename, BOARDS_PAGE_SIZE, BOARDS_PAGE_SIZE_MAX,
    DEFAULT_BOARD_TYPE, DEFAULT_MAP_LAYOUT, EXPORT_FORMATS, MAP_APP_DEFAULT_PINS,
    MAP_BRANCH_PALETTE, MAP_BRANCH_PALETTES, MAP_CLEARABLE_FIELDS, MAP_COL, MAP_REFERENCE_KINDS,
    MAP_ROW, MAP_THEME_FIELDS, MAP_TOPIC_KIND, MapClearStyleOut, MapGenerate, MapImport,
    MapNodeCreate, MapNodeMove, MapNodesMove, MapOutlinePaste, MapProposal, MapTreeOut,
    MAX_SKETCH_CHARS, MEDIA_URL_RE, PREVIEW_ASPECT_RANGE, PREVIEW_CACHE_STATS, PREVIEW_POINTS,
    WhiteboardNodeBase, WhiteboardNodeOut, WhiteboardObjectBase, WhiteboardObjectData,
    WhiteboardObjectOut, WhiteboardSketchBase, WhiteboardSketchOut, WhiteboardStateOut,
)

#: Names other modules and the tests still import from here; they live in
#: `memorymap.whiteboard.service` now (Brief 61).
__all__ = [
    "router", "BOARD_BG_COLOR_RE", "BOARD_LAYOUTS", "BoardBackground", "MAP_APP_DEFAULT_PINS",
    "MAP_BRANCH_PALETTE", "MAP_BRANCH_PALETTES", "MAP_COL", "MAP_ROW", "MAP_THEME_FIELDS",
    "MAP_TOPIC_KIND", "MAX_SKETCH_CHARS", "MEDIA_URL_RE", "PREVIEW_ASPECT_RANGE",
    "PREVIEW_CACHE_STATS", "PREVIEW_POINTS", "_clean_theme", "_is_one_emoji",
    "_map_branch_colors", "_preview_items", "_preview_points", "_sketch_preview",
    "_store_board_background",
]


router = APIRouter(prefix="/whiteboard", tags=["whiteboard"])


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
    dropped = _drop_orphan_links(db, sketches, nodes, objects)
    if dropped:
        db.commit()
        sketches = [row for row in sketches if row.id not in dropped]
    return WhiteboardStateOut(
        nodes=list(nodes),
        sketches=list(sketches),
        objects=[_object_to_out(o) for o in objects],
        background=_board_background(db.get(Entry, board_id)) if board_id else {},
        layers=_board_layers(db.get(Entry, board_id)) if board_id else [],
    )


@router.get("/boards", response_model=list[BoardOut])
def list_boards(
    response: Response,
    type: str | None = None,
    limit: int = Query(default=BOARDS_PAGE_SIZE, ge=1, le=BOARDS_PAGE_SIZE_MAX),
    offset: int = Query(default=0, ge=0),
    cursor: str | None = paging.cursor_param(),
    db: Session = Depends(get_session),
) -> list[BoardOut]:
    """Boards actually in use, not, as the client used to build this list
    itself, every note in the notebook.

    Reported directly: "the different board options confuse me." The cause
    wasn't a bug so much as a design choice nobody had reckoned with yet, a
    board being *just a note* (this file's own opening comment) is right for
    the data model, but the picker took that literally and listed every
    single note as a "board", the vast majority of which had never been used
    as one. A notebook with 50 notes had a 50-item "Switch board" dropdown
    with no way to tell which one, if any, was actually a board someone had
    drawn on. This lists only notes with at least one card or sketch on them,
    plus the always-present default board.

    `?type=map` (or `board`) narrows it to one kind, the Library's Maps
    chip. Filtered in Python rather than in SQL because a board's type lives
    inside a JSON settings blob (`Entry.board_settings`), and because this
    function already materialises every board to build its preview: the list
    is tens of rows long, not thousands. An unknown value returns nothing
    rather than everything: a filter that silently ignores itself reads as
    "you have no maps" only after the user has read every row.

    **Paged.** `limit`, `offset` and an `X-Total-Count` counted over the same
    type filter as the page, so a caller that wants every board asks for the
    next page until it has them all (`apiPagedList` in the frontend). The
    default board is row one of page one and is counted like any other. The
    order is the default board, then entry id ascending, which is the order
    this list already came back in; the tiebreaker matters more here than
    elsewhere, because two boards created in the same second would otherwise
    be free to swap places between two pages and hide one of themselves.

    The page boundary is also where the cost is: `_preview_fields` is a query
    per board, and it now runs for the rows in the page rather than for every
    board in the notebook.
    """
    offset = paging.start(cursor, offset)
    if type is not None and type not in BOARD_TYPES:
        raise HTTPException(
            status_code=422,
            detail="Pick one of these board types: " + ", ".join(sorted(BOARD_TYPES)) + ".",
        )
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
    link_counts = dict(
        db.execute(
            select(WhiteboardSketch.board_id, func.count())
            .where(WhiteboardSketch.board_id.is_not(None), _is_link_sketch())
            .group_by(WhiteboardSketch.board_id)
        ).all()
    )
    #: The last write to anything on each board, keyed like the counts
    #: above (None is the default board). One grouped query per table rather
    #: than one per board, for the same reason the counts are.
    touched: dict[int | None, datetime] = {}
    for table in (WhiteboardNode, WhiteboardSketch, WhiteboardObject):
        for board_id, last in db.execute(
            select(table.board_id, func.max(table.updated_at)).group_by(table.board_id)
        ).all():
            if last is not None and (board_id not in touched or last > touched[board_id]):
                touched[board_id] = last
    default_nodes = db.scalar(
        select(func.count()).select_from(WhiteboardNode).where(WhiteboardNode.board_id.is_(None))
    )
    default_sketches = db.scalar(
        select(func.count()).select_from(WhiteboardSketch).where(WhiteboardSketch.board_id.is_(None))
    )
    default_objects = db.scalar(
        select(func.count()).select_from(WhiteboardObject).where(WhiteboardObject.board_id.is_(None))
    )
    # The default scratch board has no note behind it, so it has nowhere to
    # store settings and is always an ordinary board, which is why it is
    # excluded by `?type=map` rather than being special-cased into it.
    # The page is decided before any preview is built: `None` stands for the
    # default board, and every other row is an `Entry` that passed the type
    # filter. Building `BoardOut`s first and slicing afterwards would pay for
    # a preview query per board in the notebook to answer a request for
    # twenty of them.
    page_rows: list[Entry | None] = [None] if type in (None, DEFAULT_BOARD_TYPE) else []
    # `is_board` entries are included even at zero counts, see its own
    # comment on the model and on `_require_board` above: a board that is
    # currently empty (just created, or cleared back to empty) is still a
    # board, and used to vanish from this list the moment its count hit
    # zero, which read as the board having deleted itself.
    board_ids = set(node_counts) | set(sketch_counts) | set(object_counts)
    board_ids |= set(
        db.scalars(
            select(Entry.id).where(Entry.is_board.is_(True), Entry.is_deleted.is_(False))
        ).all()
    )
    settings: dict[int, tuple[str, str]] = {}
    if board_ids:
        entries = db.scalars(
            select(Entry)
            .where(Entry.id.in_(board_ids), Entry.is_deleted.is_(False))
            .order_by(Entry.id)
        ).all()
        for entry in entries:
            board_type, layout = _board_settings(entry)
            # The type lives inside a JSON settings blob, so this filter is
            # Python either way (the docstring above says why); doing it here
            # rather than inside the page loop is what makes `total` the size
            # of the selection rather than of the table.
            if type is not None and board_type != type:
                continue
            settings[entry.id] = (board_type, layout)
            page_rows.append(entry)
    response.headers["X-Total-Count"] = str(len(page_rows))
    paging.finish(response, offset, limit, len(page_rows))
    boards = []
    for entry in page_rows[offset:offset + limit]:
        if entry is None:
            # The default scratch board has no note behind it, so it has
            # nowhere to store settings and is always an ordinary board, which
            # is why it is excluded by `?type=map` rather than special-cased
            # into it.
            boards.append(
                BoardOut(
                    id=None,
                    title="Default board",
                    node_count=default_nodes,
                    sketch_count=default_sketches,
                    link_count=db.scalar(
                        select(func.count()).select_from(WhiteboardSketch)
                        .where(WhiteboardSketch.board_id.is_(None), _is_link_sketch())
                    ) or 0,
                    object_count=default_objects,
                    updated_at=touched.get(None),
                    **_preview_fields(db, None),
                )
            )
            continue
        board_type, layout = settings[entry.id]
        title = extract_title(entry.content) or entry.content.strip()[:40] or f"Note {entry.id}"
        boards.append(
            BoardOut(
                id=entry.id,
                title=title,
                node_count=node_counts.get(entry.id, 0),
                sketch_count=sketch_counts.get(entry.id, 0),
                link_count=link_counts.get(entry.id, 0),
                object_count=object_counts.get(entry.id, 0),
                updated_at=max(
                    (t for t in (entry.updated_at, touched.get(entry.id)) if t is not None),
                    default=None,
                ),
                type=board_type,
                layout=layout,
                background=_board_background(entry),
                layers=_board_layers(entry),
                **_preview_fields(db, entry.id),
            )
        )
    return boards


@router.get("/images", response_model=list[BoardImageOut])
def list_images(
    response: Response,
    limit: int = Query(default=BOARDS_PAGE_SIZE, ge=1, le=BOARDS_PAGE_SIZE_MAX),
    offset: int = Query(default=0, ge=0),
    cursor: str | None = paging.cursor_param(),
    db: Session = Depends(get_session),
) -> list[BoardImageOut]:
    """A page of the image objects across every board, asked for directly
    ("what about uploaded images" in the Library). Whiteboard images already
    have a real row (`WhiteboardObject`, unlike an image pasted into a note's
    own markdown, which has none, see ROADMAP item 20a for that still-open
    gap), so this is a flat query, not new plumbing.

    **Superseded in the Library by `/media`**, which lists every uploaded
    file rather than only the ones that happen to be on a board, so nothing
    in `frontend/js/*.js` names this any more (INBOX 261, found by
    `scratchpad/probe_dead_routes.py`). Kept as the board-scoped view, which
    `/media` does not offer; this paragraph is here so the next scan does not
    re-open the question.

    **Paged**, with `X-Total-Count` over the same selection as the page and
    the row id as the order, which is also the tiebreaker two rows created in
    the same second need to stop them swapping places between pages.

    The one thing worth knowing about the shape below: the "does this row
    actually carry a url" test cannot be a SQL filter, because the url is a
    key inside a JSON blob. So the ids and blobs are read first and filtered
    in Python, and the page is taken from *that* list. Counting every image
    row instead and skipping the empty ones per page would make
    `X-Total-Count` bigger than the number of rows a caller can ever collect,
    and `apiPagedList` walks until it has that many: it would never stop.
    """
    offset = paging.start(cursor, offset)
    rows = db.execute(
        select(WhiteboardObject.id, WhiteboardObject.board_id, WhiteboardObject.data)
        .where(WhiteboardObject.kind == "image")
        .order_by(WhiteboardObject.id)
    ).all()
    usable = []
    for obj_id, board_id, data in rows:
        try:
            url = json.loads(data).get("url")
        except (TypeError, ValueError):
            url = None
        if url:
            usable.append((obj_id, board_id, url))
    response.headers["X-Total-Count"] = str(len(usable))
    paging.finish(response, offset, limit, len(usable))
    page = usable[offset:offset + limit]
    if not page:
        return []
    board_ids = {board_id for _, board_id, _ in page if board_id is not None}
    titles: dict[int | None, str] = {None: "Default board"}
    if board_ids:
        for entry in db.scalars(select(Entry).where(Entry.id.in_(board_ids), Entry.is_deleted.is_(False))):
            titles[entry.id] = extract_title(entry.content) or entry.content.strip()[:40] or f"Note {entry.id}"
    return [
        BoardImageOut(
            id=obj_id,
            board_id=board_id,
            board_title=titles.get(board_id, f"Note {board_id}"),
            url=url,
        )
        for obj_id, board_id, url in page
    ]


@router.post("/boards", response_model=BoardOut, status_code=201)
@events.writes("board", "created")
def create_board(body: BoardCreate, db: Session = Depends(get_session)) -> BoardOut:
    """A fresh, empty board, a plain note whose whole job is to be one.

    Named directly (`# {name}` as its first line, the same heading convention
    every note's own title already reads), rather than the previous only way
    in: create an ordinary note somewhere else first, then find it again in a
    dropdown that listed the entire notebook.
    """
    name = body.name.strip()
    entry = Entry(content=f"# {name}", is_board=True)
    # Written before the first commit rather than in a second UPDATE after
    # it: a map created as a board and turned into one a moment later is a
    # window in which the Library, the board list and any other reader see it
    # as an ordinary whiteboard.
    board_type, layout = _store_board_settings(entry, body.type, body.layout)
    db.add(entry)
    db.flush()  # so the event can name the board's id
    # This route builds the note itself rather than going through
    # `manager.create_entry`, so without this line a board was the one thing
    # in the app that could appear with nothing anywhere saying it had.
    events.record(
        db,
        "created",
        "board",
        entry.id,
        name[:80],
        payload={"after": {"title": name, "type": board_type, "layout": layout}},
    )
    db.commit()
    db.refresh(entry)
    return BoardOut(
        id=entry.id,
        title=name,
        node_count=0,
        sketch_count=0,
        type=board_type,
        layout=layout,
    )


@router.post("/boards/{board_id}/duplicate", response_model=BoardOut, status_code=201)
@events.writes("board", "created")
def duplicate_board(board_id: int, db: Session = Depends(get_session)) -> BoardOut:
    """Copy a board: every card, sketch and object, at the same positions.

    ROADMAP.md item 8 ("managing concept maps"): creating a map works and so
    do listing and renaming, but duplicating did not exist on either side.
    It is the one that makes a map reusable, a map you have laid out is a
    template for the next one, and without this the only way to reuse a shape
    is to rebuild it card by card.

    **A card is a real note**, which is the app's own premise (see
    `createConceptMap`) and the reason this is not a shallow row copy: the
    duplicate gets *new* notes with the same text, so editing a card on the
    copy cannot rewrite the original's. The alternative: pointing both boards
    at one set of notes, looks identical the moment it is made and diverges
    into data loss the first time someone edits the copy.

    Sketches and objects carry no separate identity, so those rows are copied
    as they are.
    """
    return duplicate_board_copy(db, board_id)


@router.put("/boards/{board_id}", response_model=BoardOut)
def rename_board(board_id: int, body: BoardRename, db: Session = Depends(get_session)) -> BoardOut:
    """A board's title is its underlying note's own first `#` heading line
    (`list_boards`'s own `extract_title` read, above): so renaming a board
    is the same `apply_title` edit any other note's title goes through, not
    a second stored field. The default scratch board (`board_id=None`) has
    no underlying note to rename; `board_id=0` and negative ids can't
    resolve to a real note either, so both 404 the same way a stale or
    guessed id does.

    Also where a board becomes a map and back (`type`), and where a map's
    `layout` is chosen. Every field is optional and only what was sent is
    applied: the same shape `PATCH` would have, kept as `PUT` because the
    route, the client call and this function's name already existed.
    """
    entry = db.get(Entry, board_id) if board_id > 0 else None
    if entry is None or entry.is_deleted:
        raise HTTPException(status_code=404, detail="That board could not be found.")
    entry.is_board = True
    if body.type is not None or body.layout is not None:
        before = dict(zip(("type", "layout"), _board_settings(entry)))
        stored = _store_board_settings(entry, body.type, body.layout)
        # **Deliberately not wrapped in `@events.writes`.** A title change
        # here goes through `manager.update_entry`, which records the note's
        # own `edited` event; a write scope on this route would fold that
        # into the board's event and take the edit out of the note's history,
        # which is where a person looks for it and where its replay needs it.
        # So the board's settings, which the manager knows nothing about, get
        # their own event beside the note's rather than instead of it.
        events.record(
            db,
            "edited",
            "board",
            entry.id,
            f"{stored[0]}, {stored[1]}",
            payload={"after": dict(zip(("type", "layout"), stored)), "before": before},
        )
    if body.theme is not None:
        before_theme = _board_theme(entry)
        stored_theme = _store_board_theme(entry, body.theme)
        if stored_theme != before_theme:
            events.record(
                db,
                "edited",
                "board",
                entry.id,
                f"map theme, {len(stored_theme)} field" + ("" if len(stored_theme) == 1 else "s"),
                payload={"after": stored_theme, "before": before_theme},
            )
    if body.numbered is not None:
        before_numbered = _board_numbered(entry)
        _store_board_numbered(entry, body.numbered)
        if body.numbered != before_numbered:
            events.record(
                db,
                "edited",
                "board",
                entry.id,
                "branches numbered" if body.numbered else "branches not numbered",
                payload={"after": {"numbered": body.numbered}, "before": {"numbered": before_numbered}},
            )
    _apply_board_look(db, entry, body)
    if body.title is not None:
        title = body.title.strip()
        update_entry(db, entry, content=apply_title(entry.content, title))
    else:
        # `update_entry` commits for us; without a title change nothing else
        # would, and the settings above would be lost on session close.
        db.commit()
        title = extract_title(entry.content) or entry.content.strip()[:40] or f"Note {entry.id}"
    board_type, layout = _board_settings(entry)
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
        id=board_id,
        title=title,
        node_count=node_count,
        sketch_count=sketch_count,
        link_count=db.scalar(
            select(func.count()).select_from(WhiteboardSketch)
            .where(WhiteboardSketch.board_id == board_id, _is_link_sketch())
        ) or 0,
        object_count=object_count,
        type=board_type,
        layout=layout,
        background=_board_background(entry),
        layers=_board_layers(entry),
        **_preview_fields(db, board_id),
    )


@router.post("/nodes", response_model=WhiteboardNodeOut)
@events.writes("whiteboard_node", "placed")
def create_node(
    node_in: WhiteboardNodeBase, db: Session = Depends(get_session)
) -> WhiteboardNode:
    _require_entry(db, node_in.entry_id)
    _require_board(db, node_in.board_id)
    # One card per note per board. Dropping the same note on a board twice is
    # a move, not a duplicate, the alternative is two cards stacked exactly
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
    node.locked = node_in.locked
    node.hidden = node_in.hidden
    _apply_comments(node, node_in)
    if existing is None:
        db.add(node)
        db.flush()  # so the event can name the card's id
    # "placed" rather than "created": dropping the same note on the same board
    # twice moves the card that is already there (see above), so one verb has
    # to be honest about both, and where the card ended up is the fact worth
    # keeping either way.
    events.record(
        db,
        "placed",
        "whiteboard_node",
        node.id,
        f"note {node.entry_id} on board {node.board_id}",
        payload={"after": _node_state(node), "existing": existing is not None},
    )
    db.commit()
    db.refresh(node)
    return node


@router.put("/nodes/{node_id}", response_model=WhiteboardNodeOut)
@events.writes("whiteboard_node", "edited")
def update_node(
    node_id: int, node_in: WhiteboardNodeBase, db: Session = Depends(get_session)
) -> WhiteboardNode:
    node = deps.get_or_404(db, WhiteboardNode, node_id, "That node could not be found.")
    _require_entry(db, node_in.entry_id)
    _require_board(db, node_in.board_id)
    before = _node_state(node)
    node.entry_id = node_in.entry_id
    # `board_id` was read from the body and then never assigned, so moving a
    # card between boards returned 200 and changed nothing.
    node.board_id = node_in.board_id
    node.x, node.y, node.z = node_in.x, node_in.y, node_in.z
    node.width, node.height, node.group_id = node_in.width, node_in.height, node_in.group_id
    node.rotation = node_in.rotation
    node.locked = node_in.locked
    node.hidden = node_in.hidden
    _apply_comments(node, node_in)
    events.record(
        db,
        "edited",
        "whiteboard_node",
        node.id,
        f"card on board {node.board_id}",
        payload={"after": _node_state(node), "before": before},
    )
    db.commit()
    db.refresh(node)
    return node


@router.delete("/nodes/{node_id}")
@events.writes("whiteboard_node", "deleted")
def delete_node(node_id: int, db: Session = Depends(get_session)) -> dict:
    # 404 rather than a cheerful "ok": deleting something that isn't there
    # is how a client finds out its board is stale, and swallowing it left
    # ghost cards on screen until a reload.
    node = deps.get_or_404(db, WhiteboardNode, node_id, "That node could not be found.")
    events.record(
        db,
        "deleted",
        "whiteboard_node",
        node.id,
        f"card off board {node.board_id}",
        payload={"before": _node_state(node), "after": dict(_DELETED)},
    )
    _forget_links_to(db, node.board_id, "node", node.id)
    db.delete(node)
    db.commit()
    return {"status": "ok"}


@router.post("/sketches", response_model=WhiteboardSketchOut)
@events.writes("whiteboard_sketch", "created")
def create_sketch(
    sketch_in: WhiteboardSketchBase, db: Session = Depends(get_session)
) -> WhiteboardSketch:
    _require_board(db, sketch_in.board_id)
    sketch = WhiteboardSketch(**sketch_in.model_dump())
    try:
        parsed = json.loads(sketch.data)
    except ValueError:
        parsed = None
    if isinstance(parsed, dict):
        layered = _on_current_layer(db, sketch_in.board_id, parsed)
        if layered is not parsed:
            sketch.data = json.dumps(layered)
    db.add(sketch)
    db.flush()  # so the event can name the sketch's id
    events.record(
        db,
        "created",
        "whiteboard_sketch",
        sketch.id,
        f"drawing on board {sketch.board_id}",
        payload={"after": _sketch_state(sketch)},
    )
    db.commit()
    db.refresh(sketch)
    return sketch


@router.put("/sketches/{sketch_id}", response_model=WhiteboardSketchOut)
@events.writes("whiteboard_sketch", "edited")
def update_sketch(
    sketch_id: int, sketch_in: WhiteboardSketchBase, db: Session = Depends(get_session)
) -> WhiteboardSketch:
    sketch = deps.get_or_404(db, WhiteboardSketch, sketch_id, "That sketch could not be found.")
    _require_board(db, sketch_in.board_id)
    before = _sketch_state(sketch)
    sketch.data = sketch_in.data
    sketch.board_id = sketch_in.board_id
    sketch.x, sketch.y, sketch.z = sketch_in.x, sketch_in.y, sketch_in.z
    sketch.group_id = sketch_in.group_id
    events.record(
        db,
        "edited",
        "whiteboard_sketch",
        sketch.id,
        f"drawing on board {sketch.board_id}",
        payload={"after": _sketch_state(sketch), "before": before},
    )
    db.commit()
    db.refresh(sketch)
    return sketch


@router.delete("/sketches/{sketch_id}")
@events.writes("whiteboard_sketch", "deleted")
def delete_sketch(sketch_id: int, db: Session = Depends(get_session)) -> dict:
    sketch = deps.get_or_404(db, WhiteboardSketch, sketch_id, "That sketch could not be found.")
    events.record(
        db,
        "deleted",
        "whiteboard_sketch",
        sketch.id,
        f"drawing off board {sketch.board_id}",
        payload={"before": _sketch_state(sketch), "after": dict(_DELETED)},
    )
    _forget_links_to(db, sketch.board_id, "sketch", sketch.id)
    db.delete(sketch)
    db.commit()
    return {"status": "ok"}


@router.post("/objects", response_model=WhiteboardObjectOut, status_code=201)
@events.writes("whiteboard_object", "created")
def create_object(
    body: WhiteboardObjectBase, db: Session = Depends(get_session)
) -> WhiteboardObjectOut:
    _require_board(db, body.board_id)
    _require_object_data(body)
    obj = WhiteboardObject(
        kind=body.kind,
        data=json.dumps(_on_current_layer(db, body.board_id, body.data.model_dump(mode="json", exclude_none=True)), separators=(",", ":")),
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
    db.flush()  # so the event can name the object's id
    events.record(
        db,
        "created",
        "whiteboard_object",
        obj.id,
        f"{obj.kind} on board {obj.board_id}",
        payload={"after": _object_state(obj)},
    )
    db.commit()
    db.refresh(obj)
    if obj.kind == "image":
        # Placing an image object on the board is itself the commit, a
        # whiteboard has no separate staging/save step the way a note or
        # chat draft does, so this fires immediately (core/media_process.py's
        # own docstring covers the other three commit points).
        from memorymap.core import media_process

        media_process.process_referenced_uploads(
            db, deps.get_config().data_dir / "media", obj.data
        )
    return _object_to_out(obj)


@router.put("/objects/{object_id}", response_model=WhiteboardObjectOut)
@events.writes("whiteboard_object", "edited")
def update_object(
    object_id: int, body: WhiteboardObjectBase, db: Session = Depends(get_session)
) -> WhiteboardObjectOut:
    obj = deps.get_or_404(db, WhiteboardObject, object_id, "That item could not be found.")
    _require_board(db, body.board_id)
    _require_object_data(body)
    # The kind an object was created as doesn't change: an image resized or
    # moved is still an image; nothing in the UI offers "turn this into a
    # text box", so treating a mismatched kind here as a client bug rather
    # than silently reinterpreting the row is the safer failure.
    if body.kind != obj.kind:
        raise HTTPException(status_code=422, detail="You can't change what kind of item that is.")
    before = _object_state(obj)
    obj.data = body.data.model_dump_json(exclude_none=True)
    obj.board_id = body.board_id
    obj.x, obj.y, obj.z = body.x, body.y, body.z
    obj.width, obj.height = body.width, body.height
    obj.rotation = body.rotation
    obj.group_id = body.group_id
    events.record(
        db,
        "edited",
        "whiteboard_object",
        obj.id,
        f"{obj.kind} on board {obj.board_id}",
        payload={"after": _object_state(obj), "before": before},
    )
    db.commit()
    db.refresh(obj)
    return _object_to_out(obj)


@router.delete("/objects/{object_id}")
@events.writes("whiteboard_object", "deleted")
def delete_object(object_id: int, db: Session = Depends(get_session)) -> dict:
    """Delete an object: and, on a map, everything hanging off it.

    **Coggle's rule, chosen deliberately over re-parenting** (MINDMAP_PLAN.md
    §5.4). The alternative, promoting a deleted node's children to its
    parent, reads as the gentler option and is worse: a branch you meant to
    remove reappears as loose children under a node that never had them, and
    there is no single action that puts it back. Deleting the subtree is one
    action, so it can be undone as one, which is why the whole subtree comes
    back in the response, rows and positions included, rather than a count.

    An ordinary object has no children, so this is exactly what it always
    was for a text box or an image.
    """
    obj = deps.get_or_404(db, WhiteboardObject, object_id, "That item could not be found.")
    doomed = _subtree(db, obj)
    deleted = [_object_to_out(row).model_dump() for row in doomed]
    # One event with the id list, the same shape a purge of notes records
    # (`manager.purge_entries`): deleting a branch is one action a person took
    # and has to be undoable as one, so it is one event holding the state of
    # every row that went, not one event per row.
    events.record(
        db,
        "deleted",
        "whiteboard_object",
        obj.id,
        f"{obj.kind} on board {obj.board_id}"
        + (f" with {len(doomed) - 1} under it" if len(doomed) > 1 else ""),
        payload={
            "before": _object_state(obj),
            "after": dict(_DELETED),
            "ids": [row.id for row in doomed],
            "subtree": [_object_state(row) for row in doomed],
        },
    )
    #: The cross-links that went with them, as sketch rows, so Undo can draw
    #: them again between the restored topics (a link to a topic outside the
    #: branch keeps its far end, which still exists). Empty for a text box.
    links: list[dict] = []
    for row in doomed:
        _delete_one_object(db, row, links)
    db.commit()
    return {"status": "ok", "deleted": deleted, "links": links}


@router.get("/boards/{board_id}/tree", response_model=MapTreeOut)
def board_tree(board_id: int, db: Session = Depends(get_session)) -> MapTreeOut:
    """The board as a nested tree, plus its cross-links.

    The one endpoint a map client cannot do without: `GET /whiteboard/` hands
    back a flat list of objects, and rebuilding the tree from it client-side
    means every reader (the canvas, the Library thumbnail, an export, the
    agent) writes the same walk again, including the dangling-parent and
    ring cases, which is exactly the sort of thing four copies get subtly
    differently.
    """
    entry = _board_entry(db, board_id)
    board_type, layout = _board_settings(entry)
    objects = _map_objects(db, board_id)
    return MapTreeOut(
        board_id=board_id,
        title=extract_title(entry.content) or entry.content.strip()[:40] or f"Note {board_id}",
        type=board_type,
        layout=layout,
        roots=_build_tree(db, objects),
        cross_links=_cross_links(db, board_id, {obj.id for obj in objects}),
        theme=_board_theme(entry),
        numbered=_board_numbered(entry),
        palette=_board_palette(_board_theme(entry)),
    )


@router.post(
    "/boards/{board_id}/nodes", response_model=WhiteboardObjectOut, status_code=201
)
@events.writes("whiteboard_object", "created")
def create_map_node(
    board_id: int, body: MapNodeCreate, db: Session = Depends(get_session)
) -> WhiteboardObjectOut:
    """Add a node under a parent, or as a new root.

    Not a second CRUD for `whiteboard_objects`, `PUT`/`DELETE /objects/{id}`
    still own the rest of a node's life. This exists for the two things the
    generic create cannot do without a client that already knows the whole
    tree: attach the node to a parent (with the board scoping that implies)
    and work out where it goes.
    """
    _require_board(db, board_id)
    _map_kind_ok(body.kind)
    if body.kind in MAP_REFERENCE_KINDS:
        _require_reference(db, body.kind, body.ref_id)

    parent = None
    if body.parent_id is not None:
        parent = db.get(WhiteboardObject, body.parent_id)
        # Scoped to the board it claims, the rule this module opens with. A
        # parent on another board would build a tree spanning two boards,
        # which renders on neither.
        if parent is None or parent.board_id != board_id:
            raise HTTPException(
                status_code=404,
                detail="That node is not on this board.",
            )

    if body.x is not None and body.y is not None:
        x, y = body.x, body.y
    else:
        x, y = _next_position(db, board_id, parent)
    data = WhiteboardObjectData(
        content=body.text,
        ref_id=body.ref_id if body.kind in MAP_REFERENCE_KINDS else None,
        color=body.color,
    )
    obj = WhiteboardObject(
        board_id=board_id,
        kind=body.kind,
        data=data.model_dump_json(exclude_none=True),
        x=x,
        y=y,
        z=1,
        parent_id=parent.id if parent is not None else None,
    )
    db.add(obj)
    db.flush()  # so the event can name the node's id
    events.record(
        db,
        "created",
        "whiteboard_object",
        obj.id,
        f"{obj.kind} on map {board_id}",
        payload={"after": _object_state(obj)},
    )
    db.commit()
    db.refresh(obj)
    return _object_to_out(obj)


@router.post(
    "/boards/{board_id}/nodes/outline",
    response_model=list[WhiteboardObjectOut],
    status_code=201,
)
def paste_map_outline(
    board_id: int, body: MapOutlinePaste, db: Session = Depends(get_session)
) -> list[WhiteboardObjectOut]:
    """**Text pasted onto a map becomes a branch** (audit FEAT-09,
    2026-10-05). An indented list from anywhere (a note, a document, another
    mind mapper's outline) comes in under the selected topic as topics, one
    per line and nested by indentation, in one transaction, so the client
    records it as one Undo step. The same outline reader the Markdown import
    uses, so a paste and an import cannot disagree about what a line means.
    """
    _require_board(db, board_id)
    parent = None
    if body.parent_id is not None:
        parent = db.get(WhiteboardObject, body.parent_id)
        if parent is None or parent.board_id != board_id:
            raise HTTPException(status_code=404, detail="That node is not on this board.")
    _, parsed = _parse_markdown_outline(_outline_from_paste(body.text))
    if not parsed:
        raise HTTPException(status_code=422, detail="There is nothing to add: the text has no lines.")
    # The top lines hang off the topic they were pasted onto (`under`).
    created = _place_map_nodes(db, board_id, parsed, under=parent)
    for obj in created:
        events.record(
            db,
            "created",
            "whiteboard_object",
            obj.id,
            f"{obj.kind} on map {board_id}",
            payload={"after": _object_state(obj)},
        )
    db.commit()
    for obj in created:
        db.refresh(obj)
    return [_object_to_out(obj) for obj in created]


@router.put(
    "/boards/{board_id}/nodes/{node_id}/move", response_model=WhiteboardObjectOut
)
@events.writes("whiteboard_object", "edited")
def move_map_node(
    board_id: int, node_id: int, body: MapNodeMove, db: Session = Depends(get_session)
) -> WhiteboardObjectOut:
    """Re-parent a node, and with it its whole branch.

    **The cycle check is why this endpoint exists at all**, and why `PUT
    /objects/{id}` deliberately does not touch `parent_id`: a node made its
    own descendant produces a ring no tree walk can leave, so the map becomes
    unreadable: and the only UI that could undo it is the one that has just
    stopped rendering.
    """
    _require_board(db, board_id)
    node = db.get(WhiteboardObject, node_id)
    if node is None or node.board_id != board_id:
        raise HTTPException(
            status_code=404, detail="That node is not on this board."
        )

    before = _object_state(node)
    if body.parent_id is None:
        node.parent_id = None
    else:
        if body.parent_id == node.id:
            raise HTTPException(
                status_code=422,
                detail="A node can't be its own parent.",
            )
        parent = db.get(WhiteboardObject, body.parent_id)
        if parent is None or parent.board_id != board_id:
            raise HTTPException(
                status_code=404,
                detail="That node is not on this board.",
            )
        if _is_descendant(db, node.id, parent.id, board_id):
            raise HTTPException(
                status_code=422,
                detail="That would make the node a descendant of itself. Move the branch out first.",
            )
        node.parent_id = parent.id
    events.record(
        db,
        "edited",
        "whiteboard_object",
        node.id,
        f"moved under {node.parent_id}" if node.parent_id else "moved to a root",
        payload={"after": _object_state(node), "before": before},
    )
    db.commit()
    db.refresh(node)
    return _object_to_out(node)


@router.put("/boards/{board_id}/nodes/move-many", response_model=list[WhiteboardObjectOut])
@events.writes("whiteboard_object", "edited")
def move_map_nodes(
    board_id: int, body: MapNodesMove, db: Session = Depends(get_session)
) -> list[WhiteboardObjectOut]:
    """Move a set of nodes in one request, one transaction, one cycle check.

    **Why this exists.** Tidy persists one node at a time, transplanting a
    branch is one `/move` per child, and opening every folded branch is one PUT
    per folded node: a tidy of two hundred nodes is two hundred round trips,
    two hundred transactions, and a map that is half arranged for as long as
    they take. Any one of them failing leaves the map in a shape nobody asked
    for, because there is nothing to roll back to.

    The batch is all or nothing. Every id is checked against the board, every
    new parent is checked against the board, and the cycle check runs once
    against the shape the whole batch *would* produce rather than per move:
    checking each move against the map as it stands would pass a pair of moves
    that are each innocent and together make a ring.
    """
    _require_board(db, board_id)
    if not body.moves:
        return []
    seen_ids: set[int] = set()
    for move in body.moves:
        if move.id in seen_ids:
            raise HTTPException(
                status_code=422,
                detail=f"Node {move.id} is in this batch twice; each node moves once.",
            )
        seen_ids.add(move.id)

    nodes = {
        node.id: node
        for node in db.scalars(
            select(WhiteboardObject).where(
                WhiteboardObject.id.in_(seen_ids),
                _board_filter(WhiteboardObject, board_id),
            )
        )
    }
    missing = sorted(seen_ids - set(nodes))
    if missing:
        raise HTTPException(
            status_code=404, detail="That node is not on this board."
        )

    parents = _parent_map(db, board_id)
    reparented: set[int] = set()
    for move in body.moves:
        if not move.reparent:
            continue
        if move.parent_id is not None:
            if move.parent_id == move.id:
                raise HTTPException(
                    status_code=422,
                    detail="A node can't be its own parent.",
                )
            if move.parent_id not in parents:
                raise HTTPException(
                    status_code=404,
                    detail="That node is not on this board.",
                )
        parents[move.id] = move.parent_id
        reparented.add(move.id)

    offender = _first_cycle(parents, reparented)
    if offender is not None:
        raise HTTPException(
            status_code=422,
            detail=(
                f"That would make node {offender} a descendant of itself. "
                "Move the branch out first."
            ),
        )

    out: list[WhiteboardObjectOut] = []
    before_states: list[dict] = []
    for move in body.moves:
        node = nodes[move.id]
        before_states.append(_object_state(node))
        if move.reparent:
            node.parent_id = move.parent_id
        if move.x is not None:
            node.x = move.x
        if move.y is not None:
            node.y = move.y
        out.append(node)
    #: **One event, not one per node**, which is what `events.writes` on this
    #: function means and why the decorator's own docstring warns against
    #: decorating a loop: a tidy is one thing the person did, and twelve
    #: `edited` rows for one press of Tidy is a history nobody can read. The
    #: whole batch's before and after ride in the payload, so nothing is lost;
    #: the single-node `/move` above still records per node, because there it
    #: really is one node the person moved.
    events.record(
        db,
        "edited",
        "whiteboard_object",
        out[0].id,
        f"moved {len(out)} nodes on map {board_id}"
        if len(out) > 1
        else (f"moved under {out[0].parent_id}" if out[0].parent_id else "moved to a root"),
        payload={
            "after": [_object_state(node) for node in out],
            "before": before_states,
        },
    )
    db.commit()
    for node in out:
        db.refresh(node)
    return [_object_to_out(node) for node in out]


@router.post("/boards/{board_id}/nodes/clear-style", response_model=MapClearStyleOut)
@events.writes("whiteboard_object", "edited")
def clear_map_node_styles(
    board_id: int, db: Session = Depends(get_session)
) -> MapClearStyleOut:
    """Drop every per-topic look on this map in one request, one transaction.

    **This is "Reset to branch" at the map's scope, not a second idea**
    (MINDMAP_PLAN.md §13e). The ring's own reset drops this exact list from
    one topic so that it goes back to following what it inherits; with a map
    theme, what a topic inherits is the map, so the same sentence said about
    the whole map is the bulk operation §13.4 measured missing. One button
    that means two things at two scopes is one thing to learn; two buttons
    that mean nearly the same would be two.

    One request for the same reason `move-many` is one: a reset that is one
    PUT per topic is two hundred round trips on a two-hundred-topic map, and
    any one of them failing leaves the map half reset with nothing to roll
    back to.
    """
    _require_board(db, board_id)
    objects = _map_objects(db, board_id)
    cleared = 0
    for obj in objects:
        data = _object_data(obj)
        dropped = {key: value for key, value in data.items() if key in MAP_CLEARABLE_FIELDS}
        if not dropped:
            continue
        for key in dropped:
            data.pop(key, None)
        obj.data = json.dumps(data)
        cleared += 1
    if cleared:
        #: One event for the whole press, the reason `move-many` gives: a
        #: person pressed one thing once, and a row per topic is a history
        #: nobody can read.
        events.record(
            db,
            "edited",
            "whiteboard_object",
            objects[0].id,
            f"cleared the look of {cleared} topic" + ("" if cleared == 1 else "s")
            + f" on map {board_id}",
            payload={"after": {"cleared": cleared}, "before": {"board_id": board_id}},
        )
        db.commit()
    return MapClearStyleOut(cleared=cleared)


@router.get("/boards/{board_id}/export")
def export_board(board_id: int, format: str = "markdown", db: Session = Depends(get_session)):
    """A map as an indented Markdown outline, or as OPML.

    Returned as a text response with a filename rather than as JSON: what a
    caller wants from this is a file, and a JSON envelope means every client
    writes the same unwrapping code before it can save one.
    """
    from fastapi.responses import Response

    if format not in EXPORT_FORMATS:
        raise HTTPException(
            status_code=422,
            detail="Pick one of these export formats: "
            + ", ".join(sorted(EXPORT_FORMATS))
            + ".",
        )
    entry = _board_entry(db, board_id)
    title = extract_title(entry.content) or entry.content.strip()[:40] or f"Note {board_id}"
    roots = _build_tree(db, _map_objects(db, board_id))
    #: **An export of a themed map looks like the map** (MINDMAP_PLAN.md
    #: §13e). A theme is resolved at paint time rather than written onto each
    #: node, which is what keeps it safe to change; but none of the three
    #: formats has a place to put a map-level look, so a file written from
    #: the stored styles alone would come out plainer than the map it was
    #: taken from. Resolved here and nowhere else: `/tree` deliberately keeps
    #: reporting what each node actually carries, because that is what the
    #: strip has to show as set or unset.
    #: Every map now, not only a themed one, because a pin is written as the
    #: absence it means on any map (`_without_pins`). Seen-guarded: a ring
    #: in `parent_id` stays a ring in `children` here, and an unguarded walk
    #: of it never ends (`test_a_ring_in_the_tree_does_not_hang_an_export`).
    theme = _board_theme(entry)
    stack = list(roots)
    styled: set[int] = set()
    while stack:
        node = stack.pop()
        if id(node) in styled:
            continue
        styled.add(id(node))
        node["style"] = _without_pins(_themed_style(node.get("style") or {}, theme))
        stack.extend(node.get("children") or [])
    media, suffix = EXPORT_FORMATS[format]
    #: **Markdown carries no cross-links, deliberately** (MINDMAP_PLAN.md
    #: §13d's decision). This format's whole promise is in `_export_markdown`'s
    #: own docstring, that the file is an outline anybody can paste into
    #: anything, and everything a node wears is already dropped here for that
    #: reason. A "Cross-links" section after the outline would also be read
    #: straight back in by `_parse_markdown_outline`, which reads indentation
    #: and nothing else, so one map's two links would come back as two topics.
    numbered = _board_numbered(entry)
    if format == "markdown":
        text = _export_markdown(title, roots, numbered)
    elif format == "text":
        text = _export_text(roots)
    elif format in ("opml", "xmind"):
        links = _cross_links(db, board_id, {node["id"] for _, node in _outline_rows(roots)})
        writers = {
            "opml": lambda: _export_opml(title, roots, links, numbered),
            "xmind": lambda: _export_xmind(title, roots, links, _board_settings(entry)[1]),
        }
        text = writers[format]()
    else:
        #: Read only for the two formats that can carry them, so a Markdown
        #: export does not pay for a scan of every sketch on the board to find
        #: something it is going to drop.
        links = _cross_links(db, board_id, {node["id"] for _, node in _outline_rows(roots)})
        text = _export_freemind(title, roots, links)
    # The filename is built from the board's id, never from its title: a
    # title is free text, and a Content-Disposition header is exactly where
    # free text becomes a header-injection question nobody wants to answer
    # twice.
    return Response(
        content=text,
        media_type=media,
        headers={
            "Content-Disposition": f'attachment; filename="board-{int(board_id)}.{suffix}"'
        },
    )


@router.post("/boards/propose")
def propose_map(body: MapProposal, db: Session = Depends(get_session)) -> dict:
    """Propose a map of these notes, and write nothing.

    Preview before commit, the convention `generate_diagram` and the note
    extractor already follow in this app: the answer comes back as the outline
    text the user then edits, and `POST /boards/generate` creates the map from
    what they actually saw. A generator that wrote straight to a new board
    would make "undo" mean "find and delete the board it just made".
    """
    from memorymap.ai import librarian

    notes = _proposal_notes(db, body.note_ids)
    if not notes:
        raise HTTPException(
            status_code=404,
            detail="None of those notes can be mapped (deleted, private, or already a board).",
        )
    rows = _note_titles(db, notes)
    name = (body.name or f"Map of {len(rows)} notes").strip()[:100]

    outline = ""
    source = "notebook"
    #: Why the notebook wrote it, when it did. The dialog says this out loud,
    #: and the three cases want three different sentences: "your model is not
    #: running" is a thing the reader can go and fix, "the model answered with
    #: a paragraph" is a thing about the model they chose, and neither should
    #: be reported as the other. `sources`/`reason` rather than one string
    #: because the client also styles on `source`.
    reason = "offline"
    ollama = deps.get_ollama()
    if ollama.is_running():
        try:
            outline = librarian.propose_map_outline(
                [(title, body_text) for _, title, body_text in rows],
                deps.get_model_manager(),
                ollama,
            )
            reason = "unusable"
        except Exception:
            # A model that is running and still fails (a pulled-out model, a
            # timeout) is a reason to fall back, not to lose the action: the
            # notebook's own filing is a proposal too.
            logging.getLogger("memorymap.whiteboard").warning(
                "Map proposal failed, falling back to the notebook's own filing",
                exc_info=True,
            )
            outline = ""
            reason = "failed"
        # A reply with no bullets in it is prose, which is what a small model
        # answers with often enough to plan for; and one bullet is not a map.
        if len([line for line in outline.splitlines() if line.strip()[:1] in "-*+"]) >= 2:
            source = "model"
            reason = "model"
        else:
            outline = ""
    if not outline:
        outline = _outline_from_filing(db, rows, name)
    outline = _outline_covering(outline, rows)
    return {
        "name": name,
        "outline": outline,
        "source": source,
        "reason": reason,
        "note_ids": [entry.id for entry, _, _ in rows],
        "notes": len(rows),
    }


@router.post("/boards/generate", response_model=BoardOut, status_code=201)
def generate_map(body: MapGenerate, db: Session = Depends(get_session)) -> BoardOut:
    """Create the map the user accepted.

    The nodes that match one of their notes are `note` nodes carrying that
    note's id, which is the whole difference the plan names between this and
    a mindmapper's "AI generation": the map is made of the user's real notes,
    not of invented text that happens to look like them. Editing such a node
    edits the note, and deleting the map leaves the notes alone (section 5
    item 4).
    """
    _, parsed = _parse_markdown_outline(body.outline)
    if not parsed:
        raise HTTPException(
            status_code=422,
            detail="That outline has no nodes in it: each line starts with '- '.",
        )
    rows = _note_titles(db, _proposal_notes(db, body.note_ids))
    #: Matched on the casefolded title, because the one thing the user is most
    #: likely to change in the outline is capitalisation, and because a model
    #: told to copy a title exactly will still sometimes retitle its case.
    by_title = {title.casefold(): entry.id for entry, title, _ in rows}
    used: set[int] = set()

    def reference_for(text: str):
        note_id = by_title.get(text.strip().casefold())
        # Once each: an outline that repeats a title (a model's habit when it
        # cannot decide where a note belongs) would otherwise put the same
        # note on the board twice, and two nodes editing one note is a
        # confusion that only shows up later.
        if note_id is None or note_id in used:
            return None
        used.add(note_id)
        return ("note", note_id)

    name = body.name.strip()[:100] or "Generated map"
    entry = Entry(content=f"# {name}", is_board=True)
    _store_board_settings(entry, "map", DEFAULT_MAP_LAYOUT)
    db.add(entry)
    db.flush()
    created = _place_map_nodes(db, entry.id, parsed, reference_for)
    _record_map_creation(
        db,
        entry.id,
        name,
        f"generated map, {len(created)} nodes",
        {"outline": body.outline},
        created,
    )
    db.commit()
    db.refresh(entry)
    return BoardOut(
        id=entry.id,
        title=name,
        node_count=0,
        sketch_count=0,
        object_count=len(created),
        type="map",
        layout=DEFAULT_MAP_LAYOUT,
        **_preview_fields(db, entry.id),
    )


@router.post("/boards/import", response_model=BoardOut, status_code=201)
def import_board(body: MapImport, db: Session = Depends(get_session)) -> BoardOut:
    """Create a map from an OPML file or an indented Markdown outline.

    Every node comes in as a `topic`: an imported outline is text written
    somewhere else, and guessing that a line reading "Chapter three" means a
    particular note in *this* notebook is the kind of helpfulness that
    silently attaches the wrong thing. Linking a topic to a note afterwards
    is one action; finding out which of two hundred nodes was mis-linked is
    not.
    """
    parsers = {
        "opml": _parse_opml,
        "freemind": _parse_freemind,
        "markdown": _parse_markdown_outline,
        "xmind": _parse_xmind,
        #: A plain indented outline (§12.2 item 10) is what a paste is, so it
        #: is read the way a paste is read (decision 29), and a single top
        #: line names the map when the client sent no name.
        "text": lambda content: _parse_markdown_outline(_outline_from_paste(content)),
    }
    title, parsed = parsers[body.format](body.content)
    if body.format == "text" and len(parsed) == 1:
        title = parsed[0]["text"]
    name = (body.name or title or "Imported map").strip()[:100] or "Imported map"
    entry = Entry(content=f"# {name}", is_board=True)
    _store_board_settings(entry, "map", DEFAULT_MAP_LAYOUT)
    #: A numbered map's file comes back numbered (decision 17): OPML says so
    #: on its outlines, and Markdown when every topic starts with its place.
    if body.format == "markdown":
        numbered = _strip_outline_numbers(parsed)
    else:
        numbered = any(node.get("numbered") for node in _flatten_parsed(parsed))
    if numbered:
        _store_board_numbered(entry, True)
    db.add(entry)
    db.flush()  # the nodes need the board's id before they can point at it

    created = _place_map_nodes(db, entry.id, parsed)
    crossed = _restore_import_links(db, entry.id, parsed, created)
    _record_map_creation(
        db,
        entry.id,
        name,
        f"imported {body.format} map, {len(created)} nodes",
        {"format": body.format, "cross_links": crossed},
        created,
    )
    db.commit()
    db.refresh(entry)
    return BoardOut(
        id=entry.id,
        title=name,
        node_count=0,
        sketch_count=0,
        object_count=len(created),
        type="map",
        layout=DEFAULT_MAP_LAYOUT,
        **_preview_fields(db, entry.id),
    )

