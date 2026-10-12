"""Environment variables: `TESSELLATE_*`, and the `MEMORYMAP_*` names from
before the rename to Tessellate (INBOX 903), still read.

A `.env` file, a Docker compose file, a shell profile or a desktop shortcut
written before the rename sets `MEMORYMAP_DATA_DIR`; ignoring it would open
an empty notebook beside the person's own. Every read goes through `getenv`,
which takes the new name and falls back to the old one, so the new name wins
when both are set and either alone works.
"""

from __future__ import annotations

import os

NEW_PREFIX = "TESSELLATE_"
OLD_PREFIX = "MEMORYMAP_"  # brand: keep


def old_name(name: str) -> str:
    """`TESSELLATE_PORT` -> `MEMORYMAP_PORT`."""
    if not name.startswith(NEW_PREFIX):
        raise ValueError(f"{name} is not a {NEW_PREFIX} variable")
    return OLD_PREFIX + name[len(NEW_PREFIX):]


def getenv(name: str, default: str | None = None) -> str | None:
    """`os.getenv(name)`, falling back to the variable's old name."""
    value = os.environ.get(name)
    if value is None:
        value = os.environ.get(old_name(name))
    return default if value is None else value


def pop(name: str) -> str | None:
    """Read and remove the variable under both names (a secret, say)."""
    new = os.environ.pop(name, None)
    old = os.environ.pop(old_name(name), None)
    return new if new is not None else old
