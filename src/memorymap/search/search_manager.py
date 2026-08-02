"""Find entries two ways.

- Keyword search: word-based and ranked — always works, even with zero AI.
- Semantic search: cosine similarity over stored vectors — needs an
  embedding backend.

`retrieve()` is what /chat uses: semantic when possible, keyword as the
fallback, so asking a question always returns *something* (plan §4).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, time

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from memorymap.ai.embeddings import (
    EmbeddingService,
    bytes_to_vector,
    cosine_similarity,
)
from memorymap.core.database import EmbeddingRecord, Entry
from memorymap.search import query as query_understanding


def _user_today(session: Session):
    """The user's own date, not the server's.

    A question about "yesterday" asked at 00:30 in one timezone is about a
    different day in another, and getting this wrong makes the filter look
    broken in exactly the cases where it matters most.
    """
    try:
        from memorymap.core import deps
        from memorymap.core.config import user_now

        return user_now(deps.get_config()).date()
    except Exception:  # noqa: BLE001 — a script or a test with no app state
        return datetime.now().date()

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


# --- fusing the two searches ---------------------------------------------------
#
# The old rule was either/or: semantic won outright, and keyword was only
# consulted when semantic came back empty. That loses in both directions, and
# each failure is one a person notices immediately.
#
# - A note containing the query **verbatim** loses to three notes that are
#   vaguely on topic, because 0.31 cosine beats 0.28 and the exact match was
#   never in the running. Searching for a phrase you know you wrote and not
#   getting it is the single most damaging thing a notebook search can do.
# - A misspelling, a synonym, or a question phrased differently from the note
#   ("how do I prove dough" vs "bread rising times") is exactly what semantic
#   search is *for*, and it was being discarded whenever the keyword branch
#   happened to fire first.
#
# Reciprocal rank fusion combines the two by **rank** rather than by score,
# which is what makes it robust here: a cosine similarity and a keyword tally
# are not on the same scale and never will be, so any weighted sum of the two
# needs a tuning constant per notebook. RRF needs none — it only asks "how near
# the top of each list did this note come?"
RRF_K = 10

# How deep each ranking is read before fusing. Deeper than the number returned,
# because the whole point is that a note ranked 8th by meaning and 3rd by words
# can beat one ranked 2nd by meaning and nowhere by words.
FUSION_DEPTH = 20


def _fuse(ranked_lists: list[list[Entry]], limit: int) -> list[Entry]:
    """Reciprocal rank fusion over several rankings of the same notes."""
    scores: dict[int, float] = {}
    seen: dict[int, Entry] = {}
    for ranking in ranked_lists:
        for position, entry in enumerate(ranking[:FUSION_DEPTH]):
            scores[entry.id] = scores.get(entry.id, 0.0) + 1.0 / (RRF_K + position + 1)
            seen.setdefault(entry.id, entry)
    order = sorted(scores, key=lambda note_id: (-scores[note_id], -note_id))
    return [seen[note_id] for note_id in order[:limit]]


# How many notes the graph is allowed to add to an answer's context, and how
# many of the top hits it walks out from.
#
# **This is what makes the app a memory *map* rather than a search box.** A
# question retrieves the notes that match it; the notes those *link to* are
# very often where the answer actually is — you wrote the question's subject in
# one note and the thing you need in the note you linked from it. That
# connection is the structure the whole app is built around, and until now no
# answer used it: only the agent could walk links, and only when it thought to.
#
# Deliberately small, and deliberately at the end of the list. These are
# context, not matches — they earned their place by being connected to
# something that matched, which is weaker evidence than matching. A large
# expansion would push real matches out of a budgeted prompt to make room for
# notes nobody searched for.
GRAPH_EXPANSION_SEEDS = 3
GRAPH_EXPANSION_LIMIT = 3


def graph_expansion(
    session: Session, matches: list[Entry], limit: int = GRAPH_EXPANSION_LIMIT
) -> list[Entry]:
    """Notes directly connected to the best matches, nearest first.

    Links and reply threads only — not shared tags. A tag is a filing label
    that can put fifty unrelated notes one hop apart, and the same reasoning
    that made `entry/paths.py` weight tag steps down applies with more force
    here: this list goes straight into a prompt, where a weak connection is
    indistinguishable from a strong one.
    """
    if not matches:
        return []
    from memorymap.core.database import EntryLink

    have = {entry.id for entry in matches}
    seeds = [entry.id for entry in matches[:GRAPH_EXPANSION_SEEDS]]
    neighbours: list[int] = []

    links = session.scalars(
        select(EntryLink).where(
            or_(
                EntryLink.source_entry_id.in_(seeds),
                EntryLink.target_entry_id.in_(seeds),
            )
        )
    )
    for link in links:
        for end in (link.source_entry_id, link.target_entry_id):
            if end not in have and end not in neighbours:
                neighbours.append(end)
    # Replies, both directions: a thread is one train of thought, so the note
    # that answers the match is as relevant as the one it answers.
    for entry in session.scalars(
        select(Entry).where(Entry.parent_id.in_(seeds), Entry.is_deleted == False)  # noqa: E712
    ):
        if entry.id not in have and entry.id not in neighbours:
            neighbours.append(entry.id)
    for entry in matches[:GRAPH_EXPANSION_SEEDS]:
        if entry.parent_id and entry.parent_id not in have:
            if entry.parent_id not in neighbours:
                neighbours.append(entry.parent_id)

    if not neighbours:
        return []
    found = list(
        session.scalars(
            select(Entry).where(
                Entry.id.in_(neighbours[: limit * 3]),
                Entry.is_deleted == False,  # noqa: E712
                Entry.is_private == False,  # noqa: E712
            )
        )
    )
    # Back into the order the walk found them, so the nearest neighbour of the
    # best match comes first rather than whatever the database returned.
    by_id = {entry.id: entry for entry in found}
    return [by_id[note_id] for note_id in neighbours if note_id in by_id][:limit]


def in_range(
    session: Session, since, until, limit: int = 25
) -> list[Entry]:
    """Every note written in a date range, newest first.

    The answer to a question that is *only* about time — "what did I save last
    week?" — where ranking by similarity would be ranking noise: there is no
    subject to be similar to.
    """
    clauses = [
        Entry.is_deleted == False,  # noqa: E712
        Entry.is_private == False,  # noqa: E712
    ]
    if since is not None:
        clauses.append(Entry.created_at >= datetime.combine(since, time.min))
    if until is not None:
        clauses.append(Entry.created_at <= datetime.combine(until, time.max))
    return list(
        session.scalars(
            select(Entry)
            .where(*clauses)
            .order_by(Entry.created_at.desc(), Entry.id.desc())
            .limit(limit)
        )
    )


def _within(entry: Entry, since, until) -> bool:
    """Was this note written in the range? Notes with no timestamp are kept —
    dropping a note because its date is missing would be filtering on an
    absence rather than on a fact."""
    written = getattr(entry, "created_at", None)
    if written is None:
        return True
    day = written.date() if hasattr(written, "date") else written
    if since is not None and day < since:
        return False
    if until is not None and day > until:
        return False
    return True


@dataclass
class Retrieval:
    """What a search found, and how — everything `retrieve` knows.

    A separate shape rather than a wider tuple because the *provenance* is the
    part that matters to the model: a note that arrived because it is linked to
    a match is context, and reporting it as a search hit is the same class of
    mistake as calling a shared tag a link. The two-value `retrieve()` below
    stays exactly as it was for everything that only wants the notes.
    """

    entries: list[Entry]
    mode: str
    #: Ids that came from the graph walk rather than from either search.
    connected_ids: set[int]
    #: The date range applied, and the phrase it came from, or None.
    since: object = None
    until: object = None
    when_phrase: str = ""


def retrieve_detailed(
    session: Session,
    query: str,
    embeddings: EmbeddingService,
    limit: int = 5,
    expand_graph: bool = True,
) -> Retrieval:
    """`retrieve`, with the provenance kept. See `Retrieval`."""
    found: dict = {}
    entries, mode = _retrieve(
        session, query, embeddings, limit, expand_graph, found
    )
    return Retrieval(
        entries=entries,
        mode=mode,
        connected_ids=found.get("connected", set()),
        since=found.get("since"),
        until=found.get("until"),
        when_phrase=found.get("when_phrase", ""),
    )


def retrieve(
    session: Session,
    query: str,
    embeddings: EmbeddingService,
    limit: int = 5,
    expand_graph: bool = True,
) -> tuple[list[Entry], str]:
    """Entries for a question + how they were found, so the UI can be honest.

    Modes: `hybrid` (both searches agreed on a ranking), `semantic`, `keyword`,
    `recent` (a broad question matched nothing specific, so the notebook must
    not look empty), `dated` (the question was about *when*), or `none`.

    `expand_graph` adds notes *connected* to the matches — see
    `graph_expansion`. On by default because it is the app's whole premise;
    switched off by callers that want the matches alone, such as a duplicate
    check, where a linked note is not a candidate for anything.

    `retrieve_detailed` above is the same search with the provenance kept.
    """
    return _retrieve(session, query, embeddings, limit, expand_graph, {})


def _retrieve(
    session: Session,
    query: str,
    embeddings: EmbeddingService,
    limit: int,
    expand_graph: bool,
    found: dict,
) -> tuple[list[Entry], str]:
    """The search itself. `found` is filled in with what happened, for
    `retrieve_detailed`; the plain caller passes a dict it throws away."""
    # What the question is actually asking. A time phrase becomes a filter
    # instead of search terms, and the question's scaffolding comes off before
    # anything is embedded — see `search/query.py` for why both matter.
    asked = query_understanding.understand(query, _user_today(session))
    found["since"] = asked.since
    found["until"] = asked.until
    found["when_phrase"] = asked.when_phrase
    found["connected"] = set()
    if asked.time_only:
        # Nothing but a date range: list it. Ranking by similarity here would
        # be ranking noise, and the honest answer to "what did I write last
        # week" is *the notes from last week*, in order.
        dated = in_range(session, asked.since, asked.until)
        if dated:
            return _without_private(dated)[: max(limit, 10)], "dated"
        # An empty week is a real answer, but an empty *list* looks like a
        # failure — fall through so the caller still gets recent notes.

    # Searching for the subject rather than the sentence. Falls back to the
    # whole question when stripping left nothing to search for.
    subject = asked.subject or query
    semantic = semantic_search(session, subject, embeddings, limit=FUSION_DEPTH)
    keyword = keyword_search(session, subject, limit=FUSION_DEPTH)

    # A range alongside a subject narrows the candidates before they are
    # ranked, so "the allotment, last week" cannot be answered with a note from
    # March that happens to be a better match.
    if asked.has_range:
        if semantic is not None:
            semantic = [
                (entry, score)
                for entry, score in semantic
                if _within(entry, asked.since, asked.until)
            ]
        keyword = [e for e in keyword if _within(e, asked.since, asked.until)]

    if semantic is None:
        # No embedding backend at all: keyword search is the whole of search,
        # not a fallback, and saying "keyword" is the honest label.
        entries, mode = keyword[:limit], "keyword"
    elif semantic and keyword:
        entries = _fuse([[entry for entry, _s in semantic], keyword], limit)
        mode = "hybrid"
    elif semantic:
        entries, mode = [entry for entry, _s in semantic][:limit], "semantic"
    else:
        entries, mode = keyword[:limit], "keyword"

    if not entries:
        recent = recent_entries(session, limit=RECENT_FALLBACK_LIMIT)
        if recent:
            return _without_private(recent), "recent"

    entries = _without_private(entries)
    if expand_graph and entries:
        # Appended, never interleaved: a connected note is context and a match
        # is an answer, and a prompt that has to drop something should drop the
        # context first. The order encodes that.
        for neighbour in graph_expansion(session, entries):
            if all(neighbour.id != entry.id for entry in entries):
                entries.append(neighbour)
                found["connected"].add(neighbour.id)

    # One final filter covering every mode. Private notes are also excluded by
    # the individual queries and have no embeddings to match on, but retrieval
    # feeds the AI's context — a single missed path would hand a private note
    # to the model, so it's checked once more here where every route converges.
    return _without_private(entries), mode


def _without_private(entries: list[Entry]) -> list[Entry]:
    return [entry for entry in entries if not getattr(entry, "is_private", False)]
