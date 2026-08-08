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


# --- the review panel: what the last pass changed (§40 item 2) -------------------


def test_a_pass_records_what_it_changed_so_it_can_be_undone(app_state, monkeypatch):
    """The honest answer to "let an agent edit my notebook unattended".

    A true dry-run is not available — the model picks each call from the result
    of the last one, so a pass with the writes stubbed out stops resembling the
    pass that would really run. What is available is the change list, which
    every write already produces with the call that reverses it.
    """
    change = {
        "tool": "tag_note",
        "label": "🏷 Retagged note #4",
        "note_id": 4,
        "undo": {"tool": "edit_note", "arguments": {"note_id": 4, "tags": []}},
    }
    monkeypatch.setattr(
        autonomous.agent,
        "run_agent",
        lambda **kwargs: iter([{"type": "tool", "ok": True, "change": change}]),
    )
    autonomous._working.set()
    autonomous._run_optimization()

    recorded = autonomous.last_pass()
    assert recorded["outcome"] == "completed"
    assert recorded["finished_at"]
    assert recorded["changes"] == [change]
    # Every recorded change carries the call that puts the note back — that is
    # the whole point of keeping them.
    assert recorded["changes"][0]["undo"]["tool"] == "edit_note"


def test_the_review_list_only_keeps_the_most_recent_pass(app_state, monkeypatch):
    """One pass deep on purpose: this list is "read what just happened while it
    is still surprising you", not an archive. Undo payloads kept for weeks
    invite reversing an edit that has since been deliberately redone."""

    def pass_with(label):
        monkeypatch.setattr(
            autonomous.agent,
            "run_agent",
            lambda **kw: iter([{"type": "tool", "ok": True, "change": {"label": label}}]),
        )
        autonomous._working.set()
        autonomous._run_optimization()

    pass_with("first")
    pass_with("second")
    assert [c["label"] for c in autonomous.last_pass()["changes"]] == ["second"]


def test_the_review_list_is_bounded(app_state, monkeypatch):
    many = [
        {"type": "tool", "ok": True, "change": {"label": f"change {i}"}}
        for i in range(autonomous.MAX_RECORDED_CHANGES + 50)
    ]
    monkeypatch.setattr(autonomous.agent, "run_agent", lambda **kw: iter(many))
    autonomous._working.set()
    autonomous._run_optimization()
    assert len(autonomous.last_pass()["changes"]) == autonomous.MAX_RECORDED_CHANGES


def test_the_review_list_can_be_dismissed(client, app_state, monkeypatch):
    monkeypatch.setattr(
        autonomous.agent,
        "run_agent",
        lambda **kw: iter([{"type": "tool", "ok": True, "change": {"label": "x"}}]),
    )
    autonomous._working.set()
    autonomous._run_optimization()

    assert client.get("/tasks/autonomous/last").json()["changes"]
    assert client.post("/tasks/autonomous/last/clear").status_code == 200
    assert client.get("/tasks/autonomous/last").json()["changes"] == []


def test_a_failed_pass_still_lists_what_it_managed_to_change(app_state, monkeypatch):
    """The changes are the part that matters most when a run went wrong."""

    def half_a_pass(**kwargs):
        yield {"type": "tool", "ok": True, "change": {"label": "tagged something"}}
        raise RuntimeError("the model fell over")

    monkeypatch.setattr(autonomous.agent, "run_agent", half_a_pass)
    autonomous._working.set()
    autonomous._run_optimization()

    recorded = autonomous.last_pass()
    assert recorded["outcome"] == "failed"
    assert [c["label"] for c in recorded["changes"]] == ["tagged something"]


def test_editing_a_note_never_stops_an_unattended_pass(app_state):
    """`edit_note` was briefly `destructive=True`, which parks the turn for a
    confirmation — and this pass abandons itself on any `confirm`, because
    there is nobody to ask. So the first note it tried to edit killed the run.
    """
    from memorymap.ai import tools

    assert tools.TOOLS["edit_note"].destructive is False
    assert tools.TOOLS["delete_note"].destructive is True
