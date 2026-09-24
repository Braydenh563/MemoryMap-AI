"""Build the FastAPI app: API routers + the static frontend.

No CORS middleware: the frontend is served from the same origin as the
API, so none is needed (plan §4). Note that an absent CORS policy is not
the same as a closed door, CORS governs whether a script may *read* a
reply, not whether the request is sent or acted on. What actually refuses
a request made by another site's page is the Origin check in
core/security.py, which runs alongside the CSP from the same module.
"""

from __future__ import annotations

import hmac
import logging
import os
import sys
import threading
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import parse_qs

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.gzip import DEFAULT_EXCLUDED_CONTENT_TYPES, GZipMiddleware

from memorymap import __version__
from memorymap.ai import embeddings, autonomous
from memorymap.search import searxng_manager
from memorymap.api import (
    routes_ask_history,
    routes_auth,
    routes_bookmarks,
    routes_categories,
    routes_chat,
    routes_conversations,
    routes_debug,
    routes_documents,
    run_sandbox,
    routes_backups,
    routes_duplicates,
    routes_drafts,
    routes_learned,
    routes_night,
    routes_resurface,
    routes_entries,
    routes_files,
    routes_graph,
    routes_help,
    routes_insights,
    routes_library,
    routes_models,
    routes_reminders,
    routes_settings,
    routes_spaces,
    routes_tasks,
    routes_timeline,
    routes_search,
    routes_tags,
    routes_update,
    routes_voice,
    routes_websearch,
    routes_whiteboard,
)
from memorymap.api.routes_auth import require_unlock
from memorymap.core import (
    backup,
    bgtasks,
    deps,
    diskspace,
    events,
    jobs,
    logbuffer,
    security,
    startup_status,
)
from memorymap.core.deps import init_app_state
from memorymap.entry import manager

# repo-root/frontend: three levels up from src/memorymap/api/app.py in a
# source checkout. A PyInstaller build has no "three levels up": everything
# bundled lands directly under the extraction root (sys._MEIPASS in onefile
# mode, or the executable's own directory in onedir mode) with the `src/`
# layer gone, so the same parents[3] math would resolve to the extraction
# root's own *parent*: a directory this app has no business reading, let
# alone one that happens to contain a "frontend" folder. Checked first and
# explicitly, not inferred from a path that only looks the same in both
# cases by coincidence.
if getattr(sys, "frozen", False):
    BUNDLE_ROOT = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
else:
    BUNDLE_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIR = BUNDLE_ROOT / "frontend"


#: **Every type the page is served with, named here rather than read from the
#: machine.** Starlette asks `mimetypes`, and on Windows `mimetypes` loads the
#: registry *over* Python's own table, so a machine where an editor or an old
#: installer once set `.js` to `text/plain` (a known Windows state, and the
#: reason Django and Flask users meet a blank page there) serves `app.js` as
#: text. With `X-Content-Type-Options: nosniff` on every response
#: (`core/security.py`) the window then refuses every script, and the grammar
#: worker, a module worker, refuses a non-JavaScript type even without it.
#: The packaged Windows app is the build that meets this; the pins cost
#: nothing anywhere else.
STATIC_MIME_TYPES = {
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".wasm": "application/wasm",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/vnd.microsoft.icon",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".ttf": "font/ttf",
    ".txt": "text/plain",
}


def pin_static_mime_types() -> None:
    """Put `STATIC_MIME_TYPES` over whatever the registry said. `add_type`
    initialises the table first when nothing has yet, so the registry read
    happens before these, never after them."""
    import mimetypes

    for suffix, media_type in STATIC_MIME_TYPES.items():
        mimetypes.add_type(media_type, suffix)


# (Embedding warm-up now lives in ai/embeddings.start_warmup, which also
# tracks running/failed state for the status pill.)


#: **One value, fixed the moment this module is imported, i.e. once per
#: server process.** `start-desktop.bat`/`.sh` starts a fresh server every
#: launch; a browser tab hitting an already-running dev server keeps
#: whatever token that process picked at its own boot. Either way this
#: answers exactly the question the `?v=` stamp exists to answer ("is this
#: the same build the reader last cached?") one level more finely than
#: `__version__` alone can between releases: not just "different version"
#: but "different process start", which is what an unreleased branch full
#: of same-version commits actually needs. See `RevalidatedStatic.
#: get_response` below for where this gets spliced into `index.html`'s own
#: asset URLs, never into the on-disk file (`test_asset_cache_busting.py`
#: still reads that file literally, and still should: it is the contract
#: for what a human edits, this is the contract for what a browser fetches).
_BOOT_TOKEN = format(int(time.time()), "x")


class RevalidatedStatic(StaticFiles):
    """The frontend, served so a cache can never hand back yesterday's build.

    **This is a desktop-app bug hiding in a header.** `StaticFiles` sends
    `last-modified` and an `etag` but no `Cache-Control` at all, and a response
    with neither `Cache-Control` nor `Expires` is one an HTTP cache may reuse
    *without asking*: for a heuristic fraction of its age (RFC 9111 §4.2.2).
    In a browser you press reload and never notice. The desktop shell has no
    reload, is a WebView2/WebKit instance with its own on-disk cache, and
    restarts the *process* without invalidating anything, so after an update
    the app can go on running the previous `app.js` indefinitely.

    That is precisely the shape of "the recycle bin's Empty now button is still
    broken": the fix for it (§35F's in-app confirm dialog) is in the file, and
    the flow was driven end to end in Chromium against this server, the dialog
    opens, the notes go, the server reports an empty bin. A user still seeing
    the old behaviour is running the old script.

    `no-cache` is not `no-store`: the file is still cached, and the conditional
    request still answers 304 from the etag above. All it removes is the
    guessing. Everything here is served from localhost, so the cost of a
    revalidation round-trip is not a real cost.

    **The `?v=<version>` stamp changes this calculus for exactly the URLs
    that carry it** (INBOX 47). `test_asset_cache_busting.py` already
    guarantees every local css/js reference in `index.html` is stamped with
    the current `__version__`, and a stamped URL is a *different* URL on
    every release: nothing is ever served stale from it, unlike the
    unstamped path above where staleness is only *revalidated* away. So a
    stamped request gets `public, max-age=31536000, immutable` (the
    one-year-plus-immutable idiom browsers treat as "never revalidate")
    instead of `no-cache`, saving the round trip `no-cache` still pays.
    Unstamped requests (`/vendor/*`, deliberately unstamped per that same
    test, and any bare path) keep the `no-cache` behaviour above unchanged.

    **`index.html` itself gets one more thing: `_BOOT_TOKEN` spliced onto
    every `?v={__version__}` it hands out.** The desktop shell restarts its
    *server* on every launch (a fresh Python process, a fresh `_BOOT_TOKEN`)
    but not necessarily its own on-disk cache, and this branch's whole day
    sat on one unmoving `__version__` while dozens of real fixes landed:
    reported directly as "basically all my bugs are still there" after a
    long stretch of changes each individually verified against the running
    server. `__version__` alone answers "which release" and is right to
    keep doing that (a released build should cache its assets for a year,
    which is what the `immutable` header above still means); splicing this
    token in as well answers the question that matters *during*
    development, "which time this server was started", with no manual step
    and no change to what gets tagged at release.
    """

    #: `index.html`'s body needs to change per boot (it is the source of
    #: every other URL's `?v=` stamp), and it needs to change *even when the
    #: file on disk has not*, since the whole point is one server process's
    #: stamp differing from the next one's. Handled before `super()` is ever
    #: called, not after: `StaticFiles.get_response` answers a conditional
    #: `If-None-Match`/`If-Modified-Since` against the file's own constant
    #: etag/mtime with a 304 before this class sees a status code to check,
    #: and a 304 tells the browser to keep exactly the stale cached body
    #: this fix exists to stop it keeping. Skipping `super()` for this one
    #: path means no validator is ever computed or sent, no conditional
    #: request has grounds to fire, and every request gets this boot's real
    #: body. Three spellings of the same request reach here: Starlette's own
    #: `get_path` runs `os.path.normpath` on the route, which turns `/`'s
    #: empty split into `"."` rather than `""` (confirmed live: the first
    #: version of this checked `""` and never fired), and a request for the
    #: file by its literal name arrives as `"index.html"` unchanged.
    _INDEX_PATHS = ("", ".", "index.html")

    async def get_response(self, path: str, scope):
        #: `super().get_response` raises this same 405 for anything but
        #: GET/HEAD; the bypass above skips straight past that check along
        #: with the conditional-request one, so it has to raise it itself.
        if path in self._INDEX_PATHS and scope["method"] not in ("GET", "HEAD"):
            raise StarletteHTTPException(status_code=405)
        if path in self._INDEX_PATHS:
            body = (FRONTEND_DIR / "index.html").read_bytes()
            stamp = f"?v={__version__}".encode()
            replacement = f"?v={__version__}-{_BOOT_TOKEN}".encode()
            response = HTMLResponse(content=body.replace(stamp, replacement))
            response.headers["Cache-Control"] = "no-cache"
            return response
        response = await super().get_response(path, scope)
        query = scope.get("query_string", b"")
        if isinstance(query, bytes):
            query = query.decode("latin-1")
        stamped = "v" in parse_qs(query)
        if stamped:
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        else:
            response.headers.setdefault("Cache-Control", "no-cache")
        return response


def _purge_expired_bin_entries() -> None:
    """Recycle-bin auto-clear: permanently drop entries
    binned longer than the user's configured number of days."""
    try:
        session = deps.get_db().session()
        try:
            config = deps.get_config()
            days = int(config.get_preference("recycle_bin_days", 30))
            with events.acting_as("system:recycle-bin"):
                manager.purge_expired_deleted(session, days, uploads_dir=config.uploads_dir)
        finally:
            session.close()
    except Exception:  # noqa: BLE001  # a failed purge must never block startup
        # Swallowing the failure is right; swallowing the reason is not. A bin
        # that has quietly stopped clearing is invisible until the disk fills.
        logging.getLogger("memorymap.startup").warning(
            "the recycle-bin auto-clear didn't run this start", exc_info=True
        )


def _compact_event_log() -> None:
    """Keep `audit_log` from growing by a copy of every note on every edit.

    Beside the recycle-bin clear above and for the same reason: it is work
    that has to happen on a schedule in an app with no scheduler, so it
    happens once per launch, cheaply, and never stops the app from starting.

    Compaction, not deletion: `events.compact`'s own docstring says why
    (an entity's events have to keep replaying to its current state), and
    what it gives up (a version older than the window is no longer readable).
    The window is a preference so a notebook that wants a longer memory can
    have one without a code change.
    """
    try:
        session = deps.get_db().session()
        try:
            config = deps.get_config()
            days = int(
                config.get_preference("event_log_days", events.COMPACT_AFTER_DAYS)
            )
            summary = events.compact(session, older_than_days=days)
            if summary["events"]:
                # Worth a line: this is the one background job that makes a
                # note's older history stop being readable, so a person
                # looking for why should find it said plainly.
                logging.getLogger("memorymap.startup").info(
                    "event log compacted: %s events across %s items now keep "
                    "their record but not their text",
                    summary["events"],
                    summary["entities"],
                )
        finally:
            session.close()
    except Exception:  # noqa: BLE001  # a failed compaction must never block startup
        logging.getLogger("memorymap.startup").warning(
            "the event log compaction didn't run this start", exc_info=True
        )


def _backup_if_due() -> None:
    """Scheduled local backups: one consistent snapshot per day,
    taken at startup. Failure must never stop the app."""
    try:
        config = deps.get_config()
        keep = int(config.get_preference("backup_retention_count", backup.KEEP_BACKUPS))
        backup.backup_if_due(config.db_path, config.data_dir, keep)
    except Exception:  # noqa: BLE001  # a failed backup must never block startup
        # This one matters more than it looks: the user believes they have
        # daily local backups, and without this line a backup that has been
        # failing for months looks exactly like one that has been working.
        logging.getLogger("memorymap.startup").warning(
            "today's local backup didn't run: check Settings → Logs",
            exc_info=True,
        )


def _start_searxng_if_asked() -> None:
    """Bring the user's own search engine up with the app, when they asked.

    Reported: *"maybe a setting for allowing the searxng or web search to be on
    or automatically started which is togglable? it keeps disabling itself."*
    Web search was not disabling itself, the *engine* was gone. SearXNG runs
    as a container this app starts on demand, and nothing restarted it after a
    reboot or a `docker` restart, so every search after that fell back to
    DuckDuckGo, which rate-limits and answers with an error. From the outside
    those are indistinguishable from the setting having switched itself off.

    Off by default, because starting a container is not something a local-first
    app should do to a machine without being asked. In a thread, because the
    start can take tens of seconds pulling an image and a slow engine must not
    be a slow app, and inside a try, for the reason the two functions above
    give: a failure here must never stop MemoryMap from opening.
    """
    try:
        config = deps.get_config()
        if not config.get_preference("searxng_autostart", False):
            return
        threading.Thread(
            target=lambda: searxng_manager.start(config.data_dir),
            name="searxng-autostart",
            daemon=True,
        ).start()
    except Exception:  # noqa: BLE001  # a failed autostart must never block startup
        logging.getLogger("memorymap.startup").warning(
            "SearXNG autostart didn't run this start", exc_info=True
        )


def _start_autonomous_loop() -> None:
    """Start the background librarian's scheduler (§39).

    This call is the whole feature. Without it `autonomous.py` is imported and
    never run, which is exactly how it shipped: Settings offered an interval,
    an on/off switch and three task toggles, all of them wired to preferences
    that nothing ever read. The switch inside the loop stays the authority on
    whether a pass happens, so starting the scheduler unconditionally here is
    safe: a disabled notebook just sleeps.
    """
    try:
        autonomous.start()
    except Exception:  # noqa: BLE001  # same rule as the three above
        logging.getLogger("memorymap.startup").warning(
            "the autonomous scheduler didn't start", exc_info=True
        )


#: PLAN.md §3 B3. Every one of the ~200 `HTTPException(status_code=..., ...)`
#: call sites across the routers picks a status and a human message; none of
#: them picks a machine-readable `code`, and there are too many to touch by
#: hand without risking exactly the kind of drive-by rewrite CLAUDE.md warns
#: against ("Do NOT rewrite the 400+ raise sites"). Deriving `code` from the
#: status here, once, gets every existing raise a stable code for free and
#: means a *new* route never has to remember to set one.
_STATUS_CODES: dict[int, str] = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    410: "gone",
    413: "too_large",
    415: "unsupported_media_type",
    422: "invalid",
    423: "locked",
    429: "rate_limited",
    500: "internal",
    502: "bad_gateway",
    503: "unavailable",
}


def _code_for_status(status_code: int) -> str:
    """A stable machine-readable name for an HTTP status this app raises.

    Falls back to `http_<code>` for anything not named above rather than
    raising or returning something empty, a status nobody has catalogued
    yet still gets a code a client can safely branch on, just not one with a
    friendly name.
    """
    return _STATUS_CODES.get(status_code, f"http_{status_code}")


def _register_error_handlers(app: FastAPI) -> None:
    """Make every failure this app returns machine-readable JSON.

    Before this, an `HTTPException` route returned `{"detail": ...}`, fine
    for the message, but the frontend had nothing to branch on except
    parsing that string, and a route that let an exception escape uncaught
    (the space-delete `IntegrityError`, found in the §40 audit) fell through
    to Starlette's default `ServerErrorMiddleware`, which in production mode
    answers with a bare `text/plain` "Internal Server Error", not JSON, no
    correlation id, and (worse) sometimes a raw traceback if debug ever got
    left on. Two handlers close both gaps:

    - Every `HTTPException` (FastAPI's own class subclasses Starlette's, so
      registering on the Starlette base catches both) gets `code` and `hint`
      added alongside its existing `detail`, `detail` is left exactly as
      the route set it, which is what keeps every existing
      `response.json()["detail"] == "..."` assertion passing unchanged.
      A route may already pass a *dict* detail (`{"detail": ..., "hint": ...,
      "code": ...}`) to override any of the three explicitly; nothing in
      this codebase does yet, but nothing has to change here the day one
      does.
    - Anything else, a bug, not a deliberately raised HTTP error, becomes
      `500 {"detail": "Internal error", "code": "internal", "ref": <uuid>}`.
      The traceback goes to the log keyed by that same `ref` (`logger.exception`,
      so it's a full traceback, not just the one-line summary `.warning` would
      give) and never reaches the response body: a stack trace in an HTTP
      response is a real information leak (paths, versions, sometimes a
      query with a value in it) and this app has no other layer that would
      have stopped it reaching the client.
    """
    error_logger = logging.getLogger("memorymap.errors")

    @app.exception_handler(StarletteHTTPException)
    async def _http_exception_handler(
        _request, exc: StarletteHTTPException
    ) -> JSONResponse:
        detail = exc.detail
        code = _code_for_status(exc.status_code)
        hint = None
        if isinstance(detail, dict):
            # A route opting into the richer shape directly, see the
            # docstring above. `.get("detail", detail)` means a dict that
            # forgot to include its own "detail" key still round-trips as
            # itself rather than silently becoming `None`.
            code = detail.get("code", code)
            hint = detail.get("hint", hint)
            detail = detail.get("detail", detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": detail, "code": code, "hint": hint},
            headers=getattr(exc, "headers", None),
        )

    #: **Out of space is the one failure the person can actually fix, so it
    #: says so.** Measured before this: with the store unable to take another
    #: page, `POST /entries` raised `sqlite3.OperationalError: database or
    #: disk is full` straight out of the route, and the handler below turned
    #: it into `{"detail": "Internal error"}` with a reference number. For a
    #: notebook whose whole promise is that your writing is safe on your own
    #: machine, "Internal error" after pressing save is the worst answer
    #: available: the text is still in the editor, nothing says why it would
    #: not save, and nothing suggests what to do. Reading kept working
    #: throughout, which is worth saying on the way past, because it means
    #: the notebook is intact and this is recoverable.
    #:
    #: Two shapes, one cause. SQLite answers `SQLITE_FULL` as an
    #: `OperationalError` whose message is "database or disk is full"; an
    #: upload, an export or a log write answers `OSError` with `ENOSPC`. Both
    #: mean the same thing to the person and get the same sentence.
    #:
    #: 507, which is what "Insufficient Storage" is for, rather than the 500
    #: this used to be: it is the status a client can branch on, and the
    #: frontend's error toast already shows `detail`.
    #:
    #: Deliberately narrow. `OperationalError` also covers a locked database
    #: and a missing table, and neither is this; matching the message is
    #: uglier than an error code and is what the driver actually gives us,
    #: since `sqlite3` exposes no stable constant for it.
    #: The recognition itself lives in `core/diskspace.py`, because the
    #: pre-write guard below and this after-the-fact handler have to agree
    #: about what "out of space" means, and a second copy of a two-shape
    #: match is exactly the kind of thing that drifts.
    _is_out_of_space = diskspace.out_of_space

    @app.exception_handler(OSError)
    async def _os_error_handler(request, exc: OSError) -> JSONResponse:  # noqa: ANN001
        if not _is_out_of_space(exc):
            return await _unhandled_exception_handler(request, exc)
        return _out_of_space_response(exc)

    def _out_of_space_response(exc: BaseException | None = None) -> JSONResponse:
        error_logger.error("out of disk space", exc_info=exc)
        return JSONResponse(status_code=507, content=out_of_space_body())

    @app.exception_handler(Exception)
    async def _unhandled_exception_handler(_request, exc: Exception) -> JSONResponse:
        if _is_out_of_space(exc):
            return _out_of_space_response(exc)
        # A fresh id per failure, logged next to the real traceback and
        # handed back to the user, "it broke" with no ref is unreportable;
        # this ref is the thing a bug report can actually be filed against.
        ref = uuid.uuid4().hex
        error_logger.exception("Unhandled exception (ref=%s)", ref, exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal error", "code": "internal", "ref": ref},
        )


#: **"The disk is full" is not something a person can act on; "your notebook
#: is on /home/you/.local/share, which has 4.2 MB left, free about 46 MB" is.**
#: The owner asked for exactly that (INBOX 266, item 6: "which disk, roughly
#: how much is needed, what to delete"), so the sentence is built from the
#: numbers rather than written once and frozen. One function, because the
#: guard that refuses a write before it starts and the handler that catches
#: one that already failed have to say the same thing.
def out_of_space_body(wanted: int | None = None) -> dict:
    data_dir = None
    try:
        data_dir = str(deps.get_config().data_dir)
    except Exception:  # pragma: no cover - only before the config exists
        pass
    free = diskspace.free_bytes(data_dir) if data_dir else None
    where = f" Your notebook is in {data_dir}." if data_dir else ""
    room = f" There is {diskspace.human_bytes(free)} free there." if free is not None else ""
    need = ""
    if wanted is not None and data_dir:
        short = diskspace.shortfall(data_dir, wanted)
        if short:
            need = f" Free up about {diskspace.human_bytes(short)} and try again."
    return {
        "detail": "This computer has run out of disk space, so that could not be saved.",
        "code": "out_of_space",
        "hint": (
            f"{where}{room}{need or ' Free some space and try again.'}"
            " Nothing already in your notebook has been lost, and you can still"
            " read and export it. Emptying the trash, or deleting old backups"
            " and exports in Settings, is usually the quickest space to find."
        ).strip(),
        #: The numbers as numbers too, so the Settings panel and any future
        #: caller are not reduced to parsing the sentence.
        "free_bytes": free,
        "data_dir": data_dir,
    }


class SpaceGuard:
    """Refuse a write that cannot fit, before a byte of it is read.

    **Where it cannot be forgotten**, which is the whole point: every write
    in this app arrives as one non-GET request with a `Content-Length`, so
    one ASGI middleware covers the routes that exist, the routes added
    tomorrow, and the ones nobody remembered to check. A per-call-site check
    would have to be remembered fifty times.

    What it buys over letting the write fail: the failure happens without
    consuming the last megabyte. Measured (INBOX 266): a 50 MB upload onto a
    nearly-full disk used to write until the filesystem was at zero, and at
    zero even `POST /auth/unlock` answered 507, so the person could not open
    their notebook at all. Refusing the upload up front leaves the disk
    exactly as full as it was and the notebook exactly as usable.

    GET and HEAD are never touched: reading a notebook needs no space, and
    that stays true right down to the last byte.
    """

    #: Bodies below this are never weighed. A note, a preference, a
    #: whiteboard stroke: at this size the arithmetic is noise next to the
    #: 2 MB headroom, and weighing them only adds a way to refuse work the
    #: disk could plainly do.
    SMALL_BODY_BYTES = 64 * 1024

    def __init__(self, app) -> None:  # noqa: ANN001
        self.app = app

    async def __call__(self, scope, receive, send) -> None:  # noqa: ANN001
        if scope.get("type") != "http" or scope.get("method") in ("GET", "HEAD", "OPTIONS"):
            await self.app(scope, receive, send)
            return
        wanted = _content_length(scope)
        if wanted is not None and wanted > self.SMALL_BODY_BYTES:
            try:
                config = deps.get_config()
            except Exception:  # pragma: no cover - before the config exists
                config = None
            if config is not None and not diskspace.has_room_for(config.data_dir, wanted):
                logging.getLogger("memorymap.errors").error(
                    "refused a %s-byte write: %s has %s free",
                    wanted,
                    config.data_dir,
                    diskspace.free_bytes(config.data_dir),
                )
                response = JSONResponse(status_code=507, content=out_of_space_body(wanted))
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)


def _content_length(scope) -> int | None:  # noqa: ANN001
    for name, value in scope.get("headers", ()):
        if name == b"content-length":
            try:
                return int(value)
            except ValueError:
                return None
    return None


#: How long shutdown waits for the background pool's workers. Short: the only
#: thing that can still be running is one job (a Tesseract pass or a model
#: call), the workers are daemons, and a quit that waits for a vision read of
#: a 20-page scan is the hang `core/bgtasks.py` was written to prevent.
_JOB_SHUTDOWN_SECONDS = 3.0


class RequestPulse:
    """Pure ASGI, one line of work per request: tells the embedding warm-up
    that the app is busy, so the model load waits for a quiet moment rather
    than landing on top of the dashboard's first fetches
    (`ai.embeddings.note_request`)."""

    def __init__(self, app) -> None:  # noqa: ANN001
        self.app = app

    async def __call__(self, scope, receive, send) -> None:  # noqa: ANN001
        if scope.get("type") == "http":
            embeddings.note_request()
        await self.app(scope, receive, send)


def create_app() -> FastAPI:
    # First, before any singleton is built. This catches `uvicorn … --workers 4`
    # run directly against this factory, which is the only way the app can be
    # started multi-worker: `python -m memorymap` hands uvicorn an app object
    # rather than an import string, and uvicorn cannot fork that.
    deps.refuse_multiple_workers()
    pin_static_mime_types()
    logbuffer.install()  # start capturing logs for the Settings viewer
    # Coarse phase markers for the desktop launcher's loading window
    # (core/startup_status.py): the only reader, and a no-op for every
    # other way this app runs (the web build, tests, `python -m memorymap`
    # without `--desktop`), since nothing else ever calls get_phase().
    startup_status.set_phase("Setting up your notebook…")
    init_app_state()
    _purge_expired_bin_entries()
    _compact_event_log()
    _backup_if_due()
    startup_status.set_phase("Starting local services…")
    _start_searxng_if_asked()
    _start_autonomous_loop()
    startup_status.set_phase("Warming up search…")
    # The session factory is handed in so embeddings never has to import the
    # dependency container that imports it.
    embeddings.start_warmup(deps.get_embeddings(), deps.get_db().session)
    startup_status.set_phase("Starting the server…")

    # **Nothing stopped background work when the app quit, and that was the
    # whole of the bug.** Reported directly: "make sure that if the app is
    # quit, all ai tasks and bg tasks stop as well." `/shutdown`'s own
    # docstring already promised that "lifespan handlers run, and the SearXNG
    # subprocess this app may own is torn down by the code that already knows
    # how", accurately describing a handler that did not exist. Daemon
    # threads do die with the process; a pip subprocess and a SearXNG server
    # do not, and an autonomous pass part-way through writing to the notebook
    # was cut off wherever it happened to be.
    #
    # An async lifespan rather than the deprecated `@app.on_event`, and it
    # yields immediately: everything above already ran at import time, and
    # moving it in here would change when the singletons exist for every
    # caller of `create_app()`, tests included.
    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        yield
        # Never raises: `stop_all` swallows per-job failures itself, and a
        # shutdown that fails to shut down is worse than one that leaves a
        # line in the log.
        bgtasks.stop_all()
        # The bounded pool (core/jobs.py) is the other half: `stop_all`
        # handles the jobs that own something interruptible, and this one
        # drops the queue of captions and OCR passes behind it. A deadline
        # rather than a join, because the job in flight may be inside a model
        # call that cannot be interrupted and the workers are daemons: see
        # `jobs.Pool.shutdown`.
        jobs.shutdown(deadline=_JOB_SHUTDOWN_SECONDS)

    # No auto-mounted `/docs`, `/redoc` or `/openapi.json`. Two reasons, and
    # the second is the one that matters. The Swagger and ReDoc pages load
    # their scripts from a CDN, which this offline app's own CSP refuses, so
    # they never rendered anyway. And the schema: every route, parameter and
    # model name, 238 paths, was served to anyone who could reach the port,
    # before the unlock: MODERNISATION_AUDIT.md D5, the one security finding
    # in that audit not already handled. The schema is mounted again below,
    # behind the same `locked` dependency every data route carries.
    app = FastAPI(
        title="MemoryMap AI",
        version=__version__,
        lifespan=lifespan,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    _register_error_handlers(app)

    # Middleware is added inside-out: the LAST one added is the outermost, so
    # the headers below are stamped on the origin check's own 403 too.
    #
    # **Compression goes on FIRST, which means innermost, and the ordering is
    # load-bearing rather than stylistic.** Both middlewares below are
    # `BaseHTTPMiddleware`, and that base class re-wraps every response it
    # handles as a *streaming* response. Starlette's gzip only consults
    # `minimum_size` on a response it can measure, a stream has no length to
    # measure: so a gzip layer placed outside either of them compresses
    # everything regardless of size. Measured while adding this: with gzip
    # outermost, `GET /health` (70 bytes) and `GET /tags` (2 bytes) both came
    # back `content-encoding: gzip`, i.e. spending CPU to make small responses
    # larger, with `minimum_size` silently doing nothing. Innermost, gzip sits
    # against the routers and the static mount and sees real `Content-Length`
    # headers, so the threshold works.
    #
    # **Why compression matters here at all, given it is localhost.**
    # `app.js` is over a megabyte of unminified source and there is no bundler
    # and no minifier by design (CLAUDE.md: "no build step"), so this is the
    # only remaining lever on transfer size. It is not really about the wire:
    # the desktop shell is a WebView with its own cache, and `GET /entries`
    # hands back up to a thousand full note bodies per page.
    #
    # **Streaming was checked, not assumed**, this app has three streaming
    # endpoints (chat in `routes_chat`, the weekly digest in `routes_insights`,
    # the live log in `routes_settings`), and "gzip buffers a stream into
    # uselessness" is true of some implementations. Starlette's is not one:
    # `GZipResponder._compress_body` flushes with `Z_SYNC_FLUSH` on every chunk
    # carrying `more_body`, so each chunk still leaves the server as it is
    # produced. `text/event-stream` is already in Starlette's own exclusion
    # list; the two NDJSON streams are not, so they are named explicitly, 
    # which keeps those two responses byte-identical to what they were before
    # this existed.
    #
    # `compresslevel=6`, not the library default of 9: 9 costs meaningfully
    # more CPU for a few percent of size on text, and this is a single process
    # serving one user who is usually running a local model on the same machine.
    #
    # On BREACH: the attack needs compression *plus* a secret in the response
    # *plus* attacker-controlled reflection, and the last two legs are absent
    # here: the auth token travels in a header rather than a cookie (see this
    # module's docstring) and `OriginCheckMiddleware` already refuses
    # cross-origin requests outright, so there is no third party in a position
    # to make the guesses the attack is built from.
    app.add_middleware(
        GZipMiddleware,
        minimum_size=500,
        compresslevel=6,
        exclude_content_types=(
            *DEFAULT_EXCLUDED_CONTENT_TYPES,
            "application/x-ndjson",
            # The grammar checker's 15.9 MB binary (INBOX 401). Measured on
            # loopback: 755 ms to gzip it on every cold fetch against 60 ms
            # to send it as it is, so compressing it made the first check
            # slower by the whole difference. It is fetched once per launch
            # and revalidated by its ETag after that.
            "application/wasm",
        ),
    )
    app.add_middleware(security.OriginCheckMiddleware)
    app.add_middleware(SpaceGuard)
    app.add_middleware(RequestPulse)
    app.add_middleware(
        security.SecurityHeadersMiddleware,
        # Tracks index.html rather than freezing one policy at startup, see
        # CspForPage for the reported bug that caused ("blocked
        # script-src-elem: inline" after any frontend update, until restart).
        csp=security.CspForPage(FRONTEND_DIR / "index.html"),
    )

    # Everything that touches the user's data sits behind the unlock
    # gate; /auth itself and /health stay open.
    locked = [Depends(require_unlock)]
    app.include_router(routes_auth.router)
    app.include_router(routes_entries.router, dependencies=locked)
    app.include_router(routes_chat.router, dependencies=locked)
    app.include_router(routes_ask_history.router, dependencies=locked)
    app.include_router(routes_models.router, dependencies=locked)
    app.include_router(routes_settings.router, dependencies=locked)
    # The browser's own crash reports, which have to reach the log *before*
    # unlock: that is when the failure they describe happens. One route, and
    # `routes_settings.open_router`'s own comment says why it is separate.
    app.include_router(routes_settings.open_router)
    # The Run button's sandbox page: no data, its own sandboxing policy, and
    # registered before the documents router so `/documents/{id}` does not
    # claim the path (`api/run_sandbox.py`).
    app.include_router(run_sandbox.router)
    app.include_router(routes_update.router, dependencies=locked)
    app.include_router(routes_websearch.router, dependencies=locked)
    app.include_router(routes_backups.router, dependencies=locked)
    app.include_router(routes_spaces.router, dependencies=locked)
    app.include_router(routes_files.router, dependencies=locked)
    # A plain `<img src>` (or a note's own inline `![]()` markdown) never
    # attaches the X-Auth-Token header, so only these routes also accept the
    # media cookie, on their own gate rather than widening `locked` for every
    # route. See require_unlock_media's docstring.
    app.include_router(
        routes_files.media_router, dependencies=[Depends(routes_auth.require_unlock_media)]
    )
    app.include_router(routes_search.router, dependencies=locked)
    app.include_router(routes_tags.router, dependencies=locked)
    app.include_router(routes_categories.router, dependencies=locked)
    app.include_router(routes_conversations.router, dependencies=locked)
    app.include_router(routes_documents.router, dependencies=locked)
    app.include_router(routes_duplicates.router, dependencies=locked)
    app.include_router(routes_drafts.router, dependencies=locked)
    app.include_router(routes_learned.router, dependencies=locked)
    app.include_router(routes_night.router, dependencies=locked)
    app.include_router(routes_resurface.router, dependencies=locked)
    app.include_router(routes_insights.router, dependencies=locked)
    app.include_router(routes_graph.router, dependencies=locked)
    app.include_router(routes_help.router, dependencies=locked)
    app.include_router(routes_reminders.router, dependencies=locked)
    app.include_router(routes_bookmarks.router, dependencies=locked)
    app.include_router(routes_voice.router, dependencies=locked)
    app.include_router(routes_tasks.router, dependencies=locked)
    app.include_router(routes_timeline.router, dependencies=locked)
    app.include_router(routes_library.router, dependencies=locked)
    app.include_router(routes_whiteboard.router, dependencies=locked)
    app.include_router(routes_debug.router, dependencies=locked)

    @app.get("/openapi.json", include_in_schema=False, dependencies=locked)
    def openapi_schema() -> JSONResponse:
        """The API schema, for whoever has unlocked the notebook.

        `openapi_url=None` above stops FastAPI serving it to the whole
        network; this is the same document, behind the unlock. Tooling that
        wants it sends `X-Auth-Token` like every other call.
        """
        return JSONResponse(app.openapi())

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str | bool]:
        return {
            "status": "ok",
            "app": "MemoryMap AI",
            "version": __version__,
            # Whether we are being viewed through the pywebview window rather
            # than a browser tab. The frontend needs to know because a
            # `<a download>` click does nothing there, pywebview has no
            # download handler: so exports have to be written by the server
            # instead (§35E). Set by `python -m memorymap --desktop`.
            "desktop": os.getenv("MEMORYMAP_DESKTOP") == "1",
        }

    @app.post("/instance/focus", include_in_schema=False)
    def instance_focus(x_instance_token: str | None = Header(default=None)) -> dict[str, bool]:
        """A second launch asking this one to bring its window forward.

        Open like `/health` because the asking process has no session, and
        guarded by something better than one: the token in this server's own
        `instance.lock` (core/instance_lock.py), which only someone who can
        read the data directory has. Compared in constant time. `focused` is
        False on a server started in browser mode, which has no window, and
        the second launch then opens a window onto this server instead.
        """
        from memorymap.core import instance_lock

        expected = instance_lock.current_token()
        if not expected or not x_instance_token or not hmac.compare_digest(
            expected.encode(), x_instance_token.encode()
        ):
            raise HTTPException(status_code=403, detail="Not this instance's token.")
        return {"focused": instance_lock.focus()}

    # GET /update/check, /update/releases, /update/source-status, and
    # POST /update/apply all live in routes_update.py now, this endpoint
    # used to be defined inline here, but it feeds and is fed by the rest
    # of that module's update machinery, so it moved to sit next to it.

    @app.get("/changelog", tags=["system"], dependencies=locked)
    def changelog() -> dict:
        """CHANGELOG.md, so "what changed?" is answerable inside the app.

        Behind the unlock like everything else. It was the one route outside
        `/health`, `/auth` and the lock screen's own assets that answered an
        unauthenticated caller, found by the walk in
        `tests/test_every_route_is_locked.py` rather than by review, which is
        exactly what that test is for. Nothing needs it before unlock: the
        only caller is the About panel (`settings.js`), which opens inside an
        unlocked notebook. It reads a file off disk and hands back its
        contents, so leaving it open on a LAN would be a file read for
        anybody who could reach the port, for a file nobody outside has a
        reason to want.

        The file already exists and is written for people, which is the whole
        argument for serving it rather than maintaining a second in-app list
        that would drift from it (§36E). Read per request rather than cached:
        it changes when the app is updated, and an update replaces the process
        anyway: so a cache would only ever be stale in development.
        """
        # BUNDLE_ROOT rather than three levels up: a packaged build keeps its
        # files in the bundle's own folder, and `memorymap.spec` puts this
        # file there, so the About panel's notes are not empty on Windows.
        path = BUNDLE_ROOT / "CHANGELOG.md"
        try:
            return {"markdown": path.read_text(encoding="utf-8")}
        except OSError:
            # A packaged build may not ship it. Missing notes are not an error
            # worth a 500: the About panel just doesn't offer them.
            return {"markdown": ""}

    # Mounted last so the API routes above always win; html=True makes
    # "/" serve frontend/index.html.
    if FRONTEND_DIR.is_dir():
        app.mount(
            "/", RevalidatedStatic(directory=FRONTEND_DIR, html=True), name="frontend"
        )

    return app
