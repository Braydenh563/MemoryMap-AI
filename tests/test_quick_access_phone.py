"""At a phone's width two Quick access tiles fit whole (libr-1011: the second
tile sat past the viewport, 105 of its 240 px showing)."""

from __future__ import annotations

import re
from pathlib import Path

CSS = (Path(__file__).resolve().parents[1] / "frontend/css/07-whiteboard-misc.css").read_text(encoding="utf-8")


def test_a_phone_tile_is_under_half_the_row_so_two_fit_and_the_third_peeks():
    phone = CSS[CSS.index(".launch-row-start {\n    display: flex;") :]
    rule = re.search(r"\.launch-row-start > \* \{\s*flex: 0 0 min\(15rem, (\d+)%\);", phone)
    assert rule, "the phone tile's width rule is missing"
    assert 40 <= int(rule.group(1)) < 50
