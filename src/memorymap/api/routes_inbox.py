"""The suggestions inbox (GRAPH_PLAN KG9 part two, INBOX 528).

One sheet holds four kinds of suggestion. Link suggestions
(`/entries/link-suggestions`) and tensions (`/entries/tensions`, a model
pass on demand) keep their own routes; this one gathers the other two, entity
merges and link types (`ai/inbox.py`), and takes their decisions. Every
accept and dismissal is a correction (`ai/learning.py`): a dismissal keeps
that suggestion from coming back, and both move what each signal is worth.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.ai import inbox, learning
from memorymap.ai.entities import merge_entities
from memorymap.api.routes_mentions import note_names
from memorymap.core.database import LINK_TYPES, Entity, EntityMention, Entry, EntryLink
from memorymap.core.deps import get_session
from memorymap.entry import manager
from memorymap.entry.manager import WIKI_LINK, plain_label
from memorymap.entry.mentions import MENTION_MIN_TITLE_CHARS, backlink_spans, sentence_around

router = APIRouter(prefix="/suggestions", tags=["suggestions"])

#: Untyped links read per pass, newest first: an imported vault has
#: thousands, and the sheet shows twenty.
TYPE_SCAN_MAX = 2000
#: The learning's smoothing for the inbox's kinds (`learning.signal_weights`).
INBOX_PRIOR = 3.0


def _visible(session: Session) -> dict[int, Entry]:
    return {
        e.id: e
        for e in session.scalars(
            select(Entry).where(Entry.is_deleted.is_(False), Entry.is_private.is_(False))
        )
    }


def _merges(session: Session, visible: dict[int, Entry]) -> list[dict]:
    notes: dict[int, set[int]] = {}
    for entity_id, entry_id in session.execute(select(EntityMention.entity_id, EntityMention.entry_id)):
        if entry_id in visible:
            notes.setdefault(entity_id, set()).add(entry_id)
    facts = [
        inbox.EntityFacts(id=e.id, name=e.name, notes=frozenset(notes[e.id]))
        for e in session.scalars(select(Entity).where(Entity.merged_into.is_(None)))
        if e.id in notes
    ]
    exclude = {
        frozenset((c.subject.get("a"), c.subject.get("b")))
        for c in learning.corrections(session, kind="dismiss_merge")
    }
    weights = learning.signal_weights(session, accept="accept_merge", dismiss="dismiss_merge", prior=INBOX_PRIOR)
    return inbox.merge_candidates(facts, exclude=exclude, weights=weights)


def _sentence(source: Entry, target: Entry) -> str:
    """The sentence in the source that links to (or names) the target."""
    content = source.content or ""
    names = {name.casefold() for name in note_names(target)}
    for match in WIKI_LINK.finditer(content):
        raw = match.group(1).split("|", 1)[0].split("#", 1)[0].strip().casefold()
        if raw in names:
            return sentence_around(content, *match.span())[0]
    for name in note_names(target):
        if len(name) >= MENTION_MIN_TITLE_CHARS:
            spans = backlink_spans(content, name)[1]
            if spans:
                return sentence_around(content, *spans[0])[0]
    return ""


def _types(session: Session, visible: dict[int, Entry]) -> list[dict]:
    facts = []
    for link in session.scalars(
        select(EntryLink).where(EntryLink.link_type.is_(None)).order_by(EntryLink.id.desc()).limit(TYPE_SCAN_MAX)
    ):
        source, target = visible.get(link.source_entry_id), visible.get(link.target_entry_id)
        if source is None or target is None:
            continue
        facts.append(
            inbox.LinkFacts(
                id=link.id,
                source_id=source.id,
                target_id=target.id,
                context=_sentence(source, target),
                reason=link.reason or "",
                deduced=link.reason_confidence is not None,
            )
        )
    exclude = {
        (c.subject.get("link_id"), c.subject.get("link_type"))
        for c in learning.corrections(session, kind="dismiss_link_type")
    }
    weights = learning.signal_weights(session, accept="accept_link_type", dismiss="dismiss_link_type", prior=INBOX_PRIOR)
    rows = inbox.type_candidates(facts, exclude=exclude, weights=weights)
    for row in rows:
        row["source_label"] = plain_label(visible[row["source_id"]].content, 60) or "Untitled note"
        row["target_label"] = plain_label(visible[row["target_id"]].content, 60) or "Untitled note"
    return rows


@router.get("")
def suggestions(session: Session = Depends(get_session)) -> dict:
    """Entity merges and link types to decide, surest first, twenty each."""
    visible = _visible(session)
    return {"merges": _merges(session, visible), "types": _types(session, visible)}


class MergeAccept(BaseModel):
    keep_id: int
    merge_id: int
    signals: list[Annotated[str, Field(max_length=40)]] = Field(default_factory=list, max_length=8)


class MergeDismiss(BaseModel):
    a: int
    b: int
    signals: list[Annotated[str, Field(max_length=40)]] = Field(default_factory=list, max_length=8)


@router.post("/merges/accept")
def accept_merge(body: MergeAccept, session: Session = Depends(get_session)) -> dict:
    """Fold one entity into the other; every mention follows."""
    keep, gone = session.get(Entity, body.keep_id), session.get(Entity, body.merge_id)
    if keep is None or gone is None or keep.merged_into is not None or gone.merged_into is not None:
        raise HTTPException(status_code=404, detail="That name could not be found. Refresh the list.")
    if keep.id == gone.id:
        raise HTTPException(status_code=400, detail="That is one name already.")
    moved = merge_entities(session, keep, gone)
    learning.record(session, kind="accept_merge", subject={"a": keep.id, "b": gone.id, "signals": body.signals})
    session.commit()
    return {"kept": keep.id, "name": keep.name, "aliases": keep.aliases or [], "moved": moved}


@router.post("/merges/dismiss")
def dismiss_merge(body: MergeDismiss, session: Session = Depends(get_session)) -> dict:
    learning.record(session, kind="dismiss_merge", subject={"a": body.a, "b": body.b, "signals": body.signals})
    session.commit()
    return {"dismissed": True}


class TypeDecision(BaseModel):
    link_id: int
    link_type: str = Field(max_length=24)


@router.post("/types/accept")
def accept_type(body: TypeDecision, session: Session = Depends(get_session)) -> dict:
    """Give the link the suggested type."""
    link = session.get(EntryLink, body.link_id)
    if link is None:
        raise HTTPException(status_code=404, detail="That link could not be found. Refresh the list.")
    if body.link_type not in LINK_TYPES:
        raise HTTPException(status_code=422, detail="That isn't a kind of link this notebook knows.")
    learning.record(
        session,
        kind="accept_link_type",
        subject={"link_id": link.id, "link_type": body.link_type, "signals": [body.link_type]},
    )
    manager.set_link_type(session, link, body.link_type)
    return {"link_id": link.id, "link_type": link.link_type}


@router.post("/types/dismiss")
def dismiss_type(body: TypeDecision, session: Session = Depends(get_session)) -> dict:
    learning.record(
        session,
        kind="dismiss_link_type",
        subject={"link_id": body.link_id, "link_type": body.link_type, "signals": [body.link_type]},
    )
    session.commit()
    return {"dismissed": True}
