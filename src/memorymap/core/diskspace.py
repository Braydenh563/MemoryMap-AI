"""What this app does when the disk it writes to fills up.

**Why one module rather than a check per call site.** Measured first (INBOX
266, item 6), on an 80 MB tmpfs mounted as the data dir and filled to 100%
with a ballast file, against the real server:

* `POST /entries` answered 507 with a sentence about disk space. Right, and
  already built (`api/app.py`'s `_out_of_space_response`).
* `GET /entries` and `GET /search` answered 200 throughout. Reading a
  notebook needs no space, and that is the half worth telling someone.
* `POST /auth/unlock` answered **507**, so nobody could open the notebook at
  all. The unlock itself is a password check and an in-memory token; the
  only write is the audit row beside it, and that row was taking the whole
  notebook down with it. A notebook you cannot open because the disk is full
  is indistinguishable, to the person, from a notebook that is gone.
* `POST /entries/{id}/files` and `POST /backups` answered 507 and **left the
  half-written file on disk**: a zero-byte attachment nothing pointed at,
  and, worse, a zero-byte file in the backups folder named like a backup.
  See `core/backup.py`'s `backup_files` for what that one cost.

Three shapes come out of that, and each is here rather than repeated:
`out_of_space` recognises the failure whatever driver raised it,
`check_room_for` refuses a write that cannot fit **before** it starts (so
the app never fills the last megabyte and locks itself out), and
`partial_write` removes what a failed write left behind.

The numbers themselves (`free_bytes`) are also what `GET /storage` reports
and what the Settings panel warns from, so "how much room is left" has one
answer in the app rather than three.
"""

from __future__ import annotations

import errno
import logging
import os
import shutil
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

logger = logging.getLogger("memorymap.diskspace")

#: What a write needs on top of the bytes it is about to write.
#:
#: Deliberately small. The temptation is a comfortable reserve, say 20 MB,
#: but a floor that large refuses to save a two-line note on a machine with
#: 10 MB free, and an app that will not take a note it could plainly fit is
#: worse than one that tries and fails honestly. 2 MB is sized for what
#: actually sits around a write here: SQLite's WAL frames for the
#: transaction and its rollback journal, not the file being written. The
#: request's own size is added to it, so the case this really exists for, a
#: 50 MB upload onto a disk with 10 MB left, is refused for the right reason
#: and with the right number in the sentence.
WRITE_HEADROOM_BYTES = 2 * 1024 * 1024

#: When the Settings panel and `GET /storage` start saying "this is getting
#: tight". Roughly one more upload at this app's own 50 MB ceiling, plus the
#: headroom: below this, the next ordinary thing a person does can fail.
LOW_SPACE_BYTES = 64 * 1024 * 1024


def free_bytes(path: str | os.PathLike[str]) -> int | None:
    """Bytes free on the filesystem holding `path`, or None if it cannot say.

    None rather than 0 on failure, and every caller treats None as "no
    opinion": a check that cannot read the filesystem must never be the
    reason a save is refused. Walks up to the nearest existing parent so a
    folder that has not been created yet (a fresh exports directory) still
    gets an answer about the disk it is going to live on.
    """
    probe = Path(path)
    for candidate in (probe, *probe.parents):
        try:
            return shutil.disk_usage(candidate).free
        except (OSError, ValueError):
            continue
    return None


def total_bytes(path: str | os.PathLike[str]) -> int | None:
    """Size of the filesystem holding `path`, for "62 MB of 80 MB used"."""
    probe = Path(path)
    for candidate in (probe, *probe.parents):
        try:
            return shutil.disk_usage(candidate).total
        except (OSError, ValueError):
            continue
    return None


def out_of_space(exc: BaseException | None) -> bool:
    """True when `exc` (or anything it was raised from) means "no room".

    Two shapes, one cause, and both mean the same thing to a person: SQLite
    answers `SQLITE_FULL` as an `OperationalError` whose message reads
    "database or disk is full", while an upload, an export or a log write
    answers `OSError` with `ENOSPC`.

    Deliberately narrow on the `OSError` side. `OperationalError` also covers
    a locked database and a missing table, and neither is this; matching the
    message is uglier than an error code and is what the driver actually
    gives us, since `sqlite3` exposes no stable constant for it.
    """
    seen: set[int] = set()
    while exc is not None and id(exc) not in seen:
        seen.add(id(exc))
        if isinstance(exc, OSError) and exc.errno == errno.ENOSPC:
            return True
        if "database or disk is full" in str(exc).lower():
            return True
        exc = exc.__cause__ or exc.__context__
    return False


def human_bytes(count: int | None) -> str:
    """"48.2 MB", for a sentence a person reads rather than a byte count."""
    if count is None:
        return "an unknown amount"
    size = float(count)
    for unit in ("bytes", "KB", "MB", "GB"):
        if size < 1024 or unit == "GB":
            if unit == "bytes":
                return f"{int(size)} bytes"
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} GB"  # pragma: no cover - the loop returns at GB


def has_room_for(path: str | os.PathLike[str], wanted: int) -> bool:
    """Is there room for `wanted` bytes plus the headroom a write needs?

    True when the filesystem cannot be read, on purpose: see `free_bytes`.
    """
    free = free_bytes(path)
    if free is None:
        return True
    return free >= wanted + WRITE_HEADROOM_BYTES


def shortfall(path: str | os.PathLike[str], wanted: int) -> int:
    """How many more bytes are needed for `wanted` to fit, at least 0.

    This is the number the message quotes, because "free up 41 MB" is a
    thing a person can act on and "the disk is full" is not.
    """
    free = free_bytes(path)
    if free is None:
        return 0
    return max(0, wanted + WRITE_HEADROOM_BYTES - free)


@contextmanager
def partial_write(*paths: str | os.PathLike[str]) -> Iterator[None]:
    """Remove `paths` if the block raises, keep them if it does not.

    The shape every streaming write in this app needs and three of them did
    not have. A 40 MB upload onto a disk with 30 MB left used to leave 30 MB
    of an orphan behind, nothing in the database pointing at it, and the
    person now further from being able to save anything than before they
    started. Cleanup is best-effort and never masks the original failure: it
    is the out-of-space error the caller has to see, not whatever went wrong
    while tidying up after it.
    """
    try:
        yield
    except BaseException:
        for path in paths:
            try:
                Path(path).unlink(missing_ok=True)
            except OSError:
                logger.debug("couldn't remove partial write %s", path, exc_info=True)
        raise
