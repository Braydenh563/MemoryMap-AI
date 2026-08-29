"""Long-form documents (the editor tab): CRUD, export, and AI editing.

Documents are markdown, stored whole. They're deliberately not Entries — see
the model docstring — so they never appear in note search, the graph, or the
AI's retrieved context unless the user asks for them by name.
"""

from __future__ import annotations

import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.ai import drafter
from memorymap.core import deps
from memorymap.core.database import Document, DocumentAiEdit, utcnow
from memorymap.core.deps import get_session
from memorymap.entry.manager import (
    entries_for_document,
    get_entry,
    link_document,
    log_action,
    unlink_document,
)

router = APIRouter(prefix="/documents", tags=["documents"])

# A generous cap: this is long-form writing, but an unbounded column is how a
# runaway paste takes the database with it.
MAX_CONTENT = 500_000

#: The AI-edit changelog (DocumentAiEdit) is a per-document log, not a
#: process-lifetime ring buffer like taskhistory.py's — it has to survive a
#: restart — but it still needs a ceiling, or a document rewritten by the AI
#: hundreds of times over its life would keep every full before/after
#: snapshot forever. Oldest entries are pruned past this on each new write.
MAX_AI_EDIT_LOG_PER_DOCUMENT = 20
#: How much of the targeted passage a changelog entry shows — enough to say
#: what it touched, not the whole thing (that's what reverting is for).
SELECTION_EXCERPT_CHARS = 160


class DocumentBody(BaseModel):
    title: str = Field(default="Untitled", min_length=1, max_length=200)
    content: str = Field(default="", max_length=MAX_CONTENT)


class DocumentPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, max_length=MAX_CONTENT)


class AiEditBody(BaseModel):
    """Ask the AI to rewrite, write, or remove — the document editor's AI
    panel reskinned from a single rewrite action into a small general
    assistant, asked for directly. `verb` picks which of the three the
    instruction is asking for; `instruction` is validated against it below
    rather than at the field level, since "remove this" needs no words at
    all when a selection already says what to remove.
    """

    instruction: str = Field(default="", max_length=500)
    # When set: "edit"/"remove" rewrite or strip from just this passage;
    # "write" inserts new text directly after it. Empty means "the whole
    # document" for edit/remove, or "at the end" for write.
    selection: str = Field(default="", max_length=MAX_CONTENT)
    #: "edit" (default, unchanged): rewrite the target to the instruction.
    #: "write": generate a new passage and insert it — the target is
    #: context, not something to overwrite. "remove": delete what the
    #: instruction (or the selection alone) describes, leaving everything
    #: else exactly as written.
    verb: Literal["edit", "write", "remove"] = "edit"


def _summary(document: Document) -> dict:
    return {
        "id": document.id,
        "title": document.title,
        "updated_at": document.updated_at.isoformat(),
        "words": len(document.content.split()),
    }


def _full(document: Document, session: Session | None = None) -> dict:
    body = {**_summary(document), "content": document.content}
    if session is not None:
        body["notes"] = _linked_notes(session, document.id)
    return body


def _linked_notes(session: Session, document_id: int) -> list[dict]:
    """The notes attached to this document, as previews.

    A note and a document are different things on purpose, but they are
    usually about the same thing — asked for directly: "the documents and
    notes sections and features need to be more integrated together".
    """
    from memorymap.entry.manager import readable_content

    return [
        {
            "id": entry.id,
            "preview": readable_content(entry)[:120],
            "is_private": bool(entry.is_private),
        }
        for entry in entries_for_document(session, document_id)
    ]


def _existing(session: Session, document_id: int) -> Document:
    return deps.get_or_404(session, Document, document_id, "Document not found")


def _process_committed_media(session: Session, content: str) -> None:
    """Trigger OCR/captioning/vision-OCR for every `/media/…` upload this
    document's content references — see core/media_process.py's own
    docstring for why this fires on save rather than on upload."""
    from memorymap.core import media_process

    media_process.process_referenced_uploads(
        session, deps.get_config().data_dir / "media", content
    )


@router.get("")
def list_documents(
    q: str = Query(default="", max_length=200),
    session: Session = Depends(get_session),
) -> list[dict]:
    """Every document, newest-first, optionally narrowed by `q`.

    No limit even with `q` empty: the Documents tab loads the full list once
    and filters *titles* client-side (`#library-docs-search`), the same
    pattern `GET /entries` already uses for notes — a silent cap with no
    offset made everything past it permanently unreachable. At this app's
    realistic scale (a single user's own notebook) an unbounded read is the
    same cost `GET /entries` already pays on every load.

    `q`, when given, is the gap that client-side filtering can't close on
    its own: `_summary()` never sends document *content* to the browser (a
    document can run to thousands of words, unlike a note), so there was no
    way to search what a document actually says, only its title — despite
    the AI already being able to (`ai/tools/documents.py`'s `_list_documents`
    has searched title *and* content this way since it was written; this
    mirrors that filter rather than inventing a second one). Plain
    case-insensitive substring matching, not semantic search — whether
    documents get embeddings at all is a separate, larger decision.
    """
    query = select(Document).order_by(Document.updated_at.desc())
    term = q.strip()
    if term:
        like = f"%{term}%"
        query = query.where(Document.title.ilike(like) | Document.content.ilike(like))
    rows = session.scalars(query)
    return [_summary(d) for d in rows]


@router.post("", status_code=201)
def create_document(
    body: DocumentBody, session: Session = Depends(get_session)
) -> dict:
    document = Document(title=body.title.strip() or "Untitled", content=body.content)
    session.add(document)
    session.flush()
    log_action(session, "created", "document", document.id, document.title[:80])
    session.commit()
    _process_committed_media(session, document.content)
    return _full(document, session)


@router.get("/{document_id}")
def get_document(document_id: int, session: Session = Depends(get_session)) -> dict:
    return _full(_existing(session, document_id), session)


@router.put("/{document_id}")
def update_document(
    document_id: int, body: DocumentPatch, session: Session = Depends(get_session)
) -> dict:
    document = _existing(session, document_id)
    if body.title is not None:
        document.title = body.title.strip() or document.title
    content_changed = body.content is not None and body.content != document.content
    if body.content is not None:
        document.content = body.content
    document.updated_at = utcnow()
    session.commit()
    if content_changed:
        # A save (autosave included) is one of the three "committed"
        # moments core/media_process.py waits for — asked for directly,
        # OCR/captioning/vision-OCR must not run on a staged upload that
        # was only ever dropped into a document draft, not saved.
        _process_committed_media(session, document.content)
    return _full(document, session)


@router.delete("/{document_id}")
def delete_document(document_id: int, session: Session = Depends(get_session)) -> dict:
    document = _existing(session, document_id)
    log_action(session, "deleted", "document", document.id, document.title[:80])
    session.delete(document)
    session.commit()
    return {"deleted": True}


def _safe_filename(title: str, extension: str) -> str:
    """A title is user text; it must not steer where the file lands."""
    cleaned = re.sub(r"[^\w\s-]", "", title).strip() or "document"
    cleaned = re.sub(r"[\s_]+", "-", cleaned)[:60]
    return f"{cleaned}.{extension}"


class LinkBody(BaseModel):
    entry_id: int


@router.post("/{document_id}/notes", status_code=201)
def attach_note(
    document_id: int, body: LinkBody, session: Session = Depends(get_session)
) -> dict:
    """Attach an existing note to this document."""
    document = _existing(session, document_id)
    entry = get_entry(session, body.entry_id)
    if entry is None or entry.is_deleted:
        raise HTTPException(status_code=404, detail="Note not found")
    link_document(session, document.id, entry.id)
    return _full(document, session)


@router.delete("/{document_id}/notes/{entry_id}")
def detach_note(
    document_id: int, entry_id: int, session: Session = Depends(get_session)
) -> dict:
    """Detach a note. The note itself is untouched — this is a connection,
    not ownership."""
    document = _existing(session, document_id)
    unlink_document(session, document.id, entry_id)
    return _full(document, session)


@router.get("/{document_id}/export.md")
def export_markdown(
    document_id: int, session: Session = Depends(get_session)
) -> Response:
    """The raw markdown, as a download."""
    document = _existing(session, document_id)
    # The title becomes an H1 so the exported file stands on its own.
    body = f"# {document.title}\n\n{document.content}"
    return Response(
        content=body,
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{_safe_filename(document.title, "md")}"'
            )
        },
    )


@router.post("/{document_id}/ai-edit")
def ai_edit(
    document_id: int, body: AiEditBody, session: Session = Depends(get_session)
) -> dict:
    """Rewrite, write, or remove — three verbs on the same document-editor
    AI panel (asked for directly, reskinning it from a single rewrite
    action into a small general assistant).

    Nothing is saved here — the result comes back for the user to accept or
    reject, for all three verbs alike. An AI action that silently wrote
    into the file would be the single most destructive thing in the app.
    """
    document = _existing(session, document_id)
    instruction = body.instruction.strip()
    target = body.selection.strip() or document.content

    if body.verb == "write":
        if not instruction:
            raise HTTPException(status_code=400, detail="Say what to write.")
        inserted, thinking = drafter.compose_document_edit(
            document.content,
            deps.get_model_manager(),
            deps.get_ollama(),
            instruction=instruction,
            verb="write",
            context=body.selection.strip(),
        )
        offline = thinking == drafter.OFFLINE_MESSAGE
        return {
            "revised": inserted,
            "replaced_selection": False,
            "verb": "write",
            "thinking": None if offline else thinking,
            "message": drafter.OFFLINE_MESSAGE if offline else "",
            "ollama_running": not offline,
        }

    if not target.strip():
        raise HTTPException(status_code=400, detail="There's nothing to edit yet")

    if body.verb == "remove":
        # A selection alone already says what to remove — asked for
        # directly, no need to also type "remove this" by hand.
        if not instruction and not body.selection.strip():
            raise HTTPException(
                status_code=400, detail="Say what to remove, or select it first."
            )
        revised, thinking = drafter.compose_document_edit(
            target,
            deps.get_model_manager(),
            deps.get_ollama(),
            instruction=instruction or "Remove this passage entirely.",
            verb="remove",
        )
        offline = thinking == drafter.OFFLINE_MESSAGE
        return {
            "revised": revised,
            "replaced_selection": bool(body.selection.strip()),
            "verb": "remove",
            "thinking": None if offline else thinking,
            "message": drafter.OFFLINE_MESSAGE if offline else "",
            "ollama_running": not offline,
        }

    if not instruction:
        raise HTTPException(status_code=400, detail="Say what you'd like changed.")
    revised, thinking = drafter.compose(
        "",
        target,
        deps.get_model_manager(),
        deps.get_ollama(),
        instruction=instruction,
    )
    offline = thinking == drafter.OFFLINE_MESSAGE
    return {
        "verb": "edit",
        # The caller replaces either the selection or the whole document.
        "revised": revised,
        "replaced_selection": bool(body.selection.strip()),
        "thinking": None if offline else thinking,
        "message": drafter.OFFLINE_MESSAGE if offline else "",
        "ollama_running": not offline,
    }


class DocumentAiEditLogBody(BaseModel):
    """Recorded by the frontend right after it accepts an AI suggestion —
    the write to `document.content` and the write to this changelog are two
    separate requests (accept can't itself know before_content once the
    document's already been saved), so the frontend sends both snapshots
    here rather than this route re-deriving "before" from a document it can
    no longer see the prior state of.
    """

    verb: Literal["edit", "write", "remove"] = "edit"
    instruction: str = Field(default="", max_length=500)
    selection: str = Field(default="", max_length=MAX_CONTENT)
    before_content: str = Field(max_length=MAX_CONTENT)
    after_content: str = Field(max_length=MAX_CONTENT)


class DocumentAiEditOut(BaseModel):
    id: int
    verb: str
    instruction: str
    selection_excerpt: str
    created_at: str


def _ai_edit_out(row: DocumentAiEdit) -> DocumentAiEditOut:
    return DocumentAiEditOut(
        id=row.id,
        verb=row.verb,
        instruction=row.instruction,
        selection_excerpt=row.selection_excerpt,
        created_at=row.created_at.isoformat(),
    )


@router.post("/{document_id}/ai-edit-log", status_code=201)
def record_ai_edit(
    document_id: int, body: DocumentAiEditLogBody, session: Session = Depends(get_session)
) -> DocumentAiEditOut:
    """Log one accepted AI edit — the changelog asked for directly. Prunes
    the oldest entries past `MAX_AI_EDIT_LOG_PER_DOCUMENT` so a heavily
    AI-edited document doesn't keep an unbounded pile of full-text
    snapshots forever."""
    _existing(session, document_id)  # 404s if the document is gone
    selection = body.selection.strip()
    excerpt = selection[:SELECTION_EXCERPT_CHARS]
    if len(selection) > SELECTION_EXCERPT_CHARS:
        excerpt += "…"
    row = DocumentAiEdit(
        document_id=document_id,
        verb=body.verb,
        instruction=body.instruction.strip(),
        selection_excerpt=excerpt,
        before_content=body.before_content,
        after_content=body.after_content,
    )
    session.add(row)
    session.flush()

    existing_ids = session.scalars(
        select(DocumentAiEdit.id)
        .where(DocumentAiEdit.document_id == document_id)
        .order_by(DocumentAiEdit.created_at.desc())
    ).all()
    stale_ids = existing_ids[MAX_AI_EDIT_LOG_PER_DOCUMENT:]
    if stale_ids:
        session.query(DocumentAiEdit).filter(DocumentAiEdit.id.in_(stale_ids)).delete(
            synchronize_session=False
        )

    session.commit()
    session.refresh(row)
    return _ai_edit_out(row)


@router.get("/{document_id}/ai-edit-log", response_model=list[DocumentAiEditOut])
def list_ai_edits(
    document_id: int, session: Session = Depends(get_session)
) -> list[DocumentAiEditOut]:
    """The changelog itself, newest first — asked for directly."""
    _existing(session, document_id)
    rows = session.scalars(
        select(DocumentAiEdit)
        .where(DocumentAiEdit.document_id == document_id)
        .order_by(DocumentAiEdit.created_at.desc())
    ).all()
    return [_ai_edit_out(row) for row in rows]


@router.post("/{document_id}/ai-edit-log/{entry_id}/revert")
def revert_ai_edit(document_id: int, entry_id: int, session: Session = Depends(get_session)) -> dict:
    """Restore the document to exactly how it read before this one AI edit
    — the "undone... after they are set" half of the changelog. Records a
    fresh "revert" entry of its own (before_content = the document's
    current, about-to-be-replaced text; after_content = what this entry is
    restoring) rather than deleting anything, so the changelog stays a
    truthful record of everything that happened, including the revert
    itself, and a revert can itself be reverted.
    """
    document = _existing(session, document_id)
    entry = deps.get_or_404(session, DocumentAiEdit, entry_id, "No AI edit with that id")
    if entry.document_id != document_id:
        raise HTTPException(status_code=404, detail="No AI edit with that id")

    reverted = DocumentAiEdit(
        document_id=document_id,
        verb="revert",
        instruction=f"Reverted: {entry.instruction}" if entry.instruction else "Reverted an AI edit",
        selection_excerpt=entry.selection_excerpt,
        before_content=document.content,
        after_content=entry.before_content,
    )
    document.content = entry.before_content
    document.updated_at = utcnow()
    session.add(reverted)
    session.commit()
    return _full(document, session)
