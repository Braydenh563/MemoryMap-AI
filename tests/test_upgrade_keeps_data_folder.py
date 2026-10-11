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
    for name in ("tessellate.core.config", "memorymap.core.config"):
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
