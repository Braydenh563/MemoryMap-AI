"""The offline translator's two routes (WORLD_CLASS_PLAN 28.5 row 10).

The translation itself runs in the browser (`ai/translate.py` says why);
the server says what is installed and hands the worker its files.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from memorymap.ai import translate

router = APIRouter(prefix="/translate", tags=["translate"])

#: Open without the unlock, like the Python runtime's files
#: (`run_sandbox.pyodide_file`): a Worker's own fetch carries no token, and
#: these are the public engine and model, nothing of the notebook's.
files_router = APIRouter(prefix="/translate", tags=["translate"])


@router.get("/status")
def status() -> dict:
    return translate.status()


@files_router.get("/files/{name}")
def translate_file(name: str) -> FileResponse:
    found = translate.served(name)
    if found is None:
        raise HTTPException(status_code=404, detail="Not installed.")
    path, media_type = found
    return FileResponse(path, media_type=media_type, headers={"Cache-Control": "no-cache"})
