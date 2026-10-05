# quick-gutter (INBOX 589, 590)

- 589 done: 5c14a59. Quick access: first tile highlighted by position; per-tile Highlight (accent, twelve category hues, No highlight) from the tile menu, stored as `dashboard_quick_tints`. Sweep `scratchpad/ui-sweeps/quicktint.js`.
- 590 done: see the commit after 5c14a59. Line numbers: no box, 0.8x tabular muted figures on the text's baseline, caret line brighter on focus; note boxes number themselves inside the editor view. Sweep `scratchpad/ui-sweeps/gutter.js`.
- Left: nothing in the brief.
- Found, not fixed: `scratchpad/ui-sweeps/quickaccess.js` is stale (it looks for a row menu in `.launch-head` that INBOX 488 moved to the dock's Customise) and times out at its first step. **Fixed 2026-10-05 (small-1005):** it drives `#dash-customise` and the Quick access manager, 24 of 24 at 1440.
- Not verified: the baseline drop (0.43 of the size difference, 0.17em in the editor view) is measured with the sandbox's system-ui font only; Windows' Segoe UI has slightly different metrics.
