#!/usr/bin/env bash
# The map sweeps the add-path rework (audit FEAT-02) could break, one after
# another, tails only.  BASE=http://127.0.0.1:8844 bash scratchpad/ui-sweeps/mmdoc1005-runmapsweeps.sh
cd "$(dirname "$0")/../.." || exit 1
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
for f in boardundo wbmapundo mapstrip maptheme mapline maprejoin; do
  echo "== $f"
  timeout 300 node "scratchpad/ui-sweeps/$f.js" 2>&1 | grep -v "Failed to load resource" | tail -6
done
