"""The "none of these notes mention" line under an answer (owner,
2026-10-12): asked "when did I buy that gamin mouse earlier this year??",
the answer quoted "I just bought a new gaming mouse" and then said "I
couldn't find any reference to buy or gamin". A past form and a typo of a
word the note has are not missing."""

from tessellate.ai import composer


def found(*words):
    return {composer._stem(w) for w in words}


def test_a_past_form_counts_as_the_word():
    assert composer._seen("buy", found("I", "just", "bought", "mouse"))


def test_a_dropped_g_counts_as_the_word():
    assert composer._seen("gamin", found("gaming", "mouse"))


def test_one_letter_off_counts_as_the_word():
    assert composer._seen("mouce", found("mouse"))


def test_a_word_no_note_has_is_still_missing():
    assert not composer._seen("hotel", found("gaming", "mouse"))


def test_a_turn_that_asks_for_the_web_goes_to_the_web_first():
    """'hey can u pls search the web for ...' was answered from two unrelated
    notes: a note matched, and the web was only the fallback."""
    from tessellate.ai import composer_digest

    asked = 'hey can u pls search the web for the book series "He Who Fights With Monsters" by Shirtaloon??'
    assert composer_digest.asks_web(asked)
    assert composer_digest.web_query(asked).startswith("the book series")
    assert not composer_digest.asks_web("when did I buy that gamin mouse earlier this year??")
    assert not composer_digest.asks_web("what did I order online last week")


def test_cadence_takes_the_bare_unit():
    """"roughly every a week" (owner, 2026-10-12)."""
    import re
    from tessellate.ai import composer_digest as d
    for days in (1, 7, 30):
        every = re.sub(r"^(?:about |nearly )?an? ", "", d._gap(days))
        assert not every.startswith(("a ", "an ", "about a")), every


def test_a_sentence_heading_is_not_wrapped_in_your_note():
    """"Your the split follows this structure note has" (owner, 2026-10-12)."""
    from datetime import date
    from types import SimpleNamespace
    from tessellate.ai import composer_digest as d
    held = [SimpleNamespace(view=SimpleNamespace(written=date(2026, 7, 27)))]
    line = d._prose("The split follows this structure", held, ["has Pull, Push and Legs"], 0, date(2026, 10, 12))
    assert "Your the" not in line and "structure note" not in line, line
