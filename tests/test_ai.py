"""Phase 2 units: embeddings, janitor, librarian, search — all offline."""

from __future__ import annotations

import numpy as np
import pytest

from memorymap.ai import janitor, librarian
from memorymap.ai.embeddings import (
    bytes_to_vector,
    cosine_similarity,
    vector_to_bytes,
)
from memorymap.core import deps
from memorymap.entry import manager
from memorymap.search import search_manager
from tests.fakes import FakeEmbeddingService, FakeOllama, GarbageOllama


# --- vector storage helpers -------------------------------------------------


def test_vector_bytes_roundtrip():
    vector = np.array([0.25, -1.5, 3.0], dtype="float32")
    assert np.array_equal(bytes_to_vector(vector_to_bytes(vector)), vector)


def test_cosine_similarity_basics():
    a = np.array([1.0, 0.0], dtype="float32")
    b = np.array([0.0, 1.0], dtype="float32")
    assert cosine_similarity(a, a) == pytest.approx(1.0)
    assert cosine_similarity(a, b) == pytest.approx(0.0)
    assert cosine_similarity(a, np.zeros(2, dtype="float32")) == 0.0


# --- janitor ----------------------------------------------------------------


def _store(session, embeddings, content, category):
    """Seed one categorised entry with its embedding."""
    entry = manager.create_entry(session, content, category_name=category)
    assert embeddings.store_for_entry(session, entry)
    return entry


def test_janitor_uses_centroid_match_without_llm(session, app_state):
    embeddings = FakeEmbeddingService()
    ollama = FakeOllama()
    model_manager = deps.get_model_manager()
    _store(session, embeddings, "Why did the scarecrow win an award?", "Dad Jokes")

    category, confidence, method = janitor.categorise(
        session, "another funny pun about cheese", embeddings, model_manager, ollama
    )

    assert category == "Dad Jokes"
    assert confidence >= 60
    assert method == "semantic-match"
    assert ollama.chat_calls == []  # clear match → the LLM was never asked


def test_janitor_asks_llm_when_no_match(session, app_state):
    embeddings = FakeEmbeddingService()
    ollama = FakeOllama()
    category, confidence, method = janitor.categorise(
        session, "buy milk and eggs", embeddings, deps.get_model_manager(), ollama
    )
    assert (category, confidence, method) == ("Shopping", 85, "llm")
    assert len(ollama.chat_calls) == 1


def test_janitor_falls_back_when_all_ai_down(session, app_state):
    embeddings = FakeEmbeddingService(available=False)
    ollama = FakeOllama(running=False)
    category, confidence, method = janitor.categorise(
        session, "anything at all", embeddings, deps.get_model_manager(), ollama
    )
    assert (category, confidence, method) == (manager.UNCATEGORISED, 0, "none")


def test_janitor_survives_garbage_llm_reply(session, app_state):
    embeddings = FakeEmbeddingService(available=False)
    ollama = GarbageOllama()
    category, confidence, method = janitor.categorise(
        session, "buy milk", embeddings, deps.get_model_manager(), ollama
    )
    assert (category, confidence, method) == (manager.UNCATEGORISED, 0, "none")


def test_extract_json_from_chatty_reply():
    data = janitor._extract_json('Sure! {"category": "X", "confidence": 9} Hope that helps.')
    assert data == {"category": "X", "confidence": 9}
    with pytest.raises(ValueError):
        janitor._extract_json("no json here")


# --- librarian ---------------------------------------------------------------


def test_librarian_no_results_message(app_state):
    text, thinking = librarian.answer(
        "anything?", [], deps.get_model_manager(), FakeOllama()
    )
    assert text == librarian.NO_RESULTS_MESSAGE
    assert thinking is None


def test_librarian_offline_message(app_state):
    notes = [{"content": "a joke", "category": "Dad Jokes"}]
    text, _thinking = librarian.answer(
        "jokes?", notes, deps.get_model_manager(), FakeOllama(running=False)
    )
    assert text == librarian.OFFLINE_MESSAGE


def test_librarian_answers_with_notes_in_prompt(app_state):
    ollama = FakeOllama()
    notes = [{"content": "the cheese joke", "category": "Dad Jokes"}]
    text, _thinking = librarian.answer("jokes?", notes, deps.get_model_manager(), ollama)
    assert text == ollama.librarian_reply
    prompt = ollama.chat_calls[0][-1]["content"]
    assert "the cheese joke" in prompt  # answers come from the user's notes


# --- search -----------------------------------------------------------------


def test_keyword_search_matches_content_and_tags(session):
    manager.create_entry(session, "remember the milk", tags=["shopping"])
    manager.create_entry(session, "totally unrelated")
    assert len(search_manager.keyword_search(session, "milk")) == 1
    assert len(search_manager.keyword_search(session, "shopping")) == 1


def test_semantic_search_ranks_same_topic_first(session):
    embeddings = FakeEmbeddingService()
    _store(session, embeddings, "a funny scarecrow joke", "Dad Jokes")
    _store(session, embeddings, "buy milk and eggs", "Shopping")

    results = search_manager.semantic_search(session, "what jokes do I have?", embeddings)
    assert results is not None
    contents = [entry.content for entry, _score in results]
    assert contents == ["a funny scarecrow joke"]  # shopping is below the floor


def test_retrieve_falls_back_to_keyword(session):
    manager.create_entry(session, "remember the milk")
    entries, mode = search_manager.retrieve(
        session, "milk", FakeEmbeddingService(available=False)
    )
    assert mode == "keyword"
    assert [e.content for e in entries] == ["remember the milk"]
