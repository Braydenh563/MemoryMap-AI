"""The graph as context the AI can use, not only as a picture (§9).

Asked directly: *"is the graph an actual knowledge graph? I want it to be one
for the AI to have easily usable and accessible context."*

It was half of one. The edges were real and persisted — explicit links, reply
threads, shared tags — and the graph *view* had been drawing them as typed
edges since it was built. What the agent could see was `get_note`'s `links`
field: a bare list of note ids, with no indication of what any of them meant,
one note per tool call. So it could add connections and never follow them.

`related_notes` closes that. The point of these tests is the two properties
that make it usable as context rather than as a data dump:

- **Every edge says what it is.** "You linked these" and "these share #recipes"
  are different strengths of evidence, and a flat list of ids hides that.
- **It is bounded like every other reading tool.** The second hop of a
  well-connected note can be most of the notebook, and a neighbourhood is only
  useful if it fits in the prompt beside everything else.
"""

from __future__ import annotations

import json

import pytest

from memorymap.ai import tools
from memorymap.core.database import Entry, EntryLink
from memorymap.entry import manager


def _note(session, content, tags=None, parent_id=None):
    entry = Entry(content=content, tags=json.dumps(tags or []), parent_id=parent_id)
    session.add(entry)
    session.commit()
    return entry


def _related(session, note_id, depth=1):
    return tools.TOOLS["related_notes"].handler(
        session, {"note_id": note_id, "depth": depth}
    )


# --- the edges are typed ------------------------------------------------------


def test_an_explicit_link_is_reported_as_a_link(session):
    a = _note(session, "sourdough starter needs feeding")
    b = _note(session, "the oven runs hot")
    session.add(EntryLink(source_entry_id=a.id, target_entry_id=b.id))
    session.commit()

    found = _related(session, a.id)["related"]
    assert [n["id"] for n in found] == [b.id]
    assert found[0]["how"] == "linked"


def test_a_link_is_followed_in_both_directions(session):
    """An edge is a connection, not an arrow. A note linked *to* is just as
    related as one linked *from*, and only reporting one direction would make
    half the graph invisible depending on who created the link."""
    a = _note(session, "first")
    b = _note(session, "second")
    session.add(EntryLink(source_entry_id=a.id, target_entry_id=b.id))
    session.commit()
    assert [n["id"] for n in _related(session, b.id)["related"]] == [a.id]


def test_a_reply_is_reported_as_a_thread_and_says_which_way(session):
    parent = _note(session, "planning the trip")
    child = _note(session, "actually, let's go in May", parent_id=parent.id)

    from_parent = _related(session, parent.id)["related"][0]
    assert from_parent["id"] == child.id
    assert "reply to this" in from_parent["how"]

    from_child = _related(session, child.id)["related"][0]
    assert from_child["id"] == parent.id
    assert "reply to it" in from_child["how"]


def test_a_shared_tag_names_the_tag(session):
    """"Shares #recipes" reads differently from "you linked these", and the
    model can only weigh them differently if it is told which it has."""
    a = _note(session, "carbonara", tags=["recipes", "italian"])
    b = _note(session, "cacio e pepe", tags=["recipes"])
    found = _related(session, a.id)["related"]
    assert found[0]["id"] == b.id
    assert found[0]["how"] == "shares #recipes"


def test_several_shared_tags_are_all_named(session):
    a = _note(session, "one", tags=["work", "urgent"])
    _note(session, "two", tags=["work", "urgent"])
    assert _related(session, a.id)["related"][0]["how"] == "shares #urgent, #work"


def test_the_strongest_connection_wins_when_there_are_two(session):
    """A note that is both linked and tagged reports the link: someone decided
    those two belong together, which outranks them happening to share a word."""
    a = _note(session, "one", tags=["work"])
    b = _note(session, "two", tags=["work"])
    session.add(EntryLink(source_entry_id=a.id, target_entry_id=b.id))
    session.commit()
    assert _related(session, a.id)["related"][0]["how"] == "linked"


def test_sharing_a_category_is_not_a_connection(session):
    """Nearly every note shares a category with dozens of others. Including it
    would drown the signals that mean something under one that means "these
    are both notes"."""
    a = _note(session, "one")
    _note(session, "two")  # same (default) category, nothing else in common
    assert _related(session, a.id)["related"] == []


# --- walking further ---------------------------------------------------------


def test_depth_two_reaches_a_neighbour_of_a_neighbour(session):
    a = _note(session, "a")
    b = _note(session, "b")
    c = _note(session, "c")
    session.add(EntryLink(source_entry_id=a.id, target_entry_id=b.id))
    session.add(EntryLink(source_entry_id=b.id, target_entry_id=c.id))
    session.commit()

    assert [n["id"] for n in _related(session, a.id, depth=1)["related"]] == [b.id]
    two = _related(session, a.id, depth=2)["related"]
    assert [n["id"] for n in two] == [b.id, c.id]
    assert two[1]["hops"] == 2
    # And it says which note it hung off, so a two-hop result isn't floating.
    assert two[1]["via"] == b.id


def test_the_starting_note_is_never_in_its_own_results(session):
    a = _note(session, "a", tags=["x"])
    b = _note(session, "b", tags=["x"])
    session.add(EntryLink(source_entry_id=a.id, target_entry_id=b.id))
    session.commit()
    assert all(n["id"] != a.id for n in _related(session, a.id, depth=2)["related"])


def test_a_cycle_does_not_loop_forever(session):
    a = _note(session, "a")
    b = _note(session, "b")
    session.add(EntryLink(source_entry_id=a.id, target_entry_id=b.id))
    session.add(EntryLink(source_entry_id=b.id, target_entry_id=a.id))
    session.commit()
    assert [n["id"] for n in _related(session, a.id, depth=2)["related"]] == [b.id]


def test_depth_is_capped(session):
    """The second hop of a well-connected note can be most of the notebook;
    there is no third."""
    a = _note(session, "a")
    assert _related(session, a.id, depth=99)["note_id"] == a.id  # no explosion


def test_deleted_notes_are_not_neighbours(session):
    a = _note(session, "a")
    b = _note(session, "b")
    session.add(EntryLink(source_entry_id=a.id, target_entry_id=b.id))
    session.commit()
    b.is_deleted = True
    session.commit()
    assert _related(session, a.id)["related"] == []


# --- bounded like every other reading tool -----------------------------------


def test_a_huge_neighbourhood_is_capped_and_says_so(session):
    a = _note(session, "hub", tags=["everything"])
    for i in range(30):
        _note(session, f"spoke {i}", tags=["everything"])
    result = _related(session, a.id)
    assert len(result["related"]) == tools.MAX_GRAPH_NOTES
    assert "truncated" in result, "a capped result that doesn't say so is a lie"


def test_nearest_notes_survive_the_cap(session):
    """Breadth-first, so what gets cut is the furthest away — which is the
    right thing to lose."""
    a = _note(session, "a")
    direct = _note(session, "direct")
    session.add(EntryLink(source_entry_id=a.id, target_entry_id=direct.id))
    session.commit()
    for i in range(30):
        far = _note(session, f"far {i}")
        session.add(EntryLink(source_entry_id=direct.id, target_entry_id=far.id))
    session.commit()

    found = _related(session, a.id, depth=2)["related"]
    assert found[0]["id"] == direct.id
    assert all(n["hops"] <= 2 for n in found)


def test_an_unconnected_note_explains_how_to_connect_things(session):
    """An empty result that says nothing reads as a broken tool."""
    a = _note(session, "a lonely note")
    result = _related(session, a.id)
    assert result["related"] == []
    assert "link_notes" in result["note"]


def test_an_unknown_note_id_is_a_tool_error(session):
    with pytest.raises(tools.ToolError):
        _related(session, 99999)


# --- reachable from the agent -------------------------------------------------


def test_a_question_about_connections_is_offered_the_tool():
    for question in (
        "what is related to note 3?",
        "what notes connect to this one?",
        "show me the graph around note 7",
    ):
        assert "related_notes" in (tools.focus_for(question) or [])


def test_it_is_a_reading_tool_not_a_writing_one():
    """It must never need a confirm card: walking the graph changes nothing."""
    spec = tools.TOOLS["related_notes"]
    assert not spec.destructive
    assert "related_notes" not in tools.WRITE_TOOLS


# --- potential connections, kept separate from real ones ---------------------


def _suggested(session, note_id):
    return tools.TOOLS["related_notes"].handler(
        session, {"note_id": note_id, "include_suggestions": True}
    )


def test_suggestions_are_off_unless_asked_for(session, app_state, fake_embeddings):
    """A similarity sweep costs a comparison per note. An ordinary "what
    connects to this" question shouldn't pay for one it didn't ask for."""
    a = _note(session, "a joke about a scarecrow")
    _note(session, "another joke, also funny")
    from memorymap.core import deps

    deps.get_embeddings().store_for_entry(session, a)
    session.commit()
    assert "might_connect" not in _related(session, a.id)


def test_a_potential_connection_is_never_reported_as_a_real_one(
    session, app_state, fake_embeddings
):
    """The one way this feature could mislead: "reads similarly" repeated back
    to the user as "these are linked". They live in separate lists, and the
    guess list says what it is."""
    from memorymap.core import deps

    a = _note(session, "a joke about a scarecrow")
    b = _note(session, "another scarecrow joke, very funny")
    for entry in (a, b):
        deps.get_embeddings().store_for_entry(session, entry)
    session.commit()

    result = _suggested(session, a.id)
    # Nothing was ever linked, so the factual list stays empty.
    assert result["related"] == []
    if result.get("might_connect"):
        assert all("NOT linked" in n["how"] for n in result["might_connect"])
        assert "NOT connections" in result["about_might_connect"]


def test_an_already_connected_note_is_not_also_suggested(
    session, app_state, fake_embeddings
):
    """It is already in `related` as a fact. Repeating it as a guess would be
    the same note twice, described two different ways."""
    from memorymap.core import deps

    a = _note(session, "a joke about a scarecrow")
    b = _note(session, "another scarecrow joke, very funny")
    session.add(EntryLink(source_entry_id=a.id, target_entry_id=b.id))
    for entry in (a, b):
        deps.get_embeddings().store_for_entry(session, entry)
    session.commit()

    result = _suggested(session, a.id)
    assert [n["id"] for n in result["related"]] == [b.id]
    assert b.id not in {n["id"] for n in result.get("might_connect", [])}


def test_a_note_that_was_never_embedded_suggests_nothing(session, app_state):
    """No vector means nothing to compare. Falling back to keywords here would
    quietly change what the tool means."""
    a = _note(session, "never embedded")
    assert "might_connect" not in _suggested(session, a.id)


def test_the_empty_answer_points_at_suggestions(session):
    """"Nothing is connected" is more useful when it says what to try next."""
    a = _note(session, "a lonely note")
    assert "include_suggestions" in _related(session, a.id)["note"]
