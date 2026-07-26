"""Find entries two ways.

- Keyword search: word-based and ranked — always works, even with zero AI.
- Semantic search: cosine similarity over stored vectors — needs an
  embedding backend.

`retrieve()` is what /chat uses: semantic when possible, keyword as the
fallback, so asking a question always returns *something* (plan §4).
"""

from __future__ import annotations

import re

from sqlalchemy import and_, or_, select
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
    """Find entries by words, best match first.

    This used to be one `LIKE %query%`, which meant the query had to appear as
    a contiguous substring: "proving bread" found nothing even when notes
    contained both words, because the order didn't match. Word order is not
    something anyone should have to guess.

    Now every word must appear somewhere (content or tags), in any order, and
    results are ranked rather than just listed newest-first. When no note has
    all the words, it falls back to notes with *some* of them — a partial
    answer beats an empty page.

    This matters most with no AI running: keyword search is then the whole of
    search, not a fallback.
    """
    terms = _meaningful_terms(query)
    if not terms:
        # Nothing to match on — a question made entirely of common words
        # ("what have I saved so far?") isn't a keyword search at all, and
        # saying so lets the caller fall through to recent notes instead.
        return []

    base = (
        Entry.is_deleted == False,  # noqa: E712
        Entry.is_private == False,  # noqa: E712
    )

    def matching(require_all: bool) -> list[Entry]:
        clauses = [
            or_(Entry.content.ilike(f"%{t}%"), Entry.tags.ilike(f"%{t}%")) for t in terms
        ]
        combined = and_(*clauses) if require_all else or_(*clauses)
        return list(
            session.scalars(
                # Over-fetch so ranking has something to choose between; the
                # cut to `limit` happens after scoring, not before it.
                select(Entry).where(*base, combined).limit(max(limit * 5, 50))
            )
        )

    rows = matching(require_all=True) or matching(require_all=False)
    rows.sort(key=lambda e: (-_keyword_score(e, terms), -e.id))
    return rows[:limit]


# Words that carry no signal in a search. Matching on them is worse than
# useless: "%a%" matches nearly every note ever written, so a broad question
# would return the whole notebook ranked by noise.
_STOPWORDS = frozenset(
    """a an and are as at be been but by can did do does for from had has have
    how i if in into is it its me my of on or our so than that the their them
    then there these they this to was we were what when where which who why
    will with would you your""".split()
)


def _meaningful_terms(query: str) -> list[str]:
    """Search words worth matching on, in order.

    Single characters and stopwords are dropped. If that leaves nothing, the
    caller gets an empty list rather than a match against everything.
    """
    words = [w for w in re.split(r"\W+", (query or "").lower()) if w]
    kept = [w for w in words if len(w) > 1 and w not in _STOPWORDS]
    # An all-stopword query ("how do I") has no keywords in it; don't invent
    # some by falling back to the raw words.
    return kept


def _keyword_score(entry: Entry, terms: list[str]) -> int:
    """How well one entry answers this query. Higher is better.

    The weights encode what a person means by "best match": the exact phrase
    beats scattered words, a tag beats a passing mention in the body (you
    chose the tag deliberately), and the title-ish opening of a note beats
    something buried at the end.
    """
    content = (entry.content or "").lower()
    tags = (entry.tags or "").lower()
    opening = content[:80]

    score = 0
    # Compare phrases with punctuation stripped from BOTH sides, so
    # "bread, proving!" ranks exactly like "bread proving" — the reader meant
    # the same thing, and the comma shouldn't reorder their results.
    phrase = " ".join(terms)
    if phrase and phrase in re.sub(r"\W+", " ", content):
        score += 25  # the whole query, in order
    for term in terms:
        if term in tags:
            score += 8
        if term in opening:
            score += 4
        if term in content:
            score += 2 + min(content.count(term) - 1, 3)  # a little for repeats
    return score


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
