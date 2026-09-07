"""Mindmaps: the map object, its tree, and the rule that a map contains its
own contents (MINDMAP_PLAN.md Phase 1).

The containment tests come first in this file because they were written
first, before any of the code they cover — the plan says so by name ("Write
the test first; this is the rule most likely to be got wrong"), and the rule
itself is the one place where getting it wrong destroys somebody's notes
rather than drawing a wrong picture:

> any and all text boxes and things that are in the map stay bundled within
> the map

A `topic` exists only in the map, so it goes with the map. A `note` /
`document` / `file` node is a *pointer at something in the library*, so the
pointer goes and the thing it pointed at must still be there afterwards.
Those are opposite outcomes for two rows in the same table, which is exactly
why a test says which is which.
"""

from __future__ import annotations

import json

from memorymap.core.database import Entry, WhiteboardObject


def _map(client, name="Thesis map", layout="tree-right"):
    board = client.post(
        "/whiteboard/boards", json={"name": name, "type": "map", "layout": layout}
    )
    assert board.status_code == 201, board.text
    return board.json()


def _node(client, board_id, *, parent_id=None, text="", kind="topic", ref_id=None):
    body = {"kind": kind, "parent_id": parent_id, "text": text}
    if ref_id is not None:
        body["ref_id"] = ref_id
    created = client.post(f"/whiteboard/boards/{board_id}/nodes", json=body)
    assert created.status_code == 201, created.text
    return created.json()


def _purge(client, entry_id):
    """The bin, then the bin emptied — the only path to a permanent delete,
    and the one the Library's own Delete action starts down."""
    assert client.delete(f"/entries/{entry_id}").status_code == 200
    purged = client.delete(f"/entries/{entry_id}/purge")
    assert purged.status_code == 200, purged.text


# --- containment ------------------------------------------------------------


def test_deleting_a_map_takes_its_topics_and_leaves_the_notes_it_referenced(
    client, session
):
    """The rule, both halves of it, in one test.

    Without this the default behaviour is actively wrong in two different
    directions at once: purging a board detaches everything on it to the
    default scratch board (`manager._hard_delete`), so a deleted map's topics
    would reappear as loose text on the one board nobody deletes — and any
    attempt to fix that by simply deleting everything on the board would take
    the referenced *notes* with it, which is data loss.
    """
    note = client.post("/entries", json={"content": "Chapter three"}).json()
    board = _map(client)
    topic = _node(client, board["id"], text="Root")
    child = _node(client, board["id"], parent_id=topic["id"], text="Branch")
    reference = _node(
        client, board["id"], parent_id=topic["id"], kind="note", ref_id=note["id"]
    )

    _purge(client, board["id"])

    for object_id in (topic["id"], child["id"], reference["id"]):
        assert session.get(WhiteboardObject, object_id) is None, (
            f"object {object_id} outlived the map it lived in"
        )
    survivor = session.get(Entry, note["id"])
    assert survivor is not None and not survivor.is_deleted, (
        "deleting a map deleted a note that only happened to be referenced by it"
    )


def test_deleting_an_ordinary_board_still_detaches_its_objects(client, session):
    """The behaviour containment must not break.

    A plain whiteboard's text boxes and images are *not* bundled: purging the
    board note detaches them to the default board rather than destroying
    them, deliberately (see `_hard_delete`'s own comment — "delete this one
    note" must not silently wipe a whiteboard). Containment is a rule about
    maps, and this asserts it stayed one.
    """
    board = client.post("/whiteboard/boards", json={"name": "Scratch"}).json()
    text = client.post(
        "/whiteboard/objects",
        json={"kind": "text", "board_id": board["id"], "data": {"content": "hello"}},
    ).json()

    _purge(client, board["id"])

    survivor = session.get(WhiteboardObject, text["id"])
    assert survivor is not None, "an ordinary board's text box was destroyed with it"
    assert survivor.board_id is None


def test_deleting_a_topic_deletes_its_subtree_and_hands_it_back(client):
    """Coggle's choice, made deliberately: a deleted branch takes its
    children with it rather than re-homing them on the grandparent.

    Re-parenting reads as tidier and is worse: a branch you meant to remove
    reappears as loose children under a node that never had them, and there
    is no single action that undoes it. Deleting the subtree is one action —
    so the response carries the whole subtree back, which is what lets the
    frontend offer a real undo instead of a warning dialog.
    """
    board = _map(client)
    root = _node(client, board["id"], text="Root")
    branch = _node(client, board["id"], parent_id=root["id"], text="Branch")
    leaf = _node(client, board["id"], parent_id=branch["id"], text="Leaf")
    keep = _node(client, board["id"], parent_id=root["id"], text="Sibling")

    gone = client.delete(f"/whiteboard/objects/{branch['id']}")
    assert gone.status_code == 200, gone.text
    deleted = gone.json()["deleted"]
    assert {row["id"] for row in deleted} == {branch["id"], leaf["id"]}
    # Enough to rebuild the branch, not just to count it.
    assert {row["parent_id"] for row in deleted} == {root["id"], branch["id"]}
    assert {row["data"]["content"] for row in deleted} == {"Branch", "Leaf"}

    tree = client.get(f"/whiteboard/boards/{board['id']}/tree").json()
    assert [n["id"] for n in tree["roots"]] == [root["id"]]
    assert [n["id"] for n in tree["roots"][0]["children"]] == [keep["id"]]


def test_deleting_a_reference_node_leaves_the_note_alone(client, session):
    """The single-node case of the same rule — a map node is a pointer, and
    removing a pointer is not removing the thing."""
    note = client.post("/entries", json={"content": "Keep me"}).json()
    board = _map(client)
    reference = _node(client, board["id"], kind="note", ref_id=note["id"])

    assert client.delete(f"/whiteboard/objects/{reference['id']}").status_code == 200

    survivor = session.get(Entry, note["id"])
    assert survivor is not None and not survivor.is_deleted


# --- the map object ---------------------------------------------------------


def test_a_board_is_a_free_whiteboard_unless_it_says_otherwise(client):
    """Every board that existed before this feature has NULL settings, and
    NULL has to read as "an ordinary free-layout whiteboard" rather than as
    anything needing a backfill."""
    board = client.post("/whiteboard/boards", json={"name": "Plain"}).json()
    assert (board["type"], board["layout"]) == ("board", "free")

    listed = {b["id"]: b for b in client.get("/whiteboard/boards").json()}
    assert listed[board["id"]]["type"] == "board"
    # The default scratch board has no note behind it to store settings on.
    assert listed[None]["type"] == "board"


def test_type_and_layout_survive_a_round_trip_through_the_list(client):
    board = _map(client, name="Radial", layout="radial")
    assert (board["type"], board["layout"]) == ("map", "radial")

    listed = {b["id"]: b for b in client.get("/whiteboard/boards").json()}
    assert listed[board["id"]]["layout"] == "radial"


def test_the_layout_can_be_changed_without_renaming_the_board(client):
    """`PUT /whiteboard/boards/{id}` was rename-only, and a title was
    required. Switching a map's layout must not force the caller to resend
    the title it isn't changing — that is how a rename race loses an edit."""
    board = _map(client, name="Keep this name")
    updated = client.put(
        f"/whiteboard/boards/{board['id']}", json={"layout": "tree-down"}
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["title"] == "Keep this name"
    assert updated.json()["layout"] == "tree-down"


def test_an_unknown_type_or_layout_is_refused_rather_than_stored(client):
    assert (
        client.post("/whiteboard/boards", json={"name": "x", "type": "graph"}).status_code
        == 422
    )
    assert (
        client.post(
            "/whiteboard/boards", json={"name": "x", "layout": "spiral"}
        ).status_code
        == 422
    )


def test_the_maps_filter_returns_maps_and_nothing_else(client):
    """The Library's Maps chip. A filter that silently returns everything is
    worse than no filter — it reads as "you have no boards" only once the
    user has looked at every row."""
    plain = client.post("/whiteboard/boards", json={"name": "Whiteboard"}).json()
    mapped = _map(client, name="Mindmap")

    maps = client.get("/whiteboard/boards?type=map").json()
    assert [b["id"] for b in maps] == [mapped["id"]]

    boards = client.get("/whiteboard/boards?type=board").json()
    ids = [b["id"] for b in boards]
    assert plain["id"] in ids and mapped["id"] not in ids
    # The default scratch board is a board, so it belongs in one list and not
    # the other — it dropped out of both in the first draft of this filter.
    assert None in ids


# --- the tree ---------------------------------------------------------------


def test_the_tree_nests_children_under_their_parents_with_cross_links(client):
    board = _map(client)
    root = _node(client, board["id"], text="Root")
    left = _node(client, board["id"], parent_id=root["id"], text="Left")
    right = _node(client, board["id"], parent_id=root["id"], text="Right")

    # A cross-link is a link sketch, exactly as it already is between two
    # cards — there is no second kind of edge and no second endpoint for one.
    linked = client.post(
        "/whiteboard/sketches",
        json={
            "board_id": board["id"],
            "data": json.dumps(
                {
                    "type": "link-straight",
                    "sourceId": left["id"],
                    "sourceKind": "object",
                    "targetId": right["id"],
                    "targetKind": "object",
                    "label": "compare",
                }
            ),
        },
    )
    assert linked.status_code == 200, linked.text

    tree = client.get(f"/whiteboard/boards/{board['id']}/tree").json()
    assert tree["type"] == "map"
    assert [n["id"] for n in tree["roots"]] == [root["id"]]
    kids = tree["roots"][0]["children"]
    assert [n["text"] for n in kids] == ["Left", "Right"]
    assert kids[0]["kind"] == "topic"
    assert tree["cross_links"] == [
        {"from_id": left["id"], "to_id": right["id"], "label": "compare"}
    ]


def test_a_node_whose_parent_is_gone_reads_as_a_root(client, session):
    """A dangling `parent_id` must not make a branch invisible.

    `parent_id` is a plain integer, not a foreign key (see the column's own
    comment), so nothing at the database level stops one going stale. A tree
    builder that only walks down from `parent_id IS NULL` silently loses
    every node under a broken pointer — the board still holds them, the map
    just stops showing them, which is the worst way to lose something.
    """
    board = _map(client)
    orphan = _node(client, board["id"], text="Orphan")
    row = session.get(WhiteboardObject, orphan["id"])
    row.parent_id = 999_999
    session.commit()

    tree = client.get(f"/whiteboard/boards/{board['id']}/tree").json()
    assert [n["id"] for n in tree["roots"]] == [orphan["id"]]


def test_a_node_cannot_be_moved_under_its_own_descendant(client):
    """The cycle check. Without it the tree walk never terminates, and the
    board is unreadable from then on with no way back through the UI that
    made it."""
    board = _map(client)
    root = _node(client, board["id"], text="Root")
    child = _node(client, board["id"], parent_id=root["id"], text="Child")
    grandchild = _node(client, board["id"], parent_id=child["id"], text="Grandchild")

    refused = client.put(
        f"/whiteboard/boards/{board['id']}/nodes/{root['id']}/move",
        json={"parent_id": grandchild["id"]},
    )
    assert refused.status_code == 422, refused.text
    assert "descendant" in refused.json()["detail"].lower()

    # And the obvious degenerate case of the same thing.
    itself = client.put(
        f"/whiteboard/boards/{board['id']}/nodes/{root['id']}/move",
        json={"parent_id": root["id"]},
    )
    assert itself.status_code == 422


def test_moving_a_node_to_a_root_and_back_under_a_parent(client):
    board = _map(client)
    root = _node(client, board["id"], text="Root")
    child = _node(client, board["id"], parent_id=root["id"], text="Child")

    promoted = client.put(
        f"/whiteboard/boards/{board['id']}/nodes/{child['id']}/move",
        json={"parent_id": None},
    )
    assert promoted.status_code == 200, promoted.text
    tree = client.get(f"/whiteboard/boards/{board['id']}/tree").json()
    assert {n["id"] for n in tree["roots"]} == {root["id"], child["id"]}

    client.put(
        f"/whiteboard/boards/{board['id']}/nodes/{child['id']}/move",
        json={"parent_id": root["id"]},
    )
    tree = client.get(f"/whiteboard/boards/{board['id']}/tree").json()
    assert [n["id"] for n in tree["roots"]] == [root["id"]]


def test_a_node_cannot_be_parented_onto_another_boards_node(client):
    """`board_id` scoping, the same rule the rest of this file already
    learned: a write has to be scoped to the board it claims."""
    here = _map(client, name="Here")
    there = _map(client, name="There")
    mine = _node(client, here["id"], text="Mine")
    theirs = _node(client, there["id"], text="Theirs")

    refused = client.put(
        f"/whiteboard/boards/{here['id']}/nodes/{mine['id']}/move",
        json={"parent_id": theirs["id"]},
    )
    assert refused.status_code == 404, refused.text


def test_a_reference_node_needs_something_real_to_point_at(client):
    board = _map(client)
    refused = client.post(
        f"/whiteboard/boards/{board['id']}/nodes",
        json={"kind": "note", "ref_id": 9999},
    )
    assert refused.status_code == 404
    assert (
        client.post(
            f"/whiteboard/boards/{board['id']}/nodes", json={"kind": "note"}
        ).status_code
        == 422
    )


def test_collapsed_and_pinned_are_stored_and_read_back(client):
    """Coggle's two: tidy on demand, and a branch you dragged stays where you
    put it. Both are per-node state on a node that already has a JSON blob,
    so neither is a column."""
    board = _map(client)
    node = _node(client, board["id"], text="Root")
    updated = client.put(
        f"/whiteboard/objects/{node['id']}",
        json={
            "kind": "topic",
            "board_id": board["id"],
            "data": {"content": "Root", "collapsed": True, "pinned": True},
        },
    )
    assert updated.status_code == 200, updated.text

    tree = client.get(f"/whiteboard/boards/{board['id']}/tree").json()
    assert tree["roots"][0]["collapsed"] is True
    assert tree["roots"][0]["pinned"] is True


# --- preview ----------------------------------------------------------------


def test_a_maps_thumbnail_carries_its_edges(client):
    """The Library card. A map previewed as scattered dots reads as a board
    with no structure at all, which is precisely the thing a map has and a
    board does not."""
    board = _map(client)
    root = _node(client, board["id"], text="Root")
    _node(client, board["id"], parent_id=root["id"], text="Child")

    row = next(b for b in client.get("/whiteboard/boards").json() if b["id"] == board["id"])
    assert len(row["preview_items"]) == 2
    assert len(row["preview_edges"]) == 1
    edge = row["preview_edges"][0]
    assert set(edge) == {"x1", "y1", "x2", "y2"}
    assert all(0.0 <= value <= 1.0 for value in edge.values())


def test_an_ordinary_board_has_no_edges_to_draw(client):
    board = client.post("/whiteboard/boards", json={"name": "Plain"}).json()
    client.post(
        "/whiteboard/objects",
        json={"kind": "text", "board_id": board["id"], "data": {"content": "hi"}},
    )
    row = next(b for b in client.get("/whiteboard/boards").json() if b["id"] == board["id"])
    assert row["preview_edges"] == []


# --- duplicate --------------------------------------------------------------


def test_duplicating_a_map_keeps_its_shape(client):
    """`duplicate_board` copied objects row by row, which for a map would
    copy every node's `parent_id` verbatim — pointing the copy's whole tree
    back at the original's rows. The copy has to be re-wired to itself."""
    board = _map(client)
    root = _node(client, board["id"], text="Root")
    _node(client, board["id"], parent_id=root["id"], text="Child")

    copy = client.post(f"/whiteboard/boards/{board['id']}/duplicate").json()
    assert copy["type"] == "map"

    tree = client.get(f"/whiteboard/boards/{copy['id']}/tree").json()
    assert [n["text"] for n in tree["roots"]] == ["Root"]
    assert [n["text"] for n in tree["roots"][0]["children"]] == ["Child"]
    copied_ids = {n["id"] for n in tree["roots"]} | {
        n["id"] for n in tree["roots"][0]["children"]
    }
    assert not copied_ids & {root["id"]}


# --- export and import ------------------------------------------------------


OPML = """<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>Reading list</title></head>
  <body>
    <outline text="Fiction">
      <outline text="Le Guin"/>
      <outline text="Borges"/>
    </outline>
    <outline text="History"/>
  </body>
</opml>"""


def _structure(tree_nodes):
    return [
        {"text": node["text"], "children": _structure(node["children"])}
        for node in tree_nodes
    ]


def test_opml_imports_and_exports_to_the_same_structure(client):
    """The round trip the plan asks for by name, and the reason the export
    formats are worth having at all: a map that cannot leave is a lock-in,
    and OPML is what every other mindmapper reads."""
    imported = client.post(
        "/whiteboard/boards/import", json={"format": "opml", "content": OPML}
    )
    assert imported.status_code == 201, imported.text
    board = imported.json()
    assert board["type"] == "map"
    assert board["title"] == "Reading list"

    first = _structure(client.get(f"/whiteboard/boards/{board['id']}/tree").json()["roots"])
    assert [n["text"] for n in first] == ["Fiction", "History"]
    assert [n["text"] for n in first[0]["children"]] == ["Le Guin", "Borges"]

    exported = client.get(f"/whiteboard/boards/{board['id']}/export?format=opml")
    assert exported.status_code == 200, exported.text

    again = client.post(
        "/whiteboard/boards/import",
        json={"format": "opml", "content": exported.text},
    ).json()
    second = _structure(client.get(f"/whiteboard/boards/{again['id']}/tree").json()["roots"])
    assert second == first


def test_markdown_exports_as_an_indented_outline_and_comes_back(client):
    board = _map(client, name="Trip")
    root = _node(client, board["id"], text="Packing")
    _node(client, board["id"], parent_id=root["id"], text="Boots")

    exported = client.get(f"/whiteboard/boards/{board['id']}/export?format=markdown")
    assert exported.status_code == 200
    assert exported.text.splitlines()[:3] == ["# Trip", "", "- Packing"]
    assert "  - Boots" in exported.text

    back = client.post(
        "/whiteboard/boards/import",
        json={"format": "markdown", "content": exported.text},
    ).json()
    assert back["title"] == "Trip"
    tree = client.get(f"/whiteboard/boards/{back['id']}/tree").json()
    assert _structure(tree["roots"]) == [
        {"text": "Packing", "children": [{"text": "Boots", "children": []}]}
    ]


def test_a_reference_node_exports_as_the_note_it_points_at(client):
    """An outline whose rows say "(note 12)" is what makes the export usable
    as a working document rather than a picture of one."""
    note = client.post("/entries", json={"content": "# Sources\n\nreading"}).json()
    board = _map(client, name="Essay")
    _node(client, board["id"], kind="note", ref_id=note["id"])

    exported = client.get(f"/whiteboard/boards/{board['id']}/export?format=markdown").text
    assert "Sources" in exported
    assert f"note {note['id']}" in exported


def test_an_import_with_a_doctype_is_refused(client):
    """The billion-laughs shape. Nothing in this app parses XML from anywhere
    else, and an import box is the one door that takes it — so the door
    refuses a document type declaration outright rather than trusting the
    parser's own defaults not to expand entities."""
    bomb = (
        '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol">]>'
        "<opml><body><outline text=\"&lol;\"/></body></opml>"
    )
    refused = client.post(
        "/whiteboard/boards/import", json={"format": "opml", "content": bomb}
    )
    assert refused.status_code == 422


def test_an_import_that_is_not_xml_at_all_is_a_422_not_a_500(client):
    refused = client.post(
        "/whiteboard/boards/import", json={"format": "opml", "content": "not xml"}
    )
    assert refused.status_code == 422


def test_exporting_an_empty_map_is_still_a_document(client):
    board = _map(client, name="Empty")
    markdown = client.get(f"/whiteboard/boards/{board['id']}/export?format=markdown").text
    assert markdown.strip() == "# Empty"
    opml = client.get(f"/whiteboard/boards/{board['id']}/export?format=opml").text
    assert "<opml" in opml and "Empty" in opml


def test_private_note_text_never_reaches_an_export(client, session):
    """The same rule the board preview and the Connections block already
    follow: the *fact* of the connection is not secret, its content is."""
    note = client.post("/entries", json={"content": "SECRET plans"}).json()
    session.get(Entry, note["id"]).is_private = True
    session.commit()

    board = _map(client, name="Essay")
    _node(client, board["id"], kind="note", ref_id=note["id"])

    exported = client.get(f"/whiteboard/boards/{board['id']}/export?format=markdown").text
    assert "SECRET" not in exported
    assert f"note {note['id']}" in exported


def test_the_node_endpoint_stores_position_and_colour(client):
    board = _map(client)
    created = client.post(
        f"/whiteboard/boards/{board['id']}/nodes",
        json={"kind": "topic", "text": "Root", "x": 40, "y": 90, "color": "#ff0000"},
    ).json()
    assert (created["x"], created["y"]) == (40, 90)

    stored = client.get(f"/whiteboard/?board_id={board['id']}").json()["objects"]
    assert [json.loads(json.dumps(o["data"]))["color"] for o in stored] == ["#ff0000"]
    tree = client.get(f"/whiteboard/boards/{board['id']}/tree").json()
    assert tree["roots"][0]["color"] == "#ff0000"
