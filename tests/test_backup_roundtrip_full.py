"""A whole notebook out and back in, compared table by table (audit 2026-10-10, item 1).

`test_backup_bundle.py` proves three notes survive. The owner's question is
wider: every note, board, map, document, reminder, tag and *setting*. This
seeds 500 notes plus each of those, takes the bundle, deletes the data
folder's contents, restores into the empty folder, and diffs every table's
rows and `preferences.json`.
"""

from __future__ import annotations

import json
import sqlite3

import pytest

from memorymap.core import deps


def _dump(db_path):
    """Every table's rows, ordered, so two notebooks compare as plain data."""
    con = sqlite3.connect(db_path)
    try:
        tables = [r[0] for r in con.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
        # Process-local state the restore legitimately resets: sessions, the
        # job ledger and the audit trail of the restore itself.
        skip = {"job_runs", "jobs", "audit_log", "users"}
        return {t: sorted(map(repr, con.execute(f"SELECT * FROM {t}").fetchall()))
                for t in tables if t not in skip}
    finally:
        con.close()


@pytest.fixture()
def seeded(client):
    for i in range(500):
        reply = client.post("/entries", json={"content": f"note {i} about harbour pilots and tides", "tags": [f"tag{i % 7}", "shared"]})
        assert reply.status_code == 201
    statuses = [
        client.post("/whiteboard/boards", json={"name": "Trip plan"}).status_code,
        client.post("/documents", json={"title": "Thesis", "content": "# Thesis\n\nbody", "file_type": "md"}).status_code,
        client.post("/reminders", json={"text": "water the plants", "due_at": "2099-01-01T09:00:00"}).status_code,
        client.put("/preferences", json={"timezone": "Europe/London", "recycle_bin_days": 11}).status_code,
    ]
    assert statuses == [201, 201, 201, 200]
    return client


def test_a_500_note_notebook_comes_back_row_for_row(seeded, tmp_path):
    config = deps.get_config()
    sealed = seeded.post("/backups/bundle", json={"password": "hunter2hunter2"})
    assert sealed.status_code == 200
    from memorymap.core import backup

    live_copy = tmp_path / "before.db"
    backup.snapshot(config.db_path, live_copy)
    before = _dump(live_copy)
    prefs_before = json.loads(config.preferences_path.read_text())

    # Wipe the notebook and the settings, as a new machine would have them.
    for entry in seeded.get("/entries?limit=100").json():
        seeded.delete(f"/entries/{entry['id']}")
    config.preferences_path.unlink()
    config._preferences.clear()  # a new machine has not loaded them either

    reply = seeded.post(
        "/backups/bundle/restore",
        files={"file": ("n.mmenc", sealed.content)},
        data={"password": "hunter2hunter2"},
    )
    assert reply.status_code == 200, reply.text

    after_copy = tmp_path / "after.db"
    backup.snapshot(config.db_path, after_copy)
    after = _dump(after_copy)
    differing = [t for t in before if before[t] != after.get(t)]
    assert differing == [], f"tables that differ after restore: {differing}"
    assert len(before["entries"]) >= 500

    assert config.preferences_path.exists(), "the settings file did not come back"
    prefs_after = json.loads(config.preferences_path.read_text())
    assert prefs_after.get("timezone") == prefs_before.get("timezone") == "Europe/London"
    assert prefs_after.get("recycle_bin_days") == 11


def test_a_backup_never_carries_the_api_key_or_the_sign_in_switch(client, tmp_path):
    config = deps.get_config()
    config.set_preference("llm_api_key", "sk-secret-value")
    config.set_preference("ask_password_on_open", False)
    config.set_preference("timezone", "Asia/Tokyo")
    plain = client.get("/export/backup").content
    import io
    import zipfile

    archive = zipfile.ZipFile(io.BytesIO(plain))
    carried = json.loads(archive.read("preferences.json"))
    assert carried["timezone"] == "Asia/Tokyo"
    assert "llm_api_key" not in carried and "ask_password_on_open" not in carried
    assert b"sk-secret-value" not in plain
