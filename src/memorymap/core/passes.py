"""The scheduled passes, run now or stopped by hand (INBOX 713).

The owner: "for a bunch of the background processes like the night shift and
stuff, is it possible to manually run them as well as manually stop or cancel
them when they are running??". Each pass already ran on its own schedule and
already kept a last-run record (`core/jobruns.py`); what was missing was saying
when it runs, starting one now, and stopping one that is going.

- **Schedule** is said in words beside the last run, in Settings, Background
  tasks, Background jobs (`overview`, merged into `GET /jobs/last-runs`).
- **Run now** queues the pass on the job pool as kind `pass` on the `batch`
  lane, deduped on the pass, so pressing twice is one run (`run_now`). The
  autonomous pass keeps its own runner, `autonomous.trigger_now`, which is
  already deduped, and its own master switch.
- **Stop** ends a pass at its next step: the autonomous pass through its own
  cancel, housekeeping between its steps. A pass that is one call with no
  step between (a backup, the fading-notes scores) says it cannot be stopped
  part way, which is the truth `core/bgtasks.py` tells for the same shape.
"""

from __future__ import annotations

import logging
import threading
from collections.abc import Callable

logger = logging.getLogger("memorymap.passes")

#: The scheduled passes, by their `jobruns` kind, in the overview's order.
PASS_KINDS = ("autonomous", "night-shift", "backup", "resurface", "embeddings-backfill", "maintenance")

#: Passes Stop can end part way, at their next step.
STOPPABLE = frozenset({"autonomous", "maintenance"})

_lock = threading.Lock()
_running: set[str] = set()
_stop: set[str] = set()


def _label(kind: str) -> str:
    from memorymap.core import jobruns

    return jobruns.KINDS.get(kind, kind)


def schedule(kind: str) -> str:
    """When `kind` runs by itself, in words."""
    from memorymap.core import deps

    config = deps.get_config()
    if kind == "autonomous":
        if not config.get_preference("autonomous_tasks_enabled", False):
            return "Switched off: runs only when switched on below."
        try:
            hours = int(config.get_preference("autonomous_tasks_interval_hours") or 6)
        except (TypeError, ValueError):
            hours = 6
        return f"Every {hours} hour{'' if hours == 1 else 's'} while switched on."
    return {
        "night-shift": "With each autonomous pass, when the night shift is on.",
        "backup": "Once a day, at the first start of the day.",
        "resurface": "Once a day, the first time fading notes are shown.",
        "embeddings-backfill": "At each start, once search by meaning is ready.",
        "maintenance": "At each start: the bin's auto-clear and the edit history's tidy.",
    }.get(kind, "")


def overview() -> dict[str, dict]:
    """kind -> what the Background jobs list adds to a pass's last run."""
    return {
        kind: {"schedule": schedule(kind), "can_run": True, "stoppable": kind in STOPPABLE, "running": running(kind)}
        for kind in PASS_KINDS
    }


def running(kind: str) -> bool:
    if kind == "autonomous":
        from memorymap.ai import autonomous

        return autonomous.is_running()
    with _lock:
        return kind in _running


def stop_requested(kind: str) -> bool:
    """For a pass's own loop: has someone pressed Stop?"""
    with _lock:
        return kind in _stop


# -- the runners --------------------------------------------------------------


def _night_shift() -> None:
    from memorymap.api import routes_night
    from memorymap.core import deps

    session = deps.get_db().session()
    try:
        routes_night.run_now(routes_night.RunBody(), session)
    finally:
        session.close()


def _backup() -> None:
    from memorymap.core import backup, deps, jobruns

    config = deps.get_config()
    keep = int(config.get_preference("backup_retention_count", backup.KEEP_BACKUPS))
    with jobruns.job_run("backup") as run:
        path = backup.backup_now(config.db_path, config.data_dir, keep)
        run.result = f"saved {path.name} (Run now)"


def _resurface() -> None:
    from memorymap.ai import resurface
    from memorymap.core import deps, jobruns

    session = deps.get_db().session()
    try:
        with jobruns.job_run("resurface") as run:
            written = resurface.compute_scores(session)
            session.commit()
            run.result = f"scored {written} note{'' if written == 1 else 's'}"
    finally:
        session.close()


def _backfill() -> None:
    from memorymap.ai import embeddings
    from memorymap.core import deps

    embeddings.backfill_missing(deps.get_embeddings(), deps.get_db().session)


def _purge_bin() -> None:
    from memorymap.api import app

    app._purge_expired_bin_entries()


def _compact_history() -> None:
    from memorymap.api import app

    app._compact_event_log()


#: Housekeeping's steps, in order; Stop is honoured between them.
MAINTENANCE_STEPS: tuple[Callable[[], None], ...] = (_purge_bin, _compact_history)


def _maintenance() -> None:
    from memorymap.core import jobruns

    with jobruns.job_run("maintenance") as run:
        done = 0
        for step in MAINTENANCE_STEPS:
            if stop_requested("maintenance"):
                run.cancel(f"stopped after {done} of {len(MAINTENANCE_STEPS)} steps")
                return
            step()
            done += 1
        run.result = "bin cleared of expired notes, edit history tidied"


#: kind -> the function a Run now queues. A dict so a test can stand in.
RUNNERS: dict[str, Callable[[], object]] = {
    "night-shift": _night_shift,
    "backup": _backup,
    "resurface": _resurface,
    "embeddings-backfill": _backfill,
    "maintenance": _maintenance,
}


def _run(kind: str) -> None:
    """The pool job: the pass, with its running mark around it."""
    try:
        RUNNERS[kind]()
    finally:
        with _lock:
            _running.discard(kind)
            _stop.discard(kind)


def run_now(kind: str) -> tuple[bool, str]:
    """Start `kind` now. Returns (started, message); never raises."""
    from memorymap.core import deps
    from memorymap.core import jobs as pool

    if kind not in PASS_KINDS:
        return False, "No such pass."
    if kind == "autonomous":
        from memorymap.ai import autonomous

        # The master switch stays the gate (`routes_tasks.trigger_autonomous`
        # says why): Run now never runs a pass someone switched off.
        if not deps.get_config().get_preference("autonomous_tasks_enabled", False):
            return False, "Autonomous background AI is switched off, so it has nothing to run."
        started = autonomous.trigger_now()
        return started, "Started." if started else "It is already running."
    with _lock:
        if kind in _running:
            return False, f"{_label(kind)} is already running."
        _running.add(kind)
        _stop.discard(kind)
    if not pool.enqueue("pass", _run, kind, name=_label(kind), dedupe_key=("pass", kind)):
        with _lock:
            _running.discard(kind)
        return False, "MemoryMap is shutting down, so nothing was started."
    return True, f"{_label(kind)} started."


def stop(kind: str) -> tuple[bool, str]:
    """Stop `kind` at its next step. Returns (acted, message)."""
    if kind == "autonomous":
        from memorymap.core import bgtasks

        return bgtasks.cancel("autonomous", "")
    if not running(kind):
        return False, "It had already finished."
    if kind not in STOPPABLE:
        return False, "This pass is one step with nothing to stop between; it finishes in a moment."
    with _lock:
        _stop.add(kind)
    return True, "Stopping at its next step."


def kind_for_label(label: str) -> str:
    """The pass a `/tasks` row names (its name is the pass's label)."""
    return next((kind for kind in PASS_KINDS if _label(kind) == label), "")


def reset_for_tests() -> None:
    with _lock:
        _running.clear()
        _stop.clear()
