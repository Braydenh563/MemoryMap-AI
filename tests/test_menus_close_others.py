"""The Graph head's menus shut each other (INBOX 796).

The owner, 2026-10-10: "dropdown menus in the graph dont close when another is
opened causing a visual clash and overlay for all 3 of these buttons". The
'?' and the gear stop their click from reaching the page (their own
outside-click close would undo them), which also kept every other menu's
outside-click close from running. Measured on every pair
(scratchpad/ui-sweeps/graphfeel.js, MODE=menus): three pairs stacked open
before (help then gear, ⋯ then help, gear then help), none after; Escape and
an outside click still close each. `graphCloseOtherMenus` lives in graph.js,
the tab's lazy bundle: the boot scripts are at their gzip caps.
"""

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
GRAPH = (ROOT / "frontend" / "js" / "graph.js").read_text(encoding="utf-8")


def _function(text: str, name: str) -> str:
    start = re.search(rf"\nfunction {name}\(", text).start() + 1
    return text[start : text.index("\n}\n", start) + 2]


SCRIPT = _function(GRAPH, "graphCloseOtherMenus") + """
const el = (inside = []) => ({ contains: (x) => inside.includes(x), classList: { contains: () => false } });
const opener = el();
const holder = Object.assign(el([opener]), { open: true });
const other = Object.assign(el(), { open: true });
let actionClosed = 0;
const closeActionMenus = () => { actionClosed += 1; };
const closed = [];
const mine = { trigger: opener, close() { closed.push("mine"); } };
const theirs = { trigger: el(), close() { closed.push("theirs"); } };
const openHelpPopovers = new Set([mine, theirs]);
const document = { querySelectorAll: () => [holder, other] };
let optionsShut = 0;
const gear = el();
const panel = { classList: { contains: () => false } };
const $ = (id) => (id === "graph-options" ? panel : gear);
const setGraphOptionsOpen = (open) => { if (!open) optionsShut += 1; };
graphCloseOtherMenus(opener);
const fromHelp = { actionClosed, closed: [...closed], holder: holder.open, other: other.open, optionsShut };
console.log(JSON.stringify({ fromHelp }));
"""


@pytest.fixture(scope="module")
def result():
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not installed")
    run = subprocess.run([node, "-e", SCRIPT], capture_output=True, text=True, timeout=60)
    assert run.returncode == 0, run.stderr
    return json.loads(run.stdout)["fromHelp"]


def test_the_others_close_and_the_openers_own_stay(result):
    assert result["actionClosed"] == 1
    assert result["closed"] == ["theirs"]
    # The ⋯ menu holding the press stays as it is; its summary toggles it.
    assert result["holder"] is True and result["other"] is False


def test_the_gear_panel_closes_for_another_opener(result):
    assert result["optionsShut"] == 1


def test_the_three_head_openers_are_caught_on_the_way_down():
    assert 'const GRAPH_HEAD_MENUS = "#graph-help-toggle, #graph-options-toggle, #graph-more-menu > summary";' in GRAPH
    assert "const opener = event.target.closest?.(GRAPH_HEAD_MENUS);\n  if (opener) graphCloseOtherMenus(opener);\n}, true);" in GRAPH
