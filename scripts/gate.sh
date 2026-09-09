#!/usr/bin/env bash
# The merge gate, in one command, so no merge skips a step it is tired of:
#
#   scripts/gate.sh            # lint set + node --check + ruff (about 40 s)
#   scripts/gate.sh --changed  # plus the tests that name files changed since
#                              # origin/main (the routine local gate)
#   scripts/gate.sh --full     # plus the whole suite (10 to 15 minutes: CI runs
#                              # it on push; locally once before the PR closes)
#   BASE=http://127.0.0.1:8784 scripts/gate.sh --sweeps   # plus errors, docks,
#                                                          # contrast, touch on a running app
#
# Exit code is the first failure's. Prints the five-line shape the reports
# use: what ran, what passed, what failed, what was skipped, where the logs
# are. CLAUDE.md standing orders 5 and 5a; HANDOVER's merge recipe.
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# An agent worktree has no `.venv` of its own, so resolve the interpreter and
# ruff from the main checkout when this copy lacks them. Reported by an agent
# whose ruff step failed for that reason alone, on a tree with nothing wrong
# with it. `git rev-parse --git-common-dir` names the main repo's .git even
# from inside a linked worktree, which is what makes the fallback findable
# without hard-coding a path.
MAIN="$(cd "$(git -C "$ROOT" rev-parse --git-common-dir 2>/dev/null || echo "$ROOT/.git")/.." && pwd)"
PY="${PY:-$ROOT/.venv/bin/python}"
[ -x "$PY" ] || PY="$MAIN/.venv/bin/python"
RUFF="$ROOT/.venv/bin/ruff"
[ -x "$RUFF" ] || RUFF="$MAIN/.venv/bin/ruff"
LOG="${GATE_LOG:-$ROOT/.gate}"
mkdir -p "$LOG"
FULL=0; SWEEPS=0; CHANGED=0
for arg in "$@"; do
  case "$arg" in
    --full) FULL=1 ;;
    --changed) CHANGED=1 ;;
    --sweeps) SWEEPS=1 ;;
  esac
done
ran=(); passed=(); failed=(); skipped=()
step() {  # name, command...
  local name="$1"; shift
  ran+=("$name")
  if "$@" > "$LOG/$name.log" 2>&1; then passed+=("$name"); else failed+=("$name"); fi
}
LINTS=(tests/test_style_scale.py tests/test_ui_signatures.py tests/test_css_braces.py
  tests/test_frontend_ids.py tests/test_frontend_handlers.py tests/test_dock_grammar.py
  tests/test_docs_layout.py tests/test_asset_cache_busting.py tests/test_no_em_dashes.py
  tests/test_no_innerhtml_interpolation.py tests/test_markdown_link_schemes.py
  tests/test_frontend_load_order.py tests/test_ui_recipes.py tests/test_perf_mode.py
  tests/test_plan_hygiene.py tests/test_readme_freshness.py tests/test_vendor_licences.py)
step lints "$PY" -m pytest -q -p no:warnings "${LINTS[@]}"
node_check() { local bad=0; for f in frontend/*.js; do node --check "$f" || bad=1; done; return $bad; }
step node-check node_check
step ruff "$RUFF" check .
# --changed: every changed test file, plus tests/test_<stem>*.py for each
# changed source or frontend file (routes_files.py -> test_files*.py and
# test_routes_files*.py; graph.js -> test_graph*.py), for the files changed
# since the last push (the branch's upstream; GATE_BASE overrides) plus the
# working tree. Not since origin/main: on a long branch that is the whole
# suite again. It prints the list it picked so a miss is visible.
changed_tests() {
  local base; base="${GATE_BASE:-$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || echo HEAD~1)}"
  { git diff --name-only "$base"; git diff --name-only; git ls-files --others --exclude-standard; } | sort -u |
  while read -r f; do
    case "$f" in
      tests/test_*.py) [ -f "$f" ] && echo "$f" ;;
      src/memorymap/*.py|src/memorymap/*/*.py|frontend/*.js|frontend/css/*.css)
        stem="$(basename "$f")"; stem="${stem%.*}"
        ls tests/test_"${stem}"*.py 2>/dev/null
        case "$stem" in routes_*) ls tests/test_"${stem#routes_}"*.py 2>/dev/null ;; esac
        # **And any test that names this file, when the name is distinctive.**
        # The rule above maps a changed file to tests *named* after it, which
        # misses a test that exercises it under another name: on 2026-09-09 a
        # preview change turned `tests/test_library_previews.py` red and this
        # gate stayed green, because nothing anyone touched was called
        # "library_previews". An agent found it while doing something else.
        #
        # Distinctive is the whole difficulty. A first attempt grepped every
        # stem and `app`, `library` and `graph` selected most of the suite,
        # which is the full run this flag exists to avoid. So: at least seven
        # characters, and never one of the handful of words that name a whole
        # surface. A stem below the bar keeps the name-based rule above and
        # nothing more, and `--full` and CI are what cover the rest.
        case "$stem" in
          app|main|utils|index|graph|library|settings|documents|whiteboard|chat|notes) ;;
          ???????*) grep -rls --include='test_*.py' -e "$stem" tests/ 2>/dev/null ;;
        esac ;;
    esac
  done | sort -u
}
if [ "$CHANGED" = 1 ]; then
  mapfile -t TARGETED < <(changed_tests)
  # A selection this large is not a targeted run any more, and pretending
  # otherwise would hide how long the gate is about to take. Say so and run
  # it: a slow honest gate beats a fast one that skipped the thing that
  # matters.
  if [ "${#TARGETED[@]}" -gt 40 ]; then
    echo "changed-tests: ${#TARGETED[@]} files selected, which is most of the suite; consider --full"
  fi
  if [ "${#TARGETED[@]}" = 0 ]; then skipped+=("changed-tests (none matched)");
  else
    [ "${#TARGETED[@]}" -le 40 ] && echo "changed-tests: ${TARGETED[*]}"
    step changed-tests "$PY" -m pytest -q -p no:warnings "${TARGETED[@]}"
  fi
else skipped+=("changed-tests (--changed)"); fi
if [ "$FULL" = 1 ]; then step full-suite "$PY" -m pytest -q -p no:warnings tests/; else skipped+=("full-suite (--full)"); fi
if [ "$SWEEPS" = 1 ]; then
  export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
  export BASE="${BASE:-http://127.0.0.1:8781}"
  for s in errors docks contrast touch; do step "sweep-$s" node "scratchpad/ui-sweeps/$s.js"; done
else
  skipped+=("sweeps (--sweeps, needs BASE)")
fi
echo "ran:     ${ran[*]}"
echo "passed:  ${passed[*]:-none}"
echo "failed:  ${failed[*]:-none}"
echo "skipped: ${skipped[*]:-none}"
echo "logs:    $LOG/<step>.log"
[ "${#failed[@]}" = 0 ]
