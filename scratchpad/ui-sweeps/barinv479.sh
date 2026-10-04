#!/usr/bin/env bash
# Run barinv479.js at 1440, 1024, 820 and 390, light and dark, serially.
#   BASE=http://127.0.0.1:8871 SCRATCH=/tmp/x bash barinv479.sh
cd "$(dirname "$0")"
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
for t in light dark; do
  for w in 1440 1024 820 390; do
    WIDTH=$w THEME=$t timeout 170 node barinv479.js > "$SCRATCH/inv-$w-$t.log" 2>&1
    echo "$w $t $?"
  done
done
