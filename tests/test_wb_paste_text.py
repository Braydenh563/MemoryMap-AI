"""Text pasted onto a board becomes items (FEAT-09).

The features audit: a three-line paste onto a board left three items three
(`wb1.js`): the board's Ctrl+V read only its own clipboard and swallowed the
key, so the browser's paste never arrived. `wbPastePlan` is the pure rule: a
link becomes a link box, one line a text box, several lines a grid of
stickies (more than fifty, one text box). The browser half is
`scratchpad/ui-sweeps/wb1005-paste.js`.
"""

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "frontend" / "js" / "whiteboard.js").read_text(encoding="utf-8")


def _function(name: str) -> str:
    start = SOURCE.index(f"function {name}(")
    return SOURCE[start : SOURCE.index("\n}\n", start) + 3]


def _plan(text: str):
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not installed")
    script = _function("wbPastedLines") + _function("wbPastePlan") + f"\nconsole.log(JSON.stringify(wbPastePlan({json.dumps(text)})));\n"
    out = subprocess.run([node, "-e", script], capture_output=True, text=True, check=True)
    return json.loads(out.stdout.strip())


def test_a_list_becomes_stickies_without_its_marks() -> None:
    assert _plan("- one\n- two\n- three") == {"kind": "stickies", "lines": ["one", "two", "three"]}
    assert _plan("1. alpha\r\n2) beta\n\n") == {"kind": "stickies", "lines": ["alpha", "beta"]}


def test_one_line_is_a_text_box_and_a_url_a_link() -> None:
    assert _plan("  just a thought  ") == {"kind": "text", "text": "just a thought"}
    assert _plan("https://example.com/a") == {"kind": "link", "url": "https://example.com/a"}


def test_nothing_and_a_flood() -> None:
    assert _plan(" \n \n") is None
    many = "\n".join(f"line {i}" for i in range(60))
    assert _plan(many)["kind"] == "text"


def test_the_keys_let_the_browser_paste_through() -> None:
    keys = SOURCE[SOURCE.index('e.key.toLowerCase() === "v") {') :][:600]
    assert "preventDefault" not in keys.split("return;")[0]
    assert 'document.addEventListener("paste"' in SOURCE
    assert "wbPasteText(text" in SOURCE
