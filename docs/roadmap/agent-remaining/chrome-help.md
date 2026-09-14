# chrome and help agent: what landed, what is left

Branch `agent/wip-chrome`, worktree cut from `claude/epic-ramanujan-8xocc0`
at `ea7b370` plus `0718e1d` (INBOX 207 and 208 filed). Port 8801, data dir
`/tmp/mm-chrome`. Sweeps: `scratchpad/ui-sweeps/chrome203.js`, `chrome208.js`, `chrome205starters.js`, `chrome204guide.js`, `chrome214kinds.js`, `chrome215save.js`, `chromehelp.js` (the header
cluster, the status bar slots, the help popover's first painted frame and
cap, the palette popover's stacking, the theme switch, the model-gated
inventory) and `chrome207.js` (both slots open their panels, 390 and the
More sheet).

## Done

- INBOX 207, the agent and the Guide leave the header, and the header's icon
  buttons lose their segmented wells: `413dd5c`.
- INBOX 206, the help popover's ceiling, its first painted frame and its
  right edge on a phone: `06f6048`.
- INBOX 205 first half, the '?' popover's tier inside the palette:
  `af3f292`. The starters half is still open.
- INBOX 202, the theme switch: `2340728`. 24 transitions to 0, the canvas
  rebuilds off the click.
- INBOX 203, every AI-only control gated by `data-needs-model` off one
  `syncModelGatedControls`: `4edd29d`. 7 of 15 gated before, 15 of 15 now;
  0 left holding the offline tooltip once a model is back.
- INBOX 208, the popup agent's foot row: `3d37443`. 75px and 124px tall,
  now 51px and 61px, one line per caption in all three states.
- INBOX 205 second half, the starters as a set: `2e001bb`. 0 of 14 chips
  with an icon, now 14 of 14 over 7 glyphs, labels left-aligned at one x,
  6 of 6 families ruled, 222px of scroll at 390 now 149px.
- INBOX 204 second half, the guide is Atlas: `b59256c`. One constant each
  side, 0 strays on the surface, a `guide` topic so it can say what it is,
  an empty state that retires on the first turn, transcript 1356px to 670px.

- INBOX 214, the Timeline's kind filter as one dropdown: `531bd42`. 441px
  of dock row to 121px, 0 overlaps at 1440, 1024 and 960 (150% zoom).

- INBOX 215, the popup agent's conversation kept: `2a78943`. One foot menu
  with both rows, 4 messages written in order, titled from the first
  question.

## Next, in order

Neither is started yet; the head is clean, so a session picking this up
starts at step 1.

1. **INBOX 224, the Atlas sheet.** Three asks in one entry, in this order.
   (a) The sheet itself, rebuilt on the popup agent's recipe so the two
   assistants share one look: anchored bottom-right, a head with the Atlas
   mark, the name and one line, three starter chips ("Where do reminders
   live?", "How do I turn off web search?", "What does Performance mode
   do?"), a scrolling transcript in bubbles with the source help topic under
   each answer, a composer dock at the foot (input, icon-only send,
   `data-help-for` '?'), New chat in the kebab. Start from `openHelpChat()`
   in settings.js (it moves `#help-chat-group` into an `openSheet` and puts
   it back, so the sheet is where the shape lives) and from
   `.command-palette-panel` in 07-whiteboard-misc.css for the recipe to
   match. (b) The Settings Help page's own chat box goes in the same commit,
   which is the owner's "there is still the second atlas interface in the
   settings help page": `#help-chat-group` and its ids and handlers leave
   `index.html` and settings.js together (`test_frontend_ids.py`,
   `test_frontend_handlers.py` fail on half a removal), replaced by an "Ask
   Atlas" row with three starter chips that opens the one sheet;
   `test_help_chat.py`'s route tests stay as they are. Measure: exactly one
   help-chat surface in the DOM. (c) `ATLAS_PROMPTS`, keyed by help id, and
   the five places that offer a question from it: a line at the end of every
   `data-help-for` popover, the Settings Help row, an "Ask Atlas" command in
   the palette plus a typed line ending in "?" routed to it, one suggestion
   in the Notes, Chat and Library empty states, and the shortcut listed in
   the shortcuts sheet. Measure: a popover's Atlas line opens the sheet with
   the question already in the input, at 1440 and 390; no element wider than
   the sheet at 1440, 1024 and 390; contrast 4.5:1 in both themes; Escape and
   the X both close.
2. **INBOX 225, Atlas as the notebook's AI everywhere the app speaks as it.**
   One `AI_NAME` constant in the frontend (settings.js already holds
   `GUIDE_NAME = "Atlas"` from INBOX 204: fold the two into one rather than
   adding a second), then the copy: the status dot's label, "Atlas filed this
   under Work", the chat empty state, the popup agent's greeting, and
   Settings, Models reading "Atlas, running <model>". Copy and one mark only,
   never persona prose. The single backend prompt clause and its constant are
   backend2's, not this agent's.

## Not verified

- Everything is measured at 1440x900 and 390x844 in light mode unless a line
  says otherwise; dark is not swept per item.
- `errors.js` was run once on this head and reported 0 errors and 0 layout
  findings at 1440 before the 115s timeout cut it; the 1024 and 390 passes of
  that sweep did not run.
- Nothing here was seen in a browser window: every claim in the Done list is a
  number from the sweep named beside it.
- INBOX 214 departs from its recorded decision twice, both stated in the
  entry's own resolution and worth a look on review: `details.dock-menu`
  rather than `kebabMenu` (a kebab row closes the menu on every press, so
  turning three kinds off would be three openings), and the caption reading
  "Kinds:" rather than "Show:" (`#timeline-filter-clear`, two controls along,
  already says "Show: <band>").
