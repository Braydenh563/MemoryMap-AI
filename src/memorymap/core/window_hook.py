"""Full screen for the desktop window, registered by the launcher that owns it.

INBOX 426 (z), images 93 and 94: in the desktop window the documents focus
mode's "Fill the whole screen" did nothing. The page asked for the browser's
own full screen (`document.documentElement.requestFullscreen()`), WebView2
granted it to the page, the button turned to "Leave full screen", and the
window stayed exactly as it was: a web view's full screen fills the web view,
and making the window around it fill the monitor is the host's job, which
pywebview does not do. So the window itself is asked, the way the in-app
Quit already asks it to close (see `quit_hook`): the desktop launcher
registers pywebview's `toggle_fullscreen`, `POST /desktop/fullscreen` runs it,
and the page uses that when `GET /desktop/fullscreen` says it is there and
the browser's own API everywhere else.

pywebview has no getter for the state, so it is kept here: every change goes
through `toggle`, which is the only way the app puts the window into full
screen.
"""

from __future__ import annotations

import logging
import threading
from typing import Callable

logger = logging.getLogger(__name__)

_toggle: Callable[[], None] | None = None
_full = False
_lock = threading.Lock()


def set_fullscreen_handler(toggle: Callable[[], None] | None) -> None:
    """Register the window's full-screen toggle (None removes it)."""
    global _toggle, _full
    with _lock:
        _toggle = toggle
        _full = False


def available() -> bool:
    return _toggle is not None


def is_fullscreen() -> bool:
    return _full


def toggle() -> bool | None:
    """Flip the window's full screen. The new state, or None without a window."""
    global _full
    with _lock:
        handler = _toggle
        if handler is None:
            return None
        try:
            handler()
        except Exception:  # noqa: BLE001 - reported to the page as "not available"
            logger.exception("the window's full-screen toggle failed")
            return None
        _full = not _full
        return _full
