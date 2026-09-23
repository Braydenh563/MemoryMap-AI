# Documents tail: what this agent did, and what is left

Session of 2026-09-20, worktree cut from `claude/open-sections-a-b`, seven
commits. The brief was the Documents tail in six steps, each measured in
Chromium before and after. Every struck row in
[`OPEN.md`](OPEN.md)'s Documents section and every section this added to
[`../DOCUMENTS_PLAN.md`](../DOCUMENTS_PLAN.md) (14, 15, 16) carries its own
numbers; this file is the short list of what is still open, so the next
session starts at the work rather than at the reading.

## Built

| Step | What landed | Probe |
| --- | --- | --- |
| 1 | Phase 4 item 5's daily notes, decided first (plan section 14): the Daily template, titled with the ISO day, and a Timeline day bucket that accepts a note *or* a document with that title | `docdaily.js`, 11 of 11 |
| 2 | INBOX 232's last line was already built in Read; what the measurement found was a typed `⧉` on two Copy buttons, now `ph:copy`, with the glyph added to the lint | `doccodecopy.js`, 11 of 11 |
| 3 | Phase 6 item 3: the soft-keyboard chain measured as far as a sandbox can, which found the collapsed formatting strip never reading `--keyboard-inset` | `dockeyboard.js`, 16 of 16 |
| 4 | Phase 8c's skill-editor half: `"skill-steps": "skill"` with its own command set | `skillsteps.js`, 12 of 12 |
| 5 | Phase 2's toolbar-state omission built; the table cell's ten-row menu grouped through the shared recipe | `doctoolbarstate.js`, 21 of 21 |
| 6 | The finding underline's hover tint; `docFindingAtPoint` timed; a lint holding the two finding-kind tables together; `clampToolbarMenu`'s comment corrected | `findinghover.js`, 11 of 11 in each theme |

Decided and deliberately **not** built, each with its reason in the plan:
atomic ranges (section 16), the `Mod+click` underline affordance (16), a
document daily-note endpoint, streak or calendar strip (14), a copy button in
the live view's code fence (15), a "Today" button in the documents dock (14).

## Still open, in the order to take them

1. **Built 2026-09-23 (askcite), see HISTORY.** **The board's note card, Phase 8c's other half.** In `whiteboard.js`, and
   **it is not one row in `NOTE_SURFACES`**: `wbEditNodeText` (~2760) hangs
   Enter-commits, Escape-abandons, blur-commits and an
   `event.stopPropagation()` off that textarea's own `keydown`, and all four
   stop firing once a view is mounted over it. The last is the guard that
   keeps Tab and Enter out of the board's branch gestures. Move the commit
   keymap and the guard onto the surface first, then add the row.
2. **The viewport popups, with the background art on.** The blocker this row
   sat behind is gone: `data-bg-art="on"` gives a real
   `backdrop-filter: blur(14px) saturate(1.5) brightness(1.02)` in this
   Chromium, and a fixed child written to 0,0 inside `.card.doc-main` lands at
   x=293 against the card's x=292. What is left is four openers and four
   selectors (the chat dock's popovers, the selection popup, the whiteboard's
   context menu, `.wb-board-menu`); **find them in the page rather than
   guessing**, which is what cost this session the item. One is settled
   already: `SELECTION_POPUP_EXCLUDED` is
   `"input, textarea, [contenteditable], .selection-popup"`, so the selection
   popup cannot be raised from a form field at all.
3. ~~**`docexports.js` is stale and fails on a click timeout.**~~ Fixed
   2026-09-21. The cause was the one named here: the five download rows are
   written inside the ⋯ menu's `<details>`, but `foldDocMenuGroup` moves
   them at load into a "Download or print" group whose flyout is reparented
   to `<body>`, so the row's runtime parent is the flyout,
   `row.closest("details")` is null, and the probe opened nothing before
   clicking. It now opens the `<details>` by its own id and clicks the group
   trigger, found by its label rather than by position, because three groups
   are folded into that menu and the download one is not the first. A new
   assertion holds the group open before the row is clicked. Measured
   against a live app: 7 of 7 pass, 0 console errors.
4. **A placement must never cover the rect it is anchored to.** From
   `spellwide2.js`'s table-cell case: a word at `655..707` in an editor whose
   visible box ends at `572`, with the menu at `440..717`, read as a 0px gap
   and passed. Worth an assertion of its own in both spell sweeps, and the
   second half of that row, why `docRevealForSuggest` did not bring the word
   in, is still open (a table cell's mark may measure outside the scroller the
   reveal scrolls).
5. **The document surface's aliases have no lint.** `autoGrow(`,
   `mountGutterFor(`, `syncDocGutterMetrics(` or `watchDocGutter(` called with
   an identifier the same function received as a surface reads as correct and
   fails at runtime.
6. Left deliberately, each with its reason in OPEN.md: the templates gallery's
   thumbnail, the outline's 24px rows, the word menu's shrink-to-fit width.

## Not verified

- **No on-screen keyboard exists in this sandbox and nothing here can make
  one.** `dockeyboard.js` stubs `visualViewport.height` at 336px and fires the
  app's own listener, so everything from that number down to the padding is
  real and the number itself is not. What a real phone does when a real
  keyboard opens is still unobserved.
- The `--keyboard-inset` fix was measured at 390 and 820 in light only.
- `findinghover.js` found only `spelling` findings on screen in either theme;
  the `style` and `repeat` tints share one rule shape and one token pattern
  with it, but neither was measured as a painted colour.
