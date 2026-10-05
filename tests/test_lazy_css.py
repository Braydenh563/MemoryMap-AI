"""A stylesheet that is not linked at boot is loaded by a lazy bundle.

The boot stylesheets are held under a gzipped budget (test_boot_budget.py).
Styles that only a lazy bundle's surfaces draw (a map's outline, a picture's
grip in Live) go in a file that bundle loads (`library-lazy.css`, named in
app.js's `LAZY_MODULES`, which `ensureModule` gives a `<link>`), so the first
paint does not pay for them. A file in frontend/css that neither index.html
links nor a bundle names would be styles nothing ever applies; one a bundle
names that tests/_css_paths.py does not list would escape every CSS lint.
"""

from __future__ import annotations

import re
from pathlib import Path

from tests._css_paths import CSS_FILES

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"


def _linked() -> set[str]:
    html = re.sub(r"<!--.*?-->", "", (FRONTEND / "index.html").read_text(encoding="utf-8"), flags=re.S)
    return set(re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="/css/([^"?]+)', html))


def _lazy() -> set[str]:
    app = (FRONTEND / "js" / "app.js").read_text(encoding="utf-8")
    table = re.search(r"const LAZY_MODULES = \{(.*?)\n\};", app, re.S)
    assert table, "app.js has no LAZY_MODULES table"
    return set(re.findall(r'"/css/([A-Za-z0-9_.-]+\.css)"', table.group(1)))


def test_every_stylesheet_is_linked_or_loaded_by_a_bundle():
    on_disk = {p.name for p in (FRONTEND / "css").glob("*.css")}
    orphans = on_disk - _linked() - _lazy()
    assert not orphans, f"stylesheets nothing loads: {sorted(orphans)}"


def test_a_lazy_stylesheet_is_not_also_linked_and_is_linted():
    lazy = _lazy()
    assert lazy, "the Library bundle's stylesheet is no longer lazy"
    assert not lazy & _linked(), "a lazy stylesheet linked at boot counts twice"
    listed = {p.name for p in CSS_FILES}
    assert lazy <= listed, "tests/_css_paths.py must list every lazy stylesheet, after the boot files"


def test_the_loader_gives_a_css_file_a_link():
    app = (FRONTEND / "js" / "app.js").read_text(encoding="utf-8")
    body = app[app.index("function ensureModule(") :]
    body = body[: body.index("\n}\n")]
    assert 'file.endsWith(".css")' in body and 'el.rel = "stylesheet"' in body
