"""The act registry (CHAT_PLAN "The deterministic foundation", module 3,
decision 53): every act the app does from a sentence, each with `parse`,
`preview`, `run`, its `inverse` and a help line, over `ai/commands.py`, which
keeps the grammar, the cards and the tool door.

Every surface that names what an act does reads it from here: the capability
line said with no model, the palette's act rows, the Guide's act topics
(`help_topics_more.py`), and the line Ask says when a sentence is an act. A
model's proposed act (`propose`) is checked against the registry and goes
through the same preview, Confirm and Undo as a typed one: the model
proposes, the engine decides.

`inverse` names the step Undo runs; the run returns it (`run(...)["undo"]`)
and the page puts it on the app-wide undo stack (`pushUndo`, WORLD_CLASS
decision 53), so Ctrl+Z after an act takes it back.
`tests/test_acts.py` runs every write act and then its inverse on a real
notebook and checks the notebook is as it was.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from memorymap.ai import commands, validate
from memorymap.ai.act_registry import (
    ACTS,
    CONFIRM_INTENTS,
    Act,
    _ACTS,
    ask_line,
    capability_line,
    guide_topic,
    palette_rows,
)

#: The table and its text are read through this module too (routes_chat,
#: the tests), so the re-exports are named rather than incidental.
__all__ = [
    "ACTS", "CONFIRM_INTENTS", "Act", "_ACTS", "ask_line", "capability_line", "guide_topic", "palette_rows",
    "parse", "missing", "preview", "run", "inverse", "propose",
]


# --- the four stages ------------------------------------------------------------------


def parse(text: str, now: datetime) -> dict | None:
    """The act `text` says, as `commands.read` gives it, or None."""
    parsed = commands.read(text, now)
    return parsed if parsed and parsed.get("intent") in ACTS else None


def missing(parsed: dict) -> list[str]:
    """The slots the act needs that the sentence did not fill (decision 50:
    asked once, never guessed)."""
    return validate.slots_missing(parsed, ACTS[parsed["intent"]].slots)


def preview(session: Session, parsed: dict, note_ids: list[int] | None = None) -> dict:
    """What the act would do, written nowhere: the line and, for a write, the
    card with the exact steps (`commands.plan`)."""
    return commands.plan(session, parsed, note_ids)


def run(session: Session, steps: list[dict], skipped: list[dict] | None = None) -> dict:
    """Run a card's steps through the agent's tools; the result carries the
    inverse steps Undo runs."""
    return commands.run(session, steps, skipped)


def inverse(intent: str) -> str:
    """The tool Undo runs after this act, "" for one that changes nothing."""
    act = ACTS.get(intent)
    return act.inverse if act else ""


# --- a model's act (decision 53) ---------------------------------------------------------


def propose(session: Session, text: str, now: datetime, note_ids: list[int] | None = None) -> dict | None:
    """A model's proposed act, said as a sentence ("remind me to call Sam on
    Friday"), read by the same grammar and previewed as a card that waits for
    Confirm whatever the act: a model never runs a write on its own word.
    None when the sentence is not an act the registry has."""
    parsed = parse(text, now)
    if parsed is None:
        return None
    planned = preview(session, parsed, note_ids)
    planned.pop("run", None)
    if planned.get("card"):
        planned["card"] = {**planned["card"], "proposed": True}
    return planned
