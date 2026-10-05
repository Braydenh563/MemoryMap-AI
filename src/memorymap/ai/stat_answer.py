"""The pieces the notebook's statistics and their charts share.

`notebook_stats` answers questions about the notebook and asks `stat_charts`
first whether the question wants a chart; `stat_charts` builds its answers
from the same visibility rule and answer shape. Both read them from here, so
neither module imports the other at load (CodeQL, cyclic import, 2026-10-05).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field

from memorymap.core.database import Entry


@dataclass
class StatAnswer:
    """One computed answer, ready to be spoken or rendered.

    `text` is a complete answer on its own, that is what makes this work with
    the model stopped. `facts` is the same information as rows, so a caller can
    render a list or hand the model something to phrase without re-parsing
    prose.
    """

    kind: str
    text: str
    facts: list[dict] = field(default_factory=list)
    #: A bar or a line the page draws from the same rows (`ai/stat_charts.py`,
    #: WORLD_CLASS_PLAN section 17 row 4), or None for a sentence alone.
    chart: dict | None = None


def _visible(query):
    """Live notes only: binned and private notes are nobody's statistics.

    Private notes are excluded for the reason the rest of the app excludes
    them: a count that changes when a note is made private is a count that
    leaks what is in it.
    """
    return query.where(Entry.deleted_at.is_(None), Entry.is_private.is_(False))


def _tags_of(raw: str) -> list[str]:
    try:
        parsed = json.loads(raw or "[]")
    except (ValueError, TypeError):
        return []
    return (
        [str(tag).strip() for tag in parsed if str(tag).strip()] if isinstance(parsed, list) else []
    )


def _plural(n: int, word: str) -> str:
    return f"{n} {word}" if n == 1 else f"{n} {word}s"
