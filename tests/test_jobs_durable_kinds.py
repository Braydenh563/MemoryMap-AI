"""Brief 9 (WORLD_CLASS_PLAN B2, the rest): the other kinds onto the durable pool.

A re-index, a model download, a scheduled pass started by hand (a backup, the
embedding backfill, the scores, housekeeping) and an autonomous pass are now
pool jobs whose rows a launch after a kill runs again. Each is remembered only
when it would find the same thing again by name: the app's own notebook,
embedder and model client. A test's stand-in still runs, unremembered.
"""

from __future__ import annotations

import threading
import time

import pytest

from tessellate.ai import autonomous, model_manager
from tessellate.core import deps, jobs, jobstore, passes


def _spy(monkeypatch):
    seen: list[tuple] = []

    def enqueue(kind, func, *args, **kwargs):
        seen.append((kind, func, args, kwargs))
        return len(seen)

    monkeypatch.setattr(jobs, "enqueue", enqueue)
    return seen


@pytest.mark.parametrize("kind", ["reindex", "pull", "pass", "autonomous"])
def test_the_new_kinds_have_named_handlers_and_lanes(kind):
    func = jobstore.resolve(kind)
    assert jobstore.durable_kind(kind, func)
    assert kind in jobs.KIND_LANES and jobs.KIND_LANES[kind] in jobs.LANE_WIDTHS


def test_a_download_waits_behind_nothing_a_note_needs():
    assert jobs.KIND_LANES["pull"] == "download" != jobs.KIND_LANES["caption"]
    assert jobs.KIND_LANES["autonomous"] == "agent" != jobs.KIND_LANES["reindex"]
    assert jobs.LANE_WIDTHS["agent"] == 1
    # Their rows are their own (pull statuses, the autonomous row): the pool
    # adds no second one.
    assert {"pull", "autonomous"} <= jobs.QUIET_KINDS
    assert {"pull", "autonomous"} <= jobs.OWN_RUN_KINDS


def test_the_apps_own_reindex_is_durable_and_a_stand_in_is_not(app_state, monkeypatch):
    from tests.fakes import FakeEmbeddingService

    seen = _spy(monkeypatch)
    real = FakeEmbeddingService(available=True)
    deps.override_ai(embeddings=real)
    assert model_manager.start_reindex(deps.get_db(), real)
    kind, func, args, _ = seen[-1]
    assert kind == "reindex" and args == () and jobstore.durable_kind(kind, func)

    model_manager.reset_jobs()
    assert model_manager.start_reindex(deps.get_db(), FakeEmbeddingService(available=True))
    kind, func, _, _ = seen[-1]
    assert kind == "reindex" and not jobstore.durable_kind(kind, func)


def test_the_durable_reindex_runs_against_the_apps_state(app_state, monkeypatch):
    calls = []
    monkeypatch.setattr(model_manager, "_run_reindex", lambda db, emb, job: calls.append((db, emb, job.kind)))
    model_manager.reindex_notebook()
    assert calls == [(deps.get_db(), deps.get_embeddings(), "reindex")]
    assert model_manager.reindex_status()["kind"] == "reindex"


def test_a_pull_is_a_pool_job_durable_for_the_apps_client(app_state, monkeypatch):
    from tests.fakes import FakeOllama

    seen = _spy(monkeypatch)
    client = FakeOllama(running=True)
    deps.override_ai(ollama=client)
    assert model_manager.start_pull(deps.get_ollama(), "tiny:1b")
    kind, func, args, kwargs = seen[-1]
    assert (kind, args, kwargs["dedupe_key"]) == ("pull", ("tiny:1b",), ("pull", "tiny:1b"))
    assert jobstore.durable_kind(kind, func)
    # Already downloading: refused, as before.
    assert not model_manager.start_pull(deps.get_ollama(), "tiny:1b")

    other = FakeOllama(running=True)
    assert model_manager.start_pull(other, "other:1b")
    kind, func, args, _ = seen[-1]
    assert kind == "pull" and not jobstore.durable_kind(kind, func) and args[0] is other


def test_a_pull_refused_by_a_closing_pool_says_so(app_state, monkeypatch):
    monkeypatch.setattr(jobs, "enqueue", lambda *a, **k: 0)
    assert not model_manager.start_pull(object(), "late:1b")
    assert model_manager.pull_statuses()["late:1b"]["status"] == "error"


def test_the_durable_pull_finds_its_row_for_the_panel(app_state, monkeypatch):
    ran = []
    monkeypatch.setattr(model_manager, "_run_pull", lambda client, name, job: ran.append((client, name, job.name)))
    model_manager.pull_model("tiny:1b")
    assert ran == [(deps.get_ollama(), "tiny:1b", "tiny:1b")]
    assert "tiny:1b" in model_manager.pull_statuses()


def test_run_now_queues_the_named_pass_runner(app_state, monkeypatch):
    seen = _spy(monkeypatch)
    started, _ = passes.run_now("backup")
    assert started
    kind, func, args, kwargs = seen[-1]
    assert (kind, args, kwargs["dedupe_key"]) == ("pass", ("backup",), ("pass", "backup"))
    assert jobstore.durable_kind(kind, func)


def test_a_resumed_pass_runs_and_clears_its_mark(app_state, monkeypatch):
    ran = []
    monkeypatch.setitem(passes.RUNNERS, "backup", lambda: ran.append(passes.running("backup")))
    passes.run_pass("backup")
    assert ran == [True] and not passes.running("backup")
    with pytest.raises(LookupError):
        passes.run_pass("a pass from an older version")


def test_run_now_and_the_scheduler_queue_an_autonomous_pass(app_state, monkeypatch):
    seen = _spy(monkeypatch)
    autonomous._working.clear()
    try:
        assert autonomous.trigger_now()
        kind, func, args, kwargs = seen[-1]
        assert (kind, args, kwargs["dedupe_key"]) == ("autonomous", (False,), "autonomous")
        assert jobstore.durable_kind(kind, func)
        assert not autonomous.trigger_now(), "a second press while the first is queued is refused"
    finally:
        autonomous._working.clear()


def test_a_resumed_autonomous_pass_rereads_the_master_switch(app_state, monkeypatch):
    ran = threading.Event()
    monkeypatch.setattr(autonomous, "_run_optimization", lambda: (ran.set(), autonomous._working.clear()))
    monkeypatch.setattr(autonomous, "_vacuum", lambda: None)
    autonomous._working.clear()
    app_state.set_preference("autonomous_tasks_enabled", False)
    autonomous.run_pass(True)
    assert not ran.is_set(), "a pass switched off since the kill must not run"
    app_state.set_preference("autonomous_tasks_enabled", True)
    autonomous.run_pass(True)
    assert ran.is_set() and not autonomous._working.is_set()


def test_the_scheduler_runs_its_pass_on_the_pool(app_state, monkeypatch):
    """End to end through the real pool: the loop queues, a worker runs."""
    app_state.set_preference("autonomous_tasks_enabled", True)
    ran = threading.Event()
    where = []

    def fake_pass():
        where.append(threading.current_thread().name)
        ran.set()
        autonomous._working.clear()

    monkeypatch.setattr(autonomous, "_run_optimization", fake_pass)
    monkeypatch.setattr(autonomous, "_vacuum", lambda: None)
    autonomous._working.clear()
    #: A fresh pool: one process runs hundreds of apps here, and a pass an
    #: earlier test's app queued may still hold the lane.
    jobs.shutdown(deadline=0.5)
    autonomous.start()
    try:
        assert ran.wait(timeout=10)
    finally:
        autonomous.stop()
        deadline = time.monotonic() + 5
        while autonomous._working.is_set() and time.monotonic() < deadline:
            time.sleep(0.02)
        jobs.shutdown(deadline=2.0)
    assert where and where[0] != "autonomous-agent"


def test_the_stream_carries_the_panels_rows(client, monkeypatch):
    """The running-now panel paints from `/jobs/stream` (its `tasks` event),
    sent at once and again when a row changes, not each look."""
    import json

    from tessellate.api import routes_tasks

    rows = [[{"kind": "pull", "label": "Downloading tiny:1b"}]]
    looks = []

    def collect():
        looks.append(1)
        # The first two looks see one row, every later look a second.
        return rows[0] if len(looks) <= 2 else rows[0] + [{"kind": "reindex", "label": "Re-indexing"}]

    monkeypatch.setattr(routes_tasks, "collect", collect)
    monkeypatch.setattr(routes_tasks, "_STREAM_TASKS_EVERY", 1)
    with client.stream("GET", "/jobs/stream", params={"seconds": 2.5}) as response:
        body = "".join(response.iter_text())
    events = [json.loads(block.split("data: ", 1)[1]) for block in body.split("event: tasks\n")[1:]]
    assert len(events) == 2, body
    assert [len(e["tasks"]) for e in events] == [1, 2]
    assert "now" in events[0] and "history" in events[0]


def test_the_panel_paints_from_the_stream_and_the_poll_steps_aside():
    from tests._app_js import app_js_text

    js = app_js_text()
    assert 'block.startsWith("event: tasks\\n")' in js and "else renderTasks(body);" in js
    assert "if (!taskLineStream.controller) renderTasks(body);" in js
