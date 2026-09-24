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
