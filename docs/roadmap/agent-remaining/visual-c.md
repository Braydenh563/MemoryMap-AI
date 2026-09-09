# visual-c: three visual redesigns, what is left

Worktree `agent-a39e62953a9e53b63`, branch `worktree-agent-a39e62953a9e53b63`,
cut from `claude/epic-ramanujan-8xocc0` at `ab7f7f4`. Five commits, not
pushed. Server `:8788`, data dir `/tmp/mm-8788`.

## Done

| Item | Where the numbers are |
| --- | --- |
| GRAPH_PLAN Phase 6, the node panel (INBOX 59) | GRAPH_PLAN.md, "Built, Phase 6" |
| Library image cards (INBOX 56) | INBOX.md entry 56, marked fixed |
| Whiteboard bottom bar, zoom pill and properties panel (INBOX 52, 64, 65) | WHITEBOARD_PLAN.md, "Built, 2026-09-09" |

## Left for the orchestrator

1. **INBOX 64 and 65 have no "fixed" mark**, and that is a merge hazard
   rather than an oversight: both entries were added to `INBOX.md` after
   this worktree was cut (`ab7f7f4`), so they do not exist in the copy this
   branch edits, and writing them here would conflict with the branch's own
   version of the file. The work is done and measured; the numbers are in
   WHITEBOARD_PLAN.md's Built block, ready to paste onto both entries.
   Entry 52 *is* marked fixed, because it predates the cut.

## Not verified, said plainly

- **A real touch device.** The graph node panel's 390 sheet and the
  whiteboard's panels were measured in a 390px Chromium viewport, which is
  a viewport, not a phone.
- **The align and distribute actions themselves.** Their markup changed
  (labels to icons); their handlers were not touched and were not driven.
- **A real vision model.** The Library card fixture writes the description
  and both readings through the API, so what a model would actually produce
  (length, line breaks) is not what was measured against the three-line
  clamp.
- **The Files rows** share the image tile's builder and were checked with
  one hand-made PDF (`scratchpad/ui-sweeps/seed-file.js`), not with a real
  scanned document.

## Found, not fixed

- **A tile's Rename and Delete buttons are never in the DOM.** They are
  detached `<button>` objects the kebab's rows `.click()`
  (`renderLibraryImagesGallery`, library.js). That is deliberate and works,
  but it means `.library-image-edit` and `.library-image-delete` match
  nothing in a running page, so the `[data-glass="off"]` rules naming them
  (03-dashboard-widgets.css) style nothing at all. Either the rules are
  dead and should go, or the buttons should be in the row and the menu
  should be the overflow. Not touched here: it is a behaviour question, not
  a visual one, and this pass was told to leave those two controls where
  they are.
- **The graph node panel is reachable while the graph is in fullscreen**,
  and INBOX 66 says the lightbox it can open is not. Same phase, not in
  this brief.
