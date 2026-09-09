"""A stylesheet `fill` silently beats a `fill` attribute, so the pair is a lint.

**This exists because it cost a measurement round.** `mapPreview` (app.js)
draws a map's labels and, when a label sits inside a coloured node, has to
paint it white or near-black by that colour's own luminance. The first
version set `text.setAttribute("fill", ...)`, which is exactly how the SVG
spec says to give an element a paint, and the label's contrast did not move:
3.82:1 before and 3.82:1 after, measured in the browser both times. The cause
is one line of CSS: `.board-minimap-label { fill: var(--ink) }`. A
presentation attribute is a declaration at the *bottom* of the cascade, below
every author rule however unspecific, so any stylesheet rule for that
property wins and the attribute is dead markup.

Nothing about that is visible in a diff. The attribute is right there in the
code, spelled correctly, on the right element, and a reviewer reading either
file alone sees nothing wrong; the blocks in the same function already carried
a comment about it and the labels still hit it. So the check is here: JavaScript
that sets a paint attribute on an element carrying a class that the stylesheets
paint is a fault, and the fix is a class (`.board-minimap-label-light`) or
`el.style.fill`, both of which sit above the stylesheet.

**Scope, deliberately narrow.** Only `fill` and `stroke`, only where the same
function assigns a class in the lines just above the attribute, and only for
classes the CSS paints. That is the shape the bug had, it needs no CSS parser
and no DOM, and it cannot fire on the many places that set a paint attribute
on an element with no class at all (`whiteboard.js` does this all over the
canvas, correctly).
"""

from __future__ import annotations

import re
from pathlib import Path

from tests._css_paths import css_text

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"

#: The two paint properties a stylesheet and an attribute can both name. The
#: rest of the SVG presentation attributes (`opacity`, `stroke-width`, `rx`)
#: have the same rule, and are left out until one of them actually bites:
#: a lint nobody has seen fire is a lint nobody trusts.
PAINTS = ("fill", "stroke")

#: How far above a `setAttribute("fill", ...)` to look for the class that
#: element was given. Ten lines covers "make the element, class it, place it,
#: paint it", which is the shape every one of these sites has, and stops the
#: search well before the previous element in the same loop.
LOOKBACK = 10

CLASS_ASSIGNMENT = re.compile(
    r"""setAttribute\(\s*["']class["']\s*,\s*["']([^"']+)["']"""
    r"""|className\s*=\s*["']([^"']+)["']"""
    r"""|classList\.add\(([^)]*)\)"""
)
PAINT_ATTRIBUTE = re.compile(
    r"""(\w+)\.setAttribute\(\s*["'](fill|stroke)["']"""
)


def _painted_classes() -> dict[str, set[str]]:
    """Every class the stylesheets give a `fill` or a `stroke`, by property.

    Comments are stripped first for the reason `test_style_scale.py` strips
    them: this file's comments quote CSS, and a scan that reads a quoted
    declaration as a real one reports a rule that does not exist.
    """
    text = re.sub(r"/\*.*?\*/", "", css_text(), flags=re.S)
    painted: dict[str, set[str]] = {paint: set() for paint in PAINTS}
    for selector, body in re.findall(r"([^{}]+)\{([^{}]*)\}", text):
        for paint in PAINTS:
            if not re.search(rf"(?m)^\s*{paint}\s*:", body):
                continue
            painted[paint].update(re.findall(r"\.([A-Za-z][\w-]*)", selector))
    return painted


def _sites_in(source: str, where: str) -> list[tuple[str, int, str, str, str]]:
    """Every `el.setAttribute("fill"|"stroke", ...)` in one file, with the
    classes that element was given just above it: `(where, line, variable,
    paint, class)`.

    Split from `_sites` so the self-check below can run it over a fabricated
    two-line sample. A lint whose only proof is "the codebase is clean" proves
    nothing once the codebase *is* clean, which is exactly what happened here
    the moment the bug it was written for was fixed.
    """
    found = []
    lines = source.splitlines()
    for number, line in enumerate(lines, start=1):
        match = PAINT_ATTRIBUTE.search(line)
        if not match:
            continue
        variable, paint = match.group(1), match.group(2)
        for above in lines[max(0, number - 1 - LOOKBACK) : number - 1]:
            if variable not in above:
                continue
            assignment = CLASS_ASSIGNMENT.search(above)
            if not assignment:
                continue
            names = " ".join(group for group in assignment.groups() if group)
            for name in re.findall(r"[A-Za-z][\w-]*", names):
                found.append((where, number, variable, paint, name))
    return found


def _sites() -> list[tuple[str, int, str, str, str]]:
    """The same, across every frontend script."""
    found = []
    for path in sorted(FRONTEND.glob("*.js")):
        found.extend(_sites_in(path.read_text(encoding="utf-8"), path.name))
    return found


def test_no_paint_attribute_is_overridden_by_a_stylesheet_rule():
    painted = _painted_classes()
    offenders = []
    for where, number, variable, paint, name in _sites():
        if name in painted[paint]:
            offenders.append(
                f"{where}:{number}: {variable}.setAttribute('{paint}', ...) "
                f"on .{name}, which the stylesheets already paint"
            )
    assert not offenders, (
        "A stylesheet declaration beats a presentation attribute, so these "
        "attributes are dead markup:\n  "
        + "\n  ".join(sorted(set(offenders)))
        + "\n\nGive the element a class that paints it, or set el.style."
        + PAINTS[0]
        + " , which sits above the stylesheet."
    )


SAMPLE = '''
  const text = document.createElementNS(NS, "text");
  text.setAttribute("class", "board-minimap-label");
  text.setAttribute("fill", "#ffffff");
'''


def test_the_lint_can_see_the_bug_it_was_written_for():
    """The check that this is a lint rather than a shape that happens to pass.

    Both halves have to keep working: the CSS scan has to find that
    `.board-minimap-label` is painted (it is the class that started this), and
    the JavaScript scan has to pair a class with the attribute set below it.
    The second half is run over a fabricated sample on purpose. The real
    frontend has no such pair left, because the two this found were fixed, and
    a lint that can only demonstrate itself while the bug is present stops
    demonstrating anything the moment it works.
    """
    painted = _painted_classes()
    assert "board-minimap-label" in painted["fill"], (
        "the CSS scan no longer finds .board-minimap-label's fill, so this "
        "file would pass whatever the JavaScript does"
    )
    caught = _sites_in(SAMPLE, "sample")
    assert [(paint, name) for _, _, _, paint, name in caught] == [
        ("fill", "board-minimap-label")
    ], f"the JavaScript scan no longer pairs a class with its paint: {caught}"
