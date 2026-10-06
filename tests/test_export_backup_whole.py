"""`/export/backup` holds the whole notebook (audit 2026-10-05, ARCH-18).

Measured before: three notes saved, the zip taken, the zip's database held
5,000 of 5,003 notes and none of the three. The route zipped the live
WAL-mode file with `zf.write`: whatever still sat in the write-ahead log was
not in it, and `integrity_check` passed, so nothing said so. It also left out
`uploads/`, where every attachment lives.
"""

from __future__ import annotations

import io
import sqlite3
import zipfile

from memorymap.core import deps


def test_the_backup_has_every_note_and_every_attachment(client, tmp_path):
    for i in range(3):
        client.post("/entries", json={"content": f"saved just before the backup {i}"})
    uploads = deps.get_config().data_dir / "uploads"
    uploads.mkdir(parents=True, exist_ok=True)
    (uploads / "scan.pdf").write_bytes(b"%PDF-1.4 a scanned page")

    reply = client.get("/export/backup")
    assert reply.status_code == 200
    archive = zipfile.ZipFile(io.BytesIO(reply.content))
    names = set(archive.namelist())
    assert "uploads/scan.pdf" in names
    restored = tmp_path / "restored.db"
    restored.write_bytes(archive.read("memorymap.db"))
    with sqlite3.connect(restored) as connection:
        in_zip = connection.execute("SELECT count(*) FROM entries").fetchone()[0]
        assert connection.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    with deps.get_db().engine.connect() as connection:
        live = connection.exec_driver_sql("SELECT count(*) FROM entries").scalar()
    assert in_zip == live == 3
