"""An icon is an icon, not a character someone typed.

This app ships Phosphor and draws every icon with it: `setLabel(el, "ph:x")`
builds an `<i class="ph ph-x">`. A control whose whole content is the
character U+2715 looks like one of those from across the room and is nothing
of the kind up close. Measured on a button built through the app's own
`smallButton` helper, the two ways side by side:

    "✕"    system-ui  13.6px  weight 500
    "ph:x"      Phosphor   15.6px  weight 400

Two faces, two sizes, two weights, for the same control in the same row. That
is what the owner meant by "I want to strip all signs of being vibecoded by an
ai from the ui" (INBOX 263): not a taste in icons, a UI assembled from
whatever was to hand instead of from the set the app already has.

Seven download buttons said "⬇ Download" while the rest of the app said
`ph:download-simple Download`, and ten close buttons were a typed cross. This
fails the build if either comes back.

**What is not banned, and why the list is short.** An arrow in a sentence
("Settings → Models") is a breadcrumb, which is typography; an arrow key in
a shortcut list is the key's own name. Both stay. What is banned is a glyph
that stands where an icon belongs, so the test looks only at strings that are
*labels*: a string that is nothing but glyphs and spaces, or one whose first
or last non-space character is a banned glyph, which is where an icon goes.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from test_ai_name import _html_outside_comments, _js_string_bodies  # noqa: E402

#: The glyphs this app has a Phosphor icon for, and reaches for anyway. Each
#: is paired with the icon that replaces it, so a failure says what to write.
INSTEAD = {
    "✕": "ph:x",
    "✖": "ph:x",
    "✗": "ph:x",
    "✘": "ph:x",
    "×": "ph:x",
    "✓": "ph:check",
    "✔": "ph:check",
    "✅": "ph:check-circle",
    "⬇": "ph:download-simple",
    "⬆": "ph:upload-simple",
    "✎": "ph:pencil-simple",
    "✏": "ph:pencil-simple",
    "⚙": "ph:gear",
    "⚡": "ph:lightning",
    "\U0001f50d": "ph:magnifying-glass",
    "\U0001f4ce": "ph:paperclip",
    "\U0001f5d1": "ph:trash",
    "\U0001f4c1": "ph:folder",
    "\U0001f4c4": "ph:file",
    "\U0001f4cc": "ph:push-pin",
    "\u2248": "ph:approximate-equals",
    #: U+29C9, two joined squares, which is what a copy button said in two
    #: places (the chat's table bar and every rendered code block) while five
    #: other Copy buttons in the same app were drawn with `ph:copy`. Added
    #: 2026-09-20, with both call sites fixed in the same commit.
    "\u29c9": "ph:copy",
}

#: The one deliberate exception, and it carries its reason in the code beside
#: it: `AI_STATUS_GLYPH` is a colour-blind-safe mark set, where the glyph is
#: the redundant channel that makes the colour readable without it. An icon
#: font would not serve that purpose any better and the four marks have to
#: read as one family.
ALLOWED_LINES = {("app.js", "const AI_STATUS_GLYPH")}

EDGE = re.compile(r"^\s*(.)|(.)\s*$")


#: `\u00d7` is also the multiplication sign, and "\u00d75" ("seen five times")
#: is arithmetic rather than a close button. What follows it is what tells the
#: two apart: a number, or a template hole that will hold one.
TIMES = re.compile(r"\u00d7\s*(\d|\$\{)")


def _offending(body: str) -> str | None:
    """The banned glyph in `body` if it is being used as an icon, else None."""
    stripped = body.strip()
    if not stripped:
        return None
    if TIMES.match(stripped):
        return None
    #: Nothing but glyphs and spaces: a label that is only a mark.
    if all(c in INSTEAD or c.isspace() for c in stripped):
        return next(c for c in stripped if c in INSTEAD)
    #: Or one at either end, which is where an icon sits beside its words.
    for candidate in (stripped[0], stripped[-1]):
        if candidate in INSTEAD:
            return candidate
    return None


def _scan(name: str, pairs: list[tuple[int, str]], source_lines: list[str]) -> list[str]:
    found = []
    for line_no, body in pairs:
        glyph = _offending(body)
        if glyph is None:
            continue
        line = source_lines[line_no - 1] if line_no <= len(source_lines) else ""
        if any(name == f and marker in line for f, marker in ALLOWED_LINES):
            continue
        found.append(
            f"{name}:{line_no}: {glyph!r} used as an icon in {body.strip()[:60]!r}; "
            f"write {INSTEAD[glyph]!r} instead"
        )
    return found


def test_no_typed_glyph_stands_in_for_an_icon():
    offenders: list[str] = []
    for path in sorted((ROOT / "frontend").glob("*.js")):
        source = path.read_text(encoding="utf-8")
        offenders += _scan(path.name, _js_string_bodies(source), source.splitlines())
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    offenders += _scan("index.html", _html_outside_comments(html), html.splitlines())
    assert not offenders, "\n".join(offenders)
