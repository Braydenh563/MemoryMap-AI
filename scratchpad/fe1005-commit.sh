#!/usr/bin/env bash
# fe1005: stage the named files, run the staged gate, commit only when it
# prints "failed:  none". The message is read from MSGFILE.
#   bash scratchpad/fe1005-commit.sh OUTFILE MSGFILE file...
set -u
OUT="$1"; MSG="$2"; shift 2
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
{
  git add -- "$@"
  echo "== staged"; git diff --cached --stat | tail -3
  GATE="$(timeout 1800 bash scripts/gate.sh --staged 2>&1 | tail -5)"
  echo "== gate"; echo "$GATE"
  if echo "$GATE" | grep -q "failed:  none"; then
    git commit -q -F "$MSG" && echo "== committed $(git log --oneline -1)"
  else
    echo "== NOT committed"
  fi
} > "$OUT" 2>&1
