"""Storage location and backup CRUD (backup/restore/delete).

Split out of `routes_settings.py`'s "backups (Wave F)" section
(ROADMAP.md §0/§4).
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from memorymap.core import backup, deps
from memorymap.core.deps import get_session
from memorymap.entry import manager

router = APIRouter(tags=["settings"])

@router.get("/storage")
def storage_location() -> dict:
    """Where everything actually lives on disk.

    "Where are my documents stored?" was asked outright, and the app had no
    answer anywhere in its interface. For a local-first app that is close to
    the whole promise: a notebook you can't locate is not obviously yours,
    and someone who can't see the file has no reason to believe a document
    they wrote is still there.
    """
    config = deps.get_config()
    db_path = Path(config.db_path)
    return {
        "data_dir": str(Path(config.data_dir).resolve()),
        "database": str(db_path.resolve()),
        "database_bytes": db_path.stat().st_size if db_path.exists() else 0,
        "backups_dir": str(backup.backups_dir(config.data_dir).resolve()),
    }


@router.get("/backups")
def list_backups() -> list[dict]:
    return backup.list_backups(deps.get_config().data_dir)


@router.post("/backups", status_code=201)
def backup_now(session: Session = Depends(get_session)) -> dict:
    config = deps.get_config()
    path = backup.backup_now(config.db_path, config.data_dir)
    manager.log_action(session, "backed_up", "data", detail=path.name)
    session.commit()
    return {"name": path.name}


class RestoreBody(BaseModel):
    name: str = Field(min_length=1, max_length=120)


@router.post("/backups/restore")
def restore_backup(body: RestoreBody) -> dict:
    """Swap the live database for a backup. A safety snapshot of the
    current state is taken first, so a restore is itself undoable."""
    config = deps.get_config()
    # Every connection must be closed while the file is replaced.
    deps.get_db().engine.dispose()
    try:
        backup.restore_backup(body.name, config.db_path, config.data_dir)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    finally:
        deps.reload_db()
    session = deps.get_db().session()
    try:
        manager.log_action(session, "restored", "data", detail=body.name)
        session.commit()
    finally:
        session.close()
    return {"restored": body.name}


@router.delete("/backups/{name}")
def delete_backup(name: str) -> dict:
    folder = backup.backups_dir(deps.get_config().data_dir)
    path = folder / name
    # Path(name).name guards traversal; only files inside backups/ die.
    if path.name != name or not path.is_file():
        raise HTTPException(status_code=404, detail="Backup not found")
    path.unlink()
    return {"deleted": name}
