"""A due reminder's notification in the browser and the PWA (TIMELINE_PLAN 11
row 4): the page's timer fires it through the service worker, with Done and
Snooze 10 minutes, and the worker does the act itself.

Measured in Chromium with the tab hidden (`scratchpad/n86/hidden.js`, Brief
86's report); these hold the shape that measurement depends on.
"""

from __future__ import annotations

import re
from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
SW = (FRONTEND / "sw.js").read_text(encoding="utf-8")
LAZY = (FRONTEND / "js" / "reminder-notify.js").read_text(encoding="utf-8")


def test_the_reminder_notification_is_a_lazy_file_not_boot_code():
    index = (FRONTEND / "index.html").read_text(encoding="utf-8")
    status = (FRONTEND / "js" / "status.js").read_text(encoding="utf-8")
    assert "reminder-notify.js" not in index
    assert 'lazyScript("/js/reminder-notify.js").then((ok) => ok && announceReminders(fresh))' in status


def test_the_page_shows_it_through_the_worker_with_done_and_snooze():
    assert "registration.showNotification(" in LAZY
    assert '{ action: "done", title: "Done" }' in LAZY
    assert '{ action: "snooze", title: "Snooze 10 minutes" }' in LAZY
    # The desktop launcher posts its own; the page does not post a second.
    assert "health.os_notify" in LAZY
    # An early alert is not due yet, so it carries no Done.
    assert "one && !one.early ? one.id : null" in LAZY


def test_the_worker_does_done_and_snooze_through_the_reminder_routes():
    assert 'self.addEventListener("notificationclick"' in SW
    assert "/reminders/${data.id}/complete?tz_offset_minutes=" in SW
    assert re.search(r'method: "PUT",\s*headers,\s*body: JSON\.stringify\(\{ due_at:', SW)
    assert '"X-Auth-Token": data.token' in SW
    # A refused act (the session ended) opens the app rather than failing quietly.
    assert "actOnReminder(data, action).catch(() => openReminders())" in SW
    assert 'self.clients.openWindow("/#/reminders")' in SW


def test_the_worker_still_never_runs_on_a_timer():
    """No push server, so nothing in the worker waits for a time: the page's
    timer is what fires (decision 69, the offline rule)."""
    assert "setTimeout" not in SW and "setInterval" not in SW and "periodicsync" not in SW
