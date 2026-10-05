"""A tab drawn before the last script has run waits for it (INBOX 519: "Couldn't
load this tab: renderDashboard is not defined" on the lock screen). dashboard.js
is near the end of index.html's scripts, and a boot fetch answering between two
scripts called it first on a slower machine."""
from tests._app_js import app_js_text


def test_the_dashboard_is_drawn_once_scripts_have_loaded():
    js = app_js_text()
    assert "function whenScriptsLoaded()" in js
    assert 'if (name === "dashboard") return whenScriptsLoaded().then(() => renderDashboard());' in js
    # A return to the tab refreshes in place (INBOX 602); still after the scripts.
    assert 'if (name === "dashboard") whenScriptsLoaded().then(() => renderDashboard({ refresh: true }));' in js
    assert 'if (name === "dashboard") renderDashboard();' not in js
