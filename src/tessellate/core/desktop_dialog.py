"""The desktop window's own Save dialog (INBOX 671).

The desktop window swallows a browser download, so every other export goes
through `/files/save` into `<data dir>/exports`. That is the wrong place for a
recovery key: it opens the private notes in the folder right beside it, so
anyone who copies the notebook folder would carry the key with it. The key is
saved where the person chooses, through pywebview's native Save dialog,
starting in their Documents folder (`routes_auth.save_recovery_key`).

pywebview runs in this same process in the desktop app (`__main__._run_desktop`),
so the server can ask its window for the dialog directly; there is no bridge
from the page. `create_file_dialog` hands the dialog to the GUI thread itself,
so calling it from a request's worker thread is how pywebview means it to be
used. Kept apart in its own module so tests replace `save_dialog` and never
need a window or the package.
"""

from __future__ import annotations

import importlib
from pathlib import Path


def documents_folder() -> Path:
    """Where the dialog starts: Documents when there is one, else home."""
    home = Path.home()
    documents = home / "Documents"
    return documents if documents.is_dir() else home


def save_dialog(filename: str, start: Path) -> Path | None:
    """Ask where to save `filename`; the chosen path, or None if cancelled
    (or there is no window to ask from)."""
    try:
        webview = importlib.import_module("webview")
    except ImportError:
        return None
    windows = getattr(webview, "windows", None) or []
    if not windows:
        return None
    # pywebview 5 named it `FileDialog.SAVE`; older releases `SAVE_DIALOG`.
    kind = getattr(getattr(webview, "FileDialog", None), "SAVE", None)
    if kind is None:
        kind = getattr(webview, "SAVE_DIALOG", None)
    if kind is None:
        return None
    chosen = windows[0].create_file_dialog(kind, directory=str(start), save_filename=filename)
    if isinstance(chosen, (list, tuple)):
        chosen = chosen[0] if chosen else None
    return Path(chosen) if chosen else None
