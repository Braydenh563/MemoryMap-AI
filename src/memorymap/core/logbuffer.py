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


class BufferHandler(logging.Handler):
    """A logging handler that appends records to the ring buffer."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            message = record.getMessage()
        except Exception:  # a bad %-format must never kill logging
            message = str(record.msg)
        with _lock:
            _records.append(
                {
                    "time": datetime.now(timezone.utc).isoformat(),
                    "level": record.levelname,
                    "logger": record.name,
                    "message": message,
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


def clear() -> None:
    with _lock:
        _records.clear()
