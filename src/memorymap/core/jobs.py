"""One bounded pool for the background work an upload starts.

**The finding this replaces** (WORLD_CLASS_PLAN A3, and section 4's B2 in
smaller form): every upload spawned up to three `threading.Thread`s of its
own, plus a document read, and nothing anywhere counted them. Fourteen
`Thread(` sites, no semaphore, no queue, no pool. A folder of 200 pictures
was therefore 600 threads, all of them arriving at one Tesseract binary and
one local model at the same moment, and the failure it produces is not a
crash: it is a machine that stops answering while every job makes a little
progress, plus 200 SQLAlchemy sessions opened at once against one SQLite
file. Unbounded concurrency against a single-threaded resource is slower
than a queue, not faster.

**Two lanes, not one queue and not a lane per kind.** The two resources
behave differently enough that one width is wrong for both:

- `cpu`: Tesseract and the document extractors. Real parallelism helps, up
  to the core count, and past four the returns stop mattering on the kind of
  machine this app runs on while the memory does not.
- `model`: every call into the local model (captions, vision OCR, the
  entry filer). **One worker, deliberately.** A local model serves one
  request at a time; two concurrent calls interleave into one slower pair,
  and on a small machine the second load can fail outright for memory.

A kind nobody mapped lands on the default lane rather than vanishing, which
is the failure mode a `KeyError` here would have: a caption that is silently
never taken.

**Why jobs are dropped at shutdown rather than drained.** `shutdown` has a
deadline because a shutdown that waits is the hang it exists to prevent
(`core/bgtasks.py`'s docstring makes the same argument for cancellation).
Nothing here is lost by dropping it: every job re-derives its result from a
row that is already committed, so the next launch can redo it, and a caption
that never arrives is a missing caption rather than a corrupt notebook. The
job in flight is not interrupted, for the same reason `bgtasks` never kills a
thread: Python cannot do it safely and the work writes to a notebook the
user cares about. Workers are daemons, so the process still exits on time;
`shutdown` returns False to say plainly that one was still running.

**The activity panel needs no new frontend.** `pending()` returns rows in
`/tasks`'s shape (`routes_tasks.collect`), so queued and running jobs appear
in the panel that already lists the readings `core/filejobs.py` announces.
"""

from __future__ import annotations

import logging
import os
import queue
import threading
import time
from collections.abc import Callable

logger = logging.getLogger("memorymap.jobs")


def _cpu_width() -> int:
    """Workers for the Tesseract and extractor lane.

    Capped at four: past that the contention on one SQLite file and the
    memory each Tesseract process holds cost more than the extra parallelism
    returns, and this app runs on laptops.
    """
    return max(1, min(4, os.cpu_count() or 1))


#: Lane -> how many workers it gets. `model` is 1 on purpose; see the module
#: docstring. Read by `tests/test_jobs_pool.py`, which fails if it grows.
LANE_WIDTHS: dict[str, int] = {"cpu": _cpu_width(), "model": 1}

#: The lane each job kind belongs on. A kind missing from here lands on
#: `DEFAULT_LANE` with a debug line rather than raising.
KIND_LANES: dict[str, str] = {
    "ocr": "cpu",
    "document": "cpu",
    "caption": "model",
    "vision": "model",
    "vision-pdf": "model",
    "file-entry": "model",
}

DEFAULT_LANE = "cpu"

#: What the activity panel calls each kind. Sentence case, no exclamation:
#: standing order 6.
LABELS: dict[str, str] = {
    "ocr": "Reading text from an image",
    "document": "Reading an attached document",
    "caption": "Describing an image",
    "vision": "Reading an image with the vision model",
    "vision-pdf": "Reading a scan with the vision model",
    "file-entry": "Filing a note",
}


class _Job:
    """One queued piece of work. A plain object rather than a dataclass so
    `__slots__` keeps 200 of them cheap during a bulk upload."""

    __slots__ = ("seq", "kind", "func", "args", "kwargs", "name", "queued_at")

    def __init__(
        self,
        seq: int,
        kind: str,
        func: Callable[..., object],
        args: tuple,
        kwargs: dict,
        name: str,
    ) -> None:
        self.seq = seq
        self.kind = kind
        self.func = func
        self.args = args
        self.kwargs = kwargs
        self.name = name
        self.queued_at = time.time()


class Pool:
    """A fixed set of daemon workers per lane, fed by one queue per lane.

    Instantiable so the tests can pin a width rather than measure against
    whatever the sandbox's core count happens to be; the app uses the module
    singleton below.
    """

    def __init__(
        self,
        widths: dict[str, int] | None = None,
        kind_lanes: dict[str, str] | None = None,
    ) -> None:
        self._widths = {lane: max(1, int(width)) for lane, width in (widths or LANE_WIDTHS).items()}
        if not self._widths:  # pragma: no cover - defensive
            self._widths = {DEFAULT_LANE: 1}
        self._kind_lanes = dict(kind_lanes if kind_lanes is not None else KIND_LANES)
        self._default_lane = DEFAULT_LANE if DEFAULT_LANE in self._widths else next(iter(self._widths))
        self._queues: dict[str, queue.Queue] = {lane: queue.Queue() for lane in self._widths}
        self._lock = threading.Lock()
        self._workers: list[threading.Thread] = []
        self._queued: dict[int, _Job] = {}
        self._running: dict[int, _Job] = {}
        self._seq = 0
        self._started = False
        self._stopping = threading.Event()

    # -- starting -----------------------------------------------------------

    def start(self) -> None:
        """Bring the workers up. Idempotent, and called by `enqueue`, so a
        test or a script that never enqueues never starts a thread at all."""
        with self._lock:
            if self._started or self._stopping.is_set():
                return
            self._started = True
            for lane, width in self._widths.items():
                for index in range(width):
                    worker = threading.Thread(
                        target=self._work,
                        args=(lane,),
                        name=f"mm-job-{lane}-{index}",
                        daemon=True,
                    )
                    self._workers.append(worker)
                    worker.start()

    # -- enqueueing ---------------------------------------------------------

    def lane_for(self, kind: str) -> str:
        lane = self._kind_lanes.get(kind)
        if lane is None or lane not in self._queues:
            logger.debug("job kind %r has no lane; using %s", kind, self._default_lane)
            return self._default_lane
        return lane

    def enqueue(
        self,
        kind: str,
        func: Callable[..., object],
        *args: object,
        name: str = "",
        **kwargs: object,
    ) -> int:
        """Queue `func(*args, **kwargs)` on `kind`'s lane. Returns the job id.

        Never raises for a full queue (the queues are unbounded) and never
        blocks the caller, which is the whole contract the `*_in_background`
        helpers had and kept.
        """
        lane = self.lane_for(kind)
        self.start()
        with self._lock:
            if self._stopping.is_set():
                logger.debug("dropping a %s job: the pool is shutting down", kind)
                return 0
            self._seq += 1
            job = _Job(self._seq, kind, func, tuple(args), dict(kwargs), name)
            self._queued[job.seq] = job
        self._queues[lane].put(job)
        return job.seq

    # -- the worker ---------------------------------------------------------

    def _work(self, lane: str) -> None:
        work_queue = self._queues[lane]
        while True:
            job = work_queue.get()
            try:
                if job is None:
                    return
                with self._lock:
                    self._queued.pop(job.seq, None)
                    if self._stopping.is_set():
                        # Drained, not run: this is what makes shutdown fast
                        # with a long queue behind it.
                        continue
                    self._running[job.seq] = job
                try:
                    job.func(*job.args, **job.kwargs)
                except Exception:
                    # One bad job used to be one dead thread and no record.
                    # `exc_info` because the stack is the whole value here:
                    # these run with no request to attach an error to.
                    logger.warning("background %s job failed", job.kind, exc_info=True)
                finally:
                    with self._lock:
                        self._running.pop(job.seq, None)
            finally:
                work_queue.task_done()

    # -- reporting ----------------------------------------------------------

    def queued_count(self) -> int:
        with self._lock:
            return len(self._queued)

    def running_count(self) -> int:
        with self._lock:
            return len(self._running)

    def pending(self) -> list[dict]:
        """Queued and running jobs as `/tasks` rows, oldest first.

        Oldest first for the same reason `filejobs.running` is: the panel
        reads as a queue, and the job someone is wondering about is the one
        that has been waiting longest.
        """
        with self._lock:
            jobs = sorted(
                list(self._running.values()) + list(self._queued.values()),
                key=lambda job: job.seq,
            )
            running = set(self._running)
        rows = []
        for job in jobs:
            label = LABELS.get(job.kind, "Background job")
            waiting = job.seq not in running
            rows.append(
                {
                    "kind": f"job-{job.kind}",
                    "name": job.name,
                    "label": label,
                    "detail": f"{job.name} (queued)" if waiting and job.name else (job.name or ("queued" if waiting else "")),
                    #: A single model call reports no progress, and a queued
                    #: job has made none: `None` is the panel's own
                    #: "running, no percentage" state and the truth here.
                    "progress": None,
                    "log": [],
                }
            )
        return rows

    # -- stopping -----------------------------------------------------------

    def shutdown(self, deadline: float = 5.0) -> bool:
        """Stop taking work, drop what is queued, join the workers.

        Returns True when every worker stopped inside `deadline`. False means
        one was inside a job (a model call that cannot be interrupted); the
        workers are daemons, so the process exits regardless, and the answer
        is False rather than a longer wait because a slow quit is the bug
        this deadline exists for.
        """
        self._stopping.set()
        with self._lock:
            workers = list(self._workers)
            dropped = len(self._queued)
            self._queued.clear()
            started = self._started
        if not started:
            return True
        for lane, work_queue in self._queues.items():
            for _ in range(self._widths[lane]):
                work_queue.put(None)
        ends = time.monotonic() + max(0.0, deadline)
        for worker in workers:
            worker.join(max(0.0, ends - time.monotonic()))
        alive = [worker.name for worker in workers if worker.is_alive()]
        if dropped or alive:
            logger.info(
                "background pool stopped: %d job(s) dropped, %d worker(s) still busy%s",
                dropped,
                len(alive),
                f" ({', '.join(alive)})" if alive else "",
            )
        return not alive


# -- the app's one pool -------------------------------------------------------

_default: Pool | None = None
_default_lock = threading.Lock()


def pool() -> Pool:
    """The process's pool, made on first use.

    Lazy rather than built at import: `create_app()` is called by hundreds of
    tests, and a module that starts threads at import time makes every one of
    them pay for workers it never uses.
    """
    global _default
    with _default_lock:
        if _default is None:
            _default = Pool()
        return _default


def enqueue(kind: str, func: Callable[..., object], *args: object, name: str = "", **kwargs: object) -> int:
    return pool().enqueue(kind, func, *args, name=name, **kwargs)


def pending() -> list[dict]:
    return pool().pending()


def shutdown(deadline: float = 5.0) -> bool:
    """Called from the app's lifespan. Never raises: a shutdown handler that
    throws leaves the rest of the teardown unrun.

    The singleton is dropped as well as stopped, so the next `pool()` builds a
    fresh one. That matters in exactly one place and it is not production: a
    test process creates and tears down many apps, and a pool left in its
    stopped state would silently drop every job of every app after the first,
    which is the "feature that never ran once" shape (CLAUDE.md section 6).
    """
    global _default
    with _default_lock:
        current = _default
        _default = None
    if current is None:
        return True
    try:
        return current.shutdown(deadline=deadline)
    except Exception:  # noqa: BLE001  # a failed teardown must not stop the rest
        logger.warning("the background pool did not shut down cleanly", exc_info=True)
        return False
