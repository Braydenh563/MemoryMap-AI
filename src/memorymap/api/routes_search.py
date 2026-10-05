"""One search endpoint over the whole notebook (WORLD_CLASS_PLAN B3).

Every surface that searches had its own half of this: the Notes list filters
client-side by keyword, `/entries?semantic=true` ranks by cosine and returns
notes only, the Library filters its own arrays, and nothing at all looked
inside a document, a file's extracted text, a bookmark or a reminder. This is
the one call that answers "where did I write that", whatever it was written
in, and says why each answer is an answer.

Deliberately thin: the engine (`search/engine.py`) does the work and this
module turns a query string into its arguments and its `Hit`s into JSON. The
operators come off `search/query.py`, so `tag:`, `kind:`, `in:`, `before:`,
`after:`, `has:`, `is:`, `"quoted phrases"` and `-excluded` work here without
this file knowing any of them exist.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from memorymap.core.deps import get_session
from memorymap.search import engine
from memorymap.search import index as search_index

router = APIRouter(prefix="/search", tags=["search"])


class WarmBody(BaseModel):
    q: str = Field(default="", max_length=2000)


@router.post("/warm")
def warm(body: WarmBody, session: Session = Depends(get_session)) -> dict:
    """Speculative retrieval (WORLD_CLASS_PLAN H9): the Ask and chat boxes send
    their words on a typing pause, and the question's vector is made now, so
    Enter does not wait for the embedding model. `search_manager.warm`."""
    from memorymap.core import deps
    from memorymap.search import search_manager

    try:
        warmed = search_manager.warm(session, body.q.strip(), deps.get_embeddings())
    except Exception:  # noqa: BLE001  # a warm-up that fails costs the real search nothing
        warmed = False
    return {"warmed": warmed}

#: The most hits one call will return. A search box shows a page, not a
#: notebook; a caller that wants more is asking for a list, which
#: `/entries` already serves with its own paging.
MAX_LIMIT = 50


@router.get("")
def search(
    q: str = Query(default="", description="The query, operators included"),
    kind: str = Query(default="", description="Comma-separated kinds to search"),
    entry_id: int | None = Query(default=None, description="The note the person has open"),
    space: str = Query(default="", description="Limit to one space"),
    hybrid: bool = Query(default=True, description="False for keyword only"),
    limit: int = Query(default=20, ge=1, le=MAX_LIMIT),
    session: Session = Depends(get_session),
) -> dict:
    """Hits with their three scores and their explanation, best first.

    `{"hits": [...], "counts": {...}, "query": "..."}`. The counts are what
    the index holds per kind, so an empty result can say *why* it is empty:
    "nothing matched" and "nothing of that kind is indexed yet" are different
    answers and a bare empty list renders them identically, the same
    reasoning `/entries/tensions` states for its own status field.
    """
    kinds = [part.strip() for part in kind.split(",") if part.strip() in search_index.KINDS]
    ctx = {}
    if entry_id:
        ctx["entry_id"] = entry_id
    if space:
        ctx["space"] = space
    hits = engine.search(session, q, ctx=ctx or None, limit=limit, hybrid=hybrid, kinds=kinds or None)
    return {
        "query": q,
        "hits": [hit.as_dict() for hit in hits],
        "counts": engine.index_counts(session),
    }


@router.get("/stats")
def stats(session: Session = Depends(get_session)) -> dict:
    """What the engine has to work with: index rows per kind, vectors held,
    and the weights the ranking used. The Settings page and a session report
    both want this, and neither should have to guess at it."""
    return engine.stats(session)
