"""Guards for the bugs the §40 audit found, one test per bug.

The branch this file was written for added ~9,600 lines and almost no tests,
and the cost showed: the same handful of faults kept being "fixed" and coming
back, because nothing could tell anyone they had returned. Each test below
names a specific regression and fails if it reappears.

Grouped by the file that broke rather than by feature, so a session changing
`tools.py` can see at a glance what it must not undo.
"""

from __future__ import annotations

import json

import numpy as np
import pytest

from memorymap.ai import agent, embeddings, tools
from memorymap.core.database import Entry, UserPreference


def _note(session, content="a note", tags=None, private=False):
    entry = Entry(content=content, tags=json.dumps(tags or []), is_private=private)
    session.add(entry)
    session.commit()
    return entry


# --- the chat transport ----------------------------------------------------------


def test_the_chat_stream_is_a_plain_post_not_a_websocket(ai_client):
    """`/chat/stream` was rewritten as a WebSocket and reverted.

    Worth a guard rather than a note: the rewrite needed the request's
    SQLAlchemy Session on a second thread, had to be mounted outside the
    `locked` dependency and hand-roll its auth, and a WS handshake is not
    subject to the same-origin policy that protects this POST — so any page
    the user had open could have driven the agent. It also took ~70 tests with
    it, all reporting 405.
    """
    with ai_client.stream("POST", "/chat/stream", json={"question": "hello"}) as r:
        assert r.status_code == 200
        assert "ndjson" in r.headers["content-type"]


def test_the_frontend_streams_chat_over_fetch(request):
    from memorymap.api.app import FRONTEND_DIR

    app_js = (FRONTEND_DIR / "app.js").read_text(encoding="utf-8")
    assert 'fetch("/chat/stream"' in app_js
    assert "new WebSocket(" not in app_js


# --- tools.py: the private-note boundary -----------------------------------------


@pytest.mark.parametrize(
    ("name", "extra"),
    [("tag_note", {"add": ["snooped"]}), ("link_notes", {})],
)
def test_the_batch_write_tools_still_refuse_a_private_note(session, name, extra):
    """`tag_note` and `link_notes` grew batch arguments and, in doing so,
    stopped calling `_require_note` for the notes in the batch — which is the
    single place that refuses a private note. Tagging one worked; linking to
    one leaked its existence into the graph."""
    public = _note(session, "public")
    private = _note(session, "codeword ELDERFLOWER", private=True)

    args = {"note_id": private.id, **extra}
    if name == "link_notes":
        args = {"note_id": public.id, "other_note_ids": [private.id]}
    result = tools.execute_tool(session, name, args)
    assert "error" in result and "private" in result["error"].lower()


def test_a_batch_tag_does_not_rewrite_the_callers_arguments(session):
    """The id list was built by appending to `args["note_ids"]` in place.

    The agent loop fingerprints a call as `json.dumps(arguments)` *before*
    running it, to spot repeats — so a tool that edits that dict leaves the
    ledger holding a fingerprint the arguments no longer match, and the
    repeated-call guard stops recognising the repeat.
    """
    first, second = _note(session, "one"), _note(session, "two")
    args = {"note_ids": [first.id], "note_id": second.id, "add": ["x"]}
    before = json.dumps(args, sort_keys=True)

    tools.execute_tool(session, "tag_note", dict(args))
    assert json.dumps(args, sort_keys=True) == before


def test_tagging_several_notes_at_once_can_still_be_undone(session):
    """Only single-note calls kept an undo (`undos[0] if len(undos) == 1`), so
    a batch retag of twenty notes was a change with no way back."""
    notes = [_note(session, f"note {i}") for i in range(3)]
    result = tools.execute_tool(
        session,
        "tag_note",
        {"note_ids": [n.id for n in notes], "add": ["batch"]},
    )
    assert result["tagged"] == [n.id for n in notes]
    assert result["undo"] and result["undo"]["steps"]
    assert len(result["undo"]["steps"]) == len(notes)


def test_a_single_note_tag_still_reports_its_id_and_tags(session):
    entry = _note(session, "one")
    result = tools.execute_tool(session, "tag_note", {"note_id": entry.id, "add": ["a"]})
    assert result["id"] == entry.id
    assert result["tags"] == ["a"]
    # The change list reads the note id back out of the result; it must find one.
    assert agent._change_note_id("tag_note", result) == entry.id


# --- tools.py: reads, writes and budgets -----------------------------------------


def test_find_similar_notes_is_a_read_not_a_write():
    """It was added to WRITE_TOOLS. A read listed there counts as work for the
    "you claimed you saved it" checker, labels search-only skills as acting,
    and — the expensive one — trips the write branch in `run_agent`, which
    clears the read-dedup ledger and re-opens every answered read."""
    assert "find_similar_notes" not in tools.WRITE_TOOLS


def test_a_huge_context_window_does_not_buy_a_huge_search_result(session):
    """The result *ceiling* was scaled with the window, not just the default,
    so a 128k model could pull 768 previews — ~38k tokens — from one call."""
    for i in range(40):
        _note(session, f"kayak note number {i}")

    result = tools.execute_tool(
        session, "search_notes", {"query": "kayak"}, context_tokens=128_000
    )
    assert len(result.get("notes", [])) <= tools.MAX_LIST_LIMIT


def test_a_small_model_can_still_ask_the_user_a_question():
    """`ask_user` was culled from small windows as a "complex" tool. It is the
    opposite: one question, a few options, and the only way the agent can say
    "which did you mean?" instead of guessing."""
    offered = [
        {"function": {"name": name, "parameters": {}}}
        for name in ("search_notes", "ask_user", "make_plan")
    ]
    kept, dropped = tools.within_budget(offered, tools.SMALL_WINDOW_CHARS - 1)
    assert "ask_user" in [t["function"]["name"] for t in kept]
    assert "make_plan" in dropped


def test_notes_sharing_an_uppercase_tag_are_still_neighbours(session):
    """The tag index was keyed lowercase and then intersected against tags at
    their original case, so `#Work` matched the index, produced an empty
    intersection, and the two notes were reported as unrelated."""
    first = _note(session, "the first", tags=["Work"])
    _note(session, "the second", tags=["Work"])

    result = tools.execute_tool(session, "related_notes", {"note_id": first.id})
    blob = json.dumps(result).lower()
    assert "the second" in blob


def test_there_is_only_one_skill_writing_tool():
    """`generate_skill` wrote raw AI-authored dicts straight into preferences,
    skipping `save_skill`'s schema check, its built-in-name guard, its
    validation of every declared tool name, and MAX_SKILLS. It also called a
    `config.save_preference` method that does not exist, so it could only ever
    have raised."""
    assert "generate_skill" not in tools.TOOLS
    assert "save_skill" in tools.TOOLS


# --- the memory stream -----------------------------------------------------------


def test_a_saved_preference_reaches_the_next_turns_persona(session):
    tools.execute_tool(
        session, "save_user_preference", {"preference": "Always answer in British English"}
    )
    persona = agent._persona_with_memory(session, "You are a librarian.")
    assert "British English" in persona


def test_the_memory_stream_cannot_grow_past_its_budget(session):
    """It was appended to the system prompt unbounded, on every round of every
    turn — slipping straight past `PROSE_BUDGET_CHARS`, the guard that exists
    to stop exactly this."""
    for i in range(60):
        session.add(UserPreference(content=f"preference number {i} " + "x" * 120))
    session.commit()

    persona = agent._persona_with_memory(session, "P.")
    assert len(persona) <= len("P.") + agent.MEMORY_STREAM_BUDGET_CHARS + 80


def test_an_over_long_preference_is_refused(session):
    result = tools.execute_tool(
        session, "save_user_preference", {"preference": "x" * 5_000}
    )
    assert "error" in result


def test_the_same_preference_is_not_saved_twice(session):
    for _ in range(2):
        tools.execute_tool(session, "save_user_preference", {"preference": "Be brief"})
    assert session.query(UserPreference).count() == 1


def test_losing_the_memory_stream_never_costs_the_turn(monkeypatch):
    """`run_agent` is also driven with stand-in sessions, and a notebook that
    predates the table has no `user_preferences` at all. A missing memory
    stream must degrade to "no preferences", not to a broken turn — this
    exact line took out 7 agent tests with an AttributeError."""

    class NotReallyASession:
        pass

    persona = agent._persona_with_memory(NotReallyASession(), "Just the persona.")
    assert persona == "Just the persona."


# --- embeddings: mixed dimensions and memory -------------------------------------


def test_similar_pairs_survives_a_half_finished_reindex():
    """Switching embedding model leaves both widths in the table at once.
    Stacking them raised on the ragged list, which took out the graph's
    similarity edges and link suggestions entirely rather than degrading."""
    vectors = {
        1: np.array([1.0, 0.0, 0.0], dtype="float32"),
        2: np.array([1.0, 0.0, 0.0], dtype="float32"),
        3: np.array([1.0, 0.0], dtype="float32"),  # the odd width out
    }
    pairs = embeddings.similar_pairs(vectors, 0.5)
    assert [(a, b) for a, b, _ in pairs] == [(1, 2)]


def test_similar_pairs_returns_its_best_match_first():
    vectors = {
        1: np.array([1.0, 0.0], dtype="float32"),
        2: np.array([1.0, 0.0], dtype="float32"),
        3: np.array([0.8, 0.6], dtype="float32"),
    }
    scores = [score for _, _, score in embeddings.similar_pairs(vectors, 0.5)]
    assert scores == sorted(scores, reverse=True)


def test_similar_pairs_never_pairs_a_note_with_itself():
    vectors = {i: np.array([1.0, 0.0], dtype="float32") for i in range(4)}
    for a, b, _ in embeddings.similar_pairs(vectors, 0.5):
        assert a != b


def test_orphaned_vectors_are_actually_removed(app_state, session):
    """`clean_orphaned_vectors` was called by the background pass and never
    written; the call sat in a `try/except` wide enough to swallow the
    AttributeError, so the cleanup reported as running and never ran."""
    from sqlalchemy import text

    from memorymap.core import deps
    from memorymap.core.database import EmbeddingRecord

    entry = _note(session, "a real note")
    gone = _note(session, "about to be purged")
    for target in (entry, gone):
        session.add(
            EmbeddingRecord(
                entry_id=target.id, embedding=b"\x00" * 8, dim=2, model_version="fake"
            )
        )
    session.commit()

    # How an orphan is really made: the recycle bin's purge hard-deletes the
    # entry row and nothing touches its vector. Foreign keys are on, so the
    # delete has to go round them the same way the purge's raw SQL does.
    session.execute(text("PRAGMA foreign_keys=OFF"))
    session.execute(text("DELETE FROM entries WHERE id = :id"), {"id": gone.id})
    session.commit()
    session.execute(text("PRAGMA foreign_keys=ON"))

    assert embeddings.clean_orphaned_vectors(deps.get_db().session) == 1
    session.expire_all()
    remaining = [r.entry_id for r in session.query(EmbeddingRecord).all()]
    assert remaining == [entry.id]


# --- the API surface -------------------------------------------------------------


def test_semantic_search_returns_its_matches_in_rank_order(ai_client, session):
    """`?semantic=true` rebuilt its result as "every note that matched, in
    notebook order", throwing away the ranking that is the whole point — so
    the best match landed wherever it happened to sit in the list."""
    for text_ in ("kayak repair", "sourdough starter", "kayak paddle"):
        ai_client.post("/entries", json={"content": text_})

    response = ai_client.get("/entries", params={"q": "kayak", "semantic": "true"})
    assert response.status_code == 200
    # Whatever the fake embedder ranks first must come back first.
    from memorymap.core import deps
    from memorymap.search import search_manager

    expected = [
        e.id
        for e, _ in search_manager.semantic_search(
            session, "kayak", deps.get_embeddings(), limit=25
        )
    ]
    assert [row["id"] for row in response.json()] == expected


def test_a_cold_embedding_model_says_so_instead_of_dumping_the_notebook(
    client, session
):
    """The failure was swallowed with a bare `except: pass`, which left the
    caller holding every note in the notebook labelled as a search result."""
    client.post("/entries", json={"content": "anything"})
    response = client.get("/entries", params={"q": "anything", "semantic": "true"})
    assert response.status_code == 503


def test_json_export_still_marks_which_notes_are_binned(ai_client):
    """`is_deleted` went missing when the export was rewritten as a loop, so
    every note in the recycle bin would re-import as a live note."""
    made = ai_client.post("/entries", json={"content": "bin me"}).json()
    ai_client.delete(f"/entries/{made['id']}")

    payload = ai_client.get("/export/json").json()
    assert [e["is_deleted"] for e in payload["entries"]] == [True]


def test_the_path_endpoint_stays_cheap_by_default(ai_client, monkeypatch):
    """It began computing similarity edges across the whole notebook on every
    call, while its docstring still promised something cacheable and safe to
    re-issue."""
    from memorymap.api import routes_graph

    calls: list[int] = []
    monkeypatch.setattr(
        routes_graph,
        "_similarity_edges",
        lambda *a, **k: calls.append(1) or [],
    )
    ai_client.get("/graph/path", params={"source": 1, "target": 2})
    assert calls == []

    ai_client.get("/graph/path", params={"source": 1, "target": 2, "similarity": "true"})
    assert calls == [1]


# --- the memory stream, made visible (§39B / §40 open item 1) --------------------


def test_the_saved_preferences_can_be_listed(ai_client, session):
    """The feature shipped write-only: the model could save standing
    instructions into its own future system prompts and the user had no way to
    see them. A rule you cannot read is indistinguishable from the assistant
    behaving oddly."""
    tools.execute_tool(session, "save_user_preference", {"preference": "Be concise"})

    body = ai_client.get("/memory").json()
    assert [p["content"] for p in body["preferences"]] == ["Be concise"]
    assert body["preferences"][0]["active"] is True
    assert body["budget_chars"] == agent.MEMORY_STREAM_BUDGET_CHARS


def test_a_preference_can_be_switched_off_without_deleting_it(ai_client, session):
    """"Stop doing this for now" and "you should never have saved that" are
    different intentions. `active` already existed and nothing ever set it."""
    tools.execute_tool(session, "save_user_preference", {"preference": "Use bullet points"})
    pref = ai_client.get("/memory").json()["preferences"][0]

    turned_off = ai_client.patch(f"/memory/{pref['id']}", json={"active": False})
    assert turned_off.status_code == 200

    session.expire_all()
    assert "bullet points" not in agent._persona_with_memory(session, "P.")
    # Still listed, so it can be turned back on.
    assert ai_client.get("/memory").json()["preferences"][0]["active"] is False


def test_a_preference_can_be_edited(ai_client, session):
    tools.execute_tool(session, "save_user_preference", {"preference": "Answer in French"})
    pref = ai_client.get("/memory").json()["preferences"][0]

    edited = ai_client.patch(f"/memory/{pref['id']}", json={"content": "Answer in German"})
    assert edited.status_code == 200
    session.expire_all()
    assert "German" in agent._persona_with_memory(session, "P.")


def test_a_forgotten_preference_stops_reaching_the_model(ai_client, session):
    tools.execute_tool(session, "save_user_preference", {"preference": "Never use emoji"})
    pref = ai_client.get("/memory").json()["preferences"][0]

    forgotten = ai_client.delete(f"/memory/{pref['id']}")
    assert forgotten.status_code == 200
    session.expire_all()
    assert "emoji" not in agent._persona_with_memory(session, "P.")
    assert ai_client.get("/memory").json()["preferences"] == []


def test_editing_a_preference_that_is_gone_is_a_404(ai_client):
    patch_response = ai_client.patch("/memory/999", json={"active": False})
    assert patch_response.status_code == 404

    delete_response = ai_client.delete("/memory/999")
    assert delete_response.status_code == 404


def test_a_preference_cannot_be_edited_into_nothing(ai_client, session):
    tools.execute_tool(session, "save_user_preference", {"preference": "Something"})
    pref = ai_client.get("/memory").json()["preferences"][0]
    blanked = ai_client.patch(f"/memory/{pref['id']}", json={"content": "   "})
    assert blanked.status_code == 422


# --- media uploads are not a script host (§40 open item 6) -----------------------


def test_media_upload_refuses_anything_that_is_not_an_image(ai_client):
    """`/media/{name}` serves from the app's own origin, so an .html or .svg
    landing here runs with the notebook's token rather than being a picture.
    The AI can write into this folder too, which is what makes it worth
    closing on a single-user local app."""
    for name, mime in [("x.html", "text/html"), ("x.svg", "image/svg+xml")]:
        response = ai_client.post(
            "/media/upload", files={"file": (name, b"<svg onload=alert(1)>", mime)}
        )
        assert response.status_code == 415, name


def test_media_upload_still_takes_a_png(ai_client):
    response = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    )
    assert response.status_code == 200
    assert response.json()["url"].startswith("/media/")


def test_an_upload_is_tracked_listed_and_deletable(ai_client):
    """An image pasted into a note's own markdown had no DB row at all — it
    could not be listed in a gallery, could not be deleted, and there was
    no way to tell "still referenced" apart from "already gone off disk"
    (ROADMAP.md item 20a). `MediaUpload` closes that gap for every upload,
    not just whiteboard image objects."""
    uploaded = ai_client.post(
        "/media/upload", files={"file": ("photo.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()

    listed = ai_client.get("/media").json()
    assert any(row["url"] == uploaded["url"] and row["original_name"] == "photo.png" for row in listed)

    upload_id = next(row["id"] for row in listed if row["url"] == uploaded["url"])
    deleted = ai_client.delete(f"/media/{upload_id}")
    assert deleted.status_code == 200

    # The row and the file are both gone.
    assert not any(row["id"] == upload_id for row in ai_client.get("/media").json())
    assert ai_client.get(uploaded["url"]).status_code == 404


def test_deleting_an_unknown_upload_404s(ai_client):
    # CodeQL py/side-effect-in-assert: the DELETE call is a side effect, and
    # an assert's own expression is skipped entirely under `python -O` —
    # split so the request always fires regardless of optimization flags.
    response = ai_client.delete("/media/999999")
    assert response.status_code == 404


def test_media_is_served_with_a_disposition_header(ai_client):
    url = ai_client.post(
        "/media/upload", files={"file": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    ).json()["url"]
    served = ai_client.get(url)
    assert served.status_code == 200
    assert "inline" in served.headers["content-disposition"]


def test_a_dangerous_file_already_on_disk_is_still_not_served(ai_client, app_state):
    """Upload is not the only way into this folder — a restored backup or a
    synced data directory is another — so the suffix is checked on the way out
    as well as on the way in."""
    media = app_state.data_dir / "media"
    media.mkdir(parents=True, exist_ok=True)
    (media / "evil.html").write_text("<script>alert(1)</script>", encoding="utf-8")
    assert ai_client.get("/media/evil.html").status_code == 404


# --- whiteboard cards die with their note (§40 open item 3) ----------------------


def test_a_card_whose_note_was_purged_is_swept_up(ai_client, session):
    """No cascade on `whiteboard_nodes.entry_id`, so purging a note from the
    recycle bin left a card on the board pointing at nothing — visible, not
    removable through the UI, and it makes the board look broken."""
    from sqlalchemy import text

    from memorymap.ai import autonomous
    from memorymap.core.database import WhiteboardNode

    kept = _note(session, "a note that stays")
    doomed = _note(session, "a note about to be purged")
    for entry in (kept, doomed):
        ai_client.post("/whiteboard/nodes", json={"entry_id": entry.id})

    session.execute(text("PRAGMA foreign_keys=OFF"))
    session.execute(text("DELETE FROM entries WHERE id = :id"), {"id": doomed.id})
    session.commit()
    session.execute(text("PRAGMA foreign_keys=ON"))

    assert autonomous.clean_orphaned_board_cards() == 1
    session.expire_all()
    assert [n.entry_id for n in session.query(WhiteboardNode).all()] == [kept.id]


# --- the graph's expensive derivations, cached (§40 items 4 and 5) ---------------


def _count_calls(monkeypatch, module, name):
    calls = []
    original = getattr(module, name)

    def counted(*args, **kwargs):
        calls.append(1)
        return original(*args, **kwargs)

    monkeypatch.setattr(module, name, counted)
    return calls


def test_pagerank_is_not_recomputed_for_an_unchanged_notebook(ai_client, monkeypatch):
    """Fifteen passes over every node and edge, on every single graph load."""
    from memorymap.api import routes_graph
    from memorymap.entry import paths

    ai_client.post("/entries", json={"content": "one"})
    ai_client.post("/entries", json={"content": "two"})

    calls = _count_calls(monkeypatch, paths, "pagerank")
    for _ in range(3):
        assert ai_client.get("/graph").status_code == 200
    assert len(calls) == 1, "pagerank ran more than once for the same notebook"

    # ...and a new note invalidates it, because a stale graph is worse than a
    # slow one.
    ai_client.post("/entries", json={"content": "three"})
    ai_client.get("/graph")
    assert len(calls) == 2
    routes_graph.reset_graph_cache()


def test_the_cache_is_scoped_to_the_notebook_it_was_built_from(app_state, session):
    """The cache is process-global and the counts in its key are not unique —
    two notebooks with three notes each collide trivially. Restoring a backup
    must not be served the previous notebook's centrality."""
    from memorymap.api import routes_graph

    first = routes_graph._graph_fingerprint(session)
    assert str(app_state.data_dir) in first


def test_focus_mode_reuses_the_full_graphs_similarity_sweep(ai_client, monkeypatch):
    """`/graph/local` is meant to be the cheap one and was paying the whole
    notebook's cost. It still needs the global sweep — a similarity edge can
    join two notes at opposite ends — but it should not repeat it."""
    from memorymap.api import routes_graph

    made = ai_client.post("/entries", json={"content": "kayak repair"}).json()
    ai_client.post("/entries", json={"content": "kayak paddle"})

    # Patched on `routes_graph`, not on `embeddings`: it was imported by name,
    # so the module attribute is the binding that actually gets called.
    calls = _count_calls(monkeypatch, routes_graph, "similar_pairs")
    ai_client.get("/graph", params={"similarity": "true"})
    ai_client.get(f"/graph/local/{made['id']}", params={"similarity": "true"})
    assert len(calls) == 1
    routes_graph.reset_graph_cache()


def test_switching_embedding_model_invalidates_the_similarity_cache(ai_client, monkeypatch):
    """Vectors from two backends live in different spaces, so a model switch
    has to recompute even though no note changed."""
    from memorymap.api import routes_graph

    ai_client.post("/entries", json={"content": "a note"})
    calls = _count_calls(monkeypatch, routes_graph, "similar_pairs")

    ai_client.get("/graph", params={"similarity": "true"})
    assert len(calls) == 1

    backend = deps_backend_id_patch(monkeypatch)
    ai_client.get("/graph", params={"similarity": "true"})
    assert len(calls) == 2, f"a switch to {backend} reused the old vectors' edges"
    routes_graph.reset_graph_cache()


def deps_backend_id_patch(monkeypatch):
    """Pretend the user switched embedding model."""
    from memorymap.core import deps

    service = deps.get_embeddings()
    monkeypatch.setattr(service, "backend_id", lambda: "some-other-model")
    return "some-other-model"


# --- reported directly, after the audit (§41) ------------------------------------


def test_a_preference_can_be_added_by_hand(ai_client):
    """`save_user_preference` is the model's door in. "I already know what I
    want it to always do" needed one too, and was the first thing asked for
    once the list became visible."""
    made = ai_client.post("/memory", json={"content": "Never use emoji"})
    assert made.status_code == 201
    assert made.json()["content"] == "Never use emoji"
    assert [p["content"] for p in ai_client.get("/memory").json()["preferences"]] == [
        "Never use emoji"
    ]


def test_adding_the_same_preference_twice_is_refused(ai_client):
    ai_client.post("/memory", json={"content": "Be brief"})
    again = ai_client.post("/memory", json={"content": "  be BRIEF "})
    assert again.status_code == 409


def test_an_empty_preference_is_refused(ai_client):
    empty = ai_client.post("/memory", json={"content": "   "})
    assert empty.status_code == 422


def test_a_hand_written_preference_is_capped_like_the_tools(ai_client):
    from memorymap.ai.tools import MAX_ACTIVE_PREFERENCES

    for i in range(MAX_ACTIVE_PREFERENCES):
        saved = ai_client.post("/memory", json={"content": f"rule {i}"})
        assert saved.status_code == 201
    # The cap exists because every active preference is replayed into the
    # system prompt on every round — true whoever typed it.
    over_the_cap = ai_client.post("/memory", json={"content": "one too many"})
    assert over_the_cap.status_code == 409


def test_moving_a_card_keeps_it_on_its_board(ai_client, session):
    """`PUT /whiteboard/nodes/{id}` takes the whole node, and the browser was
    not sending `board_id` — so dragging a card on a named board read as "move
    this to the global board" and it vanished from the board you were looking
    at."""
    entry = _note(session, "a note")
    board = _note(session, "a board")
    node = ai_client.post(
        "/whiteboard/nodes", json={"entry_id": entry.id, "board_id": board.id}
    ).json()

    moved = ai_client.put(
        f"/whiteboard/nodes/{node['id']}",
        json={"entry_id": entry.id, "board_id": board.id, "x": 40, "y": 50},
    )
    assert moved.status_code == 200
    assert moved.json()["board_id"] == board.id
    on_board = ai_client.get(f"/whiteboard/?board_id={board.id}").json()
    assert [n["id"] for n in on_board["nodes"]] == [node["id"]]


def test_the_frontend_sends_the_board_when_it_moves_a_card():
    """The guard for the half of that bug that lives in the browser."""
    from memorymap.api.app import FRONTEND_DIR

    app_js = (FRONTEND_DIR / "app.js").read_text(encoding="utf-8")
    save = app_js[app_js.index("// Sync back to API.") :][:900]
    assert "board_id" in save, "the coordinate save must carry the card's board"


def test_a_skill_description_is_not_clipped_to_one_line():
    """Reported twice. The row reused `.persona-preview`, which is nowrap with
    an ellipsis — so the only field saying what a skill *does* got whatever
    width was left after five chips."""
    from memorymap.api.app import FRONTEND_DIR

    app_js = (FRONTEND_DIR / "app.js").read_text(encoding="utf-8")
    css = (FRONTEND_DIR / "style.css").read_text(encoding="utf-8")
    assert 'note.className = "muted skill-blurb"' in app_js
    blurb = css[css.index(".skill-blurb {") :][: css[css.index(".skill-blurb {") :].index("}")]
    assert "white-space: normal" in blurb


# --- security scanner findings (§41) ---------------------------------------------


def test_removing_a_model_never_returns_the_filesystem_path(app_state, monkeypatch):
    """CodeQL `py/stack-trace-exposure` at routes_settings.py:473.

    `embedmodels.remove` returned `f"...: {exc}"` for an OSError, and that
    string goes straight to the browser as the API response. An OSError's text
    carries the full path it failed on — so a failed delete published where the
    model cache lives. The detail belongs in the log, where only the owner of
    the machine reads it.
    """
    import shutil

    from memorymap.core import embedmodels

    model = next(iter(embedmodels.EMBED_MODELS_BY_ID.values()))
    path = embedmodels._model_dir(model)
    path.mkdir(parents=True, exist_ok=True)

    secret = str(path)

    def explode(*args, **kwargs):
        raise OSError(f"Permission denied: {secret}/blobs/deadbeef")

    monkeypatch.setattr(shutil, "rmtree", explode)
    removed, message = embedmodels.remove(model.id)

    assert removed is False
    assert secret not in message
    assert "deadbeef" not in message


def test_cryptography_is_pinned_past_the_two_advisories():
    """<= 48.0.0 has an exponential path-building DoS and a wildcard-SAN
    escape from an intermediate's permittedSubtrees. Neither is reachable from
    this app — nothing here builds or verifies an X.509 chain — but the floor
    is free, and Dependabot was blocked by *our own* ceiling rather than by a
    real conflict, which is the part worth pinning so it cannot recur.
    """
    import re
    from pathlib import Path

    requirements = (Path(__file__).resolve().parents[1] / "requirements.txt").read_text()
    spec = re.search(r"^cryptography([^\n]*)$", requirements, re.M)
    assert spec, "cryptography is no longer in requirements.txt"
    floor = re.search(r">=(\d+)", spec.group(1))
    assert floor and int(floor.group(1)) >= 49, spec.group(0)
