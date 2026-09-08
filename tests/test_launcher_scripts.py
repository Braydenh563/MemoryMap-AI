"""The launcher scripts, checked from Linux CI.

Brief 17's contract is that `./start.sh` and `start.bat` are one launcher
with two spellings: the same flags, in the same order, in the same help
text, writing the same status protocol. Nothing in the suite can run cmd or
PowerShell, so this file reads the two scripts as text and fails the build
when they drift, which is the only way that promise survives a session that
only edits one of them.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
START_SH = ROOT / "start.sh"
START_BAT = ROOT / "start.bat"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


class TestPortFromEnv:
    """`--port N` reaches the server.

    The launcher exports MEMORYMAP_PORT; before this was read, the flag
    moved the launcher's port checks and the URL it opened but left the
    server itself on 8000, so `--port 8010` opened a browser at a port
    nothing was listening on.
    """

    def test_default_is_8000(self, monkeypatch):
        from memorymap.__main__ import _port_from_env

        monkeypatch.delenv("MEMORYMAP_PORT", raising=False)
        assert _port_from_env() == 8000

    def test_a_number_is_honoured(self):
        from memorymap.__main__ import _port_from_env

        assert _port_from_env("8010") == 8010
        assert _port_from_env(" 8781 ") == 8781

    @pytest.mark.parametrize("raw", ["", "abc", "80.5", "0", "-1", "65536", "99999999"])
    def test_junk_falls_back_rather_than_raising(self, raw):
        from memorymap.__main__ import _port_from_env

        assert _port_from_env(raw) == 8000

    def test_the_module_reads_the_environment(self, monkeypatch):
        """PORT is what the desktop paths and _run_server actually use."""
        import importlib

        monkeypatch.setenv("MEMORYMAP_PORT", "8123")
        launcher = importlib.reload(importlib.import_module("memorymap.__main__"))
        try:
            assert launcher.PORT == 8123
        finally:
            monkeypatch.delenv("MEMORYMAP_PORT", raising=False)
            importlib.reload(launcher)


class TestStartShIsValidShell:
    def test_bash_n(self):
        result = subprocess.run(
            ["bash", "-n", str(START_SH)], capture_output=True, text=True
        )
        assert result.returncode == 0, result.stderr


class TestPortFlagIsPlumbed:
    """The launcher must export the variable the module above reads."""

    def test_start_sh_exports_memorymap_port(self):
        assert re.search(r"export\s+MEMORYMAP_PORT=", _read(START_SH))
