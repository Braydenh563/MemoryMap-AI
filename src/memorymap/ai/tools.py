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
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Callable

from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from memorymap.ai import skills
from memorymap.core import deps
from memorymap.core.database import EmbeddingRecord, Entry, Reminder
from memorymap.core.logbuffer import safe_value
from memorymap.entry import manager
from memorymap.search import search_manager


class ToolError(ValueError):
    """A failure a tool means to explain, in words written for a reader.

    Every handler below raises this for the cases it anticipates — "there's no
    note with that id", "that tag is already in use". Those strings are safe to
    hand to the model and to show in the UI, because somebody wrote them for
    exactly that.

    A bare `ValueError` from somewhere inside a handler is the opposite: it is
    whatever `int("abc")` or a SQLAlchemy coercion happened to say, and its text
    is an internal detail. `execute_tool` distinguishes the two, which a single
    `except ValueError` could not. Subclassing `ValueError` keeps every existing
    caller that catches the base class working unchanged.
    """


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
# Documents are long-form by definition, so they get a larger ceiling than a
# note — but still a ceiling: one document must not fill the whole window.
DOCUMENT_CHARS = 12_000


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
    summary = {
        "id": entry.id,
        "content": clipped,
        "truncated": len(clipped) < len(text),
        "category": manager.category_name_for(session, entry),
        "tags": manager.entry_tags(entry),
        "pinned": entry.pinned,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    }
    # What the note's own "tomorrow" meant on the day it was written (§10A).
    # Without this the model reads "the deadline is next Friday" in a note
    # from March and answers about the Friday coming up.
    dates = manager.entry_dates(session, entry)
    if dates:
        summary["dates"] = [
            {"phrase": d.phrase, "meant": d.at.date().isoformat()} for d in dates
        ]
    return summary


def _undo_edit(session: Session, entry: Entry) -> dict:
    """The call that would put this note back the way it is right now.

    Captured *before* a write, and expressed as a tool call rather than a
    special-case endpoint: the UI hands it straight back to
    `POST /chat/tools/execute`, which is the same path the confirm button
    already uses. Roadmap §21 asks a skill to end in "a list the user can
    undo, rather than prose claiming something happened" — this is the half
    that makes the list actionable.
    """
    return {
        "tool": "edit_note",
        "arguments": {
            "note_id": entry.id,
            "content": entry.content,
            "category": manager.category_name_for(session, entry),
            "tags": manager.entry_tags(entry),
        },
    }


def _require_note(session: Session, args: dict, field: str = "note_id") -> Entry:
    entry = manager.get_entry(session, int(args[field]))
    if entry is None or entry.is_deleted:
        raise ToolError(f"No note with id {args.get(field)}")
    if entry.is_private:
        # Deliberately the same wording as a missing note in spirit, but
        # honest about why: the model should tell the user it can't see it,
        # not invent contents for it.
        raise ToolError(
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
    like the entries routes: a failed embed never fails the change —
    but it does get logged, so a backend that has stopped working is
    visible in Settings → Logs instead of silently degrading search."""
    try:
        session.execute(
            EmbeddingRecord.__table__.delete().where(
                EmbeddingRecord.entry_id == entry.id
            )
        )
        session.commit()
    except Exception:  # noqa: BLE001 — never fail the edit over the index
        logging.getLogger("memorymap.embeddings").warning(
            "couldn't clear the stale vector for entry %s", entry.id, exc_info=True
        )
        session.rollback()
        return
    deps.store_quietly(session, entry)


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
    """Time-aware answers: the model can ask what 'now' is.

    The user's clock, not the server's. They are the same on a laptop running
    both, and hours apart the moment the server sits in UTC — at which point
    every "tomorrow at 9" the model computes is wrong.
    """
    from memorymap.core.config import user_now

    now = user_now(deps.get_config())
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


# --- documents, past chats, and skills ------------------------------------------
# Documents are deliberately kept out of retrieval: a note is a captured
# thought, a document is something you sat down and write, and mixing them
# would put every half-finished draft into every search result. That decision
# also meant the model could not read a document even when explicitly asked
# to. These tools are the "unless you ask for it by name" half of that rule —
# nothing arrives in context unless the model goes and gets it.


def _list_documents(session: Session, args: dict) -> dict:
    from memorymap.core.database import Document

    limit = _limit_arg(args, default=DEFAULT_LIST_LIMIT)
    offset = max(0, int(args.get("offset") or 0))
    term = str(args.get("query") or "").strip()
    # One list of filters, applied to both the page and the count, so the
    # total can never describe a different set than the rows.
    filters = []
    if term:
        like = f"%{term}%"
        filters.append(Document.title.ilike(like) | Document.content.ilike(like))
    total = session.scalar(select(func.count(Document.id)).where(*filters)) or 0
    rows = list(
        session.scalars(
            select(Document)
            .where(*filters)
            .order_by(Document.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )
    )
    return {
        "documents": [
            {
                "id": d.id,
                "title": d.title,
                "words": len(d.content.split()),
                "updated_at": d.updated_at.isoformat(),
                "preview": _clip(d.content, PREVIEW_CHARS),
            }
            for d in rows
        ],
        "returned": len(rows),
        "total_matching": total,
        "offset": offset,
        "has_more": offset + len(rows) < total,
        "how_to_read_more": (
            "Previews only. Call get_document with an id to read one in full."
        ),
        "label": f"📚 Listed documents{f' matching “{_clip(term, 30)}”' if term else ''}",
    }


def _get_document(session: Session, args: dict) -> dict:
    from memorymap.core.database import Document

    document = session.get(Document, int(args["document_id"]))
    if document is None:
        raise ToolError(f"No document with id {args.get('document_id')}")
    text = document.content
    clipped = _clip(text, DOCUMENT_CHARS)
    return {
        "id": document.id,
        "title": document.title,
        "content": clipped,
        "truncated": len(clipped) < len(text),
        "words": len(text.split()),
        "label": f"📄 Read the document “{_clip(document.title, 40)}”",
    }


def _search_chat_history(session: Session, args: dict) -> dict:
    """Past conversations. "What did we decide last week?" was unanswerable:
    each turn only ever saw its own thread, so the assistant had no memory of
    anything said in a different chat."""
    from memorymap.api.routes_conversations import conversation_matches
    from memorymap.core.database import Conversation

    limit = _limit_arg(args, default=5)
    term = str(args.get("query") or "").strip()
    query = select(Conversation)
    if term:
        # Prefilter in SQL, then confirm in Python: `messages` is a JSON
        # column, so a raw LIKE also matches its keys — "tent" is inside
        # "content", which matched every conversation ever saved.
        like = f"%{term}%"
        query = query.where(
            Conversation.title.ilike(like) | Conversation.messages.ilike(like)
        )
    rows = list(
        session.scalars(
            query.order_by(Conversation.updated_at.desc()).limit(limit * 4 if term else limit)
        )
    )
    if term:
        rows = [c for c in rows if conversation_matches(c, term)][:limit]
    found = []
    for conversation in rows:
        try:
            messages = json.loads(conversation.messages)
        except ValueError:
            messages = []
        # The matching exchanges, not the whole thread: a long conversation
        # would spend the entire budget on one tool call. Whole turns, though
        # — a question that matched without the answer that followed it is
        # useless for "what did we decide?", which is the question this tool
        # exists to answer.
        wanted_indexes: set[int] = set()
        for index, message in enumerate(messages):
            content = str(message.get("content", ""))
            if not term or term.lower() in content.lower():
                turn_start = index - (index % 2)
                wanted_indexes.update({turn_start, turn_start + 1})
            if len(wanted_indexes) >= 6:
                break
        excerpts = [
            {
                "role": messages[i].get("role"),
                "text": _clip(str(messages[i].get("content", "")), PREVIEW_CHARS),
            }
            for i in sorted(wanted_indexes)
            if i < len(messages)
        ]
        found.append(
            {
                "id": conversation.id,
                "title": conversation.title,
                "updated_at": conversation.updated_at.isoformat(),
                "turns": len(messages) // 2,
                "excerpts": excerpts or [
                    {"role": m.get("role"), "text": _clip(str(m.get("content", "")), PREVIEW_CHARS)}
                    for m in messages[:2]
                ],
            }
        )
    return {
        "conversations": found,
        "found": len(found),
        "note_to_model": (
            "These are excerpts from earlier chats, including possibly this "
            "one. Say when you're relying on something said in a past "
            "conversation rather than presenting it as the user's notes."
        ),
        "label": f"💬 Searched past chats{f' for “{_clip(term, 30)}”' if term else ''}",
    }


def _list_skills(session: Session, args: dict) -> dict:
    """Everything runnable, built-ins included.

    The built-ins used to live only in `app.js`, so a model asked "what skills
    do I have?" answered with the user's own and nothing else — while the
    interface showed ten more.
    """
    config = deps.get_config()
    catalog = skills.catalog(config, set(TOOLS))
    return {
        "skills": [
            {
                "name": skill["name"],
                "prompt": _clip(skill["prompt"], 200),
                "steps": skill["steps"],
                "tools": skill["tools"],
                "inputs": [item["name"] for item in skill["inputs"]],
                "builtin": skill["builtin"],
            }
            for skill in catalog
        ],
        "count": len(catalog),
        "note_to_model": (
            "Built-in skills can be run but not edited. A skill's steps and "
            "tools are what it does — copy that shape when you make one."
        ),
        "label": "⚡ Listed the saved skills",
    }


def _save_skill(session: Session, args: dict) -> dict:
    """Create or update one skill. Same tool for both, because from the
    model's side "make me a skill that does X" is one intent, and a separate
    update tool just adds a way to get it wrong.

    `steps` and `tools` are the rebuild (roadmap §21): without somewhere to
    put them, "make me a skill that files my inbox notes" could only ever
    save another sentence.
    """
    config = deps.get_config()
    try:
        skill = skills.normalise(
            {
                "name": args.get("name"),
                "prompt": args.get("prompt"),
                "steps": args.get("steps"),
                "tools": args.get("tools"),
            },
            set(TOOLS),
        )
    except skills.SkillError as exc:
        raise ToolError(str(exc)) from exc
    if any(skill["name"] == shipped["name"] for shipped in skills.builtins()):
        raise ToolError(
            f"“{skill['name']}” is a built-in skill — pick a different name"
        )
    stored = skills.stored(config)
    existed = any(s.get("name") == skill["name"] for s in stored)
    if len(stored) >= skills.MAX_SKILLS and not existed:
        raise ToolError(
            f"There are already {skills.MAX_SKILLS} saved skills — delete one first"
        )
    config.set_preference(
        "skills", [s for s in stored if s.get("name") != skill["name"]] + [skill]
    )
    return {
        "name": skill["name"],
        "updated": existed,
        "steps": len(skill["steps"]),
        "tools": skill["tools"],
        "label": f"⚡ {'Updated' if existed else 'Created'} the “{skill['name']}” skill",
    }


def _delete_skill(session: Session, args: dict) -> dict:
    config = deps.get_config()
    name = str(args["name"]).strip()
    stored = skills.stored(config)
    remaining = [s for s in stored if s.get("name") != name]
    if len(remaining) == len(stored):
        if any(name == shipped["name"] for shipped in skills.builtins()):
            raise ToolError(f"“{name}” is a built-in skill and can't be deleted")
        raise ToolError(f"There's no saved skill called “{name}”")
    config.set_preference("skills", remaining)
    return {"name": name, "label": f"⚡ Deleted the “{name}” skill"}


def _create_note(session: Session, args: dict) -> dict:
    content = str(args["content"]).strip()
    if not content:
        raise ToolError("The note content is empty")
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
    deps.store_quietly(session, entry)
    result = _note_summary(session, entry)
    result["label"] = f"✏️ Created note #{entry.id} in {result['category']}"
    result["undo"] = {"tool": "delete_note", "arguments": {"note_id": entry.id}}
    return result


def _edit_note(session: Session, args: dict) -> dict:
    entry = _require_note(session, args)
    undo = _undo_edit(session, entry)  # before the write, or it undoes nothing
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
    result["undo"] = undo
    return result


def _tag_note(session: Session, args: dict) -> dict:
    entry = _require_note(session, args)
    undo = _undo_edit(session, entry)
    tags = manager.entry_tags(entry)
    for tag in args.get("add") or []:
        if str(tag) not in tags:
            tags.append(str(tag))
    tags = [t for t in tags if t not in {str(r) for r in args.get("remove") or []}]
    manager.update_entry(session, entry, tags=tags)
    result = _note_summary(session, entry)
    result["label"] = f"🏷 Retagged note #{entry.id} → {', '.join(tags) or 'no tags'}"
    result["undo"] = undo
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
    result["undo"] = {
        "tool": "pin_note",
        "arguments": {"note_id": entry.id, "pinned": not pinned},
    }
    return result


def _link_notes(session: Session, args: dict) -> dict:
    source = _require_note(session, args)
    target = manager.get_entry(session, int(args["other_note_id"]))
    if target is None or target.is_deleted:
        raise ToolError(f"No note with id {args.get('other_note_id')}")
    link = manager.create_link(session, source, target)
    if link is None:
        raise ToolError("Those notes are already linked (or are the same note)")
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
        "undo": {"tool": "restore_note", "arguments": {"note_id": entry.id}},
        "label": f"🗑 Moved note #{entry.id} to the recycle bin",
    }


def _restore_note(session: Session, args: dict) -> dict:
    entry = manager.get_entry(session, int(args["note_id"]))
    if entry is None:
        raise ToolError(f"No note with id {args.get('note_id')}")
    if entry.is_deleted:
        manager.restore_entry(session, entry)
    result = _note_summary(session, entry)
    result["label"] = f"♻️ Restored note #{entry.id} from the recycle bin"
    result["undo"] = {"tool": "delete_note", "arguments": {"note_id": entry.id}}
    return result


def _set_reminder(session: Session, args: dict) -> dict:
    text = str(args["text"]).strip()
    if not text:
        raise ToolError("The reminder text is empty")
    try:
        due_at = datetime.fromisoformat(str(args["due_at"]))
    except ValueError as exc:
        raise ToolError(
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
        raise ToolError(f"No reminder with id {args.get('reminder_id')}")
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
        "undo": {
            "tool": "rename_tag",
            "arguments": {"old": str(args["new"]), "new": str(args["old"])},
        },
    }


def _web_search(session: Session, args: dict) -> dict:
    """Only offered to the model when the user has opted in (the agent
    loop filters it out otherwise) — but check again anyway, because a
    stale conversation could still name it."""
    from memorymap.search import websearch

    config = deps.get_config()
    if not config.get_preference("web_search_enabled", False):
        raise ToolError("Web search is disabled in Settings → Web search")
    # Read through the same helper the HTTP route uses, so the engine the
    # user picked is the engine the agent uses. Two readers is how a tool
    # ends up quietly ignoring a setting the rest of the app honours.
    searxng_url, provider = websearch.settings_from(config)
    try:
        results = websearch.search_web(
            str(args["query"]),
            limit=5,
            searxng_url=searxng_url or None,
            provider=provider,
        )
    except websearch.WebSearchError as exc:
        raise ToolError(str(exc)) from exc
    return {
        "results": results,
        "provider": provider,
        "label": f"🌐 Searched the web for “{_clip(str(args['query']), 40)}”",
    }


# How much of a page the model is given. A long article would otherwise eat
# the whole context window and push the user's own notes out of it.
READ_URL_MAX_CHARS = 6000


def _read_url(session: Session, args: dict) -> dict:
    """Fetch one web page and hand back its readable text.

    This is what makes "ask about this page" mean anything. Without it the
    model receives a URL it cannot open and answers from the address alone —
    which is exactly what the Ask about this button used to do.

    Same opt-in as web_search, and the same fetch path: scripts, styles and
    page chrome are stripped server-side, the address is checked and pinned on
    every redirect hop, and only text comes back — so nothing from a
    third-party page can execute anywhere.
    """
    from memorymap.search import websearch

    config = deps.get_config()
    if not config.get_preference("web_search_enabled", False):
        raise ToolError("Web search is disabled in Settings → Web search")
    url = str(args.get("url") or "").strip()
    if not url:
        raise ToolError("No URL was given")
    try:
        page = websearch.fetch_readable(url)
    except websearch.WebSearchError as exc:
        raise ToolError(str(exc)) from exc

    text = page.get("text") or ""
    truncated = len(text) > READ_URL_MAX_CHARS
    return {
        "url": page.get("url", url),
        "title": page.get("title", ""),
        "domain": page.get("domain", ""),
        "text": text[:READ_URL_MAX_CHARS],
        # The article's own links, so an answer can cite where a claim leads
        # and a follow-up read needs no second search. Capped tighter than
        # the reader keeps them: every entry here is prompt tokens. These are
        # untrusted page text like everything above — following one goes
        # back through read_url's address checks; nothing is auto-fetched.
        "links": page.get("links", [])[:15],
        # Said plainly, so the model reports a partial read rather than
        # treating a truncated page as the whole thing.
        "truncated": truncated,
        "note": (
            "Only the first part of this page is shown; say so if the answer "
            "might be further down."
            if truncated
            else ""
        ),
        "label": f"📖 Read {page.get('domain') or url}",
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
            "list_documents",
            "List the user's long-form documents, newest first, optionally "
            "filtered by a word in the title or body. Documents are separate "
            "from notes and are never searched automatically, so use this "
            "whenever the question is about something they wrote up properly.",
            {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Only documents containing this text (optional)",
                    },
                    "limit": {"type": "integer", "description": "Per page"},
                    "offset": {"type": "integer", "description": "Skip this many"},
                },
            },
            _list_documents,
        ),
        ToolSpec(
            "get_document",
            "Read one document in full, by id. Use after list_documents, "
            "whose results are only previews.",
            {
                "type": "object",
                "properties": {
                    "document_id": {"type": "integer", "description": "The document's id"}
                },
                "required": ["document_id"],
            },
            _get_document,
        ),
        ToolSpec(
            "search_chat_history",
            "Look through earlier conversations with the user, including "
            "ones from other days. Use this when they refer to something "
            "'we talked about' that isn't in the current thread.",
            {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Words to look for (leave empty for the most recent chats)",
                    },
                    "limit": {"type": "integer", "description": "How many chats"},
                },
            },
            _search_chat_history,
        ),
        ToolSpec(
            "list_skills",
            "List the user's saved skills — their own one-click requests for "
            "this chat.",
            {"type": "object", "properties": {}},
            _list_skills,
        ),
        ToolSpec(
            "save_skill",
            "Create a saved skill, or update one by using the same name. A "
            "skill is a repeatable job the user runs with one click: what to "
            "do, the steps to do it in, and the tools it needs.",
            {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Short name, up to 40 characters"},
                    "prompt": {
                        "type": "string",
                        "description": "What the skill should do, in one instruction",
                    },
                    "steps": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "The steps to follow, in order",
                    },
                    "tools": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Names of the tools the skill needs, e.g. tag_note",
                    },
                },
                "required": ["name", "prompt"],
            },
            _save_skill,
        ),
        ToolSpec(
            "delete_skill",
            "Delete one of the user's saved skills. The app asks the user to "
            "confirm before this runs.",
            {
                "type": "object",
                "properties": {"name": {"type": "string"}},
                "required": ["name"],
            },
            _delete_skill,
            destructive=True,
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
            "read_url",
            "Open a web page and read its text. Use this whenever the user "
            "gives you a link, or after web_search when a result looks like it "
            "holds the answer — a search snippet is rarely enough. Only "
            "available when the user enabled web search.",
            {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "The full http(s) URL"}
                },
                "required": ["url"],
            },
            _read_url,
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


# The tools that change something. Used by the agent's "you claimed you saved
# it but never called a write tool" safety net, and by the skill list to say
# which skills act rather than answer — one list, so the two can't disagree.
WRITE_TOOLS = {
    "create_note",
    "edit_note",
    "tag_note",
    "pin_note",
    "link_notes",
    "delete_note",
    "restore_note",
    "set_reminder",
    "complete_reminder",
    "rename_tag",
    "delete_tag",
    "save_skill",
    "delete_skill",
}


# --- which tools a turn is offered (roadmap §11a) --------------------------------
#
# All 26 schemas went up on every round of every turn, whether the question was
# "how many notes do I have" or "remind me to call mum" — 10,215 characters,
# 77% of the fixed per-round overhead, resent up to MAX_ROUNDS times. On a
# model with a 4096-token window that is most of the room, and the overflow is
# dropped from the front, which is the system prompt: the model stops knowing
# it has tools at all and reports as "the AI won't use tools".
#
# A skill declares what it needs, so its run is easy (see ai/skills.py). An
# ordinary turn declares nothing, so this reads the question. The rule that
# keeps it honest: **narrow only when we are confident, and widen when we are
# not.** A question gets the reading core; a request that names something gets
# that group as well; anything that sounds like a job but doesn't say which
# one gets everything. Losing a tool the turn needed is worse than paying for
# schemas it didn't.

# Always offered: reading the notebook, knowing the time, and saving a note —
# the last because "save this" is the most common action there is, and the
# cost of missing it is the model claiming a save that never happened.
CORE_TOOLS = [
    "search_notes",
    "get_note",
    "list_notes",
    "count_notes",
    "list_categories",
    "list_tags",
    "get_current_time",
    "create_note",
]

# Groups, and the words that ask for them. Generous on purpose: a cue that
# fires when it needn't costs a few hundred characters, and one that fails to
# fire costs the user the thing they asked for.
TOOL_GROUPS: list[tuple[tuple[str, ...], tuple[str, ...]]] = [
    (
        ("set_reminder", "list_reminders", "complete_reminder"),
        (
            "remind", "reminder", "forget", "due", "deadline", "tomorrow",
            "tonight", "later", "schedule", "chase", "follow up", "o'clock",
            "next week", "on monday", "on tuesday", "on wednesday",
            "on thursday", "on friday", "on saturday", "on sunday", "alarm",
        ),
    ),
    (
        ("tag_note", "rename_tag", "delete_tag"),
        ("tag", "label", "untagged", "retag", "categorise", "categorize"),
    ),
    (
        ("link_notes",),
        ("link", "connect", "related", "relate", "join", "graph", "together"),
    ),
    (
        ("edit_note", "pin_note"),
        (
            "edit", "change", "update", "rewrite", "fix", "correct", "amend",
            "pin", "unpin", "reword", "shorten", "expand",
        ),
    ),
    (
        ("delete_note", "restore_note"),
        ("delete", "remove", "bin", "trash", "restore", "undelete", "recycle"),
    ),
    (
        ("list_documents", "get_document"),
        ("document", "doc ", "docs", "write-up", "essay", "report", "chapter"),
    ),
    (
        ("search_chat_history",),
        (
            "we talked", "we discussed", "you said", "earlier", "last time",
            "previous", "conversation", "chat about", "mentioned before",
        ),
    ),
    (
        ("list_skills", "save_skill", "delete_skill"),
        ("skill", "shortcut"),
    ),
    (
        ("summarize_notes",),
        ("summarise", "summarize", "summary", "recap", "overview", "gist"),
    ),
]

# "Do something about my notebook" without saying what. The safe answer is the
# whole toolbox: this is exactly the request that needs tools we can't guess.
BROAD_REQUESTS = (
    "tidy", "organise", "organize", "clean up", "sort out", "sort my",
    "go through", "merge", "duplicate", "reorganise", "reorganize",
    "manage my", "look after", "housekeeping", "do whatever",
)


def focus_for(question: str) -> list[str] | None:
    """The tools worth offering for this question, or None for all of them.

    Deliberately keyword-driven rather than another model call: an extra
    round-trip to decide what to send would cost more than it saves, and a
    deterministic rule can be read, tested, and argued with.
    """
    text = f" {(question or '').lower()} "
    if any(cue in text for cue in BROAD_REQUESTS):
        return None
    wanted = list(CORE_TOOLS)
    for group, cues in TOOL_GROUPS:
        if any(cue in text for cue in cues):
            wanted.extend(group)
    # The web tools are the user's own opt-in, made per-notebook rather than
    # per-question; `tool_enabled` already hides them otherwise, and second-
    # guessing that switch here would mean "web search is on but I didn't
    # think you meant it".
    wanted.extend(["web_search", "read_url"])
    return wanted


def tool_enabled(name: str) -> bool:
    """A tool is offered unless the user turned it off in Settings → Tools
    (Wave O). web_search additionally requires the online opt-in."""
    config = deps.get_config()
    if name in ("web_search", "read_url") and not config.get_preference(
        "web_search_enabled", False
    ):
        return False
    return name not in set(config.get_preference("disabled_tools", []))


def ollama_tools(allowed: list[str] | None = None) -> list[dict]:
    """The registry in the shape Ollama's /api/chat 'tools' field wants,
    minus any the user disabled — a model can't be tempted by a tool it
    never hears about.

    `allowed` narrows it further, to the tools a skill declared. That is
    roadmap §11a in one line: 28 schemas are ~77% of the fixed per-round
    overhead, and a skill that needs three of them should pay for three. The
    user's own switches still win — a skill cannot re-enable something turned
    off in Settings → Tools.
    """
    wanted = set(allowed) if allowed else None
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
        if tool_enabled(spec.name) and (wanted is None or spec.name in wanted)
    ]


def tool_catalog() -> list[dict]:
    """Metadata for the Settings → Tools toggles (Wave O)."""
    return [
        {
            "name": spec.name,
            "description": spec.description,
            "destructive": spec.destructive,
            "enabled": tool_enabled(spec.name),
            "online": spec.name in ("web_search", "read_url"),
        }
        for spec in TOOLS.values()
    ]


def confirm_label(name: str, arguments: dict) -> str:
    """Human sentence for the UI's confirm button (destructive tools)."""
    if name == "delete_note":
        return f"Move note #{arguments.get('note_id', '?')} to the recycle bin"
    if name == "delete_tag":
        return f"Remove the tag “{arguments.get('name', '?')}” from every note"
    if name == "delete_skill":
        return f"Delete the saved skill “{arguments.get('name', '?')}”"
    return f"Run {name}"


def execute_tool(session: Session, name: str, arguments: dict) -> dict:
    """Run one tool call. Errors come back as {"error": ...} so the
    agent loop can hand them to the model instead of crashing.

    Only `ToolError` text is passed on — see that class. A `KeyError`, a
    `TypeError`, or a plain `ValueError` from inside a handler is something
    else: a missing argument the model didn't send, or a genuine bug. Its text
    is an internal detail — a key name, a function signature, sometimes a
    fragment of a row — so it goes to the log, and the caller gets a
    description of the *shape* of the problem, which is all a retry needs.
    """
    spec = TOOLS.get(name)
    if spec is None:
        return {"error": f"Unknown tool '{name}'"}
    if not tool_enabled(name):
        return {"error": f"The '{name}' tool is turned off in Settings → Tools"}
    try:
        result = spec.handler(session, dict(arguments or {}))
    except ToolError as exc:
        # An explanation the handler wrote on purpose — safe to hand back.
        session.rollback()
        return {"error": f"{name}: {exc}"}
    except (KeyError, TypeError, ValueError) as exc:
        # A missing or wrong-typed argument, or a bug. Keep the detail here.
        session.rollback()
        logging.getLogger("memorymap.tools").warning(
            "tool %s failed on its arguments (%s)",
            safe_value(name, 40),
            type(exc).__name__,
            exc_info=True,
        )
        return {
            "error": (
                f"{name}: the arguments were missing something or were the "
                f"wrong type. Re-read the tool's schema and try once more."
            )
        }
    manager.log_action(
        session,
        "ai_tool",
        "chat",
        detail=f"{name} {json.dumps(arguments or {})[:200]}",
    )
    session.commit()
    return result
