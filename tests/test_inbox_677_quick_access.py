"""The Dashboard's Quick access row at the Compact view (INBOX 677).

The owner, with a screenshot: "the quick access looks wierd and not refined
in the compact view". Five equal bordered boxes stretched across the row,
each one-line tile mostly empty: measured by
`scratchpad/ui-sweeps/quick677.js`, the icon and words filled 33% of a tile on
average at 1920 (25% the emptiest), 45% at 1440, and 44% at 390 where a
one-word tile kept a two-line tile's 240px. Now a Compact tile is as wide as
what it says, on one line, beside its label: 98% at every width, light and
dark, the row still one line (the owner's earlier "same line and not wrap").
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = re.sub(
    r"/\*.*?\*/", "", (ROOT / "frontend" / "css" / "07-whiteboard-misc.css").read_text(encoding="utf-8"), flags=re.S
)
COMPACT = r'#tab-dashboard\[data-density="compact"\]'


def _rules(selector: str) -> list[str]:
    return re.findall(re.escape(selector) + r"\s*\{([^}]*)\}", CSS)


def test_a_compact_tile_is_as_wide_as_its_words():
    bodies = _rules('#tab-dashboard[data-density="compact"] .launch-row-start > *')
    assert bodies, "the compact tile rule"
    # Never an equal share of the row again: that is the stretched box.
    assert not any(re.search(r"flex:\s*1 1 0", body) for body in bodies)
    assert any(re.search(r"flex:\s*0 1 auto", body) for body in bodies)
    # On a phone the row scrolls, so a tile neither grows nor shrinks there.
    assert any(re.search(r"flex:\s*0 0 auto", body) for body in bodies)


def test_the_row_still_never_wraps_at_compact():
    joined = "\n".join(re.findall(COMPACT + r" \.launch-row,\s*" + COMPACT + r" \.launch-row-start\s*\{([^}]*)\}", CSS))
    assert "flex-wrap: nowrap" in joined


def test_a_compact_tile_takes_a_buttons_measure():
    body = "\n".join(_rules('#tab-dashboard[data-density="compact"] .quick-action'))
    assert "padding: var(--space-2) var(--space-4)" in body
    assert "font-size: var(--text-md)" in body
