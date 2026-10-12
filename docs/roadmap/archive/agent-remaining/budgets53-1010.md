# budgets53-1010: what is left (Brief 53, 25g)

- No settings page row shows the budgets: "the bench page reading them" (WORLD_CLASS 25g) is `GET /models/bench/budgets` only; a table in Settings, What it learned (beside the model bench) would read it. `src/memorymap/api/routes_bench.py` `budgets`; help moves with it (standing order 13).
- Browser half runs on the 75-note e2e notebook, not the 500-note fixture (`tests-e2e/specs/budgets.spec.js` header); the list shows one page, so only the server query depends on the count, and that is pinned on 500 in `tests/test_budgets.py`. Topping the e2e notebook up to 500 notes through `POST /entries` was not timed.
- Decision 54 names 5,000 notes for list and search; the Brief fixed the fixture at 500. The 5,000 figures (261 ms list, search 1.8 to 5.0 s on a saturated machine, 24.6b) are not re-measured; search at 5,000 is Brief 47's gate.
- Caps are 1.5 times the slowest of four runs on a machine at load 7 to 11; re-measure on an idle machine and tighten (`BUDGETS`, README table, both move together: `test_the_readme_table_holds_every_measurement_and_cap`).
- First interaction (4,639 ms measured, cap 6,960) is dominated by boot work after first paint, the largest number in the table; Brief 44 / boot diet owns lowering it.
- The Playwright spec was run once locally (6 passed, 1.8 min, one worker, loaded machine) against hand-started servers; not run in CI's job.
