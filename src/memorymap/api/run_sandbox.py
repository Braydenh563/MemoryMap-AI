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

from fastapi import APIRouter, Response

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
