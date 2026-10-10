"""The sandbox a code document's Run button runs in (INBOX 404).

The owner, 2026-09-23: "what about code errors, debugging console or smth??"
Answer placed in INBOX 404: Run with an output console, JavaScript in a
worker and HTML in a preview frame, both sandboxed, nothing compiled.

**Why a route, and why this page carries its own policy.** The app's CSP has
no `'unsafe-eval'` and no `blob:` in `script-src`, on purpose, and running
somebody's code needs one or the other. Widening the notebook's own policy
to run a document would trade the notebook's protection for a feature. A
same-origin HTTP response carries its own policy instead (the HTML preview in
`routes_files` is the precedent), and this is it:

- `sandbox allow-scripts`: an **opaque origin**. The code cannot read this
  app's storage, cookies, IndexedDB or caches, because it is not this app's
  origin; the iframe that loads it says `sandbox="allow-scripts"` as well, so
  either one alone is enough.
- `connect-src 'none'`, `img-src data: blob:`, `default-src 'none'`: **no
  network**, not to this server and not beyond it. A worker made from a
  `blob:` inherits this page's policy, so the worker has none either.
- `script-src 'unsafe-inline' 'unsafe-eval' blob:` and `worker-src blob:`:
  the runner's own inline script, and the user's code as a `blob:` worker or
  inside a `srcdoc` frame. Nothing from any origin, this one included.
- `frame-ancestors 'self'` (and `X-Frame-Options: SAMEORIGIN`, overriding the
  middleware's `DENY`): only the app may frame it.

The only way out is `postMessage` to the parent, which checks that a message
came from its own frame (`event.source`) and treats the payload as text. The
page holds no data, so it is served without the unlock gate
(`tests/test_every_route_is_locked.py` names it and says why).
"""

from __future__ import annotations

import json
import re

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

router = APIRouter(tags=["documents"])

RUN_SANDBOX_CSP = (
    "sandbox allow-scripts; default-src 'none'; "
    "script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; "
    "style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; "
    "connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'"
)

#: The page a `.css` document is previewed against (D6): the elements a
#: stylesheet usually styles, in one short document, with the class names a
#: starter stylesheet tends to use. Plain markup, no script.
CSS_SAMPLE_HTML = (
    '<main class="container"><header class="header"><h1>Heading one</h1>'
    '<p class="lead">A lead paragraph with <a href="#">a link</a>, <strong>strong</strong>, '
    "<em>emphasis</em> and <code>code</code>.</p></header>"
    '<nav class="nav"><a href="#">Home</a> <a href="#">About</a> <a href="#">Contact</a></nav>'
    '<article class="card"><h2>Heading two</h2><p>A paragraph of body text long enough to wrap '
    "onto a second line at most widths, so line height and measure show.</p>"
    "<ul><li>First item</li><li>Second item</li></ul><ol><li>One</li><li>Two</li></ol>"
    "<blockquote>A quotation.</blockquote><h3>Heading three</h3>"
    "<pre><code>const answer = 42;</code></pre></article>"
    '<table class="table"><thead><tr><th>Name</th><th>Value</th></tr></thead>'
    "<tbody><tr><td>Alpha</td><td>1</td></tr><tr><td>Beta</td><td>2</td></tr></tbody></table>"
    '<form class="form"><label>Name <input type="text" placeholder="Your name"></label> '
    '<label>Choice <select><option>One</option><option>Two</option></select></label> '
    '<label><input type="checkbox"> Remember</label> <textarea rows="2">Text</textarea> '
    '<button type="button" class="button btn primary">Primary</button> '
    '<button type="button" class="button btn">Secondary</button></form>'
    '<hr><footer class="footer"><small>Small print.</small></footer></main>'
)

#: The SQL runner (D5), a worker made from sql.js's own text (handed over by
#: the app in `lib.js`) with this after it. An **in-memory database per run**,
#: never the app's own: the worker has no network and no storage, and the
#: binary it compiles came over `postMessage` too. Each statement's result is
#: a `table` row (the first 200 rows of it, and how many more there were) on
#: the line the statement starts on; a statement that returns nothing says
#: how many rows it changed. A parse or run error stops the run on its line.
#: `tables` (CSV text already split by the app) are loaded first.
SQL_ROW_CAP = 200

_SQL_WORKER = (
    f"var ROW_CAP = {SQL_ROW_CAP};\n"
    + r"""
function cell(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Uint8Array) return "[blob, " + v.length + " bytes]";
  return v;
}
function lineAt(text, pos) {
  var n = 1;
  for (var i = 0; i < pos && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}
//: Whitespace and comments before a statement's first word, so its line is
//: the line its first word is on.
var LEAD = /^(?:\s+|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)*/;
self.onmessage = function (e) {
  var d = e.data || {};
  var text = String(d.source || ""), offset = Number(d.lineOffset) || 0;
  initSqlJs({ wasmBinary: d.wasm }).then(function (SQL) {
    var db = new SQL.Database();
    var line = null;
    try {
      (d.tables || []).forEach(function (t) {
        var cols = t.columns.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; });
        db.run("CREATE TABLE \"" + String(t.name).replace(/"/g, '""') + "\" (" + cols.join(", ") + ")");
        var ins = db.prepare("INSERT INTO \"" + String(t.name).replace(/"/g, '""') + "\" VALUES (" + cols.map(function () { return "?"; }).join(", ") + ")");
        t.rows.forEach(function (r) { ins.run(r); });
        ins.free();
        postMessage({ t: "log", level: "info", text: "Loaded " + t.rows.length + " rows into " + t.name + ".", line: null });
      });
      var it = db.iterateStatements(text);
      for (;;) {
        var rest = it.getRemainingSQL();
        var start = text.length - rest.length;
        start += LEAD.exec(rest)[0].length;
        line = start < text.length ? lineAt(text, start) + offset : null;
        var step = it.next();
        if (step.done) break;
        var stmt = step.value, rows = [], more = 0;
        var columns = stmt.getColumnNames();
        while (stmt.step()) {
          if (rows.length < ROW_CAP) rows.push(stmt.get().map(cell));
          else more++;
        }
        stmt.free();
        if (columns.length) postMessage({ t: "table", columns: columns, rows: rows, more: more, line: line });
        else {
          var changed = db.getRowsModified();
          postMessage({ t: "log", level: "info", text: changed === 0 ? "Done." : changed === 1 ? "1 row changed." : changed + " rows changed.", line: line });
        }
      }
      postMessage({ t: "done", pending: 0 });
    } catch (err) {
      postMessage({ t: "log", level: "error", text: String(err && err.message || err), line: line, uncaught: true });
    } finally {
      db.close();
    }
  }, function (err) {
    postMessage({ t: "log", level: "error", text: "SQLite could not start: " + String(err && err.message || err), line: null, uncaught: true });
  });
};
"""
)


#: The runner. **One protocol for every language** (DOCUMENTS_PLAN 23, D1):
#: the app sends `{type: "run", mmRun, kind, source, path, stdin, tests,
#: lineOffset, lib}` and gets back rows, `{t: "log", level, text, line, col}`
#: (plus `t: "table"` and `t: "test"` rows for the kinds that make them), each
#: tagged with the run's id so a late message from a stopped run is dropped.
#: `kind` picks a runner from `RUNNERS`; the panel, Stop and the limits are the
#: app's, the same for all of them (`frontend/js/run-core.js` builds the
#: message). `lineOffset` is how many lines of the document come before
#: `source` (Run selection, Run cell), so a reported line is still the
#: document's. `lib` is a vendored library's text (and a WebAssembly binary)
#: the app fetched from its own origin and handed over, because this page
#: may fetch nothing at all.
#:
#: - `js`: the code becomes a `blob:` worker with a one-line prelude **on the
#:   code's own first line**, so a line number the browser reports is the
#:   document's line number with nothing subtracted. The prelude sends
#:   `console.*` up as text with the line it was called from, and a closing
#:   `postMessage` says the top level finished. `tests: true` puts the app's
#:   test harness (`run-tests.js`) in front and runs the suite after.
#: - `html`: the page goes into a `srcdoc` frame, which inherits this page's
#:   sandbox and policy, with the same one-line prelude in front of it, and is
#:   shown.
#: - `stop`: the worker is terminated, the frame emptied.
RUN_SANDBOX_HTML = (
    r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Run</title>
<style>html,body{margin:0;height:100%;background:#fff;color:#111;font:13px system-ui,sans-serif}
iframe{border:0;width:100%;height:100%;display:block;background:#fff}</style>
</head><body><script>
(function () {
  "use strict";
  var SQL_WORKER = """
    + json.dumps(_SQL_WORKER).replace("</", "<\\/")
    + r""";
  var CSS_SAMPLE = """
    + json.dumps(CSS_SAMPLE_HTML).replace("</", "<\\/")
    + r""";
  var worker = null, frame = null, current = 0;
  function up(id, msg) { msg.mmRun = id; parent.postMessage(msg, "*"); }
  // The stack's frames are the finder, the console method, then the caller:
  // the first frame from the third on is the user's own source.
  function prelude(post) {
    return "(function(){var P=" + post + ";function F(v){if(typeof v==='string')return v;" +
      "if(v instanceof Error)return v.name+': '+v.message;try{var s=JSON.stringify(v);return s===undefined?String(v):s}catch(e){return String(v)}}" +
      "function L(){var s=(new Error().stack||'').split('\\n');for(var i=3;i<s.length;i++){var m=/(?:blob:|srcdoc)[^\\s)]*:(\\d+):\\d+\\)?\\s*$/.exec(s[i]);" +
      "if(m)return Number(m[1])}return null}" +
      "['log','info','warn','error','debug'].forEach(function(k){console[k]=function(){var a=[].slice.call(arguments);" +
      "P({t:'log',level:k,text:a.map(F).join(' '),line:L()})}});" +
      "self.addEventListener('unhandledrejection',function(e){var r=e.reason,s=String(r&&r.stack||'').split('\\n'),n=null;" +
      "for(var i=0;i<s.length&&n===null;i++){var m=/(?:blob:|srcdoc)[^\\s)]*:(\\d+):\\d+\\)?\\s*$/.exec(s[i]);if(m)n=Number(m[1])}" +
      "P({t:'log',level:'error',text:'Uncaught (in promise) '+F(r),line:n})});})();";
  }
  function stop() {
    if (worker) { worker.terminate(); worker = null; }
    if (frame) { frame.remove(); frame = null; }
  }
  //: Lines of the document before `source`, as blank lines, so the browser's
  //: line numbers stay the document's (Run selection, Run cell).
  function pad(d) { var n = Math.max(0, Math.min(100000, Number(d.lineOffset) || 0)); return new Array(n + 1).join("\n"); }
  function runJs(id, code, d) {
    // The timers the script leaves behind are counted, so the app can tell
    // "the top level ended" from "nothing is left to run" (INBOX 736).
    var timers = "(function(){var n=0,done=false,live=new Set(),sT=setTimeout,cT=clearTimeout,sI=setInterval,cI=clearInterval;" +
      "function end(h){if(live.delete(h)&&--n===0&&done)postMessage({t:'idle'})}" +
      "self.setTimeout=function(f,ms){var a=[].slice.call(arguments,2),h=sT(function(){end(h);typeof f==='function'?f.apply(null,a):0},ms);live.add(h);n++;return h};" +
      "self.clearTimeout=function(h){cT(h);end(h)};" +
      "self.setInterval=function(){var h=sI.apply(null,arguments);live.add(h);n++;return h};" +
      "self.clearInterval=function(h){cI(h);end(h)};" +
      "self.__mmDone=function(){done=true;postMessage({t:'done',pending:n})}})();";
    //: A script that says `export` or `require` after the TypeScript pass
    //: (sucrase's `imports` transform) finds the names it expects; a run has
    //: no modules to import, and says so by name.
    var modules = "var exports={},module={exports:exports};function require(n){throw new Error('Cannot import '+n+': a run has no modules.')}";
    //: The harness is evaluated from a string on the same first line, so it
    //: adds no line to the document's numbering, and its own frames (`eval
    //: at`) are not taken for the document's by the line finder.
    var tests = d && d.tests && d.harness ? "eval(" + JSON.stringify(String(d.harness)) + ");" : "";
    var after = tests ? "\n;__mmTests().then(__mmDone);" : "\n;__mmDone();";
    var src = prelude("function(m){postMessage(m)}") + timers + modules + tests + pad(d) + code + after;
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
    worker.onmessage = function (e) { if (id === current) up(id, e.data); };
    worker.onerror = function (e) {
      e.preventDefault();
      var text = /^Uncaught/.test(e.message) ? e.message : "Uncaught " + e.message;
      if (id === current) up(id, { t: "log", level: "error", text: text, line: e.lineno || null, uncaught: true });
    };
  }
  function runHtml(id, code, d) {
    frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    var head = "<script>" + prelude("function(m){parent.postMessage(m,'*')}") +
      "window.addEventListener('error',function(e){e.preventDefault();var m=String(e.message);" +
      "parent.postMessage({t:'log',level:'error',text:/^Uncaught/.test(m)?m:'Uncaught '+m,line:e.lineno||null,uncaught:true},'*')});<\/script>";
    frame.srcdoc = head + pad(d) + code;
    document.body.appendChild(frame);
    frame.addEventListener("load", function () { if (id === current) up(id, { t: "done" }); });
  }
  function handle(e) {
    var d = e.data || {};
    if (e.source !== parent || typeof d.mmRun !== "number") return;
    if (d.type === "stop") { stop(); return; }
    if (d.type !== "run") return;
    stop();
    current = d.mmRun;
    var run = Object.prototype.hasOwnProperty.call(RUNNERS, d.kind) ? RUNNERS[d.kind] : RUNNERS.js;
    try {
      run(current, String(d.source != null ? d.source : d.code || ""), d);
    } catch (err) {
      up(current, { t: "log", level: "error", text: String(err && err.message || err), line: null });
    }
  }
  //: SQL (D5): sql.js's text and binary arrive in `lib`, from the app.
  function runSql(id, code, d) {
    var lib = d.lib || {};
    if (typeof lib.js !== "string" || !(lib.wasm instanceof ArrayBuffer)) throw new Error("SQLite did not arrive with the run.");
    worker = new Worker(URL.createObjectURL(new Blob([lib.js + "\n;" + SQL_WORKER], { type: "text/javascript" })));
    worker.onmessage = function (e) { if (id === current) up(id, e.data); };
    worker.onerror = function (e) {
      e.preventDefault();
      if (id === current) up(id, { t: "log", level: "error", text: "SQLite stopped: " + e.message, line: null, uncaught: true });
    };
    worker.postMessage({ source: code, wasm: lib.wasm, lineOffset: Number(d.lineOffset) || 0, tables: Array.isArray(d.tables) ? d.tables : [] });
  }
  //: A page in a frame from a string, shown, `done` when it has loaded.
  //: The previews (D6) are pages too: a stylesheet over the sample, an SVG
  //: as an image, a p5 sketch with the library beside it.
  function showPage(id, html) {
    frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.srcdoc = html;
    document.body.appendChild(frame);
    frame.addEventListener("load", function () { if (id === current) up(id, { t: "done" }); });
  }
  function errorHead() {
    return "<script>" + prelude("function(m){parent.postMessage(m,'*')}") +
      "window.addEventListener('error',function(e){e.preventDefault();var m=String(e.message);" +
      "parent.postMessage({t:'log',level:'error',text:/^Uncaught/.test(m)?m:'Uncaught '+m,line:e.lineno||null,uncaught:true},'*')});<\/script>";
  }
  //: A stylesheet over the sample page. No script runs: the frame carries
  //: only the sample and the rules, whose `</style` cannot close early.
  function runCss(id, code) {
    showPage(id, "<!doctype html><html><head><meta charset='utf-8'><style>" +
      code.replace(/<\/(style)/gi, "<\\/$1") + "</style></head><body>" + CSS_SAMPLE + "</body></html>");
  }
  //: An SVG, parsed here first so a broken one is a row on its line, then
  //: shown as an image: an `<img>` runs none of the file's own script.
  function runSvg(id, code) {
    var parsed = new DOMParser().parseFromString(code, "image/svg+xml");
    var broken = parsed.querySelector("parsererror");
    if (broken || !parsed.documentElement || parsed.documentElement.localName !== "svg") {
      //: The browser's report is a page of its own ("This page contains the
      //: following errors: error on line 3 at column 7: ..."): its one
      //: sentence is kept, and its line becomes the row's link.
      var text = broken ? String(broken.textContent || "").replace(/\s+/g, " ") : "";
      var at = /error on line (\d+) at column \d+: (.*?)(?: Below is a rendering.*)?$/i.exec(text);
      var said = !broken ? "This is not an SVG: its outer element is not <svg>." : "Could not read this SVG: " + (at ? at[2] : text).trim();
      up(id, { t: "log", level: "error", text: said.slice(0, 300), line: at ? Number(at[1]) : null, uncaught: true });
      return;
    }
    showPage(id, "<!doctype html><html><head><meta charset='utf-8'><style>html,body{margin:0;height:100%}" +
      "body{display:grid;place-items:center;background:#fff;background-image:linear-gradient(45deg,#eee 25%,transparent 25%,transparent 75%,#eee 75%),linear-gradient(45deg,#eee 25%,transparent 25%,transparent 75%,#eee 75%);" +
      "background-size:16px 16px;background-position:0 0,8px 8px}img{max-width:100%;max-height:100%}</style></head><body>" +
      "<img alt='' src='data:image/svg+xml;charset=utf-8," + encodeURIComponent(code).replace(/'/g, "%27") + "'></body></html>");
  }
  //: A p5.js sketch (D6, INBOX 735): the sketch's own script first, on the
  //: frame's first line so a line number is the document's, then the
  //: vendored p5.min.js, handed over by the app, which finds `setup` and
  //: `draw` and starts. A `</script` in the sketch cannot close it early.
  function runP5(id, code, d) {
    var lib = d.lib || {};
    if (typeof lib.p5 !== "string") throw new Error("p5.js did not arrive with the run.");
    showPage(id, errorHead() + "<style>html,body{margin:0}canvas{display:block}</style><script>" + pad(d) +
      code.replace(/<\/(script)/gi, "<\\/$1") + "\n<\/script><script>" + lib.p5.replace(/<\/(script)/gi, "<\\/$1") + "<\/script>");
  }
  var RUNNERS = { js: runJs, html: runHtml, sql: runSql, css: runCss, svg: runSvg, p5: runP5 };
  window.onmessage = function (e) {
    //: A message from the page being run goes up as that run's; anything
    //: else must be the app's own.
    if (frame && e.source === frame.contentWindow) { up(current, e.data || {}); return; }
    handle(e);
  };
  parent.postMessage({ mmRun: 0, t: "ready" }, "*");
})();
</script></body></html>
"""
)


@router.get("/documents/run-sandbox")
def run_sandbox() -> Response:
    """The runner page, under its own policy. See the module docstring."""
    return Response(
        content=RUN_SANDBOX_HTML,
        media_type="text/html; charset=utf-8",
        headers={
            "Content-Security-Policy": RUN_SANDBOX_CSP,
            "X-Frame-Options": "SAMEORIGIN",
            "Cache-Control": "no-store",
        },
    )


# --- Python, through the Pyodide extra (INBOX 404) ---------------------------
#
# The owner, 2026-09-24: "Run Python files: yes, as an opt-in extra". The
# runtime is Pyodide, CPython compiled to WebAssembly, downloaded once by the
# `pyodide` entry in `core/extras.py` into the data dir and served from there
# by the route at the bottom of this file. Nothing here is used until it is.
#
# **The same sandbox, one path wider.** The Python page is the JavaScript
# page's policy with exactly one change: the runtime's own files. Pyodide
# loads a module, compiles a WebAssembly binary and fetches its standard
# library, so `script-src` and `connect-src` name `/documents/pyodide/` on
# this server, as a path, and nothing else: not the server's other routes,
# not `'self'`, not another origin. The page is still an opaque origin with
# none of the notebook's storage, and the user's code still reaches the app
# only through `postMessage`.
#
# **Why the origin is written out.** A CSP source with a path cannot be
# spelled with `'self'`, so the policy is built per request from the address
# the page was asked for. That address comes from the Host header, so it is
# checked against a plain host[:port] shape first: a header carrying `;` or a
# space would otherwise write its own directives into the policy.

_HOST_RE = re.compile(r"(?:[A-Za-z0-9.-]+|\[[0-9A-Fa-f:.]+\])(?::\d{1,5})?")

#: Where the runtime's files are served; the policy names exactly this path.
PYODIDE_PATH = "/documents/pyodide/"

#: The app's cap on a run's output (`DOC_RUN_MAX_ROWS` in
#: `frontend/js/documents-code.js`), kept at the source as well; see the worker.
MAX_LINES = 500


def python_csp(base: str) -> str:
    """The JavaScript runner's policy, plus `base` (the runtime's folder URL)
    in `script-src` and `connect-src`. `'wasm-unsafe-eval'` says what the
    WebAssembly compile needs by name; `'unsafe-eval'` already covered it."""
    return (
        "sandbox allow-scripts; default-src 'none'; "
        f"script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: {base}; "
        "worker-src blob:; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; "
        f"media-src data: blob:; connect-src {base}; base-uri 'none'; form-action 'none'; "
        "frame-ancestors 'self'"
    )


#: The Python half, run inside Pyodide once per worker. `_mm_run` executes a
#: document under the file name `<document>`, so a traceback frame (or a
#: syntax error) that names that file carries the document's own line
#: number. `print` goes through `_MMOut`, which sends each line up with the
#: line of the document that printed it, found by walking the stack to the
#: innermost `<document>` frame. A fresh namespace per run, so one run's
#: variables are not the next run's; imported modules stay cached, which is
#: what makes a second run quick.
PY_RUNNER = r'''
import sys, traceback

class _MMOut:
    encoding = "utf-8"

    def __init__(self, level, emit):
        self.level, self.emit, self.buf, self.line = level, emit, "", None

    @staticmethod
    def _where():
        frame = sys._getframe(2)
        while frame is not None and frame.f_code.co_filename != "<document>":
            frame = frame.f_back
        return frame.f_lineno if frame is not None else None

    def write(self, text):
        text = str(text)
        if text and self.line is None:
            self.line = self._where()
        self.buf += text
        while "\n" in self.buf:
            row, self.buf = self.buf.split("\n", 1)
            self.emit(self.level, row, self.line, False)
            self.line = self._where() if self.buf else None
        return len(text)

    def flush(self):
        if self.buf:
            self.emit(self.level, self.buf, self.line, False)
        self.buf, self.line = "", None

    def isatty(self):
        return False


def _mm_input(prompt=""):
    """`input()` answered from the panel's Input box (D9): each call takes
    the next line, and the prompt and the answer show as one row, as a
    terminal shows them."""
    if prompt:
        sys.stdout.write(str(prompt))
    line = sys.stdin.readline()
    if not line:
        sys.stdout.flush()
        raise EOFError("input() asked for more lines than the Input box holds: add a line there and run again.")
    line = line.rstrip("\n")
    sys.stdout.write(line + "\n")
    return line


def _mm_run(code, emit, offset=0, stdin=""):
    import io

    out, err = _MMOut("log", emit), _MMOut("error", emit)
    saved = sys.stdout, sys.stderr, sys.stdin
    sys.stdout, sys.stderr, sys.stdin = out, err, io.StringIO(str(stdin or ""))
    try:
        # Blank lines for the document above a selection or a cell, so every
        # line number is the document's.
        exec(compile("\n" * max(0, int(offset)) + code, "<document>", "exec"), {"__name__": "__main__", "input": _mm_input})
    except SystemExit as stop:
        out.flush(); err.flush()
        if stop.code not in (None, 0):
            emit("info", f"Exited with {stop.code}.", None, False)
    except BaseException as exc:
        out.flush(); err.flush()
        line = None
        if isinstance(exc, SyntaxError) and exc.filename == "<document>":
            line = exc.lineno
        for frame in traceback.extract_tb(exc.__traceback__):
            if frame.filename == "<document>":
                line = frame.lineno
        text = traceback.format_exception_only(type(exc), exc)[-1].strip()
        emit("error", text, line, True)
    finally:
        out.flush(); err.flush()
        sys.stdout, sys.stderr, sys.stdin = saved


def _mm_line(exc):
    """The document's line an exception was raised from (its innermost
    `<document>` frame), or None."""
    line = None
    if isinstance(exc, SyntaxError) and exc.filename == "<document>":
        line = exc.lineno
    for frame in traceback.extract_tb(exc.__traceback__):
        if frame.filename == "<document>":
            line = frame.lineno
    return line


def _mm_tests(code, emit, emit_test, offset=0):
    """Tests are a kind of run (D7): every `unittest.TestCase` in the
    document, and every plain `test*` function (pytest's shape, bare
    `assert`, without pytest), in the order they are written. Each sends
    `emit_test(name, state, ms, text, line)`; the totals come back."""
    import time
    import unittest

    out, err = _MMOut("log", emit), _MMOut("error", emit)
    saved = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = out, err
    counts = {"passed": 0, "failed": 0, "skipped": 0}
    space = {"__name__": "__mm_tests__"}
    try:
        try:
            exec(compile("\n" * max(0, int(offset)) + code, "<document>", "exec"), space)
        except BaseException as exc:
            out.flush(); err.flush()
            emit("error", traceback.format_exception_only(type(exc), exc)[-1].strip(), _mm_line(exc), True)
            return counts

        class Result(unittest.TestResult):
            outcome = ("pass", "", None)

            def _note(self, state, err_info):
                exc = err_info[1]
                text = "".join(traceback.format_exception_only(type(exc), exc)).strip()
                self.outcome = (state, text, _mm_line(exc))

            def addFailure(self, test, err_info):
                super().addFailure(test, err_info)
                self._note("fail", err_info)

            def addError(self, test, err_info):
                super().addError(test, err_info)
                self._note("fail", err_info)

            def addSkip(self, test, reason):
                super().addSkip(test, reason)
                self.outcome = ("skip", str(reason), None)

            def addUnexpectedSuccess(self, test):
                super().addUnexpectedSuccess(test)
                self.outcome = ("fail", "Passed, but it was marked as expected to fail.", None)

        def first_line(fn):
            import inspect

            # A decorated test (`unittest.skip`) is found by the function it wraps.
            fn = inspect.unwrap(getattr(fn, "__func__", fn))
            code_obj = getattr(fn, "__code__", None)
            return code_obj.co_firstlineno if code_obj and code_obj.co_filename == "<document>" else None

        found = []
        loader = unittest.TestLoader()
        for value in list(space.values()):
            if isinstance(value, type) and issubclass(value, unittest.TestCase) and value.__module__ == "__mm_tests__":
                for name in loader.getTestCaseNames(value):
                    found.append((first_line(getattr(value, name)) or 0, f"{value.__name__}.{name}", value(name)))
            elif callable(value) and not isinstance(value, type) and getattr(value, "__name__", "").startswith("test"):
                line = first_line(value)
                if line is not None:
                    found.append((line, value.__name__, value))
        if not found:
            emit("info", "No tests found: a test is a unittest.TestCase method, or a function whose name starts with test.", None, False)
            return counts
        for line, name, test in sorted(found, key=lambda row: row[0]):
            start = time.perf_counter()
            if isinstance(test, unittest.TestCase):
                result = Result()
                test(result)
                state, text, where = result.outcome
            else:
                state, text, where = "pass", "", None
                try:
                    test()
                except BaseException as exc:  # a plain test fails on anything it raises
                    state, where = "fail", _mm_line(exc)
                    text = "".join(traceback.format_exception_only(type(exc), exc)).strip()
                    if isinstance(exc, AssertionError) and not str(exc):
                        text = "AssertionError: the assert on this line was false."
            out.flush(); err.flush()
            ms = round((time.perf_counter() - start) * 1000)
            counts[{"pass": "passed", "fail": "failed", "skip": "skipped"}[state]] += 1
            emit_test(name, state, ms, text, where or line or None)
        return counts
    finally:
        out.flush(); err.flush()
        sys.stdout, sys.stderr = saved
'''

#: The worker, a classic one that `import()`s Pyodide's module from its
#: folder. **Not `{type: "module"}`**: measured in Chromium, a module worker
#: made from a `blob:null` URL inside this opaque origin never ran a line
#: (probably its script fetch: a module script is a CORS fetch, and this
#: blob's origin is opaque), while
#: the classic worker with a dynamic `import()` loads all five files. It
#: loads the runtime on its first run and keeps it: a later run reuses it,
#: and Stop (or the app's timeout, or its line cap) terminates the worker,
#: after which the next run loads it again. `started` is sent when the
#: document's code actually begins, so the app's ten seconds count the
#: script, not the runtime's start-up.
_PY_WORKER = (
    "const RUNNER = " + json.dumps(PY_RUNNER) + ";\n"
    + f"const MAX_LINES = {MAX_LINES};\n"
    + r"""
let py = null;
async function load(post) {
  if (py) return py;
  post({ t: "status", text: "Starting Python" });
  const mod = await import(BASE + "pyodide.mjs");
  py = await mod.loadPyodide({ indexURL: BASE, stdin: () => null });
  py.runPython(RUNNER);
  return py;
}
self.onmessage = async (e) => {
  const run = e.data.run;
  const post = (msg) => postMessage({ run, msg });
  try {
    const p = await load(post);
    post({ t: "started" });
    //: The app stops a run at 500 lines, but only once it has read 500:
    //: measured in Chromium, a `while True: print(i)` posted lines far
    //: faster than the app's tab could take them, and the backlog kept the
    //: tab busy for minutes after Stop. So the cap is kept here too, at the
    //: source: past it, nothing more is posted and the app's Stop arrives
    //: behind at most 500 messages.
    let sent = 0;
    const emit = (level, text, line, uncaught) => {
      sent += 1;
      if (sent > MAX_LINES && !uncaught) return;
      post({
        t: "log", level: String(level), text: String(text),
        line: line == null ? null : Number(line), uncaught: Boolean(uncaught),
      });
    };
    if (e.data.tests) {
      //: Tests (D7): one `test` row per test, then the totals.
      const t0 = performance.now();
      const emitTest = (name, state, ms, text, line) => post({
        t: "test", name: String(name), state: String(state), ms: Number(ms) || 0,
        text: String(text || ""), line: line == null ? null : Number(line),
      });
      const tester = p.globals.get("_mm_tests");
      let counts = null;
      try {
        counts = tester(String(e.data.source || ""), emit, emitTest, Number(e.data.lineOffset) || 0);
        const totals = counts.toJs({ dict_converter: Object.fromEntries });
        post({ t: "tests-done", passed: totals.passed, failed: totals.failed, skipped: totals.skipped, ms: Math.round(performance.now() - t0) });
      } finally {
        if (counts && counts.destroy) counts.destroy();
        tester.destroy();
      }
    } else {
      const runner = p.globals.get("_mm_run");
      try { runner(String(e.data.source || ""), emit, Number(e.data.lineOffset) || 0, String(e.data.stdin || "")); } finally { runner.destroy(); }
    }
    post({ t: "done" });
  } catch (err) {
    post({ t: "log", level: "error", text: "Python could not run: " + String((err && err.message) || err), line: null, uncaught: true });
  }
  postMessage({ run, idle: true });
};
"""
)

RUN_SANDBOX_PY_HTML = (
    r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Run Python</title></head><body><script>
(function () {
  "use strict";
  var BASE = new URL("/documents/pyodide/", location.href).href;
  var WORKER = """
    + json.dumps(_PY_WORKER).replace("</", "<\\/")
    + r""";
  var worker = null, current = 0, busy = false;
  function up(id, msg) { msg.mmRun = id; parent.postMessage(msg, "*"); }
  function stop() {
    if (worker) { worker.terminate(); worker = null; }
    busy = false;
  }
  function boot() {
    var src = "const BASE = " + JSON.stringify(BASE) + ";\n" + WORKER;
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
    worker.onmessage = function (e) {
      var d = e.data || {};
      if (d.idle) { busy = false; return; }
      if (d.run === current && d.msg) up(current, d.msg);
    };
    worker.onerror = function (e) {
      e.preventDefault();
      up(current, { t: "log", level: "error", text: "Python could not start: " + (e.message || "the runtime did not load"), line: null, uncaught: true });
      stop();
    };
  }
  function handle(e) {
    var d = e.data || {};
    if (e.source !== parent || typeof d.mmRun !== "number") return;
    if (d.type === "stop") { stop(); return; }
    if (d.type !== "run") return;
    //: A run still going (a `while True`) cannot be interrupted from here:
    //: the worker goes, and the new run gets a fresh one.
    if (busy) stop();
    current = d.mmRun;
    if (!worker) boot();
    busy = true;
    worker.postMessage({
      run: current,
      source: String(d.source != null ? d.source : d.code || ""),
      lineOffset: Number(d.lineOffset) || 0,
      tests: Boolean(d.tests),
      stdin: String(d.stdin || ""),
    });
  }
  window.onmessage = handle;
  parent.postMessage({ mmRun: 0, t: "ready", runner: "python" }, "*");
})();
</script></body></html>
"""
)


@router.get("/documents/run-sandbox/python")
def run_sandbox_python(request: Request) -> Response:
    """The Python runner page, under the policy `python_csp` builds for the
    address it was asked for. Served whether or not the runtime is installed:
    the app asks `/extras` first, and without the files the worker says it
    could not start."""
    netloc = request.headers.get("host") or request.url.netloc
    if request.url.scheme not in {"http", "https"} or not _HOST_RE.fullmatch(netloc):
        raise HTTPException(status_code=400, detail="Bad host.")
    base = f"{request.url.scheme}://{netloc}{PYODIDE_PATH}"
    return Response(
        content=RUN_SANDBOX_PY_HTML,
        media_type="text/html; charset=utf-8",
        headers={
            "Content-Security-Policy": python_csp(base),
            "X-Frame-Options": "SAMEORIGIN",
            "Cache-Control": "no-store",
        },
    )


_PYODIDE_TYPES = {
    ".mjs": "text/javascript; charset=utf-8",
    ".wasm": "application/wasm",
    ".zip": "application/zip",
    ".json": "application/json",
}


@router.get(PYODIDE_PATH + "{name}")
def pyodide_file(name: str) -> FileResponse:
    """One of the Pyodide runtime's files, once the extra is installed.

    Only the names the extra's entry unpacks are served (not its marker, not
    anything else in the folder), and `name` is looked up in that set rather
    than joined onto a path, so no spelling of `..` reaches the disk. Open
    without the unlock, like the page that loads them: the sandbox is an
    opaque origin and cannot send the token, and these are the public
    Pyodide release, nothing of the notebook's. `Access-Control-Allow-Origin`
    because that same opaque origin makes every fetch cross-origin.
    """
    from memorymap.core import extras

    extra = extras.EXTRAS_BY_ID["pyodide"]
    #: The path is built from the release's own list, never from the request:
    #: `name` only picks an entry, so what reaches the disk is a string this
    #: file wrote (CodeQL reads a membership test as no guard at all).
    served = {file: file for download in extra.downloads for _member, file in download.members}
    folder = extras.download_ready("pyodide")
    listed = served.get(name)
    if folder is None or listed is None or not (folder / listed).is_file():
        raise HTTPException(status_code=404, detail="Not installed.")
    suffix = "." + listed.rsplit(".", 1)[-1]
    return FileResponse(
        folder / listed,
        media_type=_PYODIDE_TYPES.get(suffix, "application/octet-stream"),
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cross-Origin-Resource-Policy": "cross-origin",
            "Cache-Control": "no-cache",
        },
    )


# --- A long run is a job in the Activity panel (DOCUMENTS_PLAN 25 row 9) ------
#
# Decision 70: background work is "visible and stoppable". A run happens in
# the browser's sandbox, not here, so the panel registers a run that is still
# going after two seconds, renews it every second, and asks each time whether
# Activity's Stop was pressed; the answer stops the run in the tab. The lease
# (`core/activity.py`) ends a row whose tab went away. These routes are
# behind the unlock like every other (`jobs_router`): they name a run, never
# its code.

#: Seconds a run's row lives without a renewal.
RUN_JOB_LEASE_S = 6.0
#: Runs listed at once: a bounded list, whatever a page asks for.
RUN_JOB_MAX = 8
RUN_JOB_KIND = "code-run"

#: Behind the unlock, unlike the sandbox pages above: `app.py` includes this
#: router with the lock, the pages' router without it.
jobs_router = APIRouter(tags=["documents"])


class RunJobBody(BaseModel):
    label: str = Field(default="Running a code document", max_length=120)


def _run_job(job_id: str):
    from memorymap.core import activity

    job = activity.get(job_id)
    if job is None or job.kind != RUN_JOB_KIND:
        raise HTTPException(status_code=404, detail="That run has ended.")
    return job


@jobs_router.post("/documents/run-jobs")
def start_run_job(body: RunJobBody) -> dict:
    """List a long run in Activity, with Stop."""
    from memorymap.core import activity

    if activity.count(RUN_JOB_KIND) >= RUN_JOB_MAX:
        raise HTTPException(status_code=429, detail="Too many runs are listed already.")
    label = " ".join(body.label.split())[:120] or "Running a code document"
    job = activity.start(RUN_JOB_KIND, label, stoppable=True, lease=RUN_JOB_LEASE_S)
    return {"id": job.id, "lease": RUN_JOB_LEASE_S}


@jobs_router.post("/documents/run-jobs/{job_id}/beat")
def beat_run_job(job_id: str) -> dict:
    """Renew the run's row; says whether Activity asked it to stop."""
    job = _run_job(job_id)
    job.touch()
    return {"stopped": job.stopped}


@jobs_router.delete("/documents/run-jobs/{job_id}")
def end_run_job(job_id: str) -> dict:
    """The run ended in the tab: its row goes."""
    from memorymap.core import activity

    activity.finish(_run_job(job_id))
    return {"status": "ok"}
