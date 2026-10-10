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

#: Cross-origin isolation (D2): with these on the sandbox pages and on the app
#: that frames them, the sandbox and its workers have `SharedArrayBuffer`,
#: which the Python debugger and a mid-run `input()` block on. The policy is
#: unchanged; a webview that drops the headers still runs, and Debug says why
#: it cannot.
ISOLATION_HEADERS = {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
}

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


#: The JavaScript debugger (DOCUMENTS_PLAN 23, D3), a worker made from
#: JS-Interpreter's text (handed over by the app in `lib.interp`, from
#: `frontend/vendor/js-interpreter`) with this after it. The script is
#: stepped one interpreter state at a time; at each statement about to run
#: the driver decides whether to stop (a breakpoint and its condition, or the
#: step asked for: in, over, out by the depth of the call stack), and a stop
#: is one message with the line, the frame's variables, the stack and the
#: watches. Between stops the worker is idle, waiting for the panel's next
#: action as an ordinary message, so it needs no shared memory. An exception
#: nothing catches is seen as it is thrown, before the stack unwinds, so its
#: stop has the frame and the variables it was raised with. Watches and
#: conditions are evaluated natively over the frame's values (read-only by
#: intent); timers run as the interpreter's own tasks.
_JS_DEBUG_WORKER = r"""
(function () {
  "use strict";
  var I = Interpreter, interp = null, breaks = {}, watches = [], seen = new WeakSet();
  var mode = "continue", base = 0, last = null, paused = null, finished = false, thrown = null, builtins = null;
  var STEP_BUDGET = 4000, REPR = 200, NAMES = 200;
  //: A statement is where a line stops, as a line is where VS Code stops.
  var SKIP = { BlockStatement: 1, FunctionDeclaration: 1, EmptyStatement: 1 };
  function isStatement(node) {
    return /(?:Statement|Declaration)$/.test(node.type) && !SKIP[node.type];
  }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  //: A value as the panel shows it: short, never the interpreter's insides.
  function show(v, depth) {
    depth = depth || 0;
    if (v === undefined) return "undefined";
    if (v === null) return "null";
    if (typeof v === "string") return depth ? JSON.stringify(v) : JSON.stringify(v);
    if (typeof v !== "object") return String(v);
    if (!(v instanceof I.Object)) return String(v);
    var p = v.properties || {};
    if (v.class === "Function") {
      var n = v.node && v.node.id ? v.node.id.name : "";
      return "function " + n + "()";
    }
    if (v.class === "Error") return String(interp.getProperty(v, "name") || "Error") + ": " + String(interp.getProperty(v, "message") || "");
    if (v.class === "RegExp" || v.class === "Date") return String(v.data);
    if (depth > 1) return v.class === "Array" ? "[...]" : "{...}";
    var parts = [];
    if (v.class === "Array") {
      var len = Number(p.length) || 0;
      for (var i = 0; i < Math.min(len, 50); i++) parts.push(show(p[i], depth + 1));
      if (len > 50) parts.push("...");
      return clip("[" + parts.join(", ") + "]");
    }
    for (var k in p) {
      if (!own(p, k)) continue;
      parts.push(k + ": " + show(p[k], depth + 1));
      if (parts.length >= 30) { parts.push("..."); break; }
    }
    return clip("{" + parts.join(", ") + "}");
  }
  function clip(t) { t = String(t); return t.length <= REPR ? t : t.slice(0, REPR - 3) + "..."; }
  function kind(v) {
    if (v === null) return "null";
    if (v instanceof I.Object) return v.class === "Function" ? "function" : v.class === "Array" ? "array" : "object";
    return typeof v;
  }
  function names(props, skip) {
    var rows = [];
    for (var k in props) {
      if (!own(props, k) || (skip && skip[k])) continue;
      rows.push({ name: k, value: clip(show(props[k])), type: kind(props[k]) });
      if (rows.length >= NAMES) break;
    }
    return rows;
  }
  //: The call stack from the interpreter's own state stack: a call whose body
  //: is running opens a frame; every state with a location moves its frame's
  //: line, so a caller's line is its call and the top frame's is the stop.
  function frames(stack) {
    var out = [{ name: "(top level)", line: null, scope: interp.getGlobalScope() }];
    for (var i = 0; i < stack.length; i++) {
      var s = stack[i], n = s.node, top = out[out.length - 1];
      if (n.loc) top.line = n.loc.start.line;
      if (s.scope) top.scope = s.scope;
      if ((n.type === "CallExpression" || n.type === "NewExpression") && s.doneExec_ && s.func_ && s.func_.node) {
        var fn = s.func_.node;
        out.push({ name: (fn.id && fn.id.name) || "(anonymous)", line: top.line, scope: s.scope });
      }
    }
    return out.reverse();
  }
  //: A watch, or a breakpoint's condition, evaluated against the stopped
  //: frame's variables: a name resolves through the frame's scopes to the
  //: interpreter's value, made native; anything else is this worker's own
  //: global (Math, JSON). Read-only by intent: it runs natively, not stepped.
  function evaluate(expr, scope) {
    function find(k) {
      for (var s = scope; s; s = s.parentScope) if (own(s.object.properties, k)) return s;
      return null;
    }
    var view = new Proxy({}, {
      has: function (t, k) { return typeof k === "string" && !!find(k); },
      get: function (t, k) {
        if (typeof k !== "string") return undefined;
        var s = find(k);
        if (!s) return undefined;
        var v = s.object.properties[k];
        try { return interp.pseudoToNative(v); } catch (e) { return v; }
      },
    });
    return Function("__mmScope", "with (__mmScope) { return (" + expr + "\n); }")(view);
  }
  function showNative(r) {
    if (typeof r === "string") return clip(JSON.stringify(r));
    if (r && typeof r === "object") { try { return clip(JSON.stringify(r)); } catch (e) { return clip(String(r)); } }
    return clip(String(r));
  }
  function snapshot(reason, fr, line, text) {
    var top = fr[0], locals = [], globals = [];
    var global = interp.getGlobalScope();
    if (fr.length > 1) {
      for (var s = top.scope; s && s !== global; s = s.parentScope) locals = locals.concat(names(s.object.properties, { "this": 1, arguments: 1 }));
      globals = names(global.object.properties, builtins);
    } else {
      locals = names(global.object.properties, builtins);
    }
    var w = [];
    for (var i = 0; i < watches.length; i++) {
      try { w.push({ expr: watches[i], value: showNative(evaluate(watches[i], top.scope)) }); }
      catch (e) { w.push({ expr: watches[i], error: String(e && e.name || "Error") + ": " + String(e && e.message || e) }); }
    }
    return {
      t: "stop", reason: reason, line: line, text: text || "",
      locals: locals, globals: globals, watches: w,
      stack: fr.map(function (f) { return { name: f.name, line: f.line }; }),
    };
  }
  function lineNow() {
    var stack = interp.getStateStack();
    for (var i = stack.length - 1; i >= 0; i--) if (stack[i].node.loc) return stack[i].node.loc.start.line;
    return null;
  }
  //: Console rows, with the line that called them.
  function fmt(v) { return typeof v === "string" ? v : show(v); }
  function init(it, g) {
    var con = it.nativeToPseudo({});
    ["log", "info", "warn", "error", "debug"].forEach(function (k) {
      it.setProperty(con, k, it.createNativeFunction(function () {
        var parts = [];
        for (var i = 0; i < arguments.length; i++) parts.push(fmt(arguments[i]));
        postMessage({ t: "log", level: k, text: parts.join(" "), line: lineNow() });
      }));
    });
    it.setProperty(g, "console", con);
    if (DOM) stubDocument(it, g);
  }
  //: Scripts that use the DOM debug against a stand-in: every element is a
  //: plain object whose methods do nothing and whose finders hand back
  //: another stand-in, so the script's own logic can be stepped. The app
  //: says so in a row; nothing is drawn.
  function stubDocument(it, g) {
    function noop() { return undefined; }
    function element(tag) {
      var el = it.nativeToPseudo({ tagName: String(tag || "div").toUpperCase(), id: "", className: "", textContent: "", innerHTML: "", value: "", checked: false, style: {}, dataset: {} });
      var cls = it.nativeToPseudo({});
      ["add", "remove", "toggle"].forEach(function (k) { it.setProperty(cls, k, it.createNativeFunction(noop)); });
      it.setProperty(cls, "contains", it.createNativeFunction(function () { return false; }));
      it.setProperty(el, "classList", cls);
      ["addEventListener", "removeEventListener", "setAttribute", "removeAttribute", "remove", "focus", "blur", "click"].forEach(function (k) {
        it.setProperty(el, k, it.createNativeFunction(noop));
      });
      it.setProperty(el, "getAttribute", it.createNativeFunction(function () { return null; }));
      ["appendChild", "append", "prepend", "insertBefore", "replaceChildren"].forEach(function (k) {
        it.setProperty(el, k, it.createNativeFunction(function (child) { return child; }));
      });
      it.setProperty(el, "querySelector", it.createNativeFunction(function () { return element("div"); }));
      it.setProperty(el, "querySelectorAll", it.createNativeFunction(function () { return it.nativeToPseudo([]); }));
      return el;
    }
    var doc = element("#document");
    it.setProperty(doc, "body", element("body"));
    it.setProperty(doc, "documentElement", element("html"));
    it.setProperty(doc, "getElementById", it.createNativeFunction(function (id) { var el = element("div"); it.setProperty(el, "id", String(id)); return el; }));
    it.setProperty(doc, "createElement", it.createNativeFunction(function (tag) { return element(tag); }));
    it.setProperty(doc, "createTextNode", it.createNativeFunction(function (text) { var el = element("#text"); it.setProperty(el, "textContent", String(text)); return el; }));
    it.setProperty(g, "document", doc);
    it.setProperty(g, "window", g);
    it.setProperty(g, "addEventListener", it.createNativeFunction(noop));
  }
  //: An exception nothing catches: seen in `unwind` before the stack is
  //: unwound, so the stop has the frame it was raised in and its variables.
  var unwind = I.prototype.unwind;
  I.prototype.unwind = function (type, value, label) {
    if (type === I.Completion.THROW && !thrown) {
      var stack = this.getStateStack(), caught = false;
      for (var i = 0; i < stack.length; i++) if (stack[i].node.type === "TryStatement") caught = true;
      if (!caught) {
        var fr = frames(stack);
        var text = "Uncaught " + show(value).replace(/^"|"$/g, "");
        var trace = fr.map(function (f) { return "    at " + f.name + (f.line ? " (line " + f.line + ")" : ""); }).join("\n");
        thrown = { frames: fr, line: fr[0].line, text: text, trace: text + "\n" + trace };
      }
    }
    return unwind.call(this, type, value, label);
  };
  function condition(line, scope) {
    var cond = breaks[line];
    if (cond === undefined) return false;
    if (!cond) return true;
    try { return Boolean(evaluate(cond, scope)); } catch (e) { return true; }
  }
  function within(node, outer) {
    return outer && node !== outer && node.start >= outer.start && node.end <= outer.end;
  }
  //: Decide, at a statement about to run, whether this is a stop.
  function decide(state) {
    var node = state.node, line = node.loc.start.line;
    if (last && line === last.loc.start.line && within(node, last)) return null;
    //: Continuing past a line with no breakpoint is the common case, and it
    //: needs no stack walk.
    if (mode === "continue" && !own(breaks, line)) return null;
    var fr = frames(interp.getStateStack()), depth = fr.length - 1;
    if (condition(line, fr[0].scope)) return { reason: "breakpoint", frames: fr, line: line };
    if (mode === "in" || (mode === "over" && depth <= base) || (mode === "out" && depth < base)) return { reason: "step", frames: fr, line: line };
    return null;
  }
  function pause(stop) {
    paused = stop;
    if (stop.node) last = stop.node;
    postMessage(snapshot(stop.reason, stop.frames, stop.line, stop.text));
  }
  function finish(ended) {
    finished = true;
    postMessage({ t: "done", ended: ended || "done" });
  }
  function go() {
    if (paused || finished) return;
    var budget = STEP_BUDGET;
    try {
      while (budget-- > 0) {
        var more = interp.step();
        if (!more) return finish("done");
        var stack = interp.getStateStack(), top = stack[stack.length - 1];
        if (top && top.node.loc && !seen.has(top)) {
          seen.add(top);
          if (isStatement(top.node)) {
            var stop = decide(top);
            if (stop) { stop.node = top.node; return pause(stop); }
          }
        }
        if (interp.getStatus() === I.Status.TASK) {
          var due = interp.tasks.length ? interp.tasks[0].time - Date.now() : 0;
          setTimeout(go, Math.max(0, Math.min(due, 1000)));
          return;
        }
      }
    } catch (e) {
      if (thrown) {
        var t = thrown;
        return pause({ reason: "exception", frames: t.frames, line: t.line, text: t.trace, uncaught: t.text });
      }
      postMessage({ t: "log", level: "error", text: "Uncaught " + String(e && e.message || e), line: lineNow(), uncaught: true });
      return finish("error");
    }
    setTimeout(go, 0);
  }
  var DOM = false;
  self.onmessage = function (e) {
    var d = e.data || {};
    if (d.reply) {
      var r = d.reply;
      if (Array.isArray(r.breaks)) setBreaks(r.breaks);
      if (Array.isArray(r.watches)) watches = r.watches.map(String).slice(0, 50);
      if (!paused) return;
      if (r.cmd === "eval") { postMessage(snapshot(paused.reason, paused.frames, paused.line, paused.text)); return; }
      if (paused.reason === "exception") {
        postMessage({ t: "log", level: "error", text: paused.uncaught, line: paused.line, uncaught: true });
        paused = null;
        return finish("error");
      }
      if (r.cmd === "stop") { paused = null; return finish("stopped"); }
      mode = r.cmd === "in" || r.cmd === "over" || r.cmd === "out" ? r.cmd : "continue";
      base = paused.frames.length - 1;
      paused = null;
      go();
      return;
    }
    if (typeof d.source !== "string") return;
    setBreaks(d.breaks || []);
    watches = (d.watches || []).map(String).slice(0, 50);
    DOM = Boolean(d.dom);
    builtins = {};
    var bare = new I("", function (it, g) { init(it, g); });
    for (var k in bare.getGlobalScope().object.properties) builtins[k] = 1;
    try {
      interp = new I(d.source, init);
    } catch (err) {
      var at = err && err.loc ? err.loc.line : null;
      postMessage({ t: "log", level: "error", text: "Debug could not read this: " + String(err && err.message || err).replace(/\s*\(\d+:\d+\)$/, ""), line: at, uncaught: true });
      return finish("error");
    }
    postMessage({ t: "started" });
    go();
  };
  function setBreaks(list) {
    breaks = {};
    for (var i = 0; i < list.length; i++) {
      var line = Number(list[i] && list[i].line) || 0;
      if (line > 0) breaks[line] = String(list[i].cond || "").trim();
    }
  }
})();
"""

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
  var JS_DEBUG = """
    + json.dumps(_JS_DEBUG_WORKER).replace("</", "<\\/")
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
    //: The panel's action at a debugger stop, for the stepping worker.
    if (d.type === "reply") { if (worker && d.mmRun === current) worker.postMessage({ reply: d.value }); return; }
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
  //: Debug for JavaScript (D3): JS-Interpreter's text, from the app in
  //: `lib.interp`, and the driver after it, in a worker that steps the script
  //: and waits between stops for the panel's next action (`reply`).
  function runJsDebug(id, code, d) {
    var lib = d.lib || {};
    if (typeof lib.interp !== "string") throw new Error("The debugger did not arrive with the run.");
    worker = new Worker(URL.createObjectURL(new Blob([lib.interp + "\n;" + JS_DEBUG], { type: "text/javascript" })));
    worker.onmessage = function (e) { if (id === current) up(id, e.data); };
    worker.onerror = function (e) {
      e.preventDefault();
      if (id === current) up(id, { t: "log", level: "error", text: "The debugger stopped: " + e.message, line: null, uncaught: true });
    };
    worker.postMessage({ source: pad(d) + code, breaks: Array.isArray(d.breaks) ? d.breaks : [], watches: Array.isArray(d.watches) ? d.watches : [], dom: Boolean(d.dom) });
  }
  var RUNNERS = { js: runJs, html: runHtml, sql: runSql, css: runCss, svg: runSvg, p5: runP5, jsdebug: runJsDebug };
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
            **ISOLATION_HEADERS,
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


#: Asks the panel for a line mid-run (Brief 70): set by a run when the page
#: has SharedArrayBuffer, so the worker can wait for the answer. One list,
#: not a global rebinding, so the helpers below share it.
_MM_ASK = [None]


def _mm_input(prompt=""):
    """`input()` answered from the panel's Input box (D9): each call takes
    the next line, and the prompt and the answer show as one row, as a
    terminal shows them. Once the box is used up, the panel asks for the
    line there and then, where the page can wait for it (D2's buffer)."""
    if prompt:
        sys.stdout.write(str(prompt))
    line = sys.stdin.readline()
    if not line and _MM_ASK[0] is not None:
        answer = _MM_ASK[0](str(prompt))
        line = None if answer is None else str(answer) + "\n"
    if not line:
        sys.stdout.flush()
        raise EOFError("input() asked for more lines than the Input box holds: add a line there and run again.")
    line = line.rstrip("\n")
    sys.stdout.write(line + "\n")
    return line


def _mm_run(code, emit, offset=0, stdin="", ask=None):
    import io

    out, err = _MMOut("log", emit), _MMOut("error", emit)
    saved = sys.stdout, sys.stderr, sys.stdin
    sys.stdout, sys.stderr, sys.stdin = out, err, io.StringIO(str(stdin or ""))
    _MM_ASK[0] = ask
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
        _MM_ASK[0] = None


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


import bdb

#: What a stop shows of a value, and how many names a scope lists.
_MM_REPR = 200
_MM_NAMES = 200


def _mm_show(value):
    try:
        text = repr(value)
    except BaseException as exc:  # a broken __repr__ is the user's, not ours
        text = f"<repr failed: {type(exc).__name__}>"
    return text if len(text) <= _MM_REPR else text[: _MM_REPR - 3] + "..."


def _mm_names(space, skip=()):
    rows = []
    for name, value in list(space.items()):
        if (name.startswith("__") and name.endswith("__")) or name in skip:
            continue
        rows.append({"name": str(name), "value": _mm_show(value), "type": type(value).__name__})
        if len(rows) >= _MM_NAMES:
            break
    return rows


class _MMDebugger(bdb.Bdb):
    """D2: `bdb` itself, not a re-implementation. Each stop goes up as one
    message (line, locals, globals, the stack, the watch list evaluated in the
    stopped frame) through `exchange`, which blocks the worker on
    `Atomics.wait` until the panel's action comes back: continue, over, in,
    out, stop, or `eval` (new watches or breakpoints, answered with a fresh
    stop). Only the document's own frames stop; the runtime's and the
    standard library's run through."""

    def __init__(self, exchange, breaks, watches):
        super().__init__()
        self.exchange, self.watches, self.first = exchange, list(watches or []), True
        self.ended_by_stop = False
        self.set_breaks(breaks)

    def set_breaks(self, breaks):
        self.clear_all_breaks()
        for row in breaks or []:
            line = int(row.get("line") or 0)
            cond = str(row.get("cond") or "").strip() or None
            if line > 0:
                self.set_break("<document>", line, cond=cond)

    def stop_here(self, frame):
        return frame.f_code.co_filename == "<document>" and super().stop_here(frame)

    def user_call(self, frame, args):
        pass

    def user_line(self, frame):
        if self.first:
            # Debug runs to the first breakpoint, as VS Code's does: the
            # first line stops only when it has one.
            self.first = False
            here = self.break_here_now(frame)
            if not here or bdb.effective("<document>", frame.f_lineno, frame)[0] is None:
                self.set_continue()
                return
        self.interaction(frame, "breakpoint" if self.break_here_now(frame) else "step")

    def break_here_now(self, frame):
        return bool(self.get_breaks("<document>", frame.f_lineno))

    def snapshot(self, frame, reason, stack, text=""):
        module = frame.f_code.co_name == "<module>"
        watches = []
        for expr in self.watches:
            try:
                watches.append({"expr": expr, "value": _mm_show(eval(expr, frame.f_globals, frame.f_locals))})
            except BaseException as exc:
                watches.append({"expr": expr, "error": f"{type(exc).__name__}: {exc}"})
        return {
            "t": "stop",
            "reason": reason,
            "line": frame.f_lineno,
            "text": text,
            "locals": _mm_names(frame.f_locals, ("input",) if module else ()),
            "globals": [] if module else _mm_names(frame.f_globals, ("input",)),
            "stack": stack,
            "watches": watches,
        }

    def stack_of(self, frame):
        rows = []
        while frame is not None:
            if frame.f_code.co_filename == "<document>":
                name = frame.f_code.co_name
                rows.append({"name": "module" if name == "<module>" else name, "line": frame.f_lineno})
            frame = frame.f_back
        return rows

    def interaction(self, frame, reason, text="", stack=None):
        import json

        sys.stdout.flush(); sys.stderr.flush()
        while True:
            reply = self.exchange(json.dumps(self.snapshot(frame, reason, stack or self.stack_of(frame), text)))
            try:
                action = json.loads(str(reply)) if reply else {"cmd": "stop"}
            except ValueError:
                action = {"cmd": "stop"}
            if "breaks" in action:
                self.set_breaks(action["breaks"])
            if "watches" in action:
                self.watches = [str(w) for w in action["watches"]][:50]
            cmd = action.get("cmd")
            if cmd == "eval":
                continue
            if reason == "exception":
                return
            if cmd == "over":
                self.set_next(frame)
            elif cmd == "in":
                self.set_step()
            elif cmd == "out":
                self.set_return(frame)
            elif cmd == "continue":
                self.set_continue()
            else:
                self.ended_by_stop = True
                self.set_quit()
            return


def _mm_debug(code, emit, exchange, offset=0, stdin="", breaks="[]", watches="[]"):
    """Run the document under `_MMDebugger`. An exception nothing caught
    stops at the line that raised it, in the frame that raised it, with the
    traceback's text, before the run ends (the frame's locals are kept by
    the traceback). Returns how the run ended: done, stopped or error."""
    import io
    import json
    import linecache

    source = "\n" * max(0, int(offset)) + code
    # `set_break` checks the line exists through linecache; the document has
    # no file, so its lines are put there under its name.
    linecache.cache["<document>"] = (len(source), None, source.splitlines(True), "<document>")
    out, err = _MMOut("log", emit), _MMOut("error", emit)
    saved = sys.stdout, sys.stderr, sys.stdin
    sys.stdout, sys.stderr, sys.stdin = out, err, io.StringIO(str(stdin or ""))

    def ask(prompt):
        reply = exchange(json.dumps({"t": "input", "prompt": str(prompt)}))
        try:
            value = json.loads(str(reply)) if reply else None
        except ValueError:
            value = None
        return value.get("line") if isinstance(value, dict) else None

    _MM_ASK[0] = ask
    debugger = _MMDebugger(exchange, json.loads(breaks or "[]"), json.loads(watches or "[]"))
    try:
        # `Bdb.run` swallows the BdbQuit that Stop raises, so it is asked.
        debugger.run(compile(source, "<document>", "exec"), {"__name__": "__main__", "input": _mm_input})
        return "stopped" if debugger.ended_by_stop else "done"
    except SystemExit as stop:
        out.flush(); err.flush()
        if stop.code not in (None, 0):
            emit("info", f"Exited with {stop.code}.", None, False)
        return "done"
    except BaseException as exc:
        sys.settrace(None)
        out.flush(); err.flush()
        text = traceback.format_exception_only(type(exc), exc)[-1].strip()
        frames = [(f, n) for f, n in traceback.walk_tb(exc.__traceback__) if f.f_code.co_filename == "<document>"]
        if frames:
            stack = [{"name": "module" if f.f_code.co_name == "<module>" else f.f_code.co_name, "line": n} for f, n in reversed(frames)]
            # The traceback as the document's own: its frames, its lines,
            # none of the runner's or bdb's.
            told = ["Traceback (most recent call last):"]
            for f, n in frames:
                told.append(f"  line {n}, in {'module' if f.f_code.co_name == '<module>' else f.f_code.co_name}")
                said = linecache.getline("<document>", n).strip()
                if said:
                    told.append(f"    {said}")
            told.append(text)
            frame, line = frames[-1]
            debugger.interaction(_MMFrameAt(frame, line), "exception", "\n".join(told)[-4000:], stack)
        emit("error", text, _mm_line(exc), True)
        return "error"
    finally:
        out.flush(); err.flush()
        sys.stdout, sys.stderr, sys.stdin = saved
        _MM_ASK[0] = None
        linecache.cache.pop("<document>", None)


class _MMFrameAt:
    """A finished frame seen at the line the traceback names: a frame's own
    `f_lineno` after it has unwound is where it stopped, which for an
    exception is the raise, but the traceback's line is the one to trust."""

    def __init__(self, frame, line):
        self.f_code, self.f_globals, self.f_locals, self.f_lineno, self.f_back = frame.f_code, frame.f_globals, frame.f_locals, line, None
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
//: D2's buffer, from the page when it is cross-origin isolated: [0] is the
//: flag this worker waits on, [1] the reply's length, the reply's bytes
//: after. `exchange` posts a stop (or an input() prompt) and blocks on
//: `Atomics.wait` until the page writes the panel's answer and notifies.
let shared = null;
let current = null;
function exchange(text) {
  if (!shared || !current) return null;
  const ctl = new Int32Array(shared, 0, 2);
  Atomics.store(ctl, 0, 0);
  current(JSON.parse(String(text)));
  Atomics.wait(ctl, 0, 0);
  const n = Atomics.load(ctl, 1);
  return new TextDecoder().decode(new Uint8Array(shared, 8, n).slice());
}
function ask(prompt) {
  const reply = exchange(JSON.stringify({ t: "input", prompt: String(prompt) }));
  try {
    const value = JSON.parse(reply);
    return value && typeof value.line === "string" ? value.line : null;
  } catch (err) {
    return null;
  }
}
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
  shared = e.data.sab instanceof SharedArrayBuffer ? e.data.sab : null;
  current = post;
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
    } else if (e.data.debug) {
      //: Debug (D2): the run goes through `bdb`; each stop blocks here.
      const debug = p.globals.get("_mm_debug");
      let ended = "done";
      try {
        ended = String(debug(String(e.data.source || ""), emit, exchange, Number(e.data.lineOffset) || 0,
          String(e.data.stdin || ""), JSON.stringify(e.data.breaks || []), JSON.stringify(e.data.watches || [])));
      } finally { debug.destroy(); }
      post({ t: "done", ended });
      postMessage({ run, idle: true });
      return;
    } else {
      const runner = p.globals.get("_mm_run");
      try {
        runner(String(e.data.source || ""), emit, Number(e.data.lineOffset) || 0, String(e.data.stdin || ""), shared ? ask : null);
      } finally { runner.destroy(); }
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
  //: D2: with cross-origin isolation the worker can block on this buffer
  //: while the panel decides (a debugger stop, an input() line); without it
  //: a run still runs, and the app says Debug cannot.
  var REPLY_MAX = 65536;
  var shared = self.crossOriginIsolated && typeof SharedArrayBuffer === "function" ? new SharedArrayBuffer(8 + REPLY_MAX) : null;
  function reply(value) {
    if (!shared) return;
    var bytes = new TextEncoder().encode(JSON.stringify(value == null ? null : value));
    if (bytes.length > REPLY_MAX) bytes = new TextEncoder().encode('{"cmd":"stop"}');
    var ctl = new Int32Array(shared, 0, 2);
    new Uint8Array(shared, 8, REPLY_MAX).set(bytes);
    Atomics.store(ctl, 1, bytes.length);
    Atomics.store(ctl, 0, 1);
    Atomics.notify(ctl, 0);
  }
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
    if (d.type === "reply") { if (d.mmRun === current) reply(d.value); return; }
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
      debug: Boolean(d.debug) && Boolean(shared),
      breaks: Array.isArray(d.breaks) ? d.breaks : [],
      watches: Array.isArray(d.watches) ? d.watches : [],
      sab: shared,
    });
  }
  window.onmessage = handle;
  parent.postMessage({ mmRun: 0, t: "ready", runner: "python", isolated: Boolean(shared) }, "*");
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
            **ISOLATION_HEADERS,
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
