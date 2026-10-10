# boardmap-1010: the owner's 2026-10-10 board and map list

Worktree `scratchpad/wt-boardmap`, branch `agent/boardmap-1010`, port 8783.
Every entry of both plans' "Placed from the owner's list, 2026-10-10" is
built; the record is HISTORY.md ("Moved from the plans, 2026-10-10
(boardmap-1010)"). What is left, one line each:

- INBOX 739's documents half ("auto naming of ... documents like "untitled #""): boards and maps are done (`wbUntitledNames`, frontend/js/whiteboard-templates.js:331); "Untitled document N" is not (documents.js, not this agent's file). Leave 739 in INBOX until then.
- "Comments in boards, maps, and other places need a lot of improvement" and "attach bookmarks, web links and more in comments on documents": the document's own comments (DOCUMENTS_PLAN, Brief 42) do not yet share the board's thread (Reply, Edit, Resolve, Attach); frontend/js/whiteboard.js `wbCommentRow` is the shape to reuse.
- A topic's effect (shadow, glow) and a Phosphor icon do not reach the PNG or SVG picture (frontend/js/whiteboard.js `wbBuildExportSvg`, the map-node branch); shapes now do.
- The original frame-preview clip was reproduced only as the selection canvas lagging a container that grew mid-drag (fixed); the owner's exact trigger (which panel or window change) is not known.
- "spacing is really close ... bunched up" on insert: the gaps measured 26px before and after on both layouts; only the branch's jump to the end was found and fixed. Ask for a screenshot if it recurs.
- WHITEBOARD_PLAN "Placed from INBOX, 2026-10-07 (next PR)": 740's frame hint line has no edit path and its connector arrow-head set (none, open, triangle, circle, diamond, bar) is not built; 747's "Reset style" for a board object is not built.
- Pre-existing, not from this branch (same on the base scripts): `mapcore.js` 14/16 (a core node's spine and size), `mindmap.js` three FAILs (the Mind map segment's active mark, "an ordinary board shows no map chrome", the P5 template tile click timing out), `mapstyle.js` "Aa grip overlaps the actions" (see its base run).
- Pre-existing gate failures on the integration branch: `test_no_conflict_marker_survives_a_merge` (src/memorymap/vendor/networkx/conftest.py:3), README tool count 67, ruff over src/memorymap/vendor, and `test_the_app_scripts_stay_under_the_ratchet` (320,476 gzipped against 320,300 on the base's own scripts; this branch adds nothing to the boot set).
- `errors.js` at 390 stops on its own second login check (`#lock-password` reads visible after the unlock); 1440, 1024 and 820 report 0 errors.
