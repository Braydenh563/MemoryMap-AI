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

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.ai.embeddings import bytes_to_vector, cosine_similarity
from memorymap.core import deps
from memorymap.core.database import EmbeddingRecord, Entry, EntryLink
from memorymap.core.deps import get_session
from memorymap.entry import manager

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
    scored = []
    for a, b in combinations(sorted(vectors), 2):
        if frozenset((a, b)) in taken:
            continue
        score = cosine_similarity(vectors[a], vectors[b])
        if score >= SIMILARITY_EDGE_THRESHOLD:
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
    nodes = [
        {
            "id": e.id,
            "preview": _preview(e.content),
            "category": manager.category_name_for(session, e),
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

    if similarity:
        edges.extend(_similarity_edges(session, node_ids, taken))

    # Stable category order so the frontend assigns stable colours.
    categories = sorted({n["category"] for n in nodes})
    return {"nodes": nodes, "edges": edges, "categories": categories}
