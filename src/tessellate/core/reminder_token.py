"""A token that can finish or snooze one reminder, and nothing else.

A reminder's system notification carries Done and Snooze buttons that must work
after the tab is closed, so the service worker has to be able to act with no
page. It used to carry the person's full session token in the notification's
`data`, which sits in the browser's notification store: anyone who could read
that store held a key to the whole notebook until the session ended.

Now the server hands the page a token scoped to one reminder and two actions
(`done`, `snooze`), valid for 24 hours: a keyed hash (HMAC-SHA256) over the
reminder id, the expiry and the action list. It reads nothing, it names no
other reminder, and a forged or edited one fails the check.

**The key outlives the process (Brief 101b).** It used to be one the process
invented and never wrote down, so a restart (an update, a crash, the desktop
app closing and opening) silently ended the buttons of every notification
still on screen. Now it is kept in `reminder_token.key` in the data folder
(owner-only), beside the notes it can already reach, and read again at the
next start. A token still names one reminder and two actions and ends after
24 hours; what it can do is no wider than before. Locking the notebook
replaces the key (`rotate`), so a notification left on screen cannot act on a
locked notebook; a lock is the person's word, a restart is not.

Callers that pass no `data_dir` (the unit tests of the token itself) get the
old behaviour: a key held in memory only.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import time
from pathlib import Path

#: The two things a notification may do, in the order the signature names them.
ACTIONS = ("done", "snooze")
#: How long a notification's buttons keep working.
TTL_SECONDS = 24 * 60 * 60

KEY_FILE = "reminder_token.key"

_key: bytes = secrets.token_bytes(32)
#: The data folder `_key` was read from or written to; a different folder (a
#: second notebook opened, a test's fresh one) loads its own key.
_loaded_from: Path | None = None


def _write(path: Path, key: bytes) -> None:
    """The key to `path`, readable by its owner only, replaced whole."""
    scratch = path.with_name(path.name + ".tmp")
    fd = os.open(scratch, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="ascii") as handle:
        handle.write(key.hex())
    os.replace(scratch, path)


def _use(data_dir: str | os.PathLike[str] | None) -> None:
    """Point `_key` at the key kept in `data_dir`, making one the first time.
    A file that is missing, short or unreadable is replaced: the worst case
    is the old behaviour, buttons that end, never a token that cannot be
    checked."""
    global _key, _loaded_from
    if data_dir is None:
        return
    folder = Path(data_dir)
    if _loaded_from == folder:
        return
    path = folder / KEY_FILE
    try:
        key = bytes.fromhex(path.read_text(encoding="ascii").strip())
    except (OSError, ValueError):
        key = b""
    if len(key) != 32:
        key = secrets.token_bytes(32)
        try:
            _write(path, key)
        except OSError:
            pass  # a key that cannot be saved still works for this run
    _key = key
    _loaded_from = folder


def rotate(data_dir: str | os.PathLike[str] | None = None) -> None:
    """Forget every token handed out so far (the notebook was locked)."""
    global _key, _loaded_from
    _key = secrets.token_bytes(32)
    _loaded_from = None
    if data_dir is not None:
        try:
            _write(Path(data_dir) / KEY_FILE, _key)
            _loaded_from = Path(data_dir)
        except OSError:
            pass  # rotated in memory; the old file is unusable without the old key


def forget_process() -> None:
    """Drop what this process holds, as a restart does (tests, app reset)."""
    global _key, _loaded_from
    _key = secrets.token_bytes(32)
    _loaded_from = None


def _sign(reminder_id: int, expires: int) -> str:
    message = f"reminder:{int(reminder_id)}:{int(expires)}:{','.join(ACTIONS)}".encode()
    return hmac.new(_key, message, hashlib.sha256).hexdigest()


def mint(reminder_id: int, now: float | None = None, data_dir: str | os.PathLike[str] | None = None) -> dict[str, object]:
    """A token for `reminder_id`, and when it stops working (epoch seconds)."""
    _use(data_dir)
    expires = int((time.time() if now is None else now) + TTL_SECONDS)
    return {"token": f"{int(reminder_id)}.{expires}.{_sign(reminder_id, expires)}", "expires_at": expires}


def verify(
    token: str | None, reminder_id: int, action: str, now: float | None = None,
    data_dir: str | os.PathLike[str] | None = None,
) -> bool:
    """Whether `token` lets its holder do `action` to `reminder_id` right now.

    Every failure is the same False: a malformed token, another reminder's, an
    expired one, a bad signature and an action outside `ACTIONS` all answer
    alike, so the caller learns nothing about which part was wrong.
    """
    _use(data_dir)
    if action not in ACTIONS or not isinstance(token, str) or len(token) > 200:
        return False
    try:
        rid_text, exp_text, signature = token.split(".")
        rid, expires = int(rid_text), int(exp_text)
    except ValueError:
        return False
    if rid != reminder_id or expires < (time.time() if now is None else now):
        return False
    return hmac.compare_digest(signature.encode(), _sign(rid, expires).encode())
