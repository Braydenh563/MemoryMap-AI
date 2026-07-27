"""Model management (plan §6.5): which models are active, the curated
suggested-models catalog, and the two background jobs — re-indexing
after an embedding switch, and downloading a model with progress.

The janitor, librarian, and embedding service must never hardcode a
model name (plan §4) — they ask this module, which reads the user's
saved preferences and falls back to the defaults.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Protocol

from sqlalchemy import delete, select

from memorymap.ai.ollama_client import OllamaClient, OllamaError
from memorymap.core.config import ConfigManager
from memorymap.core.database import DatabaseManager, EmbeddingRecord, Entry
from memorymap.entry.manager import log_action


class Embedder(Protocol):
    """The two methods the re-index job needs from an embedding service.

    Stated structurally rather than by importing `EmbeddingService`, because
    that import points back at `ai/embeddings.py`, which imports this module —
    a genuine cycle that a `TYPE_CHECKING` guard hides at runtime without
    removing. Writing down the contract is also the more honest description:
    re-indexing does not need an `EmbeddingService`, it needs something that
    can embed an entry and name its backend, which is what the tests pass.
    """

    def store_for_entry(self, session, entry: Entry) -> bool: ...

    def backend_id(self) -> str: ...

# Curated catalog, stored as data so it's trivial to edit (plan §6.5).
# There's no Ollama API to browse the online library, hence hardcoded.
SUGGESTED_MODELS: dict[str, list[dict[str, str]]] = {
    "chat": [
        {"name": "llama3.2", "size": "~2.0 GB", "purpose": "Fast all-rounder — the default"},
        {"name": "qwen2.5:3b", "size": "~1.9 GB", "purpose": "Strong all-rounder, follows instructions well"},
        {"name": "phi3.5", "size": "~2.2 GB", "purpose": "Small and sharp — good summaries and Q&A"},
    ],
    "embedding": [
        {"name": "nomic-embed-text", "size": "~274 MB", "purpose": "Solid general-purpose embeddings"},
        {"name": "mxbai-embed-large", "size": "~670 MB", "purpose": "Higher quality, a little slower"},
    ],
}


class ModelManager:
    """Reads/writes the active-model preferences."""

    def __init__(self, config: ConfigManager) -> None:
        self._config = config

    def chat_model(self) -> str:
        return self._config.get_preference("chat_model", "llama3.2")

    def utility_model(self) -> str:
        """The model for quick background jobs — filing (janitor), the
        weekly digest, tidy suggestions, writing fixes (Wave N). Defaults
        to the chat model, but the user can point it at a small fast model
        so the big chat model isn't tied up categorising every note."""
        return self._config.get_preference("utility_model", "") or self.chat_model()

    def set_utility_model(self, name: str) -> None:
        # Empty string means "same as chat model".
        self._config.set_preference("utility_model", name or "")

    def embedding_backend(self) -> str:
        """'sentence-transformers' (built-in default) or 'ollama'."""
        return self._config.get_preference("embedding_backend", "sentence-transformers")

    def embedding_model(self) -> str:
        """Only meaningful when the backend is 'ollama'."""
        return self._config.get_preference("embedding_model", "nomic-embed-text")

    def set_chat_model(self, name: str) -> None:
        # Chat model switches apply instantly — no re-index needed (§6.5).
        self._config.set_preference("chat_model", name)

    def set_embedding_backend(self, backend: str, model: str | None = None) -> None:
        # The caller MUST kick off a re-index after this — vectors from
        # different models are not comparable (§6.5).
        self._config.set_preference("embedding_backend", backend)
        if model:
            self._config.set_preference("embedding_model", model)


# --- background jobs ---------------------------------------------------------
# Simple module-level state: this is a single-process, single-user app.


@dataclass
class Job:
    kind: str  # "reindex" or "pull"
    name: str = ""  # model name for pulls
    total: int = 0  # entries (reindex) or bytes (pull)
    done: int = 0
    status: str = "running"  # running | success | error | cancelled
    error: str = ""
    cancel_requested: bool = False  # cooperative stop (Wave N tasks manager)

    def as_dict(self) -> dict:
        return {
            "kind": self.kind,
            "name": self.name,
            "total": self.total,
            "done": self.done,
            "status": self.status,
            "error": self.error,
        }


_lock = threading.Lock()
_reindex_job: Job | None = None
_pull_jobs: dict[str, Job] = {}


def reset_jobs() -> None:
    """Forget finished/failed job records — used between tests."""
    global _reindex_job
    with _lock:
        _reindex_job = None
        _pull_jobs.clear()


def reindex_status() -> dict | None:
    with _lock:
        return _reindex_job.as_dict() if _reindex_job else None


def pull_statuses() -> dict[str, dict]:
    with _lock:
        return {name: job.as_dict() for name, job in _pull_jobs.items()}


def cancel_reindex() -> bool:
    """Ask a running re-index to stop (Wave N). Cooperative: the worker
    checks the flag between entries. Returns True if one was running."""
    with _lock:
        if _reindex_job is not None and _reindex_job.status == "running":
            _reindex_job.cancel_requested = True
            return True
    return False


def cancel_pull(name: str) -> bool:
    """Ask a running download to stop (Wave N)."""
    with _lock:
        job = _pull_jobs.get(name)
        if job is not None and job.status == "running":
            job.cancel_requested = True
            return True
    return False


def start_reindex(db: DatabaseManager, embeddings: Embedder) -> bool:
    """Regenerate every non-deleted entry's embedding with the current
    backend, in a background thread. Returns False if one is already
    running. While it runs, old vectors no longer match the new
    backend_id, so semantic search safely falls back to keyword search
    until each entry is re-embedded (§6.5)."""
    global _reindex_job
    with _lock:
        if _reindex_job is not None and _reindex_job.status == "running":
            return False
        _reindex_job = Job(kind="reindex")
        job = _reindex_job
    threading.Thread(
        target=_run_reindex, args=(db, embeddings, job), name="reindex", daemon=True
    ).start()
    return True


def _run_reindex(db: DatabaseManager, embeddings: Embedder, job: Job) -> None:
    session = db.session()
    try:
        entries = list(
            session.scalars(select(Entry).where(Entry.is_deleted == False))  # noqa: E712
        )
        job.total = len(entries)
        for entry in entries:
            if job.cancel_requested:  # user quit it from the tasks manager
                job.status = "cancelled"
                return
            # Drop the stale vector first so a failed re-embed never
            # leaves an old-model vector looking current.
            session.execute(
                delete(EmbeddingRecord).where(EmbeddingRecord.entry_id == entry.id)
            )
            session.commit()
            embeddings.store_for_entry(session, entry)  # False = skip, keep going
            job.done += 1
        log_action(
            session,
            "reindexed",
            "embeddings",
            detail=f"{job.done} entries -> {embeddings.backend_id()}",
        )
        session.commit()
        job.status = "success"
    except Exception as exc:  # a failed job must report, never crash the app
        job.status = "error"
        job.error = str(exc)
    finally:
        session.close()


def start_pull(client: OllamaClient, name: str) -> bool:
    """Download a model via Ollama in a background thread. Returns False
    if that model is already downloading."""
    with _lock:
        existing = _pull_jobs.get(name)
        if existing is not None and existing.status == "running":
            return False
        job = Job(kind="pull", name=name)
        _pull_jobs[name] = job
    threading.Thread(
        target=_run_pull, args=(client, name, job), name=f"pull-{name}", daemon=True
    ).start()
    return True


def _run_pull(client: OllamaClient, name: str, job: Job) -> None:
    try:
        # Ollama streams progress lines with completed/total bytes (§6.5).
        for update in client.pull(name):
            if job.cancel_requested:  # user quit it from the tasks manager
                job.status = "cancelled"
                return
            if update.get("error"):
                raise OllamaError(update["error"])
            if update.get("total"):
                job.total = int(update["total"])
                job.done = int(update.get("completed", job.done))
        job.status = "success"
    except OllamaError as exc:
        # Surface the failure so the UI can offer a retry — never leave
        # a half-download looking installed (§6.5).
        job.status = "error"
        job.error = str(exc)
