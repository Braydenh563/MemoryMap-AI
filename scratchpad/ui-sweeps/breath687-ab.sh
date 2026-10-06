#!/usr/bin/env bash
# INBOX 687: the breath's cost, A/B in alternation so a loaded machine
# loads both sides alike. A = the base commit's stylesheet and atlas-life.js
# (no chest breath), B = this checkout. Frames and main-thread ms a second
# over 10 s at rest in the large view, measure's own reads off (COST=1).
#   BASE=http://127.0.0.1:8825 A_CSS=/path/08.css A_LIFE=/path/atlas-life.js \
#     bash scratchpad/ui-sweeps/breath687-ab.sh viewer-m 3
set -euo pipefail
CASE="${1:-viewer-m}"; N="${2:-3}"
HERE="$(cd "$(dirname "$0")" && pwd)"
for i in $(seq 1 "$N"); do
  printf 'A '; COST=1 CASES="$CASE" OVERRIDE_CSS="08-consistency.css=$A_CSS" OVERRIDE_JS="atlas-life.js=$A_LIFE" node "$HERE/breath687.js" | cut -c1-110
  printf 'B '; COST=1 CASES="$CASE" node "$HERE/breath687.js" | cut -c1-110
done
