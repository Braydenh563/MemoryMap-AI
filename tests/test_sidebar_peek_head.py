"""A collapsed sidebar peeked open keeps its head's controls clear of the pin.

INBOX 495 (the owner, with a screenshot): "when the skill logs sidebar is
collapsed and temporarily expanded, the clear button and pin button clash".
Measured at 1440, the gap between Clear and the pin was 6.4px pinned open and
-5.6px peeked (an overlap), from two causes the stylesheet cannot show at a
glance: the peek moved the toggle 4px further in than the pinned position
the head's reserve is measured from, and an id rule that folds Skill logs'
children toward the right edge out-ranked the peek's `transform: none`, so
its head stayed shifted 8px under the toggle. The sweep that measures it is
`scratchpad/ui-sweeps/skillslogshead.js`; this holds the two rules.
"""

from __future__ import annotations

import re

from tests._css_paths import CSS_DIR


def _css(name: str) -> str:
    return (CSS_DIR / name).read_text(encoding="utf-8")


def test_the_peeked_toggle_sits_where_the_pinned_one_does():
    css = _css("07-whiteboard-misc.css")
    rule = re.search(
        r"\.layout-sidebar-collapsed>\.sidebar-collapsed:hover \.sidebar-collapse-toggle\s*\{([^}]*)\}",
        css,
    )
    assert rule, "the hover-peek toggle rule is gone"
    assert "right: 1rem" in rule.group(1), (
        "the peek moves the toggle off the pinned position the head's lane is measured from"
    )


def test_skill_logs_peeked_head_is_not_shifted():
    css = _css("08-consistency.css")
    assert re.search(
        r"\.layout-sidebar-collapsed > #skills-sidebar\[data-resizable\]\.sidebar-collapsed:hover > [^{]*\{[^}]*transform: none",
        css,
    ), "the id-specific fold transform on #skills-sidebar needs its own peek reset"
