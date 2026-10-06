"""A composed answer with no model in it: the notes' own sentences, shaped.

Asked for directly (INBOX 688, the owner): *"is there a way to do very good
imitations of ai responses but using string concatenation with the app when
the ai isnt available ... it needs to be VERY refined and well worded and
designed ... nice and understandable to read, well structured"*.

**The rule, which is the notebook's integrity and is not traded for fluency.**
Every factual clause of a composed answer is one of two things:

- the person's own words: a sentence or a list item from a note, quoted whole
  or lightly trimmed (a leading "So," or "Also," taken off, the first letter
  raised, a very long sentence cut at a word with an ellipsis), and cited; or
- a value the app measured: how many notes, the day each was written, whether
  a checklist item is ticked, which of the question's words no note found
  contains.

Only the connective tissue between them is written here, and it comes from
`PHRASES`, a closed list that says nothing about the world: "Your note ...
says:", "Across three more notes, from 3 March to 12 May:", "None of these
notes mention ...". No sentence is paraphrased, no half-sentence is joined to
another, and nothing is concluded: a yes/no question gets the closest sentence,
never a yes or a no. `compose` returns the answer as `parts` as well as text,
each tagged with what it is, so the tests hold every clause of every answer to
the notes it came from (`tests/test_composer_688.py`).

**Why this beside `extractive.py` rather than inside it.** The extractive
answer (INBOX 269) quotes the best forty-word window of each note. A window is
not a sentence: it starts and ends mid-thought, swallows the note's heading and
flattens a checklist into one line of dashes (measured on the showcase
notebook, docs/roadmap/agent-remaining/composer688-1006.md). This works in
sentences and list items, reads what kind of question was asked, and lays the
answer out the way a careful reader would: the strongest sentence first, set
apart as a quote and attributed; the rest grouped by note under a measured
line; a timeline for a "when", the newest first for a "latest", two sides for
a "compare"; two notes that may disagree named; and the question's words that
no note found contains, said in one line.

Pure and deterministic: the same question over the same notes gives the same
answer. The opening is chosen by a hash of the question, so two different
questions in a row do not open with the same words.
"""

from __future__ import annotations

import hashlib
import math
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import date

from memorymap.ai import grounding
from memorymap.search import query as query_understanding

#: At most this many quoted points in one answer. Six is about what reads as an
#: answer: past that it is a list of search results, and the Sources panel
#: under the answer already is one.
MAX_POINTS = 6

#: At most this many sentences from one note, so one long note cannot fill the
#: answer and push out a second note that says something different.
MAX_PER_NOTE = 3

#: A sentence scoring under this share of the best one is not in the same
#: league (the reasoning of `extractive.RELATIVE_FLOOR`: BM25 magnitudes move
#: with the pool, so only a ratio survives a different notebook).
RELATIVE_FLOOR = 0.3

#: What a question word found in a note's heading is worth, per word, and once
#: more when the heading holds every one of them: "Harbor launch plan" is the
#: note about the Harbor launch plan, whatever its sentences repeat.
TITLE_WEIGHT = 1.0

#: A note holding no more than this share of the question's words is about
#: something else that shares a word with it ("active" in a note about
#: reading, asked "how many beta testers are active"; the onboarding rewrite,
#: asked about the sync rewrite). Measured per note, over its words and its
#: heading, and only when the question has two words or more.
NOTE_COVERAGE = 0.5

#: A question word among a note's tags or its category, per word: half a
#: heading's worth, since a tag says what a note is about less precisely.
FILED_WEIGHT = 0.5

#: Two sentences sharing this share of their words say the same thing; the
#: second is dropped. Token Jaccard, because it needs no model.
NEAR_DUPLICATE = 0.6

#: A quote longer than this is cut at a word with an ellipsis, which says it
#: was cut. Long enough for almost every sentence a person writes in a note.
MAX_QUOTE_CHARS = 280

#: A note with no heading is named by its first words, as the Sources panel
#: names it: the person's words, and enough of them to recognise the note.
UNTITLED_WORDS = 6

#: The fixed connective phrases: the only words this module writes. Named so
#: the composition reads as a sequence of decisions, and closed so the
#: traceability test can hold every template part of every answer to it.
PHRASES: dict[str, str] = {
    "para": "\n\n",
    "line": "\n",
    "bullet": "- ",
    "task_done": "- [x] ",
    "task_open": "- [ ] ",
    "quote": "> ",
    "bold": "**",
    "space": " ",
    "colon": ": ",
    "stop": ".",
    "open_quote": "“",
    "close_quote": "”",
    "open_paren": " (",
    "close_paren": ")",
    "says_a": "Your note ",
    "says_a_end": " says:",
    "says_b": "From your note ",
    "says_b_end": ":",
    "says_c": "The closest match is your note ",
    "says_c_end": ", which says:",
    "closest_a": "The closest your notes come is ",
    "closest_b": "Nothing here says it outright. The nearest is ",
    "closest_end": ":",
    "figure_a": "The figure is in your note ",
    "figure_b": "Your note ",
    "figure_b_end": " has the number:",
    "date_a": "The date is in your note ",
    "date_b": "Your note ",
    "date_b_end": " gives the date:",
    "written_on": ", written ",
    "latest_a": "The most recent, written ",
    "latest_b": "The newest note on this, from ",
    "latest_undated": "The most recent is ",
    "latest_in": ", is ",
    "latest_end": ":",
    "list_lead": "From your note ",
    "list_lead_end": ":",
    "across": "Across ",
    "more_notes": " more notes",
    "one_more": "One more note",
    "from_span": ", from ",
    "to_span": " to ",
    "on_day": ", from ",
    "end_colon": ":",
    "earlier": "Earlier",
    "timeline": "In the order you wrote them",
    "in_note": ", in ",
    "each_side": "What your notes say about each, side by side.",
    "side_notes": " notes",
    "side_note": " note",
    "both": "Both together",
    "side_none": "Nothing found is about this one on its own.",
    "disagree": "These two may disagree, the newer first",
    "missing": "None of these notes mention ",
    "or": " or ",
    "newest_lead": "Your newest notes",
    "nothing": (
        "None of the notes found share enough with your question to quote. "
        "The matching notes are listed beside this answer."
    ),
}

#: Number words for counts a reader takes in at a glance. Measured values,
#: spelled the way a sentence spells them; past twelve the digits read better.
_NUMBER_WORDS = ("no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve")

_MONTHS = "January February March April May June July August September October November December".split()
_MONTH_INDEX = {name.lower(): i + 1 for i, name in enumerate(_MONTHS)}
_WEEKDAYS = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"}

# --- the question -------------------------------------------------------------

#: The shapes a question comes in, read from its wording alone, first match
#: wins. Ordered: "how many" is a count before it is a "how", "what is the
#: latest" is a status before it is a "what", and a comparison can open with
#: any word at all.
_SHAPE_RULES: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("compare", re.compile(r"\b(compare|versus|vs\.?|differences? between)\b", re.I)),
    ("count", re.compile(r"^\s*how (many|much|often|long)\b|\bnumber of\b", re.I)),
    ("when", re.compile(r"^\s*(when|what (date|day|time|month|year)|which (date|day|month))\b", re.I)),
    ("who", re.compile(r"^\s*(who|whom|whose)\b", re.I)),
    (
        "status",
        re.compile(
            r"\b(latest|status|progress|update on|updates on|newest|most recent|so far|"
            r"where (am i|are we|is it|are things) (with|on))\b",
            re.I,
        ),
    ),
    ("explain", re.compile(r"^\s*(why|explain|how (do|does|did|can|could|should|to|is|are|was|were|would))\b", re.I)),
    ("list", re.compile(r"^\s*(list|which|name)\b|^\s*what are (the|my|all)\b", re.I)),
    ("yesno", re.compile(r"^\s*(is|are|do|does|did|can|could|was|were|has|have|had|should|will|would|am)\b", re.I)),
)

SHAPES = ("what", *(name for name, _ in _SHAPE_RULES), "recent")

#: Words that ask rather than name: dropped from the subject, so "what is the
#: latest on the sync rewrite" is scored on "sync rewrite" alone. The verbs a
#: question wraps its subject in ("feel", "say") are here too, so the closing
#: line never reports "feel" as a word no note mentions.
_ASKING_WORDS = frozenset(
    """about all any anything compare comparison difference differences
    between versus vs latest status progress update updates newest recent
    recently most current currently tell say says said know think thought
    feel felt get got go went make made want need like much many number
    often long ever still actually really there here things thing note notes
    wrote written write mention mentioned explain should
    could would way am i me my mine whose whom anyone someone near after
    before during without within over under around across through since
    until also again just only some other one any every each""".split()
)


def classify(question: str) -> str:
    """The question's shape: one of `SHAPES`, "what" when nothing else fits."""
    text = (question or "").strip()
    for name, pattern in _SHAPE_RULES:
        if pattern.search(text):
            return name
    return "what"


def _stem(word: str) -> str:
    """A light stem, so "testers" meets "tester" and "booked" meets "book".

    Suffixes only, and only on words long enough that taking one off leaves a
    word: a stemmer that turned "news" into "new" would match the wrong notes.
    """
    w = word.lower()
    for suffix, keep in (("ies", "y"), ("ing", ""), ("ed", ""), ("es", ""), ("s", "")):
        if w.endswith(suffix) and len(w) - len(suffix) >= 4:
            if suffix == "s" and w.endswith("ss"):
                return w
            return w[: len(w) - len(suffix)] + keep
    return w


def _words(text: str) -> list[str]:
    return [_stem(w) for w in query_understanding.search_terms(text)]


def subject_terms(question: str) -> list[str]:
    """The words the question is about, as typed, without the asking words."""
    understood = query_understanding.understand(question)
    source = understood.subject or question
    #: "List my ..." and "Name the ..." ask; "the reading list" names. Only the
    #: first word is dropped, so the list a question is about stays in it.
    source = re.sub(r"^\s*(list|name|show|tell)\b", "", source, flags=re.I)
    seen: list[str] = []
    for word in query_understanding.search_terms(source):
        if word in _ASKING_WORDS or word in seen:
            continue
        seen.append(word)
    return seen


_COMPARE_SIDES = (
    re.compile(r"\bdifferences? between (?P<a>.+?) and (?P<b>.+?)[?.!]*$", re.I),
    re.compile(r"\bcompare (?P<a>.+?) (?:and|with|to|vs\.?|versus) (?P<b>.+?)[?.!]*$", re.I),
    re.compile(r"^(?P<a>[\w' -]+?) (?:vs\.?|versus) (?P<b>.+?)[?.!]*$", re.I),
)


def compare_sides(question: str) -> tuple[str, str] | None:
    """The two things a comparison names, as typed: ("Lisbon", "Porto")."""
    for pattern in _COMPARE_SIDES:
        match = pattern.search((question or "").strip())
        if match:
            a, b = match.group("a").strip(" ,"), match.group("b").strip(" ,")
            if subject_terms(a) and subject_terms(b):
                return a, b
    return None


# --- the notes, as sentences ---------------------------------------------------


@dataclass
class Sentence:
    """One quotable unit of a note: a sentence of prose or one list item."""

    note_id: int
    rank: int
    start: int
    end: int
    text: str
    words: list[str]
    #: "prose", "item", or "task" (a checklist item; `done` says which).
    kind: str = "prose"
    done: bool | None = None
    order: int = 0
    score: float = 0.0


@dataclass
class NoteView:
    """A retrieved note, read once: its name, the day it was written, its units."""

    note: dict
    rank: int
    title: str
    written: date | None
    sentences: list[Sentence] = field(default_factory=list)
    words: set[str] = field(default_factory=set)
    title_words: set[str] = field(default_factory=set)
    #: Its tags and category: never quoted, but what the person filed it
    #: under says what it is about ("Reading list", tagged #books, is about
    #: books without saying the word).
    filed_words: set[str] = field(default_factory=set)

    @property
    def id(self) -> int:
        return self.note["id"]


_HEADING = re.compile(r"^\s{0,3}#{1,6}\s+(.*)$")
_ITEM = re.compile(r"^(\s*(?:[-*+]|\d{1,3}[.)])\s+)(\[[ xX]\]\s+)?")
#: Where one sentence ends and the next begins: a stop (and the quote mark or
#: bracket closing it), a space, and a capital or a digit. Misses some
#: abbreviations; never merges two sentences, the safer direction here.
_SPLIT = re.compile(r"([.!?][\"”’)]?)\s+(?=[\"“‘(]?[A-Z0-9])")
#: A discourse word a person opens a sentence with that carries no claim. Taken
#: off only with its comma, so "But the API ..." keeps its contrast.
_DISCOURSE = re.compile(
    r"^(?:so|also|anyway|anyhow|plus|oh|well|ok|okay|right|basically|honestly|and|but|then|now)\s*,\s+(?=\S)",
    re.I,
)
_WRITTEN = re.compile(r"(\d{1,2}) (" + "|".join(_MONTHS) + r") (\d{4})")
_MARKS = re.compile(r"[*_`]")


def _written(note: dict) -> date | None:
    """The day the note was written, from the route's `written` words
    ("Wednesday 23 September 2026, 09:40") or an ISO `created_at`."""
    raw = str(note.get("created_at") or "")
    if re.match(r"\d{4}-\d{2}-\d{2}", raw):
        try:
            return date.fromisoformat(raw[:10])
        except ValueError:
            pass
    match = _WRITTEN.search(str(note.get("written") or ""))
    if not match:
        return None
    try:
        return date(int(match.group(3)), _MONTH_INDEX[match.group(2).lower()], int(match.group(1)))
    except ValueError:
        return None


def _title(content: str) -> tuple[str, int]:
    """The note's name and where its body starts: its first heading, or, with
    none, its first few words (the body then starts at the top, so those words
    are quotable too)."""
    end = content.find("\n")
    first = content if end == -1 else content[:end]
    heading = _HEADING.match(first)
    if heading:
        name = _MARKS.sub("", heading.group(1)).strip().strip("#").strip()
        if name:
            return name, len(content) if end == -1 else end
    words = _MARKS.sub("", first.strip().lstrip("-*+> ")).split()
    if not words:
        return "", 0
    name = " ".join(words[:UNTITLED_WORDS]).rstrip(".,;:!?")
    return (name + "…" if len(words) > UNTITLED_WORDS else name), 0


def _unit(view: NoteView, content: str, start: int, end: int, kind: str, done: bool | None) -> Sentence | None:
    """One sentence, trimmed as the rule allows, its offsets moved to match."""
    raw = content[start:end]
    start += len(raw) - len(raw.lstrip())
    raw = raw.strip()
    discourse = _DISCOURSE.match(raw)
    if discourse:
        start += discourse.end()
        raw = raw[discourse.end():]
    end = start + len(raw)
    text = " ".join(raw.split())
    if not text:
        return None
    if len(text) > MAX_QUOTE_CHARS:
        cut = text[:MAX_QUOTE_CHARS]
        space = cut.rfind(" ")
        text = (cut[:space] if space > MAX_QUOTE_CHARS // 2 else cut).rstrip(" ,;:") + "…"
    if text[0].islower():
        text = text[0].upper() + text[1:]
    words = _words(text)
    #: A fragment of one or two words ("Booked.", "Ideas") is not a claim and
    #: reads as noise quoted on its own. A list item is read inside its list,
    #: where "Crash reporting" is a whole entry.
    if not words or (kind == "prose" and len(text.split()) < 3):
        return None
    return Sentence(view.id, view.rank, start, end, text, words, kind, done)


def read_note(note: dict, rank: int) -> NoteView | None:
    """A note as its units: prose split into sentences, each list item one."""
    content = str(note.get("content") or "")
    if not content.strip() or note.get("id") is None:
        return None
    title, body_start = _title(content)
    view = NoteView(note=note, rank=rank, title=title, written=_written(note))
    view.title_words = set(_words(title))
    filed = [str(t) for t in (note.get("tags") or [])] + [str(note.get("category") or "")]
    view.filed_words = set(_words(" ".join(filed)))
    view.words = set(_words(content))
    in_fence = False
    offset = 0
    for line in content.splitlines(keepends=True):
        line_start, offset = offset, offset + len(line)
        if line_start < body_start:
            continue
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence or not stripped or _HEADING.match(line) or stripped.startswith(("![", "|")):
            continue
        line_end = line_start + len(line.rstrip("\r\n"))
        item = _ITEM.match(line)
        if item:
            box = item.group(2)
            unit = _unit(
                view, content, line_start + item.end(), line_end,
                "task" if box else "item",
                None if not box else box.strip("[] \t").lower() == "x",
            )
            if unit:
                view.sentences.append(unit)
            continue
        body = line_start + (len(line) - len(line.lstrip(" >")))
        cursor = body
        for match in _SPLIT.finditer(content, body, line_end):
            unit = _unit(view, content, cursor, match.end(1), "prose", None)
            if unit:
                view.sentences.append(unit)
            cursor = match.end()
        unit = _unit(view, content, cursor, line_end, "prose", None)
        if unit:
            view.sentences.append(unit)
    for i, sentence in enumerate(view.sentences):
        sentence.order = i
    return view


# --- scoring --------------------------------------------------------------------

_DATE_CUE = re.compile(
    r"\b(\d{1,2}(st|nd|rd|th)|\d{4}|today|tomorrow|tonight|yesterday|next (week|month|year)|"
    r"last (week|month|year)|this (week|month|year)|weekend|"
    + "|".join(m.lower() for m in _MONTHS) + "|" + "|".join(sorted(_WEEKDAYS)) + r")\b",
    re.I,
)
_NUMBER_CUE = re.compile(
    r"\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|"
    r"hundred|thousand|dozen|half|twice|double)\b",
    re.I,
)
_WHO_CUE = re.compile(r"\b(people|person|someone|team|testers?|users?|he|she|they|asked|said)\b", re.I)


def _cue(shape: str, text: str) -> float:
    """What the question's shape looks for in an answer: a date for a "when",
    a number for a "how many", a person for a "who"."""
    if shape == "when":
        return 1.2 if _DATE_CUE.search(text) else 0.0
    if shape == "count":
        return 1.2 if _NUMBER_CUE.search(text) else 0.0
    if shape == "who":
        names = [
            w for w in re.findall(r"(?<=\s)[A-Z][a-z]+", text)
            if w.lower() not in _WEEKDAYS and w.lower() not in _MONTH_INDEX
        ]
        return 0.8 if names or _WHO_CUE.search(text) else 0.0
    return 0.0


def _score(shape: str, terms: list[str], views: list[NoteView]) -> list[Sentence]:
    """Every sentence scored: BM25 over the sentences of the notes found, plus
    the note's title, the question's shape and the note's retrieval rank.

    BM25 across sentences rather than within one note (`grounding.best_passage`
    asks the second question): here the question is "which of everything found
    answers this", so a word every candidate shares ("harbor" in nine Harbor
    notes) says little and a rare one says a lot.
    """
    pool = [s for view in views for s in view.sentences]
    if not pool:
        return []
    stems = [_stem(t) for t in terms]
    frequency: Counter[str] = Counter()
    for s in pool:
        frequency.update(set(s.words))
    total = len(pool)
    average = sum(len(s.words) for s in pool) / total
    by_id = {view.id: view for view in views}
    dated = sorted((v for v in views if v.written), key=lambda v: v.written, reverse=True)
    recency = {v.id: 1.0 - i / max(1, len(dated)) for i, v in enumerate(dated)}
    for s in pool:
        counts = Counter(s.words)
        bm25 = 0.0
        for term in stems:
            tf = counts.get(term, 0)
            if tf:
                idf = math.log(1 + (total - frequency[term] + 0.5) / (frequency[term] + 0.5))
                bm25 += idf * tf * 2.2 / (tf + 1.2 * (0.25 + 0.75 * len(s.words) / average))
        view = by_id[s.note_id]
        #: A sentence under a heading that names the subject is about it even
        #: when it does not repeat the words: "It was not the database." is
        #: the answer to "why did the list feel slow" because its note is
        #: called "Why the list felt slow".
        title_hits = sum(1 for term in stems if term in view.title_words)
        filed_hits = sum(1 for term in stems if term in view.filed_words and term not in view.title_words)
        relevance = bm25 + TITLE_WEIGHT * title_hits + FILED_WEIGHT * filed_hits
        if stems and title_hits == len(stems):
            relevance += TITLE_WEIGHT
        if stems and relevance <= 0:
            s.score = 0.0
            continue
        s.score = relevance + _cue(shape, s.text) + 0.4 / (1 + s.rank)
        if shape == "status":
            s.score += recency.get(s.note_id, 0.0)
        if view.note.get("connected"):
            s.score *= 0.7
    return [s for s in pool if s.score > 0]


def _jaccard(a: list[str], b: list[str]) -> float:
    sa, sb = set(a), set(b)
    return len(sa & sb) / len(sa | sb) if sa and sb else 0.0


def select(shape: str, terms: list[str], views: list[NoteView], limit: int = MAX_POINTS) -> list[Sentence]:
    """The sentences worth quoting, best first: over the floor, no two saying
    the same thing, no more than `MAX_PER_NOTE` from one note."""
    stems = {_stem(t) for t in terms}
    if len(stems) >= 2:
        covering = [
            v for v in views if len(stems & (v.words | v.title_words | v.filed_words)) / len(stems) > NOTE_COVERAGE
        ]
        #: None covering is a question the notes only half answer: every note
        #: stays in, and the closing line says which words none of them hold.
        views = covering or views
    scored = sorted(_score(shape, terms, views), key=lambda s: (-s.score, s.rank, s.order))
    if not scored:
        return []
    floor = scored[0].score * RELATIVE_FLOOR
    chosen: list[Sentence] = []
    per_note: Counter[int] = Counter()
    for s in scored:
        if s.score < floor or len(chosen) >= limit:
            break
        if per_note[s.note_id] >= MAX_PER_NOTE:
            continue
        if any(_jaccard(s.words, c.words) >= NEAR_DUPLICATE for c in chosen):
            continue
        chosen.append(s)
        per_note[s.note_id] += 1
    return chosen


# --- disagreement -----------------------------------------------------------------

_NEGATION = re.compile(
    r"\b(not|no|never|none|nobody|cannot|can't|won't|don't|doesn't|didn't|isn't|aren't|wasn't|"
    r"cancel(?:led|ed)?|dropped)\b",
    re.I,
)
_FIGURE = re.compile(r"\d+(?:[.,]\d+)?")


def disagree(a: Sentence, b: Sentence) -> bool:
    """Two sentences from different notes about the same thing, one denying
    what the other says, or giving a different figure for it.

    A measure, worded as a possibility ("may disagree"): sharing most of their
    words and differing in a negation or a number is what a contradiction
    looks like on the page, and the reader decides.
    """
    if a.note_id == b.note_id:
        return False
    if len(set(a.words) & set(b.words)) < 2 or _jaccard(a.words, b.words) < 0.3:
        return False
    if bool(_NEGATION.search(a.text)) != bool(_NEGATION.search(b.text)):
        return True
    fa, fb = set(_FIGURE.findall(a.text)), set(_FIGURE.findall(b.text))
    return bool(fa and fb and not (fa & fb))


# --- composition ------------------------------------------------------------------


class _Answer:
    """The answer as tagged parts, the text being their join:

    - ("template", text): one of `PHRASES`, connective wording only;
    - ("quote", text, note_id): a note's sentence, as `read_note` trimmed it;
    - ("title", text, note_id): a note's name, as `_title` read it;
    - ("measure", text): a count or a day the app measured;
    - ("asked", text): a word or phrase from the question itself.
    """

    def __init__(self, views: dict[int, NoteView], today: date) -> None:
        self.parts: list[tuple] = []
        self.rows: list[dict] = []
        self.views = views
        self.today = today
        self.cited: set[tuple[int, int]] = set()

    def t(self, *names: str) -> _Answer:
        for name in names:
            self.parts.append(("template", PHRASES[name]))
        return self

    def m(self, text: str) -> _Answer:
        self.parts.append(("measure", text))
        return self

    def asked(self, text: str) -> _Answer:
        self.parts.append(("asked", text))
        return self

    def name(self, view: NoteView) -> _Answer:
        """The note's name, in bold."""
        self.t("bold")
        self.parts.append(("title", view.title, view.id))
        return self.t("bold")

    def q(self, s: Sentence, terms: list[str]) -> _Answer:
        """A quote, and its citation row: once per sentence, at its first use."""
        self.parts.append(("quote", s.text, s.note_id))
        if (s.note_id, s.order) in self.cited:
            return self
        self.cited.add((s.note_id, s.order))
        note = self.views[s.note_id].note
        content = str(note.get("content") or "")
        stems = {_stem(t) for t in terms}
        self.rows.append(
            {
                "sentence": s.text,
                "note_id": s.note_id,
                "start": s.start,
                "end": s.end,
                "score": round(s.score, 3),
                "chunk_ordinal": grounding.paragraph_ordinal(content, s.start, s.end),
                #: The quote is the note's own words: every word matches and
                #: it supports itself; no model measured meaning here.
                "signals": {"bm25": 1.0, "cosine": None, "graph": grounding._graph_nearness(note)},
                "verdict": "supported",
                "terms": [w for w in query_understanding.search_terms(s.text) if _stem(w) in stems][:6],
                "label": " ".join(content.split())[:60],
            }
        )
        return self

    def item(self, s: Sentence, terms: list[str]) -> _Answer:
        """A bullet holding one quote; a checklist item keeps its tick."""
        if s.kind == "task":
            return self.t("task_done" if s.done else "task_open").q(s, terms)
        return self.t("bullet").q(s, terms)

    def day(self, when: date) -> str:
        """A measured day, worded: "today", "yesterday", "3 March", "3 March 2025"."""
        delta = (self.today - when).days
        if delta == 0:
            return "today"
        if delta == 1:
            return "yesterday"
        if when.year == self.today.year:
            return f"{when.day} {_MONTHS[when.month - 1]}"
        return f"{when.day} {_MONTHS[when.month - 1]} {when.year}"

    def count(self, n: int) -> str:
        return _NUMBER_WORDS[n] if 0 <= n < len(_NUMBER_WORDS) else str(n)

    def dated(self, view: NoteView) -> _Answer:
        """" (3 March)" after a note's name, when the day is known."""
        if view.written:
            self.t("open_paren").m(self.day(view.written)).t("close_paren")
        return self

    @property
    def text(self) -> str:
        return "".join(part[1] for part in self.parts)


def _pick(question: str, salt: str, options: list[str]) -> str:
    """One of `options`: the same one every time for this question, a
    different one for most different questions."""
    digest = hashlib.sha1(f"{salt}:{question.strip().lower()}".encode()).digest()
    return options[digest[0] % len(options)]


def _quote_block(out: _Answer, quotes: list[Sentence], terms: list[str]) -> None:
    """The lead quote, set apart: one blockquote of prose, or the items as a
    list when the note's answer is a list."""
    prose = sorted(_with_context(out, [s for s in quotes if s.kind == "prose"]), key=lambda s: s.order)
    items = [s for s in quotes if s.kind != "prose"]
    if prose:
        out.t("para", "quote")
        for i, s in enumerate(prose):
            if i:
                out.t("space")
            out.q(s, terms)
    if items:
        out.t("para")
        for i, s in enumerate(items):
            if i:
                out.t("line")
            out.item(s, terms)


def _lead(out: _Answer, s: Sentence, shape: str, question: str) -> None:
    """The line that introduces the strongest sentence and names its note."""
    view = out.views[s.note_id]
    if shape == "count" and _NUMBER_CUE.search(s.text):
        if _pick(question, "lead", ["a", "b"]) == "a":
            out.t("figure_a").name(view).t("end_colon")
        else:
            out.t("figure_b").name(view).t("figure_b_end")
    elif shape == "when" and _DATE_CUE.search(s.text):
        if _pick(question, "lead", ["a", "b"]) == "a":
            out.t("date_a").name(view).t("end_colon")
        else:
            out.t("date_b").name(view).t("date_b_end")
    elif shape == "when" and view.written:
        #: No date in the sentence: the day the note was written is the one
        #: date the app knows, and it is said as that and nothing more.
        out.t("says_b").name(view).t("written_on").m(out.day(view.written)).t("end_colon")
    elif shape == "yesno":
        out.t(_pick(question, "lead", ["closest_a", "closest_b"])).name(view).t("closest_end")
    else:
        style = _pick(question, "lead", ["a", "b", "c"])
        out.t(f"says_{style}").name(view).t(f"says_{style}_end")


def _span(out: _Answer, views: list[NoteView]) -> None:
    """", from 3 March to 12 May" over these notes, when their days are known."""
    days = sorted(v.written for v in views if v.written)
    if not days:
        return
    if days[0] == days[-1]:
        out.t("on_day").m(out.day(days[0]))
    else:
        out.t("from_span").m(out.day(days[0])).t("to_span").m(out.day(days[-1]))


#: A sentence opening with one of these leans on the one before it: "It
#: forces the reading to be active" quoted alone has lost what "it" is.
_LEANS_BACK = re.compile(r"^(it|this|that|these|those|they|he|she|then|there|which|second|third|another)\b", re.I)


def _with_context(out: _Answer, sentences: list[Sentence]) -> list[Sentence]:
    """The sentences, each one that leans back preceded by the sentence it
    leans on (the note's own previous sentence, quoted whole too)."""
    have = {(s.note_id, s.order) for s in sentences}
    result: list[Sentence] = []
    for s in sentences:
        if s.order and _LEANS_BACK.match(s.text) and (s.note_id, s.order - 1) not in have:
            before = out.views[s.note_id].sentences[s.order - 1]
            if before.kind == "prose":
                before.score = before.score or s.score
                result.append(before)
                have.add((s.note_id, before.order))
        result.append(s)
    return result


def _grouped(out: _Answer, rest: list[Sentence], terms: list[str]) -> None:
    """The other notes' sentences, grouped by note in score order, under a
    measured line: "Across three more notes, from 3 March to 12 May:".

    Prose only: a list item quoted inside a sentence-long bullet loses the
    tick and the list that gave it its meaning."""
    rest = _with_context(out, [s for s in rest if s.kind == "prose"])
    if not rest:
        return
    order: list[int] = []
    for s in rest:
        if s.note_id not in order:
            order.append(s.note_id)
    views = [out.views[i] for i in order]
    out.t("para")
    if len(views) == 1:
        out.t("one_more")
    else:
        out.t("across").m(out.count(len(views))).t("more_notes")
    _span(out, views)
    out.t("end_colon")
    for view in views:
        mine = sorted((s for s in rest if s.note_id == view.id), key=lambda s: s.order)
        out.t("line", "bullet").name(view).dated(view).t("colon")
        for i, s in enumerate(mine):
            if i:
                out.t("space")
            out.q(s, terms)


def _timeline(out: _Answer, sentences: list[Sentence], terms: list[str], heading: str, newest_first: bool) -> None:
    """Sentences in the order their notes were written, under a bold heading."""
    out.t("para", "bold", heading, "bold")
    sentences = _with_context(out, sentences)
    order: list[int] = []
    for s in sentences:
        if s.note_id not in order:
            order.append(s.note_id)
    order.sort(key=lambda note_id: out.views[note_id].written or date.min, reverse=newest_first)
    for note_id in order:
        view = out.views[note_id]
        out.t("line", "bullet")
        if view.written:
            out.m(out.day(view.written)).t("in_note")
        out.name(view).t("colon")
        #: One bullet per note, its sentences in the note's own order.
        for i, s in enumerate(sorted((s for s in sentences if s.note_id == note_id), key=lambda s: s.order)):
            if i:
                out.t("space")
            out.q(s, terms)


def _disagreements(out: _Answer, chosen: list[Sentence], terms: list[str]) -> None:
    """The first pair of chosen sentences that may disagree, newer first."""
    for i, a in enumerate(chosen):
        for b in chosen[i + 1:]:
            if not disagree(a, b):
                continue
            pair = sorted([a, b], key=lambda s: out.views[s.note_id].written or date.min, reverse=True)
            out.t("para", "bold", "disagree", "bold")
            for s in pair:
                view = out.views[s.note_id]
                out.t("line", "bullet").name(view).dated(view).t("colon").q(s, terms)
            return


#: Words too short or too common to report as missing: a two-letter word
#: missing from a note says nothing about the note.
_MISSING_MIN = 3


def _missing(out: _Answer, terms: list[str], views: list[NoteView]) -> None:
    """"None of these notes mention “hotel”." for the question's words that no
    note found contains, measured over every word of every one of them.

    Said of "these notes", the ones found, and not of the notebook: retrieval
    chose them, and a claim about every note would be a claim nothing here
    measured."""
    found: set[str] = set()
    for view in views:
        found |= view.words | view.title_words | view.filed_words
    missing = [t for t in terms if len(t) >= _MISSING_MIN and _stem(t) not in found]
    if not missing or len(missing) == len(terms):
        return
    out.t("para", "missing")
    for i, word in enumerate(missing[:3]):
        if i:
            out.t("or")
        out.t("open_quote").asked(word).t("close_quote")
    out.t("stop")


def _compare(out: _Answer, sides: tuple[str, str], views: list[NoteView]) -> bool:
    """Two sides, each its own short list, then what speaks of both."""
    a_terms, b_terms = subject_terms(sides[0]), subject_terms(sides[1])
    a_stems, b_stems = {_stem(t) for t in a_terms}, {_stem(t) for t in b_terms}
    a_pick = select("compare", a_terms, views, limit=6)
    b_pick = select("compare", b_terms, views, limit=6)
    both = [s for s in a_pick if b_stems & set(s.words)][:2]
    a_only = [s for s in a_pick if not (b_stems & set(s.words))][:3]
    b_only = [s for s in b_pick if not (a_stems & set(s.words))][:3]
    if not (a_only or b_only):
        return False
    out.t("each_side")
    for label, picks, side_terms in ((sides[0], a_only, a_terms), (sides[1], b_only, b_terms)):
        out.t("para", "bold").asked(label).t("bold")
        notes = {s.note_id for s in picks}
        if picks:
            out.t("open_paren").m(out.count(len(notes))).t("side_note" if len(notes) == 1 else "side_notes")
            out.t("close_paren")
        if not picks:
            out.t("line").t("side_none")
            continue
        for s in picks:
            out.t("line").item(s, side_terms).t("open_paren").name(out.views[s.note_id]).t("close_paren")
    if both:
        out.t("para", "bold", "both", "bold")
        for s in both:
            out.t("line").item(s, a_terms + b_terms).t("open_paren").name(out.views[s.note_id]).t("close_paren")
    return True


def _body(out: _Answer, shape: str, chosen: list[Sentence], terms: list[str], question: str) -> None:
    """The lead and the points under it, laid out by the question's shape."""
    if shape == "status":
        ordered = sorted(
            chosen, key=lambda s: (out.views[s.note_id].written or date.min, s.score), reverse=True
        )
        lead = ordered[0]
        view = out.views[lead.note_id]
        if view.written:
            out.t(_pick(question, "lead", ["latest_a", "latest_b"])).m(out.day(view.written)).t("latest_in")
        else:
            out.t("latest_undated")
        out.name(view).t("latest_end")
        same = sorted((s for s in ordered if s.note_id == lead.note_id), key=lambda s: s.order)
        _quote_block(out, same, terms)
        earlier = [s for s in ordered if s.note_id != lead.note_id]
        if earlier:
            _timeline(out, earlier, terms, "earlier", newest_first=True)
        return
    lead = chosen[0]
    if shape == "list":
        #: A "which" or "list" question is best answered by a list the person
        #: wrote: the best-placed chosen note that holds one leads.
        listed = [s for s in chosen if sum(1 for u in out.views[s.note_id].sentences if u.kind != "prose") >= 2]
        lead_view = out.views[(listed[0] if listed else lead).note_id]
        items = [s for s in lead_view.sentences if s.kind != "prose"]
        if len(items) >= 2:
            lead = listed[0]
            out.t("list_lead").name(lead_view).t("list_lead_end")
            out.t("para")
            for i, s in enumerate(items[:8]):
                if i:
                    out.t("line")
                out.item(s, terms)
            _grouped(out, [s for s in chosen if s.note_id != lead.note_id], terms)
            return
    _lead(out, lead, shape, question)
    #: The lead note's other chosen sentences go with it, in the note's own
    #: order: an explanation reads in the order it was written.
    same = sorted((s for s in chosen if s.note_id == lead.note_id), key=lambda s: s.order)
    if shape == "when":
        same = [lead]
    elif any(s.kind != "prose" for s in same):
        #: One ticked item of four reads as the whole list: a checklist is
        #: shown whole, in its order, with its ticks.
        items = [s for s in out.views[lead.note_id].sentences if s.kind != "prose"][:8]
        same = [s for s in same if s.kind == "prose"] + items
    _quote_block(out, same, terms)
    rest = [s for s in chosen if s.note_id != lead.note_id]
    if shape == "when" and rest:
        _timeline(out, rest, terms, "timeline", newest_first=False)
        return
    _grouped(out, rest, terms)


def _newest(out: _Answer, views: list[NoteView]) -> None:
    """The newest notes, each by its first sentence, newest first."""
    shown = [v for v in views if v.sentences][:5]
    if not shown:
        return
    out.t("newest_lead")
    _span(out, shown)
    out.t("end_colon")
    for view in shown:
        out.t("line", "bullet").name(view).dated(view).t("colon").q(view.sentences[0], [])


def _nothing(shape: str) -> dict:
    return {
        "text": PHRASES["nothing"],
        "grounding": [],
        "support": grounding.support("", []),
        "shape": shape,
        "parts": [("template", PHRASES["nothing"])],
    }


def compose(question: str, notes: list[dict], *, today: date | None = None, recent: bool = False) -> dict:
    """`{"text", "grounding", "support", "shape", "parts"}` for one question.

    `notes` are the route's retrieved notes, ranked (each with `id`,
    `content`, and `written` or `created_at`). `recent` is the retrieval's
    "newest notes" mode: a question with a time and no subject.
    """
    today = today or date.today()
    views_list = [v for v in (read_note(n, i) for i, n in enumerate(notes or [])) if v]
    out = _Answer({v.id: v for v in views_list}, today)
    shape = "recent" if recent else classify(question)
    if shape == "recent":
        _newest(out, views_list)
    else:
        terms = subject_terms(question)
        sides = compare_sides(question) if shape == "compare" else None
        if not (sides and _compare(out, sides, views_list)):
            shape = "what" if shape == "compare" else shape
            chosen = select(shape, terms, views_list)
            if not chosen:
                return _nothing(shape)
            _body(out, shape, chosen, terms, question)
            _disagreements(out, chosen, terms)
            _missing(out, terms, views_list)
    if not out.rows:
        return _nothing(shape)
    quotes = "\n\n".join(row["sentence"] for row in out.rows)
    return {
        "text": out.text,
        "grounding": out.rows,
        #: Counted over the quotes, the only claims an answer here makes: the
        #: connective phrases are not claims, and counting them as sentences
        #: "no note backs" would report a wholly quoted answer as half made up.
        "support": grounding.support(quotes, out.rows),
        "shape": shape,
        "parts": out.parts,
    }
