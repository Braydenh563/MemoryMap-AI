"""One centrality per picture of the notebook (GRAPH_PLAN, "Decisions made,
2026-10-05: one PageRank, the map's").

`/graph` and `/graph/local` shared one cache slot named "centrality", keyed
by the notebook fingerprint and the similarity switch, but they ranked two
different graphs: `/graph` leaves drafts out (and boards, unless Maps is on),
the focus view's index held every live note. Whichever call came first filled
the slot and the other was served its numbers, so a note's size in focus mode
depended on which view had been opened since the last edit, and turning Maps
on was served the no-maps ranking (no board ever ranked). The similarity
sweep's slot had the same shape: its build read the caller's note set, its
key did not.

Decided: a note's centrality is the map's (no drafts; boards only with Maps
on), the same number in focus mode as on the whole map, computed once per
version of the notebook per (similarity, maps) and never from a caller's own
index.
"""
from __future__ import annotations

from memorymap.api import routes_graph
from memorymap.core.database import Entry, EntryLink


def _notebook(session):
    notes = [Entry(content=f"# Note {i}") for i in range(5)]
    board = Entry(content="# My map", is_board=True)
    draft = Entry(content="half typed", is_draft=True)
    session.add_all([*notes, board, draft])
    session.flush()
    a, b, c, d, e = (n.id for n in notes)
    links = [(a, b), (b, c), (c, a), (d, a), (board.id, e), (board.id, d), (draft.id, e), (draft.id, d)]
    session.add_all(EntryLink(source_entry_id=s, target_entry_id=t) for s, t in links)
    session.commit()
    return [n.id for n in notes], board.id


def _ranks(payload):
    return {n["id"]: n["centrality"] for n in payload["nodes"] if isinstance(n["id"], int)}


def test_focus_mode_and_the_map_give_a_note_the_same_size_in_either_order(client, session):
    ids, _board = _notebook(session)
    routes_graph.reset_graph_cache()
    whole_first = _ranks(client.get("/graph").json())
    local_after = _ranks(client.get(f"/graph/local/{ids[0]}", params={"depth": 3}).json())
    routes_graph.reset_graph_cache()
    local_first = _ranks(client.get(f"/graph/local/{ids[0]}", params={"depth": 3}).json())
    whole_after = _ranks(client.get("/graph").json())
    assert whole_first == whole_after
    for note in ids:
        if note in local_first:
            assert local_first[note] == whole_first[note]
            assert local_after[note] == whole_first[note]


def test_maps_on_is_ranked_with_its_boards_and_off_without(client, session):
    ids, board = _notebook(session)
    routes_graph.reset_graph_cache()
    fresh_off = _ranks(client.get("/graph").json())
    routes_graph.reset_graph_cache()
    fresh_on = _ranks(client.get("/graph", params={"include_maps": True}).json())
    assert fresh_on[board] > 0
    # Warm, in both orders: each switch keeps its own answer.
    assert _ranks(client.get("/graph").json()) == fresh_off
    assert _ranks(client.get("/graph", params={"include_maps": True}).json()) == fresh_on
    assert _ranks(client.get("/graph").json()) == fresh_off
    assert fresh_on[ids[4]] != fresh_off[ids[4]]


def test_a_draft_never_ranks_and_never_lends_rank(client, session):
    ids, _board = _notebook(session)
    routes_graph.reset_graph_cache()
    client.get(f"/graph/local/{ids[4]}", params={"depth": 3})
    whole = _ranks(client.get("/graph").json())
    routes_graph.reset_graph_cache()
    assert _ranks(client.get("/graph").json()) == whole
