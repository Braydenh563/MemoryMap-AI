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

from sqlalchemy import select
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


def _clip(text: str, length: int = 300) -> str:
    return text if len(text) <= length else text[: length - 1] + "…"


def _note_summary(session: Session, entry: Entry) -> dict:
    """What the model gets back about a note — enough to talk about it
    and to reference it in follow-up tool calls."""
    return {
        "id": entry.id,
        "content": _clip(entry.content),
        "category": manager.category_name_for(session, entry),
        "tags": manager.entry_tags(entry),
        "pinned": entry.pinned,
    }


def _get_note(session: Session, args: dict) -> Entry:
    entry = manager.get_entry(session, int(args["note_id"]))
    if entry is None or entry.is_deleted:
        raise ValueError(f"No note with id {args.get('note_id')}")
    return entry


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
    limit = max(1, min(int(args.get("limit", 5)), 10))
    entries, mode = search_manager.retrieve(
        session, str(args["query"]), deps.get_embeddings(), limit=limit
    )
    return {
        "found": len(entries),
        "search_mode": mode,
        "notes": [_note_summary(session, e) for e in entries],
        "label": f"🔍 Searched notes for “{_clip(str(args['query']), 40)}”",
    }


def _count_notes(session: Session, args: dict) -> dict:
    rows = session.scalars(select(Entry).where(Entry.is_deleted == False))  # noqa: E712
    counts: dict[str, int] = {}
    total = 0
    for entry in rows:
        total += 1
        name = manager.category_name_for(session, entry)
        counts[name] = counts.get(name, 0) + 1
    wanted = args.get("category")
    if wanted:
        return {
            "category": wanted,
            "count": counts.get(str(wanted), 0),
            "label": f"🔢 Counted notes in {wanted}",
        }
    return {"total": total, "by_category": counts, "label": "🔢 Counted your notes"}


def _list_categories(session: Session, args: dict) -> dict:
    rows = session.scalars(select(Entry).where(Entry.is_deleted == False))  # noqa: E712
    counts: dict[str, int] = {}
    for entry in rows:
        name = manager.category_name_for(session, entry)
        counts[name] = counts.get(name, 0) + 1
    return {
        "categories": [
            {"name": name, "notes": count} for name, count in sorted(counts.items())
        ],
        "label": "🗂 Listed your categories",
    }


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
    entry = _get_note(session, args)
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
    entry = _get_note(session, args)
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
    entry = _get_note(session, args)
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
    source = _get_note(session, args)
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
    entry = _get_note(session, args)
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
        _get_note(session, {"note_id": entry_id})  # validates it exists
        entry_id = int(entry_id)
    reminder = Reminder(text=text, due_at=due_at, entry_id=entry_id)
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
            "count_notes",
            "Count the user's notes — in total, per category, or for one category.",
            {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Only count this category (optional)",
                    }
                },
            },
            _count_notes,
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


def ollama_tools() -> list[dict]:
    """The registry in the shape Ollama's /api/chat 'tools' field wants."""
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
