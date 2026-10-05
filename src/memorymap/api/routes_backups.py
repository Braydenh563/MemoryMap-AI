"""Storage location and backup CRUD (backup/restore/delete).

Split out of `routes_settings.py`'s "backups" section
(ROADMAP.md §0/§4).
"""

from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from memorymap.api import routes_auth
from memorymap.core import backup, backup_bundle, deps, diskspace, jobruns
from memorymap.core.deps import get_session
from memorymap.entry import manager

router = APIRouter(tags=["settings"])

#: Bounds on the retention setting itself, 1 (barely a safety net) to 100
#: (a number chosen to still mean something rather than "unlimited" wearing
#: a costume, on a machine writing a database backup that could itself be
#: sizeable).
MIN_RETENTION = 1
MAX_RETENTION = 100


def _retention(config) -> int:
    return int(config.get_preference("backup_retention_count", backup.KEEP_BACKUPS))


class RetentionBody(BaseModel):
    keep: int = Field(ge=MIN_RETENTION, le=MAX_RETENTION)


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
        #: What the folders beside the database weigh (a cached walk,
        #: `diskspace.dir_bytes`): attached files, pictures and the backups
        #: themselves, so "where did my disk go" has an answer in the app.
        "uploads_bytes": diskspace.dir_bytes(Path(config.data_dir) / "uploads"),
        "media_bytes": diskspace.dir_bytes(Path(config.data_dir) / "media"),
        "backups_bytes": diskspace.dir_bytes(Path(config.data_dir) / "backups"),
        "backup_retention_count": _retention(config),
        "backup_retention_min": MIN_RETENTION,
        "backup_retention_max": MAX_RETENTION,
        # ROADMAP.md's onboarding item named this a still-open gap: a
        # data-dir writability check. The database already opening here
        # implies the directory is writable *now*, but a machine can go
        # read-only under it later (a synced folder, a permissions change, a
        # full disk remounted read-only) with nothing in the interface ever
        # saying so until a save silently fails. `os.access` is the same
        # check `_validated_export_dir` below already trusts for the export
        # folder; this is the same question asked of the notebook's own
        # folder instead.
        "data_dir_writable": os.access(config.data_dir, os.W_OK),
        #: **How much room is left, before a save is the thing that says so.**
        #: `data_dir_writable` answers "may the app write here", which stayed
        #: `true` on a disk measured at 100% full (INBOX 266, item 6), so on
        #: its own it is a reassurance the app cannot keep. These two are the
        #: rest of the answer, and the Settings panel warns from them.
        #: `None` when the filesystem cannot be read at all, never a 0 that
        #: would read as "no space left".
        "free_bytes": diskspace.free_bytes(config.data_dir),
        "disk_total_bytes": diskspace.total_bytes(config.data_dir),
        #: The threshold is the server's to decide, not four call sites'.
        "low_space_bytes": diskspace.LOW_SPACE_BYTES,
    }


@router.get("/backups")
def list_backups() -> list[dict]:
    # Unchanged shape (a plain list): `keep`/the retention bounds live on
    # GET /storage instead, which already answers "what does this app keep
    # on disk and where," rather than reshaping an endpoint existing callers
    # (including this app's own tests) already treat as one.
    return backup.list_backups(deps.get_config().data_dir)


@router.post("/backups", status_code=201)
def backup_now(session: Session = Depends(get_session)) -> dict:
    config = deps.get_config()
    #: A disk that is full, read-only or has a file where the backups folder
    #: should be is the person's to fix, so it is said in words (a 507 the
    #: toast shows as written) rather than the bare "Internal error" a raised
    #: OSError became. `job_run` has already recorded the failure by the time
    #: this catches it, so the last-run line says the same thing.
    try:
        with jobruns.job_run("backup") as run:
            path = backup.backup_now(config.db_path, config.data_dir, _retention(config))
            run.result = f"saved {path.name}"
    except OSError as exc:
        raise HTTPException(
            status_code=507,
            detail=f"Couldn't save the backup: {exc.strerror or 'the disk refused the write'}.",
        ) from exc
    manager.log_action(session, "backed_up", "data", detail=path.name)
    session.commit()
    return {"name": path.name}


@router.put("/backups/retention")
def set_retention(body: RetentionBody) -> dict:
    """How many backups to keep, and prune immediately to match, asked
    about directly ("backup retention should be a setting"). Immediate,
    not just for the next scheduled backup: lowering the number and still
    seeing the old count is the "did that even save" moment every other
    preference in this app avoids by writing straight through.
    """
    config = deps.get_config()
    config.set_preference("backup_retention_count", body.keep)
    removed = backup.prune(config.data_dir, body.keep)
    return {"keep": body.keep, "removed": removed}


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
        backup.restore_backup(body.name, config.db_path, config.data_dir, _retention(config))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        # A backup that is damaged or empty: the live database was not touched
        # (restore_backup checks a temp copy first), and the sentence is the
        # one that function wrote for the person.
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        deps.reload_db()
    session = deps.get_db().session()
    try:
        manager.log_action(session, "restored", "data", detail=body.name)
        session.commit()
    finally:
        session.close()
    # SEC-07: the restored file has its own vault row (and maybe its own
    # password), so every session ends and the key in memory is dropped; the
    # app shows the lock screen and the password unwraps the restored key.
    routes_auth.end_every_session()
    return {"restored": body.name, "signed_out": True}


@router.delete("/backups/{name}")
def delete_backup(name: str) -> dict:
    folder = backup.backups_dir(deps.get_config().data_dir)
    path = folder / name
    # Path(name).name guards traversal; only files inside backups/ die.
    if path.name != name or not path.is_file():
        raise HTTPException(status_code=404, detail="That backup could not be found.")
    path.unlink()
    return {"deleted": name}


#: The shortest password a sealed file takes. It is the only thing between the
#: file and anyone who finds it, and the key derivation is slow on purpose, so
#: this is a floor against a one-word guess, not a policy.
MIN_BUNDLE_PASSWORD = 8


class BundleBody(BaseModel):
    password: str | None = Field(default=None, max_length=200)


def _unlink_quietly(*paths: str) -> None:
    for path in paths:
        try:
            os.remove(path)
        except OSError:
            pass  # never written, or already gone: nothing to clean up


@router.post("/backups/bundle")
def export_bundle(body: BundleBody, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """The whole notebook as one file: a zip, or with a password a `.mmenc`
    sealed with it (BACKLOG 115 row 10). A POST so the password is in the
    body, not a URL that lands in a log."""
    password = body.password or None
    if password is not None and len(password) < MIN_BUNDLE_PASSWORD:
        raise HTTPException(
            status_code=422,
            detail=f"Use a password of at least {MIN_BUNDLE_PASSWORD} characters, or leave it empty for a plain zip.",
        )
    config = deps.get_config()
    zip_fd, zip_path = tempfile.mkstemp(suffix=".zip", prefix="memorymap_bundle_")
    os.close(zip_fd)
    sealed_path = ""
    try:
        backup_bundle.build_zip(config.data_dir, config.db_path, Path(zip_path))
        served = zip_path
        if password is not None:
            sealed_fd, sealed_path = tempfile.mkstemp(suffix=".mmenc", prefix="memorymap_bundle_")
            os.close(sealed_fd)
            backup_bundle.encrypt_file(Path(zip_path), Path(sealed_path), password)
            served = sealed_path
    except OSError as exc:
        _unlink_quietly(zip_path, sealed_path)
        raise HTTPException(
            status_code=507,
            detail=f"Couldn't write the backup: {exc.strerror or 'the disk refused the write'}.",
        ) from exc
    background_tasks.add_task(_unlink_quietly, zip_path, sealed_path)
    manager.log_action(session, "backed_up", "data", detail="full backup file" + (" (encrypted)" if password else ""))
    session.commit()
    sealed = password is not None
    return FileResponse(
        served,
        media_type="application/octet-stream" if sealed else "application/zip",
        filename="memorymap-backup.mmenc" if sealed else "memorymap-backup.zip",
        background=background_tasks,
    )


@router.post("/backups/bundle/restore")
def restore_bundle(file: UploadFile = File(...), password: str = Form(default="")) -> dict:
    """Replace the notebook with the one in an uploaded full backup, a zip or
    a `.mmenc` with its password. Everything is checked before the live
    notebook is touched; a safety snapshot is taken first, so this is itself
    undoable from the backups list."""
    config = deps.get_config()
    in_fd, upload_path = tempfile.mkstemp(suffix=".upload", prefix="memorymap_import_")
    zip_path = ""
    try:
        with os.fdopen(in_fd, "wb") as sink:
            shutil.copyfileobj(file.file, sink, length=backup_bundle.CHUNK_BYTES)
        try:
            if backup_bundle.is_sealed(Path(upload_path)):
                if not password:
                    raise backup_bundle.BundleError(
                        "This file is encrypted. Enter the password it was saved with."
                    )
                zip_fd, zip_path = tempfile.mkstemp(suffix=".zip", prefix="memorymap_import_")
                os.close(zip_fd)
                backup_bundle.decrypt_file(Path(upload_path), Path(zip_path), password)
                archive = Path(zip_path)
            else:
                archive = Path(upload_path)
            # Every connection must be closed while the file is replaced.
            deps.get_db().engine.dispose()
            try:
                result = backup_bundle.restore_zip(archive, config.db_path, config.data_dir, _retention(config))
            finally:
                deps.reload_db()
        except (backup_bundle.BundleError, ValueError) as exc:
            # BundleError is ValueError: the sentence is the one the module
            # wrote for the person, and the live notebook was not touched.
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except OSError as exc:
            raise HTTPException(
                status_code=507,
                detail=f"Couldn't read the backup: {exc.strerror or 'the disk refused the write'}.",
            ) from exc
    finally:
        _unlink_quietly(upload_path, zip_path)
    session = deps.get_db().session()
    try:
        manager.log_action(session, "restored", "data", detail="full backup file")
        session.commit()
    finally:
        session.close()
    # SEC-07, as `restore_backup`: the restored file has its own vault row.
    routes_auth.end_every_session()
    return {"restored": True, "files": result["files"], "skipped": result["skipped"], "signed_out": True}
