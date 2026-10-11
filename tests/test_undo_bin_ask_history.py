"""Ask history and the Ask again chips can be put back (INBOX 898)."""

from __future__ import annotations


from memorymap.core.database import AskTurn


def _turn(session, question, pinned=False):
    row = AskTurn(question=question, answer=f"answer to {question}", pinned=pinned)
    session.add(row)
    session.commit()
    return row.id


def _ask_again(client):
    return client.get("/chat/recent").json()


def _asked(client, session, question):
    """A question as the Ask box leaves it: a turn and the audit row behind the chip."""
    from memorymap.entry import manager

    manager.log_action(session, "queried", "chat", detail=question)
    session.commit()


def test_a_deleted_question_comes_back_with_its_answer(ai_client, session):
    turn_id = _turn(session, "when is the dentist")
    gone = ai_client.delete(f"/ask-history/{turn_id}").json()
    assert gone["undo_token"]
    assert ai_client.get("/ask-history").json()["total"] == 0

    back = ai_client.post("/ask-history/restore", json={"token": gone["undo_token"]})
    assert back.json() == {"restored": 1}
    shown = ai_client.get(f"/ask-history/{turn_id}").json()
    assert shown["question"] == "when is the dentist"
    assert shown["answer"] == "answer to when is the dentist"
    reply_1 = ai_client.post("/ask-history/restore", json={"token": gone["undo_token"]})
    assert reply_1.status_code == 404


def test_deleting_a_turn_hides_its_chip_and_undo_shows_it_again(ai_client, session):
    _asked(ai_client, session, "what is the plan")
    turn_id = _turn(session, "what is the plan")
    assert _ask_again(ai_client) == ["what is the plan"]
    token = ai_client.delete(f"/ask-history/{turn_id}").json()["undo_token"]
    assert _ask_again(ai_client) == []
    ai_client.post("/ask-history/restore", json={"token": token})
    assert _ask_again(ai_client) == ["what is the plan"]


def test_clear_keeps_the_pinned_and_undo_brings_back_the_rest(ai_client, session):
    _asked(ai_client, session, "one")
    _asked(ai_client, session, "two")
    kept = _turn(session, "kept", pinned=True)
    _turn(session, "one")
    _turn(session, "two")
    cleared = ai_client.delete("/ask-history").json()
    assert cleared["deleted"] == 2
    assert [t["id"] for t in ai_client.get("/ask-history").json()["turns"]] == [kept]
    assert _ask_again(ai_client) == []

    back = ai_client.post("/ask-history/restore", json={"token": cleared["undo_token"]}).json()
    assert back == {"restored": 2}
    assert ai_client.get("/ask-history").json()["total"] == 3
    assert _ask_again(ai_client) == ["two", "one"]


def test_forgetting_a_chip_is_undone_and_redone(ai_client, session):
    _asked(ai_client, session, "alpha")
    forgot = ai_client.delete("/chat/recent", params={"question": "alpha"}).json()
    assert _ask_again(ai_client) == []
    back = ai_client.post("/chat/recent/restore", json={"marker_id": forgot["marker_id"]})
    assert back.status_code == 200
    assert _ask_again(ai_client) == ["alpha"]
    #: Redo is the same forget again.
    ai_client.delete("/chat/recent", params={"question": "alpha"})
    assert _ask_again(ai_client) == []


def test_only_a_forget_marker_can_be_lifted(ai_client, session):
    _asked(ai_client, session, "alpha")
    from memorymap.core.database import AuditLog
    from sqlalchemy import select

    queried = session.scalar(select(AuditLog).where(AuditLog.action == "queried"))
    reply_2 = ai_client.post("/chat/recent/restore", json={"marker_id": queried.id})
    assert reply_2.status_code == 404
