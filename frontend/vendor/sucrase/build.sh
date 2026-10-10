#!/usr/bin/env bash
# Rebuilds sucrase.min.js from the versions pinned in package.json.
# Run from this directory with node and npm on PATH; the app has no build
# step, so this is run by hand when a sucrase upgrade is wanted, and the
# result is committed. The app loads the file on demand, the first time a
# TypeScript document runs (run-core.js, `runVendorScript`), and nothing is
# fetched from anywhere but this app's own server.
set -euo pipefail
cd "$(dirname "$0")"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cp package.json entry.js "$work"/
cd "$work"
npm install --no-audit --no-fund --silent
npx esbuild entry.js --bundle --format=iife --global-name=SUCRASE --minify \
  --target=es2020 --legal-comments=none --outfile=sucrase.min.js
{
  echo "/*! sucrase 3.35.1, MIT licence, see LICENSE beside this file. Built by build.sh from package.json. */"
  cat sucrase.min.js
} > "$OLDPWD/sucrase.min.js"
echo "wrote $(du -h "$OLDPWD/sucrase.min.js" | cut -f1) sucrase.min.js"
