"""The app's voice (`ai/composer_voice.py`): every remark grounded, the
companion never twice the same, the phrasebook in the app's copy rules."""

from __future__ import annotations

from datetime import date

from memorymap.ai import composer_voice
from tests import _voice_eval

EM_DASH = chr(0x2014)


def test_every_surface_is_wholly_grounded():
    table = _voice_eval.run()
    for surface, row in table.items():
        assert row["grounded"] == 1.0, (surface, row.get("failures"))


def test_companion_never_says_the_same_thing_twice_in_twenty_days():
    table = _voice_eval.run()
    assert table["companion"]["count"] == 20
    assert table["companion"]["distinct"] == 20
    assert table["companion"]["words"] <= 30


def test_phrasebook_keeps_the_copy_rules():
    for key, text in composer_voice.VOICE.items():
        assert EM_DASH not in text and "!" not in text, key
        assert "Oops" not in text, key


def test_deterministic():
    data = _voice_eval.load()
    today = date.fromisoformat(data["today"])
    a = composer_voice.remarks(data["notes"], today=today)
    b = composer_voice.remarks(data["notes"], today=today)
    assert [r["text"] for r in a] == [r["text"] for r in b]


def test_title_from_own_words_and_none_for_a_heading():
    assert composer_voice.title_for("# Already titled\nbody") == ""
    title = composer_voice.title_for("Remember to ring the landlord about the boiler on Tuesday.")
    assert title == "Ring the landlord about the boiler"


def test_question_detection():
    assert composer_voice.asks("when is the harbor launch?")
    assert not composer_voice.asks("harbor launch")
    assert not composer_voice.asks("tag:work")
