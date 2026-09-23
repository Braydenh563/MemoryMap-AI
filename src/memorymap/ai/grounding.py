"""ROADMAP.md item 36: per-sentence grounding for a direct Q&A answer.

`match_info` already says which retrieved notes backed the answer as a
whole; `unsupported_claims` already checks the agent's own narrated actions
in full agentic chat; link `reason`/`reason_confidence` already grounds a
connection between two notes. None of the three says which *sentence* in a
direct Q&A answer came from which note, this is that gap, and only that
gap: scoped to the direct Q&A path (`POST /chat`, non-conversational), not
the agentic one, where `unsupported_claims` already does the related job.

Deliberately not a second LLM call (a "lightweight... pass" per the roadmap
text, and every extra model round trip is latency on the one path where the
answer is already sitting in front of someone waiting for it): scored by
shared meaningful words between a sentence and each retrieved note, the same
signal `search_manager._meaningful_terms` already uses to rank keyword
matches, and then, between the notes that clear that bar, by BM25 over the
candidate set's passages (CHAT_PLAN decision 2). A ranking is either right or
a little off; a claim ledger that's wrong is worse than none, so this only
ever attaches a note when the overlap is real enough to trust, and says
nothing rather than guessing at the rest.

The set that says whether any of it works is
`tests/fixtures/chat/grounding_cases.json`, scored by
`tests/test_grounding_fixtures.py`.
"""

from __future__ import annotations

import math
import re
from collections import Counter

from memorymap.search.search_manager import _meaningful_terms

# Below this fraction of a sentence's own meaningful words being found in a
# note, the "match" is coincidence (shared stopword-adjacent filler) rather
# than the note actually backing that sentence, better to say nothing.
MIN_OVERLAP_RATIO = 0.4

# A sentence this short (a "Sure." or a lone connective) is not a claim
# worth grounding, and the odds of it "matching" every note by chance are
# too high to be useful.
MIN_SENTENCE_WORDS = 4

# The second signal, added after the owner reported an answer that named
# three notes and cited one. A model paraphrases: "you planned to carry the
# new boots up Snowdon" shares three words with a twelve-word sentence, well
# under MIN_OVERLAP_RATIO, and yet nobody reading it doubts which note it
# came from, because "boots" and "Snowdon" occur in exactly one candidate.
# So a sentence carrying at least DISTINCTIVE_MIN_TERMS words that only one
# candidate note contains is grounded to that note from DISTINCTIVE_MIN_RATIO
# up. Distinctiveness is measured against the other candidates, so with a
# single candidate every word is "distinctive" and the signal says nothing;
# the rule therefore needs two or more notes to apply at all.
DISTINCTIVE_MIN_RATIO = 0.2
DISTINCTIVE_MIN_TERMS = 2

#: One space, not `\s+`: `split_sentences` collapses every whitespace run to a
#: single space first (one linear pass), so the split itself has no
#: quantifier to backtrack over. CodeQL (alert 425) flagged the `\s+` form as
#: polynomial on an answer with a long run of tabs.
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?]) (?=[A-Z\d])")
_WHITESPACE_RUN = re.compile(r"\s+")

#: **How long a passage is** (CHAT_PLAN decision 2). Forty words is about two
#: sentences of prose: long enough that a paraphrased claim and its source
#: share more than one word, short enough that highlighting it points at
#: something rather than at the note. The windows overlap by half, so a claim
#: that straddles a boundary is whole inside the next window along instead of
#: being split between two that each score badly.
PASSAGE_WORDS = 40
PASSAGE_STRIDE = 20

#: BM25's two knobs, at the values everybody uses and nobody has had reason to
#: change: `k1` is how fast a repeated word stops adding to the score, `b` is
#: how hard a long passage is penalised for its length. They are here as names
#: rather than as numbers in the formula because the next person to calibrate
#: this (Brief 12's fixtures) needs to see them.
BM25_K1 = 1.5
BM25_B = 0.75

#: **How close a second note has to be to earn its own mark** (CHAT_PLAN
#: decision 2's open half, calibrated on `tests/fixtures/chat/grounding_cases.json`
#: and measured in CHAT_PLAN Phase 1). A sentence that is genuinely about two
#: notes scores nearly the same against both: on the fixture set the case that
#: is about two (a dentist and a car service on the same day) scores 4.12 and
#: 3.85, a ratio of 0.93, while the case where the second mark was wrong (a
#: claim from the landlord's letter, also cited to a flat-hunting note that
#: happens to contain "give notice" in another paragraph) scores 6.02 and 3.32,
#: a ratio of 0.55. 0.75 sits between them with about 0.18 of margin either
#: way. It is a *ratio* rather than an absolute score because the score itself
#: moves with how many passages the candidate set has and how long the sentence
#: is, so no fixed number would survive a different-sized answer.
PASSAGE_SECOND_RATIO = 0.75

_WORD = re.compile(r"[^\W_]+", re.UNICODE)


def _words_with_offsets(text: str) -> list[tuple[str, int, int]]:
    """Every word of a note, lowercased, with where it starts and ends.

    The offsets are what make a passage highlightable: the score is computed
    over words and the answer has to come back as a character span, so the two
    are carried together from the start rather than the span being searched for
    again afterwards against text that may repeat.
    """
    return [(m.group(0).lower(), m.start(), m.end()) for m in _WORD.finditer(text or "")]


def _passages(text: str) -> list[tuple[int, int, list[str]]]:
    """The note as overlapping windows: `(start, end, words)` each.

    A note shorter than one window is one passage, which is the honest answer
    rather than a window padded out to length: highlighting the whole of a
    two-line note is exactly right.
    """
    words = _words_with_offsets(text)
    if not words:
        return []
    if len(words) <= PASSAGE_WORDS:
        return [(words[0][1], words[-1][2], [w for w, _, _ in words])]
    out: list[tuple[int, int, list[str]]] = []
    for i in range(0, len(words), PASSAGE_STRIDE):
        chunk = words[i : i + PASSAGE_WORDS]
        if not chunk:
            break
        out.append((chunk[0][1], chunk[-1][2], [w for w, _, _ in chunk]))
        if i + PASSAGE_WORDS >= len(words):
            break
    return out


def best_passage(sentence: str, content: str) -> tuple[int, int, float] | None:
    """Where in `content` this sentence is most likely to have come from.

    **BM25 over the note's own passages** (CHAT_PLAN decision 2), which is to
    say: a term is worth more here the fewer of *this note's* passages contain
    it. That is the whole trick, and it is why plain term counting cannot do
    this job: a note about sourdough says "starter" in every paragraph, so
    "starter" says nothing about *which* paragraph a claim came from, while
    "rye" in one passage of six says a great deal. Document frequency is
    therefore counted within the note rather than across the notebook, where it
    would measure how unusual a word is in general instead of where it is here.

    Returns `(start, end, score)` in character offsets, or None when the
    sentence and the note share no meaningful word at all: a span guessed from
    nothing would be a highlight pointing at an arbitrary paragraph, which
    reads as the app being confidently wrong rather than quiet.
    """
    terms = _meaningful_terms(sentence)
    passages = _passages(content)
    if not terms or not passages:
        return None
    frequency = Counter()
    for _start, _end, words in passages:
        for term in set(words):
            frequency[term] += 1
    total = len(passages)
    average_length = sum(len(words) for _, _, words in passages) / total
    #: The sentence's own numbers ("47 boxes", "the 14th"), which decision 2
    #: asks for a second check on: a passage that carries the figure a claim
    #: quotes is the passage the claim came from, whatever the word overlap
    #: says. Applied as a tie-break-sized bonus rather than a filter, because a
    #: model paraphrasing "a couple of hundred" from "180" would otherwise be
    #: left unhighlighted.
    figures = _figures(sentence)

    best: tuple[int, int, float] | None = None
    for start, end, words in passages:
        score = _bm25(terms, Counter(words), len(words), frequency, total, average_length)
        if figures and figures & set(words):
            score += 0.5
        if score > 0 and (best is None or score > best[2]):
            best = (start, end, round(score, 3))
    return best


def _figures(sentence: str) -> set[str]:
    """The sentence's own numbers ("47 boxes", "the 14th").

    Decision 2 asks for a second check on these: a passage that carries the
    figure a claim quotes is the passage the claim came from, whatever the word
    overlap says. Applied as a tie-break-sized bonus rather than a filter,
    because a model paraphrasing "a couple of hundred" from "180" would
    otherwise be left unhighlighted.
    """
    return {term for term in _WORD.findall(sentence.lower()) if term.isdigit()}


def _bm25(
    terms: list[str],
    counts: Counter,
    length: int,
    frequency: Counter,
    total: int,
    average_length: float,
) -> float:
    """One passage's BM25 score against one sentence's terms.

    The formula is here once because two callers need it over two different
    populations: `best_passage` counts document frequency inside one note (which
    paragraph of this note?) and `_note_passage_scores` counts it across every
    candidate note (which note?). The population is the whole difference between
    the two questions, so it is an argument rather than a second copy of this.

    It takes a passage's word counts rather than its words because the counts do
    not change between sentences and the sentences are a loop around this: see
    `_pool_passages`.
    """
    score = 0.0
    for term in terms:
        found = counts.get(term, 0)
        if not found:
            continue
        #: The +1 inside the log keeps the idf positive for a term in every
        #: passage: BM25's textbook idf goes negative there, which would
        #: make a common word count *against* the passage holding it.
        idf = math.log(1 + (total - frequency[term] + 0.5) / (frequency[term] + 0.5))
        denominator = found + BM25_K1 * (1 - BM25_B + BM25_B * length / average_length)
        score += idf * (found * (BM25_K1 + 1)) / denominator
    return score


def _pool_passages(notes: list[dict]) -> tuple[list[tuple[int, Counter, int, set]], Counter, float]:
    """Every candidate note's passages in one population, with its statistics.

    Built once per answer rather than once per sentence: the passages, their
    word counts and their document frequencies are all properties of the
    candidate set, and an answer of twelve sentences over nine notes would
    otherwise re-window and re-count the same notes twelve times.

    Measured, twelve sentences, counting inside the sentence loop against
    counting here: nine notes of 500 words, 23.3 ms an answer against 16.4;
    nine of 2,000 words, 93.7 against 74.8; twenty of 500, 44.6 against 29.4.
    The rest of the 2,000-word figure is `best_passage`, which re-windows one
    note per mark and is left alone: it is the span rather than the note, it
    runs once per mark rather than once per candidate per sentence, and this
    whole pass happens after the last token has streamed rather than between
    them.
    """
    pooled: list[tuple[int, Counter, int, set]] = []
    for note in notes:
        note_id = note.get("id")
        if note_id is None:
            continue
        for _start, _end, words in _passages(note.get("content") or ""):
            counts = Counter(words)
            pooled.append((note_id, counts, len(words), set(counts)))
    frequency: Counter = Counter()
    for _note_id, _counts, _length, unique in pooled:
        for term in unique:
            frequency[term] += 1
    average_length = (
        sum(length for _n, _c, length, _u in pooled) / len(pooled) if pooled else 0.0
    )
    return pooled, frequency, average_length


def _note_passage_scores(sentence: str, pool) -> dict[int, float]:
    """Each candidate note's best passage, scored against this sentence.

    **This is the "which note" half of CHAT_PLAN decision 2**, and it is a
    different question from `best_passage`'s, which is why the document
    frequency is counted over every candidate's passages rather than inside one
    note: a word that appears in every candidate ("sourdough", when both notes
    are about sourdough) cannot tell them apart and must not carry the choice,
    while inside a single note that same word is exactly what tells its
    paragraphs apart. Counting within the note and then comparing the numbers
    across notes, which is the shape this replaced, compares scores computed
    against different populations: a long note's idf is larger term for term,
    so the longer note would win for being longer.
    """
    pooled, frequency, average_length = pool
    terms = _meaningful_terms(sentence)
    if not terms or not pooled:
        return {}
    total = len(pooled)
    figures = _figures(sentence)
    best: dict[int, float] = {}
    for note_id, counts, length, unique in pooled:
        score = _bm25(terms, counts, length, frequency, total, average_length)
        if figures and figures & unique:
            score += 0.5
        if score > 0 and score > best.get(note_id, 0.0):
            best[note_id] = round(score, 3)
    return best


def note_passage_scores(sentence: str, notes: list[dict]) -> dict[int, float]:
    """`{note_id: score}` for one sentence against a candidate set.

    The public form of `_note_passage_scores`, for the fixture harness
    (`tests/test_grounding_fixtures.py`) and for anything that wants to see the
    margin between the note that was cited and the one that was not.
    """
    return _note_passage_scores(sentence, _pool_passages(notes))



#: A line that opens a new block when rendered: a heading, a quote, a list
#: item. Its marker is not part of any sentence, because the rendered block
#: does not print it.
_BLOCK_START = re.compile(r"^ {0,3}(?:#{1,6}\s+|>\s?|[-*+]\s+|\d{1,3}[.)]\s+)")


def _blocks(text: str) -> list[str]:
    """The answer's rendered blocks, as plain lines of prose.

    **A sentence never runs across two of them** (INBOX 318). The splitter
    below cuts on `.!?` followed by a capital, and a model's answer is not
    shaped like that at its block edges: "Here is what your notes say:"
    followed by a list is a colon and then a `-`, so the lead-in and the first
    item came back as one "sentence". That string exists in no single
    paragraph on screen, and the client, which places a marker by finding the
    sentence in the rendered text, could never find it: measured, a formatted
    answer grounded to three notes and showed no marker at all.

    A blank line ends a block, and so does a line that starts one (a heading,
    a quote, a list item), whose marker is dropped because the rendered block
    does not print it. Any other line break is a soft break inside a
    paragraph and is joined with a space, as the renderer joins it.
    """
    blocks: list[str] = []
    current: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        start = _BLOCK_START.match(line)
        if not stripped or start:
            if current:
                blocks.append(" ".join(current))
            current = []
            if start:
                stripped = line[start.end() :].strip()
        if stripped:
            current.append(stripped)
    if current:
        blocks.append(" ".join(current))
    return blocks


def split_sentences(text: str) -> list[str]:
    """Plain sentences, block by block: split on `.!?` followed by whitespace
    and a capital/digit, which misses some abbreviations but never merges two
    real sentences, the safer direction for a feature that would rather
    ground too little than mis-ground something."""
    if not text:
        return []
    # Skip fenced code blocks entirely, grounding a line of code against
    # note *prose* is a category error, not a claim. An unclosed fence runs to
    # the end: mid-stream the closing one has simply not arrived yet
    # (`SentenceGrounder`), and half a code block is still code.
    cleaned = re.sub(r"```.*?(?:```|\Z)", "", text, flags=re.DOTALL)
    return [
        s.strip()
        for block in _blocks(cleaned)
        for s in _SENTENCE_SPLIT.split(_WHITESPACE_RUN.sub(" ", block))
        if s.strip()
    ]


def _word_set(text: str) -> set[str]:
    return set(_meaningful_terms(text))


def ground_answer_sentences(answer: str, notes: list[dict]) -> list[dict]:
    """One entry per (sentence, supporting note): `{"sentence": str,
    "note_id": int}`. Sentences with no note clearing either threshold, or
    too short to score meaningfully, are omitted: the caller (and the
    frontend badge) treats "not in this list" as "not grounded", never as
    "grounded to nothing", so omission is always safe.

    A sentence usually gets one note, the best overlap. It gets a second
    only when that note is named by its own distinctive words too ("feed the
    starter before you take the boots up Snowdon" is about both notes), never
    by vocabulary the two notes share, which is the case the single-best rule
    exists to keep honest.

    **Which of the eligible notes is named, and whether a second one is,** is
    decided by the passage score (`_note_passage_scores`), which is decision
    2's open half. The word rules above decide *whether* a sentence is
    supported at all and are unchanged: they were tuned against reported
    answers, and on the fixture set they produce no false mark and miss nothing
    a lexical scorer can reach, so there was nothing for a second support rule
    to add. What they were measurably wrong about is a second mark earned by
    two distinctive words scattered through a note that never says the thing,
    which is exactly what no single passage of it can score.
    """
    if not answer or not notes:
        return []
    return SentenceGrounder(notes).finish(answer)


class SentenceGrounder:
    """`ground_answer_sentences`, one completed sentence at a time.

    **INBOX 320**: the Ask tab's Matching records column numbered its rows
    only once the answer had finished, because grounding ran once, over the
    whole text, after the last token. The numbers are the answer's own
    citations, so a record can be numbered no earlier than the sentence citing
    it exists; this is what lets it be numbered no later either. Each sentence
    is scored on its own against the candidate set (nothing in the rules looks
    at a neighbouring sentence), so grounding them as they complete gives the
    same rows as grounding them all at the end, which
    `test_the_live_grounder_marks_each_sentence_once_it_is_complete` holds.

    Everything that depends only on the candidate notes (their word sets, the
    words only one of them has, the pooled passages) is computed once here
    rather than once per call, since `feed` is called every time a sentence
    may have ended.

    A sentence is complete once another has started after it, which is the
    only evidence a stream gives: `feed` grounds every sentence but the last,
    and `finish` grounds the rest when the stream says there is no more.
    """

    def __init__(self, notes: list[dict]) -> None:
        self.rows: list[dict] = []
        self._consumed = 0
        self._contents = {
            note.get("id"): (note.get("content") or "")
            for note in notes
            if note.get("id") is not None
        }
        note_words = [(note.get("id"), _word_set(note.get("content") or "")) for note in notes]
        self._note_words = [(nid, words) for nid, words in note_words if nid is not None and words]
        counts = Counter(word for _, words in self._note_words for word in words)
        self._distinctive = (
            [{w for w in words if counts[w] == 1} for _, words in self._note_words]
            if len(self._note_words) >= 2
            else [set() for _ in self._note_words]
        )
        self._pool = _pool_passages(notes) if self._note_words else ([], Counter(), 0.0)

    def feed(self, text: str) -> list[dict]:
        """The rows for every sentence completed since the last call."""
        return self._consume(split_sentences(text)[:-1])

    def finish(self, text: str) -> list[dict]:
        """The rows for the sentences `feed` had not yet counted complete."""
        return self._consume(split_sentences(text))

    def _consume(self, sentences: list[str]) -> list[dict]:
        new: list[dict] = []
        for sentence in sentences[self._consumed :]:
            new.extend(self.ground(sentence))
        self._consumed = max(self._consumed, len(sentences))
        self.rows.extend(new)
        return new

    def ground(self, sentence: str) -> list[dict]:
        """The rows for one sentence: none, its best note, or two notes."""
        if not self._note_words:
            return []
        sentence_words = _word_set(sentence)
        if len(sentence_words) < MIN_SENTENCE_WORDS:
            return []
        scored: list[tuple[float, int, int]] = []
        for (note_id, words), unique in zip(self._note_words, self._distinctive):
            ratio = len(sentence_words & words) / len(sentence_words)
            hits = len(sentence_words & unique)
            if ratio >= MIN_OVERLAP_RATIO or (
                ratio >= DISTINCTIVE_MIN_RATIO and hits >= DISTINCTIVE_MIN_TERMS
            ):
                scored.append((ratio, hits, note_id))
        if not scored:
            return []
        passage_scores = _note_passage_scores(sentence, self._pool)
        #: Passage score first, the word ratio behind it: a note with no
        #: passage score at all (nothing in it matched, which happens when the
        #: word rules passed on distinctive terms alone) keeps its old place in
        #: the order rather than being dropped.
        scored.sort(key=lambda row: (passage_scores.get(row[2], 0.0), row[0], row[1]), reverse=True)
        primary = scored[0][2]
        rows = [_mark(sentence, primary, self._contents)]
        top = passage_scores.get(primary, 0.0)
        for _ratio, hits, note_id in scored[1:]:
            if hits < DISTINCTIVE_MIN_TERMS:
                continue
            if top and passage_scores.get(note_id, 0.0) < top * PASSAGE_SECOND_RATIO:
                continue
            rows.append(_mark(sentence, note_id, self._contents))
        return rows


#: Below this, an answer is mostly the model talking rather than the notebook
#: answering, and the app says so. Brief 12's number, kept: "the 'I don't know'
#: copy is triggered when < 50% of sentences are supported".
LOW_SUPPORT_RATIO = 0.5

#: And under this many scoreable sentences there is no ratio worth reading. One
#: sentence is either marked or not, and calling a single unmarked sentence "0%
#: supported" would put a warning over every one-line answer, including the
#: honest short ones ("You have no notes about that."), which teaches people to
#: ignore the warning.
LOW_SUPPORT_MIN_SENTENCES = 2


def support(answer: str, grounded: list[dict]) -> dict:
    """How much of this answer the notebook actually backs.

    CHAT_PLAN Phase 1's fourth gate line. The marks have always said which
    sentences are supported; nothing said how much of the answer that was, so
    an answer with one cited sentence in six looked, at a glance, exactly like
    one with six in six.

    Counted from `split_sentences` and `MIN_SENTENCE_WORDS`, the same two rules
    `ground_answer_sentences` uses to decide what it will even try to mark, so
    the denominator can never disagree with the thing it is a denominator of. A
    sentence too short to score is not evidence of anything either way and is
    left out of both halves.

    `grounded` may hold two rows for one sentence (a sentence about two notes),
    so the numerator is over distinct sentences, not over rows.
    """
    eligible = [s for s in split_sentences(answer or "") if len(_word_set(s)) >= MIN_SENTENCE_WORDS]
    marked = {row.get("sentence") for row in (grounded or []) if row.get("sentence")}
    hit = sum(1 for sentence in eligible if sentence in marked)
    total = len(eligible)
    ratio = (hit / total) if total else 0.0
    return {
        "supported": hit,
        "sentences": total,
        "ratio": round(ratio, 3),
        #: The judgement travels with the numbers, so the frontend and any
        #: future caller cannot each pick their own threshold.
        "low": total >= LOW_SUPPORT_MIN_SENTENCES and ratio < LOW_SUPPORT_RATIO,
    }


def _mark(sentence: str, note_id: int, contents: dict[int, str]) -> dict:
    """One grounding row, with the passage located inside its note.

    **The note has already been chosen** by the caller (the word rules for
    whether, `_note_passage_scores` for which); this locates the span inside
    it, so a mark can point at the sentence's source rather than at a whole
    note, which is what the renderer and the hover highlight need. The span
    comes from `best_passage`, scored inside the note, for the reason its
    docstring gives: between two paragraphs of one note, a word the whole
    candidate set shares is still the word that tells them apart.

    `start`/`end` stay absent rather than null when there is no passage worth
    naming; the frontend already reads a missing span as "no highlight".
    """
    row = {"sentence": sentence, "note_id": note_id}
    passage = best_passage(sentence, contents.get(note_id, ""))
    if passage:
        row["start"], row["end"], row["score"] = passage
    return row
