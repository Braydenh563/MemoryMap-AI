"""Wave E: the graph endpoint — nodes, link/thread edges, similarity."""

from __future__ import annotations


def _save(client, content, **extra):
    response = client.post("/entries", json={"content": content, **extra})
    assert response.status_code == 201
    return response.json()


def test_graph_empty_notebook(client):
    body = client.get("/graph").json()
    assert body == {"nodes": [], "edges": [], "categories": []}


def test_graph_nodes_and_manual_link_edges(client):
    a = _save(client, "first note", category="Alpha")
    b = _save(client, "second note", category="Beta")
    client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})

    body = client.get("/graph").json()
    assert {n["id"] for n in body["nodes"]} == {a["id"], b["id"]}
    assert body["categories"] == ["Alpha", "Beta"]
    assert body["edges"] == [{"source": a["id"], "target": b["id"], "kind": "link"}]

    node = next(n for n in body["nodes"] if n["id"] == a["id"])
    assert node["category"] == "Alpha"
    assert node["preview"] == "first note"
    assert node["pinned"] is False


def test_graph_thread_edges(client):
    parent = _save(client, "the start of a thought", category="Ideas")
    child = _save(client, "…and where it went", parent_id=parent["id"])

    edges = client.get("/graph").json()["edges"]
    assert edges == [
        {"source": parent["id"], "target": child["id"], "kind": "thread"}
    ]


def test_graph_excludes_deleted_notes(client):
    a = _save(client, "keeper", category="Stuff")
    b = _save(client, "goner", category="Stuff")
    client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})
    client.delete(f"/entries/{b['id']}")

    body = client.get("/graph").json()
    assert [n["id"] for n in body["nodes"]] == [a["id"]]
    assert body["edges"] == []  # its only edge pointed at the deleted note


def test_graph_similarity_edges_opt_in(ai_client):
    # The fake embedder puts both "joke" notes on the same axis → cosine 1.
    a = _save(ai_client, "a funny scarecrow joke")
    b = _save(ai_client, "another funny pun")
    _save(ai_client, "buy milk and eggs")  # different topic — no edge to jokes

    # Off by default.
    assert client_edges(ai_client, similarity=False) == []

    edges = client_edges(ai_client, similarity=True)
    similar = [e for e in edges if e["kind"] == "similar"]
    assert {frozenset((e["source"], e["target"])) for e in similar} == {
        frozenset((a["id"], b["id"]))
    }
    assert all(e["score"] >= 0.55 for e in similar)


def test_graph_similarity_skips_already_linked_pairs(ai_client):
    a = _save(ai_client, "a funny scarecrow joke")
    b = _save(ai_client, "another funny pun")
    ai_client.post(f"/entries/{a['id']}/links", json={"target_id": b['id']})

    edges = client_edges(ai_client, similarity=True)
    # The manual link wins; no duplicate dotted edge for the same pair.
    assert [e["kind"] for e in edges] == ["link"]


def client_edges(client, similarity: bool) -> list[dict]:
    url = "/graph?similarity=true" if similarity else "/graph"
    return client.get(url).json()["edges"]
