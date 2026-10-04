"""A note's backlinks with their sentence, and its unlinked mentions turned
into links in one click (GRAPH_PLAN KG1, INBOX 528).

Documents had both since DOCUMENTS_PLAN Phase 4 (`routes_documents._backlinks`);
a note had only a "mentions it" row with no sentence and nothing to press.
The scanner is shared (`entry/mentions.py`), so "a mention" means one thing
for both kinds.

**Its own router** because the link action writes through both
`routes_entries.update_entry` and `routes_documents.update_document` (the
revision, the wiki sync, the vector refresh, the conflict guard all live
there), and `routes_documents` already reads `routes_entries`: a third module
that reads both closes no import cycle.

**The span is checked here, not in the browser.** The offsets were taken
when the list was drawn; a source edited since answers 409 and is not
touched, because a stale offset rewrites the wrong words of somebody's note.
"""

from __future__ import annotations

import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from memorymap.api import routes_documents, routes_entries
from memorymap.api.schemas import EntryUpdate
from memorymap.core.database import LIKE_ESCAPE, Document, Entry, EntryLink, like_escape
from memorymap.core.deps import get_session
from memorymap.entry import manager
from memorymap.entry.manager import WIKI_LINK, plain_label
from memorymap.entry.mentions import (
    BACKLINK_ROWS_MAX,
    BACKLINK_SOURCES_MAX,
    MENTION_MIN_TITLE_CHARS,
    backlink_rows,
    backlink_spans,
)

router = APIRouter(prefix="/entries", tags=["entries"])

_HEADING_MARK = re.compile(r"^\s{0,3}#{1,6}\s+")


def note_names(entry: Entry) -> list[str]:
    """What a note is called, as written: its opening line without the
    heading marker (what `find_by_wiki_name` resolves), then an imported
    note's file stem. A private note is never a link target, so it has none.
    """
    if entry.is_private:
        return []
    first = (entry.content or "").strip().split("\n", 1)[0]
    names: list[str] = []
    opening = _HEADING_MARK.sub("", first).strip()
    if 0 < len(opening) <= 120 and "[[" not in opening:
        names.append(opening)
    stem = (entry.source_path or "").rsplit("/", 1)[-1]
    stem = stem.removesuffix(".md").removesuffix(".markdown").strip()
    if stem and stem.casefold() not in {name.casefold() for name in names}:
        names.append(stem)
    return names


def _backlinks(session: Session, entry: Entry) -> dict:
    names = note_names(entry)
    if not names:
        return {"name": "", "links": [], "mentions": []}
    resolved: dict[str, bool] = {}

    def points_here(raw: str) -> bool:
        #: `[[name|alias]]` and `[[name#part]]` name the note before the mark.
        name = re.split(r"[|#]", raw, maxsplit=1)[0].strip().casefold()
        if name not in resolved:
            resolved[name] = bool(name) and manager.find_by_wiki_name(session, name) is entry
        return resolved[name]

    likes = [f"%{like_escape(name)}%" for name in names]
    sources: list[tuple[str, int, str, str]] = []
    for row in session.scalars(
        select(Document)
        .where(
            Document.archived_at.is_(None),
            or_(*[Document.content.ilike(like, escape=LIKE_ESCAPE) for like in likes]),
        )
        .order_by(Document.updated_at.desc(), Document.id.desc())
        .limit(BACKLINK_SOURCES_MAX)
    ):
        sources.append(("document", row.id, row.title or "Untitled", row.content or ""))
    #: The notes whose stored wiki link lands here, whatever they typed (a
    #: prefix of the name resolves too), and the notes whose text holds a name.
    linked_ids = set(
        session.scalars(
            select(EntryLink.source_entry_id).where(
                EntryLink.target_entry_id == entry.id, EntryLink.origin == "wiki"
            )
        )
    )
    for row in session.scalars(
        select(Entry)
        .where(
            Entry.id != entry.id,
            Entry.is_deleted.is_(False),
            Entry.is_private.is_(False),
            or_(Entry.id.in_(linked_ids), *[Entry.content.ilike(like, escape=LIKE_ESCAPE) for like in likes]),
        )
        .order_by(Entry.id.desc())
        .limit(BACKLINK_SOURCES_MAX)
    ):
        sources.append(("note", row.id, plain_label(row.content, 60) or "Untitled note", row.content or ""))

    links: list[dict] = []
    mentions: list[dict] = []
    for kind, source_id, label, content in sources:
        linked = [m.span() for m in WIKI_LINK.finditer(content) if points_here(m.group(1))]
        if linked:
            links.extend(backlink_rows(kind, source_id, label, content, linked))
            continue
        spans: list[tuple[int, int]] = []
        for name in names:
            if len(name) < MENTION_MIN_TITLE_CHARS:
                continue
            for span in backlink_spans(content, name)[1]:
                if not any(span[0] < end and start < span[1] for start, end in spans):
                    spans.append(span)
        mentions.extend(backlink_rows(kind, source_id, label, content, sorted(spans)))
    return {"name": names[0], "links": links[:BACKLINK_ROWS_MAX], "mentions": mentions[:BACKLINK_ROWS_MAX]}


@router.get("/{entry_id}/backlinks")
def entry_backlinks(entry_id: int, session: Session = Depends(get_session)) -> dict:
    """What links to this note and what names it without a link, each with
    the sentence it is said in."""
    return _backlinks(session, routes_entries._existing_entry(session, entry_id))


class MentionLinkIn(BaseModel):
    kind: Literal["note", "document"]
    id: int
    start: int = Field(ge=0)
    end: int = Field(gt=0)


MOVED = "That mention has moved since the list was drawn. Refresh the list."


@router.post("/{entry_id}/mentions/link")
def link_mention(entry_id: int, body: MentionLinkIn, session: Session = Depends(get_session)) -> dict:
    """Turn one unlinked mention into `[[the words as written]]`, saved
    through the source's own update route so the result is a stored wiki
    link with a revision behind it. The words are kept as the source wrote
    them: a name resolves whatever its case, and the sentence still reads."""
    entry = routes_entries._existing_entry(session, entry_id)
    names = {name.casefold() for name in note_names(entry)}
    if body.kind == "note":
        source = session.get(Entry, body.id)
        if source is None or source.is_deleted:
            raise HTTPException(status_code=404, detail="That note could not be found.")
        if source.is_private or source.id == entry.id:
            raise HTTPException(status_code=400, detail="That note can't be linked from here.")
        text = source.content or ""
    else:
        document = session.get(Document, body.id)
        if document is None or document.archived_at is not None:
            raise HTTPException(status_code=404, detail="That document could not be found.")
        text = document.content or ""
    start, end = body.start, body.end
    words = text[start:end] if end <= len(text) and start < end else ""
    inside = any(s < end and start < e for s, e in (m.span() for m in WIKI_LINK.finditer(text)))
    if not words or words.casefold() not in names or inside:
        raise HTTPException(status_code=409, detail=MOVED)
    rewritten = f"{text[:start]}[[{words}]]{text[end:]}"
    if body.kind == "note":
        routes_entries.update_entry(body.id, EntryUpdate(content=rewritten), session)
    else:
        routes_documents.update_document(body.id, routes_documents.DocumentPatch(content=rewritten), session)
    return {"linked": True, "kind": body.kind, "id": body.id}
