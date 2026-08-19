import sys
import re

with open('src/memorymap/api/routes_settings.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add BackgroundTasks to imports
if "BackgroundTasks" not in content:
    content = content.replace(
        "from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, UploadFile",
        "from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Response, UploadFile"
    )

if "from fastapi.responses import FileResponse" not in content:
    content = content.replace(
        "from fastapi.responses import StreamingResponse",
        "from fastapi.responses import StreamingResponse, FileResponse"
    )

# 2. Add ImportDirectoryRequest and _run_directory_import and /import/directory
directory_import_code = """
class ImportDirectoryRequest(BaseModel):
    path: str

def _run_directory_import(directory_path: str):
    from memorymap.core.deps import SessionLocal
    p = Path(directory_path)
    if not p.is_dir():
        return
    with SessionLocal() as session:
        imported = 0
        skipped = 0
        for f in p.rglob("*.md"):
            try:
                text = f.read_text(encoding="utf-8")
                meta, body = _parse_frontmatter(text)
                if not body.strip():
                    skipped += 1
                    continue
                entry = manager.create_entry(
                    session,
                    body.strip(),
                    category_name=meta.get("category") or manager.UNCATEGORISED,
                    tags=meta.get("tags") or [],
                    ai_confidence=100 if meta.get("category") else 0,
                )
                if meta.get("category"):
                    entry.user_filed = True
                deps.store_quietly(session, entry)
                imported += 1
                if imported % 50 == 0:
                    session.commit()
            except Exception:
                skipped += 1
        if imported > 0:
            manager.log_action(session, "imported", "data", detail=f"markdown dir x{imported}")
            session.commit()

@router.post("/import/directory", status_code=202)
def import_directory(req: ImportDirectoryRequest, background_tasks: BackgroundTasks):
    p = Path(req.path)
    if not p.is_dir():
        raise HTTPException(400, "Invalid directory path")
    background_tasks.add_task(_run_directory_import, req.path)
    return {"status": "started", "path": req.path}

@router.post("/import/markdown", status_code=201)
"""

if "class ImportDirectoryRequest" not in content:
    content = content.replace(
        "@router.post(\"/import/markdown\", status_code=201)",
        directory_import_code
    )


# 3. Add /export/backup
backup_export_code = """
@router.get("/export/backup")
def export_backup(background_tasks: BackgroundTasks):
    import os
    config = deps.get_config()
    db_path = config.data_dir / "memorymap.db"
    media_dir = config.data_dir / "media"
    
    fd, tmp_path = tempfile.mkstemp(suffix=".zip", prefix="memorymap_backup_")
    os.close(fd)
    
    def cleanup():
        try:
            os.remove(tmp_path)
        except OSError:
            pass
            
    background_tasks.add_task(cleanup)
    
    with zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as zf:
        if db_path.exists():
            zf.write(db_path, "memorymap.db")
        if media_dir.exists() and media_dir.is_dir():
            for root, _, files in os.walk(media_dir):
                for f in files:
                    file_path = Path(root) / f
                    arcname = file_path.relative_to(config.data_dir)
                    zf.write(file_path, str(arcname))
                    
    return FileResponse(tmp_path, media_type="application/zip", filename="memorymap_backup.zip", background=background_tasks)

@router.get("/export/json")
"""

if "@router.get(\"/export/backup\")" not in content:
    content = content.replace(
        "@router.get(\"/export/json\")",
        backup_export_code
    )

with open('src/memorymap/api/routes_settings.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("routes_settings.py updated.")
