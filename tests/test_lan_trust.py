"""LAN mode safe on any network (INBOX 867): which network, which devices.

The owner: "what if memory map is open to lan on a public network or wifi??
... Just make sure everything is handled for the user automatically with
possible manual overrides". core/netid.py reads the network locally (no
connection opened); core/lantrust.py decides. Every failure reads as closed.
"""

from __future__ import annotations

from memorymap.core import lantrust, netid

ROUTE = (
    "Iface\tDestination\tGateway \tFlags\tRefCnt\tUse\tMetric\tMask\t\tMTU\tWindow\tIRTT\n"
    "wlan0\t00000000\t0100A8C0\t0003\t0\t0\t600\t00000000\t0\t0\t0\n"
    "eth9\t00000000\t0101A8C0\t0003\t0\t0\t900\t00000000\t0\t0\t0\n"
    "wlan0\t0000A8C0\t00000000\t0001\t0\t0\t600\t00FFFFFF\t0\t0\t0\n"
)
ARP = (
    "IP address       HW type     Flags       HW address            Mask     Device\n"
    "192.168.0.1      0x1         0x2         AA:BB:cc:dd:ee:01     *        wlan0\n"
)
HOME = netid.Network("192.168.0.1", "aa:bb:cc:dd:ee:01", "192.168.0.0/24")
CAFE = netid.Network("192.168.0.1", "11:22:33:44:55:66", "192.168.0.0/24")
PUBLIC = netid.Network("10.0.0.1", "aa:aa:aa:aa:aa:aa", "10.0.0.0/24", category="public", name="Airport")


# --- reading the network -------------------------------------------------------


def test_linux_reads_the_default_route_and_the_routers_hardware_address(tmp_path):
    (tmp_path / "route").write_text(ROUTE)
    (tmp_path / "arp").write_text(ARP)
    found = netid.read_linux(tmp_path)
    assert (found.gateway, found.gateway_mac, found.subnet) == ("192.168.0.1", "aa:bb:cc:dd:ee:01", "192.168.0.0/24")


def test_linux_without_the_routers_hardware_address_is_an_unknown_network(tmp_path):
    (tmp_path / "route").write_text(ROUTE)
    (tmp_path / "arp").write_text(ARP.splitlines()[0] + "\n192.168.0.1 0x1 0x0 00:00:00:00:00:00 * wlan0\n")
    assert netid.read_linux(tmp_path) is None
    assert netid.read_linux(tmp_path / "missing") is None


def test_the_same_router_address_on_another_router_is_another_network():
    assert HOME.key != CAFE.key
    assert HOME.key == netid.Network("192.168.0.1", "aa:bb:cc:dd:ee:01", "192.168.0.0/24").key


def test_macos_and_windows_outputs_parse():
    assert netid.parse_route_get("   route to: default\n    gateway: 192.168.1.1\n  interface: en0\n") == (
        "192.168.1.1", "en0",
    )
    assert netid.normal_mac("? (192.168.1.1) at a:b:c:d:e:f on en0 ifscope [ethernet]") == "0a:0b:0c:0d:0e:0f"
    assert netid.normal_mac("  192.168.1.1   aa-bb-cc-dd-ee-ff   dynamic") == "aa:bb:cc:dd:ee:ff"
    found = netid.parse_windows_json(
        '{"gateway":"192.168.0.1","address":"192.168.0.107","prefix":24,"category":"Public",'
        '"name":"Cafe WiFi","mac":"AA-BB-CC-DD-EE-01","virtual":["192.168.56.1"]}'
    )
    assert found.category == "public" and found.name == "Cafe WiFi" and found.subnet == "192.168.0.0/24"
    assert found.virtual == ("192.168.56.1",) and found.address == "192.168.0.107"
    assert netid.parse_windows_json("") is None and netid.parse_windows_json('{"gateway":"x"}') is None
    route = "  0.0.0.0          0.0.0.0      192.168.0.1    192.168.0.107     35\n"
    assert netid.parse_route_print(route) == "192.168.0.1"


def test_a_command_that_fails_reads_as_unknown(monkeypatch):
    monkeypatch.setattr(netid, "_run", lambda argv, timeout=0: "")
    assert netid.read_macos() is None
    assert netid.read_windows() is None


# --- which networks open -------------------------------------------------------


def _state(**over):
    state = {
        "networks": [], "devices": [], "any_network": False, "ask_new_devices": True,
        "untrusted": [], "turned_on": 0.0, "last_used": 0.0, "switched_off": "",
    }
    state.update(over)
    return state


def test_only_an_allowed_network_opens():
    allowed = _state(networks=[{"key": HOME.key}])
    assert lantrust.evaluate(allowed, HOME) == (True, "allowed")
    assert lantrust.evaluate(allowed, CAFE) == (False, "new_network")
    assert lantrust.evaluate(allowed, None) == (False, "unknown_network")


def test_any_network_opens_everywhere_but_a_public_one():
    loose = _state(any_network=True)
    assert lantrust.evaluate(loose, CAFE) == (True, "any_network")
    assert lantrust.evaluate(loose, None) == (True, "any_network")
    assert lantrust.evaluate(loose, PUBLIC) == (False, "public_network")
    assert lantrust.evaluate(_state(networks=[{"key": PUBLIC.key}]), PUBLIC) == (True, "allowed")


def test_a_damaged_file_gives_the_closed_defaults(tmp_path):
    (tmp_path / lantrust.FILE_NAME).write_text('{"any_network": "yes", "ask_new_devices": 0, "networks": 5}')
    state = lantrust.load(tmp_path)
    assert state == _state()
    (tmp_path / lantrust.FILE_NAME).write_text("not json")
    assert lantrust.load(tmp_path) == _state()


def test_turning_on_remembers_this_network_but_never_a_public_one(tmp_path, monkeypatch):
    lantrust.reset_for_tests()
    monkeypatch.setattr(netid, "read", lambda: HOME)
    assert lantrust.remember_current(tmp_path)["open"] is True
    assert lantrust.refresh(tmp_path, CAFE)["reason"] == "new_network"
    assert lantrust.is_open() is False
    monkeypatch.setattr(netid, "read", lambda: PUBLIC)
    assert lantrust.remember_current(tmp_path)["reason"] == "public_network"
    assert lantrust.allow_current(tmp_path)["open"] is True  # asked, and allowed


def test_allow_on_an_unknown_network_lasts_until_the_router_is_read(tmp_path, monkeypatch):
    lantrust.reset_for_tests()
    monkeypatch.setattr(netid, "read", lambda: None)
    assert lantrust.refresh(tmp_path)["reason"] == "unknown_network"
    assert lantrust.allow_current(tmp_path)["reason"] == "allowed_this_run"
    # The router answers: it is remembered as the network that was allowed.
    assert lantrust.refresh(tmp_path, HOME)["reason"] == "allowed"
    assert [n["key"] for n in lantrust.load(tmp_path)["networks"]] == [HOME.key]
    lantrust.reset_for_tests()
    assert lantrust.refresh(tmp_path, None)["open"] is False


def test_the_file_is_private(tmp_path):
    lantrust.save(tmp_path, _state())
    assert (tmp_path / lantrust.FILE_NAME).stat().st_mode & 0o077 == 0


# --- devices ---------------------------------------------------------------------


def test_a_held_device_is_allowed_once_and_remembered_as_a_hash(tmp_path):
    lantrust.reset_for_tests()
    held = lantrust.hold("raw-cookie", "iPhone, Safari", "192.168.0.50")
    assert [p["id"] for p in lantrust.pending()] == [held["id"]]
    assert not lantrust.device_known(tmp_path, "raw-cookie")
    assert lantrust.decide(tmp_path, held["id"], True)
    assert lantrust.wait_decision("raw-cookie", 0.1) == "allowed"
    assert not lantrust.decide(tmp_path, held["id"], True)  # answered already
    assert lantrust.device_known(tmp_path, "raw-cookie")
    assert "raw-cookie" not in (tmp_path / lantrust.FILE_NAME).read_text()
    assert lantrust.forget_device(tmp_path, held["id"])
    assert not lantrust.device_known(tmp_path, "raw-cookie")


def test_a_denied_device_is_not_remembered_and_can_ask_again(tmp_path):
    lantrust.reset_for_tests()
    held = lantrust.hold("other", "A device", "192.168.0.51")
    lantrust.decide(tmp_path, held["id"], False)
    assert lantrust.wait_decision("other", 0.1) == "denied"
    assert not lantrust.device_known(tmp_path, "other")
    lantrust.settle("other")  # the device was told
    lantrust.hold("other", "A device", "192.168.0.51")
    assert len(lantrust.pending()) == 1


def test_a_device_that_keeps_asking_cannot_fill_the_screen():
    lantrust.reset_for_tests()
    for n in range(lantrust.MAX_PENDING + 5):
        lantrust.hold(f"d{n}", "A device", "192.168.0.9")
    assert len(lantrust.pending()) == lantrust.MAX_PENDING


def test_device_names_say_what_is_asking():
    iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"
    assert lantrust.device_name(iphone) == "iPhone, Safari"
    assert lantrust.device_name(None) == "A device"


# --- the routes --------------------------------------------------------------------

import threading  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from memorymap.api import routes_auth  # noqa: E402
from memorymap.core import netbind, vault  # noqa: E402

PASSWORD = "the owner's password"


@pytest.fixture()
def lan_app(client, monkeypatch):
    routes_auth._active_tokens.clear()
    routes_auth._media_tickets.clear()
    routes_auth._clear_unlock_failures()
    routes_auth._device_tokens.clear()
    vault.close()
    lantrust.reset_for_tests()
    monkeypatch.setattr(netid, "read", lambda: HOME)
    monkeypatch.setattr(routes_auth, "DEVICE_WAIT_SECONDS", 0.3)
    here = TestClient(client.app, base_url="http://127.0.0.1:8795", client=("127.0.0.1", 50000))
    token = here.post("/auth/setup", json={"password": PASSWORD}).json()["token"]
    here.headers["X-Auth-Token"] = token
    yield client
    lantrust.reset_for_tests()
    netbind.set_current(netbind.LOOPBACK)
    routes_auth._active_tokens.clear()
    routes_auth._device_tokens.clear()
    vault.close()


def _here(client) -> TestClient:
    token = next(iter(routes_auth._active_tokens))
    return TestClient(
        client.app, base_url="http://127.0.0.1:8795", client=("127.0.0.1", 50000), headers={"X-Auth-Token": token}
    )


def _phone(client) -> TestClient:
    """A phone on the network: https on the LAN port, so its Secure cookie is kept."""
    return TestClient(
        client.app, base_url="https://192.168.0.50:8443", client=("192.168.0.50", 50001),
        headers={"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1"},
    )


def test_a_new_device_waits_and_this_computer_allows_it(lan_app):
    here, phone = _here(lan_app), _phone(lan_app)
    refused = phone.post("/auth/unlock", json={"password": PASSWORD})
    assert refused.status_code == 403 and refused.json()["device_pending"] is True
    assert "allow it first" in refused.json()["detail"]
    cookie = refused.cookies.get(lantrust.DEVICE_COOKIE)
    assert cookie and "secure" in refused.headers["set-cookie"].lower()
    assert "httponly" in refused.headers["set-cookie"].lower()
    assert "samesite=strict" in refused.headers["set-cookie"].lower()
    waiting = here.get("/auth/lan-watch?since=-1").json()["pending"]
    assert [p["name"] for p in waiting] == ["iPhone, Safari"]
    # Only this computer sees who is waiting, and only it can answer.
    assert phone.get("/auth/lan-watch").status_code in (401, 403)
    # The phone asks again and waits; Allow on this computer lets it in.
    result = {}
    asking = threading.Thread(
        target=lambda: result.update(r=phone.post("/auth/unlock", json={"password": PASSWORD}))
    )
    routes_auth.DEVICE_WAIT_SECONDS = 5.0
    asking.start()
    deadline = __import__("time").monotonic() + 3
    while not lantrust.pending() and __import__("time").monotonic() < deadline:
        __import__("time").sleep(0.05)
    assert here.post(f"/auth/lan-devices/{waiting[0]['id']}/allow").status_code == 200
    asking.join(10)
    assert result["r"].status_code == 200 and result["r"].json()["token"]
    # Remembered: the next sign-in goes straight through.
    assert phone.post("/auth/unlock", json={"password": PASSWORD}).status_code == 200
    state = here.get("/auth/lan-access").json()
    assert [d["name"] for d in state["devices"]] == ["iPhone, Safari"]


def test_removing_a_device_signs_it_out_and_it_asks_again(lan_app):
    here, phone = _here(lan_app), _phone(lan_app)
    phone.post("/auth/unlock", json={"password": PASSWORD})
    held = lantrust.pending()[0]
    here.post(f"/auth/lan-devices/{held['id']}/allow")
    token = phone.post("/auth/unlock", json={"password": PASSWORD}).json()["token"]
    assert phone.get("/auth/lan-access", headers={"X-Auth-Token": token}).status_code == 200
    removed = here.delete(f"/auth/lan-devices/{held['id']}")
    assert removed.status_code == 200
    assert phone.get("/auth/lan-access", headers={"X-Auth-Token": token}).status_code == 401
    assert phone.post("/auth/unlock", json={"password": PASSWORD}).status_code == 403


def test_deny_says_so_and_a_wrong_password_never_reaches_the_screen(lan_app):
    here, phone = _here(lan_app), _phone(lan_app)
    assert phone.post("/auth/unlock", json={"password": "a guess"}).status_code == 401
    assert lantrust.pending() == []
    phone.post("/auth/unlock", json={"password": PASSWORD})
    held = lantrust.pending()[0]
    assert phone.post(f"/auth/lan-devices/{held['id']}/deny").status_code in (401, 403)
    assert here.post(f"/auth/lan-devices/{held['id']}/deny").status_code == 200
    refused = phone.post("/auth/unlock", json={"password": PASSWORD})
    assert refused.status_code == 403 and "said no" in refused.json()["detail"]
    # Told once; it may ask again, and waits like any new device.
    again = phone.post("/auth/unlock", json={"password": PASSWORD})
    assert again.status_code == 403 and again.json()["device_pending"] is True


def test_loopback_never_waits(lan_app):
    assert TestClient(lan_app.app, base_url="http://127.0.0.1:8795", client=("127.0.0.1", 50002)).post(
        "/auth/unlock", json={"password": PASSWORD}
    ).status_code == 200


def test_turning_off_asking_needs_the_password_and_on_does_not(lan_app):
    here, phone = _here(lan_app), _phone(lan_app)
    body = {"name": "ask_new_devices", "enabled": False}
    assert here.post("/auth/lan-options", json=body).status_code == 401
    assert here.post("/auth/lan-options", json={**body, "current_password": PASSWORD}).json()["ask_new_devices"] is False
    assert phone.post("/auth/unlock", json={"password": PASSWORD}).status_code == 200
    assert here.post("/auth/lan-options", json={"name": "ask_new_devices", "enabled": True}).status_code == 200
    assert lantrust.load(lantrust_dir(lan_app))["ask_new_devices"] is True


def lantrust_dir(client):
    from memorymap.core import deps

    return deps.get_config().data_dir


def test_any_network_and_allow_here_need_the_password(lan_app):
    here = _here(lan_app)
    assert here.post("/auth/lan-options", json={"name": "any_network", "enabled": True}).status_code == 401
    assert here.post("/auth/lan-networks/allow", json={}).status_code == 401
    state = here.post("/auth/lan-networks/allow", json={"current_password": PASSWORD}).json()
    assert [n["key"] for n in state["networks"]] == [HOME.key]
    forgotten = here.delete(f"/auth/lan-networks/{HOME.key}")
    assert forgotten.json()["networks"] == []
    assert here.post(
        "/auth/lan-options", json={"name": "any_network", "enabled": True, "current_password": PASSWORD}
    ).json()["any_network"] is True
    assert here.post("/auth/lan-options", json={"name": "bogus", "enabled": True}).status_code == 422


def test_turning_the_switch_on_remembers_this_network(lan_app):
    here = _here(lan_app)
    state = here.post("/auth/lan-access", json={"enabled": True, "current_password": PASSWORD}).json()
    assert [n["key"] for n in state["networks"]] == [HOME.key]


def test_preferences_cannot_reach_the_trust_file(lan_app):
    here = _here(lan_app)
    here.put("/preferences", json={"any_network": True, "ask_new_devices": False, "networks": [{"key": "x"}]})
    assert lantrust.load(lantrust_dir(lan_app)) == _state()


def test_settings_says_when_the_network_is_held(lan_app):
    """The launcher bound the network but this network is not allowed."""
    here = _here(lan_app)
    netbind.set_current(netbind.ALL_INTERFACES)
    lantrust.refresh(lantrust_dir(lan_app), CAFE)
    state = here.get("/auth/lan-access").json()
    assert state["held"] == "new_network" and state["other_devices"] is False
    watch = here.get("/auth/lan-watch?since=-1").json()
    assert watch["serving"] is True and watch["held"]["reason"] == "new_network"


def test_addresses_put_the_phones_network_first_and_drop_virtual_adapters():
    network = netid.Network("192.168.0.1", "aa:bb:cc:dd:ee:01", "192.168.0.0/24", address="192.168.0.107",
                            virtual=("192.168.56.1",))
    shown = netbind.order_addresses(
        ["192.168.56.1", "2001:8003::3ef2", "192.168.0.107", "10.8.0.2", "2001:8003::87db"], network
    )
    assert shown == ["192.168.0.107", "10.8.0.2", "2001:8003::3ef2", "2001:8003::87db"]
    assert netbind.order_addresses(["172.17.0.2"], netid.Network("a", "b", virtual=("172.17.0.2",), address="172.17.0.2")) == ["172.17.0.2"]


# --- the looser direction is this computer's (secscan-1011) -------------------


def _signed_in_phone(client) -> TestClient:
    from memorymap.core import deps

    lantrust.set_flag(deps.get_config().data_dir, "ask_new_devices", False)
    phone = _phone(client)
    phone.headers["X-Auth-Token"] = phone.post("/auth/unlock", json={"password": PASSWORD}).json()["token"]
    return phone


def test_a_phone_cannot_loosen_the_lan_options(lan_app):
    """A phone with the password used to turn "Allow on any network" on and
    "Ask before a new device signs in" off; the safer direction stays open."""
    from memorymap.api.this_computer import REFUSAL

    phone = _signed_in_phone(lan_app)
    for body in (
        {"name": "any_network", "enabled": True, "current_password": PASSWORD},
        {"name": "ask_new_devices", "enabled": False, "current_password": PASSWORD},
    ):
        refused = phone.post("/auth/lan-options", json=body)
        assert refused.status_code == 403 and refused.json()["detail"] == REFUSAL
    assert lantrust.load(lantrust_dir(lan_app))["any_network"] is False
    assert phone.post("/auth/lan-options", json={"name": "ask_new_devices", "enabled": True}).status_code == 200
    assert phone.post("/auth/lan-options", json={"name": "any_network", "enabled": False}).status_code == 200


def test_a_phone_cannot_allow_the_network_it_is_on(lan_app):
    from memorymap.api.this_computer import REFUSAL

    phone = _signed_in_phone(lan_app)
    refused = phone.post("/auth/lan-networks/allow", json={"current_password": PASSWORD})
    assert refused.status_code == 403 and refused.json()["detail"] == REFUSAL
    assert lantrust.load(lantrust_dir(lan_app))["networks"] == []
    assert _here(lan_app).post("/auth/lan-networks/allow", json={"current_password": PASSWORD}).status_code == 200
