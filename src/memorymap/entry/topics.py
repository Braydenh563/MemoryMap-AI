"""Topics inside an island, named (GRAPH_PLAN KG6, INBOX 528).

`paths.clusters` is connected components on purpose (its docstring says why:
exactly true, checkable by clicking). That decision stands. A topic is a
second, labelled layer over it: a judgement, said to be one, that a big
island is two or three subjects joined by a bridge.

**Detection: weighted label propagation, in id order.** Each note takes the
label its neighbours vote for most, a vote weighted by how strong the edge is
(`1 / Step.weight`, so a link counts four times a shared tag, as on a path)
times one plus the neighbours the two ends share. That second factor is what
stops a lone bridge pulling one subject into the next: an edge inside a
subject sits in triangles, a bridge does not. A note keeps its label on a tie
and otherwise the smallest label wins, so the answer is the same every time.
Cost is the edges times the rounds plus one set intersection per edge.

**Naming: what the topic shares more than the notebook does.** A term (a
tag, an entity, a title word) scores its share of the topic's notes times its
inverse document frequency over the notebook; a term every note has scores
nothing. Tags win ties over entities and entities over words, because a tag
is a name somebody chose. A topic nothing distinguishes is "Topic 3", never
an invented word, and a local model's summary is a separate, on-demand step.
"""

from __future__ import annotations

import math
from collections import defaultdict

from memorymap.entry.paths import Connections, degree

#: A topic smaller than this is a pair and a hanger-on, not a subject.
MIN_TOPIC_NOTES = 3
#: Label propagation settles in a handful of rounds; this is the ceiling.
ROUNDS = 20
#: How many terms a topic lists beside its name.
TERMS_SHOWN = 5
#: A term must be on this share of a topic's notes to name it.
MIN_TERM_SHARE = 0.3

_KIND_ORDER = {"tag": 0, "entity": 1, "word": 2}


def detect(index: Connections) -> dict[int, int]:
    """Note id -> topic label (a member's id), for every note in the index."""
    near = {node: set(index.neighbours(node)) for node in index.entries}
    weight: dict[int, dict[int, float]] = defaultdict(dict)
    for node, steps in index.edges.items():
        for other, step in steps.items():
            if other == node or other not in near or node not in near:
                continue
            shared = len(near[node] & near[other])
            weight[node][other] = (1.0 / max(step.weight, 1e-9)) * (1.0 + shared)
    labels = {node: node for node in index.entries}
    order = sorted(index.entries)
    for _ in range(ROUNDS):
        changed = False
        for node in order:
            votes: dict[int, float] = defaultdict(float)
            for other, w in weight.get(node, {}).items():
                votes[labels[other]] += w
            if not votes:
                continue
            best = max(votes.values())
            if votes.get(labels[node], 0.0) >= best - 1e-9:
                continue
            labels[node] = min(label for label, v in votes.items() if v >= best - 1e-9)
            changed = True
        if not changed:
            break
    return labels


def _display(kind: str, term: str) -> str:
    return f"#{term}" if kind == "tag" else term


def build(index: Connections, terms_of: dict[int, set[tuple[str, str]]]) -> list[dict]:
    """The topics of `MIN_TOPIC_NOTES` or more, largest first, each named.

    `terms_of` is note id -> `{(kind, term)}`, kind one of tag, entity, word;
    a note missing from it (a private one) lends nothing to a name.
    """
    labels = detect(index)
    groups: dict[int, list[int]] = defaultdict(list)
    for node, label in labels.items():
        groups[label].append(node)
    kept = sorted(
        (sorted(members) for members in groups.values() if len(members) >= MIN_TOPIC_NOTES),
        key=lambda members: (-len(members), members[0]),
    )
    total = max(1, len(index.entries))
    document_frequency: dict[tuple[str, str], int] = defaultdict(int)
    for terms in terms_of.values():
        for term in terms:
            document_frequency[term] += 1

    out: list[dict] = []
    for position, members in enumerate(kept):
        counts: dict[tuple[str, str], int] = defaultdict(int)
        for node in members:
            for term in terms_of.get(node, ()):
                counts[term] += 1
        scored = []
        for (kind, term), notes in counts.items():
            if notes < 2 or notes / len(members) < MIN_TERM_SHARE:
                continue
            score = (notes / len(members)) * math.log(total / document_frequency[(kind, term)])
            if score > 0:
                scored.append((-score, _KIND_ORDER.get(kind, 3), term, kind, notes))
        scored.sort()
        terms = [
            {"term": _display(kind, term), "kind": kind, "notes": notes}
            for _, _, term, kind, notes in scored[:TERMS_SHOWN]
        ]
        out.append({
            "id": position,
            "size": len(members),
            "name": terms[0]["term"] if terms else f"Topic {position + 1}",
            "terms": terms,
            "ids": members,
            "core_id": max(members, key=lambda node: (degree(index, node), -node)),
        })
    return out


def terms_sentence(size: int, terms: list[str]) -> str:
    """A topic's summary with no model: how many notes, and what they share.
    Never an invented word: with nothing shared it says what a topic is."""
    named = [t for t in terms if t][:3]
    if not named:
        return f"{size} notes that link to each other more than to the rest."
    joined = named[0] if len(named) == 1 else ", ".join(named[:-1]) + f" and {named[-1]}"
    return f"{size} notes about {joined}."


#: How much of each note the model reads for a summary, and how many notes:
#: a topic's titles and opening lines say what it is about; its bodies are a
#: long prompt for a small model to get lost in.
SUMMARY_NOTES = 12
SUMMARY_CHARS = 160
SUMMARY_SYSTEM = (
    "You say what a group of someone's notes is about, in one plain sentence "
    "of under 30 words, from their titles and opening lines. No preamble, no "
    "quotes, no list, and nothing the notes do not say."
)
