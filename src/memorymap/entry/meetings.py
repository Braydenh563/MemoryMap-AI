"""A meeting note: one shape, written and read here (INBOX 644).

**A template, not a silo.** A meeting is an ordinary note whose property block
says `type: Meeting` (GRAPH_PLAN KG4's built-in type) and whose body has four
headed sections. Search, filing, links, the graph, the properties table and
the notes filter (`type:meeting`) all work on it because it is a note; nothing
here stores anything a note does not already hold. What this module adds is
the one place that knows the shape: the writer every "New meeting" uses, and
the readers the meeting sheet and the reminder button need.

The audit that led here (docs/roadmap/archive/agent-remaining/meetings-644.md) found
four meeting shapes that disagreed: a four-line Capture template, a document
template, the note type, and the recorder's plain transcript. They are one
shape now, this one:

    ---
    type: Meeting
    date: 2026-10-07 14:00
    attendees: [Sam, Priya]
    ---
    # Weekly sync

    ## Agenda
    ## Notes
    ## Decisions
    ## Action items
    - [ ] Send the deck @Sam by Friday

**An action item is a task line** (`- [ ]`), which the editor already draws
as a checkbox and the Dashboard's Outstanding widget already lists. Its owner
is an `@Name` in the line and its due is the plain words a reminder already
reads ("by Friday", "tomorrow at 3pm"): no new syntax to learn, and a line
typed without either is still an action item.

The date is the writer's wall clock with no zone, the convention
`EntryDate` keeps for the same reason: a meeting at two is at two wherever
the laptop is when the timeline is opened.
"""

from __future__ import annotations

import re

from memorymap.entry import properties as note_properties

MEETING_TYPE = "Meeting"
#: The tag the Library's Meetings chip and the Notes sidebar's Meetings row
#: have always counted (the recorder wrote it first); every meeting carries it
#: so a meeting made any way is found by both.
MEETING_TAG = "meeting"

AGENDA = "Agenda"
NOTES = "Notes"
DECISIONS = "Decisions"
ACTIONS = "Action items"
SECTIONS = (AGENDA, NOTES, DECISIONS, ACTIONS)

#: Older spellings of the same section, read as it: the document template's
#: "Actions", the Capture template's "To do", what people type.
_SECTION_ALIASES = {
    ACTIONS.lower(): ACTIONS,
    "actions": ACTIONS,
    "action points": ACTIONS,
    "to do": ACTIONS,
    "todo": ACTIONS,
    "to-do": ACTIONS,
    "next steps": ACTIONS,
    DECISIONS.lower(): DECISIONS,
    "decided": DECISIONS,
    AGENDA.lower(): AGENDA,
    NOTES.lower(): NOTES,
    "discussion": NOTES,
    "transcript": NOTES,
}

_HEADING = re.compile(r"^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$")
#: A markdown task: `- [ ]`, `* [x]`, `1. [ ]`, the shape the editor writes
#: and the Dashboard's Outstanding widget reads (`dashboard.js`).
_TASK = re.compile(r"^[ \t]*(?:[-*+]|\d{1,3}[.)])[ \t]+\[([ xX])\][ \t]*(.*)$")
_BULLET = re.compile(r"^[ \t]*(?:[-*+]|\d{1,3}[.)])[ \t]+(.*)$")
#: The owner: the first `@Name` in the line. A word, as a mention is
#: everywhere else in the app; "Sam Lee" is written `@Sam`.
_OWNER = re.compile(r"(?<![\w@])@([A-Za-z][\w.'-]{0,39})")
#: The citation the Summarise pass writes after a line it filled in:
#: `, from “the words it came from”`. Read off before the line's due is
#: parsed, so a quoted "by Friday" never sets a reminder's day.
CITE = re.compile(r",?[ \t]*from[ \t]+“[^”]*”[ \t]*$")

#: How long a typed title or attendee name may be: a line of a list, not a
#: paragraph.
MAX_TITLE = 200
MAX_ATTENDEE = 60
MAX_ATTENDEES = 40


def _clean(text: str, limit: int) -> str:
    return " ".join(str(text or "").split())[:limit]


def compose(
    title: str,
    when: str = "",
    attendees: list[str] | None = None,
    agenda: list[str] | None = None,
    notes: str = "",
) -> str:
    """The text of a new meeting note. `when` is `YYYY-MM-DD HH:MM` (or a
    date alone, or "") in the writer's own clock; the rest is what the New
    meeting sheet asked for, any of it empty."""
    name = _clean(title, MAX_TITLE) or MEETING_TYPE
    people = []
    for person in attendees or []:
        cleaned = _clean(person, MAX_ATTENDEE).lstrip("@")
        if cleaned and cleaned.lower() not in {p.lower() for p in people}:
            people.append(cleaned)
    items = [_clean(item, 300) for item in agenda or [] if _clean(item, 300)]
    agenda_lines = "\n".join(f"{n}. {item}" for n, item in enumerate(items, 1)) or "1. "
    body = (
        f"# {name}\n\n"
        f"## {AGENDA}\n\n{agenda_lines}\n\n"
        f"## {NOTES}\n\n{str(notes or '').strip()}\n\n"
        f"## {DECISIONS}\n\n- \n\n"
        f"## {ACTIONS}\n\n- [ ] \n"
    )
    props: dict[str, object] = {"type": MEETING_TYPE, "date": _clean(when, 20), "attendees": people[:MAX_ATTENDEES]}
    return note_properties.write(body, props)


def is_meeting(content: str, tags: list[str] | None = None) -> bool:
    """A note is a meeting when its type says so or it carries the tag."""
    if any(str(tag).lower() == MEETING_TAG for tag in tags or []):
        return True
    found, _ = note_properties.split(content or "")
    kind = note_properties.note_type(found)
    return bool(kind) and kind.strip().lower() == MEETING_TYPE.lower()


def _section_of(heading_text: str) -> str | None:
    return _SECTION_ALIASES.get(heading_text.strip().rstrip(":").lower())


def _body_offset(content: str) -> tuple[int, list[str]]:
    """The line index the body starts on, and every line of the text."""
    lines = str(content or "").split("\n")
    end = note_properties.block_end(content or "")
    if not end:
        return 0, lines
    return str(content)[:end].count("\n"), lines


def _sections(content: str) -> dict[str, tuple[int, int]]:
    """`{section: (first line after its heading, line its next heading is on)}`,
    in whole-text line numbers. The first heading of a name wins."""
    start, lines = _body_offset(content)
    found: dict[str, tuple[int, int]] = {}
    open_name: str | None = None
    open_at = 0
    for index in range(start, len(lines)):
        match = _HEADING.match(lines[index])
        if not match:
            continue
        if open_name is not None and open_name not in found:
            found[open_name] = (open_at, index)
        open_name = _section_of(match.group(2))
        open_at = index + 1
    if open_name is not None and open_name not in found:
        found[open_name] = (open_at, len(lines))
    return found


def strip_cite(text: str) -> str:
    return CITE.sub("", text or "").strip()


def action_items(content: str) -> list[dict]:
    """Every task line of the note, in order. A meeting's action items are
    its checkboxes wherever they were written (OneNote's To Do tags are
    anywhere on the page too); one with no words is a placeholder and
    skipped. `line` is the whole-text line number, which is what the
    reminder button names, so two items with the same words stay apart."""
    start, lines = _body_offset(content)
    items = []
    for index in range(start, len(lines)):
        match = _TASK.match(lines[index])
        if not match:
            continue
        raw = match.group(2).strip()
        task = strip_cite(raw)
        if not task:
            continue
        owner = _OWNER.search(task)
        items.append(
            {
                "line": index,
                "text": task,
                "done": match.group(1) in "xX",
                "owner": owner.group(1) if owner else None,
                "cited": task != raw,
            }
        )
    return items


def section_items(content: str, section: str) -> list[str]:
    """The non-empty bullet lines of one section, without their markers."""
    span = _sections(content).get(section)
    if not span:
        return []
    lines = str(content or "").split("\n")
    out = []
    for line in lines[span[0] : span[1]]:
        match = _BULLET.match(line)
        if match:
            text = match.group(1)
            task = _TASK.match(line)
            if task:
                text = task.group(2)
            text = text.strip()
            if text:
                out.append(text)
    return out


def section_text(content: str, section: str) -> str:
    span = _sections(content).get(section)
    if not span:
        return ""
    return "\n".join(str(content or "").split("\n")[span[0] : span[1]]).strip()


_EMPTY_BULLET = re.compile(r"[ \t]*(?:[-*+]|\d{1,3}[.)])[ \t]*")


def _is_placeholder(line: str) -> bool:
    """`- `, `1. ` or `- [ ] ` with nothing after: the empty row a new
    meeting starts each list with, replaced by the first real line."""
    task = _TASK.match(line)
    if task:
        return not task.group(2).strip()
    return bool(_EMPTY_BULLET.fullmatch(line))


def append_to_section(content: str, section: str, new_lines: list[str]) -> str:
    """The text with `new_lines` added at the end of `section`'s list (an
    empty placeholder row taken out), or the section added at the end when
    the note has none. Never rewrites a line the person wrote; the block and
    every other line are copied as they were."""
    additions = [str(line).rstrip() for line in new_lines if str(line).strip()]
    if not additions:
        return content
    text = str(content or "")
    lines = text.split("\n")
    span = _sections(text).get(section)
    if span is None:
        return f"{text.rstrip()}\n\n## {section}\n\n" + "\n".join(additions) + "\n"
    first, stop = span
    kept = [line for line in lines[first:stop] if not _is_placeholder(line)]
    while kept and not kept[-1].strip():
        kept.pop()
    if not kept:
        #: The blank line under the heading, as the shape writes it.
        kept = [""]
    #: A blank line after, for the next heading's gap or the text's last
    #: newline.
    return "\n".join([*lines[:first], *kept, *additions, "", *lines[stop:]])


def meeting_date(content: str) -> str:
    found, _ = note_properties.split(content or "")
    values = found.get("date") or []
    return values[0] if values else ""


def attendees(content: str) -> list[str]:
    found, _ = note_properties.split(content or "")
    return [v for v in found.get("attendees") or [] if v]


def reminder_text(item: dict) -> str:
    """What the reminder an action item becomes says: the task, its owner
    kept as written so "@Sam" still says whose it is."""
    return _clean(item["text"], 300)
