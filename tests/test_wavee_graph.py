"""Wave E: the graph endpoint — nodes, link/thread edges, similarity."""

from __future__ import annotations

from datetime import datetime


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
    assert body["edges"] == [
        {
            "source": a["id"],
            "target": b["id"],
            "kind": "link",
            "reason": None,
            "reason_confidence": None,
        }
    ]

    node = next(n for n in body["nodes"] if n["id"] == a["id"])
    assert node["category"] == "Alpha"
    assert node["preview"] == "first note"
    assert node["pinned"] is False


def test_graph_node_dates_are_valid_iso_not_double_timezoned(client):
    """`created_at` used to be built as `e.created_at.isoformat() + "Z"` —
    but `core/database.DateTime` already hands back a timezone-AWARE
    datetime, so `.isoformat()` alone ends in `+00:00`, and the extra "Z"
    produced `...+00:00Z`: two timezone markers in one string. Python's own
    `datetime.fromisoformat` rejects that (and so, silently, does
    JavaScript's `Date` constructor — `Invalid Date`, no exception) — which
    is why the graph's time-filter slider could never move: every node's
    date failed to parse, so the filter's min/max collapsed to "now" no
    matter what any note's actual date was.
    """
    a = _save(client, "first note", category="Alpha")
    node = next(n for n in client.get("/graph").json()["nodes"] if n["id"] == a["id"])
    parsed = datetime.fromisoformat(node["created_at"])
    assert parsed.tzinfo is not None


def test_graph_local_node_dates_are_valid_iso_too(client):
    """The focus-mode graph (`/graph/local/{id}`) builds its node list from
    a different loop over the same data and had the identical bug."""
    a = _save(client, "first note", category="Alpha")
    b = _save(client, "second note", category="Beta")
    client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})

    body = client.get(f"/graph/local/{a['id']}").json()
    for node in body["nodes"]:
        parsed = datetime.fromisoformat(node["created_at"])
        assert parsed.tzinfo is not None


def test_graph_link_edge_carries_its_reason(client):
    a = _save(client, "assignment due next week", category="Uni")
    b = _save(client, "gym session tuesday", category="Fitness")
    client.post(
        f"/entries/{a['id']}/links",
        json={"target_id": b["id"], "reason": "both about scheduling"},
    )

    edges = client.get("/graph").json()["edges"]
    assert edges == [
        {
            "source": a["id"],
            "target": b["id"],
            "kind": "link",
            "reason": "both about scheduling",
            # A reason someone typed, not one deduced — no score attached.
            "reason_confidence": None,
        }
    ]


def test_graph_link_edge_without_a_reason_is_none(client):
    a = _save(client, "first note", category="Alpha")
    b = _save(client, "second note", category="Beta")
    client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})

    edges = client.get("/graph").json()["edges"]
    assert edges[0]["reason"] is None


def test_graph_link_edge_carries_a_deduced_reasons_confidence(ai_client):
    a = _save(ai_client, "a funny scarecrow joke", category="Alpha")
    b = _save(ai_client, "another funny pun", category="Beta")
    ai_client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})

    edges = ai_client.get("/graph").json()["edges"]
    assert edges[0]["reason"] == "similar in meaning"
    assert edges[0]["reason_confidence"] == 1.0


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


def test_graph_previews_show_words_not_markdown_markers(client):
    """Reported: "**note" showing in graph titles when a note starts with a
    header or bolded word. Labels clip at ~40 characters, so markers are
    stripped rather than rendered — a clip mid-`**` is scaffolding."""
    client.post("/entries", json={"content": "## **Seraphine build** for _mid_ lane"})
    nodes = client.get("/graph").json()["nodes"]
    assert nodes[0]["preview"] == "Seraphine build for mid lane"
