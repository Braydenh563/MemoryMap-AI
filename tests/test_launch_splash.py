"""The launcher's pre-Python splash, and its handoff to the app window.

Reported directly: the work start.bat does before Python exists — the git
pull, building .venv, a pip install that can run to minutes — leaves nothing
on screen, so *"the user doesn't think the application didn't start properly
because they didn't have access to the terminal logs"*.

The splash itself is a PowerShell/WinForms window and cannot be exercised
here. What is testable, and what actually breaks, is the contract between the
three pieces: the launcher creates a status file, the splash watches it, and
this process deletes it at exactly the right moment. A splash that is never
closed is worse than no splash — it is a borderless always-on-top window with
no owner, sitting over the app.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

from memorymap import __main__ as launcher

REPO = Path(__file__).resolve().parents[1]


def test_closing_the_splash_deletes_the_file_the_launcher_named(tmp_path, monkeypatch):
    marker = tmp_path / "splash.txt"
    marker.write_text("Installing dependencies...")
    monkeypatch.setenv("MM_SPLASH_FILE", str(marker))

    launcher._close_launch_splash()

    assert not marker.exists()


def test_closing_the_splash_twice_is_not_an_error(tmp_path, monkeypatch):
    """The launcher deletes it on its own way out too, so a double delete is
    an ordinary race rather than a fault."""
    marker = tmp_path / "splash.txt"
    marker.write_text("x")
    monkeypatch.setenv("MM_SPLASH_FILE", str(marker))

    launcher._close_launch_splash()
    launcher._close_launch_splash()  # must not raise


def test_no_splash_running_is_not_an_error(monkeypatch):
    """Browser mode, a machine with no PowerShell, or a locked-down execution
    policy all reach this with the variable unset."""
    monkeypatch.delenv("MM_SPLASH_FILE", raising=False)
    launcher._close_launch_splash()


def test_an_unwritable_path_does_not_stop_the_launch(monkeypatch):
    monkeypatch.setenv("MM_SPLASH_FILE", os.path.join(os.sep, "nope", "nope.txt"))
    launcher._close_launch_splash()


# --- the launcher's half of the contract ---------------------------------------


def _start_bat() -> str:
    return (REPO / "start.bat").read_text(encoding="utf-8", errors="replace")


def test_the_launcher_opens_the_splash_before_any_slow_work():
    """It has to go up before the git pull, not after — the whole point is the
    seconds-to-minutes before anything else appears."""
    text = _start_bat()
    # The invocation, not the comment above it that also names the file.
    splash_at = text.index("start \"\" /b powershell")
    assert splash_at < text.index("git -c http.lowSpeedLimit")
    assert splash_at < text.index("pip install -r requirements.txt")


def test_every_exit_path_takes_the_splash_down():
    """A window with no owner left on the desktop is the failure that matters."""
    text = _start_bat()
    # Browser mode closes it itself; the end-of-script backstop covers the
    # error paths that fall through.
    assert text.count('del /q "!MM_SPLASH_FILE!"') >= 2
    tail = text[text.index("MemoryMap AI has stopped") - 700 :]
    assert 'del /q "!MM_SPLASH_FILE!"' in tail


def test_the_child_process_does_not_open_a_second_splash():
    """start.bat re-launches itself after a self-update. The child inherits
    MM_SPLASH_FILE and must write to the window the parent already opened."""
    text = _start_bat()
    launch = text.index("start \"\" /b powershell")
    guard = text.rindex("if not defined MM_CHILD (", 0, launch)
    assert guard < launch


def test_the_phases_the_splash_reports_are_the_slow_ones():
    written = set(re.findall(r'echo ([^>]+)> "!MM_SPLASH_FILE!"', _start_bat()))
    blob = " ".join(written).lower()
    assert "update" in blob        # git pull
    assert "dependencies" in blob  # pip install, the long one
    assert "starting the app" in blob


def test_the_splash_script_can_always_give_up_on_its_own():
    """The one case the launcher cannot clean up after: killed outright, so
    nothing deletes the file. Three independent exits, all present."""
    ps1 = (REPO / "scripts" / "splash.ps1").read_text(encoding="utf-8")
    assert "MaxMinutes" in ps1                     # a hard deadline
    assert "Test-Path -LiteralPath $StatusFile" in ps1  # the file vanished
    assert "__done__" in ps1                       # an explicit stop
    # And it must never take the launch down with it.
    assert "catch {" in ps1 and "exit 0" in ps1


# --- the Unix launcher ---------------------------------------------------------


def _start_sh() -> str:
    return (REPO / "start.sh").read_text(encoding="utf-8")


def test_the_unix_splash_only_appears_when_there_is_no_terminal():
    """Run from a terminal, start.sh already narrates every phase — a dialog
    over the top would be noise. The report is about launching from a file
    manager, where there is no console at all."""
    text = _start_sh()
    assert "[ ! -t 1 ] && command -v zenity" in text


def test_both_exec_paths_take_the_unix_splash_down_by_hand():
    """`exec` replaces the shell without firing the EXIT trap, and fd 9 is
    inherited by the new process — which would hold the fifo open and leave
    zenity on screen for the whole life of the app."""
    text = _start_sh()
    for exec_line in ('exec "$VENV_PY" -m memorymap --desktop',
                      'exec "$VENV_PY" -m memorymap\n'):
        at = text.index(exec_line)
        before = text[max(0, at - 200):at]
        assert "mm_splash_done" in before, exec_line


def test_the_unix_splash_is_trapped_on_every_signal():
    assert "trap mm_splash_done EXIT INT TERM" in _start_sh()


def test_a_machine_without_zenity_just_gets_no_splash():
    """Every call must be a no-op when the dialog never started, or a missing
    zenity would take the launch down with it."""
    text = _start_sh()
    body = text[text.index("mm_splash() {") : text.index("mm_splash_done() {")]
    assert '[ -n "$MM_SPLASH_PID" ] || return 0' in body
