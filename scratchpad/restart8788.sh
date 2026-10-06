#!/usr/bin/env bash
# Restart the scratch server on a port without pgrep -f (which matches the
# calling shell's own command line and kills it, exit 144).
PORT="$1"; DIR="$2"
for p in /proc/[0-9]*; do
  cmd=$(tr '\0' ' ' < "$p/cmdline" 2>/dev/null) || continue
  case "$cmd" in *uvicorn*"--port $PORT"*) kill "${p#/proc/}" 2>/dev/null;; esac
done
sleep 2
bash "$(dirname "$0")/ui-sweeps/serve.sh" "$PORT" "$DIR" >/dev/null 2>&1
for i in $(seq 20); do curl -sf "localhost:$PORT/health" >/dev/null && exit 0; sleep 1; done
echo "server on $PORT did not come up" >&2; exit 1
