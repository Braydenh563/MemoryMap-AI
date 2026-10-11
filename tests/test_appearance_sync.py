"""Appearance follows the person (WORLD_CLASS_PLAN 25f, decision 2026-10-11).

Every appearance setting the Settings rows list is mirrored to the notebook's
preferences (`ui_state`), so a second browser opening the notebook gets it.
The one exception is `perf`: performance mode is a property of the machine.
The server half is checked against the real routes; the browser half
(`seedUiStateFromServer`, `watchMirroredUiKeys`) is walked as source here and
driven in two browser contexts by `scratchpad/ui-sweeps/appsync.js`.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
AI_TOOLS = (ROOT / "frontend" / "js" / "ai-tools.js").read_text(encoding="utf-8")
ROWS_JS = (ROOT / "frontend" / "js" / "settings-rows.js").read_text(encoding="utf-8")

MACHINE_ONLY = {"perf"}
#: Sizes belong to the device (INBOX 897, tests/test_device_sizes.py).
DEVICE_ONLY = set(re.findall(r'"([^"]+)"', re.search(r"const DEVICE_ONLY_KEYS = \[(.*?)\];", AI_TOOLS, re.S).group(1)))


def _array(source: str, name: str) -> list[str]:
    body = re.search(rf"const {name} = \[(.*?)\n\];", source, re.S) or re.search(
        rf"const {name} = \[(.*?)\];", source, re.S
    )
    assert body, f"{name} not found"
    # Comment lines may name keys in backticks; only quoted entries count.
    text = "\n".join(line for line in body.group(1).splitlines() if not line.strip().startswith("//"))
    return re.findall(r'"([^"]+)"', text)


def _mirrored() -> set[str]:
    every = set(_array(AI_TOOLS, "OVERRIDABLE_KEYS")) | {"bgArt"} | set(_array(AI_TOOLS, "MIRRORED_UI_EXTRAS"))
    return every - DEVICE_ONLY


def _look_row_keys() -> list[str]:
    block = ROWS_JS[ROWS_JS.index("const LOOK_ROWS") : ROWS_JS.index("];", ROWS_JS.index("const LOOK_ROWS"))]
    return re.findall(r'\{\s*key:\s*"([^"]+)"', block)


def test_every_look_row_is_mirrored_except_the_machines():
    rows = _look_row_keys()
    assert len(rows) >= 29
    mirrored = _mirrored()
    assert set(rows) - mirrored == MACHINE_ONLY | (set(rows) & DEVICE_ONLY)
    assert not (MACHINE_ONLY | DEVICE_ONLY) & mirrored


@pytest.mark.parametrize("key", [k for k in _look_row_keys() if k not in MACHINE_ONLY | DEVICE_ONLY])
def test_an_appearance_key_round_trips_through_the_server(client, key):
    assert key in _mirrored()
    client.put("/preferences", json={"ui_state": {key: "chosen"}})
    stored = client.get("/preferences").json()["ui_state"]
    assert stored[key] == "chosen"
    # The settings file (Export, then Import into another notebook) carries it.
    exported = client.get("/preferences/export").json()
    assert exported["preferences"]["ui_state"][key] == "chosen"
    client.put("/preferences", json={"ui_state": {}})
    imported = client.post("/preferences/import", json=exported)
    assert imported.status_code == 200
    restored = client.get("/preferences").json()["ui_state"]
    assert restored[key] == "chosen"


def test_every_mirrored_key_fits_the_servers_bound(client):
    keys = _mirrored()
    assert len(keys) <= 80
    state = {key: "x" for key in keys}
    saved = client.put("/preferences", json={"ui_state": state})
    assert saved.status_code == 200
    assert max(len(key) for key in keys) <= 40


def test_performance_mode_stays_in_this_browser():
    """`perf` is not mirrored, so it is the one row that keeps the chip, and
    the settings file carries it in `this_browser`."""
    assert "perf" not in _mirrored()
    assert "if (mirroredUiKeys().includes(row.key)) return;" in ROWS_JS
    assert "perf" in _look_row_keys()


def test_the_notebook_wins_unless_this_browser_has_an_unsent_change():
    """Without this a second browser keeps the look it first loaded with and
    never sees a later change from the first."""
    seed = AI_TOOLS[AI_TOOLS.index("function seedUiStateFromServer") : AI_TOOLS.index("function uiStateRememberSynced")]
    assert "ui-synced" in seed
    assert "local == null || !marked || local === synced[key]" in seed
    # A browser that never agreed with the notebook has no unsent change to protect.
    assert 'const marked = prefs.has("ui-synced");' in seed
    assert "uiStateRememberSynced(state)" in AI_TOOLS[AI_TOOLS.index("function saveUiState") : AI_TOOLS.index("function watchMirroredUiKeys")]
    assert "ui-synced" not in _mirrored()
