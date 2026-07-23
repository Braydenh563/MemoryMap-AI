#!/usr/bin/env bash
# ====================================================================
#  MemoryMap AI - one-click launcher for macOS / Linux
#
#  Run `./start.sh` and it sets everything up the first time, then just
#  runs the app on every launch after that:
#
#    1. create a virtual environment (.venv) if one isn't there yet
#    2. install / update dependencies + the app itself
#    3. copy .env.example to .env the first time
#    4. start the server and open your browser at http://localhost:8000
#
#  Everything stays offline - this only saves you typing the commands.
# ====================================================================
set -e

# Always run from the folder this script lives in.
cd "$(dirname "$0")"

echo
echo " =========================================="
echo "  MemoryMap AI - starting up"
echo " =========================================="
echo

# --- 0. Self-update --------------------------------------------------
# Pull the latest code if this is a git checkout. --ff-only never rewrites
# your work: with local changes it just skips and keeps going. This is why
# "the launcher ran an old version" no longer happens.
if command -v git >/dev/null 2>&1 && [ -d .git ]; then
  echo " [0/4] Checking for updates..."
  git pull --ff-only || echo "       (skipped update - staying on the current version)"
fi

# --- 1. Find a Python ------------------------------------------------
if command -v python3 >/dev/null 2>&1; then
  PYTHON=python3
elif command -v python >/dev/null 2>&1; then
  PYTHON=python
else
  echo " [X] Python was not found. Install Python 3.11+ and try again."
  exit 1
fi
echo " [1/4] Using Python: $($PYTHON --version)"

# --- 2. Create the virtual environment if it's missing ---------------
if [ ! -x ".venv/bin/python" ]; then
  echo " [2/4] Creating virtual environment (.venv) - one-time setup..."
  "$PYTHON" -m venv .venv
else
  echo " [2/4] Virtual environment found."
fi
VENV_PY=".venv/bin/python"

# --- 3. Install / update dependencies --------------------------------
# Skip the slow reinstall unless requirements.txt changed since last time.
NEED_INSTALL=1
if [ -f ".venv/.mm_installed" ]; then
  REQ_HASH=$(cksum requirements.txt | awk '{print $1}')
  LAST_HASH=$(cat ".venv/.mm_installed" 2>/dev/null || echo "")
  [ "$REQ_HASH" = "$LAST_HASH" ] && NEED_INSTALL=0
fi

if [ "$NEED_INSTALL" = "1" ]; then
  echo " [3/4] Installing dependencies - this can take a few minutes the first time..."
  "$VENV_PY" -m pip install --upgrade pip
  "$VENV_PY" -m pip install -r requirements.txt
  "$VENV_PY" -m pip install -e .
  cksum requirements.txt | awk '{print $1}' > ".venv/.mm_installed"
else
  echo " [3/4] Dependencies already up to date - skipping install."
fi

# --- 4. First-run .env ----------------------------------------------
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp ".env.example" ".env"
  echo "       Created .env from .env.example."
fi

# --- 5. Launch -------------------------------------------------------
echo " [4/4] Starting MemoryMap AI at http://localhost:8000"
echo "       (opening your browser in a moment; press Ctrl+C to stop)"
echo

# Open the browser shortly after the server starts (best-effort).
(
  sleep 3
  if command -v open >/dev/null 2>&1; then open http://localhost:8000
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open http://localhost:8000
  fi
) >/dev/null 2>&1 &

exec "$VENV_PY" -m memorymap
