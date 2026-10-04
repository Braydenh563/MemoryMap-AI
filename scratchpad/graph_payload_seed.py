"""GRAPH_PLAN 518 (2): seed a notebook of N notes (default 2,018) with a few
links each, for timing `/graph` on a running server.

    PYTHONPATH=src .venv/bin/python scratchpad/graph_payload_seed.py /tmp/mm-big 2018
    bash scratchpad/ui-sweeps/serve.sh 8808 /tmp/mm-big
    curl -s -o /dev/null -w '%{time_total}\\n' -H 'X-Auth-Token: ...' http://127.0.0.1:8808/graph
"""

import random
import sys
from pathlib import Path

from memorymap.core.database import DatabaseManager, EntryLink
from memorymap.entry import manager

root = Path(sys.argv[1])
count = int(sys.argv[2]) if len(sys.argv) > 2 else 2018
root.mkdir(parents=True, exist_ok=True)
db = DatabaseManager(root / "memorymap.db")
random.seed(3)
words = "graph note link map idea plan read write cluster label node edge spark comet".split()
with db.session() as session:
    ids = []
    for i in range(count):
        body = " ".join(random.choice(words) for _ in range(120))
        entry = manager.create_entry(session, f"# Note {i} about {random.choice(words)}\n\n**{body}**", category_name=f"Cat {i % 8}")
        ids.append(entry.id)
    session.commit()
    for i in ids:
        for j in random.sample(ids, 2):
            if i != j:
                session.add(EntryLink(source_entry_id=i, target_entry_id=j))
    session.commit()
print("seeded", count)
