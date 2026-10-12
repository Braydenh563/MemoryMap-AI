"""The time in a country with several zones names each (OPEN row 555).

"the time in Australia" said Sydney's time alone, which is wrong for Perth by
two hours; a region the person names ("western australia") keeps its one zone.
"""

from __future__ import annotations

from datetime import datetime, timezone

from tessellate.ai import utilities

NOW = datetime(2026, 1, 15, 2, 0, tzinfo=timezone.utc)


def _text(question: str) -> str:
    return "".join(part[1] for part in utilities.answer(question, now=NOW))


def test_a_country_with_several_zones_names_each():
    text = _text("what's the time in australia")
    for city in ("Perth", "Adelaide", "Brisbane", "Sydney"):
        assert city in text
    assert "13:00 in Sydney" in text and "10:00 in Perth" in text
    assert text.startswith("Australia has several time zones.")


def test_the_us_lists_its_mainland_zones():
    text = _text("what time is it in the usa")
    assert "21:00 in New York" in text and "18:00 in Los Angeles" in text


def test_a_named_region_keeps_its_one_zone():
    text = _text("what's the time in western australia")
    #: The one-zone wording since 7c07664ea: "It's 10:00 in Perth, Western Australia (AWST, UTC+8)."
    assert text.startswith("It's 10:00 in Perth") and "Sydney" not in text
