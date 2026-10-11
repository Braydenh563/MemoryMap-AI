"""The answer a person would give from the notes (CHAT_PLAN decision 70).

INBOX 812, the owner: "the response feels plain, boring, lifeless, and doesnt
give me anything more. I may as well just read the notes I made on the
right". The composer quoted: each note's sentence under a bar with a
bracketed day, then the same notes again as chips and a count. The right
column already shows the notes, so the answer's job is what the column
cannot do: say how many and over which days, put the facts in the
person's terms under a label each, say what the notes do not cover, and
offer one thing to do next.

The shape, from the gold answers (`tests/fixtures/gold_answers.json`):

- one opening sentence that answers, with a count and a span or the fact;
- grouped facts, a bold label and a rewritten sentence each, not a quote;
- what the notes do not say;
- one offer that acts (a reminder, a checklist), never a question for its own sake.

No model and nothing invented: every fact line is a note's own sentence,
cut and turned to the second person, and it carries the note it came
from (`grounding`), so the one citation mark per line lights its card.
Jokes, quotes and other people's words are never said as the person's
facts (decision 67): a note tagged joke is left out unless jokes are asked
for. `answer` returns None for a question this shape does not fit; the
caller then asks `composer.compose`.

The connecting words are in `PHRASES`, one table, so a voice preset
(decision 72) swaps them without touching the facts or the shape.
"""

from __future__ import annotations

import re
import sys
from contextvars import ContextVar
from dataclasses import dataclass, field
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path

from memorymap.ai import composer, realise

#: The connecting words, one table (decision 72: a voice swaps this, never
#: the facts). `{}` slots are filled in order.
PHRASES = {
    "overview": "You have {count} about {topic}, {span}.",
    "likes": "It looks that way: you've written about {topic} {times}, {span}.",
    "from_note": "{fact}, from your note of {day}.",
    "from_list": "{count}, from your {what} of {day}: {items}.",
    "only_one": "It's your only note on {topic} so far.",
    "who_once": "{name} comes up once, on {day}: {fact}.",
    "who_many": "{name} comes up in {count}, {span}.",
    "pick": "The {side}, by your notes: {why}.",
    "more_right": "{count} more on the right.",
    "nothing_yet": "Nothing yet on {facets}.",
    "remind": "Remind you to {action}?",
    "checklist": "Make it a checklist?",
    "pick_note": "Note the {side} as your pick?",
    "start_list": "Start a list of {noun}s to watch next?",
    "gather": "Gather them into one note?",
    "go_again": "Remind you to go to {place} again?",
    "try_one": "Remind you to try {item}?",
    "log_weekly": "Remind you each week to log your spending?",
    "track_table": "Track your {what} in a table?",
    "only_week": "It's the only week you've written down.",
    "only_names": "It's the only note that names {name}.",
    "none_own": "None of them has a note of its own yet.",
    "gone_quiet": "Nothing on {word} since {month}.",
}

#: A note under one of these tags is someone else's words or not a claim
#: about the person (decision 67): left out unless the question asks for it.
CONTEXT_TAGS = frozenset({"joke", "jokes", "quote", "quotes", "fiction", "story", "poem", "lyrics", "test", "draft"})

#: Lines a kind of answer holds after its opening (decision 71: length
#: follows the question's kind).
LINES = {"overview": 5, "likes": 2, "fact": 2, "when": 1, "count": 2, "opinion": 2, "who": 1, "left": 1, "compare": 2}

#: A topic's usual parts, and the words that show a note covers one: what
#: is missing is said only of a topic the notes are plainly about.
FACETS: tuple[tuple[str, re.Pattern, tuple[tuple[str, re.Pattern], ...]], ...] = (
    ("study", re.compile(r"\b(uni|university|lecture|semester|course|class|classes|tutor|study|subject)\b", re.I), (
        ("assessments", re.compile(r"\b(assessment|assignment|exam|quiz|test|essay|midterm)s?\b", re.I)),
        ("due dates", re.compile(r"\b(due|deadline)\b", re.I)),
    )),
    ("trip", re.compile(r"\b(trip|travel|flight|flights|hotel|holiday|itinerary)\b", re.I), (
        ("the dates", re.compile(r"\b\d{1,2}(st|nd|rd|th)? (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\b|\bdates?\b", re.I)),
        ("a budget", re.compile(r"\b(budget|cost|costs|\$\d)", re.I)),
    )),
    ("purchase", re.compile(r"\b(buy|buying|price|looking at a new|shopping)\b|\$\d", re.I), (
        ("where or when you'll buy it", re.compile(r"\b(order(ed)?|bought|buy (it )?(at|from|on)|in stock|sale)\b", re.I)),
    )),
    ("sport", re.compile(r"\b(golf|range|tennis|footy|soccer|basketball)\b", re.I), (
        ("a full game or round", re.compile(r"\b(round|course|match|game|holes?)\b", re.I)),
    )),
)

_WEEKDAY_NAMES = "monday tuesday wednesday thursday friday saturday sunday".split()
_DAYS_PLURAL = re.compile(r"\b(?:(?:mon|tues|wednes|thurs|fri|satur|sun)days?(?:\s+(?:and|or|,)\s+|,\s*)?)+\b", re.I)
_RELATIVE = re.compile(r"\s*\b(?:before |by |until )?(?:next|this|last) (?:week|month|weekend)\b", re.I)
_PREFIX = re.compile(r"^([^:.!?\n]{2,34}):\s+(\S.*)$")
_TIME_LABEL = re.compile(r"^((?:this|next|last) (?:semester|term|year|month|week|weekend)),?\s+(.+)$", re.I)
_ACTION = re.compile(r"(?:^|,\s*|;\s*|\band\s+)((?:ask|call|email|text|book|buy|order|read|check|remember to|pay|send|bring)\b[^.;,]*)$", re.I)
_STILL_TO = re.compile(r"\b([a-z]+(?: [a-z]+)?) (?:are |is )?still to (book|buy|pay|do|send|order|sort)\b", re.I)
_PAST_START = re.compile(
    r"^(went|hit|got|saw|had|did|made|tried|watched|closed|opened|finished|started|played|bought|ate|met|"
    r"wrote|ran|walked|visited|spent|called|booked|fixed|cooked|cleaned|learnt|took)\b",
    re.I,
)
_RATING = re.compile(r"\b(\d+(?:\.\d+)?)\s*(?:out of|/)\s*(10|5|100)\b", re.I)
_WORK = re.compile(r"^(?:watched|saw|read|played|finished|listened to)\s+(.+?)\.?$", re.I)
_GOOD = re.compile(r"\b(incredible|amazing|great|loved|love|brilliant|beautiful|fun|good|excellent|fantastic|enjoyed|perfect)\b", re.I)
_BAD = re.compile(r"\b(dragged|boring|bad|hated|awful|terrible|slow|meh|disappointing|too long|weak|annoying)\b", re.I)

#: Labels for a fact in a note with no heading of its own, first match wins.
_CUES: tuple[tuple[str, re.Pattern], ...] = (
    ("Booked", re.compile(r"\b(is|are|was|were|all) booked\b", re.I)),
    ("Where you landed", re.compile(r"\b(leaning towards|decided|going with|chose|picked|settled on)\b", re.I)),
    ("What you want", re.compile(r"\b(i|you) (want|need) (it|one|them)\b|\blooking for\b", re.I)),
    ("Prices", re.compile(r"\$\s?\d.*\$\s?\d")),
    ("Your aim", re.compile(r"^(trying|aiming|hoping|planning) to\b", re.I)),
    ("Your week", re.compile(r"\b(mon|tues|wednes|thurs|fri|satur|sun)days\b|\bevery (mon|tues|wednes|thurs|fri|satur|sun)day\b", re.I)),
    ("How it went", re.compile(r"\b(felt|fun|incredible|amazing|dragged|boring|straighter|better|worse)\b", re.I)),
)

#: The first cues say what a fact is plainly enough to beat the note's own
#: heading: "Mouse update: ... Leaning towards the Logitech" is where you
#: landed, whatever the note is called.
_STRONG_CUES = 4
#: Words that frame a topic without saying anything about it.
_FRAME_WORDS = frozenset(composer._stem(w) for w in "look looking new idea ideas thought thinking about some".split())
#: Words a question asks with that are not its subject ("what have I learned
#: in psych" is about psych; "when are my uni days" about uni).
_ASKING = frozenset(
    composer._stem(w)
    for w in "learned learnt saved save written wrote noted kept think thought know day days week weeks time times "
    "thing things stuff note notes plan plans going".split()
)

#: Verbs a question names its subject with ("spend on groceries"): never the
#: subject's missing word.
_VERBS = frozenset(composer._stem(w) for w in "spend spent buy get make do go like want need try see say use pay cost".split())

_ASKS = {
    "compare": re.compile(r"^\s*(?:the\s+)?(?P<a>[\w' -]{2,30}?)\s+or\s+(?:the\s+)?(?P<b>[\w' -]{2,30}?)\s*\??\s*$", re.I),
    "who": re.compile(r"^\s*who(?:'s| is| was)\s+(?P<name>[A-Za-z][\w' -]{0,30}?)\s*\??\s*$", re.I),
    "when": re.compile(r"^\s*(?:when|what days?|which days?)\b", re.I),
    "count": re.compile(r"^\s*how (?:much|many)\b", re.I),
    "likes": re.compile(r"^\s*(?:do|did) i (?:like|enjoy|love|play|do)\b|^\s*am i (?:into|a fan of)\b", re.I),
    "opinion": re.compile(r"\bwhat did i (?:think|make) of\b|\bhow did i (?:find|like)\b|\bmy (?:review|opinion|thoughts) (?:of|on)\b", re.I),
    "left": re.compile(r"\bwhat do i (?:still )?(?:need|have) to\b|\bwhat(?:'s| is) (?:left|outstanding|still to do)\b|\bto buy\b", re.I),
    "overview": re.compile(
        r"\bwhat (?:have|did) i (?:saved|save|written|write|noted|got|kept)\b|\bwhat(?:'s| is) there\b|\bwhat do i have\b|"
        r"\bwhat \w+(?: \w+)? (?:have|did) i (?:saved|save|written|write|kept|got|noted)\b|\bwhat do my notes say\b|\btell me about\b|\beverything (?:about|on)\b|\bsummari[sz]e\b|\bwhat(?:'s| is) the plan\b|"
        r"\bplans? for\b|^\s*how(?:'s| is| are) (?:my |the )?.+ going\b|\bwhat have i (?:learned|learnt)\b",
        re.I,
    ),
}


def clean(question: str) -> str:
    """The question without the stray marks a hurried hand leaves (INBOX 808:
    "'what is there about a gaming mouse?\\\\'" searched with the backslash
    kept): slashes and quotes at its ends, doubled spaces."""
    text = " ".join((question or "").split())
    text = re.sub(r"^[\\/'\"`\s]+|[\\/'\"`\s]+$", "", text)
    return text.strip()


#: A question that opens with none of these is a topic ("games notes"):
#: an overview.
_ASKED = re.compile(r"^(?:what|what's|whats|when|who|whom|whose|how|how's|do|does|did|is|are|was|were|where|why|which|can|could|should|will|have|has|had|tell|show|list|give|any)\b", re.I)


def kind_of(question: str) -> str:
    q = clean(question)
    for kind in ("compare", "who", "count", "likes", "opinion", "left", "when", "overview"):
        if _ASKS[kind].search(q):
            return kind
    return "overview" if q and not _ASKED.match(q) else "fact"


#: The notebook's names (words capitalised mid-sentence), for this answer.
_NAMES: ContextVar[set[str]] = ContextVar("digest_names", default=set())


@dataclass
class Fact:
    view: composer.NoteView
    sentence: composer.Sentence
    label: str
    body: str
    action: str = ""


@dataclass
class _Out:
    lines: list[str] = field(default_factory=list)
    rows: list[dict] = field(default_factory=list)
    offer: dict | None = None
    #: The "so what" after the facts (B1, B4): how alone or how stale they
    #: are, said once, before the offer.
    closing: list[str] = field(default_factory=list)


def _day(d: date | None, today: date) -> str:
    if d is None:
        return "an undated day"
    month = composer._MONTHS[d.month - 1]
    return f"{d.day} {month}" if d.year == today.year else f"{d.day} {month} {d.year}"


def _span(views: list[composer.NoteView], today: date) -> str:
    days = sorted(v.written for v in views if v.written)
    if not days:
        return "undated"
    first, last = days[0], days[-1]
    if first == last:
        return f"on {_day(first, today)}"
    if (first.year, first.month) == (last.year, last.month):
        return f"{first.day} to {_day(last, today)}"
    return f"{_day(first, today)} to {_day(last, today)}"


def _capitalised_inside(views: list[composer.NoteView]) -> set[str]:
    """Words written with a capital away from a sentence's start: names, which
    keep their capital when a fact is lowered to follow a label."""
    names: set[str] = set()
    capital: dict[str, int] = {}
    lower: set[str] = set()
    for view in views:
        for s in view.sentences:
            for word in re.findall(r"(?<=[\w,] )([A-Z][\w'-]*)", s.text):
                names.add(word.lower())
            for word in re.findall(r"\b[A-Za-z][\w'-]*", s.text):
                if word[0].isupper():
                    capital[word.lower()] = capital.get(word.lower(), 0) + 1
                else:
                    lower.add(word)
    #: "Lisbon" opens both its notes and is never written small: a name.
    names |= {w for w, n in capital.items() if n >= 2 and w not in lower and not re.search(r"(ing|ed|ly)$", w)}
    return names


@lru_cache(maxsize=1)
def _dictionary() -> frozenset[str]:
    """The shipped English word list (the one spelling uses), read once; a
    word not in it ("Minecraft") is a name and keeps its capital."""
    root = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent)) if getattr(sys, "frozen", False) \
        else Path(__file__).resolve().parents[3]
    try:
        return frozenset((root / "frontend/vendor/wordlist/en.txt").read_text(encoding="utf-8").split())
    except OSError:
        return frozenset()


def _lower_first(text: str, names: set[str]) -> str:
    first = re.match(r"[A-Za-z][\w'-]*", text or "")
    if not first:
        return text
    word = first.group(0)
    if word == "I" or word.lower() in names or (len(word) > 1 and word[1:].isupper()):
        return text
    known = _dictionary()
    if known and word.lower() not in known:
        return text
    return text[0].lower() + text[1:]


def _second_person(text: str) -> str:
    """The writer's words said to them: "I'm doing" to "you're doing", and a
    diary line with no subject ("Went to the range") given its "you"."""
    text = realise.shift_person(text)
    if _PAST_START.match(text):
        text = "you " + text[0].lower() + text[1:]
    return text


#: The day the note being read was written and the day it is now, so a
#: relative time is said as the day it meant (B3).
_TODAY: ContextVar[date | None] = ContextVar("digest_today", default=None)
#: Every note the route read, for "none of them has a note of its own".
_VIEWS: ContextVar[list] = ContextVar("digest_views", default=[])
_PIN = re.compile(
    r"\b(?P<pre>(?:before|by|until|in|from) )?(?:the (?P<nth>\d{1,2})(?:st|nd|rd|th) of )?(?P<which>next|this|last) (?P<unit>week|month|weekend)\b",
    re.I,
)


def _pin(text: str, written: date) -> str:
    """"This week" written on 17 July is "the week of 17 July" now (CHAT_PLAN
    B3): true on the day it was written, and wrong said today with no day.
    "The 14th of next month" written in October is 14 November."""
    today = _TODAY.get() or written

    def said(m: re.Match) -> str:
        step = {"next": 1, "this": 0, "last": -1}[m.group("which").lower()]
        pre, unit = m.group("pre") or "", m.group("unit").lower()
        if unit == "month":
            index = written.month - 1 + step
            year, month = written.year + index // 12, index % 12 + 1
            name = composer._MONTHS[month - 1] + (f" {year}" if year != today.year else "")
            if m.group("nth"):
                return f"{pre}{int(m.group('nth'))} {name}"
            return f"{pre if pre.strip().lower() != 'in' else ''}in {name}"
        if unit == "weekend":
            saturday = written + timedelta(days=(5 - written.weekday()) % 7 + 7 * step)
            return f"{pre}the weekend of {_day(saturday, today)}"
        return f"{pre}the week of {_day(written + timedelta(days=7 * step), today)}"

    return _PIN.sub(said, text)


def _tidy(text: str, written: date | None = None) -> str:
    if written is not None:
        text = _pin(text, written)
    else:
        #: With no day to pin it to, "next week" is stale by now and goes;
        #: "the 14th of next month" is the date itself and stays.
        text = _RELATIVE.sub(lambda m: m.group(0) if re.search(r"\bof\s*$", text[:m.start()]) else "", text)
    text = re.sub(r"\s+([,.;])", r"\1", text)
    return text.strip().rstrip(".!").strip()


def _context_note(view: composer.NoteView) -> bool:
    tags = {str(t).lower().strip("#") for t in (view.note.get("tags") or [])}
    return bool(tags & CONTEXT_TAGS)


def _facts(view: composer.NoteView, names: set[str], subject: set[str] | None = None) -> list[Fact]:
    """A note as labelled facts. A note that names its own heading ("Study
    plan: ...") gives its facts that label, unless a fact says plainly what
    it is (a booking, a choice); otherwise each fact is labelled by what it
    says (a day of the week, a price, a verdict). A sentence that only
    names the topic ("Looking at a new gaming mouse") is the note's frame,
    not a fact, and the answer's opening already says it."""
    out: list[Fact] = []
    if _context_note(view):
        #: A joke or a quote is one piece (decision 67): its question and
        #: its punchline are never two facts.
        whole = " ".join(s.text.strip() for s in view.sentences)
        head = _PREFIX.match(whole)
        label = head.group(1).strip() if head else "Joke"
        body = head.group(2) if head else whole
        return [Fact(view, view.sentences[0], label, body.strip().rstrip("."), "")] if view.sentences else []
    note_label = ""
    shown = [s for s in view.sentences if s.kind == "picture"]
    read = [s for s in view.sentences if s.kind == "picture_text"]
    if shown or read:
        #: A picture is one fact, what it shows and the words in it, the
        #: words quoted as read (INBOX 787: never run into the caption).
        what = shown[0].text.strip().rstrip(".") if shown else ""
        words = realise.join_items([f"\u201c{r.text.strip()}\u201d" for r in read[:3]])
        body = (f"a picture of {_lower_first(what, set())}" if what else "a picture") + (f" reading {words}" if words else "")
        out.append(Fact(view, (shown or read)[0], "", body, ""))
    for i, s in enumerate(view.sentences):
        text = s.text.strip().rstrip(".!")
        if s.kind in ("picture", "picture_text"):
            continue
        label, body, own = "", text, False
        head = _PREFIX.match(text)
        if head and len(head.group(1).split()) <= 5:
            label, body, own = head.group(1).strip(), head.group(2), True
            if i == 0:
                note_label = label
        timed = _TIME_LABEL.match(body)
        if timed and not label:
            label, body, own = timed.group(1)[:1].upper() + timed.group(1)[1:], timed.group(2), True
        if subject and not own and len(body.split()) <= 7:
            content = {composer._stem(w) for w in composer._words(body)} - _FRAME_WORDS
            if content and all(any(composer._holds(st, {w}) for st in subject) for w in content):
                continue
        action = ""
        acted = _ACTION.search(body)
        if acted and acted.start(1) > 0:
            action = acted.group(1).strip()
            body = body[: acted.start()].rstrip(" ,;")
        elif acted and acted.start(1) == 0 and re.search(r"\b(on|by|before) (mon|tues|wednes|thurs|fri|satur|sun)day\b", body, re.I):
            action = body
        pieces = [(body, "")]
        still = _STILL_TO.search(body)
        if still and still.start() > 0 and re.search(r",\s*$", body[: still.start()]):
            #: "Hotel is booked, flights still to book": two facts, and the
            #: second is a to-do.
            pieces = [(body[: still.start()].rstrip(" ,"), ""), (f"{still.group(2).lower()} the {still.group(1).lower()}", "Still to do")]
        for piece, fixed in pieces:
            words = piece.split()
            if not own and len(words) <= 6 and _RELATIVE.search(piece):
                #: "Uni starts back next week.": true on the day it was
                #: written, and misleading said now with no day.
                continue
            strong = next((name for name, cue in _CUES[:_STRONG_CUES] if cue.search(piece)), "")
            cue = fixed or (label if own else "") or strong or note_label or next((name for name, cue in _CUES if cue.search(piece)), "")
            said = _tidy(_second_person(piece), view.written)
            if cue == "Your week":
                said = re.sub(r"\b(?:are|is) (on|every)\b", r"\1", said)
            if cue == "What you want":
                said = re.sub(r"^you (?:want|need) (?:it|one|them) ", "", said)
            if said:
                out.append(Fact(view, s, cue, said, _tidy(action, view.written) if piece is pieces[0][0] else ""))
    return out


def _subject(question: str) -> list[str]:
    return [st for st in (composer._stem(t) for t in composer.subject_terms(clean(question))) if st not in _ASKING]


def _members(question: str, views: list[composer.NoteView]) -> list[composer.NoteView]:
    """The notes the question is about: a category it names, else the notes
    that hold most of its words (in the text, the title or the tags)."""
    q = clean(question).lower()
    named = [v for v in views if str(v.note.get("category") or "").strip() and str(v.note.get("category")).lower() in q]
    if named:
        return named
    stems = _subject(question)
    if not stems:
        return []
    scored = []
    for v in views:
        pool = v.words | v.title_words | v.filed_words
        hits = sum(1 for st in stems if composer._holds(st, pool))
        if hits:
            scored.append((hits, v))
    if not scored:
        return []
    everywhere = set().union(*(v.words | v.title_words | v.filed_words for v in views))
    if any(st not in _VERBS and not composer._holds(st, everywhere) for st in stems):
        #: "the weather on Mars": a subject word no note holds is a question
        #: the notes cannot answer, and the composer says which word is missing.
        return []
    best = max(h for h, _ in scored)
    need = best if best >= 2 else 1
    return [v for h, v in scored if h >= need]


def _topic(question: str, members: list[composer.NoteView]) -> str:
    """What the notes are about, in the person's word: the tag they share,
    or the subject as typed."""
    q = clean(question)
    tags: dict[str, int] = {}
    for v in members:
        for t in {str(t).lower().strip("#") for t in (v.note.get("tags") or [])}:
            tags[t] = tags.get(t, 0) + 1
    shared = [t for t, n in sorted(tags.items(), key=lambda kv: -kv[1]) if n >= max(2, len(members) * 3 // 4) and t not in CONTEXT_TAGS]
    typed = re.search(r"\b(?:about|on|for|regarding|in)\s+(.+?)\s*\??$", q, re.I)
    category = next((str(v.note.get("category")) for v in members if str(v.note.get("category") or "").lower() in q.lower() and v.note.get("category")), "")
    if category and shared:
        return shared[0]
    if typed:
        return re.sub(r"^(?:my|the)\s+", "", typed.group(1))
    terms = composer.subject_terms(q)
    if shared and (not terms or shared[0] in " ".join(terms)):
        return shared[0]
    return " ".join(terms) or (shared[0] if shared else "this")


def _lines(out: _Out, facts: list[Fact], limit: int, skip: set[tuple] | None = None, by_day: date | None = None) -> int:
    """Facts grouped under their labels, oldest note first, one line a label;
    the line carries its first note for its one citation mark."""
    groups: dict[str, list[Fact]] = {}
    spans: dict[str, set[int]] = {}
    for f in facts:
        spans.setdefault(f.label, set()).add(f.view.id)
    for f in facts:
        if skip and f.sentence.key in skip:
            continue
        label = f.label
        if by_day and (not label or len(spans[label]) > 1) and f.view.written:
            #: Facts with no label of their own, or one label over several
            #: notes ("Gym: ..." twice), read best by their day.
            label = _day(f.view.written, by_day)
        groups.setdefault(label or "Also", []).append(f)
    shown = 0
    for label, held in list(groups.items())[:limit]:
        bodies = list(dict.fromkeys(_lower_first(f.body, _NAMES.get()) for f in held))
        line_body = "; ".join(bodies)
        out.lines.append(f"**{label}:** {line_body}.")
        out.rows.append(_row(line_body, held[0]))
        shown += 1
    return shown


def _row(said: str, fact: Fact) -> dict:
    return {
        "sentence": said,
        "note_id": fact.view.note.get("source_id", fact.view.id),
        "source": fact.sentence.text,
        "score": 1.0,
        "digest": True,
    }


def _missing(members: list[composer.NoteView]) -> str:
    text = " ".join(s.text for v in members for s in v.sentences)
    for _, topic, facets in FACETS:
        if len(topic.findall(text)) >= 2 or (len(members) == 1 and topic.search(text)):
            absent = [name for name, cue in facets if not cue.search(text)]
            if absent:
                return PHRASES["nothing_yet"].format(facets=" or ".join(absent[:2]))
            return ""
    return ""


def _offer(facts: list[Fact]) -> dict | None:
    """One thing to do next, from the notes' own to-dos: the one with a day
    first ("ask the tutor on Thursday"), then something still to book."""
    actions = [f.action for f in facts if f.action]
    actions.sort(key=lambda a: not re.search(r"\b(mon|tues|wednes|thurs|fri|satur|sun)day\b|\btomorrow\b", a, re.I))
    if not actions:
        for f in facts:
            still = _STILL_TO.search(f.sentence.text)
            if still:
                actions.append(f"{still.group(2).lower()} the {still.group(1).lower()}")
    if not actions:
        return None
    action = realise.shift_person(actions[0])
    action = action[0].lower() + action[1:]
    return {"kind": "reminder", "label": PHRASES["remind"].format(action=action), "text": action[0].upper() + action[1:]}


def _count(n: int, noun: str = "note") -> str:
    return realise.count_noun(n, noun)


def _overview(out: _Out, question: str, members, facts, today: date, kind: str) -> None:
    topic = _topic(question, members)
    moved = _progress(members, today) if _GOING.search(question) else ""
    if moved:
        out.lines.append(moved)
        quiet = _gone_quiet(members)
        if quiet:
            out.closing.append(quiet)
    elif kind == "likes":
        times = "once" if len(members) == 1 else ("twice" if len(members) == 2 else f"{realise.count_word(len(members))} times")
        out.lines.append(PHRASES["likes"].format(topic=topic, times=times, span=_span(members, today)))
    else:
        out.lines.append(PHRASES["overview"].format(count=_count(len(members)), topic=topic, span=_span(members, today)))
    shown_notes = {f.view.id for f in facts}
    _lines(out, facts, LINES[kind], by_day=today)
    hidden = len(members) - len({r["note_id"] for r in out.rows})
    if kind == "overview" and hidden > 0 and len(shown_notes) > LINES[kind]:
        out.lines.append(PHRASES["more_right"].format(count=_count(hidden).capitalize()))


_GOING = re.compile(r"\bhow(?:'s| is| are) .+ going\b|\bprogress\b|\bhow am i (?:going|doing)\b", re.I)
_MEASURE = re.compile(r"\b([a-z]+)(?: up to| down to| at)? (\d+(?:\.\d+)?) ?(kg|kgs|km|kms|min|mins|minutes|reps|lbs|k|%)\b", re.I)


def _progress(members: list[composer.NoteView], today: date) -> str:
    """"Going up: your squats went from 80 kg to 90 kg": a measure the first
    and the last note both give, said as the change."""
    dated = [v for v in members if v.written]
    if len(dated) < 2:
        return ""
    first, last = dated[0], dated[-1]

    def measures(view: composer.NoteView) -> dict[str, tuple[float, str, str]]:
        found = {}
        for s in view.sentences:
            for m in _MEASURE.finditer(s.text):
                found.setdefault(m.group(1).lower(), (float(m.group(2)), m.group(2), m.group(3)))
        return found

    a, b = measures(first), measures(last)
    for word, (va, ta, unit) in a.items():
        if word in b and b[word][0] != va:
            vb, tb, _ = b[word]
            way = "Going up" if vb > va else "Going down"
            return (f"{way}: your {word} went from {ta} {unit} to {tb} {unit}, "
                    f"{_day(first.written, today)} to {_day(last.written, today)}.")
    return ""


def _gone_quiet(members: list[composer.NoteView]) -> str:
    """"Nothing on bench since September": a measure an earlier note gives
    that the latest one does not (B4, how fresh)."""
    dated = [v for v in members if v.written]
    if len(dated) < 2:
        return ""
    said_last = {m.group(1).lower() for s in dated[-1].sentences for m in _MEASURE.finditer(s.text)}
    for v in reversed(dated[:-1]):
        for s in v.sentences:
            for m in _MEASURE.finditer(s.text):
                word = m.group(1).lower()
                if word not in said_last:
                    return PHRASES["gone_quiet"].format(word=word, month=composer._MONTHS[v.written.month - 1])
    return ""


def _best(facts: list[Fact], question: str, cue: re.Pattern | None = None) -> Fact | None:
    stems = {composer._stem(t) for t in composer.subject_terms(clean(question))}

    def rank(f: Fact) -> tuple:
        words = set(f.sentence.words)
        hits = sum(1 for st in stems if composer._holds(st, words | f.view.filed_words | f.view.title_words))
        return (bool(cue and cue.search(f.sentence.text)), hits, -f.sentence.order)

    return max(facts, key=rank) if facts else None


def _say_fact(out: _Out, lead: Fact, today: date, question: str) -> None:
    body = lead.body if not lead.label else f"{lead.body}"
    items = [i.strip() for i in re.split(r",\s*", body) if i.strip()]
    if lead.label and len(items) >= 3 and all(len(i.split()) <= 4 for i in items):
        #: "Hobbies I want to try: bouldering, film photography, ukulele":
        #: asked what the hobbies are, the answer is the count and the list.
        out.lines.append(f"{realise.count_word(len(items)).capitalize()}, from your note of {_day(lead.view.written, today)}: {realise.join_items(items)}.")
        others = [v for v in _VIEWS.get() if v.id != lead.view.id]
        if not any(composer._holds(composer._stem(w), v.words) for v in others for i in items for w in composer.subject_terms(i)[-1:]):
            out.closing.append(PHRASES["none_own"])
    elif lead.label:
        out.lines.append(f"From your {lead.label[0].lower() + lead.label[1:]} note, {_day(lead.view.written, today)}: {body}.")
    else:
        out.lines.append(PHRASES["from_note"].format(fact=body[0].upper() + body[1:], day=_day(lead.view.written, today)))
    out.rows.append(_row(body, lead))


def _single(out: _Out, kind: str, question: str, members, facts, today: date) -> None:
    cue = {
        "when": re.compile(r"\b(mon|tues|wednes|thurs|fri|satur|sun)days\b|\bin (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*", re.I),
        "count": re.compile(r"\$\s?\d|\d"),
        "opinion": _RATING,
    }.get(kind)
    lead = _best(facts, question, cue)
    if lead is None:
        return
    rest = [f for f in facts if f is not lead]
    if kind == "when":
        days = _DAYS_PLURAL.search(lead.body)
        if days and len(days.group(0).strip()) > 3:
            said = days.group(0).strip(" ,")
            out.lines.append(PHRASES["from_note"].format(fact=said[0].upper() + said[1:], day=_day(lead.view.written, today)))
            out.rows.append(_row(said, lead))
            rest = [f for f in rest if re.search(r"\b(mon|tues|wednes|thurs|fri|satur|sun)days\b|\bafternoons\b|\bmornings\b|\bevenings\b", f.sentence.text, re.I)]
            if rest:
                rest = [Fact(f.view, f.sentence, "Also on your week", f.body, f.action) for f in rest]
        else:
            _say_fact(out, lead, today, question)
            rest = [f for f in rest if f.view.id == lead.view.id]
    elif kind == "opinion":
        work = next((_WORK.match(f.sentence.text.strip()) for f in facts if _WORK.match(f.sentence.text.strip())), None)
        rating = next((_RATING.search(f.sentence.text) for f in facts if _RATING.search(f.sentence.text)), None)
        if work and rating:
            out.lines.append(f"You gave {work.group(1)} {rating.group(1)} out of {rating.group(2)} on {_day(lead.view.written, today)}.")
            out.rows.append(_row(f"{work.group(1)} {rating.group(1)} out of {rating.group(2)}", lead))
            rest = []
            for f in facts:
                for part in re.split(r"\s+but\s+|;\s*", f.sentence.text.strip().rstrip(".")):
                    if _RATING.search(part) or _WORK.match(part):
                        continue
                    label = "Loved" if _GOOD.search(part) else "Didn't" if _BAD.search(part) else ""
                    if label:
                        rest.append(Fact(f.view, f.sentence, label, _lower_first(_second_person(part), set()), ""))
        else:
            _say_fact(out, lead, today, question)
    elif kind == "count":
        clauses = re.split(r"\s+and\s+(?=\$?\d)", lead.sentence.text.strip().rstrip("."))
        stems = {composer._stem(t) for t in composer.subject_terms(clean(question))}
        main = next((c for c in clauses if any(composer._holds(st, set(composer._words(c))) for st in stems)), clauses[0])
        said = _second_person(main)
        said = re.sub(r"\bthis week\b", f"in the week of {_day(lead.view.written, today)}", said)
        said = _tidy(said, lead.view.written)
        out.lines.append(said[0].upper() + said[1:] + ".")
        out.rows.append(_row(said, lead))
        if "week of" in said and len(members) == 1:
            out.closing.append(PHRASES["only_week"])
        extra = [c for c in clauses if c is not main]
        rest = [Fact(lead.view, lead.sentence, "Also that week", _tidy(_second_person(c), lead.view.written).lstrip("you spent ").strip(), "") for c in extra]
        rest += [f for f in facts if f is not lead and f.view.id == lead.view.id]
    else:
        _say_fact(out, lead, today, question)
        rest = [f for f in rest if f.view.id == lead.view.id]
    _lines(out, rest, LINES.get(kind, 2))
    if len(members) == 1 and kind in ("fact", "opinion"):
        noun = "film review" if kind == "opinion" else "note"
        out.lines.append(f"It's your only {noun} on that so far." if noun == "note" else f"It's your only {noun} so far.")


def _who(out: _Out, name: str, views, names: set[str], today: date) -> bool:
    found = [(v, s) for v in views for s in v.sentences if re.search(rf"\b{re.escape(name)}\b", s.text, re.I)]
    if not found:
        return False
    notes = {v.id for v, _ in found}
    view, s = found[0]
    fact = _tidy(_second_person(s.text.strip()), view.written)
    if len(notes) == 1:
        out.lines.append(PHRASES["who_once"].format(name=name[:1].upper() + name[1:], day=_day(view.written, today), fact=fact))
        out.closing.append(PHRASES["only_names"].format(name=name[:1].upper() + name[1:]))
    else:
        out.lines.append(PHRASES["who_many"].format(name=name[:1].upper() + name[1:], count=_count(len(notes)), span=_span([v for v, _ in found], today)))
        for v, s2 in found[:LINES["overview"]]:
            body = _tidy(_second_person(s2.text.strip()), v.written)
            out.lines.append(f"**{_day(v.written, today)}:** {body}.")
    out.rows.append({"sentence": fact, "note_id": view.note.get("source_id", view.id), "source": s.text, "score": 1.0, "digest": True})
    return True


def _compare(out: _Out, a: str, b: str, views, today: date, names: set[str]) -> bool:
    sentences = [(v, s) for v in views for s in v.sentences]

    def aliases(side: str) -> set[str]:
        said = {side.lower()}
        for _, s in sentences:
            m = re.search(rf"(?i:\b{re.escape(side)})((?:\s+[A-Z0-9][\w-]*){{1,4}})", s.text)
            if m:
                said |= {w.lower() for w in m.group(1).split() if len(w) > 2}
        return said

    sides = {a: aliases(a), b: aliases(b)}

    def about(side: str, text: str) -> bool:
        return any(re.search(rf"\b{re.escape(w)}\b", text, re.I) for w in sides[side])

    full = {}
    for side in (a, b):
        for _, s in sentences:
            m = re.search(rf"\b((?i:the\s+)?(?i:{re.escape(side)})(?:\s+[A-Z0-9][\w-]*){{0,4}})", s.text)
            if m:
                full[side] = re.sub(r"^the\s+", "", m.group(1), flags=re.I)
                break
    if len(full) < 2:
        return False
    lean = re.compile(r"\b(leaning towards|prefer|decided on|going with|chose|picked)\s+(?:the\s+)?(\w+)", re.I)
    winner, why_view, why = "", None, ""
    for v, s in sentences:
        m = lean.search(s.text)
        if m:
            for side in (a, b):
                if m.group(2).lower() in sides[side]:
                    winner, why_view = side, v
                    against = [x.text for x in v.sentences if x is not s and (about(a, x.text) or about(b, x.text))]
                    why = "you're leaning towards it"
                    if against:
                        reason = _tidy(_second_person(re.sub(r"^[^:]{2,30}:\s+", "", against[0])), v.written)
                        why += f" after {_lower_first(reason, names)}"
    if not winner:
        return False
    out.lines.append(PHRASES["pick"].format(side=winner[:1].upper() + winner[1:], why=why))
    out.offer = _note_offer(PHRASES["pick_note"].format(side=winner[:1].upper() + winner[1:]), f"My pick: the {full[winner]}")
    out.rows.append({"sentence": why, "note_id": why_view.note.get("source_id", why_view.id), "source": why, "score": 1.0, "digest": True})
    for side in (a, b):
        bits = []
        for v, s in sentences:
            for clause in re.split(r"\s+and\s+(?=the\s)|;\s*", s.text.strip().rstrip(".")):
                price = re.search(r"\$\s?\d[\d,.]*", clause)
                if price and about(side, clause) and not any(about(o, clause) for o in (a, b) if o != side):
                    bits.append(("about " if "about" in clause else "") + price.group(0))
        if bits:
            out.lines.append(f"**{full[side]}:** {bits[0]}.")
    return True


def answer(question: str, notes: list[dict], *, today: date | None = None) -> dict | None:
    """The decision-70 answer to `question` from the route's `notes`, or None
    when the question is not one this shape answers (a sum, a time, a
    command, nothing found): the caller then asks `composer.compose`."""
    today = today or date.today()
    asked = clean(question)
    if not asked:
        return None
    kind = kind_of(asked)
    views = [v for v in (composer.read_note(n, i) for i, n in enumerate(composer._distinct_ids(notes or []))) if v]
    if not views:
        return None
    names = _capitalised_inside(views)
    _NAMES.set(names)
    _TODAY.set(today)
    _VIEWS.set(views)
    wants_context = bool(set(composer._words(asked)) & {composer._stem(t) for t in CONTEXT_TAGS})
    if not wants_context:
        views = [v for v in views if not _context_note(v)]
    out = _Out()
    if kind == "who":
        name = _ASKS["who"].search(asked).group("name").strip()
        if not _who(out, name, views, names, today):
            return None
        return _result(out, kind, asked)
    if kind == "compare":
        m = _ASKS["compare"].search(asked)
        if not _compare(out, m.group("a").strip(), m.group("b").strip(), views, today, names):
            return None
        facts = [f for v in views for f in _facts(v, names)]
        want = next((f for f in facts if f.label == "What you want"), None)
        if want:
            out.lines.append(f"You want it {want.body}; nothing says which one meets that.")
        return _result(out, kind, asked)
    if wants_context:
        members = [v for v in views if _context_note(v) or any(composer._holds(st, v.words) for st in composer._words(asked))]
    else:
        members = _members(asked, views)
    if not members:
        return None
    members.sort(key=lambda v: (v.written or date.min, v.rank))
    subject = set(_subject(asked))
    facts = [f for v in members for f in _facts(v, names, subject)]
    if not facts:
        return None
    if kind == "left":
        if not _left(out, asked, members, views, names, today):
            return None
        return _result(out, kind, asked)
    if kind in ("overview", "likes") and len(members) >= 2:
        _overview(out, asked, members, facts, today, kind)
    elif kind in ("overview", "likes"):
        _single(out, "fact", asked, members, facts, today)
    else:
        _single(out, kind, asked, members, facts, today)
    if not out.lines:
        return None
    if kind in ("overview", "likes") and len(members) >= 2:
        missing = _missing(members)
        if missing:
            out.lines.append(missing)
    out.offer = out.offer or _offer(facts) or _kind_offer(kind, asked, members, facts, today, out)
    return _result(out, kind, asked)


_PLACE = re.compile(r"\b(?:the )?(driving range|range|gym|pool|court|course|track|studio|climbing wall|park)\b", re.I)
_REVIEWED = re.compile(r"\b(film|movie|book|show|series|album|game)s?\b", re.I)


def _note_offer(label: str, text: str) -> dict:
    return {"kind": "note", "label": label, "text": text}


def _kind_offer(kind: str, question: str, members, facts: list[Fact], today: date, out: _Out) -> dict | None:
    """The one acting offer when the notes name no to-do of their own (B12):
    what the kind of question suggests doing with the answer, each one a
    thing the app does in one press (a reminder or a note)."""
    text = " ".join(s.text for v in members for s in v.sentences)
    if kind == "likes":
        places = sorted({m.group(1).lower() for m in _PLACE.finditer(text)}, key=len, reverse=True)
        if places:
            where = "the " + places[0]
            return {"kind": "reminder", "label": PHRASES["go_again"].format(place=where), "text": f"Go to {where}"}
    if kind == "opinion":
        noun = _REVIEWED.search(question + " " + " ".join(str(t) for v in members for t in (v.note.get("tags") or [])) + " " + text)
        noun_word = {"movie": "film"}.get(noun.group(1).lower(), noun.group(1).lower()) if noun else "film"
        return _note_offer(PHRASES["start_list"].format(noun=noun_word), f"{noun_word.capitalize()}s to watch next\n\n- [ ] ")
    if kind == "count" and re.search(r"\$\s?\d", text) and re.search(r"\b(spen[dt]|budget|cost)", question + " " + text, re.I):
        return {"kind": "reminder", "label": PHRASES["log_weekly"], "text": "Log your spending every Sunday"}
    if kind == "fact":
        listed = re.search(r"^\w+, from your note of [^:]+: (.+)\.$", out.lines[0]) if out.lines else None
        if listed:
            first = re.split(r",\s*| and ", listed.group(1))[0].strip()
            return {"kind": "reminder", "label": PHRASES["try_one"].format(item=first), "text": f"Try {first}"}
    if kind == "overview" and members and all(_context_note(v) for v in members) and len(members) >= 2:
        pieces = [f.body for f in facts]
        topic = _topic(question, members)
        return _note_offer(PHRASES["gather"], f"{topic[:1].upper() + topic[1:]}\n\n" + "\n\n".join(pieces))
    if kind == "overview" and _GOING.search(question):
        table = _lift_table(members, today)
        if table:
            return _note_offer(PHRASES["track_table"].format(what=table[0]), table[1])
    landed = next((f for f in facts if f.label == "Where you landed"), None)
    if landed:
        side = re.search(r"towards (?:the )?(.+)$", landed.body)
        if side:
            return _note_offer(PHRASES["pick_note"].format(side=side.group(1).strip()), f"My pick: the {side.group(1).strip()}")
    return None


def _lift_table(members, today: date) -> tuple[str, str] | None:
    """Each dated note's measures as one table row ("Track your lifts in a
    table?"): the columns are the measures any note gives."""
    rows, columns = [], []
    for v in members:
        found = {}
        for s in v.sentences:
            for m in _MEASURE.finditer(s.text):
                found.setdefault(m.group(1).lower(), f"{m.group(2)} {m.group(3)}")
        if found and v.written:
            rows.append((v.written, found))
            columns += [c for c in found if c not in columns]
    if len(rows) < 2:
        return None
    what = "lifts" if any(r[1].endswith("kg") for _, f in rows for r in [tuple(f.items())[0]]) else "numbers"
    head = "| Day | " + " | ".join(c.capitalize() for c in columns) + " |"
    rule = "| --- |" + " --- |" * len(columns)
    body = ["| " + _day(d, today) + " | " + " | ".join(f.get(c, "") for c in columns) + " |" for d, f in rows]
    return what, "\n".join([what.capitalize(), "", head, rule, *body])


def _left(out: _Out, question: str, members, views, names: set[str], today: date) -> bool:
    """"What do I need to buy": the open list first, then the other things
    still to do the notes name."""
    buying = re.search(r"\b(buy|shop|get)\b", question, re.I)
    lists = []
    for v in views:
        for s in v.sentences:
            head = _PREFIX.match(s.text.strip())
            if head and len(head.group(2).split(",")) >= 3:
                shop = re.search(r"\b(grocer|shopping|buy|list)", head.group(1) + " " + " ".join(v.note.get("tags") or []) + " " + str(v.note.get("category") or ""), re.I)
                if shop or not buying:
                    lists.append((v, s, head))
    if not lists:
        return False
    v, s, head = lists[-1]
    items = [i.strip().rstrip(".") for i in head.group(2).split(",") if i.strip()]
    what = head.group(1).strip().lower()
    out.lines.append(f"{realise.count_word(len(items)).capitalize()} {what}, from your list of {_day(v.written, today)}: {realise.join_items(items)}.")
    out.rows.append({"sentence": realise.join_items(items), "note_id": v.note.get("source_id", v.id), "source": s.text, "score": 1.0, "digest": True})
    open_bits = []
    for w in views:
        for t in w.sentences:
            still = _STILL_TO.search(t.text)
            if still and w is not v:
                topic = next((str(x) for x in (w.note.get("tags") or []) if str(x).lower() not in still.group(1).lower()), "")
                open_bits.append(f"the {topic[:1].upper() + topic[1:] + ' ' if topic else ''}{still.group(1).lower()}")
    if open_bits:
        out.lines.append(f"**Also still open:** {realise.join_items(open_bits[:2])}.")
    out.offer = {"kind": "checklist", "label": PHRASES["checklist"], "text": head.group(1).strip(), "items": items}
    return True


def _result(out: _Out, kind: str, question: str) -> dict:
    #: One paragraph a line: a single newline inside a paragraph is a space
    #: to every markdown reader, so the labelled lines ran together.
    paragraphs = list(out.lines) + out.closing[:1]
    if out.offer:
        paragraphs.append(out.offer["label"])
    text = "\n\n".join(paragraphs)
    n = len(out.rows)
    return {
        "text": text,
        "grounding": out.rows,
        #: `digest` and `offer` ride on the support too: it is what the Ask
        #: box hands its grounding renderer, which then draws one mark a line
        #: and no chips or count under the answer.
        "support": {"supported": n, "sentences": n, "unsupported": [], "digest": True, "offer": out.offer},
        "shape": f"digest:{kind}",
        "parts": [("template", text)],
        "next": [],
        "next_parts": [],
        "insights": [],
        "broad": kind == "overview",
        "digest": True,
        "offer": out.offer,
    }


#: "search the web for X", "look up X": the words that ask, not the subject.
_WEB_ASK = re.compile(r"^(?:(?:can|could|will) you |please )?(?:search (?:the )?(?:web|internet|online) (?:for|about)|look up|google|find (?:on|from) the web|web search(?: for)?)\s+", re.I)


def web(question: str, pages: list[dict], composed: dict | None = None) -> dict | None:
    """An answer from web pages in decision 70's shape (decision 66): what
    was searched and how many pages were read, then one line a page, its
    title as the label and its own sentence that best meets the question,
    cited by the page's address. Never empty when a page has text (INBOX
    810: "searched the web ... and then didnt even output the results")."""
    asked = clean(_WEB_ASK.sub("", clean(question)))
    terms = set(composer._words(asked))
    picked: dict[int, dict] = {}
    for row in (composed or {}).get("grounding") or []:
        picked.setdefault(row.get("note_id"), row)
    out = _Out()
    def meets(page: dict) -> int:
        return len(terms & set(composer._words(str(page.get("content") or ""))))

    order = sorted(pages, key=lambda p: (p["id"] not in picked, -meets(p), pages.index(p)))
    for page in order[:3]:
        view = composer.read_note({**page, "tags": []}, 0)
        if view is None:
            continue
        row = picked.get(page["id"])
        span = str(row["sentence"]) if row else ""
        if not span:
            ranked = sorted(
                (s for s in view.sentences if len(s.text.split()) >= 5 and len(s.text) <= 260),
                key=lambda s: -len(terms & set(s.words)),
            )
            span = ranked[0].text.strip() if ranked else ""
        if not span:
            continue
        title = " ".join((view.title or page.get("domain") or "A page").split()[:8])
        out.lines.append(f"**{title}:** {span}")
        out.rows.append({
            "sentence": span, "note_id": page["id"], "kind": "web", "url": page["url"], "title": title,
            "score": 1.0, "digest": True, "said": "quoted",
        })
    if not out.lines:
        return None
    n = len(out.lines)
    out.lines.insert(0, f"I searched the web for “{asked}” and read {realise.count_word(n)} {'page' if n == 1 else 'pages'}; each is under the answer to read here.")
    return _result(out, "web", question)
