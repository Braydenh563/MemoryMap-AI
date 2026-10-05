"""WORLD_CLASS_PLAN D5's last two parts: the built-in kinds and the graph
colouring by them.

KG4 (GRAPH_PLAN, 2026-10-04) built typed properties on notes and user-made
note types; D5's gate also asked for built-in kinds (person, project,
meeting, book, place) and "the graph colours by it". A notebook seeds the five
once, and never again after a person deletes them; the graph carries each
note's type and the type's own colour.
"""

from __future__ import annotations

BUILT_IN = {"Person", "Project", "Meeting", "Book", "Place"}


def test_a_fresh_notebook_has_the_five_kinds_each_with_a_colour_and_fields(client):
    rows = client.get("/note-types").json()
    names = {row["name"] for row in rows}
    assert BUILT_IN <= names
    for row in rows:
        if row["name"] in BUILT_IN:
            assert row["colour"] and row["colour"].startswith("#"), row
            assert row["icon"], row
            assert row["fields"], row


def test_the_kinds_are_seeded_once_and_a_deleted_one_stays_deleted(client):
    rows = client.get("/note-types").json()
    for row in rows:
        assert client.delete(f"/note-types/{row['id']}").status_code == 200
    assert client.get("/note-types").json() == []


def test_the_graph_colours_by_note_type(client):
    client.get("/note-types")
    made = client.post("/entries", json={"content": "Ada Lovelace", "note_type": "Person"}).json()
    plain = client.post("/entries", json={"content": "A plain thought"}).json()
    graph = client.get("/graph").json()
    nodes = {n["id"]: n for n in graph["nodes"]}
    assert nodes[made["id"]]["note_type"] == "Person"
    assert nodes[plain["id"]]["note_type"] is None
    assert graph["type_colours"]["Person"].startswith("#")


def test_search_finds_a_note_by_a_property_value(client):
    client.post("/entries", json={"content": "---\nauthor: Ursula Leguin\n---\n# Earthsea\n\nA wizard."})
    body = client.get("/search", params={"q": "Leguin"}).json()
    assert body["hits"], body


def test_the_graph_offers_the_type_rule():
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    html = (root / "frontend" / "index.html").read_text(encoding="utf-8")
    graph = (root / "frontend" / "js" / "graph.js").read_text(encoding="utf-8")
    canvas = (root / "frontend" / "js" / "graph-canvas.js").read_text(encoding="utf-8")
    assert '<option value="type">Note type</option>' in html
    assert '"type"' in graph.split("const GRAPH_COLOUR_RULES", 1)[1].split("\n", 1)[0]
    assert 'rule === "type"' in canvas
