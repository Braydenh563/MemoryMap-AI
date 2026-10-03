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

**Overlapping runs of one kind** (two imports at once): the row follows the
newest *start*. An older run finishing while a newer one is going leaves the
row saying "running", because that is true.
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
    "autonomous": "Autonomous optimisation",
    "resurface": "Resurfacing",
    "link-reasons": "Link reasons",
    "filing": "Filing re-evaluation",
    "ocr": "OCR pass",
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


def _database(db):  # noqa: ANN001, ANN202
    if db is not None:
        return db
    from memorymap.core import deps

    return deps.peek_db()


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

    def cancel(self, detail: str = "") -> None:
        """Record a stop the person asked for. Not a failure, never red."""
        self._status = "cancelled"
        self.result = detail or self.result

    def fail(self, reason: object) -> None:
        """Record a failure the job handled itself (it returned an error
        value instead of raising), so the reason still reaches the screen."""
        self._status = "failed"
        self._error = _clip(reason)

    # -- the two writes -------------------------------------------------------

    def _write_start(self) -> None:
        if self._db is None:
            return
        try:
            from memorymap.core.database import JobRun

            with self._db.session() as session:
                row = session.get(JobRun, self.kind)
                if row is None:
                    row = JobRun(kind=self.kind)
                    session.add(row)
                row.started_at = self.started_at
                row.finished_at = None
                row.status = "running"
                row.result = ""
                row.error = ""
                row.duration_ms = None
                session.commit()
        except Exception:  # noqa: BLE001  # bookkeeping must never break the job
            logger.debug("could not record the start of %r", self.kind, exc_info=True)

    def _write_finish(self) -> None:
        if self._db is None:
            return
        try:
            from memorymap.core.database import JobRun

            with self._db.session() as session:
                row = session.get(JobRun, self.kind)
                if row is None:
                    row = JobRun(kind=self.kind, started_at=self.started_at)
                    session.add(row)
                elif row.started_at is not None and row.started_at > self.started_at:
                    return  # a newer run owns the row (see the module docstring)
                row.started_at = self.started_at
                row.finished_at = datetime.now(timezone.utc)
                row.status = self._status
                row.result = _clip(self.result) if self._status != "failed" else ""
                row.error = self._error
                row.duration_ms = round((time.monotonic() - self._t0) * 1000, 1)
                session.commit()
        except Exception:  # noqa: BLE001  # see _write_start
            logger.debug("could not record the end of %r", self.kind, exc_info=True)


@contextmanager
def job_run(kind: str, db=None):  # noqa: ANN001, ANN201
    """Record one run of `kind`: started now, finished when the block leaves.

    `db` is only for a caller that already holds the `DatabaseManager`
    (a worker thread); everyone else gets the app's own, if it has one.
    """
    run = Run(kind, _database(db))
    run._write_start()
    try:
        yield run
    except BaseException as exc:
        # GeneratorExit and KeyboardInterrupt are not "failed", but nothing
        # may leave the row saying "running" forever either.
        run.fail(str(exc) or type(exc).__name__)
        run._write_finish()
        raise
    run._write_finish()


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
    run._write_finish()


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
