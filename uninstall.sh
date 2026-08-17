#!/usr/bin/env bash
# ====================================================================
#  MemoryMap AI - uninstaller for macOS / Linux
#
#  Removes the virtual environment (.venv) that start.sh built, so the
#  app stops being runnable from this folder. Your notes live in a
#  separate data directory and are NEVER touched unless you explicitly
#  pass --delete-data.
#
#  Usage:
#    ./uninstall.sh                 Remove .venv, keep your notes
#    ./uninstall.sh --delete-data   Also delete your notes (asks first)
#    ./uninstall.sh --yes           Skip the "are you sure" prompts
#    ./uninstall.sh --help          Show usage and exit
#
#  This script does not delete the project folder itself (the source
#  code and this script). Delete the folder by hand afterwards if you
#  want it gone completely - re-running start.sh at any point rebuilds
#  .venv and picks up right where you left off, notes included.
# ====================================================================
set -e
cd "$(dirname "$0")"

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      cat <<'MM_HELP'
MemoryMap AI uninstaller

Usage:
  ./uninstall.sh                 Remove .venv, keep your notes (asks first)
  ./uninstall.sh --delete-data   Also delete your notes (asks first, separately)
  ./uninstall.sh --yes           Skip the "remove .venv?" prompts
  ./uninstall.sh --help          Show this message and exit

Your notes are never deleted unless you pass --delete-data AND then type
DELETE at its own confirmation prompt - --yes does not skip that one.

This does not delete the project folder itself. Re-run ./start.sh any
time afterwards to reinstall and pick up right where you left off.
MM_HELP
      exit 0
      ;;
  esac
done

DELETE_DATA=0
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --delete-data) DELETE_DATA=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
  esac
done

if [ -t 1 ]; then
  TEAL=$'\033[1;38;5;73m'
  RED=$'\033[1;31m'
  YELLOW=$'\033[1;33m'
  RESET=$'\033[0m'
else
  TEAL="" ; RED="" ; YELLOW="" ; RESET=""
fi

echo "${TEAL}MemoryMap AI - uninstall${RESET}"
echo

# A double-click (or a typo for start.sh) shouldn't be able to reach the
# actual removal steps below without a clear, explicit "yes" first —
# asked for directly. This is separate from, and in addition to, the
# per-step confirmations further down.
if [ "$ASSUME_YES" != "1" ]; then
  echo "This removes MemoryMap AI's installed dependencies (.venv)."
  echo "Your notes are not touched unless you also pass --delete-data."
  echo
  read -r -p "Continue? [y/N] " reply
  case "$reply" in
    y|Y) ;;
    *)
      echo "Cancelled - nothing was changed."
      exit 0
      ;;
  esac
  echo
fi

# --- Where the data actually is --------------------------------------
# Same precedence the app itself uses: .env's MEMORYMAP_DATA_DIR, else
# the "data" folder beside this script.
DATA_DIR="data"
if [ -f ".env" ]; then
  ENV_DATA_DIR=$(grep -E '^MEMORYMAP_DATA_DIR=' ".env" | tail -n 1 | cut -d= -f2-)
  [ -n "$ENV_DATA_DIR" ] && DATA_DIR="$ENV_DATA_DIR"
fi

confirm() {
  # $1 = prompt. Returns success (0) only on an explicit "y".
  [ "$ASSUME_YES" = "1" ] && return 0
  local reply
  read -r -p "$1 [y/N] " reply
  [ "$reply" = "y" ] || [ "$reply" = "Y" ]
}

# --- 1. Remove the virtual environment --------------------------------
if [ -d ".venv" ]; then
  if confirm "Remove the .venv folder (all installed dependencies)?"; then
    rm -rf ".venv"
    echo " ${TEAL}[done]${RESET} Removed .venv."
  else
    echo " ${YELLOW}[skipped]${RESET} .venv left in place."
  fi
else
  echo " ${TEAL}[skip]${RESET} No .venv found - nothing to remove there."
fi

# --- 2. Your notes: opt-in only, asked again even with --yes unless -----
#        --delete-data was passed explicitly. A stray "uninstall" is not
#        consent to lose a notebook.
if [ "$DELETE_DATA" = "1" ]; then
  if [ -d "$DATA_DIR" ]; then
    echo
    echo " ${RED}This deletes your notes, documents, images and settings in:${RESET}"
    echo "   $(cd "$DATA_DIR" 2>/dev/null && pwd || echo "$DATA_DIR")"
    read -r -p " Type DELETE to confirm: " reply
    if [ "$reply" = "DELETE" ]; then
      rm -rf "$DATA_DIR"
      echo " ${TEAL}[done]${RESET} Deleted $DATA_DIR."
    else
      echo " ${YELLOW}[skipped]${RESET} Data left in place - confirmation text didn't match."
    fi
  else
    echo " ${TEAL}[skip]${RESET} No data directory found at $DATA_DIR."
  fi
else
  echo " ${TEAL}[kept]${RESET} Your notes in '$DATA_DIR' were left untouched (pass --delete-data to remove them)."
fi

echo
echo "Uninstall finished. This folder's source code is still here -"
echo "delete it by hand if you want it fully gone, or run ./start.sh"
echo "any time to reinstall and pick up right where you left off."
