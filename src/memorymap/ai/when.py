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

_ANCHORED = re.compile(
    r"^(\d{1,3}|half an|a couple of|a few|[a-z-]+)\s+(minutes?|mins?|hours?|hrs?)\s+(before|after)\s+(.+)$"
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
            if not re.search(r"\b(?:at|by|around|about)\s*$", before):
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
    day, rest = _day(text, now)
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
    rest = re.sub(r"\s+(?:on|at|by|for)$", "", rest, flags=re.IGNORECASE).strip(" ,.;:-")
    if not rest:
        rest = text.strip() or "Reminder"
    return {
        "text": (rest[0].upper() + rest[1:])[:500],
        "due_at": at,
        "priority": priority,
        "source": "rule",
    }
