"""The rest of the slash commands (O6 rest; BACKLOG "Slash commands in Chat
and the composer": `/today`, `/due`, `/calc`, `/find`, `/stats`, `/orphans`,
`/random`, `/tags`, `/categories`, `/pinned`, `/oldest`, `/todo`).

Read by `slash.COMMANDS`, which builds the `Command` rows from `MORE`, so a
command here reaches the route, `GET /chat/commands`, `/help` and the "/"
menu with nothing else to touch. Each answers with no model, as a sentence
and the rows `tool_say` draws for a tool's notes. The helpers (`_rows`,
`_notes`) are `slash`'s, reached at run time (`_s`) because `slash` imports
this module while it is still being defined.
"""

from __future__ import annotations

import re
from collections import Counter
from datetime import datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from tessellate.ai import arithmetic, realise


def _s():  # noqa: ANN202
    from tessellate.ai import slash

    return slash


def _day(moment: datetime) -> str:
    """"17 October" (no strftime flag: `%-d` is not Windows')."""
    return f"{moment.day} {moment:%B}"


#: An open checkbox line: "- [ ] call the dentist".
_OPEN_BOX = re.compile(r"^\s*[-*]\s+\[ \]\s+(\S.*)$", re.M)


def _newest(session: Session, *conditions, order=None, limit: int = 200) -> list:  # noqa: ANN001
    entry, visible = _s()._notes()
    ordered = order if order is not None else entry.created_at.desc()
    return list(session.scalars(select(entry).where(*visible, *conditions).order_by(ordered, entry.id.desc()).limit(limit)))


def _listed(session: Session, rows: list, one: str, many: str) -> str:
    """`rows` under a lead line: `one` for a single note, `many` (with its
    `{n}` as "Three notes") otherwise."""
    lead = one if len(rows) == 1 else many.format(n=realise.count_noun(len(rows), "note").capitalize())
    return f"{lead}\n\n{_s()._rows(session, rows)}{_s()._more(len(rows))}"


def _today(session: Session, arg: str, now: datetime) -> str:
    return _s().COMMANDS["made"].run(session, "today", now)


def _yesterday(session: Session, arg: str, now: datetime) -> str:
    return _s().COMMANDS["made"].run(session, "yesterday", now)


def _find(session: Session, arg: str, now: datetime) -> str:
    words = [w for w in re.findall(r"[\w'-]+", arg.lower()) if len(w) > 1 or w.isdigit()]
    if not words:
        return "Say what to find: /find golf, or /find dentist tuesday for notes that hold both words."
    entry, _ = _s()._notes()
    said = " ".join(words)
    rows = _newest(session, *(func.lower(entry.content).contains(w) for w in words))
    if not rows:
        return f"No note holds {'both ' if len(words) > 1 else ''}“{said}”."
    return _listed(session, rows, f"One note mentions “{said}”:", f"{{n}} mention “{said}”:")


def _pinned(session: Session, arg: str, now: datetime) -> str:
    entry, _ = _s()._notes()
    rows = _newest(session, entry.pinned.is_(True))
    if not rows:
        return "No note is pinned. Say “pin the … note” to pin one."
    return _listed(session, rows, "One note is pinned:", "{n} are pinned:")


def _oldest(session: Session, arg: str, now: datetime) -> str:
    entry, _ = _s()._notes()
    n = max(1, min(int(arg) if arg.isdigit() else 5, 20))
    rows = _newest(session, order=entry.created_at.asc(), limit=n)
    if not rows:
        return "You have no notes yet."
    lead = "Your oldest note:" if len(rows) == 1 else f"Your {realise.count_word(len(rows))} oldest notes:"
    return f"{lead}\n\n{_s()._rows(session, rows)}"


def _random(session: Session, arg: str, now: datetime) -> str:
    rows = _newest(session, limit=2000)
    if not rows:
        return "You have no notes yet."
    pick = rows[int(now.timestamp() * 1000) % len(rows)]
    return f"Here is one of your {len(rows)} notes, picked at random:\n\n{_s()._rows(session, [pick])}"


def _tags(session: Session, arg: str, now: datetime) -> str:
    entry, visible = _s()._notes()
    counts = Counter(t for raw in session.scalars(select(entry.tags).where(*visible)) for t in _s()._tags_of(raw))
    if not counts:
        return "No note has a tag yet."
    top = counts.most_common(15)
    said = ", ".join(f"#{tag} ({n})" for tag, n in top)
    more = f" and {len(counts) - len(top)} more" if len(counts) > len(top) else ""
    return f"You use {realise.count_noun(len(counts), 'tag')}, most used first: {said}{more}."


def _categories(session: Session, arg: str, now: datetime) -> str:
    from tessellate.core.database import Category

    entry, visible = _s()._notes()
    count = func.count(entry.id)
    rows = session.execute(
        select(Category.name, count).join(entry, entry.category_id == Category.id).where(*visible).group_by(Category.id).order_by(count.desc(), Category.name)
    ).all()
    unfiled = session.scalar(select(count).where(*visible, entry.category_id.is_(None))) or 0
    parts = [f"{name} ({n})" for name, n in rows] + ([f"not filed ({unfiled})"] if unfiled else [])
    if not parts:
        return "You have no notes yet."
    return f"Your notes sit in {realise.count_noun(len(rows), 'category')}: {', '.join(parts)}."


def _todo(session: Session, arg: str, now: datetime) -> str:
    from tessellate.ai import tool_say

    entry, _ = _s()._notes()
    notes = _newest(session, entry.content.contains("[ ]"))
    found = [(e, m.group(1).strip()) for e in notes for m in _OPEN_BOX.finditer(e.content or "")]
    if not found:
        return "No note has an open checkbox."
    lines = [f"- {text} in {tool_say.link(tool_say._title(e.content), tool_say.note_at(e.id))}" for e, text in found[: _s().SHOWN]]
    lead = "One open checkbox:" if len(found) == 1 else f"{realise.count_word(len(found)).capitalize()} open checkboxes:"
    return f"{lead}\n\n" + "\n".join(lines) + _s()._more(len(found))


def _when(reminder, today) -> str:  # noqa: ANN001
    due = reminder.due_at
    if due.date() < today:
        return f"overdue since {_day(due)}"
    return f"{due:%A} {_day(due)}, {due:%H:%M}"


def _due(session: Session, arg: str, now: datetime) -> str:
    from tessellate.core.database import Reminder

    week = arg.strip().lower() in ("week", "this week", "7")
    end = datetime.combine(now.date() + timedelta(days=7 if week else 0), time.max)
    rows = list(session.scalars(select(Reminder).where(Reminder.done.is_(False), Reminder.due_at <= end).order_by(Reminder.due_at).limit(40)))
    span = "this week" if week else "today"
    if not rows:
        return f"No reminder is due {span} or overdue."
    lines = "\n".join(f"- {r.text} ({_when(r, now.date())})" for r in rows[: _s().SHOWN])
    lead = f"One reminder is due {span} or overdue:" if len(rows) == 1 else f"{realise.count_noun(len(rows), 'reminder').capitalize()} are due {span} or overdue:"
    return f"{lead}\n\n{lines}{_s()._more(len(rows))}"


def _calc(session: Session, arg: str, now: datetime) -> str:
    expression = arg.strip().rstrip("=?")
    if not expression:
        return "Give me a sum: /calc 12 * (3 + 4)."
    try:
        value = arithmetic.evaluate(expression)
    except arithmetic.NotArithmetic:
        return f"I can only work out sums with numbers, + - * / % ^ and brackets, so not “{expression}”."
    return f"{expression} = {arithmetic.spoken(value)}"


def _streak(days: set, today) -> int:  # noqa: ANN001
    """Days in a row up to today, or up to yesterday while today is empty."""
    day, run = (today if today in days else today - timedelta(days=1)), 0
    while day in days:
        run, day = run + 1, day - timedelta(days=1)
    return run


def _stats(session: Session, arg: str, now: datetime) -> str:
    entry, visible = _s()._notes()
    rows = session.execute(select(entry.content, entry.created_at, entry.tags).where(*visible)).all()
    if not rows:
        return "You have no notes yet."
    words = sum(len((c or "").split()) for c, _, _ in rows)
    days = {d.date() for _, d, _ in rows}
    tags = {t for _, _, raw in rows for t in _s()._tags_of(raw)}
    newest = max(d for _, d, _ in rows)
    run = _streak(days, now.date())
    said = f"You have {realise.count_noun(len(rows), 'note')} and {words:,} words, {realise.count_noun(len(tags), 'tag')}, written on {realise.count_noun(len(days), 'day')}. Your newest note is from {_day(newest)} {newest.year}"
    return said + (f", and you have written {realise.count_noun(run, 'day', article=True)} running." if run > 1 else ".")


def _orphans(session: Session, arg: str, now: datetime) -> str:
    from tessellate.core.database import EntryLink

    entry, _ = _s()._notes()
    linked = set(session.scalars(select(EntryLink.source_entry_id))) | set(session.scalars(select(EntryLink.target_entry_id)))
    rows = _newest(session, entry.id.not_in(linked)) if linked else _newest(session)
    if not rows:
        return "Every note is linked to another."
    return _listed(session, rows, "One note links to nothing:", "{n} link to nothing:")


#: (name, usage, summary, example, run), in the order `/help` lists them
#: after the first five.
MORE = (
    ("today", "/today", "the notes you wrote today.", "/today", _today),
    ("yesterday", "/yesterday", "the notes you wrote yesterday.", "/yesterday", _yesterday),
    ("find", "/find <words>", "the notes that hold every word you give, newest first.", "/find dentist tuesday", _find),
    ("pinned", "/pinned", "the notes you have pinned.", "/pinned", _pinned),
    ("oldest", "/oldest [n]", "your oldest notes, five unless you say how many.", "/oldest 3", _oldest),
    ("random", "/random", "one of your notes, picked at random.", "/random", _random),
    ("tags", "/tags", "the tags you use, most used first, with how many notes each.", "/tags", _tags),
    ("categories", "/categories", "your categories and how many notes sit in each.", "/categories", _categories),
    ("todo", "/todo", "the open checkboxes in your notes.", "/todo", _todo),
    ("due", "/due [week]", "the reminders due today or overdue, or due this week.", "/due week", _due),
    ("calc", "/calc <sum>", "a sum worked out exactly, with + - * / % ^ and brackets.", "/calc 15 * 80 / 100", _calc),
    ("stats", "/stats", "how many notes, words, tags and days of writing you have.", "/stats", _stats),
    ("orphans", "/orphans", "the notes that link to no other note.", "/orphans", _orphans),
)
