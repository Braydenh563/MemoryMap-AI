"""The hash router (WORLD_CLASS_PLAN 22.1 item 1, frontend/router.js).

Every view has an address: `#/notes/12`, `#/chat/45`, `#/docs/7`,
`#/library/images`, `#/settings/appearance`. The two pure halves, a history
entry to its hash and a hash back to the entry, are run in node here and must
be inverses; the wiring (navigation.js's stack mirrored into the browser's,
popstate driving Back and Forward, the boot restoring the address, the title
naming the view) is checked by reading the source, and measured by
`scratchpad/ui-sweeps/router.js` in a browser.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest
from tests._app_js import app_js_text

ROOT = Path(__file__).resolve().parent.parent
ROUTER = ROOT / "frontend" / "router.js"


def _functions(*names: str) -> str:
    source = ROUTER.read_text(encoding="utf-8")
    parts = []
    for name in names:
        match = re.search(rf"^function {name}\(.*?^\}}", source, re.S | re.M)
        assert match, f"{name} is gone from router.js"
        parts.append(match.group(0))
    consts = re.findall(r"^const ROUTE_\w+ = .*?;$", source, re.S | re.M)
    return "\n".join(consts + parts)


def _run(expr: str):
    script = _functions("routeHash", "routeEntry") + f"\nprocess.stdout.write(JSON.stringify({expr}));"
    out = subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


CASES = [
    ({"tab": "dashboard", "section": None}, "#/dashboard"),
    ({"tab": "notes", "section": None}, "#/notes"),
    ({"tab": "notes", "section": "browse"}, "#/notes"),
    ({"tab": "notes", "section": "capture"}, "#/notes/capture"),
    ({"tab": "notes", "section": "writing-room"}, "#/notes/writing-room"),
    ({"tab": "notes", "section": "note:12"}, "#/notes/12"),
    ({"tab": "chat", "section": None}, "#/chat"),
    ({"tab": "chat", "section": "conv:45"}, "#/chat/45"),
    ({"tab": "documents", "section": "doc:7"}, "#/docs/7"),
    ({"tab": "library", "section": "library-view-media:images"}, "#/library/images"),
    ({"tab": "library", "section": "library-view-media:files"}, "#/library/files"),
    ({"tab": "library", "section": "library-view-docs"}, "#/library/documents"),
    ({"tab": "library", "section": "library-view-documents"}, "#/library/all"),
    ({"tab": "library", "section": "board:3"}, "#/library/board/3"),
    ({"tab": "graph", "section": None}, "#/graph"),
    ({"tab": "graph", "section": "focus:9"}, "#/graph/focus/9"),
    ({"tab": "timeline", "section": None}, "#/timeline"),
    ({"tab": "reminders", "section": None}, "#/reminders"),
    ({"tab": "settings", "section": "appearance"}, "#/settings/appearance"),
]


@pytest.mark.skipif(not shutil.which("node"), reason="needs node")
@pytest.mark.parametrize(("entry", "hash_"), CASES)
def test_an_entry_has_an_address_and_the_address_is_the_entry(entry, hash_):
    assert _run(f"routeHash({json.dumps(entry)})") == hash_
    back = _run(f"routeEntry({json.dumps(hash_)})")
    expected = dict(entry)
    if expected["tab"] == "notes" and expected["section"] == "browse":
        expected["section"] = None
    assert back == expected


@pytest.mark.skipif(not shutil.which("node"), reason="needs node")
@pytest.mark.parametrize("hash_", ["", "#", "#heading-2", "#/nowhere", "#/notes/abc", "#/chat/1x", "#/docs"])
def test_an_address_that_is_not_a_view_is_ignored_or_lands_on_its_tab(hash_):
    got = _run(f"routeEntry({json.dumps(hash_)})")
    if hash_ == "#/docs":
        assert got == {"tab": "documents", "section": None}
    else:
        # An in-page anchor (a document's heading link) is not a route: the
        # router must leave it alone rather than navigate somewhere.
        assert got is None


def test_the_stack_is_mirrored_into_the_browsers_history():
    app = app_js_text()
    record = app[app.index("function recordTabVisit(") :]
    record = record[: record.index("\n}\n")]
    assert "routerOnVisit(" in record, "a visit no longer reaches the address bar"
    step = app[app.index("function stepTabHistory(") :]
    step = step[: step.index("\n}\n")]
    assert "routerGo(" in step, "the in-app Back and Forward no longer go through the browser's history"
    router = ROUTER.read_text(encoding="utf-8")
    assert 'addEventListener("popstate"' in router
    assert "pushState" in router and "replaceState" in router


def test_reload_restores_the_view_and_the_title_names_it():
    app = app_js_text()
    assert "routerRestore()" in app, "the boot no longer opens the view in the address"
    router = ROUTER.read_text(encoding="utf-8")
    assert "setTitleView(" in router
    status = (ROOT / "frontend" / "status.js").read_text(encoding="utf-8")
    assert "function setTitleView(" in status


def test_opening_a_note_gives_it_an_address():
    body = app_js_text()
    flash = body[body.index("function flashEntry(") :]
    flash = flash[: flash.index("\n}\n")]
    assert 'recordTabVisit("notes", `note:${id}`' in flash
