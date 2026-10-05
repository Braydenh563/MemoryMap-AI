"""A board in and out as text (the features audit W5; WHITEBOARD_PLAN Phase E).

Mermaid out and in, a free board's outline, and the board inside its own SVG.
The pure parts run in node against the source; the browser half is
`scratchpad/ui-sweeps/wb1005-interchange.js`.
"""

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "frontend" / "js" / "whiteboard-interchange.js").read_text(encoding="utf-8")
BOARD = (ROOT / "frontend" / "js" / "whiteboard.js").read_text(encoding="utf-8")
INDEX = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")


def _run(expr: str):
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not installed")
    pure = SOURCE[: SOURCE.index("//: The rows inside an SVG")]
    out = subprocess.run([node, "-e", pure + f"\nconsole.log(JSON.stringify({expr}));"], capture_output=True, text=True, check=True)
    return json.loads(out.stdout.strip())


def test_the_flowchart_subset_parses() -> None:
    src = "flowchart LR\nA[Start] --> B{Is it OK?}\nB -->|yes| C((Done))\nB -- no --> D(Fix it) --> B\nstyle A fill:#f9f\nF[\"Quoted\"] -.-> A; G --- A"
    g = _run(f"wbMermaidParse({json.dumps(src)})")
    assert g["dir"] == "LR"
    assert {n["id"]: (n["text"], n["shape"]) for n in g["nodes"]} == {
        "A": ("Start", "rect"), "B": ("Is it OK?", "diamond"), "C": ("Done", "circle"),
        "D": ("Fix it", "rect"), "F": ("Quoted", "rect"), "G": ("G", "rect"),
    }
    edges = {(e["from"], e["to"]): (e["label"], e["arrow"], e["dashed"]) for e in g["edges"]}
    assert edges[("B", "C")] == ("yes", True, False)
    assert edges[("B", "D")] == ("no", True, False)
    assert edges[("D", "B")] == ("", True, False)
    assert edges[("F", "A")] == ("", True, True)
    assert edges[("G", "A")] == ("", False, False)
    assert g["skipped"] == 1


def test_the_layout_puts_each_level_on_its_own_row() -> None:
    at = _run('Object.fromEntries(wbMermaidLayout(wbMermaidParse("graph TD\\nA-->B\\nA-->C\\nB-->D")))')
    assert at["A"]["y"] < at["B"]["y"] == at["C"]["y"] < at["D"]["y"]
    assert at["B"]["x"] != at["C"]["x"]


def test_a_board_round_trips_through_mermaid() -> None:
    state = {
        "nodes": [],
        "objects": [{"id": 1, "kind": "text", "data": {"content": "Hi [x]"}, "x": 0, "y": 0}],
        "sketches": [
            {"id": 5, "data": json.dumps({"d": "M 0 0 L 10 0 Z", "shape": "diamond", "label": "OK?"})},
            {"id": 6, "data": json.dumps({"type": "link-straight", "sourceId": 1, "sourceKind": "object", "targetId": 5, "targetKind": "sketch", "endCap": "arrow", "label": "go"})},
        ],
    }
    text = _run(f"wbBoardToMermaid({json.dumps(state)})")
    assert text.startswith("flowchart TD\n") and '{"OK?"}' in text and "-->|go|" in text
    back = _run(f"wbMermaidParse({json.dumps(text)})")
    assert [n["text"] for n in back["nodes"]] == ["Hi x", "OK?"]
    assert back["edges"][0]["label"] == "go"


def test_a_free_board_outlines_by_frame_then_reading_order() -> None:
    state = {
        "nodes": [],
        "objects": [
            {"id": 1, "kind": "text", "data": {"content": "Second"}, "x": 10, "y": 50},
            {"id": 2, "kind": "text", "data": {"content": "First"}, "x": 10, "y": 10},
            {"id": 3, "kind": "text", "data": {"content": "Outside"}, "x": 900, "y": 900},
        ],
        "sketches": [],
    }
    frames = [{"x": 0, "y": 0, "width": 200, "height": 200, "data": {"content": "Ideas"}}]
    text = _run(f"wbBoardOutline({json.dumps(state)}, {{ frames: {json.dumps(frames)}, title: 'Plan' }})")
    assert text.split("\n")[:7] == ["# Plan", "", "## Ideas", "", "- First", "- Second", ""]
    assert "## Elsewhere on the board" in text and "- Outside" in text


def test_the_svg_carries_the_board_and_the_paths_are_wired() -> None:
    assert "wbBoardSvgMetadata(wbExportRows(scope))" in BOARD
    assert 'value: "mermaid"' in BOARD and 'value: "outline"' in BOARD
    assert "(!f.board || !isMap)" in BOARD
    assert 'data-wb-cmd="import-diagram"' in INDEX and 'id="wb-import-dialog"' in INDEX
    meta = _run('wbBoardSvgMetadata([{kind: "sketch", id: 1, payload: {data: "<x>&"}}])')
    assert meta.startswith('<metadata id="memorymap-board">') and "<x>" not in meta
