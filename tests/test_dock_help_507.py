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


def test_reminders_card_has_one_worded_add():
    # The magic field's button is the wand alone, named by title and
    # aria-label; the form's "Add" is the card's one worded Add.
    magic = re.search(r'<button[^>]*id="reminder-magic-add"[^>]*>(.*?)</button>', HTML, re.S)
    assert magic
    tag = re.search(r'<button[^>]*id="reminder-magic-add"[^>]*>', HTML).group(0)
    assert "icon-only" in tag
    assert 'aria-label="Add from this sentence"' in tag
    assert re.sub(r"<[^>]+>", "", magic.group(1)).strip() == ""
    card = HTML[HTML.index('id="reminder-compose"') : HTML.index('id="reminder-presets"')]
    worded = re.findall(r"<button[^>]*>(?:\s*<i[^>]*></i>)?\s*Add\s*</button>", card)
    assert len(worded) == 1
