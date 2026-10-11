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

**The key is one this process invents** (`secrets.token_bytes`, never written
to disk): the app keeps no other signing secret, and a session token, the
vault's key and every other grant already end with the process, so a token that
ends with it loses nothing. Locking the notebook replaces the key too
(`rotate`), so a notification left on screen cannot act on a locked notebook.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import time

#: The two things a notification may do, in the order the signature names them.
ACTIONS = ("done", "snooze")
#: How long a notification's buttons keep working.
TTL_SECONDS = 24 * 60 * 60

_key: bytes = secrets.token_bytes(32)


def rotate() -> None:
    """Forget every token handed out so far (the notebook was locked)."""
    global _key
    _key = secrets.token_bytes(32)


def _sign(reminder_id: int, expires: int) -> str:
    message = f"reminder:{int(reminder_id)}:{int(expires)}:{','.join(ACTIONS)}".encode()
    return hmac.new(_key, message, hashlib.sha256).hexdigest()


def mint(reminder_id: int, now: float | None = None) -> dict[str, object]:
    """A token for `reminder_id`, and when it stops working (epoch seconds)."""
    expires = int((time.time() if now is None else now) + TTL_SECONDS)
    return {"token": f"{int(reminder_id)}.{expires}.{_sign(reminder_id, expires)}", "expires_at": expires}


def verify(token: str | None, reminder_id: int, action: str, now: float | None = None) -> bool:
    """Whether `token` lets its holder do `action` to `reminder_id` right now.

    Every failure is the same False: a malformed token, another reminder's, an
    expired one, a bad signature and an action outside `ACTIONS` all answer
    alike, so the caller learns nothing about which part was wrong.
    """
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
