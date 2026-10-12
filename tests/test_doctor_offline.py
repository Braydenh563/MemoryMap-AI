"""The doctor's offline mode (OPEN ledger 295, Brief 17's first deliberate gap).

The splash's Copy diagnostics used to copy only the step history, because a
live `--doctor` probes the port the app is about to bind and asks the git
remote and the model server, which in the middle of an install makes things
worse. `TESSELLATE_DOCTOR_OFFLINE=1` runs the doctor with those three rows
skipped, so the splash can append the whole table. An environment variable,
not a flag: the flag-order lint wants both launchers' help to list the same
flags. start.sh is run for real; start.bat and splash.ps1 are read as text
(cmd and PowerShell cannot run here: needs device).
"""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_the_shell_doctor_skips_the_network_rows_when_asked(tmp_path):
    env = dict(os.environ, TESSELLATE_DATA_DIR=str(tmp_path / "data"), TESSELLATE_DOCTOR_OFFLINE="1")
    env.pop("TESSELLATE_PORT", None)
    result = subprocess.run(
        ["./start.sh", "--doctor"], cwd=ROOT, env=env, capture_output=True, text=True, timeout=180
    )
    out = result.stdout
    assert result.returncode in (0, 1), out + result.stderr
    assert "not checked in offline diagnostics" in out, out
    #: The Updates row never reaches the remote: it says why it did not ask
    #: (a fresh data dir has not answered the one-time question yet).
    assert "Updates" in out and "git remote answered" not in out and "did not answer" not in out, out
    assert "not asked in offline diagnostics" in out, out
    for label in ("Python", ".venv", "Disk", "Notes", "Last run"):
        assert label in out, out


def test_the_default_doctor_still_asks():
    text = (ROOT / "start.sh").read_text(encoding="utf-8")
    assert 'local offline="${TESSELLATE_DOCTOR_OFFLINE:-0}"' in text
    assert "git -c http.lowSpeedLimit=1000" in text


def test_the_windows_doctor_has_the_same_three_skips():
    text = (ROOT / "start.bat").read_text(encoding="utf-8")
    assert text.count('"%TESSELLATE_DOCTOR_OFFLINE%"=="1"') == 3
    for words in ("not checked in offline diagnostics", "the git remote is not asked", "not asked in offline diagnostics"):
        assert words in text


def test_the_splash_appends_the_offline_doctor_with_a_time_limit():
    text = (ROOT / "scripts" / "splash.ps1").read_text(encoding="utf-8")
    assert 'EnvironmentVariables["TESSELLATE_DOCTOR_OFFLINE"] = "1"' in text
    assert "WaitForExit(20000)" in text
    assert "\" --doctor\"'" in text
