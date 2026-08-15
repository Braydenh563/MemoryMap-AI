"""AI tool handlers for the whiteboard: read/search/add-card/add-link and
the server-side `generate_diagram` layout engine.

Split out of `ai/tools.py`'s "documents, past chats, and skills" section
(ROADMAP.md §0/§4) — the whiteboard quarter of it, self-contained apart
from the shared helpers in `_common.py`.
"""

from __future__ import annotations

import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.core import deps
from memorymap.core.database import Entry
from memorymap.entry import manager

from ._common import DEFAULT_LIST_LIMIT, PREVIEW_CHARS, ToolError, _clip, _limit_arg, _require_note

def _whiteboard_board_filter(model, board_id: int | None):
    """Same rule `routes_whiteboard.py`'s own `_board_filter` uses — `== None`
    renders as SQL `= NULL`, never true for any row, so the default board
    would read as empty however much was actually on it."""
    return model.board_id.is_(None) if board_id is None else model.board_id == board_id


def _read_whiteboard(session: Session, args: dict) -> dict:
    """The read half of ROADMAP item 11's AI+whiteboard integration: lets the
    agent answer "what's on my project-planning board?" without a human
    describing it first. Nothing under `ai/` mentioned the whiteboard at all
    before this — `autonomous.py`'s orphaned-card cleanup is a background
    job, not agent context.
    """
    from memorymap.core.database import WhiteboardNode, WhiteboardObject, WhiteboardSketch

    raw_board_id = args.get("board_id")
    board_id = int(raw_board_id) if raw_board_id not in (None, "") else None

    nodes = list(session.scalars(select(WhiteboardNode).where(_whiteboard_board_filter(WhiteboardNode, board_id))))
    sketches = list(
        session.scalars(select(WhiteboardSketch).where(_whiteboard_board_filter(WhiteboardSketch, board_id)))
    )
    objects = list(
        session.scalars(select(WhiteboardObject).where(_whiteboard_board_filter(WhiteboardObject, board_id)))
    )

    entry_ids = [n.entry_id for n in nodes]
    entries = (
        {e.id: e for e in session.scalars(select(Entry).where(Entry.id.in_(entry_ids)))} if entry_ids else {}
    )
    cards = [
        {
            "card_id": n.id,
            "note_id": n.entry_id,
            "preview": _clip(entries[n.entry_id].content, PREVIEW_CHARS) if n.entry_id in entries else "(note missing)",
        }
        for n in nodes
    ]

    links = []
    for sketch in sketches:
        try:
            parsed = json.loads(sketch.data)
        except (TypeError, ValueError):
            continue
        if isinstance(parsed, dict) and str(parsed.get("type", "")).startswith("link-"):
            links.append({"from_card_id": parsed.get("sourceId"), "to_card_id": parsed.get("targetId")})

    text_boxes = []
    image_count = 0
    for obj in objects:
        try:
            data = json.loads(obj.data)
        except (TypeError, ValueError):
            data = {}
        if obj.kind == "text":
            text_boxes.append({"object_id": obj.id, "text": _clip(str(data.get("content") or ""), PREVIEW_CHARS)})
        elif obj.kind == "image":
            image_count += 1

    board_title = "Default board"
    if board_id is not None:
        board_entry = session.get(Entry, board_id)
        if board_entry is not None:
            board_title = manager.extract_title(board_entry.content) or _clip(board_entry.content, 40)

    return {
        "board_id": board_id,
        "board_title": board_title,
        "cards": cards,
        "text_boxes": text_boxes,
        "image_count": image_count,
        "links": links,
        "label": f"ph:folders Read whiteboard board “{board_title}”",
    }


def _search_whiteboard(session: Session, args: dict) -> dict:
    """The search half of ROADMAP item 11's AI+whiteboard integration:
    "whiteboard content becomes searchable the same way notes are." A real
    embedding index over sketch/text-box content is a bigger lift (a new
    table, a backfill, a place in the embedding-refresh cycle) than this
    session's remaining scope — a keyword scan across every board's card
    previews and text boxes still answers "which board did I put that on?",
    which is the actual question this was asked for.
    """
    from memorymap.core.database import WhiteboardNode, WhiteboardObject

    term = str(args.get("query") or "").strip().lower()
    if not term:
        raise ToolError("query is required")
    limit = _limit_arg(args, default=DEFAULT_LIST_LIMIT)

    matches = []
    node_rows = list(session.scalars(select(WhiteboardNode)))
    entry_ids = [n.entry_id for n in node_rows]
    entries = {e.id: e for e in session.scalars(select(Entry).where(Entry.id.in_(entry_ids)))} if entry_ids else {}
    for node in node_rows:
        entry = entries.get(node.entry_id)
        if entry is not None and term in entry.content.lower():
            matches.append({
                "board_id": node.board_id,
                "card_id": node.id,
                "note_id": node.entry_id,
                "preview": _clip(entry.content, PREVIEW_CHARS),
            })

    for obj in session.scalars(select(WhiteboardObject).where(WhiteboardObject.kind == "text")):
        try:
            data = json.loads(obj.data)
        except (TypeError, ValueError):
            continue
        text = str(data.get("content") or "")
        if term in text.lower():
            matches.append({
                "board_id": obj.board_id,
                "object_id": obj.id,
                "text": _clip(text, PREVIEW_CHARS),
            })

    return {
        "matches": matches[:limit],
        "total_matching": len(matches),
        "label": f"ph:magnifying-glass Searched whiteboards for “{_clip(term, 30)}”",
    }


def _add_whiteboard_card(session: Session, args: dict) -> dict:
    """The write half's simplest step: place an existing note as a card on a
    board — what "AI-guided diagram generation" reduces to for one note at a
    time. Reuses `_require_note` (not a bare `session.get`) so a private note
    gets the same refusal every other tool already gives it.
    """
    from memorymap.core.database import WhiteboardNode

    entry = _require_note(session, args, "note_id")
    raw_board_id = args.get("board_id")
    board_id = int(raw_board_id) if raw_board_id not in (None, "") else None
    x = float(args["x"]) if args.get("x") is not None else 100.0
    y = float(args["y"]) if args.get("y") is not None else 100.0

    existing = session.scalar(
        select(WhiteboardNode).where(
            WhiteboardNode.entry_id == entry.id,
            _whiteboard_board_filter(WhiteboardNode, board_id),
        )
    )
    if existing is not None:
        return {
            "card_id": existing.id,
            "note_id": entry.id,
            "already_there": True,
            "label": f"ph:folders “{_clip(entry.content, 40)}” is already on that board",
        }

    node = WhiteboardNode(board_id=board_id, entry_id=entry.id, x=x, y=y, z=1)
    session.add(node)
    manager.log_action(session, "created", "whiteboard_node", entry.id, entry.content[:80])
    session.commit()
    session.refresh(node)
    return {
        "card_id": node.id,
        "note_id": entry.id,
        "x": node.x,
        "y": node.y,
        "label": f"ph:folders Placed “{_clip(entry.content, 40)}” on the whiteboard",
    }


def _add_whiteboard_link(session: Session, args: dict) -> dict:
    """The other write step: connect two cards already on a board. No anchor
    picking here (that's a live-drag interaction, ROADMAP item 11) — a
    generated link is a floating one, which still terminates correctly on
    each card's own border via `wbLinkEndpoints` on the client side.
    """
    from memorymap.core.database import WhiteboardNode, WhiteboardSketch

    source = session.get(WhiteboardNode, int(args.get("from_card_id") or 0))
    target = session.get(WhiteboardNode, int(args.get("to_card_id") or 0))
    if source is None:
        raise ToolError(f"No whiteboard card with id {args.get('from_card_id')}")
    if target is None:
        raise ToolError(f"No whiteboard card with id {args.get('to_card_id')}")
    if source.id == target.id:
        raise ToolError("Can't link a card to itself.")
    if source.board_id != target.board_id:
        raise ToolError("Both cards must be on the same board to link them.")

    data = {
        "type": "link-curved" if args.get("curved") else "link-straight",
        "sourceId": source.id,
        "targetId": target.id,
        "color": "#8899ff",
    }
    sketch = WhiteboardSketch(board_id=source.board_id, data=json.dumps(data), x=0, y=0, z=1)
    session.add(sketch)
    manager.log_action(session, "created", "whiteboard_link", None, f"{source.id} -> {target.id}")
    session.commit()
    session.refresh(sketch)
    return {
        "link_id": sketch.id,
        "from_card_id": source.id,
        "to_card_id": target.id,
        "label": "ph:link Linked the two cards",
    }


#: A runaway model asking for a diagram of hundreds of notes is a real
#: failure mode a bulk tool has to bound, the same reason every list tool
#: here clamps its own `limit` — one call shouldn't be able to flood a
#: board.
MAX_DIAGRAM_NODES = 60

#: Layout constants mirrored from the whiteboard's own client-side
#: `wbArrangeMindMap` (`WB_MINDMAP_TREE_ROW`/`_COL`/`_RADIAL_STEP` in
#: app.js) so a diagram this tool places and one arranged by hand afterward
#: read as the same spacing convention, not two different tools' opinions.
_DIAGRAM_ROW = 170.0
_DIAGRAM_COL = 320.0
_DIAGRAM_RADIAL_STEP = 260.0


def _diagram_tree_positions(root_ref: str, children_of: dict[str, list[str]], layout: str) -> dict[str, tuple[float, float]]:
    """Board (x, y) for every node reachable from `root_ref`, laid out as a
    tree (depth → column, siblings spread along a row) or radially (depth →
    ring, siblings spread around it).

    Not a port of d3.tree()'s own tidy-tree (Reingold-Tilford/Buchheim)
    algorithm — that optimises for the *tightest* non-overlapping packing,
    which this doesn't need to match exactly, only to produce. A leaf gets
    the next free row slot in visitation order; an internal node's slot is
    the mean of its children's, which is the simplest arrangement that is
    still guaranteed non-overlapping and reads as a sensible tree. Depth is
    plain BFS distance from the root.
    """
    import math

    depth: dict[str, int] = {root_ref: 0}
    queue = [root_ref]
    while queue:
        current = queue.pop(0)
        for child in children_of.get(current, []):
            if child in depth:
                # Reached via two different paths — not a simple tree.
                raise ToolError(f"'{child}' has more than one path back to the root — check parent_ref for a cycle or a duplicate.")
            depth[child] = depth[current] + 1
            queue.append(child)

    slot: dict[str, float] = {}
    next_leaf_slot = [0]

    def assign(node: str) -> float:
        kids = children_of.get(node, [])
        if not kids:
            value = float(next_leaf_slot[0])
            next_leaf_slot[0] += 1
        else:
            value = sum(assign(k) for k in kids) / len(kids)
        slot[node] = value
        return value

    assign(root_ref)

    positions: dict[str, tuple[float, float]] = {}
    if layout == "radial":
        leaf_count = max(next_leaf_slot[0], 1)
        for node, d in depth.items():
            angle = (slot[node] / leaf_count) * 2 * math.pi - math.pi / 2
            radius = d * _DIAGRAM_RADIAL_STEP
            positions[node] = (radius * math.cos(angle), radius * math.sin(angle))
    else:
        for node, d in depth.items():
            positions[node] = (d * _DIAGRAM_COL, slot[node] * _DIAGRAM_ROW)
    return positions


def _generate_diagram(session: Session, args: dict) -> dict:
    """Place a whole tree of notes on a whiteboard in one call — the gap
    named directly (BACKLOG.md §29d, HANDOVER.md): `add_whiteboard_card`/
    `add_whiteboard_link` already exist, but x/y are free-form numbers the
    model has to invent itself across many chained calls, exactly the
    bookkeeping a small (2-8B) tool-calling model gets wrong. Here the
    model only ever declares *structure* (a title or an existing note, and
    which other node is its parent); this function creates whatever notes
    need creating, computes every position server-side, and wires the
    links — the same job `wbArrangeMindMap` already does client-side for a
    board someone arranges by hand, now reachable in one round trip.
    """
    from memorymap.core.database import WhiteboardNode, WhiteboardSketch

    raw_nodes = args.get("nodes")
    if not isinstance(raw_nodes, list) or not raw_nodes:
        raise ToolError("'nodes' must be a non-empty list.")
    if len(raw_nodes) > MAX_DIAGRAM_NODES:
        raise ToolError(f"That's {len(raw_nodes)} nodes — {MAX_DIAGRAM_NODES} is the most this can place in one call.")

    raw_board_id = args.get("board_id")
    board_id = int(raw_board_id) if raw_board_id not in (None, "") else None
    layout = "radial" if args.get("layout") == "radial" else "tree"

    by_ref: dict[str, dict] = {}
    for i, raw in enumerate(raw_nodes):
        ref = str(raw.get("ref") or "").strip()
        if not ref:
            raise ToolError(f"nodes[{i}] has no 'ref' — every node needs a short local id to reference as a parent.")
        if ref in by_ref:
            raise ToolError(f"'{ref}' is used as 'ref' on more than one node — refs must be unique.")
        title = str(raw.get("title") or "").strip()
        note_id = raw.get("note_id")
        if bool(title) == bool(note_id):
            raise ToolError(f"Node '{ref}' needs exactly one of 'title' (new note) or 'note_id' (existing note).")
        by_ref[ref] = {"title": title, "note_id": note_id, "parent_ref": raw.get("parent_ref") or None}

    roots = [ref for ref, node in by_ref.items() if not node["parent_ref"]]
    if len(roots) != 1:
        raise ToolError(
            "Exactly one node must have no 'parent_ref' (the diagram's root) — "
            f"found {len(roots)}."
        )
    root_ref = roots[0]

    children_of: dict[str, list[str]] = {}
    for ref, node in by_ref.items():
        parent_ref = node["parent_ref"]
        if parent_ref is None:
            continue
        if parent_ref not in by_ref:
            raise ToolError(f"Node '{ref}' has parent_ref '{parent_ref}', which isn't in this call's own nodes.")
        children_of.setdefault(parent_ref, []).append(ref)

    positions = _diagram_tree_positions(root_ref, children_of, layout)

    # Resolve every ref to a real Entry — creating one for a bare title,
    # reusing (and permission-checking, same as any other tool) one already
    # given as note_id. Two passes on purpose: entries have to exist before
    # any card/link touches them, and failing on node 40 of 60 after
    # already writing 39 cards would be a worse outcome than failing before
    # anything is written at all.
    entries: dict[str, Entry] = {}
    for ref, node in by_ref.items():
        if node["note_id"] is not None:
            entries[ref] = _require_note(session, {"note_id": node["note_id"]})
        else:
            entries[ref] = manager.create_entry(
                session, node["title"], category_name=manager.UNCATEGORISED, tags=[], ai_confidence=0
            )
    for ref, entry in entries.items():
        deps.store_quietly(session, entry)

    cards: dict[str, WhiteboardNode] = {}
    for ref, entry in entries.items():
        x, y = positions[ref]
        existing = session.scalar(
            select(WhiteboardNode).where(
                WhiteboardNode.entry_id == entry.id,
                _whiteboard_board_filter(WhiteboardNode, board_id),
            )
        )
        node = existing or WhiteboardNode(board_id=board_id, entry_id=entry.id, z=1)
        node.x, node.y = x, y
        if existing is None:
            session.add(node)
        cards[ref] = node
    session.commit()
    for card in cards.values():
        session.refresh(card)

    link_count = 0
    for ref, node in by_ref.items():
        parent_ref = node["parent_ref"]
        if parent_ref is None:
            continue
        data = {
            "type": "link-straight",
            "sourceId": cards[parent_ref].id,
            "targetId": cards[ref].id,
            "color": "#8899ff",
        }
        session.add(WhiteboardSketch(board_id=board_id, data=json.dumps(data), x=0, y=0, z=1))
        link_count += 1
    manager.log_action(session, "created", "whiteboard_diagram", None, f"{len(cards)} cards, root '{root_ref}'")
    session.commit()

    return {
        "board_id": board_id,
        "root_card_id": cards[root_ref].id,
        "cards": [
            {"ref": ref, "card_id": card.id, "note_id": entries[ref].id, "x": card.x, "y": card.y}
            for ref, card in cards.items()
        ],
        "links_created": link_count,
        "label": f"ph:map-trifold Placed {len(cards)} cards as a {layout} diagram",
    }


