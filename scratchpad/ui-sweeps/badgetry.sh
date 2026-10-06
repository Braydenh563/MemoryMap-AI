#!/bin/bash
# Try a candidate stylesheet, in another UI font, against the badge sweep
# without editing the app (INBOX 503). The CSP refuses an injected <style>,
# so a copy of 08-consistency.css with the candidate appended is served in its
# place (lib.js OVERRIDE_CSS).
#   scratchpad/ui-sweeps/badgetry.sh <candidate.css|-> <font|-> [env ...]
# Prints the sweep's family lines (dy range, padding asymmetry, gap).
cd "$(dirname "$0")/../.."
cand=$1; font=$2; shift 2
tmp=$(mktemp -d)
cp frontend/css/08-consistency.css "$tmp/o.css"
[ "$cand" != "-" ] && cat "$cand" >> "$tmp/o.css"
[ "$font" != "-" ] && printf ':root, :root[data-theme] { --ui-font: "%s", sans-serif !important; }\n' "$font" >> "$tmp/o.css"
env "$@" OVERRIDE_CSS="08-consistency.css=$tmp/o.css" SCALE=${SCALE:-3} BASE=${BASE:-http://127.0.0.1:8883} SCRATCH=${SCRATCH:-$tmp} W=${W:-1440} \
  VIEWS=${VIEWS:-notes,settings/models,library/skills,dashboard,timeline} node scratchpad/ui-sweeps/badgealign.js
