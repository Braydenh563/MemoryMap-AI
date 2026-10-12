"""The Python runtime loads once per session (Brief 101c, the owner
2026-10-07: it reloaded on every document opened, 5.9 to 7.0 s cold).

The Python sandbox page used to be each panel's own frame, so each document's
panel made a new page, a new worker and a new load. The page is now one hidden
frame kept on the document body. These read the code; the numbers come from
`scratchpad/ui-sweeps/pywarm.js` in Chromium (three documents in turn: one
`pyodide.asm.wasm` load, the second and third runs at 193 and 175 ms, against
6,867 and 4,908 ms before)."""

from __future__ import annotations

from pathlib import Path

from tessellate.api import run_sandbox

JS = Path(__file__).resolve().parents[1] / "frontend" / "js" / "documents-code.js"


def _source() -> str:
    return JS.read_text(encoding="utf-8")


def test_python_has_one_shared_page_that_outlives_the_panel():
    source = _source()
    assert "const DOC_PY_HOST = " in source and "function docPyHost()" in source
    # Appended to the body, not to the panel, so closing a panel keeps it.
    assert "document.body.appendChild(frame);" in source
    # A Python document's panel talks to it rather than loading its own.
    assert "frame: pythonFile ? docPyHost() : frame" in source
    assert "if (!pythonFile) {\n    frame.src = DOC_RUN_SANDBOX_URL;" in source


def test_a_python_runner_is_never_loaded_into_a_panels_own_frame():
    source = _source()
    start = source.index("function docRunSelectFrame(runner)")
    body = source[start : source.index("\n}\n", start)]
    # Python selects the shared frame and returns before the own frame's src is set.
    assert body.index("docPyHost()") < body.index("own.src = runner")


def test_opening_a_python_document_warms_the_runtime():
    source = _source()
    sync = source[source.index("async function docRunSyncAvailability"):]
    sync = sync[: sync.index("\n}\n")]
    assert "if (python && ready) docPyWarm();" in sync


def test_closing_the_panel_stops_a_script_the_shared_page_would_keep_running():
    source = _source()
    assert "docRun.running && docRun.frame === DOC_PY_HOST.frame" in source


def test_a_new_panel_drops_the_last_documents_console_namespace():
    source = _source()
    assert 'type: "forget", mmRun: 0' in source
    assert "_MM_NS.clear()" in run_sandbox._PY_WORKER
    assert 'd.type === "forget"' in run_sandbox.RUN_SANDBOX_PY_HTML


def test_the_page_and_worker_take_a_warm_up_without_a_second_load():
    page = run_sandbox.RUN_SANDBOX_PY_HTML
    worker = run_sandbox._PY_WORKER
    assert 'd.type === "warm"' in page and "if (!worker) { boot(); worker.postMessage({ run: current, warm: true }); }" in page
    assert "if (e.data.warm) {" in worker
    # One shared promise, so a Run that arrives mid-warm-up waits on it.
    assert "let loading = null;" in worker and "loading = (async () => {" in worker
    # A warm-up never marks the worker busy, so it cannot be mistaken for a run.
    warm = worker[worker.index("if (e.data.warm) {"):]
    assert "idle: true" not in warm[: warm.index("return;")]


def test_stop_is_still_a_terminate_so_a_stopped_run_starts_clean():
    # The shared page keeps the runtime across documents; a Stop (or the
    # timeout) is the one thing that ends the worker, as it did before.
    assert "if (d.type === \"stop\") { stop(); return; }" in run_sandbox.RUN_SANDBOX_PY_HTML
    assert "worker.terminate()" in run_sandbox.RUN_SANDBOX_PY_HTML
