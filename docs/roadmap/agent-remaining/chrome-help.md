# chrome and help agent: what landed, what is left

Branch `agent/wip-chrome`, worktree cut from `claude/epic-ramanujan-8xocc0`
at `ea7b370` plus `0718e1d` (INBOX 207 and 208 filed). Port 8801, data dir
`/tmp/mm-chrome`. Sweeps: `scratchpad/ui-sweeps/chromehelp.js` (the header
cluster, the status bar slots, the help popover's first painted frame and
cap, the palette popover's stacking, the theme switch, the model-gated
inventory) and `chrome207.js` (both slots open their panels, 390 and the
More sheet).

## Done

- INBOX 207, the agent and the Guide leave the header, and the header's icon
  buttons lose their segmented wells: `413dd5c`.
- INBOX 206, the help popover's ceiling, its first painted frame and its
  right edge on a phone: `06f6048`.
- INBOX 205 first half, the '?' popover's tier inside the palette: this
  commit. The starters half is still open.

## Next, in order

1. INBOX 202, the theme switch: 4,214 of 5,590 elements compute
   `transition-property: all`, and 79 carry a `backdrop-filter`.
2. INBOX 203: no control in the app carries `data-needs-model` yet
   (measured 0).
3. INBOX 205 second half, 204 second half and 208: the palette's starters,
   the Guide's persona and knowledge, the foot row.

## Not verified

- Everything is measured at 1440x900 and 390x844 in light mode unless a line
  says otherwise; dark is not swept per item.
