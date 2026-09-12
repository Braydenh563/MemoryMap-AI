"""Three notes a day that are slipping out of reach (WORLD_CLASS_PLAN 15, I4).

Two routes, and the split between them is the point: `POST /resurface/compute`
does the scan and writes `note_scores`, `GET /resurface` sorts what is already
stored. The read has to be fast enough to sit on a dashboard that paints on
every visit, which it cannot be if it counts every link in the notebook first.
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from memorymap.ai import resurface
from memorymap.core.deps import get_session
from memorymap.entry import manager

router = APIRouter(prefix="/resurface", tags=["resurface"])


def _card(session: Session, entry) -> dict:  # noqa: ANN001
    """One card: enough to recognise the note, and why it is being shown.

    The reason travels with the card because a panel that cannot say why it
    chose something is a panel people learn to distrust: "120 days old, no
    links, never opened" is checkable, "0.82" is not.
    """
    content = manager.readable_content(entry)
    return {
        "id": entry.id,
        "title": manager.extract_title(content),
        "preview": " ".join(content.split())[:200],
        "created_at": entry.created_at,
    }


@router.post("/compute")
def compute(session: Session = Depends(get_session)) -> dict:
    """Refresh every note's fading score. Cheap enough to run on demand,
    meant to run nightly."""
    written = resurface.compute_scores(session)
    session.commit()
    return {"scored": written}


@router.get("")
def today(
    as_of: str = Query(default=""),
    limit: int = Query(default=resurface.DAILY, ge=1, le=20),
    session: Session = Depends(get_session),
) -> dict:
    """The day's cards. `as_of=YYYY-MM-DD` asks for another day's set, which
    is what makes "stable within a day, different across days" testable rather
    than a claim."""
    day: date | None = None
    if as_of:
        try:
            day = date.fromisoformat(as_of)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="as_of must be YYYY-MM-DD") from exc
    entries = resurface.for_day(session, day=day, limit=limit)
    return {"items": [_card(session, entry) for entry in entries]}


@router.get("/near/{entry_id}")
def near(entry_id: int, limit: int = Query(default=resurface.DAILY, ge=1, le=20),
         session: Session = Depends(get_session)) -> dict:
    """The faded notes closest to the one being read. Never that note itself."""
    entries = resurface.for_context(session, context_entry_id=entry_id, limit=limit)
    return {"items": [_card(session, entry) for entry in entries]}
