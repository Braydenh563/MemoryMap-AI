"""Where background filing spends its time (INBOX 434).

Creates a seeded notebook through the API with the REAL embedding model (no
chat model, so the lexical/semantic path is what runs, as the capture audit
sees it), then saves N notes with `defer_filing` and times each phase of
`_file_entry_in_background`, plus the SQL statements it issues.

  PYTHONPATH=src /home/user/MemoryMap-AI/.venv/bin/python scratchpad/filing_profile.py [N] [SEED_NOTES]

Prints inclusive milliseconds per phase (median over the N notes), the time to
`filing_state != pending` ("settled", what captureaudit calls filed_ms) and
to the end of the job, the SQL statement count and the model encodes.
"""
from __future__ import annotations

import os
import statistics
import sys
import tempfile
import threading
import time
from collections import defaultdict
from pathlib import Path

N = int(sys.argv[1]) if len(sys.argv) > 1 else 12
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 60

data = Path(tempfile.mkdtemp(prefix="mm-filprof-"))
os.environ["MEMORYMAP_DATA_DIR"] = str(data)
os.environ["MEMORYMAP_NO_AUTO_INSTALL"] = "1"

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import event  # noqa: E402

from memorymap.ai import embeddings as emb_mod  # noqa: E402
from memorymap.ai import janitor, lexical_filing  # noqa: E402
from memorymap.api import routes_entries  # noqa: E402
from memorymap.api.app import create_app  # noqa: E402
from memorymap.core import deps  # noqa: E402
from memorymap.entry import manager  # noqa: E402

deps.init_app_state(data_dir=data)
client = TestClient(create_app())

TOPICS = {
    "Cooking": ["simmer the tomato sauce with basil and garlic", "bake sourdough bread at 230 degrees", "marinate the chicken in lemon and herbs", "whisk eggs for the omelette with cheese"],
    "Work": ["quarterly planning meeting with the product team", "review the pull request for the billing service", "send the budget spreadsheet to finance", "standup notes about the release blockers"],
    "Fitness": ["ran five kilometres in the park this morning", "deadlift and squat session at the gym", "stretching routine for tight hamstrings", "cycling training plan for the weekend"],
    "Travel": ["book flights to lisbon and a hotel near the river", "packing list for the hiking trip", "visa requirements for the japan visit", "train timetable from paris to lyon"],
    "Garden": ["plant tomatoes and basil in raised beds", "prune the roses before winter frost", "compost heap needs turning", "water the greenhouse seedlings daily"],
}
for i in range(SEED):
    cat = list(TOPICS)[i % len(TOPICS)]
    base = TOPICS[cat][(i // len(TOPICS)) % 4]
    client.post("/entries", json={"content": f"{base} number {i}", "category": cat, "tags": [cat.lower()]})

phases: dict[str, list[float]] = defaultdict(list)
cur: dict[str, float] = defaultdict(float)
counts: dict[str, int] = defaultdict(int)


def timed(label, fn):
    def wrapper(*a, **k):
        t = time.perf_counter()
        try:
            return fn(*a, **k)
        finally:
            cur[label] += (time.perf_counter() - t) * 1000
    return wrapper


def patch(obj, name, label):
    setattr(obj, name, timed(label, getattr(obj, name)))


patch(janitor, "_ask_llm", "categorise: ask model (none running)")
patch(janitor, "_best_centroid_match", "categorise: centroid match")
patch(janitor, "_knn_match", "categorise: nearest neighbours")
patch(lexical_filing, "lexical_category", "categorise: lexical category")
patch(routes_entries, "_file_entry_now", "categorise (total)")
patch(manager, "record_filing", "record_filing")
patch(deps, "store_quietly", "embed + store vector (store_quietly)")
patch(routes_entries, "_find_near_duplicate", "near-duplicate search")
patch(routes_entries, "_keep_suggestions", "keep tag suggestions")
patch(lexical_filing, "suggest_tags", "  of which lexical suggest_tags")
patch(emb_mod.EmbeddingService, "_embed_uncached", "model encode (uncached embeds)")
_real_embed_text = emb_mod.EmbeddingService.embed_text


def _counting_embed_text(self, text):
    counts["embed_text calls"] += 1
    return _real_embed_text(self, text)


emb_mod.EmbeddingService.embed_text = _counting_embed_text
_real_uncached = emb_mod.EmbeddingService._embed_uncached


def _count_uncached(self, text):
    counts["model encodes"] += 1
    return _real_uncached(self, text)


emb_mod.EmbeddingService._embed_uncached = _count_uncached

stmts = {"n": 0}
event.listen(deps.get_db().engine, "before_cursor_execute",
             lambda *a, **k: stmts.__setitem__("n", stmts["n"] + 1))

t = time.perf_counter()
deps.get_embeddings().embed_text("warm up")
print(f"model load + first encode: {(time.perf_counter() - t) * 1000:.0f} ms (once per launch)")
deps.get_embeddings().clear_embed_cache()

settled, job_total, queries, encodes, embeds = [], [], [], [], []
# The job runs on this script's own thread so its timers are per note: the
# queue's copy of it, and `GET /filing`'s re-queue of a pending note, would
# otherwise run the same job beside it and double every number.
routes_entries._queue_filing = lambda entry: None
from memorymap.core.database import Entry  # noqa: E402


def _state(entry_id):
    with deps.get_db().session() as s:
        return s.query(Entry.filing_state).filter(Entry.id == entry_id).scalar()


for i in range(N):
    cat = list(TOPICS)[i % len(TOPICS)]
    text = f"{TOPICS[cat][i % 4]} extra detail {i} on the weekend plan"
    created = client.post("/entries", json={"content": text, "defer_filing": True}).json()
    cur.clear()
    counts.clear()
    stmts["n"] = 0
    t0 = time.perf_counter()
    th = threading.Thread(target=routes_entries._file_entry_in_background, args=(created["id"], "default"))
    th.start()
    t_settled = None
    while th.is_alive():
        if t_settled is None and _state(created["id"]) != "pending":
            t_settled = (time.perf_counter() - t0) * 1000
        time.sleep(0.002)
    th.join()
    total = (time.perf_counter() - t0) * 1000
    settled.append(t_settled if t_settled is not None else total)
    job_total.append(total)
    queries.append(stmts["n"])
    encodes.append(counts["model encodes"])
    embeds.append(counts["embed_text calls"])
    for k, v in cur.items():
        phases[k].append(v)
    deps.get_embeddings().clear_embed_cache()

print(f"\nnotebook: {SEED} filed notes, {N} deferred saves, median ms")
for k in sorted(phases, key=lambda k: -statistics.median(phases[k])):
    print(f"  {k:46s} {statistics.median(phases[k]):8.1f}")
print(f"  {'-> settled (filing_state leaves pending)':46s} {statistics.median(settled):8.1f}")
print(f"  {'-> whole job':46s} {statistics.median(job_total):8.1f}")
print(f"  SQL statements per job (incl. polling): {statistics.median(queries):.0f}")
print(f"  embed_text calls: {statistics.median(embeds):.0f}; model encodes: {statistics.median(encodes):.0f}")
