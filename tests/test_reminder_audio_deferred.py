"""The reminder chime's AudioContext is not built inside the first gesture.

Performance pass, 2026-10-03 (INBOX 441, item 6). `new AudioContext()` opens the
audio device synchronously, and as the session's first pointerdown it was the
longest script on the lock screen: 44 to 56 ms of the unlock click's handlers,
measured with an event-timing observer (`scratchpad/ui-sweeps` boot, headless
Chromium). It is built when the browser is idle just after the gesture; the
listeners stay on until the context is running so a browser that wants the
gesture itself can still resume it.

The suite cannot see a browser, so this pins the shape of the source: the
constructor sits in a deferred callback, and the listeners are not `once`.
"""

from __future__ import annotations

import re

from tests._app_js import JS_DIR


def _prime_function() -> str:
    text = (JS_DIR / "status.js").read_text(encoding="utf-8")
    start = text.index("function primeReminderAudio()")
    return text[start : text.index("\nfunction playReminderChime", start)]


def test_the_context_is_built_in_a_deferred_callback_not_in_the_gesture():
    body = _prime_function()
    constructor = body.index("new (window.AudioContext")
    before = body[:constructor]
    assert "const build = () =>" in before, "the constructor must sit inside a deferred `build`"
    assert "requestIdleCallback" in body and "setTimeout(build" in body


def test_the_gesture_listeners_stay_on_until_the_context_is_running():
    text = (JS_DIR / "status.js").read_text(encoding="utf-8")
    listeners = re.findall(r'document\.addEventListener\("(?:pointerdown|keydown)", primeReminderAudio, (\{[^}]*\})', text)
    assert len(listeners) == 2
    assert all("once" not in options for options in listeners), listeners
    assert 'removeEventListener("pointerdown", primeReminderAudio)' in text
