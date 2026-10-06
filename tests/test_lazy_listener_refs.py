"""A boot script that hands a lazy module's function to `addEventListener`
reads the name at load, before the module exists, so the name must be a
stand-in (LAZY_ENTRY_POINTS in app.js). 2026-10-06: the meeting recorder moved
to the lazy meetings.js and `resetMeetingUI`, wired to Discard at boot, was
not one; the app stopped booting with a ReferenceError."""

from __future__ import annotations

import re

from tests._app_js import FRONTEND_DIR, LAZY_PIECES, app_js_files

JS = FRONTEND_DIR / "js"
DEF = re.compile(r"^(?:async )?function (\w+)\(", re.M)
LISTENER = re.compile(r'addEventListener\("[\w-]+",\s*(\w+)\s*[,)]')


def test_boot_listeners_name_only_functions_that_exist_at_boot() -> None:
    app = (JS / "app.js").read_text(encoding="utf-8")
    block = app[app.index("const LAZY_ENTRY_POINTS = {") :]
    block = block[: block.index("\n};\n")]
    stand_ins = set(re.findall(r'"(\w+)"', block))
    boot_files = app_js_files()
    boot_defs = set()
    for path in boot_files:
        boot_defs |= set(DEF.findall(path.read_text(encoding="utf-8")))
    lazy_defs = set()
    for name in LAZY_PIECES:
        path = JS / name
        if path.exists():
            lazy_defs |= set(DEF.findall(path.read_text(encoding="utf-8")))
    only_lazy = lazy_defs - boot_defs
    missing = []
    for path in boot_files:
        for ref in LISTENER.findall(path.read_text(encoding="utf-8")):
            if ref in only_lazy and ref not in stand_ins:
                missing.append(f"{path.name}: {ref}")
    assert not missing, f"lazy functions wired at boot without a stand-in: {missing}"
