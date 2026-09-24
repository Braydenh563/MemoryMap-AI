# perfpolish: style invalidation hunt and component refinement

Brief: INBOX 400 (1), the style-invalidation hunt across every surface, and
INBOX 399 (4), component refinement against motion.dev, Kokonut UI and
bklit.ui, plus INBOX 405 (no `filter` on hover). Worktree cut from
`fix/gemini-fixes-5`; server 8804, data `/tmp/mm-agentF2`, seeded by
`scratchpad/ui-sweeps/f2-seed.js` (500 notes, 50 documents, 40 chats, two
boards, a 500-topic map).

Tools: `f2-trace.js` (one Chrome trace per interaction, `REPS=3` for
medians, `INV=1` for invalidation tracking, `PARTS=n` for the worst task's
parts, `EXP_CSS` for an A/B), `f2-ab.js` (the cost of one recalc against
groups of rules, `CHUNK` to bisect), `f2-prof.js` (a CPU profile of one
interaction), `f2-dom.js`, `f2-shape.js`, `f2-cv.js`, `f2-heights.js`.

## Done

- Part 1, step 1: long lists skip off-screen rows, Library data loads do not
  cross-fade, Timeline formatters made once, dashboard measured in one pass;
  four lints in `tests/test_css_invalidation.py`.

## Left

- Part 2: tokens for easing, `transition: all` and raw-duration lint, press
  and focus states, menu and toast enter and exit, skeletons, INBOX 405.

## Found, not fixed

- `documents.js` `syncDocGutterMetrics` and `renderDocGutter` write a height
  and read a layout per gutter (allowed in the lint; documents.js belongs to
  the editor work).
- Typing in a document: the worst keystroke is 20 to 32ms, most of it in the
  editor's input handlers (documents.js, not touched here).
- The graph's minimap rebuilds its SVG dots and edges on every eighth
  simulation tick (`graphMinimapPaint`, 107ms over a 3s settle at 500 notes);
  updating the existing elements would do.

## Not verified

- Every number is headless Chromium on a shared four-core sandbox; the same
  scene has measured 31 and 115ms on the same code, so the table reports the
  median of three runs.
