"""The graph's options panel scrolls inside itself and keeps the wheel.

Measured at 1440x900: 676px of list in a 492px panel. The panel is capped
against the card and scrolls (`overflow-y: auto`); a wheel at the end of it
used to chain to the map behind. The DOM is out of the suite's sight, so this
reads the rule: the cap, the scroll and the containment must live together.
"""

from __future__ import annotations

import re
from pathlib import Path

CSS = (Path(__file__).resolve().parent.parent / "frontend" / "css" / "02-chat-graph.css").read_text(
    encoding="utf-8"
)


def _capped_rule() -> str:
    for match in re.finditer(r"\.graph-overlay \.graph-options \{([^}]*)\}", CSS):
        if "max-height" in match.group(1):
            return match.group(1)
    raise AssertionError("the options panel's cap rule is gone")


def test_the_options_panel_is_capped_scrolls_and_contains_the_wheel():
    rule = _capped_rule()
    assert "overflow-y: auto" in rule
    assert "overscroll-behavior: contain" in rule
