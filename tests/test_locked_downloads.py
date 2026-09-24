"""A download from a locked route goes through `fetch`, never `window.open`.

Found by the WORLD_CLASS_PLAN row check, 2026-09-24. `window.open(path)` is
a navigation, and a navigation sends no `X-Auth-Token`: only `fetch` can set
that header (`require_unlock`, routes_auth.py). So "Download .md" on a note
card and on the Library's note and document cards opened a tab reading
"Locked: unlock first" on every notebook with a password, which is the normal
case, and worked only on one without. The media routes are the one exception
the server makes (`require_unlock_media` reads the media cookie), so a
declarative load of `/media` or `/files` passes there (tests/test_media_cookie.py).
"""

from __future__ import annotations

import re
from pathlib import Path

FRONTEND = Path(__file__).resolve().parent.parent / "frontend"


def test_no_window_open_points_at_an_app_route() -> None:
    offenders = []
    for path in sorted(FRONTEND.glob("*.js")):
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if re.search(r"window\.open\(\s*[`'\"]/", line):
                offenders.append(f"{path.name}:{number}: {line.strip()}")
    assert offenders == [], (
        "these open a locked route without the auth header; use "
        "downloadFromApi(path, name) instead:\n" + "\n".join(offenders)
    )


def test_the_download_helper_exists_and_sends_the_header() -> None:
    app = (FRONTEND / "app.js").read_text(encoding="utf-8")
    start = app.index("async function downloadFromApi(")
    body = app[start : app.index("\n}\n", start)]
    assert "await api(" in body and "saveFile(" in body
