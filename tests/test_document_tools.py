"""The agent can write a document, not only read one (roadmap §35J).

Reported directly: "the agent can't create a document either". There was
`list_documents` and `get_document` and no way to make one — so a model asked
to "write this up properly" could read every document the user had and then
had nowhere to put the result.

A gap nobody noticed rather than a deliberate limit: §5's document work was
built UI-first, and the tools were added for reading because that is what the
chat needed at the time.

Kept as its own tool rather than a flag on `create_note`. The database keeps
notes and documents apart precisely so half-written documents do not turn up in
search results and in the graph; one tool covering both would hand the model
the decision that the separation exists to make.
"""

from __future__ import annotations

import pytest

from memorymap.ai import agent, tools
from memorymap.core.database import Document


def test_a_document_is_written_and_readable_back(session, app_state):
    result = tools.TOOLS["create_document"].handler(
        session, {"title": "Bean report", "content": "# Beans\n\nThey grow."}
    )
    stored = session.get(Document, result["id"])
    assert stored.title == "Bean report"
    assert stored.content == "# Beans\n\nThey grow."
    assert result["words"] == 4  # "#", "Beans", "They", "grow."


def test_it_offers_an_undo(session, app_state):
    """Every other write carries the call that would put it back, so the run
    summary can show an Undo beside it. §21 lists "links and reminders have no
    inverse tool" as a real cost — shipping a new write without one would be
    adding to that list rather than working it down."""
    result = tools.TOOLS["create_document"].handler(
        session, {"title": "Draft", "content": "text"}
    )
    undo = result["undo"]
    assert undo["tool"] == "delete_document"
    tools.TOOLS["delete_document"].handler(session, undo["arguments"])
    assert session.get(Document, result["id"]) is None


def test_deleting_a_document_asks_first():
    """It is not soft-deleted the way a note is, so it never runs inside the
    agent loop — the user gets a confirm card."""
    assert tools.TOOLS["delete_document"].destructive is True
    assert tools.TOOLS["create_document"].destructive is False


def test_an_empty_document_is_refused(session, app_state):
    """A titled empty document is the shape of a model that called the tool to
    announce its intention. Refusing is what makes it write first."""
    with pytest.raises(tools.ToolError, match="content"):
        tools.TOOLS["create_document"].handler(session, {"title": "Later", "content": " "})


def test_a_document_with_no_title_is_refused(session, app_state):
    with pytest.raises(tools.ToolError, match="title"):
        tools.TOOLS["create_document"].handler(session, {"title": "", "content": "text"})


def test_an_enormous_document_is_refused_with_its_size(session, app_state):
    """The content comes back through the model's own output, and an unbounded
    one means a single call could fill the window on the next round."""
    huge = "x" * (tools.MAX_NEW_DOCUMENT_CHARS + 1)
    with pytest.raises(tools.ToolError, match="too long"):
        tools.TOOLS["create_document"].handler(session, {"title": "Big", "content": huge})


def test_it_counts_as_a_write(session, app_state):
    """So the change shows in a skill run's summary, and so the hallucination
    net does not warn about a document that really was written."""
    assert "create_document" in tools.WRITE_TOOLS
    assert agent.unsupported_claims("I wrote that up for you.", {"create_document"}) == []


def test_the_write_up_words_offer_it(app_state):
    """"Write this up" cued nothing before the tool existed to be cued."""
    for question in ("write up my bean notes", "draft a report on beans"):
        focused = tools.focus_for(question)
        assert focused is None or "create_document" in focused
