"""A second copy of each backup in a folder the person chooses (WORLD_CLASS 22.1
row 8, "Data safety is there but hidden"): `backup_copy_dir`. One disk failing
should not take the notebook and every backup with it.

The round trip is end to end on a scratch data dir: back up, find the copy in
the other folder, open it as a notebook, and restore from it."""

from __future__ import annotations

import sqlite3

from tessellate.core import backup, deps

CANARY = b"CANARY-PRIVATE-KEY-0xDEADBEEF"


def _make_notebook(client, text="a note worth keeping"):
    reply = client.post("/entries", json={"content": text, "category": "General"})
    assert reply.status_code == 201, reply.text


def test_the_folder_is_checked_when_it_is_set(client, tmp_path):
    folder = tmp_path / "drive"
    missing = client.put("/preferences", json={"backup_copy_dir": str(folder)})
    assert missing.status_code == 422  # not there
    folder.mkdir()
    relative = client.put("/preferences", json={"backup_copy_dir": "relative/path"})
    assert relative.status_code == 422
    ok = client.put("/preferences", json={"backup_copy_dir": str(folder)})
    assert ok.status_code == 200 and ok.json()["backup_copy_dir"] == str(folder)
    own = backup.backups_dir(deps.get_config().data_dir)
    refused = client.put("/preferences", json={"backup_copy_dir": str(own)})
    assert refused.status_code == 422 and "already where backups are kept" in refused.json()["detail"]
    cleared = client.put("/preferences", json={"backup_copy_dir": ""})
    assert cleared.json()["backup_copy_dir"] == ""


def test_a_backup_is_copied_and_the_copy_opens_as_the_notebook(client, tmp_path):
    folder = tmp_path / "drive"
    folder.mkdir()
    _make_notebook(client, "the note that must survive a dead disk")
    client.put("/preferences", json={"backup_copy_dir": str(folder)})
    made = client.post("/backups")
    assert made.status_code in (200, 201), made.text
    config = deps.get_config()
    row = backup.list_backups(config.data_dir)[0]
    assert row["copied_to"] == str(folder) and row["copy_error"] == ""
    copy = folder / row["name"]
    assert copy.exists() and copy.stat().st_size == (backup.backups_dir(config.data_dir) / row["name"]).stat().st_size
    with sqlite3.connect(copy) as db:  # the copy is a whole notebook
        assert db.execute("select count(*) from entries where content like ?", ("%dead disk%",)).fetchone()[0] == 1
    listed = client.get("/backups")
    assert listed.json()[0]["copied_to"] == str(folder)


def test_the_copy_folder_is_held_to_the_retention_number(client, tmp_path):
    folder = tmp_path / "drive"
    folder.mkdir()
    (folder / "photo.jpg").write_bytes(b"not a backup, never touched")
    client.put("/preferences", json={"backup_copy_dir": str(folder)})
    config = deps.get_config()
    config.db_path.touch()
    for _ in range(4):
        backup.backup_now(config.db_path, config.data_dir, keep=2, origin="manual")
    kept = sorted(p.name for p in folder.glob("tessellate-*.db"))
    assert len(kept) == 2 and kept == sorted(p.name for p in backup.backups_dir(config.data_dir).glob("tessellate-*.db"))
    assert (folder / "photo.jpg").exists()
    assert not list(folder.glob("*.partial"))


def test_a_folder_that_went_away_is_a_note_on_the_backup_not_a_failed_backup(client, tmp_path):
    folder = tmp_path / "drive"
    folder.mkdir()
    client.put("/preferences", json={"backup_copy_dir": str(folder)})
    folder.rmdir()  # the drive was unplugged
    config = deps.get_config()
    config.db_path.touch()
    path = backup.backup_now(config.db_path, config.data_dir, origin="manual")
    assert path.exists() and path.stat().st_size > 0
    row = next(b for b in backup.list_backups(config.data_dir) if b["name"] == path.name)
    assert row["checked"] is True and row["copied_to"] == ""
    assert "is not there" in row["copy_error"] and "drive" in row["copy_error"]


def test_with_no_folder_set_nothing_is_copied(client, tmp_path):
    config = deps.get_config()
    config.db_path.touch()
    path = backup.backup_now(config.db_path, config.data_dir, origin="manual")
    row = next(b for b in backup.list_backups(config.data_dir) if b["name"] == path.name)
    assert row["copied_to"] == "" and row["copy_error"] == ""
    assert backup.copy_dir(config.data_dir) is None


def test_the_copy_folder_gets_the_database_and_its_record_and_no_secret(client, tmp_path):
    """Backups and exports never carry secrets (reminder token key, LAN
    certificates and keys, the API key): the second copy is the database file
    and its record, nothing else, whatever else sits in the data folder."""
    from tessellate.core import lancert

    folder = tmp_path / "drive"
    folder.mkdir()
    config = deps.get_config()
    cert, key = lancert.paths(config.data_dir)
    for path in (cert, key, config.data_dir / "reminder_token.key"):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(CANARY)
    config.set_preference("llm_api_key", CANARY.decode())
    _make_notebook(client)
    client.put("/preferences", json={"backup_copy_dir": str(folder)})
    backup.backup_now(config.db_path, config.data_dir, origin="manual")
    names = sorted(p.name for p in folder.iterdir())
    assert names and all(n.endswith((".db", ".db.json")) for n in names), names
    for p in folder.iterdir():
        assert CANARY not in p.read_bytes(), p.name


def test_the_setting_travels_with_no_settings_file(client, tmp_path):
    """A folder is a place on this computer, so Export settings leaves it out."""
    folder = tmp_path / "drive"
    folder.mkdir()
    client.put("/preferences", json={"backup_copy_dir": str(folder)})
    assert "backup_copy_dir" not in client.get("/preferences/export").json()["preferences"]


def test_a_backup_is_one_file_with_no_sqlite_sidecars_here_or_in_the_copy_folder(client, tmp_path):
    """The copy inherited WAL mode, so reading it back left `-wal` and `-shm`
    beside it (and the second copy was a file that needed them)."""
    folder = tmp_path / "drive"
    folder.mkdir()
    _make_notebook(client)
    client.put("/preferences", json={"backup_copy_dir": str(folder)})
    config = deps.get_config()
    path = backup.backup_now(config.db_path, config.data_dir, origin="manual")
    for where in (path.parent, folder):
        names = sorted(p.name for p in where.iterdir())
        assert not [n for n in names if n.endswith(("-wal", "-shm"))], names
    with sqlite3.connect(path) as db:
        assert db.execute("PRAGMA journal_mode").fetchone()[0] == "delete"
    # Reading it back (what a restore does) still leaves nothing behind.
    backup.verify_copy(path)
    assert not [p for p in path.parent.iterdir() if p.name.endswith(("-wal", "-shm"))]
