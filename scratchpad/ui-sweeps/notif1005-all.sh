#!/usr/bin/env bash
# INBOX 584/585: the notif1005 sweep at 1440 and 390, light and dark.
#   BASE=http://127.0.0.1:8862 SCRATCH=/tmp/x bash scratchpad/ui-sweeps/notif1005-all.sh
set -u
cd "$(dirname "$0")/../.."
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
for theme in light dark; do
  for w in 1440 390; do
    echo "=== W=$w THEME=$theme"
    THEME=$theme W=$w timeout 150 node scratchpad/ui-sweeps/notif1005-sweep.js 2>&1 | grep -v '^\s*at \|Call log\|waiting for'
  done
done
