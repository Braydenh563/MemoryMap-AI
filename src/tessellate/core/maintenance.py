"""Settings, About, Maintenance: the launcher's actions, from inside the app.

The owner, 2026-10-11: "Can you add like buttons in settings to run them in
like the about page??", about the root files doctor, reinstall, tools and
uninstall. Each action here is the launcher's own, said once more in Python
only where the app cannot call the script (the packaged app has none):

- Reinstall cannot rebuild the environment the app is running from, so it
  leaves `REINSTALL_MARKER` in the data folder; start.sh and start.bat treat
  it as `--reinstall` once and delete it.
- The desktop shortcut writes what `start.sh --shortcut` and `start.bat
  --shortcut` write, at the same paths, so `uninstall --shortcuts` still
  finds it (tests/test_maintenance.py compares the two).
- Uninstall is never one click: the app names the command and the steps.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

#: The file start.sh and start.bat look for in the data folder.
REINSTALL_MARKER = "reinstall-on-next-start"

#: src/tessellate/core/maintenance.py -> the checkout's root.
ROOT = Path(__file__).resolve().parents[3]

#: The names the launchers and the uninstallers already use.
LINUX_ENTRY = "memorymap-ai.desktop"
MAC_LINK = "Tessellate"
WINDOWS_LINK = "Tessellate.lnk"


#: Why a shortcut was not made, as the sentence a person reads. The route
#: answers with these, never with an exception's own text.
SHORTCUT_REFUSALS = {
    "not-made": "Could not create the shortcut on your Desktop. Check that PowerShell is allowed to run.",
    "no-desktop": "There is no Desktop folder to put the shortcut in.",
}


class ShortcutError(OSError):
    """A refusal keyed in `SHORTCUT_REFUSALS`."""


def is_frozen() -> bool:
    return bool(getattr(sys, "frozen", False))


def is_source_checkout(root: Path = ROOT) -> bool:
    """A checkout the launcher runs from: the only kind with a .venv."""
    return not is_frozen() and ((root / "start.sh").is_file() or (root / "start.bat").is_file())


def reinstall_pending(data_dir: Path) -> bool:
    return (Path(data_dir) / REINSTALL_MARKER).is_file()


def set_reinstall(data_dir: Path, on: bool) -> bool:
    marker = Path(data_dir) / REINSTALL_MARKER
    if on:
        marker.parent.mkdir(parents=True, exist_ok=True)
        marker.write_text("Written by Settings, About, Maintenance. The launcher deletes it.\n", encoding="utf-8")
    else:
        marker.unlink(missing_ok=True)
    return marker.is_file()


def logs_dir(data_dir: Path) -> Path:
    """Where start.sh and start.bat write launcher-<date>.log."""
    return Path(data_dir) / "logs"


def uninstall_plan(platform: str | None = None, frozen: bool | None = None, root: Path = ROOT) -> dict:
    """The steps and the one command for this computer. `command` is empty
    where there is no command to type (the Windows installer's own entry)."""
    platform = platform or sys.platform
    frozen = is_frozen() if frozen is None else frozen
    if frozen and platform == "win32":
        return {
            "command": "",
            "steps": [
                "Export your notes first if you want to keep a copy elsewhere.",
                "Quit the app.",
                "In Windows, press Start, type Installed apps, find Tessellate and choose Uninstall.",
                "Your notes folder stays unless you choose to delete it there.",
            ],
        }
    if frozen:
        return {
            "command": "",
            "steps": [
                "Export your notes first if you want to keep a copy elsewhere.",
                "Quit the app, then delete it from your Applications folder.",
                "Your notes folder stays where it is until you delete it by hand.",
            ],
        }
    if platform == "win32":
        command = f'cd /d "{root}" && uninstall.bat'
    else:
        command = f'cd "{root}" && ./uninstall.sh'
    return {
        "command": command,
        "steps": [
            "Export your notes first if you want to keep a copy elsewhere.",
            "Quit the app.",
            "Open a terminal and run the command below. It removes the app's Python environment and asks before anything else.",
            "Your notes stay unless you add --delete-data, which asks again.",
        ],
    }


def _desktop_entry(root: Path, exec_line: str, icon_root: Path | None = None) -> str:
    """start.sh's mm_shortcut entry, line for line. A packaged app's icon is
    in its own bundle (`icon_root`), not beside a checkout."""
    return "\n".join([
        "[Desktop Entry]",
        "Type=Application",
        "Name=Tessellate",
        "Comment=Your notes, pieced together",
        f"Exec={exec_line}",
        f"Path={root}",
        f"Icon={icon_root or root}/frontend/icon-512.png",
        "Terminal=false",
        "Categories=Office;Utility;",
        "",
    ])


def _ps_quote(text: str) -> str:
    return "'" + str(text).replace("'", "''") + "'"


def _shortcut_windows(target: Path, frozen: bool, root: Path, desktop: Path, run) -> dict:  # noqa: ANN001
    link = desktop / WINDOWS_LINK
    program = str(target) if frozen else str(root / "start.bat")
    icon = str(target) if frozen else str(root / "frontend" / "icon.ico")
    script = (
        f"$s=(New-Object -ComObject WScript.Shell).CreateShortcut({_ps_quote(link)}); "
        f"$s.TargetPath={_ps_quote(program)}; $s.Arguments='--desktop'; "
        f"$s.WorkingDirectory={_ps_quote(target.parent if frozen else root)}; "
        f"$s.IconLocation={_ps_quote(icon)}; $s.Description='Tessellate'; $s.Save()"
    )
    run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
        capture_output=True, timeout=30, check=False)
    if not link.exists():
        raise ShortcutError("not-made")
    return {"path": str(link)}


def _shortcut_mac(target: Path, frozen: bool, root: Path, desktop: Path) -> dict:
    if not desktop.is_dir():
        raise ShortcutError("no-desktop")
    link = desktop / MAC_LINK
    link.unlink(missing_ok=True)
    link.symlink_to(target if frozen else root / "start.sh")
    return {"path": str(link)}


def _shortcut_linux(target: Path, frozen: bool, root: Path, home: Path, desktop: Path) -> dict:
    apps = home / ".local" / "share" / "applications"
    apps.mkdir(parents=True, exist_ok=True)
    exec_line = f"{target} --desktop" if frozen else f"{root}/start.sh --desktop"
    entry = apps / LINUX_ENTRY
    base = target.parent if frozen else root
    icon_root = Path(getattr(sys, "_MEIPASS", base)) if frozen else root
    entry.write_text(_desktop_entry(base, exec_line, icon_root), encoding="utf-8")
    entry.chmod(0o755)
    out = {"path": str(entry)}
    if desktop.is_dir():
        copy = desktop / LINUX_ENTRY
        copy.write_text(entry.read_text(encoding="utf-8"), encoding="utf-8")
        copy.chmod(0o755)
        out["desktop_copy"] = str(copy)
    return out


def make_shortcut(
    *,
    home: Path | None = None,
    platform: str | None = None,
    frozen: bool | None = None,
    root: Path = ROOT,
    desktop: Path | None = None,
    run=subprocess.run,  # noqa: ANN001
) -> dict:
    """Make the desktop shortcut the launcher makes, and say where it went.

    Raises ShortcutError keyed in SHORTCUT_REFUSALS, or the OSError the
    file system gave."""
    platform = platform or sys.platform
    frozen = is_frozen() if frozen is None else frozen
    home = Path(home or Path.home())
    target = Path(sys.executable) if frozen else root
    if platform == "win32":
        return _shortcut_windows(target, frozen, root, desktop or Path(os.environ.get("USERPROFILE") or home) / "Desktop", run)
    if platform == "darwin":
        return _shortcut_mac(target, frozen, root, desktop or home / "Desktop")
    return _shortcut_linux(target, frozen, root, home, desktop or home / "Desktop")
