"""The graph view's data (Wave E): every note and its connections in
one call, so the frontend can draw an Obsidian-style map.

Nodes are non-deleted entries; edges come from three places:
- manual links (the 🔗 button / link_notes tool),
- train-of-thought threads (parent_id, Wave B),
- optionally, semantic similarity between stored vectors (?similarity=true)
  — computed on demand from the embeddings we already have, never stored.
"""

from __future__ import annotations

import re
from itertools import combinations
import numpy as np

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.ai.embeddings import bytes_to_vector, cosine_similarity
from memorymap.core import deps
from memorymap.core.database import Category, EmbeddingRecord, Entry, EntryLink
from memorymap.core.deps import get_session
from memorymap.entry import manager, paths

router = APIRouter(tags=["graph"])

# Below this cosine similarity two notes aren't "about the same thing"
# enough to draw a line between them.
SIMILARITY_EDGE_THRESHOLD = 0.55
# A hard cap keeps a dense notebook from becoming a hairball (and the
# O(n²) comparison from mattering — it's personal-notebook scale).
MAX_SIMILARITY_EDGES = 200


# The inline markers the note editor supports, matched with their content so
# stripping keeps the words. Mirrors the frontend's notePreviewText — these
# labels are clipped to ~40 characters, and a clip that lands mid-`**` shows
# scaffolding ("**Seraphine…") instead of the note.
_INLINE_MD = re.compile(
    r"\*\*([^*\n]{1,500})\*\*|\*([^*\n]{1,500})\*|__([^_\n]{1,500})__"
    r"|_([^_\n]{1,500})_|~~([^~\n]{1,500})~~|`([^`\n]{1,500})`"
)
_HEADING_MD = re.compile(r"^\s{0,3}#{1,6}\s+", re.M)


def _preview(text: str, length: int = 40) -> str:
    """One line of a note as plain words — markers stripped, not rendered."""
    text = _HEADING_MD.sub("", text)
    text = re.sub(r"\[\[([^\[\]]{1,120})\]\]", r"\1", text)
    text = _INLINE_MD.sub(
        lambda m: next(g for g in m.groups() if g is not None), text
    )
    text = " ".join(text.split())
    return text if len(text) <= length else text[: length - 1] + "…"


def _similarity_edges(
    session: Session, node_ids: set[int], taken: set[frozenset[int]]
) -> list[dict]:
    """Pairwise cosine over stored vectors of the current backend.
    Pairs already joined by a real link/thread edge are skipped — the
    stronger relationship wins."""
    backend = deps.get_embeddings().backend_id()
    records = session.scalars(
        select(EmbeddingRecord).where(EmbeddingRecord.model_version == backend)
    )
    vectors = {
        r.entry_id: bytes_to_vector(r.embedding)
        for r in records
        if r.entry_id in node_ids
    }
    if not vectors:
        return []

    node_list = sorted(vectors)
    vec_matrix = np.array([vectors[n] for n in node_list])
    
    norms = np.linalg.norm(vec_matrix, axis=1, keepdims=True)
    vec_matrix = vec_matrix / np.where(norms == 0, 1e-10, norms)
    
    # Upper triangular matrix of dot products
    sim_matrix = np.triu(np.dot(vec_matrix, vec_matrix.T), k=1)
    
    # Find indices where similarity >= SIMILARITY_EDGE_THRESHOLD
    rows, cols = np.where(sim_matrix >= SIMILARITY_EDGE_THRESHOLD)
    
    scored = []
    for r, c in zip(rows, cols):
        a = node_list[r]
        b = node_list[c]
        if frozenset((a, b)) not in taken:
            score = float(sim_matrix[r, c])
            scored.append(
                {"source": a, "target": b, "kind": "similar", "score": round(score, 2)}
            )
            
    scored.sort(key=lambda e: e["score"], reverse=True)
    return scored[:MAX_SIMILARITY_EDGES]



@router.get("/graph")
def graph(similarity: bool = False, session: Session = Depends(get_session)) -> dict:
    entries = list(
        session.scalars(select(Entry).where(Entry.is_deleted == False))  # noqa: E712
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
            # "🔒 Private note — unlock to read it." while it is locked.
            "preview": _preview(manager.readable_content(e)),
            "category": category_names.get(e.category_id, manager.UNCATEGORISED),
            "access_count": e.access_count,
            "pinned": e.pinned,
            # A note's reply-to, so the tree layouts can nest a train of
            # thought under the note that started it instead of laying every
            # note out as a sibling (§9).
            "parent_id": e.parent_id if e.parent_id in node_ids else None,
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
                    }
                )

    for e in entries:
        if e.parent_id is not None and e.parent_id in node_ids:
            pair = frozenset((e.parent_id, e.id))
            if pair not in taken:
                taken.add(pair)
                edges.append({"source": e.parent_id, "target": e.id, "kind": "thread"})

    config = deps.get_config()
    if similarity and not config.get_preference("battery_efficient_mode"):
        edges.extend(_similarity_edges(session, node_ids, taken))

    index = paths.build(session, extra_edges=edges)
    centrality_scores = paths.pagerank(index)

    # Stable category order so the frontend assigns stable colours.
    categories = sorted({n["category"] for n in nodes})
    
    # Attach PageRank centrality to nodes for dynamic sizing
    for n in nodes:
        n["centrality"] = centrality_scores.get(n["id"], 0)
        
    return {"nodes": nodes, "edges": edges, "categories": categories}

@router.get("/graph/local/{entry_id}")
def graph_local(
    entry_id: int, 
    depth: int = 2, 
    similarity: bool = False,
    session: Session = Depends(get_session)
) -> dict:
    """Focus Mode API: Gets the local neighborhood up to N degrees."""
    config = deps.get_config()
    extra_edges = []
    
    entries = list(session.scalars(select(Entry).where(Entry.is_deleted == False)))
    node_ids = {e.id for e in entries}
    
    if similarity and not config.get_preference("battery_efficient_mode"):
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
        
    category_names = manager.bulk_category_names(session, [index.entries[n] for n in visited])
    nodes = [
        {
            "id": e_id,
            "preview": _preview(manager.readable_content(index.entries[e_id])),
            "category": category_names.get(index.entries[e_id].category_id, manager.UNCATEGORISED),
            "access_count": index.entries[e_id].access_count,
            "pinned": index.entries[e_id].pinned,
            "parent_id": index.entries[e_id].parent_id if index.entries[e_id].parent_id in visited else None,
        }
        for e_id in visited
    ]
    
    centrality_scores = paths.pagerank(index)
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
    source: int, target: int, session: Session = Depends(get_session)
) -> dict:
    """The chain of connections between two notes (§9).

    The one question a graph answers better than a list, and the one the view
    could not answer: *how are these two related?* Returns the notes in order
    with the reason for each step, or `found: false` and — this is the part
    that makes it usable — **why** there is no path, since "no" is only a
    useful answer when it says what to do about it.

    Deliberately a GET with two ids: it reads nothing but the notebook's own
    structure, so it is cacheable, linkable and safe to re-issue.
    """
    config = deps.get_config()
    similarity = not config.get_preference("battery_efficient_mode")
    extra_edges = []
    
    if similarity:
        entries = list(session.scalars(select(Entry).where(Entry.is_deleted == False)))
        node_ids = {e.id for e in entries}
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
