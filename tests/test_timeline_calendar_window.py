"""An explicit window holds the notes that sit in it (TIMELINE_PLAN section 9).

The calendar asks `/timeline` for one month, week or day with `start` and
`end`. A note sits on the date it mentions where it has one, so a window is
answered by that placement, not by when the note was typed: the calendar
sweep found a day page written in March and titled for today on the feed's
today and missing from the calendar's.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

from memorymap.core.database import Entry


def _save(client, content: str) -> dict:
    response = client.post("/entries", json={"content": content, "category": "Journal"})
    assert response.status_code == 201
    return response.json()


def _ids(client, start: str, end: str, tz: int = 0) -> set[int]:
    body = client.get(f"/timeline?kind=note&start={start}&end={end}&tz={tz}&limit=1000").json()
    return {row["id"] for row in body["rows"]}


def _day(client, note_id: int) -> str:
    rows = client.get("/timeline?kind=note&days=0&limit=1000").json()["rows"]
    return next(row["date"] for row in rows if row["id"] == note_id)


def test_a_note_sits_in_the_window_of_the_day_it_mentions(client, session):
    page = _save(client, "Dentist tomorrow, bring the forms.")
    plain = _save(client, "Written today, about nothing in particular.")
    session.get(Entry, page["id"]).created_at = datetime(2024, 3, 2, 10, 0)
    session.commit()
    day = _day(client, page["id"])
    on_it = _ids(client, f"{day}T00:00:00", f"{day}T23:59:59")
    written = _ids(client, "2024-03-01T00:00:00", "2024-03-31T23:59:59")
    assert page["id"] in on_it and page["id"] not in written
    assert plain["id"] not in on_it


def test_a_mentioned_day_is_matched_on_the_readers_clock(client):
    page = _save(client, "Dentist tomorrow, bring the forms.")
    day = date.fromisoformat(_day(client, page["id"]))
    before = day - timedelta(days=1)
    after = day + timedelta(days=1)
    # Five hours west of UTC a local day runs 05:00 to 04:59 UTC: the day the
    # writer named is in its own day's window, not the one before.
    own = _ids(client, f"{day}T05:00:00", f"{after}T04:59:59", tz=-300)
    previous = _ids(client, f"{before}T05:00:00", f"{day}T04:59:59", tz=-300)
    assert page["id"] in own and page["id"] not in previous


def test_a_meeting_sits_in_the_window_of_its_own_date(client, session):
    made = client.post("/meetings", json={"title": "Planning", "when": "2031-02-03T14:00", "category": "Work"})
    assert made.status_code == 201
    meeting = made.json()
    session.get(Entry, meeting["id"]).created_at = datetime(2024, 3, 2, 10, 0)
    session.commit()
    assert meeting["id"] in _ids(client, "2031-02-03T00:00:00", "2031-02-03T23:59:59")
    assert meeting["id"] not in _ids(client, "2024-03-01T00:00:00", "2024-03-31T23:59:59")


def test_a_note_with_a_written_out_date_sits_on_that_date(client, session):
    """The owner, 2026-10-11: "things written on specific dates dont show".
    A note saying "2031-02-03 at 3pm" was placed by when it was typed, since
    only relative phrases were read; now the calendar's window for that day
    holds it, with the clock, and the day it was written does not."""
    made = _save(client, "Dentist appointment on 2031-02-03 at 3pm, bring forms")
    session.get(Entry, made["id"]).created_at = datetime(2024, 3, 2, 10, 0)
    session.commit()
    assert made["id"] in _ids(client, "2031-02-03T00:00:00", "2031-02-03T23:59:59")
    assert made["id"] not in _ids(client, "2024-03-01T00:00:00", "2024-03-31T23:59:59")
    body = client.get("/timeline?kind=note&start=2031-02-03T00:00:00&end=2031-02-03T23:59:59&limit=1000").json()
    row = next(r for r in body["rows"] if r["id"] == made["id"])
    assert row["placed_by"] == "mentioned" and row["date"] == "2031-02-03" and row["time"] == "15:00"
