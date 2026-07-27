"""Preferences, audit-log viewer, data export, and recycle-bin
maintenance (plan Phase 4).
"""

from __future__ import annotations

import csv
import io
import json
import re
import zipfile
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap import __version__
from memorymap.ai import embeddings
from memorymap.core import backup, deps, logbuffer
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


class PersonaItem(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    prompt: str = Field(min_length=1, max_length=2000)


class SkillItem(BaseModel):
    """A saved prompt shortcut for the chat tab (Wave G)."""

    name: str = Field(min_length=1, max_length=40)
    prompt: str = Field(min_length=1, max_length=2000)


class PreferencesBody(BaseModel):
    recycle_bin_days: int | None = Field(default=None, ge=1, le=365)
    communication_style: Literal["friendly", "concise", "detailed"] | None = None
    # Display name for the dashboard greeting (empty string clears it).
    display_name: str | None = Field(default=None, max_length=60)
    # Optional context about the user for the librarian (Phase 5).
    # profile_enabled is the opt-out switch; the delete button in the UI
    # simply saves an empty string.
    user_profile: str | None = Field(default=None, max_length=2000)
    profile_enabled: bool | None = None
    # Capture templates (Wave B): user-defined prefills for the note box.
    custom_templates: list[TemplateItem] | None = Field(default=None, max_length=20)
    # Personas (Wave C): custom system prompts + which one is active.
    personas: list[PersonaItem] | None = Field(default=None, max_length=20)
    active_persona: str | None = Field(default=None, max_length=40)
    # Dashboard layout (Wave D): widget order + hidden widgets.
    dashboard_layout: "DashboardLayout | None" = None
    # Wave G: user-defined skills, and whether the chat AI may use tools.
    skills: list[SkillItem] | None = Field(default=None, max_length=30)
    tools_enabled: bool | None = None
    # Wave F: the ONE feature that goes online — off unless the user opts in.
    web_search_enabled: bool | None = None
    # Optional self-hosted SearXNG instance; empty string = use DuckDuckGo.
    searxng_url: str | None = Field(default=None, max_length=200)
    # Wave O: agent tools the user has switched off (by tool name).
    disabled_tools: list[str] | None = Field(default=None, max_length=50)
    # The user's IANA timezone, reported by the browser at startup. Anything
    # the AI reasons about in time ("in 10 minutes", "tomorrow at 9") is
    # resolved against this, because the server may be running in UTC while
    # the person is not. Validated on the way in — an unknown zone name would
    # otherwise sit in preferences and silently fall back forever.
    timezone: str | None = Field(default=None, max_length=64)

    @field_validator("timezone")
    @classmethod
    def _known_timezone(cls, value: str | None) -> str | None:
        if not value:
            return value
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError(f"Unknown timezone {value!r}") from exc
        return value
    # Named filters the user has saved from the Notes tab.
    saved_searches: list["SavedSearch"] | None = Field(default=None, max_length=30)


class SavedSearch(BaseModel):
    """A named filter, e.g. {"name": "This week's work", "query": "tag:work"}."""

    name: str = Field(min_length=1, max_length=40)
    query: str = Field(min_length=1, max_length=200)


class DashboardLayout(BaseModel):
    order: list[str] = Field(default_factory=list, max_length=20)
    hidden: list[str] = Field(default_factory=list, max_length=20)
    # Widgets the user has set to span two grid columns.
    wide: list[str] = Field(default_factory=list, max_length=20)
    # Older layouts stored the same thing as {"stats": "wide"}. Kept so a
    # layout saved before the switch still loads; the frontend folds it into
    # `wide` and writes the list form back on the next save.
    sizes: dict[str, str] = Field(default_factory=dict)


@router.get("/preferences")
def get_preferences() -> dict:
    config = deps.get_config()
    return {
        "recycle_bin_days": config.get_preference("recycle_bin_days", 30),
        "communication_style": config.get_preference("communication_style", "friendly"),
        "display_name": config.get_preference("display_name", ""),
        "user_profile": config.get_preference("user_profile", ""),
        "profile_enabled": config.get_preference("profile_enabled", False),
        "custom_templates": config.get_preference("custom_templates", []),
        "personas": config.get_preference("personas", []),
        "active_persona": config.get_preference("active_persona", "Librarian"),
        "dashboard_layout": config.get_preference(
            "dashboard_layout", {"order": [], "hidden": []}
        ),
        "skills": config.get_preference("skills", []),
        "tools_enabled": config.get_preference("tools_enabled", True),
        "web_search_enabled": config.get_preference("web_search_enabled", False),
        "searxng_url": config.get_preference("searxng_url", ""),
        "disabled_tools": config.get_preference("disabled_tools", []),
        "saved_searches": config.get_preference("saved_searches", []),
        # Echoed back so the browser can tell whether the zone it just
        # detected is already the stored one, and skip a pointless write on
        # every startup.
        "timezone": config.get_preference("timezone", ""),
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
                # Exports decrypt while the app is unlocked. An export is for
                # taking your notes elsewhere, and ciphertext with no key is
                # not your notes. (The app's own backups keep the database
                # file as-is, so those stay encrypted.)
                "content": manager.readable_content(e),
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
            {
                "id": link.id,
                "source_entry_id": link.source_entry_id,
                "target_entry_id": link.target_entry_id,
            }
            for link in links
        ],
    }
    manager.log_action(session, "exported", "data", detail="json")
    session.commit()
    return Response(
        content=json.dumps(payload, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=memorymap-export.json"},
    )


def _slug(text: str, length: int = 30) -> str:
    """A filesystem-safe slice of a note's first words."""
    cleaned = re.sub(r"[^\w\s-]", "", text)[:length].strip()
    return re.sub(r"[\s]+", "-", cleaned) or "note"


@router.get("/export/markdown")
def export_markdown(session: Session = Depends(get_session)) -> Response:
    """A zip of Obsidian-friendly .md files: one file per note, one
    folder per category, YAML frontmatter carrying the metadata. Binned
    notes go under _recycle-bin/ — exports never silently drop data."""
    _categories, entries, _links = _export_rows(session)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for entry in entries:
            folder = (
                "_recycle-bin"
                if entry.is_deleted
                else _slug(manager.category_name_for(session, entry), 40)
            )
            tags = manager.entry_tags(entry)
            front = [
                "---",
                f"category: {manager.category_name_for(session, entry)}",
                f"created: {entry.created_at.isoformat()}",
            ]
            if tags:
                front.append(f"tags: [{', '.join(tags)}]")
            if entry.pinned:
                front.append("pinned: true")
            front.append("---")
            readable = manager.readable_content(entry)
            body = "\n".join(front) + f"\n\n{readable}\n"
            archive.writestr(f"{folder}/{entry.id}-{_slug(readable)}.md", body)
    manager.log_action(session, "exported", "data", detail="markdown")
    session.commit()
    return Response(
        content=buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=memorymap-markdown.zip"},
    )


MAX_IMPORT_BYTES = 1024 * 1024  # a single markdown note, not a novel


def _parse_frontmatter(text: str) -> tuple[dict, str]:
    """(metadata, body). Understands the small subset this app writes:
    `category: X` and `tags: [a, b]`. Anything else is left in the body
    untouched — imports must never eat someone's text."""
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---\n", 4)
    if end == -1:
        return {}, text
    meta: dict = {}
    for line in text[4:end].splitlines():
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        key, value = key.strip().lower(), value.strip()
        if key == "category" and value:
            meta["category"] = value
        elif key == "tags":
            meta["tags"] = [t.strip() for t in value.strip("[]").split(",") if t.strip()]
    return meta, text[end + 5 :].lstrip("\n")


@router.post("/import/markdown", status_code=201)
def import_markdown(
    files: list[UploadFile], session: Session = Depends(get_session)
) -> dict:
    """Turn uploaded .md files into notes (Obsidian-friendly: the same
    frontmatter the export writes is understood on the way back in)."""
    imported = 0
    skipped: list[str] = []
    for file in files:
        raw = file.file.read(MAX_IMPORT_BYTES + 1)
        name = file.filename or "note.md"
        if len(raw) > MAX_IMPORT_BYTES:
            skipped.append(f"{name}: larger than 1 MB")
            continue
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            skipped.append(f"{name}: not a text file")
            continue
        meta, body = _parse_frontmatter(text)
        if not body.strip():
            skipped.append(f"{name}: empty")
            continue
        entry = manager.create_entry(
            session,
            body.strip(),
            category_name=meta.get("category") or manager.UNCATEGORISED,
            tags=meta.get("tags") or [],
            ai_confidence=100 if meta.get("category") else 0,
        )
        if meta.get("category"):
            entry.user_filed = True  # the file said where it belongs
            session.commit()
        embeddings.store_quietly(session, entry)
        imported += 1
    manager.log_action(session, "imported", "data", detail=f"markdown x{imported}")
    session.commit()
    return {"imported": imported, "skipped": skipped}


# --- web search (Wave F) -----------------------------------------------------------


def _require_web_search() -> str:
    """403 while the preference is off so nothing can quietly go online.
    Returns the configured SearXNG URL ('' = use DuckDuckGo)."""
    config = deps.get_config()
    if not config.get_preference("web_search_enabled", False):
        raise HTTPException(
            status_code=403,
            detail="Web search is turned off. Enable it in Settings → Preferences "
            "(this is the one feature that goes online).",
        )
    return str(config.get_preference("searxng_url", "") or "")


@router.get("/websearch")
def web_search(q: str, limit: int = 5, session: Session = Depends(get_session)) -> dict:
    """Opt-in web lookup via SearXNG (if configured) or DuckDuckGo."""
    from memorymap.search import websearch

    searxng = _require_web_search()
    try:
        results = websearch.search_web(q, limit=max(1, min(limit, 10)), searxng_url=searxng or None)
    except websearch.WebSearchError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    manager.log_action(session, "web_searched", "chat", detail=q[:120])
    session.commit()
    return {
        "query": q,
        "results": results,
        "provider": results[0]["engine"] if results else ("searxng" if searxng else "duckduckgo"),
    }


@router.post("/websearch/detect-searxng")
def detect_searxng(url: str = "", session: Session = Depends(get_session)) -> dict:
    """Test a SearXNG URL, or scan the usual local ports for one.

    Saves the working URL to preferences so the user never has to know how the
    connection is wired up — if they have an instance running, this finds it.
    """
    from memorymap.search import websearch

    config = deps.get_config()
    if url:
        found = url.rstrip("/") if websearch.probe_searxng(url) else None
    else:
        found = websearch.discover_searxng()

    if not found:
        return {
            "found": False,
            "detail": "No SearXNG found. Start one (see the setup note) and try again.",
        }
    config.set_preference("searxng_url", found)
    websearch.clear_cache()  # results from the old provider are stale now
    manager.log_action(session, "edited", "preferences", detail=f"searxng_url={found}")
    session.commit()
    return {"found": True, "url": found}


@router.get("/websearch/searxng/status")
def searxng_status() -> dict:
    """Is a MemoryMap-managed SearXNG installed, running, and answering?"""
    from memorymap.search import searxng_manager

    return searxng_manager.status(deps.get_config().data_dir)


@router.post("/websearch/searxng/start")
def searxng_start(session: Session = Depends(get_session)) -> dict:
    """Run SearXNG for the user and switch web search over to it."""
    from memorymap.search import searxng_manager, websearch

    config = deps.get_config()
    try:
        result = searxng_manager.start(config.data_dir)
    except searxng_manager.SearxngError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    config.set_preference("searxng_url", result["url"])
    websearch.clear_cache()
    manager.log_action(session, "edited", "preferences", detail="searxng started")
    session.commit()
    return {"running": True, **result}


@router.post("/websearch/searxng/stop")
def searxng_stop(session: Session = Depends(get_session)) -> dict:
    """Stop the managed instance and fall back to DuckDuckGo."""
    from memorymap.search import searxng_manager, websearch

    config = deps.get_config()
    try:
        result = searxng_manager.stop(config.data_dir)
    except searxng_manager.SearxngError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    # Point search back at DuckDuckGo so nothing tries the dead instance.
    config.set_preference("searxng_url", "")
    websearch.clear_cache()
    manager.log_action(session, "edited", "preferences", detail="searxng stopped")
    session.commit()
    return {"running": False, **result}


@router.get("/websearch/read")
def web_read(url: str, session: Session = Depends(get_session)) -> dict:
    """Fetch a page as plain readable text.

    Deliberately not an embedded browser: the page is stripped to text on the
    server, so no third-party script, tracker, or iframe ever runs in the app.
    """
    from memorymap.search import websearch

    _require_web_search()

    # A cheap shape check for a clean 400; the security check that matters is
    # in fetch_readable, which re-runs it on every redirect hop.
    #
    # There is deliberately NO host allowlist here. One was added briefly and
    # it only permitted the search engines themselves — but the reader exists
    # to open the *results*, which live on whatever site published them, so it
    # rejected every real page with "URL host is not allowed".
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise HTTPException(status_code=400, detail="Only http(s) URLs are allowed")

    try:
        page = websearch.fetch_readable(url)
    except websearch.WebSearchError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    manager.log_action(session, "web_read", "chat", detail=url[:120])
    session.commit()
    return page


# --- backups (Wave F) --------------------------------------------------------------


@router.get("/storage")
def storage_location() -> dict:
    """Where everything actually lives on disk.

    "Where are my documents stored?" was asked outright, and the app had no
    answer anywhere in its interface. For a local-first app that is close to
    the whole promise: a notebook you can't locate is not obviously yours,
    and someone who can't see the file has no reason to believe a document
    they wrote is still there.
    """
    config = deps.get_config()
    db_path = Path(config.db_path)
    return {
        "data_dir": str(Path(config.data_dir).resolve()),
        "database": str(db_path.resolve()),
        "database_bytes": db_path.stat().st_size if db_path.exists() else 0,
        "backups_dir": str(backup.backups_dir(config.data_dir).resolve()),
    }


@router.get("/backups")
def list_backups() -> list[dict]:
    return backup.list_backups(deps.get_config().data_dir)


@router.post("/backups", status_code=201)
def backup_now(session: Session = Depends(get_session)) -> dict:
    config = deps.get_config()
    path = backup.backup_now(config.db_path, config.data_dir)
    manager.log_action(session, "backed_up", "data", detail=path.name)
    session.commit()
    return {"name": path.name}


class RestoreBody(BaseModel):
    name: str = Field(min_length=1, max_length=120)


@router.post("/backups/restore")
def restore_backup(body: RestoreBody) -> dict:
    """Swap the live database for a backup. A safety snapshot of the
    current state is taken first, so a restore is itself undoable."""
    config = deps.get_config()
    # Every connection must be closed while the file is replaced.
    deps.get_db().engine.dispose()
    try:
        backup.restore_backup(body.name, config.db_path, config.data_dir)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    finally:
        deps.reload_db()
    session = deps.get_db().session()
    try:
        manager.log_action(session, "restored", "data", detail=body.name)
        session.commit()
    finally:
        session.close()
    return {"restored": body.name}


@router.delete("/backups/{name}")
def delete_backup(name: str) -> dict:
    folder = backup.backups_dir(deps.get_config().data_dir)
    path = folder / name
    # Path(name).name guards traversal; only files inside backups/ die.
    if path.name != name or not path.is_file():
        raise HTTPException(status_code=404, detail="Backup not found")
    path.unlink()
    return {"deleted": name}


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
                manager.readable_content(e),
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
