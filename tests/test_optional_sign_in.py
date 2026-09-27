"""Optional sign-in: "Ask for a password when the app opens" (INBOX 426 aa).

The owner's ask, from their brother: some people do not care about a login on
their own computer and find it annoying. The decision taken: a switch in
Settings, Account and security, on by default; turning it off needs the
current password; private notes stay encrypted and still ask for it.

What must hold, in order of how bad it is to get wrong:

  1. Only this computer is let in without a password. The address is the one
     uvicorn resolved for the connection (`request.client.host`), never a
     header, and a request that carries a forwarding header, or that names a
     host other than a loopback one (a DNS-rebinding page), is refused too.
  2. The vault never opens without the password. A session started without
     one reads private notes as the placeholder until `/auth/unlock-vault`.
  3. Turning the switch off needs the current password, is throttled like an
     unlock, and is written to the audit log. `PUT /preferences` cannot reach
     it.
  4. The default is on, so nothing changes for anyone who never touches it.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from memorymap.api import routes_auth
from memorymap.core import deps, vault

PASSWORD = "the owner's password"


@pytest.fixture()
def app(client):
    return client.app


@pytest.fixture(autouse=True)
def _clean():
    routes_auth._active_tokens.clear()
    routes_auth._media_tickets.clear()
    routes_auth._clear_unlock_failures()
    vault.close()
    yield
    routes_auth._active_tokens.clear()
    routes_auth._media_tickets.clear()
    routes_auth._clear_unlock_failures()
    vault.close()


def _from(app, address: str, host: str | None = None) -> TestClient:
    """A client whose connection comes from `address`.

    `host` is what the browser put in the Host header; a loopback caller's
    own page is served from a loopback name, so that is the default for one.
    """
    if host is None:
        host = "127.0.0.1" if address in ("127.0.0.1", "::1") else "testserver"
    netloc = f"[{host}]" if ":" in host else host
    return TestClient(app, base_url=f"http://{netloc}:8795", client=(address, 50000))


def _local(app) -> TestClient:
    return _from(app, "127.0.0.1")


def _set_up(app) -> dict:
    token = _local(app).post("/auth/setup", json={"password": PASSWORD}).json()["token"]
    return {"X-Auth-Token": token}


def _turn_off(app, headers: dict) -> None:
    response = _local(app).post(
        "/auth/password-on-open",
        json={"enabled": False, "current_password": PASSWORD},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    assert response.json()["password_on_open"] is False


def _restart() -> None:
    """What a restart leaves: no sessions, no key in memory."""
    routes_auth._active_tokens.clear()
    routes_auth._media_tickets.clear()
    vault.close()


# --- the default --------------------------------------------------------------


def test_the_default_is_to_ask_for_the_password(app):
    headers = _set_up(app)
    local = _local(app)
    assert local.get("/auth/account", headers=headers).json()["password_on_open"] is True
    assert local.get("/auth/status").json()["auto_session"] is False
    _restart()
    refused = local.post("/auth/auto-session")
    assert refused.status_code == 403
    assert "token" not in refused.json()


def test_no_auto_session_before_a_password_exists(app):
    """Setup still creates a password, because the vault needs one."""
    local = _local(app)
    status = local.get("/auth/status").json()
    assert status["setup_required"] is True
    assert status["auto_session"] is False
    assert local.post("/auth/auto-session").status_code == 403


# --- the switch ---------------------------------------------------------------


def test_turning_it_off_needs_the_current_password(app):
    headers = _set_up(app)
    local = _local(app)
    missing = local.post("/auth/password-on-open", json={"enabled": False}, headers=headers)
    assert missing.status_code == 401
    wrong = local.post(
        "/auth/password-on-open",
        json={"enabled": False, "current_password": "not it"},
        headers=headers,
    )
    assert wrong.status_code == 401
    assert local.get("/auth/account", headers=headers).json()["password_on_open"] is True
    _turn_off(app, headers)
    assert local.get("/auth/account", headers=headers).json()["password_on_open"] is False
    assert deps.get_config().get_preference("ask_password_on_open") is False


def test_turning_it_off_is_throttled_like_an_unlock(app):
    """The switch is a password check, so it must not be a free guessing
    oracle beside the throttled unlock."""
    headers = _set_up(app)
    local = _local(app)
    for _ in range(routes_auth._FAILURE_ALLOWANCE + 1):
        local.post(
            "/auth/password-on-open",
            json={"enabled": False, "current_password": "a guess"},
            headers=headers,
        )
    throttled = local.post(
        "/auth/password-on-open",
        json={"enabled": False, "current_password": PASSWORD},
        headers=headers,
    )
    assert throttled.status_code == 429


def test_turning_it_back_on_needs_no_password(app):
    headers = _set_up(app)
    _turn_off(app, headers)
    local = _local(app)
    back = local.post("/auth/password-on-open", json={"enabled": True}, headers=headers)
    assert back.status_code == 200
    assert back.json()["password_on_open"] is True
    _restart()
    assert local.post("/auth/auto-session").status_code == 403


def test_the_switch_needs_a_session(app):
    _set_up(app)
    _restart()
    response = _local(app).post(
        "/auth/password-on-open", json={"enabled": False, "current_password": PASSWORD}
    )
    assert response.status_code == 401


def test_preferences_cannot_turn_it_off(app):
    """The generic preferences route writes only the fields it declares, and
    this one is deliberately not among them: it would be a way round the
    password the switch asks for."""
    headers = _set_up(app)
    local = _local(app)
    local.put("/preferences", json={"ask_password_on_open": False}, headers=headers)
    assert local.get("/auth/account", headers=headers).json()["password_on_open"] is True


def test_the_switch_is_recorded_in_the_audit_log(app):
    headers = _set_up(app)
    local = _local(app)
    _turn_off(app, headers)
    local.post("/auth/password-on-open", json={"enabled": True}, headers=headers)
    rows = local.get("/audit?entity_type=user&limit=50", headers=headers).json()
    details = [row.get("detail") or "" for row in rows]
    assert any("password when the app opens: off" in d for d in details), details
    assert any("password when the app opens: on" in d for d in details), details


# --- the auto-session ---------------------------------------------------------


@pytest.mark.parametrize("address", ["127.0.0.1", "::1"])
def test_a_loopback_caller_gets_a_session_without_a_password(app, address):
    headers = _set_up(app)
    _turn_off(app, headers)
    _restart()
    local = _from(app, address)
    assert local.get("/auth/status").json()["auto_session"] is True
    started = local.post("/auth/auto-session")
    assert started.status_code == 200, started.text
    body = started.json()
    assert body["vault_open"] is False
    token = body["token"]
    assert local.get("/entries", headers={"X-Auth-Token": token}).status_code == 200
    # The media cookie is granted like any unlock, on both paths.
    cookies = started.headers.get_list("set-cookie")
    assert sum(routes_auth.MEDIA_COOKIE in c for c in cookies) == len(routes_auth.MEDIA_COOKIE_PATHS)


def test_a_live_token_is_kept_rather_than_multiplied(app):
    """Every page load asks; one tab must not mint a session per reload."""
    headers = _set_up(app)
    _turn_off(app, headers)
    local = _local(app)
    again = local.post("/auth/auto-session", headers=headers)
    assert again.status_code == 200
    assert again.json()["token"] == headers["X-Auth-Token"]
    assert len(routes_auth._active_tokens) == 1


@pytest.mark.parametrize("address", ["192.168.1.50", "10.0.0.2", "8.8.8.8", "testclient"])
def test_a_caller_from_another_host_still_needs_the_password(app, address):
    headers = _set_up(app)
    _turn_off(app, headers)
    _restart()
    other = _from(app, address)
    assert other.get("/auth/status").json()["auto_session"] is False
    assert other.post("/auth/auto-session").status_code == 403
    assert other.get("/entries").status_code == 401
    assert not routes_auth._active_tokens


@pytest.mark.parametrize(
    "header",
    [
        {"X-Forwarded-For": "127.0.0.1"},
        {"X-Forwarded-For": "203.0.113.9"},
        {"Forwarded": "for=127.0.0.1"},
        {"X-Real-IP": "127.0.0.1"},
        {"X-Forwarded-Host": "127.0.0.1"},
    ],
)
def test_a_forwarded_request_is_refused_even_from_loopback(app, header):
    """A tunnel or reverse proxy on this machine connects from 127.0.0.1 on
    behalf of somebody else. Whatever the header claims, its presence means
    the person asking is not necessarily at this keyboard."""
    headers = _set_up(app)
    _turn_off(app, headers)
    _restart()
    local = _local(app)
    assert local.get("/auth/status", headers=header).json()["auto_session"] is False
    assert local.post("/auth/auto-session", headers=header).status_code == 403


def test_a_non_loopback_host_header_is_refused(app):
    """DNS rebinding: a page on evil.example whose name now resolves to
    127.0.0.1 reaches this server from loopback, same-origin with itself.
    The Host it sends is its own name, never a loopback one."""
    headers = _set_up(app)
    _turn_off(app, headers)
    _restart()
    rebound = _from(app, "127.0.0.1", host="evil.example")
    assert rebound.post("/auth/auto-session").status_code == 403
    for name in ("localhost", "127.0.0.1", "::1"):
        assert _from(app, "127.0.0.1", host=name).post("/auth/auto-session").status_code == 200


def test_the_ordinary_gate_never_lets_a_tokenless_loopback_call_through(app):
    """Sign-in off does not open the API: a session is still a token, and
    only `/auth/auto-session` hands one out."""
    headers = _set_up(app)
    _turn_off(app, headers)
    _restart()
    assert _local(app).get("/entries").status_code == 401


def test_starting_an_auto_session_is_recorded(app):
    headers = _set_up(app)
    _turn_off(app, headers)
    _restart()
    local = _local(app)
    token = local.post("/auth/auto-session").json()["token"]
    rows = local.get("/audit?entity_type=user&limit=50", headers={"X-Auth-Token": token}).json()
    assert any("without a password" in (row.get("detail") or "") for row in rows)


# --- the vault ----------------------------------------------------------------


def _private_note(app, headers: dict, text: str) -> int:
    local = _local(app)
    entry = local.post("/entries", json={"content": text}, headers=headers).json()
    made = local.post(f"/entries/{entry['id']}/privacy", json={"private": True}, headers=headers)
    assert made.status_code == 200, made.text
    return entry["id"]


def test_the_vault_stays_locked_with_an_auto_session(app):
    headers = _set_up(app)
    note = _private_note(app, headers, "the spare key is under the mat")
    _turn_off(app, headers)
    _restart()
    local = _local(app)
    auto = {"X-Auth-Token": local.post("/auth/auto-session").json()["token"]}
    assert vault.is_open() is False
    read = local.get(f"/entries/{note}", headers=auto).json()
    assert "spare key" not in read["content"]
    assert local.get("/auth/account", headers=auto).json()["vault_open"] is False
    # Anything that needs the key is refused rather than half-done.
    toggled = local.post(f"/entries/{note}/privacy", json={"private": False}, headers=auto)
    assert toggled.status_code == 409


def test_unlock_vault_opens_it_with_the_password(app):
    headers = _set_up(app)
    note = _private_note(app, headers, "the spare key is under the mat")
    _turn_off(app, headers)
    _restart()
    local = _local(app)
    auto = {"X-Auth-Token": local.post("/auth/auto-session").json()["token"]}
    wrong = local.post("/auth/unlock-vault", json={"password": "not it"}, headers=auto)
    assert wrong.status_code == 401
    assert vault.is_open() is False
    opened = local.post("/auth/unlock-vault", json={"password": PASSWORD}, headers=auto)
    assert opened.status_code == 200
    assert opened.json()["vault_open"] is True
    # Same session: the token is not replaced.
    assert local.get(f"/entries/{note}", headers=auto).json()["content"].startswith("the spare key")


def test_unlock_vault_is_throttled_like_an_unlock(app):
    headers = _set_up(app)
    _turn_off(app, headers)
    _restart()
    local = _local(app)
    auto = {"X-Auth-Token": local.post("/auth/auto-session").json()["token"]}
    for _ in range(routes_auth._FAILURE_ALLOWANCE + 1):
        local.post("/auth/unlock-vault", json={"password": "a guess"}, headers=auto)
    assert (
        local.post("/auth/unlock-vault", json={"password": PASSWORD}, headers=auto).status_code
        == 429
    )
    # The wrong guesses count against /auth/unlock too: one throttle.
    assert local.post("/auth/unlock", json={"password": PASSWORD}).status_code == 429


def test_unlock_vault_needs_a_session(app):
    _set_up(app)
    _restart()
    assert _local(app).post("/auth/unlock-vault", json={"password": PASSWORD}).status_code == 401


def test_locking_with_sign_in_off_drops_the_vault_and_the_session(app):
    headers = _set_up(app)
    _turn_off(app, headers)
    local = _local(app)
    # A second live session (another tab that unlocked with the password)
    # does not keep the key in memory past a lock when sign-in is off: the
    # next load would start a password-free session beside an open vault.
    local.post("/auth/unlock", json={"password": PASSWORD})
    assert vault.is_open() is True
    assert local.post("/auth/lock", headers=headers).json()["locked"] is True
    assert vault.is_open() is False
    assert local.get("/entries", headers=headers).status_code == 401
    # The next load starts a new session, with the vault still locked.
    fresh = local.post("/auth/auto-session").json()
    assert fresh["token"] != headers["X-Auth-Token"]
    assert fresh["vault_open"] is False


def test_lock_all_with_sign_in_off_still_ends_every_session(app):
    headers = _set_up(app)
    _turn_off(app, headers)
    local = _local(app)
    assert local.post("/auth/lock-all", headers=headers).json()["locked"] is True
    assert not routes_auth._active_tokens
    assert vault.is_open() is False


def test_changing_the_password_with_the_vault_locked_opens_it_first(app):
    """With sign-in off the vault is usually locked; the current password the
    form asks for is exactly what opens it, so the change is not refused."""
    headers = _set_up(app)
    note = _private_note(app, headers, "the spare key is under the mat")
    _turn_off(app, headers)
    _restart()
    local = _local(app)
    auto = {"X-Auth-Token": local.post("/auth/auto-session").json()["token"]}
    changed = local.post(
        "/auth/change-password",
        json={"current_password": PASSWORD, "new_password": "a new one"},
        headers=auto,
    )
    assert changed.status_code == 200, changed.text
    _restart()
    unlocked = local.post("/auth/unlock", json={"password": "a new one"}).json()
    assert unlocked["vault_open"] is True
    read = local.get(f"/entries/{note}", headers={"X-Auth-Token": unlocked["token"]}).json()
    assert read["content"].startswith("the spare key")
