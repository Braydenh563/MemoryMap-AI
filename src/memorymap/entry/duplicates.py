"""Find notes that say the same thing twice.

A notebook you actually use accumulates near-duplicates: the same thought
captured on two days, a note re-typed because the first one was hard to find,
a shopping list rewritten rather than edited.

Detection here is deliberately arithmetic rather than AI, normalise the text
and compare word overlap. That means it works with nothing running, it's
instant, and it's explainable: the score is a percentage of shared words, not
a black box. The AI's job comes later and is optional, at merge time, where
judgement genuinely helps.
"""

from __future__ import annotations

import math
import re
from collections import Counter, defaultdict
from collections.abc import Iterator

from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.core.database import Entry

# Below this, two notes are merely on the same topic rather than duplicates.
# Chosen high on purpose: a false positive invites someone to merge two notes
# that only looked alike, and that loses writing.
DEFAULT_THRESHOLD = 0.72

# How many notes one scan reads. It was 500 because every pair was compared
# (125,000 comparisons, over 25 s at the cap), which also meant a notebook past
# 500 notes never had its newer notes looked at, the ones most likely to repeat
# an older one. `_similar_pairs` below only compares notes that share one of
# their rarest words, so the cap is a memory bound now, not a time one.
MAX_SCAN = 5000


_NON_WORD = re.compile(r"[^\w\s]")
_SPACES = re.compile(r"\s+")


def normalise(text: str) -> str:
    """Lowercase, strip punctuation and collapse whitespace."""
    return _SPACES.sub(" ", _NON_WORD.sub(" ", (text or "").lower())).strip()


def _word_set(text: str) -> set[str]:
    return {word for word in normalise(text).split() if len(word) > 1}


def _prepare(text: str) -> tuple[str, frozenset[str]]:
    """What a pair comparison needs from one note, computed once per note.

    The scan used to call `similarity` on every pair, which normalised both
    texts every time: four regex passes per pair, so a notebook of n notes
    paid them n(n-1)/2 times over for n distinct texts (60 notes: 1,770 pairs,
    about 196 ms of a request that does nothing else).
    """
    norm = normalise(text)
    return norm, frozenset(word for word in norm.split() if len(word) > 1)


def _score(left: tuple[str, frozenset[str]], right: tuple[str, frozenset[str]]) -> float:
    if left[0] == right[0]:
        return 1.0
    a, b = left[1], right[1]
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def similarity(a: str, b: str) -> float:
    """0..1 overlap between two notes, by shared words (Jaccard).

    Identical text scores 1.0. Word order is ignored on purpose: "milk and
    eggs" and "eggs and milk" are the same shopping list.
    """
    return _score(_prepare(a), _prepare(b))


def _similar_pairs(
    prepared: list[tuple[str, frozenset[str]]], threshold: float
) -> Iterator[tuple[int, int, float]]:
    """Every pair `(i, j)`, i < j, scoring at least `threshold`, with its score.

    Not every pair is compared. With each note's words in one global order,
    rarest first, two sets with Jaccard >= t must share a word in the first
    `len - ceil(t * len) + 1` of the larger-or-equal one's *probing* prefix and
    the first `len - ceil(2t / (1 + t) * len) + 1` of the smaller one's
    *indexing* prefix, provided notes are visited smallest first (the prefix
    filter of set-similarity joins, as in PPJoin). So a note is compared only
    with earlier (smaller) notes that share one of its few rarest words, then
    the size bound and the exact score decide. The result is exactly what the
    all-pairs loop returned; only the pairs that could not qualify are never
    looked at. Notes with identical text are joined to the first copy only
    (same group, same score of 1.0, without k(k-1)/2 pairs for k copies).
    """
    document_frequency = Counter(word for _norm, words in prepared for word in words)
    index: dict[str, list[int]] = defaultdict(list)
    first_with_text: dict[str, int] = {}
    bound = 2 * threshold / (1 + threshold)
    for i in sorted(range(len(prepared)), key=lambda n: (len(prepared[n][1]), n)):
        norm, words = prepared[i]
        candidates: set[int] = set()
        if norm in first_with_text:
            candidates.add(first_with_text[norm])  # the same text: 1.0, even with no words
        else:
            first_with_text[norm] = i
        ordered = sorted(words, key=lambda word: (document_frequency[word], word))
        size = len(ordered)
        probe = size - math.ceil(threshold * size - 1e-9) + 1
        for word in ordered[: max(probe, 0)]:
            candidates.update(index[word])
        keep = size - math.ceil(bound * size - 1e-9) + 1
        for word in ordered[: max(keep, 0)]:
            index[word].append(i)
        for j in candidates:
            if prepared[j][0] == norm:
                if first_with_text[norm] != j:
                    continue  # joined to the first copy already
            elif len(prepared[j][1]) < threshold * size:
                continue  # `j` is no larger than `i`: Jaccard <= |j| / |i|
            if norm == prepared[j][0]:
                score = 1.0
            else:
                # One intersection, the union from the sizes: `_score` does
                # the same sum with two set operations, and this is the line
                # every surviving candidate pays for.
                other = prepared[j][1]
                shared = len(words & other)
                score = shared / (size + len(other) - shared) if shared else 0.0
            if score >= threshold:
                yield (j, i, score) if j < i else (i, j, score)


def find_duplicates(
    session: Session, threshold: float = DEFAULT_THRESHOLD
) -> list[dict]:
    """Groups of notes that look like the same note, most similar first.

    Private notes are excluded: reporting one as a duplicate would reveal both
    that it exists and roughly what it says.
    """
    entries = list(
        session.scalars(
            select(Entry)
            .where(
                Entry.is_deleted == False,  # noqa: E712
                Entry.is_private == False,  # noqa: E712
            )
            .order_by(Entry.id)
            .limit(MAX_SCAN)
        )
    )

    # Union-find, so three notes that each match the others become one group of
    # three rather than three overlapping pairs the user has to reconcile.
    parent = {entry.id: entry.id for entry in entries}

    def root(node: int) -> int:
        while parent[node] != node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    prepared = [_prepare(entry.content) for entry in entries]
    best: dict[tuple[int, int], float] = {}
    for i, j, score in _similar_pairs(prepared, threshold):
        best[(entries[i].id, entries[j].id)] = score
        parent[root(entries[i].id)] = root(entries[j].id)

    grouped: dict[int, list[Entry]] = {}
    for entry in entries:
        grouped.setdefault(root(entry.id), []).append(entry)
    # The strongest pair in each group, read off the pairs once, rather than
    # every group scanning every pair.
    top: dict[int, float] = {}
    for (a_id, _b_id), score in best.items():
        group = root(a_id)
        if score > top.get(group, 0.0):
            top[group] = score

    groups = []
    for group, members in grouped.items():
        if len(members) < 2:
            continue
        groups.append(
            {
                "similarity": round(top[group], 3) if group in top else threshold,
                "entries": [
                    {
                        "id": m.id,
                        "content": m.content,
                        "created_at": m.created_at.isoformat(),
                        "tags": m.tags,
                    }
                    for m in sorted(members, key=lambda m: m.id)
                ],
            }
        )
    groups.sort(key=lambda g: -g["similarity"])
    return groups
