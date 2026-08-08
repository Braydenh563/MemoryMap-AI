"""The ONE active embedding backend (plan §2, resolution 1).

Default: sentence-transformers `BAAI/bge-small-en-v1.5` — no Ollama needed.
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
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.ai.model_manager import ModelManager
from memorymap.ai.ollama_client import OllamaClient, OllamaError
from memorymap.core.database import EmbeddingRecord, Entry

# The built-in embedding model. It was all-MiniLM-L6-v2 and is not any more,
# which is exactly why nothing user-facing may hard-code a name: the Models
# screen went on saying "Built-in (all-MiniLM)" long after this changed, and
# the only way to find out what was really running was to watch it download
# from Hugging Face in the log. Anything that shows the name asks
# `EmbeddingService.active_model()`.
DEFAULT_ST_MODEL = "BAAI/bge-small-en-v1.5"

logger = logging.getLogger("memorymap.embeddings")

# Warm-up bookkeeping so the UI can tell "still loading" from "failed"
# (a silently failed load used to look like eternal "warming up…").
_warmup = {"running": False, "started": False, "error": False}


def start_warmup(service: "EmbeddingService", session_factory=None) -> None:  # noqa: ANN001
    """Load the embedding model in a background thread at startup, so the
    user's first save doesn't stall. Idempotent per process.

    The session factory is passed in rather than looked up. This module is
    imported by the dependency container, so reaching back into it would make
    the import cycle real instead of merely deferred.
    """
    if _warmup["started"]:
        return
    _warmup["started"] = True

    def run() -> None:
        _warmup["running"] = True
        _warmup["error"] = False
        try:
            service.embed_text("warm up")
        except Exception:
            _warmup["error"] = True
        finally:
            _warmup["running"] = False
            if _warmup["error"]:
                from memorymap.core import taskhistory
                taskhistory.record(
                    "embeddings",
                    "Loading embedding model",
                    "failed",
                    "Failed to load",
                )
        # Now that the model is up, catch any notes that missed out.
        if session_factory is not None and not _warmup["error"]:
            backfill_missing(service, session_factory)

    threading.Thread(target=run, name="embedding-warmup", daemon=True).start()


# How many gaps to close per startup. Bounded so a huge notebook doesn't spend
# minutes embedding on every launch; the next start picks up where this stopped.
BACKFILL_LIMIT = 200

# Enough to cover the repeated embeds within a single save, with headroom.
_EMBED_CACHE_MAX = 32


def backfill_missing(
    service: "EmbeddingService",
    session_factory,  # noqa: ANN001 — a callable returning a Session
    limit: int = BACKFILL_LIMIT,
) -> int:
    """Embed notes that have no vector, and report how many were fixed.

    Notes saved while the model was still warming up got no embedding, and
    nothing ever went back for them — so they stayed invisible to semantic
    search permanently, while looking perfectly normal in the list. The gap
    closes itself on the next start instead.

    Private notes are skipped, deliberately: store_for_entry refuses them, and
    a vector would leak what the note is about.
    """
    from sqlalchemy import select

    from memorymap.core.database import EmbeddingRecord, Entry

    if not service.is_ready():
        return 0
    fixed = 0
    try:
        session = session_factory()
    except Exception:  # noqa: BLE001 — startup helper, never fatal
        return 0
    try:
        missing = session.scalars(
            select(Entry)
            .outerjoin(EmbeddingRecord, EmbeddingRecord.entry_id == Entry.id)
            .where(
                Entry.is_deleted == False,  # noqa: E712
                Entry.is_private == False,  # noqa: E712
                EmbeddingRecord.id.is_(None),
            )
            .limit(limit)
        ).all()
        for entry in missing:
            if service.store_for_entry(session, entry):
                fixed += 1
        if fixed:
            session.commit()
            logging.getLogger("memorymap.embeddings").info(
                "backfilled %d note(s) that had no embedding", fixed
            )
    except Exception:  # noqa: BLE001 — a failed backfill must not stop startup
        session.rollback()
    finally:
        session.close()
    return fixed


def warmup_running() -> bool:
    return _warmup["running"]


def warmup_failed() -> bool:
    return _warmup["error"]


def clean_orphaned_vectors(session_factory=None) -> int:  # noqa: ANN001
    """Delete vectors whose note is gone, and say how many went.

    Nothing prunes the embeddings table when an entry is hard-deleted — the
    recycle bin's purge removes the row and leaves the vector behind — so it
    grows forever and every semantic search scans rows that can never match.

    This function is called by the background pass, and for a while it was
    *only* called: it did not exist, and the call sat inside a `try/except`
    broad enough to swallow the `AttributeError`, so the orphan cleanup was
    reported as running and silently never ran. Hence the return value and the
    log line — a maintenance job that cannot say what it did is a maintenance
    job nobody can tell is broken.
    """
    if session_factory is None:
        from memorymap.core import deps

        session_factory = deps.get_db().session

    with session_factory() as session:
        orphans = list(
            session.scalars(
                select(EmbeddingRecord).where(
                    EmbeddingRecord.entry_id.notin_(select(Entry.id))
                )
            )
        )
        for row in orphans:
            session.delete(row)
        if orphans:
            session.commit()

    if orphans:
        logger.info("removed %d embedding(s) whose note no longer exists", len(orphans))
    return len(orphans)


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


#: How many notes' vectors to compare against the rest at a time.
#:
#: "All pairs at once" is the obvious way to write this and the reason it is
#: not written that way: `vectors @ vectors.T` allocates an N×N float matrix,
#: and `np.triu` of it allocates a second. At 5,000 notes that is 400 MB for a
#: graph refresh, at 10,000 it is 1.6 GB, and the notebook this app is built
#: for is explicitly allowed to get that big (ANALYSIS.md §34 scale-tests it).
#: A row block at a time is the same arithmetic with a ceiling on the memory.
SIMILARITY_BLOCK = 512


def similar_pairs(
    vectors: dict[int, np.ndarray], threshold: float
) -> list[tuple[int, int, float]]:
    """Every pair of ids scoring at or above `threshold`, best first.

    Vectors of a width other than the majority's are dropped rather than
    stacked: a notebook part-way through an embedding-model change holds both
    widths at once, and `np.stack` on a ragged list raises — which took out the
    graph and the link suggestions entirely rather than degrading them.
    """
    if not vectors:
        return []

    by_width: dict[int, list[int]] = {}
    for node_id, vector in vectors.items():
        by_width.setdefault(vector.shape[0], []).append(node_id)
    # The width most of the notebook is on. Everything else is mid-reindex.
    widest = max(by_width, key=lambda w: len(by_width[w]))
    ids = sorted(by_width[widest])
    if len(ids) < 2:
        return []

    matrix = np.stack([vectors[node_id] for node_id in ids]).astype("float32")
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    matrix /= np.where(norms == 0, 1.0, norms)

    found: list[tuple[int, int, float]] = []
    for start in range(0, len(ids), SIMILARITY_BLOCK):
        block = matrix[start : start + SIMILARITY_BLOCK]
        scores = block @ matrix.T
        # Keep each pair once: only look to the right of the diagonal.
        rows, cols = np.where(scores >= threshold)
        for row, col in zip(rows, cols):
            left = start + int(row)
            right = int(col)
            if right <= left:
                continue
            found.append((ids[left], ids[right], float(scores[row, col])))

    found.sort(key=lambda pair: pair[2], reverse=True)
    return found


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
        # text -> vector, bounded and FIFO. See embed_text for why.
        self._embed_cache: dict[str, np.ndarray] = {}

    def clear_embed_cache(self) -> None:
        """Drop cached vectors — used when the embedding backend changes,
        since the same text then maps to a different vector."""
        self._embed_cache.clear()

    def reset_failure_state(self) -> None:
        """Forget a cached load/embed failure so the very next attempt
        retries immediately, and clear the stale error the Models screen
        shows. Called when the user switches search engine — they've
        usually just fixed whatever was wrong (e.g. a broken torch), and
        shouldn't have to wait out the 5-minute retry cooldown or stare at
        an out-of-date banner."""
        self.last_error = None
        self._load_failed_at = None

    def active_model(self) -> str:
        """The model actually doing the work right now, whichever backend."""
        if self._models.embedding_backend() == "ollama":
            return self._models.embedding_model()
        return DEFAULT_ST_MODEL

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
        """Vector for one text, or None if the backend is unavailable.

        Recent results are cached by exact text. Saving a note embeds it twice
        within milliseconds — once to store the vector, once by the
        near-duplicate check that runs straight afterwards — and embedding is
        the slowest part of a save. Keying on the exact string means a cached
        vector can never be stale: different text is simply a different key.
        """
        cached = self._embed_cache.get(text)
        if cached is not None:
            return cached
        vector = self._embed_uncached(text)
        if vector is not None:
            # Small and FIFO: this exists to collapse duplicate work inside one
            # request, not to be a general-purpose store.
            if len(self._embed_cache) >= _EMBED_CACHE_MAX:
                self._embed_cache.pop(next(iter(self._embed_cache)))
            self._embed_cache[text] = vector
        return vector

    def _embed_uncached(self, text: str) -> np.ndarray | None:
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


# `store_quietly` used to live here and is now `core.deps.store_quietly` — it
# needs the shared EmbeddingService, and reaching for that from inside this
# module means importing the container that imports this module. See the
# docstring there.
