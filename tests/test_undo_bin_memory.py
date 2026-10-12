"""Answering a memory proposal can be taken back and answered again (INBOX 898)."""

from __future__ import annotations

from tessellate.ai import memory, tools


def test_an_answered_proposal_goes_back_to_being_a_question(ai_client, session):
    tools.execute_tool(session, "save_user_preference", {"preference": "Answer in Welsh"})
    pref = ai_client.get("/memory").json()["preferences"][0]
    ai_client.post(f"/memory/{pref['id']}/answer", json={"accept": True})
    session.expire_all()
    assert "Welsh" in memory.persona_with_memory(session, "P.")

    undone = ai_client.patch(f"/memory/{pref['id']}", json={"proposed": True, "active": False})
    assert undone.json()["proposed"] is True and undone.json()["active"] is False
    session.expire_all()
    assert "Welsh" not in memory.persona_with_memory(session, "P.")

    redone = ai_client.patch(f"/memory/{pref['id']}", json={"proposed": False, "active": True})
    assert redone.json()["proposed"] is False and redone.json()["active"] is True
    session.expire_all()
    assert "Welsh" in memory.persona_with_memory(session, "P.")
