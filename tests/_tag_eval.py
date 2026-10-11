"""The tag and category suggestion eval (INBOX 781): `tests/fixtures/tagging/
notes.json`, 67 notes like the owner's (uni subjects and assignments, games,
friends, ideas, journal lines, captioned images with OCR text, short and long),
each with the tags and category a careful person would give and a one-line
reason. Each note is asked leave-one-out against the other 66, which carry
their tags as the notebook's vocabulary; a note's `have` tags are on it
already, so only the rest are wanted.

* p1: the first suggestion is a wanted tag (no suggestion is a miss).
* p3: of all suggestions shown (at most three a note), the share wanted.
* recall3: of all wanted tags, the share among the suggestions.
* junk: suggestions that are a stopword, a near-duplicate of a tag the note
  or the notebook has (a different spelling of one), a tag the note already
  has, or a word that the note says only inside a quotation.
* category: lexical filing files the note in the labelled category (holding
  a sensitive note back, decision 6, counts as a miss).
* category_first: the first choice offered (filed, or the first one-tap
  chip) is the labelled category.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

NOTES = json.loads((Path(__file__).parent / "fixtures" / "tagging" / "notes.json").read_text(encoding="utf-8"))


def body(note: dict) -> str:
    title = note.get("title")
    return f"# {title}\n\n{note['content']}" if title else note["content"]


def seed(session) -> list[int]:
    from memorymap.ai import lexical_filing
    from memorymap.entry import manager

    lexical_filing.forget_corpus()
    ids = [
        manager.create_entry(session, body(note), category_name=note["category"], tags=note["tags"]).id
        for note in NOTES
    ]
    session.commit()
    return ids


def _fold(tag: str) -> str:
    word = re.sub(r"[^a-z0-9]+", "", tag.casefold())
    return word[:-1] if len(word) > 3 and word.endswith("s") else word


def _quoted_only(tag: str, text: str) -> bool:
    words = tag.casefold().split()
    quoted = " ".join(re.findall(r"[\"“]([^\"”]*)[\"”]", text)).casefold()
    if not quoted:
        return False
    outside = re.sub(r"[\"“][^\"”]*[\"”]", " ", text).casefold()
    return all(w in quoted for w in words) and not all(w in outside for w in words)


def junk(tag: str, note: dict, vocabulary: set[str]) -> str:
    """Why a suggestion is junk, or ""."""
    from memorymap.ai import lexical_filing

    low = tag.casefold()
    have = {t.casefold() for t in note.get("have", [])}
    if low in have:
        return "already on the note"
    if not lexical_filing.tokens(tag):
        return "a stopword"
    if any(_fold(tag) == _fold(t) for t in have) or (low not in vocabulary and any(_fold(tag) == _fold(t) for t in vocabulary)):
        return "a near-duplicate"
    if _quoted_only(tag, note["content"]):
        return "only in a quote"
    return ""


def measure(session, suggest=None) -> dict:
    """The numbers, and each note's suggestions under "rows"."""
    from memorymap.ai import lexical_filing, tagging

    ids = seed(session)
    suggest = suggest or (lambda content, have, entry_id: tagging.suggest(session, content, have=have, exclude_entry_id=entry_id))
    vocabulary = {t.casefold() for note in NOTES for t in note["tags"]}
    first = shown = right_shown = wanted_total = found = junk_n = cat_right = cat_first = 0
    rows = []
    for entry_id, note in zip(ids, NOTES):
        have = note.get("have", [])
        wanted = {t.casefold() for t in note["tags"]} - {t.casefold() for t in have}
        got = suggest(body(note), have, entry_id)[:3]
        folded = [t.casefold() for t in got]
        first += bool(folded) and folded[0] in wanted
        shown += len(got)
        right_shown += sum(t in wanted for t in folded)
        wanted_total += len(wanted)
        found += len(wanted & set(folded))
        bad = [(t, why) for t in got if (why := junk(t, note, vocabulary))]
        junk_n += len(bad)
        decision = lexical_filing.decide(session, body(note), exclude_entry_id=entry_id)
        match = decision.filed if not decision.held else None
        cat_right += bool(match) and match.name == note["category"]
        offered = decision.filed or (decision.ranked[0] if decision.ranked else None)
        cat_first += bool(offered) and offered.name == note["category"]
        rows.append({"content": note["content"][:60], "wanted": sorted(wanted), "got": got, "junk": bad,
                     "category": match.name if match else None})
    n = len(NOTES)
    return {
        "p1": round(first / n, 3),
        "p3": round(right_shown / shown, 3) if shown else 0.0,
        "recall3": round(found / wanted_total, 3),
        "shown": shown,
        "junk": junk_n,
        "category": round(cat_right / n, 3),
        "category_first": round(cat_first / n, 3),
        "rows": rows,
    }
