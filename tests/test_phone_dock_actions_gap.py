"""On a phone a dock's actions zone keeps no divider padding (INBOX 464 (20)).

The phone block drops the zone hairline with `.dock > * + *` (0,1,0), but the
desktop rule that pads the actions zone for that hairline, `.dock >
.dock-actions` (0,2,0, 08-consistency.css), outranked it: the padding stayed
without its line, and the Dashboard's search field stopped 19.2px short of
its ⋯, the dock's gap twice. After: 9.6px, the dock's gap; every other phone
dock measured the same height and the same control positions.
"""
import re
from pathlib import Path

CSS = (Path(__file__).resolve().parents[1] / "frontend" / "css" / "10-responsive.css").read_text(encoding="utf-8")


def test_the_phone_actions_zone_drops_the_divider_padding():
    start = CSS.index("@media (max-width: 599.98px) {\n\n  .dock > * + * {")
    block = CSS[start:start + 2500]
    rule = re.search(r"\n  \.dock > \.dock-actions \{([^}]*)\}", block)
    assert rule, "the phone .dock-actions rule moved"
    assert "padding-left: 0" in rule.group(1)
