"""Reading a question before searching for it, and searching both ways at once.

Three changes, all asked for directly, all in the same path:

1. *"Take into account the time of notes as well. So if I ask 'what notes have
   I saved in the last week', it will return the right ones."* — a time phrase
   is a **filter**, not search terms. Before this it was neither: it diluted
   the embedding, dragged the keyword search off course, and the range it meant
   was never applied.
2. *"Use the embedding model to improve the semantic search… streamline the
   user's query into something that returns better results."* — the question's
   scaffolding comes off before anything is embedded. For a three-word subject
   "what did I write about" is most of the sentence, so the vector describes
   the phrasing rather than the subject.
3. Both searches now run and their rankings are **fused**, where before
   semantic won outright and keyword was only consulted when semantic came
   back empty. A note containing the query verbatim used to lose to three notes
   that were vaguely on topic.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta

import pytest

from memorymap.core.database import Entry, EntryLink
from memorymap.search import query, search_manager

TODAY = date(2026, 8, 2)


def _note(session, content, tags=None, days_ago=0, parent_id=None):
    entry = Entry(
        content=content,
        tags=json.dumps(tags or []),
        parent_id=parent_id,
        created_at=datetime(2026, 8, 2, 12, 0) - timedelta(days=days_ago),
    )
    session.add(entry)
    session.commit()
    return entry


# --- what the question was asking ----------------------------------------------


@pytest.mark.parametrize(
    "question,since,until",
    [
        ("what notes have I saved in the last week", date(2026, 7, 26), TODAY),
        ("what did I write yesterday", date(2026, 8, 1), date(2026, 8, 1)),
        ("anything from this month", date(2026, 8, 1), TODAY),
        ("notes from the last 3 days", date(2026, 7, 30), TODAY),
        ("what have I saved recently", date(2026, 7, 19), TODAY),
        ("what did I save today", TODAY, TODAY),
    ],
)
def test_a_time_phrase_becomes_a_date_range(question, since, until):
    asked = query.understand(question, TODAY)
    assert (asked.since, asked.until) == (since, until)


def test_a_question_only_about_time_has_no_subject_left():
    """"What did I write last week" has nothing to be similar *to*. Saying so
    is what lets retrieval list the range instead of ranking noise."""
    asked = query.understand("what notes have I saved in the last week", TODAY)
    assert asked.time_only is True
    assert asked.subject == ""


def test_a_subject_survives_the_time_phrase_being_lifted_out():
    asked = query.understand("what did I write about the allotment last week", TODAY)
    assert asked.subject == "allotment"
    assert asked.since == date(2026, 7, 26)
    assert asked.time_only is False


def test_scaffolding_comes_off_the_subject():
    """The embedding half. "show me my notes about bread" and "bread" should
    reach the model as the same search."""
    assert query.understand("show me my notes about bread", TODAY).subject == "bread"
    assert query.understand("find my notes on the shed", TODAY).subject == "shed"


def test_a_question_word_inside_the_subject_is_kept():
    """Only the *front* is stripped. "how" is scaffolding at the start of
    "how many notes" and the subject itself in "how do I prove bread"."""
    asked = query.understand("how do I prove bread", TODAY)
    assert "prove bread" in asked.subject


def test_a_question_with_no_time_and_no_scaffolding_is_left_alone():
    asked = query.understand("beans", TODAY)
    assert asked.subject == "beans"
    assert asked.has_range is False


def test_an_empty_question_is_not_an_error():
    asked = query.understand("", TODAY)
    assert asked.subject == "" and asked.has_range is False


# --- what retrieval does with it ------------------------------------------------


def test_a_time_only_question_returns_the_notes_from_that_range(session, fake_embeddings):
    _note(session, "bread proving notes from ages ago", days_ago=60)
    recent_one = _note(session, "the beans need netting", days_ago=2)
    recent_two = _note(session, "shed door hinge", days_ago=5)

    found, mode = search_manager.retrieve(
        session, "what notes have I saved in the last week", fake_embeddings
    )
    assert mode == "dated"
    assert {e.id for e in found} == {recent_one.id, recent_two.id}


def test_a_range_narrows_a_subject_search(session, fake_embeddings):
    """The failure this prevents: a better-matching note from March answering
    a question that said "last week"."""
    _note(session, "the allotment, everything about it", days_ago=90)
    recent = _note(session, "allotment: netting the beans", days_ago=1)

    found, _mode = search_manager.retrieve(
        session, "what did I write about the allotment last week", fake_embeddings
    )
    assert [e.id for e in found] == [recent.id]


def test_an_exact_phrase_is_not_lost_to_vaguely_related_notes(session, fake_embeddings):
    """Reciprocal rank fusion, as a property. The note containing the words
    must not be beaten by notes that merely score higher by cosine."""
    exact = _note(session, "sourdough starter feeding schedule")
    for n in range(4):
        _note(session, f"a note about baking in general, number {n}")

    found, mode = search_manager.retrieve(
        session, "sourdough starter feeding schedule", fake_embeddings, limit=3
    )
    assert exact.id in {e.id for e in found}
    assert mode in {"hybrid", "semantic", "keyword"}


# --- the graph in every answer --------------------------------------------------


def test_a_linked_note_is_pulled_in_beside_the_match(session, fake_embeddings):
    """What makes this a memory *map* rather than a search box: you wrote the
    question's subject in one note and the thing you need in the note you
    linked from it."""
    match = _note(session, "the beans need netting before the pigeons find them")
    linked = _note(session, "netting is in the shed behind the mower")
    session.add(EntryLink(source_entry_id=match.id, target_entry_id=linked.id))
    session.commit()

    found, _mode = search_manager.retrieve(session, "beans netting", fake_embeddings, limit=1)
    ids = [e.id for e in found]
    assert match.id in ids
    assert linked.id in ids, "the note the match links to should come with it"
    # Context, not a match: it comes after everything that actually matched, so
    # a budgeted prompt drops it first.
    assert ids.index(linked.id) > ids.index(match.id)


def test_a_reply_is_pulled_in_with_the_note_it_answers(session, fake_embeddings):
    root = _note(session, "trying a new proving schedule")
    reply = _note(session, "day two: better crumb", parent_id=root.id)

    found, _mode = search_manager.retrieve(session, "proving schedule", fake_embeddings, limit=1)
    assert reply.id in {e.id for e in found}


def test_expansion_can_be_switched_off(session, fake_embeddings):
    """Callers that want the matches alone — a duplicate check, where a linked
    note is not a candidate for anything."""
    match = _note(session, "the beans need netting")
    linked = _note(session, "netting is in the shed")
    session.add(EntryLink(source_entry_id=match.id, target_entry_id=linked.id))
    session.commit()

    found, _mode = search_manager.retrieve(
        session, "beans netting", fake_embeddings, limit=1, expand_graph=False
    )
    assert [e.id for e in found] == [match.id]


def test_expansion_never_reaches_a_private_note(session, fake_embeddings):
    """Retrieval feeds the model. A private note must not arrive by the back
    door of being linked to something public."""
    match = _note(session, "the beans need netting")
    secret = _note(session, "something I would rather keep to myself")
    secret.is_private = True
    session.add(EntryLink(source_entry_id=match.id, target_entry_id=secret.id))
    session.commit()

    found, _mode = search_manager.retrieve(session, "beans netting", fake_embeddings, limit=2)
    assert secret.id not in {e.id for e in found}


def test_a_dated_question_that_finds_nothing_stays_in_its_range(session, fake_embeddings):
    """The "never look empty" fallback must not quietly drop the one constraint
    the person actually stated.

    Asking about the allotment *last week*, with nothing about the allotment
    that week, used to fall back to recent notes from any time at all — labelled
    `recent`, with no sign the date had been ignored. Answering the wrong
    question confidently is worse than answering none.
    """
    _note(session, "the allotment, everything about it", days_ago=90)
    this_week = _note(session, "unrelated, but from this week", days_ago=2)

    found, mode = search_manager.retrieve(
        session, "what did I write about the allotment last week", fake_embeddings
    )
    assert mode == "dated"
    assert all(e.id != 90 for e in found)
    # What it *can* honestly offer is what is in the window.
    assert this_week.id in {e.id for e in found}


def test_an_empty_window_returns_nothing_rather_than_something_else(session, fake_embeddings):
    """A true empty answer the caller can render as "nothing that week" beats a
    list of notes from three months ago."""
    _note(session, "the allotment, everything about it", days_ago=90)

    found, mode = search_manager.retrieve(
        session, "what did I write about the allotment last week", fake_embeddings
    )
    assert mode == "dated"
    assert found == []


def test_an_undated_question_still_falls_back_to_recent(session, fake_embeddings):
    """The original behaviour, unchanged where it was right: a notebook must
    never look empty when it isn't."""
    _note(session, "a note about something else entirely")
    found, mode = search_manager.retrieve(
        session, "zzz nothing matches this zzz", fake_embeddings
    )
    assert mode == "recent"
    assert found
