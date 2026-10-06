"""The composed answer, measured over the showcase notebook (INBOX 725).

The owner, 2026-10-06: "I want it soooo good it is almost like a chat bot".
The rule that does not move with it: every factual clause is the notes' own
words or a value the app measured (`tests/_composer_eval.py` says how each
measure is taken). These gates hold the composer to the numbers it reached,
so a later change that reads worse, repeats itself or loses a grounded clause
fails here rather than in the owner's hands.
"""

from __future__ import annotations

import pytest

from tests import _composer_eval as ev


@pytest.fixture(scope="module")
def rows():
    return ev.run()


def test_the_eval_covers_25_questions_and_every_shape(rows):
    assert len(rows) == 25
    shapes = {row["shape"] for row in rows}
    assert {"what", "when", "who", "count", "list", "compare", "explain", "status", "yesno", "recent"} <= shapes


def test_every_clause_is_grounded(rows):
    """The rule, over every answer: 1.0, never less."""
    for row in rows:
        assert row["failures"] == [], (row["question"], row["failures"])
        assert row["grounded"] == 1.0


def test_the_same_notebook_and_question_give_the_same_answer(rows):
    again = ev.run()
    assert [row["text"] for row in again] == [row["text"] for row in rows]
