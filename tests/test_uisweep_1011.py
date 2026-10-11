"""Mechanical findings of the 2026-10-11 UI sweep (INBOX 800), each pinned.

The measurements are in `docs/roadmap/archive/agent-remaining/uisweep-1011.md`; the
sweeps that found them are in `scratchpad/ui-sweeps/`. These are the static
halves: the stylesheet and the markup, which is all the suite can see.
"""

from __future__ import annotations

import re

from tests._css_paths import css_text


def _strip(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def test_a_solid_map_topic_keeps_its_progress_count_legible():
    # "3/7" drew in --muted (1.00:1) on the branch colour of a solid topic:
    # the `.wb-map-core` and `.wb-map-filled` rules named it, `.wb-map-solid`
    # (a bold main branch, any topic filled Solid) did not.
    css = _strip(css_text())
    rule = re.search(r"\.wb-map-node\.wb-map-solid:not\(\[data-shape=\"none\"\]\) :is\(([^)]*)\)\s*\{[^}]*color:\s*var\(--wb-core-ink\)", css)
    assert rule, "no ink rule for a solid topic's children"
    assert ".wb-map-progress" in rule.group(1)


def test_a_disabled_task_box_on_a_note_card_says_why():
    from _app_js import app_js_text

    js = app_js_text()
    at = js.index('item.className = "entry-task"')
    block = js[at : at + 1400]
    assert "box.disabled = true" in block
    assert 'box.title = "' in block


def test_the_chosen_chat_mode_keeps_a_visible_focus_ring_in_the_ink_palettes():
    # The ring was --on-accent (white) because a chosen segment was an accent
    # fill. In Utilitarian, Paper and Mono the chosen segment is an 11% ink
    # tint, so the white ring drew at 1.3:1 on it (focusring.js, 219 vs 255).
    css = _strip(css_text())
    rule = re.search(
        r':root:is\(\[data-palette="utilitarian"\], \[data-palette="paper"\], \[data-palette="mono"\]\) '
        r"\.chat-dock-controls \.seg > button:is\(\.active, \[aria-pressed=\"true\"\]\):focus-visible\s*\{([^}]*)\}",
        css,
    )
    assert rule and "outline-color: var(--ink)" in rule.group(1)


def test_a_dashboard_digest_line_is_a_list_item_holding_its_link():
    # axe `list` (serious): the Dashboard's "today" digest set role="link" on
    # each `li`, which stops it being a list item inside its `ul`.
    from pathlib import Path

    js = (Path(__file__).resolve().parents[1] / "frontend" / "js" / "dashboard.js").read_text(encoding="utf-8")
    at = js.index('li.className = line.kind === "quote"')
    block = js[at : at + 1400]
    assert 'li.setAttribute("role"' not in block
    assert 'link.setAttribute("role", "link")' in block
    assert "li.appendChild(link)" in block


def test_a_scrolling_page_and_widget_body_leave_room_for_a_focus_ring():
    # A Tab stop scrolled in flush with the bottom edge lost 3.8 to 4.1px of
    # its ring to the clip (focus-ring sweep): the scroller keeps --ring-room.
    css = _strip(css_text())
    rule = re.search(r"\.tab-page,\s*\.dash-body\s*\{([^}]*)\}", css)
    assert rule and "scroll-padding-block: var(--ring-room)" in rule.group(1)


def test_a_plain_activity_row_beside_button_rows_is_not_a_stray_list_item():
    from pathlib import Path

    js = (Path(__file__).resolve().parents[1] / "frontend" / "js" / "dashboard.js").read_text(encoding="utf-8")
    at = js.index("Something that is gone (a note deleted for good")
    block = js[at : at + 900]
    assert 'li.setAttribute("role", "presentation")' in block


# --- hover without a focus twin: a ratchet, not a fix (uisweep-1011, M3) ----------
#
# DESIGN.md "One hover for every button": the quiet fill is "the same under
# :focus-visible". The sweep found 216 selectors whose hover rule changes a
# fill, ink, edge or shadow with no :focus rule on the same selector. A keyboard
# user still gets the 2px ring on every stop (focusring.js: 0 weak), so this is
# parity, not a missing ring, and editing 216 rules is Brief 57's one recipe
# decision. Until then the count may only fall: a new component's hover rule
# names its :focus-visible beside it (`:is(:hover, :focus-visible)`).
HOVER_WITHOUT_FOCUS_BASELINE = 214


def _split_top(selector: str) -> list[str]:
    out, depth, cur = [], 0, ""
    for ch in selector:
        if ch in "([":
            depth += 1
        if ch in ")]":
            depth -= 1
        if ch == "," and depth == 0:
            out.append(cur.strip())
            cur = ""
        else:
            cur += ch
    out.append(cur.strip())
    return out


def _hover_only_selectors() -> set[tuple[str, str]]:
    from _css_paths import CSS_FILES

    rules = []
    for path in CSS_FILES:
        text = _strip(path.read_text(encoding="utf-8"))
        for m in re.finditer(r"([^{}@;]+)\{([^{}]*)\}", text):
            rules.append((path.name, m.group(1).strip(), m.group(2)))

    def norm(part: str) -> str:
        part = re.sub(r":(hover|focus-visible|focus-within|focus|active)\b", "", part)
        part = re.sub(r":is\(\s*(,\s*)*\)", "", part)
        part = re.sub(r":is\(([^(),]*)\)", r"\1", part)
        return re.sub(r"\s+", " ", part).strip()

    focus = {norm(p) for _, sel, _ in rules for p in _split_top(sel) if re.search(r":focus(-visible)?\b", p)}
    looks = re.compile(r"background|color|border|box-shadow|outline|opacity|transform|filter|text-decoration")
    found = set()
    for name, sel, body in rules:
        if not looks.search(body):
            continue
        for part in _split_top(sel):
            if not re.search(r":hover\b", part) or re.search(r":focus", part):
                continue
            # `:hover .x` reveals something inside a container; that is not a control's feedback.
            if re.search(r":hover\)?\s+[.#\[a-z>~+]", part):
                continue
            if norm(part) not in focus:
                found.add((name, part))
    return found


def test_hover_without_a_focus_twin_does_not_grow():
    found = _hover_only_selectors()
    assert len(found) <= HOVER_WITHOUT_FOCUS_BASELINE, (
        f"{len(found)} selectors have a hover rule and no :focus rule (baseline {HOVER_WITHOUT_FOCUS_BASELINE}): "
        "write the :focus-visible beside the :hover, as `:is(:hover, :focus-visible)`"
    )


# --- learnability: a state said only by colour, a toggle with no state, a hidden gesture ---

def _js(name: str) -> str:
    from pathlib import Path

    return (Path(__file__).resolve().parents[1] / "frontend" / "js" / name).read_text(encoding="utf-8")


def test_a_reminders_priority_is_a_word_as_well_as_a_coloured_edge():
    js = _js("shell-reminders.js")
    assert '"High" : "Low"} priority' in js


def test_a_toggle_says_it_is_on_to_a_screen_reader_as_well_as_to_the_eye():
    assert "function setActiveChoice(" in _js("chat-attach.js")
    #: shell-reminders.js's own list and month toggle went with the one calendar (TIMELINE_PLAN decision 19).
    for name in ("wiring.js", "capture-ask.js", "skills.js"):
        assert "setActiveChoice(" in _js(name), name
    # The fill alone, set by hand on these, is the finding.
    assert 'classList.toggle("active", b === button)' not in _js("wiring.js")
    assert '$("select-btn").classList.add("active")' not in _js("skills.js")
    from pathlib import Path

    html = (Path(__file__).resolve().parents[1] / "frontend" / "index.html").read_text(encoding="utf-8")
    for fragment in ('id="select-btn" class="ghost small" aria-pressed="false"', 'data-filter="open"'):
        assert fragment in html, fragment
    assert re.search(r'data-view="list" class="active icon-only"[^>]*aria-pressed="true"', html)
    assert re.search(r'aria-pressed="true" data-filter="open"', html)


def test_the_dashboards_hold_or_right_click_mark_menu_names_itself():
    assert 'holder.title = "Right-click or hold to change this mark"' in _js("dashboard.js")


def test_a_worded_menu_draws_its_groups_and_the_document_adder_declares_them():
    # menus.js: "Add this note to a document" was 7 rows with no groups because
    # `labelledMenu` ignored the `group` an item carries (kebabMenu honours it).
    sheets = _js("sheets-selects.js")
    at = sheets.index("function labelledMenu(")
    assert 'rule.className = "menu-sep"' in sheets[at : at + 2600]
    capture = _js("capture-ask.js")
    assert 'group: "Documents"' in capture and 'group: "New"' in capture
