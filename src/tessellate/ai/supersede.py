"""A newer note on the same thing is the current one (O11; BACKLOG "Facts
change over time", the owner, 2026-10-12: "a newer note about the same thing
supersedes an older one instead of confusing the answer").

Measured 2026-10-17 with the composer and no model: "what are my uni days"
over a February note ("Uni days this semester: Tuesday and Thursday") and a
July one ("Uni days this semester are Monday and Wednesday") answered from
February; "what is my address" over "My address is 12 Oak Street" (2025)
and "My address is now 4 Birch Road" (2026) quoted the old address.

**Same thing, by its subject.** A state sentence names what it is about
before its value: the words before a colon ("Uni days this semester:
Tuesday and Thursday") or before "is" or "are" ("My address is now ...").
Two notes whose subjects share most of their words, and whose values
differ, are one thing at two times; the newer is current. Validity words
("this semester", "now", "currently") are not part of a subject.

**Never silently dropped.** The answer is the current note's, and one line
says what the older one said and when ("An older note, from 20 February,
said Tuesday and Thursday"). A question about the change or the past
("what changed", "last semester", "used to", "before") keeps both.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

from tessellate.ai import recognise
from tessellate.search import query as query_understanding

#: Words that say when a value holds, not what it is about.
_VALIDITY = frozenset(
    "this that current currently now new latest semester term year week month today these days anymore still my our".split()
)
_SENTENCE = re.compile(r"(?<=[.!?])\s+|\n+")
_COLON = re.compile(r"^([^:]{3,60}):\s*(\S.*)$")
_COPULA = re.compile(r"^(.{3,60}?)\s+(?:is|are|was|were)\s+(?:now\s+|still\s+)?(\S.*)$", re.I)


@dataclass(frozen=True)
class Replaced:
    older: dict
    newer: dict
    value: str
    written: date | None


def _subjects(text: str) -> list[tuple[frozenset, str]]:
    """Each state sentence's subject words and its value."""
    found = []
    for sentence in _SENTENCE.split(text or ""):
        sentence = sentence.strip().rstrip(".!?")
        m = _COLON.match(sentence) or _COPULA.match(sentence)
        if not m:
            continue
        words = frozenset(w for w in query_understanding.search_terms(m.group(1)) if w not in _VALIDITY)
        if words:
            found.append((words, m.group(2).strip()))
    return found


_SPELLED = re.compile(r"\b(\d{1,2}) (January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})\b")
_MONTHS = ("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")


def _day(note: dict) -> date | None:
    """The day a note was written: its ISO `created_at`, or the route's
    spelled-out `written` ("Friday 20 February 2026, 10:00")."""
    try:
        return date.fromisoformat(str(note.get("created_at") or "")[:10])
    except ValueError:
        pass
    spelled = _SPELLED.search(str(note.get("written") or ""))
    if spelled:
        return date(int(spelled.group(3)), _MONTHS.index(spelled.group(2)) + 1, int(spelled.group(1)))
    return None


def _same(a: frozenset, b: frozenset) -> bool:
    return len(a & b) / len(a | b) >= 0.6


def current(question: str, notes: list[dict]) -> tuple[list[dict], list[Replaced]]:
    """`notes` with each note a newer one supersedes left out, and what was
    left out; unchanged for a question about the change or the past."""
    if recognise.says_past(question) or len(notes) < 2:
        return notes, []
    #: Only the subject asked about: an older note says other things too, and
    #: "what are my uni days" is no reason to set aside an old note on golf.
    read = _read(question, notes)
    replaced = [r for r in (_replaced_by(row, read) for row in read) if r]
    gone = {id(r.older) for r in replaced}
    return [n for n in notes if id(n) not in gone], replaced


def _read(question: str, notes: list[dict]) -> list[tuple]:
    """Each note with its subjects that the question names, and its day."""
    asked = frozenset(w for w in query_understanding.search_terms(question or "") if w not in _VALIDITY)
    return [(n, [(w, v) for w, v in _subjects(str(n.get("content") or "")) if w & asked], _day(n)) for n in notes]


def _replaced_by(row: tuple, read: list[tuple]) -> Replaced | None:
    """The first newer note that says something else of a subject `row`'s
    note names, or None."""
    older, old_subjects, old_day = row
    for newer, new_subjects, new_day in read:
        if newer is older or not old_day or not new_day or new_day <= old_day:
            continue
        for words, value in old_subjects:
            match = next((v for w, v in new_subjects if _same(words, w)), None)
            if match is not None and match.lower() != value.lower():
                return Replaced(older, newer, value, old_day)
    return None


_NATURAL = (
    "An older note, from {when}, said {value}.",
    "Before that, on {when}, you had written {value}.",
    "Your earlier note, from {when}, said {value}.",
    "That replaces what you wrote on {when}: {value}.",
    "On {when} it was {value}.",
    "Back on {when}, your note said {value}.",
    "Earlier, on {when}, you noted {value}.",
    "It used to be {value}, going by your note from {when}.",
)
_PROFESSIONAL = (
    "An earlier note, dated {when}, recorded {value}.",
    "This supersedes the entry of {when}, which recorded {value}.",
    "The previous entry, from {when}, stated {value}.",
    "On {when} the notes recorded {value}.",
    "An older entry, dated {when}, gave {value}.",
    "Previously, as of {when}: {value}.",
    "The entry of {when} recorded {value}, since replaced.",
    "The record of {when}, {value}, has since been replaced.",
)


def older_line(replaced: list[Replaced], *, voice: str = "natural", today: date | None = None, seed: int = 0) -> str:
    """One line for the first note left out: what it said, and when."""
    if not replaced:
        return ""
    first = replaced[0]
    today = today or date.today()
    when = ""
    if first.written:
        when = f"{first.written.day} {first.written:%B}" + ("" if first.written.year == today.year else f" {first.written.year}")
    lines = _PROFESSIONAL if voice == "professional" else _NATURAL
    line = lines[seed % len(lines)]
    return line.format(when=when or "an earlier day", value=first.value.rstrip("."))
