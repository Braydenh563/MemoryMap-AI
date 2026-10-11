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
    state = {"networks": [], "devices": [], "any_network": False, "ask_new_devices": True}
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
