"""`\\newpage` is a page break (DOCUMENTS_PLAN decision 20.5, the audit's D4).

Driven in a browser by `scratchpad/ui-sweeps/mmdoc1005-pagebreak.js` (Read
view, a print, the HTML export, the "/" menu); these pin the pieces.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "frontend" / "js"


def test_the_renderer_draws_it_and_paragraphs_stop_at_it():
    nav = (JS / "navigation.js").read_text(encoding="utf-8")
    assert "MD_PAGE_BREAK.test(line)" in nav
    assert "!MD_PAGE_BREAK.test(lines[i])" in nav


def test_the_line_is_exactly_newpage():
    md = (JS / "markdown.js").read_text(encoding="utf-8")
    pattern = re.search(r"const MD_PAGE_BREAK = /(.*)/;", md).group(1)
    rx = re.compile(pattern)
    assert rx.match("\\newpage") and rx.match("  \\newpage  ")
    assert not rx.match("see \\newpage here")


def test_a_print_breaks_the_page():
    css = (ROOT / "frontend" / "css" / "09-editor.css").read_text(encoding="utf-8")
    at = css.index(".md-page-break {")
    assert "break-before: page" in css[at:at + 120]
