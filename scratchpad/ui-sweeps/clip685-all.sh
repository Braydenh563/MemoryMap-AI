#!/usr/bin/env bash
# Run clip685.js at 1440 and 390, light and dark, into one directory.
#
#   BASE=http://127.0.0.1:8826 scratchpad/ui-sweeps/clip685-all.sh <outdir> <label>
#
# Writes <outdir>/<label>-<width>-<theme>.txt and prints each run's TOTAL line.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTDIR="${1:?outdir}"; LABEL="${2:?label}"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
export SCRATCH="${SCRATCH:-$OUTDIR}"
mkdir -p "$OUTDIR"
for WIDTH in 1440 390; do
  for THEME in light dark; do
    f="$OUTDIR/$LABEL-$WIDTH-$THEME.txt"
    WIDTH=$WIDTH THEME=$THEME VERBOSE=1 node "$HERE/clip685.js" > "$f" 2>&1
    echo "$WIDTH $THEME: $(grep '^TOTAL' "$f")"
  done
done
