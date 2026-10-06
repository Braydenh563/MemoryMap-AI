"""The unlock gate's remembered "a password exists" can only ever make it
stricter (routes_auth._password_set, INBOX 472)."""

from __future__ import annotations

from sqlalchemy import delete, event

from memorymap.core import deps
from memorymap.core.database import User


def test_a_new_password_gates_the_very_next_request(client):
    assert client.get("/entries").status_code == 200  # no password yet: open
    assert client.post("/auth/setup", json={"password": "pass1234"}).status_code == 200
    assert client.get("/entries").status_code == 401


def test_repeat_requests_do_not_ask_the_database_again(client):
    token = client.post("/auth/setup", json={"password": "pass1234"}).json()["token"]
    headers = {"X-Auth-Token": token}
    client.get("/categories", headers=headers)
    engine = deps.get_db().engine
    asked = []

    def count(conn, cursor, statement, *rest):
        if "FROM users" in statement:
            asked.append(statement)

    event.listen(engine, "before_cursor_execute", count)
    try:
        for _ in range(5):
            assert client.get("/categories", headers=headers).status_code == 200
    finally:
        event.remove(engine, "before_cursor_execute", count)
    assert asked == []


def test_a_password_removed_underneath_still_asks_for_a_token(client):
    """Fail closed: the cache keeps demanding a token, it never skips one."""
    client.post("/auth/setup", json={"password": "pass1234"})
    assert client.get("/entries").status_code == 401
    session = deps.get_db().session()
    try:
        session.execute(delete(User))
        session.commit()
    finally:
        session.close()
    assert client.get("/entries").status_code == 401
