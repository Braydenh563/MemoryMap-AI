"""How many SQL statements each list endpoint costs, at two sizes.

    PYTHONPATH=src .venv/bin/python scratchpad/probe_list_queries.py

An N+1 is invisible in a test fixture and is the whole cost at a real size,
so the number that matters is not the count but whether it *moves* when the
page gets bigger. Every row below is one endpoint driven at a small page and
a large one over the same notebook: a flat pair is a query per page, a rising
pair is a query per row, and a count that rises with the notebook rather than
the page is a full-table scan somebody is paying for on every load.

Prints a table and exits non-zero if any endpoint's statement count grows with
the page size, so it can be read by a person or run by a session that wants a
yes or no. `tests/test_scale_query_counts.py` is the pinned half; this is the
sweep that finds the next one to pin.
"""

from __future__ import annotations

import os
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

#: Before importing the app: every singleton reads this.
_TMP = tempfile.mkdtemp(prefix="mm-probe-")
os.environ["MEMORYMAP_DATA_DIR"] = _TMP

from sqlalchemy import event  # noqa: E402

from memorymap.core import deps  # noqa: E402

deps.init_app_state(data_dir=Path(_TMP))

from fastapi.testclient import TestClient  # noqa: E402

from memorymap.api.app import create_app  # noqa: E402

#: The notebook the probe builds. Big enough that a per-row query shows and
#: small enough to build in a few seconds.
NOTES = 120
ATTACHMENTS = 40
#: A one-pixel PNG, so an attachment is a real row with a real file.
PIXEL = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06"
    b"\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05"
    b"\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)

#: Each row is (label, path). `{n}` is replaced by the page size.
ENDPOINTS = [
    ("entries", "/entries?limit={n}"),
    ("documents", "/documents?limit={n}"),
    ("media", "/media?limit={n}"),
    ("files gallery", "/files/gallery?limit={n}"),
    ("reminders", "/reminders?limit={n}"),
    ("conversations", "/conversations?limit={n}"),
    ("bookmarks", "/bookmarks?limit={n}"),
    ("timeline", "/timeline?limit={n}"),
    ("learned", "/learned?limit={n}"),
    ("corrections", "/learned/corrections?limit={n}"),
    ("memory", "/memory?limit={n}"),
    ("audit", "/audit?limit={n}"),
    # Not a paged list: a window over the journal, sized by days rather than
    # rows, so its pair is flat by construction and the number to read is the
    # milliseconds, not the growth.
    ("daily window", "/entries/daily?through=2026-09-13&days={n}"),
]


def _statements(engine, call):  # noqa: ANN001
    seen: list[str] = []

    def before(conn, cursor, statement, parameters, context, executemany):  # noqa: ANN001, ARG001
        seen.append(statement)

    event.listen(engine, "before_cursor_execute", before)
    try:
        started = time.perf_counter()
        reply = call()
        elapsed = (time.perf_counter() - started) * 1000
    finally:
        event.remove(engine, "before_cursor_execute", before)
    return seen, elapsed, reply


def main() -> int:
    client = TestClient(create_app())
    engine = deps.get_db().engine

    for i in range(NOTES):
        client.post("/entries", json={"content": f"note {i}: the deployment window should be a Tuesday"})
    made = client.post("/entries", json={"content": "a note with files on it"}).json()
    for i in range(ATTACHMENTS):
        client.post(
            f"/entries/{made['id']}/files",
            files={"file": (f"p{i}.png", PIXEL, "image/png")},
        )
    client.post("/night/run", json={"budget": 100_000})

    print(f"{'endpoint':<16}{'page 5':>10}{'page 100':>12}{'ms @100':>10}  verdict")
    print("-" * 60)
    bad = 0
    for label, path in ENDPOINTS:
        small, _ms, reply = _statements(engine, lambda p=path: client.get(p.format(n=5)))
        if reply.status_code >= 400:
            print(f"{label:<16}{'-':>10}{'-':>12}{'-':>10}  HTTP {reply.status_code}")
            continue
        large, ms, _reply = _statements(engine, lambda p=path: client.get(p.format(n=100)))
        grew = len(large) - len(small)
        verdict = "flat" if grew <= 2 else f"GROWS by {grew} per 95 rows"
        if grew > 2:
            bad += 1
        print(f"{label:<16}{len(small):>10}{len(large):>12}{ms:>10.1f}  {verdict}")

    print()
    print(f"{bad} endpoint(s) cost a query per row." if bad else "No endpoint costs a query per row.")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
