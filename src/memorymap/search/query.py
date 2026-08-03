"""Reading the question before searching for it.

A question is not a query. *"What have I written in the last week about the
allotment?"* is three separate instructions — a time range, a subject, and a
verb that means nothing at all — and until now every word of it went straight
into an embedding and a `LIKE`. Two things went wrong with that, and both are
things a person notices immediately:

- **"in the last week" matched nothing and filtered nothing.** It is not a
  subject, so it dilutes the embedding; it is not a keyword anyone wrote in a
  note, so it drags the keyword search off course. Meanwhile the thing it
  actually meant — only show me notes from the last seven days — was never
  applied, so the answer came back full of notes from March.
- **The question words dominate a short query.** An embedding of "what did I
  write about beans" is meaningfully different from an embedding of "beans",
  and for a three-word subject the scaffolding is most of the sentence. The
  model is matching your phrasing rather than your subject.

So: lift the time range out and apply it as a filter, strip the scaffolding
before embedding, and leave everything else alone. Deliberately no model call —
this runs on every question, and a round trip to *decide how to search* would
cost more than the search.

The time vocabulary is `entry.timewords`, reused rather than reimplemented: it
already resolves "last week", "three days ago" and "on tuesday" for note text,
and a notebook where a phrase means one thing in a note and another in a
question would be worse than one that understood neither.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from memorymap.entry import timewords


@dataclass(frozen=True)
class Understood:
    """What a question turned out to be asking for."""

    #: The question with the time phrase and the scaffolding removed — what to
    #: embed and what to match words against.
    subject: str
    #: Inclusive date bounds, or None for "whenever".
    since: date | None = None
    until: date | None = None
    #: The phrase the range came from, so the UI can say *why* it filtered.
    when_phrase: str = ""
    #: True when the question was **entirely** about time ("what did I write
    #: last week?"). There is no subject to search for, so the honest answer is
    #: every note in the range rather than a similarity ranking of noise.
    time_only: bool = False

    @property
    def has_range(self) -> bool:
        return self.since is not None or self.until is not None


# Phrases that mean "a stretch ending now" rather than a single day. `timewords`
# resolves "last week" to one date — the Monday of the previous week — which is
# right for a note that says "I'll do it last week" and wrong for a question,
# where the person means the whole stretch. So ranges are recognised here, and
# anything not in this list falls through to `timewords` and becomes a single
# day (widened by its own precision below).
#
# Ordered longest-first: "in the last couple of weeks" has to be tried before
# "the last week" or the shorter phrase eats the longer one's meaning.
_RANGE_RULES: list[tuple[str, object]] = [
    (
        r"(?:in|over|during|from|within)?\s*(?:the\s+)?(?:last|past|previous)\s+"
        r"(\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|"
        r"eleven|twelve|few|couple of)\s+(day|week|fortnight|month|year)s?",
        "back",
    ),
    (r"(?:in|over|during)?\s*(?:the\s+)?(?:last|past)\s+(week)\b", "back"),
    (r"(?:in|over|during)?\s*(?:the\s+)?(?:last|past)\s+(month)\b", "back"),
    (r"(?:in|over|during)?\s*(?:the\s+)?(?:last|past)\s+(year)\b", "back"),
    (r"\btoday\b", "today"),
    (r"\byesterday\b", "yesterday"),
    (r"\bthis\s+week\b", "this_week"),
    (r"\bthis\s+month\b", "this_month"),
    (r"\bthis\s+year\b", "this_year"),
    (r"\brecent(?:ly)?\b", "recent"),
]

_COMPILED_RANGES = [(re.compile(p, re.IGNORECASE), kind) for p, kind in _RANGE_RULES]

_UNIT_DAYS = {"day": 1, "week": 7, "fortnight": 14, "month": 30, "year": 365}

#: What "recently" means when nobody says. A fortnight: long enough that a
#: quiet week does not come back empty, short enough that "recently" still
#: means something.
RECENT_DAYS = 14


def _count(word: str) -> int:
    word = word.strip().lower()
    if word.isdigit():
        return int(word)
    return {
        "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11,
        "twelve": 12, "few": 3, "couple of": 2,
    }.get(word, 1)


def _range_for(kind: str, match: re.Match, today: date) -> tuple[date, date]:
    if kind == "back":
        groups = [g for g in match.groups() if g]
        if len(groups) >= 2:
            days = _count(groups[0]) * _UNIT_DAYS[groups[1].lower()]
        else:
            days = _UNIT_DAYS[groups[0].lower()] if groups else RECENT_DAYS
        return today - timedelta(days=days), today
    if kind == "today":
        return today, today
    if kind == "yesterday":
        return today - timedelta(days=1), today - timedelta(days=1)
    if kind == "this_week":
        return today - timedelta(days=today.weekday()), today
    if kind == "this_month":
        return today.replace(day=1), today
    if kind == "this_year":
        return today.replace(month=1, day=1), today
    return today - timedelta(days=RECENT_DAYS), today  # "recent"


# The words a question is *made of* rather than about. Stripped before
# embedding, because for a short subject they are most of the sentence and the
# vector ends up describing the phrasing.
#
# Only ever removed from the ends of the query, never the middle: "notes on how
# to prove bread" must keep its "how" — that one is the subject. A leading
# "what did I write about" is scaffolding; the same words inside a sentence may
# not be.
_SCAFFOLD = re.compile(
    r"^\s*(?:"
    r"what(?:'s| is| are| did| have| was| were)?|"
    r"which|show me|find( me)?|list|tell me( about)?|remind me( about)?|"
    r"can you (?:show|find|tell|list)( me)?|do i have|did i (?:write|save|note|say)|"
    r"have i (?:written|saved|noted|said)|i (?:wrote|saved|noted|write|save|note)|"
    r"any(?:thing)?|all (?:my|the)|my|the|about|any notes|notes|note|"
    # Pronouns and auxiliaries left behind once the phrase around them goes:
    # lifting "in the last week" out of "what notes have I saved in the last
    # week" leaves "have I saved", which is not a subject and must not become
    # one. Each is only ever stripped from the *front*, so a note about "I,
    # Claudius" keeps its words.
    r"i|have|has|had|did|do|does|was|were|been|get|got|save[ds]?|written|wrote|"
    # Connectives that a lifted phrase can leave stranded mid-sentence:
    # "anything from this month about the garden" → "from  about the garden".
    r"from|in|on|at|for|of|with"
    r")\b[\s,]*",
    re.IGNORECASE,
)

#: Punctuation a question can end with, dropped along with trailing space.
_TRAILING_CHARS = " \t\r\n,.?!"


def _tidy(text: str) -> str:
    """Collapse whitespace and drop trailing punctuation. No regex, on purpose.

    This was `re.sub(r"[\\s,.?!]+$", "", re.sub(r"\\s{2,}", " ", text).strip())`
    and CodeQL was right to flag it (`py/polynomial-redos`, high): an anchored
    `[…]+$` makes the engine retry the quantifier from every position, so a
    query of many tabs costs O(n²) — and this runs on text that arrives
    straight from a search box, which is as uncontrolled as input gets in this
    app.

    `str.split` and `str.rstrip` are linear, do the same job, and are easier to
    read than the pattern they replace. `split()` with no argument also folds
    newlines and tabs into the single spaces the front-anchored matcher below
    expects, which the old `\\s{2,}` did not do for a *single* stray tab.
    """
    return " ".join(text.split()).rstrip(_TRAILING_CHARS)


def _strip_scaffolding(text: str) -> str:
    """Peel question words off the front, repeatedly.

    Repeatedly, because they stack: "what did I write about…" is three of these
    in a row. It stops as soon as nothing matches, and it never empties the
    string — a query that is *entirely* scaffolding ("what did I write?") keeps
    its last form, since searching for "" would match everything.

    Whitespace is collapsed first: lifting a time phrase out of the middle
    leaves a double space, and a double space stops the front-anchored pattern
    matching the word that is now at the front.
    """
    cleaned = _tidy(text)
    for _ in range(8):
        stripped = _tidy(_SCAFFOLD.sub("", cleaned, count=1))
        if not stripped or stripped == cleaned:
            break
        cleaned = stripped
    return cleaned


def understand(question: str, now: datetime | date | None = None) -> Understood:
    """Read a question for a time range and a subject.

    Never raises and never returns nothing: a question it cannot read comes
    back as its own subject with no range, which is exactly what searching did
    before this existed.
    """
    text = (question or "").strip()
    if not text:
        return Understood(subject="")
    today = (now.date() if isinstance(now, datetime) else now) or date.today()

    since = until = None
    phrase = ""
    remainder = text
    for pattern, kind in _COMPILED_RANGES:
        match = pattern.search(remainder)
        if not match:
            continue
        since, until = _range_for(kind, match, today)
        phrase = match.group(0).strip()
        remainder = (remainder[: match.start()] + " " + remainder[match.end():]).strip()
        break

    if since is None:
        # No range phrase. A single date might still be in there ("what did I
        # note on tuesday"), and `timewords` already knows how to read one —
        # widened to its own precision, so "last month" is the month rather
        # than the 1st of it.
        mentions = timewords.find(remainder, today)
        if mentions:
            mention = mentions[0]
            since, until = _widen(mention)
            phrase = mention.phrase
            remainder = remainder.replace(mention.phrase, " ", 1).strip()

    subject = _strip_scaffolding(remainder)
    # Nothing left but filler once the date came out: the question was *only*
    # about time. Say so, so the caller lists the range instead of ranking
    # noise — "what did I save last week" has no subject to be similar to.
    time_only = since is not None and not _has_content(subject)
    return Understood(
        subject=subject if _has_content(subject) else "",
        since=since,
        until=until,
        when_phrase=phrase,
        time_only=time_only,
    )


def _widen(mention: timewords.Mention) -> tuple[date, date]:
    """One resolved date, as the stretch its phrasing actually meant.

    A note that says "two weeks ago" is pinned to a day, and that is right for
    a note — it is describing one moment. A *question* saying the same words
    means "around then", and nobody remembers which day they wrote something
    two weeks ago. So a phrase measured in weeks or months gets a window around
    its date rather than the date itself, or the filter answers "nothing" to a
    question whose answer is plainly there.
    """
    at = mention.at
    if mention.precision == "week":
        return at, at + timedelta(days=6)
    if mention.precision == "month":
        return at.replace(day=1), _month_end(at)
    if mention.precision == "year":
        return at.replace(month=1, day=1), at.replace(month=12, day=31)
    phrase = mention.phrase.lower()
    if "week" in phrase or "fortnight" in phrase:
        return at - timedelta(days=3), at + timedelta(days=3)
    if "month" in phrase:
        return at - timedelta(days=15), at + timedelta(days=15)
    return at, at


def _month_end(day: date) -> date:
    if day.month == 12:
        return day.replace(day=31)
    return day.replace(month=day.month + 1, day=1) - timedelta(days=1)


#: Words left behind after stripping that do not amount to a subject. Without
#: this, "what did I write last week" leaves "write" and searches for it.
_FILLER = frozenset(
    """write wrote written save saved saves note notes noted say said anything
    something stuff things thing about down i me my have has had did do does
    was were been get got all any show find list tell""".split()
)


def _has_content(subject: str) -> bool:
    words = [w for w in re.split(r"\W+", subject.lower()) if w]
    return any(word not in _FILLER for word in words)
