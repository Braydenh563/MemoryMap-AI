"""Every board action has one name, one key and one row in one table.

The features audit (2026-10-05, FEAT-07, FEAT-11, FEAT-19 and section 9.2):
the same z-order action had three names on three surfaces, Group and Lock
were missing from the Arrange menu, and nothing on a board could be found by
typing its name. `WB_COMMANDS` (frontend/js/whiteboard-commands.js) is the
table; the menus' rows name a command with `data-wb-cmd`, and this lint
holds each row's words and key to the table's, so renaming a control renames
it everywhere (standing order 13).
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMMANDS = (ROOT / "frontend" / "js" / "whiteboard-commands.js").read_text(encoding="utf-8")
INDEX = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
APP = (ROOT / "frontend" / "js" / "app.js").read_text(encoding="utf-8")
BOARD = (ROOT / "frontend" / "js" / "whiteboard.js").read_text(encoding="utf-8")


def _table() -> dict:
    block = COMMANDS[COMMANDS.index("const WB_COMMANDS = [") : COMMANDS.index("\n];\n", COMMANDS.index("const WB_COMMANDS = ["))]
    rows = {}
    for line in block.splitlines():
        found = re.search(r'\{ id: "([\w-]+)"', line)
        if not found:
            continue
        label = re.search(r'label: "([^"]+)"', line).group(1)
        menu = re.search(r'menu: "([^"]+)"', line)
        keys = re.search(r'keys: "([^"]*)"', line).group(1)
        rows[found.group(1)] = {"label": label, "menu": menu.group(1) if menu else label, "keys": keys}
    return rows


def test_the_table_reads() -> None:
    assert len(_table()) >= 40, "the palette is meant to list at least forty board commands"


def test_every_menu_row_says_what_its_command_says() -> None:
    table = _table()
    rows = re.findall(r'<button[^>]*data-wb-cmd="([\w-]+)"[^>]*>(.*?)</button>', INDEX)
    assert len(rows) >= 25, "the Edit and Arrange menus' rows have moved"
    wrong = []
    for command, inner in rows:
        assert command in table, f"data-wb-cmd={command!r} is not in WB_COMMANDS"
        words = re.search(r"<span>([^<]+)</span>", inner).group(1)
        key = re.search(r"<kbd>([^<]+)</kbd>", inner)
        if words != table[command]["menu"]:
            wrong.append(f"{command}: the row says {words!r}, the table {table[command]['menu']!r}")
        if (key.group(1) if key else "") != table[command]["keys"]:
            wrong.append(f"{command}: the row's key {key.group(1) if key else ''!r}, the table's {table[command]['keys']!r}")
    assert not wrong, "\n".join(wrong)


def test_the_arrange_menu_has_what_arranging_means() -> None:
    arrange = INDEX[INDEX.index('id="wb-arrange-menu"') :]
    arrange = arrange[: arrange.index('<div class="wb-board-menu-wrap">')]
    for command in ("group", "ungroup", "lock", "same-width", "same-height", "order-forward", "order-front"):
        assert f'data-wb-cmd="{command}"' in arrange, command


def test_the_bundle_loads_the_table_after_the_board() -> None:
    library = APP[APP.index("library: [") : APP.index("],", APP.index("library: ["))]
    assert library.index("/js/whiteboard.js") < library.index("/js/whiteboard-commands.js")


def test_the_palette_and_the_sheet_read_the_table() -> None:
    panes = (ROOT / "frontend" / "js" / "settings-panes.js").read_text(encoding="utf-8")
    wiring = (ROOT / "frontend" / "js" / "settings-wiring.js").read_text(encoding="utf-8")
    assert "wbPaletteCommands()" in panes
    assert "renderWbShortcutSheet(" in wiring
    assert 'id="shortcut-list-whiteboard"' in INDEX


def test_menu_rows_run_through_the_table() -> None:
    assert "wbRunCommand(item.dataset.wbCmd)" in BOARD
