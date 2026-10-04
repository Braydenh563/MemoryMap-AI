"""The duplicate scan returns what the all-pairs loop returned, without
comparing every pair (measured 196 ms at 60 notes before, 8 to 15 ms after; the
500-note cap took over 25 s, and 2,000 notes now scan in about 0.7 s).
"""

from __future__ import annotations

import random
import time

import pytest

from memorymap.entry import duplicates


def _brute(texts: list[str], threshold: float) -> dict[tuple[int, int], float]:
    """The old all-pairs loop. Notes with identical text are joined to the
    first of them only (a star, not every pair): the same groups and the same
    best score, without k(k-1)/2 pairs for k copies."""
    first_of: dict[str, int] = {}
    out = {}
    for i, text in enumerate(texts):
        first_of.setdefault(duplicates.normalise(text), i)
    for i in range(len(texts)):
        for j in range(i + 1, len(texts)):
            norm = duplicates.normalise(texts[j])
            if duplicates.normalise(texts[i]) == norm and first_of[norm] != i:
                continue
            score = duplicates.similarity(texts[i], texts[j])
            if score >= threshold:
                out[(i, j)] = score
    return out


def _fast(texts: list[str], threshold: float) -> dict[tuple[int, int], float]:
    prepared = [duplicates._prepare(t) for t in texts]
    return {(i, j): s for i, j, s in duplicates._similar_pairs(prepared, threshold)}


@pytest.mark.parametrize("threshold", [0.4, 0.72, 0.9, 1.0])
def test_the_pruned_scan_finds_exactly_the_pairs_the_full_loop_finds(threshold):
    rng = random.Random(11)
    vocab = [f"w{n}" for n in range(60)] + ["a", "I", "the", "and"]
    texts = []
    for _ in range(160):
        if texts and rng.random() < 0.35:
            words = rng.choice(texts).split()
            for _ in range(rng.randint(0, 3)):
                if words:
                    words[rng.randrange(len(words))] = rng.choice(vocab)
            rng.shuffle(words)
        else:
            words = [rng.choice(vocab) for _ in range(rng.randint(0, 14))]
        texts.append(" ".join(words) + rng.choice(["", ".", "!"]))
    texts += ["", "", "a", "A!", "I", "..."]  # no words at all, or only one-letter ones
    assert _fast(texts, threshold) == pytest.approx(_brute(texts, threshold))


def test_two_thousand_notes_scan_in_about_a_second():
    rng = random.Random(5)
    vocab = [f"word{n}" for n in range(3000)] + "the a of and to in for with".split()
    texts = []
    for _ in range(2000):
        if texts and rng.random() < 0.1:
            words = rng.choice(texts).split()
            words[rng.randrange(len(words))] = "edited"
        else:
            words = [rng.choice(vocab) for _ in range(rng.randint(30, 90))]
        texts.append(" ".join(words) + ".")
    prepared = [duplicates._prepare(t) for t in texts]
    started = time.perf_counter()
    found = list(duplicates._similar_pairs(prepared, duplicates.DEFAULT_THRESHOLD))
    elapsed = time.perf_counter() - started
    assert found  # the near-copies were seeded in
    assert elapsed < 2.0, f"{elapsed:.2f}s"
