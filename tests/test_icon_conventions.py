"""Which overflow and menu icon goes where (INBOX 706).

The owner, 2026-10-06: "we have been using majority of meatball icons but I
think meatball, kebab, bento box icons and more etc are better for use in
various situations and uses". The platform conventions, taken:

- `⋯` (`ph-dots-three`, meatball) is an item's overflow in a horizontal row, a
  card or a bar of controls;
- `⋮` (`ph-dots-three-vertical`, kebab) is the overflow at the end of a row in
  a vertical list and in a narrow column (a rail's rows, a settings list);
- `⊞` (`ph-dots-nine`, bento) only switches between apps or spaces;
- `☰` (`ph-list`, hamburger) only opens navigation.

The app has no app switcher and no hamburger (navigation is the tab bar), so
the last two are listed here with an empty allowance: the day one is built it
joins the list on purpose. Rule and rows: DESIGN.md, "Overflow and menu icons".
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONT = ROOT / "frontend"
HTML = (FRONT / "index.html").read_text(encoding="utf-8")
JS = {p.name: p.read_text(encoding="utf-8") for p in sorted((FRONT / "js").glob("*.js"))}
CSS = {p.name: p.read_text(encoding="utf-8") for p in sorted((FRONT / "css").glob("*.css"))}

#: A glyph is one of the two overflow shapes; the circled, outlined and
#: vertical-outlined variants were one-off third styles for the same job.
STRAY_OVERFLOW = ("dots-three-circle", "dots-three-outline", "dots-three-circle-vertical", "dots-three-outline-vertical")

#: Where a kebab is vertical: `kebabMenu(..., { vertical: true })` call sites by
#: file (rows of a vertical list), and the one narrow-column button in the
#: markup. A new vertical one is a decision, so it is a line here.
VERTICAL_KEBABS = {
    "categories-panel.js": 1,  # Manage categories, one row per category
    "documents.js": 1,  # the documents rail's rows
    "link-types.js": 1,  # the relation types list
    "note-cards.js": 1,  # a note's connection rows
    "note-properties.js": 1,  # the note types list
    "notes-list.js": 1,  # the Notes categories rail
    "settings-packages.js": 2,  # a package row, a bundle row
    "sheets-selects.js": 1,  # the Chats rail
    "shell-reminders.js": 1,  # a reminder row
    "tag-manager.js": 1,  # Manage tags, one row per tag
}
VERTICAL_IN_MARKUP = {"wb-lib-more"}  # the board sidebar's narrow head


def _all_sources() -> dict[str, str]:
    return {"index.html": HTML, **JS, **CSS}


def test_no_third_style_of_overflow_glyph() -> None:
    offenders = [
        f"{name}: ph-{glyph}"
        for name, text in _all_sources().items()
        for glyph in STRAY_OVERFLOW
        if re.search(rf"\bph[-:]{glyph}\b", text)
    ]
    assert not offenders, "one overflow glyph is the meatball or the kebab, never a variant:\n  " + "\n  ".join(offenders)


def test_the_bento_grid_and_the_hamburger_are_not_drawn_for_anything_else() -> None:
    offenders = []
    for name, text in _all_sources().items():
        for glyph, meaning in (("dots-nine", "switching apps or spaces"), ("list", "opening navigation")):
            if re.search(rf"\bph[-:]{glyph}(?![-\w])", text):
                offenders.append(f"{name}: ph-{glyph} is for {meaning}, and nothing here switches or navigates with it")
    assert not offenders, "\n".join(offenders)


def test_a_meatball_or_kebab_in_the_markup_opens_a_menu() -> None:
    """The glyph means overflow and nothing else: it sits in a control whose
    name says so (More, Actions, Sort and view). A dashed line and a section
    break both borrowed the meatball once."""
    pattern = re.compile(r'(<(?:button|summary)\b[^>]*>)\s*<i class="ph ph-dots-three(?:-vertical)?\b[^"]*"')
    found = pattern.findall(HTML)
    assert len(found) >= 8, "the markup's overflow controls were not found"
    unnamed = [tag[:160] for tag in found if not re.search(r'(?:title|aria-label)="[^"]*(?:[Mm]ore|[Aa]ctions|[Ss]ort and view)', tag)]
    assert not unnamed, f"a dots glyph on a control that is not an overflow menu: {unnamed}"


def test_in_script_the_overflow_glyph_belongs_to_the_menu_builders_alone() -> None:
    allowed = {
        "sheets-selects.js",  # kebabMenu
        "menus.js",  # the note row's own builder, a card (meatball)
        "documents.js",  # the dock's More toggle label
        "whiteboard-commands.js",  # the legend naming the menu key
        "editor.js",  # (comment on the section break: not a glyph)
    }
    users = {
        name
        for name, text in JS.items()
        if re.search(r'["\']ph:dots-three(?:-vertical)?["\']', text)
    }
    assert users <= allowed, f"a new place draws the overflow glyph: {sorted(users - allowed)}"
    assert "ph:asterisk" in JS["editor.js"], "the section break is no longer a meatball"
    assert 'icon: "ph:dots-three", label: "Section break"' not in JS["editor.js"]


def test_the_vertical_kebab_is_only_at_the_end_of_a_vertical_list_row_or_in_a_narrow_column() -> None:
    counts = {name: len(re.findall(r"\{ vertical: true \}", text)) for name, text in JS.items() if "{ vertical: true }" in text}
    assert counts == VERTICAL_KEBABS, f"vertical kebabs by file {counts}; allowed {VERTICAL_KEBABS}"
    vertical_in_markup = set(re.findall(r'id="([\w-]+)"[^>]*>\s*<i class="ph ph-dots-three-vertical', HTML))
    assert vertical_in_markup == VERTICAL_IN_MARKUP, vertical_in_markup


def test_kebab_menu_draws_the_vertical_glyph_only_when_asked() -> None:
    source = JS["sheets-selects.js"]
    start = source.index("function kebabMenu(")
    body = source[start : start + 900]
    assert "{ vertical = false } = {}" in body
    assert 'vertical ? "ph:dots-three-vertical" : "ph:dots-three"' in body


def test_the_list_view_toggle_is_not_a_hamburger() -> None:
    """Cards and Rows: the toggle's second state is `ph-rows`, the counterpart
    of `ph-squares-four`; `ph-list` stays free for the navigation button."""
    assert HTML.count('data-library-view="list"') == 2
    for match in re.finditer(r'data-library-view="list"[^>]*>\s*<i class="ph (ph-[\w-]+)"', HTML):
        assert match.group(1) == "ph-rows", match.group(0)


def test_design_md_has_the_row_and_names_this_lint() -> None:
    design = (ROOT / "docs" / "DESIGN.md").read_text(encoding="utf-8")
    assert "Overflow and menu icons" in design
    assert "tests/test_icon_conventions.py" in design
