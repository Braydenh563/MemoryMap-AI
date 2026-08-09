"""Capture, read, edit, soft-delete, restore, and link entries.

Handlers are plain `def` (not async) on purpose: FastAPI then runs them
in a threadpool, which keeps the server responsive while blocking AI
calls run (plan §4).
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.ai import janitor, librarian
from memorymap.ai.ollama_client import OllamaError
from memorymap.api.schemas import (
    AttachmentOut,
    ContextBody,
    DocumentRefOut,
    EntryCreate,
    EntryDateOut,
    EntryOut,
    EntryUpdate,
    LinkOut,
    SimilarOut,
)
from memorymap.core import deps
from memorymap.core.database import (  # noqa: F401 (EntryLink used in link_suggestions)
    Document,
    EmbeddingRecord,
    EntryLink,
    EntryRevision,
)
from memorymap.core.deps import get_session
from memorymap.entry import manager
from memorymap.search import search_manager

router = APIRouter(prefix="/entries", tags=["entries"])


def _preview(text: str, length: int = 60) -> str:
    """A short, readable version of a note for link chips and lists.

    The [[link]] syntax is scaffolding rather than content, so a preview shows
    the words without the brackets — seeing "[[bread proving]]" on a link chip
    that already means "linked to bread proving" is just noise.
    """
    plain = manager.WIKI_LINK.sub(r"\1", text or "")
    return plain if len(plain) <= length else plain[: length - 1] + "…"


def _to_out(
    session: Session,
    entry,  # noqa: ANN001
    filed_by: str | None = None,
    similar: SimilarOut | None = None,
) -> EntryOut:
    # Decrypted here if private and the vault is open — every read of a
    # note's text goes through this one helper.
    content = manager.readable_content(entry)
    return EntryOut(
        id=entry.id,
        content=content,
        title=manager.extract_title(content),
        category=manager.category_name_for(session, entry),
        tags=manager.entry_tags(entry),
        ai_confidence=entry.ai_confidence,
        access_count=entry.access_count,
        parent_id=entry.parent_id,
        pinned=entry.pinned,
        user_filed=entry.user_filed,
        is_private=bool(getattr(entry, "is_private", False)),
        created_at=entry.created_at,
        deleted_at=entry.deleted_at if entry.is_deleted else None,
        dates=[
            EntryDateOut(phrase=d.phrase, at=d.at.date(), precision=d.precision)
            for d in manager.entry_dates(session, entry)
        ],
        documents=[
            DocumentRefOut(id=doc.id, title=doc.title)
            for doc in manager.documents_for_entry(session, entry)
        ],
        links=[
            LinkOut(
                link_id=link.id,
                entry_id=other.id,
                preview=_preview(manager.readable_content(other)),
                reason=link.reason,
                reason_confidence=link.reason_confidence,
            )
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
    # to semantic search until re-indexed — never a failed save. It is logged
    # rather than swallowed, so a backend that has stopped working shows up in
    # Settings → Logs instead of quietly shrinking search.
    deps.store_quietly(session, entry)

    # [[wiki links]] become real links. Best effort for the same reason: a
    # link that can't be resolved must never cost someone their note.
    try:
        manager.sync_wiki_links(session, entry)
        session.commit()
    except Exception:
        session.rollback()

    # Documents this note belongs with, attached as it is saved. A document
    # that has since been deleted is skipped rather than refused: the note is
    # the thing being saved, and losing it over a stale id would be absurd.
    for document_id in dict.fromkeys(body.document_ids):
        if session.get(Document, document_id) is not None:
            manager.link_document(session, document_id, entry.id)

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
    except Exception:  # noqa: BLE001 — never fail the edit over the index
        logging.getLogger("memorymap.embeddings").warning(
            "couldn't clear the stale vector for entry %s", entry.id, exc_info=True
        )
        session.rollback()
    else:
        deps.store_quietly(session, entry)

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
    mode: str = "proofread"  # proofread | rewrite | concise | custom
    # Only read when mode == "custom" — the user's own instruction, in their
    # own words, instead of picking from the three presets. Length-capped to
    # match the input's own maxlength; this is one line of steering, not a
    # second prompt.
    custom_instruction: str | None = Field(default=None, max_length=200)


@router.post("/improve")
def improve_writing(body: ImproveBody) -> dict:
    """Return an AI-polished version of some note text without saving it —
    the UI shows a before/after and the user decides (Wave N). Never
    touches the note itself; the AI is a servant, not a gatekeeper."""
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="There's no text to improve.")
    custom_instruction = (body.custom_instruction or "").strip()
    if body.mode == "custom" and not custom_instruction:
        raise HTTPException(
            status_code=400, detail="Say what you want changed, then try again."
        )
    if not deps.get_ollama().is_running():
        raise HTTPException(
            status_code=503,
            detail="The AI isn't available right now (Ollama doesn't seem to be running).",
        )
    try:
        improved = librarian.improve_writing(
            text,
            body.mode,
            deps.get_model_manager(),
            deps.get_ollama(),
            custom_instruction=custom_instruction,
        )
    except OllamaError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"original": text, "improved": improved, "mode": body.mode}


# Notes this similar are almost certainly worth connecting.
LINK_SUGGESTION_THRESHOLD = 0.55

#: How many concept matches `?semantic=true` returns. A search result is a
#: shortlist to read, not a second copy of the notebook.
SEMANTIC_LIST_LIMIT = 25


@router.get("/link-suggestions")
def link_suggestions(session: Session = Depends(get_session)) -> list[dict]:
    """Pairs of notes that mean similar things but aren't linked yet —
    the auto-linker (Wave N). Suggestion-only: it never links anything on
    its own, it hands the pairs to the UI to approve. Empty when the
    embedding backend is unavailable (semantic search off).

    Used to call `semantic_search` once *per entry* — a full embedding scan,
    for every entry, so O(entries) database round-trips each doing O(entries)
    work, and each one **re-embedding that entry's own content from scratch**
    on top of the scan. At any real notebook size that's the O(n^2) trap this
    file was checked for after §38.1's scale-test found two others: found by
    the same kind of sweep, not by profiling this one specifically, since a
    75k-note notebook running this by hand was not something worth actually
    waiting out. Rewritten to match `routes_graph._similarity_edges`'s
    already-correct shape — fetch every stored vector once, compare all
    pairs in memory — which turns O(n) queries plus O(n) re-embeddings into
    one query and zero re-embedding calls."""
    from memorymap.ai.embeddings import bytes_to_vector, similar_pairs

    entries = manager.list_entries(session)
    entries_by_id = {e.id: e for e in entries if not e.is_private}
    already_linked: set[frozenset[int]] = set()
    for link in session.scalars(select(EntryLink)):
        already_linked.add(frozenset((link.source_entry_id, link.target_entry_id)))
    # Threads are already a connection — don't re-suggest parent/child.
    for entry in entries:
        if entry.parent_id is not None:
            already_linked.add(frozenset((entry.parent_id, entry.id)))

    embeddings = deps.get_embeddings()
    if not embeddings.is_ready():
        return []
    records = session.execute(
        select(EmbeddingRecord.entry_id, EmbeddingRecord.embedding).where(
            EmbeddingRecord.model_version == embeddings.backend_id()
        )
    ).all()
    vectors = {eid: bytes_to_vector(blob) for eid, blob in records if eid in entries_by_id}

    # `similar_pairs` hands these back best-first and blocks the matrix
    # multiply, so a big notebook costs one block of memory rather than an
    # N×N matrix. Stop at 12 rather than scoring every pair into a list first.
    suggestions = []
    for a, b, score in similar_pairs(vectors, LINK_SUGGESTION_THRESHOLD):
        if frozenset((a, b)) in already_linked:
            continue
        suggestions.append({
            "source_id": a,
            "target_id": b,
            "source_preview": _preview(entries_by_id[a].content),
            "target_preview": _preview(entries_by_id[b].content),
            "similarity": round(score, 2),
            # Asked directly: a suggestion showed a bare percentage with no
            # sense of *why*, unlike an actual link (which gets a reason on
            # the graph edge and in Trace). `LINK_SUGGESTION_THRESHOLD`
            # equals `manager.AUTO_REASON_THRESHOLD` exactly, so every
            # suggestion here would clear the bar `create_link` uses to
            # deduce this same text — showing it before the link exists is
            # a preview of that outcome, not a separate guess.
            "reason": manager.AUTO_REASON_TEXT,
        })
        if len(suggestions) == 12:
            break
    return suggestions


@router.post("/links/backfill-reasons")
def backfill_link_reasons(session: Session = Depends(get_session)) -> dict:
    """"None of my notes have a linked reason yet — is there an easy way to
    give them all a reason?" There wasn't: `_deduce_reason` only ever ran at
    the moment a link was *made*, so every link from before that shipped, or
    made while the embedding backend was off, stays mute forever with
    nothing to revisit it. One pass over every reason-less link, same rule
    as a fresh one — a link that still can't be deduced is left alone rather
    than given a manufactured answer."""
    return manager.backfill_link_reasons(session)


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
    deleted: bool = False,
    semantic: bool = False,
    q: str = "",
    session: Session = Depends(get_session),
) -> list[EntryOut]:
    """Normal list, the recycle bin when ?deleted=true, or a concept search.

    `?semantic=true&q=…` is the one case the browser cannot do for itself: the
    notes list is filtered client-side by keyword, but cosine distance needs
    the vectors, which only live here.
    """
    if deleted:
        entries = manager.list_deleted_entries(session)
    else:
        entries = manager.list_entries(session)

    if semantic and q:
        from memorymap.core import deps

        # Ranked, and returned ranked. The first version rebuilt the result as
        # `[e for e in entries if e.id in found_ids]`, which is the *notebook's*
        # order — so the best match could land anywhere in the list and the
        # feature looked like it was picking notes at random.
        results = search_manager.semantic_search(
            session, q, deps.get_embeddings(), limit=SEMANTIC_LIST_LIMIT
        )
        if results is None:
            # No embedding backend ready. Saying so beats silently handing back
            # the entire notebook as though it were the search result — the
            # caller can fall back to its own keyword filter.
            raise HTTPException(
                status_code=503,
                detail="Semantic search isn't ready yet — the embedding model is still loading.",
            )
        # `semantic_search` already drops anything under MIN_SIMILARITY; a
        # second threshold here was a different number for the same job.
        allowed = {e.id for e in entries}
        return [_to_out(session, e) for e, _score in results if e.id in allowed]

    return [_to_out(session, e) for e in entries]


# Declared before /{entry_id} so "most-accessed" isn't parsed as an id.
@router.get("/most-accessed", response_model=list[EntryOut])
def most_accessed(session: Session = Depends(get_session)) -> list[EntryOut]:
    """Top entries by how often they've been opened or matched a
    question — the Phase 5 quick-access dashboard."""
    entries = manager.most_accessed_entries(session, limit=5)
    return [_to_out(session, e) for e in entries]


@router.get("/{entry_id}", response_model=EntryOut)
def get_entry(
    entry_id: int, deleted: bool = False, session: Session = Depends(get_session)
) -> EntryOut:
    """One entry. `?deleted=true` also reaches into the bin.

    The bin used to be a panel that listed every deleted note with its full
    text, so "read a binned note before deciding whether to restore it" came
    free. The Library shows a preview instead, which is right for a grid of
    mixed things and wrong as the *only* way to see a note you are about to
    delete for good — so the reader needs a way to fetch one binned note.

    Two things stay different from a live read, and both are deliberate:
    a deleted note is only reachable when the caller says so (a stale link to
    a binned note should still 404 rather than quietly resurrect it), and
    reading one does **not** count as using it. `access_count` feeds
    "most accessed", and a note in the bin climbing that list because you
    looked at it on the way to deleting it is the counter lying.
    """
    entry = _existing_entry(session, entry_id)
    if entry.is_deleted and not deleted:
        raise HTTPException(status_code=404, detail="Entry not found")
    if not entry.is_deleted:
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
    tags_changed = body.tags is not None and body.tags != manager.entry_tags(entry)
    # Snapshot BEFORE the change, so the newest revision is always the version
    # being replaced rather than the one replacing it.
    if content_changed or tags_changed:
        manager.record_revision(session, entry)
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
        except Exception:  # noqa: BLE001 — never fail the edit over the index
            logging.getLogger("memorymap.embeddings").warning(
                "couldn't clear the stale vector for entry %s", entry.id, exc_info=True
            )
            session.rollback()
        else:
            deps.store_quietly(session, entry)
        # Editing a note can introduce new [[links]]; resolve those too.
        try:
            manager.sync_wiki_links(session, entry)
            session.commit()
        except Exception:
            session.rollback()
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


@router.delete("/{entry_id}/purge")
def purge_entry(entry_id: int, session: Session = Depends(get_session)) -> dict:
    """Permanently delete ONE note from the recycle bin. Asked for directly.

    Emptying the whole bin was all-or-nothing, so getting rid of a single note
    for good meant destroying everything else in there too — which is why
    people leave the bin full instead, and then the bin is not a bin.

    **Only a binned note can be purged.** A note still in the notebook has to
    go through `DELETE /entries/{id}` first, so there is always the soft-delete
    step between an ordinary click and permanent loss. Enforced here rather
    than trusted to the UI: this is the one route in the app that destroys
    something with no undo.
    """
    entry = _existing_entry(session, entry_id)
    if not entry.is_deleted:
        raise HTTPException(
            status_code=400,
            detail="Only notes in the recycle bin can be permanently deleted",
        )
    removed = manager.purge_entries(
        session, [entry], uploads_dir=deps.get_config().uploads_dir
    )
    return {"purged": removed, "id": entry_id}


class LinkBody(BaseModel):
    target_id: int
    # Optional — "why are these connected?" A shared tag or a reply thread
    # says why on its own; a manual link often doesn't.
    reason: str | None = Field(default=None, max_length=200)


class LinkReasonBody(BaseModel):
    # None (or omitted/blank) clears the reason — this is also how a link
    # that got an auto-deduced reason it disagrees with is corrected back
    # to nothing, same as it would have started with.
    reason: str | None = Field(default=None, max_length=200)


class PrivacyBody(BaseModel):
    private: bool


@router.get("/{entry_id}/history")
def entry_history(entry_id: int, session: Session = Depends(get_session)) -> list[dict]:
    """Past versions of this note, newest first."""
    entry = _existing_entry(session, entry_id)
    return [
        {
            "id": revision.id,
            # Decrypted for display exactly like the note itself, so a private
            # note's history is readable while unlocked and not otherwise.
            "content": manager.readable_content(revision),
            "tags": json.loads(revision.tags or "[]"),
            "created_at": revision.created_at.isoformat(),
        }
        for revision in manager.revisions_for(session, entry)
    ]


@router.post("/{entry_id}/history/{revision_id}/restore", response_model=EntryOut)
def restore_revision(
    entry_id: int, revision_id: int, session: Session = Depends(get_session)
) -> EntryOut:
    """Put a past version back.

    Restoring is itself an edit, so the current text is saved first — undoing
    an undo has to work, or this is a trap rather than a safety net.
    """
    entry = _existing_entry(session, entry_id)
    revision = session.get(EntryRevision, revision_id)
    if revision is None or revision.entry_id != entry.id:
        raise HTTPException(status_code=404, detail="That version no longer exists")

    manager.record_revision(session, entry)
    entry.content = revision.content
    entry.tags = revision.tags
    manager.log_action(session, "edited", "entry", entry.id, "restored an earlier version")
    session.commit()
    session.refresh(entry)
    return _to_out(session, entry)


@router.post("/{entry_id}/privacy", response_model=EntryOut)
def set_entry_privacy(
    entry_id: int, body: PrivacyBody, session: Session = Depends(get_session)
) -> EntryOut:
    """Encrypt this note at rest, or decrypt it again.

    Needs the vault open, which means the app must be unlocked — the data key
    only exists in memory while it is.
    """
    entry = _existing_entry(session, entry_id)
    if not manager.set_private(session, entry, body.private):
        raise HTTPException(
            status_code=409,
            detail="Unlock the app first — the encryption key isn't loaded.",
        )
    session.commit()
    session.refresh(entry)
    return _to_out(session, entry)


@router.post("/{entry_id}/generate-title", response_model=EntryOut)
def generate_entry_title(
    entry_id: int, session: Session = Depends(get_session)
) -> EntryOut:
    """Write a title for this note with AI, on request.

    Recognising a title the user already wrote (`manager.extract_title`) is
    free; writing one is a real model call, so this is its own opt-in
    action rather than something that runs on every save. Replaces an
    existing title rather than stacking a second heading on top of it.
    """
    entry = _existing_entry(session, entry_id)
    # `readable_content` decrypts a private note for reading; writing that
    # decrypted text straight back to `entry.content` (below) would silently
    # replace the ciphertext with plaintext — the note would stop being
    # private as a side effect of titling it. Refused outright rather than
    # risked: unlike a plain edit, there's no form here the user reviewed
    # before it reached the server.
    if entry.is_private:
        raise HTTPException(
            status_code=400, detail="Make this note readable first — private notes can't be re-titled here."
        )
    content = manager.readable_content(entry)
    if not content.strip():
        raise HTTPException(status_code=400, detail="There's no text to title yet.")
    if not deps.get_ollama().is_running():
        raise HTTPException(
            status_code=503,
            detail="The AI isn't available right now (Ollama doesn't seem to be running).",
        )
    try:
        title = librarian.generate_title(content, deps.get_model_manager(), deps.get_ollama())
    except OllamaError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    if not title:
        raise HTTPException(status_code=502, detail="The AI didn't return a usable title.")

    manager.record_revision(session, entry)
    entry.content = manager.apply_title(content, title)
    manager.log_action(session, "edited", "entry", entry.id, f"generated title: {title}")
    session.commit()
    session.refresh(entry)
    return _to_out(session, entry)


@router.post("/{entry_id}/remove-title", response_model=EntryOut)
def remove_entry_title(entry_id: int, session: Session = Depends(get_session)) -> EntryOut:
    """Take a note's title back out — asked for directly. Just the leading
    heading line; a note with no title is returned unchanged rather than
    treated as an error, since the client only offers this action when
    `entry.title` is already set and a stale menu shouldn't 400."""
    entry = _existing_entry(session, entry_id)
    # Same reason as generate-title: writing decrypted text back to
    # `entry.content` would un-encrypt the note as a side effect.
    if entry.is_private:
        raise HTTPException(
            status_code=400, detail="Make this note readable first — private notes can't be edited here."
        )
    content = manager.readable_content(entry)
    stripped = manager.remove_title(content)
    if stripped != content:
        manager.record_revision(session, entry)
        entry.content = stripped
        manager.log_action(session, "edited", "entry", entry.id, "removed the title")
        session.commit()
        session.refresh(entry)
    return _to_out(session, entry)


@router.post("/{entry_id}/links", response_model=EntryOut)
def create_link(
    entry_id: int, body: LinkBody, session: Session = Depends(get_session)
) -> EntryOut:
    source = _existing_entry(session, entry_id)
    target = _existing_entry(session, body.target_id)
    link = manager.create_link(session, source, target, reason=body.reason)
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


@router.put("/{entry_id}/links/{link_id}/reason", response_model=EntryOut)
def update_link_reason(
    entry_id: int, link_id: int, body: LinkReasonBody, session: Session = Depends(get_session)
) -> EntryOut:
    """Add, edit, or clear a link's reason by hand — whether it started
    with none, one somebody typed, or one `create_link` deduced on its own.
    """
    entry = _existing_entry(session, entry_id)
    link = session.get(EntryLink, link_id)
    if link is None or entry.id not in (link.source_entry_id, link.target_entry_id):
        raise HTTPException(status_code=404, detail="Link not found")
    manager.set_link_reason(session, link, body.reason)
    return _to_out(session, entry)
