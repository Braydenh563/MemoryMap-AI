# The document editor's writing intelligence: INBOX 168, and what is left

Agent: Opus, 2026-09-13, in the shared worktree on
`claude/epic-ramanujan-8xocc0`. Brief: INBOX 168 ("document autocorrect popups
go offscreen"), with 142 and 128 folded in. Commits `14a6780` (the cause and
the fix), `556324b` (the two recipes and their lints), and the documentation
move that follows them. The previous pass's list is
`agent-remaining/prose-intelligence.md` and every item on it is still open;
this file is only what this pass added.

## What the bug actually was

Not arithmetic. `placeDocSuggest` clamps unconditionally, so the menu cannot
leave the viewport by adding up badly, which is why `spellwide.js` read every
case it tried as flush. A `position: fixed` element takes its containing block
from the nearest ancestor carrying a `filter`, `transform` or
`backdrop-filter`, and `:root[data-bg-art="on"]:not([data-glass="off"]) .card`
gives the document card one whenever the background art is on. The default
profile a sweep boots has the art **off**, which is the whole reason twelve
cases and two sessions missed it.

Reproduced at 1440x900 with the art on: the menu asked for `left 952, top 322`
and drew at `1245..1485, 399`, 45px past the right edge of the window, 223px
past the card, 53px from its word; the completion popup drew 294px from the
caret. After: 0px gap, 4px below the fragment, 0px past the card, nothing off
screen, at 1440, 1100 and 820 wide, in Live, Source and Split, with Large text
and Spacious, with the art on, and with a transform on `body`.

## Left open, in order of value

1. **The rest of the app's viewport popups have not been measured with the
   background art on.** `kebabMenu`'s menus escape to `document.body`
   (`wireEscapedActionMenu`) and the toolbar dropdowns correct themselves
   (`clampToolbarMenu`), so those two families are covered; the ones built by
   other routes are not checked: the chat dock's popovers, the selection
   popup, the whiteboard's context menu and `.wb-board-menu`
   (`escapeAndCapMenu`, which deliberately does not own its position). Next
   step: a sweep that sets `data-bg-art="on"`, opens each in turn and asserts
   the same two things `spellwide.js` now asserts, the parent and the trap.
2. **`clampToolbarMenu`'s comment says the trigger cannot be reproduced in this
   sandbox** ("this sandbox's headless Chromium reports `backdrop-filter: none`
   on every `.card`, so the user's exact trigger does not fire here"). That was
   true with the art off and is not true now: with `data-bg-art="on"` the card
   reports `blur(14px) saturate(1.5) brightness(1.02)` in this Chromium and the
   trap fires. Worth correcting so the next reader tests the real path rather
   than the `filter: saturate(1)` stand-in.
3. **The word menu still measures its own width before it is placed.** A
   `position: fixed` box with `left` set and no `right` is shrink-to-fit
   against the space left of the containing block's right edge, so a menu with
   long candidates opened near the right of a narrow card can render narrower
   than the width the placement was computed from. Not observed (every case
   measured sat at the 15rem minimum), and harmless while it does: the clamp
   errs left. Next step if a report arrives: measure at `left: 8px` first, then
   place.
4. **A finding below the editor's visible box gets a menu drawn over its own
   word.** Measured in `spellwide2.js`'s table-cell case: the word sits at
   `655..707` in an editor whose visible box ends at `572`, and the menu is
   placed at `440..717`, so the word is inside the menu's own vertical range.
   The sweep reads that as a 0px gap and passes, because it measures the gap
   between the two boxes and an overlap has no gap. Two things to decide: why
   `docRevealForSuggest` did not bring that word in (a table cell's mark may
   measure outside the scroller the reveal scrolls), and that a placement must
   never cover the rect it is anchored to, which is worth an assertion of its
   own in both sweeps.

**Done since this file was first written** (commit `e07d173`): the menu now
follows its word on scroll and resize and closes when the word leaves the
editor's box. Before, an 80px scroll left it 84px from its word and it stayed
open after the word had scrolled off the surface entirely; after, 0px
horizontally and 4px below, and closed once the word leaves.

## Found, not fixed, not mine

- **The shared index was stale.** `.git/index` held a tree from before
  `14a6780` and `556324b`: committing from it would have reverted
  `docs/DESIGN.md`, `tests/test_ui_recipes.py` and three other agents'
  CHANGELOG entries. Reset with `git read-tree HEAD` (the working tree kept
  every uncommitted change). Anyone committing from the shared index should
  stage their own paths into a private `GIT_INDEX_FILE` instead, as the briefs
  ask.
- `spellwide.js` flags its words with "idk", so a data directory whose
  `writing_dictionary` contains "idk" (this session's persistence probe put it
  there) silently reduces the sweep to one finding and every case reports "no
  mark". Run it against a fresh data dir, or teach the sweep to clear the
  preference first.
- The dictionary half of INBOX 128 could not be reproduced: adding a word
  persists here across a server restart and a fresh browser profile
  (`writing_dictionary` reads `["idk"]`, the word is not flagged). The
  memoised-empty-set bug `docDictionary`'s comment records would have caused
  exactly the reported symptom; what happened on the owner's machine that
  night is **not verified**.
