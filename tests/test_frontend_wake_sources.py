"""Wake sources in `frontend/js`, ratcheted per file (WORLD_CLASS_PLAN 26.2, decision 63).

Every `requestAnimationFrame`, `setInterval`, `ResizeObserver` and
`MutationObserver` is a place the page wakes without the person doing
anything, which is where "the app is heavy at rest" comes from. The census
(`python scripts/handlers.py`) counted 138, 12, 31 and 38 of them on
2026-10-10; this holds the count per file at that number. A new one in a file
fails and names itself: either reuse the file's existing loop or observer, or
raise the number here in the same commit and say in the commit what wakes it
and what it recomputes. Fewer than the seed fails too, so the numbers only
tighten.
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KINDS = ("raf", "interval", "resize-observer", "mutation-observer")

_spec = importlib.util.spec_from_file_location("handlers", ROOT / "scripts" / "handlers.py")
handlers = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(handlers)

SEED = json.loads((Path(__file__).parent / "wake_sources_seed.json").read_text(encoding="utf-8"))


def _now() -> dict[str, int]:
    return {f"{f}::{k}": n for (f, k), n in handlers.counts().items() if k in KINDS}


def test_no_new_wake_source() -> None:
    now = _now()
    more = sorted(f"{k}: {SEED.get(k, 0)} to {n}" for k, n in now.items() if n > SEED.get(k, 0))
    assert not more, "a new frame loop, interval or observer; reuse the file's own or raise the seed with a reason:\n  " + "\n  ".join(more)


def test_the_seed_only_shrinks() -> None:
    now = _now()
    fewer = sorted(f"{k}: {n} now {now.get(k, 0)}" for k, n in SEED.items() if now.get(k, 0) < n)
    assert not fewer, "fewer than the seed; lower the number in wake_sources_seed.json:\n  " + "\n  ".join(fewer)
