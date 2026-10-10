"""Merge and rename rows in Tidy, and the personal lexicon (WORLD_CLASS_PLAN
23, decisions 4 and 7).

Two categories about the same topics become one row, "Merge Fitness into
Gym?", with counts and the measures that decided; a category whose notes are
mostly about a topic it is not named for gets "Rename Misc to Fitness?".
Applying asks (the frontend's confirm), and Undo is one press. A merge and a
move out of an automatic filing are the person's own words for a topic, and
the next note about it files where they said.
"""

from __future__ import annotations

from sqlalchemy import select

from memorymap.ai import lexical_filing
from memorymap.core.database import AuditLog, Category
from memorymap.entry import manager, tidy


def _notes(session, rows) -> None:
    for content, category in rows:
        manager.create_entry(session, content, category_name=category)
    session.commit()


GYM = (
    ("Leg day: squats and deadlifts", "Gym"),
    ("Bench press PR and pull-ups", "Gym"),
    ("Deload week, squat form", "Gym"),
    ("Kettlebell swings and a barbell row", "Gym"),
)
FITNESS = (
    ("Workout: deadlift and squat", "Fitness"),
    ("Cardio on the treadmill", "Fitness"),
)


def _category(session, name):
    return session.scalar(select(Category).where(Category.name == name))


def test_two_categories_about_the_same_topics_are_one_row_and_merge_with_undo(session, app_state) -> None:
    _notes(session, GYM + FITNESS + (("Pasta with garlic", "Cooking"), ("Banana bread", "Cooking")))
    rows = tidy.rows(session, "similar-categories")
    assert [r["title"] for r in rows] == ["Merge Fitness into Gym?"]
    row = rows[0]
    assert not row["ticked"] and row["detail"].startswith("4, 2 notes, all about Fitness")
    assert "by topics alone" in row["detail"]
    result = tidy.apply(session, "similar-categories", [row["id"]])
    assert result["applied"] == 1
    assert _category(session, "Fitness") is None
    assert lexical_filing.personal_lexicon(session)["Fitness"]["Gym"] >= 1
    tidy.undo(session, result["undo_id"])
    fitness = _category(session, "Fitness")
    assert fitness is not None
    assert len([e for e in session.scalars(select(manager.Entry).where(manager.Entry.category_id == fitness.id))]) == 2
    assert not session.scalars(select(AuditLog).where(AuditLog.detail.like("alias:%"))).all()


def test_a_category_named_for_nothing_it_holds_is_offered_a_name(session, app_state) -> None:
    _notes(session, tuple((content, "Misc") for content, _ in GYM))
    rows = tidy.rows(session, "category-names")
    assert [r["title"] for r in rows] == ["Rename Misc to Fitness?"]
    result = tidy.apply(session, "category-names", [rows[0]["id"]])
    assert result["applied"] == 1 and _category(session, "Fitness") is not None
    assert len(result["entry_ids"]) == 4
    tidy.undo(session, result["undo_id"])
    assert _category(session, "Misc") is not None and _category(session, "Fitness") is None


def test_a_named_category_is_not_offered_a_rename(session, app_state) -> None:
    _notes(session, GYM)
    assert tidy.rows(session, "category-names") == []


def test_work_not_software_is_learned_from_the_persons_move(session, app_state) -> None:
    """Decision 7: "Work, not Software". A note filed into Software by its
    words and moved to Work by hand teaches that Software notes go to Work;
    nothing is learned from a filing nobody corrected."""
    _notes(session, (
        ("Python script refactor and unit tests", "Software"),
        ("Debugging the JavaScript build", "Software"),
        ("Git branch cleanup and code review", "Software"),
        ("Standup with the team about the launch", "Work"),
        ("Quarterly planning meeting", "Work"),
        ("Client call about the renewal", "Work"),
    ))
    text = "Python script for the deploy, with unit tests"
    assert lexical_filing.decide(session, text).ranked[0].name == "Software"
    entry = manager.create_entry(session, "Python code for the release, unit tests first", category_name="Software")
    entry.filing_state = manager.WORDS_FILED
    session.commit()
    manager.update_entry(session, entry, category_name="Work")
    session.commit()
    decision = lexical_filing.decide(session, text)
    assert decision.ranked[0].name == "Work"
    assert decision.ranked[0].why.endswith("which you file under Work.")


def test_three_overlapping_categories_are_one_row(session, app_state) -> None:
    _notes(session, GYM + FITNESS + (("Squat and bench, sets and reps", "Misc"), ("Deadlift day", "Misc"), ("Pull-ups", "Misc")))
    rows = tidy.rows(session, "similar-categories")
    assert [r["title"] for r in rows] == ["Merge Misc and Fitness into Gym?"]
    result = tidy.apply(session, "similar-categories", [rows[0]["id"]])
    assert result["applied"] == 1 and _category(session, "Misc") is None and _category(session, "Fitness") is None
    tidy.undo(session, result["undo_id"])
    assert _category(session, "Misc") is not None and _category(session, "Fitness") is not None
