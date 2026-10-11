"""Which device a piece of work is being done for (secscan-1011's decision).

The owner, 2026-10-11: "I dont want to invite potential hacking though my
open lan connection to either my phone or my computer". A phone signed in
over the network may read and write the notebook, but nothing it does may
make this computer install software. The one place that could happen on its
own is the semantic search package's automatic install (on by default, the
owner's choice), which a failed embed starts: a note saved from a phone was
enough. Decision taken: such an install waits until someone at this
computer does something, then runs.

The mark is a context variable set per request (api/app.py `RequestPulse`)
and carried into the background job a request queues (core/jobs.py), so a
phone's note save is still the phone's when its embedding runs later.
Anything with no mark (a launch-time pass, a timer) is this computer's.
"""

from __future__ import annotations

import logging
import threading
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from contextvars import ContextVar

log = logging.getLogger(__name__)

_another: ContextVar[bool] = ContextVar("memorymap_another_device", default=False)
_lock = threading.Lock()
_deferred: dict[str, Callable[[], None]] = {}


def from_another_device() -> bool:
    """True while work is being done for a device other than this computer."""
    return _another.get()


@contextmanager
def acting_for(another: bool) -> Iterator[None]:
    token = _another.set(bool(another))
    try:
        yield
    finally:
        _another.reset(token)


def defer(name: str, run: Callable[[], None]) -> None:
    """Keep `run` until this computer acts; one per name, the newest kept."""
    with _lock:
        _deferred[name] = run
    log.info("%s waits until someone at this computer uses the app", name)


def has_deferred() -> bool:
    return bool(_deferred)


def run_deferred(enqueue) -> int:  # noqa: ANN001  # jobs.enqueue, handed in: jobs reads this module
    """Queue everything waiting on the job pool, as this computer. Called
    when this computer makes a change (a POST, PUT, PATCH or DELETE from
    loopback); returns how many were queued."""
    with _lock:
        waiting = list(_deferred.items())
        _deferred.clear()
    with acting_for(False):
        for name, run in waiting:
            enqueue("extras", run, name=f"Waited for this computer: {name}")
    return len(waiting)


def reset_for_tests() -> None:
    with _lock:
        _deferred.clear()
