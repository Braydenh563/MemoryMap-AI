"""How the running app quits itself, registered by whoever started it.

`POST /shutdown` (routes_tasks.py) used to stop the process by sending it
SIGINT, the signal Ctrl+C sends. That is right for the plain server, where
uvicorn owns the main thread and turns SIGINT into its normal graceful
shutdown. It did nothing in the desktop window: there uvicorn runs on a
daemon thread and the main thread sits inside the window toolkit's native
event loop, which does not run Python's signal handler, and on Windows a
process started without a console cannot deliver a Ctrl+C event to itself
at all. Reported as "the quit memorymap button doesnt work anymore", "I cant
close the app": the confirm dialog closed and the app stayed.

So the launcher that owns the process says how it ends. The desktop launcher
registers the same close the tray's Quit already uses (stop the background
work, destroy the window, exit); anything that registers nothing keeps the
SIGINT path.
"""

from __future__ import annotations

import logging
from typing import Callable

logger = logging.getLogger(__name__)

_handler: Callable[[], None] | None = None


def set_quit_handler(handler: Callable[[], None] | None) -> None:
    """Register how this process quits (None restores the default)."""
    global _handler
    _handler = handler


def request_quit() -> bool:
    """Run the registered quit, if there is one. True when one ran."""
    handler = _handler
    if handler is None:
        return False
    try:
        handler()
    except Exception:  # noqa: BLE001 - a failed hook falls back to the signal
        logger.exception("the registered quit handler failed; falling back to SIGINT")
        return False
    return True
