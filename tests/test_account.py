"""Changing the password, and the state Settings → Account reports.

The risk this file guards is specific: the vault key is wrapped with a key
derived from the password, so a password change that doesn't re-wrap it leaves
a notebook whose password no longer opens its own private notes — silently,
and unrecoverably.
"""

from __future__ import annotations


def _setup(client, password="first-pass"):
    token = client.post("/auth/setup", json={"password": password}).json()["token"]
    return {"X-Auth-Token": token}


def test_account_reports_the_current_state(client):
    headers = _setup(client)
    body = client.get("/auth/account", headers=headers).json()
    assert body["configured"] is True
    assert body["username"] == "owner"
    assert body["active_sessions"] == 1
    # Nothing secret is exposed — no hash, no token.
    assert "password_hash" not in body
    assert "token" not in body


def test_account_needs_an_unlocked_session(client):
    _setup(client)
    assert client.get("/auth/account").status_code == 401


def test_password_change_swaps_the_password(client):
    headers = _setup(client)
    changed = client.post(
        "/auth/change-password",
        json={"current_password": "first-pass", "new_password": "second-pass"},
        headers=headers,
    )
    assert changed.status_code == 200

    client.post("/auth/lock", headers={"X-Auth-Token": changed.json()["token"]})
    assert client.post("/auth/unlock", json={"password": "first-pass"}).status_code == 401
    assert client.post("/auth/unlock", json={"password": "second-pass"}).status_code == 200


def test_password_change_keeps_private_notes_readable(client):
    """The reason the endpoint re-wraps the vault instead of just re-hashing.

    Without the re-wrap this note would still exist, still be flagged private,
    and never decrypt again.
    """
    headers = _setup(client)
    entry = client.post(
        "/entries", json={"content": "a private thought"}, headers=headers
    ).json()
    made = client.post(
        f"/entries/{entry['id']}/privacy", json={"private": True}, headers=headers
    )
    assert made.json()["is_private"] is True

    changed = client.post(
        "/auth/change-password",
        json={"current_password": "first-pass", "new_password": "second-pass"},
        headers=headers,
    )
    assert changed.status_code == 200

    client.post("/auth/lock", headers={"X-Auth-Token": changed.json()["token"]})
    reopened = client.post("/auth/unlock", json={"password": "second-pass"}).json()
    assert reopened["vault_open"] is True
    after = client.get(
        f"/entries/{entry['id']}", headers={"X-Auth-Token": reopened["token"]}
    ).json()
    assert after["content"] == "a private thought"
    assert after["is_private"] is True


def test_password_change_refuses_a_wrong_current_password(client):
    """Holding a valid token proves the session is unlocked. It does not prove
    the person at the keyboard knows the password, and this is the one action
    that can lock someone out of their own notes."""
    headers = _setup(client)
    response = client.post(
        "/auth/change-password",
        json={"current_password": "not-it", "new_password": "second-pass"},
        headers=headers,
    )
    assert response.status_code == 401
    # The old password still works, i.e. nothing was half-applied.
    assert client.post("/auth/unlock", json={"password": "first-pass"}).status_code == 200


def test_password_change_refuses_reusing_the_same_password(client):
    headers = _setup(client)
    response = client.post(
        "/auth/change-password",
        json={"current_password": "first-pass", "new_password": "first-pass"},
        headers=headers,
    )
    assert response.status_code == 400


def test_password_change_ends_other_sessions(client):
    headers = _setup(client)
    other = client.post("/auth/unlock", json={"password": "first-pass"}).json()
    other_headers = {"X-Auth-Token": other["token"]}
    assert client.get("/auth/account", headers=other_headers).status_code == 200

    changed = client.post(
        "/auth/change-password",
        json={"current_password": "first-pass", "new_password": "second-pass"},
        headers=headers,
    )
    assert changed.status_code == 200
    # The session that made the change keeps working, via a fresh token.
    assert client.get(
        "/auth/account", headers={"X-Auth-Token": changed.json()["token"]}
    ).status_code == 200
    # Everything else is signed out.
    assert client.get("/auth/account", headers=other_headers).status_code == 401
    assert client.get("/auth/account", headers=headers).status_code == 401


def test_lock_all_ends_every_session(client):
    headers = _setup(client)
    ended = client.post("/auth/lock-all", headers=headers)
    assert ended.status_code == 200
    assert client.get("/auth/account", headers=headers).status_code == 401


def test_unlock_throttles_a_run_of_wrong_passwords(client, monkeypatch):
    """bcrypt makes each guess slow; this makes *many* guesses slow. The app
    binds localhost, but people put it behind tunnels to reach it from a
    phone — a server log showed a public address arriving through a proxy —
    and a four-character floor is PIN territory without a throttle."""
    from memorymap.api import routes_auth

    monkeypatch.setattr(routes_auth, "_failed_unlocks", [])
    _setup(client)
    for _ in range(routes_auth._FAILURE_ALLOWANCE):
        assert client.post("/auth/unlock", json={"password": "nope"}).status_code == 401

    # Inside the earned wait even the right password is refused — the 429
    # names the wait so the owner knows it is a throttle, not a lockout.
    refused = client.post("/auth/unlock", json={"password": "first-pass"})
    assert refused.status_code == 429
    assert "try again" in refused.json()["detail"]


def test_unlock_forgives_once_the_wait_has_passed(client, monkeypatch):
    from memorymap.api import routes_auth

    monkeypatch.setattr(routes_auth, "_failed_unlocks", [])
    _setup(client)
    for _ in range(routes_auth._FAILURE_ALLOWANCE):
        client.post("/auth/unlock", json={"password": "nope"})

    # Age the failures past the wait they earned; the right password gets in
    # and wipes the slate, so the next wrong guess starts from zero.
    routes_auth._failed_unlocks[:] = [t - 5 for t in routes_auth._failed_unlocks]
    assert client.post("/auth/unlock", json={"password": "first-pass"}).status_code == 200
    assert routes_auth._failed_unlocks == []
