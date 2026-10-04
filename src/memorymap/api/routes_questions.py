"""Open questions (WORLD_CLASS_PLAN I3; row 7): the list and its states.

`GET /questions?state=` pages the questions the night pass found in the
notes, each with where it was asked and, once answered, the sentence that
answered it. `POST /questions/{id}` moves one to open, answered (by hand,
naming the note) or dropped. The logic is `ai/questions.py`; this is the
HTTP shape only.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from memorymap.ai import questions
from memorymap.core.deps import get_session

router = APIRouter(prefix="/questions", tags=["questions"])


@router.get("")
def list_questions(
    state: Literal["open", "answered", "dropped"] | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> dict:
    """`{items, total, counts}`: one page in `state` (every state when
    absent), newest note first, and how many are in each state."""
    return questions.listing(session, state=state, limit=limit, offset=offset)


@router.get("/summary")
def summary(session: Session = Depends(get_session)) -> dict:
    """The Dashboard's line: how many are open, and the oldest open one."""
    return questions.summary(session)


class StateBody(BaseModel):
    state: Literal["open", "answered", "dropped"]
    #: The note that answers it, for `answered` by hand.
    entry_id: int | None = None


@router.post("/{fact_id}")
def set_state(fact_id: int, body: StateBody, session: Session = Depends(get_session)) -> dict:
    question = questions.visible_question(session, fact_id)
    if question is None:
        raise HTTPException(status_code=404, detail="That question could not be found.")
    if body.state == "answered" and body.entry_id is None:
        raise HTTPException(status_code=422, detail="Say which note answers it.")
    if body.state == "answered" and body.entry_id == question.entry_id:
        raise HTTPException(status_code=422, detail="A question cannot be answered by its own note.")
    try:
        item = questions.set_state(session, question, body.state, entry_id=body.entry_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail="That note could not be found.") from exc
    session.commit()
    return item
