"""The launcher's doctor, asked from inside the app.

The owner, 2026-10-11: "Can you add like buttons in settings to run them in
like the about page??", about doctor.sh, reinstall.sh and tools.sh. Settings,
About, Maintenance's "Check this computer" cannot call `start.sh --doctor`:
the packaged app has no start.sh, and on a source checkout the script would
flash its splash. So the checks are here, in Python, and the rows both
doctors print where they overlap carry the same names (`SHARED_ROWS`;
tests/test_maintenance.py reads start.sh and start.bat for them).

A row is `{"status": "ok"|"warn"|"x", "label", "value", "fix"}`, the shell
table's `[ok]`, `[!]` and `[x]` with the line under a cross. Nothing here
raises: a check that cannot answer is a warn that says so.
"""

from __future__ import annotations

import re
import sys
import tempfile
from pathlib import Path

from memorymap.core import diskspace

#: Rows both doctors print, by the shell's own labels. The port row is
#: "Port <n>" in both; the model row is "Ollama", or "Provider" for any other.
SHARED_ROWS = ("Python", "Disk", "Port", "Ollama", "Provider", "Notes", "Last run")

#: Rows only this one prints: the app knows them and the shell cannot.
APP_ROWS = ("Search model", "Other devices")

#: The launcher's own threshold (start.sh's mm_doctor, start.bat's :doctor_disk).
LOW_DISK_BYTES = 1024 * 1024 * 1024

#: What the shell's Last run row greps the newest launcher log for.
_LOG_FAULT = re.compile(r"\[x\]|error|traceback|failed", re.IGNORECASE)


def _row(status: str, label: str, value: str, fix: str = "") -> dict:
    return {"status": status, "label": label, "value": value, "fix": fix if status != "ok" else ""}


def python_row() -> dict:
    version = "%d.%d.%d" % sys.version_info[:3]
    if getattr(sys, "frozen", False):
        return _row("ok", "Python", f"{version}, inside the app")
    where = sys.executable or "unknown"
    if (3, 11) <= sys.version_info[:2] < (3, 14):
        return _row("ok", "Python", f"{version} at {where}")
    return _row(
        "warn", "Python", f"{version} at {where}",
        "This app is tested on 3.11 to 3.13. Install one of those and reinstall on next start.",
    )


def disk_row(data_dir: Path) -> dict:
    target = data_dir if data_dir.is_dir() else data_dir.parent
    free = diskspace.free_bytes(target)
    if free is None:
        return _row("warn", "Disk", f"could not read free space on {target}")
    shown = f"{diskspace.human_bytes(free)} free on {target}"
    if free < LOW_DISK_BYTES:
        return _row("x", "Disk", shown, "Under 1 GB. Free some space: notes, uploads and search models all live here.")
    return _row("ok", "Disk", shown)


def notes_row(data_dir: Path) -> dict:
    """Where the notes are, how big, and whether the app can still write there:
    the shell's Notes row plus the one thing only a running app can try."""
    size = diskspace.human_bytes(diskspace.dir_bytes(data_dir)) if data_dir.is_dir() else "not created yet"
    shown = f"{data_dir}, {size}"
    try:
        with tempfile.NamedTemporaryFile(dir=data_dir, prefix=".doctor-", delete=True):
            pass
    except OSError:
        return _row(
            "x", "Notes", f"{shown}, not writable",
            "Check the folder's permissions, or move the notes with MEMORYMAP_DATA_DIR.",
        )
    return _row("ok", "Notes", shown)


def port_row(port: int | None) -> dict:
    """The app is answering, so its port is its own: the shell's "already
    running" line, which that table also counts as a pass."""
    if not port:
        return _row("warn", "Port", "could not tell which port this page came in on")
    return _row("ok", f"Port {port}", f"Tessellate is already running, open http://localhost:{port}")


def model_row(provider: str, client) -> dict:  # noqa: ANN001  # a Provider
    url = str(getattr(client, "base_url", "") or "")
    label = "Ollama" if provider == "ollama" else "Provider"
    try:
        running = bool(client.is_running())
        models = client.list_models() if running else []
    except Exception:  # noqa: BLE001  # a probe that fails is an answer, not a crash
        running, models = False, []
    if not running:
        return _row(
            "warn", label, f"nothing answered at {url}",
            "Start the model server, or switch provider in Settings, Models. Notes and search work without it.",
        )
    if not models:
        return _row("warn", label, f"{url}, no models installed", "Settings, Models downloads one.")
    return _row("ok", label, f"{url}, models installed: {len(models)}")


def search_model_row(embeddings) -> dict:  # noqa: ANN001  # an EmbeddingService
    from memorymap.core import embedmodels

    health = getattr(embedmodels, "cache_health", None)
    if callable(health):
        try:
            said = health()
        except Exception:  # noqa: BLE001
            said = None
        if isinstance(said, dict) and said.get("ok") is False:
            return _row("warn", "Search model", str(said.get("detail") or "the model cache needs attention"),
                        "Settings, Search and index can download the model again.")
    try:
        name = embeddings.active_model()
        ready = embeddings.is_ready()
    except Exception:  # noqa: BLE001
        name, ready = "", False
    if ready:
        return _row("ok", "Search model", f"{name}, loaded")
    return _row(
        "warn", "Search model", f"{name or 'none'}, not loaded yet",
        "Search matches words until it loads. Settings, Search and index says why.",
    )


def other_devices_row(described: dict) -> dict:
    """LAN state, from `netbind.describe`: what is true now, and whether a
    restart is owed."""
    on_now = bool(described.get("other_devices"))
    if described.get("restart_required"):
        wanted = "on" if described.get("lan_on_next_launch") else "off"
        return _row("warn", "Other devices", f"switched {wanted}, not yet applied", "Restart the app to apply it.")
    if on_now:
        where = ", ".join(described.get("addresses") or []) or "this network"
        return _row("ok", "Other devices", f"allowed, at {where}")
    return _row("ok", "Other devices", "off, only this computer can open it")


def last_run_row(data_dir: Path) -> dict:
    """The newest launcher log, read as the shell reads it: history, so a
    fault there is a warn, never a cross."""
    logs = sorted((data_dir / "logs").glob("launcher-*.log"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not logs:
        return _row("ok", "Last run", "no launcher log yet")
    newest = logs[0]
    try:
        lines = newest.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return _row("warn", "Last run", f"could not read {newest.name}")
    faults = [line.strip() for line in lines if _LOG_FAULT.search(line)]
    if faults:
        return _row("warn", "Last run", faults[-1][:100], f"From {newest}")
    return _row("ok", "Last run", f"no errors in {newest.name}")


def run(*, data_dir: Path, port: int | None, provider: str, client, embeddings, described: dict) -> list[dict]:  # noqa: ANN001
    """Every row, in the shell table's order, the app's own rows last."""
    data_dir = Path(data_dir)
    return [
        python_row(),
        disk_row(data_dir),
        port_row(port),
        model_row(provider, client),
        notes_row(data_dir),
        last_run_row(data_dir),
        search_model_row(embeddings),
        other_devices_row(described),
    ]


def row_name(label: str) -> str:
    """A label without its port number, so "Port 8000" and "Port 8792" match."""
    return "Port" if label.startswith("Port") else label
