"""A fixed "now" for the reminder tests, injected through the modules' own seams.

`routes_reminders` reads the clock as `utcnow()` and `datetime.now(...)`, and
`reminder_notifier` as `datetime.now(...)`; neither takes a `now` argument on
the route path, so the module-level names are swapped for the test's duration.
"""

from __future__ import annotations

from datetime import datetime, timezone

#: A Saturday at noon UTC; deliberately not the real date, so a test that still
#: reads the real clock disagrees with it and fails loudly.
FIXED_NOW = datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc)


class FrozenDatetime(datetime):
    @classmethod
    def now(cls, tz=None):  # noqa: ANN001
        return FIXED_NOW.astimezone(tz) if tz is not None else FIXED_NOW.astimezone().replace(tzinfo=None)


def freeze_reminder_clock(monkeypatch, *, notifier: bool = False) -> datetime:
    from tessellate.api import routes_reminders

    monkeypatch.setattr(routes_reminders, "utcnow", lambda: FIXED_NOW)
    monkeypatch.setattr(routes_reminders, "datetime", FrozenDatetime)
    if notifier:
        from tessellate.core import reminder_notifier

        monkeypatch.setattr(reminder_notifier, "datetime", FrozenDatetime)
    return FIXED_NOW
