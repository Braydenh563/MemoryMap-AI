"""Where the app's own code lives, now that app.js is being split.

`frontend/app.js` was one file of 50,000 lines. The split (INBOX 426 cc,
`docs/roadmap/agent-remaining/appjs-split.md`) cuts it into classic scripts
loaded in its own order, each a contiguous range of the old file, so
concatenating them in index.html's order reproduces the old app.js (less
the two blocks the plan moves on purpose). A test that read app.js to find a
function or a table means "the app's code", and reads `app_js_text()` now;
a test that means the file app.js itself (the lazy loader's tables, which
stay there) keeps reading `APP_JS`.

The list is read from index.html, not written here: every local script from
`/app.js` through `/agent-activity.js` (the first piece split out, in
5b1f809) in the order the page loads them. A new file added to the page in
that stretch is in the list without an edit here, which is the point.

Not named `test_*.py` on purpose, as `_css_paths.py`.
"""

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

FRONTEND_DIR = Path(__file__).resolve().parents[1] / "frontend"
APP_JS = FRONTEND_DIR / "app.js"
INDEX_HTML = FRONTEND_DIR / "index.html"

FIRST = "app.js"
LAST = "agent-activity.js"


def app_js_files() -> list[Path]:
    """The app's scripts in load order, from app.js to agent-activity.js."""
    html = INDEX_HTML.read_text(encoding="utf-8")
    names = re.findall(r'<script src="/([A-Za-z0-9_.-]+\.js)', html)
    start = names.index(FIRST)
    end = names.index(LAST)
    return [FRONTEND_DIR / name for name in names[start : end + 1]]


@lru_cache(maxsize=1)
def _joined() -> str:
    return "\n".join(path.read_text(encoding="utf-8") for path in app_js_files())


def app_js_text() -> str:
    """The app's code: every file in `app_js_files()`, joined in load order."""
    return _joined()


def frontend_text(name: str) -> str:
    """A frontend script's text by name, where "app.js" means the app's code
    (every piece of it), for the tests that read files by name in a loop."""
    if name == FIRST:
        return app_js_text()
    return (FRONTEND_DIR / name).read_text(encoding="utf-8")


def app_js_family(path: Path) -> bool:
    """Whether a frontend file is one of the pieces of the old app.js, for
    the lints that count or allow things per file."""
    return path.resolve() in {p.resolve() for p in app_js_files()}
