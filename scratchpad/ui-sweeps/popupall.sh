#!/usr/bin/env bash
# The popup inventory at 1440 and 390, light and dark, into /tmp/pop18.
#   BASE=http://127.0.0.1:8818 bash scratchpad/ui-sweeps/popupall.sh before
TAG="${1:?before|after}"
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p /tmp/pop18
for W in 1440 390; do
  for THEME in light dark; do
    W=$W THEME=$THEME OUT="/tmp/pop18/$W-$THEME-$TAG.json" node "$HERE/popupinv.js" | head -4
  done
done
