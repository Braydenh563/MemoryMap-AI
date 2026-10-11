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
    #: The first note told as what happened (the owner, 2026-10-11), its
    #: "next week" said from today; tests/test_narrate_1011.py has the rest.
    assert lines[1].startswith("You went back to uni the week of 20 July") and "classes on Tuesdays and Thursdays" in lines[1]
    assert "Nothing yet on assessments or due dates." in lines
    #: The note's Thursday (6 August) has gone by: the offer drops the day
    #: and says what to ask, from the line beside it (the owner, 2026-10-11).
    assert lines[-1] == "Remind you to ask the tutor about big O?"
    assert result["offer"] == {"kind": "reminder", "label": lines[-1], "text": "Ask the tutor about big O"}


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
    #: Every paragraph that tells a note, labelled or prose (the owner,
    #: 2026-10-11), has its one row, in order.
    labelled = [line for line in result["text"].split("\n\n")[1:] if any(r["sentence"] in line for r in result["grounding"])]
    assert len(result["grounding"]) == len(labelled) == 4
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
    assert "| Price | about $230 | $200 |" in result["text"]


def test_a_comparison_is_a_table_of_the_two():
    """Decision 71: a comparison is a table, one column a thing, a row a
    point the notes make, an empty cell said rather than left blank."""
    result = composer_digest.answer("Logitech or Razer?", NOTES, today=TODAY)
    rows = [line for line in result["text"].splitlines() if line.startswith("|")]
    assert rows[0] == "| | Logitech G Pro X Superlight | Razer Viper V3 |"
    assert rows[1] == "| --- | --- | --- |"
    assert [r.split("|")[1].strip() for r in rows[2:]] == ["Price", "What you found"]
    assert all(cell.strip() for r in rows[2:] for cell in r.strip("|").split("|")), rows
    assert result["support"]["shape"] == "compare"


def test_what_is_left_is_a_checklist():
    result = composer_digest.answer("what do I need to buy?", NOTES, today=TODAY)
    lines = result["text"].splitlines()
    assert lines[0] == "Five groceries, from your list of 5 October:"
    assert lines[1:6] == ["- [ ] oat milk", "- [ ] eggs", "- [ ] spinach", "- [ ] rice", "- [ ] chicken thighs"]
    assert result["support"]["shape"] == "left"
    assert result["support"]["offer"]["label"] == "Save it as a checklist note?"


@pytest.mark.parametrize(("question", "shape"), [
    ("how much did I spend on groceries?", "count"),
    ("who is Sam?", "who"),
    ("Logitech or Razer?", "compare"),
    ("what do I need to buy?", "left"),
])
def test_the_answer_names_its_shape_for_the_page(question, shape):
    """`support.shape` is what `digestShape` lifts: the count's figure, the
    who card. A count still opens with its figure, a who with the name."""
    result = composer_digest.answer(question, NOTES, today=TODAY)
    assert result["support"]["shape"] == shape
    if shape == "count":
        assert result["text"].startswith("You spent $84 ")
    if shape == "who":
        assert result["text"].startswith("Sam ")


@pytest.mark.parametrize(("text", "said"), [
    ("Gym three times this week", "Gym three times the week of 13 July"),
    ("Uni starts back next week", "Uni starts back the week of 20 July"),
    ("Cleaned the garage last weekend", "Cleaned the garage the weekend of 11 July"),
    ("Ship it on the 14th of next month", "Ship it on 14 August"),
    ("Spent more this month", "Spent more in July"),
    ("Pay it before next week", "Pay it before 20 July"),
])
def test_a_relative_time_is_pinned_to_the_day_it_meant(text, said):
    """CHAT_PLAN B3: "this week" written 17 July becomes "the week of 13 July",
    its Monday, as the Mentions chip's resolver (`when.span`) has it; "before
    next week" is before that Monday, a day (the owner, 2026-10-11)."""
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


POTTERY = [
    "Pottery class: centring the clay is the hard part.", "Pottery: trimmed my first bowl today.",
    "Glaze test came out blue-green, not the blue I wanted.", "Kiln firing is on Saturday at 10am.",
    "Bought a set of pottery tools for $45.", "Wheel speed: slower when pulling walls.",
    "Teacher said wedge the clay longer before throwing.", "Pottery: my mug handle cracked in the kiln.",
    "Signed up for the advanced pottery term in November.", "Studio is open Thursdays until 9pm.",
]


def _pottery() -> list[dict]:
    return [
        {"id": i + 1, "content": f"{c} #pottery", "created_at": f"2026-09-{i + 1:02d}T10:00:00", "category": "Hobbies", "tags": ["pottery"]}
        for i, c in enumerate(POTTERY)
    ]


def test_a_long_overview_is_short_with_the_rest_behind_more():
    """B5: five lines show; the rest are sent cited and named by their
    labels, so the page folds them behind one "Show five more"."""
    result = composer_digest.answer("what have I saved about pottery?", _pottery(), today=TODAY)
    more = result["support"]["more"]
    #: Found by the words each opens with: a day's line is prose now (the
    #: owner, 2026-10-11), a labelled one keeps its label too.
    assert more["label"] == "Show five more" and len(more["starts"]) == 5
    for start in more["starts"]:
        assert start in result["text"].replace("**", "")
    for label in more["labels"]:
        assert f"**{label}:**" in result["text"]
    assert len(result["grounding"]) == 10, "every line, shown or folded, keeps its mark"
    assert "more on the right" not in result["text"]


def test_a_short_answer_has_no_more():
    assert composer_digest.answer("what have I saved about uni?", NOTES, today=TODAY)["support"]["more"] is None


def test_hashtags_and_today_are_tidied():
    text = composer_digest.answer("what have I saved about pottery?", _pottery(), today=TODAY)["text"]
    assert "#" not in text
    assert "today" not in text and "**2 September:** trimmed your first bowl." in text


@pytest.mark.parametrize(("question", "subject"), [
    ("What have I saved about courses & study?", "courses & study"),
    ("what have i got on pottery", "pottery"),
    ("tell me about pottery", "pottery"),
    ("what is there about the gaming mouse?", "gaming mouse"),
])
def test_the_owners_question_counts_every_note_on_the_topic(question, subject):
    """"What have I saved about X" is a topic asked about as a whole: the
    route widens it to every note on X, so the count is not capped at the
    five a search ranked."""
    from memorymap.ai import composer_overview

    assert composer_overview.topic(question) == subject
