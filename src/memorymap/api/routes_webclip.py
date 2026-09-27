"""`POST /links/clip`: keep a web page as a note (WORLD_CLASS_PLAN D9).

The fetch, the address checks and the extraction are `core/webclip.py`; this
is the door, and the one rule that belongs at the door: **nothing goes online
unless the person has said the web may be used.** The clipper shares the web
reader's opt-in (`web_search_enabled`, Settings → Web search) rather than
having a switch of its own, because "may this app reach the web when I ask"
is one question, and two switches that answer it differently would be a
promise kept in one place and broken in the other.

The note goes through the same path as one typed into Capture
(`routes_entries.create_entry`), so it is filed, embedded and indexed like
any other, and a clipped page is found by search by its words.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from memorymap.api import routes_entries
from memorymap.api.schemas import EntryCreate, EntryOut
from memorymap.core import deps, webclip
from memorymap.core.deps import get_session
from memorymap.entry import manager

router = APIRouter(prefix="/links", tags=["links"])

WEB_OFF = (
    "Clipping a page needs the web, and the web is turned off. Allow it in "
    "Settings → Web search, then clip the page again."
)


class ClipIn(BaseModel):
    url: str = Field(min_length=1, max_length=2000)


@router.post("/clip", response_model=EntryOut, status_code=201)
def clip(body: ClipIn, session: Session = Depends(get_session)) -> EntryOut:
    if not deps.get_config().get_preference("web_search_enabled", False):
        raise HTTPException(status_code=403, detail=WEB_OFF)
    try:
        fetched = webclip.fetch_page(body.url)
    except webclip.ClipRefused as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc
    url = fetched["url"]
    extracted = webclip.extract(fetched["html"], url)
    note = routes_entries.create_entry(
        EntryCreate(
            content=webclip.note_content(extracted, url),
            source_url=url,
            source_title=extracted["title"],
            defer_filing=True,
        ),
        session,
    )
    manager.log_action(session, "web_clipped", "entry", note.id, detail=url[:120])
    session.commit()
    return note
