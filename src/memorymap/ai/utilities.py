"""Answers the app works out itself, with no note and no model (CHAT_PLAN
Phase 6, decision 41: the `computed` sentence, the third allowed kind beside
quoted and measured).

A sum, a unit or currency conversion, the time and the date, a count of days
to or from a date, a roll of a die. Each reads the question by a fixed
pattern, works the value out by rule (our own unit table, our own bounded
arithmetic in `arithmetic.py`, `when.span` for dates) and says it as one
sentence, followed by how the question was read ("Read as 5 miles in
kilometres."), so a misreading is visible rather than silent.

Nothing here reads a note and nothing leaves the computer: a currency answer
uses the dated table below and says its date (decision 43); the weather is
said to be something the app does not know.

`answer(question, now, salt)` returns the parts, `[(kind, text), ...]`, with
kind "computed" for a worked-out sentence and "phrase" for a fixed line of
`composer.PHRASES` (named by key), or None for a question that is not one of
these. `kind_of(question)` says which utility a question is, for the router.
"""

from __future__ import annotations

import hashlib
import re
from datetime import date, datetime

from memorymap.ai import arithmetic, recognise
from memorymap.ai import when as when_words

# --- units -----------------------------------------------------------------------

#: name -> (dimension, size in the dimension's base unit, the name said): the
#: recogniser's table (CHAT_PLAN decision 46), so a unit the chips read is a
#: unit this converts.
_UNITS = recognise.UNITS

_UNIT_NAMES = "|".join(sorted((re.escape(n) for n in _UNITS), key=len, reverse=True))
_NUM = r"(-?\d+(?:[.,]\d+)?)"
def _compile_convert() -> tuple:
    return (
    re.compile(rf"^(?:convert\s+)?{_NUM}\s*({_UNIT_NAMES})\s+(?:to|into|in|as)\s+({_UNIT_NAMES})$", re.I),
    re.compile(rf"^how many\s+({_UNIT_NAMES})\s+(?:is|are|in|make|makes|equals?)\s+(?:a|an|{_NUM})\s*({_UNIT_NAMES})$", re.I),
    re.compile(rf"^how (?:much|far|long|heavy|big|hot|cold) is\s+{_NUM}\s*({_UNIT_NAMES})\s+in\s+({_UNIT_NAMES})$", re.I),
    )

# --- currency (decision 43: a dated table, never fetched) ----------------------------

#: Units of each currency to one US dollar: approximate mid-market rates, set
#: by hand on `RATES_DATE` and said with every answer. A person who needs
#: today's rate knows from the date that this is not it.
RATES_DATE = date(2025, 6, 1)
RATES: dict[str, float] = {
    "USD": 1.0, "EUR": 0.88, "GBP": 0.74, "JPY": 144.0, "AUD": 1.55, "CAD": 1.37, "NZD": 1.67, "CHF": 0.82,
    "CNY": 7.19, "INR": 85.5, "SEK": 9.6, "NOK": 10.1, "DKK": 6.56, "SGD": 1.29, "HKD": 7.85, "MXN": 19.2,
    "BRL": 5.6, "ZAR": 17.9, "KRW": 1370.0, "PLN": 3.75,
}
_CURRENCY_NAMES = recognise.CURRENCY_NAMES
_MONEY_NAMES = "|".join(sorted((re.escape(n) for n in _CURRENCY_NAMES), key=len, reverse=True))
def _compile_money() -> tuple:
    return (
        re.compile(rf"^(?:convert\s+|how much is\s+|what is\s+)?({_MONEY_NAMES})?\s*{_NUM}\s*({_MONEY_NAMES})?\s+(?:to|into|in)\s+({_MONEY_NAMES})$", re.I),
    )


#: The two long patterns compile on first use (a few hundred unit names make
#: them the slowest part of importing the composer).
_PATTERNS: dict[str, tuple] = {}


def _patterns(name: str) -> tuple:
    if name not in _PATTERNS:
        _PATTERNS[name] = _compile_convert() if name == "convert" else _compile_money()
    return _PATTERNS[name]

# --- the clock, dates, chance ----------------------------------------------------------

_CLOCK = re.compile(r"^(?:what(?:'s| is) the time|what time is it|whats the time|the time|time)(?: now| right now)?$", re.I)
_TODAY = re.compile(
    r"^(?:what(?:'s| is) (?:the )?(?:date|day)(?: today| it)?|what day is it(?: today)?|what(?:'s| is) today(?:'s date)?|"
    r"today'?s date|what date is it(?: today)?|what(?:'s| is) the date today)$",
    re.I,
)
_YEAR = re.compile(r"^what (?:year|month) is it(?: now)?$", re.I)
#: "15% of 240" (CHAT_PLAN section 7 row 1: it quoted a note instead of 36).
_PERCENT = re.compile(r"^(?:what(?:'s| is)\s+|work out\s+|calculate\s+)?(-?\d+(?:\.\d+)?)\s*(?:%|percent|per cent)\s+of\s+(-?\d[\d,]*(?:\.\d+)?)$", re.I)
_WEEKDAY_OF = re.compile(r"^what day(?: of the week)? (?:is|was|will be|falls on) (\S.*)$", re.I)
_DIE = re.compile(r"^(?:roll|throw)\s+(?:a\s+|one\s+|the\s+)?(?:die|dice|d6)$|^roll\s+(\d{1,2})?d(\d{1,3})$", re.I)
_COIN = re.compile(r"^(?:flip|toss)\s+a\s+coin$|^heads or tails$", re.I)
_PICK = re.compile(r"^(?:pick|choose|give me)\s+a\s+(?:random\s+)?number\s+(?:between|from)\s+(-?\d{1,6})\s+(?:and|to)\s+(-?\d{1,6})$", re.I)
_WEATHER = re.compile(r"\b(?:weather|forecast|temperature outside|going to rain|will it rain)\b", re.I)
_TRANSLATE = re.compile(r"^(?:translate|say) \S.* (?:in|into|to) (?:french|spanish|german|italian|portuguese|dutch|japanese|chinese|korean|arabic|russian|hindi|greek|swedish|polish|turkish)$", re.I)

_WEEKDAY_NAMES = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
_MONTH_NAMES = ("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")


def _clean(question: str) -> str:
    text = " ".join(str(question or "").replace("?", " ").split()).strip(" .!")
    text = re.sub(r"^(?:hey|hi|ok|okay|so|please|can you|could you|tell me|do you know)[, ]+", "", text, flags=re.I)
    text = re.sub(r"^(?:can you |could you |please )?(?:tell me |work out |calculate )", "", text, flags=re.I)
    return re.sub(r"(?:,| |, )(?:please|thanks)$", "", text, flags=re.I).strip()


def _number(raw: str) -> float:
    return float(raw.replace(",", "."))


def _said(value: float) -> str:
    """A value to say: whole numbers whole, else to two places, never "-0"."""
    if abs(value) >= 1000:
        return f"{value:,.0f}" if abs(value - round(value)) < 0.05 else f"{value:,.1f}"
    if abs(value - round(value)) < 0.005:
        return str(int(round(value))) if round(value) else "0"
    return f"{value:.2f}".rstrip("0").rstrip(".") if abs(value) >= 0.01 else f"{value:.4g}"


def _day_words(day: date) -> str:
    return f"{_WEEKDAY_NAMES[day.weekday()]} {day.day} {_MONTH_NAMES[day.month - 1]} {day.year}"


def _plural(n: int, word: str) -> str:
    return f"{n} {word}" if n == 1 else f"{n} {word}s"


_SINGULAR = {"inches": "inch", "feet": "foot", "stone": "stone"}


def _one(value: float, name: str) -> str:
    """A unit's name agreeing with its number: "1 litre", "2 litres"."""
    if _said(value) not in ("1", "-1") or name.startswith("°") or name == "K":
        return name
    head, _, rest = name.partition(" ")
    if name in _SINGULAR:
        return _SINGULAR[name]
    if head.endswith("s") and head not in ("US", "UK"):
        return " ".join(filter(None, (head[:-1], rest)))
    if head in ("US", "UK") and rest.endswith("s"):
        return f"{head} {rest[:-1]}"
    return name


def _temperature(value: float, src: str, dst: str) -> float:
    celsius = value if src == "°C" else (value - 32) * 5 / 9 if src == "°F" else value - 273.15
    return celsius if dst == "°C" else celsius * 9 / 5 + 32 if dst == "°F" else celsius + 273.15


def _convert(text: str) -> list[tuple] | None:
    for index, pattern in enumerate(_patterns("convert")):
        match = pattern.match(text)
        if not match:
            continue
        if index == 1:
            dst, raw, src = match.group(1), match.group(2) or "1", match.group(3)
        else:
            raw, src, dst = match.group(1), match.group(2), match.group(3)
        a, b = _UNITS[src.lower()] if src.lower() in _UNITS else _UNITS[src], _UNITS[dst.lower()] if dst.lower() in _UNITS else _UNITS[dst]
        if a[0] != b[0]:
            return [("computed", f"{a[2].capitalize()} and {b[2]} measure different things ({a[0]} and {b[0]}), so one does not convert to the other.")]
        value = _number(raw)
        result = _temperature(value, a[2], b[2]) if a[0] == "temperature" else value * a[1] / b[1]
        return [
            ("computed", f"{_said(value)} {_one(value, a[2])} is {_said(result)} {_one(result, b[2])}."),
            ("computed", f"\nRead as {_said(value)} {_one(value, a[2])} in {b[2]}."),
        ]
    return None


def _currency(text: str, rates: dict[str, float], rates_date: date) -> list[tuple] | None:
    for pattern in _patterns("money"):
        match = pattern.match(text)
        if not match:
            continue
        before, raw, after, dst = match.groups()
        src_name = (before or after or "").lower()
        if not src_name:
            return None
        src, target = _CURRENCY_NAMES.get(src_name), _CURRENCY_NAMES.get(dst.lower())
        if not src or not target or src not in rates or target not in rates:
            return None
        value = _number(raw)
        result = value / rates[src] * rates[target]
        when = f"{rates_date.day} {_MONTH_NAMES[rates_date.month - 1]} {rates_date.year}"
        return [
            ("computed", f"{_said(value)} {src} is about {_said(result)} {target} at the rates from {when}."),
            ("computed", f"\nRead as {_said(value)} {src} in {target}."),
        ]
    return None


def _salted(salt: str, text: str, low: int, high: int) -> int:
    digest = hashlib.sha1(f"{salt}|{text.lower()}".encode()).digest()
    return low + int.from_bytes(digest[:4], "big") % (high - low + 1)


def _dates(text: str, now: datetime) -> list[tuple] | None:
    today = now.date()
    asked = recognise.days_question(text)
    if asked and asked[0] == "future":
        found = when_words.span(asked[1], today, "future")
        if found is None:
            return None
        days = (found[0] - today).days
        if days < 0:
            return [("computed", f"{_day_words(found[0])} was {_plural(-days, 'day')} ago."), ("computed", f"\nRead as the days from today to {asked[1]}.")]
        return [
            ("computed", f"{_day_words(found[0])} is {_plural(days, 'day')} away." if days else "That is today."),
            ("computed", f"\nRead as the days from today to {asked[1]}."),
        ]
    if asked:
        found = when_words.span(asked[1], today, "past")
        if found is None:
            return None
        days = (today - found[0]).days
        return [("computed", f"{_day_words(found[0])} was {_plural(days, 'day')} ago."), ("computed", f"\nRead as the days from {asked[1]} to today.")]
    offset = recognise.offset_question(text)
    if offset:
        amount, unit, ago = offset
        phrase = f"{amount} {unit} ago" if ago else f"in {amount} {unit}"
        found = when_words.span(phrase, today, None)
        if found is None:
            return None
        return [("computed", f"{amount.capitalize() if not amount.isdigit() else amount} {unit} {'ago' if 'ago' in phrase else 'from today'} is {_day_words(found[0])}.")]
    match = _WEEKDAY_OF.match(text)
    if match:
        found = when_words.span(match.group(1), today, "future")
        if found is None or found[2] != "day":
            return None
        verb = "was" if found[0] < today else "is"
        return [("computed", f"{found[0].day} {_MONTH_NAMES[found[0].month - 1]} {found[0].year} {verb} a {_WEEKDAY_NAMES[found[0].weekday()]}.")]
    return None


def now_day() -> date:
    return date.today()


def until_subject(question: str) -> tuple[str, str] | None:
    """("future" or "past", the subject) of "how many days until the
    dentist", whose date only a note can give, or None."""
    text = _clean(question)
    asked = recognise.days_question(text)
    if asked:
        return asked[0], re.sub(r"^(?:the|my|our)\s+", "", asked[1].strip(), flags=re.I)
    return None


def _sum_of(question: str, text: str) -> str | None:
    return arithmetic.sum_in(question) or arithmetic.sum_in(text)


def kind_of(question: str) -> str | None:
    """Which utility `question` is, or None: the router's question, answered
    without working anything out."""
    text = _clean(question)
    if not text:
        return None
    if _sum_of(question, text):
        return "sum"
    if _PERCENT.match(text):
        return "percent"
    if _CLOCK.match(text) or _TODAY.match(text) or _YEAR.match(text):
        return "clock"
    if any(p.match(text) for p in _patterns("convert")):
        return "units"
    if any(p.match(text) for p in _patterns("money")):
        return "currency"
    asked = recognise.days_question(text)
    if asked:
        #: "how many days until the dentist": the date is in a note, which
        #: the composer reads (`composer._until_note`).
        return "dates" if when_words.span(asked[1], now_day(), asked[0]) else "until_note"
    if recognise.offset_question(text) or (_WEEKDAY_OF.match(text) and when_words.span(_WEEKDAY_OF.match(text).group(1), now_day(), "future")):
        return "dates"
    if _DIE.match(text) or _COIN.match(text) or _PICK.match(text):
        return "chance"
    if _TRANSLATE.match(text):
        return "translate"
    if _WEATHER.search(text) and not re.search(r"\b(?:my|notes?|wrote)\b", text, re.I):
        return "weather"
    return None


#: Decision 54: a computed sentence always says how the question was read.
#: A sum says its expression as the sentence's subject ("12 * 7 is 84."),
#: which is its reading; everything else carries a "Read as" line.
_CLOCK_READ = ("computed", "\nRead as the date and time on this computer's clock.")


def answer(question: str, now: datetime | None = None, salt: str = "", rates: dict | None = None, rates_date: date | None = None) -> list[tuple] | None:
    """The parts of a utility answer to `question`, or None."""
    kind = kind_of(question)
    if kind is None or kind == "until_note":
        return None
    now = now or datetime.now()
    text = _clean(question)
    if kind == "sum":
        expr = _sum_of(question, text)
        value = arithmetic.spoken(arithmetic.evaluate(expr))
        return [("computed", f"{expr.strip()} is {value}.")]
    if kind == "percent":
        share, whole = _PERCENT.match(text).groups()
        worked = arithmetic.evaluate(f"{share} / 100 * {whole.replace(',', '')}")
        return [("computed", f"{share}% of {whole} is {arithmetic.spoken(worked)}."),
                ("computed", f"\nRead as {share} hundredths of {whole}.")]
    if kind == "clock":
        if _CLOCK.match(text):
            return [("computed", f"It is {now:%H:%M} on {_day_words(now.date())}."), _CLOCK_READ]
        if _YEAR.match(text):
            return [("computed", f"It is {_MONTH_NAMES[now.month - 1]} {now.year}."), _CLOCK_READ]
        return [("computed", f"Today is {_day_words(now.date())}."), _CLOCK_READ]
    if kind == "units":
        return _convert(text)
    if kind == "currency":
        return _currency(text, rates or RATES, rates_date or RATES_DATE)
    if kind == "dates":
        return _dates(text, now)
    if kind == "chance":
        match = _PICK.match(text)
        if match:
            low, high = sorted((int(match.group(1)), int(match.group(2))))
            return [("computed", f"{_salted(salt, text, low, high)}."), ("computed", f"\nRead as a whole number from {low} to {high}, picked at random.")]
        if _COIN.match(text):
            return [("computed", f"{'Heads' if _salted(salt, text, 0, 1) else 'Tails'}."), ("computed", "\nRead as one coin toss, picked at random.")]
        match = _DIE.match(text)
        count = int(match.group(1) or 1) if match.group(2) else 1
        sides = int(match.group(2) or 6)
        if not (1 <= count <= 10 and 2 <= sides <= 100):
            return None
        rolls = [_salted(f"{salt}:{i}", text, 1, sides) for i in range(count)]
        said = f"You rolled {rolls[0]}." if count == 1 else f"You rolled {', '.join(map(str, rolls))}: {sum(rolls)} in all."
        dice = "one roll" if count == 1 else f"{count} rolls"
        return [("computed", said), ("computed", f"\nRead as {dice} of a {sides}-sided die, picked at random.")]
    if kind == "translate":
        return [("phrase", "utility_translate")]
    return [("phrase", "utility_weather")]


# --- a text's counts and outline (CHAT_PLAN section 2, the documents row) -------------
#
# One module for what the documents editor, the note composer, the Library's
# Contents index and the agent say about a text's size and shape, so a count
# is one number wherever it is shown. The browser's twin is `textCounts`
# (settings-wiring.js) and `docScanHeadings` (documents.js);
# `tests/test_text_utilities.py` holds all three to `wc` and to each other on
# one fixture.

#: Words a minute for "reading time": the rate the editor has always used.
READING_WPM = 220
_ATX = re.compile(r"^(#{1,6})[ \t]+(.+?)[ \t#]*$")
_SETEXT = re.compile(r"^\s*(=+|-{2,})\s*$")
_NOT_PARAGRAPH = re.compile(r"^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\|)")


def counts(text: str) -> dict:
    """Words, characters and lines as `wc -w`, `wc -m` and `wc -l` count them
    (a word is a run of non-space, a character a code point, a line a
    newline), and the reading time in minutes."""
    text = str(text or "")
    words = len(text.split())
    return {
        "words": words,
        "chars": len(text),
        "lines": text.count("\n"),
        "minutes": words / READING_WPM,
        "read": reading_time(words),
    }


def reading_time(words: int) -> str:
    """How the app says a reading time: "under a min", "4 min read", "1.5h read"."""
    if not words:
        return ""
    minutes = words / READING_WPM
    if minutes < 1:
        return "under a min"
    if minutes < 60:
        return f"{round(minutes)} min read"
    return f"{minutes / 60:.1f}h read"


def _heading_at(lines: list[str], index: int, found: list[dict], max_level: int) -> dict | None:
    """The heading the line at `index` closes or is, or None: a `#` line, or the
    `===`/`---` underline of a paragraph line above it."""
    line = lines[index]
    match = _ATX.match(line)
    if match:
        if match.group(2).strip() and len(match.group(1)) <= max_level:
            return {"line": index, "level": len(match.group(1)), "text": match.group(2).strip()[:200]}
        return None
    if index and _SETEXT.match(line):
        above = lines[index - 1]
        if above.strip() and not _NOT_PARAGRAPH.match(above) and not (found and found[-1]["line"] == index - 1):
            return {"line": index - 1, "level": 1 if line.strip()[0] == "=" else 2, "text": above.strip()[:200]}
    return None


def outline(text: str, max_level: int = 6, limit: int | None = None) -> list[dict]:
    """`{line, level, text}` for each heading, `line` zero-based: `#` headings
    to `max_level`, and the underlined (setext) form, as the editor draws
    them; a `#` inside a fenced block is code, not a heading."""
    found: list[dict] = []
    fenced = False
    lines = str(text or "").split("\n")
    for index, line in enumerate(lines):
        if line.strip().startswith(("```", "~~~")):
            fenced = not fenced
            continue
        if fenced:
            continue
        heading = _heading_at(lines, index, found, max_level)
        if heading is not None:
            found.append(heading)
        if limit and len(found) >= limit:
            break
    return found
