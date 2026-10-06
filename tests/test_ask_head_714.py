"""The reply head's mini avatar and the Ask header's "Use AI" switch (INBOX 714).

The owner, 2026-10-06: "the mini atlas avatar on causes a rather wide gap
below", then of the Ask header's "AI | From your notes" pill: "it doesnt feel
modern and professional".

Part 1, measured before (scratchpad/ui-sweeps/askavatar714*.js, 1440x900): the
head's SVG is 20px square, but the figure drawn in it (the companion's body and
legs, outside the viewBox) was 31.4px tall and, the SVG's `overflow` being
visible, hung 11px under its box; the name sat at the top of a figure twice its
height. The box now clips what is outside it, the avatar adds no height below
the name line, and the head is the head and shoulders the miniature was drawn
as. These are the source halves; the numbers are the sweeps'.
"""

from __future__ import annotations

import re

from tests._css_paths import CSS_DIR


def _css(name: str) -> str:
    return (CSS_DIR / name).read_text(encoding="utf-8")


def _rule(css: str, selector: str) -> str:
    match = re.search(re.escape(selector) + r"\s*\{([^}]*)\}", css)
    assert match, f"no rule for {selector}"
    return match.group(1)


def test_the_reply_head_avatar_clips_what_is_drawn_outside_its_box():
    body = _rule(_css("03-dashboard-widgets.css"), "\n.msg-avatar")
    assert re.search(r"overflow:\s*clip", body), (
        "a 20px avatar whose figure is 31px tall hangs under its row and reads as a gap"
    )
