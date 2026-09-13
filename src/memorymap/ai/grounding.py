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
matches. A ranking is either right or a little off; a claim ledger that's
wrong is worse than none, so this only ever attaches a note when the overlap
is real enough to trust, and says nothing rather than guessing at the rest.
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

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z\d])")

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
    figures = {term for term in _WORD.findall(sentence.lower()) if term.isdigit()}

    best: tuple[int, int, float] | None = None
    for start, end, words in passages:
        counts = Counter(words)
        length = len(words)
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
        if figures and figures & set(words):
            score += 0.5
        if score > 0 and (best is None or score > best[2]):
            best = (start, end, round(score, 3))
    return best



def split_sentences(text: str) -> list[str]:
    """Plain sentences, code fences and bullet markers stripped least-
    invasively: split on `.!?` followed by whitespace and a capital/digit,
    which misses some abbreviations but never merges two real sentences, 
    the safer direction for a feature that would rather ground too little
    than mis-ground something."""
    if not text:
        return []
    # Skip fenced code blocks entirely, grounding a line of code against
    # note *prose* is a category error, not a claim.
    cleaned = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    return [s.strip() for s in _SENTENCE_SPLIT.split(cleaned) if s.strip()]


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
    """
    if not answer or not notes:
        return []
    contents = {
        note.get("id"): (note.get("content") or "") for note in notes if note.get("id") is not None
    }
    note_words = [(note.get("id"), _word_set(note.get("content") or "")) for note in notes]
    note_words = [(nid, words) for nid, words in note_words if nid is not None and words]
    if not note_words:
        return []
    counts = Counter(word for _, words in note_words for word in words)
    distinctive = (
        [{w for w in words if counts[w] == 1} for _, words in note_words]
        if len(note_words) >= 2
        else [set() for _ in note_words]
    )

    grounded: list[dict] = []
    for sentence in split_sentences(answer):
        sentence_words = _word_set(sentence)
        if len(sentence_words) < MIN_SENTENCE_WORDS:
            continue
        scored: list[tuple[float, int, int]] = []
        for (note_id, words), unique in zip(note_words, distinctive):
            ratio = len(sentence_words & words) / len(sentence_words)
            hits = len(sentence_words & unique)
            if ratio >= MIN_OVERLAP_RATIO or (
                ratio >= DISTINCTIVE_MIN_RATIO and hits >= DISTINCTIVE_MIN_TERMS
            ):
                scored.append((ratio, hits, note_id))
        if not scored:
            continue
        scored.sort(reverse=True)
        grounded.append(_mark(sentence, scored[0][2], contents))
        for _ratio, hits, note_id in scored[1:]:
            if hits >= DISTINCTIVE_MIN_TERMS:
                grounded.append(_mark(sentence, note_id, contents))
    return grounded


def _mark(sentence: str, note_id: int, contents: dict[int, str]) -> dict:
    """One grounding row, with the passage located inside its note.

    **Which note grounds a sentence is unchanged here, deliberately.** The
    overlap and distinctive-terms rules above were tuned against reported
    answers and are covered by `tests/test_grounding.py`; CHAT_PLAN decision 2
    asks for BM25 to pick the note as well as the passage, and the threshold
    that would need is "calibrated on the eval fixtures (Brief 12)", which do
    not exist yet. Re-deciding what counts as supported without the fixtures
    that say whether it got better is the trade this project has learned not
    to make. So this adds what can be added honestly today: the span, so a
    mark can point at the sentence's source rather than at a whole note, which
    is what the renderer and the hover highlight need.

    `start`/`end` stay absent rather than null when there is no passage worth
    naming; the frontend already reads a missing span as "no highlight".
    """
    row = {"sentence": sentence, "note_id": note_id}
    passage = best_passage(sentence, contents.get(note_id, ""))
    if passage:
        row["start"], row["end"], row["score"] = passage
    return row
