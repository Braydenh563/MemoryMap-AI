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
