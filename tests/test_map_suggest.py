"""Grow a map topic from the notebook (FEAT-13; WHITEBOARD_PLAN decision 36).

Suggestions are grounded by construction: the search engine finds the notes,
the model only names a topic for one of them by number, and a line naming no
listed note is dropped; with no model the notes' titles are the suggestions.
Nothing is written until the ticked ones are added, in one transaction, each
with its source in its note. The model is a fake transport (CLAUDE.md section
4): the prompt's shape, the parsing and both fallbacks are what is tested.
"""

from __future__ import annotations


def _notes(client, *contents):
    return [client.post("/entries", json={"content": text}).json() for text in contents]


def _map_with_topic(client, words="Gardening"):
    board = client.post("/whiteboard/boards", json={"name": "Garden map", "type": "map"}).json()
    root = client.post(f"/whiteboard/boards/{board['id']}/nodes", json={"kind": "topic", "text": words}).json()
    return board["id"], root["id"]


def test_with_no_model_the_notes_titles_are_the_suggestions(client):
    notes = _notes(client, "# Tomato pruning\n\ngardening: pinch the side shoots", "# Compost heap\n\ngardening: turn it weekly", "# Tax return\n\nfile by January")
    bid, nid = _map_with_topic(client)
    before = len(client.get("/whiteboard/", params={"board_id": bid}).json()["objects"])
    out = client.post(f"/whiteboard/boards/{bid}/nodes/{nid}/suggest")
    assert out.status_code == 200, out.text
    got = out.json()
    assert got["source"] == "notebook" and got["reason"] == "offline"
    titles = {s["text"] for s in got["suggestions"]}
    assert {"Tomato pruning", "Compost heap"} <= titles and "Tax return" not in titles
    # Every suggestion names the note it came from.
    by_id = {n["id"]: n for n in notes}
    assert all(s["note_id"] in by_id and s["note_title"] for s in got["suggestions"])
    # A suggestion writes nothing.
    assert len(client.get("/whiteboard/", params={"board_id": bid}).json()["objects"]) == before


def test_the_model_names_topics_only_for_listed_notes(ai_client, fake_ollama):
    _notes(ai_client, "# Tomato pruning\n\ngardening: pinch the side shoots", "# Compost heap\n\ngardening: turn it weekly")
    bid, nid = _map_with_topic(ai_client)
    fake_ollama.librarian_reply = "Here you go:\n- Side shoots [1]\n- Invented thing [9]\n- Turning the heap [2]\nThanks"
    got = ai_client.post(f"/whiteboard/boards/{bid}/nodes/{nid}/suggest").json()
    assert got["source"] == "model"
    texts = [s["text"] for s in got["suggestions"]]
    assert "Invented thing" not in texts and set(texts) == {"Side shoots", "Turning the heap"}
    assert {s["note_title"] for s in got["suggestions"]} == {"Tomato pruning", "Compost heap"}


def test_a_prose_reply_falls_back_to_the_titles(ai_client, fake_ollama):
    _notes(ai_client, "# Tomato pruning\n\ngardening: pinch the side shoots")
    bid, nid = _map_with_topic(ai_client)
    fake_ollama.librarian_reply = "You could think about pruning and composting."
    got = ai_client.post(f"/whiteboard/boards/{bid}/nodes/{nid}/suggest").json()
    assert got["source"] == "notebook" and got["reason"] == "unusable"
    assert [s["text"] for s in got["suggestions"]] == ["Tomato pruning"]


def test_existing_children_and_notes_on_the_map_are_not_suggested_again(client):
    _notes(client, "# Tomato pruning\n\ngardening: pinch", "# Compost heap\n\ngardening: turn")
    bid, nid = _map_with_topic(client)
    client.post(f"/whiteboard/boards/{bid}/nodes", json={"kind": "topic", "text": "Tomato pruning", "parent_id": nid})
    got = client.post(f"/whiteboard/boards/{bid}/nodes/{nid}/suggest").json()
    assert [s["text"] for s in got["suggestions"]] == ["Compost heap"]


def test_adding_makes_the_ticked_ones_with_their_source_in_one_go(client):
    notes = _notes(client, "# Tomato pruning\n\ngardening: pinch")
    bid, nid = _map_with_topic(client)
    out = client.post(
        f"/whiteboard/boards/{bid}/nodes/{nid}/branches",
        json={"items": [{"text": "Side shoots", "note_id": notes[0]["id"]}, {"text": "Watering"}]},
    )
    assert out.status_code == 201, out.text
    made = out.json()
    assert [m["data"]["content"] for m in made] == ["Side shoots", "Watering"]
    assert all(m["parent_id"] == nid and m["kind"] == "topic" for m in made)
    assert made[0]["data"]["note"] == 'From your note "Tomato pruning".' and not made[1]["data"].get("note")
    created = [e for e in client.get("/audit?entity_type=whiteboard_object&limit=10").json() if e["action"] == "created"]
    assert {e["entity_id"] for e in created} >= {m["id"] for m in made}


def test_a_topic_on_another_map_or_with_no_words_is_refused(client):
    bid, nid = _map_with_topic(client)
    other, _ = _map_with_topic(client, "Other")
    assert client.post(f"/whiteboard/boards/{other}/nodes/{nid}/suggest").status_code == 404
    blank = client.post(f"/whiteboard/boards/{bid}/nodes", json={"kind": "topic", "text": " ", "parent_id": nid}).json()
    if blank.get("id"):
        assert client.post(f"/whiteboard/boards/{bid}/nodes/{blank['id']}/suggest").status_code == 422
