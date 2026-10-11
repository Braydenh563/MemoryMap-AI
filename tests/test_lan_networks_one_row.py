"""One row per network in the trusted lists (the owner, status-bar panel).

"Telstra140043 · 192.168.0.0/24" and "the network with router 192.168.0.1"
were the same network, both trusted at 01:15: on Windows the full reading
(PowerShell: the Wi-Fi name and the subnet) and the fallback (`route print`
and `arp`: the router alone) give the same router two keys, because a key
hashes the subnet when there is one and the router's address when not. A
reading that is only less complete is now the same network (`router`, the
router's hardware address with its address), the lists show one row for it,
and Stop trusting and Forget take every record of it. Trust stays as strict
as before: only records whose router is known to match go with it. The
four routes stay this computer's (the refusals below).
"""

from __future__ import annotations

from pathlib import Path

from memorymap.api.this_computer import REFUSAL
from memorymap.core import lantrust, netid
from tests.test_lan_live import PASSWORD, _here, _phone, lan_app  # noqa: F401  # the fixture

FULL = netid.Network("192.168.0.1", "aa:bb:cc:dd:ee:01", "192.168.0.0/24", category="private", name="Telstra140043")
BARE = netid.Network("192.168.0.1", "aa:bb:cc:dd:ee:01")
OTHER_ROUTER = netid.Network("192.168.0.1", "11:22:33:44:55:66", "192.168.0.0/24")


def _state(**over):
    state = lantrust.load(Path("/nonexistent-phone-lanfix"))
    state.update(over)
    return state


def test_a_less_complete_reading_of_the_same_router_is_the_same_network():
    assert FULL.key != BARE.key and FULL.router == BARE.router
    assert OTHER_ROUTER.router != FULL.router
    trusted = _state(networks=[lantrust._entry(FULL)])
    assert lantrust.evaluate(trusted, BARE) == (True, "allowed")
    # Another router at the same address is still another network.
    assert lantrust.evaluate(trusted, OTHER_ROUTER) == (False, "new_network")
    blocked = _state(any_network=True, untrusted=[{**lantrust._entry(BARE), "blocked": True}])
    assert lantrust.evaluate(blocked, FULL) == (False, "untrusted_network")


def test_trusting_twice_through_both_readings_keeps_one_record(tmp_path):
    lantrust.reset_for_tests()
    state = lantrust.load(tmp_path)
    lantrust._remember(state, BARE)
    lantrust._remember(state, FULL)
    lantrust._remember(state, BARE)
    assert [(n["key"], n["label"], n["subnet"]) for n in state["networks"]] == [
        (FULL.key, "Telstra140043", "192.168.0.0/24")
    ]
    lantrust.reset_for_tests()


def test_old_duplicates_show_as_one_row_named_by_the_wifi_name():
    old = [
        {"key": BARE.key, "label": "the network with router 192.168.0.1", "gateway": "192.168.0.1", "subnet": "", "added": "2026-10-12 01:15"},
        {"key": FULL.key, "label": "Telstra140043", "gateway": "192.168.0.1", "subnet": "192.168.0.0/24", "added": "2026-10-12 01:15"},
    ]
    rows = lantrust.listed(old)
    assert len(rows) == 1
    row = rows[0]
    assert row["label"] == "Telstra140043" and row["subnet"] == "192.168.0.0/24"
    assert sorted(row["keys"]) == sorted([BARE.key, FULL.key]) and row["key"] == FULL.key
    # The key the computer is on now is the row's key, so "(this network)" finds it.
    assert lantrust.listed(old, here=BARE.key)[0]["key"] == BARE.key
    # Two routers with their subnets read are two rows.
    two = [lantrust._entry(FULL), lantrust._entry(OTHER_ROUTER)]
    assert len(lantrust.listed(two)) == 2


def test_stop_trusting_and_forget_take_every_record_of_the_network(tmp_path):
    lantrust.reset_for_tests()
    old = [
        {"key": BARE.key, "label": "the network with router 192.168.0.1", "gateway": "192.168.0.1", "subnet": "", "added": "x"},
        {"key": FULL.key, "label": "Telstra140043", "gateway": "192.168.0.1", "subnet": "192.168.0.0/24", "added": "x"},
    ]
    lantrust.save(tmp_path, _state(networks=old))
    assert lantrust.untrust_network(tmp_path, FULL.key)
    state = lantrust.load(tmp_path)
    assert state["networks"] == []
    assert sorted(n["key"] for n in state["untrusted"]) == sorted([BARE.key, FULL.key])
    assert all(n["blocked"] for n in state["untrusted"])
    assert len(lantrust.listed(state["untrusted"])) == 1
    assert lantrust.forget_network(tmp_path, BARE.key)
    assert lantrust.load(tmp_path)["untrusted"] == []
    lantrust.reset_for_tests()


def test_trust_takes_only_records_known_to_be_the_same_router(tmp_path):
    lantrust.reset_for_tests()
    legacy = {"key": BARE.key, "label": "the network with router 192.168.0.1", "gateway": "192.168.0.1", "subnet": "", "added": "x", "blocked": False}
    full = {**lantrust._entry(FULL), "blocked": False}
    lantrust.save(tmp_path, _state(untrusted=[legacy, full]))
    assert lantrust.trust_network(tmp_path, FULL.key)
    state = lantrust.load(tmp_path)
    # The legacy record has no router to compare: it is not trusted with it.
    assert [n["key"] for n in state["networks"]] == [FULL.key]
    assert [n["key"] for n in state["untrusted"]] == [BARE.key]
    lantrust.reset_for_tests()


def test_the_panel_lists_one_row_and_a_phone_still_cannot_touch_it(lan_app):  # noqa: F811
    from memorymap.core import deps

    data_dir = deps.get_config().data_dir
    here, phone = _here(lan_app), _phone(lan_app)
    old = [
        {"key": BARE.key, "label": "the network with router 192.168.0.1", "gateway": "192.168.0.1", "subnet": "", "added": "2026-10-12 01:15"},
        {"key": FULL.key, "label": "Telstra140043", "gateway": "192.168.0.1", "subnet": "192.168.0.0/24", "added": "2026-10-12 01:15"},
    ]
    lantrust.save(data_dir, {**lantrust.load(data_dir), "networks": old})
    state = here.get("/auth/lan-access").json()
    assert [(n["label"], n["subnet"]) for n in state["networks"]] == [("Telstra140043", "192.168.0.0/24")]
    for method, path in (("post", f"/auth/lan-networks/{FULL.key}/untrust"), ("delete", f"/auth/lan-networks/{FULL.key}"),
                         ("post", f"/auth/lan-networks/{BARE.key}/untrust"), ("delete", f"/auth/lan-networks/{BARE.key}")):
        refused = getattr(phone, method)(path)
        assert refused.status_code == 403 and refused.json()["detail"] == REFUSAL, path
    assert len(lantrust.load(data_dir)["networks"]) == 2
    state = here.post(f"/auth/lan-networks/{FULL.key}/untrust").json()
    assert state["networks"] == [] and len(state["untrusted"]) == 1
    assert here.delete(f"/auth/lan-networks/{FULL.key}").json()["untrusted"] == []
    _ = PASSWORD


def test_the_rows_keep_their_actions_on_screen_and_start_with_a_capital():
    root = Path(__file__).resolve().parents[1]
    js = (root / "frontend/js/settings-controls.js").read_text(encoding="utf-8")
    body = js[js.index("function lanListRow("):js.index("function lanEmptyRow(")]
    assert "lan-network-row" in body
    rows = js[js.index("function lanNetworkRows("):js.index("async function lanTrustNetwork(")]
    assert "toUpperCase()" in rows
    css = (root / "frontend/css/lan-lazy.css").read_text(encoding="utf-8")
    assert ".entry-list li.lan-network-row .entry-actions" in css
