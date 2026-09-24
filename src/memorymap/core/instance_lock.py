"""One running server per data directory (the owner's decision: single
instance by default).

**Why.** A second double-click on the desktop app used to start a second
process on the same data directory: `create_app()` ran its migrations, its
singletons and its background work against the SQLite file the first copy
already had open, and only then did uvicorn fail to bind the port. Two
servers on one SQLite file is the exact shape `scratchpad/ui-sweeps/serve.sh`
records as producing `no such table` and `Could not refresh instance` 500s
hours later.

**The mechanism**, kept simple on purpose:

- A server that starts writes `instance.lock` into its data directory: its
  port, its pid, when it started, and a random token.
- A launch reads that file first. If the port answers `/health` as MemoryMap,
  the notebook is already open: the launch asks the running server to bring
  its window forward (`POST /instance/focus`, carrying the token, which only
  someone who can read the data directory has), or, with the Advanced
  setting "Open a new window on each launch" on, opens a second window onto
  that same server. Never a second server.
- A lock whose port is silent is **stale** unless its process is still alive
  and inside its boot grace (a first launch still running its migrations),
  and a stale lock is simply taken over. A crash therefore costs nothing but
  one silent port check on the next launch.

Everything that decides is a pure function (`classify`, `decide`,
`find_running` with its probes passed in), so the rules are tested without a
server, a window or a launcher script (`tests/test_instance_lock.py`).

This module imports nothing heavy: `__main__` reads it before the window
opens, and the import cost there is measured (see `_run_server`'s docstring).
"""

from __future__ import annotations

import json
import os
import secrets
import sys
import time
from collections.abc import Callable
from dataclasses import asdict, dataclass
from pathlib import Path

LOCK_NAME = "instance.lock"

#: How long a lock whose port does not answer yet still counts as a server
#: that is starting, while its process lives. A cold first start (migrations,
#: an embeddings warm-up) was measured in the tens of seconds; the desktop
#: window's own wait is 45s (`_wait_for_server_with_progress`). Past this, a
#: live pid with a silent port is taken to be a pid reused by something else.
BOOT_GRACE_SECONDS = 90.0


@dataclass(frozen=True)
class LockInfo:
    pid: int
    port: int
    token: str
    started: float


def lock_path(data_dir: str | os.PathLike[str]) -> Path:
    return Path(data_dir) / LOCK_NAME


def new_lock(port: int, *, pid: int | None = None, now: float | None = None) -> LockInfo:
    return LockInfo(
        pid=os.getpid() if pid is None else int(pid),
        port=int(port),
        token=secrets.token_urlsafe(24),
        started=time.time() if now is None else float(now),
    )


def read_lock(path: str | os.PathLike[str]) -> LockInfo | None:
    """The lock at `path`, or None when it is missing or not one of ours.

    Junk reads as no lock rather than raising: a half-written file from a
    crash, or anything else, must never stop the notebook opening.
    """
    try:
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
        info = LockInfo(
            pid=int(raw["pid"]),
            port=int(raw["port"]),
            token=str(raw["token"]),
            started=float(raw["started"]),
        )
    except (OSError, ValueError, TypeError, KeyError):
        return None
    if not 1 <= info.port <= 65535 or not info.token:
        return None
    return info


def write_lock(path: str | os.PathLike[str], info: LockInfo) -> None:
    from memorymap.core.atomic_io import atomic_write_text

    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_text(target, json.dumps(asdict(info)))


def classify(lock: LockInfo | None, *, answering: bool, pid_alive: bool, now: float) -> str:
    """"none", "live", "starting" or "stale"."""
    if lock is None:
        return "none"
    if answering:
        return "live"
    if pid_alive and now - lock.started < BOOT_GRACE_SECONDS:
        return "starting"
    return "stale"


def decide(state: str, *, new_window: bool) -> str:
    """What a launch does: "start" a server, "focus" the running window, or
    open a "new_window" onto the running server. Never a second server while
    one is live or starting."""
    if state in ("live", "starting"):
        return "new_window" if new_window else "focus"
    return "start"


def pid_alive(pid: int) -> bool:
    """Whether a process with this pid exists.

    **Not `os.kill(pid, 0)` on Windows**: there, `os.kill` with any signal
    other than the two console events calls `TerminateProcess`, so the probe
    would end the very process it asked about. `OpenProcess` plus
    `GetExitCodeProcess` asks without touching it.
    """
    if pid <= 0:
        return False
    if sys.platform == "win32":
        try:
            import ctypes

            kernel32 = ctypes.windll.kernel32
            handle = kernel32.OpenProcess(0x1000, False, pid)  # QUERY_LIMITED_INFORMATION
            if not handle:
                return False
            try:
                code = ctypes.c_ulong()
                if not kernel32.GetExitCodeProcess(handle, ctypes.byref(code)):
                    return False
                return code.value == 259  # STILL_ACTIVE
            finally:
                kernel32.CloseHandle(handle)
        except Exception:  # noqa: BLE001 - a failed probe reads as "not alive"
            return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True  # it exists; it is simply not ours to signal
    except OSError:
        return False
    return True


def _opener():
    import urllib.request

    # No proxy: a system proxy setting must never be asked about loopback.
    return urllib.request.build_opener(urllib.request.ProxyHandler({}))


def answers(port: int, host: str = "127.0.0.1", timeout: float = 1.5) -> bool:
    """Whether MemoryMap answers `/health` on this port."""
    try:
        with _opener().open(f"http://{host}:{port}/health", timeout=timeout) as response:
            body = json.loads(response.read(4096).decode("utf-8", "replace"))
    except (OSError, ValueError):
        return False
    return isinstance(body, dict) and body.get("app") == "MemoryMap AI"


def find_running(
    data_dir: str | os.PathLike[str],
    *,
    answers_fn: Callable[[int], bool] | None = None,
    alive_fn: Callable[[int], bool] | None = None,
    now: float | None = None,
) -> tuple[str, LockInfo | None]:
    """The state of this data directory's lock, and the lock itself. The
    probes default to the real ones, looked up at call time so a test can
    replace either on the module."""
    lock = read_lock(lock_path(data_dir))
    if lock is None:
        return "none", None
    state = classify(
        lock,
        answering=(answers_fn or answers)(lock.port),
        pid_alive=(alive_fn or pid_alive)(lock.pid),
        now=time.time() if now is None else now,
    )
    return state, lock


def wait_until_answering(port: int, timeout: float = BOOT_GRACE_SECONDS) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if answers(port, timeout=1.0):
            return True
        time.sleep(0.5)
    return False


def request_focus(lock: LockInfo, host: str = "127.0.0.1", timeout: float = 3.0) -> bool:
    """Ask the running server to bring its window forward. True only when it
    did: a server started in browser mode has no window, and says so."""
    import urllib.request

    request = urllib.request.Request(
        f"http://{host}:{lock.port}/instance/focus",
        data=b"",
        method="POST",
        headers={"X-Instance-Token": lock.token},
    )
    try:
        with _opener().open(request, timeout=timeout) as response:
            body = json.loads(response.read(4096).decode("utf-8", "replace"))
    except (OSError, ValueError):
        return False
    return isinstance(body, dict) and body.get("focused") is True


# --- This process's own claim ------------------------------------------------
#
# The server that runs in this process needs the token (to check a focus
# request) and, on the desktop, a way to reach its window. Both are process
# state, set by `__main__` and read by the `/instance/focus` route.

_claimed: tuple[Path, LockInfo] | None = None
_focus_handler: Callable[[], None] | None = None


def claim(data_dir: str | os.PathLike[str], port: int) -> LockInfo:
    """Write this process's lock, replacing whatever was there. Called only
    once `find_running` said nothing live holds the directory, so what it
    replaces is a stale lock or none."""
    global _claimed
    info = new_lock(port)
    path = lock_path(data_dir)
    write_lock(path, info)
    _claimed = (path, info)
    return info


def release() -> None:
    """Remove this process's lock, and only if it is still ours: a later
    launch that took a stale-looking lock over owns the file now."""
    global _claimed
    if _claimed is None:
        return
    path, info = _claimed
    _claimed = None
    current = read_lock(path)
    if current is not None and current.token == info.token:
        try:
            path.unlink()
        except OSError:
            pass  # gone already, or unwritable: the next launch finds it stale


def current_token() -> str | None:
    return _claimed[1].token if _claimed is not None else None


def set_focus_handler(handler: Callable[[], None] | None) -> None:
    global _focus_handler
    _focus_handler = handler


def focus() -> bool:
    """Bring this process's window forward, if it has one."""
    if _focus_handler is None:
        return False
    try:
        _focus_handler()
    except Exception:  # noqa: BLE001 - a failed focus must not fail the request
        return False
    return True
