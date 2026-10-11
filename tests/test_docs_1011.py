"""Small fixes from the documents batch of the open ledger (docs-1011).

One file for the rows that are one function or one rule each, so each row's
pin sits beside its reason rather than in a file of its own.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "frontend/js"


def _fn(src: str, name: str) -> str:
    """The text of `function name(...) {...}` at the top level of `src`."""
    start = src.index(f"function {name}(")
    end = src.index("\n}\n", start)
    return src[start : end + 2]


def _node(prelude: str, expr: str):
    node = shutil.which("node")
    if not node:  # pragma: no cover - node is in the sandbox and in CI
        pytest.skip("node is not available")
    script = f"{prelude}\nprocess.stdout.write(JSON.stringify({expr}));"
    done = subprocess.run([node, "-e", script], capture_output=True, text=True, timeout=60, check=False)
    assert done.returncode == 0, done.stderr
    return json.loads(done.stdout)


# Row 1045: a tag-named topic's chip repeated the tag chip beside it.
NOTES_LIST = (JS / "notes-list.js").read_text(encoding="utf-8")


def test_topic_chip_is_left_off_when_a_tag_says_the_same():
    helper = _fn(NOTES_LIST, "topicRepeatsTag")
    cases = [
        ["training", ["training"]],
        ["Training", ["#training"]],
        ["machine learning", ["machine-learning"]],
        ["training", ["work"]],
        ["", ["x"]],
        ["training", None],
    ]
    got = _node(helper, f"{json.dumps(cases)}.map(([n, t]) => topicRepeatsTag(n, t))")
    assert got == [True, True, True, False, False, False]
    chip = _fn(NOTES_LIST, "noteTopicChip")
    assert re.search(r"topicRepeatsTag\(topic\.name, entry\.tags\)\) return null", chip)


# Row 1050: a misspelled place ("westen australia") was not read.
@pytest.mark.parametrize(
    ("place", "zone", "said"),
    [("westen australia", "Australia/Perth", "western australia"),
     ("queensland", "Australia/Brisbane", "queensland"),
     ("new yrok", "America/New_York", "new york"),
     ("my notes", None, None), ("wz", None, None), ("cat", None, None)],
)
def test_a_misspelled_place_is_read_as_its_nearest_name(place, zone, said):
    from memorymap.ai import utilities

    assert utilities.zone_for(place) == zone
    assert utilities.place_name_for(place) == said


def test_the_answer_names_the_place_as_read():
    from datetime import datetime, timezone

    from memorymap.ai import utilities

    out = utilities._clock("what's the time in westen australia", datetime(2026, 10, 11, tzinfo=timezone.utc))
    assert "in Western Australia." in out[0][1]


# Row 1056: the Statistics charts' axis, unchecked at a 0 to 1,240 range.
ASK_CHART = (JS / "ask-chart.js").read_text(encoding="utf-8")


def test_chart_ticks_are_round_and_cover_the_top():
    prelude = _fn(ASK_CHART, "askChartTicks") + _fn(ASK_CHART, "askChartTickLabel")
    got = _node(prelude, "[3, 5, 7, 37, 100, 1240, 86000].map((m) => askChartTicks(m))")
    assert got[0] == [0, 1, 2, 3]
    assert got[5] == [0, 500, 1000, 1500]
    for top, ticks in zip([3, 5, 7, 37, 100, 1240, 86000], got):
        assert ticks[0] == 0 and ticks[-1] >= top and len(ticks) <= 5
        step = ticks[1] - ticks[0]
        assert all(b - a == step for a, b in zip(ticks, ticks[1:]))
        assert re.fullmatch(r"(1|2|5)0*", str(step)) or step == 25 * 10 ** (len(str(step)) - 2), step
    labels = _node(prelude, "[0, 500, 1500, 10000, 85000].map(askChartTickLabel)")
    #: The axis is 36 units wide at 640: four digits fit, five do not.
    assert labels == ["0", "500", "1500", "10k", "85k"]


# Row 1058: a debugger's variable showed one level, never its children.
def test_python_variables_carry_their_children():
    from memorymap.api import run_sandbox

    space: dict = {}
    exec(run_sandbox.PY_RUNNER, space)  # noqa: S102  # the runner is this repo's own text

    class Point:
        def __init__(self):
            self.x, self.y = 1, [2]

    rows = space["_mm_names"]({"xs": [1, "a", [3]], "d": {"k": 2}, "n": 5, "p": Point(), "big": list(range(60)), "e": []})
    by = {row["name"]: row for row in rows}
    assert "children" not in by["n"] and "children" not in by["e"]
    assert by["xs"]["children"] == [
        {"name": "[0]", "value": "1", "type": "int"},
        {"name": "[1]", "value": "'a'", "type": "str"},
        {"name": "[2]", "value": "[3]", "type": "list"},
    ]
    assert by["d"]["children"] == [{"name": "'k'", "value": "2", "type": "int"}]
    assert [c["name"] for c in by["p"]["children"]] == ["x", "y"]
    big = by["big"]["children"]
    assert len(big) == 51 and big[-1] == {"name": "...", "value": "10 more", "type": ""}
    #: One level down only: a child's own children are its repr.
    assert all("children" not in c for c in by["xs"]["children"])


def test_the_panel_draws_a_row_with_children_as_a_disclosure():
    code = (JS / "documents-code.js").read_text(encoding="utf-8")
    row = _fn(code, "docDebugValueRow")
    assert 'createElement("details")' in row and "cm-debug-children" in row
    assert code.count("row.children") >= 2
    theme = (JS / "documents.js").read_text(encoding="utf-8")
    assert '".cm-debug-children"' in theme


# Row 1059: breakpoints lived for the tab's life, not across a reload.
def test_breakpoints_are_kept_per_document_across_a_reload():
    code = (JS / "documents-code.js").read_text(encoding="utf-8")
    prelude = (
        "const store = {}; globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };\n"
        "const DOC_DEBUG = { breaks: new Map() };\n"
        + re.search(r"^const DOC_DEBUG_BREAKS_KEY = .*$", code, re.M).group(0) + "\n"
        + re.search(r"^const DOC_DEBUG_BREAKS_DOCS = .*$", code, re.M).group(0) + "\n"
        + _fn(code, "docDebugSavedBreaks") + _fn(code, "docDebugKeepBreaks")
    )
    got = _node(prelude, """(() => {
      docDebugKeepBreaks(7, [{ line: 3, cond: "" }, { line: 9, cond: "i > 2" }]);
      docDebugKeepBreaks(8, []);
      DOC_DEBUG.breaks.clear();
      const back = docDebugSavedBreaks(7);
      const none = docDebugSavedBreaks(8);
      for (let id = 100; id < 100 + DOC_DEBUG_BREAKS_DOCS + 5; id++) docDebugKeepBreaks(id, [{ line: 1, cond: "" }]);
      return { back, none, kept: Object.keys(JSON.parse(store[DOC_DEBUG_BREAKS_KEY])).length };
    })()""")
    assert got["back"] == [{"line": 3, "cond": ""}, {"line": 9, "cond": "i > 2"}]
    assert got["none"] == []
    assert got["kept"] == 100
    assert "DOC_DEBUG.breaks.get(docHistoryOwner)" not in code
    assert code.count("docDebugKeepBreaks(docHistoryOwner") == 1


# Row 1065: a console line that never ended lost the run's namespace.
def test_an_overtime_python_line_is_interrupted_not_its_worker_ended():
    from memorymap.api import run_sandbox

    page = run_sandbox.RUN_SANDBOX_PY_HTML
    assert "new Uint8Array(new SharedArrayBuffer(1))" in page
    assert 'if (d.type === "interrupt") { if (interrupt && busy && worker) interrupt[0] = 2; else stop(); return; }' in page
    assert "p.setInterruptBuffer(new Uint8Array(e.data.interrupt));" in run_sandbox._PY_WORKER
    code = (JS / "documents-code.js").read_text(encoding="utf-8")
    over = _fn(code, "docConsoleOvertime")
    assert 'docRunSend({ type: "interrupt"' in over and 'lang !== "python"' in over
    assert 'data.t === "started"' in _fn(code, "docConsoleMessage")
