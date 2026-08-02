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
from memorymap.core import taskhistory
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

    def store_for_entry(self, session, entry: Entry) -> bool:
        pass

    def backend_id(self) -> str:
        pass

# Curated catalog, stored as data so it's trivial to edit (plan §6.5).
# There's no Ollama API to browse the online library, hence hardcoded.
#
# **Ordered smallest-first within each purpose, and that is the ordering that
# matters.** Someone reading this list is choosing hardware they already own.
# A list sorted by quality puts the model they cannot run at the top and the
# one they should start with out of sight; sorted by size, the first thing they
# see is the thing most likely to work.
#
# `purpose` says what the model is *for* rather than how good it is. "Strong
# all-rounder" is not a decision anyone can act on; "the smallest one worth
# using — fine on a laptop with no GPU" is.
#
# Sizes are the default quantisation Ollama pulls (usually Q4_K_M) and are
# approximate. They matter more than the parameter count here: a 7B at Q4 and
# a 3B at Q8 land in the same place on a 8 GB machine.
SUGGESTED_MODELS: dict[str, list[dict[str, str]]] = {
    "chat": [
        # --- runs on almost anything ---
        {"name": "qwen3.5:2b", "size": "~1.5 GB", "purpose": "The lightest one worth using — fine on a laptop with no GPU"},
        {"name": "gemma3:1b", "size": "~0.8 GB", "purpose": "Smallest here. Try it if 2 GB models are still too slow"},
        {"name": "llama3.2", "size": "~2.0 GB", "purpose": "Fast all-rounder — the default, and a good first choice"},
        {"name": "qwen2.5:3b", "size": "~1.9 GB", "purpose": "Follows instructions closely — good for agent mode"},
        {"name": "granite4.1:3b", "size": "~2.1 GB", "purpose": "Strong instruction-following at a small size"},
        {"name": "phi3.5", "size": "~2.2 GB", "purpose": "Sharp on summaries and Q&A for its size"},
        # --- 8 GB of RAM, or any modern GPU ---
        {"name": "gemma3:4b", "size": "~3.3 GB", "purpose": "Noticeably better writing than the 2-3B models"},
        {"name": "llama3.1:8b", "size": "~4.7 GB", "purpose": "The step up: better reasoning, reliable tool calls"},
        {"name": "qwen3:8b", "size": "~5.2 GB", "purpose": "Best tool use here — a thinking model, so slower per answer"},
        {"name": "mistral-nemo", "size": "~7.1 GB", "purpose": "Long-document work — a large context window"},
        # --- 16 GB and up ---
        {"name": "gemma3:12b", "size": "~8.1 GB", "purpose": "Long-form writing and summarising, if you have the memory"},
        {"name": "qwen3:14b", "size": "~9.3 GB", "purpose": "The most capable agent here. Slow without a GPU"},
    ],
    "embedding": [
        {"name": "nomic-embed-text", "size": "~274 MB", "purpose": "Solid general-purpose embeddings"},
        {"name": "bge-m3", "size": "~1.2 GB", "purpose": "Better on long notes and mixed languages"},
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
                taskhistory.record(
                    "reindex",
                    "Re-indexing your notes",
                    "cancelled",
                    f"stopped after {job.done} of {job.total}",
                )
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
        taskhistory.record(
            "reindex",
            "Re-indexing your notes",
            "completed",
            f"{job.done} notes re-embedded with {embeddings.backend_id()}",
        )
    except Exception as exc:  # a failed job must report, never crash the app
        job.status = "error"
        job.error = str(exc)
        # The ending that mattered most and was hardest to see: a re-index that
        # dies halfway used to leave exactly the same empty screen as one that
        # finished, with the reason only in the log console.
        taskhistory.record(
            "reindex", "Re-indexing your notes", "failed", str(exc)
        )
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
                taskhistory.record(
                    "pull", f"Downloading {name}", "cancelled", name=name
                )
                return
            if update.get("error"):
                raise OllamaError(update["error"])
            if update.get("total"):
                job.total = int(update["total"])
                job.done = int(update.get("completed", job.done))
        job.status = "success"
        taskhistory.record("pull", f"Downloaded {name}", "completed", name=name)
    except OllamaError as exc:
        # Surface the failure so the UI can offer a retry — never leave
        # a half-download looking installed (§6.5).
        job.status = "error"
        job.error = str(exc)
        taskhistory.record(
            "pull", f"Downloading {name}", "failed", str(exc), name=name
        )
