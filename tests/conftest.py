"""Shared test fixtures.

Every test gets a throwaway data directory so nothing ever touches a
real database, and singletons are rebuilt between tests.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from memorymap.ai import model_manager
from memorymap.core import deps, taskhistory


@pytest.fixture()
def app_state(tmp_path, monkeypatch):
    """Fresh singletons pointed at a temp dir. Yields the ConfigManager."""
    # Make sure a developer's real .env can't leak into tests.
    monkeypatch.setenv("MEMORYMAP_DATA_DIR", str(tmp_path / "data"))
    deps.reset_app_state()
    model_manager.reset_jobs()
    # Process-global like the log buffer, so it leaks between tests exactly the
    # way the job registry does — and a test asserting "no jobs have finished"
    # would otherwise pass or fail on what ran before it.
    taskhistory.clear()
    deps.init_app_state(data_dir=tmp_path / "data")
    yield deps.get_config()
    deps.reset_app_state()
    model_manager.reset_jobs()
    taskhistory.clear()


@pytest.fixture()
def session(app_state):
    s = deps.get_db().session()
    yield s
    s.close()


@pytest.fixture()
def client(app_state):
    """TestClient with ALL AI unavailable — proves capture and keyword
    search work with zero AI, and keeps results identical whether or not
    the developer happens to have Ollama running."""
    from memorymap.api.app import create_app
    from tests.fakes import FakeEmbeddingService, FakeOllama

    deps.override_ai(
        ollama=FakeOllama(running=False),
        embeddings=FakeEmbeddingService(available=False),
    )
    return TestClient(create_app())


@pytest.fixture()
def fake_ollama(app_state):
    from tests.fakes import FakeOllama

    fake = FakeOllama(running=True)
    deps.override_ai(ollama=fake)
    return fake


@pytest.fixture()
def fake_embeddings(app_state):
    from tests.fakes import FakeEmbeddingService

    fake = FakeEmbeddingService(available=True)
    deps.override_ai(embeddings=fake)
    return fake


@pytest.fixture()
def ai_client(app_state, fake_ollama, fake_embeddings):
    """TestClient with working (fake) AI — full Phase 2 behaviour."""
    from memorymap.api.app import create_app

    return TestClient(create_app())


# --- a fake OpenAI-compatible transport (§6) ---------------------------------
#
# The fixtures live here so pytest finds them by name; `FakeResponse` and `sse`
# are ordinary helpers and live in `fakes_http.py`, because importing a *test*
# module to get them re-binds everything else that import carries — which is
# how `client` from `test_providers` came to shadow the `client` fixture above
# and silently decide which HTTP client three files' tests were handed.


@pytest.fixture
def capture_post(monkeypatch):
    """Swap `requests.post` inside the OpenAI client and record the payloads."""
    from fakes_http import FakeResponse

    sent: list[dict] = []
    queued: list = []

    def fake_post(url, json=None, headers=None, stream=False, timeout=None):
        sent.append({"url": url, "json": json})
        return queued.pop(0) if queued else FakeResponse(payload={})

    monkeypatch.setattr("memorymap.ai.openai_client.requests.post", fake_post)
    return type("Capture", (), {"sent": sent, "queue": queued})()


@pytest.fixture
def openai_client():
    """An `OpenAICompatClient` that can never reach the network."""
    from memorymap.ai.openai_client import OpenAICompatClient

    c = OpenAICompatClient(base_url="http://localhost:1234/v1")
    c._catalog = []
    c._context_lengths = {"m": 8192}
    return c
