"""Capture, read, edit, soft-delete, restore, and link entries.

Handlers are plain `def` (not async) on purpose: FastAPI then runs them
in a threadpool, which keeps the server responsive while blocking AI
calls run (plan §4).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete as sa_delete
from sqlalchemy.orm import Session

from memorymap.ai import janitor, librarian
from memorymap.ai.ollama_client import OllamaError
from memorymap.api.schemas import (
    AttachmentOut,
    ContextBody,
    EntryCreate,
    EntryOut,
    EntryUpdate,
    LinkOut,
    SimilarOut,
)
from memorymap.core import deps
from memorymap.core.database import EmbeddingRecord, EntryLink  # noqa: F401 (used in link_suggestions)
from memorymap.core.deps import get_session
from memorymap.entry import manager
from memorymap.search import search_manager

router = APIRouter(prefix="/entries", tags=["entries"])


def _preview(text: str, length: int = 60) -> str:
    return text if len(text) <= length else text[: length - 1] + "…"


def _to_out(
    session: Session,
    entry,  # noqa: ANN001
    filed_by: str | None = None,
    similar: SimilarOut | None = None,
) -> EntryOut:
    return EntryOut(
        id=entry.id,
        content=entry.content,
        category=manager.category_name_for(session, entry),
        tags=manager.entry_tags(entry),
        ai_confidence=entry.ai_confidence,
        access_count=entry.access_count,
        parent_id=entry.parent_id,
        pinned=entry.pinned,
        user_filed=entry.user_filed,
        created_at=entry.created_at,
        deleted_at=entry.deleted_at if entry.is_deleted else None,
        links=[
            LinkOut(link_id=link.id, entry_id=other.id, preview=_preview(other.content))
            for link, other in manager.links_for_entry(session, entry)
        ],
        attachments=[
            AttachmentOut(
                id=a.id,
                filename=a.filename,
                size=a.size,
                is_image=a.mime.startswith("image/"),
            )
            for a in manager.attachments_for(session, entry)
        ],
        filed_by=filed_by,
        similar=similar,
    )


def _find_near_duplicate(session: Session, entry) -> SimilarOut | None:  # noqa: ANN001
    """Warn about a saved note that says almost the same thing (Wave B).
    Purely informational — the save has already happened."""
    try:
        results = search_manager.semantic_search(
            session, entry.content, deps.get_embeddings(), limit=3
        )
    except Exception:
        return None
    for other, score in results or []:
        if other.id != entry.id and score >= 0.9:
            return SimilarOut(
                id=other.id, preview=_preview(other.content), similarity=round(score, 2)
            )
    return None


def _existing_entry(session: Session, entry_id: int):  # noqa: ANN202
    entry = manager.get_entry(session, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@router.post("", response_model=EntryOut, status_code=201)
def create_entry(body: EntryCreate, session: Session = Depends(get_session)) -> EntryOut:
    parent = None
    if body.parent_id is not None:
        parent = _existing_entry(session, body.parent_id)

    if body.category:
        # Guided mode: the user chose — the AI stays out of it entirely.
        category, confidence, filed_by = body.category, 100, "user"
    elif parent is not None:
        # Continuing a thread (Wave B): a train of thought stays in its
        # parent's category — predictable beats clever here.
        category = manager.category_name_for(session, parent)
        confidence, filed_by = 75, "thread"
    else:
        # Ask the janitor where this belongs. Whatever goes wrong in AI
        # land, the note still gets saved (plan §4).
        try:
            category, confidence, filed_by = janitor.categorise(
                session,
                body.content,
                deps.get_embeddings(),
                deps.get_model_manager(),
                deps.get_ollama(),
            )
        except Exception:
            category, confidence, filed_by = manager.UNCATEGORISED, 0, "none"

    entry = manager.create_entry(
        session,
        content=body.content,
        category_name=category,
        tags=body.tags,
        ai_confidence=confidence,
    )
    if parent is not None:
        entry.parent_id = parent.id
    if filed_by == "user":
        entry.user_filed = True
    session.commit()

    # Best effort: a failed embedding only means this entry is invisible
    # to semantic search until re-indexed — never a failed save.
    try:
        deps.get_embeddings().store_for_entry(session, entry)
    except Exception:
        pass

    return _to_out(
        session, entry, filed_by=filed_by, similar=_find_near_duplicate(session, entry)
    )


@router.post("/{entry_id}/context", response_model=EntryOut)
def add_context(
    entry_id: int, body: ContextBody, session: Session = Depends(get_session)
) -> EntryOut:
    """Append context to an existing note and let the janitor rethink the
    category with the fuller picture (Wave B). If the user filed this
    entry themselves, the category is left alone — their call stands."""
    entry = _existing_entry(session, entry_id)
    entry.content = f"{entry.content}\n\n--- added context ---\n{body.text.strip()}"
    manager.log_action(session, "edited", "entry", entry.id, "context added")
    session.commit()

    # The old vector describes the old text — refresh it, best effort.
    try:
        session.execute(
            sa_delete(EmbeddingRecord).where(EmbeddingRecord.entry_id == entry.id)
        )
        session.commit()
        deps.get_embeddings().store_for_entry(session, entry)
    except Exception:
        pass

    filed_by = None
    if not entry.user_filed:
        try:
            category, confidence, filed_by = janitor.categorise(
                session,
                entry.content,
                deps.get_embeddings(),
                deps.get_model_manager(),
                deps.get_ollama(),
                exclude_entry_id=entry.id,  # don't let it anchor to itself
            )
            if filed_by != "none":
                category_row = manager.get_or_create_category(session, category)
                if category_row.id != entry.category_id:
                    manager.log_action(
                        session, "edited", "entry", entry.id, f"recategorised -> {category}"
                    )
                entry.category_id = category_row.id
                entry.ai_confidence = confidence
                session.commit()
        except Exception:
            filed_by = None  # AI down — the note keeps its old category

    return _to_out(session, entry, filed_by=filed_by)


def _linked_entry_ids(session: Session, entry) -> set[int]:  # noqa: ANN001
    """Ids this note is already connected to — explicit links plus its
    thread parent/children — so re-evaluate never re-suggests them."""
    linked = {other.id for _link, other in manager.links_for_entry(session, entry)}
    if entry.parent_id is not None:
        linked.add(entry.parent_id)
    for child in manager.list_entries(session):
        if child.parent_id == entry.id:
            linked.add(child.id)
    return linked


@router.post("/{entry_id}/reevaluate")
def reevaluate_entry(entry_id: int, session: Session = Depends(get_session)) -> dict:
    """Re-run the AI on one note (Wave: re-evaluate). Refreshes its
    confidence — and its category, unless the user filed it themselves —
    and suggests tags and links for the user to apply. Tags and links are
    suggestion-only: nothing is tagged or linked without the user's click."""
    entry = _existing_entry(session, entry_id)

    # 1. Re-file: refresh confidence, and the category if the AI owns it.
    filed_by = None
    recategorised_to = None
    try:
        category, confidence, filed_by = janitor.categorise(
            session,
            entry.content,
            deps.get_embeddings(),
            deps.get_model_manager(),
            deps.get_ollama(),
            exclude_entry_id=entry.id,  # don't let the note anchor to itself
        )
        if filed_by != "none":
            entry.ai_confidence = confidence
            if not entry.user_filed:
                category_row = manager.get_or_create_category(session, category)
                if category_row.id != entry.category_id:
                    recategorised_to = category
                    manager.log_action(
                        session, "edited", "entry", entry.id, f"re-evaluated -> {category}"
                    )
                entry.category_id = category_row.id
            session.commit()
    except Exception:
        filed_by = None  # AI down — keep the note exactly as it was

    # 2. Suggest tags (best effort — never blocks the re-evaluation).
    suggested_tags: list[str] = []
    try:
        suggested_tags = librarian.suggest_tags(
            entry.content,
            manager.entry_tags(entry),
            deps.get_model_manager(),
            deps.get_ollama(),
        )
    except Exception:
        suggested_tags = []

    # 3. Suggest links: semantic neighbours that aren't connected yet.
    suggested_links: list[dict] = []
    try:
        already = _linked_entry_ids(session, entry)
        results = search_manager.semantic_search(
            session, entry.content, deps.get_embeddings(), limit=6
        )
        for other, score in results or []:
            if other.id == entry.id or other.id in already or score < 0.4:
                continue
            suggested_links.append(
                {"id": other.id, "preview": _preview(other.content), "similarity": round(score, 2)}
            )
            if len(suggested_links) >= 4:
                break
    except Exception:
        suggested_links = []

    return {
        "entry": _to_out(session, entry, filed_by=filed_by).model_dump(),
        "recategorised_to": recategorised_to,
        "suggested_tags": suggested_tags,
        "suggested_links": suggested_links,
    }


class ImproveBody(BaseModel):
    text: str
    mode: str = "proofread"  # proofread | rewrite | concise


@router.post("/improve")
def improve_writing(body: ImproveBody) -> dict:
    """Return an AI-polished version of some note text without saving it —
    the UI shows a before/after and the user decides (Wave N). Never
    touches the note itself; the AI is a servant, not a gatekeeper."""
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="There's no text to improve.")
    if not deps.get_ollama().is_running():
        raise HTTPException(
            status_code=503,
            detail="The AI isn't available right now (Ollama doesn't seem to be running).",
        )
    try:
        improved = librarian.improve_writing(
            text, body.mode, deps.get_model_manager(), deps.get_ollama()
        )
    except OllamaError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"original": text, "improved": improved, "mode": body.mode}


# Notes this similar are almost certainly worth connecting.
LINK_SUGGESTION_THRESHOLD = 0.55


@router.get("/link-suggestions")
def link_suggestions(session: Session = Depends(get_session)) -> list[dict]:
    """Pairs of notes that mean similar things but aren't linked yet —
    the auto-linker (Wave N). Suggestion-only: it never links anything on
    its own, it hands the pairs to the UI to approve. Empty when the
    embedding backend is unavailable (semantic search off)."""
    from sqlalchemy import select

    entries = manager.list_entries(session)
    already_linked: set[frozenset[int]] = set()
    for link in session.scalars(select(EntryLink)):
        already_linked.add(frozenset((link.source_entry_id, link.target_entry_id)))
    # Threads are already a connection — don't re-suggest parent/child.
    for entry in entries:
        if entry.parent_id is not None:
            already_linked.add(frozenset((entry.parent_id, entry.id)))

    suggestions: dict[frozenset[int], dict] = {}
    for entry in entries:
        try:
            results = search_manager.semantic_search(
                session, entry.content, deps.get_embeddings(), limit=4
            )
        except Exception:
            results = None
        if not results:
            continue
        for other, score in results:
            if other.id == entry.id or score < LINK_SUGGESTION_THRESHOLD:
                continue
            pair = frozenset((entry.id, other.id))
            if pair in already_linked or pair in suggestions:
                continue
            suggestions[pair] = {
                "source_id": entry.id,
                "target_id": other.id,
                "source_preview": _preview(entry.content),
                "target_preview": _preview(other.content),
                "similarity": round(score, 2),
            }
    ranked = sorted(suggestions.values(), key=lambda s: s["similarity"], reverse=True)
    return ranked[:12]


@router.get("/{entry_id}/related", response_model=list[EntryOut])
def related_entries(entry_id: int, session: Session = Depends(get_session)) -> list[EntryOut]:
    """Semantic neighbours of one entry ("see also", Wave B)."""
    entry = _existing_entry(session, entry_id)
    try:
        results = search_manager.semantic_search(
            session, entry.content, deps.get_embeddings(), limit=4
        )
    except Exception:
        results = None
    related = [
        other
        for other, score in (results or [])
        if other.id != entry.id and score >= 0.3
    ]
    return [_to_out(session, e) for e in related[:3]]


@router.get("", response_model=list[EntryOut])
def list_entries(
    deleted: bool = False, session: Session = Depends(get_session)
) -> list[EntryOut]:
    """Normal list, or the recycle bin when ?deleted=true."""
    if deleted:
        entries = manager.list_deleted_entries(session)
    else:
        entries = manager.list_entries(session)
    return [_to_out(session, e) for e in entries]


# Declared before /{entry_id} so "most-accessed" isn't parsed as an id.
@router.get("/most-accessed", response_model=list[EntryOut])
def most_accessed(session: Session = Depends(get_session)) -> list[EntryOut]:
    """Top entries by how often they've been opened or matched a
    question — the Phase 5 quick-access dashboard."""
    entries = manager.most_accessed_entries(session, limit=5)
    return [_to_out(session, e) for e in entries]


@router.get("/{entry_id}", response_model=EntryOut)
def get_entry(entry_id: int, session: Session = Depends(get_session)) -> EntryOut:
    entry = _existing_entry(session, entry_id)
    if entry.is_deleted:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry.access_count += 1  # opening an entry counts as using it
    session.commit()
    return _to_out(session, entry)


@router.put("/{entry_id}", response_model=EntryOut)
def update_entry(
    entry_id: int, body: EntryUpdate, session: Session = Depends(get_session)
) -> EntryOut:
    """Manual override: the user can correct anything the AI decided
    (plan §4 — the AI is a servant, not a gatekeeper)."""
    entry = _existing_entry(session, entry_id)
    content_changed = body.content is not None and body.content != entry.content
    manager.update_entry(
        session,
        entry,
        content=body.content,
        category_name=body.category,
        tags=body.tags,
    )
    if body.pinned is not None and body.pinned != entry.pinned:
        entry.pinned = body.pinned
        manager.log_action(
            session, "edited", "entry", entry.id, "pinned" if body.pinned else "unpinned"
        )
        session.commit()
    if content_changed:
        # The old vector describes the old text — refresh it, best effort.
        try:
            session.execute(
                sa_delete(EmbeddingRecord).where(EmbeddingRecord.entry_id == entry.id)
            )
            session.commit()
            deps.get_embeddings().store_for_entry(session, entry)
        except Exception:
            pass
    return _to_out(session, entry)


@router.delete("/{entry_id}", response_model=EntryOut)
def delete_entry(entry_id: int, session: Session = Depends(get_session)) -> EntryOut:
    """Soft delete → recycle bin. Restorable until purged."""
    entry = _existing_entry(session, entry_id)
    if not entry.is_deleted:
        manager.soft_delete_entry(session, entry)
    return _to_out(session, entry)


@router.post("/{entry_id}/restore", response_model=EntryOut)
def restore_entry(entry_id: int, session: Session = Depends(get_session)) -> EntryOut:
    entry = _existing_entry(session, entry_id)
    if entry.is_deleted:
        manager.restore_entry(session, entry)
    return _to_out(session, entry)


class LinkBody(BaseModel):
    target_id: int


@router.post("/{entry_id}/links", response_model=EntryOut)
def create_link(
    entry_id: int, body: LinkBody, session: Session = Depends(get_session)
) -> EntryOut:
    source = _existing_entry(session, entry_id)
    target = _existing_entry(session, body.target_id)
    link = manager.create_link(session, source, target)
    if link is None:
        raise HTTPException(
            status_code=400, detail="Already linked (or tried to link an entry to itself)"
        )
    return _to_out(session, source)


@router.delete("/{entry_id}/links/{link_id}", response_model=EntryOut)
def delete_link(
    entry_id: int, link_id: int, session: Session = Depends(get_session)
) -> EntryOut:
    entry = _existing_entry(session, entry_id)
    link = session.get(EntryLink, link_id)
    if link is None or entry.id not in (link.source_entry_id, link.target_entry_id):
        raise HTTPException(status_code=404, detail="Link not found")
    manager.delete_link(session, link)
    return _to_out(session, entry)
