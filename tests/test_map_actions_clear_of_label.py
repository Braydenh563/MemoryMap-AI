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


def test_the_action_row_hangs_below_the_node_where_buttons_are_44px():
    css = css_text()
    match = re.search(
        r"@media \(max-width: 819\.98px\), \(pointer: coarse\) \{\s*\.wb-map-actions \{([^}]*)\}",
        css,
    )
    assert match, "the phone/touch placement of .wb-map-actions is gone"
    body = match.group(1)
    assert re.search(r"bottom:\s*auto", body)
    assert re.search(r"top:\s*calc\(100% \+ var\(--space-\d\)\)", body)
