"""The composer acts: a Chat message read as a command, with no model
(CHAT_PLAN Phase 5 (f); the owner: "or the composer can somehow call tools and
act like an agent").

Six verbs a person reaches for most, read by rules the way `ai/when.py` reads a
time: make a reminder, tag notes, move notes to a category, make a new note,
find or open a note, start a meeting. Three stages, each testable alone:

- `parse(text, now)`: the intent and its arguments from the words alone, or
  None. No database, no model. `tests/test_composer_commands.py` holds the
  table of phrasings this is measured on.
- `plan(session, parsed, note_ids)`: the steps it would take against the
  notebook (which notes "about the plumber" are, whether "Work" exists), as
  the same confirm card an agent's write parks on. Nothing is written.
- `run(session, steps)`: what Confirm does. Each step goes through
  `tools.execute_tool`, the agent's own door, so the audit log, the private
  note refusal and the undo are the agent's; the result is one fixed line
  (`ai/tool_summary.py`) and the undo steps.

A sentence this does not read is not a guess: `parse` returns None and the
turn goes on to the composer (Chat) or gets `CAPABILITY_LINE` (Agent mode with
no model), which says what it can do instead.
"""

from __future__ import annotations

import re
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.ai import reminder_parser, tool_summary, when

#: The verbs that write: each is shown as a card and waits for Confirm.
WRITE_INTENTS = frozenset({"reminder", "tag", "move", "new_note", "meeting"})
#: Read only: answered at once, nothing to confirm.
READ_INTENTS = frozenset({"find", "open"})

#: Agent mode with no model, for anything `parse` does not read. One line, the
#: list in the order the card offers them, and one example to copy.
CAPABILITY_LINE = (
    "With no model running I can do these myself, each after you confirm: set a "
    "reminder, tag notes, move notes to a category, make a new note, find or open "
    "a note, start a meeting. For example: remind me to call mum on Friday."
)

#: Steps a command card may run. The registry tools are the agent's; the two
#: others are this module's own, for what no registry tool does.
RUNNABLE = frozenset(
    {"set_reminder", "tag_note", "edit_note", "create_note", "delete_note", "restore_note",
     "start_meeting", "bin_reminder"}
)

_MAX_TEXT = 300
_MAX_NOTES = 50

# --- parse ---------------------------------------------------------------------
#
# Every pattern runs on text already folded to single spaces and capped at
# `_MAX_TEXT`, and splits are done with `str` methods where a lazy `.+?` would
# otherwise sit before a separator (CodeQL, polynomial regular expression).

_POLITE = ("please ", "can you ", "could you ", "would you ", "will you ", "i want to ",
           "i'd like to ", "i would like to ", "let's ", "lets ", "ok ", "okay ")
_TRAILING = (" please", " for me", " thanks", " thank you")
_ASKING = re.compile(r"^(?:what|who|where|when|how|why|which|whether|if|of|out)\b", re.IGNORECASE)


def _fold(text: str) -> tuple[str, bool, bool]:
    """(the command text, said as a question, said politely)."""
    text = " ".join(str(text or "").split())[:_MAX_TEXT].strip(" .!")
    question = text.endswith("?")
    text = text.rstrip("?").strip(" ,")
    polite = False
    changed = True
    while changed:
        changed = False
        low = text.lower()
        for word in _POLITE:
            if low.startswith(word):
                text, polite, changed = text[len(word):].lstrip(" ,"), True, True
                break
        low = text.lower()
        for word in _TRAILING:
            if low.endswith(word):
                text, changed = text[: -len(word)].rstrip(" ,"), True
                break
    return text, question, polite


def _cap(text: str) -> str:
    text = text.strip(" ,.;:-")
    return text[:1].upper() + text[1:]


def _drop_article(text: str) -> str:
    low = text.lower()
    for word in ("the ", "my ", "a ", "an ", "our "):
        if low.startswith(word):
            return text[len(word):]
    return text


def _split_last(text: str, separators: tuple[str, ...]) -> tuple[str, str] | None:
    """`text` split at the rightmost of `separators`, or None."""
    low = text.lower()
    best = max(((low.rfind(sep), sep) for sep in separators), key=lambda pair: pair[0])
    at, sep = best
    if at <= 0:
        return None
    return text[:at].strip(), text[at + len(sep):].strip()


_THESE = {
    "these notes": False, "these": False, "those notes": False, "those": False,
    "them": False, "these ones": False, "the notes": False,
    "this note": True, "this": True, "it": True, "that note": True,
}
_ABOUT_WORDS = ("about ", "on ", "for ", "mentioning ", "that mention ", "called ", "named ", "titled ")
_NOTE_HEADS = re.compile(
    r"^(?:all )?(?:of )?(?:my |the |all |any )?(notes?|everything|anything|entries|entry) ",
    re.IGNORECASE,
)


def _target(text: str) -> dict | None:
    """Which notes a phrase names: the attached ones ("these notes") or the
    ones a search finds ("my notes about Z", "my Z notes"), or None."""
    low = text.lower().strip()
    if low in _THESE:
        return {"these": True, "single": _THESE[low]}
    head = _NOTE_HEADS.match(text)
    if head:
        rest = text[head.end():]
        rest_low = rest.lower()
        for word in _ABOUT_WORDS:
            if rest_low.startswith(word):
                about = _drop_article(rest[len(word):].strip())
                if not about:
                    return None
                single = head.group(1).lower() in ("note", "entry") and not low.startswith("my notes")
                return {"about": about, "single": single}
        return None
    words = text.split(" ")
    if len(words) >= 2 and words[-1].lower() in ("note", "notes"):
        about = _drop_article(" ".join(words[:-1]))
        if about and about.lower() not in ("all", "the", "my", "these", "those", "some"):
            return {"about": about, "single": words[-1].lower() == "note"}
    return None


def _tags(text: str) -> list[str]:
    text = text.strip(" .,'\"")
    if "#" in text:
        found = re.findall(r"#([\w][\w/-]{0,39})", text)
    else:
        found = []
        for piece in re.split(r",| and ", text):
            piece = piece.strip(" '\"")
            if piece:
                found.append("-".join(piece.split()))
    found = [t for t in found if t and len(t) <= 40]
    return found if 0 < len(found) <= 5 else []


def _reminder(text: str, now: datetime) -> dict | None:
    low = text.lower()
    head = None
    for word in ("remind me", "set me a reminder", "set a reminder", "make a reminder",
                 "add a reminder", "create a reminder", "new reminder", "reminder"):
        if low == word or low.startswith(word + " ") or low.startswith(word + ":"):
            head = word
            break
    if head is None:
        return None
    rest = text[len(head):].strip(" :,-")
    if head == "remind me" and _ASKING.match(rest):
        return None
    about = rest.lower().startswith("about ")
    for lead in ("to ", "about ", "that ", "for "):
        if rest.lower().startswith(lead):
            rest = rest[len(lead):]
            break
    if not rest:
        return None
    parsed = reminder_parser.parse_relative(rest, now) or when.parse_reminder_text(rest, now)
    if parsed is None:
        if about:
            # "Remind me about my trip" with no time is a question as often
            # as a request; a reminder needs the time said.
            return None
        due, said, words = when.resolve("tomorrow", now), False, rest
    else:
        due, said, words = parsed["due_at"], True, parsed["text"]
    for lead in ("to ", "about ", "that ", "for "):
        if words.lower().startswith(lead):
            words = words[len(lead):]
    words = _cap(words)
    if not words or due is None:
        return None
    return {"intent": "reminder", "text": words[:500], "due_at": due, "time_given": said}


def _tag(text: str) -> dict | None:
    low = text.lower()
    if low.startswith(("tag ", "label ")):
        body = text.split(" ", 1)[1]
        split = _split_last(body, (" with ", " as "))
        if split:
            target, tags = split
            for lead in ("the tags ", "the tag ", "tags ", "tag "):
                if tags.lower().startswith(lead):
                    tags = tags[len(lead):]
            found = _target(target)
            if found and _tags(tags):
                return {"intent": "tag", **found, "tags": _tags(tags)}
        for these in sorted(_THESE, key=len, reverse=True):
            if body.lower().startswith(these + " "):
                tags = _tags(body[len(these):])
                if tags:
                    return {"intent": "tag", "these": True, "single": _THESE[these], "tags": tags}
        return None
    for lead in ("add the tags ", "add the tag ", "add tags ", "add tag ", "add the label ", "add label "):
        if low.startswith(lead):
            split = _split_last(text[len(lead):], (" to ",))
            if split:
                tags, target = split
                found = _target(target)
                if found and _tags(tags):
                    return {"intent": "tag", **found, "tags": _tags(tags)}
    return None


_BIN_WORDS = {"bin", "the bin", "trash", "the trash", "recycle bin", "the recycle bin"}


def _move(text: str) -> dict | None:
    low = text.lower()
    verb = next((v for v in ("move ", "file ", "put ", "send ") if low.startswith(v)), None)
    if verb is None:
        return None
    split = _split_last(text[len(verb):], (" to ", " into ", " in ", " under "))
    if not split:
        return None
    target, category = split
    found = _target(target)
    if not found:
        return None
    category = _drop_article(category.strip())
    low_cat = category.lower()
    for tail in (" category", " folder"):
        if low_cat.endswith(tail):
            category = category[: -len(tail)]
    if category.lower().startswith("category "):
        category = category[len("category "):]
    category = category.strip(" '\"")
    if not category or category.lower() in _BIN_WORDS or len(category) > 120:
        return None
    return {"intent": "move", **found, "category": category}


_NOTE_HEADS_NEW = (
    ("note to self", False), ("new note", True), ("quick note", True), ("make a note", False),
    ("take a note", False), ("save a note", False), ("add a note", False), ("create a note", False),
    ("write a note", False), ("jot down", False), ("write down", False), ("note down", False),
    ("note", True),
)


def _new_note(text: str) -> dict | None:
    low = text.lower()
    for head, needs_colon in _NOTE_HEADS_NEW:
        if not (low.startswith(head + " ") or low.startswith(head + ":")):
            continue
        rest = text[len(head):].lstrip()
        if needs_colon and not rest.startswith(":"):
            return None
        rest = rest.lstrip(" :-")
        for lead in ("that ", "saying ", "of ", "about ", "to say "):
            if rest.lower().startswith(lead):
                rest = rest[len(lead):]
                break
        rest = _cap(rest)
        return {"intent": "new_note", "content": rest} if rest else None
    return None


_FIND_HEADS = ("search for ", "look for ", "look up ", "show me ", "where is ", "where's ",
               "where are ", "get me ", "find ", "search ", "show ", "list ")
_OPEN_HEADS = ("take me to ", "jump to ", "pull up ", "bring up ", "go to ", "open ")
_FREE_FIND = ("find ", "search for ", "search ", "look for ", "look up ")


def _find(text: str) -> dict | None:
    low = text.lower()
    for heads, intent in ((_OPEN_HEADS, "open"), (_FIND_HEADS, "find")):
        head = next((h for h in heads if low.startswith(h)), None)
        if head is None:
            continue
        rest = text[len(head):].strip()
        number = re.fullmatch(r"(?:(?:note|entry) )?#?(\d{1,9})", rest, re.IGNORECASE)
        if number and (rest.startswith("#") or not rest.isdigit()):
            return {"intent": intent, "note_id": int(number.group(1))}
        found = _target(rest)
        if found and found.get("about"):
            return {"intent": intent, "about": found["about"]}
        if intent == "find" and head in _FREE_FIND and rest and not _ASKING.match(rest):
            about = _drop_article(rest)
            return {"intent": "find", "about": about} if about else None
        return None
    return None


_MEETING = re.compile(
    r"^(?:start|begin|new|create|open|record|make|run|hold) (?:(?:a|an|the|new|my|our) )*meeting(?: note)?"
    r"(?: (about|on|for|called|named|titled|with) (.+)|: ?(.+))?$",
    re.IGNORECASE,
)
_NAMED_MEETING = re.compile(r"^(?:start|begin|record|open) (?:(?:a|an|the|my|our) )?([\w' -]{1,80}) meeting$", re.IGNORECASE)


def _meeting(text: str) -> dict | None:
    found = _MEETING.match(text)
    if found:
        word, said, colon = found.group(1), found.group(2), found.group(3)
        title = said or colon or ""
        if word and word.lower() == "with":
            return {"intent": "meeting", "title": f"Meeting with {title.strip()}"}
        return {"intent": "meeting", "title": _cap(_drop_article(title.strip()))}
    named = _NAMED_MEETING.match(text)
    if named:
        return {"intent": "meeting", "title": _cap(_drop_article(named.group(1).strip()))}
    return None


def parse(text: str, now: datetime) -> dict | None:
    """The command `text` is, as {"intent", ...arguments}, or None."""
    command, question, polite = _fold(text)
    if not command:
        return None
    for reader in (_meeting, lambda t: _reminder(t, now), _new_note, _tag, _move, _find):
        found = reader(command)
        if found is None:
            continue
        if question and not polite and found["intent"] in WRITE_INTENTS:
            # "Note: is the boiler code 4471?" asks; it does not tell.
            return None
        return found
    return None


# --- plan ----------------------------------------------------------------------


def _content_words(text: str) -> list[str]:
    return [w for w in re.findall(r"[\w']+", text.lower()) if len(w) > 1 and w not in _STOP]


_STOP = frozenset({"the", "a", "an", "my", "of", "and", "or", "to", "in", "on", "for", "with", "about", "all"})


def _notes_about(session: Session, about: str, single: bool) -> list:
    """The notes "about Z" names: every word of Z in the note's text or tags.

    Read as words, not by meaning, on purpose: these notes are about to be
    written to, and a write wants the notes that say the thing, not the ones
    that are near it. Ranked by the search the agent's own `search_notes`
    uses, so "the note about Z" is that search's first match.
    """
    from memorymap.core import deps
    from memorymap.entry import manager
    from memorymap.search import search_manager

    words = _content_words(about)
    if not words:
        return []
    found = search_manager.retrieve_detailed(session, about, deps.get_embeddings(), limit=_MAX_NOTES)
    picked = []
    for entry in found.entries:
        if entry.id in found.connected_ids or entry.is_deleted:
            continue
        hay = (entry.content or "").lower() + " " + " ".join(manager.entry_tags(entry)).lower()
        if all(re.search(rf"\b{re.escape(w)}", hay) for w in words):
            picked.append(entry)
    return picked[:1] if single else picked


def _attached(session: Session, note_ids: list[int] | None) -> list:
    from memorymap.entry import manager

    out = []
    for note_id in note_ids or []:
        entry = manager.get_entry(session, int(note_id))
        if entry is not None:
            out.append(entry)
    return out


def _title(entry) -> str:  # noqa: ANN001
    from memorymap.ai.tools._common import _readable

    first = " ".join(_readable(entry).split())
    first = first.lstrip("# ")
    return first[:48] + ("…" if len(first) > 48 else "")


def _existing_category(session: Session, name: str) -> str | None:
    from memorymap.core.database import Category

    wanted = name.casefold()
    for existing in session.scalars(select(Category.name)):
        if existing and existing.casefold() == wanted:
            return existing
    return None


def _split_allowed(entries: list) -> tuple[list, list[dict]]:
    """(the notes a write may touch, the ones it may not, with the reason)."""
    ok, skipped = [], []
    for entry in entries[:_MAX_NOTES]:
        if entry.is_deleted:
            skipped.append({"id": entry.id, "reason": "binned"})
        elif entry.is_private:
            skipped.append({"id": entry.id, "reason": "private"})
        else:
            ok.append(entry)
    return ok, skipped


def _which(parsed: dict, session: Session, note_ids: list[int] | None) -> tuple[list, str]:
    """The notes a tag or move names, and how to say which they are."""
    if parsed.get("these"):
        return _attached(session, note_ids), "the attached notes"
    about = parsed.get("about") or ""
    return _notes_about(session, about, bool(parsed.get("single"))), f"about “{about}”"


def _card(label: str, steps: list[dict], skipped: list[dict] | None = None, items: list[str] | None = None) -> dict:
    """The agent's confirm event, carrying steps instead of one call."""
    return {
        "type": "confirm",
        "name": "command",
        "arguments": {},
        "label": label,
        "steps": steps,
        "skipped": skipped or [],
        "items": items or [],
        "notice": tool_summary.GUARD["confirm_person"],
    }


def _when_words(due: datetime) -> str:
    return f"{due.strftime('%a')} {due.day} {due.strftime('%b')} at {due.strftime('%H:%M')}"


def plan(session: Session, parsed: dict, note_ids: list[int] | None = None) -> dict:
    """What the command would do: {"line", "card"?, "tool"?}. Writes nothing."""
    intent = parsed["intent"]
    if intent == "reminder":
        due = parsed["due_at"]
        when_said = _when_words(due) + ("" if parsed.get("time_given") else " (no time was said)")
        steps = [{"name": "set_reminder", "arguments": {"text": parsed["text"], "due_at": due.isoformat()}}]
        return {
            "line": f"I can set a reminder “{parsed['text']}” for {when_said}. Confirm to set it.",
            "card": _card(f"Set a reminder “{parsed['text']}” for {when_said}", steps),
        }
    if intent == "new_note":
        steps = [{"name": "create_note", "arguments": {"content": parsed["content"]}}]
        return {
            "line": "I can save that as a new note, filed like any note you write. Confirm to save it.",
            "card": _card(f"Make a new note: “{_clip(parsed['content'], 80)}”", steps),
        }
    if intent == "meeting":
        title = parsed.get("title") or ""
        steps = [{"name": "start_meeting", "arguments": {"title": title}}]
        named = f" “{title}”" if title else ""
        return {
            "line": f"I can start a meeting note{named} now. Confirm to start it.",
            "card": _card(f"Start a meeting{named}", steps),
        }
    if intent in ("tag", "move"):
        entries, which = _which(parsed, session, note_ids)
        if not entries:
            return {
                "line": (
                    "Attach the notes first with the paperclip, or say which, like: "
                    + ("tag my notes about the trip with travel." if intent == "tag" else "move my notes about the plumber to Home.")
                )
                if parsed.get("these")
                else f"I found no note {which}, so there is nothing to {'tag' if intent == 'tag' else 'move'}.",
            }
        ok, skipped = _split_allowed(entries)
        items = [f"#{e.id} {_title(e)}" for e in ok]
        count = f"{len(ok)} note{'' if len(ok) == 1 else 's'}"
        if intent == "tag":
            tags = " ".join(f"#{t}" for t in parsed["tags"])
            steps = [{"name": "tag_note", "arguments": {"note_ids": [e.id for e in ok], "add": parsed["tags"]}}] if ok else []
            label = f"Tag {count} {which} {tags}"
        else:
            existing = _existing_category(session, parsed["category"])
            category = existing or parsed["category"]
            steps = [{"name": "edit_note", "arguments": {"note_id": e.id, "category": category}} for e in ok]
            label = f"Move {count} {which} to {category}" + ("" if existing else " (a new category)")
        if not ok:
            return {"line": tool_summary.summarise([], skipped)}
        return {
            "line": f"{label}. Confirm to do it." + (f" {tool_summary.not_done(skipped)}" if skipped else ""),
            "card": _card(label, steps, skipped, items),
        }
    if intent in READ_INTENTS:
        return _plan_read(session, parsed)
    raise ValueError(intent)


def _clip(text: str, cap: int) -> str:
    return text if len(text) <= cap else text[: cap - 1].rstrip() + "…"


def _plan_read(session: Session, parsed: dict) -> dict:
    """Find or open: run the agent's own search and hand back its tool event."""
    from memorymap.ai import agent, cards, tools

    if parsed.get("note_id") is not None:
        result = tools.execute_tool(session, "get_note", {"note_id": parsed["note_id"]})
        if "error" in result:
            return {"line": f"I could not open note #{parsed['note_id']}: it does not exist, or it is private."}
        name, args = "get_note", {"note_id": parsed["note_id"]}
        line = f"Here is note #{parsed['note_id']}. Open it from the row below."
    else:
        about = parsed["about"]
        result = tools.execute_tool(session, "search_notes", {"query": about, "limit": 8})
        if "error" in result or not result.get("notes"):
            return {"line": f"I found no note about “{about}”."}
        if parsed["intent"] == "open":
            result = {**result, "notes": result["notes"][:1]}
        name, args = "search_notes", {"query": about}
        found = len(result["notes"])
        line = (
            f"The closest note about “{about}” is below. Open it from the row."
            if parsed["intent"] == "open"
            else f"I found {found} note{'' if found == 1 else 's'} about “{about}”. Open one from the rows below."
        )
    event = {
        "type": "tool",
        "name": name,
        "arguments": args,
        "label": result.get("label") or name,
        "ok": True,
        "touched": agent._touched_items(result),
        "cards": cards.result_cards(name, result),
    }
    return {"line": line, "tool": event}


# --- run -----------------------------------------------------------------------


def _start_meeting(session: Session, args: dict) -> dict:
    from memorymap.api.routes_meetings import MeetingCreate, create_meeting
    from memorymap.core import deps
    from memorymap.core.config import user_now

    now = user_now(deps.get_config())
    out = create_meeting(MeetingCreate(title=str(args.get("title") or "")[:200], when=now.strftime("%Y-%m-%dT%H:%M")), session)
    return {
        "id": out.id,
        "title": str(args.get("title") or ""),
        "open": {"kind": "meeting", "id": out.id},
        "undo": {"tool": "delete_note", "arguments": {"note_id": out.id}},
    }


def _bin_reminder(session: Session, args: dict) -> dict:
    from memorymap.api.routes_reminders import delete_reminder

    delete_reminder(int(args["reminder_id"]), session)
    return {"binned": int(args["reminder_id"])}


def run(session: Session, steps: list[dict], skipped: list[dict] | None = None) -> dict:
    """Run a confirmed card's steps: {"summary", "undo", "open"?, "ok"}.

    Every step is tried even when one fails, and each failure is a "Not done"
    in the line rather than a stop: a person who confirmed tagging five notes
    gets the four that could be tagged and is told about the fifth.
    """
    from memorymap.ai import tools

    done: list[tuple[str, dict, dict]] = []
    not_done: list[dict] = list(skipped or [])
    undo: list[dict] = []
    opened = None
    for step in steps:
        name = str(step.get("name") or "")
        args = dict(step.get("arguments") or {})
        if name not in RUNNABLE:
            not_done.append({"id": None, "reason": "failed"})
            continue
        if name == "start_meeting":
            result = _start_meeting(session, args)
        elif name == "bin_reminder":
            result = _bin_reminder(session, args)
        else:
            result = tools.execute_tool(session, name, args)
        if "error" in result:
            reason = "private" if "is private" in str(result["error"]) else "failed"
            not_done.append({"id": args.get("note_id"), "reason": reason})
            continue
        done.append((name, args, result))
        step_undo = result.get("undo")
        if name == "set_reminder" and result.get("id") is not None:
            step_undo = {"tool": "bin_reminder", "arguments": {"reminder_id": result["id"]}}
        if isinstance(step_undo, dict):
            undo.extend(step_undo["steps"] if step_undo.get("tool") == "batch" else [step_undo])
        opened = result.get("open") or opened
    summary = tool_summary.summarise([tool_summary.done_clause(n, a, r) for n, a, r in done], not_done)
    out = {
        "ok": bool(done),
        "summary": summary,
        "label": summary,
        "undo": [{"name": u["tool"], "arguments": u.get("arguments") or {}} for u in undo if u.get("tool")],
    }
    if opened:
        out["open"] = opened
    return out
