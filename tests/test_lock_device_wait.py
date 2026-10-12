"""A new phone's unlock waits for Allow by itself (lansafe-1011's leftover:
"The phone's lock screen does not retry by itself after Allow: the server
holds the request 45 s, then says to press Unlock again").

The server half is `routes_auth._hold_new_device`: a 403 whose body carries
`device_pending: true`. The client half (settings-wiring.js `lockRequest`)
asks again while that flag comes back, for up to three minutes, and stops the
moment the password field is edited. Driven in Chromium by
`scratchpad/ui-sweeps/iphone1011.js` (the lock section); held here from the
source, since the suite has no browser.
"""

from __future__ import annotations

from pathlib import Path

JS = Path(__file__).resolve().parents[1] / "frontend" / "js"


def _function(file: str, name: str) -> str:
    source = (JS / file).read_text(encoding="utf-8")
    start = source.index(f"function {name}(")
    end = source.find("\n}\n", start)
    return source[start:end]


def test_the_api_error_carries_the_whole_refusal_body():
    """`device_pending` sits beside `detail`, so the error has to carry the
    body, not only its `detail` string."""
    assert "error.body = detail;" in (JS / "app.js").read_text(encoding="utf-8")


def test_the_lock_form_waits_while_the_device_is_pending():
    body = _function("settings-wiring.js", "lockRequest")
    assert "device_pending" in body
    assert "LOCK_DEVICE_WAIT_MS" in body
    assert '$("lock-password").value === password' in body, "an edited field stops the wait"
    assert "setTimeout" in body, "a full wait queue answers at once; the retry pauses"
    assert "lockRequest(mode, password" in _function("settings-wiring.js", "submitLockForm")


def test_the_server_still_marks_a_held_device():
    source = (Path(__file__).resolve().parents[1] / "src/tessellate/api/routes_auth.py").read_text(encoding="utf-8")
    assert '"device_pending": decision is None' in source
