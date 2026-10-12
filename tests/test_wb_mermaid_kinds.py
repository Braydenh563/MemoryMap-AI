"""Mermaid in, beyond the flowchart: state, class and sequence diagrams
(INBOX 797, canvasdepth; WHITEBOARD_PLAN "canvasdepth, ranked" row 2).

A diagram pasted from a document or an assistant is as often a sequence or a
class diagram as a flowchart, and the board said "No flowchart found". The
parsers are pure and run in node; the browser half is
`scratchpad/ui-sweeps/wbmermaidkinds.js`.
"""

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "frontend" / "js" / "whiteboard-interchange.js").read_text(encoding="utf-8")


def _run(expr: str):
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not installed")
    pure = SOURCE[: SOURCE.index("//: The rows inside an SVG")]
    out = subprocess.run([node, "-e", pure + f"\nconsole.log(JSON.stringify({expr}));"], capture_output=True, text=True, check=True)
    return json.loads(out.stdout.strip())


def test_the_kind_is_read_from_the_first_line() -> None:
    for src, kind in [("flowchart TD\nA-->B", "flowchart"), ("graph LR", "flowchart"), ("%% c\nstateDiagram-v2\n[*] --> A", "state"),
                      ("classDiagram\nA <|-- B", "class"), ("sequenceDiagram\nA->>B: hi", "sequence"), ("pie\n", None), ("", None)]:
        assert _run(f"wbMermaidKind({json.dumps(src)})") == kind, src


def test_a_state_diagram_parses_to_a_graph() -> None:
    src = 'stateDiagram-v2\n[*] --> Still\nStill --> Moving : push\nMoving --> Still\nMoving --> Crash\nCrash --> [*]\nstate "Very still" as Still\nstate Busy {\n  Working --> Resting\n}\nnote right of Still : ignored'
    g = _run(f"wbMermaidStateParse({json.dumps(src)})")
    nodes = {n["id"]: (n["text"], n["shape"]) for n in g["nodes"]}
    assert nodes["Still"] == ("Very still", "rounded")
    assert nodes["__start"][1] == "start" and nodes["__end"][1] == "end"
    assert {(e["from"], e["to"], e["label"]) for e in g["edges"]} >= {("__start", "Still", ""), ("Still", "Moving", "push"), ("Crash", "__end", "")}
    assert all(e["arrow"] for e in g["edges"])
    assert g["subgraphs"] == [{"id": "Busy", "title": "Busy", "parent": None}]
    assert {n["id"]: n["group"] for n in g["nodes"]}["Working"] == "Busy"
    assert g["skipped"] == 1


def test_a_class_diagram_parses_members_and_relations() -> None:
    src = 'classDiagram\nAnimal <|-- Duck\nAnimal *-- Leg : has\nZoo o-- "many" Animal\nclass Animal {\n  +String name\n  +eat() void\n}\nDuck : +swim()\nDuck ..> Water\nclass Water\nclassDef x fill:#f00'
    g = _run(f"wbMermaidClassParse({json.dumps(src)})")
    nodes = {n["id"]: n for n in g["nodes"]}
    assert nodes["Animal"]["text"] == "Animal\n+String name\n+eat() void"
    assert nodes["Duck"]["text"] == "Duck\n+swim()"
    assert nodes["Animal"]["h"] > nodes["Water"]["h"]
    edges = {(e["from"], e["to"]): e for e in g["edges"]}
    inherit = edges[("Animal", "Duck")]
    assert inherit["startCap"] == "triangle" and not inherit["dashed"]
    assert edges[("Animal", "Leg")]["startCap"] == "diamond-filled" and edges[("Animal", "Leg")]["label"] == "has"
    assert edges[("Zoo", "Animal")]["startCap"] == "diamond" and edges[("Zoo", "Animal")]["label"] == "many"
    assert edges[("Duck", "Water")]["dashed"] and edges[("Duck", "Water")]["endCap"] == "arrow"
    assert g["skipped"] == 1


def test_a_sequence_diagram_parses_participants_and_messages() -> None:
    src = 'sequenceDiagram\nparticipant A as Alice\nactor B as Bob\nA->>B: Hello\nB-->>A: Hi back\nA->>A: think\nNote over A,B: a note\nloop Every minute\n  B-)C: ping\nend\nautonumber'
    s = _run(f"wbMermaidSequenceParse({json.dumps(src)})")
    assert [(p["id"], p["text"], p["actor"]) for p in s["participants"]] == [("A", "Alice", False), ("B", "Bob", True), ("C", "C", False)]
    msgs = [(m["from"], m["to"], m["text"], m["dashed"]) for m in s["steps"] if m["kind"] == "message"]
    assert msgs == [("A", "B", "Hello", False), ("B", "A", "Hi back", True), ("A", "A", "think", False), ("B", "C", "ping", False)]
    notes = [m for m in s["steps"] if m["kind"] == "note"]
    assert notes[0]["over"] == ["A", "B"] and notes[0]["text"] == "a note"
    blocks = [m for m in s["steps"] if m["kind"] == "block"]
    assert blocks and blocks[0]["text"] == "loop Every minute"
    assert s["skipped"] == 1


def test_the_layout_takes_a_node_s_own_height() -> None:
    at = _run('(() => { const g = {dir: "TD", nodes: [{id: "A", h: 200}, {id: "B"}], edges: [{from: "A", to: "B"}], subgraphs: []}; return Object.fromEntries(wbMermaidLayout(g)); })()')
    assert at["B"]["y"] - at["A"]["y"] >= 100 + 35 + 70


def test_import_goes_by_kind() -> None:
    body = SOURCE[SOURCE.index("async function wbImportMermaid(") :]
    body = body[: body.index("\n}\n")]
    assert "wbMermaidKind(" in body and "wbImportMermaidSequence(" in body
    assert "wbMermaidStateParse(" in body and "wbMermaidClassParse(" in body
