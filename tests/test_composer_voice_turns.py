"""The composer across turns, at the length asked, through typos (INBOX 741).

Follow-ons read against the turn before ("what about the boiler?", "why?"),
openers that differ from the turn before, "briefly" and "in detail", and
questions typed the way people type them: "whn is the launch", "hw mny",
"wat did i say abt lisbon". Every answer passes INBOX 688's trace check.
"""

from __future__ import annotations

import pytest

from memorymap.ai import composer
from tests.test_composer_688 import NOTES, TODAY, _note, assert_traceable


def ask(question: str, notes=NOTES, **kwargs) -> dict:
    result = composer.compose(question, notes, today=TODAY, **kwargs)
    assert_traceable(result, question, notes)
    return result


# --- follow-ons ---------------------------------------------------------------

HISTORY = [{"question": "When is the dentist check-up?", "answer": "Check-up booked for the 21st. (**Dentist**)"}]


@pytest.mark.parametrize(
    ("follow", "kind", "resolved"),
    [
        ("what about the boiler service?", "swap", "When is the boiler service?"),
        ("and the boiler service?", "swap", "When is the boiler service?"),
        ("why?", "bare", "Why the dentist check-up?"),
        ("and when?", "bare", "When is the dentist check-up?"),
        ("how come?", "bare", "Why the dentist check-up?"),
    ],
)
def test_a_follow_on_is_read_against_the_turn_before(follow, kind, resolved):
    read = composer.follow_on(follow, HISTORY)
    assert read is not None and read.kind == kind and read.question == resolved


def test_what_about_after_a_plain_what_stands_as_typed():
    history = [{"question": "What is the Harbor launch plan?", "answer": "x"}]
    assert composer.follow_on("what about the boiler?", history) is None


# --- openers across turns -----------------------------------------------------


def test_an_answer_does_not_open_like_the_turn_before():
    first = ask("Who asked for a public API?")
    for _ in range(3):
        again = ask("Who asked for a public API?", previous=first["text"])
        opener = [p[1] for p in again["parts"] if p[0] != "template" or any(c.isalpha() for c in p[1])][0]
        assert not first["text"].startswith(opener) or opener in ("**",), (opener, first["text"][:40])


# --- length fitted to the question --------------------------------------------


def test_briefly_answers_from_the_lead_note_alone():
    full = ask("What is the Harbor launch plan?")
    brief = ask("Briefly, what is the Harbor launch plan?")
    assert len({r["note_id"] for r in brief["grounding"]}) == 1
    assert len(brief["text"]) < len(full["text"])


def test_a_strong_one_fact_answer_brings_one_other_note_at_most():
    notes = [
        _note(1, "# Week 2\n\n41 beta testers are active this week.", 20),
        _note(2, "# Offline\n\nBeta testers did not know the app works offline.", 10),
        _note(3, "# Forum\n\nThe beta testers forum has 12 threads.", 9),
        _note(4, "# Survey\n\nBeta testers rated onboarding 3 of 5.", 8),
    ]
    result = ask("How many beta testers are active?", notes)
    assert len({r["note_id"] for r in result["grounding"]}) <= 2


# --- typos and text-speak -----------------------------------------------------


@pytest.mark.parametrize(
    ("typed", "shape"),
    [
        ("whn is the dentist check-up", "when"),
        ("wen is the dentist", "when"),
        ("hw many beta testers r active", "count"),
        ("hw mny testers", "count"),
        ("hwo asked for a public api", "who"),
        ("hwo many testers", "count"),
        ("y is the list slow", "explain"),
        ("wht is the harbor launch plan", "what"),
        ("whats the lastest on the sync rewrite", "status"),
        ("wher did i put the spare key", "where"),
        ("compre lisbon and porto", "compare"),
        ("diffrence between lisbon and porto", "compare"),
        ("is ur hotel booked", "yesno"),
        ("wat did i say abt lisbon", "what"),
    ],
)
def test_a_misspelt_question_word_is_read_as_meant(typed, shape):
    assert composer.classify(typed) == shape


@pytest.mark.parametrize("real", ["then what", "show me the reading list", "that list", "they asked"])
def test_a_real_word_near_a_question_word_is_left_alone(real):
    assert composer.rephrase(real).split()[0] == real.split()[0]


def test_text_speak_is_spelled_out_and_the_subject_is_kept_as_typed():
    assert composer.rephrase("wat did i say abt lisbon") == "what did i say about lisbon"
    assert composer.subject_terms("wat did i say abt lisbon") == ["lisbon"]


def test_a_misspelt_subject_is_matched_to_the_notes_own_word_but_never_printed():
    notes = [_note(1, "# Lisbon\n\nThe hotel in Lisbon has a balcony over the square.", 5)]
    result = ask("whn did i book the hotle in lisbn", notes)
    assert "balcony" in result["text"]
    assert "hotle" not in result["text"] and "lisbn" not in result["text"]


def test_a_short_unknown_word_is_not_forced_onto_a_note_word():
    result = ask("What is the capital of Peru?")
    assert result["text"] == composer.PHRASES["nothing"]


def test_small_talk_between_turns_is_skipped_by_a_follow_on():
    history = HISTORY + [{"question": "ty", "answer": "You are welcome."}]
    read = composer.follow_on("what about the boiler service?", history)
    assert read is not None and read.question == "When is the boiler service?"


def test_newer_notes_are_never_joined_with_then():
    for question in ("What do my notes say about running?", "wat did i say abt lisbon"):
        text = ask(question)["text"]
        assert "Then on " not in text
