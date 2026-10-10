"""Web pages as sources with no model (CHAT_PLAN Phase 6 step 9, decision 37,
second half): with web search on and tools allowed, a question no note
answers is answered from the pages the search finds, every sentence a span
of its page, cited by address; with either off, no search is made."""

from __future__ import annotations

import pytest

from memorymap.core import deps
from memorymap.search import websearch
from tests.test_composer_route_688 import _ask

PAGE = {
    "url": "https://example.org/tides",
    "title": "Tides explained",
    "domain": "example.org",
    "text": "Tides are caused by the pull of the moon and the sun. Spring tides come at new and full moon. Neap tides come at the quarter moons.",
}


@pytest.fixture
def web(monkeypatch):
    calls: list[str] = []

    def search(query, limit=5, searxng_url=None, provider=None):  # noqa: ANN001, ARG001
        calls.append(query)
        return [{"title": PAGE["title"], "url": PAGE["url"], "snippet": "", "domain": PAGE["domain"], "engine": "test"}]

    monkeypatch.setattr(websearch, "search_web", search)
    monkeypatch.setattr(websearch, "fetch_readable_cached", lambda url: dict(PAGE))
    return calls


def test_a_question_no_note_answers_is_answered_from_the_web(client, session, web):
    deps.get_config().set_preference("web_search_enabled", True)
    out = _ask(client, "what causes spring tides", use_tools=True)
    assert web == ["what causes spring tides"]
    rows = out["grounding"][0]["sentences"]
    assert rows and all(r["kind"] == "web" and r["url"] == PAGE["url"] for r in rows)
    for row in rows:
        assert row["sentence"].rstrip(".") in PAGE["text"] or row["sentence"][0].lower() + row["sentence"][1:].rstrip(".") in PAGE["text"]
    assert "[page **Tides explained**]" in out["text"]
    assert out["web_sources"][0]["sources"] == [{"title": "Tides explained", "url": PAGE["url"], "domain": "example.org"}]


def test_with_web_search_off_no_search_is_made(client, session, web):
    deps.get_config().set_preference("web_search_enabled", False)
    _ask(client, "what causes spring tides", use_tools=True)
    assert web == []


def test_with_tools_off_no_search_is_made(client, session, web):
    deps.get_config().set_preference("web_search_enabled", True)
    _ask(client, "what causes spring tides", use_tools=False)
    assert web == []


def test_a_running_model_answers_and_the_engine_does_not_search(ai_client, fake_ollama, session, web):
    deps.get_config().set_preference("web_search_enabled", True)
    _ask(ai_client, "what causes spring tides", use_tools=False)
    assert web == []
