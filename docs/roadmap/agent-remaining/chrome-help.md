# chrome and help agent: what landed, what is left

Branch `agent/wip-chrome`, worktree cut from `claude/epic-ramanujan-8xocc0`
at `ea7b370` plus `0718e1d` (INBOX 207 and 208 filed). Port 8801, data dir
`/tmp/mm-chrome`. Sweeps: `scratchpad/ui-sweeps/chrome203.js`, `chrome208.js`, `chrome205starters.js`, `chrome204guide.js`, `chromehelp.js` (the header
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
- INBOX 204 second half, the guide is Atlas: this commit. One constant each
  side, 0 strays on the surface, a `guide` topic so it can say what it is,
  an empty state that retires on the first turn, transcript 1356px to 670px.

## Next, in order

1. INBOX 214: the Notes/Boards/Documents/Reminders tab buttons as one
   segmented control, `.dock` grammar, measured.
2. INBOX 215: "Save as chat" in the palette's foot menu, posting the popup
   agent's transcript to `/conversations` and opening it in the Chat tab.

## Not verified

- Everything is measured at 1440x900 and 390x844 in light mode unless a line
  says otherwise; dark is not swept per item.
