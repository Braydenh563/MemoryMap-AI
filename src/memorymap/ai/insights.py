"""Patterns in the notes, measured, with a fixed hedge (CHAT_PLAN Phase 6,
decision 32): never a claim about the person, always a count over their own
notes, said with one tested phrase that fires only on its rule.

"You have written about golf 4 times since 5 September, three of them after
work; that may be a hobby forming." Every slot of every template is a count,
a date or the person's own words (`composer_tables.INSIGHT_TEMPLATES`; a lint
in `tests/test_insights.py` holds it), so the sentence is re-derived from the
notes by running the rule again, which is what the eval does.

The rules, each a function over the notes and their facts (`factgraph`):

- recurrence: a subject in at least 3 notes across at least 3 weeks;
- streak: a subject written about in at least 3 consecutive weeks;
- drift: a plan at least 30 days old with no later note on it;
- contrast: a preference, then a later one the other way about the same thing;
- load: a week with at least twice the median count of notes (and 4 or more);
- time of day: at least 3 of a subject's notes say "after work", "in the
  evening" or "before work", "in the morning".

Insights close a broad answer and make the Patterns line (Tidy and the
dashboard, `routes_insights`); they are never filed as facts.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, timedelta
from statistics import median

from memorymap.ai import composer_tables, recognise

#: The thresholds each rule fires on (decision 32): below them, silence.
MIN_NOTES = 3
MIN_WEEKS = 3
DRIFT_DAYS = 30
LOAD_FACTOR = 2.0
LOAD_MIN = 4
TIME_OF_DAY_MIN = 3

_MONTHS = ("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")
#: Words that say a subject is something done for its own sake: a session, a
#: round, practice, a game. With one of them, a recurring subject "may be a
#: hobby forming"; without, it "keeps coming up".
_LEISURE = re.compile(r"\b(?:after work|weekend|session|round|practi[cs]e|played|game|class|lesson|hobby|for fun|drills?)\b", re.I)


@dataclass
class Insight:
    """One measured line: its rule, its sentence, and the notes it rests on."""

    rule: str
    text: str
    note_ids: list[int] = field(default_factory=list)
    #: The slot values, typed (count, date, quoted), for the lint and the eval.
    slots: dict = field(default_factory=dict)


def _day(day: date, today: date) -> str:
    if day.year == today.year:
        return f"{day.day} {_MONTHS[day.month - 1]}"
    return f"{day.day} {_MONTHS[day.month - 1]} {day.year}"


def _count_word(n: int) -> str:
    words = ("no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten")
    return words[n] if 0 <= n < len(words) else str(n)


def _written(note: dict) -> date | None:
    raw = str(note.get("created_at") or "")
    try:
        return date.fromisoformat(raw[:10]) if re.match(r"\d{4}-\d{2}-\d{2}", raw) else None
    except ValueError:
        return None


def _holds(note: dict, subject: str) -> bool:
    words = subject.lower().split()
    text = (str(note.get("content") or "") + " " + " ".join(str(t) for t in note.get("tags") or [])).lower()
    return all(re.search(rf"\b{re.escape(w)}", text) for w in words)


def _week(day: date) -> tuple[int, int]:
    iso = day.isocalendar()
    return iso[0], iso[1]


def _fill(rule: str, slots: dict) -> str:
    return composer_tables.INSIGHT_TEMPLATES[rule].format(**{k: v for k, v in slots.items()})


def recurrence(subject: str, notes: list[dict], today: date) -> Insight | None:
    """`subject` in at least `MIN_NOTES` notes across at least `MIN_WEEKS`
    weeks: how many, since when, how many of them after work, and a hedge."""
    dated = sorted(((d, n) for n in notes if _holds(n, subject) and (d := _written(n))), key=lambda pair: pair[0])
    if len(dated) < MIN_NOTES or len({_week(d) for d, _ in dated}) < MIN_WEEKS:
        return None
    after = sum(1 for _d, n in dated if recognise.part_of_day(str(n.get("content") or "")) == "evening")
    leisure = any(_LEISURE.search(str(n.get("content") or "")) for _d, n in dated)
    slots = {
        "subject": subject,
        "count": len(dated),
        "since": _day(dated[0][0], today),
        "after": f", {_count_word(after)} of them after work" if after >= TIME_OF_DAY_MIN else "",
        "hedge": composer_tables.INSIGHT_HEDGES["hobby" if leisure else "recurs"],
    }
    return Insight("recurrence", _fill("recurrence", slots), [n["id"] for _d, n in dated], slots)


def streak(subject: str, notes: list[dict], today: date) -> Insight | None:
    """`subject` written about in at least `MIN_WEEKS` consecutive weeks,
    ending this week or last."""
    weeks = sorted({_week(d) for n in notes if _holds(n, subject) and (d := _written(n))})
    if not weeks:
        return None
    run = 1
    last = weeks[-1]
    for earlier, later in zip(reversed(weeks[:-1]), reversed(weeks[1:])):
        gap = (date.fromisocalendar(later[0], later[1], 1) - date.fromisocalendar(earlier[0], earlier[1], 1)).days
        if gap != 7:
            break
        run += 1
    this_week = _week(today)
    last_week = _week(today - timedelta(days=7))
    if run < MIN_WEEKS or last not in (this_week, last_week):
        return None
    slots = {"subject": subject, "weeks": run}
    ids = [n["id"] for n in notes if _holds(n, subject) and _written(n)]
    return Insight("streak", _fill("streak", slots), ids, slots)


def drift(notes: list[dict], today: date) -> list[Insight]:
    """Plans at least `DRIFT_DAYS` old that no later note follows up: the
    plan's own words, quoted, and the day it was written."""
    from memorymap.ai import factgraph

    out: list[Insight] = []
    for note in notes:
        written = _written(note)
        if written is None or (today - written).days < DRIFT_DAYS:
            continue
        for fact in factgraph.facts(note):
            if fact.kind != "plan" or fact.mode != "asserted":
                continue
            words = [w for w in re.findall(r"[a-z]{4,}", fact.attrs.get("object", "").lower()) if w not in _PLAIN]
            if not words:
                continue
            later = [
                n for n in notes
                if n is not note and (d := _written(n)) and d > written and sum(1 for w in words if re.search(rf"\b{w}", str(n.get("content") or "").lower())) >= (len(words) + 1) // 2
            ]
            if later:
                continue
            slots = {"plan": fact.text, "since": _day(written, today)}
            out.append(Insight("drift", _fill("drift", slots), [note["id"]], slots))
    return out


def contrast(notes: list[dict], today: date) -> list[Insight]:
    """A preference, then a later note the other way about the same object."""
    from memorymap.ai import factgraph

    said = []
    for note in notes:
        written = _written(note)
        if written is None:
            continue
        for fact in factgraph.facts(note):
            if fact.kind == "preference" and fact.attrs.get("object"):
                said.append((written, note, fact))
    said.sort(key=lambda row: row[0])
    out: list[Insight] = []
    for i, (first_day, first_note, first) in enumerate(said):
        target = set(re.findall(r"[a-z]{4,}", first.attrs["object"].lower())) - _PLAIN
        for later_day, later_note, later in said[i + 1:]:
            if later_day <= first_day or later.attrs.get("polarity") == first.attrs.get("polarity"):
                continue
            if target & set(re.findall(r"[a-z]{4,}", later.attrs["object"].lower())):
                slots = {"first": _day(first_day, today), "before": first.text, "last": _day(later_day, today), "after_said": later.text}
                out.append(Insight("contrast", _fill("contrast", slots), [first_note["id"], later_note["id"]], slots))
                break
    return out


def load(notes: list[dict], today: date) -> Insight | None:
    """The busiest week, when it had at least twice the median week's notes."""
    weeks = Counter(_week(d) for n in notes if (d := _written(n)))
    if len(weeks) < 3:
        return None
    (year, week), most = weeks.most_common(1)[0]
    usual = median(weeks.values())
    if most < LOAD_MIN or most < LOAD_FACTOR * usual:
        return None
    monday = date.fromisocalendar(year, week, 1)
    slots = {"week": _day(monday, today), "count": most, "usual": int(usual) if float(usual).is_integer() else round(usual, 1)}
    ids = [n["id"] for n in notes if (d := _written(n)) and _week(d) == (year, week)]
    return Insight("load", _fill("load", slots), ids, slots)


_PLAIN = frozenset(
    """that this with have from your will they them what when then than there their about would could should into
    week weeks times time days month months year years three four five every each next again""".split()
)


#: A question that asks after regularity ("any patterns in my running notes",
#: "how often do I write about chess") is answered by the streak when one holds.
REGULAR = re.compile(r"\b(?:patterns?|habits?|trends?|streaks?|regular(?:ly)?|how often|every week|weekly)\b", re.I)


def for_subject(subject: str, notes: list[dict], today: date, question: str = "") -> list[Insight]:
    """The insights a broad answer about `subject` may close with, best first:
    a recurrence, else a streak; a streak first when `question` asks after
    regularity (`REGULAR`)."""
    run = streak(subject, notes, today)
    if run and REGULAR.search(question or ""):
        return [run]
    found = recurrence(subject, notes, today)
    if found:
        return [found]
    return [run] if run else []


#: The short form of each rule for the dashboard's line ("golf, 4 times since
#: 5 September"), from the same slots: a count, a date, a subject.
def short(insight: Insight) -> str:
    slots = insight.slots
    if insight.rule == "recurrence":
        return f"{slots['subject']}, {slots['count']} times since {slots['since']}"
    if insight.rule == "streak":
        return f"{slots['subject']}, {slots['weeks']} weeks running"
    if insight.rule == "drift":
        return f"a plan from {slots['since']} still open"
    if insight.rule == "contrast":
        return f"a change of mind since {slots['first']}"
    return f"a busy week from {slots['week']}"


#: How many of the newest notes the Patterns line reads: the patterns worth a
#: line are recent ones, and a notebook of thousands is read in a moment.
NOTEBOOK_NOTES = 300


def from_session(session, today: date, limit: int = 3) -> list[Insight]:  # noqa: ANN001
    """The Patterns line over the notebook's newest notes (Tidy, the
    dashboard; `routes_insights.patterns`). Private and binned notes are
    never read."""
    from sqlalchemy import select

    from memorymap.core.database import Entry
    from memorymap.entry import manager

    rows = session.scalars(
        select(Entry)
        .where(Entry.is_deleted == False, Entry.is_private == False)  # noqa: E712
        .order_by(Entry.created_at.desc())
        .limit(NOTEBOOK_NOTES)
    ).all()
    notes = [
        {"id": e.id, "content": e.content or "", "created_at": e.created_at.date().isoformat() if e.created_at else "", "tags": manager.entry_tags(e)}
        for e in rows
    ]
    return notebook(notes, today, limit)


def notebook(notes: list[dict], today: date, limit: int = 3) -> list[Insight]:
    """The Patterns line over a notebook: recurring tags, plans gone quiet,
    minds changed and a busy week, each its own rule, at most `limit`."""
    tags = Counter(str(t).lower() for n in notes for t in set(n.get("tags") or []))
    out: list[Insight] = []
    for tag, _count in tags.most_common(6):
        found = recurrence(tag, [n for n in notes if tag in {str(t).lower() for t in n.get("tags") or []}], today)
        if found:
            out.append(found)
    out += drift(notes, today)[:2]
    out += contrast(notes, today)[:1]
    busy = load(notes, today)
    if busy:
        out.append(busy)
    return out[:limit]
