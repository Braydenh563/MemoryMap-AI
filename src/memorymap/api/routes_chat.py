"""Ask a question, get back BOTH a conversational answer and the raw
matching entries — the two-result design from the original idea doc.

Two flavours:
- POST /chat        — one blocking JSON response (simple, used by tests/API)
- POST /chat/stream — NDJSON: metadata + raw results first, then the
  model's thinking and answer as live token deltas (what the UI uses)

Plain `def` so the blocking LLM call runs in FastAPI's threadpool.
"""

from __future__ import annotations

import json
from collections.abc import Iterator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.ai import librarian
from memorymap.ai.ollama_client import OllamaError
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
    # A thinking model's reasoning, when it produced any.
    ai_thinking: str | None = None
    raw_results: list[EntryOut]
    # 'semantic' or 'keyword' — the UI shows which kind of search ran.
    search_mode: str
    # Which chat model wrote the answer, or None when Ollama was offline
    # — part of showing the user what actually happened.
    answered_by: str | None = None


def _prepare(session: Session, question: str) -> dict:
    """The shared first half of both chat endpoints: retrieve entries,
    bump their usage counters, log the question, gather AI settings."""
    from memorymap.api.routes_entries import _to_out  # avoids a route-module cycle

    entries, mode = search_manager.retrieve(
        session, question, deps.get_embeddings(), limit=5
    )
    notes = [
        {
            "content": entry.content,
            "category": manager.category_name_for(session, entry),
        }
        for entry in entries
    ]
    config = deps.get_config()
    profile = (
        config.get_preference("user_profile", "")
        if config.get_preference("profile_enabled", False)
        else ""
    )

    # Every entry this question surfaced counts as "used" (Phase 5).
    for entry in entries:
        entry.access_count += 1
    manager.log_action(session, "queried", "chat", detail=question)
    session.commit()

    return {
        "notes": notes,
        "raw_results": [_to_out(session, entry) for entry in entries],
        "search_mode": mode,
        "style": config.get_preference("communication_style", "friendly"),
        "profile": profile,
    }


@router.post("", response_model=ChatResponse)
def chat(body: ChatRequest, session: Session = Depends(get_session)) -> ChatResponse:
    prepared = _prepare(session, body.question)
    chat_available = bool(prepared["notes"]) and deps.get_ollama().is_running()
    ai_response, ai_thinking = librarian.answer(
        body.question,
        prepared["notes"],
        deps.get_model_manager(),
        deps.get_ollama(),
        style=prepared["style"],
        profile=prepared["profile"],
    )
    return ChatResponse(
        ai_response=ai_response,
        ai_thinking=ai_thinking,
        raw_results=prepared["raw_results"],
        search_mode=prepared["search_mode"],
        answered_by=deps.get_model_manager().chat_model() if chat_available else None,
    )


@router.post("/stream")
def chat_stream(body: ChatRequest, session: Session = Depends(get_session)):
    """NDJSON stream. Line types, in order:
    {"type":"meta", raw_results, search_mode, answered_by}
    {"type":"thinking", "delta": "..."}   (zero or more)
    {"type":"answer", "delta": "..."}     (one or more)
    {"type":"done"}
    """
    prepared = _prepare(session, body.question)
    ollama = deps.get_ollama()
    model_manager = deps.get_model_manager()
    chat_available = bool(prepared["notes"]) and ollama.is_running()

    def lines() -> Iterator[str]:
        def event(payload: dict) -> str:
            return json.dumps(payload) + "\n"

        yield event(
            {
                "type": "meta",
                "raw_results": [r.model_dump(mode="json") for r in prepared["raw_results"]],
                "search_mode": prepared["search_mode"],
                "answered_by": model_manager.chat_model() if chat_available else None,
            }
        )

        if not prepared["notes"]:
            yield event({"type": "answer", "delta": librarian.NO_RESULTS_MESSAGE})
        elif not chat_available:
            yield event({"type": "answer", "delta": librarian.OFFLINE_MESSAGE})
        else:
            messages = librarian.build_messages(
                body.question,
                prepared["notes"],
                style=prepared["style"],
                profile=prepared["profile"],
            )
            try:
                for piece in ollama.chat_stream(model_manager.chat_model(), messages):
                    if "thinking_delta" in piece:
                        yield event({"type": "thinking", "delta": piece["thinking_delta"]})
                    else:
                        yield event({"type": "answer", "delta": piece["content_delta"]})
            except OllamaError:
                # The model died mid-answer — tell the user, keep the results.
                yield event({"type": "answer", "delta": f"\n\n{librarian.OFFLINE_MESSAGE}"})
        yield event({"type": "done"})

    return StreamingResponse(lines(), media_type="application/x-ndjson")
