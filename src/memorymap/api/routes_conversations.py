"""Saved chats (Wave C).

The frontend streams answers via /chat/stream, then records the finished
turn here — keeping the streaming path simple and the history durable.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from memorymap.core.database import Conversation, utcnow
from memorymap.core.deps import get_session
from memorymap.entry.manager import log_action

router = APIRouter(prefix="/conversations", tags=["conversations"])


class TurnBody(BaseModel):
    question: str = Field(min_length=1)
    answer: str
    thinking: str | None = None
    # Tool-activity chips shown in the bubble (Wave G) — persisted so they
    # survive a reload instead of vanishing. Each item is {label, ok}.
    tools: list[dict] | None = None
    # The agent's work in the order it happened: thinking, tool calls and
    # prose interleaved, so reopening a chat shows the same step-by-step run
    # the user watched live rather than a flattened summary of it. Kept
    # alongside `answer`/`tools` rather than replacing them, so an older saved
    # chat (and any other client) still renders.
    steps: list[dict] | None = Field(default=None, max_length=200)
    # What this answer cost, as the model reported it. Stored per turn so a
    # conversation can show its running total: "how much context am I
    # carrying?" is only answerable per-message today, which is the wrong
    # granularity — the total is what decides whether to start a new chat.
    tokens: int | None = None
    # The whole metadata line, not just its total: which model answered, how
    # long it took, prompt→output counts, how full the window got, whether
    # those counts were measured or estimated.
    #
    # Reported in IDEAS.md as "chat message metadata disappears on reload".
    # `tokens` above is a sum, which is the right shape for the conversation
    # total and the wrong one for the per-message line — you cannot rebuild
    # "3.9k of 8k, 12 tok/s, llama3.2" from a single integer, so on reload the
    # line simply vanished and the chat looked like it had been answered by
    # nothing in particular.
    #
    # A free-form dict rather than a model with fields: it is written by the
    # provider and read by one function in `app.js`, and pinning its shape here
    # would mean a third place to edit every time a provider learns to report
    # something new. Bounded instead by only ever storing what the client sends
    # back from a `stats` event.
    stats: dict | None = None
    # Wall-clock for the whole turn, measured by the client because it is the
    # only thing that saw all of it: the server reports per-round timings, and
    # an agent turn is several rounds plus the tool calls between them.
    elapsed_ms: int | None = None


class RenameBody(BaseModel):
    title: str = Field(min_length=1, max_length=120)


class PinBody(BaseModel):
    pinned: bool


def _turn_messages(turn: TurnBody) -> list[dict]:
    assistant = {"role": "assistant", "content": turn.answer, "thinking": turn.thinking}
    if turn.tools:
        assistant["tools"] = turn.tools
    if turn.steps:
        assistant["steps"] = turn.steps
    if turn.tokens:
        assistant["tokens"] = turn.tokens
    if turn.stats:
        assistant["stats"] = turn.stats
    if turn.elapsed_ms is not None:
        assistant["elapsed_ms"] = turn.elapsed_ms
    return [
        {"role": "user", "content": turn.question},
        assistant,
    ]


def _summary(conversation: Conversation) -> dict:
    messages = json.loads(conversation.messages)
    first_question = next(
        (m.get("content", "") for m in messages if m.get("role") == "user"), ""
    )
    return {
        "id": conversation.id,
        "title": conversation.title,
        "updated_at": conversation.updated_at.isoformat(),
        "turns": len(messages) // 2,
        "pinned": bool(conversation.pinned),
        # A line of the first question, so the list says what a chat was
        # about when its title doesn't.
        "preview": first_question[:120],
        "tokens": sum(int(m.get("tokens") or 0) for m in messages),
    }


def _existing(session: Session, conversation_id: int) -> Conversation:
    conversation = session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


def conversation_matches(conversation: Conversation, term: str) -> bool:
    """Does this chat actually mention `term`?

    Not a LIKE against the `messages` column. That column holds JSON, so its
    own keys are searchable text: "tent" is a substring of "content", which
    made every single conversation match. The decoded message text is the
    only thing a user means by "what was said".
    """
    lowered = term.lower()
    if lowered in conversation.title.lower():
        return True
    try:
        messages = json.loads(conversation.messages)
    except ValueError:
        return False
    return any(lowered in str(m.get("content", "")).lower() for m in messages)


@router.get("")
def list_conversations(
    q: str = "", session: Session = Depends(get_session)
) -> list[dict]:
    """Pinned first, then most recently used.

    `q` searches titles *and* message text: you remember what you asked
    about far more often than what the chat ended up being called, and
    title-only search can't find that.
    """
    term = (q or "").strip()
    query = select(Conversation)
    if term:
        # A cheap SQL prefilter — it over-matches (JSON keys count as text),
        # so everything it returns is then checked properly below.
        like = f"%{term}%"
        query = query.where(
            Conversation.title.ilike(like) | Conversation.messages.ilike(like)
        )
    rows = list(
        session.scalars(
            query.order_by(
                Conversation.pinned.desc(), Conversation.updated_at.desc()
            ).limit(200 if term else 50)
        )
    )
    if term:
        rows = [c for c in rows if conversation_matches(c, term)]
    return [_summary(c) for c in rows]


@router.put("/{conversation_id}/pin")
def pin_conversation(
    conversation_id: int, body: PinBody, session: Session = Depends(get_session)
) -> dict:
    conversation = _existing(session, conversation_id)
    # updated_at carries `onupdate=utcnow`, which fires on *any* write to the
    # row — so the obvious `conversation.pinned = …; commit()` also marks the
    # chat as just-used, and unpinning would leave it at the top of the list
    # it was meant to drop back down. Passing the current value explicitly is
    # what suppresses the default: pinning is organising, not using.
    session.execute(
        update(Conversation)
        .where(Conversation.id == conversation.id)
        .values(pinned=body.pinned, updated_at=conversation.updated_at)
    )
    session.commit()
    session.refresh(conversation)
    return _summary(conversation)


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
    # Models frequently reply in lowercase — a title should start capitalised.
    return text[0].upper() + text[1:]


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


@router.put("/{conversation_id}/turns/last")
def replace_last_turn(
    conversation_id: int, body: TurnBody, session: Session = Depends(get_session)
) -> dict:
    """Regenerate: swap the most recent Q&A pair for a fresh answer, in
    place, instead of appending a duplicate below it (user request)."""
    conversation = _existing(session, conversation_id)
    messages = json.loads(conversation.messages)
    if len(messages) >= 2:
        messages = messages[:-2]  # drop the last user+assistant pair
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
    messages[2*index : 2*index+2]. Deleting the last remaining turn removes the
    conversation itself, since an empty chat is only clutter.
    """
    conversation = _existing(session, conversation_id)
    messages = json.loads(conversation.messages)
    start = index * 2
    if index < 0 or start >= len(messages):
        raise HTTPException(status_code=404, detail="Turn not found")
    del messages[start : start + 2]
    if not messages:
        log_action(session, "deleted", "conversation", conversation.id)
        session.delete(conversation)
        session.commit()
        return {"deleted": True, "conversation_deleted": True, "turns": 0}
    conversation.messages = json.dumps(messages)
    conversation.updated_at = utcnow()
    session.commit()
    return {**_summary(conversation), "deleted": True, "conversation_deleted": False}


class TruncateBody(BaseModel):
    """Drop this turn and everything after it."""

    from_turn: int = Field(ge=0)


@router.post("/{conversation_id}/truncate")
def truncate_conversation(
    conversation_id: int, body: TruncateBody, session: Session = Depends(get_session)
) -> dict:
    """Cut the conversation back to just before `from_turn`.

    This is what editing a question needs: the answers that followed it were
    replies to the old wording, so leaving them would make the thread read as
    though the assistant answered a question nobody asked.
    """
    conversation = _existing(session, conversation_id)
    messages = json.loads(conversation.messages)
    keep = messages[: body.from_turn * 2]
    if len(keep) == len(messages):
        return {**_summary(conversation), "removed": 0}

    removed = (len(messages) - len(keep)) // 2
    if not keep:
        log_action(session, "deleted", "conversation", conversation.id)
        session.delete(conversation)
        session.commit()
        return {"removed": removed, "conversation_deleted": True, "turns": 0}

    conversation.messages = json.dumps(keep)
    conversation.updated_at = utcnow()
    session.commit()
    return {**_summary(conversation), "removed": removed, "conversation_deleted": False}


class AnswerBody(BaseModel):
    content: str = Field(min_length=1)


def _rewrite_answer_steps(steps: list[dict] | None, content: str) -> list[dict] | None:
    """Point a saved step timeline at an edited answer.

    `steps` carries its own copy of the prose, and it is the copy the client
    actually renders when reopening a chat — `content` is only used for the
    copy button. So editing `content` alone left the edit invisible the moment
    the chat was reopened: replay redrew the model's original wording and the
    correction looked like it had never been saved.

    The reasoning and tool steps are deliberately left alone. They record what
    the model actually did, which the user's correction doesn't change. Only
    the prose is theirs to rewrite, so the answer steps collapse into the one
    block they typed — the same shape the frontend produces when it edits a
    timeline in place.
    """
    if not steps:
        return steps
    out: list[dict] = []
    written = False
    for step in steps:
        if step.get("kind") != "answer":
            out.append(step)
            continue
        if written:
            continue  # a second prose block would duplicate the correction
        out.append({**step, "text": content})
        written = True
    if not written:
        # A turn whose timeline held only reasoning and tools still needs the
        # edited prose, or replay would render no answer at all.
        out.append({"kind": "answer", "text": content})
    return out


@router.put("/{conversation_id}/turns/{index}/answer")
def edit_answer(
    conversation_id: int,
    index: int,
    body: AnswerBody,
    session: Session = Depends(get_session),
) -> dict:
    """Edit the assistant's text of one turn, keeping everything else.

    Questions have been editable for a while; answers weren't, so the only
    way to fix a model's near-miss was to regenerate and hope. An edited
    answer is marked so the transcript never passes your words off as the
    model's — that distinction is the whole point of keeping a transcript.
    """
    conversation = _existing(session, conversation_id)
    messages = json.loads(conversation.messages)
    position = index * 2 + 1  # user, assistant, user, assistant, …
    if index < 0 or position >= len(messages):
        raise HTTPException(status_code=404, detail="Turn not found")
    messages[position]["content"] = body.content
    messages[position]["edited"] = True
    steps = _rewrite_answer_steps(messages[position].get("steps"), body.content)
    if steps:
        messages[position]["steps"] = steps
    conversation.messages = json.dumps(messages)
    conversation.updated_at = utcnow()
    session.commit()
    return {**_summary(conversation), "edited_turn": index}


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
