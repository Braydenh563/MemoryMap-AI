"""Preferences, audit-log viewer, data export, and recycle-bin
maintenance (plan Phase 4).
"""

from __future__ import annotations

import asyncio
import csv
import io
import json
import platform
import re
import sys
import tempfile
import zipfile
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from memorymap import __version__
from memorymap.ai import skills
from memorymap.core import backup, deps, embedmodels, extras, logbuffer
from memorymap.core.database import AuditLog, Category, Entry, EntryLink, utcnow
from memorymap.core.deps import get_session
from memorymap.entry import importer, manager
from memorymap.search import searxng_manager, websearch

router = APIRouter(tags=["settings"])

# Preferences the user may change from the UI — a deliberate allowlist
# so a stray request can't scribble on model settings (those have their
# own validated endpoints in routes_models).
class TemplateItem(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    content: str = Field(max_length=2000)
    # Optional one-liner shown in the Settings list and as the entry-template
    # option's tooltip — same shape as SkillItem.description below.
    description: str = Field(default="", max_length=200)


# Kept in sync by hand with BUILTIN_TEMPLATES in app.js. The templates
# themselves (their markdown bodies) only ever lived in the frontend — Wave
# B never gave the server a reason to know their content — but the NAMES
# have to be known here too, or a custom template called "Journal" would
# save fine and only collide with the shipped one client-side, in whichever
# session happens to render the <select> next.
BUILTIN_TEMPLATE_NAMES = {"Journal", "Recipe", "Contact", "Meeting"}


class PersonaItem(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    prompt: str = Field(min_length=1, max_length=2000)


class CustomThemeItem(BaseModel):
    """One saved look: the appearance settings the browser would have applied.

    `values` is deliberately a free-form string map rather than a model with a
    field per setting. The appearance controls live entirely in the frontend
    and are the only thing that knows what a key means — pinning the list here
    would mean a saved theme could not carry a setting added later without a
    matching server change, for a value the server never reads.

    It is *bounded* rather than trusted: a cap on how many keys, and on how
    long each is, so a stored theme cannot become an arbitrary blob in the
    preferences file.
    """

    name: str = Field(min_length=1, max_length=30)
    values: dict[str, str] = Field(default_factory=dict)
    preset: str = Field(default="", max_length=40)

    @field_validator("values")
    @classmethod
    def _bounded(cls, values: dict) -> dict:
        if len(values) > 40:
            raise ValueError("a theme carries at most 40 settings")
        for key, value in values.items():
            if len(str(key)) > 40 or len(str(value)) > 200:
                raise ValueError("theme settings must be short strings")
        return values


class SkillInput(BaseModel):
    """One value a skill asks for before it runs (§21)."""

    name: str = Field(min_length=1, max_length=24)
    label: str = Field(default="", max_length=60)
    required: bool = True
    default: str = Field(default="", max_length=skills.MAX_INPUT_VALUE)


class SkillItem(BaseModel):
    """A named, repeatable job over the notebook (§21).

    `prompt` alone is the whole of a pre-rebuild skill, and still valid — the
    steps, tools and inputs are what make it a job rather than a saved
    sentence. The real rules live in `ai/skills.normalise`, which the route
    applies as well, so the tool path and the settings path can't drift.
    """

    name: str = Field(min_length=1, max_length=skills.MAX_NAME)
    prompt: str = Field(min_length=1, max_length=skills.MAX_PROMPT)
    description: str = Field(default="", max_length=skills.MAX_DESCRIPTION)
    # When this skill applies. What makes it findable by the model rather than
    # only by the person who remembered writing it (§33).
    when_to_use: str = Field(default="", max_length=skills.MAX_WHEN)
    steps: list[str] = Field(default_factory=list, max_length=skills.MAX_STEPS)
    tools: list[str] = Field(default_factory=list, max_length=skills.MAX_TOOLS)
    inputs: list[SkillInput] = Field(default_factory=list, max_length=skills.MAX_INPUTS)
    # Pre-rebuild flag the UI still reads; derived on save from steps/tools.
    useTools: bool = False  # noqa: N815 — the stored key, kept for old skills


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
    # Saved appearance looks. Server-side rather than in the browser because a
    # theme someone built by hand is a thing they would be upset to lose to a
    # cleared cache — and here it rides along in the daily backup too.
    custom_themes: list[CustomThemeItem] | None = Field(default=None, max_length=20)
    # Dashboard layout (Wave D): widget order + hidden widgets.
    dashboard_layout: "DashboardLayout | None" = None
    # Wave G: user-defined skills, and whether the chat AI may use tools.
    skills: list[SkillItem] | None = Field(default=None, max_length=30)
    tools_enabled: bool | None = None
    # The local-AI lock (§33). On by default; see core.config.
    local_only_ai: bool | None = None
    # Which tools each turn is offered: "auto" reads the question and sends
    # what it plausibly needs (§11a — the schemas are most of the per-round
    # cost); "all" sends the whole registry, as it always did.
    tool_focus: Literal["auto", "all"] | None = None
    # Wave F: the ONE feature that goes online — off unless the user opts in.
    web_search_enabled: bool | None = None
    searxng_autostart: bool | None = None
    # Optional self-hosted SearXNG instance; empty string = use DuckDuckGo.
    searxng_url: str | None = Field(default=None, max_length=200)
    # Which engine answers: "auto" | "searxng" | "duckduckgo". Validated
    # rather than free text, so a bad value is rejected at the door instead of
    # sitting in preferences quietly meaning "auto" forever.
    search_provider: str | None = None
    # Autonomous Tasks settings. These were declared twice — once here with
    # bare types and once above with the validated ones — and Pydantic silently
    # keeps the last definition, so the bounds below were the only ones that
    # ever applied. One copy, the validated one.
    autonomous_tasks_enabled: bool | None = None
    auto_tag_enabled: bool | None = None
    auto_link_enabled: bool | None = None
    auto_dedupe_enabled: bool | None = None
    autonomous_tasks_interval_hours: int | None = Field(default=None, ge=1, le=168)
    autonomous_tasks_model: str | None = Field(default=None, max_length=100)
    battery_efficient_mode: bool | None = None
    smart_model_routing_enabled: bool | None = None
    # Asked directly: a way to quiet toasts and the notifications panel for
    # background jobs, agent runs and general activity while a due reminder
    # still gets through either way.
    notifications_muted_except_reminders: bool | None = None
    # Wave O: agent tools the user has switched off (by tool name).
    disabled_tools: list[str] | None = Field(default=None, max_length=50)
    # The user's IANA timezone, reported by the browser at startup. Anything
    # the AI reasons about in time ("in 10 minutes", "tomorrow at 9") is
    # resolved against this, because the server may be running in UTC while
    # the person is not. Validated on the way in — an unknown zone name would
    # otherwise sit in preferences and silently fall back forever.
    timezone: str | None = Field(default=None, max_length=64)
    # The interface's own local state — theme, palette, corner rounding,
    # whether onboarding has been seen (§35E). A flat map of short strings,
    # deliberately: this is the browser's `localStorage` mirrored so that a
    # shell which does not persist it still remembers. Validated for *shape*
    # rather than for meaning — the keys are the frontend's business and it
    # would be worse to have the server reject a setting the UI has just added
    # than to store a key nobody reads.
    ui_state: dict[str, str] | None = None

    @field_validator("ui_state")
    @classmethod
    def _small_ui_state(cls, value: dict | None) -> dict | None:
        """A bounded map. Nothing here should ever be large, and a preference
        file that can be grown without limit from the browser is a way to fill
        a disk."""
        if value is None:
            return value
        if len(value) > 60:
            raise ValueError("Too many interface settings")
        for key, item in value.items():
            if len(str(key)) > 40 or len(str(item)) > 400:
                raise ValueError(f"Interface setting {key!r} is too long")
        return value

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

    @field_validator("search_provider")
    @classmethod
    def _known_provider(cls, value: str | None) -> str | None:
        """Rejected at the door rather than normalised away, so a UI sending
        the wrong name finds out instead of silently getting "auto"."""
        if value is None:
            return value
        if value not in websearch.PROVIDERS:
            raise ValueError(
                f"Unknown search provider {value!r} — expected one of "
                + ", ".join(sorted(websearch.PROVIDERS))
            )
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
        "custom_themes": config.get_preference("custom_themes", []),
        "active_persona": config.get_preference("active_persona", "Librarian"),
        "dashboard_layout": config.get_preference(
            "dashboard_layout", {"order": [], "hidden": []}
        ),
        "skills": config.get_preference("skills", []),
        "tools_enabled": config.get_preference("tools_enabled", True),
        "local_only_ai": config.get_preference("local_only_ai", True),
        "tool_focus": config.get_preference("tool_focus", "auto"),
        "web_search_enabled": config.get_preference("web_search_enabled", False),
        "searxng_url": config.get_preference("searxng_url", ""),
        "searxng_autostart": config.get_preference("searxng_autostart", False),
        "search_provider": websearch.normalise_provider(
            config.get_preference("search_provider", websearch.DEFAULT_PROVIDER)
        ),
        "disabled_tools": config.get_preference("disabled_tools", []),
        "saved_searches": config.get_preference("saved_searches", []),
        # Echoed back so the browser can tell whether the zone it just
        # detected is already the stored one, and skip a pointless write on
        # every startup.
        "timezone": config.get_preference("timezone", ""),
        # Everything the interface keeps in localStorage — the theme, the
        # palette, corner rounding, whether onboarding has been seen (§35E).
        #
        # **Reported as two bugs and it is one:** *"the theme resets to default
        # on every start"* and *"onboarding shows every time"*. Both were kept
        # in localStorage and nowhere else, and the desktop shell does not
        # reliably persist it — pywebview is a different browser with its own
        # profile, and if that profile is not stable across launches then every
        # setting stored there is a setting the app forgets.
        #
        # The browser still writes localStorage first: it is synchronous, it
        # works with the server unreachable, and it is what every existing
        # `appearancePref` read already goes through. This is the copy that
        # survives, seeded back on first load when the local one is empty.
        "ui_state": config.get_preference("ui_state", {}),
        # Reported (indirectly, this session): a preference that saves
        # correctly and is honoured correctly — `autonomous.py` and
        # `model_manager.py` both read these straight from storage — but
        # this response never echoed any of them back, so every Settings
        # checkbox bound to one of these showed unchecked again the moment
        # the page reloaded or the panel reopened, regardless of what was
        # actually saved. Defaults match the ones each reader already uses,
        # so a profile that never touched these sees the same value the
        # backend would have assumed anyway.
        "autonomous_tasks_enabled": config.get_preference("autonomous_tasks_enabled", False),
        "auto_tag_enabled": config.get_preference("auto_tag_enabled", True),
        "auto_link_enabled": config.get_preference("auto_link_enabled", True),
        "auto_dedupe_enabled": config.get_preference("auto_dedupe_enabled", True),
        "autonomous_tasks_interval_hours": config.get_preference(
            "autonomous_tasks_interval_hours", 6
        ),
        "autonomous_tasks_model": config.get_preference("autonomous_tasks_model", ""),
        "battery_efficient_mode": config.get_preference("battery_efficient_mode", False),
        "smart_model_routing_enabled": config.get_preference(
            "smart_model_routing_enabled", True
        ),
        "notifications_muted_except_reminders": config.get_preference(
            "notifications_muted_except_reminders", False
        ),
    }


#: Preferences the autonomous loop reads at the top of each pass. Changing
#: any of these should take effect on the loop's next tick, not its next
#: *scheduled* tick — which could be hours away — so writing one of these
#: wakes the loop early instead of leaving it asleep on a stale value.
_AUTONOMOUS_PREFS = frozenset(
    {
        "autonomous_tasks_enabled",
        "battery_efficient_mode",
        "autonomous_tasks_interval_hours",
        "auto_tag_enabled",
        "auto_link_enabled",
        "auto_dedupe_enabled",
    }
)


@router.put("/preferences")
def update_preferences(
    body: PreferencesBody, session: Session = Depends(get_session)
) -> dict:
    config = deps.get_config()
    changed_keys = set()
    for key, value in body.model_dump(exclude_none=True).items():
        if key == "skills":
            # One validator for both ways in. A skill saved from the editor
            # goes through exactly what `save_skill` goes through, so a skill
            # the AI can write is a skill the UI can write, and neither can
            # store one that won't run.
            value = _validated_skills(value)
        if key == "custom_templates":
            value = _validated_templates(value)
        config.set_preference(key, value)
        changed_keys.add(key)
        # Don't copy profile text into the audit log — it's personal.
        detail = f"{key}=…" if key == "user_profile" else f"{key}={value}"
        manager.log_action(session, "edited", "preferences", detail=detail)
    session.commit()
    if changed_keys & _AUTONOMOUS_PREFS:
        from memorymap.ai import autonomous

        autonomous.wake()
    return get_preferences()


def _validated_skills(raw: list[dict]) -> list[dict]:
    """Every skill, normalised — or a 422 naming the one that's wrong."""
    from memorymap.ai import tools

    known = set(tools.TOOLS)
    shipped = {skill["name"] for skill in skills.builtins()}
    out = []
    for item in raw:
        try:
            skill = skills.normalise(item, known)
        except skills.SkillError as exc:
            raise HTTPException(
                status_code=422, detail=f"“{item.get('name', '?')}”: {exc}"
            ) from exc
        if skill["name"] in shipped:
            raise HTTPException(
                status_code=422,
                detail=f"“{skill['name']}” is a built-in skill — pick another name",
            )
        out.append(skill)
    return out


def _validated_templates(raw: list[dict]) -> list[dict]:
    """Every custom template, name-checked — or a 422 naming the collision.

    Mirrors `_validated_skills` immediately above: a name that shadows a
    built-in is refused rather than silently allowed to win wherever the
    merged list is drawn next, and two customs can't collide with each other
    either. Rejecting (rather than de-duping, the way `addSkill` on the
    frontend quietly does for skills) was the deliberate choice here —
    silently dropping a *different* saved template because its name was
    reused would be a surprise deletion of someone's own text, which a
    skill's shorter prompt doesn't risk in the same way.
    """
    seen: set[str] = set()
    out = []
    for item in raw:
        name = (item.get("name") or "").strip()
        if name in BUILTIN_TEMPLATE_NAMES:
            raise HTTPException(
                status_code=422,
                detail=f"“{name}” is a built-in template — pick another name",
            )
        if name in seen:
            raise HTTPException(
                status_code=422,
                detail=f"“{name}” is already used by another template",
            )
        seen.add(name)
        out.append(item)
    return out


@router.get("/skills")
def list_skills() -> dict:
    """Everything runnable: the shipped skills and the user's own.

    The built-ins used to be a list in `app.js`, which meant the server could
    not resolve a skill the user had just clicked, and every field added to a
    skill had to be added in two places. Served from here for the same reason
    the web-search providers are: the interface cannot then offer something
    the API would reject.
    """
    from memorymap.ai import tools

    catalog = []
    for skill in skills.catalog(deps.get_config(), set(tools.TOOLS)):
        # "This one changes things" is a different question from "this one
        # uses tools", and the UI marks it as such. A skill with steps but no
        # declared tools could do anything, so it counts.
        catalog.append(
            {
                **skill,
                "changes": bool(set(skill["tools"]) & tools.WRITE_TOOLS)
                or (not skill["tools"] and bool(skill["steps"])),
            }
        )
    return {
        "skills": catalog,
        "limits": {
            "skills": skills.MAX_SKILLS,
            "steps": skills.MAX_STEPS,
            "tools": skills.MAX_TOOLS,
            "inputs": skills.MAX_INPUTS,
        },
    }


# --- the memory stream (ROADMAP §39B) ---------------------------------------------
#
# What the AI has been told to remember, and the ability to un-tell it.
#
# `save_user_preference` lets the model write standing instructions that it
# then receives in its own system prompt on every later turn. That is a useful
# feature and a slightly alarming one, because it shipped with no way to see
# the list: the assistant's behaviour could change permanently, for a reason
# the user could not inspect, edit or undo. A rule you cannot read is
# indistinguishable from the model simply behaving oddly.
#
# So: list them, switch one off, delete one. `active` is a toggle rather than
# only a delete because "stop doing this for now" and "you never should have
# saved that" are different intentions, and the agent already filters on it.


class PreferenceBody(BaseModel):
    content: str | None = Field(default=None, max_length=200)
    active: bool | None = None


def _preference_out(row) -> dict:  # noqa: ANN001 — a UserPreference
    return {
        "id": row.id,
        "content": row.content,
        "active": bool(row.active),
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("/memory")
def list_memory(session: Session = Depends(get_session)) -> dict:
    """Everything the AI has been told to remember, newest first."""
    from memorymap.ai import agent
    from memorymap.core.database import UserPreference

    rows = list(
        session.scalars(select(UserPreference).order_by(UserPreference.created_at.desc()))
    )
    return {
        "preferences": [_preference_out(r) for r in rows],
        # The UI says which of these actually reach the model. Only the active
        # ones do, and only until the character budget runs out — newest first,
        # so a long-standing list quietly stops including its oldest entries.
        # Showing the budget beats letting someone wonder why rule 41 is ignored.
        "budget_chars": agent.MEMORY_STREAM_BUDGET_CHARS,
        "in_prompt": len(agent._persona_with_memory(session, "").strip()),
    }


@router.post("/memory", status_code=201)
def add_memory(body: PreferenceBody, session: Session = Depends(get_session)) -> dict:
    """Write a standing instruction by hand.

    `save_user_preference` lets the *model* add one when you tell it something
    in conversation. This is the other direction, and it is the one people
    reach for first: "I want it to always do X" is a thing you know before you
    have had the conversation that would teach it.

    Same limits as the tool, deliberately — the cap exists because every active
    preference is replayed into the system prompt on every round, and that is
    true whoever typed it.
    """
    from memorymap.ai.tools import MAX_ACTIVE_PREFERENCES
    from memorymap.core.database import UserPreference

    text_ = (body.content or "").strip()
    if not text_:
        raise HTTPException(status_code=422, detail="A preference can't be empty.")

    active = list(
        session.scalars(
            select(UserPreference).where(UserPreference.active == True)  # noqa: E712
        )
    )
    if any((row.content or "").strip().lower() == text_.lower() for row in active):
        raise HTTPException(status_code=409, detail="That one is already saved.")
    if len(active) >= MAX_ACTIVE_PREFERENCES:
        raise HTTPException(
            status_code=409,
            detail=(
                f"There are already {len(active)} saved preferences, which is the "
                "limit. Turn one off before adding another."
            ),
        )

    row = UserPreference(content=text_)
    session.add(row)
    session.commit()
    session.refresh(row)
    return _preference_out(row)


@router.patch("/memory/{preference_id}")
def update_memory(
    preference_id: int, body: PreferenceBody, session: Session = Depends(get_session)
) -> dict:
    from memorymap.core.database import UserPreference

    row = session.get(UserPreference, preference_id)
    if row is None:
        raise HTTPException(status_code=404, detail="No such preference")
    if body.content is not None:
        text_ = body.content.strip()
        if not text_:
            raise HTTPException(status_code=422, detail="A preference can't be empty.")
        row.content = text_
    if body.active is not None:
        row.active = body.active
    session.commit()
    session.refresh(row)
    return _preference_out(row)


@router.delete("/memory/{preference_id}")
def forget_memory(preference_id: int, session: Session = Depends(get_session)) -> dict:
    from memorymap.core.database import UserPreference

    row = session.get(UserPreference, preference_id)
    if row is None:
        raise HTTPException(status_code=404, detail="No such preference")
    session.delete(row)
    session.commit()
    return {"status": "ok"}


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


# --- optional extras ---------------------------------------------------------


@router.get("/extras")
def list_extras() -> dict:
    """What can be installed, and what already is.

    The install itself reports through /tasks like every other background job,
    so this is only the catalogue and the current state.
    """
    state = extras.current()
    return {
        "extras": extras.status(),
        "running": state.running,
        "installing": state.extra_id if state.running else "",
        "step": state.step,
        "outcome": state.outcome,
        "log": list(state.log),
    }


@router.post("/extras/{extra_id}/install")
def install_extra(extra_id: str, reinstall: bool = False) -> dict:
    """Start installing one extra **from the allowlist**.

    The path names an entry in `core/extras.py`; the package spec handed to pip
    is never anything the client sent. That is the whole security property here
    — `pip install <a name from a request body>` is arbitrary code execution by
    design, and validating the string afterwards does not fix it.
    """
    started, message = extras.start(extra_id, reinstall=reinstall)
    return {"started": started, "message": message}


@router.post("/extras/{extra_id}/uninstall")
def uninstall_extra(extra_id: str) -> dict:
    """Remove one extra, by the same allowlist id the install uses."""
    started, message = extras.remove(extra_id)
    return {"started": started, "message": message}


# --- embedding models ---------------------------------------------------------


@router.get("/embedding-models")
def list_embedding_models() -> dict:
    """Which embedding models are on this machine, and what they cost.

    `can_download` is here rather than left for the client to infer: without
    `huggingface_hub` (which arrives with the semantic-search extra) every
    button on this screen would start something that cannot finish, and a
    disabled button with a reason beats a download that fails on an ImportError.
    """
    state = embedmodels.current()
    return {
        "models": embedmodels.status(),
        "cache": str(embedmodels.cache_root()),
        "can_download": embedmodels.can_download(),
        "running": state.running,
        "downloading": state.model_id if state.running else "",
        "step": state.step,
        "outcome": state.outcome,
        "log": list(state.log),
    }


@router.post("/embedding-models/{model_id}/download")
def download_embedding_model(model_id: str, reinstall: bool = False) -> dict:
    """Fetch one model **from the allowlist** in `core/embedmodels.py`.

    Same property as the extras installer: the repo id handed to the hub is
    never anything the client sent. A repo id from a request is a path that
    gets fetched and written to disk.

    A reinstall removes first, because that is the state the button exists for
    — a half-finished download leaves a directory that looks installed and
    loads as a corrupt model, and fetching over the top of it resumes the same
    broken snapshot.
    """
    if reinstall:
        embedmodels.remove(model_id)
    started, message = embedmodels.start(model_id)
    return {"started": started, "message": message}


@router.delete("/embedding-models/{model_id}")
def remove_embedding_model(model_id: str) -> dict:
    """Delete one model from the cache, by the same allowlist id."""
    removed, message = embedmodels.remove(model_id)
    return {"removed": removed, "message": message}


@router.get("/logs")
def server_logs(limit: int = 200) -> list[dict]:
    """Recent server-side log records for the Settings → Logs viewer."""
    return logbuffer.recent(limit=min(limit, logbuffer.MAX_RECORDS))


@router.get("/logs/stats")
def server_log_stats(limit: int = 200) -> dict:
    """How complete the log above actually is.

    A separate call rather than a wrapper around the records, so the shape of
    /logs stays a plain list for everything already reading it.
    """
    return logbuffer.stats(limit=min(limit, logbuffer.MAX_RECORDS))


@router.delete("/logs")
def clear_server_logs() -> dict:
    logbuffer.clear()
    return {"cleared": True}


# How long a single stream lives before it hands over to the browser's own
# reconnect, and how often it looks for new records. The cap is not a
# limitation to work around — EventSource reconnects on its own and resends
# Last-Event-ID, so the handover is seamless, and a stream that lives forever
# is a resource nothing ever reclaims when a tab is left open for a week.
LOG_STREAM_SECONDS = 10 * 60
LOG_STREAM_POLL = 0.7
LOG_STREAM_HEARTBEAT = 15


@router.get("/logs/stream")
async def stream_server_logs(request: Request, after: int = 0) -> StreamingResponse:
    """A live log feed, so the Logs screen reads like a terminal.

    Asked for directly: the screen should behave "like the terminal running in
    the background", not a list you refresh by hand.

    **NDJSON over fetch rather than the EventSource the roadmap suggested.**
    EventSource cannot set request headers, and this app authenticates with
    `X-Auth-Token` — so an EventSource here would simply 401. The usual way
    round that is to put the token in the query string, which is a bad trade
    anywhere and a farcical one on the endpoint that serves the log: the token
    would be written into the very records it is protecting. `fetch` carries
    the header, and NDJSON matches the chat and digest streams the app already
    has, so the browser-side reader is the one that already exists.

    Polling the ring buffer rather than registering a subscriber on it. That
    sounds like the lazier choice and is the more robust one: a subscriber
    registry means the logging handler pushes into per-connection queues, so a
    slow or dead reader can block or grow unboundedly *inside logging itself* —
    and a logging path that can stall is a far worse failure than a console
    running 700ms behind. One reader, one process, one deque.
    """

    async def lines() -> AsyncIterator[str]:
        cursor = after
        loop = asyncio.get_running_loop()
        started = loop.time()
        last_sent = started
        # An immediate first line, so the reader knows the stream is live
        # before anything has been logged — and learns where it is starting
        # from, which is what makes "dropped" meaningful on the client.
        yield json.dumps(
            {"type": "open", "cursor": cursor, "latest": logbuffer.latest_seq()}
        ) + "\n"
        while True:
            if await request.is_disconnected():
                return
            now = loop.time()
            # Drain BEFORE checking the deadline. The other order loses every
            # record that arrived in the last poll interval of the connection:
            # the client reconnects from its cursor and those records are
            # inside the buffer but behind it, so they are never sent at all.
            for record in logbuffer.since(cursor):
                cursor = record.get("seq", cursor)
                yield json.dumps({"type": "record", "record": record}) + "\n"
                last_sent = now
            if now - started > LOG_STREAM_SECONDS:
                # Hand back to the client's own reconnect rather than holding a
                # connection open forever for a tab left open all week.
                yield json.dumps({"type": "reconnect", "cursor": cursor}) + "\n"
                return
            if now - last_sent > LOG_STREAM_HEARTBEAT:
                # Keeps the connection from being reaped as idle, and doubles
                # as the client's proof that the server is still there rather
                # than merely quiet.
                yield json.dumps({"type": "ping", "cursor": cursor}) + "\n"
                last_sent = now
            await asyncio.sleep(LOG_STREAM_POLL)

    return StreamingResponse(
        lines(),
        media_type="application/x-ndjson",
        headers={
            # Same reasoning as the chat stream: stop a reverse proxy buffering
            # a stream whose whole value is arriving promptly.
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
        },
    )


# Preferences safe to put in a file the user will send to a stranger.
#
# An allowlist, not a denylist, and that choice is the whole design. A denylist
# has to predict every sensitive key anyone will ever add; this one only has to
# name the ones that help diagnose a bug. Anything not here is reported by
# name, type and size — "persona_prompt: string, 412 chars" — which is enough
# to tell whether a setting is involved without disclosing what it says.
DIAGNOSTIC_PREFERENCES = frozenset(
    {
        "ai_enabled",
        "tools_enabled",
        "chat_model",
        "utility_model",
        "embedding_backend",
        "embedding_model",
        "recycle_bin_days",
        "timezone",
        "web_search_enabled",
        "searxng_autostart",
        "search_provider",
        "thinking_enabled",
        "guided_mode",
        "auto_categorise",
        # Which backend answered is the first question any "the AI is broken"
        # report needs. `llm_api_key` is deliberately NOT here — it stays
        # described-not-disclosed like every other secret.
        "llm_provider",
        "llm_base_url",
        "local_only_ai",
        # How long answers were asked to be, which is the first thing to check
        # in a "the AI is slow" or "the AI is too terse" report (§11).
        "response_mode",
    }
)


def _redacted_preferences(preferences: dict) -> dict:
    """Diagnostic settings verbatim; everything else described, not disclosed."""
    kept: dict = {}
    withheld: dict = {}
    for key, value in sorted(preferences.items()):
        if key in DIAGNOSTIC_PREFERENCES:
            kept[key] = value
            continue
        shape = type(value).__name__
        if isinstance(value, str):
            withheld[key] = f"{shape}, {len(value)} chars"
        elif isinstance(value, (list, dict)):
            withheld[key] = f"{shape}, {len(value)} items"
        else:
            withheld[key] = shape
    return {"included": kept, "withheld": withheld}


BUNDLE_README = """MemoryMap AI — support bundle
=============================

What this is
------------
A snapshot of what the app can see about itself, collected so you can attach
it to a bug report. Everything in it was already on this machine and already
visible somewhere in the app; this file only gathers it into one place.

Nothing was sent anywhere. This file was written to your disk and it is
entirely your choice whether to share it.

What is in it
-------------
  logs.json         the recent server log, exactly as Settings -> Logs shows
  preferences.json  your settings, with free-text ones withheld (see below)
  status.json       app version, platform, and the state of Ollama, the
                    embedding model and SearXNG
  counts.json       how many notes, categories and documents exist — numbers
                    only, never their contents

What is NOT in it
-----------------
  · No note, document, chat or reminder content of any kind.
  · No password, and nothing derived from one.
  · No private-note data, encrypted or otherwise.
  · Free-text settings (display name, personas, custom prompts) are listed by
    name and length only, under "withheld" in preferences.json.

Worth a glance before you send it
---------------------------------
Log messages can quote things you typed — a chat question, or the title of a
page you opened. Open logs.json and skim it if that matters to you.
"""


@router.get("/support-bundle")
def support_bundle(session: Session = Depends(get_session)) -> Response:
    """Everything a bug report needs, in one file, collected locally.

    Asked for indirectly ("an interface for managing the application… errors
    etc") and echoed by an outside review. Deliberately *not* crash reporting:
    nothing is transmitted, the file lands on disk, and the user decides
    whether it ever goes anywhere. That distinction is why this was accepted
    and opt-in telemetry was not.
    """
    config = deps.get_config()
    buffer = io.BytesIO()

    def _safely(collect, fallback):
        """A bundle that half-collects is far better than one that 500s.

        The moment this is most needed is when something is already broken, so
        any single probe failing must not take the whole file with it.
        """
        try:
            return collect()
        except Exception as exc:  # noqa: BLE001 — the reason IS the diagnostic
            return {"error": f"{type(exc).__name__}: {exc}", **fallback}

    status_payload = {
        "app_version": __version__,
        "generated_at": utcnow().isoformat(),
        "platform": platform.platform(),
        "python": sys.version.split()[0],
        "data_dir": str(config.data_dir),
        "models": _safely(_models_status_snapshot, {"models": None}),
        "searxng": _safely(lambda: searxng_manager.status(config.data_dir), {}),
        "logs": logbuffer.stats(),
    }
    counts = _safely(
        lambda: {
            "entries": session.scalar(select(func.count(Entry.id))) or 0,
            "entries_deleted": session.scalar(
                select(func.count(Entry.id)).where(Entry.is_deleted == True)  # noqa: E712
            )
            or 0,
            "entries_private": session.scalar(
                select(func.count(Entry.id)).where(Entry.is_private == True)  # noqa: E712
            )
            or 0,
            "categories": session.scalar(select(func.count(Category.id))) or 0,
            "links": session.scalar(select(func.count(EntryLink.id))) or 0,
        },
        {},
    )

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("README.txt", BUNDLE_README)
        archive.writestr(
            "logs.json", json.dumps(logbuffer.recent(logbuffer.MAX_RECORDS), indent=2)
        )
        archive.writestr(
            "preferences.json",
            json.dumps(_redacted_preferences(config.all_preferences()), indent=2),
        )
        archive.writestr("status.json", json.dumps(status_payload, indent=2, default=str))
        archive.writestr("counts.json", json.dumps(counts, indent=2))

    manager.log_action(session, "exported", "data", detail="support bundle")
    session.commit()
    return Response(
        content=buffer.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": "attachment; filename=memorymap-support-bundle.zip"
        },
    )


def _models_status_snapshot() -> dict:
    """The model/AI state, without importing the models router's response."""
    ollama = deps.get_ollama()
    model_manager = deps.get_model_manager()
    embeddings = deps.get_embeddings()
    return {
        "ollama_running": ollama.is_running(),
        "chat_model": model_manager.chat_model(),
        "utility_model": model_manager._config.get_preference("utility_model", ""),
        "embedding_backend": model_manager.embedding_backend(),
        "active_embedding_model": embeddings.active_model(),
        "embedding_ready": embeddings.is_ready(),
        "embedding_error": embeddings.last_error,
    }


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
        "entries": [],
        "links": [],
    }

    category_names = manager.bulk_category_names(session, entries)

    for e in entries:
        payload["entries"].append({
            "id": e.id,
            # Exports decrypt while the app is unlocked. An export is for
            # taking your notes elsewhere, and ciphertext with no key is
            # not your notes. (The app's own backups keep the database
            # file as-is, so those stay encrypted.)
            "content": manager.readable_content(e),
            "category": category_names.get(e.category_id, manager.UNCATEGORISED),
            "tags": manager.entry_tags(e),
            "ai_confidence": e.ai_confidence,
            "created_at": e.created_at.isoformat(),
            "updated_at": e.updated_at.isoformat(),
            # `is_deleted` is not decoration and not derivable from
            # `deleted_at`: an export is what a re-import reads, and without
            # this flag every note in the recycle bin comes back as a live
            # note. It went missing when this block was rewritten as a loop.
            "is_deleted": e.is_deleted,
            "deleted_at": e.deleted_at.isoformat() if e.deleted_at else None,
        })

    payload["links"] = [
        {
            "id": link.id,
            "source_entry_id": link.source_entry_id,
            "target_entry_id": link.target_entry_id,
        }
        for link in links
    ]
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
    category_names = manager.bulk_category_names(session, entries)
    
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for entry in entries:
            cat_name = category_names.get(entry.category_id, manager.UNCATEGORISED)
            folder = (
                "_recycle-bin"
                if entry.is_deleted
                else _slug(cat_name, 40)
            )
            tags = manager.entry_tags(entry)
            front = [
                "---",
                f"category: {cat_name}",
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
        deps.store_quietly(session, entry)
        imported += 1
    manager.log_action(session, "imported", "data", detail=f"markdown x{imported}")
    session.commit()
    return {"imported": imported, "skipped": skipped}


#: A PDF or slide deck, not a video — well past what a document-conversion
#: library is for.
MAX_DOCUMENT_IMPORT_BYTES = 20 * 1024 * 1024
#: A very long deck splits into one note per slide; a sane ceiling on how
#: many notes one upload can create, the same instinct as `tools.py`'s
#: MAX_PLAN_STEPS — a huge number here is usually a converter emitting one
#: heading per page rather than someone wanting 200 new notes at once.
MAX_DOCUMENT_IMPORT_NOTES = 25


@router.post("/import/document", status_code=201)
def import_document(file: UploadFile, session: Session = Depends(get_session)) -> dict:
    """Turn an uploaded PDF/Word/slide file into one or more notes, via
    markitdown (§37G) — the button `core/extras.py`'s `documents` extra
    installed for and had nothing behind, until this.

    One note per top-level heading when the converted markdown has more than
    one (a deck, a document with real chapters); the whole file as one note
    otherwise — `import_markdown`'s "each file becomes a note" for the common
    case, once markitdown has turned it into something with that shape.
    """
    if not importer.markitdown_available():
        raise HTTPException(status_code=503, detail=importer.INSTALL_HINT)

    data = file.file.read(MAX_DOCUMENT_IMPORT_BYTES + 1)
    if len(data) > MAX_DOCUMENT_IMPORT_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than 20 MB")
    if not data:
        raise HTTPException(status_code=400, detail="The file is empty")

    suffix = Path(file.filename or "document").suffix[:12] or ".txt"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as saved:
        saved.write(data)
        saved.flush()
        try:
            text = importer.convert_to_markdown(Path(saved.name))
        except Exception as exc:  # a file markitdown can't parse must not 500
            raise HTTPException(
                status_code=422, detail=f"Couldn't read that file: {exc}"
            ) from exc

    all_sections = importer.split_into_sections(text)
    if not all_sections:
        raise HTTPException(
            status_code=422, detail="That file had no readable text in it"
        )
    sections = all_sections[:MAX_DOCUMENT_IMPORT_NOTES]

    imported = 0
    for section in sections:
        entry = manager.create_entry(
            session,
            section,
            category_name="Imports",
            tags=["imported"],
            ai_confidence=100,
        )
        entry.user_filed = True  # this file said where it came from, not the janitor
        session.commit()
        deps.store_quietly(session, entry)
        imported += 1
    manager.log_action(
        session, "imported", "data", detail=f"document x{imported} ({file.filename})"
    )
    session.commit()
    return {
        "imported": imported,
        "truncated": len(all_sections) > len(sections),
        "filename": file.filename,
    }


# --- web search (Wave F) -----------------------------------------------------------


def _require_web_search() -> str:
    """403 while the preference is off so nothing can quietly go online.
    Returns the configured SearXNG URL ('' = use DuckDuckGo)."""
    config = deps.get_config()
    if not config.get_preference("web_search_enabled", False):
        raise HTTPException(
            status_code=403,
            detail="Web search is turned off. Enable it in Settings → Web search "
            "(this is the one feature that goes online).",
        )
    return str(config.get_preference("searxng_url", "") or "")


@router.get("/websearch/providers")
def web_search_providers() -> dict:
    """The engine choices, for the selector in Settings → Web search.

    Served rather than duplicated in the frontend so the list can't drift from
    what `search_web` will actually accept.
    """
    searxng_url, provider = websearch.settings_from(deps.get_config())
    return {
        "selected": provider,
        "searxng_url": searxng_url,
        "providers": [
            {"id": key, **value} for key, value in websearch.PROVIDERS.items()
        ],
    }


@router.get("/websearch")
def web_search(q: str, limit: int = 5, session: Session = Depends(get_session)) -> dict:
    """Opt-in web lookup through whichever engine the user chose."""
    _require_web_search()
    searxng, provider = websearch.settings_from(deps.get_config())
    try:
        results = websearch.search_web(
            q,
            limit=max(1, min(limit, 10)),
            searxng_url=searxng or None,
            provider=provider,
        )
    except websearch.WebSearchError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    manager.log_action(session, "web_searched", "chat", detail=q[:120])
    session.commit()
    # Which engine actually answered, not which one was asked for — under
    # "auto" those differ, and the difference is the interesting part. Resolved
    # even when nothing came back: "no results" is exactly when you want to
    # know who found nothing, and it is the case the panel used to go quiet.
    answered = results[0]["engine"] if results else ("searxng" if searxng else "duckduckgo")
    return {
        "query": q,
        "results": results,
        "provider": answered,
        "answered_by": websearch.answered_by(answered),
        "requested_provider": provider,
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

    data_dir = deps.get_config().data_dir
    return {
        **searxng_manager.status(data_dir),
        # What the instance itself last said. Its output used to go to
        # DEVNULL, which is why a failed start could only ever be guessed at.
        "output": searxng_manager.recent_output(data_dir),
    }


@router.post("/websearch/searxng/start")
def searxng_start(session: Session = Depends(get_session)) -> dict:
    """Run SearXNG for the user and switch web search over to it."""
    from memorymap.search import searxng_manager, websearch

    config = deps.get_config()
    try:
        # When nothing is installed yet, this kicks off a background install
        # that ends by starting SearXNG itself — the callback points web
        # search at it the moment it answers, with no second Start press.
        result = searxng_manager.start(
            config.data_dir,
            on_ready=lambda url: (
                config.set_preference("searxng_url", url),
                websearch.clear_cache(),
            ),
        )
    except searxng_manager.SearxngError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    config.set_preference("searxng_url", result["url"])
    websearch.clear_cache()
    manager.log_action(session, "edited", "preferences", detail="searxng started")
    session.commit()
    return {"running": True, **result}


@router.post("/websearch/searxng/reinstall")
def searxng_reinstall(session: Session = Depends(get_session)) -> dict:
    """Throw the SearXNG install away and build a fresh one.

    A part-finished install looks installed and dies on start, which reads as
    "it just doesn't work" with nothing to act on — and the only fix was to go
    and delete folders by hand.
    """
    from memorymap.search import searxng_manager

    config = deps.get_config()
    try:
        # The rebuilt SearXNG starts itself when the install lands; the
        # callback points web search back at it, so reinstall is one press.
        result = searxng_manager.reinstall_source(
            config.data_dir,
            on_ready=lambda url: (
                config.set_preference("searxng_url", url),
                websearch.clear_cache(),
            ),
        )
    except searxng_manager.SearxngError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    config.set_preference("searxng_url", "")  # nothing to point at until it's back
    websearch.clear_cache()
    manager.log_action(session, "edited", "preferences", detail="searxng reinstalled")
    session.commit()
    return result


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
    
    category_names = manager.bulk_category_names(session, entries)
    
    for e in entries:
        writer.writerow(
            [
                e.id,
                manager.readable_content(e),
                category_names.get(e.category_id, manager.UNCATEGORISED),
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
