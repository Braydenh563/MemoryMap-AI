"""The frontend is served so a cache cannot hand back yesterday's build.

**A desktop-app bug hiding in a header.** `StaticFiles` sends `last-modified`
and an `etag` but no `Cache-Control`, and a response with neither
`Cache-Control` nor `Expires` is one an HTTP cache may reuse *without asking* —
for a heuristic fraction of its age (RFC 9111 §4.2.2). In a browser you press
reload and never notice. The desktop shell has no reload, is a WebView2/WebKit
instance with its own on-disk cache, and restarts the *process* without
invalidating any of it, so after an update it can go on running the previous
`app.js` indefinitely.

This is the standing explanation for a class of report this project keeps
getting — "that button is still broken" for a button whose fix is in the file.
The recycle bin's *Empty now* is the case that prompted this: §35F replaced the
`window.confirm` that pywebview does not implement, the flow was then driven
end to end in a real browser against this server (dialog opens, notes go, the
server reports an empty bin), and it was still reported broken afterwards.

`no-cache` is not `no-store`. The file is still cached and the conditional
request still answers 304 from the etag — all that is removed is the guessing.
"""

from __future__ import annotations

import pytest

# style.css split into multiple linked files (ROADMAP.md Priority 0 item 2);
# one representative path under /css/ stands in for what "/style.css" used to
# check here — this test is about RevalidatedStatic's header behaviour for
# any static path, not about that one file's content, and test_api_entries.py
# separately confirms every split file individually resolves to 200.
@pytest.mark.parametrize(
    "path", ["/", "/app.js", "/css/00-tokens-shell.css", "/index.html"]
)
def test_the_frontend_must_be_revalidated(ai_client, path):
    response = ai_client.get(path)
    assert response.status_code == 200
    assert "no-cache" in response.headers.get("cache-control", "")


def test_it_is_no_cache_and_not_no_store(ai_client):
    """The difference matters: `no-store` would re-download 650KB of app.js on
    every navigation of a local-first app that is meant to be instant."""
    header = ai_client.get("/app.js").headers.get("cache-control", "")
    assert "no-store" not in header


def test_the_validators_are_still_there(ai_client):
    """`no-cache` means "ask first", and asking is only cheap if there is
    something to ask with. Without a validator every check would be a full
    re-download."""
    headers = ai_client.get("/app.js").headers
    assert headers.get("etag") or headers.get("last-modified")
