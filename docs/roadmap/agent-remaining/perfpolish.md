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
  four lints in `tests/test_css_invalidation.py` (d6e9cb3).
- Part 1, step 2: the interaction table (median of three) in HISTORY.md,
  "INBOX 400 part (1)", and the INBOX note (8ef9c42).
- Part 2, step 1 (c3bbefc): `--ease-out`, `--ease-in-out`, `--ease-spring`;
  132 transitions onto the tokens; `tests/test_motion_tokens.py` (no
  `transition: all`, no raw duration, no untokened or missing curve, no
  `filter` on hover); INBOX 405's hover filters replaced by
  `--accent-surface-hover` and `--hover-veil`, the tab bar and the tonal
  icon buttons given the hover they never had (`f2-hover.js`: 101 of 571
  buttons unchanged on hover, 0 after, the selected segment and tab
  excepted); switch knob on the spring; toast fade in and out through
  `dismissToast`; skeletons in the Library and the Timeline.
- Part 2, step 2: the '?' popover fades in from its button (`f2-skel.js`
  7/7).

## Left

- Menus leave instantly (`.hidden`, display none) though they enter with a
  160ms reveal; an exit needs every close path (`closeActionMenus`,
  Escape, outside click, the escaped-menu restore) to wait for it. Left for
  the menu and a11y agent that owns those paths.
- INBOX 405: the coordinator's `.chat-jump-latest` and back-to-top fixes in
  08-consistency.css merge beside this; resolve 405 once both are in.

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
