"""Questions about the shape of the notebook, answered by counting.

Asked for directly: *"enhance the semantic search so it can pick up stuff like
if I ask 'what are my most common tags', or maybe 'categories with the most
notes'."*

Retrieval cannot answer these and that is not a tuning problem: semantic search
finds the notes most *like* a question, and "what are my most common tags" is
not like any note. Before this, such a question retrieved five arbitrary notes
and the model was told to answer from those alone — so it either declined or
invented a ranking from a five-note sample.

These tests are exact on purpose. The whole argument for computing rather than
retrieving is that the answer is a fact, so a test that accepted "roughly the
right tags" would be testing the thing this replaced.
"""

from __future__ import annotations

import json

from memorymap.ai import notebook_stats
from memorymap.core import deps
from memorymap.core.database import Category, Entry, EntryLink


def _note(session, content, tags=(), category=None):
    entry = Entry(content=content, tags=json.dumps(list(tags)))
    if category is not None:
        entry.category_id = category
    session.add(entry)
    session.flush()
    return entry


def _session():
    return deps.get_db().session()


def test_most_common_tags_are_ranked(client):
    with _session() as session:
        _note(session, "a", ["work", "urgent"])
        _note(session, "b", ["work"])
        _note(session, "c", ["work", "idea"])
        _note(session, "d", ["idea"])
        session.commit()
        result = notebook_stats.answer("what are my most common tags", session)
    assert result is not None
    assert result.kind == "tags"
    assert [fact["label"] for fact in result.facts][:2] == ["work", "idea"]
    assert result.facts[0]["count"] == 3
    assert "work (3)" in result.text


def test_the_question_can_be_phrased_several_ways(client):
    with _session() as session:
        _note(session, "a", ["work"])
        session.commit()
        for phrasing in (
            "what are my most common tags",
            "which tags do I use most",
            "top tags",
            "my most popular tags?",
        ):
            assert notebook_stats.answer(phrasing, session) is not None, phrasing


def test_categories_with_the_most_notes(client):
    with _session() as session:
        big = Category(name="Work")
        small = Category(name="Cooking")
        session.add_all([big, small])
        session.flush()
        _note(session, "a", category=big.id)
        _note(session, "b", category=big.id)
        _note(session, "c", category=small.id)
        session.commit()
        result = notebook_stats.answer("which categories have the most notes", session)
    assert result is not None
    assert result.facts[0] == {"label": "Work", "count": 2}


def test_binned_and_private_notes_are_nobody_s_statistics(client):
    """A count that changes when a note is made private leaks what is in it."""
    with _session() as session:
        _note(session, "counted", ["shown"])
        hidden = _note(session, "private", ["secret"])
        hidden.is_private = True
        binned = _note(session, "binned", ["gone"])
        binned.deleted_at = notebook_stats.utcnow()
        session.commit()
        result = notebook_stats.answer("how many notes do I have", session)
        tags = notebook_stats.answer("my most common tags", session)
    assert result.facts[0]["count"] == 1
    assert [fact["label"] for fact in tags.facts] == ["shown"]


def test_untagged_notes_are_countable(client):
    with _session() as session:
        _note(session, "tagged", ["x"])
        _note(session, "bare")
        _note(session, "also bare")
        session.commit()
        result = notebook_stats.answer("how many notes have no tags", session)
    assert result.facts[0] == {"label": "untagged", "count": 2}


def test_most_connected_notes_count_both_directions(client):
    """A note everything points at is as central as one that points at everything."""
    with _session() as session:
        hub = _note(session, "the hub")
        a = _note(session, "a")
        b = _note(session, "b")
        session.add_all(
            [
                EntryLink(source_entry_id=a.id, target_entry_id=hub.id),
                EntryLink(source_entry_id=b.id, target_entry_id=hub.id),
            ]
        )
        session.commit()
        result = notebook_stats.answer("which are my most linked notes", session)
    assert result.facts[0]["label"] == "the hub"
    assert result.facts[0]["count"] == 2


def test_an_empty_notebook_answers_plainly(client):
    with _session() as session:
        result = notebook_stats.answer("what are my most common tags", session)
    assert result is not None
    assert "not tagged any notes" in result.text


def test_an_ordinary_question_falls_through_to_search(client):
    """Anything not recognised must behave exactly as it did before."""
    with _session() as session:
        for question in (
            "what did I write about pasta",
            "summarise my week",
            "hello",
            "what does the note about tags say",
        ):
            assert notebook_stats.answer(question, session) is None, question


def test_a_singular_count_reads_as_english(client):
    with _session() as session:
        _note(session, "only one")
        session.commit()
        assert "1 note." in notebook_stats.answer("how many notes do I have", session).text


def test_categories_pluralise_correctly(client):
    with _session() as session:
        session.add(Category(name="Only"))
        session.commit()
        text = notebook_stats.answer("how many categories do I have", session).text
    assert "1 category." in text


def test_the_chat_route_answers_with_the_count_and_no_model(client):
    """End to end, and with nothing running: the point of computing these.

    A local model may be stopped, slow to load, or absent entirely. A question
    about the notebook's own shape has an exact answer that needs none of it,
    and this is the test that says so.
    """
    with _session() as session:
        _note(session, "a", ["work", "urgent"])
        _note(session, "b", ["work"])
        session.commit()
    reply = client.post("/chat", json={"question": "what are my most common tags"})
    assert reply.status_code == 200, reply.text
    body = reply.json()
    assert "work (2)" in body["ai_response"]
    assert body["answered_by"] is None, (
        "no model wrote this sentence, so none may be named under it"
    )


def test_an_ordinary_question_still_goes_through_search(client):
    """The fall-through must be the behaviour that was there before."""
    with _session() as session:
        _note(session, "the pasta recipe uses fresh basil", ["cooking"])
        session.commit()
    body = client.post("/chat", json={"question": "what did I write about pasta"}).json()
    assert "work (" not in body["ai_response"]
