"""How often each note is opened, a row per note per day (WORLD_CLASS_PLAN
section 17 row 5: "most opened this month" cannot be read off an all-time
count). Written by `GET /entries/{id}`, read by routes_vision's "most opened".

Its own module, not entry.manager: a count of opens is not an edit of the
note, so it records no event (tests/test_events.py holds every public write
in the manager to exactly one), and here it imports no route module.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.core.database import EntryOpen, utcnow


def record_open(session: Session, entry_id: int) -> None:
    """Count one open of a note today, in the caller's transaction."""
    today = utcnow().date().isoformat()
    row = session.scalar(select(EntryOpen).where(EntryOpen.entry_id == entry_id, EntryOpen.day == today))
    if row is None:
        session.add(EntryOpen(entry_id=entry_id, day=today, count=1))
    else:
        row.count = (row.count or 0) + 1
