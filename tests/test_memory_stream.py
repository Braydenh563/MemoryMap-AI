"""The memory stream: standing preferences the model saves about itself, or
the user writes by hand, and replays into its own future system prompts.

Split out of test_antigravity_regressions.py (§40/§41) — grouped here rather
than left as scattered bug-regression tests because this is now a real,
readable feature: save, list, edit, deactivate, forget, and the budget that
keeps it from growing without bound.
"""

from __future__ import annotations

from memorymap.ai import agent, tools
from memorymap.core.database import UserPreference


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
