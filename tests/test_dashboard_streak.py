"""The dashboard's streak answers to the same rule as the journal's.

`daily_journal` (api/routes_entries.py) counts a streak back from today and
**allows today to be empty**: someone who wrote every day for nine days and has
not written yet this morning has a streak of nine, not zero. The dashboard
counted its own, three times over (the greeting line, the figures strip, the
Streak widget), each a loop that stopped at the first empty day *including
today*. Measured on a notebook with 22 notes written the evening before: the
figures strip said "0 day streak" at one in the morning, the Streak widget
said "No streak yet", and the journal's own number was 1. One helper, one
rule, and the three call sites read it.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
DASH = ROOT / "frontend" / "dashboard.js"


def _function_source(text: str, name: str) -> str:
    start = text.index(f"function {name}(")
    end = text.index("\n}\n", start) + 3
    return text[start:end]


CASES = [
    # oldest to newest, the last is today
    ([0, 0, 0], 0),
    ([0, 0, 3], 1),
    ([0, 2, 0], 1),  # yesterday counts while today is still empty
    ([1, 2, 3], 3),
    ([1, 2, 0], 2),
    ([1, 0, 0], 0),  # the day before yesterday is too far back
    ([4, 0, 5], 1),
    ([], 0),
]


def test_the_streak_allows_today_to_be_empty(tmp_path: Path) -> None:
    node = shutil.which("node")
    if not node:  # pragma: no cover - node is in the sandbox and in CI
        pytest.skip("node is not available")
    source = _function_source(DASH.read_text(encoding="utf-8"), "dashStreak")
    script = tmp_path / "run.js"
    script.write_text(
        source
        + "\nconst cases = JSON.parse(process.argv[2]);\n"
        + "process.stdout.write(JSON.stringify(cases.map(([d]) => dashStreak(d))));\n",
        encoding="utf-8",
    )
    out = subprocess.run(
        [node, str(script), json.dumps(CASES)],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    assert out.returncode == 0, out.stderr
    got = json.loads(out.stdout)
    wrong = [(days, want, have) for (days, want), have in zip(CASES, got) if want != have]
    assert not wrong, f"per_day, wanted, got: {wrong}"


def test_no_call_site_counts_its_own_streak() -> None:
    text = DASH.read_text(encoding="utf-8")
    body = text.replace(_function_source(text, "dashStreak"), "")
    loops = re.findall(r"for \(let i = [\w.]+\.length - 1; i >= 0", body)
    assert not loops, (
        "a streak counted by hand again; read dashStreak(perDay) so the three "
        "figures and the journal agree"
    )
    assert body.count("dashStreak(") >= 3, "the greeting, the strip and the widget all read dashStreak"
