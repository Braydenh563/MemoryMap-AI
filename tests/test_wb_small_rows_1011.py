"""Small whiteboard rows from the 2026-10-11 ledger (wbs-1011), one test each."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WB = (ROOT / "frontend" / "js" / "whiteboard.js").read_text(encoding="utf-8")


def _css(name: str) -> str:
    return (ROOT / "frontend" / "css" / name).read_text(encoding="utf-8")


def test_the_shapes_caret_opens_the_list():
    """OPEN row 847: `.wb-shape-caret` had `pointer-events: none`, so the
    toggle's `closest(".wb-shape-caret")` never matched and the caret picked
    the tool. The caret takes the press, and so does the toggle's right 14px."""
    caret = re.search(r"\.wb-shape-caret\s*\{([^}]*)\}", _css("06-timeline-dialogs.css"))
    assert caret and "pointer-events" not in caret.group(1)
    start = WB.index("function wbToggleCaretHit(")
    hit = WB[start : WB.index("\n  }\n", start)]
    assert 'closest(".wb-shape-caret")' in hit and "right - 14" in hit and "e.detail > 0" in hit
    assert "if (wbToggleCaretHit(toggle, e)) {" in WB


def test_the_timeline_names_maps_with_boards():
    """OPEN row 850: a map's row sits under the board kind; the kind says so."""
    timeline = (ROOT / "frontend" / "js" / "timeline.js").read_text(encoding="utf-8")
    assert '{ key: "board", label: "Boards and maps"' in timeline


def test_the_floating_topic_rename_is_the_plate_s_height():
    """OPEN row 795: the field floated 42px tall over a 17px topic plate."""
    graph = (ROOT / "frontend" / "js" / "graph-canvas.js").read_text(encoding="utf-8")
    start = graph.index("function gcRenameTopicInline(")
    body = graph[start : graph.index("\n}\n", start)]
    assert "const plateH = (plate.bottom - plate.top) * t.k;" in body
    assert "field.style.height = `${height}px`;" in body and "Math.round(plateH + 6)" in body
    rule = re.search(r"\.graph-topic-rename\.is-floating\s*\{([^}]*)\}", _css("graph-lazy.css")).group(1)
    assert "min-height: 0" in rule and "padding: 0 var(--space-2)" in rule


def _fn(name: str) -> str:
    start = WB.index(f"function {name}(")
    return WB[start : WB.index("\n}\n", start) + 3]


def test_reset_style_takes_the_look_off_and_keeps_what_it_says():
    """INBOX 747 (OPEN row 887), the owner: "there's no way to reset a object
    back to default style". Run in node: a text box loses every look field and
    keeps its words; a sticky goes back to the first paper; a map topic is
    left to its map; a link loses its colour and width but keeps its ends."""
    import json
    import shutil
    import subprocess

    import pytest

    node = shutil.which("node")
    if not node:
        pytest.skip("node is not installed")
    start = WB.index("const WB_SKETCH_RESET_KEYS")
    consts = WB[start : WB.index("function wbSketchStyleReset(", start)]
    script = (
        "const WB_MAP_KINDS = new Set(['topic']); const WB_STICKY_PAPERS = [{ value: '#fff3a0' }];"
        "function wbIsSticky(o) { return Boolean(o.data.sticky); } function wbSketchTakesCaps() { return false; }"
        + consts + _fn("wbSketchStyleReset") + _fn("wbObjectStyleReset")
        + "const text = wbObjectStyleReset({ kind: 'text', data: { content: 'Hi', color: '#f00', bg: '#000', font_size: 30, bold: true, alpha: 0.5, x: 1 } });"
        + "const sticky = wbObjectStyleReset({ kind: 'text', data: { content: 'S', sticky: true, bg: '#f9c', color: '#123', font_size: 40, fold: false } });"
        + "const topic = wbObjectStyleReset({ kind: 'topic', data: { color: '#f00' } });"
        + "const link = JSON.parse(JSON.stringify(Object.assign({ type: 'link-straight', sourceId: 1, targetId: 2, endCap: 'arrow', color: '#f00', width: 8, dash: 'dashed', route: 'elbow' }, wbSketchStyleReset({ type: 'link-straight' }))));"
        + "const marker = wbSketchStyleReset({ d: 'M 0 0 L 9 9', shape: 'highlighter' });"
        + "console.log(JSON.stringify({ text, sticky, topic, link, marker }));"
    )
    out = json.loads(subprocess.run([node, "-e", script], capture_output=True, text=True, check=True).stdout)
    assert out["text"] == {"content": "Hi", "x": 1}
    assert out["sticky"] == {"content": "S", "sticky": True, "bg": "#fff3a0", "color": "#2a2a1f", "font_size": 16}
    assert out["topic"] is None and out["marker"] is None
    assert out["link"] == {"type": "link-straight", "sourceId": 1, "targetId": 2, "endCap": "arrow", "route": "elbow"}
    fn = _fn("wbResetSelectedStyle")
    assert "wbRecordGesture" in fn and "WB_MAP_STYLE_KEYS" in fn and "wbIsLocked" in fn
    index = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    assert 'data-wb-cmd="reset-style"' in index and 'id="wb-reset-style"' in index
    commands = (ROOT / "frontend" / "js" / "whiteboard-commands.js").read_text(encoding="utf-8")
    #: In the command table (palette and menu); not on the keys sheet, which
    #: lists what has a key, and Reset style has none (cfc684238).
    assert 'id: "reset-style"' in commands and 'keys: "", surface: "both", needs: "selection", run: () => wbResetSelectedStyle()' in commands
    from memorymap.ai import help_chat

    assert any("Reset style" in t["body"] for t in help_chat.HELP_TOPICS)


def test_a_panel_frame_s_hint_line_edits_in_place():
    """INBOX 740 (OPEN row 802), the owner: "I cant edit the text under the
    titles in these objects?" The hint takes a double-click as the title does,
    and an emptied hint is taken away rather than refused."""
    build = _fn("wbBuildFrame")
    assert 'wbEditFrameTitle(this, d, "hint")' in build and 'aria-hidden' not in build
    edit = _fn("wbEditFrameTitle")
    assert 'const isHint = field === "hint";' in edit and "(!name && !isHint)" in edit and "delete frame.data.hint" in edit
    rule = re.search(r"\.wb-frame-panel \.wb-frame-hint:not\(\[hidden\]\)\s*\{([^}]*)\}", _css("library-lazy.css")).group(1)
    assert "pointer-events: none" not in rule


def test_a_note_box_gone_before_the_editor_loads_is_not_mounted():
    """cardarrows sweep at 390: a card's editor closed with Escape while
    CodeMirror loaded threw "Cannot read properties of null (reading
    'insertBefore')" in `mountNoteSurface`. After the load, a box with no
    parent gets the plain surface and nothing is inserted."""
    docs = (ROOT / "frontend" / "js" / "documents.js").read_text(encoding="utf-8")
    start = docs.index("async function mountNoteSurface(")
    body = docs[start : docs.index("\n}\n", start)]
    loaded = body.index("await loadCodeMirror()")
    guard = body.index("if (!host.parentNode) return textareaSurface(host);")
    assert loaded < guard < body.index("host.parentNode.insertBefore(wrap, host)")
