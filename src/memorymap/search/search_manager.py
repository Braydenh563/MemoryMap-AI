"""Find entries two ways.

- Keyword search: plain SQL LIKE — always works, even with zero AI.
- Semantic search: cosine similarity over stored vectors — needs an
  embedding backend.

`retrieve()` is what /chat uses: semantic when possible, keyword as the
fallback, so asking a question always returns *something* (plan §4).
"""

from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from memorymap.ai.embeddings import (
    EmbeddingService,
    bytes_to_vector,
    cosine_similarity,
)
from memorymap.core.database import EmbeddingRecord, Entry

# Below this cosine similarity a match is probably noise — hide it.
MIN_SIMILARITY = 0.25

# When nothing matches, hand the assistant this many recent entries so
# broad/overview questions ("what have I saved?") still get answered.
RECENT_FALLBACK_LIMIT = 10


def recent_entries(session: Session, limit: int = RECENT_FALLBACK_LIMIT) -> list[Entry]:
    """Most recent non-deleted, non-private entries, newest first."""
    return list(
        session.scalars(
            select(Entry)
            .where(
                Entry.is_deleted == False,  # noqa: E712
                Entry.is_private == False,  # noqa: E712
            )
            .order_by(Entry.created_at.desc(), Entry.id.desc())
            .limit(limit)
        )
    )


def keyword_search(session: Session, query: str, limit: int = 10) -> list[Entry]:
    like = f"%{query}%"
    return list(
        session.scalars(
            select(Entry)
            .where(
                Entry.is_deleted == False,  # noqa: E712
                Entry.is_private == False,  # noqa: E712
                or_(Entry.content.ilike(like), Entry.tags.ilike(like)),
            )
            .order_by(Entry.created_at.desc(), Entry.id.desc())
            .limit(limit)
        )
    )


def semantic_search(
    session: Session,
    query: str,
    embeddings: EmbeddingService,
    limit: int = 5,
) -> list[tuple[Entry, float]] | None:
    """Best-matching entries with scores, or None when embeddings are
    unavailable (caller should fall back to keyword search).

    The MVP compares against every stored vector in Python — fine for
    thousands of personal notes; revisit only if it ever feels slow."""
    query_vector = embeddings.embed_text(query)
    if query_vector is None:
        return None

    rows = session.execute(
        select(EmbeddingRecord, Entry)
        .join(Entry, EmbeddingRecord.entry_id == Entry.id)
        .where(
            Entry.is_deleted == False,  # noqa: E712
            # Vectors from other backends live in a different space —
            # comparing them would give nonsense (plan §6.5).
            EmbeddingRecord.model_version == embeddings.backend_id(),
        )
    ).all()

    scored = [
        (entry, cosine_similarity(query_vector, bytes_to_vector(record.embedding)))
        for record, entry in rows
    ]
    scored = [(entry, score) for entry, score in scored if score >= MIN_SIMILARITY]
    scored.sort(key=lambda pair: pair[1], reverse=True)
    return scored[:limit]


def retrieve(
    session: Session,
    query: str,
    embeddings: EmbeddingService,
    limit: int = 5,
) -> tuple[list[Entry], str]:
    """Entries for a question + which mode found them ('semantic',
    'keyword', or 'recent'), so the UI can be honest about how it looked.

    Broad questions like "what have I saved?" match nothing specific by
    meaning or keyword, so as a last resort we return the most recent
    entries — the notebook must never look empty when it isn't."""
    results = semantic_search(session, query, embeddings, limit=limit)
    if results is None:
        entries = keyword_search(session, query, limit=limit)
        mode = "keyword"
    elif not results:
        # Semantic found nothing above the noise floor — try literal
        # keyword matches before giving up.
        entries = keyword_search(session, query, limit=limit)
        mode = "keyword"
    else:
        entries = [entry for entry, _score in results]
        mode = "semantic"

    if not entries:
        recent = recent_entries(session, limit=RECENT_FALLBACK_LIMIT)
        if recent:
            return _without_private(recent), "recent"
    # One final filter covering every mode. Private notes are also excluded by
    # the individual queries and have no embeddings to match on, but retrieval
    # feeds the AI's context — a single missed path would hand a private note
    # to the model, so it's checked once more here where every route converges.
    return _without_private(entries), mode


def _without_private(entries: list[Entry]) -> list[Entry]:
    return [entry for entry in entries if not getattr(entry, "is_private", False)]
