"""LAN mode: "Allow other devices on this network" (WORLD_CLASS_PLAN §12, Brief 15).

Brief 15's done-when, run against the real launcher (`python -m memorymap`)
bound to 0.0.0.0 in a subprocess and reached over this machine's own
network address, so the server sees a client that is not loopback exactly
as it would see a phone: media URLs carry no session token and a `?token=`
is refused, wrong guesses from one address do not throttle another, the
import is confined, the web reader refuses this machine and the local
network, and the access log holds no `token=`. Plus what LAN mode adds on
its own: the switch needs the password, a device on the network is never
let in without it, and a Host that names somebody else's domain (DNS
rebinding) is refused.

The first half is in-process and fast; the end-to-end half is skipped on a
machine with no network address at all.
"""

from __future__ import annotations

import http.client
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from memorymap.api import routes_auth
from memorymap.core import netbind, vault

ROOT = Path(__file__).resolve().parent.parent
PASSWORD = "the owner's password"


@pytest.fixture(autouse=True)
def _clean():
    routes_auth._active_tokens.clear()
    routes_auth._media_tickets.clear()
    routes_auth._clear_unlock_failures()
    vault.close()
    netbind.set_current(netbind.LOOPBACK)
    yield
    netbind.set_current(netbind.LOOPBACK)
    routes_auth._active_tokens.clear()
    routes_auth._media_tickets.clear()
    routes_auth._clear_unlock_failures()
    vault.close()


def _local(client) -> TestClient:
    return TestClient(client.app, base_url="http://127.0.0.1:8795", client=("127.0.0.1", 50000))


def _setup(client) -> dict:
    token = _local(client).post("/auth/setup", json={"password": PASSWORD}).json()["token"]
    return {"X-Auth-Token": token}


# --- the switch ----------------------------------------------------------------


def test_it_is_off_by_default_and_binds_loopback(app_state):
    assert netbind.lan_enabled(app_state) is False
    assert netbind.bind_host(app_state, has_password=True) == "127.0.0.1"


def test_only_a_literal_true_turns_it_on(app_state):
    """A hand-edited preferences file must not open the notebook by accident."""
    for value in ("yes", 1, "true", [True]):
        app_state.set_preference(netbind.LAN_PREF, value)
        assert netbind.bind_host(app_state, has_password=True) == "127.0.0.1", value
    app_state.set_preference(netbind.LAN_PREF, True)
    # Every interface: IPv4 and IPv6 on one socket where the machine has
    # both, IPv4 alone where it has no IPv6 (this sandbox).
    assert netbind.bind_host(app_state, has_password=True) == ("::" if netbind.dual_stack() else "0.0.0.0")


# --- IPv6 (WORLD_CLASS_PLAN §12, row 2) -------------------------------------------


def test_without_dual_stack_lan_mode_binds_ipv4(app_state, monkeypatch):
    app_state.set_preference(netbind.LAN_PREF, True)
    monkeypatch.setattr(netbind, "dual_stack", lambda: False)
    assert netbind.bind_host(app_state, has_password=True) == "0.0.0.0"
    monkeypatch.setattr(netbind, "dual_stack", lambda: True)
    assert netbind.bind_host(app_state, has_password=True) == "::"
    assert netbind.is_loopback_bind("::") is False


def test_only_the_dual_stack_host_gets_a_socket_of_its_own():
    assert netbind.listening_socket("127.0.0.1", 0) is None
    assert netbind.listening_socket("0.0.0.0", 0) is None


def test_an_ipv4_client_on_the_dual_stack_socket_is_still_this_computer():
    """On the dual-stack socket IPv4 arrives as `::ffff:a.b.c.d`, and Python
    does not call `::ffff:127.0.0.1` loopback: the guard reads the IPv4 inside."""
    assert netbind.arrived_on_loopback(("::ffff:127.0.0.1", 8000)) is True
    assert netbind.arrived_on_loopback(("::1", 8000)) is True
    assert netbind.arrived_on_loopback(("[::1]", 8000)) is True
    assert netbind.arrived_on_loopback(("::ffff:192.168.1.5", 8000)) is False
    assert netbind.arrived_on_loopback(("2001:db8::5", 8000)) is False
    assert netbind.arrived_on_loopback(("fd12:3456::7", 8000)) is False


def test_ipv6_addresses_are_listed_bracketed_and_never_link_local(monkeypatch, app_state):
    def fake_getaddrinfo(host, port, family=0, *args, **kwargs):
        if family == socket.AF_INET6:
            return [
                (family, 1, 6, "", ("fe80::1%eth0", 0, 0, 2)),
                (family, 1, 6, "", ("::1", 0, 0, 0)),
                (family, 1, 6, "", ("2001:db8::5", 0, 0, 0)),
                (family, 1, 6, "", ("fd12:3456::7", 0, 0, 0)),
                (family, 1, 6, "", ("::ffff:192.168.1.9", 0, 0, 0)),
            ]
        return [(socket.AF_INET, 1, 6, "", ("192.168.1.9", 0))]

    monkeypatch.setattr(netbind.socket, "getaddrinfo", fake_getaddrinfo)
    monkeypatch.setattr(netbind.sys, "platform", "test")
    assert netbind.lan_addresses(include_v6=True) == ["192.168.1.9", "2001:db8::5", "fd12:3456::7"]
    assert netbind.lan_addresses(include_v6=False) == ["192.168.1.9"]
    assert netbind.url_host("2001:db8::5") == "[2001:db8::5]"
    assert netbind.url_host("192.168.1.9") == "192.168.1.9"
    monkeypatch.setattr(netbind, "lan_addresses", lambda include_v6=None: ["192.168.1.9", "2001:db8::5"])
    app_state.set_preference(netbind.LAN_PREF, True)
    netbind.set_current("::")
    assert netbind.describe(app_state, 8000)["addresses"] == [
        "http://192.168.1.9:8000",
        "http://[2001:db8::5]:8000",
    ]


def test_a_bracketed_ipv6_host_header_names_this_computer():
    assert netbind.host_allowed("[::1]:8000")
    assert netbind.host_allowed("[2001:db8::5]:8000")
    assert not netbind.host_allowed("evil.example:8000")


def test_turning_it_on_needs_the_current_password(client, app_state):
    headers = _setup(client)
    local = _local(client)
    missing = local.post("/auth/lan-access", json={"enabled": True}, headers=headers)
    assert missing.status_code == 401
    wrong = local.post(
        "/auth/lan-access", json={"enabled": True, "current_password": "not it"}, headers=headers
    )
    assert wrong.status_code == 401
    assert netbind.lan_enabled(app_state) is False
    right = local.post(
        "/auth/lan-access", json={"enabled": True, "current_password": PASSWORD}, headers=headers
    )
    assert right.status_code == 200, right.text
    body = right.json()
    assert body["allow_lan"] is True
    assert body["restart_required"] is True  # this launch still listens on loopback
    assert netbind.lan_enabled(app_state) is True
    rows = local.get("/audit?entity_type=user&limit=20", headers=headers).json()
    assert any("other devices" in (row.get("detail") or "") for row in rows)


def test_wrong_passwords_for_the_switch_are_throttled_like_an_unlock(client):
    headers = _setup(client)
    local = _local(client)
    for _ in range(routes_auth._FAILURE_ALLOWANCE + 1):
        local.post("/auth/lan-access", json={"enabled": True, "current_password": "a guess"}, headers=headers)
    again = local.post(
        "/auth/lan-access", json={"enabled": True, "current_password": PASSWORD}, headers=headers
    )
    assert again.status_code == 429


def test_turning_it_off_needs_nothing(client, app_state):
    headers = _setup(client)
    app_state.set_preference(netbind.LAN_PREF, True)
    off = _local(client).post("/auth/lan-access", json={"enabled": False}, headers=headers)
    assert off.status_code == 200
    assert netbind.lan_enabled(app_state) is False


def test_put_preferences_cannot_turn_it_on(client, app_state):
    headers = _setup(client)
    _local(client).put("/preferences", json={netbind.LAN_PREF: True}, headers=headers)
    assert netbind.lan_enabled(app_state) is False


def test_the_state_is_readable_for_settings(client, app_state):
    headers = _setup(client)
    body = _local(client).get("/auth/lan-access", headers=headers).json()
    assert body == {**body, "allow_lan": False, "other_devices": False, "restart_required": False}


# --- the rebinding guard ---------------------------------------------------------


def test_host_names_that_are_this_computer():
    assert netbind.host_allowed("127.0.0.1:8000")
    assert netbind.host_allowed("localhost:8000")
    assert netbind.host_allowed("[::1]:8000")
    assert netbind.host_allowed("192.168.1.20:8000")
    assert netbind.host_allowed(f"{socket.gethostname()}:8000")
    assert netbind.host_allowed(None)
    assert not netbind.host_allowed("evil.example:8000")
    assert not netbind.host_allowed("evil.example")


def test_the_guard_runs_only_when_listening_beyond_this_computer(client):
    """On loopback a rebinding page can reach only what the Origin check and
    the lock already cover (and the test client's own Host is a name)."""
    _setup(client)
    assert client.get("/health", headers={"Host": "evil.example"}).status_code == 200
    netbind.set_current("0.0.0.0")
    refused = client.get("/health", headers={"Host": "evil.example"})
    assert refused.status_code == 421
    assert client.get("/health", headers={"Host": "192.168.1.20:8000"}).status_code == 200


def _through_host_check(server: tuple, host: str | None) -> tuple[int | None, bool]:
    """Run one request through HostCheckMiddleware with a made-up ASGI
    scope: the (address, port) the request arrived at, and its Host. Returns
    (the status the middleware answered with, or None; whether the app ran)."""
    import asyncio

    from memorymap.core import security

    ran = []

    async def app(scope, receive, send):
        ran.append(scope["path"])

    headers = [] if host is None else [(b"host", host.encode())]
    scope = {"type": "http", "method": "GET", "path": "/health", "headers": headers, "server": server}
    sent = []

    async def send(message):
        sent.append(message)

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    asyncio.run(security.HostCheckMiddleware(app)(scope, receive, send))
    status = next((m["status"] for m in sent if m["type"] == "http.response.start"), None)
    return status, bool(ran)


def test_the_guard_keys_on_the_address_the_request_arrived_at(monkeypatch):
    """`set_current` is the launcher's word (review, 2026-09-26): a server
    started any other way on 0.0.0.0 (`uvicorn --host 0.0.0.0`, the sweeps'
    serve.sh, a container) never called it, so the guard stayed off while
    the socket was open to the network. The ASGI scope carries the address
    the request arrived at (`server`), which is the fact itself: a request
    that came in on a network address gets the check whatever the launcher
    said, and one that came in on loopback never does. Off loopback a
    request with no Host at all is refused too: HTTP/1.1 requires one, so
    nothing legitimate on the network omits it."""
    from memorymap.core import security

    monkeypatch.setattr(security, "_notebook_has_password", lambda: True)
    netbind.set_current(netbind.LOOPBACK)
    lan = ("192.168.1.9", 8000)
    assert _through_host_check(lan, "evil.example") == (421, False)
    assert _through_host_check(lan, "192.168.1.9:8000") == (None, True)
    assert _through_host_check(lan, "[fe80::1%eth0]:8000") == (None, True)
    assert _through_host_check(lan, "LOCALHOST:8000") == (None, True)
    assert _through_host_check(lan, "evil.example.:8000") == (421, False)
    assert _through_host_check(lan, None) == (421, False)
    assert _through_host_check(("127.0.0.1", 8000), "evil.example") == (None, True)
    assert _through_host_check(("::1", 8000), "evil.example") == (None, True)
    # The test client's own scope names the server rather than numbering it.
    assert _through_host_check(("testserver", 80), "evil.example") == (None, True)


# --- end to end: the real launcher on 0.0.0.0 --------------------------------------


def _network_address() -> str | None:
    for address in netbind.lan_addresses():
        try:
            with socket.create_connection((address, 9), timeout=0.2):
                pass
        except ConnectionRefusedError:
            return address  # reachable and ours: a refusal is the kernel answering
        except OSError:
            continue
        return address
    return None


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _start(tmp_path: Path, preferences: dict) -> tuple[subprocess.Popen, int, Path]:
    data = tmp_path / "data"
    data.mkdir(parents=True, exist_ok=True)
    (data / "preferences.json").write_text(json.dumps(preferences))
    port = _free_port()
    log = tmp_path / "server.log"
    env = {
        **os.environ,
        "PYTHONPATH": str(ROOT / "src"),
        "MEMORYMAP_DATA_DIR": str(data),
        "MEMORYMAP_PORT": str(port),
    }
    proc = subprocess.Popen(  # noqa: S603  # our own launcher, fixed argv
        [sys.executable, "-m", "memorymap"],
        cwd=str(tmp_path),
        env=env,
        stdout=log.open("w"),
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
    )
    deadline = time.time() + 90
    while time.time() < deadline:
        if proc.poll() is not None:
            raise AssertionError(f"the server exited: {log.read_text()[-2000:]}")
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.5):
                break
        except OSError:
            time.sleep(0.3)
    else:
        proc.kill()
        raise AssertionError("the server never listened")
    return proc, port, log


def _stop(proc: subprocess.Popen) -> None:
    proc.terminate()
    try:
        proc.wait(timeout=15)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=5)


class _Http:
    """http.client, never a proxy: the point is which socket the server sees."""

    def __init__(self, address: str, port: int) -> None:
        self.address, self.port = address, port

    def call(self, method: str, path: str, body=None, headers=None, host=None):
        conn = http.client.HTTPConnection(self.address, self.port, timeout=30)
        try:
            sent = {"Host": host or f"{self.address}:{self.port}", **(headers or {})}
            payload = None
            if body is not None:
                payload = json.dumps(body)
                sent["Content-Type"] = "application/json"
            conn.request(method, path, body=payload, headers=sent)
            response = conn.getresponse()
            raw = response.read()
            try:
                data = json.loads(raw) if raw else None
            except ValueError:
                data = None
            return response.status, data, response.getheaders()
        finally:
            conn.close()


@pytest.fixture()
def network_address():
    address = _network_address()
    if address is None:
        pytest.skip("this machine has no network address to reach the app on")
    return address


def test_lan_mode_end_to_end(tmp_path, network_address):
    # SEC-01: with the switch on but no password yet, the launcher listens
    # on this computer only; the password is set here, then it restarts.
    prefs = {netbind.LAN_PREF: True, "web_search_enabled": True}
    proc, port, log = _start(tmp_path, prefs)
    try:
        with pytest.raises(OSError):
            _Http(network_address, port).call("GET", "/auth/status")
        status, _, _ = _Http("127.0.0.1", port).call("POST", "/auth/setup", {"password": PASSWORD})
        assert status == 200
    finally:
        _stop(proc)
    proc, port, log = _start(tmp_path, prefs)
    try:
        lan = _Http(network_address, port)
        here = _Http("127.0.0.1", port)

        # It listens on the network address, and says so on the receipt.
        status, body, _ = lan.call("GET", "/auth/status")
        assert status == 200 and body["setup_required"] is False
        status, body, _ = here.call("POST", "/auth/unlock", {"password": PASSWORD})
        assert status == 200
        owner = {"X-Auth-Token": body["token"]}
        status, receipt, _ = here.call("GET", "/privacy/receipt", headers=owner)
        assert receipt["listening"]["other_devices"] is True
        assert any(network_address in url for url in receipt["listening"]["addresses"])

        # A device on the network is never let in without the password, even
        # with sign-in off for this computer.
        status, _, _ = here.call(
            "POST", "/auth/password-on-open", {"enabled": False, "current_password": PASSWORD}, owner
        )
        assert status == 200
        status, body, _ = lan.call("GET", "/auth/status")
        assert body["auto_session"] is False
        assert lan.call("POST", "/auth/auto-session")[0] == 403
        assert here.call("POST", "/auth/auto-session")[0] == 200
        assert lan.call("GET", "/entries")[0] == 401

        # The media cookie, not the session token, opens pictures; on plain
        # http to a network address it cannot be Secure (the browser would
        # drop it), and it is HttpOnly and SameSite=Strict.
        status, body, headers = lan.call("POST", "/auth/unlock", {"password": PASSWORD})
        assert status == 200
        phone = body["token"]
        cookies = [value for name, value in headers if name.lower() == "set-cookie"]
        assert cookies and all("httponly" in c.lower() and "samesite=strict" in c.lower() for c in cookies)
        assert not any("secure" in c.lower() for c in cookies)
        ticket = cookies[0].split(";", 1)[0]
        assert lan.call("GET", f"/media/nothing.png?token={phone}")[0] == 401
        assert lan.call("GET", "/media/nothing.png", headers={"Cookie": ticket})[0] == 404

        # The import is confined to home and the data folder from anywhere.
        status, _, _ = lan.call(
            "POST", "/import/directory", {"path": "/etc"}, {"X-Auth-Token": phone}
        )
        assert status == 400

        # The web reader refuses this machine and the local network, and the
        # receipt shows nothing was connected to.
        for url in (f"http://127.0.0.1:{port}/", "http://10.0.0.1/"):
            status, body, _ = lan.call(
                "GET", f"/websearch/read?url={url}", headers={"X-Auth-Token": phone}
            )
            assert status == 502, (url, status, body)
        status, receipt, _ = lan.call("GET", "/privacy/receipt", headers={"X-Auth-Token": phone})
        assert receipt["totals"]["local_network"] == 0
        assert not [d for d in receipt["destinations"] if d["host"] == "10.0.0.1"]

        # DNS rebinding: a name that is not this computer is refused.
        assert lan.call("GET", "/health", host=f"evil.example:{port}")[0] == 421
        assert lan.call("GET", "/health")[0] == 200

        # Wrong guesses from the network do not lock out this computer.
        for _ in range(routes_auth._FAILURE_ALLOWANCE + 1):
            lan.call("POST", "/auth/unlock", {"password": "a guess"})
        assert lan.call("POST", "/auth/unlock", {"password": PASSWORD})[0] == 429
        assert here.call("POST", "/auth/unlock", {"password": PASSWORD})[0] == 200
    finally:
        _stop(proc)
    text = log.read_text()
    assert "token=" not in text.replace("token=[redacted]", ""), text[-2000:]
    assert "token=[redacted]" in text  # the ?token= request above was logged, scrubbed
    assert f"{network_address}" in text or "0.0.0.0" in text


def test_without_the_switch_the_network_cannot_connect(tmp_path, network_address):
    proc, port, _log = _start(tmp_path, {})
    try:
        assert _Http("127.0.0.1", port).call("GET", "/health")[0] == 200
        with pytest.raises(OSError):
            _Http(network_address, port).call("GET", "/health")
    finally:
        _stop(proc)


@pytest.mark.skipif(not netbind.dual_stack(), reason="this machine has no dual-stack IPv6 (the sandbox has no IPv6 at all)")
def test_lan_mode_answers_on_ipv6_and_ipv4_from_one_server(tmp_path):
    """The plan's own test: the real launcher with LAN mode on, reached once
    over `[::1]` and once over IPv4, the same server both times."""
    # No password yet means loopback only (SEC-01): set one, then restart.
    proc, port, log = _start(tmp_path, {netbind.LAN_PREF: True})
    try:
        assert _Http("127.0.0.1", port).call("POST", "/auth/setup", {"password": PASSWORD})[0] == 200
    finally:
        _stop(proc)
    proc, port, log = _start(tmp_path, {netbind.LAN_PREF: True})
    try:
        here_v6 = _Http("::1", port)
        here_v4 = _Http("127.0.0.1", port)
        status, body, _ = here_v6.call("GET", "/auth/status", host=f"[::1]:{port}")
        assert status == 200 and body["setup_required"] is False
        status, body, _ = here_v4.call("POST", "/auth/unlock", {"password": PASSWORD})
        assert status == 200
        owner = {"X-Auth-Token": body["token"]}
        # Both arrive on loopback: [::1] is, and 127.0.0.1 arrives as
        # ::ffff:127.0.0.1, which the guard reads as loopback too.
        assert here_v6.call("POST", "/auth/auto-session", host=f"[::1]:{port}")[0] in (200, 403)
        status, receipt, _ = here_v6.call("GET", "/privacy/receipt", headers=owner, host=f"[::1]:{port}")
        assert status == 200
        assert receipt["listening"]["other_devices"] is True
        assert receipt["listening"]["host"] == "::"
    finally:
        _stop(proc)
    assert "token=" not in log.read_text().replace("token=[redacted]", "")


# --- SEC-01: a reset never leaves an open notebook on the network --------------------


def _lan(client) -> TestClient:
    """A request that arrived on a network address, as a phone's would: the
    ASGI scope's `server` is taken from the base URL."""
    return TestClient(client.app, base_url="http://192.168.1.9:8795", client=("192.168.1.50", 50000))


def test_no_password_means_loopback_whatever_the_switch_says(app_state):
    """SEC-01 (audit 2026-10-05): `--reset-password` deletes the user row and
    the next launch bound 0.0.0.0 with nothing to ask for."""
    app_state.set_preference(netbind.LAN_PREF, True)
    assert netbind.bind_host(app_state, has_password=False) == "127.0.0.1"
    assert netbind.bind_host(app_state, has_password=True) != "127.0.0.1"


def test_reset_password_turns_lan_mode_off(app_state, monkeypatch, capsys):
    from memorymap import __main__ as launcher
    from memorymap.core import deps
    from memorymap.core.database import User

    with deps.get_db().session() as session:
        session.add(User(username="owner", password_hash="x"))
        session.commit()
    app_state.set_preference(netbind.LAN_PREF, True)
    monkeypatch.setattr("builtins.input", lambda prompt="": "RESET")
    assert launcher._reset_password() == 0
    assert netbind.lan_enabled(app_state) is False
    assert "other devices" in capsys.readouterr().out.lower()


def test_without_a_password_the_network_gets_nothing(client):
    """Even on a server bound to the network some other way (uvicorn
    --host 0.0.0.0, a container), a request that arrives off loopback before
    a password exists is refused: no notes, no status, no claiming the
    notebook with /auth/setup."""
    lan = _lan(client)
    for method, path, body in (
        ("GET", "/entries?limit=5", None),
        ("GET", "/auth/status", None),
        ("POST", "/auth/setup", {"password": PASSWORD}),
        ("GET", "/health", None),
        ("GET", "/", None),
    ):
        response = lan.request(method, path, json=body)
        assert response.status_code == 403, (path, response.status_code)
    # This computer is still served, and once a password exists the network
    # gets the ordinary lock screen.
    assert _local(client).get("/auth/status").json()["setup_required"] is True
    _setup(client)
    assert lan.get("/auth/status").status_code == 200
    assert lan.get("/entries?limit=5").status_code == 401

