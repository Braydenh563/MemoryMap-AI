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
