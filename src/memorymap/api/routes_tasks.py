"""What is running in the background, in one place.

Settings → Background tasks used to build its own list in `app.js` out of the
two jobs that happened to be in `/models/status`, a re-index and a model
download. Everything else the app does on a worker thread was invisible
there: the embedding model loading at startup (~90 MB on first use), and the
SearXNG install, which is the longest-running job in the whole app at several
minutes and the one most likely to be what a user came to this screen to ask
about.

So the list is assembled here instead, and the frontend renders whatever it is
given. The point is the next job: anything long enough to need a background
thread should be added to `collect()` and it appears on the screen, rather
than being invisible until someone remembers to teach the UI about it.

Running work is listed first, and what recently *stopped* below it. The second
half was added after the first proved to hide the one case anyone cares about:
a job that fails vanishes at the instant it becomes interesting, leaving the
same empty list as a job that succeeded. The history is in-memory, bounded,
and records endings only, see `core/taskhistory.py`.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from memorymap.ai import embeddings as embeddings_module
from memorymap.ai import model_manager as jobs
from memorymap.core import bgtasks, deps, embedmodels, extras, filejobs, jobruns, jobstore, taskhistory
from memorymap.core import jobs as bgpool

router = APIRouter(tags=["tasks"])


def _percent(done: int, total: int) -> float | None:
    """A fraction, or None when the total isn't known yet: a progress bar
    that guesses is worse than one that admits it can't say."""
    if not total or total <= 0:
        return None
    return max(0.0, min(1.0, done / total))


def collect() -> list[dict]:
    """Every background job currently running, newest concern first."""
    tasks: list[dict] = []

    reindex = jobs.reindex_status()
    if reindex and reindex["status"] == "running":
        tasks.append(
            {
                "kind": "reindex",
                "name": "",
                "label": "Re-indexing your notes",
                "detail": f"{reindex['done']} of {reindex['total']}",
                "progress": _percent(reindex["done"], reindex["total"]),
                "log": [],
            }
        )

    for name, job in (jobs.pull_statuses() or {}).items():
        if job["status"] != "running":
            continue
        fraction = _percent(job["done"], job["total"])
        tasks.append(
            {
                "kind": "pull",
                "name": name,
                "label": f"Downloading {name}",
                "detail": f"{round(fraction * 100)}%" if fraction is not None else "starting…",
                "progress": fraction,
                "log": [],
            }
        )

    # The embedding model loads in a background thread at startup so the first
    # search isn't slow. On a fresh install that includes a ~90 MB download,
    # which is a long silence to explain with nothing on screen.
    if embeddings_module.warmup_running():
        tasks.append(
            {
                "kind": "embeddings",
                "name": deps.get_model_manager().embedding_model(),
                "label": "Loading the embedding model",
                "detail": "The first run downloads it (~90 MB). Search falls "
                "back to keywords until it's ready. This one can't be "
                "stopped part-way: it is a single load with nothing to "
                "interrupt between.",
                "progress": None,
                "log": [],
            }
        )

    # A vision-model caption in flight (ROADMAP §89.6). Not cancellable: 
    # same reasoning as the embedding warmup above: one blocking model call
    # with nothing to check a flag between.
    from memorymap.ai import captioning

    for job in captioning.running_captions():
        tasks.append(
            {
                "kind": "caption",
                "name": str(job["upload_id"]),
                "label": f"Captioning {job['name']}",
                "detail": "A vision model is describing this image.",
                "progress": None,
                #: One blocking call, so no fraction; the lines say what it
                #: is waiting on (INBOX 1006).
                "log": [
                    f"Sent the picture to {job['model']}." if job.get("model") else "Sent the picture to the vision model.",
                    "Waiting for its description. A small model can take a minute.",
                ],
                "started": job.get("started") or None,
            }
        )

    # A PDF page being read in the OCR workspace (`_read_page`). Not
    # cancellable from here for the same reason the two above are not: it is
    # one blocking model (or Tesseract) call with nothing to check a flag
    # between. The workspace's own Stop button abandons the *request*, which is
    # what the person pressing it actually wants.
    from memorymap.ai import vision_ocr as _vision_ocr

    for job in _vision_ocr.running_page_reads():
        tasks.append(
            {
                "kind": "page-read",
                "name": str(job["token"]),
                "label": job["label"],
                "detail": f"{job['model']} is reading this page."
                if job["model"]
                else "A vision model is reading this page.",
                "progress": None,
                "log": [
                    f"Sent the page to {job['model']}." if job["model"] else "Sent the page to the reader.",
                    "Waiting for the text. Closing the workspace does not stop it.",
                ],
                "started": job.get("started") or None,
            }
        )

    # Reading an attached file: "Describe with AI", the local OCR pass, and
    # the vision read. Same not-cancellable reasoning as the three above.
    tasks.extend(filejobs.running())

    # Queued and running background work: the captions, OCR passes and
    # document reads a bulk upload starts. Before the bounded pool these were
    # loose threads that the panel could not see at all, so a folder of 200
    # pictures looked exactly like an idle app (WORLD_CLASS_PLAN A3).
    #: A caption that is running is already a row above, with the picture's
    #: own name ("Captioning sketch-..."); the pool's row for the same job
    #: ("Describing an image") made one caption look like two (owner's
    #: screenshot, INBOX 392). Queued captions stay: nothing else lists them.
    captioning_now = bool(captioning.running_captions())
    tasks.extend(
        row
        for row in bgpool.pending()
        if not (captioning_now and row["kind"] == "job-caption" and not row.get("queued"))
    )

    # Filing past its wait, and the launch warm-up of the filing model: the
    # queued and running filing jobs are pool rows above ("Filing a note").
    from memorymap.ai import janitor

    tasks.extend(janitor.activity_rows())

    # Autonomous optimization task
    from memorymap.ai import autonomous
    if autonomous.is_running():
        tasks.append(
            {
                "kind": "autonomous",
                "name": "",
                "label": "Autonomous optimization",
                "detail": "Analysing your notes in the background. Quitting "
                "stops it at the next safe point and keeps it from starting "
                "again for a while.",
                "progress": None,
                "log": [],
            }
        )

    # Tidy's link reason pass (INBOX 691): a pool job, so it is also a pool
    # row while queued; this row is the running one, with a Quit that stops
    # it at its next chunk (what it named is kept, and undoable in Tidy).
    from memorymap.entry import tidy

    if tidy.is_running():
        tasks.append(
            {
                "kind": "tidy-link-reasons",
                "name": "",
                "label": "Naming link reasons",
                "detail": "Tidy is naming what each linked pair of notes shares. Quitting stops it between batches.",
                "progress": None,
                "log": [],
            }
        )

    # Minutes long, on a worker thread, and previously visible only on the Web
    # search screen: so "is it still doing anything?" had no answer anywhere
    # else. Imported here rather than at module level: it pulls in the search
    # stack, and this endpoint is polled.
    from memorymap.search import searxng_manager

    # A start is not an install, and it is the longer silence of the two from
    # the user's side: it waits up to START_TIMEOUT for the service to answer
    # and shows nothing while it does.
    starting = searxng_manager.starting()
    if starting:
        waited = int(time.time() - (starting.get("since") or time.time()))
        tasks.append(
            {
                "kind": "searxng-start",
                "name": "",
                "label": "Starting SearXNG",
                "detail": (
                    f"Waiting for it to answer ({waited}s of "
                    f"{searxng_manager.START_TIMEOUT}s): "
                    f"{starting.get('backend') or 'source'} backend."
                ),
                "progress": min(waited / max(searxng_manager.START_TIMEOUT, 1), 1.0),
                "log": [],
                "started": starting.get("since") or None,
            }
        )

    # Downloading an embedding model (Settings → Extras, the "Search by
    # meaning" models list). Its own `DownloadState` docstring already says
    # "for /tasks and the panel", the panel half was built, this half never
    # was, so a multi-hundred-MB download with its own dropped-connection
    # retry logic was visible only while that one exact settings screen
    # happened to be open (`renderEmbedModels`'s own poll gates on
    # `currentSettingsSection === "extras"`), and invisible everywhere else
    # in the app the instant you clicked away. Tier 1 §6.
    embed_download = embedmodels.current()
    if embed_download.running:
        model = embedmodels.EMBED_MODELS_BY_ID.get(embed_download.model_id)
        tasks.append(
            {
                "kind": "embedding-model",
                "name": embed_download.model_id,
                "label": f"Downloading {model.label if model else embed_download.label or 'an embedding model'}",
                "detail": embed_download.step or "starting…",
                # No fraction reported for the same reason pip's isn't below:
                # snapshot_download doesn't hand back one worth trusting.
                "progress": None,
                "log": list(embed_download.log),
                "started": embed_download.started or None,
            }
        )

    # Installing an optional extra (Settings → Extras). Here rather than on its
    # own screen for the reason this module exists: anything long enough to
    # need a background thread belongs in one list, and the status bar and the
    # Tasks panel then show it without learning anything new.
    pip = extras.current()
    bulk = extras.bulk_status()
    if bulk["running"]:
        #: A bulk action (INBOX 595) is one row, not one per package: its
        #: label is the whole job, its detail the package in hand, and its
        #: fraction is real here, packages done of packages asked.
        now = next((item for item in bulk["items"] if item["outcome"] == "running"), None)
        step = f"{now['label']}: {pip.step}" if now and pip.running else "Between packages…"
        tasks.append(
            {
                "kind": "extra",
                "name": bulk["bundle"] or "bulk",
                "label": extras.bulk_label(bulk["action"], bulk["total"]),
                "detail": f"{bulk['done'] + 1 if now else bulk['done']} of {bulk['total']}. {step}",
                "progress": bulk["done"] / bulk["total"] if bulk["total"] else None,
                "log": list(pip.log),
                "started": extras.bulk().started or None,
                #: Each package and where it is (INBOX 696), so the row can
                #: say which are done, which is in hand and which wait.
                "steps": [{"label": item["label"], "outcome": item["outcome"]} for item in bulk["items"]],
            }
        )
    elif pip.running:
        tasks.append(
            {
                "kind": "extra",
                "name": pip.extra_id,
                "label": f"Installing {extras.EXTRAS_BY_ID[pip.extra_id].label}"
                if pip.extra_id in extras.EXTRAS_BY_ID
                else "Installing an optional extra",
                "detail": pip.step or "starting pip…",
                # pip does not report a fraction it is worth believing, and a
                # bar that guesses is worse than one that admits it can't say.
                "progress": None,
                "log": list(pip.log),
                "started": pip.started or None,
            }
        )

    install = searxng_manager._install_state
    if install["running"]:
        stage = install.get("stage") or 1
        tasks.append(
            {
                "kind": "searxng",
                "name": "",
                "label": f"Setting up SearXNG: step {stage} of {install['stages']}",
                "detail": install["step"] or "This takes a few minutes the first time.",
                "progress": install.get("progress"),
                                # The lines the tools themselves printed. Reported directly:
                # "the searxng reinstall doesn't have a progress bar so idk if
                # it has frozen or is working", a bar answers that only while
                # it moves, and pip building lxml can sit on one number for a
                # while. Its output is the thing that keeps changing.
                "log": list(install.get("log") or []),
            }
        )

    # The Windows installer's download (Settings, About, Update now): minutes
    # on a slow line, and it was visible only in its own dialog (INBOX 696:
    # "does everything show in the background tasks??").
    from memorymap.api import routes_update

    update = routes_update.current()
    if update["running"]:
        tasks.append(
            {
                "kind": "app-update",
                "name": "",
                "label": "Downloading the update",
                "detail": update["step"] or "starting…",
                "progress": _percent(update["done_bytes"], update["total_bytes"]),
                "log": [],
            }
        )

    # Changing the embedding model (INBOX 700): its own row with the phase
    # and the notes done, like the re-index above.
    from memorymap.core import embedswitch

    switch = embedswitch.task_row()
    if switch:
        tasks.append({"kind": "embed-switch", **switch})

    # The scheduled passes report as they go (INBOX 1006): a bar, named steps
    # and a short log, from the run record's live handle (`jobruns.live`). A
    # pass already listed above (the pool's "job-pass" row for a Run now, the
    # autonomous row) is filled in; one the pool never saw (the start-up
    # housekeeping, a scheduled backup) gets its own row, so no pass runs
    # unseen.
    from memorymap.core import passes

    #: Runs whose row is built above from its own state: the live handle only
    #: fills it in (run kind -> row kind).
    own_rows = {"autonomous": "autonomous", "tidy": "tidy-link-reasons"}
    for live in jobruns.live():
        if live["kind"] not in passes.PASS_KINDS and live["kind"] not in own_rows:
            continue
        row = next(
            (
                t
                for t in tasks
                if t["kind"] == own_rows.get(live["kind"])
                or (t["kind"] == "job-pass" and not t.get("queued") and t.get("name") == live["label"])
            ),
            None,
        )
        if row is None and live["kind"] in own_rows:
            continue
        if row is None:
            row = {"kind": "job-pass", "name": live["label"], "label": live["label"], "detail": "", "queued": False}
            tasks.append(row)
        row["progress"] = live["progress"]
        row["log"] = live["log"]
        row["started"] = live["started"]
        if live["steps"]:
            row["steps"] = live["steps"]
        if live["detail"]:
            row["detail"] = live["detail"]

    _stamp_started(tasks)

    # **One table decides, not eight hard-coded booleans.** Every entry above
    # used to carry its own `"cancellable": True/False`, and six of them said
    # False because nothing could stop them, which was true when they were
    # written and stopped being true when `core/bgtasks.py` gave each one a
    # canceller. A flag repeated at eight call sites is a flag that drifts;
    # this reads the same table the cancel endpoint dispatches through, so the
    # button appears exactly where pressing it does something.
    for task in tasks:
        task["cancellable"] = (
            task["kind"] in bgtasks.CANCELLABLE_KINDS
            # A running pass that has a step to stop at (INBOX 713).
            or (task["kind"] == "job-pass" and not task.get("queued") and passes.kind_for_label(task.get("name", "")) in passes.STOPPABLE)
            or task["kind"] in FILING_KINDS
            # A queued job the `jobs` table holds: cancelling its row is a
            # real stop (`jobstore.cancel`). A running one is not offered.
            or bool(task.get("queued") and task.get("job_id"))
        )
    return tasks


#: (kind, name) -> when `collect` first saw that row, for a job that keeps no
#: clock of its own (a re-index, a pull, the SearXNG install). A first sight
#: is a poll's, so it can be late by one poll interval; it never restarts
#: while the row stays, which is what lets the elapsed time grow.
_first_seen: dict[tuple[str, str], float] = {}


def _stamp_started(tasks: list[dict]) -> None:
    """Give every row a `started` (INBOX 696: the panel shows how long each
    has run): its own where the job keeps one, else when it was first seen.
    Rows gone from the list are forgotten, so a job run again starts afresh."""
    now = time.time()
    keys = set()
    for task in tasks:
        key = (task["kind"], str(task.get("name") or ""))
        keys.add(key)
        if task.get("started"):
            task["started"] = float(task["started"])
            _first_seen[key] = task["started"]
            continue
        task["started"] = _first_seen.setdefault(key, now)
    for key in list(_first_seen):
        if key not in keys:
            del _first_seen[key]


#: The filing rows (the pool's "Filing a note" and janitor's late-answer
#: row), stopped here rather than through `bgtasks.CANCELLERS`: those also
#: run at shutdown (`bgtasks.stop_all`), and quitting the app must not file
#: every waiting note by meaning and take it out of Atlas's hands.
FILING_KINDS = frozenset({"job-file-entry", "filing-late"})


def _stop_filing() -> tuple[bool, str]:
    from memorymap.api.routes_entries import stop_all_filing

    count = stop_all_filing("fallback")
    if not count:
        return False, "Nothing is filing."
    return True, f"Stopped filing {count} note(s): filed by meaning where one matched."



@router.get("/tasks")
def list_tasks() -> dict:
    """What is running, and what has recently stopped.

    The history is the half that was missing, and the reason is narrow: a job
    that *fails* used to disappear at the moment it became interesting. A
    re-index that died halfway left exactly the same empty list as one that
    finished, and the only record of why was the log console, a different
    screen that you have to know to look at.
    """
    #: `now` so the panel counts elapsed time on the server's clock.
    return {"tasks": collect(), "history": taskhistory.recent(), "now": time.time()}


@router.get("/jobs/last-runs")
def jobs_last_runs() -> dict:
    """When each kind of job last ran, and whether it worked (INBOX 438).

    One entry per kind in `jobruns.KINDS`, `ran: false` for the ones that have
    never run on this notebook, so the Background jobs overview can say "Not
    run yet" instead of omitting a job the person is looking for. Unlike
    `/tasks` this survives a restart: it is the database's record, not the
    process's.
    """
    from memorymap.core import passes

    #: The scheduled passes carry their schedule and a Run now (INBOX 713).
    runs = jobruns.last_runs(deps.get_db())
    extra = passes.overview()
    for run in runs:
        run.update(extra.get(run["kind"], {}))
    return {"jobs": runs}


@router.post("/jobs/passes/{kind}/run")
def run_pass_now(kind: str) -> dict:
    """Run one scheduled pass now, through the job pool, deduped (INBOX 713).
    `kind` is a name from `passes.PASS_KINDS`, never a function."""
    from fastapi import HTTPException

    from memorymap.core import passes

    if kind not in passes.PASS_KINDS:
        raise HTTPException(status_code=404, detail="No such pass.")
    started, message = passes.run_now(kind)
    return {"started": started, "message": message}


@router.get("/jobs")
def list_jobs(limit: int = Query(default=50, ge=1, le=500)) -> dict:
    """The durable job table (WORLD_CLASS_PLAN B2): what is queued and
    running, oldest first, then the latest endings. Survives a restart, like
    `/jobs/last-runs` and unlike `/tasks`."""
    return {"jobs": jobstore.list_jobs(deps.get_db(), limit=limit, labels=bgpool.LABELS)}


@router.post("/jobs/{job_id}/cancel")
def cancel_job(job_id: int) -> dict:
    """Stop one queued job by its row. Never 404 or 409, the same contract
    as `/tasks/cancel`: a job that ended while the click travelled is an
    answer, not an error."""
    stopped, detail = jobstore.cancel(job_id, db=deps.get_db())
    return {"status": "ok", "stopped": stopped, "detail": detail}


#: How often the stream looks at the change counter, and how long it stays
#: open before the client reconnects. A minute rather than for ever: uvicorn
#: lets a response in flight finish before it exits, so an open stream holds
#: a quit for as long as it may run, and `EventSource` reopens on its own
#: (after the `retry:` the stream sends) for the price of one request.
_STREAM_POLL_SECONDS = 0.5
_STREAM_PING_SECONDS = 15.0
_STREAM_MAX_SECONDS = 60.0


@router.get("/jobs/stream")
async def jobs_stream(
    request: Request,
    seconds: float = Query(default=_STREAM_MAX_SECONDS, ge=0, le=_STREAM_MAX_SECONDS),
    limit: int = Query(default=50, ge=1, le=500),
) -> StreamingResponse:
    """Server-sent events: the `/jobs` list, sent at once and again on every
    change (`jobstore.version`), plus a comment line every 15 s so a proxy
    does not close an idle stream, for at most a minute. `seconds=0` sends the one snapshot and
    ends, for a reader that wants it once."""
    db = deps.get_db()

    def snapshot() -> str:
        rows = jobstore.list_jobs(db, limit=limit, labels=bgpool.LABELS)
        return f"event: jobs\ndata: {json.dumps({'jobs': rows})}\n\n"

    async def events():
        seen = jobstore.version()
        yield "retry: 3000\n\n" + await asyncio.to_thread(snapshot)
        started = last_sent = time.monotonic()
        while time.monotonic() - started < seconds:
            await asyncio.sleep(_STREAM_POLL_SECONDS)
            if await request.is_disconnected():
                return
            now_version = jobstore.version()
            if now_version != seen:
                seen = now_version
                last_sent = time.monotonic()
                yield await asyncio.to_thread(snapshot)
            elif time.monotonic() - last_sent >= _STREAM_PING_SECONDS:
                last_sent = time.monotonic()
                yield ": ping\n\n"

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )


class CancelTaskBody(BaseModel):
    """Which job to stop. `kind` is what `/tasks` reported for it."""

    kind: str = Field(min_length=1, max_length=40)
    #: Only `pull` needs one (a model name); empty means "all of that kind",
    #: which is what shutdown wants and what a panel with one download means.
    name: str = Field(default="", max_length=200)


@router.post("/tasks/cancel")
def cancel_task(body: CancelTaskBody) -> dict:
    """Quit one background job.

    Asked for directly: "allow the quitting/killing of background tasks as
    well". There was a `/models/jobs/cancel` before this, and it knew about
    exactly two of the eight kinds `/tasks` reports: so the panel showed a
    Quit button on a re-index and a model pull and nothing else, including on
    the jobs that take longest and are most worth stopping.

    Never 404s on an unknown kind and never 409s on a job that has already
    finished: both are answers, not errors, and the panel is polling, by the
    time a click arrives the job it was about may genuinely be over. The
    honest response is `stopped: false` and a sentence saying so.
    """
    kind = body.kind.strip()
    if kind == "job-pass":
        # A scheduled pass started by hand (INBOX 713): stopped at its next
        # step where it has one, said plainly where it has not.
        from memorymap.core import passes

        stopped, detail = passes.stop(passes.kind_for_label(body.name.strip()))
        return {"status": "ok", "stopped": stopped, "detail": detail}
    if kind.startswith("job-") and kind not in FILING_KINDS:
        count = jobstore.cancel_queued(kind[len("job-"):], body.name.strip())
        if count:
            return {"status": "ok", "stopped": True, "detail": f"Stopped {count} waiting job{'' if count == 1 else 's'}."}
        return {"status": "ok", "stopped": False, "detail": "It is already running and will finish."}
    if body.kind.strip() in FILING_KINDS:
        try:
            stopped, detail = _stop_filing()
        except Exception:  # noqa: BLE001 - a failed stop is a message, not a 500
            logging.getLogger(__name__).warning("couldn't stop filing", exc_info=True)
            stopped, detail = False, "Couldn't stop filing, see Settings → Logs."
        return {"status": "ok", "stopped": stopped, "detail": detail}
    stopped, detail = bgtasks.cancel(body.kind.strip(), body.name.strip())
    return {"status": "ok", "stopped": stopped, "detail": detail}


@router.post("/tasks/trigger-autonomous")
def trigger_autonomous() -> dict:
    """Run the background librarian now, rather than waiting for its interval.

    Returns `started: false` rather than 409-ing when one is already going:
    pressing "Run now" while it runs is not an error, it is impatience, and the
    honest answer is "it's already going". The guard itself matters, without
    it each press started another agent loop against the same notebook.

    Reported: a "completed" notification for a pass the user "didn't have
    enabled". `trigger_now` itself has never checked the master
    `autonomous_tasks_enabled` toggle: only the scheduled loop did, before
    ever calling it: so this endpoint ran the real pass regardless of the
    toggle; the "Run now" button just happens to be hidden while it's off,
    which is a UI convenience, not an authorization check. Checked here,
    before `trigger_now`, rather than inside it: `trigger_now`'s own job is
    the concurrency guard above, and folding a second, unrelated reason to
    refuse into the same bool return would make "false" ambiguous between
    "busy" and "disabled" for every existing caller of that function.
    """
    from memorymap.ai import autonomous

    if not deps.get_config().get_preference("autonomous_tasks_enabled", False):
        return {
            "status": "ok",
            "started": False,
            "detail": "Autonomous background workers are switched off in Settings.",
        }

    started = autonomous.trigger_now()
    return {
        "status": "ok",
        "started": started,
        "detail": "" if started else "A pass is already running.",
    }


@router.get("/tasks/autonomous/last")
def last_autonomous_pass() -> dict:
    """What the background librarian changed last time it ran (§40 item 2).

    The honest answer to "you are asking me to let an agent edit my notebook
    unattended". A true preview is not available, the model chooses each call
    from the result of the previous one, so a pass with the writes stubbed out
    stops resembling the pass that would really happen, but every change
    carries the tool call that reverses it, and the browser hands those back to
    `POST /chat/tools/execute`, which is the same path the chat's own Undo
    buttons already use.
    """
    from memorymap.ai import autonomous

    return autonomous.last_pass()


@router.post("/tasks/autonomous/last/clear")
def clear_last_autonomous_pass() -> dict:
    """Dismiss the review list once it has been read."""
    from memorymap.ai import autonomous

    autonomous.forget_last_pass()
    return {"status": "ok"}


@router.post("/tasks/history/clear")
def clear_history() -> dict:
    """Forget the finished-job list.

    It is in-memory and bounded, so this is a tidiness button rather than a
    maintenance one: but a screen you cannot clear is a screen people stop
    reading.
    """
    taskhistory.clear()
    return {"cleared": True}


# --- the desktop window's full screen ------------------------------------------


@router.get("/desktop/fullscreen")
def desktop_fullscreen_state() -> dict:
    """Whether this app runs in a window that can fill the screen itself.

    `available` is false in a browser tab, where the page uses the browser's
    own Fullscreen API (see `core.window_hook` for why the desktop window
    cannot)."""
    from memorymap.core import window_hook

    return {"available": window_hook.available(), "fullscreen": window_hook.is_fullscreen()}


@router.post("/desktop/fullscreen")
def desktop_fullscreen_toggle() -> dict:
    """Put the desktop window into full screen, or take it out."""
    from memorymap.core import window_hook

    state = window_hook.toggle()
    return {"available": state is not None, "fullscreen": bool(state)}


# --- shutting the app down cleanly -------------------------------------------


@router.post("/shutdown")
def shutdown() -> dict:
    """Stop the server on purpose, from inside the app.

    Asked for: *"a way to cleanly exit the program and quit the backend."*
    Until now the only ways out were Ctrl+C in a terminal window the launcher
    hides, or closing the window and leaving the server running, which is why
    a second start could find the port taken by the first.

    Three properties this deliberately has:

    - **It is a POST behind the unlock gate and the origin check.** A GET would
      be reachable from a link, and "the app quit when I clicked something in
      another tab" is a bug report nobody enjoys writing.
    - **It replies first, then exits.** Signalling the process inline means the
      browser gets a dropped connection and shows an error for a thing that
      worked. The signal goes out on a short timer so the response is already
      on the wire.
    - **SIGINT, not `os._exit`.** It is the same signal Ctrl+C sends, so
      uvicorn runs its normal shutdown: in-flight requests finish, lifespan
      handlers run, and the SearXNG subprocess this app may own is torn down
      by the code that already knows how. A hard exit would skip all of that
      and leave the orphan it was trying to avoid.
    """
    import os
    import signal
    import threading

    from memorymap.core import quit_hook

    def _stop() -> None:
        # The desktop window registers its own close (see quit_hook's
        # docstring for why SIGINT alone did nothing there).
        if quit_hook.request_quit():
            return
        os.kill(os.getpid(), signal.SIGINT)

    threading.Timer(0.15, _stop).start()  # long enough for this reply to leave
    return {"stopping": True}
