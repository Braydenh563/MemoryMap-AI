"""The Help mini AI chat (ROADMAP.md item 40): app-guidance-only Q&A,
never touching the database, see `ai/help_chat.py` for why."""

from __future__ import annotations

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from memorymap.ai import help_chat
from memorymap.core import deps

router = APIRouter(prefix="/help", tags=["help"])


class HistoryTurn(BaseModel):
    role: str
    content: str = Field(max_length=help_chat.MAX_MESSAGE_CHARS)


class AskBody(BaseModel):
    question: str = Field(min_length=1, max_length=help_chat.MAX_MESSAGE_CHARS)
    # Held by the client only (sessionStorage/module state): see
    # `ai/help_chat.py`'s docstring for why nothing here persists it.
    history: list[HistoryTurn] = Field(default_factory=list, max_length=help_chat.MAX_HISTORY_TURNS)
    #: Which surface the question was asked from, and that surface's own help
    #: copy. Both optional: the Guide is reachable from the header on every tab
    #: now (INBOX 190), and a question asked with something on screen is nearly
    #: always about that thing. `tab` is a short name from a fixed set
    #: (`help_chat.TAB_TOPICS`), unknown values simply add no topics; `context`
    #: is text the client read out of its own DOM, so it is capped here and
    #: again in `help_chat.answer`.
    tab: str | None = Field(default=None, max_length=40)
    context: str | None = Field(default=None, max_length=help_chat.MAX_CONTEXT_CHARS)


@router.post("/ask")
def ask(body: AskBody) -> dict:
    return help_chat.answer(
        body.question,
        deps.get_model_manager(),
        deps.get_ollama(),
        history=[turn.model_dump() for turn in body.history],
        tab=body.tab,
        context=body.context,
    )


@router.post("/ask/stream")
def ask_stream(body: AskBody) -> StreamingResponse:
    """The same turn as `/ask`, delivered as it is written.

    Reported of the Guide: the reply "will be blurted out really fast like it
    isnt streaming but just outputting at once", and the thinking "only shows
    up after the response is finished". `/ask` returns one object when the
    whole reply exists, so the panel could only fake the writing with a timer
    and could not show the thinking until there was nothing left to think
    about. `/ask` stays: it is the fallback the client uses when a stream
    cannot be opened, and the shape every test of this module already speaks.

    Newline-delimited JSON, the same wire format and the same
    no-buffering headers the chat stream uses, so one reader in the client
    can be taught both.
    """

    def lines():
        for event in help_chat.answer_stream(
            body.question,
            deps.get_model_manager(),
            deps.get_ollama(),
            history=[turn.model_dump() for turn in body.history],
            tab=body.tab,
            context=body.context,
        ):
            yield json.dumps(event) + "\n"

    return StreamingResponse(
        lines(),
        media_type="application/x-ndjson",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )
