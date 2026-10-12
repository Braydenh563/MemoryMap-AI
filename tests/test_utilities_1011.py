"""Utilities worked out with no model and no search (CHAT_PLAN A1).

The eval set (tests/fixtures/composer/utilities_1011.json) is 60 ways of
asking a sum, a list's average, a root, a time in another city, a countdown,
a month's days or an age. Each is answered here with a "Read as" line that
says how the question was read; the not_utilities stay questions for the
notes.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import pytest

from tessellate.ai import intent, utilities

EVAL = json.loads((Path(__file__).parent / "fixtures/composer/utilities_1011.json").read_text(encoding="utf-8"))
NOW = datetime(2026, 10, 11, 10, 0)


def test_the_eval_set_is_sixty_phrasings():
    assert len(EVAL["utilities"]) >= 60 and len(EVAL["not_utilities"]) >= 10


def test_at_least_ninety_five_percent_are_worked_out_and_say_how_they_were_read():
    answered = [q for q in EVAL["utilities"] if (utilities.answer(q, now=NOW) or [])]
    assert len(answered) / len(EVAL["utilities"]) >= 0.95
    #: A sum typed in symbols ("12 * 7") is its own reading; everything else says how it was read.
    unread = [q for q in answered if "\nRead as " not in "".join(t for _, t in utilities.answer(q, now=NOW))]
    assert all(utilities.kind_of(q) == "sum" and any(c in q for c in "+*/^%x") for q in unread), unread


@pytest.mark.parametrize("question", EVAL["not_utilities"])
def test_a_notes_question_is_not_a_utility(question):
    assert utilities.kind_of(question) is None


@pytest.mark.parametrize(("question", "said"), [
    ("whats 5 plus 5", "5 + 5 is 10."),
    ("2 to the power of 8", "is 256."),
    ("square root of 81", "The square root of 81 is 9."),
    ("average of 3, 8, 10", "The average of 3, 8, 10 is 7."),
    ("median of 1, 5, 9 and 12", "is 7."),
    ("9am London in Tokyo", "09:00 in London is 17:00 in Tokyo."),
    ("how many days in February 2028", "February 2028 has 29 days."),
    ("how old is someone born in 1990", "36 this year"),
    ("days until christmas", "75 days away."),
])
def test_the_worked_answer(question, said):
    assert said in "".join(t for _, t in utilities.answer(question, now=NOW))


def test_every_utility_routes_as_one():
    assert [q for q in EVAL["utilities"] if intent.classify(q) != intent.UTILITY] == []
