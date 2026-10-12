#!/usr/bin/env bash
# ===================================================================
#  Tessellate - every launcher action in one menu (macOS / Linux)
#
#  The owner, 2026-10-11: "I just need easy ways to run the set scripts
#  and actions". Each choice runs the launcher flag documented in
#  `./start.sh --help`, so there is one implementation of each action.
# ===================================================================
cd "$(dirname "$0")" || exit 1
while true; do
  cat <<'MENU'

Tessellate tools
  1  Start in a browser tab
  2  Start in its own window
  3  Check this computer (doctor)
  4  Reinstall the app's Python environment
  5  Open the launcher logs
  6  Make a desktop shortcut
  7  Show the version
  8  Uninstall
  q  Quit
MENU
  read -r -p "Choose: " choice || exit 0
  case "$choice" in
    1) exec ./start.sh ;;
    2) exec ./start-desktop.sh ;;
    3) ./start.sh --doctor ;;
    4) exec ./reinstall.sh ;;
    5) ./start.sh --logs ;;
    6) ./start.sh --shortcut ;;
    7) ./start.sh --version ;;
    8) exec ./uninstall.sh ;;
    q|Q|"") exit 0 ;;
    *) echo "Type a number from the list, or q." ;;
  esac
done
