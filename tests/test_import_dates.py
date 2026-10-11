"""Date, place and person recognition on imported text (CHAT_PLAN section 2,
the import row): the day an export says a note was written (a daily note's
name, a `date:` or "Created:" line) becomes its day on the timeline, and its
relative mentions ("tomorrow") are read on that day, not on the import's.
The measure: the fixture's dates land on the right day."""

from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path

from memorymap.core.database import Entry, EntryDate
from memorymap.entry import app_import

ROOT = Path(__file__).resolve().parents[1]
SET = json.loads((ROOT / "tests/fixtures/import/dated_1010.json").read_text(encoding="utf-8"))


def _zip(members: dict[str, str]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name, text in members.items():
            archive.writestr(zipfile.ZipInfo(name, date_time=(2026, 10, 1, 12, 0, 0)), text)
    return buffer.getvalue()


def _import_all(client) -> dict:
    found = {"people": set(), "places": set()}
    for each in SET["imports"]:
        got = client.post(f"/import/app?source={each['source']}",
                          files=[("files", ("export.zip", _zip(each["files"]), "application/zip"))])
        assert got.status_code == 201, got.text
        for kind in found:
            found[kind].update(got.json()["people" if kind == "people" else "places"])
    return found


def _by_name(session):
    out = {}
    for entry in session.query(Entry).filter(Entry.source_path.is_not(None)).all():
        for name in SET["days"]:
            if name in (entry.source_path or "") or (entry.content or "").lstrip("# ").startswith(name):
                out[name] = entry
    return out


def test_the_fixtures_dates_land_on_the_right_day(client, session):
    _import_all(client)
    notes = _by_name(session)
    assert set(notes) == set(SET["days"])
    for name, day in SET["days"].items():
        if day is None:
            assert notes[name].created_at.date().year >= 2026, name
        else:
            assert notes[name].created_at.date().isoformat() == day, name


def test_relative_mentions_are_read_on_the_notes_own_day(client, session):
    _import_all(client)
    notes = _by_name(session)
    for name, mentions in SET["mentions"].items():
        rows = session.query(EntryDate).filter(EntryDate.entry_id == notes[name].id).all()
        assert sorted((r.phrase.lower(), r.at.date().isoformat()) for r in rows) == sorted(map(tuple, mentions)), name


def test_people_and_places_are_named_in_the_summary(client):
    found = _import_all(client)
    assert {"Sam Carter", "Ana", "Ken"} <= found["people"]
    assert {"Lisbon", "Porto"} <= found["places"]


def test_a_day_without_its_year_is_not_the_written_day():
    assert app_import.written_on("Friday standup", "Created: friday") is None
    assert app_import.written_on("2024-03-14", "body").date().isoformat() == "2024-03-14"
