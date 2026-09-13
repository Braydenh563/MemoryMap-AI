# Chat and popup agent, 2026-09-13 evening: what landed and what is left

The chat agent's run against INBOX 181, 182, 183, 187, 188, 189, 190 and
`chat-timeline-skills.md`'s chat items. Port 8795, data dir `/tmp/mm-chat`.

## Landed

- `6167d5e` INBOX 187: the popup agent's caret waits for the first token
  (`scratchpad/ui-sweeps/agentcaret.js`).
- `614b987` INBOX 183's badge: the subline separator left the context pill
  (`scratchpad/ui-sweeps/chatbadge.js`).
- `16c96ea` INBOX 188: the table bar is Copy plus a `kebabMenu`
  (`scratchpad/ui-sweeps/tablefull.js`).
- `9ce8353` INBOX 181: the fit toggle works in a bubble, full view resizes
  columns and rows (same sweep).
- `5bd85ee` INBOX 182 (over `8e652a2`): right-click and long-press on any
  link opens one `kebabMenu` at the pointer, with the DESIGN.md recipe row and
  its ratchet (`scratchpad/ui-sweeps/linkmenu.js`).
- `8e652a2` WIP, INBOX 182: `openMenuAtPoint` plus the delegated contextmenu
  and 500ms hold listeners in `frontend/app.js`, the `.pointer-menu-host`
  recipe in `frontend/css/02-chat-graph.css`,
  `scratchpad/ui-sweeps/linkmenu.js`.

- `9bd0c07` INBOX 189 and 190's label: the palette names a map a map, a board
  a board, and scopes the run to `board_ids`
  (`scratchpad/ui-sweeps/agentsubject.js`).

- `c052eb6` INBOX 190 and 193: the wand and the '?' in the header and the
  Settings head, the Guide as one shared `openSheet`, per-tab starters, arrow
  keys through them, a state line naming the tool
  (`scratchpad/ui-sweeps/agentwide.js`). CHAT_PLAN decisions 13 and 14.

- `6147863` INBOX 190's last part: `/help/ask` takes the tab and the tab's
  own control labels; `TAB_TOPICS` grounds a question that names nothing.
  INBOX 190 closed.

- `27cc1f3` CHAT_PLAN decision 2's last half: a citation mark shows the
  passage it came from on that source's card, hover and focus
  (`scratchpad/ui-sweeps/citepassage.js`). Closes
  `chat-timeline-skills.md` item 1's renderer step; item 4 judged not worth
  doing and the reasoning is written into that file.

- `fb25225` Phase 3's starter gate line follows INBOX 190 (14 chips, 6
  groups); `3993f19` the link hold's cancel listeners are per hold and
  passive rather than three permanent `document` listeners, one of them
  `pointermove`.

## Gates run at the end
- `scripts/gate.sh --staged` green before every commit (lints, staged-lints,
  node-check, ruff).
- Sweeps against the running app on 8795: `errors.js` 0 errors and 0 layout
  findings at 1440, 1024, 820 and 390; `contrast.js` ok on every surface it
  lists; `docks.js` chat and notes still report one control height (36);
  `touch.js` 0 under-44px, 0 covered and 0 overlapping taps on the 8 surfaces
  it reached before its own browser closed; `chatphase3.js` green with the
  superseded starter line rewritten.

## Found, not fixed: one full-suite failure, and it is not about this work

`tests/test_static_compression.py::test_a_stamped_asset_is_immutable_and_gzipped`
fails: "gzipped app.js is 609068 bytes, expected under 600 KB". The number in
that assertion is a smoke bound written when the file's own docstring recorded
"515 KB on the wire for a 1.6 MB app.js"; nothing in it argues for 600 KB as a
budget. **It was already 4.8 KB from firing before this agent started**: the
branch head's own `frontend/app.js` gzips to 595,215 bytes against a 600,000
cap, and the file is 1.93 MB of source. This run added 15.4 KB of code and
18.4 KB of comments to it; deleting every comment of mine would still leave it
over, so trimming prose is not the fix and is not what the bound is pointing
at.

Two real options, both above a single agent's remit, hence this note rather
than a commit: raise the bound with the reason recorded beside it (the file is
served gzipped and revalidated, and 600 KB was never a measured budget), or
split `frontend/app.js`, which is the thing the number is really measuring.
Whoever owns the branch's CI should take one. Everything else in the suite
passed, every test this work touched is green, and `scripts/gate.sh --staged`
passed before every commit here.

## Next

1. `chat-timeline-skills.md` item 1's remaining half, which is not the
   renderer: the ten-question eval fixture set and the "supported" threshold,
   which decide *which note* grounds a sentence (CHAT_PLAN decision 2). Needs
   Brief 12's fixtures before anything can be claimed about it.
2. Found, not fixed: `data-help-for` popovers exist 41 times and every one is
   in the Settings modal or a dialog; not one of the seven tabs carries one.
   The Guide sends the tab's control labels instead, and a tab that grows a
   popover is picked up with no further change.
3. Not verified: every AI path here ran against a shimmed `/chat/stream` and a
   stubbed `/models/status`. No model answered anything, so what a real small
   model does with the Guide's new tab context is untested (CLAUDE.md section
   4's standing caveat).
