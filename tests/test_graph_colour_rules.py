"""GRAPH_PLAN Phase 3: every note on the graph carries the fields the colour
rules read (kind, tags, space, has a file), so "colour by" is a rendering of
the payload and never a second request per node."""

from __future__ import annotations


def test_graph_nodes_carry_the_rule_fields(client):
    saved = client.post("/entries", json={"content": "sourdough starter schedule", "tags": ["baking"]}).json()
    nodes = client.get("/graph").json()["nodes"]
    node = next(n for n in nodes if n["id"] == saved["id"])
    assert node["kind"] == "note"
    assert node["tags"] == ["baking"]
    assert isinstance(node["space_id"], str) and node["space_id"]
    assert node["has_file"] is False
    assert "created_at" in node


def test_a_note_with_no_tags_carries_an_empty_list(client):
    saved = client.post("/entries", json={"content": "a plain note"}).json()
    nodes = client.get("/graph").json()["nodes"]
    node = next(n for n in nodes if n["id"] == saved["id"])
    assert node["tags"] == []


def test_graph_match_returns_the_ids_a_groups_words_match(client):
    a = client.post("/entries", json={"content": "thesis outline for the first chapter"}).json()
    client.post("/entries", json={"content": "gym on tuesday"}).json()
    b = client.post("/entries", json={"content": "thesis chapter two draft"}).json()
    ids = client.get("/graph/match", params={"q": "thesis"}).json()["ids"]
    assert set(ids) == {a["id"], b["id"]}
    assert client.get("/graph/match", params={"q": ""}).json() == {"ids": []}
