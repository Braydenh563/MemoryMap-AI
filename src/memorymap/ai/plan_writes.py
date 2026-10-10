"""What each step of a plan will write, said before it runs (AGENT_SKILLS_REFORM
"Deepened 2026-10-10" row 3, the GitHub Copilot agent panel's shape: the steps
and the writes each will make, approved once, then each step's diff after).

A step the act registry reads (`acts.parse`) is previewed as its card says it,
so the line is the exact change ("Tag 3 notes about the harbor with harbor").
A step that names a write tool says which ("May change notes: tag_note"). A
step that names neither says it reads; the model may still write in it, and
every write it makes is listed under the step when it is done (`changes` on
the step's `done` event) and goes on the undo bar.
"""

from __future__ import annotations

import difflib
import logging
import re
import sys
from datetime import datetime

from sqlalchemy.orm import Session

from memorymap.ai import act_registry, acts, commands
from memorymap.ai.tools import WRITE_TOOLS

DIFF_LINES = 4
_WORD = re.compile(r"[a-z_]+")


def step_writes(session: Session, step: str, now: datetime) -> list[str]:
    """The writes one step will make, as lines; [] when it only reads."""
    parsed = acts.parse(step, now)
    if parsed is not None and parsed["intent"] in commands.WRITE_INTENTS:
        planned = acts.preview(session, parsed)
        card = planned.get("card")
        return [card["label"] if card else planned["line"]]
    named = sorted(set(_WORD.findall(step.lower())) & WRITE_TOOLS)
    return [f"May change your notebook: {', '.join(named)}"] if named else []


#: What a step that is an act is offered besides its own tools: the reads
#: that find the note it names.
FINDING = ("search_notes", "get_note")


def step_tools(session: Session, step: str, now: datetime) -> list[str]:
    """The tools an act step's approved writes need, [] for any other step:
    the plan was approved with these writes, so the step is offered them
    (the turn's question-focused toolbox left them out, measured: "pin the
    lighthouse note" was offered twenty tools and not `pin_note`)."""
    parsed = acts.parse(step, now)
    if parsed is None or parsed["intent"] not in commands.WRITE_INTENTS:
        return []
    card = acts.preview(session, parsed).get("card") or {}
    names = [str(s.get("name")) for s in card.get("steps") or [] if s.get("name") in WRITE_TOOLS]
    return list(dict.fromkeys(names)) + list(FINDING) if names else []


def plan_writes(session: Session, steps: list[str], now: datetime) -> list[list[str]]:
    """`step_writes` for every step, in order. A step that cannot be
    previewed (a note it names is gone) says so rather than ending the plan."""
    return [_safe(step_writes, session, step, now, ["Could not be previewed; its writes are listed after it runs"])
            for step in steps]


def plan_tools(session: Session, steps: list[str], now: datetime) -> list[list[str]]:
    """`step_tools` for every step, in order."""
    return [_safe(step_tools, session, step, now, []) for step in steps]


def _safe(read, session: Session, step: str, now: datetime, fallback: list[str]) -> list[str]:  # noqa: ANN001
    try:
        return read(session, str(step), now)
    except Exception:  # noqa: BLE001
        logging.getLogger("memorymap.agent").warning("a plan step could not be previewed", exc_info=True)
        return fallback


def edit_diff(before: str, after: str) -> dict:
    """The lines an edit took out and put in, a few of each: the step's diff."""
    removed, added = [], []
    for line in difflib.ndiff((before or "").splitlines(), (after or "").splitlines()):
        if line.startswith("- ") and line[2:].strip():
            removed.append(line[2:])
        elif line.startswith("+ ") and line[2:].strip():
            added.append(line[2:])
    return {"removed": removed[:DIFF_LINES], "added": added[:DIFF_LINES],
            "more": max(0, len(removed) + len(added) - 2 * DIFF_LINES)}


#: The agent reaches this module through the leaf (act_registry.py says why).
act_registry.plans = sys.modules[__name__]
