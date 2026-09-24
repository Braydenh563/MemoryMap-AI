"""The packaged Windows app's launch, on the parts that run on Linux.

Every packaging smoke in CI sets `MEMORYMAP_DATA_DIR`, and an installed app
never has it set: the Start Menu shortcut runs `MemoryMap AI.exe --desktop`
and nothing else. So the questions here are the ones those smokes could not
ask. Where does a frozen build with no variable write its log and its window
profile, and what does the "Repair MemoryMap AI" shortcut clear? What
happens when port 8000 belongs to something else? Does Settings' Restart
button relaunch an exe that has no `-m`? Does the page arrive with the right
types on a machine whose registry says `.js` is text?
"""

from __future__ import annotations

import http.server
import json
import mimetypes
import socket
import sys
import threading
from pathlib import Path

import pytest

import memorymap.__main__ as entry
from memorymap.core import config as config_module


@pytest.fixture
def installed(monkeypatch, tmp_path):
    """A frozen build started the way the Start Menu starts it: no data
    directory variable, and a working directory that is not the data dir."""
    monkeypatch.delenv("MEMORYMAP_DATA_DIR", raising=False)
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "platform", "linux")
    home = tmp_path / "xdg"
    monkeypatch.setenv("XDG_DATA_HOME", str(home))
    cwd = tmp_path / "started-in"
    cwd.mkdir()
    monkeypatch.chdir(cwd)
    return home / "MemoryMap AI", cwd


# --- the data directory, with no variable set ------------------------------


def test_the_launcher_and_the_app_agree_on_the_data_dir(installed):
    data_dir, _ = installed
    assert config_module.resolved_data_dir() == data_dir.resolve()
    assert config_module.ConfigManager().data_dir == data_dir.resolve()


def test_the_windowed_log_goes_beside_the_notes(installed, monkeypatch):
    data_dir, cwd = installed
    monkeypatch.setattr(sys, "stdout", None)
    monkeypatch.setattr(sys, "stderr", None)
    entry._ensure_std_streams()
    log = Path(sys.stderr.name)
    assert log == data_dir.resolve() / "logs" / "desktop-stdio.log"
    assert not (cwd / "data").exists()


def test_repair_clears_the_profile_the_window_really_uses(installed):
    """The Repair shortcut cleared `<working dir>\\data\\webview`, a folder
    the installed app never used, and said "nothing cached to clear"."""
    data_dir, cwd = installed
    profile = data_dir / "webview" / "EBWebView"
    profile.mkdir(parents=True)
    notes = data_dir / "memorymap.db"
    notes.write_text("notes")
    entry._repair_install()
    assert not (data_dir / "webview").exists()
    assert notes.read_text() == "notes"


def test_no_launcher_code_falls_back_to_a_bare_data_folder():
    """The three sites that read the variable with a `"data"` default are
    the bug; `resolved_data_dir` is the one answer."""
    source = Path(entry.__file__).read_text(encoding="utf-8")
    assert 'os.getenv("MEMORYMAP_DATA_DIR", "data")' not in source
    assert 'os.environ.get("MEMORYMAP_DATA_DIR") or "data"' not in source


# --- the port ---------------------------------------------------------------


class _Health(http.server.BaseHTTPRequestHandler):
    body = b"{}"

    def do_GET(self):  # noqa: N802
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(self.body)

    def log_message(self, *args):
        pass


@pytest.fixture
def listener():
    servers = []

    def start(body: dict):
        handler = type("H", (_Health,), {"body": json.dumps(body).encode()})
        server = http.server.HTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        servers.append(server)
        return server.server_address[1]

    yield start
    for server in servers:
        server.shutdown()
        server.server_close()


def _free_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


def test_a_free_port_is_free():
    assert entry._port_holder(_free_port()) == "free"


def test_another_copy_of_this_app_is_recognised(listener):
    port = listener({"status": "ok", "app": "MemoryMap AI"})
    assert entry._port_holder(port) == "memorymap"


def test_something_else_on_the_port_is_not_this_app(listener):
    port = listener({"status": "ok", "app": "some dev server"})
    assert entry._port_holder(port) == "other"


def test_the_window_moves_off_a_port_another_program_holds(listener, monkeypatch):
    """Port 8000 is every dev server's default. The window used to wait for
    *anything* to answer on it, then open whatever that was, inside the
    MemoryMap window."""
    port = listener({"app": "not us"})
    monkeypatch.setattr(entry, "PORT", port)
    chosen = entry._desktop_port()
    assert chosen != port
    assert entry._port_holder(chosen) == "free"


def test_the_window_keeps_its_port_when_it_is_free_or_ours(listener, monkeypatch):
    free = _free_port()
    monkeypatch.setattr(entry, "PORT", free)
    assert entry._desktop_port() == free
    ours = listener({"app": "MemoryMap AI"})
    monkeypatch.setattr(entry, "PORT", ours)
    assert entry._desktop_port() == ours


# --- Restart from Settings, on the packaged exe ------------------------------


def test_restart_relaunches_the_exe_without_python_flags(monkeypatch):
    """Settings' Restart and the console-mode switch spawned
    `[sys.executable, "-m", "memorymap", "--desktop"]`. On the packaged app
    `sys.executable` is `MemoryMap AI.exe`, whose argparse exits on `-m`, so
    the app closed and nothing came back."""
    import subprocess

    monkeypatch.setattr(sys, "platform", "win32")
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    calls = []

    class _Popen:
        def __init__(self, argv, **kwargs):
            calls.append((argv, kwargs))

    monkeypatch.setattr(subprocess, "Popen", _Popen)
    for hidden in (True, False):
        assert entry._spawn_desktop(hidden) is not None
    for argv, _ in calls:
        assert argv == [sys.executable, "--desktop"]


def test_settings_finds_the_running_entry_module(monkeypatch):
    """A packaged build runs `__main__.py` as `__main__`, and PyInstaller
    does not bundle a second copy as `memorymap.__main__` (nothing imports
    it by that name), so `import_module("memorymap.__main__")` raised."""
    from memorymap.api import routes_settings

    fake = type(sys)("__main__")
    fake.restart_in_console_mode = lambda hidden: False
    monkeypatch.setitem(sys.modules, "__main__", fake)
    assert routes_settings._desktop_entry() is fake


# --- what the page is served as ---------------------------------------------


def test_script_types_do_not_come_from_the_registry(monkeypatch):
    """Windows' `mimetypes` reads the registry over Python's own table. A
    machine that maps `.js` to `text/plain` got every script refused under
    `nosniff`: a blank window."""
    from memorymap.api import app as app_module

    saved = {ext: mimetypes.guess_type("x" + ext)[0] for ext in app_module.STATIC_MIME_TYPES}
    try:
        mimetypes.add_type("text/plain", ".js")
        mimetypes.add_type("application/octet-stream", ".wasm")
        app_module.pin_static_mime_types()
        assert mimetypes.guess_type("app.js")[0] == "text/javascript"
        assert mimetypes.guess_type("harper.wasm")[0] == "application/wasm"
    finally:
        for ext, kind in saved.items():
            if kind:
                mimetypes.add_type(kind, ext)


def test_the_updater_follows_githubs_new_release_download_host():
    """GitHub has announced release downloads moving to
    release-assets.githubusercontent.com; the updater re-checks every
    redirect against its allowlist, so a host missing there is every update
    failing at "couldn't download"."""
    from memorymap.api import routes_update

    allowed = routes_update._download_url_is_allowed
    assert allowed("https://release-assets.githubusercontent.com/github-production-release-asset/1/x")
    assert allowed("https://objects.githubusercontent.com/github-production-release-asset-2e65be/1")
    assert not allowed("https://release-assets.githubusercontent.com.example.net/x")
    assert not allowed("http://release-assets.githubusercontent.com/x")


def test_the_about_panel_reads_the_changelog_from_the_bundle():
    from memorymap.api import app as app_module

    assert (app_module.BUNDLE_ROOT / "CHANGELOG.md").is_file()
    assert app_module.FRONTEND_DIR == app_module.BUNDLE_ROOT / "frontend"
