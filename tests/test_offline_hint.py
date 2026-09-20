"""What would make the AI work, said from what is actually true.

Asked for directly (INBOX 272): "make sure all features and alternatives are
easily knoticable by and offered for the user... and same for many other
instances."

Every message reporting the model unavailable said "start Ollama" and stopped
there. That is no help to somebody who has never installed it, and misleading
to somebody whose copy is running on a different port: both look identical
from inside the app, because both are a probe that did not answer.
"""

from __future__ import annotations

import pytest

from memorymap.ai import offline


@pytest.fixture(autouse=True)
def _fresh_lookup():
    offline.forget_ollama_binary()
    yield
    offline.forget_ollama_binary()


def test_with_no_ollama_installed_it_says_where_to_get_it(monkeypatch):
    monkeypatch.setattr(offline.shutil, "which", lambda _name: None)
    hint = offline.ollama_hint("http://localhost:11434")
    assert "ollama.com" in hint
    #: And that the notebook is not broken meanwhile, which is the fact
    #: somebody meeting this for the first time most needs.
    assert "keeps working without it" in hint
    assert "ollama serve" not in hint, (
        "telling somebody to run a program they have not installed is the "
        "exact confusion this exists to end"
    )


def test_with_ollama_installed_it_says_start_it_and_where_the_address_lives(monkeypatch):
    monkeypatch.setattr(offline.shutil, "which", lambda _name: "/usr/local/bin/ollama")
    hint = offline.ollama_hint("http://localhost:11434")
    assert "ollama serve" in hint
    assert "http://localhost:11434" in hint, "it has to name the address it tried"
    assert "Settings" in hint, (
        "a running Ollama on a different port is the other half of this case, "
        "and the way out of that one is the address setting"
    )
    assert "ollama.com" not in hint


def test_the_lookup_happens_once(monkeypatch):
    """`shutil.which` walks PATH, these messages are on a path somebody is
    already waiting on, and a program does not get installed halfway through a
    chat turn."""
    calls = []
    monkeypatch.setattr(offline.shutil, "which", lambda name: calls.append(name) or None)
    for _ in range(5):
        offline.ollama_hint()
    assert len(calls) == 1


def test_not_installed_is_cached_too(monkeypatch):
    """A sentinel rather than None, because None is a real answer here and
    caching it as "not looked yet" would run the lookup on every call for
    exactly the people the cache is for."""
    calls = []
    monkeypatch.setattr(offline.shutil, "which", lambda name: calls.append(name) or None)
    assert offline.ollama_binary() is None
    assert offline.ollama_binary() is None
    assert len(calls) == 1


def test_the_message_reads_as_one_thought(monkeypatch):
    monkeypatch.setattr(offline.shutil, "which", lambda _name: None)
    message = offline.offline_message("The AI isn't running, so it can't draft this yet.")
    assert message.startswith("The AI isn't running")
    assert ".  " not in message and "  " not in message, "one space at the join"


def test_the_two_surfaces_that_use_it_both_do(monkeypatch):
    """A helper nothing calls is the shape this app has been caught by before
    (a whole search engine with no doorway). These are the two that produce a
    message rather than an event."""
    from memorymap.ai import drafter, extractor

    monkeypatch.setattr(offline.shutil, "which", lambda _name: None)
    for produce in (drafter.offline_message, extractor.offline_message):
        assert "ollama.com" in produce()
