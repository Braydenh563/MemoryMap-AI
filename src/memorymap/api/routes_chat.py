"""Ask a question, get back BOTH a conversational answer and the raw
matching entries — the two-result design from the original idea doc.

Plain `def` so the blocking LLM call runs in FastAPI's threadpool.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from memorymap.ai import librarian
from memorymap.api.schemas import EntryOut
from memorymap.core import deps
from memorymap.core.deps import get_session
from memorymap.entry import manager
from memorymap.search import search_manager

router = APIRouter(prefix="/chat", tags=["chat"])


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
    style = deps.get_config().get_preference("communication_style", "friendly")
    chat_available = bool(notes) and deps.get_ollama().is_running()
    ai_response = librarian.answer(
        body.question, notes, deps.get_model_manager(), deps.get_ollama(), style=style
    )

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
