"""Run a SearXNG instance for the user (optional).

SearXNG is a separate service — it can't be imported into this process — but
the app can still own its lifecycle so "use SearXNG" is a button rather than a
setup guide. We generate a settings file that enables the JSON API (the one
step people always miss), start it, wait for it to answer, and hand back the
URL.

There are two ways to run it, and Docker is only the tidier one:

- **docker** — pull the official image and run a container. Preferred when
  Docker is installed, because upgrades and isolation come for free.
- **source** — SearXNG is a Python app, so it also runs in a virtualenv of its
  own under the data directory, started as a child process. Slower to set up
  (a pip install from git) and it needs `git`, but it needs no Docker at all.

Everything degrades: no backend available, or a failed start, returns a plain
reason and leaves web search on DuckDuckGo.
"""

from __future__ import annotations

import ctypes
import json
import logging
import os
import secrets
import shutil
import signal
import socket
import stat
import subprocess
import sys
import threading
import time
from pathlib import Path

from memorymap.search import websearch

CONTAINER_NAME = "memorymap-searxng"
IMAGE = "searxng/searxng:latest"
# The port SearXNG listens on. 8888 by default, but that is a popular number
# and "something is using port 8888" was a dead end for the user: the advice
# was to go and close whatever had it, which is not always a thing you can do.
# So it is settable, and if the wanted one is taken by something that is not a
# SearXNG, `choose_port()` moves along to one that is free.
DEFAULT_PORT = 8888
HOST_PORT = DEFAULT_PORT  # the default, and what a fresh install will use
# 8080 first because that is what the user suggested, and what SearXNG itself
# listens on inside its own container.
FALLBACK_PORTS = (8080, 8081, 8890, 8899)
# 127.0.0.1, never localhost: SearXNG is told to bind exactly
# SEARXNG_BIND_ADDRESS=127.0.0.1, and on Windows `localhost` often resolves
# to IPv6 ::1 first — so a probe of "localhost" knocked on a door SearXNG
# was not behind, timed out the whole start, and blamed whatever noise sat
# in the log. The address we dial must be the address we bind.
BASE_URL = f"http://127.0.0.1:{HOST_PORT}"

# The port this run settled on, once it has. Sticky for the process, so a
# started SearXNG is still findable by every later status and probe call.
_chosen_port: int | None = None


def _settle_on(port: int) -> None:
    """Make `port` the one every url, probe and settings file agrees on."""
    global _chosen_port
    _chosen_port = port


def host_port() -> int:
    """The port to use: whatever was settled on, else what was asked for."""
    if _chosen_port is not None:
        return _chosen_port
    wanted = os.environ.get("MEMORYMAP_SEARXNG_PORT", "").strip()
    if wanted.isdigit() and 1 <= int(wanted) <= 65535:
        return int(wanted)
    return DEFAULT_PORT


def base_url() -> str:
    # See BASE_URL for why this is an IP literal rather than localhost.
    return f"http://127.0.0.1:{host_port()}"


def _port_free(port: int) -> bool:
    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        # No SO_REUSEADDR: the question is whether a *live* listener holds it.
        probe.bind(("127.0.0.1", port))
        return True
    except OSError:
        return False
    finally:
        probe.close()


def choose_port() -> int:
    """Settle on a port, now, before starting.

    A port already answering as SearXNG is *better* than a free one — that is
    our own instance from a previous run, and taking a different port would
    start a second copy beside it. Anything else holding the port is a reason
    to move along rather than to fail, which is what used to happen.
    """
    global _chosen_port
    wanted = host_port()
    for port in (wanted, *(p for p in FALLBACK_PORTS if p != wanted)):
        if websearch.probe_searxng(f"http://127.0.0.1:{port}") or _port_free(port):
            _chosen_port = port
            return port
    # Everything is taken. Keep the one that was asked for so the error names
    # the port the user actually configured.
    _chosen_port = wanted
    return wanted


START_TIMEOUT = 90  # image pulls can be slow the first time
# A first from-source start is slower than any Docker start: it imports a few
# hundred modules into a cold interpreter, and on Windows the antivirus reads
# over every one of them on the way. 90 seconds is genuinely not always
# enough, and calling a start that was going to succeed a failure — then
# SIGTERMing it — is the worst outcome available. The wait bails out early
# when the process dies, so the higher ceiling costs nothing when something
# is actually wrong.
SOURCE_START_TIMEOUT = 180
COMMAND_TIMEOUT = 20

# The source, as an archive we download and unpack ourselves.
#
# Not a `git clone`, and not `pip install <tarball-url>` either, because
# **SearXNG's repository cannot be written to a Windows filesystem**. Four of
# its files carry a colon in the name:
#
#     utils/templates/etc/nginx/default.apps-available/searxng.conf:socket
#     utils/templates/etc/httpd/sites-available/searxng.conf:socket
#     utils/templates/etc/uwsgi/apps-available/searxng.ini:socket
#     utils/templates/etc/uwsgi/apps-archlinux/searxng.ini:socket
#
# A colon separates a drive letter (and names an alternate data stream), so
# Windows refuses those names outright. git fetches every object happily and
# then dies at the last step — *"error: invalid path …searxng.conf:socket /
# fatal: unable to checkout working tree"*, which is what the user reported —
# leaving a half-written checkout behind, which is where the earlier "does
# not appear to be a Python project" came from. Retrying could never work:
# nothing about it is transient. Unpacking the tarball with pip fails the same
# way for the same reason, so "install without git" was equally broken there.
#
# We therefore unpack it ourselves and skip the handful of members Windows
# can't represent. They are nginx and uwsgi deployment templates for
# installing SearXNG on a server — nothing the app runs.
SOURCE_TARBALL = "https://github.com/searxng/searxng/archive/refs/heads/master.tar.gz"
DOWNLOAD_TIMEOUT = 300
INSTALL_TIMEOUT = 900  # a cold pip install builds a few wheels

# use_default_settings keeps SearXNG's own defaults and layers ours on top —
# the important bit being the json format, without which the API returns 403.
#
# Engine defaults: several engines that SearXNG ships are broken or hostile
# for a local/private install, and a broken engine is not a quiet failure —
# module import and engine init happen at startup, so one bad engine fills
# the start window with tracebacks and can sink the whole start. They are
# *removed* here, not merely `disabled: true`, for two reasons this module
# learned the hard way:
#
#   - A disabled engine still gets imported. `bilibili` is disabled in
#     SearXNG's own defaults and still crashed every Windows start, because
#     it calls ZoneInfo("Asia/Shanghai") at module scope and Windows has no
#     IANA tzdata.
#   - An entry added under `engines:` merges *over* the default entry of the
#     same name, key by key. Upstream's `torch` engine is really the `xpath`
#     module in disguise (`name: torch, engine: xpath`), so an override that
#     said `engine: torch` sent SearXNG looking for a `torch.py` that does
#     not exist — FileNotFoundError, from our own settings file.
#
# `use_default_settings.engines.remove` has neither problem: a removed engine
# is never imported at all, and the loader treats it as a plain name filter,
# so a name upstream has meanwhile dropped is a no-op rather than a crash.
# What is removed, and why:
#
#   - google / bing: aggressively rate-limit automated requests from home IPs
#     and answer HTTP 403 (suspended_time=180), which makes every search hang
#     while SearXNG waits them out.
#   - wikidata: performs an outbound HTTP request during engine *init* and
#     fails it with an ERROR log on every startup of a home install.
#   - brave: requires an API key; returns 403 without one.
#   - ahmia / torch: Tor onion-network engines — useless without a Tor proxy,
#     and both have broken startup on a plain install.
#   - bilibili: the module-scope tzdata crash above.
#
# duckduckgo — the most permissive engine for private instances — is enabled
# in SearXNG's own defaults and is the working default here. The user can
# edit settings.yml, but MemoryMap rewrites the managed sections on each
# start, preserving secret_key (pass rewrite=False to ensure_settings to
# keep a hand-edited file as-is).
SETTINGS_TEMPLATE = """# Generated by MemoryMap.  Edit freely; MemoryMap refreshes managed sections on each start.
use_default_settings:
  engines:
    remove:
      - google
      - bing
      - wikidata
      - brave
      # Removing an engine must take every engine that shares its network:
      # these three declare `network: brave`, and SearXNG's network init
      # does NETWORKS[name] = NETWORKS['brave'] — KeyError once brave is
      # gone, and the whole start dies on it.
      - brave.images
      - brave.videos
      - brave.news
      - ahmia
      - torch
      - bilibili{extra_removes}
server:
  secret_key: "{secret}"
  limiter: false
  image_proxy: true
search:
  safe_search: 0
  formats:
    - html
    - json
outgoing:
  # Short timeouts prevent a single blocked engine from stalling all results.
  request_timeout: 3.0
  max_request_timeout: 6.0
engines:
  # One general engine is not enough: DuckDuckGo rate-limits by IP, and a
  # home instance that leans on it alone goes dark the moment it throttles.
  # Qwant and Mojeek run their own indexes and tolerate private instances.
  # Deliberately no `engine:` key — these merge onto the default entries by
  # name and only flip `disabled`, so they can never point an entry at a
  # module that is not there (which is how the torch override broke starts).
  - name: qwant
    disabled: false
  - name: mojeek
    disabled: false
plugins:
  # Off deliberately. This plugin downloads a rules file from
  # rules1.clearurls.xyz *during startup*, and a failure there is not caught:
  # the fetch raises, `searx.plugins.initialize` propagates it, and the
  # process exits before it ever binds the port. Any machine that is offline,
  # behind a proxy, or merely slow gets "SearXNG started but never answered".
  # MemoryMap strips tracking parameters from result URLs itself
  # (`websearch.strip_tracking`), so nothing is lost by leaving it off.
  searx.plugins.tracker_url_remover.SXNGPlugin:
    active: false
"""


class SearxngError(RuntimeError):
    """Something stopped us managing the instance."""


# `docker info` against a stopped daemon is quick to fail, but give it room on
# a cold Docker Desktop rather than calling a slow start "not running".
DAEMON_PROBE_TIMEOUT = 8


def docker_installed() -> bool:
    """Is the docker command on PATH? Says nothing about the daemon."""
    return shutil.which("docker") is not None


def docker_available() -> bool:
    """Can we actually run a container right now?

    Checking only that the binary exists was wrong, and produced exactly the
    failure it should have prevented: with Docker Desktop installed but not
    started, the app picked the Docker backend, tried to create a container,
    and reported "failed to connect to the docker API at npipe:..." — while
    the from-source backend that would have worked was never considered.

    `docker info` is the cheapest question that means "is the daemon up".
    """
    if not docker_installed():
        return False
    try:
        result = subprocess.run(  # noqa: S603 — fixed args, no shell
            ["docker", "info", "--format", "{{.ServerVersion}}"],
            capture_output=True,
            text=True,
            timeout=DAEMON_PROBE_TIMEOUT,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return result.returncode == 0


def source_available() -> bool:
    """True if we could build a virtualenv and fetch SearXNG into it.

    Always true. It used to require the `git` binary, which meant a machine
    with neither Docker nor git could not install SearXNG at all — "I can't
    download searxng", with the UI offering a button that could never work.
    The only real requirements are Python (we are running on it) and a network
    connection, which any install needs anyway. git is not used at all now;
    see SOURCE_TARBALL for why cloning cannot work on Windows.

    Deliberately not a `pip install searxng` from PyPI: SearXNG does not
    publish itself there, so that name is somebody else's package, and
    installing it would be running an unknown author's code because the name
    looked right.
    """
    return True


def preferred_backend() -> str | None:
    """Which way we'd run it: docker if present, else from source."""
    if docker_available():
        return "docker"
    if source_available():
        return "source"
    return None


# --- running from source ------------------------------------------------------

# Progress for the one install that can be running at a time. The install is
# minutes long, so it happens on a worker thread and the settings screen polls
# status() rather than holding a request open.
_install_lock = threading.Lock()

# Reported: "the searxng reinstall doesn't have a progress bar so idk if it
# has frozen or is working". A step name that sits unchanged for four minutes
# while pip builds lxml is indistinguishable from a hang, and the install is
# the longest thing this app does.
#
# So the state carries three things a step name cannot: which numbered stage
# of the install we are in (a bar that moves), a fraction inside the stage
# where one is knowable (the download has a content-length; the unpack has a
# member count), and the last few lines the tools themselves printed — which
# is the only real evidence that something is still happening.
INSTALL_STAGES = 5
_LOG_LINES = 12
_install_state: dict = {
    "running": False,
    "step": "",
    "error": "",
    "stage": 0,
    "stages": INSTALL_STAGES,
    "progress": None,  # 0..1 within the whole install, or None if unknowable
    "log": [],
}


def _install_log(line: str) -> None:
    """Keep the last few lines of what the install is actually doing."""
    text = str(line).strip()
    if not text:
        return
    lines = _install_state["log"]
    lines.append(text)
    del lines[:-_LOG_LINES]


def _install_stage(stage: int, step: str) -> None:
    """Move to a numbered stage. Progress is the stage boundary until
    something inside the stage knows better."""
    _install_state.update(
        {"stage": stage, "step": step, "progress": (stage - 1) / INSTALL_STAGES}
    )
    _install_log(f"— {step}")


def _install_progress(stage: int, fraction: float) -> None:
    """Progress *within* a stage, mapped onto the whole install."""
    fraction = max(0.0, min(1.0, fraction))
    _install_state["progress"] = (stage - 1 + fraction) / INSTALL_STAGES


def _source_dir(data_dir: Path) -> Path:
    return Path(data_dir) / "searxng" / "src"


def _venv_dir(data_dir: Path) -> Path:
    return Path(data_dir) / "searxng" / "venv"


def _venv_python(data_dir: Path) -> Path:
    venv = _venv_dir(data_dir)
    return venv / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def _pid_file(data_dir: Path) -> Path:
    return Path(data_dir) / "searxng" / "run.json"


def is_checkout(path: Path) -> bool:
    """Does this directory hold a Python project pip could install?

    A directory being *there* was the test, and it is not the same question.
    Reported: "Couldn't install SearXNG: ERROR: file:///…/data/searxng/src does
    not appear to be a Python project: neither 'setup.py' nor 'pyproject.toml'
    found." — a leftover `src` that no longer contained a checkout, handed
    straight to `pip install -e` because it existed.
    """
    path = Path(path)
    return (path / "setup.py").exists() or (path / "pyproject.toml").exists()


# `import searx` costs a Python interpreter start, and the settings screen
# polls status() every few seconds. Once it has succeeded it stays true until
# something removes the install, so only the affirmative answer is kept.
_import_ok: set[str] = set()


def source_installed(data_dir: Path) -> bool:
    """Is SearXNG present in its own virtualenv?

    The checkout directory only exists on the git path — a tarball install
    puts `searx` straight into the venv's site-packages and never creates
    one. So the question that actually matters is whether the venv can
    import `searx`, not whether a source folder is sitting there.

    And a folder that is there but empty is *worse* than one that is missing:
    it used to answer "installed" for both this question and the one
    `install_source` asks, so the app tried to start something that was never
    built and reinstalling skipped the download.
    """
    python = _venv_python(data_dir)
    if not python.exists():
        return False
    if str(Path(data_dir)) in _import_ok:
        return True
    if is_checkout(_source_dir(data_dir)):
        return True
    result = _run([str(python), "-c", "import searx"], timeout=COMMAND_TIMEOUT)
    if result.returncode == 0:
        _import_ok.add(str(Path(data_dir)))
        return True
    return False


def _read_pid(data_dir: Path) -> int | None:
    try:
        record = json.loads(_pid_file(data_dir).read_text(encoding="utf-8"))
        return int(record.get("pid")) or None
    except (OSError, ValueError, TypeError):
        return None


_STILL_ACTIVE = 259
_PROCESS_QUERY_LIMITED_INFORMATION = 0x1000


def _alive_windows(pid: int) -> bool:
    """Ask Windows whether the process is still running, without signalling it.

    `os.kill(pid, 0)` is the POSIX idiom and it is actively destructive here:
    on Windows any signal that isn't CTRL_C_EVENT or CTRL_BREAK_EVENT is
    handed to `TerminateProcess`, so "is it alive?" *killed the instance*,
    with exit code 0, and then answered yes. The settings screen polls
    status(), status() asks `_source_state`, and `_source_state` asked this —
    so a SearXNG that had just started was shot within a couple of seconds of
    starting, every time, and the app then reported that it "started but never
    answered". That is the §8b symptom.
    """
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    handle = kernel32.OpenProcess(_PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
    if not handle:
        # Access denied means something is there; anything else means it isn't.
        return ctypes.get_last_error() == 5  # ERROR_ACCESS_DENIED
    try:
        code = ctypes.c_ulong()
        if not kernel32.GetExitCodeProcess(handle, ctypes.byref(code)):
            return False
        # A process that genuinely exited with 259 reads as alive. That is the
        # documented cost of this check and it beats terminating the process.
        return code.value == _STILL_ACTIVE
    finally:
        kernel32.CloseHandle(handle)


def _alive(pid: int) -> bool:
    """Is this PID still around, without disturbing it?"""
    if os.name == "nt":
        try:
            return _alive_windows(pid)
        except (OSError, AttributeError, ValueError):
            return False
    try:
        os.kill(pid, 0)  # POSIX only: signal 0 checks, it does not deliver
    except OSError:
        return False
    return True


def _terminate(pid: int) -> None:
    """End the process. Raises OSError if it can't be reached."""
    # On Windows os.kill hands the signal number to TerminateProcess, which is
    # what we want *here* — abrupt, but SearXNG has nothing to flush.
    os.kill(pid, signal.SIGTERM)


def _source_state(data_dir: Path) -> str:
    """'running', 'stopped', or 'absent' for the from-source instance."""
    if not source_installed(data_dir):
        return "absent"
    pid = _read_pid(data_dir)
    return "running" if pid and _alive(pid) else "stopped"


# Characters Windows will not accept in a filename, plus the control range.
# Filtered on every platform, not only Windows: an install should contain the
# same files everywhere, and a path we would refuse on one OS is not one to
# rely on from another.
_UNSAFE_CHARS = set('<>:"|?*') | {chr(c) for c in range(32)}


def _unsafe_member(name: str) -> bool:
    """Is this archive member one we refuse to write?

    Two separate concerns, both fatal in their own way:
    - **path traversal** — an absolute path or a `..` hop writes outside the
      directory we were asked to fill;
    - **names Windows cannot represent** — see SOURCE_TARBALL. Skipping these
      is what makes the install possible there at all.
    """
    if name.startswith("/") or name.startswith("\\") or ":" in name.split("/")[0]:
        return True
    parts = name.split("/")
    if any(part == ".." for part in parts):
        return True
    return any(char in _UNSAFE_CHARS for part in parts for char in part)


def _download(url: str, destination: Path, on_progress=None) -> None:
    """Fetch the archive to disk. Streamed — it is tens of megabytes.

    `on_progress(done_bytes, total_bytes)` is called as it goes. GitHub sends
    a content-length here, so this is the one stage of the install with a
    genuinely knowable percentage.
    """
    import requests  # local: the module is importable without a network stack

    try:
        with requests.get(url, stream=True, timeout=DOWNLOAD_TIMEOUT) as response:
            response.raise_for_status()
            total = int(response.headers.get("Content-Length") or 0)
            done = 0
            with destination.open("wb") as handle:
                for chunk in response.iter_content(chunk_size=1 << 16):
                    handle.write(chunk)
                    done += len(chunk)
                    if on_progress:
                        on_progress(done, total)
    except requests.RequestException as exc:
        raise SearxngError(f"Couldn't download SearXNG: {exc}") from exc


def _unpack(archive: Path, into: Path) -> list[str]:
    """Unpack the archive into `into`, dropping its single top-level folder.

    Returns the names that were skipped, so the install can say so rather than
    quietly shipping a different set of files than the archive held.
    """
    import tarfile

    skipped: list[str] = []
    into.mkdir(parents=True, exist_ok=True)
    try:
        with tarfile.open(archive, "r:gz") as tar:
            members = []
            for member in tar.getmembers():
                # A GitHub archive wraps everything in "searxng-master/".
                relative = member.name.split("/", 1)[1] if "/" in member.name else ""
                if not relative:
                    continue
                if not (member.isfile() or member.isdir()) or _unsafe_member(relative):
                    skipped.append(relative)
                    continue
                member.name = relative
                members.append(member)
            # filter="data" refuses absolute paths, links and device nodes in
            # 3.12+; the check above is what covers 3.11 and Windows names.
            if sys.version_info >= (3, 12):
                tar.extractall(into, members=members, filter="data")
            else:  # pragma: no cover - 3.11 only
                tar.extractall(into, members=members)  # noqa: S202 — members vetted above
    except (tarfile.TarError, OSError) as exc:
        raise SearxngError(f"Couldn't unpack SearXNG: {exc}") from exc
    return skipped


def _fetch_source(src: Path, state: dict) -> None:
    """Download and unpack SearXNG into `src`, replacing whatever was there."""
    problem = _remove_tree(src)
    if problem:
        raise SearxngError(f"Couldn't clear the old copy of SearXNG: {problem}")
    archive = src.parent / "searxng-source.tar.gz"
    try:
        _install_stage(2, "Downloading SearXNG…")

        def downloaded(done: int, total: int) -> None:
            if total:
                _install_progress(2, done / total)
            _install_state["step"] = (
                f"Downloading SearXNG… {done // 1_000_000} MB"
                + (f" of {total // 1_000_000} MB" if total else "")
            )

        _download(SOURCE_TARBALL, archive, on_progress=downloaded)
        _install_stage(3, "Unpacking SearXNG…")
        skipped = _unpack(archive, src)
        _install_log(f"Unpacked into {src.name}")
        if skipped:
            _install_log(f"Skipped {len(skipped)} file(s) this filesystem can't hold")
            logging.getLogger("memorymap.searxng").info(
                "Skipped %d file(s) this filesystem can't hold: %s",
                len(skipped),
                ", ".join(skipped[:4]),
            )
    finally:
        archive.unlink(missing_ok=True)
    if not is_checkout(src):
        raise SearxngError(
            "SearXNG downloaded, but no setup.py or pyproject.toml turned up "
            f"in {src}. Try again, or reinstall."
        )


# SearXNG imports `pwd` at module scope in `searx/valkeydb.py`, and `pwd` is a
# POSIX-only stdlib module. So `import searx.webapp` — the first thing a start
# does — dies on Windows with:
#
#     File "…\\searx\\valkeydb.py", line 22, in <module>
#         import pwd
#     ModuleNotFoundError: No module named 'pwd'
#
# reported with a photo. It is the *only* POSIX-only import in the whole
# package, and the only thing it is used for is one line of an error message
# ("[user (uid)] can't connect valkey DB") in a branch that is unreachable
# unless a Valkey/Redis URL is configured — which MemoryMap never does.
#
# So a stand-in module is written into the virtualenv where the platform
# hasn't got one. Not a patch to SearXNG's own source: a patch has to match
# text upstream is free to change and would need re-applying after every
# update. This is a compatibility shim for a stdlib module that isn't there,
# it lives only inside SearXNG's own venv, and it says what it is.
_PWD_SHIM = '''"""A stand-in for the POSIX-only `pwd` module, written by MemoryMap.

SearXNG imports `pwd` at module scope in `searx/valkeydb.py`, which makes it
unimportable on Windows. It uses it in exactly one place — naming the current
user in an error message when a Valkey DB connection fails — and MemoryMap
configures no Valkey DB, so that line never runs.

If it ever does run, these values are honest about being placeholders rather
than pretending to be a real passwd entry.
"""

import getpass
from collections import namedtuple

struct_passwd = namedtuple(
    "struct_passwd",
    "pw_name pw_passwd pw_uid pw_gid pw_gecos pw_dir pw_shell",
)


def _entry(uid=0):
    try:
        name = getpass.getuser() or "unknown"
    except Exception:  # noqa: BLE001 - a name for a log line is never worth raising
        name = "unknown"
    return struct_passwd(name, "x", uid, uid, name, "", "")


def getpwuid(uid=0):
    return _entry(uid)


def getpwnam(name):
    return _entry()


def getpwall():
    return [_entry()]
'''


def _searxng_env(data_dir: Path) -> dict:
    """The environment SearXNG runs in — the generated settings included.

    Used by the start *and* by the install's final check, because verifying
    against SearXNG's own defaults is verifying something nobody will ever
    run: it refuses to start on its placeholder `secret_key`, so the check
    failed on a file the app replaces anyway.
    """
    return {
        **os.environ,
        "SEARXNG_SETTINGS_PATH": str(ensure_settings(data_dir)),
        "SEARXNG_PORT": str(host_port()),
        "SEARXNG_BIND_ADDRESS": "127.0.0.1",
        "SEARXNG_BASE_URL": f"{base_url()}/",
        # The child's stdout goes to a file, which Python block-buffers: a
        # start that died mid-way could take its last lines with it, and
        # those lines are the whole point of keeping the log.
        "PYTHONUNBUFFERED": "1",
    }


def _write_pwd_shim(python: str) -> bool:
    """Give the virtualenv a `pwd` module if its platform hasn't got one.

    Asks the interpreter rather than checking `os.name`: whether *that* Python
    can import it is the thing that actually breaks, and the answer stays
    right if this ever runs somewhere unexpected.
    """
    if _run([python, "-c", "import pwd"], timeout=COMMAND_TIMEOUT).returncode == 0:
        return False
    where = _run(
        [python, "-c", "import sysconfig; print(sysconfig.get_paths()['purelib'])"],
        timeout=COMMAND_TIMEOUT,
    )
    target = (where.stdout or "").strip()
    if not target:
        raise SearxngError(
            "Couldn't find where to add a compatibility module in SearXNG's "
            "virtualenv."
        )
    Path(target, "pwd.py").write_text(_PWD_SHIM, encoding="utf-8")
    logging.getLogger("memorymap.searxng").info(
        "Wrote a `pwd` compatibility module into %s — SearXNG imports it at "
        "module scope and this platform has no such module.",
        target,
    )
    return True


def _install_steps(python: str, src: Path) -> list[tuple[str, list[str]]]:
    """The pip commands that install SearXNG, in the order they must run.

    `pip install -e .` on its own **cannot work**, and never could: SearXNG's
    `setup.py` imports `searx` to read its version, `searx/__init__.py`
    imports `msgspec`, and pip builds in an isolated environment where no
    runtime dependency exists yet. It fails with `ModuleNotFoundError: No
    module named 'msgspec'` before it can declare anything — reproduced here,
    not deduced.

    So the requirements go in first and the package is then built against the
    virtualenv rather than an isolated one. This is what SearXNG's own
    `manage` script does (`pip install --use-pep517 --no-build-isolation
    -e .`), and following it is the whole reason it works.
    """
    return [
        (
            4,
            "Installing dependencies (the long one — a few minutes)…",
            [python, "-m", "pip", "install", "-U", "pip", "setuptools", "wheel", "tzdata"],
        ),
        (
            4,
            "Installing dependencies (the long one — a few minutes)…",
            [python, "-m", "pip", "install", "-r", str(src / "requirements.txt")],
        ),
        (
            5,
            "Installing SearXNG itself…",
            [
                python, "-m", "pip", "install",
                "--use-pep517", "--no-build-isolation", "-e", str(src),
            ],
        ),
    ]


def install_source(data_dir: Path, on_ready=None) -> None:
    """Fetch SearXNG into a virtualenv of its own. Minutes, not seconds.

    With `on_ready` given, a successful install is followed by a start, and
    `on_ready(url)` is called once SearXNG answers. That makes install a
    one-press affair — "press Start, wait minutes, press Start again" asked
    the user to babysit the longest wait in the app, and the second press
    was the step people missed.
    """
    with _install_lock:
        if _install_state["running"]:
            raise SearxngError("An install is already running.")
        _install_state.update(
            {
                "running": True,
                "step": "",
                "error": "",
                "log": [],
                "progress": 0.0,
                "auto_start": on_ready is not None,
            }
        )
    _install_stage(1, "Creating a virtualenv…")

    def work() -> None:
        try:
            src = _source_dir(data_dir)
            src.parent.mkdir(parents=True, exist_ok=True)
            _import_ok.discard(str(Path(data_dir)))
            venv = _venv_dir(data_dir)
            if not _venv_python(data_dir).exists():
                _run([sys.executable, "-m", "venv", str(venv)], timeout=180)
                _install_log(f"Virtualenv created at {venv}")
                if not _venv_python(data_dir).exists():
                    raise SearxngError(
                        "Couldn't create a virtualenv for SearXNG at "
                        f"{venv} — check there is space and that the folder "
                        "is writable."
                    )
            # One path for everyone, git or no git: fetch the archive and
            # unpack it ourselves. Both of the old paths — `git clone` and
            # `pip install <tarball-url>` — write every file in the archive,
            # and four of them cannot exist on Windows.
            _fetch_source(src, _install_state)
            python = str(_venv_python(data_dir))
            for stage, step, args in _install_steps(python, src):
                _install_stage(stage, step)
                # Streamed, not captured: pip prints steadily for minutes here,
                # and those lines are the only evidence the install is alive.
                result = _run_streaming(args, INSTALL_TIMEOUT, _install_log)
                if result.returncode != 0:
                    raise SearxngError(_reason(result, "Couldn't install SearXNG"))
            # pip exiting 0 is not the same as SearXNG being runnable — a
            # half-installed venv otherwise reads as installed and dies at
            # start, which is the state the reinstall button exists to escape.
            _install_state["step"] = "Checking the install…"
            _install_state["progress"] = 0.98
            if _write_pwd_shim(python):
                _install_log("Added a `pwd` compatibility module for this platform.")
            # `import searx` was too shallow: it passed on Windows and the
            # start then died importing `searx.webapp`, which is the module
            # that actually runs. Check the thing that runs.
            check = _run(
                [python, "-c", "import searx.webapp"],
                timeout=INSTALL_TIMEOUT,
                env=_searxng_env(data_dir),
            )
            if check.returncode != 0:
                raise SearxngError(
                    _reason(check, "SearXNG installed but can't be started")
                )
            _import_ok.add(str(Path(data_dir)))
            _install_log("SearXNG installed and importable.")
            _install_state.update({"step": "", "progress": 1.0, "stage": INSTALL_STAGES})
        except SearxngError as exc:
            _install_state["error"] = str(exc)
            _install_log(f"Failed: {exc}")
        except Exception as exc:  # noqa: BLE001 — a worker thread must not die silently
            _install_state["error"] = f"Install failed: {exc}"
            _install_log(f"Failed: {exc}")
        finally:
            _install_state["running"] = False
        if on_ready is None or _install_state["error"]:
            return
        # The follow-on start, still on the worker thread. `running` is
        # False by now, so the start path doesn't mistake its own install
        # for one that is still going.
        try:
            _install_log("Install done — starting SearXNG…")
            result = start(data_dir)
            _install_log("SearXNG is up and answering.")
        except SearxngError as exc:
            _install_state["error"] = (
                f"SearXNG installed, but the automatic start failed: {exc}"
            )
            _install_log(f"Automatic start failed: {exc}")
            return
        try:
            on_ready(result["url"])
        except Exception:  # noqa: BLE001 — the instance is up; a callback must not undo that
            logging.getLogger("memorymap.searxng").warning(
                "SearXNG started at %s but the on_ready callback failed.",
                result["url"],
                exc_info=True,
            )

    threading.Thread(target=work, name="searxng-install", daemon=True).start()


def port_report() -> dict:
    """Who, if anyone, is holding the port SearXNG wants.

    "Check the port isn't in use" is advice that assumes the person can check.
    This checks: it binds the port, and if it can't, asks whatever is there
    whether it speaks SearXNG. Those are three genuinely different situations
    — free, occupied by a working SearXNG, occupied by something else — and
    only the last one is a problem the user has to go and solve.
    """
    free = True
    try:
        probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        # No SO_REUSEADDR: the question is whether a *live* listener holds the
        # port, and reuse would let this bind alongside one on some platforms.
        probe.bind(("127.0.0.1", host_port()))
        probe.close()
    except OSError:
        free = False

    if free:
        return {
            "port": host_port(),
            "free": True,
            "held_by_searxng": False,
            "detail": f"Port {host_port()} is free.",
        }

    answering = websearch.probe_searxng(base_url())
    return {
        "port": host_port(),
        "free": False,
        "held_by_searxng": answering,
        "detail": (
            f"A working SearXNG is already answering on port {host_port()} — "
            "MemoryMap can use it as it is."
            if answering
            else f"Something is using port {host_port()}, and it isn't answering "
            "as SearXNG. Starting will move to the next free port on its own "
            f"(it tries {', '.join(str(p) for p in FALLBACK_PORTS)}); set "
            "MEMORYMAP_SEARXNG_PORT to pick one yourself."
        ),
    }


def _drop_readonly(func, path, _exc) -> None:
    """rmtree's retry hook: clear the read-only bit and go again.

    git marks everything under `.git/objects` read-only, and Windows refuses
    to delete a read-only file however the permissions read elsewhere. With
    `ignore_errors=True` that silently produced the half-deleted tree behind
    the reported error — the loose files went, `.git` stayed, and `src` was
    still *there* with nothing installable in it.
    """
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except OSError:
        pass  # reported by the caller, which checks whether the path survived


def _remove_tree(path: Path) -> str:
    """Delete a directory. Returns "" on success, else why it is still around.

    A tree we cannot delete is moved aside instead. Being unable to remove an
    old install is not a reason to be unable to make a new one, and "go and
    delete this folder by hand" is the advice this whole module exists to
    stop giving.
    """
    path = Path(path)
    if not path.exists():
        return ""
    if not path.is_dir():
        try:
            path.unlink()
        except OSError as exc:
            return f"{path} is a file and couldn't be removed ({exc})"
        return ""
    # onexc replaced onerror in 3.12; both call the same hook here.
    if sys.version_info >= (3, 12):
        shutil.rmtree(path, onexc=_drop_readonly)
    else:  # pragma: no cover - 3.11 only
        shutil.rmtree(path, onerror=_drop_readonly)
    if not path.exists():
        return ""
    aside = path.with_name(f"{path.name}.old-{int(time.time())}")
    try:
        path.rename(aside)
    except OSError as exc:
        return f"{path} could not be removed ({exc})"
    logging.getLogger("memorymap.searxng").warning(
        "Couldn't delete %s, so it was moved to %s. It can be deleted by hand.",
        path,
        aside,
    )
    return ""


def uninstall_source(data_dir: Path) -> dict:
    """Delete the virtualenv and checkout so the next start installs fresh.

    A part-finished install — pip interrupted, a half-cloned checkout, a venv
    built against a Python that has since been upgraded — leaves
    `source_installed` saying yes and the process dying instantly, which reads
    as "it just doesn't work" with nothing to act on. There was no way to get
    back to a clean state short of deleting folders by hand.

    The generated settings.yml is deliberately kept: it holds the instance's
    secret key and any edits the user has made, and it is not what breaks.
    """
    data_dir = Path(data_dir)
    try:
        _stop_source(data_dir)
    except SearxngError:
        pass  # nothing to stop, or it was already gone — either way, carry on
    _pid_file(data_dir).unlink(missing_ok=True)
    _import_ok.discard(str(data_dir))

    removed, failed = [], []
    for path in (_venv_dir(data_dir), _source_dir(data_dir)):
        if not path.exists():
            continue
        problem = _remove_tree(path)
        (failed if problem else removed).append(problem or path.name)
    log_path(data_dir).unlink(missing_ok=True)
    if failed:
        # Reporting a wipe that didn't happen is what let the next install
        # walk into the same broken folder and blame pip for it.
        raise SearxngError(
            "Couldn't clear the old SearXNG install: "
            + "; ".join(failed)
            + ". Close anything using those folders (a file explorer counts) "
            "and try again."
        )
    return {"removed": removed}


def reinstall_source(data_dir: Path, on_ready=None) -> dict:
    """Wipe the install and start a fresh one in the background.

    `on_ready` is handed to `install_source`: with it, the rebuilt SearXNG
    starts itself when the install lands, so reinstall is one press rather
    than reinstall-wait-Start.
    """
    if _install_state["running"]:
        raise SearxngError("An install is already running — let it finish first.")
    result = uninstall_source(data_dir)
    install_source(data_dir, on_ready=on_ready)
    return {**result, "installing": True}


def log_path(data_dir: Path) -> Path:
    """Where SearXNG's own output goes.

    It used to go to DEVNULL, and that is why "SearXNG started but never
    answered. Check the port isn't in use." was the only thing this could ever
    say. A process that dies a second after spawning — a missing dependency, a
    settings file it won't parse, a port already bound — left no trace
    whatsoever, so the message had to guess, and it guessed the same thing
    every time regardless of what actually happened.
    """
    return Path(data_dir) / "searxng" / "searxng.log"


def recent_output(data_dir: Path, lines: int = 12) -> str:
    """The tail of that log, for a failure message and the Logs screen."""
    path = log_path(data_dir)
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""
    tail = [line for line in text.strip().splitlines() if line.strip()][-lines:]
    return "\n".join(tail)


def _start_source(data_dir: Path) -> dict:
    """Spawn SearXNG from its virtualenv and remember the PID."""
    if not source_installed(data_dir):
        raise SearxngError("SearXNG isn't installed yet.")
    env = _searxng_env(data_dir)
    output = log_path(data_dir)
    output.parent.mkdir(parents=True, exist_ok=True)
    try:
        # Truncated per start, not appended to: the only question this file
        # answers is "why did *this* attempt fail", and a growing file makes
        # that harder to read, not easier.
        handle = output.open("w", encoding="utf-8")
    except OSError as exc:
        raise SearxngError(f"Couldn't open {output.name} to record output: {exc}") from exc
    try:
        process = subprocess.Popen(  # noqa: S603 — fixed args, no shell
            [str(_venv_python(data_dir)), "-m", "searx.webapp"],
            # Only the git path has a checkout to run from; a tarball install
            # lives in site-packages, and passing a directory that isn't there
            # makes Popen fail with a FileNotFoundError that reads as "SearXNG
            # is missing" rather than "that folder is". A leftover folder that
            # is no longer a checkout is not somewhere to run from either.
            cwd=str(src) if is_checkout(src := _source_dir(data_dir)) else None,
            env=env,
            # Both streams into one file, in the order they were written —
            # SearXNG's startup errors go to whichever it feels like.
            stdout=handle,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise SearxngError(f"Couldn't start SearXNG: {exc}") from exc
    finally:
        # The child holds its own duplicate of the descriptor, so closing
        # this one doesn't cut off its output — it just stops us leaking one
        # handle per start.
        handle.close()
    _pid_file(data_dir).write_text(
        json.dumps({"pid": process.pid, "backend": "source"}), encoding="utf-8"
    )
    return {"url": base_url(), "started": True, "backend": "source"}


def _stop_source(data_dir: Path) -> dict:
    pid = _read_pid(data_dir)
    _pid_file(data_dir).unlink(missing_ok=True)
    if not pid or not _alive(pid):
        return {"stopped": False}
    try:
        _terminate(pid)
    except OSError as exc:
        raise SearxngError(f"Couldn't stop SearXNG: {exc}") from exc
    # Give it a moment to close its socket before anything rebinds the port.
    for _ in range(20):
        if not _alive(pid):
            break
        time.sleep(0.25)
    return {"stopped": True}


def _run_streaming(
    args: list[str], timeout: int, on_line
) -> subprocess.CompletedProcess:
    """Run a command, handing each line to `on_line` as it is printed.

    `_run` captures output and returns it when the command finishes, which is
    right for a two-second command and useless for a four-minute one: pip
    building lxml prints steadily for minutes and the user saw none of it, so
    a working install and a hung one looked identical. The lines are the
    evidence that something is happening.
    """
    output: list[str] = []
    try:
        process = subprocess.Popen(  # noqa: S603 — fixed args, no shell
            args,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise SearxngError(f"Couldn't run {args[0]}: {exc}") from exc
    deadline = time.time() + timeout
    try:
        for line in process.stdout or []:
            output.append(line)
            on_line(line)
            if time.time() > deadline:
                process.kill()
                raise SearxngError(
                    f"{args[0]} took longer than {timeout}s and was stopped."
                )
        process.wait(timeout=max(1, int(deadline - time.time())))
    except subprocess.TimeoutExpired as exc:
        process.kill()
        raise SearxngError(f"{args[0]} timed out after {timeout}s.") from exc
    finally:
        if process.stdout:
            process.stdout.close()
    return subprocess.CompletedProcess(
        args, process.returncode, stdout="".join(output), stderr=""
    )


def _run(
    args: list[str], timeout: int = COMMAND_TIMEOUT, env: dict | None = None
) -> subprocess.CompletedProcess:
    """Run a setup command. Fixed argument lists only — never a shell."""
    try:
        return subprocess.run(  # noqa: S603 — fixed args, no shell
            args,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
            env=env,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise SearxngError(f"Couldn't run {args[0]}: {exc}") from exc


def _docker_state() -> str:
    """'running', 'stopped', or 'absent' for our container."""
    result = _run(
        ["docker", "ps", "-a", "--filter", f"name=^{CONTAINER_NAME}$", "--format", "{{.State}}"]
    )
    state = (result.stdout or "").strip().splitlines()
    if not state:
        return "absent"
    return "running" if state[0].strip() == "running" else "stopped"


def settings_path(data_dir: Path) -> Path:
    """Where the generated settings live (mounted into the container)."""
    return Path(data_dir) / "searxng" / "settings.yml"


def _existing_secret_key(path: Path) -> str | None:
    """Pull secret_key out of an existing settings file, if there is one."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("secret_key:"):
            value = stripped.split(":", 1)[1].strip().strip('"').strip("'")
            return value or None
    return None


# The names SETTINGS_TEMPLATE removes, kept in one place so the network-ref
# scan below can reason about them without re-parsing our own template.
REMOVED_ENGINES = (
    "google",
    "bing",
    "wikidata",
    "brave",
    "brave.images",
    "brave.videos",
    "brave.news",
    "ahmia",
    "torch",
    "bilibili",
)


def _engines_sharing_removed_networks(defaults_text: str, removed: set[str]) -> list[str]:
    """Engines in SearXNG's own settings.yml whose `network:` names one of
    ours. A light line scan rather than a YAML parse: MemoryMap doesn't
    depend on a YAML library, and the file is machine-formatted."""
    found: list[str] = []
    name = None
    in_engines = False
    for line in defaults_text.splitlines():
        if line.startswith("engines:"):
            in_engines = True
            continue
        if in_engines and line and not line[0].isspace():
            break  # left the engines block
        if not in_engines:
            continue
        stripped = line.strip()
        if stripped.startswith("- name:"):
            name = stripped.split(":", 1)[1].strip().strip("'\"")
        elif stripped.startswith("network:") and name and name not in removed:
            network = stripped.split(":", 1)[1].strip().strip("'\"")
            if network in removed:
                found.append(name)
    return found


def _extra_removes(data_dir: Path) -> list[str]:
    """Engines the installed checkout forces us to remove along with ours.

    The brave lesson, generalised: SearXNG's network init runs
    `NETWORKS[name] = NETWORKS[network]` for every engine that borrows
    another's network, and a borrowed name we removed is a KeyError that
    kills the whole start. Upstream is free to add such engines at any
    time, so the list is read from the checkout's own settings.yml at
    write time rather than predicted here. Empty when there is no checkout
    to read (Docker ships defaults the static list already covers).
    """
    defaults = _source_dir(data_dir) / "searx" / "settings.yml"
    try:
        text = defaults.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    removed = set(REMOVED_ENGINES)
    extra: list[str] = []
    while True:  # a borrower can itself be borrowed from; chase to a fixpoint
        found = _engines_sharing_removed_networks(text, removed)
        if not found:
            return extra
        extra.extend(found)
        removed.update(found)


def _restrict(path: Path, mode: int) -> None:
    """Keep a path to this user. Best effort, deliberately.

    settings.yml holds the instance's `secret_key` in clear text, because
    SearXNG reads it from there — encrypting it would only move the problem
    to wherever that key lived. What we *can* do is make sure nothing else
    on the machine can read it, which is the actual exposure.

    Never fatal: Windows ignores POSIX mode bits, and a FAT/exFAT data
    directory has nowhere to store them. Refusing to run SearXNG because a
    filesystem cannot express permissions would trade a working feature for
    no security gain at all.
    """
    try:
        path.chmod(mode)
    except OSError:
        pass


def ensure_settings(data_dir: Path, rewrite: bool = True) -> Path:
    """Write the managed settings file, refreshing it by default so fixes
    to engine defaults (rate-limited engines, timeouts, plugins) reach
    installs that were set up before those fixes existed. The secret_key
    is preserved across rewrites so sessions aren't invalidated. Pass
    rewrite=False to leave a hand-edited file alone."""
    path = settings_path(data_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    _restrict(path.parent, 0o700)
    secret = _existing_secret_key(path) or secrets.token_hex(24)
    if rewrite or not path.exists():
        extra = "".join(f"\n      - {name}" for name in _extra_removes(data_dir))
        path.write_text(
            SETTINGS_TEMPLATE.format(secret=secret, extra_removes=extra),
            encoding="utf-8",
        )
    # Every time, not only on write: a file created before this existed is
    # exactly the one still sitting there world-readable.
    _restrict(path, 0o600)
    return path


def status(data_dir: Path | None = None) -> dict:
    """Everything the settings screen needs to describe the instance."""
    backend = preferred_backend()
    base = {
        "docker": docker_available(),
        "docker_installed": docker_installed(),
        "source": source_available(),
        "backend": backend,
        "url": base_url(),
        "installing": _install_state["running"],
        "install_step": _install_state["step"],
        "install_error": _install_state["error"],
        # An install runs for minutes; a step name that doesn't change for
        # four of them is indistinguishable from a hang. The stage numbers
        # give a bar something to move along, and the log is what the tools
        # are printing right now.
        "install_stage": _install_state["stage"],
        "install_stages": _install_state["stages"],
        "install_progress": _install_state["progress"],
        "install_log": list(_install_state["log"]),
        "detail": "",
        # Answered rather than suggested: "check the port isn't in use" is
        # advice that assumes the person can check.
        "port": port_report(),
    }
    if backend is None:
        # "Docker is installed but not started" is a different problem from
        # "Docker isn't installed", and only one of them is fixed by starting
        # Docker Desktop. Saying which saves a pointless install.
        # Defensive: source installs no longer need anything beyond Python, so
        # this is only reached if `source_available` has been overridden.
        detail = (
            "Docker is installed but its daemon isn't running — start Docker "
            "Desktop, or MemoryMap will set SearXNG up in a virtualenv instead."
            if docker_installed()
            else "SearXNG can't be set up automatically here. Point MemoryMap "
            "at a SearXNG you run yourself."
        )
        return {
            **base,
            "state": "absent",
            "responding": False,
            "docker_installed": docker_installed(),
            "detail": detail,
        }
    if backend == "docker":
        state = _docker_state()
    else:
        state = _source_state(Path(data_dir)) if data_dir else "absent"
        if state == "absent" and not base["installing"]:
            base["detail"] = (
                "Docker is installed but not running, so SearXNG will be set "
                "up in a virtualenv of its own instead. The first start takes "
                "a few minutes — or start Docker Desktop and try again."
                if docker_installed()
                else "Docker isn't installed, so SearXNG will be set up in a "
                "virtualenv of its own. The first start takes a few minutes."
            )
    return {
        **base,
        "state": state,
        "responding": websearch.probe_searxng(base_url()) if state == "running" else False,
    }


# A start runs in the request thread and waits up to START_TIMEOUT for the
# service to answer — a minute and a half of nothing, and the one wait a user
# is most likely to open Background tasks to ask about. The install was listed
# there and this was not, which is what "the bg tasks still isn't working"
# turned out to be: the longest visible wait in the app had nothing to show.
_start_state: dict = {"running": False, "backend": "", "since": 0.0}


def starting() -> dict | None:
    """The start in flight, if there is one."""
    return dict(_start_state) if _start_state["running"] else None


def start(data_dir: Path, on_ready=None) -> dict:
    """Start SearXNG whichever way this machine can, and wait for JSON.

    `on_ready` only matters when nothing is installed yet: the install this
    kicks off runs for minutes in the background, and with a callback it
    finishes by starting SearXNG and reporting the URL — instead of asking
    the user to come back and press Start a second time.
    """
    backend = preferred_backend()
    if backend is None:
        raise SearxngError(
            "SearXNG can't be set up automatically here. Point MemoryMap at a "
            "SearXNG you run yourself."
        )
    # Settle the port before anything binds it, so the settings file, the
    # child process and every later probe all agree on one number.
    choose_port()
    _start_state.update({"running": True, "backend": backend, "since": time.time()})
    try:
        if backend == "source":
            return _start_from_source(data_dir, on_ready=on_ready)
        return _start_docker(data_dir)
    finally:
        _start_state["running"] = False


# The log lines that mean "the port, not SearXNG, is the problem" — one
# spelling per platform. POSIX raises EADDRINUSE ("Address already in use"),
# Windows raises WinError 10048 ("Only one usage of each socket address …").
_PORT_CLASH_MARKS = (
    "address already in use",
    "eaddrinuse",
    "winerror 10048",
    "only one usage of each socket address",
)


def _port_clash(output: str) -> bool:
    """Did this start die because something else holds the port?"""
    lowered = output.lower()
    return any(mark in lowered for mark in _PORT_CLASH_MARKS)


def _start_from_source(data_dir: Path, on_ready=None) -> dict:
    """Install on first use (in the background), then spawn the process."""
    if _install_state["error"]:
        error = _install_state["error"]
        _install_state["error"] = ""
        raise SearxngError(error)
    if _install_state["running"]:
        raise SearxngError(
            f"Still setting SearXNG up — {_install_state['step']} "
            + (
                "It will start on its own when the install finishes."
                if _install_state.get("auto_start")
                else "Press Start again when it finishes."
            )
        )
    if not source_installed(data_dir):
        install_source(data_dir, on_ready=on_ready)
        raise SearxngError(
            "Setting SearXNG up in its own virtualenv. This takes a few minutes "
            "the first time"
            + (
                ", and it will start on its own when the install finishes."
                if on_ready is not None
                else "; press Start again when it's done."
            )
        )
    if _source_state(data_dir) == "running" and websearch.probe_searxng(base_url()):
        return {"url": base_url(), "started": False, "backend": "source"}
    # The settled port first, then every fallback. choose_port() already
    # avoids ports it can see are taken, but seeing is racy — the honest
    # check is SearXNG itself failing to bind, and that failure is fixed by
    # moving along, not by handing the user a port number to go free up.
    remaining = list(dict.fromkeys((host_port(), *FALLBACK_PORTS)))
    tried: list[int] = []
    while True:
        port = remaining.pop(0)
        tried.append(port)
        _settle_on(port)
        result = _start_source(data_dir)
        pid = _read_pid(data_dir)
        if _wait_until_ready(
            SOURCE_START_TIMEOUT,
            still_starting=lambda: pid is not None and _alive(pid),
        ):
            return result
        # Read what it said *before* stopping it — a SIGTERM adds its own
        # lines, and the interesting ones are the earlier ones.
        said = recent_output(data_dir)
        _stop_source(data_dir)
        if _port_clash(said):
            if remaining:
                logging.getLogger("memorymap.searxng").info(
                    "Port %s was taken after all — trying %s.", port, remaining[0]
                )
                continue
            raise SearxngError(
                "Every port MemoryMap knows to try was taken: "
                + ", ".join(str(p) for p in tried)
                + ". Set MEMORYMAP_SEARXNG_PORT to a free one and press Start "
                "again."
            )
        logging.getLogger("memorymap.searxng").warning(
            "SearXNG didn't answer within %ss. Its own output was:\n%s",
            SOURCE_START_TIMEOUT,
            said or "(nothing — it wrote no output at all)",
        )
        if said:
            raise SearxngError(
                "SearXNG started but never answered. It said:\n\n"
                f"{said}\n\n"
                f"The full log is at {log_path(data_dir)}."
            )
        raise SearxngError(
            "SearXNG started but wrote nothing and never answered — which "
            "usually means the process died immediately. Check that port "
            f"{host_port()} is free. The log is at {log_path(data_dir)}."
        )


def _start_docker(data_dir: Path) -> dict:
    """Start (or create) the container and wait until it answers JSON."""
    # Refreshed for every path, not only creation: the container mounts this
    # host file, so a stopped container restarted with stale settings would
    # keep old engine defaults forever — the exact staleness rewrite-on-start
    # exists to end.
    settings = ensure_settings(data_dir)
    state = _docker_state()
    if state == "running":
        if websearch.probe_searxng(base_url()):
            return {"url": base_url(), "started": False}
    elif state == "stopped":
        result = _run(["docker", "start", CONTAINER_NAME])
        if result.returncode != 0:
            raise SearxngError(_reason(result, "Couldn't start the existing container"))
    else:
        result = _run(
            [
                "docker", "run", "-d",
                "--name", CONTAINER_NAME,
                "--restart", "unless-stopped",
                "-p", f"{host_port()}:8080",
                "-v", f"{settings}:/etc/searxng/settings.yml:ro",
                "-e", f"SEARXNG_BASE_URL={base_url()}/",
                IMAGE,
            ],
            timeout=START_TIMEOUT,
        )
        if result.returncode != 0:
            raise SearxngError(_reason(result, "Couldn't create the container"))

    if not _wait_until_ready():
        raise SearxngError(
            "SearXNG started but isn't answering yet. Give it a moment and press "
            "Auto-detect, or check `docker logs memorymap-searxng`."
        )
    return {"url": base_url(), "started": True}


def stop(data_dir: Path | None = None) -> dict:
    """Stop the instance but keep it (and its settings) for next time."""
    backend = preferred_backend()
    if backend is None:
        raise SearxngError("There is no SearXNG here that MemoryMap started.")
    if backend == "source":
        if data_dir is None:
            raise SearxngError("Couldn't find the SearXNG install.")
        return _stop_source(Path(data_dir))
    if _docker_state() == "absent":
        return {"stopped": False}
    result = _run(["docker", "stop", CONTAINER_NAME], timeout=40)
    if result.returncode != 0:
        raise SearxngError(_reason(result, "Couldn't stop the container"))
    return {"stopped": True}


def _wait_until_ready(timeout: int = START_TIMEOUT, still_starting=None) -> bool:
    """Poll until SearXNG answers JSON, the process dies, or time runs out.

    `still_starting`, when given, is asked between polls whether the thing
    being waited for is still there to wait for. A process that has died
    cannot become ready, and waiting the full window on it only delays the
    error message its log already holds.
    """
    deadline = time.time() + timeout
    while time.time() < deadline:
        if websearch.probe_searxng(base_url()):
            return True
        if still_starting is not None and not still_starting():
            return False
        time.sleep(2)
    return False


# Lines that are never the reason something failed, however last they are.
#
# Reported with a screenshot: "Couldn't install SearXNG: [notice] To update,
# run: …python.exe -m pip install --upgrade pip". That notice is pip's parting
# advice, it is printed on almost every run, and it is always the last line —
# so taking the last line meant reporting it instead of the actual failure,
# every single time an install went wrong. The user is then sent to fix pip,
# which was never the problem.
_NOT_A_REASON = (
    "[notice]",
    "to update, run",
    "you should consider upgrading",
    "warning: you are using pip version",
)


def _reason(result: subprocess.CompletedProcess, prefix: str) -> str:
    """`prefix`, plus the most useful line the command actually printed.

    Prefers a line that names an error, falls back to the last line that isn't
    boilerplate, and says nothing rather than something misleading.
    """
    lines = [
        line.strip()
        for line in (result.stderr or result.stdout or "").strip().splitlines()
        if line.strip()
    ]
    useful = [
        line
        for line in lines
        if not any(marker in line.lower() for marker in _NOT_A_REASON)
    ]
    if not useful:
        return prefix

    # A line that names the failure beats the last line — pip prints the real
    # cause and then several lines of hint after it.
    named = [
        line
        for line in useful
        if line.lower().startswith(("error", "fatal", "exception"))
        or "error:" in line.lower()
    ]
    return f"{prefix}: {(named or useful)[-1]}"
