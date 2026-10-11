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
    assert "if (key && dismissedNotificationIds().has(id)) return null;" in js
    assert "NOTIFICATIONS_DISMISSED_KEY" in js


def test_a_snoozed_reminder_that_is_overdue_again_is_a_new_row():
    """OPEN.md: a dismissed reminder notification never returned, so a reminder
    snoozed and overdue again stayed hidden from the bell. The key carries the
    due time, so a new due time is a new row; both writers use the one helper."""
    js = app_js_text()
    assert "function reminderNoticeKey(reminder)" in js
    assert "return `reminder:${reminder.id}@${reminder.due_at || \"\"}`;" in js
    assert js.count("key: reminderNoticeKey(reminder),") == 2
    assert "key: `reminder:${reminder.id}`" not in js


def test_a_reminder_made_from_a_note_says_what_it_is_about_in_its_notification_and_the_bell():
    """CHAT_PLAN section 1 row 6: "a reminder's notification says why it
    matters, from its note". The reminder row already carries `target_title`;
    the system notification's body and the bell's detail now read it."""
    from pathlib import Path

    js = app_js_text()
    notify = (Path(__file__).resolve().parents[1] / "frontend" / "js" / "reminder-notify.js").read_text(encoding="utf-8")
    assert "one.target_title ? `\\nAbout ${toastName(one.target_title)}`" in notify
    assert "reminder.target_title ? `, about ${toastName(reminder.target_title)}`" in js
