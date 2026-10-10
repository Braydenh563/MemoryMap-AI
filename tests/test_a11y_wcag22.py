"""WCAG 2.2 AA findings fixed from the axe-core and accessibility-tree scans
(INBOX 433, `scratchpad/ui-sweeps/axe.js`, `srtree.js`, `zoom.js`).

Each test pins one finding as it was measured in Chromium:

* No main landmark on five tabs, and a different one on the other three.
* Every resize grip (a focusable separator) lacked `aria-valuenow`.
* Two labels dimmed by opacity read under 4.5:1 in light.
* A list of rows that are buttons held no list items.
* The document editor and every note box had no accessible name.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"
CSS = FRONTEND / "css"


def _read(name: str) -> str:
    return (FRONTEND / ("js/" + name if name.endswith(".js") else name)).read_text(encoding="utf-8")


def _function(source: str, name: str) -> str:
    start = re.search(rf"^(?:async )?function {name}\(", source, re.M)
    assert start, f"{name} not found"
    rest = source[start.end():]
    return rest[: re.search(r"^}", rest, re.M).start()]


def test_one_main_landmark_wraps_the_tab_pages():
    html = _read("index.html")
    assert html.count("<main") == 1 and html.count("</main>") == 1
    main = html[html.index('<main id="app-main">'):html.index("</main>")]
    for tab in ("dashboard", "notes", "chat", "timeline", "graph", "documents", "reminders", "library"):
        assert f'id="tab-{tab}"' in main, tab
    css = (CSS / "08-consistency.css").read_text(encoding="utf-8")
    assert re.search(r"#app-main \{\s*display: contents;\s*\}", css)
    # No rule still names the inner element by its old tag.
    for path in CSS.glob("*.css"):
        assert not re.search(r"(\.layout ?> ?|split > |~ )main\b", path.read_text(encoding="utf-8")), path.name


def test_every_resize_grip_states_its_value():
    sheets = _read("sheets-selects.js")
    track = _function(sheets, "trackSeparatorValue")
    for attr in ("aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext"):
        assert attr in track
    assert "ResizeObserver" in track
    assert "trackSeparatorValue(handle, aside, SIDEBAR_MIN, SIDEBAR_MAX)" in sheets
    assert "trackSeparatorValue(handle, panel, WEB_PANEL_MIN, WEB_PANEL_MAX)" in sheets
    assert "trackSeparatorValue(handle, $(\"doc-prose-panel\")" in _read("documents.js")
    # Every separator built anywhere goes through it. `js/`, not the root:
    # the root holds only the service worker, so this loop checked nothing
    # (found 2026-10-04).
    scripts = sorted((FRONTEND / "js").glob("*.js"))
    assert len(scripts) > 20
    for path in scripts:
        text = path.read_text(encoding="utf-8")
        if 'setAttribute("role", "separator")' in text and 'tabindex", "0"' in text:
            assert "trackSeparatorValue(" in text, path.name


def test_dimmed_labels_are_dimmed_by_colour_not_opacity():
    shell = (CSS / "00-tokens-shell.css").read_text(encoding="utf-8")
    count = shell[shell.index(".library-chip-count {"):]
    count = count[: count.index("}")]
    assert not re.search(r"^\s*opacity:", count, re.M) and "color: var(--muted);" in count
    forms = (CSS / "01-forms-settings.css").read_text(encoding="utf-8")
    toggle = forms[forms.index("#web-search-toggle:not(.active) {"):]
    toggle = toggle[: toggle.index("}")]
    assert not re.search(r"^\s*opacity:", toggle, re.M) and "color: var(--muted);" in toggle


def test_a_list_of_button_rows_is_a_group():
    dash = _read("dashboard.js")
    assert 'if (!ul.hasAttribute("role")) ul.setAttribute("role", "group");' in _function(dash, "dashActionRow")
    assert 'list.setAttribute("role", "group");' in dash
    assert 'id="ask-history-list" class="ask-history-list" role="group"' in _read("index.html")


def test_the_editors_have_names():
    docs = _read("documents.js")
    assert '"aria-label": "Document text"' in docs
    assert '"aria-label": noteSurfaceName(host)' in _function(docs, "noteSurfaceExtensions")
    name = _function(docs, "noteSurfaceName")
    assert 'split("\\n")[0]' in name
    html = _read("index.html")
    assert 'id="entry-content" rows="3" class="autogrow" aria-label="New note"' in html
    for field in ("persona-prompt", "template-name", "template-description", "template-body"):
        tag = html[html.index(f'id="{field}"'):]
        assert "aria-label=" in tag[: tag.index(">")], field
    assert 'textarea.setAttribute("aria-label", "Note text")' in _read("note-edit-panels.js")


def test_find_anything_is_a_listbox_only_while_it_lists():
    find = _read("search.js")
    role = _function(find, "finderResultsRole")
    assert 'listing ? "listbox" : "group"' in role
    assert "finderResultsRole(results, false);" in _function(find, "finderRenderEmpty")
    assert "finderResultsRole(results, rows.length > 0);" in _function(find, "finderRender")
    assert 'id="finder-results" class="finder-results" role="group"' in _read("index.html")


def test_the_keyboard_lands_somewhere_after_every_note_step():
    # notekeys.js: F2 left the focus on <body>, Escape too, and a move by the
    # chooser too; a chooser opened on its X, so Enter closed it.
    notes = _read("notes-list.js")
    assert "else focusBodyAfterRender = id;" in _function(notes, "openNoteEditor")
    assert "focusNoteRow(back)" in _function(_read("note-edit-panels.js"), "closeNoteForm")
    row = _function(notes, "focusNoteRow")
    assert "active !== document.body" in row and "row.focus(" in row
    assert "if (!many) focusNoteRow(noteIds[0]);" in _read("categories-panel.js")
    sheet = _function(_read("phone-shell.js"), "openSheet")
    assert "'.sheet-row[aria-current=\"true\"]'" in sheet
    assert "ArrowDown: 1, ArrowUp: -1" in sheet


def test_focus_is_never_hidden_under_sticky_or_floating_furniture():
    # zoom.js at 400% (320x256) and 320 wide: Tab reached an off-screen
    # drawer, controls under the floating New note, and controls under the
    # sticky sub-tabs.
    misc = (CSS / "07-whiteboard-misc.css").read_text(encoding="utf-8")
    closed = misc[misc.index("#skills-sidebar:not(.sidebar-sheet-open) {\n    overflow-y: hidden;") - 200:]
    assert "#sidebar:not(.sidebar-sheet-open)," in closed
    assert ".tab-page:has(> .dock-fab) .tab-main {\n    scroll-padding-bottom:" in misc
    side = (CSS / "05-sidebars-themes.css").read_text(encoding="utf-8")
    assert "#tab-notes .tab-main,\n#tab-library,\n#tab-library .tab-main {\n  scroll-padding-top:" in side
    resp = (CSS / "10-responsive.css").read_text(encoding="utf-8")
    short = resp[resp.index("@media (max-height: 420px) {"):]
    assert ".notes-subtabs,\n  .library-subtabs {\n    position: static;" in short
    assert 'const PHONE_FAB = "(max-width: 599.98px) and (min-height: 421px)";' in _read("phone-shell.js")


def test_single_key_shortcuts_can_be_turned_off():
    # WCAG 2.1.4: the "m" chord, "/" and "?" fired on a lone letter with no
    # way to turn them off.
    wiring = _read("settings-wiring.js")
    assert "const singleKeys = singleKeysOn();" in wiring
    assert "if (!typing && !overlayOpen && singleKeys && !boardOwns) {" in wiring
    assert 'singleKeys && e.key === "m" && !e.ctrlKey' in wiring
    assert 'prefs.get("singleKeys", null) !== "off"' in _function(wiring, "singleKeysOn")
    assert 'id="pref-single-keys"' in _read("index.html")


def test_a_select_opener_name_contains_the_words_on_its_face():
    """axe `label-content-name-mismatch` (2026-10-10, 22 findings per theme):
    every sort and model picker was named "Sort notes" while its face read
    "Newest first". Label in Name (2.5.3) wants the visible words inside the
    accessible name; the opener's aria-label is rewritten with the value."""
    selects = _read("sheets-selects.js")
    sync = selects[selects.index("const syncValue = () => {"):]
    sync = sync[: sync.index("opener.disabled = select.disabled;")]
    assert 'opener.setAttribute(' in sync and '`${label}: ${shown}`' in sync
    assert "select-opener-icon" in sync, "an icon-only opener shows no text and keeps the plain label"


# The 13 buttons that `index.html` ships with no text, `aria-label` or
# `title` (Brief 56, `scratchpad/ui-sweeps/hierarchy.js`): the plan counted
# them as unlabelled icon-only buttons from the markup alone. Observed in the
# running app, none of them is: JS paints each before it can be seen (the
# status bar's `paintStatusItem`, the Logs dock's `renderCopyLogsLabel`), and
# the live scan of 20 surfaces, 7 menus per surface and 19 dialogs found no
# visible control without a name. The set is pinned so a new empty button in
# the markup fails here, with the painter it has to have named in the message.
EMPTY_MARKUP_BUTTONS = {
    "status-notes", "status-reminders", "status-task", "status-activity",
    "status-command", "status-agent", "status-guide", "status-find",
    "status-back", "status-forward", "status-undo", "status-redo", "logs-copy",
}


def _all_js() -> str:
    return "\n".join(p.read_text(encoding="utf-8") for p in sorted((FRONTEND / "js").glob("*.js")))


def _empty_markup_buttons() -> set[str]:
    from html.parser import HTMLParser

    found: set[str] = set()

    class Parser(HTMLParser):
        current = None

        def handle_starttag(self, tag, attrs):
            if tag == "button":
                self.current = {"attrs": dict(attrs), "text": ""}

        def handle_data(self, data):
            if self.current is not None:
                self.current["text"] += data

        def handle_endtag(self, tag):
            if tag != "button" or self.current is None:
                return
            attrs, text = self.current["attrs"], self.current["text"]
            self.current = None
            if not text.strip() and not attrs.get("aria-label") and not attrs.get("title"):
                found.add(attrs.get("id") or f"<button class={attrs.get('class')!r}>")

    Parser().feed(_read("index.html"))
    return found


def test_an_empty_markup_button_is_one_that_js_paints():
    found = _empty_markup_buttons()
    assert found == EMPTY_MARKUP_BUTTONS, (
        "a button in index.html has no text, aria-label or title: give it one, "
        f"or paint it from JS and add its id here. Difference: {sorted(found ^ EMPTY_MARKUP_BUTTONS)}"
    )
    js = _all_js()
    for button_id in EMPTY_MARKUP_BUTTONS:
        assert f'paintStatusItem("{button_id}"' in js or f'$("{button_id}")' in js, button_id
    # The status items are named by the text paintStatusItem writes into them.
    paint = _function(js, "paintStatusItem")
    assert "button.replaceChildren();" in paint and "text.textContent = label;" in paint


def test_buttons_js_builds_hidden_are_named_when_they_show():
    # hierarchy.js found these in the DOM with no name while `hidden`; each is
    # named in the pass that un-hides it.
    js = _all_js()
    map_js = _read("whiteboard-map.js")
    for marker in (
        'box.setAttribute("aria-label", task === "done" ? "Done" : "Not done");',
        'noteMark.setAttribute("aria-label", "Open the note behind this topic");',
        'link.setAttribute("aria-label", `Open the page this topic links to`);',
        'chevron.setAttribute("aria-label", chevron.title);',
        'badge.setAttribute("aria-label", label);',
    ):
        assert marker in map_js, marker
    ai = _read("ai-tools.js")
    assert "badge.hidden = !name;" in ai and "badge.textContent = missing" in ai
    assert "renderCopyLogsLabel" in js
def test_a_task_checkbox_in_a_note_card_is_named_by_its_task():
    """axe `label` (critical, 20 boxes, 2026-10-10): the disabled checkbox a
    "- [ ] task" line draws had no name. Done or To do, then the words."""
    cards = _read("notes-list.js")
    start = cards.index('box.type = "checkbox";')
    block = cards[start: start + 900]
    assert 'box.setAttribute("aria-label", `${box.checked ? "Done" : "To do"}: ' in block


def test_the_heatmap_scroller_is_a_tab_stop_with_a_ring():
    """axe `scrollable-region-focusable` (serious, 2026-10-10): `.heatmap`
    scrolls sideways and held nothing focusable."""
    dash = _function(_read("dashboard.js"), "renderHeatmapWidget")
    assert "grid.tabIndex = 0;" in dash
    assert 'grid.setAttribute("aria-label"' in dash
    # The ring is the base `:focus-visible` rule's, not a heatmap rule: a tab
    # stop gets it for free and the boot CSS has no bytes to spare.
    base = (CSS / "02-chat-graph.css").read_text(encoding="utf-8")
    assert re.search(r"^:focus-visible \{\s*outline: ", base, re.M)


def test_the_folded_tags_chip_keeps_a_24px_target():
    """axe `target-size` (serious, 2026-10-10): the "+N" chip was 23.6 by 24
    px at 390. WCAG 2.5.8 wants 24 on both sides."""
    css = (CSS / "08-consistency.css").read_text(encoding="utf-8")
    rule = re.search(r"\.note-meta > \.note-meta-more \{([^}]*)\}", css)
    assert rule, ".note-meta-more rule missing"
    assert "min-width: 24px;" in rule.group(1)  # the height is the chip's own 24
    assert 'chip("+0", "note-meta-more"' in _read("note-cards.js")


def test_an_icon_only_control_is_named_by_aria_label_not_title_alone():
    """a11yname.js (2026-10-10): 93 icon-only controls in the Notes list at
    1440 had a `title` and no `aria-label`; a title never shows on touch. The
    x buttons (`.unlink`) share one helper (note-cards.js: app.js is at its
    size ratchet), and a chip folded to its icon
    keeps its words as the name."""
    helper = _function(_read("note-cards.js"), "makeUnlinkAccessible")
    assert 'span.setAttribute("aria-label", span.title)' in helper
    cards = _read("note-cards.js")
    assert 'el.setAttribute("aria-label", el.title)' in cards[cards.index('el.classList.add("is-icon")'):][:400]
