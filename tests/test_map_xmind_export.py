"""A map out as an XMind `.xmind` (INBOX 797, canvasdepth2; MINDMAP_PLAN
"canvasdepth, ranked" row 4), and back in with what XMind keeps: titles,
notes, labels, callouts, priority and task markers, each branch's structure
and the cross-links as relationships."""

from __future__ import annotations

import base64
import io
import json
import zipfile


def _topic(client, board_id, text):
    objs = client.get("/whiteboard/", params={"board_id": board_id}).json()["objects"]
    return next(o for o in objs if o["data"].get("content") == text)


def _set(client, obj, **data):
    body = {k: obj[k] for k in ("kind", "x", "y", "width", "height", "parent_id", "board_id")}
    out = client.put(f"/whiteboard/objects/{obj['id']}", json={**body, "data": {**obj["data"], **data}})
    assert out.status_code == 200, out.text


def test_a_map_exports_as_an_xmind_zip_and_reads_back(ai_client):
    made = ai_client.post("/whiteboard/boards/import", json={"format": "markdown", "content": "# Trip\n- Trip\n  - Book\n    - Hotel\n  - Pack", "name": "Trip"}).json()
    board = made["id"]
    ai_client.put(f"/whiteboard/boards/{board}", json={"layout": "tree-down"})
    _set(ai_client, _topic(ai_client, board, "Book"), branch_layout="fishbone", note="Before May", priority=2)
    _set(ai_client, _topic(ai_client, board, "Hotel"), labels=["paid", "near"], callout="Check in at 3", task="done")
    out = ai_client.get(f"/whiteboard/boards/{board}/export", params={"format": "xmind"})
    assert out.status_code == 200
    assert out.headers["content-type"] == "application/vnd.xmind.workbook"
    assert out.headers["content-disposition"].endswith('.xmind"')
    archive = zipfile.ZipFile(io.BytesIO(out.content))
    assert {"content.json", "metadata.json", "manifest.json"} <= set(archive.namelist())
    sheet = json.loads(archive.read("content.json"))[0]
    root = sheet["rootTopic"]
    assert root["title"] == "Trip" and root["structureClass"] == "org.xmind.ui.org-chart.down"
    book = root["children"]["attached"][0]
    assert book["structureClass"] == "org.xmind.ui.fishbone.rightHeaded"
    assert book["notes"]["plain"]["content"] == "Before May" and {"markerId": "priority-2"} in book["markers"]
    hotel = book["children"]["attached"][0]
    assert hotel["labels"] == ["paid", "near"] and hotel["children"]["callout"][0]["title"] == "Check in at 3"
    back = ai_client.post("/whiteboard/boards/import", json={"format": "xmind", "content": base64.b64encode(out.content).decode(), "name": "Back"})
    assert back.status_code in (200, 201), back.text
    book2 = _topic(ai_client, back.json()["id"], "Book")["data"]
    hotel2 = _topic(ai_client, back.json()["id"], "Hotel")["data"]
    assert (book2["branch_layout"], book2["note"], book2["priority"]) == ("fishbone", "Before May", 2)
    assert (hotel2["labels"], hotel2["callout"], hotel2["task"]) == (["paid", "near"], "Check in at 3", "done")


def test_an_xmind_link_off_the_allowed_schemes_is_dropped(ai_client):
    sheet = [{"id": "s", "class": "sheet", "rootTopic": {"id": "r", "title": "Root", "children": {"attached": [
        {"id": "a", "title": "Bad", "href": "javascript:alert(1)"}, {"id": "b", "title": "Good", "href": "https://example.com"}]}}}]
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("content.json", json.dumps(sheet))
    made = ai_client.post("/whiteboard/boards/import", json={"format": "xmind", "content": base64.b64encode(buf.getvalue()).decode(), "name": "Links"}).json()
    assert _topic(ai_client, made["id"], "Bad")["data"].get("link") is None
    assert _topic(ai_client, made["id"], "Good")["data"]["link"] == "https://example.com"
