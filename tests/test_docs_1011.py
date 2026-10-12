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

from tests._app_js import with_pieces

import pytest

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "frontend/js"


def _fn(src: str, name: str) -> str:
    """The text of `function name(...) {...}` at the top level of `src`."""
    start = src.index(f"function {name}(")
    end = src.index("\n}\n", start)
    return src[start : end + 2]


def _node(prelude: str, expr: str, tmp_path: Path | None = None):
    """Run in node; with `tmp_path`, from a file, for source that says "pip"
    (conftest's `_no_test_runs_pip` reads every argument)."""
    node = shutil.which("node")
    if not node:  # pragma: no cover - node is in the sandbox and in CI
        pytest.skip("node is not available")
    script = f"{prelude}\nprocess.stdout.write(JSON.stringify({expr}));"
    argv = [node, "-e", script]
    if tmp_path is not None:
        (tmp_path / "run.js").write_text(script, encoding="utf-8")
        argv = [node, str(tmp_path / "run.js")]
    done = subprocess.run(argv, capture_output=True, text=True, timeout=60, check=False)
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
    from tessellate.ai import utilities

    assert utilities.zone_for(place) == zone
    assert utilities.place_name_for(place) == said


def test_the_answer_names_the_place_as_read():
    from datetime import datetime, timezone

    from tessellate.ai import utilities

    out = utilities._clock("what's the time in westen australia", datetime(2026, 10, 11, tzinfo=timezone.utc))
    assert "Perth, Western Australia" in out[0][1]


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
    from tessellate.api import run_sandbox

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
        "const store = {};\n"
        #: Storage goes through prefs (720f66148): its `json` and `set` over the same store.
        "const prefs = { json: (k, d) => { try { return store[k] ? JSON.parse(store[k]) : d; } catch { return d; } }, set: (k, v) => { store[k] = String(v); return true; } };\n"
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
    from tessellate.api import run_sandbox

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


# Row 1070: Python's standard library had no completion after a dot.
def test_the_stdlib_table_answers_after_an_imported_modules_dot():
    table = json.loads((ROOT / "frontend/vendor/python-stdlib/stdlib.json").read_text(encoding="utf-8"))
    modules = table["modules"]
    for name in ("math", "os.path", "json", "datetime", "collections", "re"):
        assert modules[name], name
    sqrt = next(r for r in modules["math"] if r[0] == "sqrt")
    assert sqrt[1] == "function" and sqrt[2].startswith("sqrt(") and sqrt[3]
    #: Small enough to fetch once, lazily (never at boot).
    assert len((ROOT / "frontend/vendor/python-stdlib/stdlib.json").read_bytes()) < 160_000
    code = (JS / "documents-code.js").read_text(encoding="utf-8")
    mods = {"math": [["pi"]], "os.path": [["join"]], "json": [["dumps"]]}
    prelude = "\n".join([f"const MODS = {json.dumps(mods)};", _fn(code, "docPyImports"), _fn(code, "docPyStdlibRows")])
    src = "import math, json as j\nfrom os import path\nfrom collections import (Counter as C)\n"
    got = _node(
        prelude,
        "{ imports: [...docPyImports(" + json.dumps(src) + ")],"
        " math: docPyStdlibRows(MODS, docPyImports(" + json.dumps(src) + "), 'math'),"
        " path: docPyStdlibRows(MODS, docPyImports(" + json.dumps(src) + "), 'path'),"
        " j: docPyStdlibRows(MODS, docPyImports(" + json.dumps(src) + "), 'j'),"
        " none: docPyStdlibRows(MODS, docPyImports(" + json.dumps(src) + "), 'random') }",
    )
    assert got["imports"] == [["math", "math"], ["j", "json"], ["path", "os.path"], ["C", "collections.Counter"]]
    assert got["math"] == [["pi"]] and got["path"] == [["join"]] and got["j"] == [["dumps"]]
    #: Not imported, not offered.
    assert got["none"] is None
    assert 'api("/vendor/python-stdlib/stdlib.json", { silent: true })' in code
    assert '["css", "html", "py"].includes(type.ext) ? docHoverDocs(CM) : []' in code


# Row 1088: a word touching a suggestion's marker was never a spelling finding.
def test_a_suggestion_marker_is_a_word_boundary_for_the_spelling_check():
    docs = (JS / "documents.js").read_text(encoding="utf-8")
    prelude = _fn(docs, "docSpellable")
    cases = {
        "inserted": ["{++faque++}", 3, 8],
        "deleted": ["{--faque--}", 3, 8],
        "substituted": ["{~~old~>faque~~}", 8, 13],
        "comment": ["{>>faque<<}", 3, 8],
        "plus": ["a+faque", 2, 7],
        "path": ["dir/faque", 4, 9],
    }
    expr = "Object.fromEntries(Object.entries(" + json.dumps(cases) + ").map(([k, [t, s, e]]) => [k, docSpellable(t, t.slice(s, e), s, e)]))"
    got = _node(prelude, expr)
    assert got == {"inserted": True, "deleted": True, "substituted": True, "comment": True, "plus": False, "path": False}


# Row 1097: a fenced block's language was not written to Word.
def test_a_code_blocks_language_goes_to_word_and_comes_back(tmp_path):
    word = (JS / "documents-word.js").read_text(encoding="utf-8")
    start = word.index('const DOC_WORD_CODE_STYLE = "Code";')
    tables = word[start : word.index("];", word.index("const DOC_WORD_STYLE_MAP")) + 2]
    vendor = ROOT / "frontend/vendor"
    script = f"""
const vm = require("vm"), fs = require("fs");
global.window = global; global.self = global;
vm.runInThisContext(fs.readFileSync({json.dumps(str(vendor / "docx/docx.min.js"))}, "utf8"));
vm.runInThisContext(fs.readFileSync({json.dumps(str(vendor / "mammoth/mammoth.browser.min.js"))}, "utf8"));
{tables}
const D = global.docx;
(async () => {{
  const para = (style, text) => new D.Paragraph({{ style, children: [new D.TextRun({{ text }})] }});
  const doc = new D.Document({{
    styles: {{ paragraphStyles: [{{ id: "Code", name: "Code", basedOn: "Normal" }}, {{ id: "Code-py", name: "Code py", basedOn: "Code" }}] }},
    sections: [{{ children: [para("Code-py", "x = 1"), para("Code-py", "print(x)"), para("Code", "plain")] }}],
  }});
  const buf = await D.Packer.toBuffer(doc);
  const out = await global.mammoth.convertToHtml({{ arrayBuffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }}, {{ styleMap: DOC_WORD_STYLE_MAP }});
  process.stdout.write(JSON.stringify(out.value));
}})().catch((e) => {{ console.error(e); process.exit(1); }});
"""
    path = tmp_path / "word.js"
    path.write_text(script, encoding="utf-8")
    done = subprocess.run([shutil.which("node") or "node", str(path)], capture_output=True, text=True, timeout=120, check=False)
    assert done.returncode == 0, done.stderr[-2000:]
    html = json.loads(done.stdout)
    assert '<pre class="language-py">x = 1\nprint(x)</pre>' in html and "<pre>plain</pre>" in html
    assert "const lang = docWordCodeLang(el);" in word and "ctx.langs.add(lang)" in word
    #: The paste converter fences a language-named block with its language.
    docs = (JS / "documents.js").read_text(encoding="utf-8")
    assert 'out.push("```" + lang + "\\n" + code + "\\n```");' in docs


# Row 1096: Mammoth accepted a .docx's tracked changes on the reader's behalf.
def test_a_word_file_with_tracked_changes_is_seen_before_mammoth_reads_it(tmp_path):
    word = (JS / "documents-word.js").read_text(encoding="utf-8")
    vendor = ROOT / "frontend/vendor"
    script = f"""
const vm = require("vm"), fs = require("fs");
global.window = global; global.self = global;
vm.runInThisContext(fs.readFileSync({json.dumps(str(vendor / "docx/docx.min.js"))}, "utf8"));
async {_fn(word, "docWordHasRevisions")}
const D = global.docx;
(async () => {{
  const make = async (run) => {{
    const buf = await D.Packer.toBuffer(new D.Document({{ sections: [{{ children: [new D.Paragraph({{ children: [new D.TextRun("kept "), run] }})] }}] }}));
    return {{ arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }};
  }};
  const out = {{
    ins: await docWordHasRevisions(await make(new D.InsertedTextRun({{ text: "new", id: 1, author: "A", date: "2026-10-11T00:00:00Z" }}))),
    del: await docWordHasRevisions(await make(new D.DeletedTextRun({{ text: "old", id: 2, author: "A", date: "2026-10-11T00:00:00Z" }}))),
    plain: await docWordHasRevisions(await make(new D.TextRun("plain"))),
    junk: await docWordHasRevisions({{ arrayBuffer: async () => new ArrayBuffer(10) }}),
  }};
  process.stdout.write(JSON.stringify(out));
}})().catch((e) => {{ console.error(e); process.exit(1); }});
"""
    path = tmp_path / "revisions.js"
    path.write_text(script, encoding="utf-8")
    done = subprocess.run([shutil.which("node") or "node", str(path)], capture_output=True, text=True, timeout=120, check=False)
    assert done.returncode == 0, done.stderr[-2000:]
    assert json.loads(done.stdout) == {"ins": True, "del": True, "plain": False, "junk": False}
    lib = (JS / "library.js").read_text(encoding="utf-8")
    assert '!(await docWordHasRevisions(file))' in lib


# Row 1073: the Evidence checks switch was stored and shown and gated nothing.
def test_the_evidence_checks_switch_hides_the_answers_evidence_view():
    ask = (JS / "capture-ask.js").read_text(encoding="utf-8")
    prelude = "\n".join(
        [
            "let evidenceSwitchLoad = null; let evidenceChecksKnown = null; let calls = 0; let reply = { evidence_checks: false };",
            "const apiJson = async () => { calls += 1; return reply; };",
            _fn(ask, "evidenceChecksOn"),
            _fn(ask, "evidenceSwitchReset"),
        ]
    )
    script = prelude + (
        "\n(async () => { const off = await evidenceChecksOn(); const known = evidenceChecksKnown; await evidenceChecksOn();"
        " const once = calls; reply = { evidence_checks: true }; evidenceSwitchReset(); const on = await evidenceChecksOn();"
        " process.stdout.write(JSON.stringify({ off, known, once, on, calls })); })();"
    )
    done = subprocess.run([shutil.which("node") or "node", "-e", script], capture_output=True, text=True, timeout=60, check=False)
    assert done.returncode == 0, done.stderr
    assert json.loads(done.stdout) == {"off": False, "known": False, "once": 1, "on": True, "calls": 2}
    assert 'foot.classList.toggle("hidden", evidenceChecksKnown === false);' in ask
    settings = with_pieces("settings.js")
    assert 'if (typeof evidenceSwitchReset === "function") evidenceSwitchReset();' in settings


# Rows 1130 and 1132: the writing side and the reading grammar decided apart
# what a mark means. One table of marks; each written mark must read back.
def _const_block(src: str, name: str) -> str:
    start = src.index(f"const {name} =")
    end = src.index(";\n", start)
    return src[start : end + 1]


def test_every_written_inline_mark_reads_back_through_inline_md():
    marks = _const_block(NOTES_LIST, "MD_INLINE_MARKS")
    reader = _const_block(NOTES_LIST, "INLINE_MD")
    got = _node(
        marks + "\n" + reader,
        "Object.entries(MD_INLINE_MARKS).map(([k, w]) => {"
        " const text = w + 'word' + w; const m = new RegExp(INLINE_MD.source).exec(text);"
        " return [k, Boolean(m && m[0] === text)]; })",
    )
    assert got and all(ok for _, ok in got), got
    docs = (JS / "documents.js").read_text(encoding="utf-8")
    actions = docs[docs.index("const MD_ACTIONS = {") :]
    for name, _ in got:
        assert re.search(rf"\n  {name}: \{{ wrap: MD_INLINE_MARKS\.{name},", actions), name


# Row 1114: the widget audit found the Dashboard's open-questions line printing
# a question's markdown ("**why**") where the Questions view shows `display`.
def test_the_dashboard_question_line_shows_the_plain_words():
    dash = with_pieces("dashboard.js")
    assert "oldest.display || oldest.text" in dash


# Row 1119: the "/" menu's Flowchart inserts a starter the Live view draws.
def test_the_flowchart_starter_is_one_the_live_view_can_draw(tmp_path):
    editor = (JS / "editor.js").read_text(encoding="utf-8")
    row = re.search(r'add\(\{ id: "flowchart".*?run: \(t\) => editorBlock\(t, "```mermaid\\n(.*?)\\n```"', editor)
    assert row, "the Flowchart row has moved"
    docs = (JS / "documents.js").read_text(encoding="utf-8")
    start = docs.index("const MERMAID_")
    end = docs.index("\n}\n", docs.index("function mermaidFlowParse(")) + 2
    helpers = docs[start:end]
    source = row.group(1).replace("\\n", "\n")
    graph = _node(helpers, f"mermaidFlowParse({json.dumps(source)})", tmp_path)
    assert graph and len(graph["nodes"]) == 2, graph


# Row 1139: p5.js names in a sketch, each one the vendored bundle has.
def test_p5_completions_are_names_the_vendored_p5_has():
    code = (JS / "documents-code.js").read_text(encoding="utf-8")
    table = code[code.index("const DOC_P5_NAMES = [") : code.index("];", code.index("const DOC_P5_NAMES = ["))]
    names = re.findall(r'\["(\w+)", "', table)
    assert len(names) > 60
    bundle = (ROOT / "frontend/vendor/p5.min.js").read_text(encoding="utf-8")
    missing = [n for n in names if not re.search(rf"\b{n}\b", bundle)]
    assert not missing, missing
    snippets = _fn(code, "docNativeSnippets")
    assert "docP5Source()" in snippets


# Row 1109: Help puts a group's best match first while searching.
def test_help_search_orders_each_group_by_its_match():
    find = (JS / "settings-find.js").read_text(encoding="utf-8")
    body = _fn(find, "helpApplySearch")
    assert "tiers.get(b) - tiers.get(a)" in body and "a._helpAt - b._helpAt" in body


# Row 1095: a document import and a meeting summary are listed while they run.
def test_long_request_work_registers_with_the_activity_list():
    docs = (ROOT / "src/tessellate/api/routes_documents.py").read_text(encoding="utf-8")
    assert re.search(r'with activity\.track\("import", .*\n\s+viewed = docview\.extract\(', docs)
    meetings = (ROOT / "src/tessellate/api/routes_meetings.py").read_text(encoding="utf-8")
    assert re.search(r'with activity\.track\("generation", "Summarising a meeting".*\n\s+written = meeting_summary', meetings)


# Row 1101: clip.html and capture.html are served with hashed stamps.
@pytest.mark.parametrize("page", ["clip.html", "capture.html"])
def test_the_clipper_and_capture_pages_get_hashed_stamps(client, page):
    got = client.get(f"/{page}")
    assert got.status_code == 200 and got.headers["cache-control"] == "no-cache"
    stamps = re.findall(r'/(?:css|js)/[\w.-]+\?v=([\w.-]+)"', got.text)
    assert stamps and all("-" in stamp for stamp in stamps), stamps


# Row 1108: a sweep can block the service worker so its routes see every request.
def test_the_sweep_boot_passes_service_workers_through():
    lib = (ROOT / "scratchpad/ui-sweeps/lib.js").read_text(encoding="utf-8")
    assert "'serviceWorkers'" in lib[lib.index("const CTX_OPTS") : lib.index("];", lib.index("const CTX_OPTS"))]


def test_a_code_file_spell_checks_comments_and_strings_only():
    """Owner 2026-10-11: identifiers and an f-string's prefix were underlined by
    the browser; the app's own check masks to comment and string nodes."""
    docs = (JS / "documents.js").read_text(encoding="utf-8")
    assert "? docCodeSpellFindings(text)" in docs
    mask = _fn(docs, "docCodeProseMask")
    assert "[rRbBuUfF]{0,3}" in mask and "Interpolation" in mask
    assert "string|template" in mask and "comment" in mask
    spell = _fn(docs, "docCmSpellcheck")
    assert "!docFileType().previewable" in spell
    assert "docOpenSuggestFor(finding, false, point)" in docs[docs.index("DOC_HOVER_SUGGEST_MS =") :]
