# What the documents-phases agent leaves (2026-09-13)

Branch `claude/epic-ramanujan-8xocc0`. Port 8951, data dir `/tmp/mm-docs`.
Probes written this session: `scratchpad/ui-sweeps/doccomments.js`,
`prosefit.js`, `aiedit.js`, `docnarrow.js`. Each exits non-zero on failure and
prints its numbers; run them before and after touching anything they cover.

## Landed

- **DOCUMENTS_PLAN Phase 5 item 1, comments.** `ec2f276`. Block moved to
  HISTORY.md ("Moved from the plans, 2026-09-13"); the plan holds a pointer.
- **INBOX 157, the writing panel's height.** `b208df9`, rolled back by a
  concurrent commit from a stale shared index and restored in `1fe9525`.
- **INBOX 158, the AI assistant dialog**, and INBOX 111's carried sub-item
  ("the ai edit history popover still not centering", measured fixed). `1fe9525`.
- **Phase 6, the phone band's targets**, with the phase's state measured band by
  band in the plan.

## Open, in the order the plan wants them

1. **Phase 6 item 1, the phone formatting bar** (< 600).
   - File: a new block in `frontend/css/10-responsive.css` band 4, markup in
     `frontend/index.html` beside `#doc-toolbar` (line ~3085), wiring in
     `frontend/documents.js` (`applyMarkdown` already takes a box id, so the bar
     is six `data-md` buttons and one `/` button, not a new dialect).
   - Next step: **DESIGN.md's recipe index has no row for a bar that sits above
     the on-screen keyboard**, and standing order 11 says the row and its lint
     land in the same commit as the feature. `app.js` around line 33696 already
     writes `visualViewport` into a custom property for the two bottom docks
     (see `07-whiteboard-misc.css` ~9883): read that property, do not add a
     second listener.
   - Measure with `docnarrow.js` (extend it: the bar's own height, that it sits
     above the inset, that the caret's line is still on screen). The sandbox has
     no soft keyboard, so the keyboard half cannot be verified here: say so.
2. **Phase 6 item 2, the outline as a sheet from the bottom** (< 600). Judgement
   first: the left sheet already carries the outline, so decide whether a second
   sheet earns itself before building it.
3. **Phase 7, export and interchange.** PDF (print stylesheet) and Markdown
   (`GET /documents/{id}/export.md`, comments already footnoted by
   `docexport.comments_to_footnotes`) exist. Missing: HTML, DOCX, Markdown with
   assets, import of `.docx`/`.html`.
   - Next step: **settle one decision before writing any of it** (standing order
     3, so this is an INBOX entry with a one-line recommendation, then taken):
     *what "self-contained HTML" means here.* There is no server-side
     markdown-to-HTML renderer (checked: nothing in `src/memorymap/core/`), so
     the only faithful source is the already-rendered `#doc-preview` DOM on the
     client. The recommendation: export from that DOM with a small purpose-built
     stylesheet rather than inlining the app's eleven sheets, images as `data:`
     URIs, and a test that asserts the file names no external host.
   - DOCX wants `docview`'s readers reversed or `python-docx` as an optional
     extra; the suite must not depend on the extra being installed.
4. **Phase 8, one editor everywhere** (8a, 8b, 8c). Not started. The plan's
   decisions are made and must not be remade; `noteSurface(host, options)` is
   built on the Phase 2 adapter (`docSurface()`/`textareaSurface`/`cmSurface` at
   the top of `documents.js`, between `DOC-SURFACE-BEGIN` and `DOC-SURFACE-END`),
   and the lint the plan names (`tests/test_note_surface.py`) does not exist yet.

## What CI covers rather than this session

The full suite was **not** run to completion locally, and that is standing order
5a rather than a gap left by accident: it is ten to fifteen minutes on a quiet
box, it was started once before this report and reached 37% in far longer than
that because two other agents were driving Chromium sweeps in the same container,
and CI runs it on every push. All five commits here are pushed, so CI has them.
What did run locally, before every commit: `scripts/gate.sh --staged` (the lint
set against the index, `node --check`, ruff), plus `--changed` at the first step,
and the targeted sweeps named above. If CI is red on any of these commits, the
suite is where to look first and nothing local contradicts it.

## Traps this session paid for

- **The worktree and the git index are shared with other agents.** Commit from a
  private index (`GIT_INDEX_FILE=<scratch>/mine.index; git read-tree HEAD; git
  add <your paths>; git commit`), and stage a file you share hunk by hunk. A
  commit of mine was rolled back by another agent's commit built from the shared
  index while it still held pre-commit blobs for my files; after committing, run
  `git add` on your own paths in the shared index so the next agent's commit
  carries them rather than reverting them.
- A sweep that flags a negative `left` reports the sidebar *sheet* as a bug: the
  three sheets park at `translateX(rail - 100%)` below 820 on purpose. Check
  overflow to the right only.
- The page's CSP forbids `unsafe-eval`, so a probe cannot ship a function into
  `page.evaluate` as a string.
- `panel.scrollHeight` is not the content height of a flex column whose child
  grows: it comes back equal to `clientHeight` however empty the box looks. Sum
  the children.
