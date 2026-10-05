"""A floor for new passwords, and a warning above it (SEC-17).

The 2026-10-05 audit: the bcrypt hash and the scrypt-wrapped key are both in
the database file, so a stolen copy or backup can be guessed offline, and a
four-character PIN falls in minutes. New passwords (setup, change) now need
eight characters; a weak one above that is allowed with a warning. A password
set before this keeps opening the notebook: the floor is for new ones only.
"""

from __future__ import annotations

import pytest

from memorymap.api import routes_auth
from memorymap.core import deps
from memorymap.core.database import User


@pytest.fixture(autouse=True)
def _clean():
    routes_auth._active_tokens.clear()
    routes_auth._clear_unlock_failures()
    yield
    routes_auth._active_tokens.clear()
    routes_auth._clear_unlock_failures()


def test_setup_refuses_under_eight_characters(client):
    reply = client.post("/auth/setup", json={"password": "4417abc"})
    assert reply.status_code == 400
    assert "8 characters" in reply.json()["detail"]
    assert client.get("/auth/status").json()["setup_required"] is True


def test_eight_characters_is_enough(client):
    assert client.post("/auth/setup", json={"password": "tram-line"}).status_code == 200


@pytest.mark.parametrize("weak", ["password", "12345678", "aaaaaaaa", "qwertyuiop", "abcdefgh"])
def test_a_weak_one_is_allowed_with_a_warning(client, weak):
    reply = client.post("/auth/setup", json={"password": weak})
    assert reply.status_code == 200
    assert reply.json()["warning"]


@pytest.mark.parametrize("strong", ["correct horse battery", "Tram-Line-77", "kettle orbit maple"])
def test_a_reasonable_one_has_no_warning(client, strong):
    reply = client.post("/auth/setup", json={"password": strong})
    assert reply.status_code == 200
    assert reply.json().get("warning") is None


def test_change_password_holds_the_same_floor(client):
    token = client.post("/auth/setup", json={"password": "first-pass"}).json()["token"]
    headers = {"X-Auth-Token": token}
    short = client.post(
        "/auth/change-password", json={"current_password": "first-pass", "new_password": "4417"}, headers=headers
    )
    assert short.status_code == 400
    weak = client.post(
        "/auth/change-password",
        json={"current_password": "first-pass", "new_password": "12345678"},
        headers=headers,
    )
    assert weak.status_code == 200 and weak.json()["warning"]


def test_an_older_short_password_still_opens_the_notebook(client):
    """Set before the floor existed: it must keep working, never lock anyone out."""
    with deps.get_db().session() as s:
        s.add(User(username="owner", password_hash=routes_auth._hash_password("4417")))
        s.commit()
    assert client.post("/auth/unlock", json={"password": "4417"}).status_code == 200
