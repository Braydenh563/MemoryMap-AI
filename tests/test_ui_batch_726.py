"""INBOX 726: four small UI bugs, pinned as text (the DOM is measured in
Chromium by the sweeps; this keeps the fixes from being edited away).

1. The graph's settings panel: the sections' side padding is one value on
   both sides, so the right gap (control to the scrollport's edge) equals the
   left gap (label to the panel's edge) with or without the scrollbar.
2. The companion hides while any full-screen surface is up, keyed on one flag
   on the root element and the companion's own container.
3. The Library's Boards / Maps filter row has its gap below it.
4. Settings: no rule above the autonomous pass's second switch.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "frontend" / "css"
JS = ROOT / "frontend" / "js"


def _css(name: str) -> str:
    return (CSS / name).read_text(encoding="utf-8")


def _rule(text: str, selector: str) -> str:
    """The body of the first rule whose selector list is exactly `selector`."""
    match = re.search(r"(?m)^" + re.escape(selector) + r"\s*\{([^}]*)\}", text)
    assert match, f"no rule for {selector}"
    return match.group(1)


def test_graph_options_sections_pad_both_sides_equally():
    body = _rule(_css("03-dashboard-widgets.css"), ".graph-options .dock-menu-section")
    pads = re.search(r"padding:\s*var\(--space-1\)\s+var\(--space-(\d)\)\s*;", body)
    assert pads, "the section's padding must be one block value and one shared side value"
    assert "scrollbar-gutter" not in _css("02-chat-graph.css").split(".graph-overlay .graph-options {")[-1][:900], (
        "`scrollbar-gutter: stable both-edges` clipped the selects' right borders (INBOX 726)"
    )
