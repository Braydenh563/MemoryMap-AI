"""Named-route tests for the archive, bin and summary routes (OPEN ledger 1573).

Each calls the path with a plain id variable, which is the shape
`tests/test_routes_named.py` reads; the same behaviour is also covered with
subscripted f-strings elsewhere, which that matcher cannot see.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone


def _soon() -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()


def test_a_document_archives_and_unarchives(client):
    doc_id = client.post("/documents", json={"title": "Draft", "content": "x"}).json()["id"]
    r1 = client.put(f"/documents/{doc_id}/archive")
    assert r1.json()["archived_at"]
    r2 = client.put(f"/documents/{doc_id}/unarchive")
    assert r2.json()["archived_at"] is None


def test_a_document_is_purged_only_from_the_bin_and_restored_before(client):
    doc_id = client.post("/documents", json={"title": "Scrap", "content": "x"}).json()["id"]
    r3 = client.delete(f"/documents/{doc_id}/purge")
    assert r3.status_code == 409
    client.delete(f"/documents/{doc_id}")
    r4 = client.post(f"/documents/{doc_id}/restore")
    assert r4.status_code == 200
    client.delete(f"/documents/{doc_id}")
    r5 = client.delete(f"/documents/{doc_id}/purge")
    assert r5.status_code == 200
    r6 = client.post(f"/documents/{doc_id}/restore")
    assert r6.status_code == 404


def test_a_reminder_restores_and_purges(client):
    rem_id = client.post("/reminders", json={"text": "Water the plants", "due_at": _soon()}).json()["id"]
    client.delete(f"/reminders/{rem_id}")
    r7 = client.post(f"/reminders/{rem_id}/restore")
    assert r7.status_code == 200
    client.delete(f"/reminders/{rem_id}")
    r8 = client.delete(f"/reminders/{rem_id}/purge")
    assert r8.status_code == 200
    r9 = client.post(f"/reminders/{rem_id}/restore")
    assert r9.status_code == 404


def test_a_conversation_pins_and_archives(client):
    made = client.post("/conversations", json={"question": "Hi?", "answer": "Hello."}).json()
    chat_id = made["id"]
    r10 = client.put(f"/conversations/{chat_id}/pin", json={"pinned": True})
    assert r10.json()["pinned"] is True
    r11 = client.put(f"/conversations/{chat_id}/archive")
    assert r11.json()["archived_at"]
    r12 = client.put(f"/conversations/{chat_id}/unarchive")
    assert r12.json()["archived_at"] is None


def test_the_open_questions_summary_answers_on_an_empty_notebook(client):
    response = client.get("/questions/summary")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)
