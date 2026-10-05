"""When each kind of job last ran, and how it went (INBOX 438).

The owner: "there should be timestamps and success status for when various
things were last ran like the search reindexing etc." Before this, three
partial answers existed and none of them was that:

- `core/taskhistory.py` remembers what *stopped* since the app started, in
  memory, as a ring. It forgets on restart, which is the right lifetime for a
  "what happened while I was here" list and the wrong one for "when did my
  notes last get backed up". Nobody checks that on the day it happened.
- `backup.list_backups` has file times, which says a backup exists but not
  that last night's failed.
- `reindex_status` is the live job, gone on restart, and `None` before the
  first run.

So this keeps **one row per job kind**, in the database (`JobRun`), written
from one place. Every job reports through `job_run`:

    with job_run("reindex") as run:
        ...
        run.result = "indexed 412 notes"

An exception leaving the block marks the run failed with the exception's
message and then propagates it: bookkeeping never swallows a job's error.
`run.cancel("stopped after 3 of 9")` records a stop that is not a failure.

**Bookkeeping must never break the job.** Every write here is wrapped: a
locked database or a missing table costs the line "Last run" and nothing
else. That is also why it reads `deps.peek_db()` and never `get_db()`: a
helper run without an app (a test, a script) records nothing rather than
creating a data directory to hold its note.

**Overlapping runs of one kind** (two imports at once): an older run
finishing while a newer one is still going leaves the row saying "running",
because that is true; once nothing is running, the last to finish is the last
run.
"""

from __future__ import annotations

import logging
import time
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

logger = logging.getLogger("memorymap.jobruns")

#: The kinds this app records, with the words the UI uses. The order is the
#: order of the Background jobs overview. A kind outside this table is still
#: recorded and listed (labelled by its own name): the table is for wording,
#: never a gate.
KINDS: dict[str, str] = {
    "reindex": "Search index rebuild",
    "embeddings-backfill": "Embeddings backfill",
    "backup": "Backup",
    "duplicate-scan": "Duplicate scan",
    "import": "Import",
    "night-shift": "Night shift",
    "model-bench": "Model bench",
    "autonomous": "Autonomous optimisation",
    "resurface": "Resurfacing",
    "link-reasons": "Link reasons",
    "filing": "Filing re-evaluation",
    "ocr": "Reading text from images",
    "caption": "Image captions",
    "model-download": "Model download",
    "embedding-model": "Embedding model download",
    "extra": "Package install",
    "searxng": "SearXNG setup",
}

#: Longest result or error kept: the column is 400 and a line is a line.
_MAX_TEXT = 300


def _clip(text: object) -> str:
    one_line = " ".join(str(text or "").split())
    return one_line if len(one_line) <= _MAX_TEXT else one_line[: _MAX_TEXT - 1] + "…"


def _failure_reason(exc: BaseException) -> str:
    """The short worded reason an exception leaves on the last-run line.

    An `OSError`'s `str()` is "[Errno 28] No space left on device: '/home/x/
    backups/memorymap-...db'": the person's own path and an errno, on a line
    meant for a sentence. Its `strerror` is the sentence ("No space left on
    device"), so that is what is kept; the full text stays in the log.
    """
    if isinstance(exc, OSError) and exc.strerror:
        return str(exc.strerror)
    return str(exc) or type(exc).__name__


#: Where the app's own database comes from when a caller does not hold one.
#: `core/deps.py` sets it at import. Not an import of `deps` from here:
#: `deps` reaches the AI modules, and the AI modules record their jobs, so the
#: name would close a cycle (`tests/test_no_import_cycles.py`). Until it is
#: set, and in a process with no app, nothing is recorded.
_peek_db = lambda: None  # noqa: E731


def set_database_source(peek) -> None:  # noqa: ANN001
    """Called once by `core/deps.py`: a zero-argument callable returning the
    app's `DatabaseManager`, or None when it has not been created."""
    global _peek_db
    _peek_db = peek


def _database(db):  # noqa: ANN001, ANN202
    return db if db is not None else _peek_db()


def peek_database(db=None):  # noqa: ANN001, ANN201
    """`db` if given, else the app's database if it has one, else None.
    Public for `core/jobstore.py`, which records through the same source."""
    return _database(db)


class Run:
    """The handle `job_run` yields. Set `result`; call `cancel` for a stop."""

    def __init__(self, kind: str, db) -> None:  # noqa: ANN001  # DatabaseManager or None
        self.kind = kind
        self.result = ""
        self.started_at = datetime.now(timezone.utc)
        self._t0 = time.monotonic()
        self._db = db
        self._status = "ok"
        self._error = ""
        self._skipped = False
        self._finished = False
        #: What the row said before this run began, for `skip`.
        self._before: dict | None = None

    def skip(self) -> None:
        """This was not a run after all (the switch is off, nothing was due):
        put the row back as it was. The start was written first so a running
        job shows as running; a no-op must not overwrite the last real run."""
        self._skipped = True

    def cancel(self, detail: str = "") -> None:
        """Record a stop the person asked for. Not a failure, never red."""
        self._status = "cancelled"
        self.result = detail or self.result

    def fail(self, reason: object) -> None:
        """Record a failure the job handled itself (it returned an error
        value instead of raising), so the reason still reaches the screen."""
        self._status = "failed"
        self._error = _clip(reason) or "It stopped without saying why."

    # -- the two writes -------------------------------------------------------

    def start(self) -> None:
        if self._db is None:
            return
        try:
            from memorymap.core.database import JobRun

            with self._db.session() as session:
                row = session.get(JobRun, self.kind)
                if row is None:
                    row = JobRun(kind=self.kind)
                    session.add(row)
                else:
                    self._before = {
                        "started_at": row.started_at, "finished_at": row.finished_at,
                        "status": row.status, "result": row.result, "error": row.error,
                        "duration_ms": row.duration_ms,
                    }
                row.started_at = self.started_at
                row.finished_at = None
                row.status = "running"
                row.result = ""
                row.error = ""
                row.duration_ms = None
                session.commit()
        except Exception:  # noqa: BLE001  # bookkeeping must never break the job
            logger.debug("could not record the start of %r", self.kind, exc_info=True)

    def finish(self) -> None:
        """Write the ending. Idempotent: the second call is a no-op, so a
        caller that finishes by hand can still sit inside a `finally`."""
        if self._db is None or self._finished:
            return
        self._finished = True
        try:
            from memorymap.core.database import JobRun

            with self._db.session() as session:
                row = session.get(JobRun, self.kind)
                if self._skipped:
                    if row is not None and row.started_at == self.started_at:
                        if self._before is None:
                            session.delete(row)
                        else:
                            for name, value in self._before.items():
                                setattr(row, name, value)
                        session.commit()
                    return
                if row is None:
                    row = JobRun(kind=self.kind, started_at=self.started_at)
                    session.add(row)
                elif (
                    row.status == "running"
                    and row.started_at is not None
                    and row.started_at > self.started_at
                ):
                    return  # a newer run is still going and owns the row
                row.started_at = self.started_at
                row.finished_at = datetime.now(timezone.utc)
                row.status = self._status
                row.result = _clip(self.result) if self._status != "failed" else ""
                row.error = self._error
                row.duration_ms = round((time.monotonic() - self._t0) * 1000, 1)
                session.commit()
        except Exception:  # noqa: BLE001  # see start
            logger.debug("could not record the end of %r", self.kind, exc_info=True)


def begin(kind: str, db=None) -> Run:  # noqa: ANN001
    """Start a run you will `finish()` yourself, for a job whose body is too
    long to indent into a `with` (a route that already has three try blocks).
    The caller owns calling `finish()` on every way out."""
    run = Run(kind, _database(db))
    run.start()
    return run


@contextmanager
def job_run(kind: str, db=None):  # noqa: ANN001, ANN201
    """Record one run of `kind`: started now, finished when the block leaves.

    `db` is only for a caller that already holds the `DatabaseManager`
    (a worker thread); everyone else gets the app's own, if it has one.
    """
    run = Run(kind, _database(db))
    run.start()
    try:
        yield run
    except BaseException as exc:
        # GeneratorExit and KeyboardInterrupt are not "failed", but nothing
        # may leave the row saying "running" forever either.
        run.fail(_failure_reason(exc))
        run.finish()
        raise
    run.finish()


def note_finished(
    kind: str,
    outcome: str,
    detail: str = "",
    duration_ms: float | None = None,
    db=None,  # noqa: ANN001
) -> None:
    """Record a run that was only seen at its end.

    For the jobs that already report their ending to `taskhistory` and have
    no single place where they begin (a model download, a pip install):
    `taskhistory.record` calls this for those kinds, so the history ring and
    the last-run record cannot disagree about whether something worked.
    `outcome` is taskhistory's vocabulary: completed, failed, cancelled.
    """
    run = Run(kind, _database(db))
    if isinstance(duration_ms, (int, float)) and duration_ms >= 0:
        run.started_at = datetime.now(timezone.utc) - timedelta(milliseconds=duration_ms)
        run._t0 = time.monotonic() - duration_ms / 1000
    if outcome == "failed":
        run.fail(detail or "Failed.")
    elif outcome == "cancelled":
        run.cancel(detail)
    else:
        run.result = detail
    run.finish()


def mark_interrupted(db=None) -> int:  # noqa: ANN001
    """At startup: a row still "running" belongs to a process that is gone.

    Without this a job killed with the app would say "Running…" for ever,
    the one state the screen could never correct on its own.
    """
    db = _database(db)
    if db is None:
        return 0
    try:
        from sqlalchemy import select

        from memorymap.core.database import JobRun

        with db.session() as session:
            rows = list(session.scalars(select(JobRun).where(JobRun.status == "running")))
            for row in rows:
                row.status = "failed"
                row.error = "The app closed before this finished."
                row.finished_at = datetime.now(timezone.utc)
            session.commit()
            return len(rows)
    except Exception:  # noqa: BLE001
        logger.debug("could not mark interrupted jobs", exc_info=True)
        return 0


def last_runs(db=None) -> list[dict]:  # noqa: ANN001
    """Every recorded kind, in the overview's order, plus the kinds this app
    can run but has not yet (`ran: false`), so the screen can say "Not run
    yet" rather than leave a gap that looks like a missing feature."""
    db = _database(db)
    seen: dict[str, dict] = {}
    if db is not None:
        try:
            from sqlalchemy import select

            from memorymap.core.database import JobRun

            with db.session() as session:
                for row in session.scalars(select(JobRun)):
                    seen[row.kind] = {
                        "kind": row.kind,
                        "label": KINDS.get(row.kind, row.kind),
                        "ran": True,
                        "status": row.status,
                        "started_at": row.started_at.isoformat() if row.started_at else None,
                        "finished_at": row.finished_at.isoformat() if row.finished_at else None,
                        "result": row.result or "",
                        "error": row.error or "",
                        "duration_ms": row.duration_ms,
                    }
        except Exception:  # noqa: BLE001
            logger.debug("could not read the job records", exc_info=True)
    out: list[dict] = []
    for kind, label in KINDS.items():
        out.append(
            seen.pop(kind)
            if kind in seen
            else {
                "kind": kind, "label": label, "ran": False, "status": "never",
                "started_at": None, "finished_at": None, "result": "", "error": "",
                "duration_ms": None,
            }
        )
    out.extend(seen.values())
    return out


def describe_night_pass(run: "Run", outcome: dict) -> None:
    """Put a night-shift pass's counts on its run record. `facts.run` answers
    `{"paused": true}` when the switch is off, which is not a run."""
    if outcome.get("paused"):
        run.skip()
        return
    scanned = int(outcome.get("scanned") or 0)
    derived = int(outcome.get("derived") or 0)
    run.result = (
        f"read {scanned} note{'' if scanned == 1 else 's'}, "
        f"found {derived} fact{'' if derived == 1 else 's'}"
    )
    if outcome.get("stopped_reason") == "budget":
        run.result += " (stopped at its budget)"
