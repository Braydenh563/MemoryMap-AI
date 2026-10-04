"""While you were away grows to fit its review list instead of scrolling inside.

`.dash-body` caps every widget at 320px and scrolls inside it. The night card
opens review lists in place, so the cap hid the rows (and their Dismiss)
below the fold. It opts out with the other widgets that need their natural
height; `scratchpad/ui-sweeps/nightcard.js` measures it in a browser.
"""

from __future__ import annotations

import re

from tests._css_paths import css_text


def test_the_night_card_opts_out_of_the_body_cap():
    css = css_text()
    match = re.search(
        r"((?:\.dash-widget\[data-widget=\"[a-z-]+\"\] \.dash-body,?\s*)+)\{([^}]*)\}",
        css,
    )
    assert match, "the widgets that opt out of the .dash-body cap are gone"
    assert 'data-widget="night"' in match.group(1), "the night card scrolls inside a fixed-height body again"
    assert "max-height: none" in match.group(2)
    assert "overflow: visible" in match.group(2)
