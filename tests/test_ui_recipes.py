"""New UI goes through DESIGN.md's recipe index, and drift is a ratchet.

The owner: "all the ui issues and stuff with popup menus, ui not matching
and more happen when new features are added or changed because you don't
follow design.md". Two things a diff cannot show and a review misses:

1. A glass surface that is not on the `[data-glass="off"]` list stays
   glassy with the setting off, and blurs at a radius of its own. Every
   selector that declares a backdrop-filter must be on that list or in the
   families DESIGN.md names.
2. A menu built by hand instead of `kebabMenu()` positions itself, clamps
   itself and closes itself differently from every other menu in the app,
   and that is where "the menu is crushed" reports come from. The count of
   hand-built `role="menu"` elements per file may only fall.

Both are ratchets: the known drift is frozen here so the lint starts green;
a fix removes an entry, a new offender fails the build.
"""

from __future__ import annotations

import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS = sorted((ROOT / "frontend" / "css").glob("*.css"))
JS = sorted((ROOT / "frontend").glob("*.js"))

# The families DESIGN.md names as glass on purpose; anything else must be on
# the glass-off list by its own name.
GLASS_FAMILIES = {
    ".card", ".glass", "header#top-bar", "#top-bar", ".modal-card", ".space-dialog",
    ".dock-menu", ".action-menu", ".select-menu", ".graph-help-panel", ".help-body",
    ".toast", ".command-palette-card", ".scroll-top", ".notes-subtabs", ".library-subtabs",
    ".contents-heading", ".graph-zoom", ".sidebar-panel",
}

# Selectors that blurred before this lint existed and are not yet on the
# list. May only shrink: fix one by adding it to the `[data-glass="off"]`
# list in 03-dashboard-widgets.css (or by removing its blur) and delete it
# here. Never add to it.
KNOWN_GLASS_DRIFT = set()


def _rules(css: str):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    for match in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
        yield match.group(1).strip(), match.group(2)


def _glass_off_names() -> set[str]:
    css = (ROOT / "frontend" / "css" / "03-dashboard-widgets.css").read_text(encoding="utf-8")
    names = set()
    for selector, body in _rules(css):
        if 'data-glass="off"' in selector and "backdrop-filter: none" in body:
            for part in selector.split(","):
                part = part.strip()
                tail = part.split("]")[-1].strip()
                if tail:
                    names.add(tail.split()[0].split(":")[0])
    return names


def _leading_name(selector: str) -> str:
    selector = selector.strip()
    if selector.startswith("@"):
        return ""
    token = re.split(r"[\s>+~:\[]", selector, maxsplit=1)[0]
    return token or selector


def test_every_blurred_surface_is_on_the_glass_off_list_or_in_a_named_family() -> None:
    allowed = _glass_off_names() | GLASS_FAMILIES | KNOWN_GLASS_DRIFT
    offenders = []
    for path in CSS:
        for selector, body in _rules(path.read_text(encoding="utf-8")):
            if "backdrop-filter:" not in body or "backdrop-filter: none" in body:
                continue
            for part in selector.split(","):
                name = _leading_name(part)
                if not name or name.startswith("@") or name.startswith(":root"):
                    continue
                full = part.strip()
                if any(fam in full for fam in GLASS_FAMILIES):
                    continue
                if name in allowed or any(n in full for n in allowed):
                    continue
                offenders.append(f"{path.name}: {full}")
    assert offenders == [], (
        "a blurred surface that is not on the [data-glass=off] list (DESIGN.md, "
        "Turning it off) or in a named family: " + "; ".join(sorted(set(offenders)))
    )


# Hand-built menus per file, frozen. `kebabMenu()` in app.js is the recipe;
# the two canvases draw their own because they float over a canvas that has
# no DOM under the pointer.
HAND_BUILT_MENUS = {"app.js": 4, "graph-canvas.js": 1, "whiteboard.js": 1}


def test_hand_built_menus_do_not_multiply() -> None:
    counts = {}
    for path in JS:
        n = path.read_text(encoding="utf-8").count('setAttribute("role", "menu")')
        if n:
            counts[path.name] = n
    for name, n in counts.items():
        assert n <= HAND_BUILT_MENUS.get(name, 0), (
            f"{name} builds {n} menus by hand; the recipe is kebabMenu(items, label) "
            "in app.js (DESIGN.md, the recipe index)"
        )


def test_a_pointer_anchored_menu_is_the_recipe() -> None:
    """A right-click or long-press menu is `openMenuAtPoint`, not a new shape.

    DESIGN.md's recipe index gains a row with the link context menu (INBOX
    182). The failure it guards against is the one the kebab ratchet above
    guards against one step earlier: a second surface that wants a menu where
    the pointer is, writing its own host, its own clamp and its own closing
    rule. The recipe lives in app.js and every `.pointer-menu-host` in the
    frontend comes from it.
    """
    app = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    assert "function openMenuAtPoint(" in app, (
        "the pointer-anchored menu recipe has gone from app.js; DESIGN.md's "
        "recipe index still points at openMenuAtPoint"
    )
    builders = {
        path.name: path.read_text(encoding="utf-8").count('className = "pointer-menu-host"')
        for path in JS
    }
    offenders = {name: n for name, n in builders.items() if n and name != "app.js"}
    assert not offenders, (
        f"{offenders} build a pointer-menu host of their own; the recipe is "
        "openMenuAtPoint(items, ariaLabel, x, y) in app.js (DESIGN.md, the recipe index)"
    )
    assert builders.get("app.js", 0) == 1, (
        f"app.js builds {builders.get('app.js', 0)} pointer-menu hosts; one recipe, one host"
    )


# A sheet is `openSheet()` in app.js (DESIGN.md, "A sheet"). Two predate the
# recipe and are frozen here with their reason: the three sidebars become edge
# sheets below 600 (`.sidebar-sheet-open`) and the graph's dock becomes
# `.graph-popup-sheet`. Each of those brought its own scrim, its own closing
# behaviour and its own bottom inset, which is exactly the drift the recipe
# ends, so the list may shrink and never grow.
HAND_BUILT_SHEETS = {"sidebar-sheet-open", "graph-popup-sheet"}

# The recipe's own classes, including the two a `variant` produces: `openSheet`
# takes one word and stamps `sheet-<word>` on the overlay and
# `sheet-card-<word>` on the card, which is how a sheet that has to sit
# somewhere else (Atlas, in the corner, INBOX 224) stays the one recipe rather
# than becoming a third hand-built sheet. A new variant adds its two names here
# and nothing else; the test below is what keeps that true.
SHEET_RECIPE = {
    "sheet-overlay",
    "sheet-card",
    "sheet-head",
    "sheet-title",
    "sheet-close",
    "sheet-list",
    "sheet-row",
    "sheet-corner",
    "sheet-card-corner",
    # The note page (UI Phase 11 item 2): full height, a back chevron.
    "sheet-page",
    "sheet-card-page",
}


def test_only_the_recipe_stamps_a_sheet_variant() -> None:
    """A variant class may only ever be written by `openSheet`.

    Otherwise the variant is the loophole: any file could paint `sheet-corner`
    onto a div of its own and inherit none of the scrim, the tier, the head
    with its X, Escape or the backdrop press.
    """
    for path in JS:
        js = path.read_text(encoding="utf-8")
        for match in re.findall(r'"sheet-(?:card-)?[a-z]+"', js):
            assert path.name == "app.js", f"{path.name} writes {match} by hand"
    app = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    assert app.count("sheet-${variant}") == 1
    assert app.count("sheet-card-${variant}") == 1


def test_a_sheet_is_the_recipe_or_one_of_the_two_that_predate_it() -> None:
    found = set()
    for path in CSS:
        css = re.sub(r"/\*.*?\*/", "", path.read_text(encoding="utf-8"), flags=re.S)
        for name in re.findall(r"\.([A-Za-z0-9_-]*sheet[A-Za-z0-9_-]*)", css):
            found.add(name)
    unknown = sorted(found - SHEET_RECIPE - HAND_BUILT_SHEETS)
    assert unknown == [], (
        "a sheet built by hand rather than through `openSheet` (DESIGN.md, "
        '"A sheet"): ' + ", ".join(unknown)
    )


def test_the_sheet_recipe_keeps_its_dialog_semantics_and_its_bottom_inset() -> None:
    """The two halves a hand-built sheet has always got wrong.

    A sheet that is not a modal dialog is a panel a screen reader walks past;
    a sheet with no bottom inset puts its last row under the home indicator on
    every phone with one, which is the only surface in the app that cannot be
    checked in this sandbox at all.
    """
    app = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    opener = app[app.index("function openSheet("):]
    opener = opener[: opener.index("\n}\n")]
    for needed in ('"role", "dialog"', '"aria-modal", "true"', '"Escape"', "wireBackdropClose"):
        assert needed in opener, f"openSheet no longer carries {needed}"

    card = ""
    for path in CSS:
        for selector, body in _rules(path.read_text(encoding="utf-8")):
            if selector.strip() == ".sheet-card":
                card = body
    assert "env(safe-area-inset-bottom" in card, (
        "the sheet's own rule no longer pads its foot with the bottom safe-area inset"
    )


def test_the_corner_sheet_variant_floats_rather_than_leaning_on_an_edge() -> None:
    """The half a corner panel gets wrong (INBOX 270).

    `sheet-corner` is the one variant that is deliberately not an edge sheet:
    above the phone break it hovers in the corner over the app. It inherits
    `.sheet-card`'s bottom-sheet geometry, though, and inheriting it silently
    is how it came to sit 10px from the right of the window and 0px from the
    bottom with two square corners against an edge it was not touching. So the
    floating block has to keep saying all three things: one radius for all four
    corners, the same inset on both edges, and a foot padded like a card rather
    than like a row under a home indicator.
    """
    css = (ROOT / "frontend" / "css" / "08-consistency.css").read_text(encoding="utf-8")
    bodies = [
        body
        for selector, body in _rules(css)
        if selector.strip() == ".sheet-card.sheet-card-corner"
    ]
    assert bodies, "the corner sheet variant has no rule of its own"
    whole = "\n".join(bodies)
    radius = re.findall(r"border-radius:\s*([^;]+);", whole)
    assert radius, "the corner panel no longer states a radius of its own"
    for value in radius:
        assert len(value.split()) == 1, (
            "the corner panel is back to a two-corner radius, which is an edge "
            f"sheet's shape and not a floating panel's: {value.strip()}"
        )
    inline = re.search(r"margin-inline-end:\s*([^;]+);", whole)
    block = re.search(r"margin-block-end:\s*([^;]+);", whole)
    assert inline and block, "the corner panel is leaning on the window's edge again"
    assert inline.group(1).strip() == block.group(1).strip(), (
        "a floating panel has one inset, not one per edge: "
        f"{inline.group(1).strip()} against {block.group(1).strip()}"
    )
    assert "padding-bottom" in whole, (
        "the corner panel kept `.sheet-card`'s safe-area foot, which is an edge "
        "sheet's inset and leaves this one's composer closer to the bottom of "
        "the card than its head is to the top"
    )


# And the two that predate the recipe keep its dismissal even though they do not
# keep its construction (DESIGN.md, "A sheet"): an in-place sheet goes through
# `wireInPlaceSheetDismissal`, so Escape is captured, a press outside closes it
# and focus lands back on the opener. Those three are the half a hand-built
# sheet has always got wrong, and the half that can be shared without moving a
# live subtree in and out of a dialog.
def test_an_in_place_sheet_shares_the_recipe_dismissal() -> None:
    app = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    start = app.index("function wireInPlaceSheetDismissal(")
    body = app[start : app.index("\n}\n", start)]
    for needed in ('"keydown"', '"pointerdown"', "true)", "stopPropagation"):
        assert needed in body, f"wireInPlaceSheetDismissal no longer carries {needed}"
    assert "wireInPlaceSheetDismissal({" in app[app.index("function initSidebarSheetDismissal(") :], (
        "the sidebar sheet has gone back to its own dismissal"
    )


# A fixed set of filter toggles is one well (DESIGN.md, "Two to four toggles
# that belong to one question"), not a row of chips. INBOX 186 is what a row of
# chips looks like once there are four of them at four widths: measured at 820,
# four lines and a 181.2px dock. `.dock-chip-row` was that shape's class and now
# has no user in the page; the count may only stay at zero.
def test_a_fixed_filter_set_is_one_well_rather_than_a_row_of_chips() -> None:
    page = re.sub(
        r"<!--.*?-->", "", (ROOT / "frontend" / "index.html").read_text(encoding="utf-8"), flags=re.S
    )
    assert "dock-chip-row" not in page, (
        "a row of filter chips is back in the page: a filter set that is always "
        "all of its members is `.seg.seg-multi` (DESIGN.md's recipe index), and "
        "a chip is only for a filter you can take off"
    )

    css = "\n".join(path.read_text(encoding="utf-8") for path in CSS)
    bodies = [body for selector, body in _rules(css) if ".seg-multi" in selector]
    assert bodies, ".seg-multi is in DESIGN.md's index but not in the stylesheet"
    # The one property that separates it from `.seg`, and the whole reason the
    # variant exists: `.seg` wraps, and a well in a dock row that wraps is the
    # four-line chip row this replaced.
    assert any("flex-wrap: nowrap" in body for body in bodies), (
        ".seg-multi must declare `flex-wrap: nowrap`: `.seg` itself wraps, and a "
        "wrapping well in a dock row is the shape INBOX 186 reported"
    )


# And the other half of the same recipe, which is behaviour rather than paint:
# a toggle set says which of its members are on. It said so with `aria-pressed`
# per segment while it was a well; since INBOX 214 it is a dock menu of checkbox
# rows, where the state is the checkbox's own and the browser announces it, and
# the caption on the closed button is what says it when the menu is shut.
def test_a_multi_toggle_filter_set_says_which_of_its_members_are_on() -> None:
    app = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    start = app.index("function renderTimelineKinds(")
    body = app[start : app.index("\n}\n", start)]
    assert 'type = "checkbox"' in body, (
        "renderTimelineKinds builds the rows of a dock menu and each carries a "
        "real checkbox: the state is the control's own, not a class"
    )
    assert "doc-dock-menu-check" in body, (
        "a switch row in a dock menu is `.doc-dock-menu-check`, which is what "
        "keeps the menu open while it is pressed: a menu that shuts on the "
        "click hides the only feedback a switch gives"
    )
    assert "syncTimelineKindsLabel(" in body, (
        "the closed button is the only thing that says what the filter is set "
        "to, so building the rows has to write the caption too"
    )
    #: `change`, not `click`: the checkbox is inside its own <label>, so a press
    #: on the words fires a click on both and a click handler toggles twice.
    handler = app[app.index('$("timeline-kinds")?.addEventListener') :][:200]
    assert handler.startswith('$("timeline-kinds")?.addEventListener("change"'), handler[:80]


# A filter set whose members can outgrow the row it sits in is a dropdown, not
# a well (INBOX 214, the owner: "they clash with the ui at large zoom and they
# dont fit visually"). This is the ratchet on the shape, since the well is the
# thing it would drift back to.
def test_the_timeline_kind_filter_is_one_button_rather_than_four() -> None:
    page = re.sub(
        r"<!--.*?-->", "", (ROOT / "frontend" / "index.html").read_text(encoding="utf-8"), flags=re.S
    )
    start = page.index('id="timeline-kinds-menu"')
    block = page[page.rindex("<details", 0, start) : page.index("</details>", start)]
    assert "dock-menu" in block and "doc-dock-menu-btn" in block, block[:200]
    assert 'id="timeline-kinds-label"' in block, (
        "the button says what the filter is set to, so it needs the span that "
        "carries the state"
    )
    assert 'id="timeline-kinds" class="seg seg-multi"' not in page, (
        "the Timeline's kind filter is a dock menu now, not a `.seg-multi` well: "
        "four glyphs and four words is 441px of a dock row that also holds a "
        "search box, a view switch and Options, which is what INBOX 214 reports"
    )
def test_a_thumb_bar_rides_the_keyboard_inset_it_did_not_measure() -> None:
    """DESIGN.md's recipe for a bar above the on-screen keyboard.

    Two halves, and neither can be seen in this sandbox: headless Chromium has
    no soft keyboard, so what a bar does when one opens is only ever reasoned.

    1. The bar's foot is a `max()` of the platform's own
       `env(keyboard-inset-height)`, the `--keyboard-inset` app.js writes from
       `visualViewport`, and the home-indicator inset. A bar that pads with
       none of them sits under the keys on every phone that has them.
    2. Nothing but `initKeyboardInset` listens to `visualViewport`. The number
       is written once for every surface that wants it; a second listener is
       how two bars end up disagreeing about where the keyboard is by a few
       pixels on every resize, which is the bug this recipe exists to make
       impossible rather than to fix twice.
    """
    feet = []
    for path in CSS:
        for selector, body in _rules(path.read_text(encoding="utf-8")):
            if _leading_name(selector) == ".thumb-bar":
                feet.append((path.name, body))
    assert feet, "no .thumb-bar rule: the recipe's own selector has been renamed"
    padded = [
        body for _, body in feet
        if "var(--keyboard-inset" in body and "env(safe-area-inset-bottom" in body
    ]
    assert padded, (
        ".thumb-bar pads its foot with neither --keyboard-inset nor the "
        "safe-area inset, so it sits under the keyboard and the home indicator"
    )

    listeners = []
    for path in JS:
        text = path.read_text(encoding="utf-8")
        for match in re.finditer(r"visualViewport", text):
            line = text.count("\n", 0, match.start()) + 1
            listeners.append(f"{path.name}:{line}")
    owner = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    body = owner[owner.index("function initKeyboardInset("):]
    body = body[: body.index("\n}\n")]
    assert body.count("visualViewport") == len(listeners), (
        "visualViewport is read outside initKeyboardInset (" + ", ".join(listeners) + "); "
        "read the --keyboard-inset property it writes instead"
    )

    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    for match in re.finditer(r"<div[^>]*class=\"[^\"]*thumb-bar[^\"]*\"[^>]*>", html):
        tag = match.group(0)
        assert 'role="toolbar"' in tag and "aria-label=" in tag, (
            "a thumb bar is a labelled toolbar: " + tag[:80]
        )


def test_no_inline_style_attributes_in_the_page() -> None:
    """The CSP rejects them silently (CLAUDE.md, section 6, shape 4)."""
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    assert re.search(r"<[^>]+\sstyle=", html) is None


def test_the_tonal_button_keeps_its_edge_and_its_lift() -> None:
    """`button.ghost` draws a real border and a real shadow.

    Third pass on one report. "control elements and buttons feel more like
    just shapes with text in them, rather than proper official buttons" was
    answered once with a border and a shadow; a later pass took both off and
    raised the fill instead, on a measurement taken in a *toolbar*; the
    report then came back a third time as "all the buttons need to actually
    look like buttons with affordance, not just shapes with text in them".

    So the base recipe is pinned here. A run of these inside something that
    already frames them (a dock, a card's row actions) is quieted by a more
    specific rule, which is the intended shape and is not what this guards
    against: what it guards against is the base rule being flattened again.
    """
    css = (ROOT / "frontend" / "css" / "01-forms-settings.css").read_text(encoding="utf-8")
    body = ""
    for selector, rule in _rules(css):
        if selector.strip() == "button.ghost":
            body = rule
            break
    assert body, "button.ghost has no rule in 01-forms-settings.css"
    assert "border: 1px solid var(--ghost-btn-border)" in body, (
        "button.ghost must draw a visible hairline: the edge is what makes it "
        "read as a control rather than a tinted shape with text in it"
    )
    assert "box-shadow: var(--shadow-sm)" not in body, (
        "button.ghost must not carry the panel shadow. `--shadow-sm` is seven "
        "times heavier in dark than in light, because a shadow over a near "
        "black page needs to be, and it was sized for a panel: under a 28px "
        "control it measured rgba(0, 0, 0, 0.35) on every button in the top "
        "bar at once, reported as \"the border shadow on elements like these "
        "are too strong\". The edge carries the affordance; the filled tier, "
        "one per surface, is what gets a glow"
    )


def test_the_press_cue_does_not_use_the_transform_property() -> None:
    """`button:active` composes with a button's own placement, never replaces it.

    `transform` is one property holding a list, so a press cue written as
    `transform: translateY(1px)` throws away whatever transform the button
    already had. Plenty of buttons here centre themselves with one
    (`left: 50%; transform: translateX(-50%)`), and every press moved them by
    half their own width: reported once for the lightbox arrows and again,
    measured at 68px, for the chat jump-to-latest pill. Written as `translate`
    and `scale`, which are separate properties, the cue cannot collide with
    anything, including buttons nobody has written yet.
    """
    css = (ROOT / "frontend" / "css" / "01-forms-settings.css").read_text(encoding="utf-8")
    body = ""
    for selector, rule in _rules(css):
        if selector.strip() == "button:active:not(:disabled)":
            body = rule
            break
    assert body, "the global press cue rule has gone missing"
    assert "transform:" not in body, (
        "the press cue must use `translate`/`scale`, not `transform`: "
        "`transform` replaces a button's own centring and makes it jump"
    )
    assert "translate:" in body and "scale:" in body


def test_no_dialog_is_a_direct_child_of_a_page() -> None:
    """A modal `<dialog>` must not be authored inside a `.tab-page`.

    It is drawn in the top layer and centres itself with the UA's
    `position: fixed; inset: 0; width: fit-content; margin: auto`, but a
    direct child of a page also matches the content-column rules
    (`.tab-page > *`: `width: 100%` and a cap; `.tab-page > .card`: a bottom
    margin), which are more specific than the `.space-dialog { margin: auto }`
    that protects every other dialog. The two that were written there opened
    1440px wide against the left edge, reported three times as "the ai edit
    history popover still not centering".

    Asserted on the markup rather than on the CSS, because the two CSS fixes
    both misfire: an opt-out rule has to beat `.tab-page > .card` (0,2,0) and
    then also beats the dialog's own width class, and narrowing the column
    rules with `:not(dialog)` raises their specificity and knocks out
    `.dock-fab` (three phone primary actions went off-screen on that attempt).
    """
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    pages = re.findall(
        r'<div[^>]*class="[^"]*\btab-page\b[^"]*"[^>]*id="(tab-[a-z-]+)"'
        r'|<div[^>]*id="(tab-[a-z-]+)"[^>]*class="[^"]*\btab-page\b[^"]*"',
        html,
    )
    assert pages, "no .tab-page elements found; this lint has lost its subject"
    offenders = []
    for match in re.finditer(r"<dialog[^>]*id=\"([^\"]+)\"", html):
        before = html[: match.start()]
        # The nearest unclosed `.tab-page` opener, if any, is this dialog's page.
        opens = len(re.findall(r'class="[^"]*\btab-page\b', before))
        if not opens:
            continue
        page_start = [m.start() for m in re.finditer(r'class="[^"]*\btab-page\b', before)][-1]
        segment = html[page_start : match.start()]
        # Depth from that opener to the dialog: 1 means direct child.
        depth = segment.count("<div") - segment.count("</div>")
        if depth == 1:
            offenders.append(match.group(1))
    assert offenders == [], (
        "these dialogs are direct children of a page and will take the content "
        "column's width and margins: " + ", ".join(offenders)
    )
def test_a_radial_places_its_slots_without_the_transform_properties() -> None:
    """A ring of actions is placed with `left`/`top`, never with `translate`.

    DESIGN.md's recipe index gained the radial with MINDMAP_PLAN §12.1 item 3
    (the map's node ring). The rule it needs a lint for is the one that is
    invisible in a diff and obvious on screen: the app's press cue is
    `translate` plus `scale` (pinned by the test above), and `translate` is one
    property holding a list, so a slot placed with it is thrown back to the
    ring's centre on every press. Same failure class as the lightbox arrows and
    the chat jump-to-latest pill, both of which were reported before the cue
    was rewritten; this stops the ring re-learning it.
    """
    css = (ROOT / "frontend" / "css" / "07-whiteboard-misc.css").read_text(encoding="utf-8")
    placed = False
    for selector, body in _rules(css):
        if ".wb-map-radial-slot" not in selector:
            continue
        assert "transform:" not in body and "translate:" not in body, (
            f"{selector.strip()} places a radial slot with a transform; the "
            "recipe is `left`/`top` from --wb-radial-r (DESIGN.md, the recipe "
            "index), because the press cue owns `translate`"
        )
        if "left:" in body and "top:" in body:
            placed = True
    assert placed, (
        "the radial recipe has lost its `left`/`top` placement rule; "
        "DESIGN.md's recipe index says a slot is placed that way"
    )


def test_the_radial_is_a_toolbar_rather_than_a_menu() -> None:
    """A ring claims the role a screen reader can do something with.

    `role="menu"` promises a list walked with the arrow keys; a radial is a
    toolbar arranged in a circle. Claiming the wrong one is worse than
    claiming nothing, and it would also be a hand-built menu, which the
    ratchet above counts.
    """
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    start = html.find('id="wb-map-radial"')
    assert start != -1, "the node radial has gone missing from index.html"
    opening = html[html.rfind("<div", 0, start): html.find(">", start) + 1]
    assert 'role="toolbar"' in opening, (
        "the node radial must be role=toolbar, not a menu (DESIGN.md, the "
        "recipe index)"
    )


def test_every_board_tool_names_its_own_cursor() -> None:
    """A cursor is a promise about what the click will do.

    Reported (INBOX 115): "when Im on the delete tool on the mindmap and
    hover over a mindmap text node, the cursor changes to the grabber hand".
    Two separate causes, both of which this holds shut. The first: a tool
    with no case in `wbCursorForTool` falls through to the `""` Pan returns,
    and `""` means "whatever the CSS says", which for the board container is
    `cursor: grab`. Select was fixed for exactly that once; bucket, sticky
    and text were still falling through three tools later. Measured before
    the fix: six of the eighteen tool/surface pairs showed the open hand
    that means "drag the canvas".
    """
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    js = (ROOT / "frontend" / "whiteboard.js").read_text(encoding="utf-8")
    tools = set(re.findall(r'data-tool="([a-z-]+)"', html))
    assert len(tools) >= 18, tools
    body = js[js.index("function wbCursorForTool(") : js.index("// The visible half of Select")]
    brushes = set(re.findall(r'"([a-z]+)"', js[js.index("const WB_BRUSH_TOOLS"):js.index("const WB_HIGHLIGHTER_ALPHA")]))
    # Pan is the one tool that deliberately returns "": the container's own
    # grab/grabbing pair is its cursor, and the comment on that line says so.
    assert 'return ""; // pan' in body
    tools.discard("pan")
    missing = sorted(t for t in tools if t not in brushes and f'"{t}"' not in body)
    assert not missing, f"tools with no cursor of their own: {missing}"


def test_an_item_does_not_promise_a_drag_under_a_tool_that_does_not_drag() -> None:
    """The second cause: every item on the board carries `cursor: grab`
    because Select and Hand really do drag it, and an item's own rule beats
    the tool cursor written inline on the container. Measured before the
    fix with `getComputedStyle(el).cursor`, once per tool over a map node,
    its text and a whiteboard object: 32 of those pairs answered `grab`
    while the click would have deleted, erased, drawn, filled or linked.
    """
    css = (ROOT / "frontend" / "css" / "07-whiteboard-misc.css").read_text(encoding="utf-8")
    guard = (
        '#whiteboard-container:not([data-current-tool="select"])'
        ':not([data-current-tool="pan"])'
    )
    assert guard in css
    rule = css[css.index(guard) : css.index("}", css.index(guard))]
    assert "cursor: inherit" in rule
    for selector in (".wb-object", ".node-card", ".wb-map-text", ".wb-text-content"):
        assert selector in rule, selector


def test_the_boards_selector_says_which_kind_each_board_is() -> None:
    """Reported (INBOX 115): "whiteboards and mindmaps need to be
    differentiable in the boards selector". Measured before: the top bar's
    `#wb-board-select` listed five options reading `Title (N items)`, four of
    them maps, with nothing on any of them saying so, under an aria-label
    that called all five whiteboards.

    MINDMAP_PLAN §5 item 12 already decided the idiom ("a map says it is one,
    in the row", which `mapChip` follows on the timeline, in a note and in the
    chat). A native `<option>` cannot hold that chip's icon, so the group
    heading carries it, the way three other selects in this app already do.
    """
    js = (ROOT / "frontend" / "whiteboard.js").read_text(encoding="utf-8")
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    body = js[js.index("async function refreshBoardList") : js.index("async function renameCurrentBoard")]
    assert 'createElement("optgroup")' in body
    assert '"Mind maps"' in body and '"Whiteboards"' in body
    select = html[html.index('<select id="wb-board-select"') :]
    select = select[: select.index(">") + 1]
    assert "Which board or map to show" in select
    assert "Which whiteboard to show" not in select
#: A row that says "you are here" and marks it with a class alone.
#: `classList.toggle("is-current-page", …)` is deliberately not matched: that
#: one highlights every row belonging to a page, which is a filter, not a
#: position.
CURRENT_ROW = re.compile(r'classList\.(?:add|toggle)\(\s*"is-current"')


def test_a_row_that_says_where_you_are_also_says_so_to_a_screen_reader() -> None:
    """DESIGN.md's recipe index: where-you-are is `aria-current`, not a colour.

    The document outline is the case that earned the rule. Measured before it
    had one: scrolled to 70% of a 21-heading document, nothing under
    `#doc-outline` carried a current class or `aria-current`, so the panel
    could not answer the one question a table of contents exists to answer.
    The fix is only half a fix if the mark is paint: a fill that no screen
    reader announces, and that one reader in twelve cannot separate from the
    rows around it, is a mark that is not there.

    So the two halves are checked together. The paint hangs off the attribute
    in CSS, which means removing the attribute removes the paint and the two
    cannot drift apart, and every file that adds the class sets the attribute
    beside it.
    """
    css = "\n".join(path.read_text(encoding="utf-8") for path in CSS)
    assert ".outline-link[aria-current]" in css, (
        "the outline's current row must be painted from [aria-current], so the "
        "mark and its announcement are one thing (DESIGN.md, the recipe index)"
    )
    for path in JS:
        text = path.read_text(encoding="utf-8")
        for match in CURRENT_ROW.finditer(text):
            window = text[match.start() : match.start() + 600]
            assert "aria-current" in window, (
                f"{path.name} marks a row as the current one with a class and "
                "never sets aria-current beside it: that mark is a colour, and "
                "a colour is not a position (DESIGN.md, the recipe index)"
            )


def _tool_palettes() -> list[tuple[str, list[str]]]:
    """Every bar built from `.wb-tool-section`, with what sits loose in it.

    Returns (bar name, complaints). A bar is any element with at least one
    `.wb-tool-section` child; a complaint is a control that is not inside a
    `.wb-tool-section-row`, or a section that is not one label and one row.

    Built as a tree rather than judged while walking, because document order
    does not cooperate: a control dropped into a palette *before* its first
    section would be read while nothing yet knows that the element it sits in
    is a palette at all, which is the one arrangement this most needs to
    catch (proved by putting exactly that into the markup and watching a
    stack-walking version of this pass).
    """
    from html.parser import HTMLParser

    html = re.sub(r"<!--.*?-->", "", (ROOT / "frontend" / "index.html").read_text(encoding="utf-8"), flags=re.S)

    class Tree(HTMLParser):
        def __init__(self) -> None:
            super().__init__()
            self.nodes: list[dict] = []
            self.open: list[int] = []
            self.void = {"input", "img", "br", "hr", "meta", "link"}

        def handle_starttag(self, tag, attrs):
            a = dict(attrs)
            node = {
                "index": len(self.nodes),
                "tag": tag,
                "classes": set((a.get("class") or "").split()),
                "id": a.get("id") or "",
                "type": a.get("type") or "",
                "parent": self.open[-1] if self.open else None,
                "children": [],
            }
            index = len(self.nodes)
            self.nodes.append(node)
            if node["parent"] is not None:
                self.nodes[node["parent"]]["children"].append(index)
            if tag not in self.void:
                self.open.append(index)

        def handle_startendtag(self, tag, attrs):
            self.handle_starttag(tag, attrs)

        def handle_endtag(self, tag):
            for i in range(len(self.open) - 1, -1, -1):
                if self.nodes[self.open[i]]["tag"] == tag:
                    del self.open[i:]
                    return

    tree = Tree()
    tree.feed(html)
    nodes = tree.nodes

    def ancestors(index: int):
        while index is not None:
            yield nodes[index]
            index = nodes[index]["parent"]

    bars: dict[str, list[str]] = {}
    palette_ids: set[int] = set()
    for index, node in enumerate(nodes):
        if "wb-tool-section" in node["classes"] and node["parent"] is not None:
            palette_ids.add(node["parent"])
    for index in palette_ids:
        node = nodes[index]
        bars[node["id"] or "." + "-".join(sorted(node["classes"])[:1])] = []

    def name_of(index: int) -> str:
        node = nodes[index]
        return node["id"] or "." + "-".join(sorted(node["classes"])[:1])

    for index, node in enumerate(nodes):
        if "wb-tool-section" in node["classes"] and node["parent"] in palette_ids:
            labels = sum(
                1 for child in node["children"] if "wb-tool-section-label" in nodes[child]["classes"]
            )
            rows = sum(
                1 for child in node["children"] if "wb-tool-section-row" in nodes[child]["classes"]
            )
            if labels != 1 or rows != 1:
                bars[name_of(node["parent"])].append(
                    f"a section with {labels} labels and {rows} rows"
                )
        is_control = node["tag"] in ("button", "select") or (
            node["tag"] == "input" and node["type"] != "hidden"
        )
        if not is_control:
            continue
        chain = list(ancestors(node["parent"]))
        palette = next((a for a in chain if a["index"] in palette_ids), None)
        if palette is None:
            continue
        if not any("wb-tool-section-row" in a["classes"] for a in chain):
            bars[name_of(palette["index"])].append(
                f"{node['id'] or sorted(node['classes']) or node['tag']} is not in a .wb-tool-section-row"
            )
    return sorted(bars.items())

def test_a_tool_palette_is_all_sections_or_none() -> None:
    """A bar of many tools is labelled sections, and nothing loose beside them.

    DESIGN.md's recipe index, the row for a palette of many tools. The
    whiteboard's rail learned this the expensive way (42 icons in one flat
    group, "neither is a design; both are an inventory") and the sketch pad's
    toolbar was reported in exactly the same words: "the quick sketck popup
    controls need a new redesign as they are clumped and ugly". What the
    recipe buys is that a group has a name and a hairline, and what this
    guards is the half-application: one control dropped into the bar beside
    the sections, which is where the next "clumped" report comes from, since
    it belongs to no group and says nothing about itself.

    Both live palettes (`#wb-tool-group`, `#sketch-toolbar`) are read from the
    markup, so a third one joins the rule by being written, not by being
    listed here.
    """
    palettes = _tool_palettes()
    assert palettes, "no tool palette found: this lint is looking at the wrong markup"
    for bar, complaints in palettes:
        assert not complaints, (
            f"{bar}: " + "; ".join(complaints) + " (DESIGN.md, the recipe index: a "
            "palette of many tools is `.wb-tool-section` wrapping a "
            "`.wb-tool-section-label` and a `.wb-tool-section-row`)"
        )


class _PanelHeads(HTMLParser):
    """Every `.panel-head` in the page, with the chips and buttons inside it.

    A stack walker rather than a regex: a head holds nested spans, and what
    matters is which element a button or a chip is *inside*, not which line it
    sits on.
    """

    VOID = {"input", "img", "br", "hr", "meta", "link"}

    def __init__(self) -> None:
        super().__init__()
        self.stack: list[dict] = []
        self.heads: list[dict] = []

    def handle_starttag(self, tag, attrs) -> None:
        a = dict(attrs)
        classes = set((a.get("class") or "").split())
        head = None
        if "panel-head" in classes:
            head = {
                "id": a.get("id") or "",
                "classes": classes,
                "chips": 0,
                "buttons": [],
            }
            self.heads.append(head)
        else:
            for frame in reversed(self.stack):
                if frame["head"] is not None:
                    head = frame["head"]
                    break
        if head is not None and "panel-head" not in classes:
            if "chip" in classes:
                head["chips"] += 1
            if tag == "button":
                head["buttons"].append(
                    {
                        "id": a.get("id") or "(no id)",
                        "classes": classes,
                        "label": a.get("aria-label") or "",
                    }
                )
        if tag not in self.VOID:
            self.stack.append({"tag": tag, "head": head if "panel-head" in classes else None})

    def handle_endtag(self, tag) -> None:
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index]["tag"] == tag:
                del self.stack[index:]
                return


def _panel_heads() -> list[dict]:
    parser = _PanelHeads()
    parser.feed((ROOT / "frontend" / "index.html").read_text(encoding="utf-8"))
    return parser.heads


def test_a_panel_head_is_identity_one_fact_and_actions_that_do_not_wrap() -> None:
    """DESIGN.md's recipe index, the row for a panel head.

    Reported twice about the same head, the Ask sub-tab's "AI answer": first
    "the ai answer with the ai model badge and the retry, copy and dictate read
    out loud buttons are misalligned because of wrap", then, about the tidier
    two-row result that answered it, "these buttons and badges wrap onto a new
    line and I want them restructured some other way".

    The recipe is the dock grammar applied to a panel head: identity, then at
    most one fact, then the actions, and the row does not wrap. What this lint
    holds is the two halves a future head is most likely to get wrong, because
    each of them looks harmless on its own:

    - **One chip.** A head's width is decided by the facts in it, and a second
      variable-length fact is a second thing with no rule about which of them
      gives way, which is precisely how the reported head came apart.
    - **One kind of control.** DESIGN.md, from the HIG: a group is all icons or
      all text, never mixed. The reported head was mixed (Retry and Copy
      carried labels, the speak button did not), and taking the labels off is
      what let the row fit a 356px column at 1024 (measured,
      `scratchpad/ui-sweeps/askhead.js`). An icon with no `aria-label` is not a
      control, so that is checked with it.

    The `nowrap` itself is checked in the stylesheet: it is one declaration and
    it has to be in 08-consistency.css, because `.chat-half h3` sets
    `flex-wrap: wrap` at (0,1,1) and a bare class in an earlier file loses to
    it whatever the source order (measured: the head stayed 88px tall).
    """
    heads = _panel_heads()
    assert heads, "no .panel-head found: this lint is looking at the wrong markup"
    for head in heads:
        name = head["id"] or "+".join(sorted(head["classes"] - {"panel-head"})) or "a .panel-head"
        assert head["chips"] <= 1, (
            f"{name} carries {head['chips']} chips. A panel head states one fact; "
            "a second one is a second claim on a width nobody has ruled on "
            "(DESIGN.md, the recipe index)"
        )
        labelled = [b for b in head["buttons"] if "icon-only" in b["classes"] or "icon-button" in b["classes"]]
        if head["buttons"]:
            assert len(labelled) == len(head["buttons"]), (
                f"{name} mixes icon-only and labelled buttons: "
                + ", ".join(b["id"] for b in head["buttons"] if b not in labelled)
                + " carry words. A group is all icons or all text (DESIGN.md, from the HIG)"
            )
        for button in labelled:
            assert button["label"], (
                f"{name}: {button['id']} is an icon with no aria-label, which is not a control"
            )

    css = (ROOT / "frontend" / "css" / "08-consistency.css").read_text(encoding="utf-8")
    head_rule = next(
        (body for selector, body in _rules(css) if "h3.answer-head" in selector),
        None,
    )
    assert head_rule is not None, (
        "the answer head's rule left 08-consistency.css. It has to be in the last "
        "stylesheet and it has to name the element: `.chat-half h3` sets "
        "flex-wrap: wrap at (0,1,1)"
    )
    assert "flex-wrap: nowrap" in head_rule, (
        "the answer head wraps again. The badge ellipsises; the row does not break"
    )


#: Every list row built on the list-row step, with the container whose rows
#: they are. DESIGN.md's recipe index names the shape; this is what has been
#: brought onto it. A new list joins the map rather than picking its own
#: height, and a row that drops the token fails here.
LIST_ROWS = {
    ".timeline-row": ".timeline-rows",
    ".bookmark-row": ".bookmark-list",
    #: The popup agent's starters (INBOX 231). The grid is both the list and
    #: the rows' only selector, so the container it is spaced by is itself.
    ".command-palette-examples": ".command-palette-examples",
}


def test_a_list_row_sits_on_the_list_row_tokens() -> None:
    """DESIGN.md's recipe index: a row in a list is `--row-h` and `--row-gap`.

    `--row-h` was declared for the Timeline and nothing else reached for it,
    so the next list picked its own numbers: the Library's saved links stood
    at 67.2px, or 89.2px once a link had a group, in a list whose gap was a
    spacing step chosen by hand. The token exists precisely so that two lists
    in one app do not answer "how tall is a row" differently.

    Both halves are checked, because a row height without the list's own gap
    is half the recipe: the row is the step and the gap between rows is the
    spacing that goes with it.
    """
    css = "\n".join(path.read_text(encoding="utf-8") for path in CSS)
    rows = {
        _leading_name(selector)
        for selector, body in _rules(css)
        if "var(--row-h)" in body
    }
    assert rows == set(LIST_ROWS), (
        f"rules using --row-h: {sorted(rows)}; rows this lint knows about: "
        f"{sorted(LIST_ROWS)}: a new list row joins LIST_ROWS (DESIGN.md, the "
        "recipe index)"
    )
    for row, container in LIST_ROWS.items():
        gaps = [
            body
            for selector, body in _rules(css)
            if _leading_name(selector) == container and "var(--row-gap)" in body
        ]
        assert gaps, (
            f"{row} sits on --row-h but {container} does not space its rows "
            "with --row-gap: the two are one recipe"
        )


#: The facts line: one short statement per fact, dot separated, on one rank.
#: The Files rows earned it, the picture cards and the saved links share it.
#: Each carries `.library-file-meta` for the rank and a handle of its own for
#: whatever its layout needs, so this is the set of handles.
FACTS_LINES = {".library-image-meta", ".bookmark-meta"}


def test_the_facts_line_is_one_rule_rather_than_three() -> None:
    """DESIGN.md's recipe index: a line of facts is `.library-file-meta`.

    Three surfaces in the Library say several short things about one object:
    a file row (kind, size, pages, added), a picture card (where it is used,
    what was read out of it) and a saved link (the site, the group, the note).
    Each report behind them was the same report, a column of one-line blocks
    each given a row of its own, so they get one answer. A copy of the rule
    under a second name is how the three drift apart again, and a copy always
    starts by restating the size.

    So: one rule sets the rank, every facts line is built by `metaLine()`, and
    a handle may position its line but never resize it.
    """
    css = "\n".join(path.read_text(encoding="utf-8") for path in CSS)
    shared = [
        selector
        for selector, body in _rules(css)
        if _leading_name(selector) == ".library-file-meta" and "font-size" in body
    ]
    assert len(shared) == 1, (
        "the facts line's rank should come from exactly one rule; found "
        f"{len(shared)}: {shared}"
    )
    js = "\n".join(path.read_text(encoding="utf-8") for path in JS)
    for line in FACTS_LINES:
        name = line[1:]
        beside = re.search(rf'"library-file-meta {name}"', js)
        through = re.search(rf'metaLine\([^;]*?"{name}"', js, re.S)
        assert beside or through, (
            f"{line} is a facts line but nothing builds it with the shared "
            "class: either pass the handle to metaLine() or put "
            f'"library-file-meta {name}" on the element, so the rank comes '
            "from the one rule (DESIGN.md, the recipe index)"
        )
    for line in FACTS_LINES:
        for selector, body in _rules(css):
            if _leading_name(selector) == line:
                assert "font-size" not in body, (
                    f"{selector.strip()} sets its own font size: a facts line "
                    "takes the shared rule's rank (DESIGN.md, the recipe index)"
                )


def _function_body(text: str, name: str) -> str:
    """The source of one top-level function, from its `function` to the next one.

    Crude on purpose: these lints ask what a named function *mentions*, and a
    brace-matching parse of 11,000 lines of JS to answer that would be a second
    thing to get wrong.
    """
    start = text.index(f"function {name}(")
    rest = text.index("\nfunction ", start + 1)
    return text[start:rest]


def test_a_list_row_answers_in_place_rather_than_opening_a_popover() -> None:
    """DESIGN.md's recipe index: a row you can act on expands, it does not pop.

    The report that earned the recipe (INBOX 142): "when I click on the issue
    from the suggestions thing, the box just appears right there in my face."
    The writing panel's rows had no answers of their own, so acting on one
    opened the floating word menu: measured at 1440x900, 335px of menu drawn
    over the 297px panel that asked for it, 70% of the window's height spent on
    one misspelled word, with the sentence being discussed behind both.

    Three halves of the fix, each one a thing a later session could undo
    without noticing:

    1. the panel's row builder must not reach for the floating menu again;
    2. the open row has to say so in the markup (`aria-expanded` on the
       control, `aria-current` on the row) and be painted from the attribute,
       or the mark is a colour and a colour is not a position;
    3. the answers must come from the one builder the menu also uses, because
       two sets of the same four actions is how the panel came to have none.
    """
    js = (ROOT / "frontend" / "documents.js").read_text(encoding="utf-8")
    css = "\n".join(path.read_text(encoding="utf-8") for path in CSS)

    for name in ("docProseGroupList", "docProseRowAnswers"):
        body = _function_body(js, name)
        assert "openDocSuggest" not in body, (
            f"{name} opens the floating word menu: a list row answers inside the "
            "list (DESIGN.md, the recipe index), it does not draw a popover over "
            "the text it is about"
        )

    rows = _function_body(js, "docProseGroupList")
    assert 'setAttribute("aria-expanded"' in rows, (
        "the writing panel's row control must carry aria-expanded: a row that "
        "opens something has to say whether it is open"
    )
    answers = _function_body(js, "docProseRowAnswers")
    assert 'aria-current", "location"' in answers, (
        "the open row must take aria-current=\"location\", the recipe index's "
        "mark for where you are inside a document"
    )
    assert "docSuggestAnswers(" in answers, (
        "the row's answers must come from docSuggestAnswers, the same builder "
        "the word menu uses: a second copy of those actions is how the two "
        "surfaces drifted apart in the first place"
    )
    assert "scrollIntoView(" not in answers, (
        "bring the open row into view with the panel's own scrollTop: "
        "scrollIntoView walks every scrolling ancestor, the page included "
        "(DESIGN.md, the recipe index)"
    )
    assert ".doc-prose-row[aria-current]" in css, (
        "the open row's paint must hang off [aria-current] so the mark and its "
        "announcement are one thing (DESIGN.md, the recipe index)"
    )


def test_every_selection_bar_is_one_sticky_recipe() -> None:
    """DESIGN.md's recipe index: a bar of actions for a selection sticks.

    INBOX 165, verbatim: "I want the selected bars to be sticky to the top of
    the screen when scrolling". Reported against the Library's own bar, and it
    was the same fault on all seven: the bar sits above the list it governs, so
    the moment you scroll far enough to tick a second item the actions for the
    first are off the screen (measured: the Notes bar at y=-465 with its list
    scrolled 677px).

    Two things a later diff could undo without anyone noticing, which is why
    they are a lint rather than a note:

    1. a new selection bar built without `selectbar` scrolls away again, and
       it will look right in every screenshot taken before the list is long
       enough to scroll;
    2. the sticky ground has to be stacked over an opaque base. The tint alone
       is a 14% wash, which reads correctly at rest on a card and turns into a
       window the moment the list moves under it. `.doc-toolbar` was reported
       for exactly that ("the bar is clear so it is hard to see").
    """
    markup = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    library = (ROOT / "frontend" / "library.js").read_text(encoding="utf-8")
    css = "\n".join(path.read_text(encoding="utf-8") for path in CSS)

    # Every bar in the markup that shows a selection count, by the two id
    # shapes the app uses for them. A bar built in JS is covered below.
    bars = re.findall(r'<div id="([\w-]*(?:selectbar|batch-bar))" class="([^"]*)"', markup)
    assert len(bars) >= 5, f"the selection bars have moved or been renamed: {bars}"
    for name, classes in bars:
        assert "selectbar" in classes.split(), (
            f"#{name} is a bar of actions for a selection and must carry the "
            "`selectbar` class (DESIGN.md, the recipe index): without it the bar "
            "scrolls away from the list it governs"
        )
        assert "library-contextbar" in classes.split(), (
            f"#{name} must wear the one selection-bar strip, not a bare .row: "
            "a selection is a selection wherever you make it"
        )

    assert 'bar.className = "library-contextbar selectbar hidden"' in library, (
        "createLibrarySelectbar builds the Boards and Links bars: they need the "
        "same recipe class as the ones in the markup"
    )

    sticky = re.search(r"\n\.selectbar \{(.*?)\n\}", css, re.S)
    assert sticky, ".selectbar's own rule is missing: the recipe has no sticky half"
    body = sticky.group(1)
    assert "position: sticky" in body, ".selectbar must be sticky (INBOX 165)"
    assert "--selectbar-top" in body, (
        "`top` must come from `--selectbar-top`: two sticky things in one "
        "scroller park in the same band (commit 27167e3), so a bar under a "
        "sub-tab strip has to stop below it"
    )
    assert "linear-gradient(var(--accent-soft), var(--accent-soft))" in body, (
        "the sticky ground must stack the tint over an opaque base: "
        "`--accent-soft` alone is a 14% wash and the list shows straight "
        "through it while it scrolls"
    )


def test_a_viewport_popup_leaves_the_surfaces_that_can_blur() -> None:
    """DESIGN.md's recipe index: a popup placed in window coordinates lives in
    the window's own frame, and proves it landed there.

    The report that earned the recipe (INBOX 168, with a screenshot): the word
    menu for "tets" drawn at the right edge of the window with its column cut
    off past it and its list under the bottom bar. The arithmetic was never
    wrong: `placeDocSuggest` clamps unconditionally, so the menu cannot leave
    the viewport by adding up badly. It was being laid out against something
    that is not the viewport. A `position: fixed` element takes its containing
    block from the nearest ancestor with a `filter`, `transform` or
    `backdrop-filter`, and `:root[data-bg-art="on"]:not([data-glass="off"])
    .card` gives the document card one whenever the background art is on.
    Measured at 1440x900 with the art on: the menu asked for `left 952, top
    322` and drew at `1245..1485, 399`, 45px past the right edge of the window
    and 53px from its word.

    Two halves, either of which a later session could drop without seeing
    anything move on a machine with the art switched off:

    1. the popup leaves the card while it is open and goes back on the way out;
    2. the placement measures what was drawn and corrects the difference, which
       is cause-agnostic: the next property CSS invents that creates a
       containing block is covered the day it ships.
    """
    js = (ROOT / "frontend" / "documents.js").read_text(encoding="utf-8")
    app = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")

    lifts = {
        "openDocSuggest": "docLiftToViewport(",
        "renderDocComplete": "docLiftToViewport(",
        "closeDocSuggest": "docReturnFromViewport(",
        "hideDocComplete": "docReturnFromViewport(",
    }
    for name, call in lifts.items():
        assert call in _function_body(js, name), (
            f"{name} must call {call.rstrip('(')}: a popup placed in window "
            "coordinates cannot be a descendant of a surface that blurs "
            "(DESIGN.md, the recipe index)"
        )

    # The placement goes through the helper rather than writing the numbers
    # itself, or the correction below is one function away from the code that
    # needs it.
    place = _function_body(js, "placeDocSuggest")
    assert "docPlaceFixed(" in place and "style.left" not in place, (
        "placeDocSuggest must place the menu through docPlaceFixed, which "
        "checks the menu landed where it was put (DESIGN.md, the recipe index)"
    )

    # Both of the app's viewport popups measure after placing. Compared by
    # position rather than by name: what matters is that the rect is read
    # *after* the first write, which is the whole of the correction.
    for text, name in ((js, "docPlaceFixed"), (app, "clampToolbarMenu")):
        body = _function_body(text, name)
        wrote = body.index(".style.left")
        assert "getBoundingClientRect()" in body[wrote:], (
            f"{name} sets a fixed popup's position and never checks it landed "
            "there: measure the rect after writing and correct by the "
            "difference (DESIGN.md, the recipe index)"
        )


def test_one_writing_finding_is_drawn_by_one_builder() -> None:
    """DESIGN.md's recipe index: the four surfaces of the writing suggestions
    draw one object one way.

    The report (INBOX 142): "the whole editor intelligence and auto correct and
    dictionary stuff needs a whole ux redesign". Four surfaces had grown
    separately and described one finding in three orders under five names. The
    line is built once (`docFindingLine`: dot, words, reason) and the answers
    are built once (`docSuggestAnswers`), so the panel row and the floating menu
    cannot drift apart again by being edited one at a time.
    """
    js = (ROOT / "frontend" / "documents.js").read_text(encoding="utf-8")

    for name in ("docProseGroupList", "openDocSuggest"):
        assert "docFindingLine(" in _function_body(js, name), (
            f"{name} must draw its finding with docFindingLine: one object, one "
            "drawing, in the panel and in the menu (DESIGN.md, the recipe index)"
        )
    for name in ("docProseRowAnswers", "openDocSuggest"):
        assert "docSuggestAnswers(" in _function_body(js, name), (
            f"{name} must take its answers from docSuggestAnswers: a second copy "
            "of those actions is how the panel came to have none (DESIGN.md, "
            "the recipe index)"
        )
    # The pieces of the line are made in exactly one place. A second
    # `doc-finding-dot` somewhere else is a second drawing of the same object,
    # whatever it looks like on the day it is written.
    for piece in ("doc-finding-dot", "doc-finding-words", "doc-finding-why"):
        assert js.count(f'"{piece}') + js.count(f"`{piece}") == 1, (
            f"{piece} is built in more than one place: a finding is drawn by "
            "docFindingLine alone (DESIGN.md, the recipe index)"
        )


#: **A surface says when its data did not arrive, and says it in one way.**
#:
#: Measured with every request failing (`scratchpad/ui-sweeps/vibefail.js`):
#: four surfaces drew their empty state, so a full notebook read "Your notebook
#: is empty", and the dashboard's tiles printed "0 this week" from arrays that
#: were empty because nothing had been read. Both are the app stating a fact
#: about the person's own notes on no evidence, which is the shape the owner
#: described as making an application untrustworthy.
#:
#: The floor rather than an exact list: a surface added later should be wired
#: too, and this fails the moment one is unwired, which is the direction that
#: matters. The names are here so a rename has to come past this test.
FAILING_SURFACES = {
    "frontend/app.js": ("notes", "timeline", "reminders"),
    "frontend/graph.js": ("map",),
    "frontend/graph-canvas.js": ("map",),
    "frontend/library.js": ("library",),
    "frontend/documents.js": ("documents",),
}


def test_every_wired_surface_still_reports_its_own_failures() -> None:
    for name, whats in FAILING_SURFACES.items():
        js = (ROOT / name).read_text(encoding="utf-8")
        for what in whats:
            assert f'"{what}"' in js and "surfaceFailed(" in js, (
                f"{name} no longer reports a failed read for {what!r}: a surface "
                "that cannot read its data must say so rather than draw its empty "
                "state (DESIGN.md, the recipe index)"
            )
        #: Paired, always. A surface that can enter the failed state and never
        #: leave it is worse than one that never enters it: the message stays
        #: over a working surface until the tab is rebuilt.
        assert "surfaceRecovered(" in js or "loadSurface(" in js, (
            f"{name} calls surfaceFailed with nothing that clears it again "
            "(DESIGN.md, the recipe index)"
        )


def test_the_failed_state_is_built_in_exactly_one_place() -> None:
    app = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    assert app.count('classList.add("is-failed")') == 1, (
        "the failed state is drawn by surfaceFailed alone; a second builder is "
        "how the empty states came to disagree in the first place"
    )
# --- two panes showing one document (DESIGN.md, "Two views of one document") --


def test_the_rendered_blocks_carry_the_line_they_came_from() -> None:
    """The split view's scroll map is a contract across two files: app.js's
    `renderMarkdown` writes `data-src-line` on every block it draws, and
    documents.js's `docScrollAnchors` reads it. Neither half is any use alone,
    and the failure when one goes is silent: the map finds no anchors, falls
    back to the scroll fraction, and the panes are a screenful apart again
    with nothing in the console to say why.

    Measured before the stamps existed: on a document of five sections with a
    table, a code fence and a list in each, the preview was 282, 292, 266, 404
    and 550px out at the five headings, growing downwards because every block
    that takes a different amount of room in the two panes shifts everything
    below it. With them: 0, 75, 0, 0, 0, and the 75 is the editor landing 21px
    short of where the probe asked it to scroll, not the map.
    """
    app_js = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    documents_js = (ROOT / "frontend" / "documents.js").read_text(encoding="utf-8")
    assert "dataset.srcLine = String(" in app_js, (
        "renderMarkdown must stamp each block with the source line it came "
        "from, or the split view has nothing to line its panes up by"
    )
    assert "dataset.srcLine" in documents_js, (
        "documents.js must read the stamps; a stamp nothing reads is dead "
        "markup on every surface that renders markdown"
    )
    anchors = _function_body(documents_js, "docScrollAnchors")
    assert "docPreviewLineShift" in anchors, (
        "the stamps count lines in the string the preview rendered, which has "
        "the title prepended and the frontmatter taken off: the shift has to "
        "be undone or every titled document lines up two lines out"
    )
    assert "lineBlockAt(" in _function_body(documents_js, "docSourceLineTop"), (
        "CodeMirror only renders the lines near the viewport, so coordsAtPos "
        "answers null for exactly the off-screen anchors this table is built "
        "from; lineBlockAt reads the height map, which covers the document"
    )
    sync = _function_body(documents_js, "syncDocScroll")
    assert "docScrollAnchors(" in sync and "docMapThroughAnchors(" in sync, (
        "the sync must go through the anchor map, with the scroll fraction "
        "kept only for the case where there are no anchors to read"
    )


# --- the guided tour (DESIGN.md, "A guided tour of the interface") ------------

TOUR_JS = ROOT / "frontend" / "tour.js"
TOUR_TABLE = re.compile(r"const TOUR_SECTIONS = \[(.*?)\n\];", re.S)
TOUR_STEP = re.compile(r"\{\s*target: \"([^\"]+)\",\s*side: \"([a-z]+)\",(.*?)\n      \}", re.S)


def _tour_steps() -> list[tuple[str, str, str]]:
    js = TOUR_JS.read_text(encoding="utf-8")
    table = TOUR_TABLE.search(js)
    assert table, "TOUR_SECTIONS not found in tour.js; has the tour's table moved?"
    steps = TOUR_STEP.findall(table.group(1))
    assert steps, "TOUR_SECTIONS declares no steps, or its step shape has changed"
    return steps


def test_every_tour_step_points_at_an_element_that_exists() -> None:
    """A step that names a selector nothing matches is a card pointing at
    nothing, and the app cannot tell you so: `querySelector` answers null and
    the step is silently dropped at runtime.

    The runtime drop is deliberate and is what keeps the tour honest on a
    narrow window (DESIGN.md's row: a hidden element loses its step and the
    counter renumbers). This lint is the other half: dropped because the
    control is hidden *right now* is correct, dropped because somebody renamed
    an id six months ago is a step nobody will ever see again, and only a read
    of the markup can tell the two apart.
    """
    markup = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    ids = set(re.findall(r'\sid="([^"]+)"', markup))
    missing = [
        target
        for target, _side, _rest in _tour_steps()
        if target.startswith("#") and target[1:] not in ids
    ]
    assert not missing, (
        "tour steps name elements that are not in index.html: "
        f"{sorted(missing)}. A step is a real element plus a sentence "
        "(DESIGN.md, the recipe index)"
    )


def test_every_tour_step_says_where_it_sits_and_what_it_says() -> None:
    """A step is a selector, a side and one sentence, and the side has to be
    one of the four the placer knows how to flip and clamp. A fifth spelling
    would fall through `tourCandidates` to the preferred side alone, which is
    how a card ends up over the thing it is describing."""
    for target, side, rest in _tour_steps():
        assert side in {"top", "bottom", "left", "right"}, (
            f"{target} asks for side {side!r}; the placer knows top, bottom, "
            "left and right"
        )
        assert "title:" in rest and "text:" in rest, (
            f"{target} has no title or no text: a step is an element plus a "
            "sentence (DESIGN.md, the recipe index)"
        )


def test_the_tour_card_is_placed_by_the_measure_and_correct_rule() -> None:
    """DESIGN.md: a popup placed in the window's own coordinates sets its
    position, measures it, and corrects by the difference.

    The same rule `docPlaceFixed` and `clampToolbarMenu` are held to above, and
    for the same measured reason: a `position: fixed` element takes its frame
    from the nearest ancestor carrying a `filter`, and `.card` carries one
    whenever the background art is on, which is how a word menu asked for
    `left: 952` and drew at 1245.
    """
    js = TOUR_JS.read_text(encoding="utf-8")
    body = _function_body(js, "tourPlaceFixed")
    wrote = body.index(".style.left")
    assert "getBoundingClientRect()" in body[wrote:], (
        "tourPlaceFixed sets a position and never checks it landed there: "
        "measure the rect after writing and correct by the difference "
        "(DESIGN.md, the recipe index)"
    )
    for name in ("tourPosition", "tourSpotlight"):
        assert "tourPlaceFixed(" in _function_body(js, name), (
            f"{name} must place through tourPlaceFixed, or the correction is "
            "one function away from the code that needs it"
        )


def test_the_tours_dim_never_covers_the_control_it_describes() -> None:
    """The point of the whole surface: the described control is the one bright
    thing on screen.

    A sheet over the page with a highlight drawn on the control is the shape
    this must not become, because the control is then behind a dim layer and
    the tour is the centred slide carousel with extra steps. The cut-out is
    `.tour-spot`: no background of its own, the dim spread out of it by its own
    `box-shadow`, and no pointer events, so nothing of the tour's is ever drawn
    on top of the thing being pointed at.
    """
    css = "\n".join(path.read_text(encoding="utf-8") for path in CSS)
    rule = re.search(r"\n\.tour-spot \{(.*?)\n\}", css, re.S)
    assert rule, ".tour-spot has no rule; has the tour's cut-out moved?"
    body = rule.group(1)
    assert "background: transparent" in body, (
        ".tour-spot must paint no background: the bright area is the page "
        "itself showing through the hole in the dim"
    )
    assert "pointer-events: none" in body, (
        ".tour-spot must not take pointer events: #tour-block is what stops "
        "the page being used mid-step"
    )
    assert "100vmax" in body and "var(--scrim)" in body, (
        "the dim is .tour-spot's own box-shadow, spread past the far corner "
        "of the window, in the app's scrim colour"
    )


def test_the_tours_dim_leaves_the_control_pressable() -> None:
    """The owner, 2026-09-20: "it doesnt let the user click the highglighted
    items". `#tour-block` was `inset: 0` with a background of its own, and
    `document.elementFromPoint` at the centre of all fifteen steps answered
    `tour-block` rather than the control: the tour pointed at Save and then ate
    the press, which teaches the person that Save is broken.

    The shape that cannot come back is one element over the whole window taking
    presses. The dim is four panels laid out around the hole, and the hole is
    left to the page, so the container itself must take no presses and the
    panels must take them instead.
    """
    css = "\n".join(path.read_text(encoding="utf-8") for path in CSS)
    block = re.search(r"\n\.tour-block \{(.*?)\n\}", css, re.S)
    assert block, ".tour-block has no rule; has the tour's press-catcher moved?"
    assert "pointer-events: none" in block.group(1), (
        ".tour-block spans the window, so it must take no presses itself: the "
        "four .tour-block-panel children take them and the hole between them "
        "is left to the control the step is about"
    )
    panel = re.search(r"\n\.tour-block-panel \{(.*?)\n\}", css, re.S)
    assert panel, (
        ".tour-block-panel has no rule: the dim is four panels around the "
        "hole (DESIGN.md, the recipe index)"
    )
    assert "pointer-events: auto" in panel.group(1), (
        "a .tour-block-panel is the thing that stops the page being used "
        "mid-step, so it has to take presses"
    )
    js = TOUR_JS.read_text(encoding="utf-8")
    panels = _function_body(js, "tourBlockPanels")
    for side in ("tour-block-top", "tour-block-right", "tour-block-bottom", "tour-block-left"):
        assert side in panels, (
            f"tourBlockPanels does not place {side}: all four are laid out "
            "from the cut-out's own rectangle, on every reflow, or the hole "
            "drifts off the control"
        )
    assert "tourBlockPanels(" in _function_body(js, "tourSpotlight"), (
        "the panels are placed by the one function that already runs on every "
        "reflow, or a scroll leaves them where the control used to be"
    )
    markup = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    assert markup.count('class="tour-block-panel"') == 4, (
        "the tour's dim is four panels around the hole, no more and no fewer"
    )


def test_the_tour_card_has_a_visible_way_out() -> None:
    """The owner, 2026-09-20: "it has no visible way to exit or quit it like a
    button or smth so I had to guess by pressing the escape button". Skip and
    Escape both ended the tour already; neither read as the exit, because Skip
    beside Back and Next reads as "not this part". The X in the card's head is
    where every other panel in this app keeps its close, and all three stay:
    they are one act reached three ways."""
    markup = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    close = re.search(r'<button id="tour-close"[^>]*>', markup, re.S)
    assert close, "the tour card has no #tour-close: the way out has to be visible"
    assert "icon-only" in close.group(0) and "ghost" in close.group(0), (
        "#tour-close is the app's own icon-only ghost button, not a new shape"
    )
    assert 'aria-label="Close the tour"' in close.group(0), (
        "an icon-only button says what it does in its accessible name"
    )
    js = TOUR_JS.read_text(encoding="utf-8")
    assert 'getElementById("tour-close")' in js and "tourClose(false)" in js, (
        "#tour-close must be wired to tourClose, or the button is a picture "
        "of a way out"
    )
    assert 'key === "Escape"' in js, "Escape still ends the tour"
    assert 'getElementById("tour-skip")' in js, "Skip stays: it is the same act"


def test_a_tour_step_waits_for_the_tab_it_switched_to() -> None:
    """A tab switch is not finished when `switchTab` resolves: the tab's own
    content is fetched after it, and for a beat the element the step names is
    in the DOM at zero height. Measuring once and dropping the step then is the
    owner's "it doesnt automatically switch pages on different steps" seen from
    outside: the steps that would have moved the tour quietly stop existing.

    And the guard that decides whether to switch at all reads the markup, not
    `localStorage`: a restore or a history step leaves the stored name and the
    painted tab disagreeing, and the tour then skips the switch.
    """
    js = TOUR_JS.read_text(encoding="utf-8")
    show = _function_body(js, "tourShow")
    assert "await tourWaitForTarget(" in show, (
        "tourShow must wait for the step's target before judging it missing, "
        "or a tab that loads its content costs every step inside it"
    )
    wait = _function_body(js, "tourWaitForTarget")
    assert "tourVisible(" in wait and "tourFrame(" in wait, (
        "the wait polls per frame for a visible target; a frame is when "
        "layout has settled"
    )
    assert "TOUR_WAIT_MS" in wait, "the wait has to end: a target that never arrives costs its step"
    navigate = _function_body(js, "tourNavigate")
    assert "tourActiveTab()" in navigate, (
        "which tab is showing is asked of the markup (tourActiveTab), never "
        "of localStorage alone, or the switch is skipped on a disagreement"
    )
    active = _function_body(js, "tourActiveTab")
    assert "#tab-bar" in active, "tourActiveTab reads the pressed tab button"


def test_a_tour_step_with_nothing_to_point_at_is_dropped() -> None:
    """A control hidden by a responsive rule, or gone from the markup, must
    cost its step rather than leave a card anchored to a zero-sized box in the
    corner of the window. Dropping it is also what keeps "3 of 7" true: the
    counter is drawn from the run's own length, which shrinks with it."""
    js = TOUR_JS.read_text(encoding="utf-8")
    show = _function_body(js, "tourShow")
    assert "tourVisible(" in show and "splice(" in show, (
        "tourShow must check the element is visible and drop the step when it "
        "is not (DESIGN.md, the recipe index)"
    )
    render = _function_body(js, "tourRender")
    assert "run.steps.length" in render, (
        "the counter must be drawn from the run's own length, or it promises "
        "steps the tour has already dropped"
    )


def test_a_new_tour_section_needs_no_new_code() -> None:
    """One table, or the replay strip and the tour disagree about what exists.

    DESIGN.md's row says a new subject is a section in TOUR_SECTIONS and never
    a second tour. That only holds while everything that offers the tour reads
    that table: the Settings buttons, and the run itself.
    """
    js = TOUR_JS.read_text(encoding="utf-8")
    for name in ("renderTourReplay", "tourStepsFor"):
        assert "TOUR_SECTIONS" in _function_body(js, name), (
            f"{name} must build itself from TOUR_SECTIONS, so a section added "
            "to that table arrives with no markup and no handler to write"
        )


# --- the phone top bar (UI_MODERNISATION_PLAN Phase 11 item 1) ---------------
#
# Below 600 the four everyday-and-session squares (theme, settings, lock,
# quit) become the rows of one `kebabMenu`, so the bar is three controls and
# fits 320 (it was six, and scrolled the page sideways by one button). The
# suite cannot measure that; `scratchpad/ui-sweeps/phonehead.js` does. What
# it can check is that the arrangement is the recipe's: the menu is built by
# `kebabMenu`, the swap is one stylesheet band, and nothing the desktop has
# is dropped rather than moved.

def test_the_phone_top_bar_menu_is_the_kebab_recipe_and_hides_nothing():
    app = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    start = app.index("function initPhoneHeaderMore()")
    body = app[start : app.index("initPhoneHeaderMore();", start)]
    assert "kebabMenu(" in body, "the phone header menu must be the kebabMenu recipe"
    for verb in ("toggleTheme()", "openSettingsModal()", "lockNow()", "quitApp()"):
        assert verb in body, f"the phone header menu lost {verb}, which the desktop bar has"

    css = (ROOT / "frontend" / "css" / "10-responsive.css").read_text(encoding="utf-8")
    band = css[css.index("Phase 11 item 1: the phone top bar") :]
    band = band[: band.index("}\n}") + 3]
    assert "@media (max-width: 599.98px)" in band
    for ident in ("#theme-btn", "#settings-btn", "#lock-btn", "#quit-btn"):
        assert ident in band, f"{ident} is not swapped for the menu on a phone"
    assert "#header-more" in band


def test_every_sidebar_gets_the_phone_opener_from_the_one_function():
    """Phase 11 items 2 and 3: below 600 the sidebar rail goes and each
    sidebar is opened from a `.dock-nav` button in its own head, mounted by
    `mountPhoneSidebarOpeners` for every id in `SIDEBAR_IDS`. A fourth
    sidebar added without a row here would keep a rail on the phone that
    the other three no longer have."""
    app = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    ids = re.search(r"const SIDEBAR_IDS = \[([^\]]*)\]", app)
    assert ids, "SIDEBAR_IDS is not where this lint expects it"
    sidebars = set(re.findall(r'"([^"]+)"', ids.group(1)))
    rows = re.search(r"const PHONE_SIDEBAR_OPENERS = \[(.*?)\n\];", app, re.S)
    assert rows, "PHONE_SIDEBAR_OPENERS is missing"
    covered = set(re.findall(r'aside: "([^"]+)"', rows.group(1)))
    assert covered == sidebars, f"sidebars without a phone opener: {sorted(sidebars - covered)}"
    css = (ROOT / "frontend" / "css" / "10-responsive.css").read_text(encoding="utf-8")
    band = css[css.index("Phase 11 items 2 and 3: no rail on a phone") :]
    for ident in sidebars:
        assert f"#{ident}:not(.sidebar-sheet-open)" in band, f"#{ident} keeps its rail on a phone"


def test_the_row_swipe_presses_the_rows_own_actions():
    """Phase 11 item 2, the HIG rule: a swipe action matches the row's menu.
    The swipe may only reach the star button the row shows and the one bin
    function the row menu's own item calls; a swipe that grew an action of
    its own would be the third copy of a verb, and the first one nobody can
    see."""
    app = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    start = app.index("function initRowSwipe(list, actions)")
    body = app[start : app.index("// --- the note page", start)]
    assert '".favourite-btn"' in body
    assert "binNoteWithUndo(" in body
    assert 'input[type="checkbox"]' in body, "the reminder swipe presses the row's own Done"
    assert "fetch(" not in body and "api(" not in body, "the swipe calls the row's actions, never the API"
    menu = app[app.index('label: "ph:trash Move to bin"') :][:200]
    assert "binNoteWithUndo(" in menu, "the menu row and the swipe must call the same function"
    assert "favourite-btn" in app[app.index("function favouriteButton(") :][:800]


def test_every_right_click_menu_has_a_long_press_twin():
    """Phase 11 item 9: a finger has no second button, so every contextmenu
    listener in app.js and documents.js is matched by a `wireLongPress`
    call opening the same thing. Counted per file, since the two are always
    written side by side. whiteboard.js and graph-canvas.js have their own
    contextmenu handlers and are the whiteboard and graph plans' files; they
    join this count when those plans' phone items land."""
    for name in ("app.js", "documents.js"):
        text = (ROOT / "frontend" / name).read_text(encoding="utf-8")
        right_clicks = len(re.findall(r'addEventListener\(\s*"contextmenu"', text))
        calls = len(re.findall(r"\bwireLongPress\(", text))
        holds = calls - (1 if name == "app.js" else 0)  # app.js holds the definition
        assert right_clicks == holds, f"{name}: {right_clicks} right-click menus, {holds} long-press twins"

# A `<details>` in index.html that heads no named family: prose disclosures in
# the Help guide, the chat's thinking boxes and the like, which take their
# summary from their own surroundings. Frozen, like the hand-built menus
# above: a folded group of settings is `details.settings-fold`, and a new
# unnamed one is a second disclosure shape nobody styled.
BARE_DISCLOSURES = 14

# The families 08-consistency.css dresses as "a heading with a chevron" rather
# than as a control in a row. Every one of its four disclosure rules has to
# name the same set: a family on the flat rule but not the chevron rule is a
# fold with no disclosure mark, and one on the chevron rule but not the hover
# rule loses its pointer feedback.
FOLD_RULES = (
    "> summary:not(.icon-only):not(.icon-button) {",
    "> summary::-webkit-details-marker",
    "> summary:not(.icon-only):not(.icon-button)::before",
    "> summary:not(.icon-only):not(.icon-button):hover",
)


def _fold_families(css: str, marker: str) -> set[str]:
    """The container classes named on the rule `marker` belongs to.

    The selector list runs from the end of whatever came before (a rule's
    closing brace) to this rule's opening one, with its own comments taken
    out: a comment above these rules quotes selectors while explaining them.
    """
    hit = css.index(marker)
    brace = css.index("{", hit)
    start = max(css.rfind("}", 0, hit), css.rfind("*/", 0, hit)) + 1
    block = re.sub(r"/\*.*?\*/", "", css[start:brace], flags=re.S)
    return set(re.findall(r"\.([a-z-]+)(?=(?:\[open\])? (?:details )?> summary)", block))


def test_a_folded_group_of_settings_is_the_shared_disclosure_recipe() -> None:
    """One fold, dressed in one place (DESIGN.md, the recipe index).

    The graph's display options panel grew back past its own cap (655px of
    list in a 488px box at 1440x900) and three of its six sections are set
    once and then left. Folding them is the recipe the Settings screen
    already has, `details.settings-fold`, and the point of this lint is that
    the next surface that needs a fold reaches for the same three words
    instead of writing a fourth summary of its own.
    """
    css = (ROOT / "frontend" / "css" / "08-consistency.css").read_text(encoding="utf-8")
    families = [_fold_families(css, marker) for marker in FOLD_RULES]
    for marker, named in zip(FOLD_RULES[1:], families[1:]):
        assert named == families[0], (
            f"the disclosure rule at `{marker}` names {sorted(named)} while the "
            f"flat-summary rule names {sorted(families[0])}; a fold family on one "
            "rule and not another is a fold with no chevron or no hover "
            "(DESIGN.md, the recipe index)"
        )
    assert "settings-fold" in families[0]

    raw = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    markup = re.sub(r"<!--.*?-->", "", raw, flags=re.S)
    bare = 0
    graph_folds = 0
    for attrs in re.findall(r"<details([^>]*)>", markup):
        found = re.search(r'class="([^"]*)"', attrs)
        classes = set(found.group(1).split()) if found else set()
        if "graph-options-fold" in classes:
            graph_folds += 1
            assert "settings-fold" in classes, (
                "a fold in the graph's options panel is the shared "
                "`details.settings-fold` recipe, not a shape of its own"
            )
        if not classes - {"hidden"}:
            bare += 1
    assert bare <= BARE_DISCLOSURES, (
        f"{bare} `<details>` elements in index.html name no family; a folded "
        "group of settings is `details.settings-fold` (DESIGN.md, the recipe "
        "index), and this count may only fall"
    )
    assert graph_folds == 3, (
        "the graph options panel's three tuned-once sections (Physics, Groups, "
        "Minimap) are folds; see GRAPH_PLAN.md, 'Decision made, 2026-09-20'"
    )
