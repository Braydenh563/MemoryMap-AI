"""WORLD_CLASS_PLAN item 507: the dock audit's open items, pinned.

Each step adds its own test here so the layout it fixed cannot quietly come
back. The audit is `scratchpad/dock-audit-479.md`.
"""

from __future__ import annotations

import re
from pathlib import Path

INDEX = Path(__file__).resolve().parents[1] / "frontend" / "index.html"
HTML = INDEX.read_text(encoding="utf-8")


def test_library_all_documents_and_bookmarks_docks_carry_a_help_popover():
    # The `data-help-for` recipe (DESIGN.md): button, `.help-body` panel, and
    # the id the dock grammar reads as the help utility (`*-help-toggle`).
    for button_id, panel_id in (
        ("library-help-toggle", "library-help"),
        ("library-docs-help-toggle", "library-docs-help"),
        ("bookmark-help-toggle", "bookmark-help"),
    ):
        button = re.search(rf'<button[^>]*id="{button_id}"[^>]*>', HTML)
        assert button, button_id
        tag = button.group(0)
        assert f'data-help-for="{panel_id}"' in tag
        assert f'aria-controls="{panel_id}"' in tag
        assert 'aria-label="' in tag
        panel = re.search(rf'<div class="help-body hidden" id="{panel_id}"', HTML)
        assert panel, panel_id
