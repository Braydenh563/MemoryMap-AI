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


def test_the_prepaint_theme_table_matches_app_js():
    """index.html carries its own copy of THEME_PRESETS. Keep them equal.

    The inline script runs before app.js so the first paint already wears the
    right theme — without it every reload flashes the default. The cost is two
    copies of the same table, and a theme added to one and not the other looks
    fine until you reload, when the app flashes the wrong colours or falls back
    to the default entirely. Nothing else would notice.
    """
    html = _markup()
    app = (INDEX.parent / "app.js").read_text(encoding="utf-8")

    inline = set(re.findall(r"^\s{8}(\w+): \{ theme:", html, re.M))
    declared = set(re.findall(r"^  (\w+): \{\n\s+label:", app, re.M))

    assert inline, "the pre-paint theme table wasn't found — has it moved?"
    assert declared, "THEME_PRESETS wasn't found in app.js — has it moved?"
    assert inline == declared, (
        "pre-paint themes and THEME_PRESETS disagree: "
        f"only in index.html={sorted(inline - declared)}, "
        f"only in app.js={sorted(declared - inline)}"
    )


def test_every_theme_names_a_palette_that_exists():
    """A theme selecting a palette with no CSS silently renders as default."""
    app = (INDEX.parent / "app.js").read_text(encoding="utf-8")
    css = (INDEX.parent / "style.css").read_text(encoding="utf-8")

    used = set(re.findall(r'palette: "(\w+)"', app))
    defined = set(re.findall(r':root\[data-palette="(\w+)"\]', css))
    # "default" is the base :root, deliberately without a [data-palette] block.
    missing = sorted(used - defined - {"default"})
    assert not missing, f"themes select palettes with no CSS: {missing}"
