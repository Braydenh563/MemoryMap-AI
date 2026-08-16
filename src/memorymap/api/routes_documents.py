"""Long-form documents (the editor tab): CRUD, export, and AI editing.

Documents are markdown, stored whole. They're deliberately not Entries — see
the model docstring — so they never appear in note search, the graph, or the
AI's retrieved context unless the user asks for them by name.
"""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.ai import drafter
from memorymap.core import deps
from memorymap.core.database import Document, utcnow
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


class DocumentBody(BaseModel):
    title: str = Field(default="Untitled", min_length=1, max_length=200)
    content: str = Field(default="", max_length=MAX_CONTENT)


class DocumentPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, max_length=MAX_CONTENT)


class AiEditBody(BaseModel):
    """Ask the AI to rewrite the document, or a selected passage of it."""

    instruction: str = Field(min_length=1, max_length=500)
    # When set, only this passage is rewritten and the rest is left alone.
    selection: str = Field(default="", max_length=MAX_CONTENT)


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


@router.get("")
def list_documents(session: Session = Depends(get_session)) -> list[dict]:
    """Every document, newest-first.

    No limit: the Documents tab loads this once and filters/searches
    client-side, the same pattern `GET /entries` already uses for notes — a
    silent cap with no offset made everything past it permanently
    unreachable (there's no search param here to narrow by instead). At
    this app's realistic scale (a single user's own notebook) an unbounded
    read is the same cost `GET /entries` already pays on every load.
    """
    rows = session.scalars(select(Document).order_by(Document.updated_at.desc()))
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
    if body.content is not None:
        document.content = body.content
    document.updated_at = utcnow()
    session.commit()
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
    """Rewrite the document (or one passage) to an instruction.

    Nothing is saved here — the result comes back for the user to accept or
    reject. An AI edit that silently overwrote the file would be the single
    most destructive thing in the app.
    """
    document = _existing(session, document_id)
    target = body.selection.strip() or document.content
    if not target.strip():
        raise HTTPException(status_code=400, detail="There's nothing to edit yet")

    revised, thinking = drafter.compose(
        "",
        target,
        deps.get_model_manager(),
        deps.get_ollama(),
        instruction=body.instruction,
    )
    offline = thinking == drafter.OFFLINE_MESSAGE
    return {
        # The caller replaces either the selection or the whole document.
        "revised": revised,
        "replaced_selection": bool(body.selection.strip()),
        "thinking": None if offline else thinking,
        "message": drafter.OFFLINE_MESSAGE if offline else "",
        "ollama_running": not offline,
    }
