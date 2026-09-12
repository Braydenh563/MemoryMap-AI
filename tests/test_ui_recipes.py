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
    token = re.split(r"[\s>+~:\[]", selector, 1)[0]
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
