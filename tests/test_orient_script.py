"""scripts/orient.sh is the SessionStart hook: short, fast, and wired in settings."""
import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_orient_prints_under_forty_lines_in_under_a_second():
    start = time.monotonic()
    out = subprocess.run(["bash", "scripts/orient.sh"], cwd=ROOT, capture_output=True, text=True, check=True)
    assert time.monotonic() - start < 1.0
    lines = out.stdout.splitlines()
    assert 0 < len(lines) < 40
    assert "**Now (" in out.stdout and "open INBOX items:" in out.stdout


def test_settings_runs_orient_at_session_start():
    cfg = json.loads((ROOT / ".claude" / "settings.json").read_text(encoding="utf-8"))
    cmds = [h["command"] for g in cfg["hooks"]["SessionStart"] for h in g["hooks"]]
    assert "bash scripts/orient.sh" in cmds
