#!/usr/bin/env bash
#
# Commit your own paths in a shared worktree without reverting anybody else.
#
# Five agents and an orchestrator write to this one checkout at once. The rule
# everyone was given, read HEAD into a private index and commit from it, is
# correct and still lost work seven times on 2026-09-13, because it has a
# window: `git read-tree HEAD` freezes every path in that index, and if another
# writer lands a commit while you are staging, your commit rewrites their file
# back to the frozen copy. Nothing in the message or the diff says so, which is
# why it kept being noticed only afterwards.
#
# This closes the window. It re-reads HEAD after staging and before committing;
# if HEAD moved it throws the index away and starts again. It then refuses to
# leave a commit that touched a path you did not ask for.
#
#   SAFE_COMMIT_INDEX=/tmp/.../idx-mine \
#     bash scratchpad/safe_commit.sh <message-file> <spec> [spec...]
#
# A spec is either a whole path:            frontend/graph.js
# or a path and a regex, for one file's own hunks in a file others are editing:
#                                           CHANGELOG.md::the minimap's size
#
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: SAFE_COMMIT_INDEX=<path> $0 <message-file> <spec> [spec...]" >&2
  exit 2
fi

msg_file="$1"; shift
idx="${SAFE_COMMIT_INDEX:-}"
if [ -z "$idx" ]; then
  echo "SAFE_COMMIT_INDEX must name a private index file, not the shared one" >&2
  exit 2
fi
here="$(cd "$(dirname "$0")" && pwd)"

for attempt in 1 2 3 4 5; do
  head_before="$(git rev-parse HEAD)"
  rm -f "$idx"
  wanted=""
  GIT_INDEX_FILE="$idx" git read-tree "$head_before"
  for spec in "$@"; do
    path="${spec%%::*}"
    wanted="$wanted$path"$'\n'
    case "$spec" in
      *::*) GIT_INDEX_FILE="$idx" python3 "$here/stage_hunks.py" "$path" "${spec#*::}" ;;
      *)    GIT_INDEX_FILE="$idx" git add -- "$path" ;;
    esac
  done
  # The check the plain recipe is missing: if anyone landed while we staged,
  # this index is already stale and committing from it is the revert.
  if [ "$(git rev-parse HEAD)" != "$head_before" ]; then
    echo "safe_commit: head moved while staging, starting again (attempt $attempt)" >&2
    continue
  fi
  GIT_INDEX_FILE="$idx" git commit -q -F "$msg_file"
  touched="$(git show --pretty=format: --name-only HEAD | sed '/^$/d' | sort -u)"
  stray="$(comm -23 <(printf '%s' "$touched") <(printf '%s' "$wanted" | sed '/^$/d' | sort -u) || true)"
  if [ -n "$stray" ]; then
    echo "safe_commit: this commit touched paths you did not ask for:" >&2
    printf '%s\n' "$stray" >&2
    echo "safe_commit: undo it with 'git reset --soft HEAD~1' and tell the orchestrator" >&2
    exit 3
  fi
  printf '%s\n' "$touched"
  exit 0
done

echo "safe_commit: five attempts, head kept moving; try again in a moment" >&2
exit 1
