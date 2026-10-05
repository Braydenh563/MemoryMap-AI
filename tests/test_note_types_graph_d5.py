"""WORLD_CLASS_PLAN row 10 (D5): typed properties on notes, the gate's last
two parts. KG4 built the properties and the note types; D5's gate also says
"FTS finds it" and "the graph colours by it". A note's type rides on its graph
node and the type's own colour rides on the payload, so the colour rule is a
rendering of what `/graph` already sent, never a request per node."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _typed_note(client, text: str, props: dict) -> dict:
    note = client.post("/entries", json={"content": text}).json()
    saved = client.put(f"/entries/{note['id']}/properties", json={"properties": props})
    assert saved.status_code == 200, saved.text
    return saved.json()


def test_a_typed_note_carries_its_type_on_the_graph(client):
    meeting = _typed_note(client, "# Budget review\nQuarter numbers", {"type": "Meeting", "room": "Harbour"})
    plain = client.post("/entries", json={"content": "an untyped note about bread"}).json()
    nodes = {n["id"]: n for n in client.get("/graph").json()["nodes"]}
    assert nodes[meeting["id"]]["note_type"] == "Meeting"
    assert nodes[plain["id"]]["note_type"] is None


def test_the_graph_payload_carries_each_types_own_colour(client):
    made = client.post("/note-types", json={"name": "Book", "colour": "#a06cd5", "fields": [{"name": "author"}]})
    assert made.status_code == 201, made.text
    _typed_note(client, "# Dune\nsand", {"type": "Book", "author": "Herbert"})
    body = client.get("/graph").json()
    assert body["type_colours"].get("Book") == "#a06cd5"


def test_a_type_spelt_in_another_case_is_the_types_own_name(client):
    client.post("/note-types", json={"name": "Recipe"})
    note = _typed_note(client, "# Soup\nleeks", {"type": "recipe"})
    nodes = {n["id"]: n for n in client.get("/graph").json()["nodes"]}
    assert nodes[note["id"]]["note_type"] == "Recipe"


def test_properties_save_through_the_route_with_its_etag(client):
    """The PUT broke when B7 added `response` and `If-Match` to `update_entry`
    (a positional `session` landed in `response`): every save was a 500."""
    note = client.post("/entries", json={"content": "# Plan\nsteps"}).json()
    saved = client.put(f"/entries/{note['id']}/properties", json={"properties": {"status": "open"}})
    assert saved.status_code == 200
    assert saved.headers.get("etag")
    assert saved.json()["properties"]["status"] == ["open"]


def test_search_finds_a_property_value(client):
    note = _typed_note(client, "# Standup\nshort one", {"type": "Meeting", "venue": "Lighthouse annex"})
    hits = client.get("/search", params={"q": "lighthouse", "kind": "note"}).json()["hits"]
    assert note["id"] in [h["id"] for h in hits]


def test_the_graph_offers_note_type_as_a_colour_rule():
    graph = (ROOT / "frontend" / "js" / "graph.js").read_text(encoding="utf-8")
    canvas = (ROOT / "frontend" / "js" / "graph-canvas.js").read_text(encoding="utf-8")
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    assert '"type"' in graph.split("const GRAPH_COLOUR_RULES", 1)[1].split("\n", 1)[0]
    assert '<option value="type">Note type</option>' in html
    assert 'rule === "type"' in canvas
    # A type's own colour wins over the calm scheme's, so a Meeting is the
    # same colour on the graph as in Note types.
    assert "type_colours" in canvas


def test_a_type_can_be_given_a_colour_from_note_types():
    props = (ROOT / "frontend" / "js" / "note-properties.js").read_text(encoding="utf-8")
    sheet = props.split("async function openNoteTypesSheet", 1)[1].split("\nfunction ", 1)[0]
    assert "noteTypePickColour(t)" in sheet
    picker = props.split("async function noteTypePickColour", 1)[1].split("\n}\n", 1)[0]
    # DESIGN.md's swatch picker, never a hand-built row of colours, and Undo.
    assert "swatchPicker(" in picker and "pushUndo(" in picker
    assert 'method: "PATCH"' in picker


def test_a_palette_key_colour_reaches_the_graph(client):
    client.post("/note-types", json={"name": "Place", "colour": "teal"})
    assert client.get("/graph").json()["type_colours"]["Place"] == "teal"
    canvas = (ROOT / "frontend" / "js" / "graph-canvas.js").read_text(encoding="utf-8")
    rule = canvas.split('if (rule === "type") {', 1)[1].split("\n  }\n", 1)[0]
    assert "CATEGORY_PALETTE" in rule
