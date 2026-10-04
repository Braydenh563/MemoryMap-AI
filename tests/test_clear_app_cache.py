"""Settings, Data, Clear app cache (INBOX 487): the wiring the suite cannot see.

The server half is in tests/test_static_precompressed.py. This holds the
frontend half: one button in Settings, Data, one handler that forgets the
service worker, Cache Storage and the server's copies, and the two things the
Playwright check found (the emblem waits for the page's scripts, and the
existing Reload button clears the same things).
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
SHELL = (ROOT / "frontend" / "js" / "phone-shell.js").read_text(encoding="utf-8")


def _function(name: str) -> str:
    start = SHELL.index(f"async function {name}(")
    return SHELL[start : SHELL.index("\n}\n", start)]


def test_the_button_is_in_settings_data_and_has_one_handler():
    data = INDEX[INDEX.index('id="settings-data"') : INDEX.index('id="settings-account"')]
    assert data.count('id="clear-app-cache"') == 1
    assert INDEX.count('id="clear-app-cache"') == 1
    assert SHELL.count('$("clear-app-cache")') == 1
    assert 'data-help-for="app-cache-help"' in data and 'id="app-cache-help"' in data


def test_clearing_forgets_all_three_and_the_reload_button_shares_it():
    body = _function("clearAppCache")
    assert "getRegistrations" in body and "unregister" in body
    assert "caches.keys" in body or "caches?.keys" in body
    assert 'apiJson("/system/clear-static-cache", { method: "POST" })' in body
    assert "clearAppCache()" in _function("forceReloadApp")


def test_the_click_says_so_then_reloads():
    handler = SHELL[SHELL.index('$("clear-app-cache")') :]
    handler = handler[: handler.index("});")]
    assert "App cache cleared. Reloading." in handler
    assert re.search(r"setTimeout\(\(\) => location\.reload\(\), \d+\)", handler)


def test_the_emblem_does_not_load_p5_before_the_scripts_have_run():
    start = SHELL.index("function ensureP5()")
    body = SHELL[start : SHELL.index("\n}\n", start)]
    assert 'document.readyState === "complete"' in body
    assert '"load"' in body
