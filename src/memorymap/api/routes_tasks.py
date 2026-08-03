"""What is running in the background, in one place.

Settings → Background tasks used to build its own list in `app.js` out of the
two jobs that happened to be in `/models/status` — a re-index and a model
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
and records endings only — see `core/taskhistory.py`.
"""

from __future__ import annotations

import time

from fastapi import APIRouter

from memorymap.ai import embeddings as embeddings_module
from memorymap.ai import model_manager as jobs
from memorymap.core import deps, extras, taskhistory

router = APIRouter(tags=["tasks"])


def _percent(done: int, total: int) -> float | None:
    """A fraction, or None when the total isn't known yet — a progress bar
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
                "cancellable": True,
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
                "cancellable": True,
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
                "back to keywords until it's ready.",
                "progress": None,
                "cancellable": False,
                "log": [],
            }
        )

    # Minutes long, on a worker thread, and previously visible only on the Web
    # search screen — so "is it still doing anything?" had no answer anywhere
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
                    f"{searxng_manager.START_TIMEOUT}s) — "
                    f"{starting.get('backend') or 'source'} backend."
                ),
                "progress": min(waited / max(searxng_manager.START_TIMEOUT, 1), 1.0),
                "cancellable": False,
                "log": [],
            }
        )

    # Installing an optional extra (Settings → Extras). Here rather than on its
    # own screen for the reason this module exists: anything long enough to
    # need a background thread belongs in one list, and the status bar and the
    # Tasks panel then show it without learning anything new.
    pip = extras.current()
    if pip.running:
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
                "cancellable": False,
                "log": list(pip.log),
            }
        )

    install = searxng_manager._install_state
    if install["running"]:
        stage = install.get("stage") or 1
        tasks.append(
            {
                "kind": "searxng",
                "name": "",
                "label": f"Setting up SearXNG — step {stage} of {install['stages']}",
                "detail": install["step"] or "This takes a few minutes the first time.",
                "progress": install.get("progress"),
                "cancellable": False,
                # The lines the tools themselves printed. Reported directly:
                # "the searxng reinstall doesn't have a progress bar so idk if
                # it has frozen or is working" — a bar answers that only while
                # it moves, and pip building lxml can sit on one number for a
                # while. Its output is the thing that keeps changing.
                "log": list(install.get("log") or []),
            }
        )

    return tasks


@router.get("/tasks")
def list_tasks() -> dict:
    """What is running, and what has recently stopped.

    The history is the half that was missing, and the reason is narrow: a job
    that *fails* used to disappear at the moment it became interesting. A
    re-index that died halfway left exactly the same empty list as one that
    finished, and the only record of why was the log console — a different
    screen that you have to know to look at.
    """
    return {"tasks": collect(), "history": taskhistory.recent()}


@router.post("/tasks/history/clear")
def clear_history() -> dict:
    """Forget the finished-job list.

    It is in-memory and bounded, so this is a tidiness button rather than a
    maintenance one — but a screen you cannot clear is a screen people stop
    reading.
    """
    taskhistory.clear()
    return {"cleared": True}


# --- shutting the app down cleanly -------------------------------------------


@router.post("/shutdown")
def shutdown() -> dict:
    """Stop the server on purpose, from inside the app.

    Asked for: *"a way to cleanly exit the program and quit the backend."*
    Until now the only ways out were Ctrl+C in a terminal window the launcher
    hides, or closing the window and leaving the server running — which is why
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

    def _stop() -> None:
        os.kill(os.getpid(), signal.SIGINT)

    threading.Timer(0.35, _stop).start()
    return {"stopping": True}
