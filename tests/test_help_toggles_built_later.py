"""A '?' built after boot is wired (chrome2, OPEN.md "Carried from the agent
files").

`initHelpToggles` runs once at boot over the page (wiring.js). A `data-help-for`
trigger a script makes later has to be passed to it again, or its click does
nothing: the Suggestions sheet's '?' (suggestions-inbox.js `inboxHead`) was
exactly that. `openSheet` now runs it over every sheet it builds, so a file
whose '?' is built inside a sheet is covered; any other file that makes one
calls it itself. Measured in a browser: the Suggestions sheet's '?' opens its
panel (scratchpad/ui-sweeps/left1005-helplater.js).
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS = sorted((ROOT / "frontend" / "js").glob("*.js"))
MAKES_ONE = re.compile(r"""setAttribute\(\s*["']data-help-for["']|\.dataset\.helpFor\s*=|data-help-for=["'`][^"'`]""")


def test_open_sheet_wires_what_it_builds():
    text = (ROOT / "frontend" / "js" / "phone-shell.js").read_text(encoding="utf-8")
    body = text[text.index("function openSheet("):]
    body = body[: body.index("\n}\n")]
    assert re.search(r"document\.body\.appendChild\(overlay\);\s*(?://[^\n]*\n\s*)*initHelpToggles\(card\);", body)


def test_every_script_built_help_trigger_is_wired():
    offenders = []
    for path in JS:
        text = path.read_text(encoding="utf-8")
        code = re.sub(r"^\s*//.*$", "", text, flags=re.M)
        if path.name == "wiring.js" or not MAKES_ONE.search(code):
            continue
        if "initHelpToggles(" in code or "openSheet(" in code:
            continue
        offenders.append(path.name)
    assert not offenders, (
        f"{offenders}: a '?' made by script and never passed to initHelpToggles; "
        "call it on the built element (or build it inside openSheet)"
    )
