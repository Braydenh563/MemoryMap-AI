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


def test_an_emoticon_is_not_a_name():
    """"hey :D" answered "Ha, D." (owner, 2026-10-12)."""
    from tessellate.ai import vocative
    for text in ("hey :D", "hey :)", "hello xD", "yo ;P", "hi <3"):
        said = vocative.split(text)
        assert not said.names, (text, said)


def test_the_clock_speaks_am_pm_and_follows_what_about():
    from datetime import datetime, timezone
    from tessellate.ai import utilities
    now = datetime(2026, 10, 12, 18, 53, tzinfo=timezone.utc)
    def said(q):
        return "".join(t for _, t in utilities.answer(q, now) or [])
    assert "6:53 pm" in said("what is the time in am/pm"), said("what is the time in am/pm")
    assert "18:53" in said("what is the time")
    assert "japan" in said("what about the time in japan").lower() or "Tokyo" in said("what about the time in japan")


def test_search_up_is_a_web_ask():
    from tessellate.ai import composer_digest as d
    assert d.asks_web("search up sandwich recipes including ham and cheese")
    assert d.web_query("search up sandwich recipes") == "sandwich recipes"


def test_an_app_link_is_not_an_unbacked_name():
    """"[Open your notes](#/notes)" drew "Heads up: ... could not find Open" (owner, 2026-10-12)."""
    from tessellate.ai import source_check
    sources = source_check.Sources(["what did I write this week"])
    assert source_check.unbacked_claims("You have no notes in this week.\n\n[Open your notes](#/notes)", sources) == []


def test_a_refused_connection_is_one_plain_line():
    import requests
    from tessellate.ai.captioning import server_unreachable
    try:
        try:
            raise ConnectionRefusedError("refused")
        except ConnectionRefusedError as cause:
            raise RuntimeError("Chat failed") from cause
    except RuntimeError as exc:
        assert server_unreachable(exc)
    assert not server_unreachable(ValueError("a corrupt image"))
    assert server_unreachable(requests.exceptions.ConnectionError("x"))
