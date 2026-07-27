#!/usr/bin/env bash
# ====================================================================
#  MemoryMap AI - one-click launcher for macOS / Linux
#
#  Run ./start.sh - it sets everything up the first time, then just runs
#  the app after that:
#
#    1. use the app's own .venv Python (only needs a system Python the
#       very first time, to build that .venv)
#    2. install / update dependencies + the app itself
#    3. copy .env.example to .env the first time
#    4. start the server and open your browser at localhost:8000
# ====================================================================
set -e
cd "$(dirname "$0")"

# --- Desktop mode ---------------------------------------------------
# "./start.sh --desktop" runs the app in its own window instead of a
# browser tab. Exported so it survives the self-update re-exec below.
for arg in "$@"; do
  case "$arg" in
    --desktop|desktop) export MM_DESKTOP=1 ;;
  esac
done

# --- 0. Self-update, then re-exec a fresh copy ----------------------
# Pull first so a launch always runs the latest code, then re-exec the
# (possibly updated) script so a changed file can't corrupt this run.
# The MM_CHILD guard prevents an endless loop.
if [ -z "${MM_CHILD:-}" ] && command -v git >/dev/null 2>&1 && [ -d .git ]; then
  echo " Checking for updates..."
  git pull --ff-only || echo "       (skipped update - staying on the current version)"
  export MM_CHILD=1
  exec "$0" "$@"
fi

echo
echo " =========================================="
echo "  MemoryMap AI - starting up"
echo " =========================================="
echo

VENV_PY=".venv/bin/python"

# --- 1. Build the venv if it doesn't exist yet ----------------------
# Only the first run needs a system Python; later launches use .venv.
if [ ! -x "$VENV_PY" ]; then
  echo " [1/4] First-time setup - looking for Python to build the environment..."
  PYTHON=""
  if command -v python3 >/dev/null 2>&1; then PYTHON=python3
  elif command -v python >/dev/null 2>&1; then PYTHON=python
  fi
  if [ -z "$PYTHON" ]; then
    echo " [X] No Python found. Install Python 3.11+ and run this again."
    exit 1
  fi
  echo "       Using $($PYTHON --version) to create the virtual environment..."
  "$PYTHON" -m venv .venv
else
  echo " [1/4] Using the app's virtual environment."
fi

if [ ! -x "$VENV_PY" ]; then
  echo " [X] The virtual environment looks incomplete - delete .venv and re-run."
  exit 1
fi

# --- 2. Install / update dependencies --------------------------------
NEED_INSTALL=1
if [ -f ".venv/.mm_installed" ]; then
  REQ_HASH=$(cksum requirements.txt | awk '{print $1}')
  LAST_HASH=$(cat ".venv/.mm_installed" 2>/dev/null || echo "")
  [ "$REQ_HASH" = "$LAST_HASH" ] && NEED_INSTALL=0
fi

if [ "$NEED_INSTALL" = "1" ]; then
  echo " [2/4] Installing dependencies - this can take a few minutes the first time..."
  "$VENV_PY" -m pip install --upgrade pip
  "$VENV_PY" -m pip install -r requirements.txt
  "$VENV_PY" -m pip install -e .
  cksum requirements.txt | awk '{print $1}' > ".venv/.mm_installed"
else
  echo " [2/4] Dependencies already up to date - skipping install."
fi

# pywebview is optional and only the app window needs it, so it installs
# on demand rather than for everyone. A failure is not fatal - the app
# falls back to a browser tab.
if [ -n "${MM_DESKTOP:-}" ]; then
  echo "       Checking desktop window support..."
  if ! "$VENV_PY" -m pip install --quiet pywebview; then
    echo " [!] pywebview would not install - opening a browser tab instead."
    unset MM_DESKTOP
  fi
fi

# --- 3. First-run .env ----------------------------------------------
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp ".env.example" ".env"
  echo " [3/4] Created .env from .env.example."
else
  echo " [3/4] Configuration found."
fi

# --- 4. Launch -------------------------------------------------------
if [ -n "${MM_DESKTOP:-}" ]; then
  echo " [4/4] Starting MemoryMap AI in its own window."
  echo "       Close the window to stop it."
  echo
  exec "$VENV_PY" -m memorymap --desktop
fi

echo " [4/4] Starting MemoryMap AI at http://localhost:8000"
echo "       A browser tab opens in a moment. Press Ctrl+C to stop."
echo

(
  sleep 3
  if command -v open >/dev/null 2>&1; then open http://localhost:8000
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open http://localhost:8000
  fi
) >/dev/null 2>&1 &

exec "$VENV_PY" -m memorymap
