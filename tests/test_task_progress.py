"""INBOX 696: every long job is a Background tasks row with its start time.

The owner: "the running background task stuff dont have progress bars or
indicators, they are just flat rows". The panel draws a bar for every running
row (a real fraction where the job reports steps, an indeterminate one
otherwise) and the time since it started; this is the server half: every row
carries `started`, the bulk install carries its packages, and the app update's
download is a row like the rest.
"""

from __future__ import annotations

import threading
import time

import pytest

from memorymap.ai import model_manager
from memorymap.core import extras
from memorymap.core import jobs as bgpool


@pytest.fixture(autouse=True)
def _clean():
    model_manager.reset_jobs()
    yield
    model_manager.reset_jobs()


def _reindex(monkeypatch):
    monkeypatch.setattr(
        model_manager,
        "reindex_status",
        lambda: {"kind": "reindex", "name": "", "total": 4, "done": 1, "status": "running", "error": ""},
    )


def test_every_row_carries_when_it_started_and_the_body_the_time_now(client, monkeypatch):
    _reindex(monkeypatch)
    before = time.time()
    body = client.get("/tasks").json()
    assert body["now"] >= before
    (row,) = body["tasks"]
    assert isinstance(row["started"], float)
    assert row["started"] <= body["now"]


def test_a_row_keeps_its_start_between_polls(client, monkeypatch):
    """First seen is the fallback for a job that keeps no clock of its own;
    a second poll must not restart it, or the elapsed time never grows."""
    _reindex(monkeypatch)
    first = client.get("/tasks").json()["tasks"][0]["started"]
    time.sleep(0.02)
    second = client.get("/tasks").json()["tasks"][0]["started"]
    assert first == second


def test_a_pip_install_reports_its_own_start(client, monkeypatch):
    state = extras.current()
    monkeypatch.setattr(state, "running", True)
    monkeypatch.setattr(state, "extra_id", "semantic")
    monkeypatch.setattr(state, "started", 1234.5)
    row = next(t for t in client.get("/tasks").json()["tasks"] if t["kind"] == "extra")
    assert row["started"] == 1234.5


def test_a_bulk_install_lists_each_package_with_its_outcome(client, monkeypatch):
    bulk = extras.bulk()
    monkeypatch.setattr(bulk, "running", True)
    monkeypatch.setattr(bulk, "action", "install")
    monkeypatch.setattr(bulk, "started", 99.0)
    monkeypatch.setattr(
        bulk,
        "items",
        [
            {"id": "semantic", "label": "Search by meaning", "outcome": "completed", "message": ""},
            {"id": "ocr", "label": "Search inside images", "outcome": "running", "message": ""},
            {"id": "voice", "label": "Voice", "outcome": "queued", "message": ""},
        ],
    )
    row = next(t for t in client.get("/tasks").json()["tasks"] if t["kind"] == "extra")
    assert row["started"] == 99.0
    assert row["progress"] == pytest.approx(1 / 3)
    assert [(step["label"], step["outcome"]) for step in row["steps"]] == [
        ("Search by meaning", "completed"),
        ("Search inside images", "running"),
        ("Voice", "queued"),
    ]


def test_the_app_update_download_is_a_row(client, monkeypatch):
    from memorymap.api import routes_update

    state = routes_update._state
    monkeypatch.setattr(state, "running", True)
    monkeypatch.setattr(state, "step", "Downloading")
    monkeypatch.setattr(state, "done_bytes", 25)
    monkeypatch.setattr(state, "total_bytes", 100)
    row = next(t for t in client.get("/tasks").json()["tasks"] if t["kind"] == "app-update")
    assert row["progress"] == pytest.approx(0.25)
    assert row["label"] == "Downloading the update"


def test_a_running_pool_job_reports_when_it_started_not_when_it_queued() -> None:
    pool = bgpool.Pool({"model": 1}, kind_lanes={"caption": "model"})
    release = threading.Event()
    try:
        pool.enqueue("caption", release.wait, 5, name="cat.png")
        pool.enqueue("caption", lambda: None, name="dog.png")
        deadline = time.monotonic() + 5
        rows: list[dict] = []
        while time.monotonic() < deadline:
            rows = pool.pending()
            if len(rows) == 2 and not rows[0]["queued"]:
                break
            time.sleep(0.01)
        running, waiting = rows
        assert running["started"] and waiting["started"]
        assert waiting["queued"] is True
    finally:
        release.set()
        pool.shutdown(deadline=2.0)


def test_every_pool_kind_a_person_starts_has_a_label() -> None:
    """A "Background job" row says nothing; every kind that is not quiet
    names what it is doing."""
    for kind in bgpool.KIND_LANES:
        if kind in bgpool.QUIET_KINDS:
            continue
        assert kind in bgpool.LABELS, kind
