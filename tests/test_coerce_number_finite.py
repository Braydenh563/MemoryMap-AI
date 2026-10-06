"""A `number` tool argument must be finite (sweep 1004, found-not-fixed 4):
`float("nan")` and `float("inf")` read as numbers, and a handler doing
arithmetic or a comparison on one misbehaves quietly."""

from __future__ import annotations

import pytest

from memorymap.ai.tools import _coerce

NUMBER = {"type": "number"}


@pytest.mark.parametrize(
    "value",
    ["nan", "NaN", "inf", "-inf", "Infinity", "-Infinity", "1e999", float("nan"), float("inf"), float("-inf")],
)
def test_a_non_finite_number_is_refused(value):
    assert _coerce(value, NUMBER)[1] is False


@pytest.mark.parametrize("value,expected", [(3, 3), (2.5, 2.5), ("2.5", 2.5), (" -4 ", -4.0), ("1e3", 1000.0)])
def test_a_finite_number_still_reads(value, expected):
    assert _coerce(value, NUMBER) == (expected, True)


def test_a_non_finite_number_inside_an_array_is_refused():
    assert _coerce(["1", "nan"], {"type": "array", "items": NUMBER})[1] is False
