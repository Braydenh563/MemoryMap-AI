"""GRAPH_PLAN 518 (2): the text half of /graph's node payload, the old way
(every note read and cleaned per call) against `_note_texts` warm.

    MEMORYMAP_DATA_DIR=/tmp/mm-big PYTHONPATH=src .venv/bin/python scratchpad/graph_payload_time.py
"""

import os
import time
from pathlib import Path

from sqlalchemy import select

from memorymap.api import routes_graph
from memorymap.core.database import DatabaseManager, Entry
from memorymap.entry import manager

db = DatabaseManager(Path(os.environ["MEMORYMAP_DATA_DIR"]) / "memorymap.db")
with db.session() as session:
    entries = list(session.scalars(select(Entry).where(Entry.is_deleted == False)))  # noqa: E712

    def old():
        texts = {e.id: manager.readable_content(e) for e in entries}
        return {i: (routes_graph._preview(t), routes_graph._word_count(t)) for i, t in texts.items()}

    def best(fn, runs=5):
        times = []
        for _ in range(runs):
            t = time.perf_counter()
            fn()
            times.append((time.perf_counter() - t) * 1000)
        return min(times)

    routes_graph._note_texts(entries)  # fill
    assert routes_graph._note_texts(entries) == old()
    print(f"{len(entries)} notes: every call {best(old):.1f} ms, memo warm {best(lambda: routes_graph._note_texts(entries)):.1f} ms")
