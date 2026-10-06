"""Tidy's sheet is built from the recipes DESIGN.md names (INBOX 691), and
it is findable from where people look (the owner: "no use having them if the
user doesnt know about them"): the Notes dock, the command palette, Tools and
features, the Guide."""

from __future__ import annotations

import re
from pathlib import Path

from memorymap.ai import help_chat

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "frontend" / "js"


def _read(name: str) -> str:
    return (JS / name).read_text(encoding="utf-8")


def test_the_sheet_is_the_inbox_recipe_with_checkable_rows():
    tidy = _read("tidy.js")
    assert 'name: "tidy"' in tidy and "openSheet({" in tidy
    assert 'select.id = "tidy-review"' in tidy and 'select.className = "inbox-kind"' in tidy
    assert 'label.className = "note-picker-row tidy-row"' in tidy
    assert 'box.className = "visually-hidden note-picker-box"' in tidy
    assert 'setAttribute("data-help-for", "tidy-help")' in tidy
    #: One filled button: every smallButton is ghost but Apply.
    assert len(re.findall(r"smallButton\([^;]*?,\s*false\)", tidy, re.S)) == 1
    assert "pushUndo(" in tidy and "toastAction(" in tidy
    assert "style=" not in tidy


def test_it_is_lazy_and_reached_from_the_dock():
    app = _read("app.js")
    assert 'tidy: ["/css/tidy-lazy.css", "/js/tidy.js"]' in app
    assert 'tidy: ["openTidySheet"]' in app
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    dock = html[html.index('data-dock-name="notes"') : html.index('id="batch-bar"')]
    assert 'id="notes-tidy"' in dock and 'id="notes-tidy-count"' in dock
    assert '$("notes-tidy").addEventListener("click", () => openTidySheet())' in _read("wiring.js")


def test_it_is_in_the_palette_tools_and_features_and_the_guide():
    assert "openTidySheet()" in _read("app-palette.js")
    catalogue = _read("dashboard.js")
    for reveal in ("tidy", "tidy-links", "tidy-duplicates", "tag-manager", "notes-review"):
        assert f'reveal: "{reveal}"' in catalogue
    topics = help_chat._matching_topics("how do I tidy up weak links without the ai")
    assert any(t["id"] == "tidy" for t in topics)
