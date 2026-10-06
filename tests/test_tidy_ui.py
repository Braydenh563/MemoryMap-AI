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


CSS = ROOT / "frontend" / "css" / "tidy-lazy.css"


def _rule(css: str, selector: str) -> str:
    """The body of the first rule whose selector list contains `selector`."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    for match in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
        if selector in [s.strip() for s in match.group(1).split(",")]:
            return match.group(2)
    raise AssertionError(f"no rule for {selector}")


def test_the_automatic_switch_is_the_apps_switch_with_no_chip_behind_it():
    """INBOX 718: the row's accent fill (checked) and neutral lift (hover) read
    as a chip. The switch itself stays the shared pill (no size is declared
    here), and the row is bare in all four states."""
    css = CSS.read_text(encoding="utf-8")
    for state in (
        ".tidy-card .setting-check.tidy-auto",
        ".tidy-card .setting-check.tidy-auto:hover",
        ".tidy-card .setting-check.tidy-auto:has(input:checked)",
        ".tidy-card .setting-check.tidy-auto:has(input:checked):hover",
    ):
        assert "background: transparent" in _rule(css, state), state
    assert not re.search(r"\.tidy-auto[^{]*input[^{]*\{[^}]*(width|height)", css)


def test_one_spacing_token_between_the_blocks_of_the_sheet():
    """INBOX 718: "no vertical spacing between elements". The card's gap is the
    only space between blocks (the inbox recipe's margins are zeroed), it is
    at least --space-3, and Recent runs holds its rows with padding."""
    css = CSS.read_text(encoding="utf-8")
    assert "gap: var(--space-5)" in _rule(css, ".sheet-card.tidy-card")
    assert "margin: 0" in _rule(css, ".tidy-card > .inbox-desc")
    history = _rule(css, ".tidy-history")
    assert "padding-inline: var(--space-4)" in history and "border:" in history
    assert "padding-block: var(--space-2)" in _rule(css, ".tidy-history-row")
