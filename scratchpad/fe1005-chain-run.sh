#!/usr/bin/env bash
# fe1005: run the chain with gate.sh's new lint names held back until the
# group that adds those tests (a staged snapshot cannot run a test file that
# is not staged yet).
set -u
D=/tmp/claude-0/-home-user-MemoryMap-AI/eac0a178-6a5f-55a9-b7c8-87cedc9b90ca/scratchpad
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
cp scripts/gate.sh "$D/gate.sh.new"
git checkout -- scripts/gate.sh
bash scratchpad/fe1005-chain.sh "$D/chain" "$D/chain.out" 1 2 3
ok=$?
cp "$D/gate.sh.new" scripts/gate.sh
[ "$ok" = 0 ] || exit 1
bash scratchpad/fe1005-chain.sh "$D/chain" "$D/chain4.out" 4
