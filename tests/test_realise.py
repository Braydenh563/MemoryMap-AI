"""The realiser's rule tables (CHAT_PLAN Phase 6 step 3, decision 33): each
rule a table of input and expected output, and the pairs that show a rule
does not change what a sentence means."""

from __future__ import annotations

from datetime import date

import pytest

from memorymap.ai import realise

TODAY = date(2026, 10, 6)


@pytest.mark.parametrize(
    ("said", "shifted"),
    [
        ("I am going", "you are going"),
        ("I was late", "you were late"),
        ("I've booked it", "you have booked it"),
        ("my notes", "your notes"),
        ("Sam and I met", "you and Sam met"),
        ("am I late", "are you late"),
        ("I went to the gym on Monday and did squats.", "you went to the gym on Monday and did squats."),
        ("I like the morning sessions best.", "you like the morning sessions best."),
        ("I'm not sure about my plan.", "you're not sure about your plan."),
        ("I wasn't there.", "you weren't there."),
        ("I'll call the plumber myself.", "you will call the plumber yourself."),
        ("Priya told me the date.", "Priya told you the date."),
        ("Me and Sam went.", "You and Sam went."),
        ("The bike is mine.", "The bike is yours."),
        ("Was I right?", "Were you right?"),
        ("My plan is simple.", "Your plan is simple."),
        ("We decided to go with Lisbon.", "We decided to go with Lisbon."),
        ("Our flat needs a new boiler.", "Our flat needs a new boiler."),
        # Someone else's words are theirs.
        ('Sam wrote: "I am not sure we should ship it."', 'Sam wrote: "I am not sure we should ship it."'),
        ('I said "my turn" and left.', 'you said "my turn" and left.'),
        ("Priya said: I need the deck by Friday.", "Priya said: I need the deck by Friday."),
        # Idioms and numerals are not the writer.
        ("Let me know if it slips.", "Let me know if it slips."),
        ("Oh my, the roof leaks.", "Oh my, the roof leaks."),
        ("World War I history reading.", "World War I history reading."),
        ("Fix the I/O error first.", "Fix the I/O error first."),
        ("Part I is done; my notes are in Part II.", "Part I is done; your notes are in Part II."),
    ],
)
def test_shift_person(said, shifted):
    assert realise.shift_person(said) == shifted


def test_a_quoted_fact_is_never_shifted():
    assert realise.shift_person("I am sure", quoted=True) == "I am sure"


def test_first_person_says_whether_anything_would_change():
    assert realise.first_person("I went") and not realise.first_person("Let me know.")


@pytest.mark.parametrize(
    ("text", "due", "said"),
    [
        ("you plan to go on Friday.", date(2026, 10, 2), "you planned to go on Friday."),
        ("you are going again next week.", date(2026, 9, 28), "you were going again next week."),
        ("you will call the plumber.", date(2026, 10, 1), "you were going to call the plumber."),
        ("you want to repaint the shed.", date(2026, 9, 1), "you wanted to repaint the shed."),
        # Still to come, or no day known: unchanged.
        ("you plan to go on Friday.", date(2026, 10, 9), "you plan to go on Friday."),
        ("you plan to go.", None, "you plan to go."),
        # Not a plan: unchanged whatever the day.
        ("you went to the gym.", date(2026, 9, 1), "you went to the gym."),
    ],
)
def test_past_plan(text, due, said):
    assert realise.past_plan(text, due, TODAY) == said


@pytest.mark.parametrize(
    ("day", "said"),
    [
        (date(2026, 10, 6), "today"),
        (date(2026, 10, 5), "yesterday"),
        (date(2026, 10, 2), "on Friday"),
        (date(2026, 9, 29), "last week"),
        (date(2026, 9, 22), "two weeks ago"),
        (date(2026, 9, 8), "four weeks ago"),
        (date(2026, 3, 3), "on 3 March"),
        (date(2025, 3, 3), "on 3 March 2025"),
        (date(2026, 10, 7), "tomorrow"),
        (date(2026, 10, 9), "on Friday"),
        (date(2026, 10, 14), "next week"),
    ],
)
def test_relative_day(day, said):
    assert realise.relative_day(day, TODAY) == said


@pytest.mark.parametrize(
    ("n", "noun", "article", "said"),
    [(1, "note", False, "one note"), (2, "note", False, "two notes"), (1, "day", True, "a day"), (3, "day", False, "three days"),
     (1, "entry", True, "an entry"), (2, "entry", False, "two entries"), (14, "note", False, "14 notes")],
)
def test_count_noun(n, noun, article, said):
    assert realise.count_noun(n, noun, article=article) == said


@pytest.mark.parametrize(
    ("items", "said"),
    [
        (["milk"], "milk"),
        (["milk", "rice"], "milk and rice"),
        (["milk", "rice", "eggs"], "milk, rice and eggs"),
        (["bread", "salt", "fish and chips"], "bread, salt, and fish and chips"),
    ],
)
def test_join_items(items, said):
    assert realise.join_items(items) == said


@pytest.mark.parametrize(
    ("text", "said"),
    [("The hills are steep.", "the hills are steep."), ("Harbor ships soon.", "Harbor ships soon."), ("I went.", "I went."), ("NASA called.", "NASA called.")],
)
def test_after_comma(text, said):
    assert realise.after_comma(text) == said


@pytest.mark.parametrize(
    ("title", "limit", "said"),
    [("Harbor launch plan", 40, "Harbor launch plan"), ("Harbor launch plan for the mobile app", 20, "Harbor launch plan…"), ("Supercalifragilistic", 8, "Superca…")],
)
def test_cut_title(title, limit, said):
    assert realise.cut_title(title, limit) == said
