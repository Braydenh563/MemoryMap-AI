"""The background librarian: a scheduled agent pass over the whole notebook.

Off unless `autonomous_tasks_enabled` is set, because it runs the agent with
nobody watching — the one place in this app where the model writes to notes
without a person having just asked it to. Everything here is shaped by that:
the destructive tools are barred rather than confirmed (there is no one to
confirm to), a run that asks for confirmation is abandoned rather than
answered, and the whole thing is skipped on battery power.

Three things this module learned the hard way, all worth keeping written down:

- **It has to actually be started.** The first version was never wired to
  anything: `app.py` imported it and called nothing, so the interval setting
  in Settings pointed at a loop that did not exist and the feature silently
  did nothing at all. `start()` is called from the app's lifespan now.
- **`VACUUM` cannot run inside a transaction.** SQLite refuses, and SQLAlchemy
  opens one for you, so `session.execute(text("VACUUM"))` fails every single
  time — the maintenance half of this module had never once succeeded. It
  needs a connection with autocommit isolation.
- **A manual trigger needs a guard.** `trigger_now()` used to spawn a thread
  unconditionally, so holding down the button in Settings started as many
  concurrent agent runs as you had patience for, all writing to the same
  notebook.
"""

from __future__ import annotations

import logging
import threading

from sqlalchemy import text

from memorymap.ai import agent
from memorymap.core import deps

logger = logging.getLogger("memorymap.autonomous")

#: How long a run may take before the loop stops waiting on it at shutdown.
_JOIN_TIMEOUT = 5.0

#: The agent gets a bounded number of rounds — this is a tidy-up, not an
#: open-ended session, and an unbounded one on a big notebook is a way to
#: spend a night's CPU.
MAX_ROUNDS = 15

_lock = threading.Lock()
_stop_event: threading.Event | None = None
_loop_thread: threading.Thread | None = None
#: Set while an optimisation pass is actually executing, by whichever path
#: started it. `routes_tasks` reads this to show the job in the task list, and
#: `trigger_now` reads it to refuse a second concurrent run.
_working = threading.Event()


def is_running() -> bool:
    """Is an optimisation pass executing right now?

    Deliberately not "is the scheduler alive" — the task list is showing the
    user work in progress, and an idle scheduler sleeping until 3am is not
    work in progress.
    """
    return _working.is_set()


def scheduler_alive() -> bool:
    """Is the interval loop running? (For diagnostics, not the task list.)"""
    with _lock:
        return _loop_thread is not None and _loop_thread.is_alive()


def _enabled_tasks(config) -> list[str]:  # noqa: ANN001 — config is duck-typed
    tasks = []
    if config.get_preference("auto_tag_enabled", True):
        tasks.append("tag untagged notes")
    if config.get_preference("auto_link_enabled", True):
        tasks.append("create missing links between conceptually related notes")
    if config.get_preference("auto_dedupe_enabled", True):
        tasks.append("identify and flag duplicates")
    return tasks


def _run_optimization() -> None:
    """One pass. Never raises — it is the top of a worker thread."""
    if not _working.is_set():
        # Belt and braces: both entry points set this before starting the
        # thread, so reaching here without it means a new caller forgot.
        _working.set()
    try:
        config = deps.get_config()
        if config.get_preference("battery_efficient_mode"):
            logger.info("skipped: battery efficient mode is on")
            return

        tasks = _enabled_tasks(config)
        if not tasks:
            logger.info("skipped: every autonomous task is switched off in Settings")
            return

        task_str = ", ".join(tasks)
        persona = (
            "You are an autonomous background process optimizing the user's "
            "knowledge base. You are running without user interaction. "
            f"Your task is to {task_str} using your tools. Do not ask questions "
            "or expect user replies. When you are finished making improvements, "
            "stop your turn."
        )
        if not config.get_preference("auto_tag_enabled", True):
            persona += " Do NOT change or add tags."
        if not config.get_preference("auto_link_enabled", True):
            persona += " Do NOT link notes."

        outcome, detail = "completed", "Finished analysing and linking notes."
        db = deps.get_db()
        with db.session() as session:
            try:
                events = agent.run_agent(
                    session=session,
                    question=(
                        f"Analyze recent or isolated notes and {task_str}. Use "
                        "find_similar_notes to traverse the graph conceptually. "
                        "Stop when done."
                    ),
                    notes=[],
                    model_manager=deps.get_model_manager(),
                    ollama=deps.get_ollama(),
                    persona_prompt=persona,
                    # Nothing here can be confirmed and nothing here should be
                    # deleted: there is no user in the loop to ask.
                    blocked_tools=frozenset({"ask_user", "delete_note"}),
                    max_rounds=MAX_ROUNDS,
                    mode="autonomous",
                    use_utility_model=True,
                )
                for event in events:
                    if event.get("type") == "confirm":
                        logger.info(
                            "paused for confirmation on %s with nobody to ask — abandoning run",
                            event.get("name"),
                        )
                        outcome, detail = (
                            "failed",
                            f"Stopped: {event.get('name')} needs confirmation.",
                        )
                        break
                    if event.get("type") == "tool" and not event.get("ok"):
                        logger.warning("tool error: %s", event.get("error"))
            except Exception as exc:  # noqa: BLE001 — top of a worker thread
                logger.error("autonomous execution failed: %s", exc, exc_info=True)
                # Recording "completed" here regardless of what happened is
                # what the first version did, and it made the task history
                # actively misleading: every failure showed up as a success.
                outcome, detail = "failed", str(exc)

        from memorymap.core import taskhistory

        taskhistory.record(
            "autonomous", "Autonomous knowledge base optimisation", outcome, detail
        )
        logger.info("autonomous optimisation %s", outcome)
    finally:
        _working.clear()


def _vacuum() -> None:
    """Compact the database and drop vectors whose note is gone.

    `VACUUM` needs to be outside a transaction, which a `Session` will not give
    you — hence the raw connection with autocommit isolation. Written as its
    own function so the reason survives the next person who "simplifies" it
    back into `session.execute`.
    """
    engine = deps.get_db().engine
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as connection:
        connection.execute(text("VACUUM"))
    logger.info("database VACUUM complete")

    from memorymap.ai import embeddings

    embeddings.clean_orphaned_vectors()


def _loop(stop_event: threading.Event) -> None:
    while not stop_event.is_set():
        config = deps.get_config()
        if config.get_preference("autonomous_tasks_enabled", False):
            _working.set()
            try:
                _run_optimization()
            except Exception:  # noqa: BLE001 — the loop outlives one bad pass
                logger.error("autonomous loop error", exc_info=True)
                _working.clear()
            try:
                _vacuum()
            except Exception:  # noqa: BLE001
                logger.error("database maintenance error", exc_info=True)

        try:
            hours = int(config.get_preference("autonomous_tasks_interval_hours") or 6)
        except (TypeError, ValueError):
            hours = 6
        # `Event.wait` rather than a loop of one-second sleeps: the old version
        # woke 21,600 times to check a flag it could have been woken for, and
        # stopping the app meant waiting out the last of those seconds.
        stop_event.wait(max(1, hours) * 3600)


def start() -> None:
    """Start the interval loop. Idempotent — a second call is a no-op."""
    global _stop_event, _loop_thread
    with _lock:
        if _loop_thread is not None and _loop_thread.is_alive():
            return
        _stop_event = threading.Event()
        _loop_thread = threading.Thread(
            target=_loop, args=(_stop_event,), daemon=True, name="autonomous-agent"
        )
        _loop_thread.start()


def stop() -> None:
    """Ask the loop to finish. Used at shutdown and by the tests."""
    global _stop_event, _loop_thread
    with _lock:
        event, thread = _stop_event, _loop_thread
        _stop_event = _loop_thread = None
    if event is not None:
        event.set()
    if thread is not None and thread.is_alive():
        thread.join(timeout=_JOIN_TIMEOUT)


def trigger_now() -> bool:
    """Run a pass right now, off-schedule. False if one is already running."""
    if _working.is_set():
        return False
    # Set before the thread starts, not inside it: two clicks in the same
    # millisecond would both see a clear flag and both start a run otherwise.
    _working.set()
    threading.Thread(
        target=_run_optimization, daemon=True, name="autonomous-manual"
    ).start()
    return True
