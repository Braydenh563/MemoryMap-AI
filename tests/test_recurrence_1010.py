"""Recurrence beyond four, and early alerts (TIMELINE_PLAN 11 row 8).

Every weekday, every 2 weeks, the last Friday of the month, every other
Monday, and "1 day before" / "an hour before", read by `ai/recognise.py`
(the one reader, `tests/test_one_reader.py`), kept by the reminder store
as the rule itself, and rolled on by `next_occurrence` when one is done.
The 20 phrases in `fixtures/composer/recurrence_1010.json` score 1.0.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import pytest

from memorymap.ai import recognise as rec

FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "composer" / "recurrence_1010.json").read_text(encoding="utf-8"))
NOW = datetime.fromisoformat(FIXTURE["now"])


def _got(text: str) -> dict:
    parsed = rec.parse_reminder_text(text, NOW)
    assert parsed is not None, text
    return {
        "title": parsed["text"],
        "due_at": parsed["due_at"].isoformat(timespec="minutes"),
        "recurring": parsed.get("recurring", "none"),
        "alert_minutes": parsed.get("alert_minutes"),
    }


def test_the_twenty_phrases_score_one():
    phrases = FIXTURE["phrases"]
    assert len(phrases) == 20
    wrong = [(p["text"], _got(p["text"]), p["expect"]) for p in phrases if _got(p["text"]) != p["expect"]]
    assert not wrong, wrong


def test_the_set_covers_what_the_row_names():
    kept = {p["expect"]["recurring"] for p in FIXTURE["phrases"]}
    assert {"FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", "FREQ=WEEKLY;INTERVAL=2", "FREQ=MONTHLY;BYDAY=-1FR",
            "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO"} <= kept
    assert {1440, 60} <= {p["expect"]["alert_minutes"] for p in FIXTURE["phrases"]}


def test_last_friday_alone_is_a_day_gone_not_a_repeat():
    spans = rec.recognise("what did I do last friday", now=NOW)
    assert not [s for s in spans if s.kind == "recurrence"]


@pytest.mark.parametrize(
    ("rule", "after", "expected"),
    [
        ("FREQ=MONTHLY;BYDAY=-1FR", "2026-10-30T12:30", "2026-11-27T12:30"),
        ("FREQ=MONTHLY;BYDAY=2WE", "2026-10-14T19:00", "2026-11-11T19:00"),
        ("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", "2026-10-16T09:00", "2026-10-19T09:00"),
        ("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO", "2026-10-19T07:00", "2026-11-02T07:00"),
        ("FREQ=WEEKLY;INTERVAL=2", "2026-10-15T09:00", "2026-10-29T09:00"),
        ("FREQ=MONTHLY;INTERVAL=3", "2026-10-15T09:00", "2027-01-15T09:00"),
        ("daily", "2026-10-15T08:00", "2026-10-16T08:00"),
        ("weekly", "2026-10-18T18:00", "2026-10-25T18:00"),
        ("monthly", "2026-01-31T09:00", "2026-02-28T09:00"),
    ],
)
def test_next_occurrence(rule, after, expected):
    assert rec.next_occurrence(rule, datetime.fromisoformat(after)).isoformat(timespec="minutes") == expected


def test_alert_words_say_the_alert_back():
    assert [rec.alert_words(m) for m in (30, 60, 120, 1440, 10080)] == [
        "30 minutes before", "1 hour before", "2 hours before", "1 day before", "1 week before"]


def test_the_store_keeps_a_rule_and_an_alert_and_rolls_a_rule_on(client):
    """`/reminders` keeps the rule as itself and the alert in minutes; the ICS
    says both; `/reminders/{id}/complete` rolls a rule on, in the person's
    own days, and marks a one-off done."""
    made = client.post("/reminders", json={"text": "Team lunch", "due_at": "2030-01-25T12:30:00Z",
                                           "recurring": "FREQ=MONTHLY;BYDAY=-1FR", "alert_minutes": 1440})
    assert made.status_code == 201, made.text
    body = made.json()
    assert (body["recurring"], body["alert_minutes"]) == ("FREQ=MONTHLY;BYDAY=-1FR", 1440)
    assert (body["repeat_words"], body["alert_words"]) == ("every last Friday of the month", "1 day before")
    ics = client.get(f"/reminders/{body['id']}/export.ics").text
    assert "RRULE:FREQ=MONTHLY;BYDAY=-1FR" in ics and "TRIGGER:-PT1440M" in ics
    rolled = client.post(f"/reminders/{body['id']}/complete").json()
    assert rolled["done"] is False and rolled["due_at"].startswith("2030-02-22T12:30")
    assert rolled["was_due_at"].startswith("2030-01-25T12:30")
    # 9am Monday in Auckland (UTC+13) is 20:00 Sunday in UTC: the next
    # weekday is Tuesday 9am there, not Monday's evening in UTC.
    weekday = client.post("/reminders", json={"text": "Standup", "due_at": "2030-01-27T20:00:00Z",
                                              "recurring": "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"}).json()
    nz = client.post(f"/reminders/{weekday['id']}/complete?tz_offset_minutes=780").json()
    assert nz["due_at"].startswith("2030-01-28T20:00")
    once = client.post("/reminders", json={"text": "Once", "due_at": "2030-01-25T12:30:00Z"}).json()
    done = client.post(f"/reminders/{once['id']}/complete").json()
    assert done["done"] is True
    cleared = client.put(f"/reminders/{body['id']}", json={"alert_minutes": 0}).json()
    assert cleared["alert_minutes"] is None
    refused = client.post("/reminders", json={"text": "x", "due_at": "2030-01-25T12:30:00Z", "recurring": "sometimes"})
    assert refused.status_code == 422


def test_quick_add_by_words_keeps_the_rule_and_the_alert(client):
    made = client.post("/reminders/parse", json={"text": "gym every other monday at 7am, an hour before", "tz_offset_minutes": 0})
    assert made.status_code in (200, 201), made.text
    body = made.json()
    assert body["recurring"] == "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO" and body["alert_minutes"] == 60
