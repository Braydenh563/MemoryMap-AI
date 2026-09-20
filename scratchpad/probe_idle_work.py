"""What is running when nobody is using the app?

    PYTHONPATH=src .venv/bin/python scratchpad/probe_idle_work.py

The owner's question, verbatim: "are things running when they arent necessary
and taking up extra compute??" This answers the backend half by starting the
app exactly as a launch does, leaving it alone, and listing every thread and
timer that exists, with what each one is waiting for.

A thread that sleeps on a queue costs nothing and is the right shape. A
thread that wakes on a timer costs a wakeup per period whether or not there
is anything to do, and on a laptop that is battery. The distinction is what
this prints, because "N threads" on its own is not a finding.
"""

from __future__ import annotations

import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))


def main() -> int:
    import os
    import tempfile

    scratch = tempfile.mkdtemp(prefix="mm-idle-")
    os.environ["MEMORYMAP_DATA_DIR"] = scratch
    before = {t.ident for t in threading.enumerate()}

    from memorymap.api.app import create_app

    app = create_app()
    #: The app builds its singletons on the first request in some paths, so
    #: one call is closer to "running" than import alone.
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        client.get("/health")
        time.sleep(2.0)
        rows = []
        for t in threading.enumerate():
            if t.ident in before:
                continue
            rows.append((t.name, t.daemon, t.is_alive()))
        print(f"{len(rows)} thread(s) running with the app idle:\n")
        for name, daemon, alive in sorted(rows):
            print(f"  {name:44} daemon={daemon} alive={alive}")

        #: Timers are the ones that cost a wakeup per period.
        timers = [t for t in threading.enumerate() if isinstance(t, threading.Timer)]
        print(f"\n{len(timers)} of those are threading.Timer")
        for t in timers:
            print(f"  {t.name}: interval {getattr(t, 'interval', '?')}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
