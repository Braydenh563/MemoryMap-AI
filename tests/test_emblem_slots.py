"""Every logo slot the app renders has somewhere to render (INBOX 426, round
4, A2).

`EMBLEM_SLOTS` (app.js) names the ids `renderBrandLogo` draws the app's mark
into. `graph-empty-emblem` was on the list with no element anywhere, so the
graph's empty state drew a generic network icon and the mark was never
seen there. Each id must be in index.html or be created by a script (the
chat's empty state builds its own at render time).
"""

from __future__ import annotations

import re
from pathlib import Path
from tests._app_js import app_js_text

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"


def test_every_emblem_slot_has_an_element() -> None:
    app = app_js_text()
    block = app[app.index("const EMBLEM_SLOTS = ["):]
    block = block[: block.index("];")]
    ids = re.findall(r'\["([a-z-]+)",\s*\d+', block)
    assert ids, "EMBLEM_SLOTS not found"
    html = (FRONTEND / "index.html").read_text(encoding="utf-8")
    scripts = "".join(p.read_text(encoding="utf-8") for p in FRONTEND.glob("*.js"))
    missing = [
        slot for slot in ids
        if f'id="{slot}"' not in html and not re.search(rf'\.id = "{slot}"', scripts)
    ]
    assert not missing, f"emblem slots with no element: {missing}"
