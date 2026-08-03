"""The weekly digest knows how the week's notes sit in the notebook.

The digest could see the week's notes and their categories and nothing else —
so it could tell you *what* you wrote and never notice that five of those notes
are joined to nothing, or that everything landed in one corner. Noticing that
is what a weekly recap is for, and it is exactly what the graph knows.

The rule these tests pin is that the sentence is **facts, not adjectives**:
counts the model can repeat and the user can verify by clicking. A digest that
says "your notebook feels disconnected" is an opinion nobody can check; one
that says "5 of this week's 12 notes connect to nothing" is a fact with an
action attached.
"""

from __future__ import annotations

import json
from datetime import timedelta

from memorymap.api.routes_insights import digest_structure_note
from memorymap.core.database import Entry, EntryLink, utcnow


def _note(session, content, days_ago=0, private=False):
    entry = Entry(
        content=content,
        tags=json.dumps([]),
        is_private=private,
        created_at=utcnow() - timedelta(days=days_ago),
    )
    session.add(entry)
    session.commit()
    return entry


def test_an_empty_week_says_nothing(session):
    """No notes, no sentence — the digest already has its own "nothing was
    saved" answer and does not need a second one bolted on."""
    _note(session, "written a month ago", days_ago=30)
    assert digest_structure_note(session) == ""


def test_it_counts_this_week_s_unconnected_notes(session):
    linked_a = _note(session, "the beans need netting")
    linked_b = _note(session, "netting is in the shed")
    session.add(EntryLink(source_entry_id=linked_a.id, target_entry_id=linked_b.id))
    session.commit()
    _note(session, "a stray thought")
    _note(session, "another stray thought")

    note = digest_structure_note(session)
    assert "4 notes" in note
    assert "2 are connected" in note
    # An instruction the model can follow, not a mood.
    assert "Do not guess at connections that are not there." in note


def test_a_fully_connected_week_is_worth_saying_too(session):
    a = _note(session, "one half of a pair")
    b = _note(session, "the other half")
    session.add(EntryLink(source_entry_id=a.id, target_entry_id=b.id))
    session.commit()

    note = digest_structure_note(session)
    assert "Every one of this week's 2 notes is connected" in note


def test_last_month_s_notes_are_not_counted(session):
    """"This week" has to mean this week, or the number is wrong in the one
    direction that makes the digest look broken."""
    old = _note(session, "an old unconnected note", days_ago=30)
    fresh_a = _note(session, "one half of a pair")
    fresh_b = _note(session, "the other half")
    session.add(EntryLink(source_entry_id=fresh_a.id, target_entry_id=fresh_b.id))
    session.commit()

    note = digest_structure_note(session)
    assert "2 notes" in note
    assert str(old.id) not in note


def test_private_notes_are_not_counted(session):
    """The digest is written by a model, and a private note is not available to
    one — counting it would put a number in the answer that the notes behind it
    cannot explain."""
    _note(session, "something I would rather keep to myself", private=True)
    _note(session, "an ordinary note")

    note = digest_structure_note(session)
    assert "1 notes" in note or "this week's 1" in note


def test_the_sentence_stays_short(session):
    """It rides in the prompt of a background job on a utility model, so §11a's
    budget applies here as much as anywhere."""
    for n in range(20):
        _note(session, f"note number {n}")
    assert len(digest_structure_note(session)) < 400
