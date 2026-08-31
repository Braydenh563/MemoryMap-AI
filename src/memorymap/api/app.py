"""Build the FastAPI app: API routers + the static frontend.

No CORS middleware: the frontend is served from the same origin as the
API, so none is needed (plan §4). Note that an absent CORS policy is not
the same as a closed door — CORS governs whether a script may *read* a
reply, not whether the request is sent or acted on. What actually refuses
a request made by another site's page is the Origin check in
core/security.py, which runs alongside the CSP from the same module.
"""

from __future__ import annotations

import logging
import os
import sys
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.staticfiles import StaticFiles
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
    routes_documents,
    routes_backups,
    routes_duplicates,
    routes_drafts,
    routes_entries,
    routes_files,
    routes_graph,
    routes_insights,
    routes_library,
    routes_models,
    routes_reminders,
    routes_settings,
    routes_spaces,
    routes_tasks,
    routes_timeline,
    routes_tags,
    routes_update,
    routes_voice,
    routes_websearch,
    routes_whiteboard,
)
from memorymap.api.routes_auth import require_unlock
from memorymap.core import backup, bgtasks, deps, logbuffer, security, startup_status
from memorymap.core.deps import init_app_state
from memorymap.entry import manager

# repo-root/frontend — three levels up from src/memorymap/api/app.py in a
# source checkout. A PyInstaller build has no "three levels up": everything
# bundled lands directly under the extraction root (sys._MEIPASS in onefile
# mode, or the executable's own directory in onedir mode) with the `src/`
# layer gone, so the same parents[3] math would resolve to the extraction
# root's own *parent* — a directory this app has no business reading, let
# alone one that happens to contain a "frontend" folder. Checked first and
# explicitly, not inferred from a path that only looks the same in both
# cases by coincidence.
if getattr(sys, "frozen", False):
    FRONTEND_DIR = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent)) / "frontend"
else:
    FRONTEND_DIR = Path(__file__).resolve().parents[3] / "frontend"


# (Embedding warm-up now lives in ai/embeddings.start_warmup, which also
# tracks running/failed state for the status pill.)


class RevalidatedStatic(StaticFiles):
    """The frontend, served so a cache can never hand back yesterday's build.

    **This is a desktop-app bug hiding in a header.** `StaticFiles` sends
    `last-modified` and an `etag` but no `Cache-Control` at all, and a response
    with neither `Cache-Control` nor `Expires` is one an HTTP cache may reuse
    *without asking* — for a heuristic fraction of its age (RFC 9111 §4.2.2).
    In a browser you press reload and never notice. The desktop shell has no
    reload, is a WebView2/WebKit instance with its own on-disk cache, and
    restarts the *process* without invalidating anything — so after an update
    the app can go on running the previous `app.js` indefinitely.

    That is precisely the shape of "the recycle bin's Empty now button is still
    broken": the fix for it (§35F's in-app confirm dialog) is in the file, and
    the flow was driven end to end in Chromium against this server — the dialog
    opens, the notes go, the server reports an empty bin. A user still seeing
    the old behaviour is running the old script.

    `no-cache` is not `no-store`: the file is still cached, and the conditional
    request still answers 304 from the etag above. All it removes is the
    guessing. Everything here is served from localhost, so the cost of a
    revalidation round-trip is not a real cost.
    """

    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
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
            manager.purge_expired_deleted(session, days, uploads_dir=config.uploads_dir)
        finally:
            session.close()
    except Exception:  # noqa: BLE001 — a failed purge must never block startup
        # Swallowing the failure is right; swallowing the reason is not. A bin
        # that has quietly stopped clearing is invisible until the disk fills.
        logging.getLogger("memorymap.startup").warning(
            "the recycle-bin auto-clear didn't run this start", exc_info=True
        )


def _backup_if_due() -> None:
    """Scheduled local backups: one consistent snapshot per day,
    taken at startup. Failure must never stop the app."""
    try:
        config = deps.get_config()
        keep = int(config.get_preference("backup_retention_count", backup.KEEP_BACKUPS))
        backup.backup_if_due(config.db_path, config.data_dir, keep)
    except Exception:  # noqa: BLE001 — a failed backup must never block startup
        # This one matters more than it looks: the user believes they have
        # daily local backups, and without this line a backup that has been
        # failing for months looks exactly like one that has been working.
        logging.getLogger("memorymap.startup").warning(
            "today's local backup didn't run — check Settings → Logs",
            exc_info=True,
        )


def _start_searxng_if_asked() -> None:
    """Bring the user's own search engine up with the app, when they asked.

    Reported: *"maybe a setting for allowing the searxng or web search to be on
    or automatically started which is togglable? it keeps disabling itself."*
    Web search was not disabling itself — the *engine* was gone. SearXNG runs
    as a container this app starts on demand, and nothing restarted it after a
    reboot or a `docker` restart, so every search after that fell back to
    DuckDuckGo, which rate-limits and answers with an error. From the outside
    those are indistinguishable from the setting having switched itself off.

    Off by default, because starting a container is not something a local-first
    app should do to a machine without being asked. In a thread, because the
    start can take tens of seconds pulling an image and a slow engine must not
    be a slow app — and inside a try, for the reason the two functions above
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
    except Exception:  # noqa: BLE001 — a failed autostart must never block startup
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
    safe — a disabled notebook just sleeps.
    """
    try:
        autonomous.start()
    except Exception:  # noqa: BLE001 — same rule as the three above
        logging.getLogger("memorymap.startup").warning(
            "the autonomous scheduler didn't start", exc_info=True
        )


def create_app() -> FastAPI:
    # First, before any singleton is built. This catches `uvicorn … --workers 4`
    # run directly against this factory, which is the only way the app can be
    # started multi-worker — `python -m memorymap` hands uvicorn an app object
    # rather than an import string, and uvicorn cannot fork that.
    deps.refuse_multiple_workers()
    logbuffer.install()  # start capturing logs for the Settings viewer
    # Coarse phase markers for the desktop launcher's loading window
    # (core/startup_status.py) — the only reader, and a no-op for every
    # other way this app runs (the web build, tests, `python -m memorymap`
    # without `--desktop`), since nothing else ever calls get_phase().
    startup_status.set_phase("Setting up your notebook…")
    init_app_state()
    _purge_expired_bin_entries()
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
    # how" — accurately describing a handler that did not exist. Daemon
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
        # Never raises — `stop_all` swallows per-job failures itself, and a
        # shutdown that fails to shut down is worse than one that leaves a
        # line in the log.
        bgtasks.stop_all()

    app = FastAPI(title="MemoryMap AI", version=__version__, lifespan=lifespan)

    # Middleware is added inside-out: the LAST one added is the outermost, so
    # the headers below are stamped on the origin check's own 403 too.
    #
    # **Compression goes on FIRST, which means innermost, and the ordering is
    # load-bearing rather than stylistic.** Both middlewares below are
    # `BaseHTTPMiddleware`, and that base class re-wraps every response it
    # handles as a *streaming* response. Starlette's gzip only consults
    # `minimum_size` on a response it can measure — a stream has no length to
    # measure — so a gzip layer placed outside either of them compresses
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
    # **Streaming was checked, not assumed** — this app has three streaming
    # endpoints (chat in `routes_chat`, the weekly digest in `routes_insights`,
    # the live log in `routes_settings`), and "gzip buffers a stream into
    # uselessness" is true of some implementations. Starlette's is not one:
    # `GZipResponder._compress_body` flushes with `Z_SYNC_FLUSH` on every chunk
    # carrying `more_body`, so each chunk still leaves the server as it is
    # produced. `text/event-stream` is already in Starlette's own exclusion
    # list; the two NDJSON streams are not, so they are named explicitly —
    # which keeps those two responses byte-identical to what they were before
    # this existed.
    #
    # `compresslevel=6`, not the library default of 9: 9 costs meaningfully
    # more CPU for a few percent of size on text, and this is a single process
    # serving one user who is usually running a local model on the same machine.
    #
    # On BREACH: the attack needs compression *plus* a secret in the response
    # *plus* attacker-controlled reflection, and the last two legs are absent
    # here — the auth token travels in a header rather than a cookie (see this
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
        ),
    )
    app.add_middleware(security.OriginCheckMiddleware)
    app.add_middleware(
        security.SecurityHeadersMiddleware,
        csp=security.build_csp(
            security.inline_script_hashes(FRONTEND_DIR / "index.html")
        ),
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
    app.include_router(routes_update.router, dependencies=locked)
    app.include_router(routes_websearch.router, dependencies=locked)
    app.include_router(routes_backups.router, dependencies=locked)
    app.include_router(routes_spaces.router, dependencies=locked)
    app.include_router(routes_files.router, dependencies=locked)
    # A plain `<img src>` (or a note's own inline `![]()` markdown) never
    # attaches the X-Auth-Token header — only these two routes need a
    # query-param fallback, so they get their own gate rather than widening
    # `locked` for every route. See require_unlock_media's docstring.
    app.include_router(
        routes_files.media_router, dependencies=[Depends(routes_auth.require_unlock_media)]
    )
    app.include_router(routes_tags.router, dependencies=locked)
    app.include_router(routes_categories.router, dependencies=locked)
    app.include_router(routes_conversations.router, dependencies=locked)
    app.include_router(routes_documents.router, dependencies=locked)
    app.include_router(routes_duplicates.router, dependencies=locked)
    app.include_router(routes_drafts.router, dependencies=locked)
    app.include_router(routes_insights.router, dependencies=locked)
    app.include_router(routes_graph.router, dependencies=locked)
    app.include_router(routes_reminders.router, dependencies=locked)
    app.include_router(routes_bookmarks.router, dependencies=locked)
    app.include_router(routes_voice.router, dependencies=locked)
    app.include_router(routes_tasks.router, dependencies=locked)
    app.include_router(routes_timeline.router, dependencies=locked)
    app.include_router(routes_library.router, dependencies=locked)
    app.include_router(routes_whiteboard.router, dependencies=locked)

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str | bool]:
        return {
            "status": "ok",
            "app": "MemoryMap AI",
            "version": __version__,
            # Whether we are being viewed through the pywebview window rather
            # than a browser tab. The frontend needs to know because a
            # `<a download>` click does nothing there — pywebview has no
            # download handler — so exports have to be written by the server
            # instead (§35E). Set by `python -m memorymap --desktop`.
            "desktop": os.getenv("MEMORYMAP_DESKTOP") == "1",
        }

    # GET /update/check, /update/releases, /update/source-status, and
    # POST /update/apply all live in routes_update.py now — this endpoint
    # used to be defined inline here, but it feeds and is fed by the rest
    # of that module's update machinery, so it moved to sit next to it.

    @app.get("/changelog", tags=["system"])
    def changelog() -> dict:
        """CHANGELOG.md, so "what changed?" is answerable inside the app.

        The file already exists and is written for people, which is the whole
        argument for serving it rather than maintaining a second in-app list
        that would drift from it (§36E). Read per request rather than cached:
        it changes when the app is updated, and an update replaces the process
        anyway — so a cache would only ever be stale in development.
        """
        path = Path(__file__).resolve().parents[3] / "CHANGELOG.md"
        try:
            return {"markdown": path.read_text(encoding="utf-8")}
        except OSError:
            # A packaged build may not ship it. Missing notes are not an error
            # worth a 500 — the About panel just doesn't offer them.
            return {"markdown": ""}

    # Mounted last so the API routes above always win; html=True makes
    # "/" serve frontend/index.html.
    if FRONTEND_DIR.is_dir():
        app.mount(
            "/", RevalidatedStatic(directory=FRONTEND_DIR, html=True), name="frontend"
        )

    return app
