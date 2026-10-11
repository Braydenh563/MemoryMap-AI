#!/usr/bin/env bash
# ===================================================================
#  Tessellate - check this computer (macOS / Linux)
#
#  The same as `./start.sh --doctor`: prints a table of what the app
#  needs (Python, disk, ports, models, the data folder) and exits. Made
#  a file of its own so it is one double-click, the owner 2026-10-11:
#  "I just need easy ways to run the set scripts and actions".
#
#  The pause at the end only happens in a terminal someone is reading,
#  so a file manager's terminal does not close before the table is read.
# ===================================================================
cd "$(dirname "$0")" || exit 1
./start.sh --doctor "$@"
rc=$?
if [ -t 0 ]; then read -r -p "Press Enter to close. " _; fi
exit "$rc"
