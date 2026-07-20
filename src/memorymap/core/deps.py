"""The single source of truth for shared app state (build plan §4).

Exactly one ConfigManager and one DatabaseManager exist per process.
Routers must import `get_session` / `get_config` from here and must
NEVER build their own DatabaseManager.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

from sqlalchemy.orm import Session

from memorymap.ai.embeddings import EmbeddingService
from memorymap.ai.model_manager import ModelManager
from memorymap.ai.ollama_client import OllamaClient
from memorymap.core.config import ConfigManager
from memorymap.core.database import DatabaseManager

_config: ConfigManager | None = None
_db: DatabaseManager | None = None
_ollama: OllamaClient | None = None
_model_manager: ModelManager | None = None
_embeddings: EmbeddingService | None = None


def init_app_state(data_dir: str | Path | None = None) -> None:
    """Build the singletons once. Safe to call twice (later calls no-op),
    so tests can initialise with a temp dir before the app starts."""
    global _config, _db, _ollama, _model_manager, _embeddings
    if _config is None:
        _config = ConfigManager(data_dir=data_dir)
    if _db is None:
        _db = DatabaseManager(_config.db_path)
    if _ollama is None:
        _ollama = OllamaClient(base_url=_config.ollama_url)
    if _model_manager is None:
        _model_manager = ModelManager(_config)
    if _embeddings is None:
        _embeddings = EmbeddingService(_model_manager, _ollama)


def reload_db() -> None:
    """Close every connection and reopen the database file — needed
    after a backup restore replaces the file underneath us (Wave F)."""
    global _db
    assert _config is not None
    if _db is not None:
        _db.engine.dispose()
    _db = DatabaseManager(_config.db_path)


def reset_app_state() -> None:
    """Throw the singletons away — used between tests, never in the app."""
    global _config, _db, _ollama, _model_manager, _embeddings
    if _db is not None:
        _db.engine.dispose()
    _config = None
    _db = None
    _ollama = None
    _model_manager = None
    _embeddings = None


def override_ai(
    ollama: OllamaClient | None = None,
    embeddings: EmbeddingService | None = None,
) -> None:
    """Swap in fakes — tests only. Real code never calls this."""
    global _ollama, _embeddings
    if ollama is not None:
        _ollama = ollama
    if embeddings is not None:
        _embeddings = embeddings


def get_config() -> ConfigManager:
    init_app_state()
    assert _config is not None
    return _config


def get_db() -> DatabaseManager:
    init_app_state()
    assert _db is not None
    return _db


def get_ollama() -> OllamaClient:
    init_app_state()
    assert _ollama is not None
    return _ollama


def get_model_manager() -> ModelManager:
    init_app_state()
    assert _model_manager is not None
    return _model_manager


def get_embeddings() -> EmbeddingService:
    init_app_state()
    assert _embeddings is not None
    return _embeddings


def get_session() -> Iterator[Session]:
    """FastAPI dependency: one session per request, always closed."""
    session = get_db().session()
    try:
        yield session
    finally:
        session.close()
