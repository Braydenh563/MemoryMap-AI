"""Settings, About, Maintenance (core/maintenance.py, core/doctor.py).

Every route acts on, or reads the insides of, this computer: its folders, its
Python, its desktop. So every route is this-computer-only (this_computer.py),
the read included; a phone sees the refusal and the buttons say so.
"""

from __future__ import annotations

import logging
import sys

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from memorymap.api.routes_files import reveal_folder
from memorymap.api.this_computer import this_computer_only
from memorymap.core import deps, doctor, maintenance, netbind

logger = logging.getLogger(__name__)
router = APIRouter(tags=["maintenance"])

_HOST = [Depends(this_computer_only)]


def _data_dir():  # noqa: ANN202
    return deps.get_config().data_dir


@router.get("/system/maintenance", dependencies=_HOST)
def maintenance_state() -> dict:
    """What the group shows before anything is pressed."""
    data_dir = _data_dir()
    return {
        "frozen": maintenance.is_frozen(),
        "source": maintenance.is_source_checkout(),
        "platform": sys.platform,
        "reinstall_pending": maintenance.reinstall_pending(data_dir),
        "logs_dir": str(maintenance.logs_dir(data_dir)),
        "uninstall": maintenance.uninstall_plan(),
    }


@router.get("/system/doctor", dependencies=_HOST)
def run_doctor(request: Request) -> dict:
    """Check this computer: the launcher's doctor rows, from inside the app."""
    config = deps.get_config()
    rows = doctor.run(
        data_dir=config.data_dir,
        port=request.url.port,
        provider=str(config.get_preference("llm_provider", "ollama") or "ollama"),
        client=deps.get_ollama(),
        embeddings=deps.get_embeddings(),
        described=netbind.describe(config, request.url.port),
    )
    return {"rows": rows, "failed": any(row["status"] == "x" for row in rows)}


class ReinstallBody(BaseModel):
    enabled: bool


@router.post("/system/reinstall-on-start", dependencies=_HOST)
def reinstall_on_start(body: ReinstallBody) -> dict:
    """Leave (or take back) the marker start.sh and start.bat read as
    `--reinstall` once. The packaged app has no .venv to rebuild."""
    if not maintenance.is_source_checkout():
        raise HTTPException(
            status_code=409,
            detail="This copy has no Python environment to rebuild. Use the installer's Repair shortcut instead.",
        )
    return {"reinstall_pending": maintenance.set_reinstall(_data_dir(), body.enabled)}


@router.post("/system/open-logs-folder", dependencies=_HOST)
def open_logs_folder() -> dict:
    """Open the launcher logs. From any shell on this computer, not only the
    desktop window: a browser tab started by start.sh is who needs them most,
    and the guard above is what keeps a phone from opening a window here."""
    folder = maintenance.logs_dir(_data_dir())
    reveal_folder(folder, "the launcher logs")
    return {"path": str(folder)}


@router.post("/system/desktop-shortcut", dependencies=_HOST)
def desktop_shortcut() -> dict:
    """The shortcut `start --shortcut` makes, at the same path."""
    try:
        return maintenance.make_shortcut()
    except maintenance.ShortcutError as exc:
        key = str(exc.args[0]) if exc.args else "not-made"
        refusal = maintenance.SHORTCUT_REFUSALS.get(key, maintenance.SHORTCUT_REFUSALS["not-made"])
        raise HTTPException(status_code=500, detail=refusal) from exc
    except OSError as exc:
        logger.warning("could not make the desktop shortcut", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not create the shortcut. Check that your home folder is writable.") from exc
