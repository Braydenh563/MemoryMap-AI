"""The notes surface on a phone, as an auditor drove it (2026-10-03).

Each test pins one defect measured in Chromium at 390 with touch:

* A tap on a note opened nothing: the swipe handler settled every lift-off,
  a tap included, and the note page refuses a row that is settling.
* The categories drawer drew a chip cloud: two columns of pills, the long
  name 727px wide in a 320px sheet, 30px rows, each ⋯ 17px above its row;
  choosing a category left the drawer over the list.
* A toast stood over the floating New note button.
* The command palette found nothing for "manage", "categories", "#food" or
  "move".
"""

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"


def _read(name: str) -> str:
    return (FRONTEND / name).read_text(encoding="utf-8")


def _function(source: str, name: str) -> str:
    start = re.search(rf"^(?:async )?function {name}\(", source, re.M)
    assert start, f"{name} not found"
    rest = source[start.end():]
    end = re.search(r"^}", rest, re.M)
    return rest[: end.start()]


def test_a_tap_is_not_settled_as_a_swipe():
    swipe = _function(_read("phone-shell.js"), "initRowSwipe")
    end = swipe[swipe.index("const end = "):]
    # The row only settles once the gesture was decided as a horizontal drag;
    # a tap (never decided) leaves the row alone so its click opens the note.
    assert end.index("if (!decided) return;") < end.index("settle(li);")
    page = _function(_read("phone-shell.js"), "initNotePage")
    assert 'classList.contains("is-settling")' in page


def _phone_block_with(css: str, needle: str) -> str:
    """The `max-width: 599.98px` block of 10-responsive.css holding `needle`."""
    for match in re.finditer(r"@media \(max-width: 599\.98px\) \{", css):
        depth, i = 1, match.end()
        while depth:
            depth += {"{": 1, "}": -1}.get(css[i], 0)
            i += 1
        block = css[match.end():i]
        if needle in block:
            return block
    raise AssertionError(f"no phone block holds {needle}")


def _rule(block: str, selector: str) -> str:
    rest = block[block.index(selector + " {"):]
    return rest[: rest.index("}")]


def test_the_categories_drawer_is_one_column_of_touch_rows():
    css = (FRONTEND / "css" / "10-responsive.css").read_text(encoding="utf-8")
    block = _phone_block_with(css, "#sidebar ul#category-list {")
    lst = _rule(block, "#sidebar ul#category-list")
    assert "flex-direction: column" in lst and "flex-wrap: nowrap" in lst
    assert "min-height: var(--target-min)" in _rule(block, "#sidebar ul#category-list > li")
    # The ⋯ sits in its row: the hover overlay's translate must not outlive
    # its absolute position, a touch must reach it, and it never shrinks.
    kebab = _rule(block, "#category-list li .category-actions")
    for rule in ("position: static", "transform: none", "pointer-events: auto", "flex: 0 0 auto"):
        assert rule in kebab


def test_a_phone_toast_stands_above_the_floating_button():
    css = (FRONTEND / "css" / "10-responsive.css").read_text(encoding="utf-8")
    selector = "body:not(:has(#tab-chat:not(.hidden))):has(.tab-page:not(.hidden) > .dock-fab) #toast-box"
    lifted = _rule(_phone_block_with(css, selector), selector)
    # The fab's own line (its offset above the tab bar) plus its height.
    assert "var(--bottom-tabs-h) + var(--space-5)" in lifted
    assert "var(--target-min)" in lifted
    fab = (FRONTEND / "css" / "07-whiteboard-misc.css").read_text(encoding="utf-8")
    assert "bottom: calc(var(--status-bar-h) + var(--bottom-tabs-h) + var(--space-5)" in fab


def test_the_command_palette_carries_the_notes_rows():
    palette = _read("palette.js")
    rows = _function(palette, "notesPaletteCommands")
    for label in (
        "Manage categories",
        "Go to category: ${name}",
        "Show notes tagged #${tag}",
        "to category`",
    ):
        assert label in rows, label
    # The palette's row shape (`docPaletteCommands`): group, label, run.
    assert rows.count("group: ") == rows.count("run: ") == 4
    # Every run waits for Enter's keypress to finish, or a sheet that focuses
    # its first row takes that keypress as a press on the row.
    assert rows.count("run: paletteLater(") == 4
    assert "showNotesFilter(`tag:${tag}`)" in rows
    assert "chooseNoteCategory(ids," in rows and "openManageCategories()" in rows
    go = _function(palette, "paletteGoToCategory")
    assert '$("category-list")' in go and ".click()" in go
    hand = _function(palette, "paletteNotesInHand")
    for source in ("selectedIds", "notePageOpenId", "editingId", "overlayReturnFocus"):
        assert source in hand
    # Both sheets load on first use, so the palette may call them at boot.
    app = _read("app.js")
    assert '"chooseNoteCategory"' in app and '"openManageCategories"' in app


@pytest.mark.xfail(
    strict=True,
    reason="the one-line hook in settings-panes.js paletteMatches is outside this change's files",
)
def test_the_palette_asks_for_the_notes_rows_with_the_query():
    matches = _function(_read("settings-panes.js"), "paletteMatches")
    assert 'typeof notesPaletteCommands === "function" ? notesPaletteCommands(lowered) : []' in matches


def test_the_drawer_opener_says_what_it_holds_and_closes_on_a_choice():
    shell = _read("phone-shell.js")
    assert '[data-dock-name="notes"]\', label: "Categories" }' in shell
    assert "Categories and tags" not in shell
    close = shell[shell.index('getElementById("category-list")?.addEventListener("click"'):]
    close = close[: close.index("\n});")]
    assert 'classList.remove("sidebar-sheet-open")' in close
    assert 'setAttribute("aria-expanded", "false")' in close
