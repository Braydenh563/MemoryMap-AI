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

    # The request is made on its own line, not inside the assert: `python -O`
    # strips assert statements, which would silently skip the bin step and
    # leave the purge below testing nothing. (CodeQL: py/side-effect-in-assert.)
    binned = board_client.delete(f"/entries/{entry.id}")
    assert binned.status_code == 200
    purged = board_client.delete(f"/entries/{entry.id}/purge")
    assert purged.status_code == 200, purged.text

    assert board_client.get("/whiteboard/").json()["nodes"] == []


def test_the_board_list_only_shows_boards_actually_in_use(board_client, session):
    """Reported directly: "the different board options confuse me." The
    picker used to be built client-side from *every note in the notebook* —
    this is the fix, and the test pins the shape it has to have: the default
    board always present, and a note only listed once something is actually
    on it.
    """
    plain_note = _note(session, "just an ordinary note, never a board")
    board_note = _note(session, "a real board")
    board_client.post("/whiteboard/nodes", json={"entry_id": plain_note.id, "board_id": board_note.id})

    boards = board_client.get("/whiteboard/boards").json()
    ids = [b["id"] for b in boards]
    assert None in ids  # the default board is always offered
    assert board_note.id in ids
    assert plain_note.id not in ids  # never used as a board — not listed

    entry = next(b for b in boards if b["id"] == board_note.id)
    assert entry["node_count"] == 1
    assert entry["sketch_count"] == 0


def test_creating_a_board_makes_a_named_note_and_lists_it(board_client):
    """The other half of the same report: there was no way to make a new
    board except creating an ordinary note elsewhere and finding it again in
    the all-notes dropdown."""
    created = board_client.post("/whiteboard/boards", json={"name": "Project Atlas"})
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["title"] == "Project Atlas"
    assert body["node_count"] == 0

    # A fresh board isn't "in use" yet — it won't show in the list until
    # something is actually placed on it, same as any other note.
    boards = board_client.get("/whiteboard/boards").json()
    assert body["id"] not in [b["id"] for b in boards]

    board_client.post("/whiteboard/sketches", json={"data": "M0 0 L1 1", "board_id": body["id"]})
    boards = board_client.get("/whiteboard/boards").json()
    entry = next(b for b in boards if b["id"] == body["id"])
    assert entry["title"] == "Project Atlas"
    assert entry["sketch_count"] == 1


def test_renaming_a_board_rewrites_its_notes_heading_line(board_client, session):
    """A board's title is its underlying note's own first `#` heading —
    `list_boards` reads it via `extract_title` — so renaming a board has to
    rewrite that line, not add a second stored field."""
    created = board_client.post("/whiteboard/boards", json={"name": "Old Name"}).json()
    board_client.post("/whiteboard/sketches", json={"data": "M0 0 L1 1", "board_id": created["id"]})

    renamed = board_client.put(f"/whiteboard/boards/{created['id']}", json={"title": "New Name"})
    assert renamed.status_code == 200, renamed.text
    body = renamed.json()
    assert body["title"] == "New Name"
    assert body["sketch_count"] == 1

    entry = session.get(Entry, created["id"])
    session.refresh(entry)
    assert entry.content.splitlines()[0] == "# New Name"

    boards = board_client.get("/whiteboard/boards").json()
    listed = next(b for b in boards if b["id"] == created["id"])
    assert listed["title"] == "New Name"


def test_renaming_the_default_board_is_refused_not_a_crash(board_client):
    """`board_id=None` is the always-present scratch board — there is no
    underlying note to rewrite a heading line into."""
    resp = board_client.put("/whiteboard/boards/0", json={"title": "Nope"})
    assert resp.status_code == 404


def test_renaming_a_stale_board_id_404s(board_client):
    resp = board_client.put("/whiteboard/boards/999999", json={"title": "Ghost"})
    assert resp.status_code == 404


def test_an_image_object_needs_a_real_media_url(board_client):
    """A card wraps a note, a sketch is a path — neither is a placeable
    image. `data.url` has to be a same-origin `/media/...` path, the shape
    `POST /media/upload` always returns, not an arbitrary string a client
    could otherwise stash here."""
    refused = board_client.post(
        "/whiteboard/objects",
        json={"kind": "image", "data": {"url": "https://evil.example/x.png"}},
    )
    assert refused.status_code == 422

    made = board_client.post(
        "/whiteboard/objects",
        json={"kind": "image", "data": {"url": "/media/abc123.png"}, "x": 5, "y": 5},
    )
    assert made.status_code == 201, made.text
    body = made.json()
    assert body["data"]["url"] == "/media/abc123.png"
    assert body["width"] == 200  # the default, not zero


def test_a_text_object_round_trips_with_its_own_style(board_client):
    made = board_client.post(
        "/whiteboard/objects",
        json={
            "kind": "text",
            "data": {"content": "Meeting notes", "color": "#ffcc00", "font_size": 18},
            "x": 10, "y": 20, "width": 240, "height": 80,
        },
    )
    assert made.status_code == 201, made.text
    obj_id = made.json()["id"]

    state = board_client.get("/whiteboard/").json()
    assert len(state["objects"]) == 1
    assert state["objects"][0]["data"] == {
        "content": "Meeting notes", "color": "#ffcc00", "font_size": 18, "url": None,
        "bg": None, "border_color": None,
    }

    moved = board_client.put(
        f"/whiteboard/objects/{obj_id}",
        json={
            "kind": "text",
            "data": {"content": "Meeting notes — updated"},
            "x": 50, "y": 60, "width": 300, "height": 90,
        },
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["x"] == 50
    assert moved.json()["width"] == 300
    assert moved.json()["data"]["content"] == "Meeting notes — updated"


def test_an_objects_kind_cannot_be_changed_on_update(board_client):
    made = board_client.post(
        "/whiteboard/objects", json={"kind": "text", "data": {"content": "hi"}}
    ).json()
    refused = board_client.put(
        f"/whiteboard/objects/{made['id']}",
        json={"kind": "image", "data": {"url": "/media/x.png"}},
    )
    assert refused.status_code == 422


def test_an_image_url_cannot_point_outside_the_media_folder(board_client, tmp_path):
    """`delete_object` unlinks the file behind an image object, so a
    `startswith("/media/")` check on the way in is a file-deletion hole:
    `/media/../../../x` passes it and resolves anywhere on disk. Caught by
    CodeQL as a path-injection alert on the commit that introduced it.
    """
    outsider = deps.get_config().data_dir / "DO_NOT_DELETE.txt"
    outsider.write_text("important")

    for bad in (
        "/media/../DO_NOT_DELETE.txt",
        "/media/../../etc/passwd",
        "/media/sub/dir.png",
        "/mediafoo.png",
        "https://evil.example/x.png",
    ):
        refused = board_client.post(
            "/whiteboard/objects", json={"kind": "image", "data": {"url": bad}}
        )
        assert refused.status_code == 422, f"{bad!r} should be refused, got {refused.status_code}"

    assert outsider.exists()
    assert board_client.get("/whiteboard/").json()["objects"] == []


def test_a_legacy_traversing_url_still_cannot_delete_an_outside_file(board_client, session):
    """Defence in depth: a row written before the pattern check existed (or
    by anything that skips it) must still not be able to unlink whatever it
    names. `_media_path` resolves and confirms containment rather than
    trusting the stored string."""
    from memorymap.core.database import WhiteboardObject

    outsider = deps.get_config().data_dir / "SURVIVOR.txt"
    outsider.write_text("important")

    smuggled = WhiteboardObject(
        kind="image", data='{"url": "/media/../SURVIVOR.txt"}', x=0, y=0, width=50, height=50
    )
    session.add(smuggled)
    session.commit()

    deleted = board_client.delete(f"/whiteboard/objects/{smuggled.id}")
    assert deleted.status_code == 200
    assert outsider.exists(), "the row went, but it must not take an outside file with it"


def test_deleting_an_image_object_removes_its_file_from_disk(board_client):
    """The only row that ever pointed at this file — unlike a note's inline
    `![]()` image, which nothing in the app tracks or cleans up yet."""
    media_dir = deps.get_config().data_dir / "media"
    media_dir.mkdir(parents=True, exist_ok=True)
    (media_dir / "keepme.png").write_bytes(b"fake png bytes")

    made = board_client.post(
        "/whiteboard/objects", json={"kind": "image", "data": {"url": "/media/keepme.png"}}
    ).json()
    assert (media_dir / "keepme.png").exists()

    deleted = board_client.delete(f"/whiteboard/objects/{made['id']}")
    assert deleted.status_code == 200
    assert not (media_dir / "keepme.png").exists()
    assert board_client.get("/whiteboard/").json()["objects"] == []


def test_objects_count_toward_a_board_appearing_in_the_list(board_client, session):
    board = _note(session, "a board with only a text box on it")
    board_client.post(
        "/whiteboard/objects",
        json={"kind": "text", "data": {"content": "hi"}, "board_id": board.id},
    )
    boards = board_client.get("/whiteboard/boards").json()
    entry = next(b for b in boards if b["id"] == board.id)
    assert entry["object_count"] == 1


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

    # Out of the assert for the same reason as above — under `python -O` the
    # board would never reach the bin and the purge would be a no-op.
    binned = board_client.delete(f"/entries/{board.id}")
    assert binned.status_code == 200
    purged = board_client.delete(f"/entries/{board.id}/purge")
    assert purged.status_code == 200, purged.text

    # The card survives, moved to the default board rather than deleted.
    default_board = board_client.get("/whiteboard/").json()["nodes"]
    assert [n["id"] for n in default_board] == [node["id"]]
    assert default_board[0]["board_id"] is None


def test_moving_a_card_keeps_it_on_its_board(ai_client, session):
    """`PUT /whiteboard/nodes/{id}` takes the whole node, and the browser was
    not sending `board_id` — so dragging a card on a named board read as "move
    this to the global board" and it vanished from the board you were looking
    at."""
    entry = _note(session, "a note")
    board = _note(session, "a board")
    node = ai_client.post(
        "/whiteboard/nodes", json={"entry_id": entry.id, "board_id": board.id}
    ).json()

    moved = ai_client.put(
        f"/whiteboard/nodes/{node['id']}",
        json={"entry_id": entry.id, "board_id": board.id, "x": 40, "y": 50},
    )
    assert moved.status_code == 200
    assert moved.json()["board_id"] == board.id
    on_board = ai_client.get(f"/whiteboard/?board_id={board.id}").json()
    assert [n["id"] for n in on_board["nodes"]] == [node["id"]]


def test_the_frontend_sends_the_board_when_it_moves_a_card():
    """The guard for the half of that bug that lives in the browser."""
    from memorymap.api.app import FRONTEND_DIR

    app_js = (FRONTEND_DIR / "app.js").read_text(encoding="utf-8")
    save = app_js[app_js.index("// Sync back to API.") :][:900]
    assert "board_id" in save, "the coordinate save must carry the card's board"
