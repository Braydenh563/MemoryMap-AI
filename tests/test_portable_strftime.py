"""No platform-only strftime flags in the app.

`%-d` (and `%-m`, `%-H`...) strip the zero pad on glibc and raise
ValueError("Invalid format string") on Windows, where the desktop app runs.
It shipped once in the agent's week line and failed every agent turn on the
owner's machine while every test here, on Linux, passed. Checked by reading
the source, because a test that calls the code would pass on Linux anyway.
"""

from __future__ import annotations

import re
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src" / "memorymap"
FLAG = re.compile(r"%[-#][a-zA-Z]")


def test_no_glibc_or_windows_only_strftime_flags():
    found = []
    for path in SRC.rglob("*.py"):
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            code = line.split("#", 1)[0]
            if ("strftime" in code or "%" in code) and FLAG.search(code) and ("strftime" in code or "f\"" not in code):
                if "strftime" in code or re.search(r'"[^"]*%[-#][a-zA-Z][^"]*"', code):
                    found.append(f"{path.relative_to(SRC)}:{number}: {line.strip()}")
    assert not found, "platform-only strftime flags:\n" + "\n".join(found)
