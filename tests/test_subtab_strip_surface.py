"""A sticky sub-tab strip takes its surface when the page under it scrolls
(INBOX 529: "the subtab menubars are kinda hard to see when scrolled down").
The scroll-edge marker skipped bars inside the scrolling region, and the
strips are sticky inside it, so they stayed see-through over the notes.
`scratchpad/ui-sweeps/subtabsdepth2.js subtabscroll` and `libscroller.js`: Notes and
Library both carry `data-scrolled="1"` and a blurred card fill once scrolled."""
import re

from tests._app_js import app_js_text
from tests._css_paths import CSS_FILES


def test_strips_inside_the_region_are_marked():
    js = app_js_text()
    assert 'region.querySelectorAll(".notes-subtabs, .library-subtabs, [data-dock-name=notes]")' in js
    assert 'strip.setAttribute("data-scrolled", "1");' in js


# A stuck sub-tab strip is opaque, full height and edged (INBOX 790).
_ALL_CSS = "\n".join(p.read_text(encoding="utf-8") for p in CSS_FILES)


def test_a_stuck_sub_tab_strip_is_opaque_full_height_and_edged():
    """INBOX 790: "the sub menu bars are a little hard to see and access as
    they are so short height wise". The strip a list scrolls under is opaque
    (a translucent card let the notes show through), its tabs are a body
    control tall, and its hairline is the measured 3:1 one."""
    rule = re.search(r'\.library-subtabs\[data-scrolled="1"\] \{([^}]*)\}', _ALL_CSS)
    assert rule and "background: var(--modal-bg-opaque)" in rule.group(1)
    assert "backdrop-filter" not in rule.group(1)
    #: The base rule, at a line's start: `.note-picker-sources.tabs-line > button`
    #: (the attach picker's own strip, c74727200) ends with the same words.
    button = re.search(r"^\.tabs-line > button \{([^}]*?)\}", _ALL_CSS, re.S | re.M)
    assert button and "height: max(var(--control-h-body), var(--target-min))" in button.group(1)
    edge = re.search(r'\.library-subtabs\[data-scrolled="1"\] \{\s*box-shadow:([^}]*)\}', _ALL_CSS)
    assert edge and "inset 0 -1px 0 var(--ghost-btn-border)" in edge.group(1)
