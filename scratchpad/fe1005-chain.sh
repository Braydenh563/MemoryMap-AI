#!/usr/bin/env bash
# fe1005: commit several prepared groups in order, each gated on its own.
# For each group N in DIR: DIR/N.files (paths, one per line), DIR/N.msg (the
# commit message), DIR/N.cl (optional changelog line, added to both
# CHANGELOGs and staged with the group). Stops at the first group whose gate
# fails.
#   bash scratchpad/fe1005-chain.sh DIR OUT 1 2 3
set -u
DIR="$1"; OUT="$2"; shift 2
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
: > "$OUT"
for n in "$@"; do
  {
    echo "=== group $n"
    files=()
    while IFS= read -r line; do [ -n "$line" ] && files+=("$line"); done < "$DIR/$n.files"
    if [ -f "$DIR/$n.cl" ]; then
      python3 /tmp/claude-0/-home-user-MemoryMap-AI/eac0a178-6a5f-55a9-b7c8-87cedc9b90ca/scratchpad/cl.py "$ROOT" "$(cat "$DIR/$n.cl")"
      files+=(CHANGELOG.md docs/CHANGELOG.md)
    fi
    git add -- "${files[@]}"
    git diff --cached --stat | tail -1
    GATE="$(timeout 1800 bash scripts/gate.sh --staged 2>&1 | tail -5)"
    echo "$GATE"
  } >> "$OUT" 2>&1
  if echo "$GATE" | grep -q "failed:  none"; then
    git commit -q -F "$DIR/$n.msg" >> "$OUT" 2>&1 && echo "committed $(git log --oneline -1)" >> "$OUT"
  else
    echo "NOT committed; stopping" >> "$OUT"
    exit 1
  fi
done
echo "=== chain done" >> "$OUT"
