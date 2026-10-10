"""The `jobs` service: one registry of what is running now (WORLD_CLASS_PLAN
28.1 rule 5, decision 70).

The owner, 2026-10-10: background work must be "visible and stoppable". Most
long jobs already announce themselves somewhere: `routes_tasks.collect()`
assembles the re-index, model pulls, installs, captions and page reads from
their own state, and `jobruns.job_run` books every pass, backup and import.
What had no home was the work a request does while the person waits on it (a
chat answer streaming, a document's AI pass) and a single Stop for all of it.

So this module holds the rest, in memory and for this process only:

    with activity.track("generation", "Answering in Chat") as job:
        for piece in stream:
            if job.stopped:
                break

`jobruns.Run` registers itself here on start, so every `job_run` kind is
listed without its caller knowing; `GET /activity` merges this list with
`collect()`'s rows and `POST /activity/{id}/stop` reaches either.

**Stop is cooperative**, as `core/bgtasks.py` argues: a flag the job reads at
its next boundary, plus an optional `on_stop` for a job that can be cut from
outside (a subprocess, an HTTP stream). Nothing here kills a thread.
"""

from __future__ import annotations

import itertools
import threading
import time
from collections.abc import Callable, Iterator
from contextlib import contextmanager

_lock = threading.Lock()
_ids = itertools.count(1)
_jobs: dict[str, Job] = {}


class Job:
    """One running piece of work, as the Activity panel shows it."""

    def __init__(
        self,
        kind: str,
        label: str,
        on_stop: Callable[[], object] | None,
        stoppable: bool,
        lease: float | None = None,
    ) -> None:
        self.id = f"job-{next(_ids)}"
        self.kind = kind
        self.label = label
        self.detail = ""
        self.progress: float | None = None
        self.started = time.time()
        self.on_stop = on_stop
        self.stoppable = stoppable or on_stop is not None
        self._stop = threading.Event()
        #: A job run somewhere else (a code run in the browser's sandbox)
        #: holds a lease it renews with `touch`; one not renewed in time is
        #: gone, so a closed tab does not leave a row that never ends.
        self.lease = lease
        self.beat = time.monotonic()

    @property
    def expired(self) -> bool:
        return self.lease is not None and time.monotonic() - self.beat > self.lease

    def touch(self) -> None:
        self.beat = time.monotonic()

    @property
    def stopped(self) -> bool:
        return self._stop.is_set()

    def update(self, done: int | None = None, total: int | None = None, detail: str | None = None) -> None:
        if done is not None and total:
            self.progress = max(0.0, min(1.0, done / total))
        if detail is not None:
            self.detail = detail[:200]

    def request_stop(self) -> tuple[bool, str]:
        if not self.stoppable:
            return False, "This job cannot be stopped part way; it will finish on its own."
        self._stop.set()
        if self.on_stop is not None:
            try:
                self.on_stop()
            except Exception:  # noqa: BLE001  # a failed stop is a message, not a 500
                return True, "Asked it to stop; it will end at its next step."
        return True, f"Stopping {self.label.lower()}."

    def row(self) -> dict:
        return {
            "id": self.id,
            "kind": self.kind,
            "label": self.label,
            "detail": self.detail,
            "progress": self.progress,
            "started": self.started,
            "stoppable": self.stoppable,
            "queued": False,
        }


def start(
    kind: str,
    label: str,
    *,
    on_stop: Callable[[], object] | None = None,
    stoppable: bool = False,
    lease: float | None = None,
) -> Job:
    job = Job(kind, label, on_stop, stoppable, lease)
    with _lock:
        _prune()
        _jobs[job.id] = job
    return job


def _prune() -> None:
    """Drop the leased jobs nobody renewed. Called with `_lock` held."""
    for job_id in [job_id for job_id, job in _jobs.items() if job.expired]:
        del _jobs[job_id]


def count(kind: str) -> int:
    with _lock:
        _prune()
        return sum(1 for job in _jobs.values() if job.kind == kind)


def finish(job: Job | None) -> None:
    if job is None:
        return
    with _lock:
        _jobs.pop(job.id, None)


@contextmanager
def track(kind: str, label: str, *, on_stop: Callable[[], object] | None = None, stoppable: bool = True) -> Iterator[Job]:
    """Register for the length of the block. `stoppable` defaults to True
    because a block that loops is expected to read `job.stopped`."""
    job = start(kind, label, on_stop=on_stop, stoppable=stoppable)
    try:
        yield job
    finally:
        finish(job)


def tracked_stream(kind: str, label: str, lines: Iterator) -> Iterator:
    """A streamed response that shows in Activity and ends on Stop.

    Closing the inner generator runs its `finally`, which is what closes the
    HTTP stream to the model, so the runner stops generating too."""
    with track(kind, label) as job:
        try:
            for line in lines:
                yield line
                if job.stopped:
                    break
        finally:
            close = getattr(lines, "close", None)
            if close is not None:
                close()


def get(job_id: str) -> Job | None:
    with _lock:
        _prune()
        return _jobs.get(job_id)


def stop(job_id: str) -> tuple[bool, str]:
    job = get(job_id)
    if job is None:
        return False, "That job has already finished."
    return job.request_stop()


def stop_kind(kind: str) -> int:
    """Stop every job of one kind (every generation, before the model is
    unloaded). Returns how many were asked."""
    with _lock:
        jobs = [job for job in _jobs.values() if job.kind == kind]
    return sum(1 for job in jobs if job.request_stop()[0])


def snapshot() -> list[dict]:
    with _lock:
        _prune()
        return [job.row() for job in sorted(_jobs.values(), key=lambda j: -j.started)]


def clear() -> None:
    """Tests only: the registry is process-global, like `taskhistory`."""
    with _lock:
        _jobs.clear()
