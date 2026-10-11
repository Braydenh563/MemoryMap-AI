"""The answer judged against gold answers (CHAT_PLAN decision 70, INBOX 812).

The owner: "you keep saying youve improved it but i still cant see much".
Every earlier round passed its own rule counts; this one is held to answers
written by hand for the owner's questions (`tests/fixtures/gold_answers.json`)
and scored by `tests/_gold.py`. The floor is a ratchet: raise it as the
answers improve, never lower it. The app itself is measured by
`scratchpad/ui-sweeps/gold.js` (the same questions through the route).
"""

from __future__ import annotations

from datetime import date

import pytest

import _gold
from memorymap.ai import composer, composer_digest

FIXTURE = _gold.load()
TODAY = date.fromisoformat(FIXTURE["today"])
NOTES = [
    {"id": i + 1, "content": n["content"], "created_at": f"{n['date']}T10:00:00", "category": n["category"], "tags": n["tags"]}
    for i, n in enumerate(FIXTURE["notes"])
]
KEYS = {n["key"]: i + 1 for i, n in enumerate(FIXTURE["notes"])}
NOTE_ANSWERS = [a for a in FIXTURE["answers"] if a["kind"] == "notes"]
#: Measured 2026-10-11: before the digest the note answers scored 49 on
#: average through the app; after, 80. The floor sits under the measure.
NOTES_FLOOR = 76


def _answer(item: dict) -> dict:
    return composer_digest.answer(item["question"], NOTES, today=TODAY) or composer.compose(
        item["question"], NOTES, today=TODAY
    )


def test_the_fixture_is_twenty_answers_across_the_kinds_decision_71_names():
    kinds = {a["type"] for a in FIXTURE["answers"]}
    assert len(FIXTURE["answers"]) == 20
    assert {"fact", "overview", "compare", "count", "who", "left"} <= kinds


def test_the_note_answers_read_like_the_gold_on_average():
    scores = [_gold.score(_answer(a)["text"], a)["total"] for a in NOTE_ANSWERS]
    assert sum(scores) / len(scores) >= NOTES_FLOOR, scores


@pytest.mark.parametrize("item", NOTE_ANSWERS, ids=lambda a: str(a["n"]))
def test_no_note_answer_quotes_brackets_or_repeats_the_sources(item):
    """INBOX 812: quoted fragments under a bar, "[your note, 27 July]" on
    every line, then "Grounded in" chips and "4 of 4" under it."""
    failed = _gold.score(_answer(item)["text"], item)["failed"]
    assert not {"no_brackets", "no_quoting", "never"} & set(failed), failed


def test_the_owners_question_opens_with_the_count_and_the_span():
    result = composer_digest.answer("What have I saved about courses & study?", NOTES, today=TODAY)
    lines = result["text"].split("\n\n")
    assert lines[0] == "You have four notes about uni, 17 July to 4 August."
    assert any(line.startswith("**Your week:** classes on Tuesdays and Thursdays") for line in lines)
    assert "Nothing yet on assessments or due dates." in lines
    assert lines[-1] == "Remind you to ask the tutor on Thursday?"
    assert result["offer"] == {"kind": "reminder", "label": lines[-1], "text": "Ask the tutor on Thursday"}


def test_the_joke_is_never_a_fact_about_the_person():
    """Decision 67: the homework joke is filed under Courses & Study and
    tagged joke; it is not one of "your four notes about uni"."""
    result = composer_digest.answer("What have I saved about courses & study?", NOTES, today=TODAY)
    assert "homework" not in result["text"]
    assert KEYS["joke1"] not in {row["note_id"] for row in result["grounding"]}
    asked = composer_digest.answer("what jokes have I saved?", NOTES, today=TODAY)
    assert "homework" in asked["text"]


def test_one_citation_row_a_line_and_each_names_its_note():
    result = composer_digest.answer("What have I saved about courses & study?", NOTES, today=TODAY)
    labelled = [line for line in result["text"].split("\n\n") if line.startswith("**")]
    assert len(result["grounding"]) == len(labelled)
    for row, line in zip(result["grounding"], labelled):
        assert row["sentence"] in line
        assert row["note_id"] in {KEYS[k] for k in ("uni1", "uni2", "uni3", "uni4")}
    assert result["support"]["digest"] is True


@pytest.mark.parametrize(
    ("typed", "clean"),
    [
        ("what is there about a gaming mouse?\\", "what is there about a gaming mouse?"),
        ("'what is there about a gaming mouse?\\\\'", "what is there about a gaming mouse?"),
        ("  notebook   stats ", "notebook stats"),
    ],
)
def test_the_question_is_cleaned_before_it_is_read(typed, clean):
    """INBOX 808: the backslash was kept in the query and the search."""
    assert composer_digest.clean(typed) == clean


def test_a_question_the_digest_does_not_fit_falls_to_the_composer():
    assert composer_digest.answer("what is the weather on mars", NOTES, today=TODAY) is None
    assert composer_digest.answer("", NOTES, today=TODAY) is None
    assert composer_digest.answer("what have I saved about uni?", [], today=TODAY) is None


def test_progress_is_said_as_the_change():
    result = composer_digest.answer("how's the gym going?", NOTES, today=TODAY)
    assert result["text"].startswith("Going up: your squats went from 80 kg to 90 kg, 8 September to 2 October.")


def test_a_comparison_names_the_one_the_notes_lean_to():
    result = composer_digest.answer("Logitech or Razer?", NOTES, today=TODAY)
    assert result["text"].startswith("The Logitech, by your notes: you're leaning towards it")
    assert "**Razer Viper V3:** $200." in result["text"]
