"""Agentic tools (Wave G): actions the chat model can take on the
notebook, offered to Ollama's native tool-calling API.

Rules of the registry:
- every tool wraps the existing manager layer / models — no new data
  logic lives here, so the AI can't do anything the UI can't;
- destructive tools never run inside the agent loop: the UI shows the
  user a confirm button, which calls POST /chat/tools/execute;
- everything is audit-logged (the wrapped functions do that) and
  deletes are soft, so anything the AI does is recoverable.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Callable

from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from memorymap.core import deps
from memorymap.core.database import EmbeddingRecord, Entry, Reminder
from memorymap.entry import manager
from memorymap.search import search_manager


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    parameters: dict  # JSON schema for the arguments
    handler: Callable[[Session, dict], dict]
    destructive: bool = False


# --- context budget -------------------------------------------------------------
# A local model's window is small and a notebook is not. These caps are the
# whole reason the reading tools below are safe to hand to a model: without
# them, one `list_notes` on a 5,000-note notebook would push everything else —
# the question included — out of the window.
#
# The rule: list calls return *previews* and say when they were capped, so the
# model pages deliberately instead of silently seeing a truncated notebook.
# Full text costs a `get_note` call, one note at a time.

PREVIEW_CHARS = 200
FULL_NOTE_CHARS = 4_000
DEFAULT_LIST_LIMIT = 10
MAX_LIST_LIMIT = 25
SUMMARY_NOTE_LIMIT = 40


def _clip(text: str, length: int = 300) -> str:
    return text if len(text) <= length else text[: length - 1] + "…"


def _visible(*extra):
    """The where-clause every reading tool starts from.

    Private notes are excluded here, once, rather than in each handler —
    the same reasoning as `manager.readable_content`: a rule applied in one
    place can't be forgotten in the next path someone adds. A private note is
    kept out of retrieval (`search_manager._without_private`), so it must be
    kept out of the tools too, or the model reaches around the front door.
    """
    return (
        Entry.is_deleted == False,  # noqa: E712
        Entry.is_private == False,  # noqa: E712
        *extra,
    )


def _readable(entry: Entry) -> str:
    """Non-private notes are stored in the clear, but go through the manager
    anyway so this can never be the path that hands back ciphertext."""
    return manager.readable_content(entry)


def _note_summary(session: Session, entry: Entry, chars: int = PREVIEW_CHARS) -> dict:
    """What the model gets back about a note — enough to talk about it
    and to reference it in follow-up tool calls."""
    text = _readable(entry)
    clipped = _clip(text, chars)
    return {
        "id": entry.id,
        "content": clipped,
        "truncated": len(clipped) < len(text),
        "category": manager.category_name_for(session, entry),
        "tags": manager.entry_tags(entry),
        "pinned": entry.pinned,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    }


def _require_note(session: Session, args: dict, field: str = "note_id") -> Entry:
    entry = manager.get_entry(session, int(args[field]))
    if entry is None or entry.is_deleted:
        raise ValueError(f"No note with id {args.get(field)}")
    if entry.is_private:
        # Deliberately the same wording as a missing note in spirit, but
        # honest about why: the model should tell the user it can't see it,
        # not invent contents for it.
        raise ValueError(
            f"Note #{entry.id} is private, so it isn't available to the AI"
        )
    return entry


# Said on every list result. The model has no other way to know that what it
# is looking at is an excerpt, and a model that doesn't know will answer from
# half a note without hedging.
_READ_MORE = (
    f"These are previews, clipped to about {PREVIEW_CHARS} characters. "
    "Call get_note with a note's id to read it in full before quoting it."
)


def _limit_arg(args: dict, default: int) -> int:
    """Clamp whatever the model asked for into the budget. A model that asks
    for 500 notes gets MAX_LIST_LIMIT and is told so by `has_more`."""
    try:
        wanted = int(args.get("limit") or default)
    except (TypeError, ValueError):
        wanted = default
    return max(1, min(wanted, MAX_LIST_LIMIT))


def _category_clause(session: Session, name: str):
    """Match a category by name, case-insensitively, without a join.

    An unknown name deliberately matches nothing rather than everything: the
    honest answer to "notes in Recipes" when there is no Recipes is zero.
    """
    from memorymap.core.database import Category

    category_id = session.scalar(
        select(Category.id).where(func.lower(Category.name) == name.lower())
    )
    if category_id is None:
        if name == manager.UNCATEGORISED:
            return Entry.category_id.is_(None)
        return Entry.id.is_(None)  # matches nothing
    return Entry.category_id == category_id


def _since_days(value) -> int | None:
    """`since` accepts a number of days ("7") or an ISO date ("2026-07-01").

    Models are inconsistent about which they send, and a tool that rejects one
    of them just burns a round. Anything unparseable means "no time filter"
    rather than an error — the same call, wider, beats no answer.
    """
    if value in (None, ""):
        return None
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        pass
    try:
        when = datetime.fromisoformat(str(value))
    except ValueError:
        return None
    days = (datetime.now(tz=when.tzinfo) - when).days
    return max(0, days)


def _refresh_embedding(session: Session, entry: Entry) -> None:
    """Content changed → the old vector is stale. Best effort, exactly
    like the entries routes: a failed embed never fails the change."""
    try:
        session.execute(
            EmbeddingRecord.__table__.delete().where(
                EmbeddingRecord.entry_id == entry.id
            )
        )
        session.commit()
        deps.get_embeddings().store_for_entry(session, entry)
    except Exception:
        pass


# --- handlers (session, args) -> result dict -----------------------------------
# Results always include a human "label" on success; the UI shows it
# inline in the chat ("✏️ Created note #12 in Shopping").


def _search_notes(session: Session, args: dict) -> dict:
    limit = _limit_arg(args, default=5)
    entries, mode = search_manager.retrieve(
        session, str(args["query"]), deps.get_embeddings(), limit=limit
    )
    return {
        "found": len(entries),
        "search_mode": mode,
        "notes": [_note_summary(session, e) for e in entries],
        "how_to_read_more": _READ_MORE,
        "label": f"🔍 Searched notes for “{_clip(str(args['query']), 40)}”",
    }


def _get_note_tool(session: Session, args: dict) -> dict:
    """One note, in full. The only tool that returns whole text — which is
    exactly why it takes an id and reads one note at a time."""
    entry = _require_note(session, args)
    result = _note_summary(session, entry, chars=FULL_NOTE_CHARS)
    result["links"] = [
        other.id for _link, other in manager.links_for_entry(session, entry)
    ]
    result["label"] = f"📄 Read note #{entry.id} in full"
    return result


def _list_notes(session: Session, args: dict) -> dict:
    """Walk the notebook: filter, page, previews only.

    This is what makes a large notebook answerable at all. It reports the
    total against the filter and where the next page starts, so the model can
    tell the difference between "that's all of them" and "there's more".
    """
    limit = _limit_arg(args, default=DEFAULT_LIST_LIMIT)
    offset = max(0, int(args.get("offset") or 0))

    filters = []
    category = str(args.get("category") or "").strip()
    if category:
        filters.append(_category_clause(session, category))
    tag = str(args.get("tag") or "").strip()
    if tag:
        # Tags are stored as a delimited string, so this over-matches
        # ("work" would hit "homework"); the exact check happens below.
        filters.append(Entry.tags.ilike(f"%{tag}%"))
    since_days = _since_days(args.get("since"))
    if since_days is not None:
        from memorymap.core.database import utcnow

        filters.append(Entry.created_at >= utcnow() - timedelta(days=since_days))

    query = select(Entry).where(*_visible(*filters))
    rows = list(
        session.scalars(
            query.order_by(Entry.created_at.desc(), Entry.id.desc())
            # Over-fetch when a tag filter is on, because the exact tag match
            # below can only remove rows, never add them.
            .offset(offset).limit(limit + 1 if not tag else (limit + 1) * 4)
        )
    )
    if tag:
        wanted = tag.lower()
        rows = [e for e in rows if wanted in {t.lower() for t in manager.entry_tags(e)}]

    has_more = len(rows) > limit
    rows = rows[:limit]

    if tag:
        # An exact count needs the same per-row check, so it can't be a
        # SQL count(). Cheap enough: tags, not content.
        total = sum(
            1
            for e in session.scalars(select(Entry).where(*_visible(*filters)))
            if tag.lower() in {t.lower() for t in manager.entry_tags(e)}
        )
        has_more = offset + len(rows) < total
    else:
        total = session.scalar(
            select(func.count(Entry.id)).where(*_visible(*filters))
        ) or 0

    described = ", ".join(
        part
        for part in (
            category or "",
            f"#{tag}" if tag else "",
            f"last {since_days} days" if since_days is not None else "",
        )
        if part
    )
    result = {
        "notes": [_note_summary(session, e) for e in rows],
        "returned": len(rows),
        "total_matching": total,
        "offset": offset,
        "has_more": has_more,
        "previews_only": True,
        "how_to_read_more": _READ_MORE,
        "label": f"📚 Listed notes{f' ({described})' if described else ''}",
    }
    if has_more:
        result["next_offset"] = offset + len(rows)
        result["note_to_model"] = (
            f"Showing {len(rows)} of {total}. Call list_notes again with "
            f"offset={offset + len(rows)} for the next page — do not assume "
            "these are all the notes."
        )
    return result


def _count_notes(session: Session, args: dict) -> dict:
    """Cheap aggregate: numbers only, never note content."""
    tag = str(args.get("tag") or "").strip()
    wanted = str(args.get("category") or "").strip()

    if tag:
        matching = [
            e
            for e in session.scalars(select(Entry).where(*_visible()))
            if tag.lower() in {t.lower() for t in manager.entry_tags(e)}
        ]
        if wanted:
            matching = [
                e for e in matching if manager.category_name_for(session, e) == wanted
            ]
        return {
            "tag": tag,
            "category": wanted or None,
            "count": len(matching),
            "label": f"🔢 Counted notes tagged #{tag}",
        }

    counts: dict[str, int] = {}
    total = 0
    for entry in session.scalars(select(Entry).where(*_visible())):
        total += 1
        name = manager.category_name_for(session, entry)
        counts[name] = counts.get(name, 0) + 1
    if wanted:
        return {
            "category": wanted,
            "count": counts.get(wanted, 0),
            "label": f"🔢 Counted notes in {wanted}",
        }
    return {"total": total, "by_category": counts, "label": "🔢 Counted your notes"}


def _list_categories(session: Session, args: dict) -> dict:
    counts: dict[str, int] = {}
    for entry in session.scalars(select(Entry).where(*_visible())):
        name = manager.category_name_for(session, entry)
        counts[name] = counts.get(name, 0) + 1
    return {
        "categories": [
            {"name": name, "notes": count} for name, count in sorted(counts.items())
        ],
        "total_notes": sum(counts.values()),
        "label": "🗂 Listed your categories",
    }


def _list_tags(session: Session, args: dict) -> dict:
    """Every tag in use with its count, most-used first — the other half of
    "what's in here?", and the way the model finds a tag worth listing by."""
    counts: dict[str, int] = {}
    for entry in session.scalars(select(Entry).where(*_visible())):
        for tag in manager.entry_tags(entry):
            counts[tag] = counts.get(tag, 0) + 1
    ordered = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0].lower()))
    return {
        "tags": [{"name": name, "notes": count} for name, count in ordered],
        "label": "🏷 Listed your tags",
    }


def _get_current_time(session: Session, args: dict) -> dict:
    """Time-aware answers: the model can ask what 'now' is."""
    now = datetime.now().astimezone()
    return {
        "iso": now.isoformat(),
        "human": now.strftime("%A %d %B %Y, %H:%M"),
        "label": "🕐 Checked the current time",
    }


def _summarize_notes(session: Session, args: dict) -> dict:
    """Gather recent notes (optionally by category / time window) so the model
    can summarise them in its answer. Read-only."""
    from memorymap.core.database import utcnow

    query = select(Entry).where(*_visible())
    period = "all time"
    days = _since_days(args.get("days"))
    if days is not None:
        query = query.where(Entry.created_at >= utcnow() - timedelta(days=days))
        period = f"last {days} days"
    rows = list(
        session.scalars(
            query.order_by(Entry.created_at.desc()).limit(SUMMARY_NOTE_LIMIT + 1)
        )
    )
    capped = len(rows) > SUMMARY_NOTE_LIMIT
    rows = rows[:SUMMARY_NOTE_LIMIT]
    wanted = args.get("category")
    if wanted:
        rows = [e for e in rows if manager.category_name_for(session, e) == str(wanted)]
        period = f"{period}, {wanted}"
    result = {
        "period": period,
        "count": len(rows),
        "notes": [_note_summary(session, e) for e in rows],
        "how_to_read_more": _READ_MORE,
        "label": "📝 Gathered notes to summarise",
    }
    if capped:
        result["note_to_model"] = (
            f"Only the {SUMMARY_NOTE_LIMIT} most recent notes are here — there "
            "are older ones. Say your summary covers the recent ones, or use "
            "list_notes to page through the rest."
        )
    return result


def _create_note(session: Session, args: dict) -> dict:
    content = str(args["content"]).strip()
    if not content:
        raise ValueError("The note content is empty")
    category = str(args.get("category") or "").strip()
    tags = [str(t) for t in args.get("tags") or []]
    if category:
        entry = manager.create_entry(
            session, content, category_name=category, tags=tags, ai_confidence=100
        )
    else:
        # No category given — ask the janitor, exactly like a manual save.
        try:
            from memorymap.ai import janitor

            category, confidence, _filed_by = janitor.categorise(
                session,
                content,
                deps.get_embeddings(),
                deps.get_model_manager(),
                deps.get_ollama(),
            )
        except Exception:
            category, confidence = manager.UNCATEGORISED, 0
        entry = manager.create_entry(
            session, content, category_name=category, tags=tags, ai_confidence=confidence
        )
    try:
        deps.get_embeddings().store_for_entry(session, entry)
    except Exception:
        pass
    result = _note_summary(session, entry)
    result["label"] = f"✏️ Created note #{entry.id} in {result['category']}"
    return result


def _edit_note(session: Session, args: dict) -> dict:
    entry = _require_note(session, args)
    content = args.get("content")
    content_changed = content is not None and str(content) != entry.content
    manager.update_entry(
        session,
        entry,
        content=str(content) if content is not None else None,
        category_name=str(args["category"]) if args.get("category") else None,
        tags=[str(t) for t in args["tags"]] if args.get("tags") is not None else None,
    )
    if content_changed:
        _refresh_embedding(session, entry)
    result = _note_summary(session, entry)
    result["label"] = f"📝 Updated note #{entry.id}"
    return result


def _tag_note(session: Session, args: dict) -> dict:
    entry = _require_note(session, args)
    tags = manager.entry_tags(entry)
    for tag in args.get("add") or []:
        if str(tag) not in tags:
            tags.append(str(tag))
    tags = [t for t in tags if t not in {str(r) for r in args.get("remove") or []}]
    manager.update_entry(session, entry, tags=tags)
    result = _note_summary(session, entry)
    result["label"] = f"🏷 Retagged note #{entry.id} → {', '.join(tags) or 'no tags'}"
    return result


def _pin_note(session: Session, args: dict) -> dict:
    entry = _require_note(session, args)
    pinned = bool(args.get("pinned", True))
    if pinned != entry.pinned:
        entry.pinned = pinned
        manager.log_action(
            session, "edited", "entry", entry.id, "pinned" if pinned else "unpinned"
        )
        session.commit()
    result = _note_summary(session, entry)
    result["label"] = f"📌 {'Pinned' if pinned else 'Unpinned'} note #{entry.id}"
    return result


def _link_notes(session: Session, args: dict) -> dict:
    source = _require_note(session, args)
    target = manager.get_entry(session, int(args["other_note_id"]))
    if target is None or target.is_deleted:
        raise ValueError(f"No note with id {args.get('other_note_id')}")
    link = manager.create_link(session, source, target)
    if link is None:
        raise ValueError("Those notes are already linked (or are the same note)")
    return {
        "linked": [source.id, target.id],
        "label": f"🔗 Linked note #{source.id} to note #{target.id}",
    }


def _delete_note(session: Session, args: dict) -> dict:
    entry = _require_note(session, args)
    manager.soft_delete_entry(session, entry)
    return {
        "deleted": entry.id,
        "recoverable": True,
        "label": f"🗑 Moved note #{entry.id} to the recycle bin",
    }


def _restore_note(session: Session, args: dict) -> dict:
    entry = manager.get_entry(session, int(args["note_id"]))
    if entry is None:
        raise ValueError(f"No note with id {args.get('note_id')}")
    if entry.is_deleted:
        manager.restore_entry(session, entry)
    result = _note_summary(session, entry)
    result["label"] = f"♻️ Restored note #{entry.id} from the recycle bin"
    return result


def _set_reminder(session: Session, args: dict) -> dict:
    text = str(args["text"]).strip()
    if not text:
        raise ValueError("The reminder text is empty")
    try:
        due_at = datetime.fromisoformat(str(args["due_at"]))
    except ValueError as exc:
        raise ValueError(
            "due_at must be an ISO date-time like 2026-07-19T09:00"
        ) from exc
    entry_id = args.get("note_id")
    if entry_id is not None:
        _require_note(session, {"note_id": entry_id})  # validates it exists
        entry_id = int(entry_id)
    priority = str(args.get("priority") or "normal").lower()
    if priority not in ("low", "normal", "high"):
        priority = "normal"
    reminder = Reminder(text=text, due_at=due_at, entry_id=entry_id, priority=priority)
    session.add(reminder)
    session.flush()
    manager.log_action(session, "created", "reminder", reminder.id, text[:80])
    session.commit()
    return {
        "id": reminder.id,
        "text": text,
        "due_at": due_at.isoformat(),
        "label": f"⏰ Set a reminder for {due_at.strftime('%d %b %Y %H:%M')}",
    }


def _list_reminders(session: Session, args: dict) -> dict:
    rows = session.scalars(select(Reminder).order_by(Reminder.due_at))
    reminders = [
        {
            "id": r.id,
            "text": r.text,
            "due_at": r.due_at.isoformat(),
            "done": r.done,
            "note_id": r.entry_id,
        }
        for r in rows
        if args.get("include_done") or not r.done
    ]
    return {"reminders": reminders, "label": "⏰ Listed your reminders"}


def _complete_reminder(session: Session, args: dict) -> dict:
    reminder = session.get(Reminder, int(args["reminder_id"]))
    if reminder is None:
        raise ValueError(f"No reminder with id {args.get('reminder_id')}")
    done = bool(args.get("done", True))
    if reminder.done != done:
        reminder.done = done
        manager.log_action(
            session, "edited", "reminder", reminder.id, "done" if done else "reopened"
        )
        session.commit()
    return {
        "id": reminder.id,
        "done": done,
        "label": f"✅ Marked reminder #{reminder.id} {'done' if done else 'not done'}",
    }


def _rename_tag(session: Session, args: dict) -> dict:
    changed = manager.rename_tag(session, str(args["old"]), str(args["new"]))
    return {
        "entries_changed": changed,
        "label": f"🏷 Renamed tag “{args['old']}” → “{args['new']}” ({changed} notes)",
    }


def _web_search(session: Session, args: dict) -> dict:
    """Only offered to the model when the user has opted in (the agent
    loop filters it out otherwise) — but check again anyway, because a
    stale conversation could still name it."""
    from memorymap.search import websearch

    config = deps.get_config()
    if not config.get_preference("web_search_enabled", False):
        raise ValueError("Web search is disabled in Settings → Preferences")
    try:
        results = websearch.search_web(
            str(args["query"]),
            limit=5,
            searxng_url=str(config.get_preference("searxng_url", "") or "") or None,
        )
    except websearch.WebSearchError as exc:
        raise ValueError(str(exc)) from exc
    return {
        "results": results,
        "label": f"🌐 Searched the web for “{_clip(str(args['query']), 40)}”",
    }


def _delete_tag(session: Session, args: dict) -> dict:
    changed = manager.delete_tag(session, str(args["name"]))
    return {
        "entries_changed": changed,
        "label": f"🏷 Removed the tag “{args['name']}” from {changed} notes",
    }


# --- the registry ---------------------------------------------------------------

_NOTE_ID = {"type": "integer", "description": "The note's id number"}

TOOLS: dict[str, ToolSpec] = {
    spec.name: spec
    for spec in [
        ToolSpec(
            "search_notes",
            "Search the user's notes by meaning or keywords. Use this to find "
            "note ids before editing, tagging, linking, or deleting anything.",
            {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "What to search for"},
                    "limit": {"type": "integer", "description": "Max results (1-10)"},
                },
                "required": ["query"],
            },
            _search_notes,
        ),
        ToolSpec(
            "get_note",
            "Read one note in full, by id. Use this after search_notes or "
            "list_notes, whose results are only short previews — read the note "
            "before quoting it or answering a detailed question about it.",
            {
                "type": "object",
                "properties": {"note_id": _NOTE_ID},
                "required": ["note_id"],
            },
            _get_note_tool,
        ),
        ToolSpec(
            "list_notes",
            "Walk through the user's notes, newest first, optionally filtered "
            "by category, tag, or age. Returns previews one page at a time — "
            "check has_more and call again with next_offset to see the rest. "
            "Use this for 'go through my X notes' style requests; use "
            "search_notes when you're looking for something specific.",
            {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Only this category (optional)",
                    },
                    "tag": {"type": "string", "description": "Only notes with this tag"},
                    "since": {
                        "type": "string",
                        "description": "Only notes from the last N days, or since "
                        "an ISO date like 2026-07-01 (optional)",
                    },
                    "limit": {
                        "type": "integer",
                        "description": f"Notes per page (1-{MAX_LIST_LIMIT}, "
                        f"default {DEFAULT_LIST_LIMIT})",
                    },
                    "offset": {
                        "type": "integer",
                        "description": "Skip this many — use next_offset from the "
                        "previous call to page",
                    },
                },
            },
            _list_notes,
        ),
        ToolSpec(
            "count_notes",
            "Count the user's notes — in total, broken down per category, or "
            "for one category and/or tag. Returns numbers only, so it's the "
            "cheap way to answer 'how many…' without reading any notes.",
            {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Only count this category (optional)",
                    },
                    "tag": {
                        "type": "string",
                        "description": "Only count notes with this tag (optional)",
                    },
                },
            },
            _count_notes,
        ),
        ToolSpec(
            "list_tags",
            "List every tag in use with how many notes carry it, most-used "
            "first. Use it to find the exact tag name before filtering by it.",
            {"type": "object", "properties": {}},
            _list_tags,
        ),
        ToolSpec(
            "get_current_time",
            "Get the current local date and time. Use this for time-aware "
            "answers and to compute reminder times.",
            {"type": "object", "properties": {}},
            _get_current_time,
        ),
        ToolSpec(
            "summarize_notes",
            "Gather the user's recent notes (optionally from the last N days or a "
            "category) so you can summarise them. Read-only.",
            {
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "Only include notes from the last N days (optional)",
                    },
                    "category": {
                        "type": "string",
                        "description": "Only include this category (optional)",
                    },
                },
            },
            _summarize_notes,
        ),
        ToolSpec(
            "list_categories",
            "List every category with how many notes it holds.",
            {"type": "object", "properties": {}},
            _list_categories,
        ),
        ToolSpec(
            "create_note",
            "Save a new note for the user. Leave category empty to let the "
            "app file it automatically.",
            {
                "type": "object",
                "properties": {
                    "content": {"type": "string", "description": "The note text"},
                    "category": {"type": "string", "description": "Category (optional)"},
                    "tags": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["content"],
            },
            _create_note,
        ),
        ToolSpec(
            "edit_note",
            "Change a note's text, category, or replace its whole tag list.",
            {
                "type": "object",
                "properties": {
                    "note_id": _NOTE_ID,
                    "content": {"type": "string", "description": "New text (optional)"},
                    "category": {"type": "string", "description": "New category (optional)"},
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Replacement tag list (optional)",
                    },
                },
                "required": ["note_id"],
            },
            _edit_note,
        ),
        ToolSpec(
            "tag_note",
            "Add and/or remove individual tags on one note.",
            {
                "type": "object",
                "properties": {
                    "note_id": _NOTE_ID,
                    "add": {"type": "array", "items": {"type": "string"}},
                    "remove": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["note_id"],
            },
            _tag_note,
        ),
        ToolSpec(
            "pin_note",
            "Pin (or unpin) a note so it floats to the top of lists.",
            {
                "type": "object",
                "properties": {
                    "note_id": _NOTE_ID,
                    "pinned": {"type": "boolean", "description": "false to unpin"},
                },
                "required": ["note_id"],
            },
            _pin_note,
        ),
        ToolSpec(
            "link_notes",
            "Connect two related notes together.",
            {
                "type": "object",
                "properties": {
                    "note_id": _NOTE_ID,
                    "other_note_id": {"type": "integer", "description": "The other note's id"},
                },
                "required": ["note_id", "other_note_id"],
            },
            _link_notes,
        ),
        ToolSpec(
            "delete_note",
            "Move a note to the recycle bin (recoverable). The app asks the "
            "user to confirm before this runs.",
            {"type": "object", "properties": {"note_id": _NOTE_ID}, "required": ["note_id"]},
            _delete_note,
            destructive=True,
        ),
        ToolSpec(
            "restore_note",
            "Bring a note back from the recycle bin.",
            {"type": "object", "properties": {"note_id": _NOTE_ID}, "required": ["note_id"]},
            _restore_note,
        ),
        ToolSpec(
            "set_reminder",
            "Create a reminder, optionally attached to a note.",
            {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "What to remind about"},
                    "due_at": {
                        "type": "string",
                        "description": "ISO date-time, e.g. 2026-07-19T09:00",
                    },
                    "note_id": {
                        "type": "integer",
                        "description": "Attach to this note (optional)",
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "normal", "high"],
                        "description": "Priority (optional, defaults to normal)",
                    },
                },
                "required": ["text", "due_at"],
            },
            _set_reminder,
        ),
        ToolSpec(
            "list_reminders",
            "List the user's reminders, soonest first.",
            {
                "type": "object",
                "properties": {
                    "include_done": {"type": "boolean", "description": "Include finished ones"}
                },
            },
            _list_reminders,
        ),
        ToolSpec(
            "complete_reminder",
            "Mark a reminder done (or not done).",
            {
                "type": "object",
                "properties": {
                    "reminder_id": {"type": "integer"},
                    "done": {"type": "boolean", "description": "false to reopen"},
                },
                "required": ["reminder_id"],
            },
            _complete_reminder,
        ),
        ToolSpec(
            "rename_tag",
            "Rename a tag everywhere it's used (merges if the new name exists).",
            {
                "type": "object",
                "properties": {"old": {"type": "string"}, "new": {"type": "string"}},
                "required": ["old", "new"],
            },
            _rename_tag,
        ),
        ToolSpec(
            "web_search",
            "Search the internet (DuckDuckGo) for current information the "
            "notebook doesn't have. Only available when the user enabled "
            "web search in their preferences.",
            {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
            _web_search,
        ),
        ToolSpec(
            "delete_tag",
            "Remove a tag from every note. The app asks the user to confirm "
            "before this runs.",
            {
                "type": "object",
                "properties": {"name": {"type": "string"}},
                "required": ["name"],
            },
            _delete_tag,
            destructive=True,
        ),
    ]
}


def tool_enabled(name: str) -> bool:
    """A tool is offered unless the user turned it off in Settings → Tools
    (Wave O). web_search additionally requires the online opt-in."""
    config = deps.get_config()
    if name == "web_search" and not config.get_preference("web_search_enabled", False):
        return False
    return name not in set(config.get_preference("disabled_tools", []))


def ollama_tools() -> list[dict]:
    """The registry in the shape Ollama's /api/chat 'tools' field wants,
    minus any the user disabled — a model can't be tempted by a tool it
    never hears about."""
    return [
        {
            "type": "function",
            "function": {
                "name": spec.name,
                "description": spec.description,
                "parameters": spec.parameters,
            },
        }
        for spec in TOOLS.values()
        if tool_enabled(spec.name)
    ]


def tool_catalog() -> list[dict]:
    """Metadata for the Settings → Tools toggles (Wave O)."""
    return [
        {
            "name": spec.name,
            "description": spec.description,
            "destructive": spec.destructive,
            "enabled": tool_enabled(spec.name),
            "online": spec.name == "web_search",
        }
        for spec in TOOLS.values()
    ]


def confirm_label(name: str, arguments: dict) -> str:
    """Human sentence for the UI's confirm button (destructive tools)."""
    if name == "delete_note":
        return f"Move note #{arguments.get('note_id', '?')} to the recycle bin"
    if name == "delete_tag":
        return f"Remove the tag “{arguments.get('name', '?')}” from every note"
    return f"Run {name}"


def execute_tool(session: Session, name: str, arguments: dict) -> dict:
    """Run one tool call. Errors come back as {"error": ...} so the
    agent loop can hand them to the model instead of crashing."""
    spec = TOOLS.get(name)
    if spec is None:
        return {"error": f"Unknown tool '{name}'"}
    if not tool_enabled(name):
        return {"error": f"The '{name}' tool is turned off in Settings → Tools"}
    try:
        result = spec.handler(session, dict(arguments or {}))
    except (KeyError, TypeError, ValueError) as exc:
        # Bad or missing arguments — tell the model so it can retry.
        session.rollback()
        return {"error": f"{name}: {exc}"}
    manager.log_action(
        session,
        "ai_tool",
        "chat",
        detail=f"{name} {json.dumps(arguments or {})[:200]}",
    )
    session.commit()
    return result
