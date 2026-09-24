"""The Run button's sandbox (INBOX 404): what the page may and may not do.

The owner: "what about code errors, debugging console or smth??" Running a
document's code is the one place this app executes text it did not write, so
the policy the page is served under is the feature's whole safety case and is
held here directive by directive. The runs themselves are measured in
Chromium by `scratchpad/ui-sweeps/docrun.js`.
"""

from __future__ import annotations

from memorymap.api import run_sandbox


def _directives(policy: str) -> dict[str, str]:
    out = {}
    for part in policy.split(";"):
        words = part.split()
        if words:
            out[words[0]] = " ".join(words[1:])
    return out


def test_the_page_is_served_without_a_token_under_its_own_policy(client):
    response = client.get("/documents/run-sandbox")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    #: Its own policy, not the app's: the middleware only `setdefault`s.
    assert response.headers["content-security-policy"] == run_sandbox.RUN_SANDBOX_CSP
    assert response.headers["x-frame-options"] == "SAMEORIGIN"
    assert response.headers["cache-control"] == "no-store"
    assert "window.onmessage" in response.text


def test_the_policy_is_an_opaque_origin_with_no_network():
    d = _directives(run_sandbox.RUN_SANDBOX_CSP)
    #: An opaque origin: no storage, no cookies, not this app's origin.
    assert d["sandbox"] == "allow-scripts", "allow-same-origin would hand the code the notebook"
    #: No network at all, to this server or any other.
    assert d["connect-src"] == "'none'"
    assert d["default-src"] == "'none'"
    assert "'self'" not in d["img-src"] and "http" not in d["img-src"]
    #: Code from nowhere but the page itself and the blob it makes.
    assert d["script-src"] == "'unsafe-inline' 'unsafe-eval' blob:"
    assert "'self'" not in d["script-src"]
    assert d["worker-src"] == "blob:"
    #: Framed by the app only; nothing else navigates or submits.
    assert d["frame-ancestors"] == "'self'"
    assert d["base-uri"] == "'none'" and d["form-action"] == "'none'"


def test_the_runner_only_obeys_its_parent_and_tags_every_message():
    page = run_sandbox.RUN_SANDBOX_HTML
    assert 'if (e.source !== parent || typeof d.mmRun !== "number") return;' in page
    #: A page being run gets the same sandbox again, inside this one.
    assert 'frame.setAttribute("sandbox", "allow-scripts")' in page
    assert "worker.terminate()" in page


def test_the_apps_own_policy_is_not_widened_for_it():
    """Running code is the sandbox page's business: the notebook's own policy
    keeps no eval, no blob scripts and no blob workers."""
    from memorymap.core import security

    d = _directives(security.build_csp([]))
    assert "'unsafe-eval'" not in d["script-src"] and "blob:" not in d["script-src"]
    assert d["worker-src"] == "'self'"


# --- Python, through the Pyodide extra (INBOX 404) ---------------------------


def _install_fake_pyodide():
    """Write the Pyodide extra's folder the way a finished install leaves
    it, with stand-in files: these tests are about what the server serves."""
    import json

    from memorymap.core import extra_downloads, extras

    extra = extras.EXTRAS_BY_ID["pyodide"]
    target = extra_downloads.folder(extra)
    target.mkdir(parents=True, exist_ok=True)
    names = [name for d in extra.downloads for _m, name in d.members]
    for name in names:
        (target / name).write_bytes(b"\0asm" if name.endswith(".wasm") else b"x")
    (target / extra_downloads.MARKER).write_text(
        json.dumps({"version": extra.version, "files": names}), encoding="utf-8"
    )
    return target


def test_the_python_page_may_reach_the_runtime_files_and_nothing_else(client):
    response = client.get("/documents/run-sandbox/python")
    assert response.status_code == 200
    d = _directives(response.headers["content-security-policy"])
    #: The same opaque origin as the JavaScript runner.
    assert d["sandbox"] == "allow-scripts"
    assert d["default-src"] == "'none'"
    #: The one widening, and it is a path: the runtime's own files on this
    #: server. Not the server, not `'self'`, not any other origin.
    base = "http://testserver/documents/pyodide/"
    assert d["connect-src"] == base
    assert d["script-src"] == f"'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: {base}"
    assert "'self'" not in d["script-src"] and "'self'" not in d["connect-src"]
    assert d["worker-src"] == "blob:"
    assert d["frame-ancestors"] == "'self'"
    assert response.headers["x-frame-options"] == "SAMEORIGIN"
    assert "window.onmessage" in response.text


def test_a_hostile_host_header_cannot_write_the_policy(client):
    response = client.get("/documents/run-sandbox/python", headers={"host": "evil; script-src *"})
    assert response.status_code == 400


def test_the_runtime_files_are_not_served_until_installed(client):
    assert client.get("/documents/pyodide/pyodide.mjs").status_code == 404


def test_the_runtime_files_are_served_to_the_sandbox_once_installed(client):
    _install_fake_pyodide()
    response = client.get("/documents/pyodide/pyodide.asm.wasm")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/wasm"
    #: The sandbox is an opaque origin, so its fetches are cross-origin and
    #: need this; the files are the public Pyodide release, nothing of the
    #: notebook's.
    assert response.headers["access-control-allow-origin"] == "*"
    js = client.get("/documents/pyodide/pyodide.mjs")
    assert js.headers["content-type"].startswith("text/javascript")


def test_only_the_runtimes_own_files_are_served(client):
    target = _install_fake_pyodide()
    (target / "secret.txt").write_text("no", encoding="utf-8")
    for name in ("secret.txt", "installed.json", "..%2Fpreferences.json", "%2E%2E"):
        assert client.get(f"/documents/pyodide/{name}").status_code == 404, name


def test_the_python_runner_keeps_the_javascript_runners_contract():
    page = run_sandbox.RUN_SANDBOX_PY_HTML
    #: Obeys only its parent, tags every message with the run's id.
    assert 'if (e.source !== parent || typeof d.mmRun !== "number") return;' in page
    #: Stop is a terminate: a `while True` has no other way out.
    assert "worker.terminate()" in page
    #: The document's own line numbers: the code is compiled under a name the
    #: runner looks for in the traceback.
    assert "<document>" in run_sandbox.PY_RUNNER and "PY_RUNNER" not in page


def test_the_python_line_cap_matches_the_apps_and_is_kept_at_the_source():
    """A `while True: print(i)` outran the app's tab: the cap is enforced in
    the worker too, at the same number the Output panel stops at."""
    from pathlib import Path

    source = (Path(__file__).resolve().parents[1] / "frontend" / "documents-code.js").read_text(
        encoding="utf-8"
    )
    assert f"const DOC_RUN_MAX_ROWS = {run_sandbox.MAX_LINES};" in source
    assert f"const MAX_LINES = {run_sandbox.MAX_LINES};" in run_sandbox._PY_WORKER
    assert "if (sent > MAX_LINES && !uncaught) return;" in run_sandbox._PY_WORKER
