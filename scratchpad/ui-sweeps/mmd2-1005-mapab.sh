#!/usr/bin/env bash
# FEAT-02's 100ms gate, A/B on one server and one load: the add latency at
# 301 topics with a base commit's scripts (OVERRIDE_JS, OVERRIDE_CSS) and with
# the working tree's, alternated so both see the same load.
#   BASE=http://127.0.0.1:8858 ABDIR=/path/with/base/files ROUNDS=3 \
#   bash scratchpad/ui-sweeps/mmd2-1005-mapab.sh
cd "$(dirname "$0")/../.." || exit 1
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers SIZES=301 ADDS="${ADDS:-8}"
D="${ABDIR:?ABDIR}"
for i in $(seq 1 "${ROUNDS:-3}"); do
  printf 'load %s\n' "$(cut -d' ' -f1 /proc/loadavg)"
  printf 'base  '
  OVERRIDE_JS="whiteboard.js=$D/whiteboard.js,whiteboard-map.js=$D/whiteboard-map.js" \
    OVERRIDE_CSS="04-chat-dock-appearance.css=$D/04-chat-dock-appearance.css" \
    timeout 200 node scratchpad/ui-sweeps/mmdoc1005-mapaddlatency.js 2>&1 | tr -d '\n ' | grep -o '"times":\[[^]]*\],"median":[0-9]*,"renders":\[[^"]*'
  printf '\nafter '
  timeout 200 node scratchpad/ui-sweeps/mmdoc1005-mapaddlatency.js 2>&1 | tr -d '\n ' | grep -o '"times":\[[^]]*\],"median":[0-9]*,"renders":\[[^"]*'
  printf '\n'
done
