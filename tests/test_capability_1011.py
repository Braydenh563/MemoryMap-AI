"""A question about Atlas is answered about Atlas (CHAT_PLAN decision 65).

INBOX 810, the owner: "I asked if it could web search and then searched the
web for the word "web" and then didnt even output the results". The eval
set (tests/fixtures/composer/capability_1011.json) is 40 ways of asking what
Atlas can do, which must never search, and 15 requests, which must still act.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from memorymap.ai import capability, intent
from memorymap.core import deps
from memorymap.search import websearch
from tests.test_composer_route_688 import _ask

EVAL = json.loads((Path(__file__).parent / "fixtures/composer/capability_1011.json").read_text(encoding="utf-8"))


def test_the_eval_set_holds_the_owners_phrasings():
    assert len(EVAL["asks"]) >= 40 and len(EVAL["requests"]) >= 15
    assert "can you search the web?" in EVAL["asks"]


@pytest.mark.parametrize("question", EVAL["asks"])
def test_a_capability_question_is_about_the_app(question):
    assert capability.asks(question), question
    assert intent.classify(question) == intent.ABOUT_APP, question


@pytest.mark.parametrize("question", EVAL["requests"])
def test_a_request_is_not_a_capability_question(question):
    assert not capability.asks(question), question


@pytest.fixture
def web(monkeypatch):
    calls: list[str] = []

    def search(query, limit=5, searxng_url=None, provider=None):  # noqa: ANN001, ARG001
        calls.append(query)
        return []

    monkeypatch.setattr(websearch, "search_web", search)
    return calls


@pytest.mark.parametrize("on", [False, True])
@pytest.mark.parametrize("surface", [{"notes_only": True, "use_tools": False}, {"use_tools": True}])
def test_can_you_search_the_web_says_so_and_never_searches(client, web, on, surface):
    deps.get_config().set_preference("web_search_enabled", on)
    out = _ask(client, "can you search the web?", **surface)
    assert web == []
    assert out["text"].startswith("Yes, when web search is on.")
    assert f"It is {'on' if on else 'off'} now, in Settings, Web search." in out["text"]
    assert "web" not in json.dumps(out.get("grounding", [])).lower() or not out.get("grounding")


def test_what_can_you_do_is_the_overview(client):
    out = _ask(client, "what can you do?", notes_only=True, use_tools=False)
    assert out["text"].startswith("I answer from your notes")
    assert "**Work things out:**" in out["text"]


def test_a_model_question_says_what_a_model_adds(client):
    out = _ask(client, "can you translate?", notes_only=True, use_tools=False)
    assert out["text"].startswith("Only with a model running.")
    assert "Settings, Models" in out["text"]


@pytest.mark.parametrize("surface", [{"use_tools": True}, {"use_tools": False}, {"notes_only": True, "use_tools": False}])
def test_with_a_model_running_the_model_answers_with_the_line_as_context(ai_client, fake_ollama, web, monkeypatch, surface):
    """Decision 75 (the owner, 2026-10-11): with a model up the composer is
    the model's assistant, not its replacement. The model is asked, the
    capability line reaches it as a labelled fact, and nothing searches."""
    seen: list[list[dict]] = []
    real = fake_ollama.chat_stream

    def recording(model, messages, mode=None):  # noqa: ANN001, ANN202
        seen.append(messages)
        return real(model, messages, mode)

    monkeypatch.setattr(fake_ollama, "chat_stream", recording)
    calls = len(fake_ollama.chat_models)
    out = _ask(ai_client, "can you search the web?", **surface)
    assert len(fake_ollama.chat_models) > calls, "the model was not asked"
    assert web == []
    system = " ".join(m["content"] for m in seen[-1] if m["role"] == "system")
    assert "The app's own answer to this" in system and "Yes, when web search is on." in system
    assert not out["text"].startswith("Yes, when web search is on.")


def test_from_your_notes_with_a_model_up_is_still_the_apps_answer(ai_client, fake_ollama, web):
    """The Ask box's own choice (Use AI off) is the person's, model or not."""
    calls = len(fake_ollama.chat_models)
    out = _ask(ai_client, "can you search the web?", notes_only=True, use_tools=False, answer_from="notes")
    assert out["text"].startswith("Yes, when web search is on.")
    assert len(fake_ollama.chat_models) == calls and web == []
