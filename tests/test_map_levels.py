"""A map's levels and a topic's icon slot (MINDMAP_PLAN.md §14, decisions 38 to 45).

The owner, INBOX 641: "I'm still not happy on the mindmap with how the core
nodes work and can be customised as well as with the icons in them". Measured
before (`scratchpad/ui-sweeps/mc1-mapcore-audit.js`): the centre, a main branch
and a leaf drew identically. The server's half of the answer, gated here:

- the theme carries a hierarchy preset and a look per level, cleaned the way
  every other theme field is (dropped, never a 500), and never written onto a
  topic's style on the way out to a file;
- a topic's `icon` is a Phosphor name or one emoji, and nothing else;
- `fill` takes `solid`; a text object can be a `sticker`.
"""

from __future__ import annotations

from memorymap.api.routes_whiteboard import _clean_theme, _is_one_emoji, _themed_style


def _map(client):
    board = client.post("/whiteboard/boards", json={"name": "Levels", "type": "map", "layout": "tree-right"})
    assert board.status_code == 201, board.text
    return board.json()


def _node(client, board_id, *, parent_id=None, text="", **data):
    created = client.post(
        f"/whiteboard/boards/{board_id}/nodes",
        json={"kind": "topic", "parent_id": parent_id, "text": text},
    )
    assert created.status_code == 201, created.text
    node = created.json()
    if data:
        saved = _put(client, board_id, node, data)
        assert saved.status_code == 200, saved.text
        node = saved.json()
    return node


def _put(client, board_id, node, patch):
    return client.put(
        f"/whiteboard/objects/{node['id']}",
        json={
            "kind": node["kind"], "board_id": board_id, "data": {**node["data"], **patch},
            "x": node["x"], "y": node["y"], "z": node["z"],
        },
    )


def test_a_hierarchy_preset_and_level_looks_are_kept(client):
    board = _map(client)
    levels = {"0": {"font_size": 30, "fill": "solid", "bold": True}, "1": {"bold": False, "shape": "none"}}
    saved = client.put(f"/whiteboard/boards/{board['id']}", json={"theme": {"hierarchy": "boxed", "levels": levels}})
    assert saved.status_code == 200, saved.text
    theme = client.get(f"/whiteboard/boards/{board['id']}/tree").json()["theme"]
    assert theme["hierarchy"] == "boxed"
    #: `False` is a level's choice against its preset, so it is kept.
    assert theme["levels"] == levels


def test_levels_are_replaced_whole_and_cleared_by_null(client):
    """Undo sends the levels it had, whole; a level left out is gone."""
    board = _map(client)
    url = f"/whiteboard/boards/{board['id']}"
    client.put(url, json={"theme": {"levels": {"0": {"font_size": 30}, "2": {"italic": True}}}})
    client.put(url, json={"theme": {"levels": {"2": {"italic": True}}}})
    assert client.get(f"{url}/tree").json()["theme"]["levels"] == {"2": {"italic": True}}
    client.put(url, json={"theme": {"levels": None, "hierarchy": None}})
    theme = client.get(f"{url}/tree").json()["theme"]
    assert "levels" not in theme and "hierarchy" not in theme


def test_junk_in_the_levels_is_dropped_not_refused():
    cleaned = _clean_theme({
        "hierarchy": "radial-art",
        "levels": {"0": {"font_size": 3, "shape": "star", "fill": "tint", "colour": "red"}, "7": {"bold": True}, "1": "x"},
    })
    assert cleaned == {"levels": {"0": {"fill": "tint"}}}


def test_the_theme_meta_never_reaches_a_topic_style():
    """An export writes a topic's own style with the theme underneath; the
    preset's name and the per-level looks are not fields a topic has."""
    style = _themed_style({"bold": True}, {"hierarchy": "outline", "levels": {"0": {"bold": False}}, "italic": True})
    assert style == {"bold": True, "italic": True}


def test_an_icon_is_a_phosphor_name_or_one_emoji(client):
    board = _map(client)
    node = _node(client, board["id"], text="Centre")
    for good in ("rocket", "check-circle", "\U0001F680", "❤️", "\U0001F468‍\U0001F4BB", "\U0001F1EC\U0001F1E7"):
        saved = _put(client, board["id"], node, {"icon": good})
        assert saved.status_code == 200, (good, saved.text)
        assert saved.json()["data"]["icon"] == good
    for bad in ("Rocket", "<b>x</b>", "ph rocket", "a\U0001F680", "\U0001F680" * 17, "​", "中"):
        assert _put(client, board["id"], node, {"icon": bad}).status_code == 422, bad


def test_one_emoji_rule():
    assert _is_one_emoji("\U0001F525")
    assert not _is_one_emoji("")
    assert not _is_one_emoji("fire")
    assert not _is_one_emoji("\U0001F525 ")


def test_a_topic_can_be_filled_solid_and_a_text_box_can_be_a_sticker(client):
    board = _map(client)
    node = _node(client, board["id"], text="Main", fill="solid")
    assert node["data"]["fill"] == "solid"
    sticker = client.post(
        "/whiteboard/objects",
        json={"kind": "text", "board_id": board["id"], "data": {"content": "\U0001F389", "sticker": True},
              "x": 0, "y": 0, "width": 96, "height": 96},
    )
    assert sticker.status_code in (200, 201), sticker.text
    assert sticker.json()["data"]["sticker"] is True


def test_an_infinite_font_size_is_dropped_not_a_500(client):
    """JSON's `1e999` reads as infinity, and `int(inf)` raises OverflowError,
    which `_clean_theme` and `_clean_levels` did not catch (the final scan,
    2026-10-06): the theme patch was a 500, and since `_clean_theme` also
    runs on the read path, a stored one would be a 500 on every read."""
    inf = float("inf")
    assert _clean_theme({"font_size": inf, "levels": {"0": {"font_size": -inf, "bold": True}}}) == {
        "levels": {"0": {"bold": True}}
    }
    board = _map(client)
    response = client.put(
        f"/whiteboard/boards/{board['id']}",
        content='{"theme": {"font_size": 1e999, "levels": {"1": {"font_size": 1e999, "italic": true}}}}',
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 200, response.text
    tree = client.get(f"/whiteboard/boards/{board['id']}/tree")
    assert tree.status_code == 200, tree.text
    assert tree.json()["theme"] == {"levels": {"1": {"italic": True}}}
