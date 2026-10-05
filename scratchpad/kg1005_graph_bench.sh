#!/usr/bin/env bash
# Before and after, twice, against one seeded notebook (GRAPH_PLAN, 2026-10-05).
#   bash scratchpad/kg1005_graph_bench.sh <before-src-dir> <data-dir>
# <before-src-dir> is `git archive <rev> src | tar -x -C dir` + "/src".
set -u
BEFORE="$1"; DATA="$2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY=/home/user/MemoryMap-AI/.venv/bin/python
cd "$ROOT"
for _ in 1 2; do
  PYTHONPATH="$BEFORE" "$PY" scratchpad/kg1005_graph_bench.py "$DATA" 5000 2>&1 | grep -v "INFO\|Alembic" | sed 's/^/before /'
  PYTHONPATH=src "$PY" scratchpad/kg1005_graph_bench.py "$DATA" 5000 2>&1 | grep -v "INFO\|Alembic" | sed 's/^/after  /'
done
