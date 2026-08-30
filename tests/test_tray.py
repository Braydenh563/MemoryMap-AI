"""The system-tray menu: Open, New note, View Logs, [console], Restart, Quit.

None of this can be driven here — pystray needs a real desktop session and the
menu callbacks close over a pywebview window. What *is* testable is the part
that was actually broken, and it was broken in the one build where nobody would
see it: the packaged Windows app, which has no console to print an error to.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

SOURCE = Path("src/memorymap/__main__.py").read_text(encoding="utf-8")


def _parser() -> argparse.ArgumentParser:
    """The same shape as the real one: flags only, no positionals."""
    parser = argparse.ArgumentParser(prog="memorymap")
    parser.add_argument("--desktop", action="store_true")
    parser.add_argument("--reset-password", action="store_true")
    parser.add_argument("--hidden-relaunch", action="store_true")
    return parser


def test_the_frozen_build_would_die_on_the_old_restart_argv():
    """Why the fix below exists, pinned as an executable fact.

    `os.execv(sys.executable, [sys.executable, *sys.argv])` is correct from
    source, where sys.executable is python.exe and sys.argv[0] is the script.
    In a PyInstaller build **both are the .exe**, so the executable's own path
    arrives as a positional argument.
    """
    frozen_argv = ["MemoryMap.exe", "--desktop"]
    old_style = ["MemoryMap.exe", *frozen_argv]  # execv's argv
    try:
        _parser().parse_args(old_style[1:])
    except SystemExit as exit_:
        assert exit_.code == 2
    else:
        raise AssertionError("expected argparse to reject the duplicated exe path")


def test_the_fixed_argv_parses_in_both_install_types():
    frozen_argv = ["MemoryMap.exe", "--desktop"]
    # Frozen: argv is already correct as-is.
    assert _parser().parse_args(frozen_argv[1:]).desktop is True
    # Source: python.exe plus the script path.
    source_argv = ["/usr/bin/python", "/src/memorymap/__main__.py", "--desktop"]
    assert _parser().parse_args(source_argv[2:]).desktop is True


def test_restart_branches_on_frozen():
    block = SOURCE.split("def _restart(")[1].split("def ")[0]
    assert 'getattr(sys, "frozen", False)' in block
    assert "os.execv(sys.executable, argv)" in block


# --- the menu items ------------------------------------------------------------


def test_the_menu_has_the_items_it_advertises():
    for label in ("Open MemoryMap AI", "New note", "View Logs", "Restart", "Quit"):
        assert f'pystray.MenuItem("{label}"' in SOURCE, label


def test_showing_the_window_also_raises_it():
    """`show()` un-minimises but does not raise or focus, so clicking a menu
    item while the window was merely behind something did nothing visible."""
    for callback in ("_open", "_view_logs", "_new_note"):
        block = SOURCE.split(f"def {callback}(")[1].split("\n    def ")[0]
        assert "_focus_window(window)" in block, callback


def test_no_tray_item_can_reach_past_the_lock_screen():
    """Reported once already for View Logs, which used to open Settings
    unconditionally. Any item that runs JS in the page has to check."""
    for callback in ("_view_logs", "_new_note"):
        block = SOURCE.split(f"def {callback}(")[1].split("\n    def ")[0]
        assert "lock-overlay" in block, callback


def test_quick_capture_targets_an_element_that_exists():
    """The id was wrong first time — `entry-input`, which is not in the page.
    A tray item that focuses nothing looks like it did nothing."""
    block = SOURCE.split("def _new_note(")[1].split("\n    def ")[0]
    ids = re.findall(r"getElementById\('([^']+)'\)", block)
    html = Path("frontend/index.html").read_text(encoding="utf-8")
    for element_id in ids:
        assert f'id="{element_id}"' in html, element_id


def test_a_missing_tray_backend_never_takes_the_launcher_down():
    """pystray picks a backend at import time and that backend's init can raise
    anything — found here as an Xlib error on a headless box. A missing tray
    icon is cosmetic; the window is not."""
    block = SOURCE.split("def _start_tray(")[1].split("\ndef ")[0]
    assert "except ImportError:" in block
    assert "except Exception as exc:" in block
    assert block.count("return None") >= 2
