"""WebView2 Runtime detection: the reported cause of "this graphic doesnt
show" on a packaged .exe, unverified against a real Windows machine (see
`_webview2_runtime_missing`'s own docstring for the reasoning and the
Microsoft docs it follows).

This suite fakes `sys.platform` and `winreg` rather than requiring Windows:
what is under test is the function's own logic (which registry locations it
tries, what a present or absent `pv` value means, that nothing it does can
raise), not the registry itself.
"""

from __future__ import annotations

import sys
import types

import pytest


@pytest.fixture
def main_module(monkeypatch):
    """Import memorymap.__main__ fresh each time, so per-test winreg fakes
    do not leak between cases through Python's module cache.
    """
    monkeypatch.setattr(sys, "argv", ["memorymap"])
    for name in list(sys.modules):
        if name == "memorymap.__main__" or name.startswith("memorymap.__main__."):
            del sys.modules[name]
    import memorymap.__main__ as m

    return m


def test_never_true_off_windows(monkeypatch, main_module):
    monkeypatch.setattr(sys, "platform", "linux")
    assert main_module._webview2_runtime_missing() is False


def test_never_raises_off_windows_even_with_no_winreg(monkeypatch, main_module):
    monkeypatch.setattr(sys, "platform", "darwin")
    # No winreg module needed at all on a platform this never checks.
    main_module._webview2_runtime_missing()


def _fake_winreg(present_at=None):
    """A minimal winreg stand-in. `present_at` is `(hive, subkey)` of the one
    location, if any, that answers with a real version string.
    """
    fake = types.ModuleType("winreg")
    fake.HKEY_LOCAL_MACHINE = "HKLM"
    fake.HKEY_CURRENT_USER = "HKCU"

    class _Ctx:
        def __init__(self, hive, subkey):
            self.hive, self.subkey = hive, subkey

        def __enter__(self):
            if present_at and (self.hive, self.subkey) == present_at:
                return object()
            raise OSError("key not found")

        def __exit__(self, *exc):
            return False

    fake.OpenKey = lambda hive, subkey: _Ctx(hive, subkey)
    fake.QueryValueEx = lambda key, name: ("136.0.1.2", 1)
    return fake


def test_true_when_absent_from_every_registry_location(monkeypatch, main_module):
    monkeypatch.setattr(sys, "platform", "win32")
    monkeypatch.setitem(sys.modules, "winreg", _fake_winreg(present_at=None))
    assert main_module._webview2_runtime_missing() is True


@pytest.mark.parametrize(
    "hive, subkey_suffix",
    [
        (
            "HKLM",
            "SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\"
            "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
        ),
        (
            "HKLM",
            "SOFTWARE\\Microsoft\\EdgeUpdate\\Clients\\"
            "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
        ),
        (
            "HKCU",
            "SOFTWARE\\Microsoft\\EdgeUpdate\\Clients\\"
            "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
        ),
    ],
)
def test_false_when_present_at_any_of_the_three_locations(
    monkeypatch, main_module, hive, subkey_suffix
):
    monkeypatch.setattr(sys, "platform", "win32")
    monkeypatch.setitem(
        sys.modules, "winreg", _fake_winreg(present_at=(hive, subkey_suffix))
    )
    assert main_module._webview2_runtime_missing() is False


def test_an_empty_version_string_still_counts_as_missing(monkeypatch, main_module):
    """A key that exists but carries no real version is not a runtime you can
    launch a window against; this is the one shape worth a fixture of its
    own rather than leaving it to the "not found" case above.
    """
    monkeypatch.setattr(sys, "platform", "win32")
    fake = _fake_winreg(
        present_at=(
            "HKLM",
            "SOFTWARE\\Microsoft\\EdgeUpdate\\Clients\\"
            "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
        )
    )
    fake.QueryValueEx = lambda key, name: ("   ", 1)
    monkeypatch.setitem(sys.modules, "winreg", fake)
    assert main_module._webview2_runtime_missing() is True


def test_a_broken_registry_call_answers_false_not_a_crash(monkeypatch, main_module):
    """The detector's own job is to add a clear message, never a new way to
    fail to start; an unexpected exception from the registry call must fall
    back to "try to start normally", the behaviour before this existed.
    """
    monkeypatch.setattr(sys, "platform", "win32")
    fake = types.ModuleType("winreg")
    fake.HKEY_LOCAL_MACHINE = "HKLM"
    fake.HKEY_CURRENT_USER = "HKCU"

    def _boom(*a, **k):
        raise RuntimeError("not the OSError this function expects to catch")

    fake.OpenKey = _boom
    monkeypatch.setitem(sys.modules, "winreg", fake)
    assert main_module._webview2_runtime_missing() is False


def test_warn_never_raises_even_with_no_ctypes_support(monkeypatch, main_module):
    """`_warn_webview2_missing` is called from inside a launcher that has
    already decided the window cannot come up; it must not itself crash the
    process it is trying to explain something to.
    """

    # AttributeError, the error `ctypes.windll` really raises off Windows, and
    # the one `__getattr__` is expected to raise (CodeQL
    # py/unexpected-raise-in-special-method, alert 423).
    class _BoomModule:
        def __getattr__(self, name):
            raise AttributeError(f"no {name} here")

    monkeypatch.setitem(sys.modules, "ctypes", _BoomModule())
    main_module._warn_webview2_missing()
