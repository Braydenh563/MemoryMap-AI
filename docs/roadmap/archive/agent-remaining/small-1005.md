# small-1005: the small open items, 2026-10-05

Branch cut from `claude/notes-flow-rebuild`, port 8802, data `/tmp/mm-small`. Not pushed. Accounts: HISTORY.md, "Moved from the plans, 2026-10-05 (small-1005: the small open items)".

## Done

- BACKLOG 115 row 8 (saved searches) marked built, with its evidence pinned by `tests/test_backlog_status_rows.py`.
- `scratchpad/ui-sweeps/editor.js` re-pointed at `docSurface()`: 78 of the old 89 checks remain, all pass at 1440; a lint keeps sweeps off the retired textarea editor's names.
- `quickaccess.js` (dock Customise, the Quick access manager), `mappan.js` (the rect fixture is a path; the sweep asserts on the console), `skeletons.js` (expected-blank views named, `WIDTH=390`).
- OPEN.md pruned: one Plan tails block, section A's done rows moved whole to HISTORY, 89 stub lines collapsed.
- Settings skeletons: Models, What it remembers, What it learned, Logs (`settingsskel.js`, 15 of 15).
- Capture's strip at 390: first paint is the folded bar (`capturestrip.js`, one row, constant height); 2.6 KB of dead art CSS removed to stay under the boot CSS cap.
- DOCUMENTS_PLAN's table-cell reveal row closed as not reproduced (`revealcell.js`).

## Left

- `scratchpad/ui-sweeps/stripground.js` and `settings-skeletons.js` (coordinator items 8 and part of 1) are not on this branch (another agent's unmerged work); the pixel sample at 390 is untouched.
- BACKLOG 115 row 10 (sealed backup) is built in `backlog-1005b`'s worktree, not merged here, so its "Next" line is untouched.
- BACKLOG 115 row 11 (`GET /audit/export.csv` and a Library Activity export item): a feature with decisions in it (private-note events in an export, CSV formula injection, which fields), not a small fix.
- `skeletons.js` reads library/docs BLANK at 1440 and 390 (its list does call `showSkeletons`; the held requests chain, so the list is probably reached after 300 ms): measure before deciding.
- `tablefull.js` now fails earlier than its old "top bar clusters" finding: `toggleAgentPalette()` no longer opens `#command-palette-overlay` (the popup agent was redesigned); needs the sweep repointed at the popup agent's own opener.
- The badgealign.js target decision (x-height against capital centre): a design call, skipped as briefed.
