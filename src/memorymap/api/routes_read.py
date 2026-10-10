"""`GET /read`: the one reading of what was typed (CHAT_PLAN decision 47).

Quick add, the palette, search and chat each show what the app understood
before Enter (decision 50's chips); they ask here rather than reading the
words themselves, so a phrase means one thing everywhere. Served under the
unlock like every route, and at `/api/v1/read` for an outside client.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query

from memorymap.ai import reading
from memorymap.core.database import utcnow

router = APIRouter(tags=["reading"])

#: Long enough for a sentence with a list in it; a reading is not a document.
MAX_CHARS = 2000


@router.get("/read")
def read_text(
    q: str = Query("", max_length=MAX_CHARS),
    tz_offset_minutes: int = Query(0, ge=-14 * 60, le=14 * 60),
    locale: str = Query("", max_length=16),
    surface: str = Query("", max_length=32),
    birthday: str = Query("", max_length=10),
    now: str = Query("", max_length=40),
) -> dict:
    """The `Reading` of `q` on the person's own clock (`tz_offset_minutes`,
    as `/reminders/parse` takes it), as JSON. `now` (ISO 8601 with an offset)
    fixes the clock for a sweep that measures against a fixture date; one
    that does not parse, or has no offset, is ignored."""
    clock = utcnow().astimezone(timezone(timedelta(minutes=tz_offset_minutes)))
    try:
        given = datetime.fromisoformat(now) if now else None
    except ValueError:
        given = None
    if given is not None and given.tzinfo is not None:
        clock = given
    context = {key: value for key, value in (("locale", locale), ("surface", surface), ("birthday", birthday)) if value}
    return reading.read(q, now=clock, context=context).json()
