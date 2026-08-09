"""The whiteboard's API: cards, sketches, and which board they belong to.

Written during the §40 audit, because the whiteboard shipped with no tests at
all and four of the five things asserted here were broken. Each test names the
failure it caught rather than the method it calls — a test called
`test_create_node` tells the next session nothing about why it exists.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from memorymap.core import deps
from memorymap.core.database import Entry


@pytest.fixture()
def board_client(app_state):
    from memorymap.api.app import create_app
    from tests.fakes import FakeEmbeddingService, FakeOllama

    deps.override_ai(
        ollama=FakeOllama(running=False),
        embeddings=FakeEmbeddingService(available=False),
    )
    return TestClient(create_app())


def _note(session, content="a note"):
    entry = Entry(content=content)
    session.add(entry)
    session.commit()
    return entry


def test_the_default_board_hands_back_what_was_put_on_it(board_client, session):
    """`board_id IS NULL` is a board, not an absence.

    The query filtered with `board_id == None`, which SQL renders as
    `= NULL` — never true for any row. So the unnamed scratch board, which is
    the one every notebook starts on, always came back empty however many
    cards you had dropped onto it, and they reappeared only if you happened to
    create a named board.
    """
    entry = _note(session)
    created = board_client.post(
        "/whiteboard/nodes", json={"entry_id": entry.id, "x": 10, "y": 20}
    )
    assert created.status_code == 200, created.text

    state = board_client.get("/whiteboard/").json()
    assert [n["entry_id"] for n in state["nodes"]] == [entry.id]
    assert (state["nodes"][0]["x"], state["nodes"][0]["y"]) == (10, 20)


def test_a_card_cannot_point_at_a_note_that_does_not_exist(board_client):
    """An unvalidated `entry_id` is a board that can never render again.

    Nothing checked the id, so a card for note 9999 was accepted, stored, and
    then failed to draw — with no way to select or delete it from the UI,
    because the thing you would click is the card that isn't there.
    """
    refused = board_client.post("/whiteboard/nodes", json={"entry_id": 9999})
    assert refused.status_code == 404
    assert board_client.get("/whiteboard/").json()["nodes"] == []


def test_dropping_the_same_note_twice_moves_its_card(board_client, session):
    """Two cards for one note stack exactly, and read as one that won't drag."""
    entry = _note(session)
    first = board_client.post(
        "/whiteboard/nodes", json={"entry_id": entry.id, "x": 1, "y": 1}
    ).json()
    second = board_client.post(
        "/whiteboard/nodes", json={"entry_id": entry.id, "x": 50, "y": 60}
    ).json()

    assert second["id"] == first["id"]
    nodes = board_client.get("/whiteboard/").json()["nodes"]
    assert len(nodes) == 1
    assert (nodes[0]["x"], nodes[0]["y"]) == (50, 60)


def test_a_card_can_be_moved_to_another_board(board_client, session):
    """`PUT` read `board_id` from the body and never assigned it, so "move
    this card to that board" returned 200 and changed nothing."""
    entry, board = _note(session), _note(session, "a board")
    node = board_client.post("/whiteboard/nodes", json={"entry_id": entry.id}).json()

    moved = board_client.put(
        f"/whiteboard/nodes/{node['id']}",
        json={"entry_id": entry.id, "board_id": board.id, "x": 5, "y": 5},
    )
    assert moved.status_code == 200
    assert moved.json()["board_id"] == board.id

    assert board_client.get("/whiteboard/").json()["nodes"] == []
    on_board = board_client.get(f"/whiteboard/?board_id={board.id}").json()
    assert [n["id"] for n in on_board["nodes"]] == [node["id"]]


def test_deleting_a_card_that_is_already_gone_says_so(board_client):
    """A cheerful `{"status": "ok"}` for a node that isn't there is how a
    stale board keeps its ghost cards until someone reloads the page."""
    missing_node = board_client.delete("/whiteboard/nodes/4321")
    assert missing_node.status_code == 404
    missing_sketch = board_client.delete("/whiteboard/sketches/4321")
    assert missing_sketch.status_code == 404


def test_a_sketch_round_trips_on_its_own_board(board_client, session):
    board = _note(session, "a board")
    made = board_client.post(
        "/whiteboard/sketches",
        json={"data": "M0 0 L10 10", "board_id": board.id, "x": 3, "y": 4},
    )
    assert made.status_code == 200, made.text

    # ...and does not leak onto the default board.
    assert board_client.get("/whiteboard/").json()["sketches"] == []
    scoped = board_client.get(f"/whiteboard/?board_id={board.id}").json()
    assert [s["data"] for s in scoped["sketches"]] == ["M0 0 L10 10"]


def test_an_enormous_sketch_is_refused_rather_than_stored(board_client):
    """The stroke list arrives as text and nothing bounded it, so a runaway
    client could fill the notebook's disk one PUT at a time."""
    from memorymap.api.routes_whiteboard import MAX_SKETCH_CHARS

    too_big = board_client.post(
        "/whiteboard/sketches", json={"data": "x" * (MAX_SKETCH_CHARS + 1)}
    )
    assert too_big.status_code == 422


def test_a_stale_board_id_is_refused_not_a_crash(board_client, session):
    """`board_id` is a real `ForeignKey("entries.id")`
    (`PRAGMA foreign_keys=ON`) — writing one that doesn't exist wasn't
    validated the way `entry_id` already was, so it reached `db.commit()`
    and came back as a raw, unhandled `IntegrityError` — a 500, not a 404,
    and the frontend's own "the board is stale, reload" recovery only
    catches 4xx/error responses gracefully either way, but a 500 is a bug in
    its own right, not just a stale read.
    """
    entry = _note(session)
    refused = board_client.post(
        "/whiteboard/nodes", json={"entry_id": entry.id, "board_id": 9999}
    )
    assert refused.status_code == 404
    assert board_client.get("/whiteboard/").json()["nodes"] == []

    node = board_client.post("/whiteboard/nodes", json={"entry_id": entry.id}).json()
    moved = board_client.put(
        f"/whiteboard/nodes/{node['id']}",
        json={"entry_id": entry.id, "board_id": 9999, "x": 0, "y": 0},
    )
    assert moved.status_code == 404

    bad_sketch = board_client.post(
        "/whiteboard/sketches", json={"data": "M0 0 L1 1", "board_id": 9999}
    )
    assert bad_sketch.status_code == 404


def test_purging_a_note_removes_its_own_whiteboard_card(board_client, session):
    """`_hard_delete` deletes rows in half a dozen tables that carry a real
    `ForeignKey("entries.id")` before it deletes the entry itself, because
    `PRAGMA foreign_keys=ON` fails the whole `DELETE FROM entries` the
    instant one is left behind — reproduced live: emptying the recycle bin
    for a note that had a whiteboard card on it 500'd, and the note (and
    everything else in the same purge batch) stayed stuck in the bin.
    `WhiteboardNode`/`WhiteboardSketch` were added to the schema after
    `_hard_delete` was written and were never added to its cleanup list.
    """
    entry = _note(session)
    board_client.post("/whiteboard/nodes", json={"entry_id": entry.id})

    assert board_client.delete(f"/entries/{entry.id}").status_code == 200
    purged = board_client.delete(f"/entries/{entry.id}/purge")
    assert purged.status_code == 200, purged.text

    assert board_client.get("/whiteboard/").json()["nodes"] == []


def test_purging_a_board_note_detaches_its_cards_instead_of_deleting_them(
    board_client, session
):
    """The board itself is just a note (`board_id` points at one), and
    purging *that* note must not take every card on the board down with
    it — the same 'orphan becomes a root' choice already made for
    `Entry.parent_id`, not a cascade delete.
    """
    entry, board = _note(session), _note(session, "a board")
    node = board_client.post(
        "/whiteboard/nodes", json={"entry_id": entry.id, "board_id": board.id}
    ).json()

    assert board_client.delete(f"/entries/{board.id}").status_code == 200
    purged = board_client.delete(f"/entries/{board.id}/purge")
    assert purged.status_code == 200, purged.text

    # The card survives, moved to the default board rather than deleted.
    default_board = board_client.get("/whiteboard/").json()["nodes"]
    assert [n["id"] for n in default_board] == [node["id"]]
    assert default_board[0]["board_id"] is None
