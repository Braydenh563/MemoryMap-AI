"""The Help mini AI chat (ROADMAP.md item 40): app-guidance-only Q&A,
never touching the database, see `ai/help_chat.py` for why."""

from __future__ import annotations

from fastapi import APIRouter
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
