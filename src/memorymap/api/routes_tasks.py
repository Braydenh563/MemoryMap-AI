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

Only *running* work is listed. A finished job is not a task, and a screen that
accumulates them is a log — which the app already has.
"""

from __future__ import annotations

from fastapi import APIRouter

from memorymap.ai import embeddings as embeddings_module
from memorymap.ai import model_manager as jobs
from memorymap.core import deps

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
            }
        )

    # Minutes long, on a worker thread, and previously visible only on the Web
    # search screen — so "is it still doing anything?" had no answer anywhere
    # else. Imported here rather than at module level: it pulls in the search
    # stack, and this endpoint is polled.
    from memorymap.search import searxng_manager

    if searxng_manager._install_state["running"]:
        tasks.append(
            {
                "kind": "searxng",
                "name": "",
                "label": "Setting up SearXNG",
                "detail": searxng_manager._install_state["step"]
                or "This takes a few minutes the first time.",
                "progress": None,
                "cancellable": False,
            }
        )

    return tasks


@router.get("/tasks")
def list_tasks() -> dict:
    """Everything running in the background right now."""
    return {"tasks": collect()}
