"""Filing with no model, measured on a labelled notebook (the 2026-10-10
triage, decision 7; WORLD_CLASS_PLAN 23, decision 8).

`tests/fixtures/filing/notes.json` is 120 hand-labelled notes in twelve
categories a person might keep, ten each, written to overlap the way real
notes do ("Lisbon" is in Travel twice and nowhere else; "book" is in
Reading, Travel and Car; "car insurance" is filed under Money). Each note
has a `kind` (line, pasted, joke, caption, list) and nine carry
`"sensitive": true`. The first forty are the triage's; the other eighty were
written for section 23 before any of its filing code, so they measure it
rather than describe it. Each note is filed leave-one-out, against the other
119; top-1 accuracy counts an abstention as a miss.

Measured (`scratchpad/filing-tools/measure.py`, leave one out, through
`janitor.categorise` with no chat model):

| step | no model | with the embedder (bge-small, no chat model) |
| --- | --- | --- |
| baseline, 2026-10-10 | 0.175 (8 wrong, 91 abstained) | 0.817 (18 wrong, 4 abstained) |
| step 2, the pack replaces the Gemini map | 0.192 (8 wrong) | 0.817 |
| step 3, the decision (decision 2), sensitive held | 0.417 (15 wrong; 0.533 with sensitive filing on) | 0.808 (20 wrong) |
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

import pytest

from memorymap.ai import lexical_filing
from memorymap.entry import manager

NOTES = json.loads((Path(__file__).parent / "fixtures" / "filing" / "notes.json").read_text(encoding="utf-8"))
#: The floor this file holds: no step may file fewer right, and of the notes
#: it files at least this share must be right (a wrong category is a note
#: lost; the module's promise since INBOX 434 is "right 80% of the times it
#: files"). Sensitive notes held back (decision 6) count as not filed.
FLOOR_TOP1 = 0.41
FLOOR_PRECISION = 0.75
#: Decision 8: below this top-1 with no model, the step is not done.
BAR_TOP1 = 0.8


def _seed(session) -> list[int]:
    ids = [manager.create_entry(session, note["content"], category_name=note["category"]).id for note in NOTES]
    session.commit()
    return ids


def _score(session, ids: list[int]) -> tuple[float, int, set[str]]:
    """(top-1 accuracy, notes filed wrong, the names filed into)."""
    right = wrong = 0
    names: set[str] = set()
    for entry_id, note in zip(ids, NOTES):
        match = lexical_filing.lexical_category(session, note["content"], exclude_entry_id=entry_id)
        if match:
            names.add(match.name)
            right += match.name == note["category"]
            wrong += match.name != note["category"]
    return right / len(NOTES), wrong, names


def test_the_fixture_is_120_notes_in_twelve_categories_of_every_kind() -> None:
    assert len(NOTES) == 120
    assert set(Counter(note["category"] for note in NOTES).values()) == {10}
    assert {note["kind"] for note in NOTES} == {"line", "pasted", "joke", "caption", "list"}
    assert sum(1 for note in NOTES if note.get("sensitive")) >= 6


def test_filing_with_no_model_holds_its_floor(session) -> None:
    ids = _seed(session)
    right, wrong, names = _score(session, ids)
    assert right >= FLOOR_TOP1, right
    filed_right = right * len(NOTES)
    assert filed_right / (filed_right + wrong) >= FLOOR_PRECISION, (right, wrong)
    #: Never a category the notebook does not have ("Fitness" for a Gym
    #: note, "Literature & Travel"): the Gemini weights filed 14 of 40 so.
    assert names <= {note["category"] for note in NOTES}, names


@pytest.mark.xfail(strict=True, reason="WORLD_CLASS_PLAN 23 decision 8: 0.8 top-1 with no model is the bar")
def test_filing_with_no_model_reaches_the_bar(session) -> None:
    ids = _seed(session)
    right, _wrong, _names = _score(session, ids)
    assert right >= BAR_TOP1, right


def test_tags_offered_are_only_the_notebooks_own(session) -> None:
    """INBOX, the owner 2026-10-10: "Study and university tags are suggested
    on the top note if it has no tags no matter what the note is about".
    With no model, a note is offered only tags the notebook already uses and
    only those its words or its nearest notes back: a note about cooking in a
    notebook whose most used tags are "study" and "university" gets neither,
    and a note that says "study" outright gets no tag the notebook lacks."""
    for i in range(6):
        manager.create_entry(session, f"Lecture {i} notes on thermodynamics and entropy", category_name="Uni", tags=["study", "university"])
    for i in range(2):
        manager.create_entry(session, f"Pasta night {i}: garlic, chilli, lemon", category_name="Cooking", tags=["dinner"])
    session.commit()
    cooking = lexical_filing.suggest_tags(session, "Lentil dal with cumin and a tin of tomatoes", have=[])
    assert not {"study", "university"} & set(cooking), cooking
    vocabulary = {"study", "university", "dinner"}
    for text in ("Study plan for the exam: two hours a day at the university library", "A squat and deadlift session"):
        assert set(lexical_filing.suggest_tags(session, text, have=[])) <= vocabulary
