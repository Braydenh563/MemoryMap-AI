"""Switching the chat backend keeps semantic search (audit 2026-10-05, ARCH-06).

Measured before this: after switching to an OpenAI-compatible server and
back, `/models/status` said `embedding_ready: false` and `/search/stats`
`vectors: 0` fifteen minutes later, and the next save took 5.1 s (the cold
load of the embedding model). `reload_llm_client` built a new
`EmbeddingService` with nothing loaded, although the built-in
sentence-transformers model never uses the chat client at all.
"""

from __future__ import annotations

from memorymap.core import deps


def test_a_backend_switch_keeps_the_loaded_embedding_model(app_state):
    before = deps.get_embeddings()
    before._st_model = object()  # what a warm-up leaves: the model in memory
    assert before.is_ready()
    deps.reload_llm_client()
    after = deps.get_embeddings()
    assert after.is_ready(), "the switch threw the loaded embedding model away"
    assert after._st_model is before._st_model


def test_the_embedder_talks_to_the_new_client(app_state):
    """Embeddings by Ollama go through the chat client, so the switch must
    reach them: the reason the service was rebuilt in the first place."""
    deps.reload_llm_client()
    assert deps.get_embeddings()._ollama is deps.get_ollama()
