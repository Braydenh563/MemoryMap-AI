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
