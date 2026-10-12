"""Crash-safe writes for the small pieces of state that live outside SQLite.

Why this exists: the database gets crash-safety for free from SQLite's own
transactions. Anything written straight to a file, `preferences.json` is the
one case in this app today, does not, unless the write itself is atomic.
`Path.write_text()` truncates the file before writing the new content, so a
crash or power loss mid-write leaves a half-written (often zero-byte) file
behind, not the old one. The fix is the standard shape: write the new content
to a temp file in the same directory, `fsync` it so it is actually on disk,
then `os.replace()` it over the real path, a rename within one filesystem is
atomic, so a reader (or the next process to start) always sees either the
whole old file or the whole new one, never a partial write.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

#: How many times a rename that Windows refused is tried before giving up,
#: with a growing pause between tries (about 2.7 s in all).
_REPLACE_ATTEMPTS = 10


def _replace(source: str, target: Path) -> None:
    """`os.replace`, tried again for a moment when Windows says no.

    **On Windows a rename over a file another process has open fails.**
    `os.replace` there raises `PermissionError` (WinError 5 or 32) while
    anything holds the target without FILE_SHARE_DELETE, and two things
    routinely do for a few milliseconds: an antivirus or the search indexer
    scanning the file that was just written, and another copy of this app
    reading `instance.lock` (a second launch, `core/instance_lock.py`). Either
    turned a preference save into a 500 or a launch into a crash, for
    nothing a short wait would not have fixed. Elsewhere a rename never fails
    that way, so the first error is the answer.
    """
    for attempt in range(_REPLACE_ATTEMPTS):
        try:
            os.replace(source, target)
            return
        except PermissionError:
            if sys.platform != "win32" or attempt == _REPLACE_ATTEMPTS - 1:
                raise
            time.sleep(0.05 * (attempt + 1))


def atomic_write_text(path: str | os.PathLike[str], text: str) -> None:
    """Replace `path`'s contents with `text`, atomically."""
    target = Path(path)
    fd, tmp_name = tempfile.mkstemp(
        dir=target.parent, prefix=f".{target.name}.", suffix=".tmp"
    )
    try:
        # UTF-8 always: Windows' default is the ANSI code page, which cannot
        # write every character and reads back differently on another locale.
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        _replace(tmp_name, target)
    except BaseException:
        # A failed write must not leave a stray temp file behind, and must
        # not touch the real file at all.
        try:
            os.unlink(tmp_name)
        except OSError:
            # Best-effort cleanup: do not mask the original write/replace
            # failure if removing the temp file also fails.
            pass
        raise


def atomic_write_json(path: str | os.PathLike[str], data: Any, *, indent: int = 2) -> None:
    """Replace `path`'s contents with `data` as JSON, atomically."""
    atomic_write_text(path, json.dumps(data, indent=indent))
