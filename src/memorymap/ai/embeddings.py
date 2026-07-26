"""The ONE active embedding backend (plan §2, resolution 1).

Default: sentence-transformers `all-MiniLM-L6-v2` — no Ollama needed.
Optional: an Ollama embedding model (user's choice, Phase 3.5).

Both hide behind `embed_text()`, which returns None whenever embeddings
are unavailable. Callers must treat None as "skip semantic features",
never as an error — capture and keyword search keep working (plan §4).
"""

from __future__ import annotations

import logging
import threading
import time

import numpy as np
from sqlalchemy.orm import Session

from memorymap.ai.model_manager import ModelManager
from memorymap.ai.ollama_client import OllamaClient, OllamaError
from memorymap.core.database import EmbeddingRecord, Entry

# DEFAULT_ST_MODEL = "all-MiniLM-L6-v2"
DEFAULT_ST_MODEL = "BAAI/bge-small-en-v1.5"

logger = logging.getLogger("memorymap.embeddings")

# Warm-up bookkeeping so the UI can tell "still loading" from "failed"
# (a silently failed load used to look like eternal "warming up…").
_warmup = {"running": False, "started": False}


def start_warmup(service: "EmbeddingService") -> None:
    """Load the embedding model in a background thread at startup, so the
    user's first save doesn't stall. Idempotent per process."""
    if _warmup["started"]:
        return
    _warmup["started"] = True

    def run() -> None:
        _warmup["running"] = True
        try:
            service.embed_text("warm up")
        finally:
            _warmup["running"] = False

    threading.Thread(target=run, name="embedding-warmup", daemon=True).start()


def warmup_running() -> bool:
    return _warmup["running"]


def vector_to_bytes(vector: np.ndarray) -> bytes:
    """Raw float32 bytes — never pickle (plan §4)."""
    return np.asarray(vector, dtype="float32").tobytes()


def bytes_to_vector(blob: bytes) -> np.ndarray:
    return np.frombuffer(blob, dtype="float32")


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """1.0 = same direction, 0.0 = unrelated. Zero vectors score 0."""
    norms = float(np.linalg.norm(a)) * float(np.linalg.norm(b))
    if norms == 0.0:
        return 0.0
    return float(np.dot(a, b) / norms)


class EmbeddingService:
    # After a failed model load, wait this long before trying again —
    # each attempt can hit the network and stall a save otherwise.
    RETRY_AFTER_SECONDS = 300

    def __init__(self, model_manager: ModelManager, ollama_client: OllamaClient) -> None:
        self._models = model_manager
        self._ollama = ollama_client
        self._st_model = None  # loaded lazily, exactly once
        self._load_failed_at: float | None = None
        # Why the last embed failed, for the Models screen — None = fine.
        self.last_error: str | None = None

    def reset_failure_state(self) -> None:
        """Forget a cached load/embed failure so the very next attempt
        retries immediately, and clear the stale error the Models screen
        shows. Called when the user switches search engine — they've
        usually just fixed whatever was wrong (e.g. a broken torch), and
        shouldn't have to wait out the 5-minute retry cooldown or stare at
        an out-of-date banner."""
        self.last_error = None
        self._load_failed_at = None

    def backend_id(self) -> str:
        """Stored as model_version next to every vector, so a backend
        switch is detectable — vectors from different models live in
        different spaces and must never be compared (plan §6.5)."""
        if self._models.embedding_backend() == "ollama":
            return f"ollama:{self._models.embedding_model()}"
        return f"sentence-transformers:{DEFAULT_ST_MODEL}"

    def is_ready(self) -> bool:
        """Can we embed right now without a long first-time load?
        Drives the UI's status pill."""
        if self._models.embedding_backend() == "ollama":
            return self._ollama.is_running()
        return self._st_model is not None

    def embed_text(self, text: str) -> np.ndarray | None:
        """Vector for one text, or None if the backend is unavailable."""
        if self._models.embedding_backend() == "ollama":
            try:
                vector = self._ollama.embed(self._models.embedding_model(), text)
                self.last_error = None
                return np.asarray(vector, dtype="float32")
            except OllamaError as exc:
                self.last_error = str(exc)
                return None
        return self._embed_with_sentence_transformers(text)

    def _load_st_model(self):  # noqa: ANN202
        """Load the sentence-transformers model, working offline when the
        HuggingFace hub is unreachable (user-reported failure: 'not a
        valid model identifier' with no internet — the local cache still
        has the model, so ask for it explicitly)."""
        from sentence_transformers import SentenceTransformer

        try:
            return SentenceTransformer(DEFAULT_ST_MODEL)
        except Exception as online_exc:
            try:
                model = SentenceTransformer(DEFAULT_ST_MODEL, local_files_only=True)
                logger.info("embedding model loaded from local cache (hub unreachable)")
                return model
            except Exception:
                raise online_exc  # the original error names the real problem

    def _embed_with_sentence_transformers(self, text: str) -> np.ndarray | None:
        if self._st_model is None and self._load_failed_at is not None:
            if time.monotonic() - self._load_failed_at < self.RETRY_AFTER_SECONDS:
                return None  # don't re-stall every save while it's broken
        try:
            if self._st_model is None:
                # Heavy import (pulls in torch) — deferred so the app
                # starts fast and still runs if the package is missing.
                self._st_model = self._load_st_model()
                self._load_failed_at = None
            result = np.asarray(self._st_model.encode(text), dtype="float32")
            self.last_error = None
            return result
        except Exception as exc:
            # No semantic features right now; the rest of the app must
            # keep working — but record and LOG why, or a broken install
            # looks like it's "warming up" forever (user-reported bug).
            self.last_error = f"{type(exc).__name__}: {exc}"
            self._load_failed_at = time.monotonic()
            logger.exception("embedding backend failed")
            return None

    def store_for_entry(self, session: Session, entry: Entry) -> bool:
        """Save an entry's vector. Returns False on failure — which only
        means no semantic search for this entry; it never blocks the
        entry save itself (plan Phase 2).

        Private notes are never embedded. A vector derived from the text
        encodes what the note is about, so storing one beside the ciphertext
        would leak exactly what the encryption is there to hide."""
        if getattr(entry, "is_private", False):
            return False
        vector = self.embed_text(entry.content)
        if vector is None:
            return False
        session.add(
            EmbeddingRecord(
                entry_id=entry.id,
                embedding=vector_to_bytes(vector),
                dim=int(vector.shape[0]),
                model_version=self.backend_id(),
            )
        )
        session.commit()
        return True
