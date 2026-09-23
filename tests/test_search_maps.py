"""Mind maps in the one search (reported: "Mind maps don't show in the Find
anything universal search").

Two causes, both in `search/index.py`, and both measured here:

- a map was indexed as a `board`, so the finder could only ever show it as
  one (a previous pass relabelled the board chip "boards & maps" rather than
  telling the two apart, which the data always could: `board_settings.type`);
- a map's words live on its topics (`WhiteboardObject.data.content`), and
  the index read only the entry's own content, which for a map is the one
  line `# Title`. Searching for anything written *on* a map found nothing.
"""
from __future__ import annotations

import json

from sqlalchemy import text as sa_text


def _map(session, title: str, *, kind: str = "map"):
    from memorymap.core.database import Entry

    entry = Entry(
        content=f"# {title}",
        is_board=True,
        board_settings=json.dumps({"type": kind, "layout": "tree-right"}),
    )
    session.add(entry)
    session.flush()
    return entry


def _topic(session, board_id: int, content: str, kind: str = "topic"):
    from memorymap.core.database import WhiteboardObject

    obj = WhiteboardObject(board_id=board_id, kind=kind, data=json.dumps({"content": content}))
    session.add(obj)
    session.flush()
    return obj


def _kinds(session) -> dict[int, str]:
    rows = session.execute(sa_text("SELECT ref_id, kind FROM search_index")).all()
    return {int(ref_id): kind for ref_id, kind in rows}


def test_a_map_is_indexed_as_a_map_and_a_board_as_a_board(session):
    from memorymap.search import index

    board = _map(session, "Kitchen plan", kind="board")
    mind = _map(session, "Bubble tea")
    session.commit()
    kinds = _kinds(session)
    assert kinds[board.id] == "board"
    assert kinds[mind.id] == "map"
    counts = index.counts(session)
    assert counts["map"] == 1 and counts["board"] == 1 and counts["note"] == 0


def test_the_words_on_a_map_find_the_map(session):
    from memorymap.search import engine

    mind = _map(session, "Bubble tea")
    _topic(session, mind.id, "Tapioca pearls")
    session.commit()
    hits = engine.search(session, "tapioca", ctx=None, hybrid=False)
    assert [(hit.kind, hit.ref_id) for hit in hits] == [("map", mind.id)]
    assert hits[0].title == "Bubble tea"


def test_a_board_text_box_finds_its_board(session):
    from memorymap.search import engine

    board = _map(session, "Garden", kind="board")
    _topic(session, board.id, "Compost bins by the shed", kind="text")
    session.commit()
    hits = engine.search(session, "compost", ctx=None, hybrid=False)
    assert [(hit.kind, hit.ref_id) for hit in hits] == [("board", board.id)]


def test_editing_and_deleting_a_topic_keeps_the_map_row_in_step(session):
    from memorymap.search import engine

    mind = _map(session, "Bubble tea")
    node = _topic(session, mind.id, "Tapioca pearls")
    session.commit()
    node.data = json.dumps({"content": "Taro milk"})
    session.commit()
    assert not engine.search(session, "tapioca", ctx=None, hybrid=False)
    assert engine.search(session, "taro", ctx=None, hybrid=False)
    session.delete(node)
    session.commit()
    assert not engine.search(session, "taro", ctx=None, hybrid=False)
    assert engine.search(session, "bubble", ctx=None, hybrid=False)


def test_turning_a_board_into_a_map_moves_its_row(session):
    board = _map(session, "Trip", kind="board")
    session.commit()
    assert _kinds(session)[board.id] == "board"
    board.board_settings = json.dumps({"type": "map", "layout": "tree-right"})
    session.commit()
    rows = session.execute(
        sa_text("SELECT kind FROM search_index WHERE ref_id = :id"), {"id": board.id}
    ).all()
    assert [row[0] for row in rows] == ["map"], "one row, as a map, not a board and a map"


def test_an_index_from_before_maps_had_a_kind_is_put_right(session):
    """A notebook indexed before this change holds its maps under the boards
    slot. The startup reconcile moves them without a full rebuild."""
    from memorymap.search import index

    mind = _map(session, "Bubble tea")
    _topic(session, mind.id, "Tapioca pearls")
    session.commit()
    # Recreate the old shape by hand: the row under the boards source, kind
    # "board", with only the entry's own content in it.
    session.execute(sa_text("DELETE FROM search_index"))
    boards = index.source_for("boards")
    index._write(
        session.connection(),
        boards,
        mind.id,
        index.Row(title="Bubble tea", body="# Bubble tea"),
    )
    session.commit()
    assert _kinds(session)[mind.id] == "board"
    assert index.reconcile_boards(session) is True
    session.commit()
    assert _kinds(session) == {mind.id: "map"}
    # And it is a one-time cost: a second startup has nothing to do.
    assert index.reconcile_boards(session) is False


def test_the_route_filters_by_map_and_counts_maps(client):
    made = client.post("/whiteboard/boards", json={"name": "Bubble tea", "type": "map"})
    assert made.status_code == 201
    client.post("/whiteboard/boards", json={"name": "Bubble plan"})
    body = client.get("/search?q=bubble&limit=30").json()
    assert {hit["kind"] for hit in body["hits"]} == {"map", "board"}
    assert body["counts"]["map"] == 1 and body["counts"]["board"] == 1
    only = client.get("/search?q=bubble&kind=map&limit=30").json()
    assert [(hit["kind"], hit["id"]) for hit in only["hits"]] == [("map", made.json()["id"])]
