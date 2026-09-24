"""`clipText` (frontend/app.js): display text is shortened at a word, with
an ellipsis, never mid-word. The dashboard's last-note pill read "responds
to the blu" before it existed."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

APP = Path(__file__).resolve().parents[1] / "frontend" / "app.js"


def _clip(text: str, limit: int) -> str:
    source = APP.read_text(encoding="utf-8")
    match = re.search(r"^function clipText\(text, limit\) \{.*?^\}", source, re.S | re.M)
    assert match, "clipText is gone from app.js"
    script = match.group(0) + f"\nprocess.stdout.write(clipText({json.dumps(text)}, {limit}));"
    return subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True).stdout


@pytest.mark.skipif(not shutil.which("node"), reason="needs node")
@pytest.mark.parametrize(
    ("text", "limit", "expected"),
    [
        ("The garage door opener responds to the blue remote", 42, "The garage door opener responds to the…"),
        ("short", 42, "short"),
        ("  padded  ", 42, "padded"),
        ("Supercalifragilisticexpialidocious", 10, "Supercali…"),
        ("One, two, three, four", 12, "One, two…"),
    ],
)
def test_clip_text_cuts_at_a_word(text, limit, expected):
    out = _clip(text, limit)
    assert out == expected
    assert len(out) <= limit
