#!/usr/bin/env bash
# Rebuilds js-interpreter.min.js from JS-Interpreter at the commit pinned below.
# Run from this directory with git, node and npm on PATH; the app has no build
# step, so this is run by hand when an upgrade is wanted, and the result is
# committed. The run sandbox gets the file's text from the app (run-core.js,
# `runVendorFetch`) the first time a JavaScript or TypeScript document is
# debugged; nothing is fetched from anywhere but this app's own server.
#
# Not the repository's own acorn_interpreter.js: that is Closure Compiler's
# ADVANCED build, which renames the properties a debugger reads (a state's
# `node`, `scope`, `func_`; a scope's `parentScope` and `object`). esbuild's
# minify keeps every property name and the two globals, `acorn` and
# `Interpreter`.
set -euo pipefail
COMMIT=45d00b0c86e48cca1bb3af0f711bc4c0d626c359
cd "$(dirname "$0")"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
git clone -q https://github.com/NeilFraser/JS-Interpreter.git "$work/src"
git -C "$work/src" checkout -q "$COMMIT"
cat "$work/src/acorn.js" "$work/src/interpreter.js" > "$work/both.js"
(cd "$work" && npm init -y >/dev/null && npm install --no-audit --no-fund --silent esbuild@0.24.2)
"$work/node_modules/.bin/esbuild" "$work/both.js" --minify --legal-comments=none --outfile="$work/out.js"
{
  echo "/*! JS-Interpreter ${COMMIT:0:7} (Neil Fraser, Apache-2.0) with its Acorn (Marijn Haverbeke, MIT); see LICENSE beside this file. Built by build.sh. */"
  cat "$work/out.js"
} > js-interpreter.min.js
echo "wrote $(du -h js-interpreter.min.js | cut -f1) js-interpreter.min.js"
