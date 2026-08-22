"""The desktop window's taskbar icon (Windows only).

Windows groups the taskbar by AppUserModelID, and a Python-hosted process
inherits Python's — which is why the window's own icon can be set correctly
and the taskbar still shows the snake. `_run_desktop` sets an explicit
AppUserModelID to fix that, but only ever on Windows: `ctypes.windll` does
not exist anywhere else, so an unguarded call would be an AttributeError at
import time on every other platform this app runs on.

This suite cannot run on Windows, so it cannot prove the fix *works* there —
only that the branch is genuinely gated by `sys.platform`, not merely
swallowed by the surrounding try/except, and that the launcher still starts
cleanly on the platform this sandbox actually has.
"""

from __future__ import annotations

import os
import sys
import types

import pytest

import memorymap.__main__ as launcher


@pytest.fixture(autouse=True)
def _restore_desktop_env_var():
    """`_run_desktop` sets `MEMORYMAP_DESKTOP=1` directly on `os.environ`
    (§35E — test_file_save.py keys export behaviour off it), not through
    `monkeypatch`. `monkeypatch.delenv(..., raising=False)` looks like the
    right guard but is a no-op when the var is already absent — it only
    records an undo step for a key it actually deletes — so it would NOT
    have caught this: it silently missed the leak in an earlier version of
    this file, and MEMORYMAP_DESKTOP=1 stayed set for every test that ran
    afterwards in the same process. This restores the exact pre-test value
    (present or absent) no matter what the launcher does to it.
    """
    original = os.environ.get("MEMORYMAP_DESKTOP")
    yield
    if original is None:
        os.environ.pop("MEMORYMAP_DESKTOP", None)
    else:
        os.environ["MEMORYMAP_DESKTOP"] = original


def _fake_webview(monkeypatch, *, icon_kwarg_supported=True):
    """A stand-in for the optional `pywebview` package, which isn't
    installed here (CLAUDE.md's dependency list deliberately omits it)."""
    calls = {"create_window": None, "start": None}

    def create_window(title, url, **kwargs):
        calls["create_window"] = {"title": title, "url": url, "kwargs": kwargs}

    def start(**kwargs):
        if not icon_kwarg_supported and "icon" in kwargs:
            raise TypeError("start() got an unexpected keyword argument 'icon'")
        calls["start"] = kwargs

    fake = types.ModuleType("webview")
    fake.create_window = create_window
    fake.start = start
    monkeypatch.setitem(sys.modules, "webview", fake)
    return calls


def _quiet_server_thread(monkeypatch):
    """`_run_desktop` starts uvicorn on a background thread and waits for it
    to actually start accepting connections. Neither is needed to test the
    window setup — and since `_run_server` is mocked to a no-op below,
    nothing real is ever listening on HOST:PORT for `_wait_for_server`'s own
    poll loop to find, which would otherwise burn its whole real-time
    timeout on every test that uses this fixture."""
    monkeypatch.setattr(launcher, "_run_server", lambda: None)
    monkeypatch.setattr(launcher, "_wait_for_server", lambda timeout=20.0: True)


def test_wait_for_server_returns_once_something_is_actually_listening(monkeypatch):
    """The desktop window used to open after a flat `time.sleep(1.0)` guess
    at how long uvicorn takes to bind — reported directly as a black screen
    on startup on a cold/slow start that took longer than that. This proves
    the replacement polls a real socket rather than guessing: it returns
    False while nothing is listening on that port, and True as soon as
    something is."""
    import socket

    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.bind(("127.0.0.1", 0))
    host, port = listener.getsockname()
    monkeypatch.setattr(launcher, "HOST", host)
    monkeypatch.setattr(launcher, "PORT", port)

    # Bound but not listening yet: connections are refused.
    assert launcher._wait_for_server(timeout=0.3) is False

    listener.listen(1)
    try:
        assert launcher._wait_for_server(timeout=2.0) is True
    finally:
        listener.close()


def test_windows_only_branch_is_not_taken_on_this_platform(monkeypatch, tmp_path):
    """The AppUserModelID call is gated by `sys.platform == "win32"`, not
    merely caught if it fails — proven by installing a fake `ctypes.windll`
    that WOULD succeed if called, and asserting it never is, here on Linux.
    """
    assert sys.platform != "win32", "this test's premise requires a non-Windows sandbox"

    called = {"set_app_id": False}

    class _FakeShell32:
        @staticmethod
        def SetCurrentProcessExplicitAppUserModelID(app_id):
            called["set_app_id"] = True

    class _FakeWindll:
        shell32 = _FakeShell32

    import ctypes

    monkeypatch.setattr(ctypes, "windll", _FakeWindll, raising=False)
    monkeypatch.setenv("MEMORYMAP_DATA_DIR", str(tmp_path))
    _quiet_server_thread(monkeypatch)
    _fake_webview(monkeypatch)

    launcher._run_desktop()  # must not raise

    assert called["set_app_id"] is False


def test_desktop_launcher_still_starts_the_window(monkeypatch, tmp_path):
    """Sanity check for the rest of `_run_desktop`, so a future edit to the
    icon/AppUserModelID block can't silently break window creation itself."""
    monkeypatch.setenv("MEMORYMAP_DATA_DIR", str(tmp_path))
    _quiet_server_thread(monkeypatch)
    calls = _fake_webview(monkeypatch)

    launcher._run_desktop()

    assert calls["create_window"] is not None
    assert calls["create_window"]["title"] == "MemoryMap AI"
    assert calls["start"] is not None


def test_tray_is_not_attempted_on_this_non_windows_platform(monkeypatch, tmp_path):
    """`_start_tray` runs pystray's event loop off the main thread, which its
    own docstring says only Windows' backend is known to tolerate (macOS was
    excluded from the desktop build for exactly this reason, and Linux's
    GTK-based backend has the same main-thread-only constraint as macOS's
    AppKit). The call is gated by `sys.platform == "win32"`, not merely
    left to fail safely if attempted — proven here by making `_start_tray`
    itself raise if it's ever called, on this non-Windows sandbox.
    """
    assert sys.platform != "win32", "this test's premise requires a non-Windows sandbox"

    def _explode(window, icon_path):
        raise AssertionError("_start_tray must not be called on this platform")

    monkeypatch.setattr(launcher, "_start_tray", _explode)
    monkeypatch.setenv("MEMORYMAP_DATA_DIR", str(tmp_path))
    _quiet_server_thread(monkeypatch)
    _fake_webview(monkeypatch)

    launcher._run_desktop()  # must not raise


def test_the_taskbar_icon_is_a_png_on_linux_not_the_windows_ico(monkeypatch, tmp_path):
    """GdkPixbuf (Linux's icon loader, via GTK) was never actually run
    against the .ico this app ships for Windows/macOS — icon-512.png is the
    one format confirmed to exist and that every platform accepts, so Linux
    gets that one instead of gambling on the untested format."""
    assert sys.platform.startswith("linux"), "this test's premise requires a Linux sandbox"

    monkeypatch.setenv("MEMORYMAP_DATA_DIR", str(tmp_path))
    _quiet_server_thread(monkeypatch)
    calls = _fake_webview(monkeypatch)

    launcher._run_desktop()

    icon = calls["create_window"]["kwargs"].get("icon") or calls["start"].get("icon")
    assert icon is not None
    assert icon.endswith("icon-512.png")


def test_desktop_launcher_degrades_if_icon_kwarg_is_unsupported(monkeypatch, tmp_path):
    """An older pywebview without `icon=` must not crash the launcher — the
    desktop app is the only way in for someone who installed it that way."""
    monkeypatch.setenv("MEMORYMAP_DATA_DIR", str(tmp_path))
    _quiet_server_thread(monkeypatch)
    calls = _fake_webview(monkeypatch, icon_kwarg_supported=False)

    launcher._run_desktop()  # must not raise, even though start() TypeErrors once

    assert calls["start"] is not None


# --- the tray's "Hide console window" item ----------------------------------
#
# `_start_tray` itself is not gated by sys.platform (its caller is), so
# unlike the AppUserModelID/pystray-event-loop branches above, this can be
# called directly here with fake pystray/PIL/ctypes.windll stand-ins — this
# sandbox still can't prove a real Windows console actually hides, but it can
# prove the menu item is built (or skipped) correctly and drives the right
# Win32 call with the right flag.


def _fake_pystray_and_pil(monkeypatch):
    created = {}

    class FakeMenuItem:
        def __init__(self, text, action, default=False, checked=None):
            self.text = text
            self.action = action
            self.checked = checked

    class FakeMenu:
        def __init__(self, *items):
            self.items = items

    class FakeIcon:
        def __init__(self, name, image, title, menu):
            created["menu"] = menu

        def run(self):
            pass

        def stop(self):
            pass

    fake_pystray = types.ModuleType("pystray")
    fake_pystray.MenuItem = FakeMenuItem
    fake_pystray.Menu = FakeMenu
    fake_pystray.Icon = FakeIcon
    monkeypatch.setitem(sys.modules, "pystray", fake_pystray)

    fake_image_mod = types.ModuleType("PIL.Image")
    fake_image_mod.new = lambda *a, **k: object()
    fake_image_mod.open = lambda *a, **k: object()
    fake_pil = types.ModuleType("PIL")
    fake_pil.Image = fake_image_mod
    monkeypatch.setitem(sys.modules, "PIL", fake_pil)
    monkeypatch.setitem(sys.modules, "PIL.Image", fake_image_mod)

    return created


def _fake_window():
    return types.SimpleNamespace(show=lambda: None, evaluate_js=lambda js: None)


def test_tray_hide_console_item_toggles_a_real_console_window(monkeypatch, tmp_path):
    import ctypes

    show_window_calls = []
    fake_windll = types.SimpleNamespace(
        kernel32=types.SimpleNamespace(GetConsoleWindow=lambda: 12345),
        user32=types.SimpleNamespace(
            ShowWindow=lambda hwnd, flag: show_window_calls.append((hwnd, flag))
        ),
    )
    monkeypatch.setattr(ctypes, "windll", fake_windll, raising=False)
    created = _fake_pystray_and_pil(monkeypatch)

    icon = launcher._start_tray(_fake_window(), tmp_path / "missing.ico")
    assert icon is not None

    items = {item.text: item for item in created["menu"].items}
    hide_item = items["Hide console window"]
    assert hide_item.checked(None) is False

    hide_item.action(icon, hide_item)
    assert show_window_calls == [(12345, 0)]  # SW_HIDE
    assert hide_item.checked(None) is True

    hide_item.action(icon, hide_item)
    assert show_window_calls[-1] == (12345, 5)  # SW_SHOW
    assert hide_item.checked(None) is False


def test_tray_has_no_hide_console_item_without_a_real_console(monkeypatch, tmp_path):
    """The packaged installer's PyInstaller build sets console=False, so
    GetConsoleWindow() returns NULL there — nothing to hide, and the menu
    item asked for a way to bring back must not appear with no console to
    bring back."""
    import ctypes

    fake_windll = types.SimpleNamespace(
        kernel32=types.SimpleNamespace(GetConsoleWindow=lambda: 0),
        user32=types.SimpleNamespace(ShowWindow=lambda hwnd, flag: None),
    )
    monkeypatch.setattr(ctypes, "windll", fake_windll, raising=False)
    created = _fake_pystray_and_pil(monkeypatch)

    launcher._start_tray(_fake_window(), tmp_path / "missing.ico")

    texts = [item.text for item in created["menu"].items]
    assert "Hide console window" not in texts
    assert texts == ["Open MemoryMap AI", "View Logs", "Restart", "Quit"]
