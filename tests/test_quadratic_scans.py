"""Four scanners that were quadratic on a crafted line (the final scan,
2026-10-06, `py/polynomial-redos` shapes): a note's first line
(`manager.plain_label`), a document's inline markup (`docexport.inline_split`),
the model's reply (`answer_trim.strip_prompt_metadata`) and a question's title
(`questions._title`).

Each timing test pumps about 20 KB of one crafted shape and asserts a budget
far under what the old pattern took (measured before each rewrite, numbers in
the CHANGELOG). Each rewrite must also give the old pattern's answer, so the
old patterns are kept here as oracles and compared on the crafted shapes and
on random strings drawn from the markup's own alphabet.
"""

from __future__ import annotations

import random
import re
import time

import pytest

N = 20_000
BUDGET = 0.2  # seconds; the quadratic forms took 0.3 to 15 s


def _timed(fn):
    started = time.perf_counter()
    fn()
    return time.perf_counter() - started


def _random_strings(alphabet: list[str], count: int = 400, length: int = 40):
    rng = random.Random(1006)
    for _ in range(count):
        yield "".join(rng.choice(alphabet) for _ in range(rng.randint(0, length)))


# --- entry/manager.py: plain_label -------------------------------------------

_LABEL_PUMPS = {
    "image-openers": "![" * (N // 2),
    "image-no-close": "![a" * (N // 3),
    "link-openers": "[" * N,
    "link-text": "[a" * (N // 2),
    "link-no-paren-close": "[a](" * (N // 4),
    "image-no-paren-close": "![a](" * (N // 5),
}


@pytest.mark.parametrize("text", _LABEL_PUMPS.values(), ids=_LABEL_PUMPS.keys())
def test_plain_label_is_linear_on_unclosed_markup(text):
    from memorymap.entry.manager import plain_label

    assert _timed(lambda: plain_label(text, 80)) < BUDGET


def _old_label_links(first: str) -> str:
    first = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", first)
    return re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", first)


def test_label_links_match_the_old_patterns():
    from memorymap.entry.manager import _md_links

    def _label_links(text):
        return _md_links(_md_links(text, True), False)

    alphabet = list("ab [](!)\n") + ["![", "](", "[["]
    for text in list(_random_strings(alphabet)) + [
        "a [b](u) c",
        "[a [b](u)",
        "![alt](x) and [t](y)",
        "[](x)",
        "![](x)[]()",
        "[a](b",
        "[a]( b c )d",
    ]:
        assert _label_links(text) == _old_label_links(text), text
