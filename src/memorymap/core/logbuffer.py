"""In-memory ring buffer of log records for the Settings → Logs viewer.

Keeps the last few hundred records from the app AND uvicorn so the user
can see what the server is doing without hunting for a terminal. Memory
only — nothing is written to disk, in keeping with the privacy posture.
"""

from __future__ import annotations

import logging
import threading
from collections import deque
from datetime import datetime, timezone

MAX_RECORDS = 500

_records: deque[dict] = deque(maxlen=MAX_RECORDS)
_lock = threading.Lock()

# How many records the ring buffer has thrown away since the last clear, and
# the timestamp of the oldest one still held.
#
# A deque with a maxlen drops silently, which makes a busy hour and a quiet one
# look identical in the viewer: 500 rows either way, and no way to tell whether
# the top row is the beginning of the story or the middle of it. That matters
# most in exactly the case the viewer exists for — chasing something that has
# been failing repeatedly, where the repetition itself is what pushed the first
# occurrence out.
_dropped = 0
_dropped_since: str | None = None


# Windows' asyncio Proactor loop logs an "Exception in callback
# _ProactorBasePipeTransport._call_connection_lost" whenever a client drops a
# connection abruptly — a browser reload mid-stream does it every time. It is
# harmless and nothing can be done about it from here, but it fills the log
# viewer with red ERROR lines that look like a broken app.
_NOISE_MARKERS = (
    "_ProactorBasePipeTransport._call_connection_lost",
    "ConnectionResetError",
)


class NoiseFilter(logging.Filter):
    """Drop known-benign platform chatter before it reaches the buffer."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            text = record.getMessage()
        except Exception:  # noqa: BLE001 — a bad format string isn't noise
            return True
        return not any(marker in text for marker in _NOISE_MARKERS)


# Anything that could let one logged value pose as a second log line. The
# viewer renders one record per row, so a newline inside a message would draw a
# forged row — and the text being logged includes things the user typed (chat
# questions) and things the internet said (page titles). Control characters go
# for the same reason: they can rewrite what a terminal shows.
_CONTROL_CHARS = {c: None for c in range(0x20) if c not in (0x09,)}
_CONTROL_CHARS[0x7F] = None
MAX_MESSAGE_CHARS = 2000
MAX_VALUE_CHARS = 200


def sanitise(text: str) -> str:
    """Flatten a message to one printable line, capped in length."""
    # The line breaks are stripped explicitly rather than only via the
    # translation table below: they are the whole attack, and spelling them out
    # is what makes this readable as a barrier — to a reviewer and to CodeQL.
    cleaned = str(text).replace("\r\n", " ").replace("\n", " ").replace("\r", " ")
    cleaned = cleaned.translate(_CONTROL_CHARS)
    if len(cleaned) > MAX_MESSAGE_CHARS:
        cleaned = cleaned[: MAX_MESSAGE_CHARS - 1] + "…"
    return cleaned


def safe_value(value: object, limit: int = MAX_VALUE_CHARS) -> str:
    """Make one untrusted value safe to interpolate into a log message.

    `sanitise` runs at the ring buffer, which protects the Settings → Logs
    viewer and nothing else: the terminal, and any handler a user attaches, see
    the raw record. Anything the user typed or the internet said therefore has
    to be cleaned at the *call site* — this is that call.

    Truncation is part of the job. A forged row is the obvious risk; a chat
    question long enough to push every real record out of a 500-record buffer
    is the quieter one.
    """
    cleaned = sanitise(value if isinstance(value, str) else repr(value))
    if len(cleaned) > limit:
        cleaned = cleaned[: limit - 1] + "…"
    return cleaned


class BufferHandler(logging.Handler):
    """A logging handler that appends records to the ring buffer."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            message = record.getMessage()
        except Exception:  # a bad %-format must never kill logging
            message = str(record.msg)
        # An exception logged with exc_info carries the traceback separately;
        # keeping it is the difference between "something failed" and knowing
        # what, which is the whole point of the viewer.
        trace = ""
        if record.exc_info:
            try:
                trace = self.format(record).split("\n", 1)[-1]
            except Exception:  # formatting must never kill logging either
                trace = ""
        global _dropped, _dropped_since
        with _lock:
            # A full deque discards the oldest on append, so count it here —
            # afterwards there is nothing left to notice.
            if len(_records) == MAX_RECORDS:
                if not _dropped:
                    _dropped_since = _records[0]["time"]
                _dropped += 1
            _records.append(
                {
                    "time": datetime.now(timezone.utc).isoformat(),
                    "level": record.levelname,
                    "logger": record.name,
                    "message": sanitise(message),
                    # Kept as real multi-line text: the viewer renders it in a
                    # fold, not as rows, so it can't forge a record.
                    "trace": trace[:8000],
                }
            )


def install() -> None:
    """Attach the buffer to the root logger and uvicorn's loggers.

    Idempotent — calling twice (tests, reloads) adds nothing. Uvicorn
    configures its own loggers with propagate=False, so the root handler
    alone would miss request logs; we attach to them directly."""
    handler = BufferHandler()
    handler.addFilter(NoiseFilter())
    targets = ["", "uvicorn", "uvicorn.access", "uvicorn.error"]
    for name in targets:
        logger = logging.getLogger(name)
        if not any(isinstance(h, BufferHandler) for h in logger.handlers):
            logger.addHandler(handler)
    # asyncio logs the Proactor noise on its own logger; filter it at source so
    # it doesn't reach the terminal either.
    asyncio_logger = logging.getLogger("asyncio")
    if not any(isinstance(f, NoiseFilter) for f in asyncio_logger.filters):
        asyncio_logger.addFilter(NoiseFilter())
    root = logging.getLogger()
    if root.level > logging.INFO or root.level == logging.NOTSET:
        root.setLevel(logging.INFO)


def recent(limit: int = 200) -> list[dict]:
    """Newest records last (natural reading order), capped at `limit`."""
    with _lock:
        records = list(_records)
    return records[-limit:]


def stats(limit: int = 200) -> dict:
    """What the viewer needs to say how complete its picture is.

    `dropped` counts records the ring buffer discarded; `truncated` counts ones
    it still holds but this request did not ask for. They are different
    problems — the first is gone for good, the second is one bigger `limit`
    away — and telling a reader they are the same would send them looking in
    the wrong place.
    """
    with _lock:
        held = len(_records)
        return {
            "held": held,
            "capacity": MAX_RECORDS,
            "dropped": _dropped,
            "dropped_since": _dropped_since,
            "truncated": max(0, held - limit),
        }


def clear() -> None:
    global _dropped, _dropped_since
    with _lock:
        _records.clear()
        # The count describes the records that *were* here; clearing them
        # clears it too, or the viewer would report a gap in a log it had
        # just emptied itself.
        _dropped = 0
        _dropped_since = None
