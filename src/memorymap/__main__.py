"""Start the app.

  python -m memorymap             → server at http://localhost:8000
  python -m memorymap --desktop   → the same app in its own window
                                    (needs the optional pywebview:
                                     pip install pywebview)
"""

import argparse
import logging
import os
import sys
import threading
import time
import warnings
from pathlib import Path

import uvicorn

from memorymap.api.app import create_app

logger = logging.getLogger("memorymap.launcher")

HOST, PORT = "127.0.0.1", 8000  # local only — this is a private app

# start.bat's own console window (the one visible when start-desktop.bat is
# double-clicked) blocks synchronously on this process, then falls through to
# an "app has stopped" message and `pause` — a keypress prompt that would
# leave that window sitting on screen indefinitely. This exit code is the
# signal back to the batch file that a "User view" relaunch already handed
# the app off to a separate, console-less process and it should close itself
# immediately instead — see the errorlevel check in start.bat.
RELAUNCHED_HIDDEN_EXIT_CODE = 42


def _run_server() -> None:
    uvicorn.run(create_app(), host=HOST, port=PORT, log_level="info")


def _wait_for_server(timeout: float = 20.0) -> bool:
    """Poll until uvicorn is actually accepting connections on HOST:PORT,
    instead of guessing a fixed delay before pointing the window at it.

    `create_app()` (singleton init, embeddings warmup, etc.) runs
    synchronously on the server thread BEFORE uvicorn binds its listening
    socket — so this genuinely waits for the app to be ready, not merely
    for a thread to have started. Reported directly: the desktop window
    "sits on a black screen for a while before loading in", which a flat
    `sleep(1.0)` fully explains on a cold start (first run, heavier
    startup work, a slower machine) that takes longer than a second — the
    window opened and tried to load the page before anything was
    listening, with nothing to make it retry. Bounded, so a server that
    genuinely fails to start doesn't hang the launcher forever — the window
    still opens either way; this only affects when it opens relative to the
    server being ready to answer it.
    """
    import socket

    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection((HOST, PORT), timeout=0.5):
                return True
        except OSError:
            time.sleep(0.05)
    return False


def _get_console_hwnd() -> int | None:
    """The Win32 handle of this process's own console window, or None.

    None means either this isn't Windows, or this Windows process genuinely
    has no console to show/hide — the packaged installer's PyInstaller build
    sets `console=False`, so `GetConsoleWindow()` correctly returns NULL
    there. Shared between the startup auto-hide below and the tray's own
    live toggle so both agree on the same handle.
    """
    try:
        import ctypes

        return ctypes.windll.kernel32.GetConsoleWindow() or None
    except Exception as exc:
        logger.warning("couldn't look up the console window: %s", exc)
        return None


def _pythonw_path() -> Path | None:
    """`pythonw.exe` next to the interpreter currently running this — the
    windowless CPython build every standard Windows install/venv ships
    alongside `python.exe`. None if it isn't there (a non-standard Python
    build) or this isn't Windows."""
    if sys.platform != "win32":
        return None
    candidate = Path(sys.executable).with_name("pythonw.exe")
    return candidate if candidate.is_file() else None


def _spawn_desktop(hidden: bool):
    """Start a fresh `memorymap --desktop` process in the given console
    mode, independent of whatever process/window is calling this — the one
    spawn primitive `_maybe_relaunch_hidden` (startup), the tray's live
    toggle, and the Settings-triggered restart (`routes_settings.py`'s
    `/system/console-mode`) all share, so the three call sites can't drift
    into three slightly different flag combinations. Returns the `Popen`,
    or None if this isn't win32 or (for hidden) no pythonw.exe was found.
    """
    if sys.platform != "win32":
        return None
    try:
        import subprocess

        if hidden:
            pythonw = _pythonw_path()
            if pythonw is None:
                logger.warning(
                    "no pythonw.exe next to %s — can't relaunch console-less",
                    sys.executable,
                )
                return None
            # CREATE_NO_WINDOW: even pythonw.exe can end up with a console
            # if one is inherited from the parent rather than allocated
            # fresh — this refuses one outright. DETACHED_PROCESS: don't
            # inherit this process's own console/handles either, so the new
            # process is fully independent of whatever cmd/terminal window
            # launched it — which is what lets that window close on its own
            # once this process exits, instead of staying open because
            # something it spawned is still attached to it.
            CREATE_NO_WINDOW = 0x08000000
            DETACHED_PROCESS = 0x00000008
            return subprocess.Popen(
                [str(pythonw), "-m", "memorymap", "--desktop", "--hidden-relaunch"],
                creationflags=CREATE_NO_WINDOW | DETACHED_PROCESS,
                close_fds=True,
                cwd=os.getcwd(),
            )
        # Going visible: a plain python.exe (console-subsystem) child with
        # CREATE_NEW_CONSOLE explicitly gets a fresh console from Windows
        # regardless of whether this process — hidden/console-less, if it
        # got here via the pythonw.exe path above — has one of its own to
        # offer it.
        CREATE_NEW_CONSOLE = 0x00000010
        return subprocess.Popen(
            [sys.executable, "-m", "memorymap", "--desktop"],
            creationflags=CREATE_NEW_CONSOLE,
            close_fds=True,
            cwd=os.getcwd(),
        )
    except Exception as exc:
        logger.warning("couldn't relaunch in %s console mode: %s", "hidden" if hidden else "visible", exc)
        return None


def restart_in_console_mode(hidden: bool) -> bool:
    """Public entry point for switching Dev view / User view from outside
    this process entirely — the HTTP route Settings' own toggle calls
    (`/system/console-mode`), which runs on the server thread and has no
    access to pywebview's `window`/`icon` objects the tray's own toggle
    uses for a tidier teardown. Spawns the replacement first and only exits
    this process if that succeeded, so a failed relaunch (no pythonw.exe,
    Windows refused the spawn) leaves the running app running rather than
    killing it for nothing.
    """
    process = _spawn_desktop(hidden)
    if process is None:
        return False
    os._exit(0)
    return True  # unreachable — os._exit() never returns; keeps every path explicit


def _maybe_relaunch_hidden(show_on_startup: bool, already_relaunched: bool):
    """"User view", done properly: instead of creating a console and then
    trying to hide it — which `ShowWindow`/`GetConsoleWindow` turned out
    not to reliably do, reported live as hiding "just changes what window
    is currently focused" without anything actually disappearing, the
    likely cause being Windows Terminal's ConPTY plumbing returning a
    handle to a hidden pseudo-console host rather than the real on-screen
    window — this relaunches via `pythonw.exe`, which never allocates a
    console in the first place. Nothing to hide, nothing to get wrong.

    Only for a *source* checkout (`start.bat`/`start-desktop.bat`): the
    packaged installer's PyInstaller build already sets `console=False`, so
    `_get_console_hwnd()` returns None there and this whole question never
    comes up. `already_relaunched` is this function's own recursion guard —
    the relaunched pythonw.exe process runs this same code path again with
    `--hidden-relaunch` set, and must not try to relaunch itself forever.

    Returns the spawned `Popen` on success (the caller's job is to exit
    right after — see `RELAUNCHED_HIDDEN_EXIT_CODE`), or None to mean
    "carry on in this process" — the platform is wrong, the preference asks
    for the console to stay visible, this already *is* the relaunched
    process, or spawning failed for a reason worth falling back from rather
    than crashing the launcher over.
    """
    if (
        sys.platform != "win32"
        or getattr(sys, "frozen", False)
        or show_on_startup
        or already_relaunched
    ):
        return None
    process = _spawn_desktop(hidden=True)
    if process is None:
        logger.warning(
            "falling back to hiding the console window instead of never creating one"
        )
    return process


def _ancestor_console_hwnds(own_hwnd: int | None) -> list[int]:
    """Every other visible top-level window owned by this process's parent
    chain (the shell that launched it — cmd.exe, and above that whatever
    hosts it), skipping `own_hwnd` if it's already in that chain.

    `GetConsoleWindow()` alone is reported not to be enough: hiding it was
    seen live to change which window has focus without making anything
    disappear — the one failure mode that fits is Windows Terminal, whose
    ConPTY plumbing means the handle a child process gets back from
    `GetConsoleWindow()` can belong to a hidden pseudo-console host rather
    than the actual on-screen terminal tab (that window belongs to
    WindowsTerminal.exe, several processes up, not to conhost.exe or to
    this Python process at all). Walking the real parent-process chain and
    hiding whatever top-level windows those processes own is a second,
    independent way to reach the actual visible window regardless of which
    terminal is hosting it — legacy conhost included, where this usually
    just finds the same window `_get_console_hwnd` already did.

    Unverified on real Windows, same as the rest of this file's console
    handling — every step is wrapped so a wrong assumption here degrades to
    "did nothing extra" rather than crashing the launcher.
    """
    import ctypes
    import ctypes.wintypes as wintypes

    hwnds: list[int] = []
    try:
        kernel32 = ctypes.windll.kernel32
        user32 = ctypes.windll.user32

        class PROCESSENTRY32(ctypes.Structure):
            _fields_ = [
                ("dwSize", wintypes.DWORD),
                ("cntUsage", wintypes.DWORD),
                ("th32ProcessID", wintypes.DWORD),
                ("th32DefaultHeapID", ctypes.c_void_p),
                ("th32ModuleID", wintypes.DWORD),
                ("cntThreads", wintypes.DWORD),
                ("th32ParentProcessID", wintypes.DWORD),
                ("pcPriClassBase", ctypes.c_long),
                ("dwFlags", wintypes.DWORD),
                ("szExeFile", ctypes.c_char * 260),
            ]

        TH32CS_SNAPPROCESS = 0x00000002
        snapshot = kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
        if snapshot == -1:
            return hwnds
        try:
            parent_of: dict[int, int] = {}
            entry = PROCESSENTRY32()
            entry.dwSize = ctypes.sizeof(PROCESSENTRY32)
            if kernel32.Process32First(snapshot, ctypes.byref(entry)):
                while True:
                    parent_of[entry.th32ProcessID] = entry.th32ParentProcessID
                    if not kernel32.Process32Next(snapshot, ctypes.byref(entry)):
                        break
        finally:
            kernel32.CloseHandle(snapshot)

        # Up to the shell (cmd.exe) and whatever hosts *that* — start.bat's
        # own self-update relaunch (os.execv-free here, but the tray's
        # Restart uses it elsewhere) means this can legitimately be several
        # levels, not just one; capped so a corrupt/cyclic PPID chain (a
        # dead process's PID reused by something unrelated) can't loop.
        ancestry: set[int] = set()
        pid = os.getpid()
        for _ in range(8):
            parent = parent_of.get(pid)
            if not parent or parent in ancestry or parent == 0:
                break
            ancestry.add(parent)
            pid = parent
        if not ancestry:
            return hwnds

        found: list[int] = []
        WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

        def _each_window(hwnd, _lparam):
            if hwnd == own_hwnd or not user32.IsWindowVisible(hwnd):
                return True
            owner_pid = wintypes.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(owner_pid))
            # GetWindow(hwnd, GW_OWNER) != 0 means this is a child/owned
            # window (a dialog, a tooltip) rather than a real top-level
            # shell window — skipping those keeps this to "the terminal
            # window itself", not every popup any ancestor process has open.
            GW_OWNER = 4
            if owner_pid.value in ancestry and not user32.GetWindow(hwnd, GW_OWNER):
                found.append(hwnd)
            return True

        user32.EnumWindows(WNDENUMPROC(_each_window), 0)
        hwnds = found
    except Exception as exc:
        logger.warning("couldn't walk the parent process chain for console windows: %s", exc)
    return hwnds


def _window_class_name(hwnd: int) -> str:
    """Diagnostic only: which window class actually owns a handle, so a log
    line can tell "ConsoleWindowClass" (legacy conhost, expected to hide
    cleanly) apart from anything else (Windows Terminal's own class,
    or a handle that isn't what was intended at all) without needing
    someone to attach a debugger to find out."""
    import ctypes

    try:
        buf = ctypes.create_unicode_buffer(256)
        ctypes.windll.user32.GetClassNameW(hwnd, buf, 256)
        return buf.value or "?"
    except Exception:
        return "?"


def _console_window_targets(console_hwnd: int) -> dict[int, str]:
    """Every window this app will show/hide together as "the console":
    `console_hwnd` itself plus whatever `_ancestor_console_hwnds` finds,
    each mapped to its window class name for the diagnostic log line in
    `_apply_console_visibility`. Split out from applying visibility so the
    startup path and the tray's live toggle act on the exact same set
    computed once, rather than the ancestor walk (a live enumeration) maybe
    disagreeing with itself between two separate calls.
    """
    targets = {console_hwnd: _window_class_name(console_hwnd)}
    for hwnd in _ancestor_console_hwnds(console_hwnd):
        targets.setdefault(hwnd, _window_class_name(hwnd))
    return targets


def _apply_console_visibility(targets: dict[int, str], hidden: bool) -> None:
    """Hide or show a set of windows found by `_console_window_targets`, and
    say what actually happened — reported live that the startup hide "just
    changes what window is currently focused" rather than making anything
    disappear, which a silent `ShowWindow` call gives no way to diagnose
    after the fact. Every step here is logged (visible in Settings -> Logs,
    or on stdout if the console itself is what's being tested) so the
    *next* report can say which of these actually ran and what Windows
    said back, instead of "still doesn't work."
    """
    import ctypes

    user32 = ctypes.windll.user32
    SW_HIDE, SW_SHOW = 0, 5
    for hwnd, class_name in targets.items():
        # One bad handle/API surface must not stop the rest — same reasoning
        # as the AppUserModelID call's own try/except: an unexpected
        # ctypes.windll shape this wasn't tested against should degrade to
        # "skipped one window, logged why" rather than take the whole
        # attempt down.
        try:
            was_visible = bool(user32.IsWindowVisible(hwnd))
            user32.ShowWindow(hwnd, SW_HIDE if hidden else SW_SHOW)
            now_visible = bool(user32.IsWindowVisible(hwnd))
            logger.info(
                "console %s: hwnd=%s class=%r was_visible=%s now_visible=%s",
                "hide" if hidden else "show", hwnd, class_name, was_visible, now_visible,
            )
        except Exception as exc:
            logger.warning(
                "couldn't %s hwnd=%s class=%r: %s",
                "hide" if hidden else "show", hwnd, class_name, exc,
            )


def _run_desktop(hidden_relaunch: bool = False) -> None:
    """A real app window: uvicorn in a background thread,
    pywebview in front. Closing the window exits the process.

    `hidden_relaunch` is True only when this process IS the console-less
    `pythonw.exe` relaunch `_maybe_relaunch_hidden` spawned — see there for
    why relaunching, rather than hiding an already-created console, is
    "User view"'s actual mechanism now.
    """
    # Read the preference — and try a relaunch if it calls for one — before
    # anything else, including importing webview: if this is about to hand
    # off to a separate process and exit, nothing below matters. ConfigManager
    # reads preferences.json straight off disk with no server dependency at
    # all (deps.init_app_state hasn't run, and doesn't need to), so this is
    # safe before the server thread — or the process's own console — has
    # done anything.
    from memorymap.core.config import ConfigManager

    show_on_startup = ConfigManager().get_preference("show_console_on_startup", True)
    relaunched = _maybe_relaunch_hidden(show_on_startup, hidden_relaunch)
    if relaunched is not None:
        raise SystemExit(RELAUNCHED_HIDDEN_EXIT_CODE)

    try:
        import webview  # the optional pywebview package
    except ImportError:
        print(
            "The desktop window needs the optional pywebview package:\n"
            "  pip install pywebview\n"
            "Starting the normal server instead — open http://localhost:8000"
        )
        _run_server()
        return

    # Hide the console before starting anything else, unless the user has
    # asked to keep seeing it — asked for directly: "I want it to be hidden
    # but the user can make it show ... if they want", both as a startup
    # preference (Settings, this) and live (the tray toggle below). None on
    # any non-Windows platform, or the packaged installer's console-less
    # build — nothing to hide either way. Only reached at all when
    # _maybe_relaunch_hidden declined above — platform/frozen/preference
    # said not to, or spawning pythonw.exe itself failed — so this is now
    # the fallback path, not the primary one: same ShowWindow-based attempt
    # this app always had, kept for whatever situation made the relaunch
    # not apply.
    #
    # This used to run after _wait_for_server(), on the theory that reading
    # the preference needed deps.get_config()'s singleton, which create_app()
    # only builds on the server thread. That made the console fully visible
    # for the entire startup wait — which on a cold start (embeddings warmup,
    # etc.) is the same multi-second gap §"sometimes takes a while to
    # initially load" is about — so "hidden at startup" was true only after
    # a visible delay, reported directly as the console "still showing".
    # Reading the preference above, before the server thread starts, is what
    # fixed that half of it.
    console_hwnd = _get_console_hwnd() if sys.platform == "win32" else None
    console_hidden = False
    console_targets: dict[int, str] = {}
    if console_hwnd is not None:
        console_targets = _console_window_targets(console_hwnd)
        if not show_on_startup:
            _apply_console_visibility(console_targets, hidden=True)
            console_hidden = True

    # Tells /health — and through it the frontend — that this is the window
    # rather than a browser tab, so exports get written by the server instead
    # of clicking an `<a download>` that pywebview silently swallows (§35E).
    # Set before the server thread starts, so the app never sees it unset.
    os.environ["MEMORYMAP_DESKTOP"] = "1"
    server = threading.Thread(target=_run_server, daemon=True)
    server.start()
    _wait_for_server()

    window = webview.create_window(
        "MemoryMap AI",
        f"http://{HOST}:{PORT}",
        width=1200,
        height=800,
        min_size=(420, 500),
        # pywebview defaults this to False, which blocks selecting or
        # copying any text in the window — reported directly ("can't
        # highlight or copy text in the desktop view").
        text_select=True,
    )
    # `private_mode` defaults to True in pywebview, which throws away
    # localStorage and cookies when the window closes. The browser build keeps
    # a great deal in localStorage — the theme and every appearance key, the
    # "onboardingDone" flag, the auth token, the active tab, sidebar widths —
    # so the desktop app was starting from scratch every single time. That is
    # one cause behind three separate reports (§35E): the theme resetting to
    # default, the onboarding tour showing on every launch, and having to sign
    # in again each time.
    #
    # The storage lives beside the notes rather than in pywebview's own
    # default, so "where your data is" stays one answer, and deleting the data
    # directory really does remove everything.

    # The app icon — replaces the default Python snake in the taskbar and
    # title bar. Two levels up from src/memorymap/__main__.py lands at the
    # repo root; frontend/icon.ico sits there. A PyInstaller build has no
    # "two levels up" — everything bundled lands directly under the
    # extraction root with the `src/` layer gone, same reasoning and same
    # fix as FRONTEND_DIR in api/app.py. The ICO contains a 512px PNG entry,
    # which pywebview on Windows and WebKit on macOS both accept. None is a
    # valid fallback: a missing file never blocks the window.
    #
    # Linux gets the plain PNG instead: GTK's icon loading goes through
    # GdkPixbuf, and unlike Windows/macOS this was never actually run
    # against a Linux desktop to confirm ICO decodes there — icon-512.png
    # is the one format every platform this app now ships on is known to
    # accept, so there's no reason to gamble on the untested one for a
    # cosmetic detail.
    if getattr(sys, "frozen", False):
        _frontend_dir = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent)) / "frontend"
    else:
        _frontend_dir = Path(__file__).resolve().parents[2] / "frontend"
    _icon_path = _frontend_dir / ("icon-512.png" if sys.platform.startswith("linux") else "icon.ico")
    _icon = str(_icon_path) if _icon_path.is_file() else None

    if sys.platform == "win32":
        try:
            import ctypes
            # Setting a custom AppUserModelID tells Windows this is a distinct app,
            # decoupling the taskbar icon from the Python executable's default snake.
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(
                "memorymap.desktop.app.1"
            )
        except Exception as exc:
            # Best-effort cosmetic fix — a wrong or missing taskbar icon is not
            # worth blocking the window over, so this must never crash the
            # launcher. But CodeQL is right that a silent `except: pass` here
            # hides a real failure mode too: an unexpected `ctypes.windll`
            # shape (a Windows build this wasn't tested against) would fail
            # every time with no way to tell a cosmetic no-op from a bug.
            # Logged, not swallowed.
            logger.warning("could not set the Windows AppUserModelID: %s", exc)

    # Asked for directly, alongside the installer: a way to manage the app
    # without a terminal window sitting open, and a place for "close" to go
    # that isn't "quit" — the whole point of a background app.  Optional in
    # the same way voice/semantic search are (see core/extras.py): a source
    # checkout without pystray+Pillow installed still gets a normal window,
    # it just closes for real instead of minimizing.
    #
    # Windows only, deliberately — see _start_tray's own docstring: this
    # runs pystray's event loop on a daemon thread while webview.start()
    # blocks the main one, which Windows' pystray backend tolerates and
    # macOS's does not (already excluded for exactly that reason). Linux's
    # GTK-based backend has the same main-thread-only UI constraint as
    # macOS's AppKit, so shipping the identical off-main-thread architecture
    # there risks the same class of crash on a platform this was never
    # built or run against — the Linux build gets a real window that closes
    # for real instead, the same fallback already in place when pystray
    # simply isn't installed.
    tray_icon = (
        _start_tray(window, _icon_path, console_hwnd, console_hidden, console_targets)
        if sys.platform == "win32"
        else None
    )
    if tray_icon is not None:

        def _on_closing() -> bool:
            window.hide()
            return False  # cancels the real close — pywebview just hides it

        window.events.closing += _on_closing

    storage = Path(os.getenv("MEMORYMAP_DATA_DIR", "data")).resolve() / "webview"
    storage.mkdir(parents=True, exist_ok=True)
    try:
        webview.start(  # blocks until the window closes; daemon dies with us
            private_mode=False,
            storage_path=str(storage),
            **(({"icon": _icon}) if _icon else {}),
        )
    except TypeError:
        # An older pywebview without one of these arguments. Starting with a
        # forgetful window is much better than not starting at all — the
        # desktop app is the only way in for someone who installed it that way.
        print(
            "This pywebview is too old to keep settings between launches "
            "(pip install -U pywebview). Starting anyway."
        )
        webview.start()
    finally:
        # Only reached once the window is really gone (Quit, not a hide) —
        # an icon left running with no window behind it is a stray process
        # nothing can get back to.
        if tray_icon is not None:
            tray_icon.stop()


def _start_tray(
    window,
    icon_path: Path,
    console_hwnd: int | None,
    console_hidden: bool,
    console_targets: dict[int, str] | None = None,
):
    """The system tray icon: Open / View Logs / Restart / Quit.

    Returns None — and the caller falls back to an ordinary window that
    really closes on the X button — when pystray or Pillow aren't installed.
    Both are optional for the same reason pywebview itself is (core/extras.py):
    a source checkout that never asked for the desktop window shouldn't need
    them, and the packaged Windows installer bundles both so this path is
    always taken there.

    Runs pystray's own event loop in a daemon thread: `webview.start()` below
    blocks the main thread until the window is really destroyed, and pystray's
    `run()` blocks too — two things that both want to block forever can't
    share one thread. Windows' pystray backend (the only platform this ships
    on) tolerates running off the main thread; that would not be true on
    macOS, which is one reason the desktop build doesn't target it.
    """
    try:
        import pystray
        from PIL import Image
    except ImportError:
        logger.info(
            "no system tray: install pystray + Pillow for one "
            "(pip install pystray Pillow), or use the Windows installer, "
            "which bundles both"
        )
        return None
    except Exception as exc:
        # Not just ImportError: pystray picks a backend at import time (Xorg,
        # AppKit, win32...) and that backend's own init can raise anything —
        # found in this sandbox as Xlib.error.DisplayNameError on a headless
        # Linux box with no X server. A missing tray icon is cosmetic; the
        # window is not, so this must degrade the same way a genuinely
        # missing package does rather than take the whole launcher down.
        logger.warning("system tray unavailable, continuing without one: %s", exc)
        return None

    image = None
    if icon_path.is_file():
        try:
            # Pillow's ICO decoder warns "Image was not the expected size"
            # for any .ico whose largest frame doesn't match the size in its
            # directory header — true of frontend/icon.ico, and harmless here
            # since we only ever want the largest frame. Scoped to this one
            # call so a genuine UserWarning from elsewhere still surfaces.
            with warnings.catch_warnings():
                warnings.filterwarnings(
                    "ignore",
                    message="Image was not the expected size",
                    category=UserWarning,
                )
                image = Image.open(icon_path)
        except OSError as exc:
            logger.warning("couldn't load %s for the tray icon: %s", icon_path, exc)
    if image is None:
        # A flat brand-blue square rather than no icon at all — pystray
        # requires a real image, and a missing tray icon reads as "the app
        # crashed", not "cosmetic fallback".
        image = Image.new("RGBA", (64, 64), (74, 108, 247, 255))

    def _open(icon, item) -> None:
        window.show()

    # Running from start.bat/start-desktop.bat rather than the packaged
    # installer (whose PyInstaller build sets console=False, so there is no
    # window to find) leaves a cmd.exe console sitting behind the app —
    # asked for directly: a way to get rid of it without losing the ability
    # to bring it back for a stray print/traceback. `console_hwnd` and its
    # initial `console_hidden` state come from the caller, which already
    # applied the show_console_on_startup preference before the window even
    # opened — this menu item is the *live* control, and toggling it also
    # writes the preference back, so "hide it" or "show it" from here is
    # remembered for the next launch too, not just this one.
    console_state = {"hidden": console_hidden}

    def _console_hidden(item) -> bool:
        return console_state["hidden"]

    def _toggle_console(icon, item) -> None:
        if console_hwnd is None:
            return
        going_hidden = not console_state["hidden"]

        # Best-effort, same as the startup path's own fallback: works for
        # legacy conhost, a no-op under Windows Terminal's ConPTY (see
        # _maybe_relaunch_hidden's docstring) — which the restart below is
        # what actually guarantees, at the cost of a brief relaunch instead
        # of an instant toggle.
        _apply_console_visibility(console_targets or {console_hwnd: _window_class_name(console_hwnd)}, hidden=going_hidden)
        console_state["hidden"] = going_hidden

        try:
            from memorymap.core import deps

            deps.get_config().set_preference("show_console_on_startup", not going_hidden)
        except Exception as exc:
            # Remembering the choice is a nicety on top of the live toggle,
            # which has already happened above — never let a failure here
            # make the menu item look like it did nothing.
            logger.warning("couldn't save the console visibility preference: %s", exc)

        # The reliable half: relaunch into the correct mode from scratch
        # rather than trust the ShowWindow attempt just above actually
        # worked — same _spawn_desktop the startup path and the
        # Settings-triggered restart both use, so all three take identical
        # action for the same mode switch.
        process = _spawn_desktop(hidden=going_hidden)
        if process is None:
            return  # nothing to relaunch into; the ShowWindow attempt above is all there is

        icon.stop()
        window.destroy()
        os._exit(0)

    def _view_logs(icon, item) -> None:
        # Reported directly: this used to open Settings -> Logs unconditionally,
        # which reaches straight past the lock screen if the app is locked —
        # a tray menu item is not a place that should ever be able to do that.
        # #lock-overlay's own hidden class is the same signal the frontend
        # itself uses to know whether it's locked; only jump into Settings
        # when that overlay isn't showing, otherwise just bring the window
        # (still locked) forward.
        window.show()
        window.evaluate_js(
            "if (document.getElementById('lock-overlay')?.classList.contains('hidden')"
            " && typeof openSettingsModal === 'function') {"
            " openSettingsModal(); showSettingsSection('logs'); }"
        )

    def _restart(icon, item) -> None:
        # Re-execs this same process rather than spawning a second one — no
        # window during the gap, and never two copies of the app arguing
        # over the same SQLite file if something goes wrong mid-relaunch.
        icon.stop()
        window.destroy()
        os.execv(sys.executable, [sys.executable, *sys.argv])

    def _quit(icon, item) -> None:
        icon.stop()
        window.destroy()
        # window.destroy() runs on this thread (pystray's own), not the main
        # thread blocked inside webview.start() — reported directly: Quit
        # closed the window but left the process (and the uvicorn server
        # thread behind it) running, because a cross-thread destroy call
        # isn't guaranteed to actually unblock that main-thread wait. A hard
        # exit is the same shape _restart already trusts (os.execv, no
        # graceful winddown either) and guarantees the process — and the
        # terminal it's running in — actually ends.
        os._exit(0)

    menu_items = [
        pystray.MenuItem("Open MemoryMap AI", _open, default=True),
        pystray.MenuItem("View Logs", _view_logs),
    ]
    if console_hwnd is not None:
        menu_items.append(
            pystray.MenuItem("Hide console window", _toggle_console, checked=_console_hidden)
        )
    menu_items += [
        pystray.MenuItem("Restart", _restart),
        pystray.MenuItem("Quit", _quit),
    ]
    icon = pystray.Icon(
        "memorymap",
        image,
        "MemoryMap AI",
        pystray.Menu(*menu_items),
    )
    threading.Thread(target=icon.run, daemon=True).start()
    return icon


def _reset_password() -> int:
    """Forgotten password: clear the credential so setup runs again.

    This is deliberately a command you type at a terminal, not a button in the
    UI — a "reset my password" link inside the app someone is locked out of
    would just be a way in for anyone at the keyboard.

    It is honest about the two halves of what happens, because they are very
    different:

    - Ordinary notes are NOT encrypted with the password. They are plain rows
      in SQLite, and they come back untouched.
    - Private notes ARE. Their data key is wrapped with a key derived from the
      password, so without it they cannot be decrypted by anyone, including
      this command. Clearing the credential strands them permanently.
    """
    from memorymap.core import deps
    from memorymap.core.database import Entry, User, Vault
    from sqlalchemy import func, select

    config = deps.get_config()
    db = deps.get_db()
    with db.session() as session:
        user = session.scalar(select(User))
        if user is None:
            print("No password is set — start the app and it will ask you to choose one.")
            return 0
        private_count = session.scalar(
            select(func.count(Entry.id)).where(Entry.is_private == True)  # noqa: E712
        ) or 0

        print(f"Notebook: {config.data_dir}")
        print("\nClearing the password will let you set a new one next start.")
        print("  · Your ordinary notes are not encrypted and come back untouched.")
        if private_count:
            print(
                f"  · Your {private_count} PRIVATE note(s) are encrypted with the "
                "current\n    password. They cannot be recovered without it — not by "
                "this command,\n    not by anyone. They will be lost."
            )
        else:
            print("  · You have no private notes, so nothing is unrecoverable.")

        answer = input("\nType RESET to confirm: ").strip()
        if answer != "RESET":
            print("Cancelled — nothing was changed.")
            return 1

        session.delete(user)
        # The wrapped key is useless once its password is gone; leaving it
        # would make the next setup silently reuse a vault it cannot open.
        for row in session.scalars(select(Vault)):
            session.delete(row)
        session.commit()

    print("\nPassword cleared. Start the app and it will ask you to set a new one.")
    if private_count:
        print("The private notes that were encrypted with the old password are gone.")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(prog="memorymap", description="MemoryMap AI")
    parser.add_argument(
        "--desktop",
        action="store_true",
        help="open MemoryMap in its own app window (needs pywebview)",
    )
    parser.add_argument(
        "--reset-password",
        action="store_true",
        help="forgot your password: clear it so you can set a new one "
        "(private notes encrypted with it are lost)",
    )
    # Internal — set by _maybe_relaunch_hidden's own pythonw.exe relaunch to
    # mark "this already is the console-less process," so it doesn't try to
    # relaunch itself again. Not something a person should ever type, hence
    # SUPPRESS rather than a documented flag.
    parser.add_argument("--hidden-relaunch", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.reset_password:
        raise SystemExit(_reset_password())
    if args.desktop:
        _run_desktop(hidden_relaunch=args.hidden_relaunch)
    else:
        _run_server()


if __name__ == "__main__":
    main()
