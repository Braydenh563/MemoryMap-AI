"""`POST /import/app`: notes from Notion, Obsidian, Evernote or Apple Notes
(WORLD_CLASS_PLAN H6, row 25). The readers and the writer are
`entry/app_import.py`; this is the door, the size caps and the job line.

One step, as every import in Settings is (INBOX 464 (18)): the files arrive
with the press that chose them, and the answer carries the ids so the
toast's Undo can bin exactly these notes.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from memorymap.core import deps, jobruns
from memorymap.core.deps import get_session
from memorymap.entry import app_import, manager

router = APIRouter(tags=["import"])

#: Files in one request: a vault picked as a folder is many files.
MAX_FILES = 5000


@router.post("/import/app", status_code=201)
def import_app(
    files: list[UploadFile],
    source: str = Query(pattern="^(notion|obsidian|evernote|apple)$"),
    session: Session = Depends(get_session),
) -> dict:
    from memorymap.api.routes_settings import _parse_frontmatter

    if len(files) > MAX_FILES:
        raise HTTPException(status_code=422, detail=f"{len(files)} files at once is more than one import takes ({MAX_FILES}).")
    raw: list[tuple[str, bytes]] = []
    total = 0
    for upload in files:
        data = upload.file.read(app_import.MAX_ARCHIVE_BYTES + 1)
        total += len(data)
        if total > app_import.MAX_ARCHIVE_BYTES:
            raise HTTPException(status_code=413, detail="That export is larger than 200 MB.")
        raw.append((upload.filename or "note", data))
    label = app_import.LABELS[source]
    try:
        read = app_import.read(source, raw, parse_frontmatter=_parse_frontmatter)
    except app_import.TooBig as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    with jobruns.job_run("import") as run:
        written = app_import.write(session, source, read.notes)
        for entry in written.pop("entries"):
            deps.store_quietly(session, entry)
        run.result = (
            f"imported {written['imported']} note{'' if written['imported'] == 1 else 's'} from {label}"
            + (f", {written['already']} already here" if written["already"] else "")
        )
    manager.log_action(session, "imported", "data", detail=f"{source} x{written['imported']}")
    session.commit()
    if written["imported"]:
        deps.mark_index_stale(written["imported"])
    return {**written, "skipped": read.skipped[:50], "source": source, "found": len(read.notes)}
