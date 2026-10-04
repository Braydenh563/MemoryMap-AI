"""The suggestions inbox's own recognisers (GRAPH_PLAN KG9, INBOX 528).

The inbox is one sheet for four kinds of suggestion. Two already had a
recogniser: link suggestions (`ai/relations.recognise`) and tensions
(`ai/tensions.py`, a model pass on demand). This module is the other two,
both pure and both cheap, so the sheet opens without a model:

- **Entity merges.** Two entities that are one thing: the same name in
  another case, a first name inside a full name ("Sam" in "Sam Lee"), or a
  near spelling (token-sort ratio 0.9 or more). Exact and alias matches merge
  on their own at extraction (`ai/entities._find_or_create_entity`); these
  are the ones a person decides.
- **Link types.** An untyped link whose own sentence, or the reason somebody
  gave it, says what kind of link it is ("for example", "continues",
  "evidence", "contradicts", "background"). Words only, never a model: a cue
  is a reason a person can check, and two cues of different types are no
  suggestion at all.

Each row carries `signals` like a link suggestion, so accept and dismiss feed
`learning.signal_weights` the same way, and a dismissed suggestion is never
offered again.
"""

from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass
from difflib import SequenceMatcher

from memorymap.core.database import LINK_TYPES

#: The bar, the same as a link suggestion's.
MIN_CONFIDENCE = 0.5
#: Rows offered per kind; the sheet is a survey, not the whole notebook.
MAX_ROWS = 20
#: Near spellings at this token-sort ratio or more (the plan's number).
NEAR_RATIO = 0.9
#: A token or prefix shared by more names than this blocks no pairs: "the",
#: or a surname half the notebook carries, would make every pair a candidate.
BLOCK_CAP = 200

_WORD = re.compile(r"[^\W_]+", re.UNICODE)


@dataclass(frozen=True)
class EntityFacts:
    id: int
    name: str
    notes: frozenset[int] = frozenset()


@dataclass(frozen=True)
class LinkFacts:
    id: int
    source_id: int
    target_id: int
    #: The sentence in the source that holds the link (or the target's name).
    context: str = ""
    #: The reason on the link; ignored when `deduced` (a similarity guess
    #: has no words of its own to read).
    reason: str = ""
    deduced: bool = False


def _tokens(name: str) -> tuple[str, ...]:
    return tuple(_WORD.findall(name.casefold()))


def _signal(signal: str, reason: str, confidence: float) -> dict:
    return {"signal": signal, "reason": reason, "confidence": round(confidence, 2)}


def _noisy_or(values: list[float]) -> float:
    miss = 1.0
    for p in values:
        miss *= 1.0 - p
    return 1.0 - miss


def merge_candidates(
    entities: list[EntityFacts],
    exclude: set[frozenset[int]] | frozenset = frozenset(),
    weights: dict[str, float] | None = None,
    limit: int = MAX_ROWS,
) -> list[dict]:
    """Pairs of entities that look like one thing, surest first.

    The survivor (`keep_id`) is the longer name for a part match (the full
    name says more), otherwise the one more notes mention. Never every pair:
    a same name is a group by its words; a part match intersects the
    posting lists of the short name's words; a near spelling is compared
    only inside a block of names that agree on every word but one and on
    that word's first two letters ("Jonathan Smith", "Jonathon Smith").
    """
    weights = weights or {}
    toks = {e.id: _tokens(e.name) for e in entities}
    by_id = {e.id: e for e in entities if toks[e.id]}
    found: dict[tuple[int, int], tuple[str, str, float]] = {}

    def add(a: int, b: int, signal: str, reason: str, base: float) -> None:
        key = (a, b) if a < b else (b, a)
        if key not in found and frozenset(key) not in exclude:
            found[key] = (signal, reason, base)
            order[key] = (a, b)

    order: dict[tuple[int, int], tuple[int, int]] = {}
    same: dict[tuple[str, ...], list[int]] = defaultdict(list)
    postings: dict[str, set[int]] = defaultdict(set)
    for eid, words in toks.items():
        if eid in by_id:
            same[tuple(sorted(set(words)))].append(eid)
            for word in set(words):
                postings[word].add(eid)
    for members in same.values():
        for i, a in enumerate(members[:BLOCK_CAP]):
            for b in members[i + 1:BLOCK_CAP]:
                add(a, b, "same_name", f"“{by_id[a].name}” and “{by_id[b].name}” are the same name", 0.95)

    #: How many longer names each short name sits inside: "Sam" in three full
    #: names is three guesses, so each is worth less.
    part_of: dict[int, int] = defaultdict(int)
    for short, words in toks.items():
        if short not in by_id or not any(len(t) >= 3 for t in words):
            continue
        lists = sorted((postings[w] for w in set(words)), key=len)
        if len(lists[0]) > BLOCK_CAP:
            continue
        mine = set(words)
        for full in set.intersection(*lists):
            if full != short and mine < set(toks[full]):
                part_of[short] += 1
                add(short, full, "part_name", f"“{by_id[short].name}” is part of “{by_id[full].name}”", 0.6)

    blocks: dict[tuple, list[int]] = defaultdict(list)
    for eid in by_id:
        words = sorted(set(toks[eid]))
        for i, word in enumerate(words):
            blocks[(*words[:i], *words[i + 1:], "|" + word[:2])].append(eid)
    joined = {eid: " ".join(sorted(toks[eid])) for eid in by_id}
    matcher = SequenceMatcher(None)
    for members in blocks.values():
        if len(members) < 2 or len(members) > BLOCK_CAP:
            continue
        for i, a in enumerate(members):
            matcher.set_seq2(joined[a])
            for b in members[i + 1:]:
                key = (a, b) if a < b else (b, a)
                if key in found or frozenset(key) in exclude:
                    continue
                if any(ch.isdigit() for t in set(toks[a]) ^ set(toks[b]) for ch in t):
                    continue  # "Plan 2025" and "Plan 2026" are two things
                matcher.set_seq1(joined[b])
                if matcher.real_quick_ratio() < NEAR_RATIO or matcher.quick_ratio() < NEAR_RATIO:
                    continue
                ratio = matcher.ratio()
                if ratio >= NEAR_RATIO:
                    add(a, b, "near_name", f"“{by_id[a].name}” and “{by_id[b].name}” are spelled almost the same", ratio * 0.9)

    rows: list[dict] = []
    for key, (signal, reason, base) in found.items():
        a, b = order[key]
        if signal == "part_name" and part_of[a] > 1:
            base *= 0.7
        signals = [_signal(signal, reason, min(0.95, base * weights.get(signal, 1.0)))]
        shared = by_id[a].notes & by_id[b].notes
        if shared:
            n = len(shared)
            together = min(0.9, 0.5 * weights.get("same_note", 1.0))
            signals.append(_signal("same_note", f"named together in {n} note{'s' if n != 1 else ''}", together))
        confidence = _noisy_or([s["confidence"] for s in signals])
        if confidence < MIN_CONFIDENCE:
            continue
        ea, eb = by_id[a], by_id[b]
        if signal == "part_name":
            keep, gone = eb, ea
        else:
            keep, gone = sorted((ea, eb), key=lambda e: (-len(e.notes), -len(e.name), e.id))
        rows.append(
            {
                "keep_id": keep.id,
                "keep_name": keep.name,
                "keep_notes": len(keep.notes),
                "merge_id": gone.id,
                "merge_name": gone.name,
                "merge_notes": len(gone.notes),
                "confidence": round(confidence, 2),
                "signals": signals,
                "reason": "; ".join(s["reason"] for s in signals),
            }
        )
    rows.sort(key=lambda r: (-r["confidence"], r["keep_id"], r["merge_id"]))
    return rows[:limit]


#: What each link type is called in words (`LINK_TYPES` is "Name: meaning").
TYPE_LABELS = {key: text.split(":", 1)[0] for key, text in LINK_TYPES.items()}

#: The words that say what kind of link a sentence is making. Strong cues
#: only: "however" or "but" are in half of all sentences and say nothing
#: about the link beside them.
TYPE_CUES: dict[str, re.Pattern] = {
    "example_of": re.compile(r"\bfor (?:example|instance)\b|\be\.g\.|\bsuch as\b|\ban? (?:example|instance) of\b", re.I),
    "continues": re.compile(
        r"\bcontinu(?:es|ed|ing|ation)\b|\bfollow[- ]?up\b|\bpart (?:2|3|two|three|ii)\b|\bpicks? up (?:from|where)\b"
        r"|\bcarr(?:y|ies) on\b|\bsequel\b|\bnext (?:step|part)\b",
        re.I,
    ),
    "supports": re.compile(r"\bevidence\b|\bsupports?\b|\bconfirm(?:s|ed)?\b|\bproves?\b|\baccording to\b", re.I),
    "contradicts": re.compile(
        r"\bcontradict\w*|\bdisagree\w*|\bconflicts? with\b|\bat odds with\b|\bopposite of\b|\bin contrast\b", re.I
    ),
    "context": re.compile(r"\bbackground\b|\bsee also\b|\bexplain(?:s|ed|ing)?\b|\bcontext\b|\bmore (?:on|about) this\b", re.I),
}

#: One cue in the link's own sentence; one in a reason somebody wrote is a
#: little surer (a reason is about the link by definition).
CUE_IN_CONTEXT = 0.6
CUE_IN_REASON = 0.65


def type_candidates(
    links: list[LinkFacts],
    exclude: set[tuple[int, str]] | frozenset = frozenset(),
    weights: dict[str, float] | None = None,
    limit: int = MAX_ROWS,
) -> list[dict]:
    """A type for each untyped link whose words name one, surest first."""
    weights = weights or {}
    rows: list[dict] = []
    for link in links:
        hits: dict[str, list[tuple[str, str, float, re.Match | None]]] = defaultdict(list)
        for where, text, base in (("context", link.context, CUE_IN_CONTEXT), ("reason", "" if link.deduced else link.reason, CUE_IN_REASON)):
            if not text:
                continue
            for kind, pattern in TYPE_CUES.items():
                match = pattern.search(text)
                if match:
                    hits[kind].append((where, match.group(0), base, match if where == "context" else None))
        if len(hits) != 1:
            continue
        kind, found = next(iter(hits.items()))
        if (link.id, kind) in exclude:
            continue
        weight = weights.get(kind, 1.0)
        signals = [
            _signal(kind, f"its {'sentence' if where == 'context' else 'reason'} says “{word}”", min(0.9, base * weight))
            for where, word, base, _ in found
        ]
        confidence = _noisy_or([s["confidence"] for s in signals])
        if confidence < MIN_CONFIDENCE:
            continue
        match = next((m for *_, m in found if m is not None), None)
        rows.append(
            {
                "link_id": link.id,
                "source_id": link.source_id,
                "target_id": link.target_id,
                "link_type": kind,
                "type_label": TYPE_LABELS.get(kind, kind),
                "confidence": round(confidence, 2),
                "signals": signals,
                "reason": "; ".join(s["reason"] for s in signals),
                "context": link.context if match else "",
                "hit_start": match.start() if match else 0,
                "hit_end": match.end() if match else 0,
            }
        )
    rows.sort(key=lambda r: (-r["confidence"], -r["link_id"]))
    return rows[:limit]
