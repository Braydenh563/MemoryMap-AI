"""INBOX 716 (3): a topic's floating bar must not draw over an open board menu.

The owner, with the View menu open over a selected topic: "mindmap node popup
tools go in front of dropdown menus". The cause is two stacking contexts, not
a z-index on the menu: the menu is inside `.wb-topbar` (`z-index: 20`, and its
backdrop filter makes it a context of its own), and the topic's bar
`.wb-map-strip` is a sibling at `z-index: 22`. The menu's own 30 only counts
inside the top bar, so the strip won every overlapping point (measured with
`elementFromPoint`: 68 of 77 points on the View menu).

The suite cannot lay a board out, so this pins the rule that fixes it and the
sweep (`scratchpad/ui-sweeps/mapstripmenu716.js`) measures it.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS = (ROOT / "frontend" / "css" / "07-whiteboard-misc.css").read_text(encoding="utf-8")


def _z(selector: str) -> int:
    match = re.search(re.escape(selector) + r"\s*\{[^}]*?z-index:\s*(\d+)", CSS)
    assert match, f"no z-index rule for {selector}"
    return int(match.group(1))


def test_the_top_bar_with_a_menu_open_stacks_above_every_floating_bar() -> None:
    rule = re.search(
        r"\.wb-topbar:has\(\[data-wb-menu-toggle\]\[aria-expanded=\"true\"\]\)\s*\{([^}]*)\}", CSS
    )
    assert rule, "the top bar must lift itself while one of its menus is open"
    lifted = int(re.search(r"z-index:\s*(\d+)", rule.group(1)).group(1))
    assert lifted > _z(".wb-map-strip")
    assert lifted > _z(".wb-context")


def test_the_bar_is_lifted_only_while_a_menu_is_open() -> None:
    """At rest the top bar stays under the topic's bar, so a topic selected
    beside the top edge keeps its controls reachable."""
    assert _z(".wb-topbar") < _z(".wb-map-strip")
