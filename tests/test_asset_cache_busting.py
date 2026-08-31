"""The version stamp on every local css/js URL in index.html.

Reason this exists: a stale cached `library.js` is this project's single
most-repeated false bug report. A fix ships, the reporter's browser keeps
running yesterday's file, and the same bug is reported again - it cost four
rounds on bookmark URL editing alone, where the flow was reproduced working
end-to-end in a clean browser every time it was checked.

`cache-control: no-cache` (what the server sends) only asks the browser to
revalidate; a desktop wrapper with its own cache can still serve a stale
copy. A `?v=<version>` query string is not a request - a new version is
literally a different URL, so there is nothing to serve stale.

These are lints, not behaviour tests, in the same family as
test_frontend_ids.py: Python cannot see the DOM, but it can see the markup.
"""

from __future__ import annotations

import re
from pathlib import Path

from memorymap import __version__

INDEX = Path(__file__).resolve().parents[1] / "frontend" / "index.html"

# Vendored libraries are deliberately exempt: they change only when the
# vendored file itself is replaced, and pinning them to the app version
# would bust their cache on every release for no reason.
LOCAL_CSS = re.compile(r'<link[^>]+href="(/css/[^"]+\.css)(\?[^"]*)?"')
LOCAL_JS = re.compile(r'<script[^>]+src="(/(?!vendor/)[^"]+\.js)(\?[^"]*)?"')


def _refs(pattern: str) -> list[tuple[str, str]]:
    html = INDEX.read_text(encoding="utf-8")
    return [(m.group(1), m.group(2) or "") for m in pattern.finditer(html)]


def test_every_local_stylesheet_is_version_stamped():
    refs = _refs(LOCAL_CSS)
    assert refs, "no local stylesheets found - has index.html moved?"
    for url, query in refs:
        assert query == f"?v={__version__}", (
            f"{url} is not stamped with the current version. Every local css/js "
            f"URL in index.html needs ?v={__version__} so an upgrade cannot "
            "serve a cached copy of the old file."
        )


def test_every_local_script_is_version_stamped():
    refs = _refs(LOCAL_JS)
    assert refs, "no local scripts found - has index.html moved?"
    for url, query in refs:
        assert query == f"?v={__version__}", (
            f"{url} is not stamped with the current version. Bump the stamps "
            "in index.html whenever __version__ changes."
        )


def test_vendored_assets_are_left_alone():
    """A vendored file's cache should not be busted by an app release."""
    html = INDEX.read_text(encoding="utf-8")
    for match in re.finditer(r'(?:src|href)="(/vendor/[^"]+)"', html):
        assert "?v=" not in match.group(1)
