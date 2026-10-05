# Open rows 1005: what is done, what is left

Agent: the well-defined rows of OPEN.md, 2026-10-05, branch cut from
`claude/notes-flow-rebuild`, port 8800, data `/tmp/mm-open`. Not pushed.

## Done

- 713cc52: the note card's "Tag with Atlas" chip is not drawn on a private
  note (sweep 1004 item 7, found-not-fixed). `open-privatechip.js`: private
  1 chip before, 0 after; plain 1 both. `tests/test_private_note_no_ai_offer.py`.
- OPEN.md's `--radius-inner` row re-measured: 13 declarations in six
  stylesheets plus `documents.js`'s swatch.

## Left

OPEN.md has no other row whose fix is named or mechanical: the third pass
(ledger-1005) ended every open row in a "Needs:" line (a model, a device, a
decision, an owner call, or an area another agent owns). Rows checked and left,
each with its reason:

- Boot gzip candidates, `tests/test_name_mood.py`'s palette test (needs the
  palette decided), `.dock-chip-row` (kept whole as a recipe, zero page uses
  held by `tests/test_ui_recipes.py`), the document gutter's read/write pass
  (a perf change that wants a measurement first).
- F7's 13 thread sites (`tests/test_flaw_class_lints.py`): a WORLD_CLASS_PLAN
  flaw class, another agent's.
- `scratchpad/ui-sweeps/quickaccess.js` is stale (it opens a row menu in
  `.launch-head` that INBOX 488 moved to the dashboard dock's Customise); the
  dashboard dock is the docks agent's.
- `mappan.js`'s `rect` sketch fixture logs "Expected moveto path command"
  twice (the whiteboard agent's).
- Every Atlas, whiteboard, mind map, search, Settings navigation row.

Not verified: the desktop window; the chip with a real model running (the
sweep sets `modelStatus` by hand, since the sandbox has none).
