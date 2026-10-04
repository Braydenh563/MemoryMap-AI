"""Row 5's gate: a first night run over 2,000 notes, passes 1 to 5, timed.

    PYTHONPATH=src .venv/bin/python scratchpad/night_pairs_bench.py [notes]

WORLD_CLASS_PLAN I1's gate: "a full first run under the fake model finishes
in under 5 minutes wall clock and the card renders under 100ms from
`/night/latest`". Two runs: with no model (the local rules), and with a
judge that answers every pair at once (the fake model; its time is the
pass's own, not a model's). The notebook: 2,000 notes of four sentences
drawn from 60 subjects, so claims share subjects across notes the way a
real notebook's do, with numbers that sometimes differ and questions that
later notes sometimes answer.
"""

from __future__ import annotations

import json
import random
import sys
import tempfile
import time
from datetime import timedelta
from pathlib import Path

from memorymap.ai import facts
from memorymap.core import deps
from memorymap.core.database import Entry, utcnow


class Judge:
    def __init__(self) -> None:
        self.calls = 0

    def chat(self, model, messages):
        self.calls += 1
        system = messages[0]["content"]
        if "disagree" in system:
            return {"content": "incompatible - different numbers" if self.calls % 3 == 0 else "compatible - fine"}
        if "answer the question" in system:
            return {"content": "yes - it says when" if self.calls % 2 == 0 else "no - not really"}
        return {"content": ""}


def seed(session, n: int, rng: random.Random) -> None:
    subjects = [f"project{i} budget" for i in range(30)] + [f"garden bed{i}" for i in range(30)]
    for i in range(n):
        subject = rng.choice(subjects)
        other = rng.choice(subjects)
        sentences = [
            f"The {subject} is {rng.choice([100, 200, 300])} this month.",
            f"The {other} should be ready by the {rng.randint(1, 28)}th.",
            f"When is the {rng.choice(subjects)} due for review?",
            f"Remember to call about the {rng.choice(subjects)} tomorrow.",
        ]
        entry = Entry(content=" ".join(sentences), tags=json.dumps([]))
        entry.created_at = utcnow() - timedelta(minutes=n - i)
        session.add(entry)
    session.commit()


def run(n: int) -> None:
    for label, provider in (("no model", None), ("fake judge", Judge())):
        deps.init_app_state(data_dir=Path(tempfile.mkdtemp(prefix="nightbench-")))
        session = deps.get_db().session()
        seed(session, n, random.Random(11))
        started = time.perf_counter()
        result = facts.run(session, budget=10_000_000, provider=provider, model="fake" if provider else "")
        session.commit()
        took = time.perf_counter() - started
        t0 = time.perf_counter()
        card = facts.latest_card(session)
        card_ms = (time.perf_counter() - t0) * 1000
        print(
            f"{label}: {n} notes, {took:.1f}s, derived {result['derived']} {card['counts']}, "
            f"stopped {result['stopped_reason']}, card {card_ms:.1f} ms"
            + (f", {provider.calls} model calls" if provider else "")
        )
        session.close()


if __name__ == "__main__":
    run(int(sys.argv[1]) if len(sys.argv) > 1 else 2000)
