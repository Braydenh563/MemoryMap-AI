"""The voice eval's gates (INBOX 741): about a hundred questions, measured.

`tests/_composer_eval.py` runs the 25 showcase questions and the voice
fixture's questions (casual, typos and text-speak, every kind, follow-ons,
untitled jottings); `python -m tests._composer_eval --voice` prints them.
Each gate is a number the report quotes, held so it cannot slip back.
"""

from __future__ import annotations

import pytest

from tests import _composer_eval as ev


@pytest.fixture(scope="module")
def rows():
    return ev.run_voice()


def test_the_voice_eval_is_about_a_hundred_questions_with_the_725_ones(rows):
    assert len(rows) + len(ev.load()["questions"]) >= 100
    assert {r["category"] for r in rows} >= {"untitled", "casual", "typo", "kinds", "follow"}


def test_every_clause_is_still_the_notes_own_or_measured(rows):
    failing = [(r["question"], r["failures"]) for r in rows if r["failures"]]
    assert failing == []
    assert ev.voice_summary(rows)["grounded"] == 1.0


def test_each_question_gets_the_kind_of_answer_it_asked_for(rows):
    wrong = [(r["question"], r["shape"], r["expect"]) for r in rows if not r["kind_right"]]
    assert wrong == []


def test_no_note_is_named_by_its_first_words_or_introduced_as_saying(rows):
    summary = ev.voice_summary(rows)
    assert summary["named_by_first_words"] == 0
    assert summary["says_colon"] == 0


def test_answers_vary_and_never_repeat_a_joiner_or_an_opener_twice_running(rows):
    summary = ev.voice_summary(rows)
    assert summary["lead_in_repeats"] == 0
    assert summary["same_opener_twice_running"] == 0
    assert summary["openers_distinct"] >= 15


def test_answers_read_plainly(rows):
    summary = ev.voice_summary(rows)
    assert summary["first_line_answers"] >= summary["answered"] - 1
    assert 5 <= summary["mean_sentence_words"] <= 12
    assert summary["reading_ease"] >= 70
