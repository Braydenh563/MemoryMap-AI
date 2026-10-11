"""The recogniser suite (CHAT_PLAN "The deterministic foundation", module 1,
decisions 46 and 56): one reader of numbers, dates, durations, units and
contacts, measured on `fixtures/composer/recognise_1010.json` (written by
`scripts/recognise_fixture.py`, expected values worked out by hand).
"""

from __future__ import annotations

import ast
import json
import time as clock
from datetime import date, datetime, time, timedelta
from pathlib import Path

from memorymap.ai import recognise as rec

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = json.loads((ROOT / "tests/fixtures/composer/recognise_1010.json").read_text(encoding="utf-8"))
NOW = datetime.fromisoformat(FIXTURE["now"])


def _num(value: float) -> str:
    return str(int(value)) if float(value).is_integer() else f"{value:g}"


def _value(span: rec.Span) -> str:
    v = span.value
    if span.kind == "range":
        first, last, grain = v
        fmt = (lambda t: t.strftime("%H:%M")) if isinstance(first, time) else (lambda d: d.isoformat())
        return f"{fmt(first)}..{fmt(last)}/{grain}"
    if span.kind == "datetime":
        return v.strftime("%Y-%m-%dT%H:%M")
    if span.kind == "time":
        return v.strftime("%H:%M")
    if span.kind == "date":
        return v.isoformat()
    if span.kind == "duration":
        return str(int(v.total_seconds()))
    if span.kind in ("money", "quantity", "temperature"):
        return f"{_num(v[0])} {v[1]}"
    if span.kind == "number":
        return _num(v)
    return str(v)


def _text(text: str) -> str:
    low = text.strip()
    for lead in ("on ", "at ", "by ", "for "):
        if low.lower().startswith(lead):
            low = low[len(lead):]
    return low


def _brief(span: rec.Span) -> str:
    return f"{span.kind}|{_text(span.text)}|{_value(span)}"


def _norm(expected: str) -> str:
    kind, text, value = expected.split("|", 2)
    return f"{kind}|{_text(text)}|{value}"


def _run(row: dict) -> tuple[list[str], list[str]]:
    spans = rec.recognise(row["text"], now=NOW, locale=row["locale"])
    return [_brief(s) for s in spans if s.rank == 0], [_brief(s) for s in spans if s.rank > 0]


def test_the_fixture_reads_at_one():
    rows = FIXTURE["rows"]
    assert len(rows) >= 200
    wrong = []
    for row in rows:
        got, alt = _run(row)
        want = [_norm(e) for e in row["expect"]]
        want_alt = [_norm(e) for e in row["alt"]]
        if got != want or any(a not in alt for a in want_alt):
            wrong.append((row["text"], row["locale"], got, alt, want, want_alt))
    assert not wrong, f"{len(wrong)} of {len(rows)} wrong:\n" + "\n".join(map(repr, wrong[:25]))


def test_spans_point_at_their_text():
    for row in FIXTURE["rows"]:
        for span in rec.recognise(row["text"], now=NOW, locale=row["locale"]):
            assert row["text"][span.start:span.end] == span.text
            assert span.read_as


def test_each_phrase_reads_inside_its_budget():
    """5 ms a phrase, best of five (CHAT_PLAN section 3: the chips draw as you type)."""
    rec.recognise("warm up", now=NOW, locale="en-GB")
    best = None
    for _ in range(5):
        start = clock.perf_counter()
        for row in FIXTURE["rows"]:
            rec.recognise(row["text"], now=NOW, locale=row["locale"])
        took = (clock.perf_counter() - start) / len(FIXTURE["rows"])
        best = took if best is None else min(best, took)
    assert best < 0.005, f"{best * 1000:.2f} ms a phrase"


def test_no_network_and_no_app_imports():
    """Decision 56: nothing in the deterministic layer reaches past the computer."""
    tree = ast.parse((ROOT / "src/memorymap/ai/recognise.py").read_text(encoding="utf-8"))
    names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names |= {a.name.split(".")[0] for a in node.names}
        elif isinstance(node, ast.ImportFrom) and node.module:
            names.add(node.module.split(".")[0])
    assert names <= {"__future__", "re", "dataclasses", "datetime", "typing"}, names


def test_the_unit_table_has_150_units():
    assert len({said for _dim, _size, said in rec.UNITS.values()}) >= 150


def test_the_json_form_is_plain():
    spans = rec.recognise("dentist 21st 9am, £4.50, every tuesday, next week", now=NOW, locale="en-GB")
    body = json.dumps([s.json() for s in spans])
    assert '"kind": "datetime"' in body and '"currency": "GBP"' in body and "FREQ=WEEKLY" in body


def test_tense_is_read_from_the_sentence():
    past = rec.recognise("what did I do on friday", now=NOW, locale="en-GB")[0]
    future = rec.recognise("see Sam on friday", now=NOW, locale="en-GB")
    assert past.value == date(2026, 10, 2)
    assert [s.value for s in future if s.kind == "date"] == [date(2026, 10, 9)]
    assert rec.recognise("in 20 minutes", now=NOW, locale="en-GB")[0].value == NOW + timedelta(minutes=20)
