"""A request that does not validate gets the app's one error shape (audit
2026-10-05, ARCH-12).

Measured before: `POST /entries {"tags": "x"}` answered FastAPI's own
`{"detail": [{type, loc, msg, input}]}`, with no `code`, and `POST
/auth/unlock {"password": ["hunter2-secret"]}` echoed the password back in
`input`. `test_core_message_wording.py` and `test_server_detail_wording.py`
read `HTTPException` literals, so neither could see it.
"""

from __future__ import annotations


def test_a_bad_field_is_a_sentence_a_code_and_the_field(client):
    reply = client.post("/entries", json={"content": "x", "tags": "not-a-list"})
    assert reply.status_code == 422
    body = reply.json()
    assert body["code"] == "invalid"
    assert body["detail"] == "Check the tags and try again."
    assert body["fields"][0]["field"] == "tags"


def test_what_was_sent_is_never_echoed(client):
    reply = client.post("/auth/unlock", json={"password": ["hunter2-secret"]})
    assert reply.status_code == 422
    assert "hunter2-secret" not in reply.text
    assert reply.json()["code"] == "invalid"
