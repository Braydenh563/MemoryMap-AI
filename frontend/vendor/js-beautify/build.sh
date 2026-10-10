#!/usr/bin/env bash
# Rebuilds beautify.min.js from the versions pinned in package.json.
# Run from this directory with node and npm on PATH; the app has no build
# step, so this is run by hand when a js-beautify upgrade is wanted, and the
# result is committed. The app loads the file on demand, the first time Format
# runs on a JavaScript, CSS or HTML document (documents-code.js,
# `docLoadBeautify`), and nothing
# is fetched from anywhere but this app's own server.
set -euo pipefail
cd "$(dirname "$0")"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cp package.json entry.js "$work"/
cd "$work"
npm install --no-audit --no-fund --silent
npx esbuild entry.js --bundle --format=iife --global-name=JSBEAUTIFY --minify \
  --target=es2020 --legal-comments=none --outfile=beautify.min.js
{
  echo "/*! js-beautify 2.0.3, MIT licence, see LICENSE beside this file. Built by build.sh from package.json. */"
  cat beautify.min.js
} > "$OLDPWD/beautify.min.js"
echo "wrote $(du -h "$OLDPWD/beautify.min.js" | cut -f1) beautify.min.js"
