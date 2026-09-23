#!/usr/bin/env bash
# The documents live view and code editor sweeps from INBOX 392's work, run
# in the default look (Quiet utilitarian) and in Classic, light and dark.
# Prints one line per sweep per look: its last line (all pass / N FAIL).
#
#   BASE=http://127.0.0.1:8793 bash scratchpad/ui-sweeps/doclooks.sh
set -u
cd "$(dirname "$0")"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
for look in utilitarian default; do
  for theme in light dark; do
    for sweep in docpage17.js docblocks17c.js doclivemd.js doccode.js notetoolbar.js; do
      out="$(LOOK=$look THEME=$theme timeout 150 node "$sweep" 2>&1)"
      last="$(printf '%s\n' "$out" | grep -E '^(all pass|[0-9]+ FAIL)' | tail -1)"
      echo "$look/$theme $sweep: ${last:-no result}"
      printf '%s\n' "$out" | grep -E '^FAIL' | sed 's/^/    /'
    done
  done
done
