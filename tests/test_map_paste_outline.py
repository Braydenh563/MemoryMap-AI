"""Text pasted onto a map becomes a branch under the selected topic (audit
FEAT-09, 2026-10-05: a nested list pasted onto a selected topic left the map
at 4 topics before and 4 after)."""

from __future__ import annotations


def _map(client):
    board = client.post("/whiteboard/boards", json={"name": "Paste", "type": "map", "layout": "tree-right"})
    assert board.status_code == 201, board.text
    board = board.json()
    root = client.post(f"/whiteboard/boards/{board['id']}/nodes", json={"text": "Root"}).json()
    return board, root


def _tree(client, board_id):
    def walk(nodes):
        return [{"text": n["text"], "children": walk(n["children"])} for n in nodes]

    return walk(client.get(f"/whiteboard/boards/{board_id}/tree").json()["roots"])


def test_a_pasted_three_level_list_lands_under_the_selected_topic(client):
    board, root = _map(client)
    pasted = client.post(
        f"/whiteboard/boards/{board['id']}/nodes/outline",
        json={"parent_id": root["id"], "text": "- one\n  - one a\n    - one a i\n- two"},
    )
    assert pasted.status_code == 201, pasted.text
    assert len(pasted.json()) == 4
    assert _tree(client, board["id"]) == [
        {
            "text": "Root",
            "children": [
                {"text": "one", "children": [{"text": "one a", "children": [{"text": "one a i", "children": []}]}]},
                {"text": "two", "children": []},
            ],
        }
    ]


def test_plain_indented_and_numbered_lines_are_read_as_an_outline(client):
    board, root = _map(client)
    text = "Plan\n\tPack\n\tBook\n1. First step\n2) Second step\n# A heading"
    pasted = client.post(f"/whiteboard/boards/{board['id']}/nodes/outline", json={"parent_id": root["id"], "text": text})
    assert pasted.status_code == 201, pasted.text
    children = _tree(client, board["id"])[0]["children"]
    assert [c["text"] for c in children] == ["Plan", "First step", "Second step", "A heading"]
    assert [c["text"] for c in children[0]["children"]] == ["Pack", "Book"]


def test_the_top_lines_hang_off_the_topic_pasted_onto(client):
    board, root = _map(client)
    made = client.post(
        f"/whiteboard/boards/{board['id']}/nodes/outline",
        json={"parent_id": root["id"], "text": "- a\n- b"},
    ).json()
    assert [row["parent_id"] for row in made] == [root["id"], root["id"]]


def test_a_paste_onto_another_boards_topic_is_refused(client):
    board, _root = _map(client)
    _other, other_root = _map(client)
    refused = client.post(
        f"/whiteboard/boards/{board['id']}/nodes/outline",
        json={"parent_id": other_root["id"], "text": "- x"},
    )
    assert refused.status_code == 404


def test_blank_text_is_refused(client):
    board, root = _map(client)
    refused = client.post(f"/whiteboard/boards/{board['id']}/nodes/outline", json={"parent_id": root["id"], "text": "\n \n"})
    assert refused.status_code == 422
