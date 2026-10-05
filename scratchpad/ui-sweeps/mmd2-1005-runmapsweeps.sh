#!/usr/bin/env bash
# The map sweeps the add-path work (FEAT-02's 100ms gate), the outline and
# the markers could break, one after another, tails only.
#   BASE=http://127.0.0.1:8858 bash scratchpad/ui-sweeps/mmd2-1005-runmapsweeps.sh
cd "$(dirname "$0")/../.." || exit 1
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
for f in boardundo wbmapundo mapstrip maptheme mapline maprejoin mmdoc1005-mapchecks mmd2-1005-outline mmd2-1005-markers mapstructure mappresent mmd2-1005-ux06; do
  echo "== $f"
  timeout 300 node "scratchpad/ui-sweeps/$f.js" 2>&1 | grep -v "Failed to load resource" | tail -5
done
