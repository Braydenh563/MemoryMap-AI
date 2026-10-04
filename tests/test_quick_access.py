"""The dashboard's Quick access row (INBOX 461).

The owner, of the Start something row: "make this start something section on
the dashboard customisable like a quick access section?? what is there can be
default". The five tiles are the default; a person adds commands from the
palette's own catalogue, removes, reorders (drag, or Move left and right in the
tile's menu) and resets. Stored per user in preferences, not in the browser.

Three layers, one test group each: the stored list (the API), the choice of
what to draw from it (the dashboard's pure resolver, run in node), and the
ratchets that keep the row drawing from the catalogue rather than from a list
somebody typed into the dashboard.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

from memorymap.api.routes_settings import QUICK_ACCESS_MAX

ROOT = Path(__file__).resolve().parents[1]
DASH = (ROOT / "frontend" / "js" / "dashboard.js").read_text(encoding="utf-8")
EDIT = (ROOT / "frontend" / "js" / "quick-access.js").read_text(encoding="utf-8")
APP = (ROOT / "frontend" / "js" / "app.js").read_text(encoding="utf-8")

DEFAULT_IDS = ["new-note", "ask-ai", "sketch", "remind-me", "meeting-notes"]


# --- the stored list ----------------------------------------------------------


def test_a_fresh_notebook_has_no_stored_list(client):
    assert client.get("/preferences").json()["dashboard_quick_access"] == []


def test_the_list_round_trips_in_order(client):
    ids = ["tab:graph", "new-note", "reveal:doc-new"]
    put = client.put("/preferences", json={"dashboard_quick_access": ids}).json()
    assert put["dashboard_quick_access"] == ids
    assert client.get("/preferences").json()["dashboard_quick_access"] == ids


def test_the_server_cleans_what_it_stores(client):
    """Strings only, trimmed, no repeats, short, and no more than the row holds."""
    dirty = ["a", " a ", "", "   ", "b", "x" * 81] + [f"k{i}" for i in range(20)]
    saved = client.put("/preferences", json={"dashboard_quick_access": dirty}).json()
    ids = saved["dashboard_quick_access"]
    assert ids[:2] == ["a", "b"]
    assert len(ids) == QUICK_ACCESS_MAX
    assert len(set(ids)) == len(ids) and all(ids) and all(len(i) <= 80 for i in ids)


def test_reset_is_an_empty_list_and_survives_a_reload(client):
    client.put("/preferences", json={"dashboard_quick_access": ["tab:graph"]})
    assert client.put("/preferences", json={"dashboard_quick_access": []}).json()["dashboard_quick_access"] == []
    assert client.get("/preferences").json()["dashboard_quick_access"] == []


def test_other_preferences_do_not_touch_it(client):
    client.put("/preferences", json={"dashboard_quick_access": ["tab:graph"]})
    client.put("/preferences", json={"display_name": "Sam"})
    assert client.get("/preferences").json()["dashboard_quick_access"] == ["tab:graph"]


# --- what is drawn from it ----------------------------------------------------


def _block(source: str, start: str, end: str) -> str:
    begin = source.index(start)
    return source[begin : source.index(end, begin) + len(end)]


def _resolve(saved, catalogue_ids):
    node = shutil.which("node")
    if not node:  # pragma: no cover - node is in the sandbox and in CI
        pytest.skip("node is not available")
    script = (
        f"const QUICK_ACCESS_MAX = {QUICK_ACCESS_MAX};\n"
        + _block(DASH, "const QUICK_START = [", "\n];\n")
        + "\n"
        + _block(DASH, "function quickAccessItems(", "\n}\n")
        + "\nconst [saved, ids] = JSON.parse(process.argv[1]);\n"
        "const catalogue = new Map(ids.map((id) => [id, { id, label: id }]));\n"
        "process.stdout.write(JSON.stringify(quickAccessItems(saved, catalogue).map((l) => l.id)));\n"
    )
    out = subprocess.run(
        [node, "-e", script, json.dumps([saved, catalogue_ids])],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    assert out.returncode == 0, out.stderr
    return json.loads(out.stdout)


def test_the_default_is_the_five_tiles_it_replaced():
    assert _resolve([], []) == DEFAULT_IDS
    assert _resolve(None, []) == DEFAULT_IDS


def test_a_saved_list_is_drawn_in_its_order_from_both_sources():
    saved = ["tab:graph", "ask-ai", "reveal:doc-new"]
    assert _resolve(saved, ["tab:graph", "reveal:doc-new"]) == saved


def test_unknown_ids_are_dropped_and_repeats_collapse():
    saved = ["gone:x", "ask-ai", "ask-ai", "tab:graph", "tab:renamed-away"]
    assert _resolve(saved, ["tab:graph"]) == ["ask-ai", "tab:graph"]


def test_a_list_that_resolves_to_nothing_is_the_default():
    assert _resolve(["gone:x", "gone:y"], []) == DEFAULT_IDS
    assert _resolve("not a list", []) == DEFAULT_IDS


def test_the_row_never_draws_more_than_eight():
    many = [f"tab:t{i}" for i in range(12)]
    assert len(_resolve(many, many)) == QUICK_ACCESS_MAX == 8


# --- the ratchets -------------------------------------------------------------


def test_the_default_ids_are_the_only_hard_coded_tiles():
    start = _block(DASH, "const QUICK_START = [", "\n];\n")
    assert re.findall(r'\bid: "([^"]+)"', start) == DEFAULT_IDS
    assert re.findall(r'label: "([^"]+)"', start) == ["New note", "Ask AI", "Sketch", "Remind me", "Meeting notes"]


def test_the_row_draws_from_the_command_catalogue_not_a_list_of_its_own():
    """Added tiles come from `paletteCommands` rows that declare a `tab` or a
    `reveal`, with the line the row already says: no second list of what the
    app can do, and no new closures."""
    catalogue = _block(DASH, "function quickCatalogue()", "\n}\n")
    assert "paletteCommands()" in catalogue and "paletteRowParts(" in catalogue
    assert "row.tab" in catalogue and "row.reveal" in catalogue and "run: row.run" in catalogue
    assert "=>" not in catalogue.replace("run: row.run", "")
    draw = _block(DASH, "function renderQuickLinks()", "\n}\n")
    assert "quickAccessCurrent()" in draw and "QUICK_START" not in draw
    assert "quickCatalogue()" in _block(DASH, "function quickAccessCurrent()", "\n}\n")
    # And the picker reads the same catalogue.
    assert "quickCatalogue()" in EDIT


def test_customise_and_reset_are_rows_of_the_dashboard_customise_menu():
    """INBOX 488: the row's own ⋯ sat under the dock's ⋯, whose menu opened
    over it. Editing and resetting the row are rows of the dock's Customise
    menu now, beside the view, the widgets and the layout."""
    draw = _block(DASH, "function renderQuickLinks()", "\n}\n")
    assert "kebabMenu(" not in draw
    custom = _block(DASH, "function dashCustomiseItems()", "\n}\n")
    assert "Edit quick access" in custom and "Reset quick access" in custom
    assert "saveQuickAccess([])" in custom and "quickEditing = true" in custom


def test_adding_uses_the_rich_picker_and_arranging_has_a_keyboard_route():
    assert "richPickerRow(" in EDIT and 'tag: "button"' in EDIT
    assert "Move left" in EDIT and "Move right" in EDIT and "Remove" in EDIT
    assert "kebabMenu(" in EDIT and "dashDragOverCard(" in EDIT
    # No hand-built menu or option list in the editing view.
    assert 'role="menu"' not in EDIT and 'setAttribute("role", "menu")' not in EDIT


def test_it_is_stored_in_preferences_not_only_the_browser():
    save = _block(DASH, "async function saveQuickAccess(", "\n}\n")
    assert "/preferences" in save and "dashboard_quick_access" in save
    assert "localStorage" not in save and "localStorage" not in EDIT


def test_the_editing_view_is_lazy_and_reachable_before_it_loads():
    assert 'quickAccess: ["/js/quick-access.js"]' in APP
    assert 'quickAccess: ["quickAccessEdit"]' in APP
    page = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    assert "quick-access.js" not in page, "it loads on first use, not at boot"
    assert "QUICK_ACCESS_MAX = 8;" in DASH


def test_the_section_is_named_quick_access():
    page = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    assert 'id="dash-quicklinks" role="group" aria-label="Quick access"' in page
    assert 'heading.textContent = "Quick access"' in DASH
    assert "Start something" not in _block(DASH, "function renderQuickLinks()", "\n}\n")
