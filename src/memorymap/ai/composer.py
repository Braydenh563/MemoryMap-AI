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
`PHRASES`, a closed list that says nothing about the world: "Separately,",
"Later, on", "None of these notes mention ...". No sentence is paraphrased, no half-sentence is joined to
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

**Read like a person wrote it (INBOX 725, the owner: "I want it soooo good it
is almost like a chat bot").** The rule above does not move; what changed is
how the quotes are strung together, each step measured on the showcase eval
(`tests/_composer_eval.py`) and kept because it moved a number:

- the first line is the answer: the lead sentence itself, its note named
  after it as the citation, once (INBOX 741: never "Your note ... says:",
  never a note named by its first words), a list of short entries said as one sentence ("lists four: A,
  B, C and D"), a checklist with how many are ticked, a broad question
  opened by how many notes mention it ("At least five of your notes mention
  “running”, from 20 August to 21 September");
- the other notes are joined by how they relate to what came before, by
  meaning (`_Meaning`: the embedder's cosine when it is running, shared
  words when not): no joiner or "And" for the same subject, "Later, on"
  for a newer note on the same thread, "Separately" for another topic, "But
  in a newer note" for two that may disagree; no joiner twice in an answer,
  one topic to a paragraph;
- a sentence other notes repeat is said once, with how many say it; a
  broad question's lead is the sentence the others lean towards (TextRank,
  `centrality`), the note named for the subject first;
- lead-ins ("So basically,") come off a quote from a tested list
  (`LEAD_INS`), and a picture's reading is introduced as the picture's;
- two or three next questions are built from what the answer found and did
  not say (`next`), and "tell me more" or "the second one" is read against
  the turn before (`follow_on`).

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
    # Layout and punctuation.
    "para": "\n\n",
    "line": "\n",
    "bullet": "- ",
    "task_done": "- [x] ",
    "task_open": "- [ ] ",
    "bold": "**",
    "space": " ",
    "colon": ": ",
    "comma": ", ",
    "stop": ".",
    "open_quote": "“",
    "close_quote": "”",
    "open_paren": " (",
    "close_paren": ")",
    "and": " and ",
    "or": " or ",
    # The opening (INBOX 741, the owner: "rn the ask chat messages just say,
    # ur note starting with this says this. also ur not starting with this
    # says this, furthermore, ur note starting with this says this"). The
    # answer is the note's own sentence, said first; the note is named once,
    # after it, as the citation ("(**Harbor launch plan**)"), never by its
    # first words and never as "Your note ... says:". An opener is optional
    # and varied by the question, so two answers in a row do not start alike.
    "open_notes": "From your notes: ",
    "open_wrote": "Here is what you wrote: ",
    "open_put": "Your notes put it this way: ",
    "open_figure": "The number you noted: ",
    "open_date": "The date you noted: ",
    "wrote_on_a": "On ",
    "wrote_on_b": " you wrote: ",
    "closest_a": "The closest your notes come is this: ",
    "closest_b": "Nothing here says it outright. The nearest is: ",
    # The citation: a titled note by its heading, in bold; a note with no
    # heading by the day it was written, since its first words are what the
    # quote already says.
    "your_note": "your note",
    "your_note_cap": "Your note",
    "a_note_from": "A note from ",
    "one_of_your_notes": "one of your notes",
    "one_of_your_notes_cap": "One of your notes",
    "note_from": " from ",
    "list_from": "From ",
    "latest_a": "Most recently, on ",
    "latest_b": "The newest, from ",
    "latest_undated": "The most recent: ",
    "mention_lead": "At least ",
    "mention_mid": " of your notes mention ",
    "from_span": ", from ",
    "to_span": " to ",
    "on_day": ", on ",
    # A list the person wrote, as a sentence or as bullets.
    "lists": " lists ",
    "it_lists": "It also lists ",
    "checklist": "Its checklist has ",
    "checklist_of": " of ",
    "checklist_done": " done:",
    "has": " has ",
    "checklist_items_done": " checklist items done:",
    "end_colon": ":",
    # The notes after the first, joined by how they relate to what came
    # before, never the same joining words twice running and never a pile of
    # "also": the same subject mostly needs no joiner at all, the sentence
    # and its citation are enough. Each joiner takes the quote after a comma
    # when its first word can be lowered ("Separately, the hills are steep"),
    # and after a colon when it cannot ("Separately: Lisbon to Porto ...").
    "and_join": "And ",
    "on_top": "On top of that",
    "separately": "Separately",
    "elsewhere": "Elsewhere",
    "another_note": "On another note",
    "later_on": "Later, on ",
    "then_on": "Then on ",
    "before_that": "Before that, on ",
    "echo": " (Your notes say this ",
    "echo_end": " times.)",
    "disagree_lead": "Your notes may disagree here. ",
    "but_newer": "But in a newer note",
    "but_older": "But in an older note",
    "but_other": "But in another note",
    "disagree_check": " These may disagree, so it is worth checking which is current.",
    "picture_in": "The picture in ",
    "picture_shows": " shows ",
    "picture_reads": " has these words in it: ",
    "timeline": "In the order you wrote them:",
    # A comparison.
    "of_found": "Of the notes found, ",
    "mentions_one": " mentions ",
    "mention_many": " mention ",
    "each_side": "Here is what each says.",
    "side_notes": " notes",
    "side_note": " note",
    "both": "Both together",
    "side_none": "Nothing found is about this one on its own.",
    # The close.
    "missing": "None of these notes mention ",
    "newest_lead": "Your ",
    "newest_mid": " newest notes",
    "nothing": (
        "None of the notes found share enough with your question to quote. "
        "The matching notes are listed beside this answer."
    ),
    # What to ask next: a note's name, a tag or the question's own words in a
    # fixed question.
    "next_note_a": "What does “",
    "next_note_b": "” say?",
    "next_tag_a": "What else do my notes say about ",
    "next_tag_b": "?",
    "next_latest_a": "What is the latest on ",
    "next_when_a": "When did I write about ",
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
    for suffix, keep, least in (("ies", "y", 4), ("ing", "", 3), ("ed", "", 4), ("es", "", 4), ("s", "", 3)):
        if w.endswith(suffix) and len(w) - len(suffix) >= least:
            if suffix == "s" and w.endswith(("ss", "us", "is")):
                break
            w = w[: len(w) - len(suffix)] + keep
            #: "running" is "run" and "stopped" is "stop": the doubled last
            #: consonant a suffix brought is taken off with it (INBOX 725,
            #: measured: "what do my notes say about running" missed every
            #: note that says "run" or is tagged it).
            if suffix in ("ing", "ed") and len(w) >= 3 and w[-1] == w[-2] and w[-1] not in "aeioulsz":
                w = w[:-1]
            break
    #: A silent final "e" goes too, so "hire" meets "hiring" and "make" meets
    #: "making". Never to leave "not": "note" must not match a negation.
    if w.endswith("e") and len(w) >= 4 and w[:-1] != "not":
        w = w[:-1]
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
    #: "prose", "item", "task" (a checklist item; `done` says which),
    #: "picture" (the app's caption of a picture in the note) or
    #: "picture_text" (the words the app read in it).
    kind: str = "prose"
    done: bool | None = None
    order: int = 0
    score: float = 0.0
    #: Sentences of other notes that say the same thing, dropped so the answer
    #: says it once, and counted: "(Your notes say this three times.)".
    echoes: list = field(default_factory=list)

    @property
    def key(self) -> tuple[int, int, int]:
        return (self.note_id, self.order, self.start)


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
    #: Whether the note has a heading. One without is never named by its first
    #: words (INBOX 741): the quote already says them, and "your note starting
    #: with ... says" was the whole complaint. It is cited by its day instead.
    titled: bool = False

    @property
    def id(self) -> int:
        return self.note["id"]


_HEADING = re.compile(r"^\s{0,3}#{1,6}\s+(.*)$")
_ITEM = re.compile(r"^(\s*(?:[-*+]|\d{1,3}[.)])\s+)(\[[ xX]\]\s+)?")
#: Where one sentence ends and the next begins: a stop (and the quote mark or
#: bracket closing it), a space, and a capital or a digit. Misses some
#: abbreviations; never merges two sentences, the safer direction here.
_SPLIT = re.compile(r"([.!?][\"”’)]?)\s+(?=[\"“‘(]?[A-Z0-9])")
#: The lead-ins a person opens a sentence with that carry no claim, the tested
#: list (INBOX 725: "Trim lead-ins ("So basically,") from quotes with a tested
#: list"). `LEAD_INS` are taken off only with the comma or colon after them,
#: so "But the API ..." keeps its contrast and "Now the list scrolls" keeps
#: its "now"; `LEAD_INS_BARE` mean nothing even without one ("Basically the
#: hills are steep" says what "The hills are steep" says). Several in a row
#: ("Ok so basically,") come off together.
LEAD_INS = (
    "so basically", "ok so", "okay so", "right so", "so", "also", "anyway", "anyhow", "plus", "oh", "well",
    "ok", "okay", "right", "basically", "honestly", "and", "but", "then", "now", "by the way", "btw", "fyi",
    "in any case", "to be honest", "tbh", "note to self", "quick note", "update", "edit",
)
LEAD_INS_BARE = ("so basically", "basically", "honestly", "to be honest", "tbh", "btw", "fyi")
_LEAD_IN = "|".join(re.escape(w) for w in sorted(LEAD_INS, key=len, reverse=True))
_LEAD_IN_BARE = "|".join(re.escape(w) for w in sorted(LEAD_INS_BARE, key=len, reverse=True))
_DISCOURSE = re.compile(
    rf"^(?:(?:{_LEAD_IN})(?:\s+(?:{_LEAD_IN}))*\s*[,:]\s+|(?:{_LEAD_IN_BARE})\s+(?=(?-i:[a-z])))+(?=\S)",
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


#: The block `routes_chat._media_readings` adds under a note that is mostly
#: pictures: one line per picture, "- name: shows <caption>; text in it: "..."".
#: The app's own reading of the person's picture counts as from the note
#: (INBOX 725, 7) and is introduced as one: "The picture in **Sketches**
#: shows ...", never as the person's sentence.
_PICTURES_HEAD = "[Pictures in this note"
_PICTURE_LINE = re.compile(r"^\s*-\s+[^:\n]+:\s+(?:shows (?P<caption>.+?))?(?:;?\s*text in it: \"(?P<text>.+?)\")?\]?\s*$")


def _picture_units(view: NoteView, content: str, line_start: int, line: str) -> None:
    match = _PICTURE_LINE.match(line.rstrip("\r\n"))
    if not match:
        return
    for group, kind in (("caption", "picture"), ("text", "picture_text")):
        text = (match.group(group) or "").strip()
        if len(text.split()) < 2:
            continue
        start = line_start + match.start(group)
        words = _words(text)
        if words:
            view.sentences.append(Sentence(view.id, view.rank, start, start + len(text), text, words, kind))


def read_note(note: dict, rank: int) -> NoteView | None:
    """A note as its units: prose split into sentences, each list item one."""
    content = str(note.get("content") or "")
    if not content.strip() or note.get("id") is None:
        return None
    title, body_start = _title(content)
    view = NoteView(note=note, rank=rank, title=title, written=_written(note), titled=bool(title) and body_start > 0)
    view.title_words = set(_words(title))
    filed = [str(t) for t in (note.get("tags") or [])] + [str(note.get("category") or "")]
    view.filed_words = set(_words(" ".join(filed)))
    view.words = set(_words(content))
    in_fence = False
    in_pictures = False
    offset = 0
    for line in content.splitlines(keepends=True):
        line_start, offset = offset, offset + len(line)
        if line_start < body_start:
            continue
        stripped = line.strip()
        if stripped.startswith(_PICTURES_HEAD):
            in_pictures = True
            continue
        if in_pictures:
            _picture_units(view, content, line_start, line)
            in_pictures = not stripped.endswith("]")
            continue
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
_CAUSE_CUE = re.compile(r"\b(because|since|so that|which is why|that is why|due to|caused|the reason|means)\b", re.I)
_WHO_CUE = re.compile(r"\b(people|person|someone|team|testers?|users?|he|she|they|asked|said)\b", re.I)


def _cue(shape: str, text: str) -> float:
    """What the question's shape looks for in an answer: a date for a "when",
    a number for a "how many", a person for a "who"."""
    if shape == "when":
        return 1.2 if _DATE_CUE.search(text) else 0.0
    if shape == "count":
        return 1.2 if _NUMBER_CUE.search(text) else 0.0
    if shape == "explain":
        #: "because" is never written here, but a sentence of the note's own
        #: that says "because" or "so that" is what a "why" is asking for.
        return 0.6 if _CAUSE_CUE.search(text) else 0.0
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


def select(
    shape: str,
    terms: list[str],
    views: list[NoteView],
    limit: int = MAX_POINTS,
    *,
    meaning: "_Meaning | None" = None,
    per_note: int = MAX_PER_NOTE,
    said: str = "",
) -> list[Sentence]:
    """The sentences worth quoting, best first: over the floor, no two saying
    the same thing, no more than `per_note` from one note.

    A sentence that says what a chosen one already says is not quoted again;
    it is kept on the chosen one as an echo, so the answer can say how many
    notes say it. `said` is an earlier answer's text ("tell me more"): a
    sentence it already quoted is left for something new."""
    stems = {_stem(t) for t in terms}
    if len(stems) >= 2:
        covering = [
            v for v in views if len(stems & (v.words | v.title_words | v.filed_words)) / len(stems) > NOTE_COVERAGE
        ]
        #: None covering is a question the notes only half answer: every note
        #: stays in, and the closing line says which words none of them hold.
        views = covering or views
    scored = sorted(_score(shape, terms, views), key=lambda s: (-s.score, s.rank, s.order))
    if said:
        flat = " ".join(said.split())
        scored = [s for s in scored if s.text.rstrip("…") not in flat]
    if not scored:
        return []
    meaning = meaning or _Meaning(scored[:MEANING_POOL], None)
    floor = scored[0].score * RELATIVE_FLOOR
    chosen: list[Sentence] = []
    counts: Counter[int] = Counter()
    for s in scored:
        if s.score < floor:
            break
        s.echoes = []
        #: Two that differ in a figure or a "not" are not one claim twice,
        #: however many words they share: that is a disagreement, said as one.
        twin = next((c for c in chosen if meaning.same(s, c) and not disagree(s, c)), None)
        if twin is not None:
            if s.note_id != twin.note_id and s.note_id not in {e.note_id for e in twin.echoes}:
                twin.echoes.append(s)
            continue
        if len(chosen) >= limit or counts[s.note_id] >= per_note:
            continue
        chosen.append(s)
        counts[s.note_id] += 1
    return chosen


# --- meaning ----------------------------------------------------------------------

#: How many of the best sentences are compared by meaning: the ones an answer
#: can quote, with room for the echoes beside them. One batch to the embedder.
MEANING_POOL = 24

#: Two sentences this alike say the same thing (cosine over the embedder's
#: vectors). Above the paraphrase line of the small sentence models, below
#: the near-identical: "The launch is on the 14th" and "We launch on the
#: 14th" are one claim, said twice.
SAME_COSINE = 0.9

#: Two sentences this alike are about the same thing, the line between
#: "also" and "separately" (cosine, then token Jaccard over the words that are
#: not the question's own, which every candidate shares).
TOPIC_COSINE = 0.55
TOPIC_JACCARD = 0.12


class _Meaning:
    """How alike two sentences are: cosine over the embedder's vectors when it
    gave them (`compose(embed=...)`), token Jaccard when it did not.

    The embedder is optional by decision (INBOX 725): an answer composed with
    no model running at all still has to read well, so every use of meaning
    here has a lexical twin, measured on the showcase eval with no vectors.
    """

    def __init__(self, sentences: list[Sentence], embed, subject: set[str] | None = None) -> None:  # noqa: ANN001
        self.vectors: dict[tuple, list[float]] = {}
        self.subject = subject or set()
        if embed is not None and sentences:
            try:
                vectors = list(embed([s.text for s in sentences]))
            except Exception:  # noqa: BLE001  # no vectors is a state, not an error
                vectors = []
            if len(vectors) == len(sentences):
                for s, vector in zip(sentences, vectors):
                    if vector is None:
                        continue
                    values = [float(x) for x in vector]
                    norm = math.sqrt(sum(x * x for x in values))
                    if norm:
                        self.vectors[s.key] = [x / norm for x in values]

    def cosine(self, a: Sentence, b: Sentence) -> float | None:
        va, vb = self.vectors.get(a.key), self.vectors.get(b.key)
        if va is None or vb is None:
            return None
        return sum(x * y for x, y in zip(va, vb))

    def same(self, a: Sentence, b: Sentence) -> bool:
        cosine = self.cosine(a, b)
        if cosine is not None:
            return cosine >= SAME_COSINE
        return _jaccard(a.words, b.words) >= NEAR_DUPLICATE

    def alike(self, a: Sentence, b: Sentence) -> float:
        """Topic likeness: 1.0 for one claim, 0.0 for nothing shared."""
        cosine = self.cosine(a, b)
        if cosine is not None:
            return cosine
        return _jaccard([w for w in a.words if w not in self.subject], [w for w in b.words if w not in self.subject])

    def same_topic(self, a: Sentence, b: Sentence) -> bool:
        cosine = self.cosine(a, b)
        if cosine is not None:
            return cosine >= TOPIC_COSINE
        return self.alike(a, b) >= TOPIC_JACCARD


def centrality(sentences: list[Sentence], meaning: _Meaning, rounds: int = 30) -> dict[tuple, float]:
    """TextRank over the sentences' likeness graph, its teleport weighted by
    each sentence's score: the sentence most of the others lean towards, among
    the ones that answer the question. Deterministic (a fixed number of
    rounds from a fixed start)."""
    n = len(sentences)
    if n == 0:
        return {}
    weights = [[0.0 if i == j else max(0.0, meaning.alike(a, b)) for j, b in enumerate(sentences)] for i, a in enumerate(sentences)]
    totals = [sum(row) for row in weights]
    prior_total = sum(max(s.score, 0.0) for s in sentences) or 1.0
    prior = [max(s.score, 0.0) / prior_total for s in sentences]
    rank = list(prior)
    for _ in range(rounds):
        rank = [
            0.15 * prior[i] + 0.85 * sum(rank[j] * weights[j][i] / totals[j] for j in range(n) if totals[j])
            for i in range(n)
        ]
    return {s.key: rank[i] for i, s in enumerate(sentences)}


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
    - ("quote", text, note_id): a note's sentence, as `read_note` trimmed it
      (and, inside a list sentence, its first letter lowered);
    - ("picture", text, note_id): the app's reading of a picture in the note;
    - ("title", text, note_id): a note's name, as `_title` read it;
    - ("filed", text, note_id): one of the note's tags or its category;
    - ("measure", text): a count or a day the app measured;
    - ("asked", text): a word or phrase from the question itself.
    """

    def __init__(self, views: dict[int, NoteView], today: date) -> None:
        self.parts: list[tuple] = []
        self.rows: list[dict] = []
        self.views = views
        self.today = today
        self.cited: set[tuple] = set()
        #: The note the last sentence was about, so the next one about the
        #: same note can say "It" (the one pronoun written here, and only of
        #: a note named just before it).
        self.last_note: int | None = None
        #: The notes already named in this answer: a note is named once, at
        #: its first quote, and its later quotes go uncited (INBOX 741).
        self.named: set[int] = set()

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

    def name(self, view: NoteView, cap: bool = False) -> _Answer:
        """The note's name: its heading in bold, or, for a note with no
        heading, "your note from 3 March" (never its first words)."""
        self.last_note = view.id
        self.named.add(view.id)
        if view.titled:
            self.t("bold")
            self.parts.append(("title", view.title, view.id))
            return self.t("bold")
        if view.written:
            return self.t("your_note_cap" if cap else "your_note", "note_from").m(self.day(view.written))
        return self.t("one_of_your_notes_cap" if cap else "one_of_your_notes")

    def cite(self, view: NoteView, again: bool = False) -> _Answer:
        """" (**Harbor launch plan**)" or " (your note, 3 March)" after a
        quote: the citation as a marker, once per note unless `again`."""
        if view.id in self.named and not again:
            return self
        self.named.add(view.id)
        self.t("open_paren")
        if view.titled:
            self.t("bold")
            self.parts.append(("title", view.title, view.id))
            self.t("bold")
        elif view.written:
            self.t("your_note", "comma").m(self.day(view.written))
        else:
            self.t("one_of_your_notes")
        return self.t("close_paren")

    def q(self, s: Sentence, terms: list[str], shown: str | None = None) -> _Answer:
        """A quote, and its citation row: once per sentence, at its first use.
        `shown` is the quote as this answer prints it (a list item's first
        letter lowered inside a sentence); the row cites what is printed."""
        text = s.text if shown is None else shown
        kind = "picture" if s.kind.startswith("picture") else "quote"
        self.parts.append((kind, text, s.note_id))
        self.last_note = s.note_id
        if s.key in self.cited:
            return self
        self.cited.add(s.key)
        note = self.views[s.note_id].note
        content = str(note.get("content") or "")
        stems = {_stem(t) for t in terms}
        self.rows.append(
            {
                "sentence": text,
                "note_id": s.note_id,
                "start": s.start,
                "end": s.end,
                "score": round(s.score, 3),
                "chunk_ordinal": grounding.paragraph_ordinal(content, s.start, s.end),
                #: The quote is the note's own words: every word matches and
                #: it supports itself; no model measured meaning here.
                "signals": {"bm25": 1.0, "cosine": None, "graph": grounding._graph_nearness(note)},
                "verdict": "supported",
                "terms": [w for w in query_understanding.search_terms(text) if _stem(w) in stems][:6],
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
        return _count_word(n)

    def dated(self, view: NoteView) -> _Answer:
        """" (3 March)" after a note's name, when the day is known."""
        if view.written:
            self.t("open_paren").m(self.day(view.written)).t("close_paren")
        return self

    @property
    def text(self) -> str:
        return "".join(part[1] for part in self.parts)


def _count_word(n: int) -> str:
    return _NUMBER_WORDS[n] if 0 <= n < len(_NUMBER_WORDS) else str(n)


def _pick(question: str, salt: str, options: list[str]) -> str:
    """One of `options`: the same one every time for this question, a
    different one for most different questions."""
    digest = hashlib.sha1(f"{salt}:{question.strip().lower()}".encode()).digest()
    return options[digest[0] % len(options)]


#: The first words a quote may have lowered after a joiner ("Separately,
#: the hills are steep"): words that are never a name. Anything else, a
#: name, "I", a capitalised word the app cannot tell from a name, keeps its
#: capital and takes the joiner after a colon instead.
_LOWERABLE = frozenset(
    """a an the it its this that these those there they their them we our
    you your he she his her one two three four five six seven eight nine ten
    every each some most all no not after before when if then in on at for
    to with without from by of only just still maybe once both next last
    first until since cut try keep ask write ship book buy call check get go
    make use add need plan start stop slow hire pair pairs foam sign
    out back""".split()
)


def _lowered(s: Sentence) -> str | None:
    """The quote with its first letter lowered, when its first word is one
    that is never a name ("The", "Ship", not "Harbor" or "I"); None otherwise."""
    if s.kind not in ("prose", "item") or len(s.text) < 2:
        return None
    first = re.match(r"[A-Za-z]+", s.text)
    if not first or first.group(0).lower() not in _LOWERABLE or first.group(0)[1:] != first.group(0)[1:].lower():
        return None
    return s.text[0].lower() + s.text[1:]


#: A sentence opening with one of these leans on the one before it: "It
#: forces the reading to be active" quoted alone has lost what "it" is.
_LEANS_BACK = re.compile(r"^(it|this|that|these|those|they|he|she|then|there|which|second|third|another)\b", re.I)


def _with_context(out: _Answer, sentences: list[Sentence]) -> list[Sentence]:
    """The sentences, each one that leans back preceded by the sentence it
    leans on (the note's own previous sentence, quoted whole too)."""
    have = {(s.note_id, s.order) for s in sentences}
    result: list[Sentence] = []
    for s in sentences:
        if s.order and s.kind == "prose" and _LEANS_BACK.match(s.text) and (s.note_id, s.order - 1) not in have:
            before = out.views[s.note_id].sentences[s.order - 1]
            if before.kind == "prose":
                before.score = before.score or s.score
                result.append(before)
                have.add((s.note_id, before.order))
        result.append(s)
    return result


def _quotes(out: _Answer, sentences: list[Sentence], terms: list[str], lower_first: bool = False) -> None:
    """Sentences of one note, run together in the note's own order; a picture's
    reading introduced as the app's reading of it, and each sentence other
    notes repeat followed by how many say it. `lower_first` lowers the first
    sentence's first letter, after a joiner that ends in a comma."""
    for i, s in enumerate(sentences):
        if i:
            out.t("space")
        if not i and lower_first and _lowered(s):
            out.q(s, terms, _lowered(s))
            if s.echoes:
                out.t("echo").m(out.count(1 + len(s.echoes))).t("echo_end")
            continue
        if s.kind == "picture":
            out.t("picture_in").name(out.views[s.note_id]).t("picture_shows").q(s, terms)
            if not s.text.endswith((".", "?", "…")):
                out.t("stop")
        elif s.kind == "picture_text":
            out.t("picture_in").name(out.views[s.note_id]).t("picture_reads", "open_quote").q(s, terms)
            out.t("close_quote", "stop")
        else:
            out.q(s, terms)
        if s.echoes:
            out.t("echo").m(out.count(1 + len(s.echoes))).t("echo_end")


#: A list the person wrote reads as one sentence when every entry is a short
#: phrase: "Designing Data-Intensive Applications, The Mom Test and A Pattern
#: Language". Past these it is a list, and is shown as one.
FUSE_MAX_ITEMS = 6
FUSE_MAX_WORDS = 10


def _fusable(items: list[Sentence]) -> bool:
    """Every entry a phrase lifted whole from the list (no sentence of its own
    inside it, no colon), short enough to read in one breath."""
    return (
        2 <= len(items) <= FUSE_MAX_ITEMS
        and all(s.kind == "item" for s in items)
        and all(len(s.text.split()) <= FUSE_MAX_WORDS and not re.search(r"[.!?:;]\s*$|:\s", s.text) for s in items)
    )


def _sentence_case(items: list[Sentence]) -> bool:
    """Entries written as sentence-case phrases ("A light jacket", "Plug
    adapter"), not names ("The Mom Test"): only these have their first letter
    lowered inside a sentence, which leaves the person's words as they wrote
    them everywhere else."""
    return all(not re.search(r"\s[A-Z]", s.text) for s in items)


def _joined(out: _Answer, keys: list[str], unit: list[Sentence], terms: list[str], when: date | None = None, colon: bool = False) -> None:
    """A joiner, an optional measured day, then the note's sentences: after a
    comma with the first letter lowered when it can be ("Later, on 3 March,
    the hotel is booked"), after a colon when it cannot or `colon` says so
    (a joiner that is not a clause: "The newest, from 3 March: ...")."""
    out.t(*keys)
    if when:
        out.m(out.day(when))
    if _lowered(unit[0]) and not colon:
        if when or not PHRASES[keys[-1]].endswith(" "):
            out.t("comma")
        _quotes(out, unit, terms, lower_first=True)
    else:
        out.t("colon")
        _quotes(out, unit, terms)


def _list_sentence(out: _Answer, items: list[Sentence], terms: list[str]) -> None:
    """" A, B and C." from the list's own entries."""
    lower = _sentence_case(items)
    for i, s in enumerate(items):
        if i:
            out.t("and" if i == len(items) - 1 else "comma")
        shown = s.text[0].lower() + s.text[1:] if lower else s.text
        out.q(s, terms, shown)
    out.t("stop")


def _list_block(out: _Answer, view: NoteView, items: list[Sentence], terms: list[str], lead: str) -> None:
    """A note's list, introduced by what it holds: "Your note **Reading
    list** lists four: ...", a checklist with how many are ticked."""
    tasks = [s for s in items if s.kind == "task"]
    if tasks and len(tasks) == len(items):
        done, total = out.count(sum(1 for s in tasks if s.done)), out.count(len(tasks))
        if lead == "opening":
            if view.titled:
                out.t("your_note_cap", "space")
            out.name(view, cap=True).t("has").m(done).t("checklist_of").m(total).t("checklist_items_done")
        else:
            out.t("checklist").m(done).t("checklist_of").m(total).t("checklist_done")
        out.t("para")
        for i, s in enumerate(tasks):
            if i:
                out.t("line")
            out.item(s, terms)
        return
    if lead == "opening":
        if view.titled:
            out.t("your_note_cap", "space")
        out.name(view, cap=True).t("lists")
    else:
        out.t("it_lists")
    out.m(out.count(len(items)))
    if _fusable(items):
        out.t("colon")
        _list_sentence(out, items, terms)
        return
    out.t("end_colon", "para")
    for i, s in enumerate(items):
        if i:
            out.t("line")
        out.item(s, terms)


def _opening(out: _Answer, s: Sentence, shape: str, question: str) -> None:
    """What comes before the strongest sentence on the first line, which is
    the answer: often nothing, the sentence itself, or a short opener chosen
    by the question so answers in a row do not start alike. The note is not
    named here; its citation follows the quote (`_Answer.cite`)."""
    view = out.views[s.note_id]
    if shape == "count" and _NUMBER_CUE.search(s.text):
        options = ["", "open_figure", "open_notes"]
    elif shape == "when" and _DATE_CUE.search(s.text):
        options = ["", "open_date"]
    elif shape == "when" and view.written:
        #: No date in the sentence: the day the note was written is the one
        #: date the app knows, and it is said as that and nothing more.
        out.t("wrote_on_a").m(out.day(view.written)).t("wrote_on_b")
        return
    elif shape == "yesno":
        options = ["closest_a", "closest_b"]
    elif shape == "explain":
        options = ["", "open_put", "open_notes"]
    else:
        options = ["", "open_notes", "open_wrote"]
    key = _pick(question, "lead", options)
    if key:
        out.t(key)


def _span(out: _Answer, views: list[NoteView]) -> None:
    """", from 3 March to 12 May" over these notes, when their days are known."""
    days = sorted(v.written for v in views if v.written)
    if not days:
        return
    if days[0] == days[-1]:
        out.t("on_day").m(out.day(days[0]))
    else:
        out.t("from_span").m(out.day(days[0])).t("to_span").m(out.day(days[-1]))


#: The shapes that ask for one fact: answered by it, and by at most
#: `FACT_OTHERS` more notes, since a chat answer to "how many" does not go on
#: for five paragraphs about everything else that has a number in it.
FACT_SHAPES = ("count", "when", "who", "yesno")
FACT_OTHERS = 2


def _lead_block(out: _Answer, shape: str, lead: Sentence, chosen: list[Sentence], terms: list[str], question: str) -> None:
    """The first paragraph: the opening and the lead note's chosen sentences,
    in the note's own order; then its list, when the answer is a list."""
    view = out.views[lead.note_id]
    same = [s for s in chosen if s.note_id == lead.note_id]
    if shape == "when":
        same = [lead]
    if shape in FACT_SHAPES and lead.kind == "item":
        #: "Is the pricing page signed off?" is answered by the one entry of
        #: the risks list that says so, not by the whole list.
        _opening(out, lead, shape, question)
        _quotes(out, [lead], terms)
        out.cite(view)
        return
    prose = sorted(_with_context(out, [s for s in same if s.kind == "prose" or s.kind.startswith("picture")]), key=lambda s: s.order)
    items = [s for s in same if s.kind in ("item", "task")]
    if items:
        #: One ticked item of four reads as the whole list: a list is shown
        #: whole, in its order, with its ticks.
        items = [s for s in view.sentences if s.kind in ("item", "task")][:8]
    if not prose:
        _list_block(out, view, items, terms, "opening")
        return
    if prose[0].kind.startswith("picture") and len(prose) == 1:
        _quotes(out, prose, terms)
    else:
        _opening(out, lead if lead in prose else prose[0], shape, question)
        _quotes(out, prose, terms)
        out.cite(view)
    if items and shape != "when":
        out.t("para")
        _list_block(out, view, items, terms, "continued")


def _relation(out: _Answer, meaning: _Meaning, s: Sentence, before: list[Sentence], lead: Sentence) -> str:
    """How a note's sentence relates to what the answer already said: "later"
    for the same subject in a newer note than the lead's, "also" for the same
    topic, "separately" for another one."""
    #: On the question's subject is "also" whatever else it says: a second
    #: note about the beta testers is more about them, not a change of topic.
    close = any(meaning.same_topic(s, b) for b in before)
    on_topic = close or bool(meaning.subject & set(s.words))
    view, lead_view = out.views[s.note_id], out.views[lead.note_id]
    #: "Later" only for a newer note on the same thread as what was said, not
    #: merely the same subject: "41 testers active" then, weeks on, "Beta
    #: testers did not know Harbor works offline" is not a later chapter.
    if close and view.written and lead_view.written and view.written > lead_view.written:
        return "later"
    return "also" if on_topic else "separately"


def _clusters(meaning: _Meaning, units: list[list[Sentence]]) -> list[list[list[Sentence]]]:
    """Notes' sentences grouped by topic, a group's order its best note's:
    each group one paragraph, so the answer moves from one thread to the next
    rather than back and forth. The notes that say the question's subject in
    their own words are one group, the first."""
    groups: list[list[list[Sentence]]] = []
    for unit in units:
        on_subject = any(meaning.subject & set(s.words) for s in unit)
        home = next(
            (
                g
                for g in groups
                if any(meaning.same_topic(a, b) for other in g for a in unit for b in other)
                or (on_subject and any(meaning.subject & set(s.words) for other in g for s in other))
            ),
            None,
        )
        if home is None:
            groups.append([unit])
        else:
            home.append(unit)
    return groups


def _others(out: _Answer, meaning: _Meaning, lead: Sentence, rest: list[Sentence], terms: list[str], question: str) -> None:
    """The other notes, one sentence group each, as prose: each joined to
    what came before by how it relates to it (also, later, separately), each
    topic its own paragraph. Prose only: a list item quoted inside a sentence
    loses the list that gave it its meaning."""
    rest = _with_context(out, [s for s in rest if s.kind == "prose" or s.kind.startswith("picture")])
    if not rest:
        return
    order: list[int] = []
    for s in rest:
        if s.note_id not in order:
            order.append(s.note_id)
    units = [sorted((s for s in rest if s.note_id == i), key=lambda s: s.order) for i in order]
    said = [s for s in out.views[lead.note_id].sentences if s.key in out.cited]
    last = ""
    used: set[str] = set()
    for group in _clusters(meaning, units):
        for g, unit in enumerate(group):
            #: Two notes to a paragraph at most: a topic's paragraph that runs
            #: on through five notes reads as a wall.
            out.t("space" if g % 2 else "para")
            view = out.views[unit[0].note_id]
            relation = _relation(out, meaning, unit[0], said or [lead], lead)
            if unit[0].kind.startswith("picture") and len(unit) == 1:
                #: A picture's reading names its note itself ("The picture
                #: in **Sketches** shows ..."): no joiner before it.
                _quotes(out, unit, terms)
            elif relation == "later":
                last = "then_on" if "later_on" in used else "later_on"
                used.add(last)
                _joined(out, [last], unit, terms, view.written)
            else:
                #: The same subject mostly needs no joiner: the sentence and
                #: its citation are enough, and a pile of "also" is what the
                #: owner read as a template (INBOX 741). Never the same
                #: joining words twice in one answer. A joiner for the same subject only where the quote can
                #: follow it after a comma: "On top of that: Subject: ..." is
                #: two colons and no sentence.
                pool = ["", "and_join", "on_top"] if relation == "also" and _lowered(unit[0]) else [""]
                if relation != "also":
                    pool = ["separately", "elsewhere", "another_note"]
                options = [o for o in pool if o not in used] or [""]
                last = _pick(f"{question}:{view.id}", "join", options)
                if last:
                    used.add(last)
                if last:
                    _joined(out, [last], unit, terms)
                else:
                    _quotes(out, unit, terms)
            out.cite(view)
            said.extend(unit)


def _timeline(out: _Answer, sentences: list[Sentence], terms: list[str]) -> None:
    """A "when" question's other notes, as bullets in the order they were
    written: a timeline is a list, and reads as one."""
    sentences = _with_context(out, [s for s in sentences if s.kind != "task"])
    if not sentences:
        return
    order: list[int] = []
    for s in sentences:
        if s.note_id not in order:
            order.append(s.note_id)
    order.sort(key=lambda note_id: out.views[note_id].written or date.min)
    out.t("para", "timeline")
    for note_id in order:
        view = out.views[note_id]
        out.t("line", "bullet")
        if view.written:
            out.m(out.day(view.written)).t("colon")
        _quotes(out, sorted((s for s in sentences if s.note_id == note_id), key=lambda s: s.order), terms)
        if view.titled or not view.written:
            out.cite(view)


def _earlier(out: _Answer, sentences: list[Sentence], terms: list[str]) -> None:
    """A "latest" question's older notes, newest first, as prose that walks
    back: "Before that, on 12 September, three workstreams ... (**Q4 roadmap**)"."""
    sentences = _with_context(out, [s for s in sentences if s.kind == "prose" or s.kind.startswith("picture")])
    order: list[int] = []
    for s in sentences:
        if s.note_id not in order:
            order.append(s.note_id)
    order.sort(key=lambda note_id: out.views[note_id].written or date.min, reverse=True)
    for i, note_id in enumerate(order):
        view = out.views[note_id]
        out.t("para")
        unit = sorted((s for s in sentences if s.note_id == note_id), key=lambda s: s.order)
        if view.written:
            _joined(out, ["before_that" if i == 0 else "then_on"], unit, terms, view.written)
        else:
            _quotes(out, unit, terms)
        out.cite(view)


def _disagreement(chosen: list[Sentence]) -> tuple[Sentence, Sentence] | None:
    for i, a in enumerate(chosen):
        for b in chosen[i + 1:]:
            if disagree(a, b):
                return a, b
    return None


def _disagreements(out: _Answer, pair: tuple[Sentence, Sentence], lead: Sentence, terms: list[str]) -> None:
    """Two sentences that may disagree, said as a "but": the lead's rival
    straight after it, or both, the older first, at the end."""
    a, b = sorted(pair, key=lambda s: out.views[s.note_id].written or date.min)
    days = (out.views[a.note_id].written, out.views[b.note_id].written)
    newer = bool(days[0] and days[1] and days[1] > days[0])
    out.t("para")
    if lead.note_id in (a.note_id, b.note_id):
        #: One side is the lead's own note, already quoted above: only the
        #: other side is said, as the "but" to it.
        other = b if a.note_id == lead.note_id else a
        view = out.views[other.note_id]
        _joined(out, [("but_newer" if other is b else "but_older") if newer else "but_other"], [other], terms)
        out.cite(view, again=True)
        out.t("disagree_check")
        return
    out.t("disagree_lead")
    _quotes(out, [a], terms)
    out.cite(out.views[a.note_id], again=True)
    out.t("space")
    _joined(out, ["but_newer" if newer else "but_other"], [b], terms)
    out.cite(out.views[b.note_id], again=True)


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


def _compare(out: _Answer, sides: tuple[str, str], views: list[NoteView], meaning_for) -> bool:  # noqa: ANN001
    """A line that counts each side, each side its own short list, then what
    speaks of both."""
    a_terms, b_terms = subject_terms(sides[0]), subject_terms(sides[1])
    a_stems, b_stems = {_stem(t) for t in a_terms}, {_stem(t) for t in b_terms}
    a_pick = select("compare", a_terms, views, limit=6, meaning=meaning_for(a_terms))
    b_pick = select("compare", b_terms, views, limit=6, meaning=meaning_for(b_terms))
    both = [s for s in a_pick if b_stems & set(s.words)][:2]
    a_only = [s for s in a_pick if not (b_stems & set(s.words))][:3]
    b_only = [s for s in b_pick if not (a_stems & set(s.words))][:3]
    if not (a_only or b_only):
        return False
    counts = [len({s.note_id for s in picks}) for picks in (a_only, b_only)]
    out.t("of_found")
    for i, (label, n) in enumerate(zip(sides, counts)):
        if i:
            out.t("and")
        out.m(out.count(n)).t("mentions_one" if n == 1 else "mention_many").asked(label)
    out.t("stop", "space", "each_side")
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
            out.t("line").item(s, side_terms).cite(out.views[s.note_id], again=True)
    if both:
        out.t("para", "bold", "both", "bold")
        for s in both:
            out.t("line").item(s, a_terms + b_terms).cite(out.views[s.note_id], again=True)
    return True


#: A question that asks for everything on a subject rather than one fact:
#: answered by how many notes mention it, then the sentence most of them lean
#: towards (`centrality`), then one sentence from each other note.
_BROAD = re.compile(
    r"^\s*(?:what (?:do|did|have) (?:i|we|my notes|you) (?:know|say|said|written|write|wrote|got|have)\b"
    r"|what(?:'s| is) in my notes\b|tell me (?:about|everything)\b|everything (?:about|on)\b"
    r"|summari[sz]e\b|give me an overview\b|(?:an )?overview of\b)",
    re.I,
)

#: A broad question names at most this many notes, one sentence each.
BROAD_NOTES = 5


def _asked_span(question: str, terms: list[str]) -> str:
    """The question's subject as typed, from its first subject word to its
    last ("half marathon training plan"), or "" when they are not in order."""
    lower = (question or "").lower()
    if not terms:
        return ""
    start = lower.find(terms[0])
    end = lower.rfind(terms[-1])
    if start < 0 or end < start:
        return ""
    return question[start : end + len(terms[-1])]


def _mentions(out: _Answer, question: str, terms: list[str], views: list[NoteView]) -> bool:
    """"At least four of your notes mention “sourdough”, from 7 September to
    3 October." "At least": the notes found are some of the notebook, and the
    count is of those. False when fewer than two do, which is not news."""
    stems = {_stem(t) for t in terms}
    subject = _asked_span(question, terms)
    if not stems or not subject:
        return False
    holding = [v for v in views if stems <= (v.words | v.title_words | v.filed_words) and not v.note.get("connected")]
    if len(holding) < 2:
        return False
    out.t("mention_lead").m(out.count(len(holding))).t("mention_mid", "open_quote")
    out.asked(subject).t("close_quote")
    _span(out, holding)
    out.t("stop", "space")
    return True


def _broad_pool(out: _Answer, chosen: list[Sentence], terms: list[str]) -> list[Sentence]:
    """One sentence from each note a broad question is about: the chosen ones,
    and for a note that holds the subject in its name or its tags but whose
    sentences scored under the floor, its best-scored sentence, so "at least
    three of your notes" is followed by three notes."""
    stems = {_stem(t) for t in terms}
    pool = list(chosen)
    have = {s.note_id for s in pool}
    for view in sorted(out.views.values(), key=lambda v: v.rank):
        if len(pool) >= BROAD_NOTES:
            break
        if view.id in have or view.note.get("connected") or not stems or not stems <= (view.words | view.title_words | view.filed_words):
            continue
        prose = [s for s in view.sentences if s.kind == "prose"]
        if prose:
            best = max(prose, key=lambda s: (s.score, -s.order))
            pool.append(best)
            have.add(view.id)
    return pool


def _body(
    out: _Answer,
    shape: str,
    chosen: list[Sentence],
    terms: list[str],
    question: str,
    meaning: _Meaning,
    broad: bool,
    skip: set[tuple],
) -> Sentence:
    """The lead and the points under it, laid out by the question's shape.
    Returns the lead sentence. `skip` are the sentences a "may disagree"
    paragraph says at the end, left out of the body so nothing is said twice."""
    if shape == "status":
        ordered = sorted(chosen, key=lambda s: (out.views[s.note_id].written or date.min, s.score), reverse=True)
        lead = ordered[0]
        view = out.views[lead.note_id]
        same = sorted(_with_context(out, [s for s in ordered if s.note_id == lead.note_id and s.kind == "prose"]), key=lambda s: s.order)
        if view.written:
            key = _pick(question, "lead", ["latest_a", "latest_b"])
            _joined(out, [key], same or [lead], terms, view.written, colon=key == "latest_b")
        else:
            out.t("latest_undated")
            _quotes(out, same or [lead], terms)
        out.cite(view)
        _earlier(out, [s for s in ordered if s.note_id != lead.note_id and s.key not in skip], terms)
        return lead
    lead = chosen[0]
    if shape == "list":
        #: A "which" or "list" question is best answered by a list the person
        #: wrote: the best-placed chosen note that holds one leads.
        listed = [s for s in chosen if sum(1 for u in out.views[s.note_id].sentences if u.kind in ("item", "task")) >= 2]
        if listed:
            lead = listed[0]
            view = out.views[lead.note_id]
            items = [s for s in view.sentences if s.kind in ("item", "task")][:8]
            _list_block(out, view, items, terms, "opening")
            _others(out, meaning, lead, [s for s in chosen if s.note_id != lead.note_id and s.key not in skip], terms, question)
            return lead
    if broad:
        firsts = _broad_pool(out, chosen, terms)
        rank = centrality(firsts, meaning)
        stems = {_stem(t) for t in terms}
        #: The note named for the subject leads ("Sourdough log" for
        #: sourdough); among the rest, the sentence the others lean towards.
        lead = max(
            firsts,
            key=lambda s: (bool(stems) and stems <= out.views[s.note_id].title_words, rank.get(s.key, 0.0) * s.score, -s.rank),
        )
        _mentions(out, question, terms, list(out.views.values()))
        _lead_block(out, shape, lead, [lead], terms, question)
        _others(out, meaning, lead, [s for s in firsts if s.note_id != lead.note_id and s.key not in skip], terms, question)
        return lead
    _lead_block(out, shape, lead, chosen, terms, question)
    rest = [s for s in chosen if s.note_id != lead.note_id and s.key not in skip]
    if shape in FACT_SHAPES:
        keep = list(dict.fromkeys(s.note_id for s in rest))[:FACT_OTHERS]
        rest = [s for s in rest if s.note_id in keep]
    if shape == "when" and rest:
        _timeline(out, rest, terms)
        return lead
    _others(out, meaning, lead, rest, terms, question)
    return lead


def _newest(out: _Answer, views: list[NoteView]) -> None:
    """The newest notes, each by its first sentence, newest first."""
    shown = [v for v in views if v.sentences][:5]
    if not shown:
        return
    out.t("newest_lead").m(out.count(len(shown))).t("newest_mid")
    _span(out, shown)
    out.t("end_colon")
    for view in shown:
        out.t("line", "bullet")
        if view.titled:
            out.name(view).dated(view)
        elif view.written:
            out.t("list_from").m(out.day(view.written))
        else:
            out.name(view, cap=True)
        out.t("colon")
        first = view.sentences[0]
        if first.kind == "picture":
            out.t("picture_in").name(view).t("picture_shows").q(first, [])
        else:
            out.q(first, [])


# --- what to ask next -----------------------------------------------------------

#: A suggested question longer than this is not a chip (`followups.MAX_LENGTH`).
NEXT_MAX_CHARS = 90


def _next_questions(question: str, shape: str, terms: list[str], views: list[NoteView], cited: set[int]) -> list[list[tuple]]:
    """Two or three questions the answer opens up, built from what it found and
    did not say (INBOX 725, 5): a tag of the notes it quoted that the question
    did not name, a note it found and did not quote, and the latest on the
    question's own subject. Each is a fixed question around the person's own
    words, so a chip never offers what the notes cannot answer about."""
    asked = {_stem(t) for t in terms} | {_stem(w) for w in query_understanding.search_terms(question)}
    picks: list[list[tuple]] = []
    #: A tag two or more of the notes found share, the question did not name:
    #: a thread through them ("harbor" under a question about beta testers).
    #: One note's tag alone ("admin" on the dentist note) is not a thread.
    holders: dict[str, list[NoteView]] = {}
    for view in sorted(views, key=lambda v: v.rank):
        if view.note.get("connected"):
            continue
        for tag in dict.fromkeys(str(t) for t in (view.note.get("tags") or [])):
            if re.fullmatch(r"\w[\w -]{1,30}", tag) and _words(tag) and not set(_words(tag)) & asked:
                holders.setdefault(tag.lower(), []).append(view)
    shared = [(tag, held) for tag, held in holders.items() if len(held) >= 2 and any(v.id in cited for v in held)]
    if shared:
        tag, held = max(shared, key=lambda pair: (len(pair[1]), -min(v.rank for v in pair[1])))
        view = next(v for v in held if v.id in cited)
        original = next(str(t) for t in view.note.get("tags") or [] if str(t).lower() == tag)
        picks.append([("template", PHRASES["next_tag_a"]), ("filed", original, view.id), ("template", PHRASES["next_tag_b"])])
    #: A note found and not quoted that has something to say about the
    #: question (a sentence of it scored at least half the best), by its name.
    best = max((s.score for v in views for s in v.sentences), default=0.0)
    for view in sorted(views, key=lambda v: v.rank):
        if view.id in cited or view.note.get("connected") or not view.titled:
            continue
        if (view.title_words and view.title_words <= asked) or not any(s.score >= best / 2 > 0 for s in view.sentences):
            continue
        picks.append([("template", PHRASES["next_note_a"]), ("title", view.title, view.id), ("template", PHRASES["next_note_b"])])
        break
    #: The question's own subject, when it is a short name ("dentist
    #: check-up", "sourdough"), asked the other way round in time.
    subject = _asked_span(question, terms)
    if subject and len(subject.split()) == len(terms) <= 3 and shape not in ("status", "recent", "compare"):
        prefix = "next_latest_a" if shape == "when" or _pick(question, "next", ["a", "b"]) == "a" else "next_when_a"
        picks.append([("template", PHRASES[prefix]), ("asked", subject), ("template", PHRASES["next_tag_b"])])
    out = [p for p in picks if len("".join(part[1] for part in p)) <= NEXT_MAX_CHARS]
    return out[:3]


# --- a follow-up, read against the turn before ----------------------------------

_MORE = re.compile(
    r"^\s*(?:tell me more|more|go on|continue|keep going|say more|what else|anything else|and|more please|"
    r"more about (?:that|it|this|those))\s*[?.]*\s*$",
    re.I,
)
_ORDINALS = {"first": 0, "1st": 0, "second": 1, "2nd": 1, "third": 2, "3rd": 2, "fourth": 3, "4th": 3, "fifth": 4, "5th": 4, "last": -1}
_ORDINAL = re.compile(r"\bthe (first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last) (?:one|note)\b", re.I)
_PRONOUN = re.compile(r"\b(it|that|this|them|those|they)\b", re.I)
_BOLD = re.compile(r"\*\*(.+?)\*\*")


@dataclass
class FollowOn:
    """A question read against the turn before it: `question` is what is
    searched for and answered, `previous` the earlier question it leans on,
    `said` the earlier answer (a "tell me more" quotes something new)."""

    question: str
    previous: str
    said: str = ""
    kind: str = "more"


def _named_notes(answer: str) -> list[str]:
    """The notes an earlier composed answer named, in the order it named
    them: its bold names, less the bold words that are not a note's."""
    fixed = {value.strip("* ") for value in PHRASES.values()}
    names: list[str] = []
    for name in _BOLD.findall(answer or ""):
        if name not in fixed and name not in names:
            names.append(name)
    return names


def follow_on(question: str, history: list[dict] | None) -> FollowOn | None:
    """"Tell me more", "what about the second one", "when was that": a
    follow-up that only means something against the turn before (INBOX 725,
    6). None for a question that stands on its own, or with no turn before.

    - "Tell me more" is the earlier question again, quoting what it did not.
    - "The second one" is the second note the earlier answer named.
    - A question whose only subject is "it" or "that" takes the earlier
      question's subject in its place.
    """
    turns = [t for t in (history or []) if str(t.get("question") or "").strip()]
    if not turns:
        return None
    last = turns[-1]
    previous, said = str(last.get("question") or "").strip(), str(last.get("answer") or "")
    text = (question or "").strip()
    if _MORE.match(text):
        #: A "more" after a "more" still means the question before both.
        for turn in reversed(turns):
            if not _MORE.match(str(turn.get("question") or "")):
                previous = str(turn.get("question") or "").strip()
                break
        said = "\n".join(str(t.get("answer") or "") for t in turns[-3:])
        return FollowOn(previous, previous, said, "more")
    ordinal = _ORDINAL.search(text)
    if ordinal:
        names = _named_notes(said)
        index = _ORDINALS[ordinal.group(1).lower()]
        if names and (index == -1 or index < len(names)):
            name = names[index]
            resolved = text[: ordinal.start()] + f"“{name}”" + text[ordinal.end():]
            return FollowOn(resolved, previous, "", "ordinal")
        return None
    if _PRONOUN.search(text) and not [t for t in subject_terms(text) if not _PRONOUN.fullmatch(t)]:
        subject = _asked_span(previous, subject_terms(previous))
        if subject:
            resolved = _PRONOUN.sub(lambda _match: subject, text, count=1)
            return FollowOn(resolved, previous, "", "pronoun")
    return None


def _nothing(shape: str) -> dict:
    return {
        "text": PHRASES["nothing"],
        "grounding": [],
        "support": grounding.support("", []),
        "shape": shape,
        "parts": [("template", PHRASES["nothing"])],
        "next": [],
        "next_parts": [],
    }


def compose(
    question: str,
    notes: list[dict],
    *,
    today: date | None = None,
    recent: bool = False,
    embed=None,  # noqa: ANN001
    said: str = "",
) -> dict:
    """`{"text", "grounding", "support", "shape", "parts", "next", "next_parts"}`
    for one question.

    `notes` are the route's retrieved notes, ranked (each with `id`,
    `content`, and `written` or `created_at`). `recent` is the retrieval's
    "newest notes" mode: a question with a time and no subject. `embed`, when
    given, is the embedder's `embed_many` (texts in, vectors out): meaning is
    then measured by cosine, and without it by shared words. `said` is the
    earlier answer a "tell me more" follows (`follow_on`): what it quoted is
    left out.
    """
    today = today or date.today()
    views_list = [v for v in (read_note(n, i) for i, n in enumerate(notes or [])) if v]
    out = _Answer({v.id: v for v in views_list}, today)
    shape = "recent" if recent else classify(question)
    terms = subject_terms(question) if shape != "recent" else []

    def meaning_for(side_terms: list[str]) -> _Meaning:
        pool = sorted(_score(shape, side_terms, views_list), key=lambda s: (-s.score, s.rank, s.order))[:MEANING_POOL]
        return _Meaning(pool, embed, {_stem(t) for t in side_terms})

    if shape == "recent":
        _newest(out, views_list)
    else:
        sides = compare_sides(question) if shape == "compare" else None
        if not (sides and _compare(out, sides, views_list, meaning_for)):
            shape = "what" if shape == "compare" else shape
            broad = shape == "what" and bool(_BROAD.match(question or ""))
            meaning = meaning_for(terms)
            chosen = select(
                shape, terms, views_list,
                limit=BROAD_NOTES if broad else MAX_POINTS,
                meaning=meaning,
                per_note=1 if broad else MAX_PER_NOTE,
                said=said,
            )
            if not chosen:
                return _nothing(shape)
            pair = _disagreement(chosen)
            lead = _body(out, shape, chosen, terms, question, meaning, broad, {s.key for s in pair} if pair else set())
            if pair:
                _disagreements(out, pair, lead, terms)
            _missing(out, terms, views_list)
    if not out.rows:
        return _nothing(shape)
    quotes = "\n\n".join(row["sentence"] for row in out.rows)
    cited = {row["note_id"] for row in out.rows}
    next_parts = _next_questions(question, shape, terms, views_list, cited)
    return {
        "text": out.text,
        "grounding": out.rows,
        #: Counted over the quotes, the only claims an answer here makes: the
        #: connective phrases are not claims, and counting them as sentences
        #: "no note backs" would report a wholly quoted answer as half made up.
        "support": grounding.support(quotes, out.rows),
        "shape": shape,
        "parts": out.parts,
        "next": ["".join(part[1] for part in parts) for parts in next_parts],
        "next_parts": next_parts,
    }


# --- the brief a running model reads ------------------------------------------------

#: At most this many sentences quoted for a model, and this many from one note.
#: Twice an answer's: the model writes the answer, so it is handed the
#: material for one with room to choose, not the composer's choice alone.
BRIEF_POINTS = 12
BRIEF_PER_NOTE = 4
#: A note whose quoted parts come to this share of it goes whole: the cut
#: would save a few characters and cost the model the sentences around them.
BRIEF_WHOLE = 0.8


def _raw(content: str, s: Sentence) -> str:
    """The sentence as the note has it: the offsets, not the cleaned text, so a
    model reads (and the grounding pass later matches) the person's words."""
    return " ".join(content[s.start : s.end].split())


def brief(
    question: str,
    notes: list[dict],
    *,
    recent: bool = False,
    embed=None,  # noqa: ANN001
    composed: dict | None = None,
) -> dict | None:
    """The notes a running model reads, composed (CHAT_PLAN, "the composer
    everywhere" 9 and 10, the owner: "the composer should be used to lessen
    the load ... as well as cheapen the run cost of the ai").

    Every note stays, in its place, with its id and every other field the
    prompt reads (category, dates, tags, the connected flag), so nothing the
    model was told about a note is lost and nothing is renumbered. Only
    `content` changes, and only for a retrieved note whose text is longer than
    what bears on the question:

    - a note with sentences the composer chose keeps its name and those
      sentences, in the note's order, "…" where text was left out;
    - a note with none keeps its name and its first sentence: retrieval found
      it by meaning or by a link, and the question's words may not be in it;
    - a note attached by hand, a document, a file or a mind map goes whole: the
      person chose it, it is the subject;
    - a note the cut would barely shorten (`BRIEF_WHOLE`) goes whole.

    A shortened note carries `briefed: True`; `librarian.note_for_prompt` says
    so after it, naming `get_note` when the model has tools. None when there is
    nothing to brief: a "newest notes" question (the newest are the subject),
    or no sentence chosen at all (the composer has no reading of the question,
    and the notes as they are are the honest fallback).

    `composed` is `compose()`'s result for the same question, when the caller
    has it (the route does: it shows it while the model writes).

    Returns `{"notes", "quoted", "shortened", "chars_before", "chars_after"}`.
    """
    if recent or not notes:
        return None
    shape = classify(question)
    terms = subject_terms(question)
    views: dict[int, NoteView] = {}
    for i, note in enumerate(notes):
        if note.get("attached") or not isinstance(note.get("id"), int):
            continue
        view = read_note(note, i)
        if view is not None:
            views[i] = view
    candidates = list(views.values())
    pool = sorted(_score(shape, terms, candidates), key=lambda s: (-s.score, s.rank, s.order))[:MEANING_POOL]
    chosen = select(
        shape, terms, candidates,
        limit=BRIEF_POINTS,
        meaning=_Meaning(pool, embed, {_stem(t) for t in terms}),
        per_note=BRIEF_PER_NOTE,
    )
    if not chosen:
        return None
    by_note: dict[int, list[Sentence]] = {}
    for s in chosen:
        by_note.setdefault(s.note_id, []).append(s)
    #: Everything the composed answer quotes is in the brief too, whatever the
    #: caps above left out (a long checklist, the two sides of a compare): the
    #: answer shown while the model writes (`routes_chat`) never says a thing
    #: the model was not shown.
    composed = composed if composed is not None else compose(question, notes, recent=recent, embed=embed)
    spans = {(row["note_id"], row["start"]) for row in composed.get("grounding") or []}
    for view in candidates:
        for s in view.sentences:
            if (view.id, s.start) in spans and s not in by_note.get(view.id, []):
                by_note.setdefault(view.id, []).append(s)
    out: list[dict] = []
    shortened = before = after = 0
    for i, note in enumerate(notes):
        content = str(note.get("content") or "")
        before += len(content)
        view = views.get(i)
        text = _brief_text(view, content, by_note) if view else None
        if text is None or len(text) >= BRIEF_WHOLE * len(content.strip()):
            out.append(note)
            after += len(content)
            continue
        out.append({**note, "content": text, "briefed": True})
        after += len(text)
        shortened += 1
    return {
        "notes": out,
        "quoted": sum(len(kept) for kept in by_note.values()),
        "shortened": shortened,
        "chars_before": before,
        "chars_after": after,
    }


def _brief_text(view: NoteView, content: str, by_note: dict[int, list[Sentence]]) -> str:
    """One note's part of the brief: its name, then the sentences kept."""
    if view.id in by_note:
        picked = sorted(by_note[view.id], key=lambda s: s.order)
    else:
        picked = view.sentences[:1]
    parts: list[str] = []
    #: An untitled note is named by its first words; when its first sentence
    #: is kept, the name would only say those words twice.
    opens_with_name = bool(picked) and picked[0].order == 0 and _raw(content, picked[0]).startswith(view.title.rstrip("…"))
    if view.title and not opens_with_name:
        parts.append(view.title)
    last = -1
    for s in picked:
        if parts and s.order != last + 1:
            parts.append("…")
        parts.append(_raw(content, s))
        last = s.order
    if last < len(view.sentences) - 1:
        parts.append("…")
    return " ".join(parts)
