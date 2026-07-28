"""Settings → Background tasks has to show *every* background job.

It listed two — a re-index and a model download — because it was assembled in
`app.js` out of whatever happened to be in `/models/status`. The embedding
model loading at startup and the SearXNG install, which is the longest job in
the app at several minutes, ran with nothing on that screen to say so.
"""

from __future__ import annotations

import pytest

from memorymap.ai import model_manager


@pytest.fixture(autouse=True)
def _clean_jobs():
    model_manager.reset_jobs()
    yield
    model_manager.reset_jobs()


def _kinds(client) -> list[str]:
    return [task["kind"] for task in client.get("/tasks").json()["tasks"]]


def test_nothing_running_is_an_empty_list_not_an_error(client):
    assert client.get("/tasks").json() == {"tasks": []}


def test_a_reindex_shows_up_with_its_progress(client, monkeypatch):
    monkeypatch.setattr(
        model_manager,
        "reindex_status",
        lambda: {"kind": "reindex", "name": "", "total": 40, "done": 10,
                 "status": "running", "error": ""},
    )
    task = client.get("/tasks").json()["tasks"][0]
    assert task["kind"] == "reindex"
    assert task["detail"] == "10 of 40"
    assert task["progress"] == pytest.approx(0.25)
    assert task["cancellable"] is True


def test_a_model_download_shows_up(client, monkeypatch):
    monkeypatch.setattr(
        model_manager,
        "pull_statuses",
        lambda: {"llama3.2": {"kind": "pull", "name": "llama3.2", "total": 100,
                              "done": 62, "status": "running", "error": ""}},
    )
    task = client.get("/tasks").json()["tasks"][0]
    assert task["name"] == "llama3.2"
    assert task["detail"] == "62%"
    assert task["cancellable"] is True


def test_a_job_with_no_total_yet_says_so_rather_than_guessing(client, monkeypatch):
    """A progress bar that invents a number is worse than one that admits it
    cannot say."""
    monkeypatch.setattr(
        model_manager,
        "pull_statuses",
        lambda: {"big": {"kind": "pull", "name": "big", "total": 0, "done": 0,
                         "status": "running", "error": ""}},
    )
    task = client.get("/tasks").json()["tasks"][0]
    assert task["progress"] is None
    assert task["detail"] == "starting…"


def test_a_finished_job_is_not_a_task(client, monkeypatch):
    """A screen that accumulates finished work is a log, and there is one."""
    monkeypatch.setattr(
        model_manager,
        "reindex_status",
        lambda: {"kind": "reindex", "name": "", "total": 40, "done": 40,
                 "status": "success", "error": ""},
    )
    assert _kinds(client) == []


def test_the_embedding_warm_up_is_a_visible_job(client, monkeypatch):
    """~90 MB on first use, in a background thread, with nothing on screen —
    which reads as the app being broken rather than busy."""
    from memorymap.ai import embeddings as embeddings_module

    monkeypatch.setattr(embeddings_module, "warmup_running", lambda: True)
    task = next(t for t in client.get("/tasks").json()["tasks"] if t["kind"] == "embeddings")
    assert "90 MB" in task["detail"]
    # Nothing useful happens if you kill it half-way through a download.
    assert task["cancellable"] is False


def test_the_searxng_install_is_a_visible_job(client, monkeypatch):
    """Minutes long, and previously visible only on the Web search screen."""
    from memorymap.search import searxng_manager

    monkeypatch.setitem(searxng_manager._install_state, "running", True)
    monkeypatch.setitem(searxng_manager._install_state, "step", "Unpacking SearXNG…")
    task = next(t for t in client.get("/tasks").json()["tasks"] if t["kind"] == "searxng")
    assert task["detail"] == "Unpacking SearXNG…"
    assert task["cancellable"] is False


def test_several_jobs_at_once_all_appear(client, monkeypatch):
    from memorymap.ai import embeddings as embeddings_module
    from memorymap.search import searxng_manager

    monkeypatch.setattr(
        model_manager,
        "reindex_status",
        lambda: {"kind": "reindex", "name": "", "total": 4, "done": 1,
                 "status": "running", "error": ""},
    )
    monkeypatch.setattr(embeddings_module, "warmup_running", lambda: True)
    monkeypatch.setitem(searxng_manager._install_state, "running", True)

    assert set(_kinds(client)) == {"reindex", "embeddings", "searxng"}


def test_the_tasks_list_sits_behind_the_unlock_gate(client):
    """It names the models you run and what you are installing."""
    token = client.post("/auth/setup", json={"password": "gate-test"}).json()["token"]
    assert client.get("/tasks").status_code == 401
    assert client.get("/tasks", headers={"X-Auth-Token": token}).status_code == 200
