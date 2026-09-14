# chrome and help agent: what landed, what is left

Branch `agent/wip-chrome`, worktree cut from `claude/epic-ramanujan-8xocc0`
at `ea7b370` plus `0718e1d` (INBOX 207 and 208 filed). Port 8801, data dir
`/tmp/mm-chrome`. Sweeps: `scratchpad/ui-sweeps/chrome203.js`, `chromehelp.js` (the header
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
  `syncModelGatedControls`: this commit. 7 of 15 gated before, 15 of 15 now;
  0 left holding the offline tooltip once a model is back.

## Next, in order

1. INBOX 205 second half, 204 second half and 208: the palette's starters,
   the Guide's persona and knowledge, the foot row.
2. INBOX 214: the Notes/Boards/Documents/Reminders tab buttons as one
   segmented control, `.dock` grammar, measured.
3. INBOX 215: "Save as chat" in the palette's foot menu, posting the popup
   agent's transcript to `/conversations` and opening it in the Chat tab.

## Not verified

- Everything is measured at 1440x900 and 390x844 in light mode unless a line
  says otherwise; dark is not swept per item.
