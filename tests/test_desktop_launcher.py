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
    """`_run_desktop` starts uvicorn on a background thread and sleeps a
    second to let it bind. Neither is needed to test the window setup."""
    monkeypatch.setattr(launcher, "_run_server", lambda: None)
    monkeypatch.setattr(launcher.time, "sleep", lambda seconds: None)


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


def test_desktop_launcher_degrades_if_icon_kwarg_is_unsupported(monkeypatch, tmp_path):
    """An older pywebview without `icon=` must not crash the launcher — the
    desktop app is the only way in for someone who installed it that way."""
    monkeypatch.setenv("MEMORYMAP_DATA_DIR", str(tmp_path))
    _quiet_server_thread(monkeypatch)
    calls = _fake_webview(monkeypatch, icon_kwarg_supported=False)

    launcher._run_desktop()  # must not raise, even though start() TypeErrors once

    assert calls["start"] is not None
