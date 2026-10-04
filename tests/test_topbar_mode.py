"""The top bar's layout mode is a pure function of the measurements.

Reported 2026-10-04: at 1500 the bar showed `tabs-wrapped` while 1440 showed
`tabs-centred`, depending on the order the window had been resized in. The
sync read its own previous class and applied 8px of hysteresis, so a width in
the dead band kept whichever mode it arrived in (six widths between 1024 and
2560 drew two modes, two of them wrapping a strip that fit). The real-browser
proof is `scratchpad/ui-sweeps/topbarmode.js` (1024 to 2560 and back, 16px
steps); these are the cheap guards.
"""
import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SRC = (ROOT / "frontend" / "js" / "shell-reminders.js").read_text(encoding="utf-8")


def _sync_body():
    start = SRC.index("function syncTabOverflowFade()")
    return SRC[start : SRC.index("\n}\n", start)]


def test_the_sync_never_reads_its_own_previous_mode():
    body = re.sub(r"^\s*//.*$", "", _sync_body(), flags=re.M)
    assert 'contains("tabs-wrapped")' not in body
    assert 'contains("tabs-centred")' not in body


def test_the_sync_decides_through_the_pure_function():
    assert 'tabBarMode(needed, space, tabCentreSpace())' in _sync_body()


@pytest.mark.skipif(not shutil.which("node"), reason="needs node")
def test_the_mode_depends_on_the_numbers_only(tmp_path):
    start = SRC.index("function tabBarMode(")
    fn = SRC[start : SRC.index("\n}\n", start) + 3]
    script = tmp_path / "mode.js"
    script.write_text(
        fn
        + """
const out = [];
for (let space = 400; space <= 900; space += 1) {
  for (const centre of [space - 40, space - 8, space, space + 20]) {
    out.push([space, centre, tabBarMode(600.2, space, centre)]);
  }
}
console.log(JSON.stringify(out));
""",
        encoding="utf-8",
    )
    run = subprocess.run(
        [shutil.which("node"), str(script)], capture_output=True, text=True, timeout=60, check=False
    )
    assert run.returncode == 0, run.stderr
    rows = json.loads(run.stdout)
    for space, centre, mode in rows:
        if space < 601:  # 600.2 rounds up to 601
            assert mode == "wrapped"
        elif centre >= 601:
            assert mode == "centred"
        else:
            assert mode == "gap"
    # Never wrapped when the strip fits (the reported 1312 and 1520 cases).
    assert all(mode != "wrapped" for space, _c, mode in rows if space >= 601)
