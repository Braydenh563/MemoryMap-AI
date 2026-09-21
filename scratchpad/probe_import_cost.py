"""Per-module import cost probe (time and RSS), run in a fresh subprocess per
module so one import's C-extension footprint (numpy's libopenblas, etc.)
can't leak into the next module's number by way of the same interpreter.

Usage: .venv/bin/python scratchpad/probe_import_cost.py [module ...]
With no arguments, probes a fixed list covering the app's entrypoint, the
heaviest ai/* and search/* modules, and numpy itself as a baseline.

Each probe subprocess prints one JSON line to stdout; the parent collects
and tabulates. VmRSS (not ru_maxrss) is read from /proc/self/status right
after the import returns, which is what the app actually holds resident at
that point, uninflated by whatever else ru_maxrss's page-rounding does.
"""

from __future__ import annotations

import json
import subprocess
import sys

DEFAULT_MODULES = [
    "memorymap.api.app",
    "memorymap.ai.embeddings",
    "memorymap.ai.agent",
    "memorymap.ai.model_manager",
    "memorymap.search.engine",
    "memorymap.search.index",
    "memorymap.search.search_manager",
    "numpy",
]

_CHILD_SRC = """
import importlib
import json
import sys
import time

mod = sys.argv[1]

def vmrss_kb():
    with open("/proc/self/status") as fh:
        for line in fh:
            if line.startswith("VmRSS:"):
                return int(line.split()[1])
    return -1

before_kb = vmrss_kb()
t0 = time.perf_counter()
importlib.import_module(mod)
elapsed_ms = (time.perf_counter() - t0) * 1000
after_kb = vmrss_kb()
print(json.dumps({
    "module": mod,
    "import_ms": round(elapsed_ms, 1),
    "rss_before_kb": before_kb,
    "rss_after_kb": after_kb,
    "rss_delta_kb": after_kb - before_kb,
}))
"""


def probe_one(module: str, *, python: str, env: dict) -> dict:
    result = subprocess.run(
        [python, "-c", _CHILD_SRC, module],
        capture_output=True,
        text=True,
        env=env,
        timeout=60,
    )
    if result.returncode != 0:
        return {"module": module, "error": result.stderr.strip()[-2000:]}
    line = result.stdout.strip().splitlines()[-1]
    return json.loads(line)


def main() -> None:
    import os

    modules = sys.argv[1:] or DEFAULT_MODULES
    python = sys.executable
    env = dict(os.environ)
    env.setdefault("PYTHONPATH", "src")

    rows = []
    for mod in modules:
        row = probe_one(mod, python=python, env=env)
        rows.append(row)
        if "error" in row:
            print(f"{mod:40s} ERROR: {row['error'][-300:]}")
        else:
            print(
                f"{row['module']:40s} "
                f"{row['import_ms']:8.1f} ms   "
                f"RSS {row['rss_before_kb']/1024:7.1f} -> "
                f"{row['rss_after_kb']/1024:7.1f} MiB   "
                f"(+{row['rss_delta_kb']/1024:6.1f} MiB)"
            )

    print()
    print(json.dumps(rows, indent=2))


if __name__ == "__main__":
    main()
