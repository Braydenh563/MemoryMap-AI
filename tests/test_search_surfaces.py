"""Every search box asks the one engine (WORLD_CLASS_PLAN B3, OPEN.md
"search-one-surface"; search-boot-1005).

Before: the Notes list and the Library each had a second ranking path,
`GET /entries?q=...&semantic=true` (cosine only, notes only, a 25-note cap),
the Notes list's own parser did not know `kind:`, `has:` or `space:` (they
were read as plain words and matched nothing), and the palette matched the
loaded page of notes in the browser. `GET /search` is the engine every one of
them now calls; each surface keeps its own look and its own result shape.

Two halves, because the suite cannot see the DOM: the backend half proves
the engine answers whatever the old path answered (same notes for a
fixture), and the frontend half is a lint that a surface *calls* `/search`
and no longer calls the old path.
"""

from __future__ import annotations

import re

from _app_js import JS_DIR


def _note(client, content: str, **extra) -> int:
    reply = client.post("/entries", json={"content": content, **extra})
    assert reply.status_code in (200, 201), reply.text
    return reply.json()["id"]


def _engine_ids(client, q: str, **params) -> list[int]:
    reply = client.get("/search", params={"q": q, "kind": "note", "limit": 50, **params})
    assert reply.status_code == 200, reply.text
    return [hit["id"] for hit in reply.json()["hits"] if hit["kind"] == "note"]


def _semantic_ids(client, q: str) -> list[int]:
    reply = client.get("/entries", params={"q": q, "semantic": "true"})
    assert reply.status_code == 200, reply.text
    return [row["id"] for row in reply.json()]


# --- backend parity: the engine answers what the old path answered ----------------


def test_the_engine_finds_every_note_the_semantic_list_found(ai_client):
    milk = _note(ai_client, "buy milk and eggs on the way home")
    garden = _note(ai_client, "Planted the garden beds today")
    _note(ai_client, "a pun about a scarecrow")
    for q in ("shopping", "milk", "garden"):
        old = _semantic_ids(ai_client, q)
        new = _engine_ids(ai_client, q)
        assert set(old) <= set(new), (q, old, new)
    assert milk in _engine_ids(ai_client, "shopping")
    assert garden in _engine_ids(ai_client, "garden")


def test_the_engine_hit_carries_what_a_list_needs_to_place_it(ai_client):
    """The Notes list renders from `GET /entries?ids=`, in the order of the
    hits, so a hit's id and its flags are the contract."""
    keep = _note(ai_client, "buy milk and eggs on the way home")
    gone = _note(ai_client, "buy milk and bread at the shop")
    assert ai_client.delete(f"/entries/{gone}").status_code in (200, 204)
    hits = ai_client.get("/search", params={"q": "milk", "kind": "note"}).json()["hits"]
    flags = {hit["id"]: hit["flags"] for hit in hits}
    assert keep in flags
    # The bin is indexed (it stays searchable) and says so; the list's own
    # read by ids is what keeps it out of the Notes view.
    assert "deleted" in flags.get(gone, ["deleted"])
    rows = ai_client.get("/entries", params={"ids": f"{keep},{gone}"}).json()
    assert [row["id"] for row in rows] == [keep]


def test_operators_the_notes_parser_does_not_know_are_the_engines(client):
    plain = _note(client, "harbour walk with the dog")
    linked = _note(client, "harbour notes, tied to the walk")
    assert client.post(f"/entries/{linked}/links", json={"target_id": plain}).status_code in (200, 201)
    # `kind:` is honoured as an operator, with no `kind` parameter.
    reply = client.get("/search", params={"q": "kind:note harbour", "limit": 50}).json()
    assert {plain, linked} <= {hit["id"] for hit in reply["hits"]}
    none = client.get("/search", params={"q": "kind:document harbour", "limit": 50}).json()
    assert not [hit for hit in none["hits"] if hit["kind"] == "note"]
    # `has:link` narrows to the notes that are linked (both ends of a link).
    third = _note(client, "harbour sunrise, unconnected")
    ids = _engine_ids(client, "has:link harbour")
    assert linked in ids and third not in ids
    # `space:` narrows to a space; the default space holds both.
    assert {plain, linked, third} <= set(_engine_ids(client, "space:default harbour"))
    assert _engine_ids(client, "space:nowhere harbour") == []


# --- frontend: each surface calls /search -----------------------------------------


def _read(name: str) -> str:
    return (JS_DIR / name).read_text(encoding="utf-8")


def _function(text: str, name: str) -> str:
    """The source of `function name(` or `async function name(`, to its closing
    brace at column 0."""
    match = re.search(rf"^(?:async )?function {re.escape(name)}\(", text, re.M)
    assert match, f"{name} not found"
    end = re.search(r"^\}", text[match.start():], re.M)
    assert end, f"{name} has no closing brace"
    return text[match.start(): match.start() + end.end()]


def test_the_notes_list_semantic_toggle_asks_the_engine():
    body = _function(_read("notes-list.js"), "_loadEntries")
    assert "semantic=true" not in body
    assert "/search?q=" in body


def test_the_notes_list_asks_the_engine_for_its_operators():
    text = _read("notes-list.js")
    parse = _function(text, "parseNoteQuery")
    assert "engine" in parse
    matches = _function(text, "matchesSearch")
    assert "engineQueryIds(" in matches
    ids = _function(text, "engineQueryIds")
    assert "/search?q=" in ids


def test_the_library_semantic_toggle_asks_the_engine():
    body = _function(_read("library.js"), "refreshLibrarySemantic")
    assert "/search?q=" in body
    assert "kind=note" in body


def test_the_palette_asks_the_engine_for_notes_and_documents():
    text = _read("app-palette.js")
    ask = _function(text, "paletteAskEngine")
    assert "/search?q=" in ask and "kind=note,document" in ask
    # Drawn from the engine's answer first, topped up by the in-memory match.
    matches = _function(text, "paletteMatches")
    assert "paletteEngine.notes" in matches and "paletteEngine.docs" in matches
    # The ask is made when the person types, and dropped when the window closes.
    assert "paletteAskEngine($(" in text
    assert "paletteEngine.run += 1" in _function(text, "closePalette")


def test_no_surface_still_reads_the_second_ranking_path():
    """`/entries?...&semantic=true` is the second ranking path the engine
    replaced; nothing in the frontend asks for it any more."""
    offenders = [
        path.name
        for path in sorted(JS_DIR.glob("*.js"))
        if "semantic=true" in path.read_text(encoding="utf-8")
    ]
    assert not offenders, offenders
