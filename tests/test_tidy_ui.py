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
    assert 'overview.id = "tidy-overview"' in tidy and 'pane.id = "tidy-review"' in tidy
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
    assert "margin: 0" in _rule(css, ".tidy-card .inbox-desc")
    history = _rule(css, ".tidy-history")
    assert "padding-inline: var(--space-4)" in history and "border:" in history
    assert "padding-block: var(--space-2)" in _rule(css, ".tidy-history-row")


def _apply_table() -> dict[str, list[str]]:
    tidy = _read("tidy.js")
    block = tidy[tidy.index("const TIDY_APPLY = {") : tidy.index("function tidyApplyWords")]
    table: dict[str, list[str]] = {}
    for key, words in re.findall(r'"?([\w-]+)"?: \[([^\]]*)\]', block):
        table[key] = re.findall(r'"([^"]*)"', words)
    return table


def test_every_review_button_says_what_it_changes_in_plain_words():
    """INBOX 718: "what is naming???". Each review's button is a plain verb
    with the thing it acts on, the same words the review's description uses
    (so the sheet never names a button it has not explained), and no review
    still says Name, Unlink or Apply alone."""
    from memorymap.entry import tidy as rules

    table = _apply_table()
    assert set(table) == set(rules.REVIEWS)
    for key, (bare, one, many) in table.items():
        assert bare in rules.REVIEWS[key].about, f"{key}: the description never says '{bare}'"
        assert "{n}" in one and "{n}" in many
        for word in (bare, one, many):
            assert not re.match(r"(Name|Unlink|Apply)\b", word), word
    assert table["link-reasons"][0] == "Add reasons"
    tidy = _read("tidy.js")
    assert "Add reasons to all in the background" in tidy
    assert "Name all in the background" not in tidy and "ph:check Name" not in tidy


def test_the_review_picker_is_an_overview_of_all_nine_not_a_dropdown():
    """INBOX 718: "is it possible to see all issues identified??". Nine rows
    (icon, name, count, one line on what it finds), the empty ones last, a
    row opens its review and a back button returns."""
    from memorymap.entry import tidy as rules

    tidy = _read("tidy.js")
    assert 'select.id = "tidy-review"' not in tidy and 'select.className = "inbox-kind"' not in tidy
    block = tidy[tidy.index("const TIDY_ICONS") : tidy.index("async function openTidySheet")]
    icons = re.findall(r'^\s*"?([\w-]+)"?: "([\w-]+)",$', block, re.M)
    assert {k for k, _ in icons} == set(rules.REVIEWS), "every review has its glyph"
    assert len({v for _, v in icons}) == 9, "and no two share one"
    font = (ROOT / "frontend" / "vendor" / "phosphor" / "style.css").read_text(encoding="utf-8")
    for _, glyph in icons:
        assert f".ph-{glyph}:" in font, glyph
    assert '"Nothing to tidy"' in tidy
    assert "!state.reviews[a].count - !state.reviews[b].count" in tidy, "the empty reviews sort last"
    assert 'smallButton("ph:arrow-left All reviews"' in tidy and 'back.id = "tidy-back"' in tidy
    assert 'button.addEventListener("click", () => tidyShow(review.key))' in tidy
    #: The dock's badge is still the total of every review.
    assert "count.textContent = body.total > 99" in tidy


def test_the_help_popover_is_four_short_lines():
    """INBOX 718: "massive and takes up a lot of room". What each review finds
    and changes is in its own description, not the '?'."""
    tidy = _read("tidy.js")
    start = tidy.index("const TIDY_HELP = [")
    block = tidy[start : tidy.index("];", start)]
    lines = re.findall(r'^\s*"(.*)",$', block, re.M)
    assert 1 <= len(lines) <= 4
    assert all(len(line) <= 50 for line in lines), lines


def test_a_help_popover_is_never_laid_over_its_own_trigger():
    """INBOX 718: "this popup covers the ? button". `placeHelpPopover` used to
    pin a panel too tall for either side to the window's bottom edge, which
    slid it over a trigger in the lower half. It now takes `menuSidePlan`'s
    answer (below, above, else the roomier side capped and scrolling) and the
    cap is cleared when it closes. `scratchpad/ui-sweeps/tidy718.js` measures
    it in a 360px-high window."""
    menus = _read("menus.js")
    place = menus[menus.index("function placeHelpPopover") : menus.index("const openHelpPopovers")]
    assert "menuSidePlan(box.height, anchor, 10, margin)" in place
    assert "innerHeight - margin - box.height" not in place.replace("window.", "")
    assert 'panel.style.maxHeight = ""' in menus


def test_the_badge_does_not_ask_the_server_while_the_app_is_locked():
    """Audit 2026-10-10: `wiring.js` loads this module 4 s after the page, and
    on the lock screen `GET /tidy` went out with no token: a 401 and a console
    error on every launch."""
    badge = _read("tidy.js").split("async function tidyBadge(", 1)[1].split("\n}\n", 1)[0]
    assert badge.index("if (!authToken()) return;") < badge.index('apiJson("/tidy"')
