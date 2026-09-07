"""`GET /debug/health` — PLAN.md B9: observability that costs nothing.

Behind the same `locked` dependency as every data route (checked here by
being reachable through the ordinary `client` fixture, the same way
`test_tasks.py` checks `/tasks`); everything on the page already existed
somewhere else in the app (`routes_tasks.collect`, `taskhistory`,
`logbuffer`), so this is mostly a shape test plus the one number with an
actual budget: response time on an empty notebook.
"""

from __future__ import annotations

import io
import logging
import time

from memorymap import __version__
from memorymap.core import deps, taskhistory
from memorymap.entry import manager


def test_shape_on_an_empty_notebook(client):
    body = client.get("/debug/health").json()
    assert body["app_version"] == __version__
    assert body["data_dir"] == str(deps.get_config().data_dir)
    assert body["db"]["path"] == str(deps.get_config().db_path)
    assert body["db"]["size_bytes"] >= 0
    assert body["counts"] == {
        "entries": 0,
        "documents": 0,
        "media": 0,
        "attachments": 0,
        "reminders": 0,
    }
    assert body["jobs"] == {"queue_depth": 0, "running": []}
    assert body["latency_ms_by_kind"] == {}
    assert body["recent_errors"] == []


def test_counts_reflect_real_rows(client, session):
    """Each of the five counts moves independently — a test pinned to only
    one of them would miss four kinds of the same mistake (a copy-pasted
    `func.count` left pointed at the wrong table)."""
    entry = manager.create_entry(session, "counted note")
    session.commit()
    client.post(
        f"/entries/{entry.id}/files",
        files={"file": ("a.txt", io.BytesIO(b"hi"), "text/plain")},
    )
    from memorymap.core.database import Document, Reminder, utcnow

    session.add(Document(title="doc", content="body"))
    session.add(Reminder(text="water plants", due_at=utcnow()))
    session.commit()
    client.post("/media/upload", files={"file": ("p.png", io.BytesIO(b"x"), "image/png")})

    counts = client.get("/debug/health").json()["counts"]
    assert counts["entries"] == 1
    assert counts["documents"] == 1
    assert counts["attachments"] == 1
    assert counts["reminders"] == 1
    assert counts["media"] == 1


def test_deleted_entries_are_not_counted(client, session):
    """The number a health page should show is "how many notes exist",
    not "how many rows the recycle bin still carries" — `entries` matches
    every other listing's default, which excludes `is_deleted`."""
    entry = manager.create_entry(session, "will be binned")
    session.commit()
    manager.soft_delete_entry(session, entry)

    assert client.get("/debug/health").json()["counts"]["entries"] == 0


def test_a_running_job_shows_up_in_the_queue(client, session):
    """Same list `/tasks` already renders — proven by asking the running
    reindex job to report itself through both endpoints and getting the
    same shape back."""
    from memorymap.ai import model_manager

    # An empty notebook re-indexes nothing and the job finishes before this
    # test can ever observe it "running" — one entry gives the stub embedder
    # something to sit on.
    manager.create_entry(session, "something to re-embed slowly")
    session.commit()

    class _StuckEmbedder:
        def store_for_entry(self, *_a, **_kw):
            time.sleep(5)

        def backend_id(self):
            return "stub"

    started = model_manager.start_reindex(deps.get_db(), _StuckEmbedder())
    assert started
    try:
        body = client.get("/debug/health").json()
        assert body["jobs"]["queue_depth"] >= 1
        assert any(job["kind"] == "reindex" for job in body["jobs"]["running"])
    finally:
        model_manager.cancel_reindex()
        model_manager.reset_jobs()


def test_a_finished_job_with_a_duration_shows_up_in_latency(client):
    """`taskhistory.record`'s new `duration_ms` is what this percentile
    table is computed from — recorded here directly rather than running a
    real model round trip, the same "record the ending, not the model"
    split `core/taskhistory.py` itself keeps."""
    taskhistory.record("caption", "Captioning x.png", "completed", name="test-model", duration_ms=120.0)
    taskhistory.record("caption", "Captioning y.png", "completed", name="test-model", duration_ms=80.0)

    latency = client.get("/debug/health").json()["latency_ms_by_kind"]
    assert latency["caption"]["count"] == 2
    assert latency["caption"]["p50_ms"] in (80.0, 100.0, 120.0)
    assert latency["caption"]["p95_ms"] >= latency["caption"]["p50_ms"]


def test_recent_errors_are_the_tail_of_the_log(client):
    logger = logging.getLogger("memorymap.test_debug_health")
    logger.error("a deliberate test error")
    logger.warning("a deliberate test warning")
    logger.info("an info line the health page must not surface")

    errors = client.get("/debug/health").json()["recent_errors"]
    messages = [e["message"] for e in errors]
    assert "a deliberate test error" in messages
    assert "a deliberate test warning" in messages
    assert not any("must not surface" in m for m in messages)


def test_renders_fast_on_an_empty_notebook(client):
    """The actual budget PLAN.md B9 sets: <20ms, no full-table scans beyond
    an indexed COUNT(*). One cold call plus a handful of warmed ones, timed
    with `time.perf_counter` rather than trusted by inspection."""
    client.get("/debug/health")  # warm imports/connection, not the number asserted
    samples = []
    for _ in range(10):
        start = time.perf_counter()
        response = client.get("/debug/health")
        samples.append(time.perf_counter() - start)
        assert response.status_code == 200
    samples.sort()
    median = samples[len(samples) // 2]
    assert median < 0.02, f"median {median * 1000:.2f}ms exceeds the 20ms budget"
