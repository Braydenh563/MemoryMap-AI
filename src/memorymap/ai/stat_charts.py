"""Charts from questions (WORLD_CLASS_PLAN section 17, row 4).

The original vision asked for "AI-generated data visualisation". The honest
version of that is the one `notebook_stats` already argues for: the numbers are
*counted*, so a chart of them cannot invent a value. This module answers three
shapes of question with a `chart` the page draws, a bar or a line, and the same
rows as `facts` (the page writes them as a table under it):

* **a count by something**: "how many notes per category this month", "notes by
  tag": a bar.
* **a count over time**: "how many notes did I write each month", "notes per
  week": a line, empty periods drawn as zero rather than skipped.
* **a number in the notes over time**: "chart my race times", "plot my weight":
  the notes that name the topic, one value from each (a time such as 24:10, or a
  number with a unit), in date order, as a line. Fewer than `MIN_POINTS` values
  is not a trend, so the question falls through to ordinary retrieval.

No model: a regex matcher and SQL, like the rest of `notebook_stats`, so it
works with Atlas off and cannot hallucinate. Private and binned notes are
nobody's statistics (`notebook_stats._visible`).
"""

from __future__ import annotations

import re
from collections import Counter
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from memorymap.ai import notebook_stats
from memorymap.core.database import LIKE_ESCAPE, Category, Entry, like_escape, utcnow

#: The most bars one chart draws: a dozen is a glance, thirty is a table.
MAX_BARS = 12
#: The most points of a number-in-notes line.
MAX_POINTS = 60
#: A trend needs a shape: two points are a line between them, not a trend.
MIN_POINTS = 3
#: How many notes a number question reads; the newest of them are kept.
_NOTES_READ = 600

_MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")

_CHART_VERB = r"\b(?:chart|graph|plot|visuali[sz]e|trend|diagram)\b"
_PER = r"\b(?:per|by|each|every|for each|across)\b"
_DIM_BODY = r"(categor(?:y|ies)|tags?)"
_DIMENSION = rf"\b{_DIM_BODY}\b"
_GRAIN = r"\b(?:per|by|each|every|a)\s+(day|week|month|year)\b"
_COUNTING = r"\bhow many\b|\bnumber of\b|\bcount\b|\bbreak ?down\b|\bsplit\b|\bshow\b|\bnotes?\b"

#: "this month" and friends, as the rolling windows `notebook_stats` already uses.
_PERIODS = (
    (r"this week|past week|last week|last 7 days|past 7 days", 7, "this week"),
    (r"this month|past month|last month|last 30 days|past 30 days", 30, "this month"),
    (r"this year|past year|last year|last 12 months|past 12 months", 365, "this year"),
)


# --- the chart's shape ------------------------------------------------------------


def chart_of(kind: str, title: str, labels: list, values: list, *, unit: str = "", fmt: str = "count") -> dict:
    """The one shape the page draws: `kind` bar or line, `format` count,
    number or duration (seconds shown as m:ss)."""
    return {"kind": kind, "title": title, "labels": labels, "values": values, "unit": unit, "format": fmt}


def bar_chart(title: str, rows: list[tuple[str, int]], unit: str = "notes") -> dict:
    return chart_of("bar", title, [name for name, _ in rows], [n for _, n in rows], unit=unit)


def _facts(labels: list, values: list) -> list[dict]:
    return [{"label": str(label), "count": value} for label, value in zip(labels, values)]


def format_duration(seconds: float) -> str:
    total = int(round(seconds))
    hours, rest = divmod(total, 3600)
    minutes, secs = divmod(rest, 60)
    return f"{hours}:{minutes:02d}:{secs:02d}" if hours else f"{minutes}:{secs:02d}"


def _format_value(value: float, fmt: str, unit: str) -> str:
    if fmt == "duration":
        return format_duration(value)
    text = f"{value:g}"
    return f"{text} {unit}".strip() if unit else text


# --- the entry point --------------------------------------------------------------


def answer(message: str, session: Session) -> "notebook_stats.StatAnswer | None":
    """A charted answer, or None to let the ordinary matchers go on."""
    text = " ".join((message or "").lower().split())
    if not text:
        return None
    wants_chart = bool(re.search(_CHART_VERB, text))
    # Counted by something: a bar.
    dim = re.search(_PER + r"\s+(?:the\s+|my\s+)?" + _DIM_BODY, text) or (
        wants_chart and re.search(_DIMENSION, text)
    )
    if dim and (wants_chart or re.search(_COUNTING, text)):
        which = re.search(_DIMENSION, text).group(1)
        return _per_dimension(session, "tags" if which.startswith("tag") else "categories", text)
    # Counted over time: a line.
    grain = re.search(_GRAIN, text)
    if grain and re.search(r"\bnotes?\b|\bwr[io]te\b|\bwritten\b|\bcreated\b|\bmade\b|\bcaptured\b", text) and not re.search(r"\bwords?\b", text):
        return _over_time(session, grain.group(1), text)
    if wants_chart and re.search(r"\bnotes?\b|\bwriting\b", text) and re.search(r"over time|\bgrowth\b|\bhistory\b", text):
        return _over_time(session, "month", text)
    # A number in the notes, over time.
    if wants_chart or re.search(r"\bover time\b", text) and re.search(r"\bmy\b", text):
        return _numbers_over_time(session, text)
    return None


# --- a count by category or tag ----------------------------------------------------


def _period(text: str) -> tuple[datetime | None, str]:
    for pattern, days, label in _PERIODS:
        if re.search(pattern, text):
            return utcnow() - timedelta(days=days), label
    return None, ""


def _per_dimension(session: Session, dimension: str, text: str) -> "notebook_stats.StatAnswer":
    since, label = _period(text)
    kind = "line" if re.search(r"\bline\b", text) else "bar"
    where = f" ({label})" if label else ""
    if dimension == "categories":
        query = notebook_stats._visible(
            select(Category.name, func.count(Entry.id)).join(Category, Category.id == Entry.category_id).group_by(Category.name)
        )
        if since is not None:
            query = query.where(Entry.created_at >= since)
        rows = session.execute(query.order_by(func.count(Entry.id).desc(), Category.name).limit(MAX_BARS)).all()
        title, noun, kind_name = f"Notes per category{where}", "category", "chart-categories"
    else:
        query = notebook_stats._visible(select(Entry.tags))
        if since is not None:
            query = query.where(Entry.created_at >= since)
        counts = Counter(tag for raw in session.scalars(query).all() for tag in notebook_stats._tags_of(raw))
        rows = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))[:MAX_BARS]
        title, noun, kind_name = f"Notes per tag{where}", "tag", "chart-tags"
    if not rows:
        return notebook_stats.StatAnswer(kind_name, f"There are no notes with a {noun} to chart{where.replace(' (', ' for ').replace(')', '')}.")
    rows = [(str(name), int(n)) for name, n in rows]
    listed = ", ".join(f"{name} ({n})" for name, n in rows)
    chart = bar_chart(title, rows)
    chart["kind"] = kind
    return notebook_stats.StatAnswer(
        kind_name,
        f"{title}: {listed}.",
        _facts(chart["labels"], chart["values"]),
        chart,
    )


# --- a count over time -------------------------------------------------------------


def _month_start(day: date, back: int) -> date:
    index = day.year * 12 + day.month - 1 - back
    return date(index // 12, index % 12 + 1, 1)


def _over_time(session: Session, grain: str, text: str) -> "notebook_stats.StatAnswer":
    created = [value for value in session.scalars(notebook_stats._visible(select(Entry.created_at))).all() if value]
    today = utcnow().date()
    if grain == "month":
        starts = [_month_start(today, back) for back in range(11, -1, -1)]
        key = lambda d: date(d.year, d.month, 1)  # noqa: E731
        labels = [f"{_MONTHS[s.month - 1]} {s.year}" for s in starts]
        noun, span = "month", "the last 12 months"
    elif grain == "week":
        this_monday = today - timedelta(days=today.weekday())
        starts = [this_monday - timedelta(weeks=back) for back in range(11, -1, -1)]
        key = lambda d: d - timedelta(days=d.weekday())  # noqa: E731
        labels = [f"{s.day} {_MONTHS[s.month - 1]}" for s in starts]
        noun, span = "week", "the last 12 weeks"
    elif grain == "day":
        starts = [today - timedelta(days=back) for back in range(29, -1, -1)]
        key = lambda d: d  # noqa: E731
        labels = [f"{s.day} {_MONTHS[s.month - 1]}" for s in starts]
        noun, span = "day", "the last 30 days"
    else:
        first = min((c.year for c in created), default=today.year)
        years = list(range(max(first, today.year - 9), today.year + 1))
        starts = [date(y, 1, 1) for y in years]
        key = lambda d: date(d.year, 1, 1)  # noqa: E731
        labels = [str(y) for y in years]
        noun, span = "year", "the years you have written in"
    counts = Counter(key(c.date()) for c in created)
    values = [int(counts.get(s, 0)) for s in starts]
    total = sum(values)
    kind = "bar" if re.search(r"\bbar\b", text) else "line"
    title = f"Notes per {noun}"
    peak = max(range(len(values)), key=lambda i: values[i]) if values else 0
    sentence = (
        f"You wrote {notebook_stats._plural(total, 'note')} in {span}."
        + (f" The most was {values[peak]} in {labels[peak]}." if total else "")
    )
    return notebook_stats.StatAnswer(
        "chart-time", sentence, _facts(labels, values), chart_of(kind, title, labels, values, unit="notes")
    )


# --- a number in the notes over time -----------------------------------------------

_TIME = re.compile(r"(?<![\d:.])(\d{1,2}):(\d{2})(?::(\d{2}))?(?![\d:])")
_DATES = re.compile(r"\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b")
_UNITS = (
    "kg|g|lbs?|st|km|mi|miles|m|cm|mm|ft|bpm|kcal|cal|mg|ml|l|%|°c|°f|h|hr|hrs|hours|min|mins|minutes"
    "|sec|secs|steps|pages|words|reps"
)
_NUMBER = re.compile(
    rf"(?P<cur>[£$€])?(?<![\w.])(?P<n>-?\d{{1,3}}(?:,\d{{3}})+(?:\.\d+)?|-?\d+(?:\.\d+)?)(?:\s?(?P<unit>(?:{_UNITS})\b|%))?",
    re.I,
)

#: Words that name the chart's *task*, never the notes to look in.
_STOP = set(
    "chart graph plot trend diagram visualise visualize show me my the of over a an in for on with and to is are was were "
    "have has had been how what did do does i it its please can you give make draw progress history changed change "
    "going go gone notes note whole all from since each per by".split()
)
#: Words that say what to read out of a note rather than which notes to read.
_TIME_WORDS = {"time", "times", "pace", "duration", "durations", "splits", "timing"}
_GENERIC = {"result", "results", "score", "scores", "value", "values", "number", "numbers", "data", "stats", "readings", "reading"}


def seconds_in(text: str) -> int | None:
    """The first m:ss or h:mm:ss in `text`, as seconds."""
    match = _TIME.search(text or "")
    if not match:
        return None
    first, second, third = match.group(1), match.group(2), match.group(3)
    if third is not None:
        return int(first) * 3600 + int(second) * 60 + int(third)
    return int(first) * 60 + int(second)


def number_in(text: str) -> tuple[float, str] | None:
    """The first number in `text` and its unit (`kg`, `£`, or ""), set aside
    dates and clock times, which are not measurements."""
    clean = _TIME.sub(" ", _DATES.sub(" ", text or ""))
    match = _NUMBER.search(clean)
    if not match:
        return None
    value = float(match.group("n").replace(",", ""))
    unit = (match.group("cur") or match.group("unit") or "").lower()
    return value, unit


def _topic(text: str) -> tuple[list[str], str]:
    """The words that pick the notes, and what to read from them ("time" or "")."""
    text = re.sub(r"\bover time\b", " ", text)
    words = re.findall(r"[a-z0-9']+", text)
    measure = "time" if any(w in _TIME_WORDS for w in words) else ""
    topic = [w for w in words if w not in _STOP and w not in _TIME_WORDS and w not in _GENERIC and len(w) > 2]
    return topic, measure


def _day_label(day: datetime, with_year: bool) -> str:
    return f"{day.day} {_MONTHS[day.month - 1]}" + (f" {day.year}" if with_year else "")


def _numbers_over_time(session: Session, text: str) -> "notebook_stats.StatAnswer | None":
    topic, measure = _topic(text)
    if not topic:
        return None
    query = notebook_stats._visible(select(Entry.content, Entry.created_at))
    for word in topic[:4]:
        stem = word[:-1] if len(word) > 4 and word.endswith("s") else word
        query = query.where(Entry.content.ilike(f"%{like_escape(stem)}%", escape=LIKE_ESCAPE))
    rows = session.execute(query.order_by(Entry.created_at.desc()).limit(_NOTES_READ)).all()
    points: list[tuple[datetime, float, str]] = []
    for content, made in rows:
        if not made:
            continue
        if measure == "time":
            seconds = seconds_in(content)
            if seconds is not None:
                points.append((made, float(seconds), ""))
            continue
        # A number that follows the topic word beats the first number in the note.
        lower = content.lower()
        at = min((lower.find(w[:4]) for w in topic if w[:4] in lower), default=0)
        found = number_in(content[at:]) or number_in(content)
        if found:
            points.append((made, found[0], found[1]))
    points.sort(key=lambda p: p[0])
    points = points[-MAX_POINTS:]
    if len(points) < MIN_POINTS:
        return None
    units = Counter(unit for _, _, unit in points if unit)
    unit = units.most_common(1)[0][0] if units else ""
    fmt = "duration" if measure == "time" else "number"
    with_year = points[0][0].year != points[-1][0].year
    labels = [_day_label(made, with_year) for made, _, _ in points]
    values = [value for _, value, _ in points]
    title = " ".join(topic).capitalize() + (" times" if measure == "time" else "")
    shown = [_format_value(v, fmt, unit) for v in values]
    low, high = min(values), max(values)
    sentence = (
        f"{title} across {notebook_stats._plural(len(points), 'note')}, {labels[0]} to {labels[-1]}: "
        + ", ".join(shown[-8:])
        + f". Lowest {_format_value(low, fmt, unit)}, highest {_format_value(high, fmt, unit)}, "
        + f"latest {shown[-1]}."
    )
    return notebook_stats.StatAnswer(
        "chart-numbers",
        sentence,
        [{"label": label, "count": value} for label, value in zip(labels, values)],
        chart_of("line", title, labels, values, unit=unit, fmt=fmt),
    )
