"""Single-user unlock (plan Phase 4).

One password (or PIN), bcrypt-hashed in the `users` table. Unlocking
issues a random token the frontend sends back as X-Auth-Token; tokens
live in memory only, so restarting the app locks it again.

Before a password has been set there is nothing to protect (the app is
brand new and empty), so the API stays open and the frontend forces the
setup screen first.
"""

from __future__ import annotations

import secrets

import bcrypt
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.core import vault
from memorymap.core.deps import get_session
from memorymap.core.database import User
from memorymap.entry.manager import log_action

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory sessions: fine for a single-user local app.
_active_tokens: set[str] = set()


class PasswordBody(BaseModel):
    password: str = Field(min_length=4, description="Password or PIN, 4+ characters")


def _get_user(session: Session) -> User | None:
    return session.scalar(select(User))


def require_unlock(
    session: Session = Depends(get_session),
    x_auth_token: str | None = Header(default=None),
) -> None:
    """Dependency that gates every data route once a password exists."""
    if _get_user(session) is None:
        return  # setup not done yet — nothing to protect
    if not x_auth_token or x_auth_token not in _active_tokens:
        raise HTTPException(status_code=401, detail="Locked — unlock first")


def _issue_token() -> str:
    token = secrets.token_hex(32)
    _active_tokens.add(token)
    return token


@router.get("/status")
def status(session: Session = Depends(get_session)) -> dict:
    return {"setup_required": _get_user(session) is None}


@router.post("/setup")
def setup(body: PasswordBody, session: Session = Depends(get_session)) -> dict:
    """First run: create the single user. Refuses to run twice."""
    if _get_user(session) is not None:
        raise HTTPException(status_code=400, detail="A password is already set")
    password_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    session.add(User(username="owner", password_hash=password_hash))
    # Create the vault now, while the password is in hand. Deferring it would
    # mean a second prompt later, and a second chance to lose access.
    vault.create(session, body.password)
    log_action(session, "created", "user", detail="password set")
    session.commit()
    return {"token": _issue_token()}


@router.post("/unlock")
def unlock(body: PasswordBody, session: Session = Depends(get_session)) -> dict:
    user = _get_user(session)
    if user is None:
        raise HTTPException(status_code=400, detail="No password set yet — use setup")
    if not bcrypt.checkpw(body.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="Wrong password")
    # Unwrap the data key so private notes are readable for this session.
    vault_open = vault.open_with(session, body.password)
    log_action(session, "unlocked", "user", user.id)
    session.commit()
    return {"token": _issue_token(), "vault_open": vault_open}


@router.post("/lock")
def lock(x_auth_token: str | None = Header(default=None)) -> dict:
    """Log out: the token stops working immediately."""
    _active_tokens.discard(x_auth_token or "")
    # Forget the data key too, or "lock" would leave private notes readable.
    if not _active_tokens:
        vault.close()
    return {"locked": True}


class ChangePasswordBody(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=4, description="Password or PIN, 4+ characters")


@router.get("/account", dependencies=[Depends(require_unlock)])
def account(session: Session = Depends(get_session)) -> dict:
    """What Settings → Account needs to describe the current state.

    Deliberately says nothing secret: whether a password exists, whether the
    vault is open, and how many sessions are live.
    """
    user = _get_user(session)
    return {
        "configured": user is not None,
        "username": user.username if user else None,
        "created_at": user.created_at.isoformat() if user and user.created_at else None,
        "vault_open": vault.is_open(),
        "vault_exists": vault.exists(session),
        "active_sessions": len(_active_tokens),
    }


@router.post("/change-password", dependencies=[Depends(require_unlock)])
def change_password(
    body: ChangePasswordBody,
    session: Session = Depends(get_session),
    x_auth_token: str | None = Header(default=None),
) -> dict:
    """Change the password, re-wrapping the vault key onto the new one.

    The current password is required even though the caller already holds a
    valid token. The token proves the session is unlocked; it does not prove
    the person at the keyboard knows the password, and this is the one action
    that can lock someone out of their own private notes.

    Order matters. The vault is re-wrapped BEFORE the password hash changes,
    because a failure between the two would otherwise leave a notebook whose
    password no longer opens its own private notes.
    """
    user = _get_user(session)
    if user is None:
        raise HTTPException(status_code=400, detail="No password set yet — use setup")
    if not bcrypt.checkpw(body.current_password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="That isn't your current password")
    if body.current_password == body.new_password:
        raise HTTPException(status_code=400, detail="That's already your password")

    if vault.exists(session) and not vault.is_open():
        # Without the data key in hand the vault cannot be re-wrapped, and
        # changing the password anyway would strand every private note.
        raise HTTPException(
            status_code=409,
            detail="Unlock the app before changing your password, so your "
            "private notes can be moved across to it.",
        )
    if vault.exists(session) and not vault.rewrap(session, body.new_password):
        raise HTTPException(
            status_code=500, detail="Couldn't move your private notes to the new password"
        )

    user.password_hash = bcrypt.hashpw(body.new_password.encode(), bcrypt.gensalt()).decode()
    log_action(session, "edited", "user", user.id, "password changed")
    session.commit()

    # Every other session is invalidated: a password change is exactly when
    # you want anything already open elsewhere to stop working. The caller
    # keeps working via a freshly issued token.
    _active_tokens.discard(x_auth_token or "")
    signed_out = len(_active_tokens)
    _active_tokens.clear()
    return {"changed": True, "token": _issue_token(), "other_sessions_ended": signed_out}


@router.post("/lock-all", dependencies=[Depends(require_unlock)])
def lock_all() -> dict:
    """End every session, including this one. The panic button."""
    ended = len(_active_tokens)
    _active_tokens.clear()
    vault.close()
    return {"locked": True, "sessions_ended": ended}
