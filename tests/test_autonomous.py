"""The background librarian (§39): the scheduled agent pass over the notebook.

This module shipped without tests and without a caller — `app.py` imported it
and started nothing, so the interval, the on/off switch and the three task
toggles in Settings were all wired to a loop that never ran. These tests exist
so that cannot happen quietly again: the first one fails if the scheduler stops
being started, rather than waiting for a user to notice their notebook is never
tidied.
"""

from __future__ import annotations

import threading

import pytest
from sqlalchemy import text

from memorymap.ai import autonomous
from memorymap.core import taskhistory


@pytest.fixture(autouse=True)
def _no_stray_threads():
    """Never leave a scheduler running into the next test."""
    yield
    autonomous.stop()
    autonomous._working.clear()


def test_creating_the_app_starts_the_scheduler(app_state, monkeypatch):
    """The bug this whole module had: nothing called `start()`.

    Asserted against `create_app` rather than against `start()` directly,
    because `start()` always worked — it was the call site that did not exist.
    """
    started: list[bool] = []
    monkeypatch.setattr(autonomous, "start", lambda: started.append(True))

    from memorymap.api.app import create_app

    create_app()
    assert started == [True]


def test_the_scheduler_only_starts_once(app_state):
    autonomous.start()
    first = autonomous._loop_thread
    autonomous.start()
    assert autonomous._loop_thread is first
    assert autonomous.scheduler_alive()


def test_stopping_the_scheduler_actually_stops_it(app_state):
    autonomous.start()
    autonomous.stop()
    assert not autonomous.scheduler_alive()


def test_a_second_run_is_refused_while_one_is_going(app_state, monkeypatch):
    """`trigger_now` span up a thread unconditionally, so holding down "Run
    now" in Settings started as many concurrent agent loops as you had
    patience for — every one of them writing to the same notebook."""
    running = threading.Event()
    release = threading.Event()

    def slow_pass():
        running.set()
        release.wait(timeout=5)
        autonomous._working.clear()

    monkeypatch.setattr(autonomous, "_run_optimization", slow_pass)

    assert autonomous.trigger_now() is True
    assert running.wait(timeout=5)
    assert autonomous.is_running()
    # The second press, while the first is still going.
    assert autonomous.trigger_now() is False
    release.set()


def test_the_endpoint_reports_a_refused_start_rather_than_pretending(
    client, monkeypatch
):
    monkeypatch.setattr(autonomous, "trigger_now", lambda: False)
    body = client.post("/tasks/trigger-autonomous").json()
    assert body["started"] is False
    assert body["detail"]


def test_vacuum_survives_a_session_that_has_already_written(app_state, session):
    """The maintenance pass must not depend on statement ordering.

    SQLite refuses to VACUUM inside a transaction. Running it through a
    Session — how this was written — works *by luck*: pysqlite defers its
    BEGIN until the first DML, so a VACUUM that happens to be the first
    statement slips through. The failure below is what the same line does once
    anything has touched the database first, which is the state the background
    pass actually leaves behind after tagging and linking notes.
    """
    from memorymap.core.database import Entry

    session.add(Entry(content="something to make a transaction"))
    session.flush()
    with pytest.raises(Exception) as raised:  # noqa: PT011 — driver-specific
        session.execute(text("VACUUM"))
    assert "vacuum" in str(raised.value).lower()
    session.rollback()

    # The real thing takes its own autocommit connection, so it does not care.
    autonomous._vacuum()


def test_battery_mode_skips_the_pass_without_touching_the_model(
    app_state, monkeypatch
):
    app_state.set_preference("battery_efficient_mode", True)
    monkeypatch.setattr(
        autonomous.agent,
        "run_agent",
        lambda **kwargs: pytest.fail("the agent ran on battery power"),
    )
    autonomous._working.set()
    autonomous._run_optimization()
    assert not autonomous.is_running()


def test_every_task_switched_off_means_no_run(app_state, monkeypatch):
    for key in ("auto_tag_enabled", "auto_link_enabled", "auto_dedupe_enabled"):
        app_state.set_preference(key, False)
    monkeypatch.setattr(
        autonomous.agent,
        "run_agent",
        lambda **kwargs: pytest.fail("the agent ran with nothing to do"),
    )
    autonomous._working.set()
    autonomous._run_optimization()


def test_a_failed_pass_is_recorded_as_failed(app_state, monkeypatch):
    """The `finally` block recorded "completed" whatever happened, so every
    failure showed up in the task history as a success."""

    def explode(**kwargs):
        raise RuntimeError("the model fell over")

    monkeypatch.setattr(autonomous.agent, "run_agent", explode)
    autonomous._working.set()
    autonomous._run_optimization()

    entries = [e for e in taskhistory.recent() if e["kind"] == "autonomous"]
    assert entries and entries[0]["outcome"] == "failed"
    assert "fell over" in entries[0]["detail"]


def test_a_pass_that_needs_confirmation_is_abandoned_not_hung(
    app_state, monkeypatch
):
    """Nobody is watching, so there is nobody to confirm to."""
    monkeypatch.setattr(
        autonomous.agent,
        "run_agent",
        lambda **kwargs: iter(
            [{"type": "confirm", "name": "delete_note"}, {"type": "tool", "ok": True}]
        ),
    )
    autonomous._working.set()
    autonomous._run_optimization()

    entries = [e for e in taskhistory.recent() if e["kind"] == "autonomous"]
    assert entries and entries[0]["outcome"] == "failed"
    assert "delete_note" in entries[0]["detail"]


def test_the_pass_uses_the_utility_model_and_bars_the_dangerous_tools(
    app_state, monkeypatch
):
    seen: dict = {}

    def capture(**kwargs):
        seen.update(kwargs)
        return iter([])

    monkeypatch.setattr(autonomous.agent, "run_agent", capture)
    autonomous._working.set()
    autonomous._run_optimization()

    assert seen["use_utility_model"] is True
    assert seen["mode"] == "autonomous"
    assert {"ask_user", "delete_note"} <= set(seen["blocked_tools"])
