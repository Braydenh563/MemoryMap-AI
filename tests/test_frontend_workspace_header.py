"""Every request that touches workspace-scoped data must say which workspace.

**A hand-rolled `fetch()` gets nothing for free.** `api()`/`apiJson()`
(app.js) attach `X-Auth-Token` and `X-Workspace-ID` to every call
automatically — `get_session()` reads the second one and, per
`database.py`'s own `do_orm_execute` listener, scopes every query against a
`WorkspaceMixin` model to it. Leave the header off and that listener never
runs at all: `workspace_id` stays `None` in `session.info`, neither branch of
the filter matches, and the query sees every space, not just the active one.

A handful of calls cannot go through `api()`/`apiJson()` — a multipart body
(file upload, markdown/document import) needs no `Content-Type: application/
json`, and a streamed NDJSON response (`/chat/stream`) needs the raw
`Response` rather than a parsed `.json()`. Each of those became a
hand-written `fetch()` with just `X-Auth-Token` copied over, and
`X-Workspace-ID` was never even a header these calls knew to add — silently,
independently, once per call site, over however many sessions wrote them.

**Reported as one narrow symptom** — a space hidden from "All spaces" still
surfaced its notes from Ask's semantic search — but Ask and Chat both run
through `streamChat()`'s own `fetch("/chat/stream", …)`, and that one call
touched every notebook feature that goes through it: with no
`X-Workspace-ID` at all, *every* chat or Ask turn searched every space,
whichever one was active, hidden or not — not only the hidden-space case
that happened to surface it. The same gap on `/entries/{id}/files` meant a
file could attach to an entry outside the active space entirely (the lookup
itself skips the scope check); on `/import/markdown` and `/import/document`
it meant an import while a non-default space was active silently landed the
new notes in the default space instead.

This test is a source scan, not a DOM test — there is no browser here, the
same reason `test_frontend_ids.py` and `test_frontend_shortcuts.py` are also
source scans. It does not (and cannot) prove the *backend* filter works;
`tests/test_spaces.py` already covers that with a real header. It proves the
one thing nothing else does: that the frontend actually sends one.
"""

from __future__ import annotations

import re
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "frontend" / "app.js"

#: Endpoints that read or write a `WorkspaceMixin` row — a hand-rolled fetch
#: to one of these must carry `X-Workspace-ID`. Deliberately not every raw
#: `fetch()` in the file: `/voice/transcribe(-meeting)` only turns audio into
#: text (no row read or written), and `/logs/stream` is the developer log
#: tail, neither of which is workspace-scoped data — adding the header to
#: either would be decoration, not a fix.
SCOPED_ENDPOINTS = (
    '"/chat/stream"',
    "`/entries/${entry.id}/files`",
    "`/entries/${entryId}/files`",
    '"/import/markdown"',
    '"/import/document"',
)


def _raw_fetch_blocks(source: str) -> dict[str, str]:
    """`{endpoint literal: the fetch(...) call's own source text}` for every
    hand-rolled `fetch(` in app.js — matched by brace-depth rather than a
    lazy regex, since a call's own body can (and does) contain nested `{…}`
    header/body objects a non-greedy `.*?` would stop inside."""
    blocks: dict[str, str] = {}
    for match in re.finditer(r"fetch\(\s*(`[^`]*`|\"[^\"]*\")", source):
        endpoint = match.group(1)
        if endpoint not in SCOPED_ENDPOINTS:
            continue
        start = match.start()
        depth = 0
        end = start
        for i in range(start, min(start + 2000, len(source))):
            if source[i] == "(":
                depth += 1
            elif source[i] == ")":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        blocks[endpoint] = source[start:end]
    return blocks


def test_every_scoped_raw_fetch_still_carries_the_workspace_header():
    source = APP.read_text(encoding="utf-8")
    blocks = _raw_fetch_blocks(source)
    missing = sorted(SCOPED_ENDPOINTS - blocks.keys())
    assert not missing, f"expected fetch() calls not found at all — has the source moved? {missing}"

    offenders = [
        endpoint for endpoint, block in blocks.items() if "X-Workspace-ID" not in block
    ]
    assert not offenders, (
        "these hand-rolled fetch() calls touch workspace-scoped data but "
        f"never send X-Workspace-ID: {offenders}"
    )


def test_the_scanner_actually_finds_something_when_the_header_is_missing():
    """A brace-matcher that always returns the whole rest of the file (or
    silently matches nothing) would pass the test above by accident. Proven
    against a case built to fail: a fetch with the header genuinely absent."""
    fake_source = '''
const response = await fetch("/chat/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Auth-Token": authToken() },
  body: JSON.stringify(body),
});
'''
    blocks = _raw_fetch_blocks(fake_source)
    assert '"/chat/stream"' in blocks
    assert "X-Workspace-ID" not in blocks['"/chat/stream"']
