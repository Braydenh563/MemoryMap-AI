"""The single source of truth for shared app state (build plan §4).

Exactly one ConfigManager and one DatabaseManager exist per process.
Routers must import `get_session` / `get_config` from here and must
NEVER build their own DatabaseManager.
"""

from __future__ import annotations

import logging
import os
import sys
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy.orm import Session

from memorymap.ai.embeddings import EmbeddingService
from memorymap.ai.model_manager import ModelManager
from memorymap.ai.ollama_client import OllamaClient
from memorymap.core.config import ConfigManager
from memorymap.core.database import DatabaseManager, Entry

_config: ConfigManager | None = None
_db: DatabaseManager | None = None
_ollama: OllamaClient | None = None
_model_manager: ModelManager | None = None
_embeddings: EmbeddingService | None = None


class MultipleWorkersError(RuntimeError):
    """Raised when the app is started with more than one worker process."""


def _requested_worker_count() -> int | None:
    """How many workers the launcher was asked for, if it said.

    Everything in this module is one-per-process, and so are the in-memory log
    buffer, the auth tokens and the handle on the SearXNG subprocess. That is
    correct and simple for one process, and quietly wrong for two: the log
    console would show a fraction of what happened, an unlock would work only
    on whichever worker answered next, and two workers would each believe they
    owned the SearXNG they started.

    None of that fails loudly. It presents as flakiness, which is the reason
    to refuse rather than warn.

    Read from the command line and from WEB_CONCURRENCY, which is the
    environment variable uvicorn and gunicorn both honour — between them those
    are the ways someone actually turns this up.
    """
    argv = sys.argv[1:]
    for index, argument in enumerate(argv):
        value = None
        if argument in ("--workers", "-w") and index + 1 < len(argv):
            value = argv[index + 1]
        elif argument.startswith("--workers="):
            value = argument.split("=", 1)[1]
        if value is not None:
            try:
                return int(value)
            except ValueError:
                return None
    concurrency = os.environ.get("WEB_CONCURRENCY")
    if concurrency:
        try:
            return int(concurrency)
        except ValueError:
            return None
    return None


def refuse_multiple_workers() -> None:
    """Stop a multi-worker start, with the reason and the way out.

    Deliberately an exception rather than a log line. A warning at startup is
    read by nobody and the failure it precedes looks like a bug in the app.
    """
    workers = _requested_worker_count()
    if workers is None or workers <= 1:
        return
    raise MultipleWorkersError(
        f"MemoryMap cannot run with {workers} workers — it is a single-user "
        "app, and its configuration, database handle, log buffer, unlock "
        "sessions and SearXNG subprocess are one-per-process. With more than "
        "one worker each of those silently becomes per-worker: logs would show "
        "a fraction of what happened, unlocking would work only sometimes, and "
        "two workers would each think they own the SearXNG they started.\n\n"
        "Start it with one worker (`python -m memorymap`). If you are trying "
        "to make it faster, more workers is not the lever — the slow paths are "
        "Ollama and embedding, and both are already off the request thread."
    )


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


def store_quietly(session: Session, entry: Entry) -> bool:
    """Best-effort embedding refresh for a note that was just written.

    Every caller wants the same two things: never fail the user's save because
    the embedding backend is unhappy, and never lose the reason it was unhappy.
    The bare ``except Exception: pass`` this replaces delivered only the first —
    so a backend that had stopped working produced notes that quietly dropped
    out of semantic search with nothing anywhere to say why.

    It lives here, and not in `ai/embeddings.py` where it reads like it
    belongs, for one reason: it needs the shared `EmbeddingService`, and this
    module is the only thing allowed to hand that out. From inside `embeddings`
    it could only be reached by importing this module back — a real cycle,
    which a function-local import defers rather than removes.

    Returns True if a vector was stored.
    """
    try:
        return get_embeddings().store_for_entry(session, entry)
    except Exception:  # noqa: BLE001 — the whole point is that nothing escapes
        logging.getLogger("memorymap.embeddings").warning(
            "couldn't embed entry %s; it stays keyword-searchable only",
            getattr(entry, "id", "?"),
            exc_info=True,
        )
        return False
