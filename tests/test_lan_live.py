"""LAN mode from the status bar, live (INBOX 892, 894, 896, 900; secscan-1011).

The owner, 2026-10-11: "the outgoing lan connection should have a hotkey,
and should also be easily accessible", its state "should change if the user
loses wifi or mobile data connection and or moves to an untrusted network",
"view a list of trusted and untrusted networks and be able to manage it",
and "I dont want to invite potential hacking though my open lan connection
to either my phone or my computer". Turning it on or off applies while the
app runs (core/lanlive.py); a phone's connection is on the privacy receipt
(core/egress.py `record_incoming`); a new address gets a certificate that
names it (`Listener._reissue`); 14 days unused switches it off; a phone's
request never installs software on the computer (core/origin.py).
"""

from __future__ import annotations

import http.client
import re
import ssl
import time
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from tessellate.api import routes_auth
from tessellate.api.this_computer import REFUSAL
from tessellate.core import egress, lancert, lanlive, lanserve, lantrust, netbind, netid, origin, vault
from tests.test_lan_mode import _Http, _lan_port, _network_address, _start, _stop

PASSWORD = "the owner's password"
HOME = netid.Network("192.168.0.1", "aa:bb:cc:dd:ee:01", "192.168.0.0/24")
CAFE = netid.Network("192.168.0.1", "11:22:33:44:55:66", "192.168.0.0/24")


def _state(**over):
    state = lantrust.load(Path("/nonexistent-lanbar"))  # the closed defaults
    state.update(over)
    return state


# --- which networks open: untrusted and no network --------------------------------


def test_a_network_marked_untrusted_stays_closed_even_with_any_network():
    blocked = _state(any_network=True, untrusted=[{"key": CAFE.key, "blocked": True}])
    assert lantrust.evaluate(blocked, CAFE) == (False, "untrusted_network")
    assert lantrust.evaluate(blocked, HOME) == (True, "any_network")
    # Only listed, never marked: "Allow on any network" still opens it.
    seen = _state(any_network=True, untrusted=[{"key": CAFE.key, "blocked": False}])
    assert lantrust.evaluate(seen, CAFE) == (True, "any_network")


def test_no_network_at_all_is_its_own_closed_state():
    loose = _state(any_network=True)
    assert lantrust.evaluate(loose, None, online=False) == (False, "no_network")
    assert lantrust.evaluate(loose, None, online=True) == (True, "any_network")


def test_a_network_the_port_stayed_closed_on_is_listed_to_trust_later(tmp_path):
    lantrust.reset_for_tests()
    lantrust.save(tmp_path, _state(networks=[{"key": HOME.key, "label": "home"}]))
    assert lantrust.refresh(tmp_path, CAFE)["reason"] == "new_network"
    assert [n["key"] for n in lantrust.load(tmp_path)["untrusted"]] == [CAFE.key]
    # Trust it from the list, then stop trusting it: marked, and closed.
    assert lantrust.trust_network(tmp_path, CAFE.key)
    assert lantrust.refresh(tmp_path, CAFE)["open"] is True
    assert lantrust.load(tmp_path)["untrusted"] == []
    assert lantrust.untrust_network(tmp_path, CAFE.key)
    assert lantrust.is_open() is False and lantrust.status()["reason"] == "untrusted_network"
    state = lantrust.load(tmp_path)
    assert [n["key"] for n in state["networks"]] == [HOME.key]
    assert [(n["key"], n["blocked"]) for n in state["untrusted"]] == [(CAFE.key, True)]
    # Forget takes it off both lists: new again next time (from home here,
    # since forgetting the network the computer is on lists it again as seen).
    lantrust.refresh(tmp_path, HOME)
    assert lantrust.forget_network(tmp_path, CAFE.key)
    assert lantrust.load(tmp_path)["untrusted"] == []
    assert not lantrust.untrust_network(tmp_path, "nothing-like-it")
    lantrust.reset_for_tests()


def test_turning_the_switch_on_does_not_trust_a_network_marked_untrusted(tmp_path, monkeypatch):
    lantrust.reset_for_tests()
    monkeypatch.setattr(netid, "read", lambda: CAFE)
    lantrust.save(tmp_path, _state(untrusted=[{"key": CAFE.key, "blocked": True}]))
    assert lantrust.remember_current(tmp_path)["reason"] == "untrusted_network"
    assert lantrust.load(tmp_path)["networks"] == []
    lantrust.reset_for_tests()


# --- 14 days unused ------------------------------------------------------------------


class _Config:
    def __init__(self, data_dir, on=True):
        self.data_dir = data_dir
        self.prefs = {netbind.LAN_PREF: on}

    def get_preference(self, key, default=None):
        return self.prefs.get(key, default)

    def set_preference(self, key, value):
        self.prefs[key] = value


def test_lan_mode_switches_itself_off_after_fourteen_days_unused(tmp_path):
    lantrust.reset_for_tests()
    config = _Config(tmp_path)
    # Turned on before the clock was kept: the clock starts now.
    assert lanlive.switch_off_if_unused(config) is False
    started = lantrust.load(tmp_path)["turned_on"]
    assert started > 0
    day = 86400
    assert lanlive.switch_off_if_unused(config, now=started + 13 * day) is False
    # A device connected on day 10: fourteen days count from then.
    lantrust.note_used()
    lantrust._used["at"] = started + 10 * day
    assert lanlive.switch_off_if_unused(config, now=started + 20 * day) is False
    assert lanlive.switch_off_if_unused(config, now=started + 25 * day) is True
    assert config.prefs[netbind.LAN_PREF] is False
    assert lantrust.load(tmp_path)["switched_off"]
    # Off already: nothing more to do, and turning on spends the notice.
    assert lanlive.switch_off_if_unused(config, now=started + 99 * day) is False
    lantrust.mark_turned_on(tmp_path)
    assert lantrust.load(tmp_path)["switched_off"] == ""
    lantrust.reset_for_tests()


# --- the receipt sees a phone connecting (INBOX 894) --------------------------------


def test_an_incoming_connection_is_a_local_network_row_with_the_address_only():
    egress.reset()
    before = egress.totals()["local_network"]
    egress.record_incoming("192.168.0.50")
    egress.record_incoming("192.168.0.50")
    # A phone's own global IPv6 address in this network's /64 is still local.
    egress.record_incoming("2001:db8::50")
    rows = [r for r in egress.destinations() if r["kind"] == "incoming"]
    assert {(r["host"], r["count"], r["scope"], r["port"]) for r in rows} == {
        ("192.168.0.50", 2, "local_network", None),
        ("2001:db8::50", 1, "local_network", None),
    }
    assert all(r["feature"] == "Other devices" and r["purposes"] == [egress.INCOMING_PURPOSE] for r in rows)
    assert egress.totals()["local_network"] == before + 3
    assert egress.verdict(egress.totals()) == "local_network"
    egress.reset()


def test_the_receipt_says_came_in_for_an_incoming_row():
    js = (Path(__file__).resolve().parents[1] / "frontend" / "js" / "settings-data.js").read_text(encoding="utf-8")
    assert 'row.kind === "incoming"' in js and "Came in from" in js


# --- the address set changes: a certificate naming it (INBOX 892) -------------------


def test_a_new_address_gets_a_certificate_that_names_it(tmp_path, monkeypatch):
    first = lancert.ensure(tmp_path, ["192.168.0.5"])
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(str(first.cert_path), str(first.key_path))
    lancert.set_live_context(context)
    try:
        listener = lanlive.Listener(None, None, SimpleNamespace(data_dir=tmp_path), local_port=8000)
        listener.fingerprint = first.fingerprint
        # The computer joined a phone's hotspot: a new address, same authority.
        monkeypatch.setattr(lancert, "default_names", lambda addresses=None: ["172.20.10.2"])
        listener._reissue()
        now = lancert.read(tmp_path)
        assert "172.20.10.2" in now.names and now.fingerprint == listener.fingerprint != first.fingerprint
        assert now.authority_fingerprint == first.authority_fingerprint  # the phone is not asked again
        # The same addresses again: nothing is made.
        listener._reissue()
        assert lancert.read(tmp_path).fingerprint == now.fingerprint
    finally:
        lancert.set_live_context(None)


def test_turning_away_a_network_drops_the_connections_already_open():
    closed = []
    conns = [SimpleNamespace(transport=SimpleNamespace(close=lambda n=n: closed.append(n))) for n in range(3)]
    server = SimpleNamespace(server_state=SimpleNamespace(connections=conns))
    assert lanserve.drop_connections(server) == 3 and sorted(closed) == [0, 1, 2]
    assert lanserve.drop_connections(SimpleNamespace()) == 0


# --- a phone never installs software here (secscan-1011's decision) ---------------


def test_a_phones_request_waits_for_this_computer_before_the_semantic_install(monkeypatch):
    from tessellate.ai import embeddings
    from tessellate.core import extras, jobs

    origin.reset_for_tests()
    monkeypatch.delenv("TESSELLATE_NO_AUTO_INSTALL", raising=False)
    started = []
    monkeypatch.setattr(extras, "start", lambda name, auto=False: (started.append(name), (False, "test"))[1])
    monkeypatch.setattr(jobs, "enqueue", lambda kind, func, *a, **k: func())
    service = object.__new__(embeddings.EmbeddingService)
    service._auto_install_attempted = False
    service._models = SimpleNamespace(_config=SimpleNamespace(get_preference=lambda key, default=None: True))
    missing = ModuleNotFoundError("No module named 'sentence_transformers'")
    with origin.acting_for(True):
        service._maybe_auto_install_missing_package(missing)
    assert started == [] and origin.has_deferred() and service._auto_install_attempted is False
    assert origin.run_deferred(jobs.enqueue) == 1
    assert started == ["semantic"] and not origin.has_deferred()
    origin.reset_for_tests()


def test_a_job_queued_for_a_phone_runs_as_the_phone():
    from tessellate.core import jobs

    with origin.acting_for(True):
        job = jobs._Job(1, "embed", print, (), {}, "x")
    assert job.another_device is True
    assert jobs._Job(2, "embed", print, (), {}, "y").another_device is False


# --- the routes ------------------------------------------------------------------------


@pytest.fixture()
def lan_app(client, monkeypatch):
    routes_auth._active_tokens.clear()
    routes_auth._media_tickets.clear()
    routes_auth._clear_unlock_failures()
    routes_auth._device_tokens.clear()
    routes_auth._network_tokens.clear()
    vault.close()
    lantrust.reset_for_tests()
    origin.reset_for_tests()
    monkeypatch.setattr(netid, "read", lambda: HOME)
    here = _here(client)
    here.headers["X-Auth-Token"] = here.post("/auth/setup", json={"password": PASSWORD}).json()["token"]
    yield client
    lantrust.reset_for_tests()
    origin.reset_for_tests()
    netbind.set_current(netbind.LOOPBACK)
    routes_auth._active_tokens.clear()
    routes_auth._device_tokens.clear()
    routes_auth._network_tokens.clear()
    vault.close()


def _here(client) -> TestClient:
    token = next(iter(routes_auth._active_tokens), None)
    return TestClient(
        client.app, base_url="http://127.0.0.1:8795", client=("127.0.0.1", 50000),
        headers={"X-Auth-Token": token} if token else {},
    )


def _phone(client) -> TestClient:
    from tessellate.core import deps

    lantrust.set_flag(deps.get_config().data_dir, "ask_new_devices", False)
    phone = TestClient(client.app, base_url="https://192.168.0.50:8443", client=("192.168.0.50", 50001))
    phone.headers["X-Auth-Token"] = phone.post("/auth/unlock", json={"password": PASSWORD}).json()["token"]
    return phone


def test_trust_and_untrust_from_the_list_are_this_computers(lan_app):
    from tessellate.core import deps

    data_dir = deps.get_config().data_dir
    lantrust.refresh(data_dir, CAFE)  # seen, closed: listed as untrusted
    here, phone = _here(lan_app), _phone(lan_app)
    state = here.get("/auth/lan-access").json()
    assert [(n["key"], n["blocked"]) for n in state["untrusted"]] == [(CAFE.key, False)]
    assert state["unused_days"] == lantrust.UNUSED_DAYS and state["live"] is False
    for path in (f"/auth/lan-networks/{CAFE.key}/trust", f"/auth/lan-networks/{CAFE.key}/untrust", "/auth/lan-notice/dismiss"):
        refused = phone.post(path, json={"current_password": PASSWORD})
        assert refused.status_code == 403 and refused.json()["detail"] == REFUSAL, path
    assert here.post(f"/auth/lan-networks/{CAFE.key}/trust", json={}).status_code == 401
    state = here.post(f"/auth/lan-networks/{CAFE.key}/trust", json={"current_password": PASSWORD}).json()
    assert [n["key"] for n in state["networks"]] == [CAFE.key] and state["untrusted"] == []
    state = here.post(f"/auth/lan-networks/{CAFE.key}/untrust").json()
    assert state["networks"] == [] and state["untrusted"][0]["blocked"] is True
    assert here.post("/auth/lan-networks/nothing/untrust").status_code == 404
    refused = phone.delete(f"/auth/lan-networks/{CAFE.key}")
    assert refused.status_code == 403 and refused.json()["detail"] == REFUSAL
    removed = here.delete(f"/auth/lan-networks/{CAFE.key}")
    assert removed.status_code == 200


def test_switching_off_signs_every_other_device_out(lan_app):
    here, phone = _here(lan_app), _phone(lan_app)
    assert phone.get("/auth/lan-access").status_code == 200
    state = here.post("/auth/lan-access", json={"enabled": False}).json()
    assert state["allow_lan"] is False
    assert phone.get("/auth/lan-access").status_code == 401
    assert here.get("/auth/lan-access").status_code == 200


def test_the_watch_tells_the_status_bar_the_switch_and_the_notice(lan_app):
    from tessellate.core import deps

    here = _here(lan_app)
    lantrust.mark_switched_off(deps.get_config().data_dir)
    watch = here.get("/auth/lan-watch?since=-1").json()
    assert watch["allow_lan"] is False and watch["switched_off"] and watch["live"] is False
    # Off: the icon's words need no network, no reason and no listener error.
    assert watch["serving"] is False and watch["network"] == "" and watch["reason"] == "" and watch["error"] == ""
    assert here.post("/auth/lan-notice/dismiss").json()["switched_off"] == ""


def test_a_change_from_this_computer_starts_what_waited_and_a_phones_does_not(lan_app, monkeypatch):
    from tessellate.core import jobs

    ran = []
    monkeypatch.setattr(jobs, "enqueue", lambda kind, func, *a, **k: func())
    origin.defer("test", lambda: ran.append(origin.from_another_device()))
    phone = _phone(lan_app)
    phone.post("/auth/lan-options", json={"name": "ask_new_devices", "enabled": True})
    assert ran == [] and origin.has_deferred()
    _here(lan_app).post("/auth/lan-options", json={"name": "ask_new_devices", "enabled": True})
    assert ran == [False] and not origin.has_deferred()


# --- end to end: on and off with no restart (INBOX 900) -----------------------------


@pytest.fixture()
def network_address():
    address = _network_address()
    if address is None:
        pytest.skip("this machine has no network address to reach the app on")
    return address


def _wait_listening(address: str, port: int, cafile, *, up: bool, seconds: float = 10.0) -> bool:
    deadline = time.time() + seconds
    while time.time() < deadline:
        try:
            _Http(address, port, cafile=cafile).call("GET", "/health")
            if up:
                return True
        except OSError:
            if not up:
                return True
        time.sleep(0.2)
    return False


def test_turning_lan_mode_on_and_off_applies_without_a_restart(tmp_path, network_address):
    proc, port, _log = _start(tmp_path, {"web_search_enabled": False})
    try:
        here = _Http("127.0.0.1", port)
        cert = tmp_path / "data" / "lan-tls" / "cert.pem"
        lan_port = _lan_port(port)
        status, body, _ = here.call("POST", "/auth/setup", {"password": PASSWORD})
        owner = {"X-Auth-Token": body["token"]}
        with pytest.raises(OSError):
            _Http(network_address, lan_port).call("GET", "/health")

        # On: the answer already says other devices can open it.
        status, state, _ = here.call("POST", "/auth/lan-access", {"enabled": True, "current_password": PASSWORD}, owner)
        assert status == 200 and state["live"] is True
        if state["held"] == "unknown_network":
            pytest.skip("this machine's network cannot be told apart (no router hardware address)")
        assert state["restart_required"] is False and state["other_devices"] is True, state
        lan = _Http(network_address, lan_port, cafile=cert)
        assert lan.call("GET", "/health")[0] == 200

        # A phone signs in and holds a keep-alive connection open.
        here.call("POST", "/auth/lan-options", {"name": "ask_new_devices", "enabled": False, "current_password": PASSWORD}, owner)
        status, body, _ = lan.call("POST", "/auth/unlock", {"password": PASSWORD})
        phone = {"X-Auth-Token": body["token"]}
        kept = http.client.HTTPSConnection(
            network_address, lan_port, timeout=10, context=ssl.create_default_context(cafile=str(cert))
        )
        kept.request("GET", "/health", headers={"Host": f"{network_address}:{lan_port}"})
        assert kept.getresponse().status == 200

        # The receipt shows the phone connecting, by address only.
        status, receipt, _ = here.call("GET", "/privacy/receipt", headers=owner)
        incoming = [r for r in receipt["destinations"] if r["kind"] == "incoming"]
        assert [r["host"] for r in incoming] == [network_address] and incoming[0]["scope"] == "local_network"

        # Off: the port refuses, the open connection is gone, the phone is out.
        status, state, _ = here.call("POST", "/auth/lan-access", {"enabled": False}, owner)
        assert status == 200 and state["restart_required"] is False and state["other_devices"] is False
        assert _wait_listening(network_address, lan_port, cert, up=False, seconds=3)
        with pytest.raises((OSError, http.client.HTTPException)):
            kept.request("GET", "/health", headers={"Host": f"{network_address}:{lan_port}"})
            kept.getresponse().read()
        kept.close()
        assert here.call("GET", "/auth/lan-access", headers=phone)[0] == 401
        assert here.call("GET", "/health")[0] == 200  # this computer never moved

        # On again, still no restart.
        status, state, _ = here.call("POST", "/auth/lan-access", {"enabled": True, "current_password": PASSWORD}, owner)
        assert state["other_devices"] is True
        assert _wait_listening(network_address, lan_port, cert, up=True, seconds=5)
    finally:
        _stop(proc)


# ---- the status bar's Other devices icon and panel (INBOX 896) ------------

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"


def _js(name: str) -> str:
    return (FRONTEND / "js" / name).read_text(encoding="utf-8")


def test_the_icon_is_a_tools_doorway_hidden_until_this_computer_answers():
    html = (FRONTEND / "index.html").read_text(encoding="utf-8")
    footer = html.split('<footer', 1)[1].split("</footer>", 1)[0]
    tools = footer.split('data-status-zone="tools"', 1)[1].split('data-status-zone="control"', 1)[0]
    button = re.search(r'<button id="status-lan"[^>]*>', tools)
    assert button, "the Other devices icon left the tools zone"
    for attr in ('class="status-item icon-only hidden"', 'data-status-slot="lan"', 'data-this-computer="hide"', 'aria-label="Other devices"'):
        assert attr in button.group(0), attr
    # The panel lives outside the footer: its backdrop-filter would contain it.
    assert 'id="lan-popover"' not in footer and 'id="lan-popover"' in html


def test_the_watch_paints_the_icon_and_keeps_going_while_lan_mode_is_off():
    watch = _js("lan-watch.js")
    once = watch.split("async function lanWatchOnce(", 1)[1].split("\n}\n", 1)[0]
    assert 'error?.status === 403) return "stop"' in once
    assert 'if (!state.serving) return "stop"' not in once
    assert "lanPaintIcon(lanLookFromWatch(state))" in once
    assert "lanNoticeSwitchedOff(state.switched_off)" in once
    # The recipes: the help popover on a desktop, the sheet without a box.
    assert "wireHelpPopover(button, panel)" in watch and "openSheet({" in watch
    assert "stopImmediatePropagation()" in watch and "getBoundingClientRect().width" in watch
    # One switch and one set of network rows, shared with Settings.
    assert "lanSwitch(!state.allow_lan)" in watch and "lanNetworkRows(state, paint)" in watch
    assert 'shortcutTitle(`Other devices. ${look.words}`, "lanPanel")' in watch


def test_the_icon_is_reachable_by_key_palette_slot_and_phone_row():
    wiring = _js("settings-wiring.js")
    assert 'lanPanel: { keys: "Alt+L"' in wiring and "lanPanel: () => openLanPanel()," in wiring
    assert 'chord: "lanPanel", act: () => openLanPanel()' in _js("settings-panes.js")
    assert 'key: "lan",' in _js("settings-controls.js").split("const STATUS_SLOTS", 1)[1].split("];", 1)[0]
    assert '{ id: "status-lan", label: "ph:wifi-high Other devices" }' in _js("phone-shell.js")
    assert "function openLanPanel()" in _js("status.js")


def test_settings_lists_untrusted_networks_with_trust_and_forget():
    html = (FRONTEND / "index.html").read_text(encoding="utf-8")
    assert 'id="account-lan-untrusted"' in html and "Untrusted networks" in html
    controls = _js("settings-controls.js")
    rows = controls.split("function lanNetworkRows(", 1)[1].split("\n}\n", 1)[0]
    for route in ('path(network, "untrust")', "lanTrustNetwork(network, paint)", 'method: "DELETE"'):
        assert route in rows, route
    assert "/trust`" in controls.split("async function lanTrustNetwork(", 1)[1].split("\n}\n", 1)[0]
