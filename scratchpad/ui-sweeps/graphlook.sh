#!/usr/bin/env bash
# Run graphlook.js twice in light and once in dark, one JSON line each.
#   bash scratchpad/ui-sweeps/graphlook.sh [tag]     (server on :8793 first)
# With a tag, copies the shots to graphlook-<tag>-light/dark.png.
set -u
cd "$(dirname "$0")/../.."
export BASE="${BASE:-http://127.0.0.1:8793}" PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
export SCRATCH="${SCRATCH:-/tmp/graphlook}"
mkdir -p "$SCRATCH/shots"
for i in 1 2; do timeout 100 node scratchpad/ui-sweeps/graphlook.js 2>&1 | tail -1; done
THEME=dark timeout 100 node scratchpad/ui-sweeps/graphlook.js 2>&1 | tail -1
if [ -n "${1:-}" ]; then
  cp "$SCRATCH/shots/graphlook-light.png" "$SCRATCH/shots/graphlook-$1-light.png"
  cp "$SCRATCH/shots/graphlook-dark.png" "$SCRATCH/shots/graphlook-$1-dark.png"
fi
