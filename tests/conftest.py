"""Shared test fixtures.

Every test gets a throwaway data directory so nothing ever touches a
real database, and singletons are rebuilt between tests.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from memorymap.ai import model_manager
from memorymap.core import deps


@pytest.fixture()
def app_state(tmp_path, monkeypatch):
    """Fresh singletons pointed at a temp dir. Yields the ConfigManager."""
    # Make sure a developer's real .env can't leak into tests.
    monkeypatch.setenv("MEMORYMAP_DATA_DIR", str(tmp_path / "data"))
    deps.reset_app_state()
    model_manager.reset_jobs()
    deps.init_app_state(data_dir=tmp_path / "data")
    yield deps.get_config()
    deps.reset_app_state()
    model_manager.reset_jobs()


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
