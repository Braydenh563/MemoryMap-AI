"""A topic renamed by hand keeps its name (INBOX 547).

Topics are recomputed from the links, so they have no lasting id; a stored
name is matched to a topic by its notes (half the union shared) and follows
it through a note or two gained or lost. Clearing the name brings the found
one back.
"""

from __future__ import annotations

from memorymap.entry import topics


def _topic(tid, ids, name):
    return {"id": tid, "size": len(ids), "name": name, "terms": [], "ids": ids, "core_id": ids[0]}


def test_a_stored_name_follows_its_topic_through_a_small_change():
    found = [_topic(0, [1, 2, 3, 4, 5], "#glaze"), _topic(1, [6, 7, 8], "#garden")]
    stored = [{"ids": [1, 2, 3, 4], "name": "Pottery"}]
    out = topics.apply_names(found, stored)
    assert out[0]["name"] == "Pottery" and out[0]["named"] and out[0]["found_name"] == "#glaze"
    assert out[1]["name"] == "#garden" and "named" not in out[1]
    assert found[0]["name"] == "#glaze", "the cached value is not changed"


def test_a_name_does_not_jump_to_a_different_topic():
    found = [_topic(0, [1, 2, 3, 9, 10, 11, 12], "#glaze")]
    assert topics.apply_names(found, [{"ids": [1, 2, 3], "name": "Pottery"}])[0]["name"] == "#glaze"


def test_one_stored_name_names_one_topic_best_match_first():
    found = [_topic(0, [1, 2, 3, 4], "a"), _topic(1, [1, 2, 3, 4, 5, 6], "b")]
    out = topics.apply_names(found, [{"ids": [1, 2, 3, 4], "name": "Pottery"}])
    assert [t["name"] for t in out] == ["Pottery", "b"]


def test_store_name_replaces_and_clears():
    stored = topics.store_name([], [1, 2, 3], "Pottery")
    stored = topics.store_name(stored, [1, 2, 3, 4], "Ceramics")
    assert stored == [{"ids": [1, 2, 3, 4], "name": "Ceramics"}]
    assert topics.store_name(stored, [1, 2, 3, 4], "") == []


def _note(client, content, tags=()):
    response = client.post("/entries", json={"content": content, "tags": list(tags)})
    assert response.status_code in (200, 201), response.text
    return response.json()


def test_rename_through_the_api_shows_at_once_and_clears(client):
    notes = [_note(client, f"Glaze test {i}", ["glazing"]) for i in range(4)]
    for i, a in enumerate(notes):
        for b in notes[i + 1 :]:
            client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})
    ids = [n["id"] for n in notes]
    found = client.get("/graph/structure?topics=1").json()["topics"][0]["name"]
    response = client.put("/graph/topics/name", json={"ids": ids, "name": "  My   pottery "})
    assert response.status_code == 200 and response.json() == {"name": "My pottery"}
    topic = client.get("/graph/structure?topics=1").json()["topics"][0]
    assert topic["name"] == "My pottery" and topic["found_name"] == found
    client.put("/graph/topics/name", json={"ids": ids, "name": ""})
    assert client.get("/graph/structure?topics=1").json()["topics"][0]["name"] == found


def test_rename_rejects_a_long_name(client):
    assert client.put("/graph/topics/name", json={"ids": [1], "name": "x" * 81}).status_code == 422
