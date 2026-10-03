"""The notes surface on a phone, as an auditor drove it (2026-10-03).

Each test pins one defect measured in Chromium at 390 with touch:

* A tap on a note opened nothing: the swipe handler settled every lift-off,
  a tap included, and the note page refuses a row that is settling.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"


def _read(name: str) -> str:
    return (FRONTEND / name).read_text(encoding="utf-8")


def _function(source: str, name: str) -> str:
    start = re.search(rf"^(?:async )?function {name}\(", source, re.M)
    assert start, f"{name} not found"
    rest = source[start.end():]
    end = re.search(r"^}", rest, re.M)
    return rest[: end.start()]


def test_a_tap_is_not_settled_as_a_swipe():
    swipe = _function(_read("phone-shell.js"), "initRowSwipe")
    end = swipe[swipe.index("const end = "):]
    # The row only settles once the gesture was decided as a horizontal drag;
    # a tap (never decided) leaves the row alone so its click opens the note.
    assert end.index("if (!decided) return;") < end.index("settle(li);")
    page = _function(_read("phone-shell.js"), "initNotePage")
    assert 'classList.contains("is-settling")' in page
