"""Saved chats (Wave C).

The frontend streams answers via /chat/stream, then records the finished
turn here — keeping the streaming path simple and the history durable.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.core.database import Conversation, utcnow
from memorymap.core.deps import get_session
from memorymap.entry.manager import log_action

router = APIRouter(prefix="/conversations", tags=["conversations"])


class TurnBody(BaseModel):
    question: str = Field(min_length=1)
    answer: str
    thinking: str | None = None


class RenameBody(BaseModel):
    title: str = Field(min_length=1, max_length=120)


def _turn_messages(turn: TurnBody) -> list[dict]:
    return [
        {"role": "user", "content": turn.question},
        {"role": "assistant", "content": turn.answer, "thinking": turn.thinking},
    ]


def _summary(conversation: Conversation) -> dict:
    messages = json.loads(conversation.messages)
    return {
        "id": conversation.id,
        "title": conversation.title,
        "updated_at": conversation.updated_at.isoformat(),
        "turns": len(messages) // 2,
    }


def _existing(session: Session, conversation_id: int) -> Conversation:
    conversation = session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.get("")
def list_conversations(session: Session = Depends(get_session)) -> list[dict]:
    rows = session.scalars(
        select(Conversation).order_by(Conversation.updated_at.desc()).limit(50)
    )
    return [_summary(c) for c in rows]


@router.post("", status_code=201)
def create_conversation(body: TurnBody, session: Session = Depends(get_session)) -> dict:
    """First turn of a new chat — the question becomes the title."""
    title = body.question if len(body.question) <= 60 else body.question[:59] + "…"
    conversation = Conversation(
        title=title, messages=json.dumps(_turn_messages(body))
    )
    session.add(conversation)
    session.flush()
    log_action(session, "created", "conversation", conversation.id)
    session.commit()
    return _summary(conversation)


@router.get("/{conversation_id}")
def get_conversation(
    conversation_id: int, session: Session = Depends(get_session)
) -> dict:
    conversation = _existing(session, conversation_id)
    return {**_summary(conversation), "messages": json.loads(conversation.messages)}


@router.post("/{conversation_id}/turns")
def append_turn(
    conversation_id: int, body: TurnBody, session: Session = Depends(get_session)
) -> dict:
    conversation = _existing(session, conversation_id)
    messages = json.loads(conversation.messages)
    messages.extend(_turn_messages(body))
    conversation.messages = json.dumps(messages)
    conversation.updated_at = utcnow()
    session.commit()
    return _summary(conversation)


TITLE_PROMPT = (
    "Write a very short title (2 to 5 words) for this conversation. Reply with "
    "the title only: no quotes, no punctuation at the end, no explanation."
)


def _clean_title(raw: str) -> str | None:
    text = (raw or "").strip().splitlines()[0] if (raw or "").strip() else ""
    text = text.strip().strip("\"'`*#").rstrip(".!,;:").strip()
    if not text or len(text) > 60 or len(text.split()) > 8:
        return None
    return text


@router.post("/{conversation_id}/retitle")
def retitle_conversation(
    conversation_id: int, session: Session = Depends(get_session)
) -> dict:
    """Name a chat with the local model, falling back to the first question.

    Best-effort by design: if the model is down or answers with something
    unusable, the conversation simply keeps a sensible non-AI title.
    """
    from memorymap.ai import librarian
    from memorymap.core import deps

    conversation = _existing(session, conversation_id)
    messages = json.loads(conversation.messages)
    first_question = next(
        (m["content"] for m in messages if m.get("role") == "user"), ""
    )
    fallback = first_question if len(first_question) <= 60 else first_question[:59] + "…"

    title = None
    ollama = deps.get_ollama()
    if ollama.is_running():
        # A short transcript is plenty to name the thread.
        transcript = "\n".join(
            f"{m.get('role')}: {str(m.get('content'))[:400]}" for m in messages[:4]
        )
        # Name it in the active persona's voice, so titles match the
        # assistant the user actually chose.
        persona = librarian.resolve_persona_prompt(None, deps.get_config())
        system = f"{persona.strip()} {TITLE_PROMPT}" if persona else TITLE_PROMPT
        try:
            reply = ollama.chat(
                deps.get_model_manager().utility_model(),
                [
                    {"role": "system", "content": system},
                    {"role": "user", "content": transcript},
                ],
            )
            title = _clean_title(reply.get("content", "") if isinstance(reply, dict) else "")
        except Exception:  # noqa: BLE001 — a failed rename is never fatal
            title = None

    conversation.title = title or fallback or conversation.title
    conversation.updated_at = utcnow()
    session.commit()
    return {**_summary(conversation), "ai_named": bool(title)}


@router.delete("/{conversation_id}/turns/{index}")
def delete_turn(
    conversation_id: int, index: int, session: Session = Depends(get_session)
) -> dict:
    """Remove a single question/answer exchange (a turn) from a saved chat.

    Messages are stored as flat user/assistant pairs, so turn `index` maps to
    messages[2*index : 2*index+2].
    """
    conversation = _existing(session, conversation_id)
    messages = json.loads(conversation.messages)
    start = index * 2
    if index < 0 or start >= len(messages):
        raise HTTPException(status_code=404, detail="Turn not found")
    del messages[start : start + 2]
    conversation.messages = json.dumps(messages)
    conversation.updated_at = utcnow()
    session.commit()
    return _summary(conversation)


@router.put("/{conversation_id}")
def rename_conversation(
    conversation_id: int, body: RenameBody, session: Session = Depends(get_session)
) -> dict:
    conversation = _existing(session, conversation_id)
    conversation.title = body.title
    session.commit()
    return _summary(conversation)


@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: int, session: Session = Depends(get_session)
) -> dict:
    conversation = _existing(session, conversation_id)
    log_action(session, "deleted", "conversation", conversation.id)
    session.delete(conversation)
    session.commit()
    return {"deleted": True}
