"""The WCAG 2.2 AA pass of 2026-10-05 (WORLD_CLASS_PLAN H6, row 25).

axe-core over every tab, sub-tab and Settings section (scratchpad/ui-sweeps/
axe.js) found one rule broken, at 390 only: the Timeline's table rows carry
`aria-expanded` (a row opens to its details, timeline.js), which ARIA allows
on a row of a treegrid and not of a plain table. These pin the fix so the
next sweep does not have to find it again.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_a_table_whose_rows_open_is_a_treegrid():
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    table = re.search(r'<table id="timeline-table"[^>]*>', html).group(0)
    assert 'role="treegrid"' in table and "aria-label=" in table
    js = (ROOT / "frontend" / "js" / "timeline.js").read_text(encoding="utf-8")
    assert 'tr.setAttribute("aria-expanded", "false")' in js
