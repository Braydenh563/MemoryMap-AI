"""Which address the server listens on, and what that means for the receipt.

The launcher binds 127.0.0.1: nothing on the network can reach the app.
The privacy receipt says so from here rather than assuming it, and the
launcher records the address it actually bound (`set_current`), so the
receipt reports what happened, not what the default is.
"""

from __future__ import annotations

from memorymap.core.config import ConfigManager

LOOPBACK = "127.0.0.1"

_current: str | None = None


def set_current(host: str) -> None:
    """Called by the launcher with the address uvicorn is about to bind."""
    global _current
    _current = host


def current() -> str:
    return _current or LOOPBACK


def _is_loopback(host: str) -> bool:
    return host in ("127.0.0.1", "::1", "localhost")


def describe(config: ConfigManager) -> dict:
    host = current()
    return {
        "host": host,
        "other_devices": not _is_loopback(host),
    }
