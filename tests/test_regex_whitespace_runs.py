"""Two patterns that were quadratic in a long run of whitespace.

`followups._INLINE_SPLIT` (model output, split per line) and
`docexport._TABLE_RULE` (a document's own text) both let the regex engine try
every split of a whitespace run between adjacent `\\s` quantifiers or from
every position inside the run. Measured before the rewrite, on 20,000
characters: see the numbers in the CHANGELOG line. The rewrites are linear and
must keep splitting and matching exactly as before.
"""

from __future__ import annotations

import time

import pytest

from memorymap.ai import followups
from memorymap.core import docexport

N = 20_000
BUDGET = 0.02  # seconds; the quadratic forms took 0.5 to 10 s


def _timed(fn):
    started = time.perf_counter()
    fn()
    return time.perf_counter() - started


@pytest.mark.parametrize(
    "text",
    [
        " " * N + "x",
        "a?" + " " * N,
        "What now?" + " " * N + "\t",
        "a" + (" " * 50 + "1") * (N // 51),
        "a" + " " * N + "12",
        "a" + (" " * 3 + "-") * (N // 4),
    ],
    ids=["spaces-then-x", "question-then-spaces", "tab-after-run", "digit-after-runs", "digits-no-marker", "many-dashes"],
)
def test_inline_split_is_linear_on_whitespace_runs(text):
    assert _timed(lambda: followups._INLINE_SPLIT.split(text)) < BUDGET


@pytest.mark.parametrize(
    "line",
    [
        " " * N + "x",
        "|" + " " * N + "x",
        "---" + " " * N + "x",
        "|---|" + " " * N + "x",
        "| --- |" * 1 + (" " * 50 + "| --- ") * (N // 57) + "x",
        " " * N + "| --- " + " " * N + "x",
    ],
    ids=["spaces-then-x", "pipe-spaces", "dashes-spaces", "cell-spaces", "many-cells", "both-ends"],
)
def test_table_rule_is_linear_on_whitespace_runs(line):
    assert _timed(lambda: docexport._TABLE_RULE.match(line)) < BUDGET


@pytest.mark.parametrize(
    ("line", "expected"),
    [
        ("| --- | --- |", True),
        ("|---|:---:|---:|", True),
        ("  --- | --- ", True),
        ("---", True),
        ("--", False),
        ("| --- | x |", False),
        ("--- ---", False),
        ("| --- | --- | extra", False),
        ("", False),
        ("   ", False),
    ],
)
def test_table_rule_still_matches_the_same_lines(line, expected):
    assert bool(docexport._TABLE_RULE.match(line)) is expected


@pytest.mark.parametrize(
    ("line", "pieces"),
    [
        ("What did I note? When is it due?", ["What did I note?", "When is it due?"]),
        ("What did I note? 2) When is it due?", ["What did I note?", "2)", "When is it due?"]),
        ("a  1. b", ["a", "b"]),
        ("a - b * c • d", ["a", "b", "c", "d"]),
        ("ends with a question?   ", ["ends with a question?   "]),
        ("no split here", ["no split here"]),
        ("1) first 2. second", ["1) first", "second"]),
    ],
)
def test_inline_split_still_splits_the_same_lines(line, pieces):
    got = followups._INLINE_SPLIT.split(line)
    # The first case of the old behaviour is the reference; compare against the
    # unrewritten pattern so this pins "unchanged", not a guess at it.
    import re

    old = re.compile(r"(?<=\?)\s+(?=\S)|\s+(?:\d+[.)]|[-*•])\s+")
    assert got == old.split(line)


def test_both_rewrites_agree_with_the_old_patterns_on_random_text():
    """A differential check over the characters that matter to each pattern."""
    import random
    import re

    old_split = re.compile(r"(?<=\?)\s+(?=\S)|\s+(?:\d+[.)]|[-*•])\s+")
    old_rule = re.compile(r"^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$")
    rng = random.Random(3)
    for _ in range(4000):
        text = "".join(rng.choice(" ?1.)-*•a\t|:\n") for _ in range(rng.randint(0, 24)))
        assert followups._INLINE_SPLIT.split(text) == old_split.split(text), repr(text)
        assert bool(docexport._TABLE_RULE.match(text)) == bool(old_rule.match(text)), repr(text)
