"""Reminders (Wave D): create, list, tick off, delete.

Local-only — the browser fires the notification while the app is open;
nothing runs in the cloud.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import Literal

from memorymap.core import deps
from memorymap.core.database import Entry, Reminder, utcnow
from memorymap.core.deps import get_session
from memorymap.entry.manager import log_action

router = APIRouter(prefix="/reminders", tags=["reminders"])

Priority = Literal["low", "normal", "high"]
Recurring = Literal["none", "daily", "weekly", "monthly"]


class ReminderCreate(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    due_at: datetime
    entry_id: int | None = None
    priority: Priority = "normal"
    recurring: Recurring = "none"


class MagicAddBody(BaseModel):
    text: str = Field(min_length=1, max_length=300)
    # Minutes east of UTC, as the browser reports it. "Tomorrow evening" has to
    # be resolved against the user's clock, not the server's — without this the
    # model was told the time in UTC and every relative time landed hours out.
    tz_offset_minutes: int | None = Field(default=None, ge=-840, le=840)


class ReminderUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1, max_length=500)
    due_at: datetime | None = None
    done: bool | None = None
    priority: Priority | None = None
    recurring: Recurring | None = None


def _to_out(session: Session, reminder: Reminder) -> dict:
    entry_preview = None
    if reminder.entry_id is not None:
        entry = session.get(Entry, reminder.entry_id)
        if entry is not None and not entry.is_deleted:
            content = entry.content
            entry_preview = content if len(content) <= 60 else content[:59] + "…"
    return {
        "id": reminder.id,
        "text": reminder.text,
        "due_at": reminder.due_at.isoformat(),
        "done": reminder.done,
        "entry_id": reminder.entry_id,
        "entry_preview": entry_preview,
        "priority": reminder.priority,
        "recurring": reminder.recurring,
    }


def _existing(session: Session, reminder_id: int) -> Reminder:
    reminder = session.get(Reminder, reminder_id)
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder


@router.get("")
def list_reminders(session: Session = Depends(get_session)) -> list[dict]:
    """All reminders, soonest first; the frontend groups them."""
    rows = session.scalars(select(Reminder).order_by(Reminder.due_at))
    return [_to_out(session, r) for r in rows]


@router.post("", status_code=201)
def create_reminder(body: ReminderCreate, session: Session = Depends(get_session)) -> dict:
    if body.entry_id is not None and session.get(Entry, body.entry_id) is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    reminder = Reminder(
        text=body.text,
        due_at=body.due_at,
        entry_id=body.entry_id,
        priority=body.priority,
        recurring=body.recurring,
    )
    session.add(reminder)
    session.flush()
    log_action(session, "created", "reminder", reminder.id, body.text[:80])
    session.commit()
    return _to_out(session, reminder)


@router.post("/parse", status_code=201)
def magic_add_reminder(body: MagicAddBody, session: Session = Depends(get_session)) -> dict:
    """Magic Add: parse natural language into a reminder and create it.

    Needs the local model running; returns 503 otherwise so the UI can point
    the user at the manual form.
    """
    from memorymap.ai import reminder_parser

    ollama = deps.get_ollama()
    if not ollama.is_running():
        raise HTTPException(
            status_code=503,
            detail="The local AI isn't running — add the reminder with the form instead.",
        )
    offset = timedelta(minutes=body.tz_offset_minutes or 0)
    # Give the model the wall-clock time the user sees, then put the answer
    # back on the UTC clock everything else is stored in.
    local_now = utcnow() + offset
    parsed = reminder_parser.parse_reminder(
        body.text, ollama, deps.get_model_manager(), local_now
    )
    due_at = parsed["due_at"]
    if due_at.tzinfo is None:
        # The model answered in local wall-clock time, as it was asked to.
        due_at = due_at.replace(tzinfo=timezone.utc) - offset
    else:
        # It volunteered an offset. Trust it, but store UTC like everything else.
        due_at = due_at.astimezone(timezone.utc)
    reminder = Reminder(
        text=parsed["text"], due_at=due_at, priority=parsed["priority"]
    )
    session.add(reminder)
    session.flush()
    log_action(session, "created", "reminder", reminder.id, parsed["text"][:80])
    session.commit()
    return _to_out(session, reminder)


@router.put("/{reminder_id}")
def update_reminder(
    reminder_id: int, body: ReminderUpdate, session: Session = Depends(get_session)
) -> dict:
    reminder = _existing(session, reminder_id)
    if body.text is not None:
        reminder.text = body.text
    if body.due_at is not None:
        reminder.due_at = body.due_at
    if body.priority is not None:
        reminder.priority = body.priority
    if body.recurring is not None:
        reminder.recurring = body.recurring
    if body.done is not None and body.done != reminder.done:
        reminder.done = body.done
        log_action(
            session,
            "edited",
            "reminder",
            reminder.id,
            "done" if body.done else "reopened",
        )
    session.commit()
    return _to_out(session, reminder)


@router.delete("/{reminder_id}")
def delete_reminder(reminder_id: int, session: Session = Depends(get_session)) -> dict:
    reminder = _existing(session, reminder_id)
    log_action(session, "deleted", "reminder", reminder.id)
    session.delete(reminder)
    session.commit()
    return {"deleted": True}
