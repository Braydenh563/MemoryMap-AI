"""`GET /statistics`: the Statistics page in one call (UI_MODERNISATION
statistics rows 1 and 2).

The notebook's counts, the reminders', this week against last, and the
usage ledger's rows, all counted from rows by `ai/notebook_stats.page` with
no model. The week is the person's own (`user_now`), so Monday starts where
they are. Nothing is cached: every count is one aggregate query, and a cache
would need an event from every write to stay true.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from memorymap.ai import notebook_stats
from memorymap.core import deps, usage
from memorymap.core.config import user_now
from memorymap.core.deps import get_session

router = APIRouter(tags=["statistics"])


@router.get("/statistics")
def statistics(session: Session = Depends(get_session)) -> dict:
    config = deps.get_config()
    return notebook_stats.page(session, user_now(config), usage.summary(config.data_dir, []))
