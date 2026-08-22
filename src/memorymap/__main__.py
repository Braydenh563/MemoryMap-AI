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
from pathlib import Path

import uvicorn

from memorymap.api.app import create_app

logger = logging.getLogger("memorymap.launcher")

HOST, PORT = "127.0.0.1", 8000  # local only — this is a private app


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


def _run_desktop() -> None:
    """A real app window: uvicorn in a background thread,
    pywebview in front. Closing the window exits the process."""
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

    # Tells /health — and through it the frontend — that this is the window
    # rather than a browser tab, so exports get written by the server instead
    # of clicking an `<a download>` that pywebview silently swallows (§35E).
    # Set before the server thread starts, so the app never sees it unset.
    os.environ["MEMORYMAP_DESKTOP"] = "1"
    server = threading.Thread(target=_run_server, daemon=True)
    server.start()
    _wait_for_server()

    # Hide the console before the window even opens, unless the user has
    # asked to keep seeing it — asked for directly: "I want it to be hidden
    # but the user can make it show ... if they want", both as a startup
    # preference (Settings, this) and live (the tray toggle below). Safe to
    # read config now: _wait_for_server() only returns once create_app()
    # (which builds the config singleton) has already run on the server
    # thread. None on any non-Windows platform, or the packaged installer's
    # console-less build — nothing to hide either way.
    console_hwnd = _get_console_hwnd() if sys.platform == "win32" else None
    console_hidden = False
    if console_hwnd is not None:
        from memorymap.core import deps

        show_on_startup = deps.get_config().get_preference(
            "show_console_on_startup", False
        )
        if not show_on_startup:
            import ctypes

            ctypes.windll.user32.ShowWindow(console_hwnd, 0)  # SW_HIDE
            console_hidden = True

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
        _start_tray(window, _icon_path, console_hwnd, console_hidden)
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


def _start_tray(window, icon_path: Path, console_hwnd: int | None, console_hidden: bool):
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
        import ctypes

        SW_HIDE, SW_SHOW = 0, 5
        console_state["hidden"] = not console_state["hidden"]
        ctypes.windll.user32.ShowWindow(
            console_hwnd, SW_HIDE if console_state["hidden"] else SW_SHOW
        )
        try:
            from memorymap.core import deps

            deps.get_config().set_preference(
                "show_console_on_startup", not console_state["hidden"]
            )
        except Exception as exc:
            # Remembering the choice is a nicety on top of the live toggle,
            # which has already happened above — never let a failure here
            # make the menu item look like it did nothing.
            logger.warning("couldn't save the console visibility preference: %s", exc)

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
    args = parser.parse_args()
    if args.reset_password:
        raise SystemExit(_reset_password())
    if args.desktop:
        _run_desktop()
    else:
        _run_server()


if __name__ == "__main__":
    main()
