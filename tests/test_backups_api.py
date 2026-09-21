"""Local backups: create, list, delete, and restore."""

from __future__ import annotations

import sqlite3

import pytest

from memorymap.core import backup, deps


def _save(client, content, **extra):
    response = client.post("/entries", json={"content": content, **extra})
    assert response.status_code == 201
    return response.json()


def test_backup_create_list_delete(client):
    # create_app() already took a startup backup, work relative to it.
    baseline = {b["name"] for b in client.get("/backups").json()}
    _save(client, "worth keeping")
    created = client.post("/backups")
    assert created.status_code == 201
    name = created.json()["name"]

    listed = client.get("/backups").json()
    assert {b["name"] for b in listed} == baseline | {name}
    assert all(b["size"] > 0 for b in listed)

    # The request goes on its own line, not inside the assert: `python -O`
    # strips assert statements wholesale, which would delete the deletion and
    # leave the test passing while exercising nothing.
    deleted = client.delete(f"/backups/{name}")
    assert deleted.json() == {"deleted": name}
    assert {b["name"] for b in client.get("/backups").json()} == baseline
    missing = client.delete("/backups/nope.db")
    assert missing.status_code == 404


def test_storage_reports_whether_the_data_dir_is_writable(client, tmp_path):
    """ROADMAP.md's onboarding item named this the one still-open gap: a
    data-dir writability check. The database opening at all already implies
    the directory was writable at boot, but nothing before this told anyone
    whether it *still* is, a synced folder, a permissions change, or a disk
    remounted read-only can flip that later with no visible symptom until a
    save silently fails. This is the same `os.access` check
    `_validated_export_dir` already trusts for the export folder, asked of
    the notebook's own folder instead."""
    storage = client.get("/storage").json()
    # The sandbox's own data dir is writable, the client fixture would not
    # have been able to create the database otherwise.
    assert storage["data_dir_writable"] is True


def test_retention_is_a_setting_and_prunes_immediately(client):
    """Asked about directly: "backup retention should be a setting, 
    backups accumulate with no cap the user can see or change." The prune
    itself already existed; this is the missing control, and lowering it
    has to take effect now, not just on the next scheduled backup."""
    storage = client.get("/storage").json()
    assert storage["backup_retention_count"] == backup.KEEP_BACKUPS

    for _ in range(4):
        client.post("/backups")
    assert len(client.get("/backups").json()) >= 4

    trimmed = client.put("/backups/retention", json={"keep": 2})
    assert trimmed.status_code == 200
    assert trimmed.json()["keep"] == 2
    assert trimmed.json()["removed"] >= 2
    assert len(client.get("/backups").json()) == 2
    assert client.get("/storage").json()["backup_retention_count"] == 2

    # A later backup respects the new, lower limit too, not just the prune
    # that ran at the moment it was set.
    client.post("/backups")
    assert len(client.get("/backups").json()) == 2

    out_of_range = client.put("/backups/retention", json={"keep": 0})
    assert out_of_range.status_code == 422


def test_backup_restore_rolls_the_database_back(client):
    keep = _save(client, "note before the backup")
    before_count = len(client.get("/backups").json())
    name = client.post("/backups").json()["name"]
    _save(client, "note after the backup")

    response = client.post("/backups/restore", json={"name": name})
    assert response.status_code == 200

    entries = client.get("/entries").json()
    assert [e["content"] for e in entries] == ["note before the backup"]
    assert keep["id"] in [e["id"] for e in entries]
    # The named backup + a pre-restore safety snapshot both exist.
    assert len(client.get("/backups").json()) == before_count + 2


def test_restore_leaves_live_db_untouched_when_backup_is_corrupt(app_state):
    """INBOX 310, finding 1: `restore_backup` used to stream pages straight
    into memorymap.db, so a corrupt backup (or a crash mid-copy) could leave
    the live database half-written. It now copies into a sibling temp file,
    runs PRAGMA integrity_check on that temp file, and only replaces
    memorymap.db if the check passes; the temp file is removed either way."""
    config = deps.get_config()
    before = config.db_path.read_bytes()

    # A file named like a backup but not a valid SQLite database at all:
    # `source.backup()` on it fails outright, well before integrity_check
    # would even run, but it must still be caught and leave the live db
    # and its own temp file alone, exactly as a failed integrity_check would.
    bogus = backup.backups_dir(config.data_dir) / "memorymap-bogus.db"
    bogus.write_bytes(b"not a sqlite database")

    with pytest.raises(sqlite3.DatabaseError):
        backup.restore_backup(bogus.name, config.db_path, config.data_dir)

    assert config.db_path.read_bytes() == before
    tmp_path = config.db_path.with_name(f"{config.db_path.name}.restore-tmp")
    assert not tmp_path.exists()


def test_restore_rejects_a_backup_that_fails_integrity_check(app_state):
    """A syntactically valid SQLite file whose pages are corrupt must not
    become the live database. The header and page count are left alone (so
    `source.backup()` copies it without complaint, the way real corruption
    from a bad disk or a bad sync would) and a wide stretch of page bytes is
    flipped instead, which is what actually trips `PRAGMA integrity_check`."""
    config = deps.get_config()
    before = config.db_path.read_bytes()

    good = backup.backup_now(config.db_path, config.data_dir)
    data = bytearray(good.read_bytes())
    assert len(data) > 8192, "fixture db too small to corrupt past the header"
    for i in range(4096, 8192):
        data[i] ^= 0xFF
    good.write_bytes(bytes(data))

    with pytest.raises(ValueError, match="integrity check"):
        backup.restore_backup(good.name, config.db_path, config.data_dir)

    assert config.db_path.read_bytes() == before
    tmp_path = config.db_path.with_name(f"{config.db_path.name}.restore-tmp")
    assert not tmp_path.exists()


def test_backup_if_due_skips_recent(app_state):
    config = deps.get_config()
    config.db_path.touch()
    first = backup.backup_if_due(config.db_path, config.data_dir)
    assert first is not None
    assert backup.backup_if_due(config.db_path, config.data_dir) is None  # too soon


def test_a_backup_that_runs_out_of_space_leaves_nothing_named_like_a_backup(app_state):
    """Measured, then fixed: a full disk used to leave a fake backup behind.

    Reproduced on an 80 MB tmpfs mounted as the data dir and filled to 100%
    (INBOX 266, item 6). `POST /backups` answered 507, which is right, and
    left `memorymap-20260921-121338.db` in the backups folder at zero bytes,
    because the destination was opened by name and the copy then failed.
    Zero bytes is a *valid empty SQLite database*: it listed as a backup next
    to the real ones, `PRAGMA integrity_check` on it returns "ok", and
    restoring it would have replaced the whole notebook with nothing, which
    turns "the disk filled up" into "my notes are gone".

    The copy goes to a `.partial` sibling now and is renamed into place only
    once it is whole, so a failure leaves the folder exactly as it was.
    """
    import sqlite3 as _sqlite3

    config = deps.get_config()
    folder = backup.backups_dir(config.data_dir)
    before = {p.name for p in folder.iterdir()}

    real_connect = _sqlite3.connect

    def _connect(target, *args, **kwargs):
        # Fail the *target* connection the way a full disk does: the source
        # database still has to open, or this would test nothing but the
        # first line of the function.
        if str(target).endswith(".partial"):
            raise OSError(28, "No space left on device", str(target))
        return real_connect(target, *args, **kwargs)

    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(_sqlite3, "connect", _connect)
        with pytest.raises(OSError):
            backup.backup_now(config.db_path, config.data_dir)

    assert {p.name for p in folder.iterdir()} == before, (
        "a failed backup left a file behind"
    )


def test_an_empty_file_is_never_offered_or_restored_as_a_backup(app_state):
    """The other half of the same failure, for folders that already have one.

    `backup_now` cannot create a zero-byte backup any more, but installs that
    hit a full disk before that fix have one sitting in their backups folder,
    and it is indistinguishable from a real backup to every check SQLite
    offers. Two guards: it is not listed (a restore list is a promise), and
    restoring it by name is refused with a sentence that says what it is,
    rather than quietly emptying the notebook.

    `backup_if_due` reads the same filtered list, so a stray empty file can
    also never stand in for the daily backup and suppress a real one.
    """
    config = deps.get_config()
    folder = backup.backups_dir(config.data_dir)
    # The fixture's own startup backup would answer "there is a recent one"
    # on its own, which is the thing this test has to ask the empty file.
    for stale in folder.glob("memorymap-*.db"):
        stale.unlink()
    empty = folder / "memorymap-29991231-235959.db"
    empty.touch()
    assert empty.stat().st_size == 0

    assert empty.name not in {b["name"] for b in backup.list_backups(config.data_dir)}

    # Newest by name by a margin of a thousand years, and still not what "is
    # there a recent backup?" answers, so the daily backup still happens.
    # Asked before the restore below, because a restore attempt takes a
    # pre-restore safety copy that would answer the question by itself.
    made = backup.backup_if_due(config.db_path, config.data_dir)
    assert made is not None and made.name != empty.name

    before = config.db_path.read_bytes()
    with pytest.raises(ValueError, match="empty"):
        backup.restore_backup(empty.name, config.db_path, config.data_dir)
    assert config.db_path.read_bytes() == before


def test_an_abandoned_partial_copy_is_swept_up(app_state):
    """`backup_now` cleans up its own failure; a killed process cannot.

    The `.partial` name is outside the `memorymap-*.db` glob, so a leftover
    one is never listed or restored, but it would sit in the folder holding
    its bytes for ever. Swept on the next backup, with an hour's grace so a
    copy that is still being written is never the one deleted.
    """
    import os
    import time

    config = deps.get_config()
    folder = backup.backups_dir(config.data_dir)
    abandoned = folder / "memorymap-20200101-000000.db.partial"
    abandoned.write_bytes(b"half a backup")
    old = time.time() - 7200
    os.utime(abandoned, (old, old))

    fresh = folder / "memorymap-20200101-000001.db.partial"
    fresh.write_bytes(b"still being written")

    backup.prune(config.data_dir, backup.KEEP_BACKUPS)

    assert not abandoned.exists()
    assert fresh.exists(), "a partial written seconds ago is not abandoned"
