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
import shutil
import signal
import stat
import subprocess
import tarfile
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

    def __init__(self):
        self.calls: list[list[str]] = []

    def __call__(self, args, timeout=None):
        self.calls.append(list(args))
        return subprocess.CompletedProcess(args, 0, stdout="", stderr="")

    @property
    def pip_target(self) -> list[str]:
        """What the *package* install was pointed at, if it got that far."""
        for call in self.calls:
            if "-e" in call:
                return call[call.index("-e") :]
        return []


def _archive(tmp_path: Path, names: list[str]) -> Path:
    """A GitHub-shaped source archive: everything inside searxng-master/."""
    root = tmp_path / "build" / "searxng-master"
    for name in names:
        target = root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("x")
    path = tmp_path / "searxng.tar.gz"
    with tarfile.open(path, "w:gz") as tar:
        tar.add(root, arcname="searxng-master")
    return path


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


# The four real ones, verbatim from the repository. A colon separates a drive
# letter on Windows, so git fetches every object and then dies at the checkout
# — "fatal: unable to checkout working tree", which is what was reported —
# leaving a half-written folder behind for pip to refuse.
WINDOWS_HOSTILE = [
    "utils/templates/etc/nginx/default.apps-available/searxng.conf:socket",
    "utils/templates/etc/httpd/sites-available/searxng.conf:socket",
    "utils/templates/etc/uwsgi/apps-available/searxng.ini:socket",
    "utils/templates/etc/uwsgi/apps-archlinux/searxng.ini:socket",
]


def test_the_names_windows_cannot_hold_are_left_out_of_the_unpack(tmp_path):
    """The whole reason we unpack the archive ourselves."""
    archive = _archive(tmp_path, ["setup.py", "searx/webapp.py", *WINDOWS_HOSTILE])
    into = tmp_path / "src"

    skipped = searxng_manager._unpack(archive, into)

    assert sorted(skipped) == sorted(WINDOWS_HOSTILE)
    assert (into / "setup.py").exists()
    assert (into / "searx" / "webapp.py").exists()
    assert searxng_manager.is_checkout(into)


def test_the_archives_own_top_level_folder_is_stripped(tmp_path):
    """GitHub wraps everything in searxng-master/; pip needs setup.py at the
    root of what it is given."""
    archive = _archive(tmp_path, ["setup.py"])
    into = tmp_path / "src"

    searxng_manager._unpack(archive, into)

    assert (into / "setup.py").exists()
    assert not (into / "searxng-master").exists()


@pytest.mark.parametrize("name", ["../escaped.py", "/etc/passwd", "a/../../out.py"])
def test_a_member_that_escapes_the_folder_is_skipped(tmp_path, name):
    archive = tmp_path / "evil.tar.gz"
    payload = tmp_path / "payload"
    payload.write_text("x")
    with tarfile.open(archive, "w:gz") as tar:
        tar.add(payload, arcname="searxng-master/setup.py")
        tar.add(payload, arcname=f"searxng-master/{name}")
    into = tmp_path / "src"

    skipped = searxng_manager._unpack(archive, into)

    assert skipped, f"{name} should not have been written"
    assert not (tmp_path / "escaped.py").exists()
    assert not (tmp_path / "out.py").exists()


def test_the_install_downloads_an_archive_and_never_shells_out_to_git(
    app_state, tmp_path, monkeypatch
):
    data_dir = app_state.data_dir
    _fake_venv(data_dir)
    archive = _archive(tmp_path, ["setup.py", "searx/webapp.py", *WINDOWS_HOSTILE])
    commands = _Commands()
    monkeypatch.setattr(searxng_manager, "_run", commands)
    monkeypatch.setattr(
        searxng_manager, "_download", lambda url, dest: shutil.copy(archive, dest)
    )

    _install_and_wait(data_dir)

    src = searxng_manager._source_dir(data_dir)
    assert searxng_manager._install_state["error"] == ""
    assert not any(call[0] == "git" for call in commands.calls)
    assert commands.pip_target == ["-e", str(src)]
    assert (src / "setup.py").exists()
    # The archive itself is not left behind in the user's data directory.
    assert not list(src.parent.glob("*.tar.gz"))


def test_a_leftover_source_folder_is_replaced_rather_than_installed(
    app_state, tmp_path, monkeypatch
):
    """The reported bug: `src` was there, so nothing was downloaded, and pip
    was asked to install a folder with no Python project in it."""
    data_dir = app_state.data_dir
    _fake_venv(data_dir)
    src = searxng_manager._source_dir(data_dir)
    src.mkdir(parents=True)
    (src / ".git").mkdir()  # what a failed checkout leaves behind
    archive = _archive(tmp_path, ["setup.py"])
    commands = _Commands()
    monkeypatch.setattr(searxng_manager, "_run", commands)
    monkeypatch.setattr(
        searxng_manager, "_download", lambda url, dest: shutil.copy(archive, dest)
    )

    _install_and_wait(data_dir)

    assert searxng_manager._install_state["error"] == ""
    assert (src / "setup.py").exists()
    assert not (src / ".git").exists(), "the broken copy survived the reinstall"


def test_a_download_that_produces_no_project_is_named_before_pip_sees_it(
    app_state, tmp_path, monkeypatch
):
    data_dir = app_state.data_dir
    _fake_venv(data_dir)
    archive = _archive(tmp_path, ["README.rst"])
    commands = _Commands()
    monkeypatch.setattr(searxng_manager, "_run", commands)
    monkeypatch.setattr(
        searxng_manager, "_download", lambda url, dest: shutil.copy(archive, dest)
    )

    _install_and_wait(data_dir)

    assert "no setup.py or pyproject.toml" in searxng_manager._install_state["error"]
    assert commands.pip_target == [], "pip should never be asked to install that"


def test_a_download_that_fails_says_so(app_state, monkeypatch):
    data_dir = app_state.data_dir
    _fake_venv(data_dir)
    monkeypatch.setattr(searxng_manager, "_run", _Commands())

    def boom(url, dest):
        raise searxng_manager.SearxngError("Couldn't download SearXNG: no route to host")

    monkeypatch.setattr(searxng_manager, "_download", boom)

    _install_and_wait(data_dir)

    assert "no route to host" in searxng_manager._install_state["error"]


def test_pip_succeeding_is_not_taken_as_searxng_being_importable(
    app_state, tmp_path, monkeypatch
):
    """A venv that installs cleanly and still can't import `searx` used to
    read as installed, and then died at start with no explanation."""
    data_dir = app_state.data_dir
    _fake_venv(data_dir)
    archive = _archive(tmp_path, ["setup.py"])

    def run(args, timeout=None):
        if args[-1] == "import searx":
            return subprocess.CompletedProcess(
                args, 1, stdout="", stderr="ModuleNotFoundError: No module named 'searx'"
            )
        return subprocess.CompletedProcess(args, 0, stdout="", stderr="")

    monkeypatch.setattr(searxng_manager, "_run", run)
    monkeypatch.setattr(
        searxng_manager, "_download", lambda url, dest: shutil.copy(archive, dest)
    )

    _install_and_wait(data_dir)

    assert "No module named 'searx'" in searxng_manager._install_state["error"]


def test_the_requirements_go_in_before_the_package(app_state, tmp_path, monkeypatch):
    """`pip install -e .` alone cannot work and never could: SearXNG's
    setup.py imports `searx`, which imports `msgspec`, and pip's isolated
    build environment has neither. Reproduced, not deduced — it fails with
    ModuleNotFoundError before setup.py can declare a single requirement."""
    data_dir = app_state.data_dir
    _fake_venv(data_dir)
    src = searxng_manager._source_dir(data_dir)
    archive = _archive(tmp_path, ["setup.py", "requirements.txt"])
    commands = _Commands()
    monkeypatch.setattr(searxng_manager, "_run", commands)
    monkeypatch.setattr(
        searxng_manager, "_download", lambda url, dest: shutil.copy(archive, dest)
    )

    _install_and_wait(data_dir)

    pips = [call for call in commands.calls if "pip" in call and "install" in call]
    requirements = next(i for i, call in enumerate(pips) if "-r" in call)
    package = next(i for i, call in enumerate(pips) if "-e" in call)
    assert requirements < package, "the package builds against the requirements"
    assert str(src / "requirements.txt") in pips[requirements]
    # Building against the virtualenv rather than an isolated one is the whole
    # point; it is what SearXNG's own `manage` script does.
    assert "--no-build-isolation" in pips[package]


def test_the_generated_settings_dont_download_anything_at_boot(app_state):
    """The tracker-URL plugin fetches a rules file from clearurls.xyz during
    startup and an error there is not caught — the process exits before it
    binds the port, which reads as "started but never answered"."""
    text = searxng_manager.ensure_settings(app_state.data_dir).read_text()
    assert "tracker_url_remover" in text
    assert "active: false" in text
    assert "- json" in text  # the API format, without which /search returns 403


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
