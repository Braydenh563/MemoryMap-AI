#!/usr/bin/env bash
# The single-instance lock end to end, with real processes (core/instance_lock.py).
#
#   bash scratchpad/instance-lock-e2e.sh [data dir] [port] [second port]
#
# A server-mode process holds the lock; a second server-mode launch on another
# port and a --desktop launch (pywebview is not installed in the sandbox, so it
# falls back to the browser) must both hand off to it rather than start a
# server; the focus route refuses a wrong token and answers the lock's; a
# graceful stop removes the lock. Uses its own scratch data dir and ports, and
# never runs a launcher script (CLAUDE.md's trap about scripts that delete).
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="${VENV:-/home/user/MemoryMap-AI/.venv}/bin/python"
D="${1:-/tmp/mm-lock}"; P1="${2:-8797}"; P2="${3:-8799}"
cd "$ROOT"
rm -rf "$D"; mkdir -p "$D"
setsid env PYTHONPATH=src MEMORYMAP_DATA_DIR="$D" MEMORYMAP_PORT="$P1" "$PY" -m memorymap > "$D/server.log" 2>&1 < /dev/null &
for _ in $(seq 1 60); do
  sleep 0.5
  curl -s -o /dev/null "http://127.0.0.1:$P1/health" && break
done
echo "lock: $(cat "$D/instance.lock")"
echo "--- second server-mode launch, port $P2:"
PYTHONPATH=src MEMORYMAP_DATA_DIR="$D" MEMORYMAP_PORT="$P2" timeout 60 "$PY" -m memorymap 2>&1 | tail -1
echo "--- desktop launch:"
PYTHONPATH=src MEMORYMAP_DATA_DIR="$D" MEMORYMAP_PORT="$P2" BROWSER=true timeout 60 "$PY" -m memorymap --desktop 2>&1 | tail -1
curl -s -o /dev/null -w "port $P2 answers (want 000): %{http_code}\n" "http://127.0.0.1:$P2/health"
echo "--- focus, wrong token (want 403):"
curl -s -X POST -H "X-Instance-Token: nope" -w " %{http_code}\n" "http://127.0.0.1:$P1/instance/focus"
TOKEN=$("$PY" -c "import json,sys;print(json.load(open(sys.argv[1]))['token'])" "$D/instance.lock")
PID=$("$PY" -c "import json,sys;print(json.load(open(sys.argv[1]))['pid'])" "$D/instance.lock")
echo "--- focus, the lock's token (want 200, focused false: no window here):"
curl -s -X POST -H "X-Instance-Token: $TOKEN" -w " %{http_code}\n" "http://127.0.0.1:$P1/instance/focus"
kill -INT "$PID"
sleep 4
echo "--- after a graceful stop, lock present (want no): $(test -f "$D/instance.lock" && echo yes || echo no)"
