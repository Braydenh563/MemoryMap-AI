"""Saying a note's sentence back to the person who wrote it (CHAT_PLAN Phase 6,
decision 33): grammar rules with a table of pairs each, no model.

- `shift_person`: the writer's "I", "my", "me" said as "you", "your",
  with the verb agreeing ("I am" is "you are", "I was" is "you were", "am I"
  is "are you", "I've" is "you have"); "Sam and I" is "you and Sam"; "we",
  "us" and "our" stay (the person was one of several). Never inside someone
  else's words: text in quotation marks, or after "Sam said:", is theirs.
- `past_plan`: a plan whose day has gone by, said in the past ("you plan to
  go" is "you planned to go"), the note's own words one tap away.
- `relative_day`: a day said against today ("yesterday", "on Friday", "last
  week", "two weeks ago", "on 3 March", "on 3 March 2025").
- `count_noun`, `join_items`, `after_comma`, `cut_title`: number agreement,
  a list said as one sentence, the case after a joining comma, a title cut
  at a word.

- `protected`, `opener`, `wording`, `variety`: the variety floor (decision
  51). A composed answer is parts; the protected ones (a quote, a title, a
  measured value, the asked words, a Help sentence) never vary, the rest
  (openers and joins) vary by chat and turn. `VARIETY_FLOOR` of
  `VARIETY_TURNS` turns of one question open differently, measured on every
  build by `tests/test_realise.py` in both voices and the help register.

Each rule is a table of input and output pairs in `tests/test_realise.py`;
a rule that would change what a sentence means has a pair that shows it
does not. The composer marks every sentence it shifted, and the grounding
row keeps the note's own words (`original`), so a shifted sentence is still
checked against the note it came from.
"""

from __future__ import annotations

import re
from datetime import date

_NUMBERS = ("no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve")
_MONTHS = ("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")
_WEEKDAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")

# --- the app's own voice (decision 55) ----------------------------------------------

#: What the app says itself, one register (Brief 68 row 9): a failure is
#: "Couldn't {what}.", or with its reason "Couldn't {what}: {why}". The
#: browser's twin is `VOICE` in status.js, held equal by
#: tests/test_voice_tables.py.
VOICE = {
    "failed": "Couldn't {what}.",
    "failed_why": "Couldn't {what}: {why}",
}


def say(key: str, **slots: str) -> str:
    why = str(slots.get("why") or "").strip()
    shape = VOICE["failed_why" if key == "failed" and why else key]
    return shape.format(**{**slots, "why": why})


# --- person ---------------------------------------------------------------------

#: Whole-phrase rewrites first (verb agreement), then single words. Lowercase
#: keys; the replacement takes the case of the word it replaces, except that
#: "I" (always a capital) gives a lowercase "you": sentence case is the
#: caller's, which knows whether the sentence starts there.
_PHRASES = (
    (r"\bI am\b", "you are"),
    (r"\bI'm\b", "you're"),
    (r"\bI was\b", "you were"),
    (r"\bI wasn't\b", "you weren't"),
    (r"\bI was not\b", "you were not"),
    (r"\bI've\b", "you have"),
    (r"\bI'll\b", "you will"),
    (r"\bI'd\b", "you'd"),
    (r"\bam I\b", "are you"),
    (r"\bwas I\b", "were you"),
    (r"\bAm I\b", "Are you"),
    (r"\bWas I\b", "Were you"),
)
_PHRASE_RES = tuple((re.compile(p), r) for p, r in _PHRASES)
#: "Sam and I", "Sam and me": the person first, as people say it of others.
_AND_I = re.compile(r"\b([A-Z][a-z]+(?: [A-Z][a-z]+)?) and (?:I|me)\b")
_WORDS = {"i": "you", "me": "you", "my": "your", "mine": "yours", "myself": "yourself"}
_WORD_RE = re.compile(r"\b(I|me|my|mine|myself|Me|My|Mine|Myself|MY)\b")
#: Where someone else's words start: a quotation mark, or "said:"-like.
_THEIRS = re.compile(r"[\"“][^\"“”]*[\"”]|\b(?:said|says|wrote|writes|told me|asked|replied)\s*:.*$", re.S)


def _case_like(word: str, said: str) -> str:
    if word == "I":
        return said
    if word.isupper() and len(word) > 1:
        return said.upper()
    if word[:1].isupper():
        return said[:1].upper() + said[1:]
    return said


#: Where a first-person word is not the writer: an idiom ("let me know",
#: "oh my", "my bad") or a numeral ("Part I", "World War I", "I/O"). Said as
#: written; each has a pair in the tests.
_KEEP = re.compile(
    r"(?i:\b(?:let|excuse|trust|believe|pardon|beats)\s+me\b|\boh my\b|\bmy (?:god|goodness|gosh|bad)\b)"
    r"|\b(?:Part|Chapter|Book|War|Phase|Season|Volume|Act|Henry|Elizabeth|Charles|George|Louis|Type|Level|Grade|Class)\s+I\b"
    r"|\bI/O\b|\bI-\d",
)


def _shift_words(text: str) -> str:
    text = _AND_I.sub(lambda m: f"you and {m.group(1)}", text)
    for pattern, said in _PHRASE_RES:
        text = pattern.sub(said, text)
    return _WORD_RE.sub(lambda m: _case_like(m.group(1), _WORDS[m.group(1).lower()]), text)


def _shift_part(text: str) -> str:
    out = []
    cursor = 0
    for match in _KEEP.finditer(text):
        out.append(_shift_words(text[cursor:match.start()]))
        out.append(match.group(0))
        cursor = match.end()
    out.append(_shift_words(text[cursor:]))
    return "".join(out)


def shift_person(text: str, quoted: bool = False) -> str:
    """`text` with the writer's first person said as the reader's second.
    `quoted`: the whole text is someone else's words, so nothing changes."""
    if quoted or not text:
        return text
    out = []
    cursor = 0
    for match in _THEIRS.finditer(text):
        out.append(_shift_part(text[cursor:match.start()]))
        out.append(match.group(0))
        cursor = match.end()
    out.append(_shift_part(text[cursor:]))
    return "".join(out)


def first_person(text: str) -> bool:
    """Whether `shift_person` would change anything in `text`."""
    return shift_person(text) != text


# --- tense ------------------------------------------------------------------------

_PLAN_PAST = (
    (re.compile(r"\byou plan to\b"), "you planned to"),
    (re.compile(r"\byou are planning to\b"), "you were planning to"),
    (re.compile(r"\byou're planning to\b"), "you were planning to"),
    (re.compile(r"\byou are going to\b"), "you were going to"),
    (re.compile(r"\byou're going to\b"), "you were going to"),
    (re.compile(r"\byou are going\b"), "you were going"),
    (re.compile(r"\byou're going\b"), "you were going"),
    (re.compile(r"\byou will\b"), "you were going to"),
    (re.compile(r"\byou want to\b"), "you wanted to"),
    (re.compile(r"\byou need to\b"), "you needed to"),
    (re.compile(r"\byou intend to\b"), "you intended to"),
)


def past_plan(text: str, due: date | None, today: date) -> str:
    """A plan said in the second person, moved into the past when its day has
    gone by ("you plan to go on Friday", Friday past: "you planned to go on
    Friday"). Unchanged when the day is to come or not known."""
    if due is None or due >= today:
        return text
    for pattern, said in _PLAN_PAST:
        text = pattern.sub(said, text)
    return text


# --- days and counts ------------------------------------------------------------------


def count_word(n: int) -> str:
    return _NUMBERS[n] if 0 <= n < len(_NUMBERS) else str(n)


def relative_day(day: date, today: date) -> str:
    """`day` said against `today`, the way a person would: the exact date is
    the citation's to give."""
    delta = (today - day).days
    if delta == 0:
        return "today"
    if delta == 1:
        return "yesterday"
    if delta == -1:
        return "tomorrow"
    if 2 <= delta <= 6:
        return f"on {_WEEKDAYS[day.weekday()]}"
    if -6 <= delta <= -2:
        return f"on {_WEEKDAYS[day.weekday()]}"
    if 7 <= delta <= 13:
        return "last week"
    if -13 <= delta <= -7:
        return "next week"
    if 14 <= delta <= 34:
        return f"{count_word(delta // 7)} weeks ago"
    if day.year == today.year:
        return f"on {day.day} {_MONTHS[day.month - 1]}"
    return f"on {day.day} {_MONTHS[day.month - 1]} {day.year}"


_IRREGULAR_PLURALS = {"day": "days", "week": "weeks", "person": "people", "child": "children", "entry": "entries", "copy": "copies"}


def count_noun(n: int, noun: str, *, article: bool = False) -> str:
    """"one note", "two notes"; with `article`, "a day", "three days"."""
    if n == 1:
        if article:
            return f"{'an' if noun[:1].lower() in 'aeiou' else 'a'} {noun}"
        return f"one {noun}"
    plural = _IRREGULAR_PLURALS.get(noun) or (noun[:-1] + "ies" if noun.endswith("y") and noun[-2:-1] not in "aeiou" else noun + "s")
    return f"{count_word(n)} {plural}"


def join_items(items: list[str]) -> str:
    """A list said as one sentence: "A, B and C". The Oxford comma only when
    an item itself holds "and", so "bread, salt, and fish and chips" cannot be
    read as four things."""
    items = [i for i in items if i]
    if len(items) <= 1:
        return "".join(items)
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    oxford = "," if any(" and " in i for i in items) else ""
    return f"{', '.join(items[:-1])}{oxford} and {items[-1]}"


#: First words that are never a name, so lowered after a joining comma.
_COMMON = frozenset(
    """a an the it its this that these those there they their them we our you your he she his her
    one two three four five six seven eight nine ten every each some most all no not after before when
    if then in on at for to with from by of only just still maybe once both next last first until since
    what which who how why where""".split()
)


def after_comma(text: str) -> str:
    """The sentence's first letter as it reads after "Separately, ": lowered
    when its first word is a common word, kept when it may be a name or is
    "I"."""
    first = re.match(r"[A-Za-z']+", text or "")
    if not first or first.group(0).lower() not in _COMMON or first.group(0)[1:] != first.group(0)[1:].lower():
        return text
    return text[0].lower() + text[1:]


def cut_title(title: str, limit: int) -> str:
    """A title no longer than `limit` characters, cut at a word with an
    ellipsis, never through one."""
    title = " ".join((title or "").split())
    if len(title) <= limit:
        return title
    cut = title[: max(1, limit - 1)]
    space = cut.rfind(" ")
    if space > 0:
        cut = cut[:space]
    return cut.rstrip(" ,;:-") + "…"


# --- the variety floor (decision 51) ------------------------------------------------

#: Parts that carry a fact or the person's words: fixed whatever the turn.
PROTECTED = frozenset({"confirmed", "quote", "title", "filed", "picture", "measure", "asked", "help", "web", "reminder"})
#: Twenty turns of one question in one chat open at least three ways (the
#: plan's floor, 2026-10-10; measured 1 before the mention lead had variants).
VARIETY_FLOOR = 3
VARIETY_TURNS = 20


def protected(parts: list) -> tuple:
    """The answer's protected spans, in order: what must not change between
    turns. A quote's first letter lowered after a joiner is the same fact."""
    return tuple((p[0], p[1][:1].lower() + p[1][1:]) for p in parts if p[0] in PROTECTED and p[1])


def opener(parts: list) -> str:
    """How an answer starts: its first worded template phrase, or the kind of
    the protected span it starts with ("(quote)")."""
    for part in parts:
        if part[0] != "template":
            return f"({part[0]})"
        if re.search(r"[A-Za-z]", part[1]):
            return part[1]
    return ""


def wording(parts: list) -> str:
    """The answer with every protected span said as its kind: what the
    realiser chose, apart from what the notes said."""
    return "".join(p[1] if p[0] not in PROTECTED else f"<{p[0]}>" for p in parts)


def variety(results: list[dict]) -> dict:
    """Over one question's answers in one chat: how many ways they open, how
    many wordings they take, and how many protected-span sets (one, always)."""
    return {
        "openers": len({opener(r["parts"]) for r in results}),
        "wordings": len({wording(r["parts"]) for r in results}),
        "facts": len({protected(r["parts"]) for r in results}),
    }
