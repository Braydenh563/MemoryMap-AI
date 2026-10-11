"""A mind map or board is an `Entry` row, and no reader of *notes* may list it
as one (reported 2026-10-10: "mindmaps still appear as notes in the ask subtab
search"; Ask listed a map named "test" as an Uncategorised note card with a
similarity score, while the Library showed it as a mind map).

`GET /entries`, the count and the dashboard already filtered `is_board`
(`manager.BOARDS_EXCLUDE`); the retrieval behind Ask and chat
(`search_manager`), the notebook statistics and the AI's reading tools did not.
Decision: those readers are *note* readers. A map's words live on its topics,
not in its entry (whose content is the one line `# Title`), so handing it to a
model as a note can ground nothing and only mislabels it. A map is found
as a map by `/search` (kind `map`) and the palette, which these tests also pin.
"""
from __future__ import annotations

import json

import pytest

from memorymap.core.database import Entry, EntryLink
from memorymap.entry import manager
from memorymap.search import search_manager


@pytest.fixture
def notebook(client, session):
    notes = [
        manager.create_entry(session, text, category_name="Work")
        for text in (
            "The test results for the kitchen renovation arrived today",
            "Bread test: sourdough rises better with rye",
            "Plan the test lab visit next week",
        )
    ]
    made = client.post("/whiteboard/boards", json={"name": "test", "type": "map", "layout": "tree-right"})
    assert made.status_code == 201, made.text
    mind = made.json()["id"]
    root = client.post(
        f"/whiteboard/boards/{mind}/nodes", json={"kind": "topic", "parent_id": None, "text": "test"}
    ).json()
    for text in ("test alpha", "test beta"):
        client.post(f"/whiteboard/boards/{mind}/nodes", json={"kind": "topic", "parent_id": root["id"], "text": text})
    board = client.post("/whiteboard/boards", json={"name": "test board", "type": "board"})
    assert board.status_code == 201, board.text
    session.expire_all()
    # A note linked to the map: graph expansion walks links.
    session.add(EntryLink(source_entry_id=notes[0].id, target_entry_id=mind, link_type="related"))
    session.commit()
    return {"notes": [n.id for n in notes], "map": mind, "board": board.json()["id"]}


def _ids(entries):
    return {e.id for e in entries}


def test_the_fixture_really_holds_a_map_and_a_board(session, notebook):
    rows = {e.id: e for e in session.query(Entry).all()}
    assert rows[notebook["map"]].is_board and json.loads(rows[notebook["map"]].board_settings)["type"] == "map"
    assert rows[notebook["board"]].is_board


def test_chat_retrieval_returns_only_notes(session, notebook, fake_embeddings):
    found, _mode = search_manager.retrieve(session, "test", fake_embeddings)
    assert found, "the notes should still be found"
    assert _ids(found) <= set(notebook["notes"]), [(e.id, e.content[:20]) for e in found]


def test_keyword_search_returns_only_notes(session, notebook):
    found = search_manager.keyword_search(session, "test")
    assert _ids(found) == set(notebook["notes"])


def test_the_recent_fallback_returns_only_notes(session, notebook):
    assert _ids(search_manager.recent_entries(session)) == set(notebook["notes"])


def test_a_dated_question_returns_only_notes(session, notebook):
    assert _ids(search_manager.in_range(session, None, None)) == set(notebook["notes"])


def test_graph_expansion_does_not_walk_to_a_map(session, notebook):
    seed = session.get(Entry, notebook["notes"][1])
    first = session.get(Entry, notebook["notes"][0])
    found, _why, _hops = search_manager.graph_expansion(session, [seed, first])
    assert notebook["map"] not in _ids(found)


def test_the_notebook_statistics_count_notes_only(session, notebook):
    from memorymap.ai import notebook_stats

    answer = notebook_stats.answer("how many notes do I have?", session)
    assert answer is not None
    assert answer.facts[0]["count"] == len(notebook["notes"])


def test_the_ai_reading_tools_see_notes_only(session, notebook):
    from memorymap.ai.tools import _count_notes, _list_notes, _search_notes

    assert _count_notes(session, {})["total"] == len(notebook["notes"])
    listed = {row["id"] for row in _list_notes(session, {}).get("notes", [])}
    assert listed <= set(notebook["notes"])
    found = {row["id"] for row in _search_notes(session, {"query": "test"}).get("notes", [])}
    assert found <= set(notebook["notes"])


def test_the_notes_surfaces_over_http_leave_the_map_out(client, notebook):
    mind = notebook["map"]
    listed = client.get("/entries").json()
    assert mind not in {e["id"] for e in listed}
    assert client.get("/insights/stats").json()["total_entries"] == len(notebook["notes"])
    notes_only = client.get("/search", params={"q": "test", "kind": "note"}).json()
    assert {h["id"] for h in notes_only["hits"]} == set(notebook["notes"])
    assert all(h["kind"] == "note" for h in notes_only["hits"])
    graph = client.get("/graph").json()
    assert mind not in {n["id"] for n in graph["nodes"]}


def test_a_map_is_still_found_as_a_map_by_the_finder(client, notebook):
    """Find anything and the palette read `/search`: the map is there, and says
    what it is."""
    hits = client.get("/search", params={"q": "test"}).json()["hits"]
    kinds = {h["id"]: h["kind"] for h in hits}
    assert kinds[notebook["map"]] == "map"
    assert kinds[notebook["board"]] == "board"
    assert all(kinds[i] == "note" for i in notebook["notes"])
