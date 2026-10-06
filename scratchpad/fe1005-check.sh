#!/usr/bin/env bash
# fe1005: targeted tests (serially) then the staged gate, for one commit.
#   bash scratchpad/fe1005-check.sh OUTFILE test_a.py test_b.py ...
set -u
OUT="$1"; shift
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BT="/tmp/claude-0/fe1005-pt-$$"
{
  echo "== tests"
  PYTHONPATH=src timeout 1500 /home/user/MemoryMap-AI/.venv/bin/python -m pytest -q -p no:cacheprovider \
    --basetemp="$BT" "$@" 2>&1 | grep -E "^(FAILED|ERROR)|^E  " | head -30
  echo "tests exit: ${PIPESTATUS[0]}"
  echo "== gate"
  timeout 1500 bash scripts/gate.sh --staged 2>&1 | tail -5
} > "$OUT" 2>&1
rm -rf "$BT"
