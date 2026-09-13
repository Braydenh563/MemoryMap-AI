"""The night shift, on demand (WORLD_CLASS_PLAN 15, I1).

One route: run a pass now, inside a budget. The scheduled half lives in
`ai/autonomous.py`, which already owns the interval, the battery guard, the
cancel and snooze protocol and the `system:librarian` attribution, and a
second scheduler beside it would be a second answer to every one of those
questions.

Separate from `routes_learned.py` on purpose even though the two are halves
of one feature: `/learned` is what the person reads and corrects, `/night` is
what the app does, and the day either grows a review list or a second runner
they part company entirely.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from memorymap.ai import facts
from memorymap.core import deps
from memorymap.core.deps import get_session

logger = logging.getLogger("memorymap.api.night")

router = APIRouter(prefix="/night", tags=["night"])


class RunBody(BaseModel):
    #: Tokens. A real limit rather than decoration: the pass stops inside it
    #: and says in `stopped_reason` that it did, so a notebook too big for one
    #: night is resumed rather than half-read and silently declared done.
    budget: int = Field(default=2000, ge=1, le=1_000_000)
    #: Read every note again rather than only what changed. Never re-derives
    #: an edited or deleted fact: `force` moves the cursor, it does not
    #: override the lifecycle.
    force: bool = False


@router.post("/run")
def run_now(body: RunBody, session: Session = Depends(get_session)) -> dict:
    """One pass, now.

    Returns `{"paused": true}` rather than an error when the switch is off:
    the caller asked a reasonable question and the honest answer is that this
    runner is switched off, which is a state the person chose and the UI has
    to be able to show.
    """
    config = deps.get_config()
    provider = deps.get_ollama()
    model = ""
    try:
        if provider is not None and provider.is_running():
            model = deps.get_model_manager().utility_model()
        else:
            provider = None
    except Exception as exc:  # noqa: BLE001  # a provider that cannot say is a provider that is not there
        # Logged rather than swallowed: the pass still runs and still derives,
        # so the only trace that the model was not consulted would otherwise
        # be every row saying `local` and nobody knowing why.
        logger.info("night pass: no model to narrow with (%s)", exc)
        provider = None
    result = facts.run(
        session, budget=body.budget, force=body.force, provider=provider, model=model, config=config
    )
    session.commit()
    return result
