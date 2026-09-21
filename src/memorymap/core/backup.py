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


def backup_files(data_dir: Path) -> list[Path]:
    """Every file in the backups folder that is actually a backup, newest first.

    **Zero bytes is not a backup, and saying otherwise is how a full disk
    becomes data loss.** Measured on a 80 MB tmpfs filled to 100%: `POST
    /backups` answered 507 (correctly), and left
    `memorymap-20260921-121338.db` behind at zero bytes, because the
    destination was opened by name and the copy then failed. A zero-byte file
    is a *valid empty SQLite database*: `PRAGMA integrity_check` on it
    returns "ok", so it listed as a backup, passed the restore guard, and
    restoring it would have replaced the notebook with nothing.
    `backup_now` no longer creates one (it copies to a temp name and renames
    only on success), and this filter is for the ones already sitting in
    people's folders from before that fix, and for anything else that
    truncates a file underneath us.
    """
    found = []
    for path in backups_dir(data_dir).glob("memorymap-*.db"):
        try:
            if path.stat().st_size > 0:
                found.append(path)
        except OSError:
            # Vanished between the glob and the stat, or unreadable: either
            # way it is not something a restore list should promise.
            continue
    return sorted(found, reverse=True)


def list_backups(data_dir: Path) -> list[dict]:
    """Newest first."""
    entries = []
    for path in backup_files(data_dir):
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
    #: **The backup gets its name only once it is a whole backup.** Copying
    #: straight into `destination` means a copy that fails part-way (a full
    #: disk is the measured case) leaves a file named like a backup holding
    #: part of one, or none of one: see `backup_files` for what that costs.
    #: Same directory, so the rename is atomic and cannot itself run out of
    #: space; `.partial` is outside the `memorymap-*.db` glob, so a stray one
    #: is never listed, restored or counted against retention.
    partial = destination.with_name(f"{destination.name}.partial")
    try:
        source = sqlite3.connect(db_path)
        try:
            target = sqlite3.connect(partial)
            try:
                source.backup(target)
            finally:
                target.close()
        finally:
            source.close()
        os.replace(partial, destination)
    except BaseException:
        for stray in (partial, Path(f"{partial}-wal"), Path(f"{partial}-shm")):
            try:
                stray.unlink(missing_ok=True)
            except OSError:
                # Best-effort: never mask the real failure (out of space,
                # usually) with the tidy-up that followed it.
                pass
        raise

    prune(data_dir, keep)
    return destination


def prune(data_dir: Path, keep: int = KEEP_BACKUPS) -> int:
    """Delete every backup past the newest `keep`. Returns how many were
    removed, so a caller changing the limit can say how much that freed up
    rather than the user having to reload the list to find out."""
    stale = backup_files(data_dir)[max(0, keep) :]
    for path in stale:
        path.unlink(missing_ok=True)
    _sweep_partials(data_dir)
    return len(stale)


#: How long a `.partial` has to sit there before it is assumed abandoned.
#: `backup_now` removes its own on any failure, so the only way one survives
#: is the process dying mid-copy (a kill, a power cut). An hour, rather than
#: "any that exist", because the startup backup and a click on Back up now
#: can overlap, and deleting a copy that is still being written would turn a
#: tidy-up into the bug it exists to prevent.
_PARTIAL_GRACE_SECONDS = 3600


def _sweep_partials(data_dir: Path) -> None:
    now = datetime.now(timezone.utc).timestamp()
    for path in backups_dir(data_dir).glob("memorymap-*.db.partial"):
        try:
            if now - path.stat().st_mtime > _PARTIAL_GRACE_SECONDS:
                path.unlink(missing_ok=True)
        except OSError:
            # Tidying up is never worth an exception out of a backup.
            continue


def backup_if_due(db_path: Path, data_dir: Path, keep: int = KEEP_BACKUPS) -> Path | None:
    """Startup hook: back up unless a recent backup already exists."""
    if not db_path.exists():
        return None
    newest = next(iter(backup_files(data_dir)), None)
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
        #: **"ok" is not the same as "has anything in it."** An empty file is
        #: a valid SQLite database with no tables, and passes the check
        #: above; restoring one replaces the notebook with nothing and the
        #: pre-restore safety copy is the only way back. A real backup of
        #: this app always has tables, so a table count of zero is the one
        #: unambiguous "this is not a notebook" test available here.
        checker = sqlite3.connect(tmp_path)
        try:
            tables = checker.execute(
                "SELECT count(*) FROM sqlite_master WHERE type = 'table'"
            ).fetchone()[0]
        finally:
            checker.close()
        if not tables:
            raise ValueError(
                f"Backup {name} is empty, so restoring it would replace your "
                "notebook with nothing. It was most likely written when this "
                "computer was out of disk space."
            )

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
