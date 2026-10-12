"""Whether a failure is the model server being down.

Kept in a module of its own, importing nothing from the package, so the two
readers that use it (captioning and vision OCR) do not import each other.
"""

from __future__ import annotations


def server_unreachable(exc: BaseException) -> bool:
    """True when `exc` (or what it was raised from) is a refused or dropped
    connection: the model server is not running, which is one plain line in
    the log, not a page of traceback (the owner, 2026-10-12)."""
    seen = 0
    while exc is not None and seen < 8:
        if isinstance(exc, (ConnectionError, TimeoutError)) or type(exc).__name__ in ("ConnectionError", "NewConnectionError", "MaxRetryError"):
            return True
        exc = exc.__cause__ or exc.__context__
        seen += 1
    return False
