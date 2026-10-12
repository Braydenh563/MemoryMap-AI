"""Installs from before the rename to Tessellate keep working (INBOX 903).

The package, the environment variables, the data folder and the browser's
keys all took the new name; each old name is still found, and no user data
is moved or deleted to get there.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

from tessellate.core import config, envnames

ROOT = Path(__file__).resolve().parent.parent


def test_the_new_variable_wins_and_the_old_one_still_works(monkeypatch):
    monkeypatch.delenv("TESSELLATE_RAM_GB", raising=False)
    monkeypatch.setenv("MEMORYMAP_RAM_GB", "12")
    assert envnames.getenv("TESSELLATE_RAM_GB") == "12"
    monkeypatch.setenv("TESSELLATE_RAM_GB", "16")
    assert envnames.getenv("TESSELLATE_RAM_GB") == "16"
    monkeypatch.delenv("TESSELLATE_RAM_GB")
    monkeypatch.delenv("MEMORYMAP_RAM_GB")
    assert envnames.getenv("TESSELLATE_RAM_GB", "x") == "x"


def test_a_secret_is_removed_under_both_names(monkeypatch):
    monkeypatch.setenv("MEMORYMAP_FIRST_PASSWORD", "old-name-secret")
    monkeypatch.setenv("TESSELLATE_FIRST_PASSWORD", "new-name-secret")
    assert envnames.pop("TESSELLATE_FIRST_PASSWORD") == "new-name-secret"
    import os

    assert "MEMORYMAP_FIRST_PASSWORD" not in os.environ
    assert "TESSELLATE_FIRST_PASSWORD" not in os.environ


def test_the_data_dir_set_under_the_old_name_is_used(monkeypatch, tmp_path):
    monkeypatch.delenv("TESSELLATE_DATA_DIR", raising=False)
    monkeypatch.setenv("MEMORYMAP_DATA_DIR", str(tmp_path / "notes"))
    assert config.resolved_data_dir() == (tmp_path / "notes").resolve()


@pytest.fixture
def frozen_home(monkeypatch, tmp_path):
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setenv("APPDATA", str(tmp_path))
    monkeypatch.setenv("XDG_DATA_HOME", str(tmp_path))
    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    if sys.platform == "darwin":
        base = tmp_path / "Library" / "Application Support"
        base.mkdir(parents=True)
        return base
    return tmp_path


def test_an_install_from_before_the_rename_keeps_its_notes_folder(frozen_home):
    old = frozen_home / "MemoryMap AI"
    old.mkdir()
    (old / "memorymap.db").write_bytes(b"the person's notes")
    assert Path(config._default_data_dir()) == old
    # Nothing moved, nothing deleted.
    assert (old / "memorymap.db").read_bytes() == b"the person's notes"
    assert not (frozen_home / "Tessellate").exists()


def test_a_new_install_gets_the_new_folder(frozen_home):
    assert Path(config._default_data_dir()) == frozen_home / "Tessellate"


def test_once_the_new_folder_exists_it_is_used(frozen_home):
    (frozen_home / "MemoryMap AI").mkdir()
    (frozen_home / "Tessellate").mkdir()
    assert Path(config._default_data_dir()) == frozen_home / "Tessellate"


def test_the_old_package_name_is_the_same_modules():
    import memorymap.core.config as old_config
    import memorymap.core.database as old_database

    from tessellate.core import database

    assert old_config is config
    assert old_database is database
    assert old_config.__spec__.name == "tessellate.core.config"


def test_python_dash_m_memorymap_still_starts_the_app():
    result = subprocess.run(
        [sys.executable, "-m", "memorymap", "--help"],
        cwd=ROOT, capture_output=True, text=True, timeout=120,
        env={**__import__("os").environ, "PYTHONPATH": str(ROOT / "src")},
    )
    assert result.returncode == 0, result.stderr
    assert "--desktop" in result.stdout


def test_browser_keys_move_once_to_their_new_names():
    app = (ROOT / "frontend" / "js" / "library.js").read_text(encoding="utf-8")  # beside OCR_VIEW_KEY
    assert '["memorymap.ocr.view", "tessellate.ocr.view"]' in app
    assert '["memorymap.ocr.reader", "tessellate.ocr.reader"]' in app
    assert "moveBrandKeys();" in app
    undo = (ROOT / "frontend" / "js" / "undo-store.js").read_text(encoding="utf-8")
    assert 'UNDO_STORE_DB = "tessellate-undo"' in undo
    assert 'UNDO_STORE_OLD_DB = "memorymap-undo"' in undo
    assert "undoStoreAdopt(db)" in undo
    sw = (ROOT / "frontend" / "sw.js").read_text(encoding="utf-8")
    assert '"memorymap-assets-"' in sw and 'CACHE_PREFIX = "tessellate-assets-"' in sw


def test_launchers_read_the_old_variable_names():
    for name in ("start.sh", "uninstall.sh"):
        text = (ROOT / name).read_text(encoding="utf-8")
        assert "${TESSELLATE_PORT:-${MEMORYMAP_PORT:-8000}}" in text
        assert "${TESSELLATE_DATA_DIR:-${MEMORYMAP_DATA_DIR:-}}" in text
        assert "^(TESSELLATE|MEMORYMAP)_DATA_DIR=" in text
    for name in ("start.bat", "uninstall.bat"):
        text = (ROOT / name).read_text(encoding="utf-8")
        assert 'set "MM_PORT=%MEMORYMAP_PORT%"' in text
        assert '/C:"MEMORYMAP_DATA_DIR="' in text
