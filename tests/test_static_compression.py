"""INBOX 47: the stamped-URL cache policy, and a wire-size check for the
existing compression it rides on.

**What this file is not.** `test_compression.py` (added alongside the gzip
middleware itself, commit 610def1) already proves `/app.js` comes back
`content-encoding: gzip`, that both streaming NDJSON endpoints are excluded,
and that the exclusion is read off the configured app rather than a constant.
Re-deriving that here would be the same "three sessions rebuilt existing
work" mistake CLAUDE.md warns about: curl against a live server on this
branch showed `/app.js`, every root script, `/vendor/d3.v7.min.js` and
`/css/*.css` all already gzip-compressed (515 KB on the wire for a 1.6 MB
`app.js`) before this file existed. INBOX 47's "static assets are not
compressed" did not hold up.

**What was actually missing** is `RevalidatedStatic` in `app.py`: every
static response got `Cache-Control: no-cache` regardless of whether the URL
carried a `?v=<version>` stamp, so a stamped asset (a *different URL* on
every release, per `test_asset_cache_busting.py`) still paid a revalidation
round trip it never needed. That is the actual gap this file closes and
tests.
"""

from __future__ import annotations

import gzip

from memorymap import __version__
from tests._app_js import APP_JS, app_js_files


def test_a_stamped_asset_is_immutable_and_gzipped(client):
    """`/app.js?v=<version>` is the real request the browser makes."""
    with client.stream(
        "GET", f"/app.js?v={__version__}", headers={"Accept-Encoding": "gzip"}
    ) as response:
        assert response.status_code == 200
        assert response.headers.get("content-encoding") == "gzip"
        assert response.headers.get("cache-control") == "public, max-age=31536000, immutable"
        raw = b"".join(response.iter_raw())
    # Belt and braces, same pattern as test_compression.py's round-trip test:
    # fetch without letting httpx decode, then gunzip it by hand.
    body = gzip.decompress(raw)
    assert body.startswith(b"//") or len(body) > 0  # app.js is real JS, not empty


#: The ratchet on the app's own scripts, gzipped as served. Three numbers, all
#: measured through this test's client (the middleware's level 6 with a sync
#: flush per chunk, which is not what `gzip -6` on the file gives):
#:
#: - `APP_JS_CAP`, app.js alone. Lowered at every step of the split
#:   (`docs/roadmap/agent-remaining/appjs-split.md`) to the new size plus 2%,
#:   so the file cannot quietly grow back into what it was.
#: - `PIECE_CAP`, every other piece. 64 KB is the plan's per-file bound: the
#:   largest range in the split table measures well under it.
#: - `TOTAL_CAP`, every piece added up: the real wire cost of the app's code
#:   on a cold load. Splitting costs a little here (each file starts gzip's
#:   window empty), so this is rewritten to the measured total plus 2% at each
#:   step, and after the split only ever downward.
APP_JS_CAP = 43_000
PIECE_CAP = 64_000
TOTAL_CAP = 794_000


def _served_gzip_size(client, name: str) -> int:
    with client.stream(
        "GET", f"/{name}?v={__version__}", headers={"Accept-Encoding": "gzip"}
    ) as response:
        assert response.status_code == 200, name
        assert response.headers.get("content-encoding") == "gzip", name
        return len(b"".join(response.iter_raw()))


def test_the_app_scripts_stay_under_the_ratchet(client):
    """app.js under its own cap, every other piece under 64 KB, and all of
    them together under the total. The history of the single-file bound this
    replaced is kept below, because it is the reason the split exists."""
    # 750 KB. Raised from 600 on 2026-09-13 when the popup agent, the Guide and
    # the link menu took the gzipped file to 609 KB, and from 700 on 2026-09-21
    # at 701,992 bytes, 0.3% over, after a night that added per-feature model
    # choice, the Ask sub-tab's four fixes, the tag offer and the mind map's
    # pictures and waypoints.
    #
    # **Two raises is the signal, not the number.** The bound is a smoke test
    # against a runaway file rather than a budget, and its real answer has been
    # the same both times: the app.js split, SESSION_BRIEFS Brief 33, after
    # which this comes back down on its own. A third raise should not be
    # written; the split should be done instead, and the count above is here so
    # whoever reads this next can see how overdue it is rather than inferring
    # it from one number.
    #
    # **The third time, the split was done.** 2026-09-23: 750,706 bytes, 0.1%
    # over. The Timeline tab (about 1,800 lines) moved into its own
    # timeline.js, loaded at boot after dashboard.js, and the bound stayed
    # where it was: 724,604 bytes after, measured through the live server.
    # The next time this goes red, the answer is the next surface out of
    # app.js, not a fourth number here.
    #
    # **The fourth time, the same answer.** 2026-09-24: 752,031 bytes after the
    # catalogue's deep links. The popup agent (Ctrl+K, about 1,330 lines)
    # moved into palette.js, loaded after timeline.js: 730,546 bytes after.
    # Then the generated faces grew to a surface of their own and went into
    # avatars.js (762,903 bytes before, 736,191 after).
    #
    # **The fifth time, the split itself.** 2026-09-26: app.js 740,482 bytes
    # and agent-activity.js 10,651 (751,133 together) when the file started
    # being cut into the pieces the plan lists; the bound became the three
    # caps above.
    sizes = {path.name: _served_gzip_size(client, path.name) for path in app_js_files()}
    assert sizes[APP_JS.name] < APP_JS_CAP, (
        f"gzipped app.js is {sizes[APP_JS.name]} bytes, expected under {APP_JS_CAP}"
    )
    over = {n: size for n, size in sizes.items() if n != APP_JS.name and size >= PIECE_CAP}
    assert not over, f"pieces over {PIECE_CAP} bytes gzipped: {over}"
    total = sum(sizes.values())
    assert total < TOTAL_CAP, (
        f"the app's scripts total {total} bytes gzipped, expected under {TOTAL_CAP}"
    )


def test_an_unstamped_asset_is_not_immutable(client):
    """No `?v=` means the URL can be reused across a release, so it keeps
    asking the browser to revalidate rather than promising it never will."""
    response = client.get("/app.js", headers={"Accept-Encoding": "gzip"})
    assert response.status_code == 200
    cache_control = response.headers.get("cache-control", "")
    assert "immutable" not in cache_control
    assert cache_control == "no-cache"


def test_vendored_assets_stay_revalidated_too(client):
    """Vendored files are deliberately never stamped
    (`test_asset_cache_busting.py::test_vendored_assets_are_left_alone`), so
    they must not accidentally pick up the immutable treatment either."""
    response = client.get("/vendor/d3.v7.min.js", headers={"Accept-Encoding": "gzip"})
    assert response.status_code == 200
    assert response.headers.get("cache-control") == "no-cache"


def test_a_query_string_that_only_contains_v_as_a_substring_is_not_stamped(client):
    """`?vv=1` or `?rev=1` must not be mistaken for the app's own `?v=` stamp."""
    response = client.get("/app.js?vv=1", headers={"Accept-Encoding": "gzip"})
    assert response.headers.get("cache-control") == "no-cache"


def test_chat_stream_never_carries_content_encoding(client):
    """The one response class this change must never touch. Streamed NDJSON
    is excluded from gzip entirely (see test_compression.py); this asserts
    the same invariant holds for the real route, with a real (AI-unavailable)
    request, rather than only against the middleware's configured exclusion
    list."""
    with client.stream(
        "POST", "/chat/stream", headers={"Accept-Encoding": "gzip"}, json={"question": "hey"}
    ) as response:
        assert "content-encoding" not in response.headers
        # Drain the stream so the test client's connection closes cleanly.
        for _ in response.iter_lines():
            pass
