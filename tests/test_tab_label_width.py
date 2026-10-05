"""The top tab bar does not move when the selection does (INBOX 464 (9)).

The selected tab was bold and bold is wider, so every tab after it shifted:
"Notes" at x=549 with Dashboard selected, 543 with Notes. The selected label
now keeps the resting weight (the same advance) and is drawn heavier with
`-webkit-text-stroke`, which paints and does not lay out. Reserving each
label's bold width was tried and measured worse: the strip 29px wider and the
header on two rows at 900, 1024 and 1200.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = "\n".join(
    p.read_text(encoding="utf-8") for p in sorted((ROOT / "frontend" / "css").glob("*.css"))
)


def _blocks(selector_re):
    return [m.group(1) for m in re.finditer(selector_re + r"[^{]*\{([^}]*)\}", CSS)]


def test_the_selected_tab_does_not_change_weight():
    for body in _blocks(r"#tab-bar button\.active\b"):
        assert "font-weight" not in body, "a weight on the selected tab moves the tabs after it"
    for body in _blocks(r"#tab-bar > \.active\b"):
        assert "font-weight" not in body


def test_the_selected_label_is_not_drawn_heavier():
    # INBOX 618: the filled pill says which tab you are on; the stroke that
    # also drew its label heavier went ("the active tab without extra bold").
    for body in _blocks(r"#tab-bar button\.active \.tab-label"):
        assert "-webkit-text-stroke" not in body
