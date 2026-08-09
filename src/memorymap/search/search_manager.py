"""Find entries two ways.

- Keyword search: word-based and ranked — always works, even with zero AI.
- Semantic search: cosine similarity over stored vectors — needs an
  embedding backend.

`retrieve()` is what /chat uses: semantic when possible, keyword as the
fallback, so asking a question always returns *something* (plan §4).
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import datetime, time

import numpy as np
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from memorymap.ai.embeddings import (
    EmbeddingService,
    bytes_to_vector,
)
from memorymap.core.database import EmbeddingRecord, Entry
from memorymap.search import query as query_understanding

logger = logging.getLogger("memorymap.search")


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

    The MVP compared against every stored vector *and joined in the full
    `Entry` for each one* in Python — this docstring used to say "revisit
    only if it ever feels slow", and ANALYSIS.md §34's scale-test found it
    does: materialising every entry as an ORM object just to score and throw
    most of them away was ~85% of one search's cost at 20k+ notes (~6.6s of
    a ~7.3s call at 50k). The vector scan itself is still brute-force — there
    is no index to avoid it — but scoring needs only `(entry_id, embedding)`
    tuples, not full mapped entities, so that part is now a plain column
    query and only the handful of notes that actually rank get a real
    `Entry` fetched."""
    query_vector = embeddings.embed_text(query)
    if query_vector is None:
        return None

    records = session.execute(
        select(EmbeddingRecord.entry_id, EmbeddingRecord.embedding).where(
            # Vectors from other backends live in a different space —
            # comparing them would give nonsense (plan §6.5).
            EmbeddingRecord.model_version
            == embeddings.backend_id()
        )
    ).all()

    if not records:
        return []

    query_norm = float(np.linalg.norm(query_vector))
    if query_norm == 0:
        return []

    # One matrix multiply instead of a Python loop of dot products — the scan
    # is still brute-force, but NumPy does it at memory speed.
    #
    # Only over the rows whose vector is the same width as the query, though.
    # `model_version` narrows this to one backend, and a backend is not a
    # dimension: swapping the embedding *model* inside the same backend (which
    # Settings → Embedding models offers as a button) leaves the old rows in
    # place at their old width. Stacking those into one array raises on the
    # ragged list and took the whole search down with it — every query
    # returning nothing, until a reindex that the error gave no hint to run.
    # Mismatched rows are skipped instead; they get their real scores back as
    # the reindex refills them.
    by_width: dict[int, list[tuple[int, np.ndarray]]] = {}
    for entry_id, blob in records:
        vector = bytes_to_vector(blob)
        by_width.setdefault(vector.shape[0], []).append((entry_id, vector))

    usable = by_width.get(query_vector.shape[0], [])
    if not usable:
        logger.warning(
            "no stored vectors match the query's %d dimensions (widths present: %s) "
            "— reindex to score these notes again",
            query_vector.shape[0],
            sorted(by_width),
        )
        return []
    if len(usable) < len(records):
        logger.info(
            "%d of %d vectors are a different width and were skipped — reindex to include them",
            len(records) - len(usable),
            len(records),
        )

    entry_ids = [entry_id for entry_id, _ in usable]
    vectors = np.stack([vector for _, vector in usable])

    norms = np.linalg.norm(vectors, axis=1)
    valid = norms > 0

    scores = np.zeros(len(vectors), dtype="float32")
    if np.any(valid):
        scores[valid] = np.dot(vectors[valid], query_vector) / (norms[valid] * query_norm)

    scored_ids = [
        (entry_ids[i], float(scores[i]))
        for i in range(len(entry_ids))
        if scores[i] >= MIN_SIMILARITY
    ]
    scored_ids.sort(key=lambda pair: pair[1], reverse=True)
    if not scored_ids:
        return []

    # A generous pool before the is_deleted filter below: a deleted note's
    # embedding can still be sitting in the table (nothing prunes it), and
    # over-fetching candidates is cheap next to under-returning matches.
    candidates = scored_ids[: max(limit * 4, 40)]
    entries_by_id = {
        e.id: e
        for e in session.scalars(
            select(Entry).where(
                Entry.id.in_([eid for eid, _ in candidates]),
                Entry.is_deleted == False,  # noqa: E712
            )
        )
    }
    result = [
        (entries_by_id[eid], score) for eid, score in candidates if eid in entries_by_id
    ]
    return result[:limit]


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
) -> tuple[list[Entry], dict[int, str]]:
    """Notes directly connected to the best matches, nearest first, plus
    *why* — a link's own reason, keyed by neighbour id, for the ones that
    have one. Only the one caller (`_retrieve`) reads the second half; it's
    what lets the "linked to a match" badge say what the link actually is
    instead of just that one exists (asked for directly: "does the reason
    in the links show in [connected results] as well?" — it didn't, this is
    that gap closed).

    Links and reply threads only — not shared tags. A tag is a filing label
    that can put fifty unrelated notes one hop apart, and the same reasoning
    that made `entry/paths.py` weight tag steps down applies with more force
    here: this list goes straight into a prompt, where a weak connection is
    indistinguishable from a strong one.
    """
    if not matches:
        return [], {}
    from memorymap.core.database import EntryLink

    have = {entry.id for entry in matches}
    seeds = [entry.id for entry in matches[:GRAPH_EXPANSION_SEEDS]]
    neighbours: list[int] = []
    reasons: dict[int, str] = {}

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
                if link.reason:
                    reasons[end] = link.reason
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
        return [], {}
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
    ordered = [by_id[note_id] for note_id in neighbours if note_id in by_id][:limit]
    return ordered, {e.id: reasons[e.id] for e in ordered if e.id in reasons}


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


def _written_at(entry: Entry):
    """When a note was written, for sorting. A note with no timestamp sorts
    oldest rather than crashing the comparison — the same choice `_within`
    makes when it keeps an undated note rather than filtering on an absence."""
    written = getattr(entry, "created_at", None)
    return written or datetime.min


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
    #: Why each entry is here, keyed by id — e.g. {"type": "semantic",
    #: "score": 0.81} or {"type": "keyword", "terms": ["gym"]}. Built from
    #: information `_rank`/`_fuse` would otherwise discard once they've
    #: collapsed two ranked lists into one ordered-by-relevance list of
    #: entries. Best-effort: an id with no entry here matched by whatever
    #: `mode` alone already says (`dated`, `recent`, `attached`, …).
    match_info: dict = None

    def __post_init__(self) -> None:
        if self.match_info is None:
            self.match_info = {}


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
        match_info=found.get("match_info", {}),
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


def _rank(
    semantic: list[tuple[Entry, float]] | None, keyword: list[Entry], limit: int
) -> tuple[list[Entry], str]:
    """Combine a semantic and a keyword result list into one ranked answer,
    with an honest label for how it was found. Factored out so the
    date-range fallback in `_retrieve` (searching again with the same two
    lists, minus the range) can reuse it instead of repeating the branch."""
    if semantic is None:
        # No embedding backend at all: keyword search is the whole of search,
        # not a fallback, and saying "keyword" is the honest label.
        return keyword[:limit], "keyword"
    if semantic and keyword:
        return _fuse([[entry for entry, _s in semantic], keyword], limit), "hybrid"
    if semantic:
        return [entry for entry, _s in semantic][:limit], "semantic"
    return keyword[:limit], "keyword"


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
    # Kept before the range narrows them below, so a subject match outside
    # the stated window is still reachable as a fallback (see "outside the
    # window you named" further down) without a second, identical search.
    semantic_any_time, keyword_any_time = semantic, keyword
    # Captured here, before range-filtering or `_rank`/`_fuse` collapse both
    # lists into one ordered-by-relevance list of entries and lose the
    # per-entry detail — a cosine score means something, a fused rank
    # position doesn't. Range-filtering only removes candidates, never
    # changes their score, so looking these up by id later stays correct
    # regardless of what the caller keeps or drops afterwards.
    sem_scores = {entry.id: score for entry, score in semantic} if semantic is not None else {}
    kw_terms = _meaningful_terms(subject)

    # A range alongside a subject narrows the candidates before they are
    # ranked, so "the allotment, last week" cannot be answered with a note from
    # March that happens to be a better match.
    #
    # **Except when the range is soft.** "Recently" is a lean, not a boundary —
    # see `Understood.soft` — and filtering on it is what made "jokes I have
    # saved recently" come back with a note about a gym routine: the two notes
    # tagged `jokes` were 16 and 30 days old, the fortnight window dropped both,
    # and the empty-handed fallback below listed whatever *was* in the window.
    # A soft range still sorts (newest first, below) and still labels; it does
    # not exclude.
    if asked.has_range and not asked.soft:
        if semantic is not None:
            semantic = [
                (entry, score)
                for entry, score in semantic
                if _within(entry, asked.since, asked.until)
            ]
        keyword = [e for e in keyword if _within(e, asked.since, asked.until)]
    elif asked.soft:
        # Recency as a tiebreak rather than a gate: of the notes that match the
        # subject, the newer ones come first, which is the whole of what the
        # word was asking for.
        keyword = sorted(keyword, key=_written_at, reverse=True)
        if semantic is not None:
            semantic = sorted(semantic, key=lambda pair: _written_at(pair[0]), reverse=True)

    entries, mode = _rank(semantic, keyword, limit)

    if not entries:
        # Nothing matched. The "never look empty" fallback is recent notes —
        # but **not when the question named a date range.** "What did I write
        # about the allotment last week", with nothing about the allotment that
        # week, would otherwise come back with unrelated notes from any time at
        # all, labelled `recent`, silently dropping the one constraint the
        # person actually stated. Answering the wrong question confidently is
        # worse than answering none.
        #
        # So a dated question that finds nothing falls back *within its range*,
        # and if the range is genuinely empty it returns nothing and says
        # `dated` — which is a true answer the caller can render as "nothing
        # that week".
        #
        # **Only when the question was about time alone.** With a subject, this
        # fallback drops the more specific of the two constraints and hands
        # back every note in the window — which is how "jokes I have saved
        # recently" was answered with a gym routine. Listing the window is a
        # true answer to "what did I write last week"; presented as the answer
        # to "which jokes", it is a confident answer to a question nobody
        # asked, and the person has no way to tell it apart from a real hit.
        # Nothing, labelled `dated`, is the honest reply, and the caller
        # renders it as "nothing about that in this window".
        if asked.has_range and not asked.subject:
            in_window = in_range(session, asked.since, asked.until, limit=limit)
            return _without_private(in_window), "dated"
        if asked.has_range:
            # A subject was named and nothing matched it *inside* the
            # window — reported directly: a note tagged joke/jokes/funny,
            # asked about as "two weeks ago", was actually written three
            # weeks ago, and came back empty rather than found-but-
            # mislabelled. This is not the fallback rejected above: that one
            # dropped the *subject* and kept the date ("jokes... recently"
            # answered with a gym routine); this drops the date and keeps
            # the subject, so it can never return something unrelated to
            # what was asked for — only the same match, outside the window
            # the person's memory of *when* turned out to be wrong about.
            #
            # **Bounded, not unbounded** — widened by the window's own span
            # rather than searched across the whole notebook. Without a
            # bound this reintroduces the *other* shape of the rejected
            # fallback: "the allotment, last week" must still answer nothing
            # when the only allotment note is three months old, the same
            # test that pins the fallback above pins this one too (a
            # subject match 90 days from a 7-day window is not "the person's
            # memory was a little off", it's a different note weighing in
            # on a question it wasn't asked). "Two weeks" that was actually
            # three is one window-span away; that's the case this catches.
            since_wide = asked.since - (asked.until - asked.since) if asked.since and asked.until else asked.since
            until_wide = asked.until + (asked.until - asked.since) if asked.since and asked.until else asked.until
            outside, _mode = _rank(
                [(e, s) for e, s in semantic_any_time if _within(e, since_wide, until_wide)]
                if semantic_any_time is not None
                else None,
                [e for e in keyword_any_time if _within(e, since_wide, until_wide)],
                limit,
            )
            if outside:
                return _without_private(outside), "outside_range"
            return [], "dated"
        recent = recent_entries(session, limit=RECENT_FALLBACK_LIMIT)
        if recent:
            return _without_private(recent), "recent"

    entries = _without_private(entries)
    # Why each of these is here — built before graph expansion appends any
    # connected notes, so "connected" always wins over an incidental keyword
    # overlap for those (a neighbour that also happens to share a word with
    # the question is still here *because it's linked*, not because it
    # matched).
    match_info = {}
    for entry in entries:
        content = (entry.content or "").lower()
        matched_terms = [t for t in kw_terms if t in content]
        if entry.id in sem_scores and matched_terms:
            match_info[entry.id] = {
                "type": "hybrid",
                "score": round(sem_scores[entry.id], 2),
                "terms": matched_terms,
            }
        elif entry.id in sem_scores:
            match_info[entry.id] = {"type": "semantic", "score": round(sem_scores[entry.id], 2)}
        elif matched_terms:
            match_info[entry.id] = {"type": "keyword", "terms": matched_terms}
    if expand_graph and entries:
        # Appended, never interleaved: a connected note is context and a match
        # is an answer, and a prompt that has to drop something should drop the
        # context first. The order encodes that.
        neighbours, neighbour_reasons = graph_expansion(session, entries)
        for neighbour in neighbours:
            if all(neighbour.id != entry.id for entry in entries):
                entries.append(neighbour)
                found["connected"].add(neighbour.id)
                info = {"type": "connected"}
                if neighbour.id in neighbour_reasons:
                    info["reason"] = neighbour_reasons[neighbour.id]
                match_info[neighbour.id] = info
    found["match_info"] = match_info

    # One final filter covering every mode. Private notes are also excluded by
    # the individual queries and have no embeddings to match on, but retrieval
    # feeds the AI's context — a single missed path would hand a private note
    # to the model, so it's checked once more here where every route converges.
    return _without_private(entries), mode


def _without_private(entries: list[Entry]) -> list[Entry]:
    return [entry for entry in entries if not getattr(entry, "is_private", False)]
