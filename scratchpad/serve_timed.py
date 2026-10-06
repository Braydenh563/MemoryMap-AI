"""Run the app with per-phase timers on background filing, printing to stderr.

  PYTHONPATH=src MEMORYMAP_DATA_DIR=<dir> python scratchpad/serve_timed.py 8845

Same patches as filing_profile.py, but inside a real uvicorn so the numbers
include the event loop, the pool thread and the poller (INBOX 434).
"""
import sys
import threading
import time

import uvicorn

from memorymap.ai import embeddings as emb_mod
from memorymap.ai import janitor, lexical_filing
from memorymap.api import routes_entries
from memorymap.core import deps
from memorymap.entry import manager


def timed(label, fn):
    def wrapper(*a, **k):
        t = time.perf_counter()
        try:
            return fn(*a, **k)
        finally:
            sys.stderr.write(f"[phase] {label:40s} {(time.perf_counter() - t) * 1000:8.1f} ms  thread={threading.current_thread().name}\n")
            sys.stderr.flush()
    return wrapper


def patch(obj, name, label):
    setattr(obj, name, timed(label, getattr(obj, name)))


patch(janitor, "_ask_llm", "ask model")
patch(janitor, "_best_centroid_match", "centroid match")
patch(janitor, "_knn_match", "knn")
patch(lexical_filing, "lexical_category", "lexical category")
patch(routes_entries, "_file_entry_now", "categorise total")
patch(manager, "record_filing", "record_filing")
patch(deps, "store_quietly", "store_quietly")
patch(routes_entries, "_find_near_duplicate", "near-duplicate")
patch(routes_entries, "_keep_suggestions", "keep suggestions")
patch(emb_mod.EmbeddingService, "_embed_uncached", "model encode")
patch(routes_entries, "_file_entry_in_background", "WHOLE JOB")

from memorymap.api.app import create_app  # noqa: E402

uvicorn.run(create_app(), port=int(sys.argv[1]))
