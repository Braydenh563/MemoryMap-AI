"""Dashboard insights (Wave D): stats, on-this-day, weekly digest."""

from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from memorymap.ai import librarian
from memorymap.core import deps
from memorymap.core.database import Category, Entry, utcnow
from memorymap.core.deps import get_session
from memorymap.entry import manager

router = APIRouter(prefix="/insights", tags=["insights"])

ACTIVITY_DAYS = 14  # the dashboard's little activity strip


@router.get("/stats")
def stats(session: Session = Depends(get_session)) -> dict:
    total = session.scalar(
        select(func.count(Entry.id)).where(Entry.is_deleted == False)  # noqa: E712
    )
    by_category = session.execute(
        select(Category.name, func.count(Entry.id))
        .join(Entry, Entry.category_id == Category.id)
        .where(Entry.is_deleted == False)  # noqa: E712
        .group_by(Category.name)
        .order_by(func.count(Entry.id).desc())
    ).all()

    # Entries per day for the activity strip, oldest day first.
    start = utcnow() - timedelta(days=ACTIVITY_DAYS - 1)
    recent = session.scalars(
        select(Entry).where(
            Entry.is_deleted == False,  # noqa: E712
            Entry.created_at >= start.replace(hour=0, minute=0, second=0),
        )
    )
    per_day = [0] * ACTIVITY_DAYS
    today = utcnow().date()
    for entry in recent:
        offset = (today - entry.created_at.date()).days
        if 0 <= offset < ACTIVITY_DAYS:
            per_day[ACTIVITY_DAYS - 1 - offset] += 1

    return {
        "total_entries": total or 0,
        "categories": [{"name": name, "count": count} for name, count in by_category],
        "per_day": per_day,
        "days": ACTIVITY_DAYS,
    }


@router.get("/on-this-day")
def on_this_day(session: Session = Depends(get_session)) -> list[dict]:
    """Notes captured on today's date in earlier months/years — a gentle
    resurfacing of old thoughts (from the original idea doc)."""
    now = utcnow()
    matches = []
    for entry in session.scalars(
        select(Entry).where(Entry.is_deleted == False)  # noqa: E712
    ):
        created = entry.created_at
        same_day = created.day == now.day
        old_enough = (now.date() - created.date()).days >= 28
        if same_day and old_enough:
            matches.append(
                {
                    "id": entry.id,
                    "content": entry.content,
                    "category": manager.category_name_for(session, entry),
                    "created_at": created.isoformat(),
                }
            )
    return matches[:5]


@router.post("/digest")
def weekly_digest(session: Session = Depends(get_session)) -> dict:
    """An on-demand AI recap of the last 7 days (reads only)."""
    cutoff = utcnow() - timedelta(days=7)
    entries = list(
        session.scalars(
            select(Entry)
            .where(Entry.is_deleted == False, Entry.created_at >= cutoff)  # noqa: E712
            .order_by(Entry.created_at)
            .limit(30)
        )
    )
    if not entries:
        # A real, stable fact — safe for the UI to cache for the day.
        return {
            "digest": "Nothing was saved in the last 7 days.",
            "thinking": None,
            "cacheable": True,
        }

    notes = [
        {"content": e.content, "category": manager.category_name_for(session, e)}
        for e in entries
    ]
    config = deps.get_config()
    # Only a genuine AI answer is worth caching — if Ollama is down the
    # digest is just the offline notice, which should be retried, not
    # frozen for the day (Wave J follow-up).
    ollama_running = deps.get_ollama().is_running()
    digest, thinking = librarian.answer(
        "Give me a short digest of what I saved this week — group by topic and "
        "call out anything that looks important or unfinished.",
        notes,
        deps.get_model_manager(),
        deps.get_ollama(),
        style=config.get_preference("communication_style", "friendly"),
        persona_prompt=None,
        use_utility_model=True,  # a background job — keep the chat model free
    )
    return {"digest": digest, "thinking": thinking, "cacheable": ollama_running}
