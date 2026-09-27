"""The unlocked data key, for as long as the app is unlocked.

The DEK lives here in memory and nowhere else. Locking, restarting, or simply
never unlocking all leave private notes unreadable, which is the intended
behaviour rather than a limitation.

Kept apart from the auth routes so the read/write paths can ask "is the vault
open?" without importing the API layer.
"""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from typing import Iterator

from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.core import crypto
from memorymap.core.database import Vault

# Set on unlock, cleared on lock. Deliberately module-level: this app is
# single-user, and one process holds one notebook, so there is one key.
_dek: bytes | None = None

# **Who may use it** (OPEN.md, auth-optional: "after a LAN device unlocks, a
# loopback session without a password reads private notes too"). Holding the
# key once is right; handing it to every request was not. With sign-in off,
# this computer gets a session without the password, and a phone on the
# network that *did* give it loaded the key for everyone. So the key is now
# granted per session: the tokens of the sessions that proved the password
# (setup, unlock, unlock-vault, and the two account routes that ask for it
# again). `key()` answers a request only for a granted session.
#
# The rule starts with the first grant. A key loaded with nobody granted is
# one opened outside any session (the direct calls tests and scripts make),
# and it behaves as it always did. In the running app the two move together:
# every route that loads the key grants its caller, and the key is forgotten
# when the last granted session ends (`revoke`).
_granted: set[str] = set()

#: The session token of the request being served. Set by
#: `routes_auth.VaultScope`, an ASGI middleware, from the X-Auth-Token header;
#: FastAPI copies the context into the threadpool that runs sync routes and
#: dependencies, and into a streaming body's iterator, so every read on a
#: request's behalf sees it. `_OUTSIDE` is no request at all: a background
#: thread, which is never handed a granted key once a grant exists, because
#: nothing in the background has a reason to read a private note (the AI is
#: kept away from them on purpose).
_OUTSIDE = object()
_request_token: ContextVar[object] = ContextVar("vault_request_token", default=_OUTSIDE)

#: Whether the key now loaded was loaded outside any request: a script's or
#: a test's direct `create`/`open_with`/`set_key`, with no session to grant.
#: Such a key is the process key for every request until the first grant,
#: as it always was. A key loaded *inside* a request (`unlock`, `setup`,
#: `unlock-vault`, the two account routes) is nobody's until granted, so the
#: lines between loading it and granting the caller answer no other request.
_process_key = False


def _loaded() -> None:
    global _process_key
    _process_key = _request_token.get() is _OUTSIDE


def is_open() -> bool:
    """Whether the key is loaded at all, for anyone. The process's answer:
    what a caller may read is `key()`, or `is_granted(token)`."""
    return _dek is not None


def key() -> bytes | None:
    """The key, if the caller may use it (see `_granted`).

    Inside a request (`request_scope`), only a granted session's, whatever
    the grant set holds: an empty set means nobody, never everybody. The
    first version read an empty set as "the rule has not started" and gave
    every request the key, and the app has two gaps where the key is loaded
    with no grant yet (`unlock` loads then grants; `change-password` and
    `rotate-vault-key` clear every grant, then grant the new session), each
    wide enough for a sync route in the threadpool beside it (the review,
    2026-09-26; tests/test_vault_sessions). A key loaded outside any request
    (`_process_key`: a script, a test's direct call) is still every
    request's until the first grant. Outside a request (a background
    thread) the process key is answered until the first grant, and nothing
    after it: the background has no business with a private note once a
    person is reading them.
    """
    if _dek is None:
        return None
    token = _request_token.get()
    if token is _OUTSIDE:
        return None if _granted else _dek
    if isinstance(token, str) and token in _granted:
        return _dek
    return _dek if _process_key and not _granted else None


def grant(token: str | None) -> None:
    """Let this session use the loaded key. Only after the password was checked."""
    if token and _dek is not None:
        _granted.add(token)


def is_granted(token: str | None) -> bool:
    return bool(token) and _dek is not None and token in _granted


def revoke(tokens) -> None:  # noqa: ANN001  # any iterable of tokens
    """These sessions are over. The key goes with the last one granted."""
    global _dek
    had = bool(_granted)
    for token in tokens:
        _granted.discard(token)
    if had and not _granted:
        _dek = None


def revoke_all() -> None:
    """End every grant but keep the key: a password change or a re-key ends
    every other session and grants the new one straight after."""
    _granted.clear()


@contextmanager
def request_scope(token: str | None) -> Iterator[None]:
    """Serve one request as the session `token` (None: a request with none)."""
    reset = _request_token.set(token)
    try:
        yield
    finally:
        _request_token.reset(reset)


def close() -> None:
    """Forget the key and every grant. Called on lock and by tests."""
    global _dek
    _dek = None
    _granted.clear()


def _row(session: Session) -> Vault | None:
    return session.scalar(select(Vault))


def exists(session: Session) -> bool:
    return _row(session) is not None


def create(session: Session, password: str) -> None:
    """Set up the vault on first run, and open it.

    Called from setup, so a notebook always has somewhere to put a private
    note: asking the user to "enable encryption" later would mean a second
    password prompt and a second chance to lose access.
    """
    global _dek
    if _row(session) is not None:
        return
    salt = crypto.new_salt()
    dek = crypto.new_dek()
    session.add(Vault(kdf_salt=salt, wrapped_dek=crypto.wrap_dek(dek, password, salt)))
    session.flush()
    _dek = dek
    _loaded()


def open_with(session: Session, password: str) -> bool:
    """Unwrap the DEK on unlock. False if there's no vault or it won't open.

    A notebook created before this feature existed has no vault row; one is
    created on the next unlock so private notes work from then on, without
    touching anything already written.
    """
    global _dek
    row = _row(session)
    if row is None:
        create(session, password)
        return True
    try:
        _dek = crypto.unwrap_dek(bytes(row.wrapped_dek), password, bytes(row.kdf_salt))
        _loaded()
    except crypto.DecryptionError:
        _dek = None
        return False
    return True


def set_key(dek: bytes) -> None:
    """Replace the in-memory DEK after a key rotation.

    Only ever called AFTER the rotation's database commit has already
    succeeded. Swapping the key first, or on any path that might still
    fail: would leave memory holding a key that disagrees with what is
    actually on disk if the process died between the two.
    """
    global _dek
    _dek = dek
    _loaded()


def rewrap(session: Session, new_password: str) -> bool:
    """Point the vault at a new password. Notes are never re-encrypted.

    Only possible while unlocked, because the DEK has to be in hand, which
    also means a password change can't be used to lock yourself out.
    """
    row = _row(session)
    if row is None or _dek is None:
        return False
    salt = crypto.new_salt()
    row.kdf_salt = salt
    row.wrapped_dek = crypto.wrap_dek(_dek, new_password, salt)
    return True
