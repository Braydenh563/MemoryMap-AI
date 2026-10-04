"""One disclosure marker (INBOX 464 (14), DESIGN.md "A disclosure marker").

Settings folds, the help accordion and task logs drew a 5x6px triangle built
from borders in `--muted` (08-consistency.css), crossed with a 2px rotated
border chevron from 07-whiteboard-misc.css; the Library's Contents, notes and
outlines drew the 16px Phosphor caret. Every fold now draws the caret.
"""
import re
from pathlib import Path

CSS_DIR = Path(__file__).resolve().parents[1] / "frontend" / "css"
CSS = {p.name: p.read_text(encoding="utf-8") for p in CSS_DIR.glob("*.css")}
FAMILIES = (
    ".help-accordion details > summary",
    ".settings-section summary",
    ".settings-group > summary",
    ".settings-fold > summary",
    ".advanced-css > summary",
    ".task-log > summary",
)


def _marker_rule():
    text = CSS["08-consistency.css"]
    for m in re.finditer(r"([^{}]*)\{([^}]*)\}", text):
        if "::before" in m.group(1) and all(f in m.group(1) for f in FAMILIES):
            return m.group(2)
    return None


def test_every_fold_family_draws_the_phosphor_caret():
    body = _marker_rule()
    assert body, "the shared disclosure marker rule is missing a family"
    assert 'content: "\\e136"' in body
    assert "font-family: Phosphor" in body
    assert "rotate(-90deg)" in body
    assert "border: 0" in body


def test_no_fold_draws_a_chevron_from_borders():
    for name, text in CSS.items():
        for m in re.finditer(r"([^{}]*)\{([^}]*)\}", text):
            sel, body = m.group(1), m.group(2)
            if "summary" not in sel or "::before" not in sel:
                continue
            if not any(f in sel for f in FAMILIES + (".about-whats-new", ".help-accordion > summary")):
                continue
            assert not re.search(r"border-(left|right|bottom):\s*[\d.]+(px|rem) solid currentColor", body), (
                f"{name}: a border-drawn marker on a fold: {sel.strip()[:80]}"
            )


def test_the_library_caret_is_the_same_glyph():
    js = (CSS_DIR.parent / "js" / "library.js").read_text(encoding="utf-8")
    assert 'ph ph-caret-down contents-caret' in js
