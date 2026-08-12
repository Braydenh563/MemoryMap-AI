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
- **`VACUUM` must not run through a Session.** SQLite refuses to vacuum inside
  a transaction. `session.execute(text("VACUUM"))` — how this was written —
  happens to work *only* while it is the first statement in a fresh session,
  because pysqlite defers its BEGIN until the first DML; add any read or write
  before it and the same line raises `cannot VACUUM from within a
  transaction`. That is a landmine, not a working call: it survives on the
  ordering of the lines around it. An autocommit connection is correct
  whatever else the session has done.
- **A manual trigger needs a guard.** `trigger_now()` used to spawn a thread
  unconditionally, so holding down the button in Settings started as many
  concurrent agent runs as you had patience for, all writing to the same
  notebook.
- **The loop has to be woken, not just started.** It used to sleep for the
  whole interval (default 6 hours) between preference reads, so turning
  Battery Efficient Mode off, switching the toggle back on, or shortening the
  interval did nothing until whatever sleep was already in progress ran out —
  reported as "background tasks skip things thinking battery mode is on [after
  it was turned off]" and "finishing a task disables automatic tasks, forcing
  a re-toggle": neither was true, the loop just hadn't looked again yet.
  `wake()` interrupts the current sleep so a preference change the user just
  made is read on the next tick, not the next scheduled one.
"""

from __future__ import annotations

import logging
import threading
from datetime import datetime, timezone

from sqlalchemy import select, text

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
#: Interrupts the interval sleep without stopping the loop — set by `wake()`
#: whenever a preference the loop cares about changes, and by `stop()` itself
#: so shutdown does not wait out the sleep too.
_wake_event: threading.Event | None = None
_loop_thread: threading.Thread | None = None
#: Set while an optimisation pass is actually executing, by whichever path
#: started it. `routes_tasks` reads this to show the job in the task list, and
#: `trigger_now` reads it to refuse a second concurrent run.
_working = threading.Event()

#: What the last pass actually did, so the user can read it back and undo any
#: of it (ROADMAP §40, item 2).
#:
#: This is the answer to "you are asking me to let an agent edit my notebook
#: while I am not looking". A true dry-run — run the agent, apply nothing —
#: does not work here: the model decides its next call from the *result* of the
#: last one, so a pass with every write stubbed out stops resembling the pass
#: that would really happen, and a preview that lies is worse than none.
#:
#: Review-after is honest and is nearly as useful, because every write tool
#: already captures the call that would put the note back (`tools._undo_edit`).
#: Keeping those here turns the pass from something that happened to the
#: notebook into something the user can read, disagree with, and reverse — one
#: item at a time, through the same endpoint the chat's own Undo buttons use.
_last_pass: dict = {"finished_at": None, "outcome": None, "changes": []}

#: A pass that made more changes than this had something go wrong with it, and
#: a review list nobody can read is not a review.
MAX_RECORDED_CHANGES = 200


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

        # ROADMAP.md item 34, run separately from the agent pass below —
        # a plain per-note completion call (like suggest_tags), not a tool-
        # calling agent turn, and gated by its own preference so it isn't
        # silently skipped whenever tag/link/dedupe are all switched off.
        if config.get_preference("auto_entities_enabled", False):
            try:
                from memorymap.ai.entities import extract_entities_pass

                db = deps.get_db()
                with db.session() as session:
                    processed = extract_entities_pass(
                        session, deps.get_model_manager(), deps.get_ollama()
                    )
                if processed:
                    logger.info("entity extraction: scanned %d note(s)", processed)
            except Exception as exc:  # noqa: BLE001 — top of a worker thread
                logger.error("entity extraction failed: %s", exc, exc_info=True)

        if config.get_preference("auto_link_enabled", True):
            try:
                from memorymap.ai.links import audit_vague_links
                db = deps.get_db()
                with db.session() as session:
                    updated = audit_vague_links(
                        session, deps.get_model_manager(), deps.get_ollama()
                    )
                if updated:
                    logger.info("link reason audit: updated %d link(s)", updated)
            except Exception as exc:
                logger.error("link reason audit failed: %s", exc, exc_info=True)


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
        else:
            persona += (
                " When you link two notes, pass a reason if the connection "
                "isn't obvious from the titles alone (e.g. 'both about "
                "scheduling') — it's shown on the graph and explains the "
                "link to the person who wrote the notes."
            )

        outcome, detail = "completed", "Finished analysing and linking notes."
        changes: list[dict] = []
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
                    # The agent hangs a `change` off every successful write,
                    # carrying the call that would put the note back. Collected
                    # here so the pass can be read and reversed afterwards —
                    # see `_last_pass`.
                    change = event.get("change")
                    if change and len(changes) < MAX_RECORDED_CHANGES:
                        changes.append(change)
            except Exception as exc:  # noqa: BLE001 — top of a worker thread
                logger.error("autonomous execution failed: %s", exc, exc_info=True)
                # Recording "completed" here regardless of what happened is
                # what the first version did, and it made the task history
                # actively misleading: every failure showed up as a success.
                outcome, detail = "failed", str(exc)

        from memorymap.core import taskhistory

        if changes:
            detail = f"{detail} Changed {len(changes)} thing(s)."
        _remember_pass(outcome, changes)
        taskhistory.record(
            "autonomous", "Autonomous knowledge base optimisation", outcome, detail
        )
        logger.info("autonomous optimisation %s, %d change(s)", outcome, len(changes))
    finally:
        _working.clear()


def _remember_pass(outcome: str, changes: list[dict]) -> None:
    """Record what the pass did, replacing the previous record.

    One pass deep on purpose. The point of this list is "read what just
    happened while it is still surprising you"; a scrolling history of every
    pass is what `taskhistory` and the audit log are for, and keeping undo
    payloads around for weeks invites someone to reverse an edit they have
    since deliberately redone.
    """
    with _lock:
        _last_pass["finished_at"] = datetime.now(timezone.utc).isoformat()
        _last_pass["outcome"] = outcome
        _last_pass["changes"] = list(changes)


def last_pass() -> dict:
    """What the last pass did, for the review panel in Settings."""
    with _lock:
        return {
            "finished_at": _last_pass["finished_at"],
            "outcome": _last_pass["outcome"],
            "changes": list(_last_pass["changes"]),
        }


def forget_last_pass() -> None:
    """Clear the review list, once the user has read it."""
    with _lock:
        _last_pass.update({"finished_at": None, "outcome": None, "changes": []})


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

    embeddings.clean_orphaned_vectors(deps.get_db().session)
    clean_orphaned_board_cards()


def clean_orphaned_board_cards() -> int:
    """Remove whiteboard cards whose note is gone.

    The same gap `clean_orphaned_vectors` closes, one table over: a card holds
    an `entry_id` with no cascade behind it, so purging a note from the recycle
    bin leaves the card on the board pointing at nothing. That is worse than a
    stale vector, because a vector nobody can see just wastes a comparison — a
    dead card is visible, is not removable through the UI (the thing you would
    click is the card that fails to render), and makes the board look broken.

    Sketches are deliberately left alone: a sketch has a `board_id` but no
    `entry_id`, so it belongs to the board rather than to any one note.
    """
    from memorymap.core.database import Entry, WhiteboardNode

    with deps.get_db().session() as session:
        orphans = list(
            session.scalars(
                select(WhiteboardNode).where(
                    WhiteboardNode.entry_id.notin_(select(Entry.id))
                )
            )
        )
        for card in orphans:
            session.delete(card)
        if orphans:
            session.commit()

    if orphans:
        logger.info("removed %d whiteboard card(s) whose note no longer exists", len(orphans))
    return len(orphans)


def _loop(stop_event: threading.Event, wake_event: threading.Event) -> None:
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
        # Waited on `wake_event`, not `stop_event`: the old version blocked on
        # `stop_event.wait()` directly, so a preference changed mid-sleep (the
        # toggle, battery mode, the interval itself) was invisible until the
        # *whole* sleep ran out — up to six hours by default. `wake()` sets
        # this event to cut the sleep short without touching `stop_event`,
        # so the loop re-reads preferences on the next line without exiting.
        # `Event.wait` rather than a loop of one-second sleeps: the old version
        # woke 21,600 times to check a flag it could have been woken for, and
        # stopping the app meant waiting out the last of those seconds.
        wake_event.clear()
        wake_event.wait(max(1, hours) * 3600)


def start() -> None:
    """Start the interval loop. Idempotent — a second call is a no-op."""
    global _stop_event, _wake_event, _loop_thread
    with _lock:
        if _loop_thread is not None and _loop_thread.is_alive():
            return
        _stop_event = threading.Event()
        _wake_event = threading.Event()
        _loop_thread = threading.Thread(
            target=_loop, args=(_stop_event, _wake_event), daemon=True, name="autonomous-agent"
        )
        _loop_thread.start()


def stop() -> None:
    """Ask the loop to finish. Used at shutdown and by the tests."""
    global _stop_event, _wake_event, _loop_thread
    with _lock:
        event, wake, thread = _stop_event, _wake_event, _loop_thread
        _stop_event = _wake_event = _loop_thread = None
    if event is not None:
        event.set()
    # The loop blocks on `wake_event`, not `stop_event` — without this it
    # would not notice `stop_event` was set until its current sleep expired.
    if wake is not None:
        wake.set()
    if thread is not None and thread.is_alive():
        thread.join(timeout=_JOIN_TIMEOUT)


def wake() -> None:
    """Cut the current interval sleep short so a preference change the user
    just made (enabling autonomous tasks, turning battery mode off, a shorter
    interval) is read on the next tick instead of the next scheduled one.
    A no-op if the scheduler isn't running — `start()` always creates a fresh
    `_wake_event`, so nothing is lost by calling this before the first start.
    """
    event = _wake_event
    if event is not None:
        event.set()


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
