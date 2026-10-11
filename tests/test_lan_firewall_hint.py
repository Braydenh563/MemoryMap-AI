"""The Windows firewall line (OPEN ledger 315 and 316).

Windows answers the first request from a phone and then blocks the next on a
Public profile, and the launchers add no rule. The app cannot add one without
administrator rights, so Settings, Other devices shows the one-line `netsh`
command when the switch is on, for the private profile only. The command is
built here as text; running it on Windows is "needs device".
"""

from __future__ import annotations

from pathlib import Path

from memorymap.core import netbind


def test_the_hint_is_one_netsh_line_for_the_private_profile_only():
    hint = netbind.firewall_hint(8443, platform="win32")
    command = hint["command"]
    assert command.startswith("netsh advfirewall firewall add rule ")
    assert "dir=in" in command and "action=allow" in command
    assert "protocol=TCP" in command and "localport=8443" in command
    assert "profile=private" in command and "profile=any" not in command and "public" not in command
    assert "\n" not in command
    assert hint["rule"] in command
    assert hint["remove"] == f'netsh advfirewall firewall delete rule name="{hint["rule"]}"'


def test_there_is_no_hint_off_windows_or_without_a_port():
    assert netbind.firewall_hint(8443, platform="linux") is None
    assert netbind.firewall_hint(8443, platform="darwin") is None
    assert netbind.firewall_hint(None, platform="win32") is None
    assert netbind.firewall_hint(0, platform="win32") is None


def test_describe_carries_the_hint_only_where_it_applies(app_state, monkeypatch):
    monkeypatch.setattr(netbind.sys, "platform", "linux")
    assert netbind.describe(app_state, 8000)["firewall"] is None
    monkeypatch.setattr(netbind.sys, "platform", "win32")
    off = netbind.describe(app_state, 8000)
    assert off["firewall"] is None  # the switch is off: nothing to open
    app_state.set_preference(netbind.LAN_PREF, True)
    on = netbind.describe(app_state, 8000)
    assert str(netbind.lan_port(8000)) in on["firewall"]["command"]


def test_settings_draws_the_line_with_a_copy_button():
    root = Path(__file__).resolve().parents[1]
    html = (root / "frontend" / "index.html").read_text(encoding="utf-8")
    js = (root / "frontend" / "js" / "settings-controls.js").read_text(encoding="utf-8")
    assert 'id="account-lan-firewall"' in html
    assert "state.firewall" in js and "account-lan-firewall" in js
