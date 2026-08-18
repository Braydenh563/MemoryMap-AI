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
    time.sleep(1.0)  # give uvicorn a moment to bind before the window loads
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
    if getattr(sys, "frozen", False):
        _frontend_dir = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent)) / "frontend"
    else:
        _frontend_dir = Path(__file__).resolve().parents[2] / "frontend"
    _icon_path = _frontend_dir / "icon.ico"
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
    tray_icon = _start_tray(window, _icon_path)
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


def _start_tray(window, icon_path: Path):
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

    def _view_logs(icon, item) -> None:
        window.show()
        window.evaluate_js(
            "if (typeof openSettingsModal === 'function') {"
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

    icon = pystray.Icon(
        "memorymap",
        image,
        "MemoryMap AI",
        pystray.Menu(
            pystray.MenuItem("Open MemoryMap AI", _open, default=True),
            pystray.MenuItem("View Logs", _view_logs),
            pystray.MenuItem("Restart", _restart),
            pystray.MenuItem("Quit", _quit),
        ),
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
