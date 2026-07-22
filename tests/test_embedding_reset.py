"""Switching search engine clears a cached embedding failure immediately."""

from __future__ import annotations

from memorymap.core import deps


def test_reset_failure_state_clears_cached_error(app_state):
    service = deps.get_embeddings()  # the real EmbeddingService (no fakes)
    service.last_error = "OSError: torch_xpu.dll could not be found"
    service._load_failed_at = 123.0

    service.reset_failure_state()

    assert service.last_error is None
    assert service._load_failed_at is None


def test_switch_backend_clears_stale_error(ai_client):
    # A stale failure from a previous backend must not survive the switch.
    deps.get_embeddings().last_error = "stale torch error"
    response = ai_client.post(
        "/models/embedding-backend",
        json={"backend": "sentence-transformers", "model": None},
    )
    assert response.status_code == 200
    assert deps.get_embeddings().last_error is None
