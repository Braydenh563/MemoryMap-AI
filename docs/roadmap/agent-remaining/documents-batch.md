# Documents: the owner's evening batch (DOCUMENTS_PLAN, "Placed from INBOX, 2026-09-09")

**Worktree** `agent-ad5696bf1be5660c3`, branch
`worktree-agent-ad5696bf1be5660c3`, cut from `claude/epic-ramanujan-8xocc0`
at `edb6aae`. Five commits, all five items of the batch done, nothing
half-finished and nothing uncommitted. Never pushed; that is the
orchestrator's job.

**A trap for whoever cuts the next worktree.** This one arrived checked out
at `28a8911`, **423 commits behind the branch** it was supposed to be cut
from: no `DOCUMENTS_PLAN.md`, no `INBOX.md`, no `agent-remaining/`, and a
`CLAUDE.md` from an earlier era that still described `frontend/app.js` as one
file. `git reset --hard claude/epic-ramanujan-8xocc0` fixed it (HEAD was an
ancestor, so nothing was lost), but a session that had not checked would have
built the whole batch against a codebase without CodeMirror in it. There is
also no `.venv` in a fresh worktree; `scripts/gate.sh` reads `$ROOT/.venv`
and fails both the lints and ruff with "No such file or directory", which
reads like a broken gate rather than a missing symlink. One
`ln -s /home/user/MemoryMap-AI/.venv .venv` in the worktree, or `PY=…`.

## What is done, with its numbers

Every number below was read out of a running app, never off a screenshot.

**1. Click an underlined word, see a popover** (`0fbfe87`). **No editor code
changed: it already worked.** The plan's entry said "the click target and its
popover never landed", and that entry was written without a browser; Phase 2
turned the findings into mark decorations and the click, double-click,
right-click and Alt+Enter routes all reach `openDocSuggest`.
`scratchpad/ui-sweeps/docsuggest.js` is the check that should have existed
before the reading did: in Live *and* Source, four marks of three kinds, all
with `cursor: pointer` and a real underline; one plain click opens
`.doc-suggest-menu` at left 470.6 against the mark's own left and top 172.8
against its bottom of 168.8, inside the viewport on all four including one
against the right edge; the first item rewrites the document; Alt+Enter opens
the same menu. `long-sentence` draws no underline, which is `DOC_FINDING_SKIP`
doing what its comment says.

**2. Markdown markers go invisible unless the selection is in them**
(`f9e053f`). The cursor-in-range test was already there and works through all
three of the owner's gestures. What was missing was found by inventory, not
by reading the plugin again: `---` drew its border **and** its three dashes,
and `> [!warning]` hid its `>` and kept its `[!warning]`. Both fixed; the
callout now shows its kind's own label from `CALLOUT_KINDS` where the marker
was ("⚠️ Warning"). The same inventory then found a third: a setext heading
(`Title` over `=====`) hid its underline, because that underline is a
`HeaderMark` like any other, while the heading branch matched `ATXHeading`
only, so the whole thing rendered as body text. One regex.
`scratchpad/ui-sweeps/cm-reveal.js` holds eight constructs against their
expected render, plus the setext pair, the callout label and the three
gestures.

**3. Three views, line numbers, and a real code editor** (`d396e0c`).
- **Plain** is new: the language compartment emptied (`docCmViewLanguage`).
  Measured on a markdown file, Source colours 2 kinds of token and Plain 0,
  same text, same engine. Offered for code files too, unlike Live and Split.
- **Line numbers** already worked and were unreachable behind the collapsed
  formatting strip. A second door in the view menu (`#doc-view-gutter`), same
  remembered preference. Measured: markdown 0 numbers, 7 after one press, 0
  again; `.py` 7 unasked from a fresh profile.
- **Code syntax** existed for twenty-one languages and was close to invisible
  in dark, because without a highlight style of its own the bundle falls back
  to `defaultHighlightStyle`, a fixed light-page palette with no dark
  variant. Every token was byte-identical in both themes; against the dark
  ground sampled at `rgb(27, 31, 44)`, `def` read **1.76:1** and a variable
  name **1.91:1**. `docCmHighlight` maps six roles onto the app's tokens:
  light 4.56 to 14.62, dark 6.47 to 13.52, all above 4.5.

**4. The Edit / Read toggle overflows** (`8769590`). Confirmed at 1440 and
1280, and the cause is **not** the `padding-block: 0` the plan's partial
reading guessed at. `.doc-dock .seg` is `height: var(--control-h)` (36px)
with the base `.seg`'s 4px padding, so a 28px content box, and
08-consistency.css pinned each button to `--control-h-lg` as well: a 36px box
4px down a 36px pill. Before: segment `scrollHeight` 40 / `clientHeight` 36,
buttons 36px with their bottoms 4px below the segment's. After: 36/36,
buttons 28px, 4px inside at both ends, neither clipping its label.

**5. The Outline sidebar** (`84a9c56`). All five reported problems, each with
its own assertion in `scratchpad/ui-sweeps/docoutline.js`. Centre-alignment
was `justify-content` from the bare `button` rule, not `text-align` (which
read `left` throughout). The indent was 4/16/24/38.4px, steps of 12, 8 and
14.4; now 4/16.8/29.6, a constant 12.8. The Outline section no longer hides
itself, and says what fills it. References is one row (link and ✕ 6.4px
apart, same line) and its picker replaces the button that opened it. The
storage help is its own content width (224.9px box, 225px of text) at the
column's left edge, muted, underlined only on hover. A sixth was found by
looking at the finished panel rather than at the report list: the outline
matched `#` headings only, so it read "2" over a document with three, the
missing one being the setext heading the editor had just started rendering.

## The exact next step

**DOCUMENTS_PLAN Phase 3, item 1: tables as a real editor.** It is the
largest thing still between this editor and the ones the instruction names,
it is the one construct `cm-reveal.js` asserts as *unchanged* (a table's `|`
markers stay visible because nothing renders them yet), and Phase 3's own
gate is already written: `/table`, Tab between cells, a cell menu, rendered
in Live, byte-exact round trip through Source (PLAN D4's gate). Start at
`docLivePlugin`'s `build`, which is where every other construct is handled,
and at `frontend/vendor/codemirror/`'s `markdownLanguage` (GFM), which
already parses `Table`, `TableHeader`, `TableRow` and `TableCell` nodes, so
the tree work is done.

## Not verified

- **Everything above is Chromium only.** No other browser was available.
- **The contrast ratios use one sampled ground.** `--page` is a gradient, so
  it has no `background-color` to read; the dark figure `rgb(27, 31, 44)`
  comes from `scratchpad/pngpixel.py` on a screenshot of the editor at three
  points (28,31,45 / 26,29,42 / 27,31,44), and light is the token value. A
  token sitting over a card rather than the page has a slightly different
  ground, and none was measured.
- **The callout label with a fold marker.** `> [!note]-` and `> [!note]+`
  are matched by the regex and are believed to hide with the marker, but only
  the bare `[!warning]` form was driven in a browser.
- **Plain view with the fallback textarea.** `docCmViewLanguage` is only
  consulted where the engine is mounted; with `docCmBroken` set, Plain and
  Source are the same thing, which is correct but was never run.
- **The full suite** was run once at the end of the batch and is recorded in
  the final report; per-step gating was `scripts/gate.sh --changed`, as the
  brief asked.

## Found and not fixed

- **`enhanceSelect` makes `select.focus()` and select-level `keydown` dead
  code, app-wide.** `frontend/app.js` ~18427 rebuilds every `<select>` as a
  shell with a `<button>` opener and marks the native element
  `select-native-hidden` with `tabindex="-1"`. So focusing a select focuses
  nothing, and a `keydown` bound to one never fires because it never has the
  focus. Two listeners in this batch were written that way before a sweep
  caught them. `grep -n "\.focus()" frontend/*.js` next to a variable holding
  a select would find the rest; there is no lint.
- **The caret jumps when a Live marker reveals.** Walking left across
  `A **bold** word`, `coordsAtPos` reads x 560.3, 554, 544.2, 531.1 and then
  **559.5** on the press that reveals: a 28.4px move to the *right* on a
  leftward keystroke, because the reveal inserts four characters left of the
  caret. `EditorView.atomicRanges` is the usual answer and is the wrong one
  here: it would make the arrows skip the marker rather than enter it, and
  entering it is exactly what the owner asked for. No good answer found.
- **Five file types have no language mode.** `csv`, `ini`, `php`, `r` and
  `swift` are offered by `GET /documents/file-types` and fall through
  `docCmLanguageFor`'s `default`, so they are plain text with line numbers.
  `php` and `swift` exist in `@codemirror/legacy-modes` and would need two
  lines in `frontend/vendor/codemirror/entry.js` and a `build.sh` run (node
  and npm); `r` has no mode in the CodeMirror packages at all. `csv` and
  `ini` arguably want none.
- **`scratchpad/ui-sweeps/editor.js` still describes the retired editor**,
  as `documents-engine.md` §2 says. Untouched here.
- **The Outline section takes all the spare height.** `.doc-outline-wrap` is
  `flex: 1 1 auto`, so a four-entry outline leaves ~250px of empty column
  between it and References. Not reported, not fixed, and it is part of "the
  whole documents sidebar and ui needs fixing" if someone picks that up.
