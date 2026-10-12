"""An upgrade over 0.4.1 opens the notebook it already has (owner order,
2026-10-11, item 4).

0.4.1 kept its notes in `%APPDATA%\\MemoryMap AI`. Whatever the installed
app is called, a person who updates must not meet an empty notebook beside
their own: the frozen app's default data folder is that one while it exists.
Written to hold before the rename to Tessellate (the folder is simply that
name) and after it (the old folder is kept while it exists and the new one
does not; `config._default_data_dir` and installer.iss's `DataDir` follow the
same rule, and `tests/test_frozen_packaging.py` pins the iss side).
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path



def _config_module():
    for name in ("tessellate.core.config", "tessellate.core.config"):
        try:
            return importlib.import_module(name)
        except ImportError:
            continue
    raise AssertionError("no config module")


def test_the_frozen_windows_app_keeps_the_memorymap_ai_folder(tmp_path, monkeypatch):
    config = _config_module()
    appdata = tmp_path / "Roaming"
    (appdata / "MemoryMap AI").mkdir(parents=True)  # brand: keep
    (appdata / "MemoryMap AI" / "memorymap.db").write_bytes(b"")  # brand: keep
    monkeypatch.setenv("APPDATA", str(appdata))
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "platform", "win32")
    assert Path(config._default_data_dir()) == appdata / "MemoryMap AI"  # brand: keep


def test_the_installer_looks_in_the_same_folder():
    root = Path(__file__).resolve().parents[1]
    iss = (root / "packaging" / "windows" / "installer.iss").read_text(encoding="utf-8")
    assert "MemoryMap AI" in iss  # the program folder and (before the rename) the data folder  # brand: keep
    assert "DefaultDirName={autopf}\\" in iss


def test_a_new_install_gets_the_tessellate_folder(tmp_path, monkeypatch):
    config = _config_module()
    monkeypatch.setenv("APPDATA", str(tmp_path))
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "platform", "win32")
    assert Path(config._default_data_dir()) == tmp_path / "Tessellate"
    (tmp_path / "MemoryMap AI").mkdir()  # brand: keep
    (tmp_path / "Tessellate").mkdir()
    assert Path(config._default_data_dir()) == tmp_path / "Tessellate"
    iss = (Path(__file__).resolve().parents[1] / "packaging/windows/installer.iss").read_text(encoding="utf-8")
    assert "function DataDir: String;" in iss and "Dir := DataDir;" in iss


def test_an_old_database_is_renamed_once_with_its_wal(tmp_path):
    """`memorymap.db` becomes `tessellate.db` at start; the -wal holds
    committed rows, so it moves with it or they are lost."""
    config = _config_module()
    (tmp_path / "memorymap.db").write_bytes(b"db")  # brand: keep
    (tmp_path / "memorymap.db-wal").write_bytes(b"wal")  # brand: keep
    assert config._adopt_old_db(tmp_path) == tmp_path / "tessellate.db"
    assert (tmp_path / "tessellate.db").read_bytes() == b"db"
    assert (tmp_path / "tessellate.db-wal").read_bytes() == b"wal"
    assert not (tmp_path / "memorymap.db").exists()  # brand: keep


def test_a_failed_rename_keeps_the_old_database(tmp_path, monkeypatch):
    config = _config_module()
    (tmp_path / "memorymap.db").write_bytes(b"db")  # brand: keep

    def refuse(*_args):
        raise PermissionError("held open")

    monkeypatch.setattr(config.os, "replace", refuse)
    assert config._adopt_old_db(tmp_path) == tmp_path / "memorymap.db"  # brand: keep


def test_a_backup_zip_from_before_the_rename_still_restores(tmp_path):
    import zipfile

    from tessellate.core import backup_bundle

    assert "memorymap.db" in backup_bundle.DB_MEMBERS  # brand: keep
    archive = tmp_path / "old.zip"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.writestr("memorymap.db", b"")  # brand: keep
    with zipfile.ZipFile(archive) as zf:
        assert next(n for n in backup_bundle.DB_MEMBERS if n in zf.namelist())
