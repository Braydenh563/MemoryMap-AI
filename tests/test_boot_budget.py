"""What a cold launch downloads before the lock screen, held down (audit
2026-10-05, FE-06).

WORLD_CLASS_PLAN H7 measured boot JS going 1,699 to 1,072 KB against a 1 MB
line on 2026-09-24 and named `boottime.js` the gate; nothing ran it, no test
bounded a boot asset, and the audit found 1,384 KB nine days later. This
reads every `<script src>` and `<link rel="stylesheet">` in `index.html`,
takes each one's bytes as served (the app's own stripped of comments,
`api/asset_strip.py`; a vendored file as it is), gzips them as the server
does, and fails over the caps. Lazy bundles (`LAZY_MODULES` in app.js) and
the p5 the emblem fetches after load are not in it: this is the boot.

The caps are the measured totals plus 2%, and only ever go down. When a
change is worth more boot bytes than that, the answer is the next surface
out of the boot (a lazy bundle), not a bigger number here.
"""

from __future__ import annotations

import gzip
import re
from pathlib import Path

from memorymap.api.asset_strip import strip_for_path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
INDEX = FRONTEND / "index.html"

SCRIPT = re.compile(r'<script[^>]*\ssrc="(/[^"?]+)(?:\?[^"]*)?"', re.I)
STYLE = re.compile(r'<link[^>]*rel="stylesheet"[^>]*href="(/[^"?]+)(?:\?[^"]*)?"', re.I)

#: 2026-10-05, measured by this test after the serve-time strip: 38 boot
#: scripts 691,724 bytes gzipped (the app's own 599,265 plus d3's 92,459;
#: the largest of the app's, avatars.js, 91,517), 12 stylesheets 179,712.
#: Before the strip the audit measured 1,384 KB of boot JS and 810 KB of CSS.
#: Plus 2%.
#: 2026-10-05, audit FE-07: d3 left the boot (it comes with the graph and
#: library bundles) and the template picker and a few guards left app.js:
#: 37 scripts, 589,299 bytes. Plus 2%.
BOOT_JS_CAP = 601_100
BOOT_CSS_CAP = 183_300


def _served_gzip(url: str) -> int:
    path = FRONTEND / url.lstrip("/")
    body = path.read_bytes()
    if not url.startswith("/vendor/"):
        body = strip_for_path(path.name, body)
    return len(gzip.compress(body, 9, mtime=0))


def _boot(pattern: re.Pattern) -> dict[str, int]:
    html = re.sub(r"<!--.*?-->", "", INDEX.read_text(encoding="utf-8"), flags=re.S)
    return {url: _served_gzip(url) for url in pattern.findall(html)}


def test_boot_scripts_stay_under_the_budget():
    sizes = _boot(SCRIPT)
    assert len(sizes) >= 20, "the boot scripts were not found: has index.html moved?"
    total = sum(sizes.values())
    largest = sorted(sizes.items(), key=lambda kv: -kv[1])[:5]
    assert total <= BOOT_JS_CAP, (
        f"boot JS is {total} bytes gzipped (cap {BOOT_JS_CAP}); largest: {largest}. "
        "Move a surface into a lazy bundle rather than raising the cap."
    )


def test_boot_stylesheets_stay_under_the_budget():
    sizes = _boot(STYLE)
    assert len(sizes) >= 5, "the stylesheets were not found: has index.html moved?"
    total = sum(sizes.values())
    assert total <= BOOT_CSS_CAP, f"boot CSS is {total} bytes gzipped (cap {BOOT_CSS_CAP})"
