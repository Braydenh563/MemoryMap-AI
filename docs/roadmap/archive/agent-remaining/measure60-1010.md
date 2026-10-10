# measure60-1010: built, left, not verified

Built (Brief 60, 26.0 and 26a, decision 63): WORLD_CLASS_PLAN 26.4 and 26.5 (numbers); `tests/test_no_silent_except.py` (21), `tests/test_routes_named.py` (49), `tests/test_background_registry.py` (26), ruff `T201` on `src`, `scripts/complexity.py` and `tests/test_complexity.py` (260 functions over 15, cycles), `scripts/handlers.py` and `tests/test_frontend_wake_sources.py` (97 file and kind rows), `scripts/profile_routes.py`, `scratchpad/ui-sweeps/frames.js` with its at-rest budget; rows in the five surface plans; item 434's progress records moved to HISTORY to fit the plan cap.

Left:
- Decision 58's `core/background.py` registry (name, started, stop) is not built; the lint only counts sites. Brief 63 neighbour. `tests/test_background_registry.py`.
- The 68 broad excepts that log nothing and return a fallback (89 minus the 21 seeded) are not ratcheted; decide whether decision 57 means them. `tests/test_no_silent_except.py`.
- 49 routes need a test or removal (`tests/test_routes_named.py` SEED); several are reached by a loop over verbs, check before writing duplicates.
- 5 foreign keys without a leading index (`entity_mentions` x2, `document_bookmarks` x2, `entry_bookmarks.bookmark_id`) and 64 filtered columns without one: needs a migration and an `EXPLAIN QUERY PLAN` at 5,000 notes first (26.4).
- Import cost 3.3 s against decision 56's 1.5 s: `ai.autonomous` pulls `ai.agent` (503 ms), `ai.help_chat` 271 ms, `api.routes_search` 226 ms. Brief 62.
- Graph at rest (1 to 10 long tasks) and the companion (4 to 6 at rest) are the two surfaces over the zero target (`frames.js` REST_BUDGET).
- `frames.js` has no documents or notes-list surface; add one when DOCUMENTS Phase work lands.

Not verified:
- Frame figures are one machine at load 5 to 9 on four cores; re-run `frames.js` idle before fixing a budget.
- Resident memory was measured on an empty notebook; a populated one loads the model at warm-up. The 647 MB is torch 2.14 CPU with bge-small, first embed 6.6 s.
- Hot-route times are in-process with the thread pool bypassed; `_to_out` at 5,000 notes is an extrapolation.
- Untested-route match is by path literal in `tests/`; a path built by concatenation of more than a trailing slash is counted untested.
- The `recalcs` CDP counter equals frames on every surface including the control; not read as a finding.
