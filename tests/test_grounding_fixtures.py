"""CHAT_PLAN Phase 1's gate: on the fixture questions, does the mark name the
note the sentence actually came from?

The fixture set is `tests/fixtures/chat/grounding_cases.json` (Brief 12's
"ten fixture questions in `tests/fixtures/chat/`", written as sixteen). Each
case is a question, the notes retrieval would have handed the answer, an
answer written the way a model paraphrases, and the notes each of its
sentences came from. `tests/test_grounding.py` holds the unit cases for the
rules; this file holds the measurement, because "which note grounds a
sentence" is a question about a population of answers rather than about one.

**Three numbers, each its own test**, so a regression says which property
broke: attribution (a supported sentence's marks are the notes it came from),
silence (a sentence that came from nothing carries no mark at all), and the
span (the highlighted passage holds the words the claim was made from).

**What this does not measure.** No model wrote these answers; they are hand
written, and the app's provider tests all run against a fake transport
(CLAUDE.md section 4). So this scores the attribution step given an answer and
a candidate set, which is the part that is ours, and says nothing about how a
real 3B model phrases an answer or whether it follows a citation format.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from memorymap.ai.grounding import ground_answer_sentences, note_passage_scores, split_sentences

CASES = json.loads(
    (Path(__file__).parent / "fixtures" / "chat" / "grounding_cases.json").read_text(
        encoding="utf-8"
    )
)["cases"]

#: The plan's own gate for Phase 1: "≥ 95% of supported sentences carry a mark
#: to the right note (fixtures name the note)".
ATTRIBUTION_GATE = 0.95


def _marks(case: dict) -> dict[str, list[dict]]:
    """Every grounding row this case produces, by the sentence it belongs to."""
    rows = ground_answer_sentences(case["answer"], case["notes"])
    out: dict[str, list[dict]] = {}
    for row in rows:
        out.setdefault(row["sentence"], []).append(row)
    return out


def _reachable(sentence: dict) -> bool:
    """A sentence a scorer working on words can reach at all.

    `reach: embeddings` marks one that shares no content word with its note (a
    synonym, or a bare restatement). Decision 2's second half, cosine over the
    passage window, is what would answer it; every embedding backend in this
    sandbox is the four-dimensional fake, so gating on it would gate on
    nothing. It is asserted separately, as silence rather than a wrong guess.
    """
    return sentence.get("reach") != "embeddings"


def test_the_fixture_answers_split_into_the_sentences_they_declare():
    """The set is only a measurement if the splitter sees the same sentences
    the fixture names; a full stop moved inside a case would otherwise quietly
    score a sentence nobody wrote."""
    for case in CASES:
        declared = [s["text"] for s in case["sentences"]]
        assert split_sentences(case["answer"]) == declared, case["id"]


def test_every_fixture_expectation_names_a_note_in_its_own_case():
    for case in CASES:
        ids = {note["id"] for note in case["notes"]}
        for sentence in case["sentences"]:
            assert set(sentence["note_ids"]) <= ids, f"{case['id']}: {sentence['text'][:40]}"


def test_supported_sentences_are_attributed_to_the_right_note():
    """The Phase 1 gate. Measured 2026-09-20: 18 of 18, 100%.

    Set equality, not order: a sentence about two notes gets two marks and
    which superscript is drawn first is not a claim about anything, while a
    mark naming a note the sentence did not come from is the failure this
    exists to catch, so an extra mark counts against.
    """
    total = hits = 0
    misses = []
    for case in CASES:
        marks = _marks(case)
        for sentence in case["sentences"]:
            expected = set(sentence["note_ids"])
            if not expected or not _reachable(sentence):
                continue
            total += 1
            got = {row["note_id"] for row in marks.get(sentence["text"], [])}
            if got == expected:
                hits += 1
            else:
                misses.append(f"{case['id']}: want {sorted(expected)}, got {sorted(got)}")
    assert total >= 15, "the set has shrunk below what the gate was measured on"
    assert hits / total >= ATTRIBUTION_GATE, (
        f"attribution {hits}/{total} = {100 * hits / total:.1f}%, "
        f"under the plan's {100 * ATTRIBUTION_GATE:.0f}%:\n" + "\n".join(misses)
    )


def test_a_sentence_that_came_from_nothing_carries_no_mark():
    """The other half of the same claim, and the one that makes marks worth
    reading: the two unanswerable questions, and the sentence where the model
    volunteers something the notebook never said."""
    stray = []
    for case in CASES:
        marks = _marks(case)
        for sentence in case["sentences"]:
            if sentence["note_ids"]:
                continue
            got = sorted(row["note_id"] for row in marks.get(sentence["text"], []))
            if got:
                stray.append(f"{case['id']}: {sentence['text'][:50]!r} -> {got}")
    assert not stray, "a sentence with no source in the notes was marked:\n" + "\n".join(stray)


def test_the_highlighted_passage_holds_the_words_the_claim_came_from():
    """Measured 2026-09-20: 16 of 16 spans. The hover highlight is the whole
    reason the span is carried, so a mark landing on the right note and the
    wrong paragraph is still a broken feature."""
    wrong = []
    for case in CASES:
        marks = _marks(case)
        contents = {note["id"]: note["content"] for note in case["notes"]}
        for sentence in case["sentences"]:
            wanted = sentence.get("passage_contains")
            if not wanted:
                continue
            rows = marks.get(sentence["text"], [])
            row = next((r for r in rows if r["note_id"] in sentence["note_ids"]), None)
            span = (
                contents[row["note_id"]][row["start"] : row["end"]]
                if row and "start" in row
                else ""
            )
            if wanted not in span:
                wrong.append(f"{case['id']}: {wanted!r} not in {span[:60]!r}")
    assert not wrong, "a citation pointed at the wrong passage:\n" + "\n".join(wrong)


def test_a_claim_scattered_through_a_note_does_not_earn_a_second_mark():
    """The case the passage score was added for (CHAT_PLAN decision 2's open
    half). The rent rise and the notice date are both in the landlord's
    letter; the flat-hunting note happens to carry "give notice" in a
    paragraph about something else, which the distinctive-terms rule read as a
    second source. No single passage of it scores, so it no longer does.

    Measured: 6.02 against 3.32, a ratio of 0.55, under PASSAGE_SECOND_RATIO.
    """
    case = next(c for c in CASES if c["id"] == "rent-notice")
    sentence = case["sentences"][0]
    got = {row["note_id"] for row in _marks(case).get(sentence["text"], [])}
    assert got == {802}
    scores = note_passage_scores(sentence["text"], case["notes"])
    assert scores[802] > scores[801], scores


def test_a_sentence_beyond_a_word_scorer_is_left_silent_rather_than_guessed():
    """"The venue is reserved and the deposit is settled" is the booking note
    said twice over in different words: no content word is shared, so nothing
    lexical can reach it. The designed answer is no mark, not a mark on
    whichever note scored least badly, and that is what it gets.

    This is the measurement decision 2's cosine-over-the-window half would
    move, and it cannot be taken here: every embedding backend in this sandbox
    is the four-dimensional fake (OPEN.md, "Not verified").
    """
    case = next(c for c in CASES if c["id"] == "synonym-only")
    sentence = case["sentences"][0]
    assert sentence["reach"] == "embeddings"
    assert _marks(case).get(sentence["text"]) is None


@pytest.mark.parametrize("case", CASES, ids=[c["id"] for c in CASES])
def test_no_mark_ever_names_a_note_outside_the_candidate_set(case):
    """Cheap, and it is the one failure a reader cannot recover from: a
    citation to a note that was not on the wire opens a note the answer never
    saw."""
    ids = {note["id"] for note in case["notes"]}
    for row in ground_answer_sentences(case["answer"], case["notes"]):
        assert row["note_id"] in ids
