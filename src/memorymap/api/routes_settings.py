"""Preferences, audit-log viewer, data export, and recycle-bin
maintenance (plan Phase 4).
"""

from __future__ import annotations

import csv
import io
import json
from typing import Literal

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap import __version__
from memorymap.core import deps, logbuffer
from memorymap.core.database import AuditLog, Category, Entry, EntryLink, utcnow
from memorymap.core.deps import get_session
from memorymap.entry import manager

router = APIRouter(tags=["settings"])

# Preferences the user may change from the UI — a deliberate allowlist
# so a stray request can't scribble on model settings (those have their
# own validated endpoints in routes_models).
class TemplateItem(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    content: str = Field(max_length=2000)


class PreferencesBody(BaseModel):
    recycle_bin_days: int | None = Field(default=None, ge=1, le=365)
    communication_style: Literal["friendly", "concise", "detailed"] | None = None
    # Optional context about the user for the librarian (Phase 5).
    # profile_enabled is the opt-out switch; the delete button in the UI
    # simply saves an empty string.
    user_profile: str | None = Field(default=None, max_length=2000)
    profile_enabled: bool | None = None
    # Capture templates (Wave B): user-defined prefills for the note box.
    custom_templates: list[TemplateItem] | None = Field(default=None, max_length=20)


@router.get("/preferences")
def get_preferences() -> dict:
    config = deps.get_config()
    return {
        "recycle_bin_days": config.get_preference("recycle_bin_days", 30),
        "communication_style": config.get_preference("communication_style", "friendly"),
        "user_profile": config.get_preference("user_profile", ""),
        "profile_enabled": config.get_preference("profile_enabled", False),
        "custom_templates": config.get_preference("custom_templates", []),
    }


@router.put("/preferences")
def update_preferences(
    body: PreferencesBody, session: Session = Depends(get_session)
) -> dict:
    config = deps.get_config()
    for key, value in body.model_dump(exclude_none=True).items():
        config.set_preference(key, value)
        # Don't copy profile text into the audit log — it's personal.
        detail = f"{key}=…" if key == "user_profile" else f"{key}={value}"
        manager.log_action(session, "edited", "preferences", detail=detail)
    session.commit()
    return get_preferences()


@router.get("/audit")
def audit_log(limit: int = 100, session: Session = Depends(get_session)) -> list[dict]:
    """The activity log, newest first (viewer in the UI)."""
    rows = session.scalars(
        select(AuditLog).order_by(AuditLog.id.desc()).limit(min(limit, 500))
    )
    return [
        {
            "id": row.id,
            "action": row.action,
            "entity_type": row.entity_type,
            "entity_id": row.entity_id,
            "detail": row.detail,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]


@router.post("/recycle-bin/empty")
def empty_recycle_bin(session: Session = Depends(get_session)) -> dict:
    removed = manager.empty_recycle_bin(
        session, uploads_dir=deps.get_config().uploads_dir
    )
    return {"removed": removed}


@router.get("/logs")
def server_logs(limit: int = 200) -> list[dict]:
    """Recent server-side log records for the Settings → Logs viewer."""
    return logbuffer.recent(limit=min(limit, logbuffer.MAX_RECORDS))


@router.delete("/logs")
def clear_server_logs() -> dict:
    logbuffer.clear()
    return {"cleared": True}


def _export_rows(session: Session) -> tuple[list[Category], list[Entry], list[EntryLink]]:
    """Everything the user owns, including binned entries — an export
    should never silently drop data."""
    categories = list(session.scalars(select(Category).order_by(Category.id)))
    entries = list(session.scalars(select(Entry).order_by(Entry.id)))
    links = list(session.scalars(select(EntryLink).order_by(EntryLink.id)))
    return categories, entries, links


@router.get("/export/json")
def export_json(session: Session = Depends(get_session)) -> Response:
    categories, entries, links = _export_rows(session)
    payload = {
        "app": "MemoryMap AI",
        "version": __version__,
        "exported_at": utcnow().isoformat(),
        "categories": [{"id": c.id, "name": c.name} for c in categories],
        "entries": [
            {
                "id": e.id,
                "content": e.content,
                "category": manager.category_name_for(session, e),
                "tags": manager.entry_tags(e),
                "ai_confidence": e.ai_confidence,
                "created_at": e.created_at.isoformat(),
                "updated_at": e.updated_at.isoformat(),
                "is_deleted": e.is_deleted,
                "deleted_at": e.deleted_at.isoformat() if e.deleted_at else None,
            }
            for e in entries
        ],
        "links": [
            {"id": l.id, "source_entry_id": l.source_entry_id, "target_entry_id": l.target_entry_id}
            for l in links
        ],
    }
    manager.log_action(session, "exported", "data", detail="json")
    session.commit()
    return Response(
        content=json.dumps(payload, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=memorymap-export.json"},
    )


@router.get("/export/csv")
def export_csv(session: Session = Depends(get_session)) -> Response:
    _categories, entries, _links = _export_rows(session)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["id", "content", "category", "tags", "ai_confidence", "created_at", "is_deleted"]
    )
    for e in entries:
        writer.writerow(
            [
                e.id,
                e.content,
                manager.category_name_for(session, e),
                "|".join(manager.entry_tags(e)),
                e.ai_confidence,
                e.created_at.isoformat(),
                e.is_deleted,
            ]
        )
    manager.log_action(session, "exported", "data", detail="csv")
    session.commit()
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=memorymap-export.csv"},
    )
