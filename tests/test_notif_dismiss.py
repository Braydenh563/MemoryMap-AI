"""One notification can be removed (INBOX 508: "I cant delete individual
notifications"). Only Clear all existed. Measured in a browser by
`scratchpad/ui-sweeps/notifdismiss.js`; these pin the two parts a later edit
could drop without the panel looking any different."""
from tests._app_js import app_js_text


def test_each_row_carries_a_remove_button():
    js = app_js_text()
    assert 'className = "ghost small icon-only notif-dismiss"' in js
    assert "dismissNotification(item);" in js
    assert 'setAttribute("aria-label", `Remove: ${item.title}`)' in js


def test_a_removed_overdue_reminder_is_not_folded_back_in():
    """The panel re-records every overdue reminder each time it opens; without
    the dismissed set the row would return on the next press of the bell."""
    js = app_js_text()
    assert "if (key && dismissedNotificationIds().has(id)) return;" in js
    assert "NOTIFICATIONS_DISMISSED_KEY" in js
