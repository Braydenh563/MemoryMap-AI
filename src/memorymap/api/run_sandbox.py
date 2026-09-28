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

router = APIRouter(tags=["documents"])

RUN_SANDBOX_CSP = (
    "sandbox allow-scripts; default-src 'none'; "
    "script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; "
    "style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; "
    "connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'"
)

#: The runner. It answers three messages from the app, each tagged with the
#: run's id so a late message from a stopped run is dropped:
#:
#: - `run` with `kind: "js"`: the code becomes a `blob:` worker with a one-line
#:   prelude **on the code's own first line**, so a line number the browser
#:   reports is the document's line number with nothing subtracted. The
#:   prelude sends `console.*` up as text with the line it was called from,
#:   and a closing `postMessage` says the top level finished.
#: - `run` with `kind: "html"`: the page goes into a `srcdoc` frame, which
#:   inherits this page's sandbox and policy, with the same one-line prelude
#:   in front of it, and is shown.
#: - `stop`: the worker is terminated, the frame emptied.
RUN_SANDBOX_HTML = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Run</title>
<style>html,body{margin:0;height:100%;background:#fff;color:#111;font:13px system-ui,sans-serif}
iframe{border:0;width:100%;height:100%;display:block;background:#fff}</style>
</head><body><script>
(function () {
  "use strict";
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
      "self.addEventListener('unhandledrejection',function(e){P({t:'log',level:'error',text:'Uncaught (in promise) '+F(e.reason),line:null})});})();";
  }
  function stop() {
    if (worker) { worker.terminate(); worker = null; }
    if (frame) { frame.remove(); frame = null; }
  }
  function runJs(id, code) {
    var src = prelude("function(m){postMessage(m)}") + code + "\n;postMessage({t:'done'});";
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
    worker.onmessage = function (e) { if (id === current) up(id, e.data); };
    worker.onerror = function (e) {
      e.preventDefault();
      var text = /^Uncaught/.test(e.message) ? e.message : "Uncaught " + e.message;
      if (id === current) up(id, { t: "log", level: "error", text: text, line: e.lineno || null, uncaught: true });
    };
  }
  function runHtml(id, code) {
    frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    var head = "<script>" + prelude("function(m){parent.postMessage(m,'*')}") +
      "window.addEventListener('error',function(e){e.preventDefault();var m=String(e.message);" +
      "parent.postMessage({t:'log',level:'error',text:/^Uncaught/.test(m)?m:'Uncaught '+m,line:e.lineno||null,uncaught:true},'*')});<\/script>";
    frame.srcdoc = head + code;
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
    try {
      if (d.kind === "html") runHtml(current, String(d.code || ""));
      else runJs(current, String(d.code || ""));
    } catch (err) {
      up(current, { t: "log", level: "error", text: String(err && err.message || err), line: null });
    }
  }
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
#: `frontend/documents-code.js`), kept at the source as well; see the worker.
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


def _mm_run(code, emit):
    out, err = _MMOut("log", emit), _MMOut("error", emit)
    saved = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = out, err
    try:
        exec(compile(code, "<document>", "exec"), {"__name__": "__main__"})
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
    const runner = p.globals.get("_mm_run");
    try { runner(String(e.data.code || ""), emit); } finally { runner.destroy(); }
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
    worker.postMessage({ run: current, code: String(d.code || "") });
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
