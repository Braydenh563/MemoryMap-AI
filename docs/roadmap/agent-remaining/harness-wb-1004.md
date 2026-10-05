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

1. **Comments on board items and map topics** (WHITEBOARD_PLAN's open row;
   MINDMAP_PLAN 12.2 item 6: "a thread per node, count marker"). Needs a
   table (an item key across three tables, like `group_id`), routes, a
   thread surface from DESIGN.md's recipes and a count mark. No decision
   exists: write one first (standing order 3). Opus.
2. **Boundaries** (MINDMAP_PLAN 12.2 item 1): a shaded shape around a branch
   with a label, colour and style, moving with its nodes; drawn from the
   map's own layout pass (`wbRenderMapEdges`), exported in FreeMind/OPML as
   private attributes like the other 12.1 fields. Opus.
3. **Summaries** (MINDMAP_PLAN 12.2 item 2): a bracket beside sibling
   topics with a summary topic. Same layer as boundaries. Opus.
4. **The map's own presentation by branch** (MINDMAP_PLAN 12.2 item 9): the
   board's `wbStartPresenting` is frames only; a map would walk its trunk's
   branches with the same bar and keys.
5. **Frames, past decision 14**: nesting rules, clipping what overhangs, a
   frame as an export scope ("Export this frame").

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

- A touch long-press on a locked item (the lock sweep right-clicks at
  390x844; the board's long-press menu is the same `openCanvasMenu`).
- Real-model numbers are one Qwen2.5-3B Q4_K_M on four contended cores, two
  tries per imperative; the question that once called `tag_note` did not
  reproduce it in this sample (3 of 3 opened with `notebook_overview` before
  the change), so the question fix is shown by the fake-transport tests, not
  by a before-and-after on the real model.
- The desktop window (WebView2) for any of the three board features.
