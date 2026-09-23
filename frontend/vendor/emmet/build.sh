#!/usr/bin/env bash
# Rebuilds emmet.min.js from the versions pinned in package.json.
# Run from this directory with node and npm on PATH; the app has no build
# step, so this is run by hand when an Emmet upgrade is wanted, and the
# result is committed. The app loads the file on demand, the first time an
# HTML or CSS document is opened (documents.js, `docLoadEmmet`), and nothing
# is fetched from anywhere but this app's own server.
set -euo pipefail
cd "$(dirname "$0")"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cp package.json entry.js "$work"/
cd "$work"
npm install --no-audit --no-fund --silent
npx esbuild entry.js --bundle --format=iife --global-name=EMMET --minify \
  --target=es2020 --legal-comments=none --outfile=emmet.min.js
{
  echo "/*! Emmet 2, MIT licence, see LICENSE beside this file. Built by build.sh from package.json. */"
  cat emmet.min.js
} > "$OLDPWD/emmet.min.js"
echo "wrote $(du -h "$OLDPWD/emmet.min.js" | cut -f1) emmet.min.js"
