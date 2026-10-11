#!/usr/bin/env bash
# ===================================================================
#  Tessellate - reinstall (macOS / Linux)
#
#  The same as `./start.sh --reinstall`: rebuilds the app's Python
#  environment (.venv) from scratch, then starts the app. Your notes,
#  settings and models live in the data folder and are not touched.
#  Asks first, because the rebuild takes a few minutes and needs the
#  internet; `--yes` skips the question.
# ===================================================================
cd "$(dirname "$0")" || exit 1
if [ "${1:-}" = "--yes" ]; then
  shift
elif [ -t 0 ]; then
  echo "This rebuilds Tessellate's Python environment, then starts the app."
  echo "Your notes and settings are not touched."
  read -r -p "Continue? [y/N] " answer
  case "$answer" in [yY]*) ;; *) echo "Nothing changed."; exit 0 ;; esac
fi
exec ./start.sh --reinstall "$@"
