"""Where a warm `/graph` spends its time at 5,000 notes (GRAPH_PLAN, 2026-10-05).

    PYTHONPATH=src .venv/bin/python scratchpad/kg1005_graph_profile.py /tmp/mm-bench5k

Run kg1005_graph_bench.py first to seed the directory. Calls the route
function directly (no HTTP, no serialisation) twice to warm the caches, then
profiles a third call, and times `json.dumps` of the payload on its own.
"""

import cProfile
import json
import os
import pstats
import sys
import time

os.environ["MEMORYMAP_DATA_DIR"] = sys.argv[1]
os.environ.setdefault("MEMORYMAP_NO_AUTO_INSTALL", "1")

from memorymap.api import routes_graph  # noqa: E402
from memorymap.api.app import create_app  # noqa: E402
from memorymap.core import deps  # noqa: E402

create_app()
db = deps.get_db()
flags = dict(similarity=False, include_entities=False, include_documents=False, include_maps=False,
             include_tags=False, include_unresolved=False, include_attachments=False)
with db.session() as session:
    for _ in range(2):
        t = time.perf_counter()
        payload = routes_graph.graph(session=session, **flags)
        print(f"handler {1000 * (time.perf_counter() - t):.0f} ms")
    prof = cProfile.Profile()
    prof.enable()
    routes_graph.graph(session=session, **flags)
    prof.disable()
    t = time.perf_counter()
    body = json.dumps(payload)
    print(f"json.dumps {1000 * (time.perf_counter() - t):.0f} ms, {len(body) // 1024} KB")
pstats.Stats(prof).sort_stats("cumulative").print_stats(18)
