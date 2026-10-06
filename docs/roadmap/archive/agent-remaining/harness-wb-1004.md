# Harness and whiteboard 1004: what is left

Measured (3B, forced first rounds of eleven note-targeting imperatives,
two tries each): a right first tool 17 of 22 before, 20 of 22 after; a
harmless read first 2 to 0; a new note for a named one 2 to 0. Questions:
right 10 of 13 to 12 of 13, a write first 0 to 0.

Part A (AGENT_SKILLS_REFORM H4's found-not-fixed) and Part B
(WHITEBOARD_PLAN's open rows) of the 2026-10-04 brief. What landed is in
HISTORY.md ("Moved from the plans, 2026-10-04": the first round, board frames,
board lock, presenting a board's frames); the decisions are WHITEBOARD_PLAN
14, 15 and 16.

Sweeps added: `scratchpad/ui-sweeps/wbframes.js`, `wblock.js`,
`wbpresent.js` (each takes `VW`, `VH`, `THEME`). The 3B first-round probe:
`scratchpad/harness_firstcall.py` (now sends the first round's own tools;
`OFFERED=all` sends the whole toolbox, the before).

## Still open, in the order to take them

All five rows of Part B are built (2026-10-04 and 05; HISTORY.md "Moved from
the plans": comments, boundaries and summaries, a map presented by branch, a
frame as an export scope; decisions WHITEBOARD_PLAN 17 and 18, MINDMAP_PLAN 19
to 21). Sweeps added: `wbcomments.js`, `mapstructure.js`, `mappresent.js`,
`wbframeexport.js`, `wbgripink.js` (each takes `VW`, `VH`, `THEME`), and
`wbregress.sh` runs the whiteboard set in one go. What is left:

1. **A frame's title at a phone's fitted zoom**: done (left1005). The title
   grows a transparent top border to `--target-min` on screen (44px at k
   0.21; `WB_INV_ZOOM_GRIPS` names it); `left1005-frametitle.js` 7/7 at 390
   and 1440, light and dark: one delta for the frame, the inner frame and its
   sticky with nothing, the frame, everything or the inner pair selected. The
   different-amounts drag (570 and 541) did not reproduce on this head, with
   or without the fix (the old title moved nothing at all); every selection
   move already goes through `wbApplyBulkMove`'s one delta. Left: nested
   frames whose tops are close at that zoom share the grown area, and the
   inner (drawn later) wins it; aim at the outer title's words.
2. MINDMAP_PLAN §12.2's rest: a boundary round a lasso'd set that is not one
   branch (decision 19 left it out), item 4's priority, progress, flags and due
   dates, item 7's floating topics and palettes, item 8's outline pane.

## Found, not fixed

- Forced, the 3B once answered in prose with `tool_choice: "required"` on
  the request ("Add 'bring a rain jacket' to my Snowdon trip note": "I can
  add that to your note, but first I need ..."), 1 of 22 forced rounds.
  llama-server's required grammar did not hold; the harness's own nudge
  catches the claimed act on the next round. Not reproduced on demand.
- "File the dentist note under Health", forced, once opened with
  `create_category` (then `edit_note`): a write, and arguably right when
  Health does not exist yet, but the category tree's four tools are offered
  because "file " and "under" cue that group as well as `edit_note`.
- `tools.focus_detail`'s `looks_like_a_question_about` did not hold back the
  tag group's writes for "What tags and what categories am I using?" (the
  first-round narrowing does it now, for small models only).

## Not verified

- Comments, boundaries, summaries, the map presentation and frame export in
  the desktop window (WebView2); a real finger on the 44px comment mark.
- The summary brace's side on the radial and free layouts (computed from where
  the run lies; `mapstructure.js` is tree-right only).
- Undo of a comment, boundary or summary is a "move" entry on the item
  (`wbSetComments`, `wbMapSetNodeStyle`), swept for one post and one boundary
  removal; the app-wide undo audit (INBOX 537) has not read them.

- A touch long-press on a locked item (the lock sweep right-clicks at
  390x844; the board's long-press menu is the same `openCanvasMenu`).
- Real-model numbers are one Qwen2.5-3B Q4_K_M on four contended cores, two
  tries per imperative; the question that once called `tag_note` did not
  reproduce it in this sample (3 of 3 opened with `notebook_overview` before
  the change), so the question fix is shown by the fake-transport tests, not
  by a before-and-after on the real model.
- The desktop window (WebView2) for any of the three board features.
