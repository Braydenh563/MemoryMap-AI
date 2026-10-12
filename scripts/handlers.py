"""List the frame, scroll and observer handlers in `frontend/js` (WORLD_CLASS_PLAN 26.2, decision 63).

    python scripts/handlers.py            # counts by kind and file
    python scripts/handlers.py --list     # every site: file:line, kind, enclosing function

The kinds are the ones that run on every frame or every change: `requestAnimationFrame`,
`pointermove`/`mousemove`, `scroll`, `wheel`, `ResizeObserver`, `MutationObserver`,
`IntersectionObserver` and `setInterval`. A site is a line holding the call, comments
skipped; the enclosing function is the nearest `function name` above it (JS is scanned, not
parsed). `tests/test_frontend_wake_sources.py` ratchets four of them per file.
"""

from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

JS = Path(__file__).resolve().parents[1] / "frontend" / "js"

KINDS = {
    "raf": re.compile(r"\brequestAnimationFrame\("),
    "pointermove": re.compile(r"""["'](?:pointermove|mousemove)["']"""),
    "scroll": re.compile(r"""addEventListener\(\s*["']scroll["']|\bonscroll\b"""),
    "wheel": re.compile(r"""addEventListener\(\s*["']wheel["']"""),
    "resize-observer": re.compile(r"\bnew ResizeObserver\("),
    "mutation-observer": re.compile(r"\bnew MutationObserver\("),
    "intersection-observer": re.compile(r"\bnew IntersectionObserver\("),
    "interval": re.compile(r"\bsetInterval\("),
}
_FN = re.compile(r"^\s*(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)")


def sites() -> list[tuple[str, int, str, str]]:
    out = []
    for path in sorted(JS.glob("*.js")):
        fn = "<top level>"
        in_block = False
        for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            stripped = line.strip()
            if in_block:
                in_block = "*/" not in stripped
                continue
            if stripped.startswith("/*"):
                in_block = "*/" not in stripped
                continue
            if stripped.startswith("//"):
                continue
            m = _FN.match(line)
            if m:
                fn = m.group(1)
            for kind, rx in KINDS.items():
                if rx.search(line):
                    out.append((path.name, n, kind, fn))
    return out


def counts() -> Counter:
    return Counter((f, k) for f, _, k, _ in sites())


if __name__ == "__main__":
    rows = sites()
    if "--list" in sys.argv:
        for f, n, kind, fn in rows:
            print(f"frontend/js/{f}:{n}  {kind}  in {fn}")
    else:
        by_kind = Counter(k for _, _, k, _ in rows)
        print("sites:", dict(by_kind.most_common()))
        for kind in KINDS:
            top = Counter(f for f, _, k, _ in rows if k == kind).most_common(5)
            print(f"{kind}: {top}")
