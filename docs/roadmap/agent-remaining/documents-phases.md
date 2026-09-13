# What the documents-phases agent leaves (2026-09-13)

Branch `claude/epic-ramanujan-8xocc0`. Port 8793, data dir `/tmp/mm-docs`.
Sweeps this work is measured by, all of which exit non-zero on failure and
print their numbers: `doctable.js`, `aiedit.js`, `docnarrow.js`,
`notesurface.js`, `docexports.js`, `docfallback.js`, plus `cm-notes.js`,
`cm-editor.js` and `cm-live.js` as the regression set for the engine. Run them
before and after touching anything they cover.

## Landed, session of 2026-09-13 (evening)

Resumable from `git log` plus this list; the file is updated after every
commit.

- **INBOX 191, the live table view.** `c869320`. A hidden pipe leaves three
  zero-width children in the line and `grid-auto-flow: column` gave each a
  track: three columns drawn as fifteen, cells at 51.6px, every word wrapped;
  a spelling underline was drawn outside the cell mark and split one cell into
  five. Cells are placed by index now (`cm-md-cols-N` / `cm-md-cN`), the rest
  pinned at zero width, findings nest inside. `doctable.js` 24/24 light and
  dark.
- **INBOX 192, the Edit / Write / Remove row.** `e4fa704`. `.seg`'s numbers:
  track 15.4px (was 11.2), segment 10.4px and concentric (was 6), three equal
  101.2px segments on a grid (were 73.4/82.7/101.2), a focus ring, and the
  verbs behind a `data-help-for` '?'. `aiedit.js` extended, PASS both themes.
- **Phase 6 item 1, the phone formatting bar.** `6ee8134`. `.thumb-bar` is a
  new DESIGN.md recipe row with its lint in the same commit. `docnarrow.js`
  extended: 7 actions, 44px smallest, foot at the window edge, bold and the
  "/" menu driven from the bar, absent above 600.
- **Phase 6 item 2, the outline sheet.** `cecab76` (decision only): measured
  two taps and 44px targets at 390, so a second sheet was not built; the plan
  records why.
- **Phase 8a and 8b, one editor everywhere.** `cb359c3`. `noteSurface()` in
  `documents.js` (NOTE-SURFACE-BEGIN/END), six boxes, `tests/test_note_surface.py`,
  `scratchpad/ui-sweeps/notesurface.js` 22/22. 8c's two halves are in
  `whiteboard.js` and `editor.js`, which this agent does not own.
- **Phase 7's rest.** `db80a66`. `GET /documents/{id}/export.zip` (markdown
  plus `assets/`), `export.docx` behind the optional python-docx with a 501
  that names it, `docview.docx_to_markdown` and `html_to_markdown` (no
  converter needed), `tests/test_docexport_bundle.py`,
  `tests/test_docview_import.py`, `scratchpad/ui-sweeps/docexports.js` 6/6.
  Left for whoever owns `core/extras.py`: one `Extra(...)` row for
  python-docx so the Word export can point at a button.
- **The carried "not verified" lines**, three of them measured. `11a129b`,
  with `scratchpad/ui-sweeps/docfallback.js` as the new sweep. See the next
  section.
- **Next:** the four rows under "Open" below, none of which is in a file this
  agent owns except the first's own factory row.

## Verified this session, from the carried "not verified" lists

Three lines that earlier sessions could not check, checked. Each is a number
from a sweep or a probe, not a reading of the code.

- **The fallback textarea path** (`docCmBroken`), carried through three
  sessions of this plan as "nothing has been driven in a browser with the
  engine off", and newly load-bearing for Phase 8's note boxes.
  `scratchpad/ui-sweeps/docfallback.js` refuses `/vendor/codemirror/**` at the
  network and drives the app on the other side: 8 of 8 and 0 unexpected console
  errors. The surface is the textarea, `#doc-source-wrap` does not claim
  `has-cm`, the toolbar still writes (`**paragraph**`), the document still
  saves what was typed, the markdown table is still the text its author typed,
  and a capture box stays a textarea and takes what is typed into it.
- **The callout fold markers** (`> [!note]-` and `> [!note]+`), carried as
  "believed to hide with the marker, but only the bare form was driven in a
  browser". Measured in Live: the `-` form renders `📝 Note ▸Folded by
  default…` with its body line folded away, the `+` form renders `💡 Tip ▾`
  with its body line present, and both carry `.cm-md-callout-fold`. They work.
- **A table indented inside a list item**, carried as "an indented table inside
  a list is not one as far as `docTableParse` is concerned". Measured: it is.
  A two-column table indented under `- item` renders as
  `cm-md-table cm-md-cols-2` with two placed cells per row, because the model
  keeps a row's indent rather than requiring the line to start with a pipe.
  The carried line is out of date, not a bug.

## Landed

- **DOCUMENTS_PLAN Phase 5 item 1, comments.** `ec2f276`. Block moved to
  HISTORY.md ("Moved from the plans, 2026-09-13"); the plan holds a pointer.
- **INBOX 157, the writing panel's height.** `b208df9`, rolled back by a
  concurrent commit from a stale shared index and restored in `1fe9525`.
- **INBOX 158, the AI assistant dialog**, and INBOX 111's carried sub-item
  ("the ai edit history popover still not centering", measured fixed). `1fe9525`.
- **Phase 6, the phone band's targets**, with the phase's state measured band by
  band in the plan.

## Open

1. **Phase 8c**, whose two halves are in files this agent does not own (see
   "Found, not fixed"): the board's note card (`whiteboard.js`) and the skill
   editor's steps box (one row in `editor.js`'s `EDITOR_SURFACES`). Adding a
   box to the factory is one row in `NOTE_SURFACES` (`documents.js`) and one
   line in `tests/test_note_surface.py`'s own list if it is not note text.
2. **`.segmented-control` app-wide**, one rule in `03-dashboard-widgets.css`,
   which DESIGN.md already describes and this session could only apply to
   `#doc-ai-verb`.
3. **A row for python-docx in `core/extras.py`**, so the Word export's refusal
   can point at a button rather than name a package.
4. **Phase 6's remaining rows** are deliberate no-ops with their reasons in the
   plan: the 820 to 1100 icons rail (the measure is already at its cap) and the
   outline as a second sheet (decided against, measured).

## What ran before this report

`scripts/gate.sh --staged` (the lint set against the index, `node --check`,
ruff) before every commit, the targeted tests for the files each commit
touched, and the sweeps named at the top. The full suite was run once at the
end, which is standing order 5a's "once before a large agent task's final
report"; its result is in the report that goes with these commits. Every commit
here is pushed to `agent/wip-documents`, so CI has them too.

## Found, not fixed (2026-09-13 evening)

- **`.segmented-control` is only conformed where it was reported.** INBOX 192's
  fix is scoped to `#doc-ai-verb` in `09-editor.css`, because the base rule
  lives in `03-dashboard-widgets.css`, which the documents agent does not own.
  Measured: every other `.segmented-control` in the app (`#graph-layout` is the
  other one) still has an 11.2px track and a 6px segment where `.seg` is
  15.4px. One rule moved into the base file finishes it, and DESIGN.md already
  says it should be.
- **python-docx has no row in `core/extras.py`.** So the Word export's 501
  names the package instead of pointing at a button in Settings, optional
  extras. One `Extra(...)` entry and the message can be improved to match.
- **Phase 8c's two halves are in files this agent does not own.** The board's
  note card is `whiteboard.js`'s canvas text field, and the skill editor's
  steps box needs one line in `editor.js`'s `EDITOR_SURFACES`. The factory
  both need is built: `noteSurface(host, options)` and the `NOTE_SURFACES`
  table in `documents.js`, one row per box.
- **The capture box's autogrow still writes an inline height on the mirrored
  textarea**, which is invisible (the mirror is at zero opacity) but means the
  mirror's box ends before the view's does. Measured: left and top within 1px,
  width within 2px, height 176 against 354. It matters only to code that
  positions something off the textarea's *bottom*; nothing does today.

## Traps this session paid for

- **A patch script that asserts before it writes leaves nothing behind.** Two
  of this session's edit scripts asserted on three anchors and wrote at the
  end; the third anchor failed, so the first two edits were silently not
  applied and the next measurement read the old file. Write after each
  replacement, or check the file afterwards rather than the script's output.
- **`html.parser` never closes a void element.** `<meta>` raises
  `handle_starttag` and there is no matching end tag, so a "skip what is inside
  this" counter that includes `meta` never returns to zero and the whole page
  after `<meta charset>` is dropped. The fixture came back as its own HTML and
  looked like a parser that had not run at all.
- **A CodeMirror theme cannot be out-ordered, only out-specified.** A second
  `EditorView.theme` added later in the extension list did not beat
  `docCmTheme`'s `.cm-content` padding; the rule that worked is in
  `09-editor.css` at two classes plus one, which is what the note at the top of
  that file says.
- **The mount has to read the caret and the selection at mount time.** The
  bundle takes a moment, a person types into the textarea meanwhile, and a
  view seeded with the caret captured at *focus* time puts those characters in
  the wrong order ("worldhello "). Seeded with only `anchor`, a caller that had
  selected a word before acting on it gets its selection collapsed and the
  action lands a placeholder at the start of the line.

## Traps earlier sessions paid for, still true

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
