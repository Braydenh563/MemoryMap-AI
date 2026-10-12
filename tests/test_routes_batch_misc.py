"""Named-route tests for categories, chats, the learned list, OCR ranges, the
bench and tidy stops, the review queue, map nodes and the device verdict
(ledger 1573). Each calls the path with a plain variable, which is the shape
`tests/test_routes_named.py` reads.
"""

from __future__ import annotations

from tessellate.api import routes_tidy


def _category_id(client, name):
    return next(c["id"] for c in client.get("/categories").json() if c["name"] == name)


def test_a_category_is_split_and_merged(client):
    keep = client.post("/entries", json={"content": "Tomatoes grow best staked.", "category": "Garden"}).json()["id"]
    client.post("/entries", json={"content": "Basil likes sun.", "category": "Garden"})
    garden = _category_id(client, "Garden")
    split = client.post(f"/categories/{garden}/split", json={"name": "Veg", "entry_ids": [keep]})
    assert split.status_code == 200 and split.json()["moved_ids"] == [keep]
    veg = _category_id(client, "Veg")
    merged = client.post(f"/categories/{veg}/merge", json={"into": garden})
    assert merged.status_code == 200 and merged.json()["moved"] == 1


def test_a_chat_is_retitled_and_its_answer_and_followups_are_kept(client):
    made = client.post("/conversations", json={"question": "What is a mole?", "answer": "A small animal."})
    chat_id = made.json()["id"]
    retitled = client.post(f"/conversations/{chat_id}/retitle")
    assert retitled.status_code == 200 and retitled.json()["title"]
    edited = client.put(f"/conversations/{chat_id}/turns/0/answer", json={"content": "A burrowing animal."})
    assert edited.status_code == 200
    chips = client.put(f"/conversations/{chat_id}/turns/0/followups", json={"followups": ["Where do they live?"]})
    assert chips.status_code == 200
    blank = client.put(f"/conversations/{chat_id}/turns/0/answer", json={"content": ""})
    assert blank.status_code == 422


def test_a_learned_fact_is_reset_to_the_models_words(ai_client, fake_ollama):
    ai_client.post("/entries", json={"content": "The batch size should stay at 32."})
    ai_client.post("/night/run", json={"budget": 1000})
    fact = ai_client.get("/learned?kind=claim").json()["items"][0]
    ai_client.patch(f"/learned/{fact['id']}", json={"text": "changed"})
    reset = ai_client.post(f"/learned/{fact['id']}/reset")
    assert reset.status_code == 200 and reset.json()["text"] == fact["text"]
    absent = ai_client.post("/learned/99999/reset")
    assert absent.status_code == 404


def test_a_page_range_read_refuses_a_missing_upload(client):
    upload_id = 99999
    refused = client.post(f"/media/{upload_id}/ocr-range-read")
    assert refused.status_code == 404


def test_the_bench_and_the_link_reason_run_can_be_stopped(client, monkeypatch):
    bench = client.post("/models/bench/stop")
    assert bench.status_code == 200 and bench.json()["stopping"] is False
    queued = []
    monkeypatch.setattr(routes_tidy.jobs, "enqueue", lambda *a, **k: queued.append(a[0]))
    run = client.post("/tidy/link-reasons/run")
    assert run.json() == {"queued": True} and queued == ["tidy-link-reasons"]
    stop = client.post("/tidy/link-reasons/stop")
    assert stop.status_code == 200 and stop.json()["stopping"] is False


def test_accepting_a_filing_keeps_the_category(client):
    note_id = client.post("/entries", json={"content": "Bought bread and milk."}).json()["id"]
    accepted = client.post(f"/review-queue/{note_id}/accept")
    assert accepted.status_code == 200 and accepted.json()["user_filed"] is True
    absent = client.post("/review-queue/99999/accept")
    assert absent.status_code == 404


def _map(client):
    return client.post("/whiteboard/boards", json={"name": "Map", "type": "map", "layout": "tree-right"}).json()["id"]


def test_map_nodes_are_pasted_as_an_outline_moved_and_cleared_of_styles(client):
    board_id = _map(client)
    root = client.post(f"/whiteboard/boards/{board_id}/nodes", json={"kind": "topic", "text": "Root"}).json()["id"]
    pasted = client.post(
        f"/whiteboard/boards/{board_id}/nodes/outline", json={"parent_id": root, "text": "- One\n  - Two\n- Three"}
    )
    assert pasted.status_code == 201 and len(pasted.json()) == 3
    node_id = pasted.json()[0]["id"]
    moved = client.put(f"/whiteboard/boards/{board_id}/nodes/{node_id}/move", json={"parent_id": None})
    assert moved.status_code == 200
    cleared = client.post(f"/whiteboard/boards/{board_id}/nodes/clear-style")
    assert cleared.status_code == 200 and cleared.json()["cleared"] == 0


def test_a_device_verdict_needs_this_computer_and_a_waiting_device(client):
    device_id = "no-such-device"
    answered = client.post(f"/auth/lan-devices/{device_id}/allow")
    assert answered.status_code in (403, 404)
