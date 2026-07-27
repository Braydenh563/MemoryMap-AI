"""The SearXNG install, and the two things that made it unrecoverable.

Reported directly, twice, with the reinstall button in between:

    Couldn't install SearXNG: ERROR: file:///C:/Projects/MemoryMap-AI-v0/
    data/searxng/src does not appear to be a Python project: neither
    'setup.py' nor 'pyproject.toml' found.

`src` existing was treated as `src` being a checkout, so the download was
skipped and pip was handed an empty folder. Reinstalling did not help because
the wipe couldn't delete a git checkout on Windows and said it had.
"""

from __future__ import annotations

import os
import signal
import stat
import subprocess
import time
from pathlib import Path

import pytest

from memorymap.search import searxng_manager


@pytest.fixture(autouse=True)
def _clean_install_state():
    searxng_manager._install_state.update({"running": False, "step": "", "error": ""})
    searxng_manager._import_ok.clear()
    yield
    searxng_manager._install_state.update({"running": False, "step": "", "error": ""})
    searxng_manager._import_ok.clear()


def _fake_venv(data_dir: Path) -> None:
    """A virtualenv that exists, so the installer moves on to the download."""
    python = searxng_manager._venv_python(data_dir)
    python.parent.mkdir(parents=True, exist_ok=True)
    python.write_text("#!/bin/sh\n")


class _Commands:
    """Stands in for `_run`, recording what the installer tried to do."""

    def __init__(self, *, clone_produces_project: bool = True):
        self.calls: list[list[str]] = []
        self.clone_produces_project = clone_produces_project

    def __call__(self, args, timeout=None):
        self.calls.append(list(args))
        if args[0] == "git" and args[1] == "clone":
            src = Path(args[-1])
            src.mkdir(parents=True, exist_ok=True)
            (src / ".git").mkdir(exist_ok=True)
            if self.clone_produces_project:
                (src / "setup.py").write_text("")
        return subprocess.CompletedProcess(args, 0, stdout="", stderr="")

    @property
    def cloned(self) -> bool:
        return any(call[0] == "git" for call in self.calls)

    @property
    def pip_target(self) -> list[str]:
        for call in self.calls:
            if "pip" in call and "install" in call:
                return call[call.index("install") + 1 :]
        return []


def _install_and_wait(data_dir: Path, timeout: float = 5.0) -> None:
    searxng_manager.install_source(data_dir)
    deadline = time.time() + timeout
    while searxng_manager._install_state["running"] and time.time() < deadline:
        time.sleep(0.01)
    assert not searxng_manager._install_state["running"], "install thread never finished"


# --- the reported failure ----------------------------------------------------


def test_a_source_folder_with_no_project_in_it_is_not_a_checkout(tmp_path):
    empty = tmp_path / "src"
    empty.mkdir()
    assert searxng_manager.is_checkout(empty) is False
    (empty / "pyproject.toml").write_text("")
    assert searxng_manager.is_checkout(empty) is True


def test_a_leftover_source_folder_is_cleared_and_downloaded_again(app_state, monkeypatch):
    """The bug itself: `src` was there, so nothing was downloaded, and pip was
    asked to install a folder with no Python project in it."""
    data_dir = app_state.data_dir
    _fake_venv(data_dir)
    src = searxng_manager._source_dir(data_dir)
    src.mkdir(parents=True)
    (src / ".git").mkdir()  # what a half-deleted checkout leaves behind

    commands = _Commands()
    monkeypatch.setattr(searxng_manager, "git_installed", lambda: True)
    monkeypatch.setattr(searxng_manager, "_run", commands)

    _install_and_wait(data_dir)

    assert searxng_manager._install_state["error"] == ""
    assert commands.cloned, "the stale folder stopped the download"
    assert commands.pip_target == ["-e", str(src)]
    assert (src / "setup.py").exists()


def test_a_download_that_produces_no_project_is_named_before_pip_sees_it(
    app_state, monkeypatch
):
    data_dir = app_state.data_dir
    _fake_venv(data_dir)
    commands = _Commands(clone_produces_project=False)
    monkeypatch.setattr(searxng_manager, "git_installed", lambda: True)
    monkeypatch.setattr(searxng_manager, "_run", commands)

    _install_and_wait(data_dir)

    error = searxng_manager._install_state["error"]
    assert "no setup.py or pyproject.toml" in error
    assert commands.pip_target == [], "pip should never be asked to install that"


def test_without_git_a_stale_checkout_is_cleared_and_the_tarball_used(
    app_state, monkeypatch
):
    """`_start_source` runs from the checkout when there is one, so a folder
    left over from a git install must not survive a tarball install."""
    data_dir = app_state.data_dir
    _fake_venv(data_dir)
    src = searxng_manager._source_dir(data_dir)
    src.mkdir(parents=True)
    (src / "stray.txt").write_text("")

    commands = _Commands()
    monkeypatch.setattr(searxng_manager, "git_installed", lambda: False)
    monkeypatch.setattr(searxng_manager, "_run", commands)

    _install_and_wait(data_dir)

    assert not src.exists()
    assert commands.pip_target == [searxng_manager.SOURCE_TARBALL]


def test_pip_succeeding_is_not_taken_as_searxng_being_importable(app_state, monkeypatch):
    """A venv that installs cleanly and still can't import `searx` used to
    read as installed, and then died at start with no explanation."""
    data_dir = app_state.data_dir
    _fake_venv(data_dir)

    def run(args, timeout=None):
        if args[-1] == "import searx":
            return subprocess.CompletedProcess(
                args, 1, stdout="", stderr="ModuleNotFoundError: No module named 'searx'"
            )
        return subprocess.CompletedProcess(args, 0, stdout="", stderr="")

    monkeypatch.setattr(searxng_manager, "git_installed", lambda: False)
    monkeypatch.setattr(searxng_manager, "_run", run)

    _install_and_wait(data_dir)

    assert "No module named 'searx'" in searxng_manager._install_state["error"]


def test_an_empty_source_folder_no_longer_counts_as_installed(app_state, monkeypatch):
    data_dir = app_state.data_dir
    _fake_venv(data_dir)
    searxng_manager._source_dir(data_dir).mkdir(parents=True)
    monkeypatch.setattr(
        searxng_manager,
        "_run",
        lambda args, timeout=None: subprocess.CompletedProcess(args, 1),
    )

    assert searxng_manager.source_installed(data_dir) is False


def test_the_import_check_is_not_re_run_on_every_status_poll(app_state, monkeypatch):
    data_dir = app_state.data_dir
    _fake_venv(data_dir)
    calls = []

    def run(args, timeout=None):
        calls.append(args)
        return subprocess.CompletedProcess(args, 0)

    monkeypatch.setattr(searxng_manager, "_run", run)

    assert searxng_manager.source_installed(data_dir) is True
    assert searxng_manager.source_installed(data_dir) is True
    assert len(calls) == 1


# --- wiping an install that Windows won't let go of --------------------------


def test_the_wipe_clears_the_read_only_bit_before_giving_up(tmp_path):
    """git marks everything under `.git/objects` read-only, and Windows
    refuses to delete a read-only file however the folder's permissions read.
    That is what `ignore_errors=True` was quietly swallowing."""
    pack = tmp_path / "pack"
    pack.write_text("")
    os.chmod(pack, stat.S_IRUSR)
    deleted = []

    def delete(path):
        if not os.stat(path).st_mode & stat.S_IWUSR:
            raise PermissionError(path)
        deleted.append(path)

    searxng_manager._drop_readonly(delete, str(pack), None)

    assert deleted == [str(pack)]


def test_a_tree_that_cannot_be_deleted_is_moved_out_of_the_way(app_state, monkeypatch):
    """Being unable to remove an old install must not make a new one
    impossible — the whole point of the reinstall button."""
    src = searxng_manager._source_dir(app_state.data_dir)
    src.mkdir(parents=True)
    (src / "setup.py").write_text("")
    # What Windows does with a locked file: rmtree returns, the folder stays.
    monkeypatch.setattr(searxng_manager.shutil, "rmtree", lambda path, **kw: None)

    problem = searxng_manager._remove_tree(src)

    assert problem == ""
    assert not src.exists()
    assert len(list(src.parent.glob("src.old-*"))) == 1


def test_a_tree_that_cannot_even_be_moved_is_reported(app_state, monkeypatch):
    src = searxng_manager._source_dir(app_state.data_dir)
    src.mkdir(parents=True)
    monkeypatch.setattr(searxng_manager.shutil, "rmtree", lambda path, **kw: None)
    monkeypatch.setattr(
        Path, "rename", lambda self, target: (_ for _ in ()).throw(OSError("in use"))
    )

    assert "in use" in searxng_manager._remove_tree(src)


def test_uninstall_says_so_when_it_could_not_clear_the_install(app_state, monkeypatch):
    """Reporting a wipe that didn't happen is what let the next install walk
    into the same broken folder and blame pip for it."""
    data_dir = app_state.data_dir
    _fake_venv(data_dir)
    searxng_manager._source_dir(data_dir).mkdir(parents=True)
    monkeypatch.setattr(searxng_manager, "_remove_tree", lambda path: f"{path} is busy")

    with pytest.raises(searxng_manager.SearxngError, match="Couldn't clear"):
        searxng_manager.uninstall_source(data_dir)


def test_a_failed_wipe_stops_the_reinstall_rather_than_repeating_it(
    client, app_state, monkeypatch
):
    _fake_venv(app_state.data_dir)
    searxng_manager._source_dir(app_state.data_dir).mkdir(parents=True)
    monkeypatch.setattr(searxng_manager, "_remove_tree", lambda path: f"{path} is busy")
    installed = []
    monkeypatch.setattr(searxng_manager, "install_source", installed.append)

    response = client.post("/websearch/searxng/reinstall")

    assert response.status_code == 409
    assert "Couldn't clear" in response.json()["detail"]
    assert installed == [], "a reinstall over a folder we couldn't clear repeats the bug"


# --- asking whether it is alive, without killing it --------------------------


def test_liveness_never_signals_the_process_on_windows(monkeypatch):
    """`os.kill(pid, 0)` is the POSIX idiom for "is it there?". On Windows any
    signal but CTRL_C/CTRL_BREAK goes to TerminateProcess — so the status poll
    was shooting the SearXNG it had just started, then reporting that it
    "started but never answered"."""
    monkeypatch.setattr(searxng_manager.os, "name", "nt")
    signalled = []
    monkeypatch.setattr(searxng_manager.os, "kill", lambda *args: signalled.append(args))
    monkeypatch.setattr(searxng_manager, "_alive_windows", lambda pid: True)

    assert searxng_manager._alive(4321) is True
    assert signalled == []


def test_stopping_still_signals_the_process(monkeypatch):
    sent = []
    monkeypatch.setattr(searxng_manager.os, "kill", lambda pid, sig: sent.append((pid, sig)))

    searxng_manager._terminate(4321)

    assert sent == [(4321, signal.SIGTERM)]


@pytest.mark.skipif(os.name == "nt", reason="POSIX liveness check")
def test_a_live_process_reads_as_live_and_a_dead_one_does_not():
    assert searxng_manager._alive(os.getpid()) is True
    dead = subprocess.Popen([os.sys.executable, "-c", ""])
    dead.wait()
    # A zombie is still reapable here, so wait() above is what makes this real.
    assert searxng_manager._alive(999999) is False
