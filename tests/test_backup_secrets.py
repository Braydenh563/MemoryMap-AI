"""No backup or export carries a secret (data-1011 standing rule).

The files beside the notebook that are keys: the LAN certificate and its
authority's private key (`lan-tls/`), a reminder token key if one is ever
written to disk, and the API key in the settings. Each is given a canary
value; none may appear in the full-backup zip, the markdown folder export,
the daily backup's folder or the sealed bundle. The bundle and the backup
copy are allow-lists (`backup_bundle._FOLDERS`, the database snapshot), so
this fails the day one of them starts walking the whole data folder."""

from __future__ import annotations

import io
import zipfile

from tessellate.core import backup, deps, lancert

CANARY = b"CANARY-PRIVATE-KEY-0xDEADBEEF"


def _plant(config) -> list:  # noqa: ANN001
    data = config.data_dir
    cert, key = lancert.paths(data)
    ca, ca_key = lancert.authority_paths(data)
    planted = [cert, key, ca, ca_key, data / "reminder_token.key", data / "session_secret", data / "lan-tls" / "notes.key"]
    for path in planted:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(CANARY + b" " + path.name.encode())
    config.set_preference("llm_api_key", CANARY.decode())
    return planted


def _members(raw: bytes) -> dict[str, bytes]:
    archive = zipfile.ZipFile(io.BytesIO(raw))
    return {name: archive.read(name) for name in archive.namelist()}


def test_the_full_backup_zip_carries_no_key_file_and_no_api_key(client):
    _plant(deps.get_config())
    client.post("/entries", json={"content": "a note", "category": "General"})
    members = _members(client.get("/export/backup").content)
    assert "memorymap.db" in members
    for name, body in members.items():
        assert CANARY not in body, f"{name} carries a planted secret"
        assert "lan-tls" not in name and not name.endswith((".key", ".pem")), name


def test_the_markdown_folder_export_carries_no_secret(client):
    _plant(deps.get_config())
    client.post("/entries", json={"content": "a note", "category": "General"})
    members = _members(client.get("/export/folder").content)
    assert members, "the export was empty"
    for name, body in members.items():
        assert CANARY not in body, f"{name} carries a planted secret"


def test_a_snapshot_backup_folder_holds_only_the_database_and_its_record(client):
    config = deps.get_config()
    _plant(config)
    client.post("/entries", json={"content": "a note", "category": "General"})
    path = backup.backup_now(config.db_path, config.data_dir, origin="manual")
    folder = backup.backups_dir(config.data_dir)
    for file in folder.iterdir():
        assert CANARY not in file.read_bytes(), file.name
    #: Only the backup and its record: no SQLite sidecar files.
    assert path.suffix == ".db" and {p.name.removeprefix(path.stem) for p in folder.iterdir()} <= {".db", ".db.json"}
