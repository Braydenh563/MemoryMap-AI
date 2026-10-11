"""The JavaScript debugger (DOCUMENTS_PLAN 23, D3; Brief 70), run in node.

The lowering pass (`run-debug.js`, over the vendored CodeMirror's own
JavaScript parser) and the stepping worker (`run_sandbox._JS_DEBUG_WORKER`
after the vendored JS-Interpreter) are the same text the browser runs: here
the worker's `postMessage` and `onmessage` are a script of the panel's
actions. The browser half is measured by `scratchpad/ui-sweeps/code-debug.js`.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from memorymap.api import run_sandbox

ROOT = Path(__file__).resolve().parents[1]
CM_JS = ROOT / "frontend" / "vendor" / "codemirror" / "codemirror.min.js"
INTERP_JS = ROOT / "frontend" / "vendor" / "js-interpreter" / "js-interpreter.min.js"
LOWER_JS = ROOT / "frontend" / "js" / "run-debug.js"

pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")

_HARNESS = """
const window = globalThis;
const vm = require("vm");
//: `node -` puts CommonJS names on the global, which would send the
//: interpreter's Acorn down its module path; a worker has none of them.
delete globalThis.exports;
delete globalThis.module;
globalThis.navigator = globalThis.navigator || { userAgent: "node", platform: "" };
%(cm)s
%(lower)s
const lowerOnly = (src) => { try { const r = runDebugLower(src); return { code: r.code, dom: r.dom }; } catch (e) { return { error: e.message, line: e.line }; } };
const sessions = [];
async function session(src, breaks, watches, actions) {
  const lowered = runDebugLower(src);
  const got = [];
  return await new Promise((resolve) => {
    const self = {};
    const postMessage = (m) => {
      got.push(m);
      if (m.t === "stop") setTimeout(() => self.onmessage({ data: { reply: actions.shift() || { cmd: "stop" } } }), 0);
      if (m.t === "done") resolve(got);
    };
    //: A worker's globals, as the browser gives them: the interpreter's
    //: text at the top level (fresh per session), then the driver.
    globalThis.self = self;
    globalThis.postMessage = postMessage;
    vm.runInThisContext(%(interp)s + "\\n;" + %(worker)s);
    self.onmessage({ data: { source: lowered.code, breaks, watches, dom: lowered.dom } });
    setTimeout(() => resolve(got), 4000);
  });
}
(async () => {
  const out = {};
  for (const [key, call] of Object.entries(CALLS)) out[key] = call[0] === "lower" ? lowerOnly(call[1]) : await session(...call.slice(1));
  console.log(JSON.stringify(out));
})();
"""


def _node(calls: dict) -> dict:
    script = "const CALLS = " + json.dumps(calls) + ";\n" + _HARNESS % {
        "cm": CM_JS.read_text(encoding="utf-8"),
        "lower": LOWER_JS.read_text(encoding="utf-8"),
        "interp": json.dumps(INTERP_JS.read_text(encoding="utf-8")),
        "worker": json.dumps(run_sandbox._JS_DEBUG_WORKER),
    }
    done = subprocess.run(["node", "-"], input=script, capture_output=True, text=True, timeout=60)
    assert done.returncode == 0, done.stderr[-2000:]
    return json.loads(done.stdout)


PROGRAM = (
    "function double(n) {\n  const m = n * 2;\n  return m;\n}\nlet total = 0;\n"
    "for (let i = 0; i < 3; i++) {\n  total += double(i);\n}\nconsole.log(`total ${total}`);\nnull.boom();\n"
)


def test_the_pass_lowers_es2015_and_keeps_every_line():
    out = _node({
        "a": ["lower", "const xs = [1, 2];\nlet f = (a, b) => a + b;\nconst g = x => {\n  return x;\n};\nvar o = {xs, m() { return 1; }};\nconsole.log(`a ${f(1, 2)}\nb`);\n"],
        "this": ["lower", "function T() { this.f = () => this.n; }"],
    })
    code = out["a"]["code"]
    assert code.count("\n") == 8
    assert "const" not in code and "let " not in code and "=>" not in code and "`" not in code
    assert "var f = function (a, b)  { return (a + b); };" in code
    assert "var g = function (x)  {" in code
    assert "{xs: xs, m: function() { return 1; }}" in code
    assert ".bind(this)" in out["this"]["code"]


def test_what_the_pass_cannot_lower_is_named_with_its_line():
    out = _node({
        "class": ["lower", "var a = 1;\nclass A {}\n"],
        "forof": ["lower", "for (const v of [1]) {}"],
        "destructure": ["lower", "\n\nconst {a} = b;"],
        "default": ["lower", "function f(a = 1) {}"],
        "async": ["lower", "async function f() { await 1; }"],
    })
    assert out["class"] == {"error": "Debug cannot step classes yet (line 2): Run runs this file as it is.", "line": 2}
    assert "for...of loops" in out["forof"]["error"]
    assert out["destructure"]["line"] == 3 and "destructuring" in out["destructure"]["error"]
    assert "default parameter values" in out["default"]["error"]
    assert "async functions" in out["async"]["error"]


def test_a_session_breaks_steps_watches_and_stops_on_the_throw():
    out = _node({
        "s": ["session", PROGRAM, [{"line": 7}], ["total * 10"],
              [{"cmd": "in"}, {"cmd": "over"}, {"cmd": "over"}, {"cmd": "continue"}, {"cmd": "continue"}, {"cmd": "continue"}]],
    })["s"]
    stops = [m for m in out if m["t"] == "stop"]
    assert [s["line"] for s in stops] == [7, 2, 3, 7, 7, 10]
    assert stops[0]["reason"] == "breakpoint" and stops[1]["reason"] == "step"
    assert [f["name"] for f in stops[1]["stack"]] == ["double", "(top level)"]
    assert {"name": "n", "value": "0", "type": "number"} in stops[1]["locals"]
    assert stops[0]["watches"] == [{"expr": "total * 10", "value": "0"}]
    last = stops[-1]
    assert last["reason"] == "exception" and last["watches"] == [{"expr": "total * 10", "value": "60"}]
    assert last["text"].startswith("Uncaught TypeError: Cannot read")
    logs = [m for m in out if m["t"] == "log"]
    assert logs[0] == {"t": "log", "level": "log", "text": "total 6", "line": 9}
    assert logs[-1]["uncaught"] and logs[-1]["line"] == 10
    assert out[-1] == {"t": "done", "ended": "error"}


def test_a_condition_and_step_out_and_stop():
    out = _node({
        "cond": ["session", PROGRAM, [{"line": 2, "cond": "n === 2"}], [], [{"cmd": "out"}, {"cmd": "stop"}]],
    })["cond"]
    stops = [m for m in out if m["t"] == "stop"]
    assert stops[0]["line"] == 2 and {"name": "n", "value": "2", "type": "number"} in stops[0]["locals"]
    assert len(stops[1]["stack"]) == 1
    assert out[-1] == {"t": "done", "ended": "stopped"}
    assert not any(m["t"] == "log" and m["text"] == "total 6" for m in out)


def test_a_dom_script_debugs_against_a_stand_in():
    out = _node({
        "dom": ["session", "var el = document.getElementById('out');\nel.textContent = 'hi';\nconsole.log(el.id, el.textContent);\n", [], [], []],
    })["dom"]
    assert {"t": "log", "level": "log", "text": "out hi", "line": 3} in out
    assert out[-1] == {"t": "done", "ended": "done"}
