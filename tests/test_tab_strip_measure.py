"""The top bar's tab strip is measured by its tabs only (INBOX 539: the
sliding `.tab-glide` was counted, so the strip's need changed with the
selected tab and the bar jumped 29px at 1024). Measured by
`scratchpad/ui-sweeps/tabpillshift.js`: 0px at 1440, 1280, 1024, 900, 700."""

from tests._app_js import app_js_text


def test_the_strip_width_counts_tabs_not_the_glide():
    js = app_js_text()
    body = js[js.index("function tabContentWidth()") :]
    body = body[: body.index("\n}\n")]
    assert '!child.matches("[data-tab]")' in body
