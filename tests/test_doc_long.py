"""Long documents in the documents editor: lints for what a static read can see.

Each test names the sweep that measures the behaviour in a browser; these hold
the shape that the measurement depends on, so a refactor cannot drop it
silently.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCUMENTS_JS = (ROOT / "frontend" / "js" / "documents.js").read_text(encoding="utf-8")


def _live_plugin_update() -> str:
    start = DOCUMENTS_JS.index("docLivePluginCache = ViewPlugin.fromClass(")
    update = DOCUMENTS_JS.index("update(update) {", start)
    return DOCUMENTS_JS[update: DOCUMENTS_JS.index("decorations: (plugin)", update)]


def test_live_decorations_rebuild_when_the_parser_catches_up() -> None:
    """`doclonglive.js`: a jump into a long document drew its headings raw.

    The markdown parser works in slices, so the viewport can move somewhere
    the tree has not reached; the parser finishing sets no doc, viewport,
    selection or focus flag, so the plugin has to compare the tree itself.
    """
    body = _live_plugin_update()
    assert re.search(r"syntaxTree\(update\.startState\)\s*!==\s*syntaxTree\(update\.state\)", body), (
        "the live view's decoration plugin does not rebuild when the syntax tree changes"
    )


def test_the_breadcrumb_follows_the_view_when_the_caret_is_off_screen() -> None:
    """`doccrumbview.js`: the trail said `Top > Annual report` at 60% of a long document.

    The outline's mark already used "the caret's section while it is on
    screen, the top of the view otherwise"; the trail must be redrawn by the
    same scroll-driven pass, and every other redraw must use the same line.
    """
    start = DOCUMENTS_JS.index("function markDocOutline() {")
    body = DOCUMENTS_JS[start: DOCUMENTS_JS.index("\n}\n", start)]
    assert "renderDocCrumbs(" in body, "scrolling no longer redraws the breadcrumb"
    assert "docCaretLine()" in body and 'kind === "codemirror"' in body, "the textarea fallback keeps the caret"
    assert DOCUMENTS_JS.count("renderDocCrumbs(docWhereLine())") == 2, (
        "the outline's redraws must give the trail the same line the mark uses"
    )
