"""`MEMORYMAP_FIRST_PASSWORD`: a password for a notebook that has none (Docker).

A fresh container has no password and no console to type one into. The
variable is read once at launch and used only when no user row exists, so it
can never change or reset a password that is already set. It is never logged,
not even its length, and is removed from this process's environment once read
so a child process (a tool, a model runner) does not inherit it.
"""

from __future__ import annotations

import logging
import os

ENV = "MEMORYMAP_FIRST_PASSWORD"
logger = logging.getLogger("memorymap.launcher")


def take_from_env() -> str | None:
    """The variable's value (then unset), or None when absent or blank."""
    value = os.environ.pop(ENV, None)
    if value is None or not value.strip():
        return None
    return value


def seed(db, password: str | None) -> str:  # noqa: ANN001  # a DatabaseManager
    """Create the owner with `password` when none exists. Returns what happened:
    "seeded", "already-set", "none" (no value given) or "refused" (too weak)."""
    if not password:
        return "none"
    from sqlalchemy import select

    from memorymap.api import routes_auth
    from memorymap.core import vault
    from memorymap.core.database import User

    with db.session() as session:
        if session.scalar(select(User.id).limit(1)) is not None:
            return "already-set"
        if routes_auth._new_password_problem(password):
            logger.warning(
                "%s was not used: it does not meet the password rules. "
                "Set a password in the browser instead.", ENV
            )
            return "refused"
        session.add(User(username="owner", password_hash=routes_auth._hash_password(password)))
        vault.create(session, password)
        session.commit()
        vault.close()  # `create` leaves the key open; no session holds it yet
    return "seeded"
