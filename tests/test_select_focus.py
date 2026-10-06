"""No `.focus()` and no key listener on a `<select>` the app has rebuilt.

`enhanceSelect` (sheets-selects.js) draws every `<select>` in the page as a
shell with a `<button>` opener and takes the native element out of the tab
order, so `select.focus()` focuses an element nobody can see and a `keydown`
bound to a select never fires: the person's key goes to the opener. Two
listeners were written that way in one batch before a sweep caught them
(DOCUMENTS_PLAN, "the owner's evening batch", 2026-09-09), and the plan asked
for this lint then. The opener is what takes focus and keys; reach it through
the select's shell rather than the select.

Two shapes are read, which is every way this app's code names an element:
`$("id").focus()` (or `getElementById`), and a `const`/`let` bound to one
and used further down the same function. A select made in script is not in
the page's markup and not covered; none of those is focused today.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"

_GET = r'(?:\$|document\.getElementById)\("([^"]+)"\)'
_USE = r'\??\.(?:focus\(|addEventListener\("key)'


def _select_ids(html: str) -> set[str]:
    return set(re.findall(r'<select[^>]*\bid="([^"]+)"', html))


def _offences(ids: set[str], name: str, text: str) -> list[str]:
    found = []
    for match in re.finditer(_GET + _USE, text):
        if match.group(1) in ids:
            found.append(f"{name}:{text.count(chr(10), 0, match.start()) + 1} {match.group(0)}")
    for match in re.finditer(r"\b(?:const|let)\s+(\w+)\s*=\s*" + _GET, text):
        var, sid = match.groups()
        if sid not in ids:
            continue
        end = text.find("\n}\n", match.end())
        body = text[match.end() : end if end > 0 else len(text)]
        for use in re.finditer(rf"\b{var}" + _USE, body):
            line = text.count("\n", 0, match.end() + use.start()) + 1
            found.append(f"{name}:{line} {sid} via {var}: {use.group(0)}")
    return found


def test_no_focus_or_key_listener_on_an_enhanced_select() -> None:
    ids = _select_ids((FRONTEND / "index.html").read_text(encoding="utf-8"))
    assert len(ids) > 50, "the page's selects were not found; the lint is reading nothing"
    found = []
    for path in sorted((FRONTEND / "js").glob("*.js")):
        found += _offences(ids, path.name, path.read_text(encoding="utf-8"))
    assert not found, (
        "focus or a key listener on a <select> enhanceSelect has rebuilt; "
        "the opener takes focus and keys, not the select:\n" + "\n".join(found)
    )


def test_the_lint_sees_both_shapes() -> None:
    """Proved against drift written here, so a pattern that silently matches
    nothing cannot pass the test above."""
    ids = {"doc-type"}
    direct = 'function a() {\n  $("doc-type").focus();\n}\n'
    bound = 'function b() {\n  const pick = $("doc-type");\n  pick.addEventListener("keydown", f);\n}\n'
    elsewhere = 'function c() {\n  const pick = $("doc-other");\n  pick.focus();\n}\n'
    assert len(_offences(ids, "x.js", direct)) == 1
    assert len(_offences(ids, "x.js", bound)) == 1
    assert _offences(ids, "x.js", elsewhere) == []
