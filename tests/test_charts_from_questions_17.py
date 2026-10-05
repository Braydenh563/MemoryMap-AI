"""WORLD_CLASS_PLAN section 17 row 4: charts from questions.

The original vision: "AI-generated data visualisation". Ask answers a counting
or trend question ("how many notes per category this month", "my race times")
with a bar or line drawn from the records, the data under it. The numbers are
counted, never generated (`notebook_stats`' own argument), so a chart cannot
invent a value; the page draws what the server sends and writes its data table
under it.
"""

from __future__ import annotations

import json
from datetime import timedelta
from pathlib import Path

from memorymap.ai import notebook_stats, stat_charts
from memorymap.core import deps
from memorymap.core.database import Category, Entry, utcnow

ROOT = Path(__file__).resolve().parents[1]


def _session():
    return deps.get_db().session()


def _note(session, content, *, category=None, tags=(), days_ago=0, private=False, binned=False):
    entry = Entry(content=content, tags=json.dumps(list(tags)), is_private=private)
    if category is not None:
        cat = session.query(Category).filter_by(name=category).one_or_none()
        if cat is None:
            cat = Category(name=category)
            session.add(cat)
            session.flush()
        entry.category_id = cat.id
    entry.created_at = utcnow() - timedelta(days=days_ago)
    if binned:
        entry.deleted_at = utcnow()
        entry.is_deleted = True
    session.add(entry)
    session.flush()
    return entry


def _chart(session, question):
    result = notebook_stats.answer(question, session)
    assert result is not None, question
    return result


# --- counting: a bar -------------------------------------------------------------


def test_notes_per_category_is_a_bar_with_its_data(client):
    with _session() as session:
        for _ in range(3):
            _note(session, "x", category="Work")
        _note(session, "y", category="Home")
        session.commit()
        result = _chart(session, "how many notes per category")
    assert result.kind == "chart-categories"
    chart = result.chart
    assert chart["kind"] == "bar"
    assert chart["labels"] == ["Work", "Home"] and chart["values"] == [3, 1]
    assert chart["title"] == "Notes per category"
    assert [f["label"] for f in result.facts] == ["Work", "Home"]
    assert "Work (3)" in result.text


def test_a_period_narrows_the_count(client):
    with _session() as session:
        _note(session, "new", category="Work", days_ago=2)
        _note(session, "old", category="Work", days_ago=90)
        _note(session, "old2", category="Home", days_ago=90)
        session.commit()
        result = _chart(session, "how many notes per category this month")
    assert result.chart["labels"] == ["Work"] and result.chart["values"] == [1]
    assert "this month" in result.chart["title"].lower()


def test_notes_per_tag(client):
    with _session() as session:
        _note(session, "a", tags=["run", "health"])
        _note(session, "b", tags=["run"])
        session.commit()
        result = _chart(session, "chart my notes by tag")
    assert result.chart["labels"] == ["run", "health"]
    assert result.chart["values"] == [2, 1]


def test_private_and_binned_notes_are_nobodys_statistics(client):
    with _session() as session:
        _note(session, "x", category="Work")
        _note(session, "secret", category="Secret", private=True)
        _note(session, "gone", category="Gone", binned=True)
        session.commit()
        result = _chart(session, "how many notes per category")
    assert result.chart["labels"] == ["Work"]


def test_the_most_common_tags_answer_also_carries_a_bar(client):
    with _session() as session:
        _note(session, "a", tags=["work"])
        _note(session, "b", tags=["work", "idea"])
        session.commit()
        result = _chart(session, "what are my most common tags")
    assert result.chart["kind"] == "bar" and result.chart["labels"][0] == "work"


# --- trends: a line --------------------------------------------------------------


def test_notes_per_month_is_a_line_with_empty_months_filled(client):
    with _session() as session:
        _note(session, "now")
        _note(session, "now2")
        _note(session, "three months ago", days_ago=95)
        session.commit()
        result = _chart(session, "how many notes did I write each month")
    chart = result.chart
    assert chart["kind"] == "line"
    assert len(chart["labels"]) == 12 and len(chart["values"]) == 12
    assert chart["values"][-1] == 2 and sum(chart["values"]) == 3
    assert chart["values"].count(0) >= 8  # the months with no notes are zero, not skipped


def test_notes_per_week(client):
    with _session() as session:
        _note(session, "a")
        _note(session, "b", days_ago=8)
        session.commit()
        result = _chart(session, "notes per week")
    assert len(result.chart["values"]) == 12 and sum(result.chart["values"]) == 2


# --- numbers in the notes: "my race times" ---------------------------------------


def test_race_times_become_a_line_in_date_order(client):
    with _session() as session:
        _note(session, "Race: parkrun 5k in 25:40", days_ago=60)
        _note(session, "Race: parkrun 5k in 24:55", days_ago=30)
        _note(session, "Race: parkrun 5k in 24:10", days_ago=7)
        _note(session, "Shopping: milk, eggs", days_ago=5)
        session.commit()
        result = _chart(session, "chart my race times")
    chart = result.chart
    assert result.kind == "chart-numbers"
    assert chart["kind"] == "line" and chart["format"] == "duration"
    assert chart["values"] == [1540, 1495, 1450]
    assert len(chart["labels"]) == 3
    assert "24:10" in result.text


def test_a_plain_measurement_keeps_its_unit(client):
    with _session() as session:
        for days, kg in ((40, "82.4"), (20, "81.9"), (3, "81.2")):
            _note(session, f"Weight: {kg} kg this morning", days_ago=days)
        session.commit()
        result = _chart(session, "plot my weight over time")
    chart = result.chart
    assert chart["format"] == "number" and chart["unit"] == "kg"
    assert chart["values"] == [82.4, 81.9, 81.2]


def test_fewer_than_three_points_is_not_a_trend(client):
    with _session() as session:
        _note(session, "Race: 5k in 24:10", days_ago=10)
        _note(session, "Race: 5k in 24:00", days_ago=3)
        session.commit()
        assert notebook_stats.answer("chart my race times", session) is None


def test_a_question_that_is_not_for_a_chart_is_left_alone(client):
    with _session() as session:
        _note(session, "a", category="Work")
        session.commit()
        assert notebook_stats.answer("how many categories do I have", session).kind == "category-count"
        assert notebook_stats.answer("how many notes do I have", session).chart is None


def test_parsers_read_times_and_numbers():
    assert stat_charts.seconds_in("ran it in 1:02:03 flat") == 3723
    assert stat_charts.seconds_in("24:10") == 1450
    assert stat_charts.seconds_in("no time here") is None
    assert stat_charts.number_in("Weight: 81.5 kg") == (81.5, "kg")
    assert stat_charts.number_in("Weight: 1,250 g") == (1250.0, "g")
    assert stat_charts.number_in("nothing") is None


# --- the wire and the page -------------------------------------------------------


def _events(client, question, **body):
    with client.stream("POST", "/chat/stream", json={"question": question, **body}) as r:
        return [json.loads(line) for line in r.iter_lines() if line.strip()]


def test_the_stream_meta_carries_the_chart(client):
    with _session() as session:
        _note(session, "a", category="Work")
        _note(session, "b", category="Work")
        session.commit()
    meta = next(e for e in _events(client, "how many notes per category", notes_only=True) if e["type"] == "meta")
    assert meta["chart"]["kind"] == "bar" and meta["chart"]["values"] == [2]
    plain = next(e for e in _events(client, "how many notes do I have", notes_only=True) if e["type"] == "meta")
    assert plain.get("chart") is None


def test_the_page_draws_it_with_a_table_and_a_png_export():
    js = (ROOT / "frontend" / "js" / "answer-chart.js").read_text(encoding="utf-8")
    assert "function drawAnswerChart" in js
    assert "<table" in js or 'createElement("table")' in js
    assert "toBlob" in js and "image/png" in js
    ask = (ROOT / "frontend" / "js" / "capture-ask.js").read_text(encoding="utf-8")
    assert "meta?.chart" in ask.split("function placeAnswerFigures", 1)[1].split("\n}\n", 1)[0]
    app = (ROOT / "frontend" / "js" / "app.js").read_text(encoding="utf-8")
    assert "/js/answer-chart.js" in app
