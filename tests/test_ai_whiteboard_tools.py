"""The agent's whiteboard tools (ROADMAP item 11's AI+whiteboard piece):
read_whiteboard, search_whiteboard, add_whiteboard_card, add_whiteboard_link.

Nothing under `ai/` mentioned the whiteboard at all before these existed —
this file is the first coverage for that gap.
"""

from __future__ import annotations

import json

import pytest

from memorymap.ai import tools
from memorymap.core.database import Entry, WhiteboardNode, WhiteboardObject, WhiteboardSketch


def _note(session, content="a note"):
    entry = Entry(content=content)
    session.add(entry)
    session.commit()
    return entry


def test_read_whiteboard_lists_cards_links_and_text_boxes(session):
    a = _note(session, "Kickoff plan")
    b = _note(session, "Budget draft")
    node_a = WhiteboardNode(entry_id=a.id, x=0, y=0)
    node_b = WhiteboardNode(entry_id=b.id, x=100, y=100)
    session.add_all([node_a, node_b])
    session.commit()
    link = WhiteboardSketch(
        data=json.dumps({"type": "link-straight", "sourceId": node_a.id, "targetId": node_b.id, "color": "#fff"}),
    )
    text_obj = WhiteboardObject(kind="text", data=json.dumps({"content": "milestone", "color": "#000", "font_size": 14}))
    session.add_all([link, text_obj])
    session.commit()

    result = tools.TOOLS["read_whiteboard"].handler(session, {})
    assert result["board_id"] is None
    assert {c["note_id"] for c in result["cards"]} == {a.id, b.id}
    assert result["links"] == [{"from_card_id": node_a.id, "to_card_id": node_b.id}]
    assert result["text_boxes"] == [{"object_id": text_obj.id, "text": "milestone"}]


def test_read_whiteboard_default_board_is_not_confused_with_an_absent_one(session):
    """`board_id IS NULL` is a board, not "no board" — the same trap this
    project's own `_board_filter` in routes_whiteboard.py already guards
    against; the AI tool has its own copy of the filter and had to get it
    right independently."""
    a = _note(session)
    session.add(WhiteboardNode(entry_id=a.id, board_id=None, x=0, y=0))
    session.commit()

    result = tools.TOOLS["read_whiteboard"].handler(session, {"board_id": None})
    assert len(result["cards"]) == 1


def test_search_whiteboard_finds_a_card_by_note_content_and_says_which_board(session):
    board_note = _note(session, "Project board")
    a = _note(session, "The quarterly roadmap draft")
    session.add(WhiteboardNode(entry_id=a.id, board_id=board_note.id, x=0, y=0))
    session.commit()

    result = tools.TOOLS["search_whiteboard"].handler(session, {"query": "roadmap"})
    assert result["total_matching"] == 1
    assert result["matches"][0]["board_id"] == board_note.id
    assert result["matches"][0]["note_id"] == a.id


def test_search_whiteboard_requires_a_query(session):
    with pytest.raises(tools.ToolError):
        tools.TOOLS["search_whiteboard"].handler(session, {"query": "  "})


def test_add_whiteboard_card_refuses_a_private_note(session):
    """The exact regression class CLAUDE.md's own review checklist names: a
    write tool that skips `_require_note` silently loses the one guard that
    refuses a private note. This tool must not be that fourth instance."""
    private = _note(session, "secret")
    private.is_private = True
    session.commit()

    with pytest.raises(tools.ToolError):
        tools.TOOLS["add_whiteboard_card"].handler(session, {"note_id": private.id})


def test_add_whiteboard_card_is_idempotent_on_the_same_board(session):
    """Calling it twice for the same note/board must not create two cards —
    the agent retrying (or a user asking twice) shouldn't duplicate a card
    the way it would duplicate a note."""
    a = _note(session)
    first = tools.TOOLS["add_whiteboard_card"].handler(session, {"note_id": a.id, "x": 5, "y": 5})
    second = tools.TOOLS["add_whiteboard_card"].handler(session, {"note_id": a.id, "x": 999, "y": 999})
    assert first["card_id"] == second["card_id"]
    assert second["already_there"] is True
    assert session.query(WhiteboardNode).count() == 1


def test_add_whiteboard_link_connects_two_real_cards(session):
    a, b = _note(session, "A"), _note(session, "B")
    node_a = WhiteboardNode(entry_id=a.id, x=0, y=0)
    node_b = WhiteboardNode(entry_id=b.id, x=0, y=0)
    session.add_all([node_a, node_b])
    session.commit()

    result = tools.TOOLS["add_whiteboard_link"].handler(
        session, {"from_card_id": node_a.id, "to_card_id": node_b.id}
    )
    sketch = session.get(WhiteboardSketch, result["link_id"])
    data = json.loads(sketch.data)
    assert data["type"] == "link-straight"
    assert data["sourceId"] == node_a.id
    assert data["targetId"] == node_b.id


def test_add_whiteboard_link_rejects_an_unknown_card(session):
    with pytest.raises(tools.ToolError):
        tools.TOOLS["add_whiteboard_link"].handler(session, {"from_card_id": 999, "to_card_id": 998})


def test_add_whiteboard_link_rejects_a_self_link(session):
    a = _note(session, "A")
    node_a = WhiteboardNode(entry_id=a.id, x=0, y=0)
    session.add(node_a)
    session.commit()

    with pytest.raises(tools.ToolError):
        tools.TOOLS["add_whiteboard_link"].handler(
            session, {"from_card_id": node_a.id, "to_card_id": node_a.id}
        )


def test_add_whiteboard_link_rejects_cards_on_different_boards(session):
    """Without this, a link between cards on two different boards saved as a
    sketch on the source's board only — the target node is never in the
    target board's own fetched state, so the link renders with a dangling
    endpoint on both boards it could conceivably show up on."""
    a, b = _note(session, "A"), _note(session, "B")
    board = _note(session, "# A board")
    node_a = WhiteboardNode(entry_id=a.id, x=0, y=0, board_id=None)
    node_b = WhiteboardNode(entry_id=b.id, x=0, y=0, board_id=board.id)
    session.add_all([node_a, node_b])
    session.commit()

    with pytest.raises(tools.ToolError):
        tools.TOOLS["add_whiteboard_link"].handler(
            session, {"from_card_id": node_a.id, "to_card_id": node_b.id}
        )


def test_whiteboard_write_tools_are_in_the_write_tools_set(session):
    """The agent's "you claimed you saved it but never called a write tool"
    safety net keys off this set — missing from it means a real card/link
    creation would read as a hallucinated claim."""
    assert "add_whiteboard_card" in tools.WRITE_TOOLS
    assert "add_whiteboard_link" in tools.WRITE_TOOLS
