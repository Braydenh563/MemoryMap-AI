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

- INBOX 224, first half, the Atlas sheet and the one surface: `3632a1a`.
  1 `#help-chat-group` in the document and 0 in Settings, a 448px card in the
  corner, 0 contrast findings in either theme, Escape and X both close.
- INBOX 224, second half, Atlas offered where the question comes up: this
  commit. 11 of 11 popover lines, 3 empty states, a palette command and a
  typed "?" routed to it, Ctrl+Shift+H. Found on the way: the command palette
  threw on its first keystroke until the Library had been opened once.

## Next, in order

1. **INBOX 225, Atlas as the notebook's AI everywhere the app speaks as it.**
   One `AI_NAME` constant in the frontend (settings.js holds
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
