"""The notebook file's check at start (WORLD_CLASS 25e, Brief 51 step 2).

`quick_check` runs once per process, first in the start-up housekeeping and
before anything writes; `GET /backups/integrity` hands the page the answer,
and the page shows one notice naming the way back only when it failed.
"""

from __future__ import annotations

import sqlite3

from memorymap.api import app as app_module
from memorymap.core import backup
from tests._app_js import app_js_text


def test_a_healthy_notebook_passes_and_the_answer_is_kept(client, app_state):
    reply = client.get("/backups/integrity")
    assert reply.status_code == 200
    body = reply.json()
    assert body["ok"] is True and body["check"] == "quick_check" and body["result"] == "ok"
    again = client.get("/backups/integrity").json()
    assert again["at"] == body["at"], "the check runs once per process, not per ask"
    storage = client.get("/storage").json()
    assert storage["integrity"]["ok"] is True


def test_a_damaged_file_fails_the_check_with_words_not_an_exception(tmp_path):
    db = tmp_path / "damaged.db"
    con = sqlite3.connect(db)
    con.execute("CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT)")
    con.executemany("INSERT INTO notes (body) VALUES (?)", [("x" * 300,)] * 2000)
    con.execute("CREATE INDEX notes_body ON notes (body)")
    con.commit()
    con.close()
    raw = bytearray(db.read_bytes())
    page = 4096
    for offset in range(page * 3, page * 6):  # three pages of the table's tree overwritten
        raw[offset] = 0xA5
    db.write_bytes(bytes(raw))
    result = backup.check_at_boot(db)
    assert result["ok"] is False
    assert result["result"] and result["result"] != "ok"


def test_a_file_that_is_not_a_notebook_fails_too(tmp_path):
    db = tmp_path / "junk.db"
    db.write_bytes(b"this is not sqlite" * 400)
    assert backup.check_at_boot(db)["ok"] is False


def test_a_restore_forgets_the_answer_about_the_file_it_replaced(client, app_state):
    first = client.get("/backups/integrity").json()
    made = client.post("/backups")
    assert made.status_code == 201
    restored = client.post("/backups/restore", json={"name": made.json()["name"]})
    assert restored.status_code == 200, restored.text
    after = backup.check_at_boot(app_state.db_path)
    assert after["at"] != first["at"]


def test_the_check_is_the_first_housekeeping_step_and_the_page_asks_for_it():
    import inspect

    source = inspect.getsource(app_module._startup_maintenance)
    assert source.index("_check_notebook_file") < source.index("_purge_expired_bin_entries")
    assert source.index("_check_notebook_file") < source.index("_backup_if_due")
    js = app_js_text()
    assert 'apiJson("/backups/integrity"' in js
    assert "function noteDamagedNotebook" in js and "sticky: true" in js


def test_a_file_too_damaged_to_open_stops_with_the_way_back_named(tmp_path, monkeypatch):
    """The notice in the page cannot help when the page never loads: the
    damaged file is named, with the newest backup and the sidecars, in the
    error the launcher's loading window and the log show."""
    import pytest

    from memorymap.core import deps, startup_status

    data = tmp_path / "data"
    data.mkdir()
    (data / "backups").mkdir()
    (data / "backups" / "memorymap-20991231-000000.db").write_bytes(b"x")
    (data / "memorymap.db").write_bytes(b"not a notebook at all" * 500)
    monkeypatch.setenv("MEMORYMAP_DATA_DIR", str(data))
    deps.reset_app_state()
    try:
        with pytest.raises(backup.DamagedNotebookError) as caught:
            deps.init_app_state(data_dir=data)
    finally:
        deps.reset_app_state()
    words = str(caught.value)
    assert "damaged" in words and "memorymap-20991231-000000.db" in words and "-wal" in words
    assert startup_status.get_phase() == words
