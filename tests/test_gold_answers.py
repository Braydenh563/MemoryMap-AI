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
#: average through the app; after, 80; with B1, B3, B4 and B12 (the "so
#: what" line, pinned times, one offer a kind), 88. The floor sits under it.
NOTES_FLOOR = 85


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


@pytest.mark.parametrize(("text", "said"), [
    ("Gym three times this week", "Gym three times the week of 17 July"),
    ("Uni starts back next week", "Uni starts back the week of 24 July"),
    ("Cleaned the garage last weekend", "Cleaned the garage the weekend of 11 July"),
    ("Ship it on the 14th of next month", "Ship it on 14 August"),
    ("Spent more this month", "Spent more in July"),
    ("Pay it before next week", "Pay it before the week of 24 July"),
])
def test_a_relative_time_is_pinned_to_the_day_it_meant(text, said):
    """CHAT_PLAN B3: "this week" written 17 July becomes "the week of 17 July"."""
    from datetime import date

    assert composer_digest._tidy(text, date(2026, 7, 17)) == said


@pytest.mark.parametrize(("question", "kind", "label", "text"), [
    ("what did I think of Dune?", "note", "Start a list of films to watch next?", "Films to watch next\n\n- [ ] "),
    ("how much did I spend on groceries?", "reminder", "Remind you each week to log your spending?", "Log your spending every Sunday"),
    ("Logitech or Razer?", "note", "Note the Logitech as your pick?", "My pick: the Logitech G Pro X Superlight"),
    ("do I like golf?", "reminder", "Remind you to go to the driving range again?", "Go to the driving range"),
    ("what hobbies do I want to try?", "reminder", "Remind you to try bouldering?", "Try bouldering"),
])
def test_every_kind_ends_with_one_offer_the_app_can_do(question, kind, label, text):
    """CHAT_PLAN B12: one acting offer, the answer's last line, done in one
    press (a reminder or a note); never two."""
    result = composer_digest.answer(question, NOTES, today=TODAY)
    assert result["offer"] == {"kind": kind, "label": label, "text": text}
    assert result["text"].split("\n\n")[-1] == label
    assert result["text"].count("?") == 1


def test_how_its_going_says_the_change_what_went_quiet_and_offers_a_table():
    """B1 and B4: the change, then what an earlier note had that the latest
    does not, then the lifts as a table note."""
    result = composer_digest.answer("how's the gym going?", NOTES, today=TODAY)
    lines = result["text"].split("\n\n")
    assert lines[0] == "Going up: your squats went from 80 kg to 90 kg, 8 September to 2 October."
    assert "Nothing on bench since September." in lines
    assert result["offer"]["label"] == "Track your lifts in a table?"
    assert "| 8 September | 80 kg | 60 kg |" in result["offer"]["text"]


@pytest.mark.parametrize(("question", "closing"), [
    ("what hobbies do I want to try?", "None of them has a note of its own yet."),
    ("how much did I spend on groceries?", "It's the only week you've written down."),
    ("who is Sam?", "It's the only note that names Sam."),
])
def test_the_so_what_line_says_how_alone_the_facts_are(question, closing):
    assert closing in composer_digest.answer(question, NOTES, today=TODAY)["text"].split("\n\n")
