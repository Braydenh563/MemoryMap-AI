"""Grow a map topic from the notebook (the features audit FEAT-13; MINDMAP_PLAN
§12.3 item 2, "Suggest branches"; WHITEBOARD_PLAN decision 36).

A mind mapper's AI invents children for a topic. This one proposes them from
the person's own notes, and says which note each came from, because the plan's
differentiator is that a map here is made of the notebook rather than of text
that looks like it. Two endpoints, the preview-before-commit convention
`POST /whiteboard/boards/propose` already follows:

- `POST /whiteboard/boards/{board_id}/nodes/{node_id}/suggest` writes nothing:
  up to five child topics, each with the note it is grounded in.
- `POST /whiteboard/boards/{board_id}/nodes/{node_id}/branches` makes the ones
  the person ticked, under the topic, in one transaction, each with its own
  `created` event and its source written into the topic's note, so the client
  records the lot as one Undo step.

**Grounded by construction.** The notes come from the search engine first
(the topic's words, with its parent's for context); the model is only asked to
name a topic for each, by number, and a line that names no listed note is
dropped. With no model, or a reply that is prose, the notes' own titles are the
suggestions, which is never wrong and says so (`source: "notebook"`). The
standing caveat applies: the model is a fake transport in every test.
"""

from __future__ import annotations

import json
import logging
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.core import deps, events
from memorymap.core.database import Entry, WhiteboardObject
from memorymap.core.deps import get_session

router = APIRouter(prefix="/whiteboard", tags=["whiteboard"])

#: How many suggestions, and how many notes the model chooses among.
SUGGESTIONS = 5
CANDIDATES = 8
#: Characters of each note the model sees: enough to name a topic from.
NOTE_CHARS = 280
TOPIC_KINDS = ("topic", "note", "document", "board", "file")


def _topic_text(db: Session, obj: WhiteboardObject) -> str:
    try:
        data = json.loads(obj.data or "{}")
    except (TypeError, ValueError):
        data = {}
    text = str(data.get("content") or "").strip()
    if not text and data.get("ref_id"):
        entry = db.get(Entry, data["ref_id"])
        if entry is not None and not entry.is_private:
            from memorymap.entry import manager

            text = (manager.extract_title(manager.readable_content(entry)) or "").strip()
    return text[:200]


def _node_or_404(db: Session, board_id: int, node_id: int) -> WhiteboardObject:
    obj = db.get(WhiteboardObject, node_id)
    if obj is None or obj.board_id != board_id or obj.kind not in TOPIC_KINDS:
        raise HTTPException(status_code=404, detail="That topic is not on this map.")
    return obj


def _candidates(db: Session, board_id: int, query: str, skip_titles: set[str]) -> list[tuple[Entry, str, str]]:
    """The notes the topic's words find, best first: not private, not a board,
    not already a topic on this map, not this map's own note."""
    from memorymap.entry import manager
    from memorymap.search import engine

    try:
        hits = engine.search(db, query, limit=CANDIDATES * 3)
    except Exception:  # an index being rebuilt is a reason to suggest less, not to fail
        logging.getLogger("memorymap.whiteboard").warning("Branch suggestions: search failed", exc_info=True)
        hits = []
    on_map = set()
    for obj in db.scalars(select(WhiteboardObject).where(WhiteboardObject.board_id == board_id)):
        try:
            ref = json.loads(obj.data or "{}").get("ref_id")
        except (TypeError, ValueError):
            ref = None
        if ref:
            on_map.add(ref)
    out: list[tuple[Entry, str, str]] = []
    for hit in hits:
        if hit.kind != "note" or hit.ref_id in on_map or hit.ref_id == board_id:
            continue
        entry = db.get(Entry, hit.ref_id)
        if entry is None or entry.is_deleted or entry.is_private or entry.is_board:
            continue
        text = manager.readable_content(entry)
        title = (manager.extract_title(text) or text.strip().split("\n")[0] or "Untitled").strip()[:100]
        if title.casefold() in skip_titles:
            continue
        body = " ".join(text.replace(title, "", 1).split())[:NOTE_CHARS]
        out.append((entry, title, body))
        if len(out) >= CANDIDATES:
            break
    return out


def _ask_model(topic: str, parent: str, rows: list[tuple[Entry, str, str]]) -> list[tuple[str, int]]:
    """The model names a child topic for the notes it picks, by number. Pure
    of the database; raises when the model does."""
    system = (
        "You suggest branches for a mind map topic, from the person's own notes. "
        "Reply with ONLY lines of the form '- <short topic> [n]', where n is the "
        "number of the note it comes from. At most five lines, two to six words "
        "each, no preamble, no note that is not listed, no invented facts."
    )
    listing = "\n".join(f"[{i + 1}] {title}: {body}" for i, (_, title, body) in enumerate(rows))
    where = f'"{topic}"' + (f' (under "{parent}")' if parent else "")
    reply = deps.get_ollama().chat(
        deps.get_model_manager().utility_model(),
        [
            {"role": "system", "content": system},
            {"role": "user", "content": f"Topic: {where}\n\nNotes:\n{listing}"},
        ],
    )
    out = []
    for line in str(reply.get("content") or "").splitlines():
        m = re.match(r"^\s*[-*+]\s*(.+?)\s*\[(\d+)\]\s*$", line)
        if m and 1 <= int(m.group(2)) <= len(rows):
            out.append((m.group(1).strip().strip('"')[:80], int(m.group(2)) - 1))
    return out


@router.post("/boards/{board_id}/nodes/{node_id}/suggest")
def suggest_branches(board_id: int, node_id: int, db: Session = Depends(get_session)) -> dict:
    """Up to five children for this topic, each grounded in one of the
    person's notes, and nothing written."""
    node = _node_or_404(db, board_id, node_id)
    topic = _topic_text(db, node)
    if not topic:
        raise HTTPException(status_code=422, detail="Give the topic some words first: they are what the notes are found by.")
    parent = None
    if node.parent_id is not None:
        up = db.get(WhiteboardObject, node.parent_id)
        parent = _topic_text(db, up) if up is not None else None
    children = db.scalars(select(WhiteboardObject).where(WhiteboardObject.parent_id == node.id)).all()
    have = {_topic_text(db, child).casefold() for child in children} | {topic.casefold()}
    rows = _candidates(db, board_id, f"{topic} {parent or ''}".strip(), have)
    if not rows:
        return {"topic": topic, "suggestions": [], "source": "notebook", "reason": "nothing"}
    picked: list[tuple[str, int]] = []
    source, reason = "notebook", "offline"
    if deps.get_ollama().is_running():
        try:
            picked = _ask_model(topic, parent or "", rows)
            reason = "unusable"
        except Exception:
            logging.getLogger("memorymap.whiteboard").warning("Branch suggestions: the model failed", exc_info=True)
            picked, reason = [], "failed"
        if picked:
            source, reason = "model", "model"
    if not picked:
        picked = [(title, i) for i, (_, title, _) in enumerate(rows)]
    out, seen = [], set(have)
    for text, index in picked:
        if not text or text.casefold() in seen:
            continue
        seen.add(text.casefold())
        entry, title, _ = rows[index]
        out.append({"text": text, "note_id": entry.id, "note_title": title})
        if len(out) >= SUGGESTIONS:
            break
    return {"topic": topic, "suggestions": out, "source": source, "reason": reason}


class BranchItem(BaseModel):
    text: str = Field(min_length=1, max_length=200)
    note_id: int | None = None


class BranchesBody(BaseModel):
    items: list[BranchItem] = Field(min_length=1, max_length=20)


@router.post("/boards/{board_id}/nodes/{node_id}/branches", status_code=201)
def add_branches(board_id: int, node_id: int, body: BranchesBody, db: Session = Depends(get_session)) -> list[dict]:
    """Make the ticked suggestions under the topic: one transaction, a
    `created` event per topic, and the note each came from in its note."""
    from memorymap.api.routes_whiteboard import MAP_COL, MAP_ROW, WhiteboardObjectData, _object_state, _object_to_out
    from memorymap.entry import manager

    parent = _node_or_404(db, board_id, node_id)
    siblings = db.scalars(select(WhiteboardObject).where(WhiteboardObject.parent_id == parent.id)).all()
    made = []
    for i, item in enumerate(body.items):
        source = None
        if item.note_id is not None:
            entry = db.get(Entry, item.note_id)
            if entry is not None and not entry.is_deleted and not entry.is_private:
                text = manager.readable_content(entry)
                source = (manager.extract_title(text) or text.strip().split("\n")[0] or "Untitled").strip()[:100]
        data = WhiteboardObjectData(content=item.text.strip(), note=f'From your note "{source}".' if source else None)
        obj = WhiteboardObject(
            board_id=board_id,
            kind="topic",
            data=data.model_dump_json(exclude_none=True),
            x=float(parent.x) + MAP_COL,
            y=float(parent.y) + float(len(siblings) + i) * MAP_ROW,
            z=1,
            parent_id=parent.id,
        )
        db.add(obj)
        db.flush()
        events.record(db, "created", "whiteboard_object", obj.id, f"topic on map {board_id} (suggested)",
                      payload={"after": _object_state(obj)})
        made.append(obj)
    db.commit()
    for obj in made:
        db.refresh(obj)
    return [_object_to_out(obj).model_dump(mode="json") for obj in made]
