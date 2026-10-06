"""The board's Format panel (WHITEBOARD_PLAN decision 19; the features audit 9.2 item 3).

The context bar keeps its seven controls per kind; the long tail (numbers for
place and size, angle, flip, opacity, shadow, a shape's text, a connector's
line shape, ends and label place) goes to one docked panel with three tabs,
hidden until asked for. What the source promises, tested here; the browser
half is `scratchpad/ui-sweeps/wb1005-format.js`.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
FORMAT = (ROOT / "frontend" / "js" / "whiteboard-format.js").read_text(encoding="utf-8")
BOARD = (ROOT / "frontend" / "js" / "whiteboard.js").read_text(encoding="utf-8")
COMMANDS = (ROOT / "frontend" / "js" / "whiteboard-commands.js").read_text(encoding="utf-8")
APP = (ROOT / "frontend" / "js" / "app.js").read_text(encoding="utf-8")


def _panel() -> str:
    start = INDEX.index('<aside id="wb-format"')
    return INDEX[start : INDEX.index("</aside>", start)]


def test_three_tabs_on_a_tabs_line_and_one_tabpanel() -> None:
    panel = _panel()
    strip = re.search(r'<div class="tabs-line wb-format-tabs" id="wb-format-tabs" role="tablist"[^>]*>(.*?)</div>', panel, re.S)
    assert strip, "the tabs are a .tabs-line (DESIGN.md: a second-level strip)"
    assert re.findall(r'data-format-tab="(\w+)"', strip.group(1)) == ["style", "text", "arrange"]
    assert "<i " not in strip.group(1), "second-level tabs are words only"
    assert 'role="tabpanel"' in panel
    assert re.findall(r'data-format-panel="(\w+)"', panel) == ["style", "text", "arrange"]


def test_every_control_is_named() -> None:
    panel = _panel()
    for tag in re.findall(r"<(?:input|select|button)\b[^>]*>", panel):
        assert "aria-label=" in tag or 'role="tab"' in tag, tag


def test_every_row_names_a_field_the_kinds_know() -> None:
    fields = set(re.findall(r'data-fmt="([\w-]+)"', _panel()))
    table = FORMAT[FORMAT.index("const WB_FMT_FIELDS") : FORMAT.index("};", FORMAT.index("const WB_FMT_FIELDS"))]
    known = set(re.findall(r'"([\w-]+)"', table))
    assert fields <= known, fields - known
    #: Every field a kind takes has a row to show.
    assert known - {"shape", "line", "link", "text", "image", "frame", "note"} <= fields


def test_one_change_is_one_undo_step() -> None:
    apply = FORMAT[FORMAT.index("async function wbFmtApply") :]
    apply = apply[: apply.index("\n}\n")]
    assert "wbRecordGesture(" in apply
    for name in ("wbFmtGeometry", "wbFmtFlip"):
        body = FORMAT[FORMAT.index(f"async function {name}") :]
        assert "wbRecordGesture(" in body[: body.index("\n}\n")], name


def test_ctrl_shift_p_is_the_boards_on_a_board() -> None:
    owns = BOARD[BOARD.index("function wbOwnsChord") :]
    owns = owns[: owns.index("\n}\n")]
    assert '["g", "p"]' in owns
    assert 'wbRunCommand("format-panel")' in BOARD
    assert re.search(r'id: "format-panel"[^}]*keys: "Ctrl\+Shift\+P"', COMMANDS)


def test_the_panel_opens_from_the_bar_and_the_view_menu() -> None:
    more = INDEX[INDEX.index('id="wb-context-menu"') :]
    assert 'data-wb-cmd="format-panel"' in more[: more.index("</div>")]
    view = INDEX[INDEX.index('id="wb-view-menu"') :]
    assert 'data-wb-cmd="format-panel"' in view[: 3000]


def test_the_arrange_buttons_come_from_the_command_table() -> None:
    buttons = FORMAT[FORMAT.index("function wbFormatCommandButtons") :]
    buttons = buttons[: buttons.index("\n}\n")]
    assert "WB_COMMAND_BY_ID.get(id)" in buttons
    for command in ("order-front", "order-forward", "order-backward", "order-back", "group", "lock", "distribute-h"):
        assert f'"{command}"' in buttons


def test_the_bundle_loads_the_panel_after_the_table() -> None:
    library = APP[APP.index("library: [") : APP.index("],", APP.index("library: ["))]
    assert library.index("/js/whiteboard-commands.js") < library.index("/js/whiteboard-format.js")


def test_opacity_and_shadow_are_kept_by_the_server(ai_client):
    board = ai_client.post("/whiteboard/boards", json={"name": "Format", "type": "board"}).json()
    made = ai_client.post("/whiteboard/objects", json={
        "kind": "text", "data": {"content": "Hi", "alpha": 0.5, "shadow": True, "bold": True},
        "board_id": board["id"], "x": 0, "y": 0, "width": 100, "height": 40,
    })
    assert made.status_code in (200, 201), made.text
    data = made.json()["data"]
    assert data["alpha"] == 0.5 and data["shadow"] is True and data["bold"] is True
    bad = ai_client.post("/whiteboard/objects", json={
        "kind": "text", "data": {"content": "Hi", "alpha": 0}, "board_id": board["id"], "x": 0, "y": 0, "width": 100, "height": 40,
    })
    assert bad.status_code == 422


def test_a_shapes_text_takes_size_weight_and_alignment() -> None:
    paint = BOARD[BOARD.index("function wbPaintShapeLabel") :]
    paint = paint[: paint.index("\n}\n")]
    for field in ("label_size", "label_bold", "label_italic", "label_align", "label_color"):
        assert f"parsed.{field}" in paint, field
