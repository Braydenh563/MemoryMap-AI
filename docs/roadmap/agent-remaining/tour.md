# Agent: the guided tour, switched back on

Worktree `.claude/worktrees/agent-a6fbafa1dfd4719b4`, fast-forwarded to
`fix/gemini-fixes-5` (68427d8) before any change. Port 8797, data dir
`/tmp/mm-agentT` (`bash scratchpad/ui-sweeps/serve.sh 8797 /tmp/mm-agentT`).

The owner, verbatim: "see if you can fix the major issues with the broken
guided tour, its completely broken on all the slides except the first one
which is why all the buttons to it are currently disabled."

## Reproduced (before any change, measured in Chromium)

- On a clean page at 1440x900, 1184x760 and 2000x1140 every step of every
  section drew and stepped correctly: target visible and in the window, the
  cut-out on it, the card on screen and clear of it, the right tab showing.
  The failure was not in that path.
- **With anything open over the page, every step was broken**: the Atlas
  guide sheet, the command palette, the features browser, the shortcut sheet.
  `elementFromPoint` at each target's centre answered the overlay (4 of 4
  steps each), so the hole in the dim showed the overlay, not the control.
  `tourNavigate` closed only Settings, action menus and the finder.
- At 390x844: three steps dropped mid-run (Settings and Timeline live in
  More on a phone, Commands is not drawn), so the counter read 1 of 15, then
  4 of 14, then 10 of 13, then 12 of 12. The card was a 336px box placed
  beside each control rather than a sheet.
- Typing in the lit control (the capture box step invites it): the arrow keys
  moved the tour and Enter advanced it.
- Next pressed twice while a tab loaded started two walks over one run.

## Done in this pass

- `tourClearTheWay` closes every overlay before each step and at open;
  `tourCovered` judges a target covered at five points and a covered target
  counts as not on screen.
- `or`/`orText` on a step: Settings and Timeline point at More on a phone,
  with copy that says so; chrome steps that can never show at this size are
  left out before the count is written.
- The wait now waits for a stable box (two frames the same), and every step
  gets a short settle; one walk at a time (`run.seq`).
- Phone card is a sheet docked away from the control.
- Keys aimed at a field outside the card belong to the field.
- `TOUR_ENABLED` is true.

## Remaining

- The sweep `scratchpad/ui-sweeps/tour.js` at 1440x900, 1184x760 and 390x844,
  with the overlay and resize cases.
- Static tests: `or` targets exist, the switch is on, every door is live.
- CHANGELOG, README's "known to be buggy" paragraph, DESIGN.md row, HISTORY.
