#!/usr/bin/env bash
# Put enough in a scratch notebook that the boot probes measure a real app.
#
#   scratchpad/ui-sweeps/seed-notebook.sh 8804
#
# An empty notebook is the one shape the dashboard costs nothing to draw: half
# its widgets bail on their empty state before they fetch anything, the note
# list is one short response, and nothing has a `[[wiki]]` link, so the board
# index is never wanted. A boot measured against it is a boot nobody has.
# WORLD_CLASS_PLAN rows A1 and A2 were both measured against a notebook this
# made: thirteen notes, one board, one link between them.
#
# The token comes from `POST /auth/unlock` and goes in `X-Auth-Token`, not an
# `Authorization` header: `require_unlock` (api/routes_auth.py) reads that one
# name and answers 401 to everything else, which reads exactly like a wrong
# password.
set -euo pipefail
PORT="${1:?port}"
BASE="http://127.0.0.1:$PORT"
PW="${PW:-testpassword123}"

TOKEN="$(curl -s -X POST "$BASE/auth/unlock" -H 'Content-Type: application/json' \
  -d "{\"password\":\"$PW\"}" | sed -n 's/.*"token":"\([0-9a-f]*\)".*/\1/p')"
if [ -z "$TOKEN" ]; then
  echo "no token: is the server on :$PORT, and is the password $PW?" >&2
  exit 1
fi
auth=(-H "X-Auth-Token: $TOKEN" -H 'Content-Type: application/json')

# `name`, not `title`, on this route: the board create schema names it that.
curl -s -X POST "$BASE/whiteboard/boards" "${auth[@]}" \
  -d '{"name":"Field notes","kind":"whiteboard"}' -o /dev/null -w 'board %{http_code}\n'

curl -s -X POST "$BASE/entries" "${auth[@]}" \
  -d '{"content":"A note that points at [[Field notes]] and expects a map chip."}' \
  -o /dev/null -w 'linked note %{http_code}\n'

for i in $(seq 1 12); do
  curl -s -X POST "$BASE/entries" "${auth[@]}" \
    -d "{\"content\":\"Plain note number $i, nothing linked in it at all.\"}" -o /dev/null
done
echo "12 plain notes"

curl -s "$BASE/entries?limit=1" -H "X-Auth-Token: $TOKEN" -D - -o /dev/null \
  | grep -i '^x-total-count' || true
