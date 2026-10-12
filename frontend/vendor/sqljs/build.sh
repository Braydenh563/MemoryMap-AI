#!/usr/bin/env bash
# Copies sql.js's browser build (SQLite compiled to WebAssembly) from the
# version pinned in package.json. Run from this directory with npm on PATH;
# the app has no build step, so this is run by hand when an upgrade is wanted,
# and the result is committed. Nothing is bundled: the two files are the
# release's own. The app fetches them from its own server the first time a
# .sql document runs (run-core.js, the sql row) and hands them to the run
# sandbox, which may fetch nothing itself (api/run_sandbox.py).
set -euo pipefail
cd "$(dirname "$0")"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cp package.json "$work"/
(cd "$work" && npm install --no-audit --no-fund --silent)
cp "$work/node_modules/sql.js/dist/sql-wasm.js" "$work/node_modules/sql.js/dist/sql-wasm.wasm" .
cp "$work/node_modules/sql.js/LICENSE" LICENSE
echo "wrote $(du -h sql-wasm.js | cut -f1) sql-wasm.js and $(du -h sql-wasm.wasm | cut -f1) sql-wasm.wasm"
