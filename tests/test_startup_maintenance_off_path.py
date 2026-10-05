"""Startup maintenance runs after the port opens (audit 2026-10-05, ARCH-19).

Measured before: 4.45 s from launch to first byte at 5,000 notes, with
`create_app` running the bin purge, the event-log compaction and the daily
backup synchronously; the day's first launch copied the whole database before
serving anything. They now start on a thread once the app is serving.
"""

from __future__ import annotations

import threading

from fastapi.testclient import TestClient

from memorymap.api import app as app_module


def test_create_app_does_not_wait_for_the_maintenance(app_state, monkeypatch):
    ran: list[str] = []
    done = threading.Event()

    def record(name):  # noqa: ANN001, ANN202
        def run() -> None:
            ran.append(name)
            if len(ran) == 3:
                done.set()

        return run

    for name in ("_purge_expired_bin_entries", "_compact_event_log", "_backup_if_due"):
        monkeypatch.setattr(app_module, name, record(name))
    app = app_module.create_app()
    assert ran == [], "create_app ran the maintenance before the server could answer"
    with TestClient(app) as client:
        assert client.get("/health").status_code == 200
        assert done.wait(10), ran
    assert sorted(ran) == ["_backup_if_due", "_compact_event_log", "_purge_expired_bin_entries"]
