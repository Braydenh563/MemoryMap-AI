"""Local database backups.

Copies are made with SQLite's own backup API, so a backup taken while
the app is writing is still consistent. Backups live in
data/backups/, next to the database, never in the cloud, and old
ones are pruned so the folder can't grow forever.
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

KEEP_BACKUPS = 10
# "Scheduled": a fresh backup is taken at startup when the newest one is
# older than this: boring, reliable, and works for an app that isn't
# running 24/7.
BACKUP_EVERY_HOURS = 24


def backups_dir(data_dir: Path) -> Path:
    folder = data_dir / "backups"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def list_backups(data_dir: Path) -> list[dict]:
    """Newest first."""
    entries = []
    for path in sorted(backups_dir(data_dir).glob("memorymap-*.db"), reverse=True):
        stat = path.stat()
        entries.append(
            {
                "name": path.name,
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(
                    stat.st_mtime, tz=timezone.utc
                ).isoformat(),
            }
        )
    return entries


def backup_now(db_path: Path, data_dir: Path, keep: int = KEEP_BACKUPS) -> Path:
    """Take one consistent snapshot and prune old ones.

    `keep` was a hard-coded 10 until asked about directly ("backup retention
    should be a setting, backups accumulate with no cap the user can see or
    change"). The prune itself was never the gap, this function has called
    `_prune` on every backup since it was written, only that the number was
    fixed in code instead of being a preference. `keep` defaults to the old
    constant so a caller that never heard of the preference keeps behaving
    exactly as before.
    """
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    folder = backups_dir(data_dir)
    destination = folder / f"memorymap-{stamp}.db"
    # Two backups in the same second (e.g. the pre-restore safety copy
    # right after a manual one) must never overwrite each other.
    counter = 1
    while destination.exists():
        destination = folder / f"memorymap-{stamp}-{counter}.db"
        counter += 1
    source = sqlite3.connect(db_path)
    try:
        target = sqlite3.connect(destination)
        try:
            source.backup(target)
        finally:
            target.close()
    finally:
        source.close()

    prune(data_dir, keep)
    return destination


def prune(data_dir: Path, keep: int = KEEP_BACKUPS) -> int:
    """Delete every backup past the newest `keep`. Returns how many were
    removed, so a caller changing the limit can say how much that freed up
    rather than the user having to reload the list to find out."""
    backups = sorted(backups_dir(data_dir).glob("memorymap-*.db"), reverse=True)
    stale = backups[max(0, keep) :]
    for path in stale:
        path.unlink(missing_ok=True)
    return len(stale)


def backup_if_due(db_path: Path, data_dir: Path, keep: int = KEEP_BACKUPS) -> Path | None:
    """Startup hook: back up unless a recent backup already exists."""
    if not db_path.exists():
        return None
    newest = next(iter(sorted(backups_dir(data_dir).glob("memorymap-*.db"), reverse=True)), None)
    if newest is not None:
        age_hours = (
            datetime.now(timezone.utc)
            - datetime.fromtimestamp(newest.stat().st_mtime, tz=timezone.utc)
        ).total_seconds() / 3600
        if age_hours < BACKUP_EVERY_HOURS:
            return None
    return backup_now(db_path, data_dir, keep)


def restore_backup(name: str, db_path: Path, data_dir: Path, keep: int = KEEP_BACKUPS) -> None:
    """Replace the live database with a backup.

    The caller MUST dispose every open engine first and rebuild it after
    (deps.reload_db does both). A safety snapshot of the current state is
    taken before overwriting, so even a restore is undoable."""
    source_path = backups_dir(data_dir) / Path(name).name  # no traversal
    if not source_path.is_file():
        raise FileNotFoundError(f"No backup named {name}")
    if db_path.exists():
        backup_now(db_path, data_dir, keep)  # the pre-restore safety copy

    # Restore into a temp file that sits beside db_path (same filesystem, so
    # the os.replace below is atomic) instead of streaming pages straight
    # into memorymap.db: a crash mid-copy used to be able to leave the live
    # database half-written, with the pre-restore safety copy above as the
    # only way back. The integrity check runs BEFORE the replace, not after:
    # once the temp file has been renamed onto db_path it *is* the live
    # database, so checking it then would only confirm damage already done.
    # Checking first catches a corrupt backup while it is still a throwaway
    # temp file nobody depends on.
    tmp_path = db_path.with_name(f"{db_path.name}.restore-tmp")
    try:
        source = sqlite3.connect(source_path)
        try:
            target = sqlite3.connect(tmp_path)
            try:
                source.backup(target)
            finally:
                target.close()
        finally:
            source.close()

        checker = sqlite3.connect(tmp_path)
        try:
            try:
                row = checker.execute("PRAGMA integrity_check").fetchone()
            except sqlite3.DatabaseError as exc:
                # Some corruption fails inside the check itself rather than
                # coming back as a non-"ok" row; both mean the same thing.
                raise ValueError(f"Backup {name} failed integrity check: {exc}") from exc
        finally:
            checker.close()
        if row is None or row[0] != "ok":
            raise ValueError(f"Backup {name} failed integrity check: {row}")

        os.replace(tmp_path, db_path)
        # The database runs in WAL mode (database.py), so db_path may still
        # have a -wal/-shm pair from before the restore, holding frames for
        # the database that just got replaced. Left in place they would be
        # replayed onto the new file on its first connection, quietly
        # bringing back rows the restore was meant to remove. The temp
        # file's own sidecars (if the copy created any) are orphaned by the
        # rename under their old name and are cleaned up the same way.
        for stale in (db_path, tmp_path):
            Path(f"{stale}-wal").unlink(missing_ok=True)
            Path(f"{stale}-shm").unlink(missing_ok=True)
    except Exception:
        Path(tmp_path).unlink(missing_ok=True)
        Path(f"{tmp_path}-wal").unlink(missing_ok=True)
        Path(f"{tmp_path}-shm").unlink(missing_ok=True)
        raise
