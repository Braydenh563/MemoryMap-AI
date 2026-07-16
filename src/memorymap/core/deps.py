"""The single source of truth for shared app state (build plan §4).

Exactly one ConfigManager and one DatabaseManager exist per process.
Routers must import `get_session` / `get_config` from here and must
NEVER build their own DatabaseManager.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

from sqlalchemy.orm import Session

from memorymap.core.config import ConfigManager
from memorymap.core.database import DatabaseManager

_config: ConfigManager | None = None
_db: DatabaseManager | None = None


def init_app_state(data_dir: str | Path | None = None) -> None:
    """Build the singletons once. Safe to call twice (later calls no-op),
    so tests can initialise with a temp dir before the app starts."""
    global _config, _db
    if _config is None:
        _config = ConfigManager(data_dir=data_dir)
    if _db is None:
        _db = DatabaseManager(_config.db_path)


def reset_app_state() -> None:
    """Throw the singletons away — used between tests, never in the app."""
    global _config, _db
    if _db is not None:
        _db.engine.dispose()
    _config = None
    _db = None


def get_config() -> ConfigManager:
    init_app_state()
    assert _config is not None
    return _config


def get_db() -> DatabaseManager:
    init_app_state()
    assert _db is not None
    return _db


def get_session() -> Iterator[Session]:
    """FastAPI dependency: one session per request, always closed."""
    session = get_db().session()
    try:
        yield session
    finally:
        session.close()
