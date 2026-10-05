"""Mermaid flowcharts drawn without Mermaid (DOCUMENTS_PLAN decisions 20.3 and
20.6, the audit's D3).

The marked region of documents.js (`DOC-MERMAID-BEGIN` to `-END`) is pure: it
reads a fence, lays the chart out in layers and describes the SVG as plain
objects. Node runs it here. The rule worth a test above all is the fallback:
anything the subset does not read whole stays code, so nothing is ever drawn
half right.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
DOCUMENTS_JS = ROOT / "frontend" / "js" / "documents.js"


def _run(body: str):
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not installed")
    text = DOCUMENTS_JS.read_text(encoding="utf-8")
    region = text[text.index("// DOC-MERMAID-BEGIN") : text.index("// DOC-MERMAID-END")]
    assert "document." not in region and "window." not in region, "the region reached for the DOM"
    #: A file, not `node -e`: the conftest's installer guard refuses any argv
    #: with "pip" in it, and the parser's own words ("piped") would trip it.
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as handle:
        handle.write(region + "\n" + body)
    try:
        out = subprocess.run([node, handle.name], capture_output=True, text=True, timeout=30, check=True)
    finally:
        Path(handle.name).unlink(missing_ok=True)
    return json.loads(out.stdout)


def _parse(src: str):
    return _run(f"console.log(JSON.stringify(mermaidFlowParse({json.dumps(src)})));")


def test_nodes_shapes_links_and_labels_are_read():
    g = _parse("flowchart LR\n  A[Start] --> B{Ready?}\n  B -->|yes| C([Go])\n  B -- no --> D((Wait))\n  D -.-> A\n  C ==> E{{Done}}\n")
    assert g["dir"] == "LR"
    shapes = {n["id"]: (n["shape"], n["text"]) for n in g["nodes"]}
    assert shapes == {
        "A": ("rect", "Start"), "B": ("diamond", "Ready?"), "C": ("stadium", "Go"),
        "D": ("circle", "Wait"), "E": ("hexagon", "Done"),
    }
    edges = [(e["from"], e["to"], e["style"], e["arrow"], e["label"]) for e in g["edges"]]
    assert edges == [
        ("A", "B", "solid", True, ""), ("B", "C", "solid", True, "yes"), ("B", "D", "solid", True, "no"),
        ("D", "A", "dotted", True, ""), ("C", "E", "thick", True, ""),
    ]


def test_chains_fans_quotes_comments_and_ignored_lines():
    g = _parse('graph TD\n%% a comment\na & b --> c --- d\nc --> e["Quoted (text)"]\nstyle a fill:#f9f\nclassDef x fill:#fff\n')
    edges = [(e["from"], e["to"], e["arrow"]) for e in g["edges"]]
    assert edges == [("a", "c", True), ("b", "c", True), ("c", "d", False), ("c", "e", True)]
    assert next(n for n in g["nodes"] if n["id"] == "e")["text"] == "Quoted (text)"
    assert _parse("graph TB\nnode-1-->node-2")["edges"][0]["from"] == "node-1"


def test_what_the_subset_does_not_read_stays_code():
    for src in (
        "sequenceDiagram\nA->>B: hi",
        "flowchart TD\nsubgraph one\na-->b\nend",
        "flowchart TD\nA --> ",
        "flowchart TD\nA[unclosed --> B",
        "",
        "pie\n\"a\": 1",
    ):
        assert _parse(src) is None, src


def test_the_layout_ranks_down_the_flow_and_mirrors_for_bt_and_rl():
    body = """
const out = {};
for (const dir of ["TD", "BT", "LR", "RL"]) {
  const g = mermaidFlowParse(`flowchart ${dir}\\nA-->B\\nB-->C\\nA-->C\\nC-->A`);
  const l = mermaidFlowLayout(g);
  const at = Object.fromEntries(l.boxes.map((b) => [b.id, [b.x, b.y]]));
  out[dir] = { at, w: l.width, h: l.height, lines: l.lines.length };
}
console.log(JSON.stringify(out));
"""
    out = _run(body)
    td, bt, lr, rl = out["TD"]["at"], out["BT"]["at"], out["LR"]["at"], out["RL"]["at"]
    assert td["A"][1] < td["B"][1] < td["C"][1], td
    assert bt["A"][1] > bt["B"][1] > bt["C"][1], bt
    assert lr["A"][0] < lr["B"][0] < lr["C"][0], lr
    assert rl["A"][0] > rl["B"][0] > rl["C"][0], rl
    assert out["TD"]["lines"] == 4


def test_the_svg_tree_names_itself_and_holds_text_as_text():
    body = """
const g = mermaidFlowParse('flowchart TD\\nA["<b>bold</b>"] -->|go| B');
const t = mermaidFlowSvgTree(g, mermaidFlowLayout(g), mermaidFlowSummary(g));
const texts = [];
const walk = (n) => { if (n.text != null) texts.push([n.tag, n.text]); n.kids.forEach(walk); };
walk(t);
console.log(JSON.stringify({ tag: t.tag, role: t.attrs.role, label: t.attrs["aria-label"], texts }));
"""
    out = _run(body)
    assert out["tag"] == "svg" and out["role"] == "img"
    assert out["label"] == "Flowchart of 2 steps: <b>bold</b> to B (go)"
    assert ["text", "<b>bold</b>"] in out["texts"] and ["text", "go"] in out["texts"]
