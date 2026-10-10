"""Filing with no model, measured on a labelled notebook (the 2026-10-10
triage, decision 7).

`tests/fixtures/filing/notes.json` is forty notes in eight categories a
person might keep (Gym, Cooking, Work, Travel, Health, Money, Reading, Home),
five each, written to overlap the way real notes do ("Lisbon" is in Travel
twice and nowhere else; "bake" is in Cooking; "book" is in Reading and in
Travel). Each note is filed leave-one-out by `lexical_category`, against the
other thirty-nine; top-1 accuracy counts an abstention as a miss.

The Gemini branch added votes from a fixed keyword taxonomy (`ai/taxonomy.py`)
at weight 2.0 for its own domain names, including composites the notebook
never had ("Tech & Finance", "Project: Software"), which a note could then be
filed into. These tests hold the rule the decision set: the taxonomy votes
only for a category the notebook already has, and only at a weight that
measures better than none.
"""

from __future__ import annotations

import json
from pathlib import Path


from memorymap.ai import lexical_filing
from memorymap.entry import manager

NOTES = json.loads((Path(__file__).parent / "fixtures" / "filing" / "notes.json").read_text(encoding="utf-8"))


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


def test_the_fixture_is_forty_notes_in_eight_categories() -> None:
    assert len(NOTES) == 40
    assert len({note["category"] for note in NOTES}) == 8


def test_the_shipped_taxonomy_weight_files_more_right_and_none_more_wrong(session, monkeypatch) -> None:
    """Measured: 0.05 right and 2 wrong with no vote; 0.15 and 2 at 0.5."""
    ids = _seed(session)
    shipped = lexical_filing.TAXONOMY_CATEGORY_VOTE
    monkeypatch.setattr(lexical_filing, "TAXONOMY_CATEGORY_VOTE", 0.0)
    base_right, base_wrong, _ = _score(session, ids)
    monkeypatch.setattr(lexical_filing, "TAXONOMY_CATEGORY_VOTE", shipped)
    right, wrong, names = _score(session, ids)
    assert right > base_right, (base_right, right)
    assert wrong <= base_wrong, (base_wrong, wrong)
    #: Never a category the notebook does not have ("Fitness" for a Gym
    #: note, "Literature & Travel"): the Gemini weights filed 14 of 40 so.
    assert names <= {note["category"] for note in NOTES}, names


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
