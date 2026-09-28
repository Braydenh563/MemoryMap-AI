"""The LAN switch offers a Restart action instead of only telling you to
(coordinator ask: "the LAN restart button that ab44 left undone").

`renderLanState` already said "Restart the app to let other devices in."
as a plain `.notice` line with no way to act on it, and the change
handler's own success toasts never mentioned a restart at all, even
though the backend's `restart_required` (netbind.describe) can be true on
*either* direction of the switch. This reuses the existing
`/system/restart` route and its `#about-restart` caller: one
`restartMemoryMap` function, called from both places, so a real restart
mechanism doesn't get reimplemented a second time.
"""

from __future__ import annotations

from tests._app_js import app_js_text


def _function(source: str, name: str) -> str:
    start = source.index(f"function {name}(")
    return source[start : source.index("\n}\n", start)]


def test_restart_memory_map_is_defined_once():
    app = app_js_text()
    assert app.count("async function restartMemoryMap(") == 1
    body = _function(app, "restartMemoryMap")
    assert '"/system/restart"' in body
    assert "confirmDialog(" in body


def test_the_about_button_reuses_it_rather_than_a_second_copy():
    app = app_js_text()
    assert '$("about-restart")?.addEventListener("click", () => restartMemoryMap());' in app
    # The old inline copy of the same "ask, restart, or say why not" logic
    # must actually be gone, not just duplicated alongside the shared one.
    assert app.count('apiJson("/system/restart"') == 1


def test_disabling_lan_offers_restart_when_the_bind_has_not_dropped_yet():
    app = app_js_text()
    handler_start = app.index('$("account-allow-lan")?.addEventListener("change"')
    handler = app[handler_start : handler_start + 2200]
    assert "off.restart_required" in handler
    assert 'toastAction("Restart to close the app to other devices now."' in handler
    assert "restartMemoryMap({ confirm: false })" in handler


def test_enabling_lan_offers_restart_when_one_is_needed():
    app = app_js_text()
    handler_start = app.index('$("account-allow-lan")?.addEventListener("change"')
    handler = app[handler_start : handler_start + 2200]
    assert "reply.restart_required" in handler
    assert 'toastAction("Other devices can open the app after a restart."' in handler


def test_toast_action_is_the_recipe_used_not_a_bespoke_banner():
    """DESIGN.md's recipe index: "a brief confirmation... with one action,
    toastAction(text, label, fn)". No new banner element for this."""
    app = app_js_text()
    handler_start = app.index('$("account-allow-lan")?.addEventListener("change"')
    handler = app[handler_start : handler_start + 2200]
    assert handler.count("toastAction(") == 2
