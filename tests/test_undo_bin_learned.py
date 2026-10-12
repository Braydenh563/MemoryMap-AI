"""What the notebook learned can be put back (INBOX 898)."""

from __future__ import annotations


def _derive(ai_client, fake_ollama, text="The batch size should stay at 32."):
    ai_client.post("/entries", json={"content": text})
    ai_client.post("/night/run", json={"budget": 1000})
    return ai_client.get("/learned?kind=claim").json()["items"][0]


def _kinds(client):
    return [c["kind"] for c in client.get("/learned/corrections").json()]


def test_a_deleted_fact_comes_back_and_the_lesson_goes(ai_client, fake_ollama):
    fact = _derive(ai_client, fake_ollama)
    fact_id = fact['id']
    ai_client.delete(f"/learned/{fact['id']}")
    assert "delete_fact" in _kinds(ai_client)
    assert ai_client.get(f"/learned/{fact['id']}").status_code == 404

    back = ai_client.post(f"/learned/{fact_id}/restore")
    assert back.status_code == 200, back.text
    assert back.json()["text"] == fact["text"]
    assert "delete_fact" not in _kinds(ai_client)
    #: A fact that is not deleted cannot be "restored".
    reply_1 = ai_client.post(f"/learned/{fact_id}/restore")
    assert reply_1.status_code == 404


def test_a_bulk_delete_is_undone_by_a_bulk_restore(ai_client, fake_ollama):
    fact = _derive(ai_client, fake_ollama)
    ai_client.post("/learned/bulk", json={"ids": [fact["id"]], "action": "delete"})
    assert ai_client.get("/learned?kind=claim").json()["items"] == []
    done = ai_client.post("/learned/bulk", json={"ids": [fact["id"]], "action": "restore"}).json()
    assert done["done"] == 1
    assert [r["id"] for r in ai_client.get("/learned?kind=claim").json()["items"]] == [fact["id"]]
    assert "delete_fact" not in _kinds(ai_client)


def test_forgetting_everything_is_undone_whole(ai_client, fake_ollama):
    fact = _derive(ai_client, fake_ollama)
    ai_client.post("/learned/corrections", json={"kind": "dismiss_link", "subject": {"a": 1, "b": 2}})
    forgotten = ai_client.request("DELETE", "/learned", json={"confirm": True}).json()
    assert ai_client.get("/learned").json()["items"] == []
    assert ai_client.get("/learned/corrections").json() == []

    back = ai_client.post("/learned/unforget", json={"token": forgotten["undo_token"]})
    assert back.status_code == 200, back.text
    assert [r["id"] for r in ai_client.get("/learned?kind=claim").json()["items"]] == [fact["id"]]
    assert "dismiss_link" in _kinds(ai_client)
    reply_2 = ai_client.post("/learned/unforget", json={"token": forgotten["undo_token"]})
    assert reply_2.status_code == 404


def test_a_correction_can_be_taken_back_by_its_id_only(ai_client, session):
    made = ai_client.post(
        "/learned/corrections", json={"kind": "dismiss_link", "subject": {"a": 1, "b": 2}}
    ).json()
    reply_3 = ai_client.delete(f"/learned/corrections/{made['id']}")
    assert reply_3.status_code == 200
    assert ai_client.get("/learned/corrections").json() == []
    reply_4 = ai_client.delete(f"/learned/corrections/{made['id']}")
    assert reply_4.status_code == 404
    #: Any other row of the event log is out of reach.
    from tessellate.entry import manager

    row = manager.log_action(session, "queried", "chat", detail="x")
    session.commit()
    reply_5 = ai_client.delete(f"/learned/corrections/{row.id}")
    assert reply_5.status_code == 404
