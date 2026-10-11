"""A topic's add / link row never sits over the topic's label on a phone.

Below 820px (and on touch) the row's buttons are 44px, and anchored to the
node's bottom edge from -space-5 they reached 24px back up into the node,
covering the left of its label: pressing it added a child instead of
selecting the topic (`mindmapcurve.js` timed out at 390x844 on that click).
The row hangs wholly below the node there. `scratchpad/ui-sweeps/mapaddcover.js`
measures it in a browser.
"""

from __future__ import annotations

import re

from tests._css_paths import css_text


def test_the_action_row_stands_beside_the_node_never_over_its_label():
    """INBOX 816 moved the row from under the node (where it landed on the next
    sibling, 26px below at 100% zoom) to a column on the node's left, centred
    on it. It is outside the node's padding box at every size, so it never
    reaches the label; `mapactions.js` and `mapaddcover.js` measure it."""
    css = css_text()
    lazy = css[css.index("They scale with the topic, between 20 and 28px"):]
    rule = lazy[lazy.index(".wb-map-actions {"):]
    rule = rule[: rule.index("}")]
    assert re.search(r"right:\s*calc\(100% \+", rule), "the row is no longer outside the node's left edge"
    assert "flex-direction: column" in rule and "translate: 0 -50%" in rule
    assert 'data-wb-zoom-far' in css and ".wb-map-ref" in css
