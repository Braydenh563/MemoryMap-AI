"""Editing a question and resending cuts the chat short; Undo puts the tail back (INBOX 898)."""

from __future__ import annotations


def _chat(client, turns=3):
    first = client.post("/conversations", json={"question": "q0", "answer": "a0"}).json()
    for i in range(1, turns):
        client.post(f"/conversations/{first['id']}/turns", json={"question": f"q{i}", "answer": f"a{i}"})
    return first["id"]


def _texts(client, chat_id):
    return [m["content"] for m in client.get(f"/conversations/{chat_id}").json()["messages"]]


def test_truncate_hands_back_what_it_cut_and_restore_puts_it_there(client):
    chat_id = _chat(client)
    cut = client.post(f"/conversations/{chat_id}/truncate", json={"from_turn": 1}).json()
    assert [m["content"] for m in cut["removed_messages"]] == ["q1", "a1", "q2", "a2"]
    assert _texts(client, chat_id) == ["q0", "a0"]

    back = client.post(
        f"/conversations/{chat_id}/truncate/restore", json={"from_turn": 1, "messages": cut["removed_messages"]}
    )
    assert back.status_code == 200, back.text
    assert _texts(client, chat_id) == ["q0", "a0", "q1", "a1", "q2", "a2"]


def test_restore_refuses_when_the_chat_moved_on(client):
    chat_id = _chat(client)
    cut = client.post(f"/conversations/{chat_id}/truncate", json={"from_turn": 1}).json()
    client.post(f"/conversations/{chat_id}/turns", json={"question": "new", "answer": "new"})
    refused = client.post(
        f"/conversations/{chat_id}/truncate/restore", json={"from_turn": 1, "messages": cut["removed_messages"]}
    )
    assert refused.status_code == 409


def test_cutting_the_whole_chat_answers_with_the_row_to_restore(client):
    chat_id = _chat(client, turns=2)
    cut = client.post(f"/conversations/{chat_id}/truncate", json={"from_turn": 0}).json()
    assert cut["conversation_deleted"] is True
    back = client.post("/conversations/restore", json=cut["restore"])
    assert back.status_code == 201
    assert _texts(client, chat_id) == ["q0", "a0", "q1", "a1"]
