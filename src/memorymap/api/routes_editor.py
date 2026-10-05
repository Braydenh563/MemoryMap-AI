"""`POST /editor/read`: the margin reader's one route (WORLD_CLASS_PLAN I2).

The reading is `ai/margin.py`. This is the door and the two rules that belong
at it: the `margin_reader` switch (Settings, What the notebook learned) turns
the whole thing off, and `judge` asks the model only when one is up, so the
editor's second request never waits on a model that is not there.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from memorymap.ai import facts, margin
from memorymap.core import deps
from memorymap.core.config import user_now
from memorymap.core.deps import get_session

router = APIRouter(prefix="/editor", tags=["editor"])


class ReadBody(BaseModel):
    paragraph: str = Field(max_length=margin.MAX_CHARS * 2)
    entry_id: int | None = None
    document_id: int | None = None
    ordinal: int = 0
    #: Sources already shown in this editing session, never shown twice.
    exclude: list[int] = Field(default_factory=list, max_length=200)
    #: Ask the model for the relation (the editor's second request).
    judge: bool = False


@router.post("/read")
def read(body: ReadBody, session: Session = Depends(get_session)) -> dict:
    config = deps.get_config()
    if not facts.enabled(config, "margin_reader"):
        return {"cards": [], "judged": False, "off": True}
    provider, model = None, ""
    if body.judge:
        try:
            candidate = deps.get_ollama()
            if candidate.is_running():
                provider, model = candidate, deps.get_model_manager().utility_model()
        except Exception:  # noqa: BLE001  # no model is the fast path, not an error
            provider = None
    try:
        embeddings = deps.get_embeddings()
    except Exception:  # noqa: BLE001
        embeddings = None
    result = margin.read(
        session,
        body.paragraph,
        entry_id=body.entry_id,
        exclude=body.exclude,
        embeddings=embeddings,
        provider=provider,
        model=model,
        now=user_now(config),
    )
    result["ordinal"] = body.ordinal
    return result
