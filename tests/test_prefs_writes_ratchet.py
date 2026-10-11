"""Writes to saved settings go through `prefs.set` (WORLD_CLASS_PLAN F1, "Left: the writes").

Reads are held by test_prefs_module.py. This is the write side as a ratchet:
each file may make no more direct `localStorage.setItem` calls than it makes
today, and a file not listed may make none. Move a write onto `prefs.set` and
lower its number; never raise one. `prefs.js` is the door and is not counted.
"""

from __future__ import annotations

import re
from pathlib import Path

JS = Path(__file__).resolve().parent.parent / "frontend" / "js"
SET = re.compile(r"localStorage\.setItem\(")

#: file -> direct setItem calls on 2026-10-11.
CAPS = {
    "account-recovery.js": 1,
    "ai-tools.js": 2,
    "app.js": 1,
    "atlas.js": 1,
    "avatars.js": 14,
    "chat-agent.js": 2,
    "chat.js": 1,
    "dashboard.js": 8,
    "documents-prose.js": 1,
    "documents.js": 17,
    "editor.js": 1,
    "graph-canvas.js": 2,
    "graph.js": 19,
    "icon-picker.js": 1,
    "library.js": 12,
    "margin-reader.js": 1,
    "navigation.js": 3,
    "note-properties.js": 1,
    "notes-list.js": 2,
    "notifications.js": 3,
    "onboarding.js": 2,
    "palette.js": 1,
    "phone-shell.js": 1,
    "quick-note.js": 2,
    "selection.js": 1,
    "semantic-notice.js": 1,
    "settings-controls.js": 2,
    "settings-data.js": 1,
    "settings-models.js": 2,
    "settings-panes.js": 3,
    "settings-rows.js": 2,
    "settings-wiring.js": 7,
    "settings.js": 50,
    "sheets-selects.js": 3,
    "sketch-pad.js": 1,
    "spaces-find.js": 2,
    "status.js": 6,
    "tag-manager.js": 1,
    "timeline-calendar.js": 3,
    "timeline.js": 4,
    "tour.js": 1,
    "update-dialogs.js": 1,
    "usage-ledger.js": 1,
    "whiteboard-format.js": 2,
    "whiteboard-library.js": 1,
    "whiteboard-map.js": 4,
    "whiteboard.js": 27,
    "wiring.js": 10,
}


def _code(text: str) -> str:
    return "\n".join(
        "" if line.lstrip().startswith(("//", "*", "/*")) else line for line in text.splitlines()
    )


def _found() -> dict[str, int]:
    out = {}
    for path in sorted(JS.glob("*.js")):
        if path.name == "prefs.js":
            continue
        n = len(SET.findall(_code(path.read_text(encoding="utf-8"))))
        if n:
            out[path.name] = n
    return out


def test_no_file_writes_storage_more_than_it_did():
    over = {name: n for name, n in _found().items() if n > CAPS.get(name, 0)}
    assert not over, f"write saved settings through prefs.set, not localStorage.setItem: {over}"


def test_the_caps_only_fall():
    stale = {name: cap for name, cap in CAPS.items() if _found().get(name, 0) < cap}
    assert not stale, f"lower these caps to the current count: {stale}"
