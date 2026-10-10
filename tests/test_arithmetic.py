"""The composer's sums (`ai/arithmetic.py`): our own bounded evaluator in
place of the vendored simpleeval (2026-10-10 triage, decision 1)."""

from __future__ import annotations

import pytest

from memorymap.ai import arithmetic, composer


@pytest.mark.parametrize(
    ("question", "answer"),
    [
        ("What is 2 + 2?", "2 + 2 is 4."),
        ("what's 12 * (3 + 4)", "12 * (3 + 4) is 84."),
        ("calculate 10 / 4", "10 / 4 is 2.5."),
        ("What is -3 ** 2?", "-3 ** 2 is -9."),
        ("what is 17 % 5", "17 % 5 is 2."),
        ("What is 1500 x 3?", "1500 x 3 is 4,500."),
        ("what is 0.1 + 0.2", "0.1 + 0.2 is 0.3."),
        ("What is 2^10?", "2^10 is 1,024."),
    ],
)
def test_a_sum_is_worked_out_and_said_with_its_question(question, answer):
    result = composer.compose(question, [])
    assert result["text"] == answer
    assert result["shape"] == "sum"
    assert "".join(part[1] for part in result["parts"]) == result["text"]


@pytest.mark.parametrize(
    "text",
    [
        "__import__('os').system('ls')",
        "(1).__class__",
        "abs(-2)",
        "2 ** 99999999",
        "9 ** 9 ** 9",
        "1 / 0",
        "10 ** 20 * 10",
        "1 < 2",
        "lambda: 1",
        "2",
        "",
        "1 +" * 40 + "1",
    ],
)
def test_anything_but_bounded_arithmetic_is_refused(text):
    with pytest.raises(arithmetic.NotArithmetic):
        arithmetic.evaluate(text)


@pytest.mark.parametrize(
    "question",
    ["What is the Harbor launch plan?", "What is 2 days before the launch?", "calculate my budget", "What is 42?"],
)
def test_a_question_that_is_not_only_a_sum_goes_to_the_notes(question):
    assert arithmetic.sum_in(question) is None
