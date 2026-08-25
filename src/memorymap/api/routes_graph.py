"""The graph view's data: every note and its connections in
one call, so the frontend can draw an Obsidian-style map.

Nodes are non-deleted entries; edges come from three places:
- manual links (the link button / link_notes tool),
- train-of-thought threads (parent_id),
- optionally, semantic similarity between stored vectors (?similarity=true)
  — computed on demand from the embeddings we already have, never stored.
"""

from __future__ import annotations

import re
import threading

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from memorymap.ai.embeddings import bytes_to_vector, similar_pairs
from memorymap.core import deps
from memorymap.core.database import EmbeddingRecord, Entry, EntryLink
from memorymap.core.deps import get_session
from memorymap.entry import manager, paths

router = APIRouter(tags=["graph"])

# Below this cosine similarity two notes aren't "about the same thing"
# enough to draw a line between them.
SIMILARITY_EDGE_THRESHOLD = 0.55
# A hard cap keeps a dense notebook from becoming a hairball (and the
# O(n²) comparison from mattering — it's personal-notebook scale).
MAX_SIMILARITY_EDGES = 200


# --- caching the two expensive derivations (ROADMAP §40, items 4 and 5) ----------
#
# Similarity edges are an all-pairs vector comparison and PageRank is fifteen
# passes over every node and edge. Both were recomputed from scratch on every
# request, which made `/graph` the most expensive endpoint in the app and made
# `/graph/local` — "focus mode", which is supposed to be the *cheap* one — pay
# the full notebook cost to draw a neighbourhood.
#
# Neither can be made local. Centrality is a global property by definition, and
# a similarity edge can join two notes at opposite ends of the notebook, so
# restricting either to the visited set would return different, wrong numbers.
# What they can be is computed once per version of the notebook.
#
# The version is a fingerprint of cheap aggregates rather than a counter
# someone has to remember to bump — a counter is a thing to forget, and a
# forgotten one serves a stale graph indefinitely. `updated_at` moves on any
# note edit, and the two counts move on anything created or destroyed.
#
# The known gap, stated rather than papered over: adding and removing one link
# between two requests leaves the counts identical, so that single case serves
# one stale render. The alternative is a `max(updated_at)` on links too, and a
# stale centrality value for one frame is not worth another aggregate on every
# graph load.
_cache_lock = threading.Lock()
_cache: dict[str, tuple] = {}


def _graph_fingerprint(session: Session) -> tuple:
    live = Entry.is_deleted == False  # noqa: E712
    return (
        # Which notebook. The cache is process-global while the counts below
        # are emphatically not unique — two notebooks holding three notes each
        # collide trivially, and so do two tests. Without this, restoring a
        # backup or pointing MEMORYMAP_DATA_DIR somewhere else could be served
        # the previous notebook's centrality.
        str(deps.get_config().data_dir),
        session.scalar(select(func.count(Entry.id)).where(live)) or 0,
        session.scalar(select(func.max(Entry.updated_at)).where(live)),
        session.scalar(select(func.count(EntryLink.id))) or 0,
    )


def _cached(name: str, fingerprint: tuple, build):  # noqa: ANN001
    """`build()`'s result for this version of the notebook, computed once.

    One slot per name, not an LRU: only the current version is ever asked for,
    and keeping the previous one alive holds a whole graph's worth of floats
    for nobody.
    """
    with _cache_lock:
        hit = _cache.get(name)
        if hit is not None and hit[0] == fingerprint:
            return hit[1]
    value = build()
    with _cache_lock:
        _cache[name] = (fingerprint, value)
    return value


def reset_graph_cache() -> None:
    """Drop everything. For the tests, and for a data restore."""
    with _cache_lock:
        _cache.clear()


# Registered rather than imported by the container. `deps.reset_app_state`
# used to reach up into this module to call the line above, which is the wrong
# direction — `core/` is the bottom layer. This says "empty me when the
# singletons go" without `core` needing to know this file exists.
deps.register_cache_reset(reset_graph_cache)


_HEADING_MD = re.compile(r"^\s{0,3}#{1,6}\s+", re.M)
# A callout's own opening line — `> [!tip] Remember` — is a blockquote marker
# plus the `[!kind]` tag (editor.js's mdCalloutElement parses the same shape).
# Left unstripped, a note that opens with a callout showed as a graph node
# label reading literally "Review > [!tip] Remem…" — reported directly, and
# the fix is the callout equivalent of what _HEADING_MD already does for `#`.
_CALLOUT_MD = re.compile(r"^\s{0,3}>\s*\[!\w+\]\s*", re.M)


def _preview(text: str, length: int = 40) -> str:
    """One line of a note as plain words — markers stripped, not rendered.

    Mirrors the frontend's notePreviewText: these labels are clipped to ~40
    characters, and a clip that lands mid-`**` shows scaffolding
    ("**Seraphine…") instead of the note. Inline marker stripping is
    `manager.strip_inline_markdown` — heading/wiki-link handling stays here
    since those are specific to what a graph label is for.
    """
    text = _HEADING_MD.sub("", text)
    text = _CALLOUT_MD.sub("", text)
    text = re.sub(r"\[\[([^\[\]]{1,120})\]\]", r"\1", text)
    text = manager.strip_inline_markdown(text)
    text = " ".join(text.split())
    return text if len(text) <= length else text[: length - 1] + "…"


def _similarity_edges(
    session: Session, node_ids: set[int], taken: set[frozenset[int]]
) -> list[dict]:
    """Pairwise cosine over stored vectors of the current backend.

    Pairs already joined by a real link/thread edge are skipped — the stronger
    relationship wins.

    The comparison itself is cached per version of the notebook; only the
    `taken` filter and the cap are re-applied, because `taken` differs between
    callers (the full graph has already claimed its link and thread pairs;
    focus mode has not). The backend id is part of the key: vectors from two
    embedding models live in different spaces, so a model switch has to
    invalidate this even when no note changed.
    """
    backend = deps.get_embeddings().backend_id()
    fingerprint = (*_graph_fingerprint(session), backend)

    def build() -> list[tuple[int, int, float]]:
        records = session.scalars(
            select(EmbeddingRecord).where(EmbeddingRecord.model_version == backend)
        )
        vectors = {
            r.entry_id: bytes_to_vector(r.embedding)
            for r in records
            if r.entry_id in node_ids
        }
        return similar_pairs(vectors, SIMILARITY_EDGE_THRESHOLD)

    # Already sorted best-first, so the cap below keeps the strongest edges.
    scored = [
        {"source": a, "target": b, "kind": "similar", "score": round(score, 2)}
        for a, b, score in _cached("similarity", fingerprint, build)
        if frozenset((a, b)) not in taken
    ]
    return scored[:MAX_SIMILARITY_EDGES]


def _centrality(session: Session, index: paths.Connections, similarity: bool) -> dict:
    """PageRank over the whole graph, once per version of the notebook.

    `similarity` is in the key because similarity edges change the graph, so
    they change every node's rank — the same notebook scores differently with
    the edges on and off, and both answers are correct for their own picture.
    """
    fingerprint = (*_graph_fingerprint(session), similarity)
    return _cached("centrality", fingerprint, lambda: paths.pagerank(index))



@router.get("/graph")
def graph(
    similarity: bool = False,
    include_entities: bool = False,
    include_documents: bool = False,
    session: Session = Depends(get_session),
) -> dict:
    # A draft is unfinished by definition, and the Notes tab already keeps
    # every draft out of the notebook it draws from — the graph is a map of
    # your notes and their connections, not a staging area, and a half-typed
    # draft has nothing worth connecting yet. Reported directly alongside the
    # same gap in Library (routes_library.py's `_notes()`).
    entries = list(
        session.scalars(
            select(Entry).where(
                Entry.is_deleted == False,  # noqa: E712
                Entry.is_draft == False,  # noqa: E712
            )
        )
    )
    node_ids = {e.id for e in entries}
    category_names = manager.bulk_category_names(session, entries)
    nodes = [
        {
            "id": e.id,
            # Through the manager, never off the column: a private note's
            # `content` is ciphertext at rest, so `_preview(e.content)` labelled
            # it with a base64 blob. `readable_content` names the graph in its
            # own docstring as one of the places that must not break on a
            # private note — it decrypts while the vault is open and hands back
            # "Private note — unlock to read it." while it is locked.
            "preview": _preview(manager.readable_content(e)),
            "category": category_names.get(e.category_id, manager.UNCATEGORISED),
            "access_count": e.access_count,
            "pinned": e.pinned,
            # A note's reply-to, so the tree layouts can nest a train of
            # thought under the note that started it instead of laying every
            # note out as a sibling (§9).
            "parent_id": e.parent_id if e.parent_id in node_ids else None,
            # `+ "Z"` predates `core/database.DateTime`, which now always
            # hands back a timezone-AWARE (UTC) datetime — so `.isoformat()`
            # alone already ends in `+00:00`, and appending "Z" on top
            # produced `...+00:00Z`: two timezone markers in one string,
            # which `new Date(...)` in JavaScript cannot parse at all
            # (silently `Invalid Date`, not an error). Every node's
            # `created_at` on the graph was affected, which is why the time
            # filter slider could never move — the frontend's own bounds
            # calculation filters out unparseable dates, so `min` and `max`
            # always collapsed to `Date.now()` regardless of any note's
            # actual date, on every single note in the notebook, not a rare
            # case. `/entries`, `/timeline` and everywhere else serialise
            # through Pydantic directly and were never affected — this was
            # the graph's own two hand-built dicts.
            "created_at": e.created_at.isoformat(),
        }
        for e in entries
    ]

    edges: list[dict] = []
    taken: set[frozenset[int]] = set()  # pairs already connected

    for link in session.scalars(select(EntryLink)):
        if link.source_entry_id in node_ids and link.target_entry_id in node_ids:
            pair = frozenset((link.source_entry_id, link.target_entry_id))
            if pair not in taken:
                taken.add(pair)
                edges.append(
                    {
                        "source": link.source_entry_id,
                        "target": link.target_entry_id,
                        "kind": "link",
                        # The link row's own id — asked for directly (a way
                        # to manage a reason from the graph itself, not only
                        # a note card's link chip). Without it, editing or
                        # removing a link from here had no id to act on.
                        "id": link.id,
                        "reason": link.reason,
                        # Set only when `reason` was deduced from embedding
                        # similarity rather than said in words — see
                        # EntryLink.reason_confidence.
                        "reason_confidence": link.reason_confidence,
                        # What kind of connection, when one was chosen. Fed
                        # through the same channel the render-time `kind`
                        # above already uses rather than a second one: the
                        # graph has always invented a kind per edge, and a
                        # real stored type belongs beside it, not parallel
                        # to it. Null on every link made before link types
                        # existed, which reads as the flat "related" the
                        # graph has always shown.
                        "link_type": link.link_type,
                    }
                )

    for e in entries:
        if e.parent_id is not None and e.parent_id in node_ids:
            pair = frozenset((e.parent_id, e.id))
            if pair not in taken:
                taken.add(pair)
                edges.append({"source": e.parent_id, "target": e.id, "kind": "thread"})

    config = deps.get_config()
    with_similarity = similarity and not config.get_preference("battery_efficient_mode")
    if with_similarity:
        edges.extend(_similarity_edges(session, node_ids, taken))

    index = paths.build(session, extra_edges=edges, entries=entries)
    centrality_scores = _centrality(session, index, with_similarity)

    # Stable category order so the frontend assigns stable colours.
    categories = sorted({n["category"] for n in nodes})
    
    # Attach PageRank centrality to nodes for dynamic sizing
    for n in nodes:
        n["centrality"] = centrality_scores.get(n["id"], 0)

    # ROADMAP.md item 34 — off by default (the frontend has to ask for it),
    # since every existing consumer of this endpoint assumes every node id
    # is an Entry id. An entity node's id is prefixed ("entity:5") so it can
    # never collide with one; the frontend's own node-shape code is what
    # tells the two apart, not a numeric range.
    if include_entities:
        from memorymap.core.database import Entity, EntityMention

        mentions = list(
            session.execute(
                select(EntityMention.entity_id, EntityMention.entry_id).where(
                    EntityMention.entry_id.in_(node_ids)
                )
            )
        )
        entity_ids = {m.entity_id for m in mentions}
        if entity_ids:
            entities = {
                e.id: e for e in session.scalars(select(Entity).where(Entity.id.in_(entity_ids)))
            }
            for entity_id, entity in entities.items():
                nodes.append(
                    {
                        "id": f"entity:{entity_id}",
                        "type": "entity",
                        "preview": entity.name,
                        "category": "Entity",
                        "created_at": entity.created_at.isoformat(),
                    }
                )
            for mention in mentions:
                if mention.entity_id in entities:
                    edges.append(
                        {
                            "source": f"entity:{mention.entity_id}",
                            "target": mention.entry_id,
                            "kind": "entity",
                        }
                    )

    # Tier 2 item 16: "documents in the graph" — off by default, same reason
    # and same shape as include_entities just above (a document id is
    # prefixed so it can never collide with an Entry id, and every existing
    # consumer of this endpoint that assumes every node id is an Entry id
    # keeps working unasked). Edges come from DocumentLink, the many-to-many
    # note-document attachment table (§43/routes_documents.py) — a document
    # already has a real connection to the notes it draws on; this is that
    # relationship rendered, not a new one invented for the graph.
    #
    # Deliberately not wired into centrality, similarity, or the trace-path
    # BFS (paths.build/_centrality) this pass — both are built entirely
    # around Entry, and extending either to a second node type is a
    # materially bigger, separate change from making a document visible and
    # connected in the first place.
    if include_documents:
        from memorymap.core.database import Document, DocumentLink

        doc_links = list(
            session.execute(
                select(DocumentLink.document_id, DocumentLink.entry_id).where(
                    DocumentLink.entry_id.in_(node_ids)
                )
            )
        )
        document_ids = {link.document_id for link in doc_links}
        if document_ids:
            documents = {
                d.id: d
                for d in session.scalars(
                    select(Document).where(Document.id.in_(document_ids))
                )
            }
            for document_id, document in documents.items():
                nodes.append(
                    {
                        "id": f"document:{document_id}",
                        "type": "document",
                        "preview": document.title,
                        "category": "Document",
                        "created_at": document.created_at.isoformat(),
                    }
                )
            for link in doc_links:
                if link.document_id in documents:
                    edges.append(
                        {
                            "source": f"document:{link.document_id}",
                            "target": link.entry_id,
                            "kind": "document",
                        }
                    )

    return {"nodes": nodes, "edges": edges, "categories": categories}

@router.get("/graph/local/{entry_id}")
def graph_local(
    entry_id: int,
    # Unbounded before this: `?depth=999999999` ran the BFS loop below that
    # many times on a bare Python range() — no per-note work once the
    # frontier empties, but the loop itself still costs real wall-clock time
    # per iteration, and this server is single-worker (deps.py), so it stalls
    # every other request for however long that takes. 6 hops covers any
    # notebook a "local neighbourhood" view is meant for; Focus Mode never
    # asks for more than 2-3 today.
    depth: int = Query(default=2, ge=1, le=6),
    similarity: bool = False,
    session: Session = Depends(get_session)
) -> dict:
    """Focus Mode API: Gets the local neighborhood up to N degrees."""
    config = deps.get_config()
    extra_edges = []

    if similarity and not config.get_preference("battery_efficient_mode"):
        node_ids = set(
            session.scalars(
                select(Entry.id).where(Entry.is_deleted == False)  # noqa: E712
            )
        )
        extra_edges = _similarity_edges(session, node_ids, set())

    index = paths.build(session, extra_edges=extra_edges)

    if entry_id not in index.entries:
        return {"nodes": [], "edges": [], "categories": []}
        
    # BFS up to `depth`
    visited = {entry_id}
    queue = [entry_id]
    edges = []
    taken = set()
    
    for _ in range(depth):
        next_queue = []
        for n in queue:
            for neighbor, step in index.neighbours(n).items():
                pair = frozenset((n, neighbor))
                if pair not in taken:
                    taken.add(pair)
                    edges.append({
                        "source": n,
                        "target": neighbor,
                        "kind": step.kind
                    })
                if neighbor not in visited:
                    visited.add(neighbor)
                    next_queue.append(neighbor)
        queue = next_queue
        if not queue:
            break  # nothing left to expand — further iterations would be no-ops

    category_names = manager.bulk_category_names(session, [index.entries[n] for n in visited])
    nodes = [
        {
            "id": e_id,
            "preview": _preview(manager.readable_content(index.entries[e_id])),
            "category": category_names.get(index.entries[e_id].category_id, manager.UNCATEGORISED),
            "access_count": index.entries[e_id].access_count,
            "pinned": index.entries[e_id].pinned,
            "parent_id": index.entries[e_id].parent_id if index.entries[e_id].parent_id in visited else None,
            # See the other node-list above: `created_at` is already
            # timezone-aware (`core/database.DateTime` guarantees it), so
            # `+ "Z"` on top of `.isoformat()`'s own `+00:00` produced an
            # unparseable double-suffixed string in JavaScript.
            "created_at": index.entries[e_id].created_at.isoformat(),
        }
        for e_id in visited
    ]
    
    centrality_scores = _centrality(session, index, bool(extra_edges))
    for n in nodes:
        n["centrality"] = centrality_scores.get(n["id"], 0)
        
    categories = sorted({n["category"] for n in nodes})
    return {"nodes": nodes, "edges": edges, "categories": categories}


def _path_node(entry: Entry, category_names: dict[int | None, str]) -> dict:
    """One note on a path or in a structural list. The same shape the graph's
    nodes use, so the view can highlight by id without a second lookup, plus
    enough text to read a chain as a sentence when the graph is not on screen."""
    return {
        "id": entry.id,
        "preview": _preview(manager.readable_content(entry), 60),
        "category": category_names.get(entry.category_id, manager.UNCATEGORISED),
    }


@router.get("/graph/structure")
def graph_structure(session: Session = Depends(get_session)) -> dict:
    """The shape of the notebook: clusters, hubs and orphans (§9).

    One call, because all three come off the same index and the view wants them
    together — colouring by cluster and listing the orphans are the same
    question asked twice. `cluster_of` is what makes the colouring a lookup
    rather than a second traversal in JavaScript.
    """
    index = paths.build(session)
    category_names = manager.bulk_category_names(session, list(index.entries.values()))

    def category_of(entry: Entry) -> str:
        return category_names.get(entry.category_id, manager.UNCATEGORISED)

    groups = paths.clusters(index, category_of)
    cluster_of: dict[str, int] = {}
    for position, cluster in enumerate(groups):
        for note_id in cluster.ids:
            # String keys: this is JSON, where an object's keys are strings
            # whatever they started as, and a client reading `cluster_of[id]`
            # with a numeric id gets undefined. Being explicit here beats
            # discovering it in the browser.
            cluster_of[str(note_id)] = position

    loose = paths.orphans(index)
    return {
        "notes": len(index.entries),
        "connected": len(index.entries) - len(loose),
        "clusters": [
            {
                "size": len(cluster.ids),
                "core": _path_node(index.entries[cluster.core_id], category_names),
                "categories": cluster.categories[:3],
                "ids": cluster.ids,
            }
            for cluster in groups
            if len(cluster.ids) >= paths.MIN_CLUSTER_NOTES
        ],
        # Counted separately rather than listed: a notebook with thirty pairs
        # is a different shape from one with two big clusters, and that fact is
        # worth a number even though the pairs are not worth thirty rows.
        "small_clusters": sum(
            1 for cluster in groups if len(cluster.ids) < paths.MIN_CLUSTER_NOTES
        ),
        "cluster_of": cluster_of,
        "hubs": [
            {**_path_node(index.entries[note_id], category_names), "links": count}
            for note_id, count in paths.hubs(index)
        ],
        "orphans": [_path_node(index.entries[note_id], category_names) for note_id in loose[:20]],
        "orphan_count": len(loose),
        "hub_tags": index.hub_tags,
    }


@router.get("/graph/path")
def graph_path(
    source: int,
    target: int,
    similarity: bool = False,
    session: Session = Depends(get_session),
) -> dict:
    """The chain of connections between two notes (§9).

    The one question a graph answers better than a list, and the one the view
    could not answer: *how are these two related?* Returns the notes in order
    with the reason for each step, or `found: false` and — this is the part
    that makes it usable — **why** there is no path, since "no" is only a
    useful answer when it says what to do about it.

    Deliberately a GET with two ids: it reads nothing but the notebook's own
    structure, so it is cacheable, linkable and safe to re-issue.

    `similarity=true` additionally lets the chain hop along "these read alike"
    edges, which finds a route between notes nothing actually connects. It is
    opt-in and off by default for two reasons: it costs a full vector sweep of
    the notebook, which is not what "cacheable and safe to re-issue" above
    describes; and a path made of similarity edges answers a weaker question
    than the one asked — `SIMILAR_WEIGHT` makes them the last resort within a
    route, but a route made only of them is "these are both about cooking"
    dressed up as a connection the user made.
    """
    extra_edges = []
    if similarity and not deps.get_config().get_preference("battery_efficient_mode"):
        node_ids = set(
            session.scalars(
                select(Entry.id).where(Entry.is_deleted == False)  # noqa: E712
            )
        )
        extra_edges = _similarity_edges(session, node_ids, set())

    index = paths.build(session, extra_edges=extra_edges)
    missing = [
        note_id for note_id in (source, target) if note_id not in index.entries
    ]
    if missing:
        return {
            "found": False,
            "source": source,
            "target": target,
            "reason": (
                "That note isn't in the map — it may have been deleted."
                if len(missing) == 1
                else "Neither note is in the map."
            ),
        }
    if source == target:
        return {
            "found": False,
            "source": source,
            "target": target,
            "reason": "Those are the same note.",
        }

    chain = paths.find(index, source, target)
    if chain is None:
        ends = [
            (note_id, paths.degree(index, note_id)) for note_id in (source, target)
        ]
        lonely = [note_id for note_id, count in ends if count == 0]
        if lonely:
            reason = (
                "Neither note is connected to anything yet."
                if len(lonely) == 2
                else "One of these notes isn't connected to anything yet."
            )
        else:
            reason = (
                "They're both connected to other notes, but there's no route "
                f"between them within {paths.MAX_PATH_HOPS} steps."
            )
        if index.hub_tags:
            # Said plainly, because otherwise this reads as a wrong answer: the
            # two notes may well share a tag and still get "no path" back.
            listed = ", ".join("#" + tag for tag in index.hub_tags[:3])
            reason += (
                f" Tags on more than {paths.HUB_TAG_NOTES} notes ({listed}) are "
                "treated as filing rather than as a connection."
            )
        return {
            "found": False,
            "source": source,
            "target": target,
            "reason": reason,
        }

    order = [source] + [step.target for step in chain]
    category_names = manager.bulk_category_names(session, [index.entries[note_id] for note_id in order])

    return {
        "found": True,
        "source": source,
        "target": target,
        "hops": len(chain),
        "nodes": [_path_node(index.entries[note_id], category_names) for note_id in order],
        "steps": [
            {
                "source": step.source,
                "target": step.target,
                "kind": step.kind,
                "how": step.how,
            }
            for step in chain
        ],
    }
