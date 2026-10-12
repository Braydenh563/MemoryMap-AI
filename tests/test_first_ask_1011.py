"""The first question after a restart does not wait for the search model.

The owner's trace, 2026-10-11: "27.06 s before the first step, 27.28 s in
total", with no model. Measured: the local embedding model's cold load was
21.75 s of it. A search now reads by words while the model loads behind it
(`search_manager.query_vector`), and a subject that is a category's whole
name is that category, not the newest notes. `scratchpad/ui-sweeps/firstask.js`
times it through the app: 0.34 s to the first answer.
"""

from __future__ import annotations

import time

from tessellate.ai.embeddings import EmbeddingService
from tessellate.core import jobs
from tessellate.entry import manager
from tessellate.search import search_manager


class _Models:
    def embedding_backend(self) -> str:
        return "sentence-transformers"

    def embedding_st_model(self) -> str:
        return "BAAI/bge-small-en-v1.5"


class _Cold(EmbeddingService):
    """A local model not yet loaded, whose load takes the time it took."""

    def __init__(self) -> None:
        super().__init__(_Models(), None)
        self.loads = 0

    def _load_st_model(self):  # noqa: ANN202
        self.loads += 1
        time.sleep(0.3)
        raise RuntimeError("no model in tests")


def test_a_cold_model_is_not_waited_for(monkeypatch):
    queued: list[str] = []
    monkeypatch.setattr(jobs, "enqueue", lambda kind, fn, **kw: queued.append(kw.get("dedupe_key", kind)))
    cold = _Cold()
    assert cold.loads_cold()
    started = time.perf_counter()
    assert search_manager.query_vector(cold, "courses and study") is None
    assert time.perf_counter() - started < 0.1 and cold.loads == 0
    assert queued == ["search-warm"]


def test_a_loaded_or_fake_model_is_used_as_before(fake_embeddings):
    assert not fake_embeddings.loads_cold()
    assert search_manager.query_vector(fake_embeddings, "gaming mouse") is not None


def test_with_no_meaning_search_a_category_named_whole_is_that_category(session, app_state):
    from tessellate.core import deps
    from tests.fakes import FakeEmbeddingService

    deps.override_ai(embeddings=FakeEmbeddingService(available=False))
    study = manager.create_entry(session, "Psych lecture 1: memory is reconstructive.", category_name="Courses & Study")
    manager.create_entry(session, "Bought oat milk and eggs.", category_name="Shopping")
    session.commit()
    found, mode = search_manager.retrieve(session, "what have I saved about courses & study?", FakeEmbeddingService(available=False), limit=5)
    assert mode == "category" and [e.id for e in found] == [study.id]


def test_why_says_the_search_read_words_only():
    from tessellate.ai import why

    lines = why.lines(intent="notes", mode="keyword", matched=2, used=2, composed=True, loading=True, marks={})
    assert any("the search by meaning was still loading, so it read words only" in line["text"] for line in lines)


def test_through_the_route_a_cold_model_answers_at_once_and_says_so(client, session, monkeypatch):
    import json

    from tessellate.ai import composer_digest
    from tessellate.core import deps

    manager.create_entry(session, "Went to the gym after work.", category_name="Fitness")
    session.commit()
    monkeypatch.setattr(jobs, "enqueue", lambda *a, **kw: None)
    deps.override_ai(embeddings=_Cold())
    started = time.perf_counter()
    body = {"question": "what do I need to buy?", "history": [], "notes_only": True, "use_tools": False, "answer_from": "notes"}
    with client.stream("POST", "/chat/stream", json=body) as response:
        events = [json.loads(line) for line in response.iter_lines() if line.strip()]
    assert time.perf_counter() - started < 5
    text = "".join(e.get("delta", "") for e in events if e.get("type") == "answer")
    assert composer_digest.PHRASES["meaning_loading"] in text
    why = next(e for e in events if e.get("type") == "why")
    assert any("still loading" in line["text"] for line in why["lines"])
