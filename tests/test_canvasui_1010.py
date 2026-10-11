"""The canvasui brief (INBOX 790 to 794): the Library bundle's canvases and
the sticky strips they share."""

import re
from pathlib import Path

from tests._css_paths import CSS_FILES

ROOT = Path(__file__).resolve().parents[1]
CSS = "\n".join(p.read_text(encoding="utf-8") for p in CSS_FILES)


def test_a_stuck_sub_tab_strip_is_opaque_full_height_and_edged():
    """INBOX 790: "the sub menu bars are a little hard to see and access as
    they are so short height wise". The strip a list scrolls under is opaque
    (a translucent card let the notes show through), its tabs are a body
    control tall, and its hairline is the measured 3:1 one."""
    rule = re.search(r'\.library-subtabs\[data-scrolled="1"\] \{([^}]*)\}', CSS)
    assert rule and "background: var(--modal-bg-opaque)" in rule.group(1)
    assert "backdrop-filter" not in rule.group(1)
    button = re.search(r"\.tabs-line > button \{([^}]*?)\}", CSS, re.S)
    assert button and "height: max(var(--control-h-body), var(--target-min))" in button.group(1)
    edge = re.search(r'\.library-subtabs\[data-scrolled="1"\] \{\s*box-shadow:([^}]*)\}', CSS)
    assert edge and "inset 0 -1px 0 var(--ghost-btn-border)" in edge.group(1)


def test_a_topics_add_buttons_are_surfaces_at_the_target_floor():
    """INBOX 791: the `+` and the library button on a node were transparent
    28px ghosts. A card surface, a hairline, `--target-min` (44 on touch), a
    body-size glyph, one size at every zoom, and a link glyph for the
    reference (a bookmarks glyph read as "copy")."""
    lazy = (ROOT / "frontend" / "css" / "library-lazy.css").read_text(encoding="utf-8")
    box = re.search(r"\.wb-map-actions > button:not\(#wb-map-actions-row\) \{([^}]*)\}", lazy)
    assert box
    for want in ("width: var(--target-min)", "height: var(--target-min)", "background: var(--modal-bg-opaque)", "border: 1px solid var(--ghost-btn-border)"):
        assert want in box.group(1), want
    assert re.search(r"\.wb-map-actions \{\s*transform: scale\(var\(--wb-inv-zoom\)\)", lazy)
    js = (ROOT / "frontend" / "js" / "whiteboard-map.js").read_text(encoding="utf-8")
    assert '"ph ph-link-simple"' in js and "bookmarks-simple" not in js
    wb = (ROOT / "frontend" / "js" / "whiteboard.js").read_text(encoding="utf-8")
    assert '".wb-map-actions"' in wb


def test_the_board_layers_are_rasterised_again_when_a_zoom_settles():
    wb = (ROOT / "frontend" / "js" / "whiteboard.js").read_text(encoding="utf-8")
    refresh = wb[wb.index("function wbRefreshRaster") :][:600]
    assert 'style.willChange = "auto"' in refresh and 'style.willChange = ""' in refresh
    publish = wb[wb.index("function wbPublishInvZoom") :][:200]
    assert "wbRefreshRaster()" in publish


def _fn(js: str, name: str, span: int = 2500) -> str:
    return js[js.index(f"function {name}") :][:span]


def test_outline_rows_read_until_asked_to_be_edited():
    """INBOX 792: "i dont think i should be typing in these outline options in
    the sidebar unless i like double click on them or press an edit button".
    A row is read-only; a double click, F2, Enter or its pencil opens it, Enter
    saves and Escape puts the old name back."""
    js = (ROOT / "frontend" / "js" / "whiteboard-map.js").read_text(encoding="utf-8")
    row = _fn(js, "wbOutlineRowEl", 2200)
    assert "field.readOnly = true;" in row and "wb-outline-edit" in row
    assert "readOnly = false" in _fn(js, "wbOutlineEdit")
    stop = _fn(js, "wbOutlineStopEdit")
    assert "cancel" in stop and "wbMapLabel(row._node)" in stop
    keys = js[js.index('getElementById("wb-outline-tree")?.addEventListener("keydown"') :][:2600]
    assert 'event.key === "F2"' in keys and 'event.key === "Escape"' in keys
    assert "wbOutlineStopEdit(row, { cancel: true })" in keys
    assert 'addEventListener("dblclick"' in js[js.index("wbOutlineEdit(row)") - 600 :][:1400] or "dblclick" in js
    mirror = js[js.index('getElementById("wb-outline-tree")?.addEventListener("input"') :][:300]
    assert "wbOutlineEditing(row)" in mirror
    css = (ROOT / "frontend" / "css" / "library-lazy.css").read_text(encoding="utf-8")
    assert "#wb-outline-tree .wb-outline-row.is-editing > .wb-outline-text" in css


def test_this_map_tab_is_tiles_actions_and_a_help_popover():
    """INBOX 791: "this side tab looks a little messy". The counts are
    number-over-label tiles two across (one builder with the stats dialog),
    the actions are one group of quiet buttons, and the Library hint is the
    help popover recipe."""
    js = (ROOT / "frontend" / "js" / "whiteboard-map.js").read_text(encoding="utf-8")
    lib = (ROOT / "frontend" / "js" / "whiteboard-library.js").read_text(encoding="utf-8")
    assert "wbMapStatsList(wbMapStats(wbMapIndex()), { tiles: true })" in lib
    assert "function wbMapStatsList(stats, { tiles = false } = {})" in js
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    panel = html[html.index('data-side-panel="map"') :]
    panel = panel[: panel.index("</section>")]
    assert 'class="wb-side-actions"' in panel and 'data-help-for="wb-side-map-help"' in panel
    assert "wb-menu-item" not in panel, "the actions are buttons, not menu rows"
    for button in ("wb-side-map-look", "wb-side-map-expand", "wb-side-map-tidy"):
        assert f'class="ghost small" id="{button}"' in panel
    css = (ROOT / "frontend" / "css" / "library-lazy.css").read_text(encoding="utf-8")
    assert re.search(r"\.wb-map-stat-grid \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)", css)


def test_a_fit_goes_into_the_canvas_the_person_can_see():
    """INBOX 792: "the fitting to screen features ... should be based on what
    panels are currently showing and the screen resolution/size". The fit and
    the centring use the free area (the canvas box less the top bar, tools dock,
    sidebar and Format panel, each off the side it sits on), and a view still
    where the last fit put it is fitted again when a panel opens, closes or
    the window changes size; a pan or a zoom of the person's own ends that."""
    js = (ROOT / "frontend" / "js" / "whiteboard.js").read_text(encoding="utf-8")
    assert 'const WB_FIT_OCCLUDERS = ["#wb-topbar", "#wb-tools-panel", "#wb-sidebar", "#wb-format"];' in js
    fit = _fn(js, "wbZoomToFit", 1800)
    assert "wbFreeArea(container)" in fit and "container.getBoundingClientRect()" not in fit
    assert "wbFit.on = true" in fit
    center = _fn(js, "wbCenterOn", 900)
    assert "wbFreeArea(container)" in center
    zoom = _fn(js, "handleWbZoom", 400)
    assert "e.sourceEvent" in zoom and "wbFit.on = false" in zoom
    assert 'for (const id of ["whiteboard-container", "wb-sidebar", "wb-format", "wb-tools-panel"])' in js
    assert "setTimeout(wbRefitIfFitted, 200)" in js



def _menu(html: str, menu_id: str) -> str:
    start = html.index(f'<div id="{menu_id}"')
    return html[start : html.index('<input type="file" id="wb-bg-image-input"', start) if menu_id == "wb-view-menu" else html.index('<span class="wb-topbar-divider"', start)]


def test_the_board_menu_is_section_heads_and_plain_icon_rows_with_delete_last_and_red():
    """INBOX 793: no "label ... action" rows ("This board itself ... Delete")."""
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    menu = _menu(html, "wb-board-menu")
    assert "wb-menu-row" not in menu and "wb-panel-danger" not in menu
    heads = re.findall(r'wb-panel-group-label">([^<]+)<', menu)
    assert heads == ["Boards", "This board", "Help", "Remove"]
    for button_id in ("wb-export", "wb-board-kind", "wb-add-to-note", "wb-map-to-doc", "wb-map-study", "wb-copy-link", "wb-clear-board", "wb-delete-board"):
        assert re.search(rf'<button id="{button_id}"[^>]*class="wb-menu-item', menu), button_id
    rows = re.findall(r'<button[^>]*id="(wb-[a-z-]+)"[^>]*>', menu)
    assert rows[-1] == "wb-delete-board", "what destroys is last"
    assert menu.count("wb-menu-danger") == 2


def test_the_view_menu_is_one_column_in_three_named_groups():
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    menu = _menu(html, "wb-view-menu")
    groups = re.findall(r'role="group" aria-label="([^"]+)"', menu)
    assert groups == ["Panels", "Canvas", "Map", "Zoom"]
    assert re.findall(r'wb-panel-group-label">([^<]+)<', menu) == ["Panels", "Canvas", "Map", "Zoom"]
    css = "\n".join(p.read_text(encoding="utf-8") for p in CSS_FILES)
    assert "#wb-view-menu {" not in css, "the two columns are gone"
    assert "wb-menu-one-col" not in css
    lazy = (ROOT / "frontend" / "css" / "library-lazy.css").read_text(encoding="utf-8")
    assert ".wb-board-menu :is(.wb-menu-item, .wb-menu-row) {\n  min-height: max(2.25rem, var(--target-min));" in lazy
    assert ".wb-board-menu .wb-menu-item.wb-menu-danger" in lazy


def test_a_library_tile_draws_what_placing_it_makes():
    """INBOX 794: the board Library's shape tiles drew every ink as the page's
    text colour, a faint fill lifted to 18% and one hairline, so with a cyan pen
    a placed shape was cyan and its tile was grey. `placed` resolves the ink to
    the pen's, and keeps the payload's own fill opacity, width and dash (the
    board's own dash ratios). Run against the shipped shapes and the board's
    own `wbDashArray`."""
    import json
    import shutil
    import subprocess

    import pytest

    node = shutil.which("node")
    if not node:
        pytest.skip("node is not installed")
    templates = (ROOT / "frontend" / "js" / "whiteboard-templates.js").read_text(encoding="utf-8")
    board = (ROOT / "frontend" / "js" / "whiteboard.js").read_text(encoding="utf-8")

    def fn(src: str, name: str) -> str:
        start = src.index(f"function {name}(")
        return src[start : src.index("\n}\n", start) + 3]

    shapes = json.loads((ROOT / "frontend" / "board-library" / "general.json").read_text(encoding="utf-8"))["items"][:6]
    dashed = {"box": {"w": 100, "h": 100}, "items": [{"key": "a", "kind": "sketch", "data": {"d": "M 0 0 L 90 0", "color": "ink", "width": 4, "dash": "dashed"}}]}
    dotted = json.loads(json.dumps(dashed).replace("dashed", "dotted"))
    payloads = [s["payload"] for s in shapes] + [dashed, dotted]
    script = (
        fn(templates, "wbThumbRound") + fn(templates, "wbBoardThumbSpec") + fn(board, "wbDashArray")
        + f"const P = {json.dumps(payloads)};"
        + "console.log(JSON.stringify({"
        + "placed: P.map((p) => wbBoardThumbSpec(p, { placed: true, ink: '#00bcd4' }).parts.filter((x) => x.tag === 'path').map((x) => x.a)),"
        + "plain: P.map((p) => wbBoardThumbSpec(p).parts.filter((x) => x.tag === 'path').map((x) => x.a)),"
        + "dash: [wbDashArray('dashed', 4), wbDashArray('dotted', 4)]"
        + "}));"
    )
    out = json.loads(subprocess.run([node, "-e", script], capture_output=True, text=True, check=True).stdout)
    for payload, placed, plain in zip(payloads, out["placed"], out["plain"]):
        sketches = [i for i in payload["items"] if i["kind"] == "sketch"]
        for item, tile, old in zip(sketches, placed, plain):
            data = item["data"]
            if data.get("color") == "ink":
                assert tile["stroke"] == "#00bcd4" and old["stroke"] == "currentColor"
            if data.get("fill") == "ink":
                assert tile["fill"] == "#00bcd4"
                assert tile["fill-opacity"] == str(data["fillOpacity"]), "the tile lifts no fill"
            if data.get("width"):
                assert tile["stroke-width"] == data["width"]
    dashes = [tile.get("stroke-dasharray") for tile in out["placed"][-2] + out["placed"][-1]]
    assert dashes == out["dash"], dashes
