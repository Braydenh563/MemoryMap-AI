"""Time and profile the night shift's pairing phase on a synthetic notebook (ledger 1542).

    PYTHONPATH=src python scratchpad/prof_pairs.py 2400

Builds N claims over a 900-word vocabulary in a scratch database, then runs
`facts._pair_passes` with no model and no embeddings (the local matcher), under
cProfile. 800 claims took 7.5 s before the posting counts moved to
`collections.Counter` and the per-candidate union set was dropped, 3.0 s after;
2,400 took 30 s after. The numbers are from a machine at load average 28 to 48.
"""

from __future__ import annotations

import cProfile
import pstats
import random
import sys
import tempfile
import time
from datetime import datetime, timedelta
from pathlib import Path

from memorymap.ai import facts
from memorymap.core.database import DatabaseManager, DerivedFact, Entry, NightRun


def main() -> None:
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 2400
    random.seed(3)
    vocab = [f"word{i}" for i in range(900)]
    with tempfile.TemporaryDirectory() as folder:
        session = DatabaseManager(Path(folder) / "p.db").session()
        night = NightRun()
        session.add(night)
        session.flush()
        for i in range(count // 4):
            entry = Entry(content=f"note {i}", created_at=datetime(2026, 1, 1) + timedelta(days=i % 300))
            session.add(entry)
            session.flush()
            for _ in range(4):
                text = " ".join(random.sample(vocab, 7)) + " costs " + str(random.randint(1, 999))
                session.add(DerivedFact(entry_id=entry.id, kind="claim", text=text, span_start=0,
                                        span_end=len(text), run_id=night.id, model="local", confidence=0.5, payload="{}"))
        session.commit()
        started = time.time()
        profile = cProfile.Profile()
        profile.enable()
        result = facts._pair_passes(session, night, spent=0, budget=10**9, provider=None, model="",
                                    embeddings=None, counts={}, models_used=set(), questions_on=True)
        profile.disable()
        print("N", count, "seconds", round(time.time() - started, 2), "result", result)
        pstats.Stats(profile).sort_stats("cumulative").print_stats(8)


if __name__ == "__main__":
    main()
