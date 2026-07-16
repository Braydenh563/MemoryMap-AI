"""Ask a question, get back BOTH a conversational answer and the raw
matching entries — the two-result design from the original idea doc.

Plain `def` so the blocking LLM call runs in FastAPI's threadpool.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.ai import librarian
from memorymap.api.schemas import EntryOut
from memorymap.core import deps
from memorymap.core.database import AuditLog
from memorymap.core.deps import get_session
from memorymap.entry import manager
from memorymap.search import search_manager

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/recent", response_model=list[str])
def recent_questions(session: Session = Depends(get_session)) -> list[str]:
    """The last 5 distinct questions, newest first (Phase 5 quick access).
    Read straight from the audit log — no extra bookkeeping."""
    rows = session.scalars(
        select(AuditLog)
        .where(AuditLog.action == "queried", AuditLog.entity_type == "chat")
        .order_by(AuditLog.id.desc())
        .limit(50)
    )
    questions: list[str] = []
    for row in rows:
        if row.detail and row.detail not in questions:
            questions.append(row.detail)
        if len(questions) == 5:
            break
    return questions


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)


class ChatResponse(BaseModel):
    ai_response: str
    raw_results: list[EntryOut]
    # 'semantic' or 'keyword' — the UI shows which kind of search ran.
    search_mode: str
    # Which chat model wrote the answer, or None when Ollama was offline
    # — part of showing the user what actually happened.
    answered_by: str | None = None


@router.post("", response_model=ChatResponse)
def chat(body: ChatRequest, session: Session = Depends(get_session)) -> ChatResponse:
    entries, mode = search_manager.retrieve(
        session, body.question, deps.get_embeddings(), limit=5
    )

    notes = [
        {
            "content": entry.content,
            "category": manager.category_name_for(session, entry),
        }
        for entry in entries
    ]
    config = deps.get_config()
    style = config.get_preference("communication_style", "friendly")
    # The optional user profile gives the AI context — only when the
    # user has it switched on (Phase 5, with opt-out).
    profile = (
        config.get_preference("user_profile", "")
        if config.get_preference("profile_enabled", False)
        else ""
    )
    chat_available = bool(notes) and deps.get_ollama().is_running()
    ai_response = librarian.answer(
        body.question,
        notes,
        deps.get_model_manager(),
        deps.get_ollama(),
        style=style,
        profile=profile,
    )

    # Every entry this question surfaced counts as "used" (Phase 5).
    for entry in entries:
        entry.access_count += 1
    manager.log_action(session, "queried", "chat", detail=body.question)
    session.commit()

    return ChatResponse(
        ai_response=ai_response,
        raw_results=[
            EntryOut(
                id=entry.id,
                content=entry.content,
                category=manager.category_name_for(session, entry),
                tags=manager.entry_tags(entry),
                ai_confidence=entry.ai_confidence,
                created_at=entry.created_at,
            )
            for entry in entries
        ],
        search_mode=mode,
        answered_by=deps.get_model_manager().chat_model() if chat_available else None,
    )
