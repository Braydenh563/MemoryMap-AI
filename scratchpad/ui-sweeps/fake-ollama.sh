#!/usr/bin/env bash
# Start the stand-in Ollama (scratchpad/fake_ollama_server.py) detached on its
# own port, its log in DIR. Then serve with OLLAMA_URL=http://127.0.0.1:PORT.
#
#   scratchpad/ui-sweeps/fake-ollama.sh 11522 /tmp/mm-meta22
set -euo pipefail
PORT="${1:?port}"; DIR="${2:?log dir}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VENV="${VENV:-/home/user/MemoryMap-AI/.venv}"
mkdir -p "$DIR"
cd "$ROOT"
setsid "$VENV/bin/python" scratchpad/fake_ollama_server.py "$PORT" > "$DIR/fake-ollama-$PORT.log" 2>&1 < /dev/null &
for _ in $(seq 1 20); do
  sleep 0.5
  if curl -s -o /dev/null "http://127.0.0.1:$PORT/api/tags"; then echo "fake ollama on :$PORT"; exit 0; fi
done
echo "fake ollama did not come up; see $DIR/fake-ollama-$PORT.log" >&2; exit 1
