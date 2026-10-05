#!/usr/bin/env bash
# The whiteboard's regression sweeps in one go, each line its tally.
#   BASE=http://127.0.0.1:8809 SCRATCH=/tmp/x bash scratchpad/ui-sweeps/wbregress.sh [sweep ...]
cd "$(dirname "$0")"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
for name in "${@:-wbframes wblock wbpresent wbdrag canvasconventions wbcomments}"; do
  for sweep in $name; do
    out="$(timeout 300 node "$sweep.js" 2>&1)"
    fails="$(printf '%s\n' "$out" | grep -c '^FAIL')"
    echo "$sweep: $(printf '%s\n' "$out" | grep -E '^[0-9]+/[0-9]+|passed|[0-9]+ ok' | tail -1) fails=$fails"
    printf '%s\n' "$out" | grep '^FAIL' | head -5
  done
done
