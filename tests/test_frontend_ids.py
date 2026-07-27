"""No two elements in index.html may share an id.

`document.getElementById` returns the *first* match and reports no error, so
a duplicate id silently binds half the code to the wrong element. That is
exactly how "Add persona" came to do nothing: a <div> in the Chat tab and the
Settings <textarea> both used `persona-prompt`, so `.value.trim()` ran against
the div, threw, and killed the click handler.

Browsers do not warn, linters do not run on this file, and the Python suite
cannot see the DOM — so this cheap parse is the only thing that would catch
the next one.
"""

from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

INDEX = Path(__file__).resolve().parents[1] / "frontend" / "index.html"

# Ids that app.js creates at runtime rather than finding in the markup.
RUNTIME_IDS = {"user-css", "focus-timer-display", "focus-timer-toggle"}


def _markup() -> str:
    """index.html with comments stripped.

    Comments here explain markup, so they quote tags — including ids — and a
    naive scan reads those as real elements.
    """
    return re.sub(r"<!--.*?-->", "", INDEX.read_text(encoding="utf-8"), flags=re.S)


def test_no_duplicate_element_ids():
    ids = re.findall(r'\sid="([^"]+)"', _markup())
    duplicates = {name: n for name, n in Counter(ids).items() if n > 1}
    assert not duplicates, f"duplicate id(s) in index.html: {duplicates}"


def test_every_id_the_app_looks_up_actually_exists():
    """A typo'd id is `null`, and the failure lands wherever it is next used."""
    app = (INDEX.parent / "app.js").read_text(encoding="utf-8")
    declared = set(re.findall(r'\sid="([^"]+)"', _markup()))
    # Only the literal $("…") lookups; anything built from a variable can't be
    # checked statically and is skipped rather than guessed at.
    looked_up = set(re.findall(r'\$\("([a-z0-9-]+)"\)', app))
    missing = sorted(looked_up - declared - RUNTIME_IDS)
    assert not missing, f"app.js looks up ids that aren't in index.html: {missing}"
