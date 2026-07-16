"""Shared test fixtures.

Every test gets a throwaway data directory so nothing ever touches a
real database, and singletons are rebuilt between tests.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from memorymap.core import deps


@pytest.fixture()
def app_state(tmp_path, monkeypatch):
    """Fresh singletons pointed at a temp dir. Yields the ConfigManager."""
    # Make sure a developer's real .env can't leak into tests.
    monkeypatch.setenv("MEMORYMAP_DATA_DIR", str(tmp_path / "data"))
    deps.reset_app_state()
    deps.init_app_state(data_dir=tmp_path / "data")
    yield deps.get_config()
    deps.reset_app_state()


@pytest.fixture()
def session(app_state):
    s = deps.get_db().session()
    yield s
    s.close()


@pytest.fixture()
def client(app_state):
    """TestClient against an app that reuses the temp-dir singletons."""
    from memorymap.api.app import create_app

    return TestClient(create_app())
