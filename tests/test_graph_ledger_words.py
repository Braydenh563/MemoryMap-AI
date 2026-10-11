"""Graph rows of the 2026-10-11 ledger that are a word or a wiring line.

943: a deduced link reason says how sure it is in a word, not "73%
confidence". 936: a '?' popover opening shuts any open menu app-wide, since
its click never reaches the page's outside-click close (INBOX 796 fixed the
graph's head only).
"""

import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
JS = ROOT / "frontend" / "js"


def test_no_percent_confidence_is_shown_for_a_deduced_reason():
    for name in ("graph.js", "note-cards.js"):
        text = (JS / name).read_text(encoding="utf-8")
        assert not re.search(r"% confidence", text), name
        assert "deducedStrength(" in text, name


@pytest.mark.skipif(not shutil.which("node"), reason="node not installed")
def test_the_strength_words():
    text = (JS / "note-cards.js").read_text(encoding="utf-8")
    body = text[text.index("function deducedStrength(") :]
    body = body[: body.index("\n}\n") + 3]
    script = body + "console.log([0.9, 0.75, 0.6, 0.5, 0.2].map(deducedStrength).join('|'))"
    out = subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True).stdout.strip()
    assert out == "a strong guess|a strong guess|a fair guess|a fair guess|a loose guess"


def test_a_help_popover_opening_shuts_the_other_menus():
    text = (JS / "menus.js").read_text(encoding="utf-8")
    opener = text[text.index("const open = () => {", text.index("function wireHelpPopover(")) :]
    opener = opener[: opener.index("homeParent = panel.parentElement;")]
    assert 'if (!trigger.closest(".action-menu")) closeActionMenus();' in opener
    assert 'details.dock-menu[open]' in opener and "menu !== home && !menu.contains(trigger)" in opener
