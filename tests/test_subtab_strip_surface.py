"""A sticky sub-tab strip takes its surface when the page under it scrolls
(INBOX 529: "the subtab menubars are kinda hard to see when scrolled down").
The scroll-edge marker skipped bars inside the scrolling region, and the
strips are sticky inside it, so they stayed see-through over the notes.
`scratchpad/ui-sweeps/subtabscroll.js` and `libscroller.js`: Notes and
Library both carry `data-scrolled="1"` and a blurred card fill once scrolled."""
from tests._app_js import app_js_text


def test_strips_inside_the_region_are_marked():
    js = app_js_text()
    assert 'region.querySelectorAll(".notes-subtabs, .library-subtabs")' in js
    assert 'strip.setAttribute("data-scrolled", "1");' in js
