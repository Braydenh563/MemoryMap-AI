"""Tidy proposals: the librarian's list of categories worth folding or dropping.

WORLD_CLASS_PLAN section 17, row 2 (the original vision: "the AI tidies the
database over time: merges near-duplicate categories, removes empty ones,
respects manual changes"). Two kinds, both only *proposed*; nothing moves until
the person accepts, and the panel does that through the same merge and delete
calls (with their undo) it always had:

* **merge**: two categories whose notes are about the same things (the
  centroids of their notes' vectors at least `MERGE_SIMILARITY` alike, each
  with `MIN_NOTES` or more). The smaller folds into the larger; a tie folds
  the newer one.
* **remove**: a category with no notes that was made `EMPTY_DAYS` or more days
  ago.

Respecting manual changes, the part a notebook that tidies for you must get
right: a category the person made or renamed by hand is never the one folded
away or dropped (`remember_hand_name`), and "keep both" / "keep it" is
remembered (`decline`), so the same proposal is not made twice. Names that are
probably one name (Recipe and recipes) are left to the panel's look-alike row,
which already offers them without any vectors.

No model call: vectors only, from the search engine's matrix, so it costs a
few milliseconds and works with Atlas off.
"""

from __future__ import annotations

import re
from datetime import timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from memorymap.core.database import Category, Entry, utcnow
from memorymap.entry.manager import UNCATEGORISED

#: Centroid cosine at which two categories read as one. The filing path trusts
#: 0.60 to *file a note* (a single note against a whole category); two whole
#: categories being this alike is a much stronger claim, so it is higher.
MERGE_SIMILARITY = 0.80
#: A category of one note has no centroid worth the name.
MIN_NOTES = 2
#: Empty this long before a removal is proposed (the original note: "removes
#: empty ones"; the plan: empty for 30 days).
EMPTY_DAYS = 30
#: One page of proposals, a bound on the panel and the response.
MAX_PROPOSALS = 20
#: The two lists kept in preferences, each capped so the file cannot grow.
HAND_NAMED_KEY = "tidy_hand_named"
DECLINED_KEY = "tidy_declined"
_KEPT = 500


def look_alike_key(name: str) -> str:
    """The same key the panel's look-alike row uses (tag-manager.js
    `manageLookAlikeKey`): case, spaces, hyphens, underscores and dots set
    aside, a plural made singular. Kept in step by `tests/test_tidy_categories_17.py`."""
    key = re.sub(r"[\s_\-.]+", "", str(name).lower())
    if len(key) > 3 and key.endswith("ies"):
        key = key[:-3] + "y"
    elif len(key) > 3 and key.endswith("s") and not key.endswith("ss"):
        key = key[:-1]
    return key


def _list(config: Any, key: str) -> list[str]:
    value = config.get_preference(key, [])
    return [str(v) for v in value] if isinstance(value, list) else []


def _remember(config: Any, key: str, item: str) -> None:
    items = _list(config, key)
    if item in items:
        return
    items.append(item)
    config.set_preference(key, items[-_KEPT:])


def remember_hand_name(config: Any, name: str) -> None:
    """A category the person made or named by hand: never proposed away."""
    clean = str(name or "").strip().lower()
    if clean:
        _remember(config, HAND_NAMED_KEY, clean)


def _decline_key(kind: str, name: str, other: str | None) -> str:
    names = sorted(str(n or "").strip().lower() for n in ([name, other] if other else [name]))
    return f"{kind}:{'|'.join(names)}"


def decline(config: Any, kind: str, name: str, other: str | None = None) -> None:
    """"Keep both" (a merge, by the pair in either order) or "Keep it" (a
    removal, by name): remembered, so it is not proposed again."""
    _remember(config, DECLINED_KEY, _decline_key(kind, name, other))


def _categories(session: Session) -> list[dict]:
    """Every category with its live note count, oldest first."""
    rows = session.execute(
        select(Category.id, Category.name, Category.workspace_id, Category.created_at, func.count(Entry.id))
        .outerjoin(Entry, (Entry.category_id == Category.id) & (Entry.is_deleted == False))  # noqa: E712
        .group_by(Category.id)
        .order_by(Category.id)
    ).all()
    return [
        {"id": cid, "name": name, "space": space or "default", "made": made, "count": int(count or 0)}
        for cid, name, space, made, count in rows
        if name != UNCATEGORISED
    ]


def _centroids(session: Session, embeddings: Any) -> dict[str, Any]:
    """Unit-length centroid per category name (only categories with
    `MIN_NOTES` or more public, embedded notes), or nothing when there are no
    vectors yet."""
    from memorymap.ai import janitor

    labelled = janitor._labelled_vectors(session, embeddings)
    if labelled is None or not labelled.names:
        return {}
    import numpy as np

    out: dict[str, Any] = {}
    names = np.array(labelled.names)
    for name in sorted(set(labelled.names)):
        mask = (names == name) & ~labelled.private
        if int(mask.sum()) < MIN_NOTES:
            continue
        centroid = labelled.rows[mask].mean(axis=0).astype("float32")
        norm = float(np.linalg.norm(centroid))
        if norm > 0:
            out[name] = centroid / norm
    return out


def proposals(session: Session, embeddings: Any, config: Any) -> list[dict]:
    """The proposals now, most alike first, then removals, oldest first."""
    declined = set(_list(config, DECLINED_KEY))
    by_hand = set(_list(config, HAND_NAMED_KEY))
    cats = _categories(session)
    found: list[dict] = []

    try:
        centroids = _centroids(session, embeddings) if embeddings is not None else {}
    except Exception:  # noqa: BLE001 - no vectors (model off, matrix not built) means no merge proposals, never an error
        centroids = {}
    if centroids:
        import numpy as np

        counted = [c for c in cats if c["name"] in centroids]
        for i, a in enumerate(counted):
            for b in counted[i + 1:]:
                if a["space"] != b["space"] or look_alike_key(a["name"]) == look_alike_key(b["name"]):
                    continue
                similarity = float(np.dot(centroids[a["name"]], centroids[b["name"]]))
                if similarity < MERGE_SIMILARITY:
                    continue
                if _decline_key("merge", a["name"], b["name"]) in declined:
                    continue
                # The smaller folds into the larger; a tie folds the newer.
                source, target = sorted((a, b), key=lambda c: (c["count"], -c["id"]))[:2]
                if source["name"].strip().lower() in by_hand:
                    continue
                found.append(
                    {
                        "kind": "merge",
                        "from": {"id": source["id"], "name": source["name"], "count": source["count"]},
                        "into": {"id": target["id"], "name": target["name"], "count": target["count"]},
                        "similarity": round(similarity, 2),
                        "reason": f"Their notes are about the same things ({round(similarity * 100)}% alike).",
                    }
                )
    found.sort(key=lambda p: -p["similarity"])

    cutoff = utcnow() - timedelta(days=EMPTY_DAYS)
    removals = []
    for c in cats:
        if c["count"] or not c["made"] or c["made"] > cutoff:
            continue
        key = c["name"].strip().lower()
        if key in by_hand or _decline_key("remove", c["name"], None) in declined:
            continue
        days = (utcnow() - c["made"]).days
        removals.append(
            {
                "kind": "remove",
                "category": {"id": c["id"], "name": c["name"], "count": 0},
                "reason": f"Empty, and made {days} days ago.",
            }
        )
    return (found + removals)[:MAX_PROPOSALS]
