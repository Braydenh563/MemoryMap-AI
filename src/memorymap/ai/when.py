"""A time in the user's words, resolved to an instant by the app (INBOX 527).

AGENT_SKILLS_REFORM, "The harness does the work the model is worst at",
decided 2026-09-21: a tool argument is either intent, which only the model can
supply, or a fact the app can compute. "Remind me two hours before midnight" is
intent; `2026-09-21T22:00+10:00` is arithmetic, and the owner's transcript has
a model getting exactly that a day wrong. So `set_reminder` takes the phrase
and this module does the arithmetic, against the user's own clock, with no
model and no network.

What it reads, all case-insensitive and combinable ("next Friday at 3pm",
"tomorrow evening", "two hours before midnight"):

- an ISO date-time (the escape hatch a model with a real date can still use);
  without an offset it is the user's local time, never UTC;
- "in 20 minutes", "in half an hour", "in 3 days" (`reminder_parser`);
- N minutes/hours before or after another time ("before midnight");
- a day: today, tonight, tomorrow, the day after tomorrow, a weekday (this,
  on, next), next week, an ISO date, "5 October" or "October 5";
- a time: 9am, 9:30 pm, 21:00, "at 9", noon, midday, midnight, and the parts
  of a day (morning 9:00, afternoon 15:00, evening 18:00, night 20:00).

Rules a reader can argue with, written down so they are at least consistent:
a bare hour 1 to 6 is afternoon, 7 to 11 morning (tonight and evening make it
pm); a time with no day that has passed today is tomorrow; a day with no time
is 9:00; midnight belongs to the night of the day it is said with, so
"midnight" on its own is the coming one and "tomorrow at midnight" is the
night of tomorrow; "next Friday" is the Friday of next week, as in
`entry/timewords`; a weekday that is today, at a time already past, is next
week's. Returns None for anything it does not read, never a guess.
"""

from __future__ import annotations

import re
from datetime import date, datetime, time, timedelta

from memorymap.ai import reminder_parser

_WEEKDAYS = {
    "monday": 0, "mon": 0, "tuesday": 1, "tue": 1, "tues": 1, "wednesday": 2,
    "wed": 2, "thursday": 3, "thu": 3, "thurs": 3, "friday": 4, "fri": 4,
    "saturday": 5, "sat": 5, "sunday": 6, "sun": 6,
}
_MONTHS = {
    name: number
    for number, names in enumerate(
        (
            ("january", "jan"), ("february", "feb"), ("march", "mar"), ("april", "apr"),
            ("may",), ("june", "jun"), ("july", "jul"), ("august", "aug"),
            ("september", "sep", "sept"), ("october", "oct"), ("november", "nov"),
            ("december", "dec"),
        ),
        start=1,
    )
    for name in names
}
_PARTS = {"morning": 9, "afternoon": 15, "evening": 18, "night": 20, "tonight": 20}
_NUMBERS = {
    "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "twelve": 12,
    "fifteen": 15, "twenty": 20, "thirty": 30, "forty": 40, "forty-five": 45,
    "half an": 0.5, "a half": 0.5, "a couple of": 2, "a few": 3,
}

#: Single spaces, not `\s+`: `resolve` has already folded every run of
#: whitespace to one space, and a literal space leaves the engine nothing to
#: backtrack over (CodeQL, polynomial regular expression).
_ANCHORED = re.compile(
    r"^(\d{1,3}|half an|a couple of|a few|[a-z-]+) (minutes?|mins?|hours?|hrs?) (before|after) (.+)$"
)
_CLOCK = re.compile(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?(?=\s|$)")
_ISO_DATE = re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b")
_DAY_MONTH = re.compile(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)\b")
_MONTH_DAY = re.compile(r"\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b")
_WEEKDAY = re.compile(r"\b(?:(this|on|next|coming)\s+)?(" + "|".join(_WEEKDAYS) + r")\b")


def _iso(text: str, now: datetime) -> datetime | None:
    if _ISO_DATE.fullmatch(text):
        return None  # a date alone is a day, read by `_day` with its 9:00
    try:
        parsed = datetime.fromisoformat(text.strip().upper().replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed.replace(tzinfo=now.tzinfo) if parsed.tzinfo is None else parsed


def _day(text: str, now: datetime) -> tuple[date | None, str]:
    """The day the phrase names, if it names one, and the text left over."""
    today = now.date()
    for pattern, offset in (
        (r"\bthe day after tomorrow\b", 2),
        (r"\btomorrow\b", 1),
        (r"\b(?:today|tonight)\b", 0),
    ):
        if re.search(pattern, text):
            return today + timedelta(days=offset), text
    if re.search(r"\bnext week\b", text):
        return today + timedelta(days=7 - today.weekday()), text
    found = _ISO_DATE.search(text)
    if found:
        try:
            return date(*(int(g) for g in found.groups())), text.replace(found.group(0), " ")
        except ValueError:
            return None, text
    for pattern, day_group, month_group in ((_DAY_MONTH, 1, 2), (_MONTH_DAY, 2, 1)):
        for found in pattern.finditer(text):
            month = _MONTHS.get(found.group(month_group))
            if month is None:
                continue
            try:
                day = date(today.year, month, int(found.group(day_group)))
            except ValueError:
                continue
            if day < today:
                day = day.replace(year=today.year + 1)
            return day, text.replace(found.group(0), " ")
    found = _WEEKDAY.search(text)
    if found:
        target = _WEEKDAYS[found.group(2)]
        if found.group(1) == "next":
            return today + timedelta(days=7 - today.weekday() + target), text
        return today + timedelta(days=(target - today.weekday()) % 7), text
    return None, text


def _clock(text: str) -> tuple[int, int, str | None] | None:
    """(hour, minute, "am"/"pm"/None) from the phrase, or None."""
    if re.search(r"\b(?:noon|midday)\b", text):
        return 12, 0, "pm"
    if re.search(r"\bmidnight\b", text):
        return 24, 0, None
    for found in _CLOCK.finditer(text):
        hour, minute = int(found.group(1)), int(found.group(2) or 0)
        meridiem = (found.group(3) or "").replace(".", "") or None
        # A bare number counts only as a time when something says it is one:
        # "at 9", "9:30", "9pm". "in 3 days" has numbers that are not hours.
        if meridiem is None and found.group(2) is None:
            before = text[: found.start()]
            #: The last word before the number, not a `\s*$` search, which
            #: backtracks over a long run of spaces (CodeQL).
            if before.rstrip().rpartition(" ")[2] not in {"at", "by", "around", "about"}:
                continue
        if hour > 23 or minute > 59 or (meridiem and not 1 <= hour <= 12):
            continue
        return hour, minute, meridiem
    return None


def _hour24(hour: int, meridiem: str | None, evening: bool) -> int:
    if meridiem == "am":
        return 0 if hour == 12 else hour
    if meridiem == "pm":
        return hour if hour == 12 else hour + 12
    if hour > 12 or hour == 0:
        return hour
    if evening:
        return hour if hour == 12 else hour + 12
    return hour + 12 if 1 <= hour <= 6 else hour


def resolve(phrase: str, now: datetime) -> datetime | None:
    """The instant `phrase` means, on `now`'s clock, or None."""
    text = " ".join(str(phrase or "").lower().replace(",", " ").split()).strip(" .")
    if not text:
        return None
    iso = _iso(text, now)
    if iso is not None:
        return iso
    anchored = _ANCHORED.match(text)
    if anchored:
        amount = _NUMBERS.get(anchored.group(1))
        if amount is None and anchored.group(1).isdigit():
            amount = int(anchored.group(1))
        base = resolve(anchored.group(4), now)
        if amount is None or base is None:
            return None
        unit = timedelta(hours=1) if anchored.group(2).startswith("h") else timedelta(minutes=1)
        return base + unit * amount * (-1 if anchored.group(3) == "before" else 1)
    relative = reminder_parser.relative_delta(text)
    if relative is not None:
        return now + relative[0]
    if text == "later today":
        #: Three hours on, never past eight in the evening (engine probe: it
        #: was nine this morning, already gone).
        later = now + timedelta(hours=3)
        cap = datetime.combine(now.date(), time(20), now.tzinfo)
        return min(later, cap) if cap > now else later
    if text in ("end of day", "end of the day", "by end of day"):
        return datetime.combine(now.date(), time(17), now.tzinfo)
    day, rest = _day(text, now)
    #: What `_day` does not read, or reads the wrong way ("last friday" was
    #: the coming one), is read by `span`: past weekdays, "the 21st",
    #: "21st of next month", "this weekend", "in a fortnight", "christmas".
    for start, end, phrase in find(text):
        if day is not None and not phrase.lower().startswith("last "):
            break
        found = span(phrase, now.date(), "future")
        if found is not None:
            day, rest = found[0], text[:start] + " " + text[end:]
            break
    clock = _clock(rest)
    part = next((p for p in _PARTS if re.search(rf"\b{p}\b", text)), None)
    if day is None and clock is None and part is None:
        return None
    evening = part in ("evening", "night", "tonight")
    if clock is not None:
        hour, minute, meridiem = clock
        if hour == 24:
            return datetime.combine((day or now.date()) + timedelta(days=1), time(0), now.tzinfo)
        hour = _hour24(hour, meridiem, evening)
        if day is None and meridiem is None and hour < 12:
            # "at 9" with no day: the next 9 o'clock, morning or evening.
            for candidate in (hour, hour + 12):
                at = datetime.combine(now.date(), time(candidate, minute), now.tzinfo)
                if at > now:
                    return at
    else:
        hour, minute = (_PARTS[part] if part else 9), 0
    at = datetime.combine(day or now.date(), time(hour, minute), now.tzinfo)
    if at <= now and day is None:
        at += timedelta(days=1)
    elif at <= now and day == now.date() and _WEEKDAY.search(text):
        at += timedelta(days=7)  # "Monday 9am", said on a Monday afternoon
    return at


# --- Magic Add: a reminder sentence with its time taken out (UX-01) ---------
#
# `resolve` reads the whole sentence, so "call mum tomorrow at 5pm" resolves as
# it stands; what it cannot say is which words were the time. The reminder that
# fires should read "Call mum", not "Call mum tomorrow at 5pm" a day later, so
# these patterns strip the shapes `resolve` reads, and nothing else: a bare
# number is stripped only with "at" or am/pm beside it, as `_clock` reads it.

_NUMBER_WORDS = "|".join(sorted((re.escape(k) for k in _NUMBERS), key=len, reverse=True))
_MONTH_WORDS = "|".join(sorted(_MONTHS, key=len, reverse=True))
_WEEKDAY_WORDS = "|".join(sorted(_WEEKDAYS, key=len, reverse=True))
_MERIDIEM = r"(?:am|pm|a\.m\.|p\.m\.)"
_STRIP = [
    re.compile(p, re.IGNORECASE)
    for p in (
        r"^\s*(?:please\s+)?remind me\s+(?:to\s+|about\s+|that\s+)?",
        rf"\b(?:\d{{1,3}}|{_NUMBER_WORDS})\s+(?:minutes?|mins?|hours?|hrs?)\s+(?:before|after)\b",
        r"\b(?:on\s+)?the day after tomorrow\b",
        r"\b(?:by\s+|on\s+)?(?:tomorrow|today|tonight)\b",
        r"\bnext week\b",
        r"\b(?:on\s+|by\s+)?\d{4}-\d{2}-\d{2}\b",
        rf"\b(?:on\s+|by\s+)?(?:the\s+)?\d{{1,2}}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:{_MONTH_WORDS})\b",
        rf"\b(?:on\s+|by\s+)?(?:{_MONTH_WORDS})\s+\d{{1,2}}(?:st|nd|rd|th)?\b",
        rf"\b(?:on\s+|by\s+)?(?:(?:this|next|coming)\s+)?(?:{_WEEKDAY_WORDS})\b",
        r"\b(?:at\s+|by\s+|around\s+|about\s+)?(?:noon|midday|midnight)\b",
        rf"\b(?:at|by|around|about)\s+\d{{1,2}}(?::\d{{2}})?(?:\s*{_MERIDIEM})?(?=\s|$|[,.;])",
        rf"\b\d{{1,2}}(?::\d{{2}})?\s*{_MERIDIEM}(?=\s|$|[,.;])",
        r"\b\d{1,2}:\d{2}\b",
        r"\b(?:(?:this|in the|at|tomorrow)\s+)?(?:morning|afternoon|evening|night)\b",
    )
]
# "Call mum tomorrow evening, high priority": the placeholder's own example.
_PRIORITY = re.compile(r"\b(high|low)\s+priority\b", re.IGNORECASE)


def parse_reminder_text(text: str, now: datetime) -> dict | None:
    """A reminder from a sentence `resolve` reads, with no model, or None.

    {"text", "due_at", "priority", "source"}: the shape of
    `reminder_parser.parse_relative`. The text keeps the sentence's own words
    minus the time; a sentence that was only a time keeps itself, since an
    empty reminder is worse than a redundant one.
    """
    at = resolve(text, now)
    if at is None:
        return None
    rest = text
    priority = "normal"
    said = _PRIORITY.search(rest)
    if said:
        priority = said.group(1).lower()
        rest = rest.replace(said.group(0), " ")
    for pattern in _STRIP:
        rest = pattern.sub(" ", rest)
    rest = re.sub(r"\s+", " ", rest).strip(" ,.;:-")
    #: A dangling "on" or "at" left by the strip, dropped by word rather than
    #: by a `\s+...$` pattern, which backtracks on a long run of spaces.
    head, _, last = rest.rpartition(" ")
    if head and last.lower() in {"on", "at", "by", "for"}:
        rest = head
    rest = rest.strip(" ,.;:-")
    if not rest:
        rest = text.strip() or "Reminder"
    return {
        "text": (rest[0].upper() + rest[1:])[:500],
        "due_at": at,
        "priority": priority,
        "source": "rule",
    }


# --- a window in the past (AGENT_SKILLS_REFORM, the audit of computed arguments) ---
#
# `resolve` reads a time to come. The list tools' `since` asks the other way,
# "notes from this week", and used to take only a number of days or an ISO
# date, so a model asked about "this week" had to work out which date that
# was: the arithmetic the 2026-09-21 decision took away from it everywhere.

_SPAN = re.compile(
    r"^(?:the\s+)?(?:last|past|previous)\s+(?:(\d{1,3}|[a-z-]+)\s+)?(days?|weeks?|months?|years?)$"
)
_AGO = re.compile(r"^(\d{1,3}|[a-z-]+)\s+(days?|weeks?|months?|years?)\s+ago$")


def _months_back(today: date, months: int) -> date:
    year, month = today.year, today.month - months
    while month < 1:
        month += 12
        year -= 1
    return date(year, month, min(today.day, 28))


def _count(word: str | None) -> int | None:
    if word is None:
        return 1
    if word.isdigit():
        return int(word)
    value = _NUMBERS.get(word)
    return int(value) if value and value >= 1 else None


def _span_days(amount: int, unit: str, today: date) -> int:
    unit = unit.rstrip("s")
    if unit == "day":
        return amount
    if unit == "week":
        return 7 * amount
    if unit == "month":
        return (today - _months_back(today, amount)).days
    return (today - today.replace(year=today.year - amount)).days


def days_since(phrase: str, now: datetime) -> int | None:
    """How many days back a window in the user's words starts, on `now`'s
    calendar: "this week" 0 on a Monday, "since Friday", "last month" (from
    the first of the month before), "the last 30 days", "3 days ago", "1
    September" (the last one that has passed), an ISO date, or a bare
    number of days. None for anything that names no past window, never a
    guess, so a caller can say it did not understand rather than filter on a
    wrong date."""
    text = " ".join(str(phrase or "").lower().replace(",", " ").split()).strip(" .")
    if not text:
        return None
    if text.isdigit():
        return int(text)
    today = now.date()
    text = re.sub(r"^(?:since|from|after)\s+", "", text)
    fixed = {
        "today": 0,
        "yesterday": 1,
        "this week": today.weekday(),
        "last week": 7,
        "the past week": 7,
        "past week": 7,
        "this month": today.day - 1,
        "last month": (today - _months_back(today, 1).replace(day=1)).days,
        "this year": (today - date(today.year, 1, 1)).days,
        "last year": (today - date(today.year - 1, 1, 1)).days,
    }
    if text in fixed:
        return fixed[text]
    found = _SPAN.match(text) or _AGO.match(text)
    if found:
        amount = _count(found.group(1))
        return None if amount is None else _span_days(amount, found.group(2), today)
    found = re.fullmatch(r"(?:last\s+)?(" + "|".join(_WEEKDAYS) + r")", text)
    if found:
        back = (today.weekday() - _WEEKDAYS[found.group(1)]) % 7
        return back or 7
    found = _ISO_DATE.fullmatch(text)
    if found:
        try:
            day = date(*(int(g) for g in found.groups()))
        except ValueError:
            return None
        return (today - day).days if day <= today else None
    for pattern, day_group, month_group in ((_DAY_MONTH, 1, 2), (_MONTH_DAY, 2, 1)):
        found = pattern.fullmatch(text)
        if not found or _MONTHS.get(found.group(month_group)) is None:
            continue
        try:
            day = date(today.year, _MONTHS[found.group(month_group)], int(found.group(day_group)))
        except ValueError:
            return None
        if day > today:
            day = day.replace(year=today.year - 1)
        return (today - day).days
    return None


# --- a span of days, past or to come (CHAT_PLAN Phase 6, decisions 30 and 31) ---
#
# `resolve` reads one instant to come; `days_since` one start in the past. A
# question ("what did I do last week") and a note's own time words ("I met
# Sam on Friday", read against the day the note was written) name a span of
# days with a grain: a day, a week, a month, a year. `span` reads one such
# phrase against an anchor day and a tense; `find` finds the phrases in a
# text; `window` is a question's span as two instants on the person's clock.
# Every rule is a row of `tests/test_when_windows.py`.

_ORD = r"(\d{1,2})(?:st|nd|rd|th)"
_MONTH_RE = r"(" + "|".join(sorted(_MONTHS, key=len, reverse=True)) + r")"
_WEEKDAY_RE = r"(" + "|".join(sorted(_WEEKDAYS, key=len, reverse=True)) + r")"
_UNIT_RE = r"(days?|weeks?|fortnights?|months?|years?)"
_AMOUNT_RE = r"(\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve|a couple of|a few)"

#: Every phrase `span` reads, longest forms first, as one pattern for `find`
#: (`_date_phrase`).
#: Word boundaries on both sides; nothing here backtracks over a run of
#: spaces (the text is searched as written, so `\s` is a single space class
#: bounded by words).
def _date_phrase() -> re.Pattern[str]:
    """The time-phrase pattern, compiled on first use: one long alternation, the
    slowest part of importing this module otherwise."""
    global _DATE_PHRASE
    if _DATE_PHRASE is None:
        _DATE_PHRASE = re.compile(_DATE_PHRASE_SOURCE, re.IGNORECASE)
    return _DATE_PHRASE


_DATE_PHRASE: re.Pattern[str] | None = None
_DATE_PHRASE_SOURCE = (
    r"\b(?:"
    + "|".join(
        (
            r"since (?:the )?(?:" + _MONTH_RE + r"|" + _WEEKDAY_RE + r"|last (?:week|month|year)|yesterday|\d{4}-\d{2}-\d{2})",
            r"(?:the )?week before last",
            r"(?:the )?day (?:after tomorrow|before yesterday)",
            _AMOUNT_RE + r" " + _UNIT_RE + r" ago",
            r"in (?:a fortnight|" + _AMOUNT_RE + r" " + _UNIT_RE + r")",
            r"(?:the )?(?:last|past|previous) (?:\d{1,3} |few |couple of |two |three )?(?:days|weeks|months|years)",
            r"(?:last|this|next|past|coming) (?:week|weekend|month|year)",
            r"(?:last|this|next|coming|on) " + _WEEKDAY_RE + r"(?: (?:morning|afternoon|evening|night))?",
            r"\d{4}-\d{2}-\d{2}",
            r"(?:on )?(?:the )?" + _ORD + r" of (?:next|this|last) month",
            r"(?:the )?\d{1,2}(?:st|nd|rd|th)? (?:of )?" + _MONTH_RE + r"(?: \d{4})?",
            _MONTH_RE + r" \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?",
            r"(?:on )?the " + _ORD,
            r"(?:mid|early|late|end of) " + _MONTH_RE,
            r"(?:the )?end of (?:the )?(?:day|week|month|year)",
            r"(?:in|during) " + _MONTH_RE + r"(?: \d{4})?",
            r"christmas(?: day| eve)?|new year'?s? (?:day|eve)|new year",
            r"later today|today|tonight|yesterday|tomorrow",
            _WEEKDAY_RE,
        )
    )
    + r")\b"
)

_AMOUNTS = {**{k: v for k, v in _NUMBERS.items() if isinstance(v, int)}, "a couple of": 2, "a few": 3, "seven": 7, "eight": 8, "nine": 9, "ten": 10}


def _amount(word: str) -> int | None:
    word = word.lower()
    if word.isdigit():
        return int(word)
    return _AMOUNTS.get(word)


def _month_end(day: date) -> date:
    after = day.replace(day=28) + timedelta(days=4)
    return after - timedelta(days=after.day)


def _shift_months(day: date, months: int) -> date:
    index = day.year * 12 + day.month - 1 + months
    return date(index // 12, index % 12 + 1, 1)


def _week_of(day: date) -> tuple[date, date]:
    monday = day - timedelta(days=day.weekday())
    return monday, monday + timedelta(days=6)


def _nearest(candidates: list[date], anchor: date, tense: str | None) -> date:
    """The one of `candidates` the tense points at: the latest on or before
    the anchor for the past (and with no tense: notes mostly say what
    happened), the earliest on or after it for the future."""
    if tense == "future":
        ahead = [d for d in candidates if d >= anchor]
        return min(ahead) if ahead else max(candidates)
    behind = [d for d in candidates if d <= anchor]
    return max(behind) if behind else min(candidates)


def _day_of_month(day: int, anchor: date, tense: str | None) -> date | None:
    options = []
    for months in (-1, 0, 1):
        first = _shift_months(anchor.replace(day=1), months)
        try:
            options.append(first.replace(day=day))
        except ValueError:
            continue
    return _nearest(options, anchor, tense) if options else None


def _month_span(month: int, anchor: date, tense: str | None, year: int | None = None) -> tuple[date, date, str]:
    if year is None:
        options = [date(anchor.year + k, month, 1) for k in (-1, 0, 1)]
        if tense == "future":
            first = min(d for d in options if _month_end(d) >= anchor)
        else:
            first = max(d for d in options if d <= anchor)
    else:
        first = date(year, month, 1)
    return first, _month_end(first), "month"


def _back(anchor: date, amount: int, unit: str) -> date:
    unit = unit.rstrip("s")
    if unit == "day":
        return anchor - timedelta(days=amount)
    if unit in ("week", "fortnight"):
        return anchor - timedelta(days=7 * amount * (2 if unit == "fortnight" else 1))
    if unit == "month":
        first = _shift_months(anchor.replace(day=1), -amount)
        return first.replace(day=min(anchor.day, _month_end(first).day))
    try:
        return anchor.replace(year=anchor.year - amount)
    except ValueError:
        return anchor.replace(year=anchor.year - amount, day=28)


def span(phrase: str, anchor: date, tense: str | None = None) -> tuple[date, date, str] | None:
    """(first day, last day, grain) the phrase names, read against `anchor`,
    or None. `tense` ("past", "future" or None) picks between the Friday
    before and the Friday after: "I met Sam on Friday" in a note is the one
    before, "I will see Sam on Friday" the one after. Grain is "day",
    "week", "month" or "year"."""
    text = " ".join(str(phrase or "").lower().replace(",", " ").split()).strip(" .")
    text = re.sub(r"^(?:on|by|for|at|from) ", "", text)
    if not text:
        return None
    a = anchor
    found = re.fullmatch(r"since (?:the )?(.+)", text)
    if found:
        start = span(found.group(1), a, "past")
        return (start[0], a, start[2]) if start and start[0] <= a else None
    fixed = {
        "today": (a, a), "tonight": (a, a), "later today": (a, a), "yesterday": (a - timedelta(days=1),) * 2,
        "tomorrow": (a + timedelta(days=1),) * 2, "the day after tomorrow": (a + timedelta(days=2),) * 2,
        "day after tomorrow": (a + timedelta(days=2),) * 2, "the day before yesterday": (a - timedelta(days=2),) * 2,
        "day before yesterday": (a - timedelta(days=2),) * 2, "end of day": (a, a), "the end of the day": (a, a),
        "end of the day": (a, a),
    }
    if text in fixed:
        return (*fixed[text], "day")
    if re.fullmatch(r"(?:the )?week before last", text):
        first, last = _week_of(a - timedelta(days=14))
        return first, last, "week"
    found = re.fullmatch(r"(last|this|next|past|coming) (week|weekend|month|year)", text)
    if found:
        which, unit = found.groups()
        step = {"last": -1, "past": -1, "this": 0, "next": 1, "coming": 1}[which]
        if unit == "week":
            if which == "past":
                return a - timedelta(days=7), a, "week"
            first, last = _week_of(a + timedelta(days=7 * step))
            return first, last, "week"
        if unit == "weekend":
            saturday = a + timedelta(days=(5 - a.weekday()) % 7) if a.weekday() != 6 else a - timedelta(days=1)
            saturday += timedelta(days=7 * step)
            return saturday, saturday + timedelta(days=1), "week"
        if unit == "month":
            if which == "past":
                return _back(a, 1, "month"), a, "month"
            first = _shift_months(a.replace(day=1), step)
            return first, _month_end(first), "month"
        if which == "past":
            return _back(a, 1, "year"), a, "year"
        return date(a.year + step, 1, 1), date(a.year + step, 12, 31), "year"
    found = re.fullmatch(r"(?:the )?(?:last|past|previous) (?:(\d{1,3}|few|couple of|two|three) )?(days|weeks|months|years)", text)
    if found:
        amount = _amount(found.group(1) or "one") or {"few": 3, "couple of": 2}.get(found.group(1) or "", 1)
        return _back(a, amount, found.group(2)), a, "day"
    found = re.fullmatch(_AMOUNT_RE + r" " + _UNIT_RE + r" ago", text)
    if found:
        amount = _amount(found.group(1))
        if amount is None:
            return None
        day = _back(a, amount, found.group(2))
        return day, day, "day"
    found = re.fullmatch(r"in (?:a fortnight|" + _AMOUNT_RE + r" " + _UNIT_RE + r")", text)
    if found:
        if text == "in a fortnight":
            day = a + timedelta(days=14)
        else:
            amount, unit = _amount(found.group(1)), found.group(2).rstrip("s")
            if amount is None:
                return None
            if unit in ("month", "year"):
                months = amount * (12 if unit == "year" else 1)
                first = _shift_months(a.replace(day=1), months)
                day = first.replace(day=min(a.day, _month_end(first).day))
            else:
                day = a + timedelta(days=amount * {"day": 1, "week": 7, "fortnight": 14}[unit])
        return day, day, "day"
    found = re.fullmatch(r"(?:(last|this|next|coming|on) )?" + _WEEKDAY_RE + r"(?: (?:morning|afternoon|evening|night))?", text)
    if found:
        which, target = found.group(1), _WEEKDAYS[found.group(2)]
        if which == "last":
            back = (a.weekday() - target) % 7 or 7
            day = a - timedelta(days=back)
        elif which == "next":
            day = a + timedelta(days=7 - a.weekday() + target)
        elif which == "this":
            day = _week_of(a)[0] + timedelta(days=target)
        elif which == "coming":
            day = a + timedelta(days=(target - a.weekday()) % 7 or 7)
        else:
            day = _nearest([a + timedelta(days=(target - a.weekday()) % 7), a - timedelta(days=(a.weekday() - target) % 7)], a, tense)
        return day, day, "day"
    found = _ISO_DATE.fullmatch(text)
    if found:
        try:
            day = date(*(int(g) for g in found.groups()))
        except ValueError:
            return None
        return day, day, "day"
    found = re.fullmatch(r"(?:the )?" + _ORD + r" of (next|this|last) month", text)
    if found:
        first = _shift_months(a.replace(day=1), {"next": 1, "this": 0, "last": -1}[found.group(2)])
        try:
            day = first.replace(day=int(found.group(1)))
        except ValueError:
            return None
        return day, day, "day"
    found = re.fullmatch(r"(?:the )?(\d{1,2})(?:st|nd|rd|th)? (?:of )?" + _MONTH_RE + r"(?: (\d{4}))?", text) or re.fullmatch(
        _MONTH_RE + r" (\d{1,2})(?:st|nd|rd|th)?(?: (\d{4}))?", text
    )
    if found:
        groups = found.groups()
        day_word, month_word = (groups[0], groups[1]) if groups[0].isdigit() else (groups[1], groups[0])
        year = int(groups[2]) if groups[2] else None
        month = _MONTHS[month_word]
        try:
            if year:
                day = date(year, month, int(day_word))
            else:
                day = _nearest([date(a.year + k, month, int(day_word)) for k in (-1, 0, 1)], a, tense)
        except ValueError:
            return None
        return day, day, "day"
    found = re.fullmatch(r"(?:the )?" + _ORD, text)
    if found:
        day = _day_of_month(int(found.group(1)), a, tense)
        return (day, day, "day") if day else None
    found = re.fullmatch(r"(mid|early|late|end of) " + _MONTH_RE, text)
    if found:
        first, last, _grain = _month_span(_MONTHS[found.group(2)], a, tense or "future")
        part = found.group(1)
        if part == "mid":
            return first.replace(day=15), first.replace(day=15), "day"
        if part == "early":
            return first, first.replace(day=10), "day"
        if part == "late":
            return first.replace(day=21), last, "day"
        return last, last, "day"
    found = re.fullmatch(r"(?:the )?end of (?:the )?(week|month|year)", text)
    if found:
        last = {"week": _week_of(a)[1], "month": _month_end(a), "year": date(a.year, 12, 31)}[found.group(1)]
        return last, last, "day"
    found = re.fullmatch(r"(?:in |during )?" + _MONTH_RE + r"(?: (\d{4}))?", text)
    if found and (found.group(1) not in ("may", "mar", "sat", "sun", "wed") or text.startswith(("in ", "during ")) or found.group(2)):
        return _month_span(_MONTHS[found.group(1)], a, tense, int(found.group(2)) if found.group(2) else None)
    holidays = {"christmas": (12, 25), "christmas day": (12, 25), "christmas eve": (12, 24), "new year": (1, 1),
                "new year's day": (1, 1), "new years day": (1, 1), "new year day": (1, 1), "new year's eve": (12, 31), "new years eve": (12, 31)}
    if text in holidays:
        month, day_n = holidays[text]
        day = _nearest([date(a.year + k, month, day_n) for k in (-1, 0, 1)], a, tense or "future")
        if tense != "past" and day == a and text.startswith("new year") and month == 1:
            day = date(a.year + 1, 1, 1)
        return day, day, "day"
    return None


def find(text: str) -> list[tuple[int, int, str]]:
    """Every time phrase in `text`: (start, end, phrase), left to right, none
    overlapping. A bare month that is also a word ("may", "march" as a verb)
    is found only with "in" or a day beside it (`span` holds the same rule)."""
    out = []
    for match in _date_phrase().finditer(text or ""):
        phrase = match.group(0)
        if phrase.lower() in ("may", "march", "sat", "sun", "wed", "mar") and not re.search(r"\d", phrase):
            continue
        out.append((match.start(), match.end(), phrase))
    return out


def window(phrase: str, now: datetime) -> tuple[datetime, datetime] | None:
    """A question's time phrase as (start, end) instants on `now`'s clock,
    the end never after `now`: "last week" is Monday 00:00 to Sunday 23:59
    of the week before this one; "since March" is 1 March to now. None for a
    phrase that names no past span, never a guess."""
    found = span(phrase, now.date(), "past")
    if found is None:
        return None
    first, last, _grain = found
    start = datetime.combine(first, time(0), now.tzinfo)
    end = min(datetime.combine(last, time(23, 59, 59), now.tzinfo), now)
    return (start, end) if start < end else None
