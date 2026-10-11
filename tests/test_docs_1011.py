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


# Row 1066: the split's second half had no completions, lint or snippets.
def test_the_split_carries_completions_lint_and_snippets_but_one_run_panel():
    ide = (JS / "documents-ide.js").read_text(encoding="utf-8")
    tools = _fn(ide, "docIdeSplitTools")
    for part in ("CM.lint.linter(docCodeLintSource(CM)", "CM.lint.lintGutter()", "CM.autocomplete.autocompletion(",
                 "docNativeSnippets(CM, type.ext)", "docCodeEditing(CM, type)"):
        assert part in tools, part
    #: One run panel and one breakpoint lane per document: the first half's.
    assert "docRunExtension" not in tools and "docDebugExtension" not in tools
    assert "...docIdeSplitTools(CM)," in _fn(ide, "docIdeToggleSplit")


# Row 1067: Ctrl+K Ctrl+S flashed the palette open before the sheet.
def test_ctrl_k_waits_for_its_second_chord_before_the_palette():
    ide = (JS / "documents-ide.js").read_text(encoding="utf-8")
    start = ide.index("const DOC_IDE_CHORD_WAIT_MS")
    end = ide.index("}, true);", start) + len("}, true);")
    chord = ide[start:end].replace("window.addEventListener(\"keydown\",", "const onKey =", 1).replace("}, true);", "};", 1)
    prelude = """
const log = [];
const timers = [];
const docIde = { chordAt: 0, chordTimer: 0 };
const input = { value: "", dispatchEvent: () => log.push("input:" + input.value) };
const $ = (id) => (id === "palette-input" ? input : null);
const openPalette = () => { log.push("palette"); };
const docIdeOpenKeys = () => log.push("sheet");
const setTimeout = (fn) => { timers.push(fn); return timers.length; };
const clearTimeout = (n) => { if (n) timers[n - 1] = null; };
const matchesShortcut = (e, k) => (k === "Ctrl+K" ? e.ctrlKey && e.key === "k" : k === "Ctrl+S" ? e.ctrlKey && e.key === "s" : false);
const key = (k, ctrl = false) => ({ key: k, ctrlKey: ctrl, metaKey: false, altKey: false, stopped: false,
  preventDefault() { this.stopped = true; }, stopImmediatePropagation() {} });
""" + chord + """
async function run(second) {
  log.length = 0; timers.length = 0; input.value = "";
  docIdeChordStart();
  const opened = log.length;
  let ev = null;
  if (second === "wait") timers.filter(Boolean).forEach((t) => t());
  else { ev = key(second[0], second[1]); onKey(ev); }
  await new Promise((r) => globalThis.setImmediate(r));
  const left = timers.filter(Boolean).length;
  return { opened, log: [...log], stopped: ev ? ev.stopped : null, armed: docIde.chordAt, left };
}
"""
    script = prelude + (
        "(async () => { const out = { s: await run(['s', true]), esc: await run(['Escape']), "
        "letter: await run(['f']), arrow: await run(['ArrowDown']), wait: await run('wait') }; "
        "process.stdout.write(JSON.stringify(out)); })();"
    )
    done = subprocess.run([shutil.which("node") or "node", "-e", script], capture_output=True, text=True, timeout=60, check=False)
    assert done.returncode == 0, done.stderr
    got = json.loads(done.stdout)
    #: Ctrl+K alone opens nothing until the second chord or the wait.
    assert all(v["opened"] == 0 for v in got.values())
    assert got["s"]["log"] == ["sheet"] and got["s"]["stopped"] and got["s"]["left"] == 0
    assert got["esc"]["log"] == [] and got["esc"]["stopped"] and got["esc"]["left"] == 0
    assert got["letter"]["log"] == ["palette", "input:f"] and got["letter"]["stopped"]
    assert got["arrow"]["log"] == ["palette"] and not got["arrow"]["stopped"]
    assert got["wait"]["log"] == ["palette"]
    assert all(v["armed"] == 0 for v in got.values())
    assert "matchesShortcut(event, \"Ctrl+K\") && docIdeChordStart()" in _fn(ide, "docIdeKeydown")


# Row 1068: Live Text stayed on the single-page stage, so the scroll layout had none.
def test_live_text_follows_the_page_into_the_scroll_layout():
    lib = (JS / "library.js").read_text(encoding="utf-8")
    mover = _fn(lib, "ocrMoveOverlays")
    prelude = """
const made = {};
const stage = (name) => ({ name, kids: [], appendChild(el) { if (el.parentElement) el.parentElement.kids = el.parentElement.kids.filter((k) => k !== el); el.parentElement = this; this.kids.push(el); } });
const home = stage("home");
for (const id of ["ocr-select", "ocr-boxes", "ocr-live-text"]) { made[id] = { id, parentElement: null }; home.appendChild(made[id]); }
const $ = (id) => made[id] || null;
const page3 = stage("page3");
""" + mover + "\nocrMoveOverlays(page3);"
    got = _node(prelude, "{ moved: page3.kids.map((k) => k.id), left: home.kids.length }")
    #: In paint order: the marquee under the boxes, the words on top.
    assert got == {"moved": ["ocr-select", "ocr-boxes", "ocr-live-text"], "left": 0}


# Row 1069: a SQL run had no way to read a CSV document as a table.
def test_a_csv_document_the_query_names_is_a_table():
    code = (JS / "documents-code.js").read_text(encoding="utf-8")
    prelude = "\n".join(
        [
            "const DOC_SQL_CSV_ROWS = 3;",
            _fn(code, "docSqlTableName"),
            _fn(code, "docSqlCsvRows").replace("cap = DOC_SQL_CSV_ROWS + 2", "cap = 5"),
            _fn(code, "docSqlCsvTable"),
        ]
    )
    got = _node(
        prelude,
        """{
        names: ["Sales 2026.csv", "2026 data", "  .csv", "orders"].map(docSqlTableName),
        quoted: docSqlCsvRows('a,b\\r\\n"x, y","say ""hi""\\nthere"\\n\\n1,2'),
        table: docSqlCsvTable("t", "amount,amount,\\n10,9.5,\\n-3,x,\\n1,2,3\\n4,5,6"),
      }""",
    )
    assert got["names"] == ["sales_2026", "t_2026_data", "", "orders"]
    assert got["quoted"] == [["a", "b"], ["x, y", 'say "hi"\nthere'], ["1", "2"]]
    table = got["table"]
    #: Duplicate and blank headers get names; numbers stay numbers; the cap says so.
    assert table["columns"] == ["amount", "amount_2", "column_3"]
    assert table["rows"] == [[10, 9.5, ""], [-3, "x", ""], [1, 2, 3]]
    assert table["cut"] is True
    run = _fn(code, "docRunCode")
    assert 'if (type.ext === "sql")' in run and "request.tables = await docSqlCsvTables(source);" in run
    assert 'apiJson("/documents/contents?file_type=csv")' in code
    core = (JS / "run-core.js").read_text(encoding="utf-8")
    assert 'return { ...runBase(request, "sql"), lib: { js, wasm }, tables };' in core


def test_the_contents_read_narrows_to_one_file_type(client):
    client.post("/documents", json={"title": "sales.csv", "content": "a,b\n1,2", "file_type": "csv"})
    client.post("/documents", json={"title": "notes", "content": "hello", "file_type": "md"})
    rows = client.get("/documents/contents", params={"file_type": "csv"}).json()
    assert [(r["title"], r["file_type"]) for r in rows] == [("sales.csv", "csv")]
    assert len(client.get("/documents/contents").json()) == 2


# Row 1072: JSX in a .js document ran without the JSX pass.
def test_jsx_in_a_js_document_gets_the_jsx_pass_and_nothing_else(tmp_path):
    core = (JS / "run-core.js").read_text(encoding="utf-8")
    start = core.index("const RUN_JSX_MARKUP")
    hint = core[start : core.index("\n", start)]
    sucrase = (ROOT / "frontend/vendor/sucrase/sucrase.min.js").read_text(encoding="utf-8")
    prelude = "\n".join(
        [
            sucrase,
            hint,
            _fn(core, "runIsJsx"),
            "const runVendorScript = async () => SUCRASE;",
            "async " + _fn(core, "runStripTypes"),
            "const runBase = (r, kind) => ({ kind, source: String(r.source || ''), path: String(r.path || '') });",
            "async " + _fn(core, "runJsRequest"),
        ]
    )
    cases = {
        "returned": "function A() { return <div>hi</div>; }",
        "assigned": "const el = <App title='x' />;",
        "fragment": "const f = (\n  <>\n  </>\n);",
        "compare": "if (a < b && c > d) console.log(a<b);",
        "generic": "const n = count <limit ? 1 : 2;",
    }
    script = prelude + (
        "\n(async () => { const cases = " + json.dumps(cases) + "; const out = {};"
        " for (const [k, v] of Object.entries(cases)) out[k] = runIsJsx({ source: v });"
        " out.byName = runIsJsx({ source: 'x', path: 'App.jsx' });"
        " const r = await runJsRequest({ source: 'let x: number = 1;\\nconst el = <b>{x}</b>;', path: 'a.js' }).catch((e) => ({ error: e.message }));"
        " out.typed = r.error || r.source;"
        " out.ran = (await runJsRequest({ source: cases.returned })).source;"
        " process.stdout.write(JSON.stringify(out)); })();"
    )
    #: From a file: the bundle's text holds "pip", which the installer guard
    #: (conftest) refuses to see in an argument.
    path = tmp_path / "jsx.js"
    path.write_text(script, encoding="utf-8")
    done = subprocess.run([shutil.which("node") or "node", str(path)], capture_output=True, text=True, timeout=60, check=False)
    assert done.returncode == 0, done.stderr[-2000:]
    got = json.loads(done.stdout)
    assert got["returned"] and got["assigned"] and got["fragment"] and got["byName"]
    assert not got["compare"] and not got["generic"]
    #: Only the JSX pass: a type annotation in a .js file is still an error.
    assert got["typed"].startswith("Could not read this as JSX")
    assert "React.createElement" in got["ran"] and "<div>" not in got["ran"]
