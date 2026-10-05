#!/usr/bin/env bash
# Run sweeps at 1440 and 390, light and dark, one summary line each.
#   BASE=http://127.0.0.1:8795 bash scratchpad/ui-sweeps/wbmatrix.sh wbports.js wbwaypoints.js
cd "$(dirname "$0")" || exit 1
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
for theme in light dark; do
  for w in 1440 390; do
    h=900
    [ "$w" = 390 ] && h=844
    for sweep in "$@"; do
      out=$(W=$w H=$h THEME=$theme timeout 115 node "$sweep" 2>&1 | grep -E "^FAIL|^[0-9]+/[0-9]+$" | cut -c1-300)
      echo "$sweep $w $theme: $(echo "$out" | tr '\n' ' ')"
    done
  done
done
