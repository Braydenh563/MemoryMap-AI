"""What background work has finished, and how it went.

Settings → Background tasks showed only what was *running*, on the reasoning
that a finished job is not a task and a screen that accumulates them is a log.
That is tidy and it is wrong in one specific way, which is the way that
matters: **a job that fails disappears at the moment it becomes interesting.**

A re-index that dies halfway, a model download that 404s, a SearXNG install
that gives up — each vanished from the screen the instant it stopped, leaving
the same empty list as a job that finished perfectly. The only difference the
user could see was that the thing they were waiting for never arrived, and the
only place the reason existed was the log console, which is a different screen
and assumes you know to look.

So: a short, bounded history of what *stopped*, with the outcome and the
reason. Deliberately small in scope —

- **In memory, not the database.** This is "what happened while the app has
  been open", which is the question people actually ask, and it costs no
  schema, no migration and no cleanup job. It goes away on restart, and that
  is the right lifetime for it.
- **Bounded hard.** A ring of the last `MAX_ENTRIES`, so a machine that
  re-indexes on a loop cannot grow this without limit.
- **One entry per finish, never per update.** The running list already reports
  progress; this records endings.

It is a module-level singleton for the same reason the log buffer is: the app
refuses to run with more than one worker (`deps.refuse_multiple_workers`), so
"the process" and "the app" are the same thing here.
"""

from __future__ import annotations

import threading
from collections import deque
from datetime import datetime, timezone

#: How many finished jobs to remember. Enough to cover a first-run sequence
#: (embedding warm-up, a model pull, a re-index, a SearXNG install) several
#: times over, and small enough that nobody has to think about the memory.
MAX_ENTRIES = 40

#: The outcomes a job can end in. `cancelled` is deliberately distinct from
#: `failed`: the user stopping something is not an error, and reporting it in
#: red teaches people to ignore red.
OUTCOMES = ("completed", "failed", "cancelled")

_lock = threading.Lock()
_finished: deque[dict] = deque(maxlen=MAX_ENTRIES)


def record(
    kind: str,
    label: str,
    outcome: str,
    detail: str = "",
    name: str = "",
) -> None:
    """Note that a background job ended. Never raises.

    Called from worker threads at the moment a job stops, so it must not be
    able to turn a finished job into a crashed one — a history entry is the
    least important thing happening at that point.
    """
    try:
        with _lock:
            _finished.append(
                {
                    "kind": kind,
                    "name": name,
                    "label": label,
                    "outcome": outcome if outcome in OUTCOMES else "completed",
                    "detail": (detail or "")[:400],
                    "at": datetime.now(timezone.utc).isoformat(),
                }
            )
    except Exception:  # noqa: BLE001 — bookkeeping must never break the job
        pass


def recent(limit: int = MAX_ENTRIES) -> list[dict]:
    """The most recently finished jobs, newest first."""
    with _lock:
        return list(_finished)[-limit:][::-1]


def clear() -> None:
    """Forget the history — used by the UI's clear button, and between tests."""
    with _lock:
        _finished.clear()
