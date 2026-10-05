"""The board's object library (WHITEBOARD_PLAN decision 25; INBOX 557c, 558).

The owner: "an object or elements library would be really good like with what
draw.io has", and "the ability to save custom elements and stuff as well".
What the API promises, tested here: the six kinds of "Yours" save and list;
a payload is held to its limits and to this notebook's own pictures; placing
makes independent rows in one transaction and one event, links and groups
remapped, paths moved and scaled; built-ins (static files) place the same
way; favourites and recent cover both; a library exports and imports with new
ids; media cleanup counts what the library holds. The browser half is
`scratchpad/ui-sweeps/wb1005-library.js`.
"""

from __future__ import annotations

import json

import pytest

from memorymap.api.routes_board_library import transform_path


def _board(client, name="Library board", kind="board"):
    return client.post("/whiteboard/boards", json={"name": name, "type": kind}).json()


def _rect(x, y, w=100, h=60):
    return f"M {x} {y} L {x + w} {y} L {x + w} {y + h} L {x} {y + h} Z"


def _element(n_links=1):
    items = [
        {"key": "a", "kind": "sketch", "data": {"d": _rect(0, 0), "shape": "rect", "color": "#123456", "width": 2}, "z": 5, "group": "g"},
        {"key": "b", "kind": "sketch", "data": {"d": _rect(200, 0), "shape": "rect", "color": "#123456", "width": 2}, "z": 5, "group": "g"},
        {"key": "t", "kind": "object", "type": "text", "data": {"content": "Hello"}, "x": 0, "y": 100, "w": 120, "h": 40, "z": 1},
    ]
    links = [{"from": "a", "to": "b", "data": {"type": "link-straight", "color": "#000000"}}][:n_links]
    return {"box": {"w": 300, "h": 140}, "items": items, "links": links}


def _save(client, kind="element", payload=None, name="Three things", tags=("demo",)):
    out = client.post("/board-library", json={"kind": kind, "name": name, "tags": list(tags), "payload": payload or _element()})
    assert out.status_code == 201, out.text
    return out.json()


def test_transform_path_moves_and_scales_every_command() -> None:
    assert transform_path("M 0 0 L 10 20 Z", 2, 3, 5, 7) == "M 5 7 L 25 67 Z"
    assert transform_path("M0 0C1 1 2 2 3 3", 1, 1, 10, 10) == "M 10 10 C 11 11 12 12 13 13"
    assert transform_path("M 0 0 h 10 v 5 a 5 5 0 0 1 10 0", 2, 2, 1, 1) == "M 1 1 h 20 v 10 a 10 10 0 0 1 20 0"
    assert transform_path("M 0 0 A 50 25 0 1 1 100 0", 0.5, 2, 0, 0) == "M 0 0 A 25 50 0 1 1 50 0"


def test_save_list_and_place_a_selection_twice(ai_client):
    board = _board(ai_client)
    item = _save(ai_client)
    listed = ai_client.get("/board-library").json()
    assert any(i["id"] == item["id"] for i in listed["items"])
    assert {s["key"] for s in listed["sets"]} >= {"general", "flowchart", "arrows", "frames", "icons"}
    for x in (0, 1000):
        out = ai_client.post(f"/whiteboard/boards/{board['id']}/place", json={"item_id": item["id"], "x": x, "y": 0})
        assert out.status_code == 201, out.text
    state = ai_client.get(f"/whiteboard/?board_id={board['id']}").json()
    links = [s for s in state["sketches"] if json.loads(s["data"]).get("type", "").startswith("link-")]
    shapes = [s for s in state["sketches"] if s not in links]
    assert len(shapes) == 4 and len(state["objects"]) == 2 and len(links) == 2
    #: Each placement's link joins its own two shapes, not the first copy's.
    shape_ids = {s["id"] for s in shapes}
    pairs = {(json.loads(lk["data"])["sourceId"], json.loads(lk["data"])["targetId"]) for lk in links}
    assert len(pairs) == 2 and all(a in shape_ids and b in shape_ids for a, b in pairs)
    #: Groups are new per placement.
    groups = {s["group_id"] for s in shapes}
    assert len(groups) == 2 and None not in groups
    #: Independent copies that remember where they came from.
    ref = json.loads(shapes[0]["data"])["library_ref"]
    assert ref == {"id": item["id"], "version": 1}
    #: Centred on the point asked for: the 300-wide box at x=1000.
    xs = sorted(o["x"] for o in state["objects"])
    assert xs == [-150, 850]
    used = ai_client.get("/board-library").json()
    assert used["recent"][0] == f"item:{item['id']}"


def test_one_placement_is_one_event(ai_client):
    board = _board(ai_client)
    item = _save(ai_client)
    def count(kind):
        return len(ai_client.get(f"/audit?entity_type={kind}&limit=500").json())

    before = {k: count(k) for k in ("board", "whiteboard_sketch", "whiteboard_object")}
    ai_client.post(f"/whiteboard/boards/{board['id']}/place", json={"item_id": item["id"], "x": 0, "y": 0})
    after = {k: count(k) for k in before}
    assert after["board"] == before["board"] + 1
    assert after["whiteboard_sketch"] == before["whiteboard_sketch"]
    assert after["whiteboard_object"] == before["whiteboard_object"]


def test_a_builtin_places_and_takes_the_pen_colour(ai_client):
    board = _board(ai_client)
    out = ai_client.post(
        f"/whiteboard/boards/{board['id']}/place",
        json={"builtin": "flowchart/decision", "x": 0, "y": 0, "ink": "#aa3300", "w": 320, "h": 200},
    )
    assert out.status_code == 201, out.text
    data = json.loads(out.json()["sketches"][0]["data"])
    assert data["color"] == "#aa3300" and data["fill"] == "#aa3300"
    assert data["shape"] == "custom" and data["library_ref"] == {"builtin": "flowchart/decision"}
    #: Scaled to the size asked for: the 160x100 diamond is now 320 wide.
    assert data["d"].startswith("M 0 -100")
    icon = ai_client.post(f"/whiteboard/boards/{board['id']}/place", json={"builtin": "icons/acorn", "x": 0, "y": 0})
    assert icon.status_code == 201, icon.text
    assert json.loads(icon.json()["sketches"][0]["data"])["icon"] == "acorn"
    missing = ai_client.post(f"/whiteboard/boards/{board['id']}/place", json={"builtin": "flowchart/nope", "x": 0, "y": 0})
    assert missing.status_code == 404


def test_favourites_cover_builtins_and_yours(ai_client):
    item = _save(ai_client)
    ai_client.put(f"/board-library/{item['id']}", json={"favourite": True})
    ai_client.post("/board-library/marks", json={"key": "general/star", "favourite": True})
    listed = ai_client.get("/board-library").json()
    assert listed["marks"]["general/star"]["favourite"] is True
    assert [i for i in listed["items"] if i["id"] == item["id"]][0]["favourite"] is True
    assert ai_client.post("/board-library/marks", json={"key": "general/nope", "favourite": True}).status_code == 404


def test_rename_payload_bumps_version_delete_restore_duplicate(ai_client):
    item = _save(ai_client)
    renamed = ai_client.put(f"/board-library/{item['id']}", json={"name": "Renamed", "tags": ["A", "a", "b"]}).json()
    assert renamed["name"] == "Renamed" and renamed["tags"] == ["a", "b"] and renamed["version"] == 1
    bumped = ai_client.put(f"/board-library/{item['id']}", json={"payload": _element(n_links=0)}).json()
    assert bumped["version"] == 2
    ai_client.delete(f"/board-library/{item['id']}")
    assert not any(i["id"] == item["id"] for i in ai_client.get("/board-library").json()["items"])
    assert any(i["id"] == item["id"] for i in ai_client.get("/board-library?deleted=true").json()["items"])
    ai_client.post(f"/board-library/{item['id']}/restore")
    copy = ai_client.post(f"/board-library/{item['id']}/duplicate").json()
    assert copy["id"] != item["id"] and copy["name"] == "Renamed (copy)"


@pytest.mark.parametrize(
    "kind,payload",
    [
        ("style", {"target": "shape", "style": {"color": "#112233", "fill": "#445566", "width": 3, "evil": "x"}}),
        ("palette", {"colours": ["#112233", "#AABBCC", "red", "#112233"]}),
        ("preset", {"box": {"w": 180, "h": 140}, "items": [{"key": "s", "kind": "object", "type": "text", "data": {"content": "Idea", "bg": "#fff4a3"}, "x": 0, "y": 0, "w": 180, "h": 140}]}),
        ("branch", {"nodes": [{"text": "Root", "children": [{"text": "A", "children": [{"text": "A1"}]}, {"text": "B"}]}]}),
        ("template", {"board": {"type": "board", "background": {"color": "#101820"}}, "element": None or {"box": {"w": 10, "h": 10}, "items": [{"key": "f", "kind": "object", "type": "frame", "data": {"content": "To do"}, "x": 0, "y": 0, "w": 300, "h": 200}]}}),
        ("shape", {"box": {"w": 1, "h": 1}, "items": [{"key": "s", "kind": "sketch", "data": {"d": "M 0 0 L 1 0 L 0.5 1 Z", "shape": "custom", "color": "ink"}}]}),
    ],
)
def test_every_kind_of_yours_saves(ai_client, kind, payload):
    saved = _save(ai_client, kind=kind, payload=payload, name=f"A {kind}")
    if kind == "style":
        assert "evil" not in saved["payload"]["style"]
    if kind == "palette":
        assert saved["payload"]["colours"] == ["#112233", "#aabbcc"]


def test_a_branch_places_under_a_topic(ai_client):
    board = _board(ai_client, name="Branch map", kind="map")
    root = ai_client.post(f"/whiteboard/boards/{board['id']}/nodes", json={"kind": "topic", "text": "Centre"}).json()
    item = _save(ai_client, kind="branch", payload={"nodes": [{"text": "Risks", "children": [{"text": "Cost"}, {"text": "Time"}]}]})
    out = ai_client.post(f"/whiteboard/boards/{board['id']}/place", json={"item_id": item["id"], "x": 0, "y": 0, "parent_id": root["id"]})
    assert out.status_code == 201, out.text
    made = out.json()["objects"]
    risks = next(o for o in made if o["data"]["content"] == "Risks")
    assert risks["parent_id"] == root["id"]
    assert sorted(o["data"]["content"] for o in made if o["parent_id"] == risks["id"]) == ["Cost", "Time"]


def test_a_template_starts_a_board_with_its_look(ai_client):
    item = _save(ai_client, kind="template", payload={
        "board": {"type": "board", "background": {"color": "#101820"}},
        "element": {"box": {"w": 300, "h": 200}, "items": [{"key": "f", "kind": "object", "type": "frame", "data": {"content": "To do"}, "x": 0, "y": 0, "w": 300, "h": 200}]},
    })
    out = ai_client.post("/board-library/new-board", json={"item_id": item["id"], "name": "From a template"})
    assert out.status_code == 201, out.text
    state = ai_client.get(f"/whiteboard/?board_id={out.json()['id']}").json()
    assert state["background"]["color"] == "#101820"
    assert [o["kind"] for o in state["objects"]] == ["frame"]
    kanban = ai_client.post("/board-library/new-board", json={"builtin": "frames/kanban", "name": "Sprint"}).json()
    assert len(ai_client.get(f"/whiteboard/?board_id={kanban['id']}").json()["objects"]) == 3


def test_limits_and_pictures(ai_client):
    big = {"box": {"w": 1, "h": 1}, "items": [{"key": f"k{i}", "kind": "object", "type": "text", "data": {"content": "x"}, "x": 0, "y": 0, "w": 20, "h": 20} for i in range(501)]}
    assert ai_client.post("/board-library", json={"kind": "element", "name": "Too many", "payload": big}).status_code == 422
    outside = {"box": {"w": 1, "h": 1}, "items": [{"key": "p", "kind": "object", "type": "image", "data": {"url": "https://example.com/x.png"}, "x": 0, "y": 0, "w": 20, "h": 20}]}
    assert ai_client.post("/board-library", json={"kind": "element", "name": "Outside", "payload": outside}).status_code == 422
    huge = {"box": {"w": 1, "h": 1}, "items": [{"key": "s", "kind": "sketch", "data": {"d": "M 0 0 " + "L 1 1 " * 120000}}]}
    assert ai_client.post("/board-library", json={"kind": "element", "name": "Huge", "payload": huge}).status_code == 422
    assert ai_client.post("/board-library", json={"kind": "nonsense", "name": "X", "payload": {}}).status_code == 422


def test_export_then_import_gives_new_ids_and_drops_strangers(ai_client):
    picture = ai_client.post("/media/upload", files={"file": ("p.png", b"\x89PNG\r\n\x1a\n", "image/png")}).json()
    with_picture = {"box": {"w": 100, "h": 100}, "items": [{"key": "p", "kind": "object", "type": "image", "data": {"url": picture["url"]}, "x": 0, "y": 0, "w": 100, "h": 100}]}
    first = _save(ai_client, name="Exported one")
    _save(ai_client, payload=with_picture, name="With a picture")
    listed = ai_client.get("/board-library").json()
    exported = ai_client.get(f"/board-library/export?library_id={listed['yours_id']}")
    assert exported.status_code == 200
    body = exported.json()
    assert body["format"] == "memorymap-library" and len(body["items"]) >= 2
    body["items"].append({"kind": "element", "name": "Stranger", "payload": {"box": {"w": 1, "h": 1}, "items": [
        {"key": "p", "kind": "object", "type": "image", "data": {"url": "/media/not-here.png"}, "x": 0, "y": 0, "w": 20, "h": 20},
        {"key": "t", "kind": "object", "type": "text", "data": {"content": "kept"}, "x": 0, "y": 0, "w": 20, "h": 20},
    ]}})
    result = ai_client.post("/board-library/import", json=body).json()
    assert result["items"] == len(body["items"]) and result["dropped_media"] == 1
    imported = ai_client.get(f"/board-library?library_id={result['library']['id']}").json()["items"]
    assert first["id"] not in {i["id"] for i in imported}
    stranger = next(i for i in imported if i["name"] == "Stranger")
    assert [it["key"] for it in stranger["payload"]["items"]] == ["t"]
    assert ai_client.post("/board-library/import", json={"format": "other", "items": []}).status_code == 422


def test_media_in_the_library_is_not_an_orphan(ai_client):
    picture = ai_client.post("/media/upload", files={"file": ("q.png", b"\x89PNG\r\n\x1a\n", "image/png")}).json()
    _save(ai_client, payload={"box": {"w": 10, "h": 10}, "items": [
        {"key": "p", "kind": "object", "type": "image", "data": {"url": picture["url"]}, "x": 0, "y": 0, "w": 20, "h": 20}]})
    orphans = ai_client.get("/media/orphans").json()["orphans"]
    assert not any(o["url"] == picture["url"] for o in orphans)
