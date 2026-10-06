# Documents 1004: what is left

Worked DOCUMENTS_PLAN's open rows in the brief's order. Section 17 (17a to
17e), the phone formatting bar, Phase 5 items 2 and 3, Phase 7's python-docx
row and Phase 8c's board card were already built; the plan's stale rows now
point at HISTORY.md ("Moved from the plans, 2026-10-04 (the documents phone
pass)"), which also holds what this pass fixed (the status line under the foot
bar, the selection bar off a phone's window, the task box at the target
floor's size, grammar on wiki links) and the `enhanceSelect` focus lint.

Sweeps added: `scratchpad/ui-sweeps/docphonebar.js` (390x844, THEME) and
`doctaskbox.js` (1440, 820, 390, THEME).

## Still open, in the order to take them

1. ~~The viewport popups with the background art on~~ Done by design-1004: measured clean (HISTORY.md, "Moved from the plans, 2026-10-04 (design-1004)").
2. **The selection bar and a phone's own selection menu.** iOS and Android
   draw Cut, Copy and Paste above a selection, where this bar also goes. Not
   observable here; if a report arrives, the bar goes below the selection
   on `(pointer: coarse)` (one line in `selectionBarShow`).
3. ~~The phone's chrome above the first line~~ Done by design-1004: Read view's first line 255 to 199 at 390x844 (HISTORY.md, same section).
4. **Section 18's chat context** on a phone: its commands press controls in
   the chat dock, so measure against that dock (not done here).
5. Left deliberately (OPEN.md): the word menu's shrink-to-fit width (not
   observed), Phase 6 item 4's icons rail (a no-op by measurement).

## Not verified

- A real on-screen keyboard (the foot bar and the card's margin read
  `--keyboard-inset`, stubbed only by `dockeyboard.js`).
- A real phone's selection handles and system menu against the selection bar.
- The task box's strip with a real finger (Chromium's touch emulation also
  snaps a tap to a nearby target, so the strip's own reach is measured by
  `elementFromPoint`, not by the tap).
