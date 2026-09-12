# Documents: DOCUMENTS_PLAN Phase 3, what items 1 to 3 left and what 4 and 5 need

**Branch** `claude/epic-ramanujan-8xocc0`, three commits: `a963cf6` (tables),
`9daf5da` (callouts, footnotes, math, task progress), `71cad57` (embeds).
Nothing is half-finished and nothing is uncommitted. The built record, with
every measurement and every decision, is in HISTORY.md, "From
DOCUMENTS_PLAN.md Phase 3: blocks and structure, items 1 to 3".

Gates at the head: `scripts/gate.sh --changed` green at each step; `errors.js`
0 errors and 0 layout findings at 1440, 1024, 820 and 390; `contrast.js` clean;
`doctable` 16/16, `docblocks` 21/21, `docembed` 11/11, and `docoutline`,
`docsidebarshape`, `cm-reveal`, `cm-live`, `cm-editor` unchanged.

## 1. Item 4, properties (not started)

**What the plan asks:** YAML frontmatter shown as a properties panel at the
top of the document (tags, aliases, date, status, custom keys), editable as
fields, searchable from the Library's filter.

**The constraint that decides the shape, found while building items 1 to 3.**
A `Decoration.replace` from a view plugin may not contain a line break:
CodeMirror throws "Decorations that replace line breaks may not be specified
via plugin" and the whole view stops updating. Frontmatter is three or more
lines, so **the panel cannot be a block widget over it** from the live plugin.
Two ways that do work, in order of preference:

1. **A panel outside the editor**, built from JS and inserted before
   `#doc-editor` (its host is `$("doc-editor")`, mounted in `mountDocEditor`,
   documents.js ~8811). `frontend/index.html` is another agent's file, so it
   has to be created in script, which the embeds already do for their cards.
   The frontmatter lines then hide in Live the way the table's delimiter row
   does: a `Decoration.line` with `height: 0; overflow: hidden` per line plus
   a per-line `hide()` (there is no line break *inside* any one of those
   replacements, which is what makes it legal).
2. A `StateField`-based block decoration, which may span lines. More machinery
   than this needs.

**Write the fields back the way the table commands do**, and for the same
reason: `docTableSetCellEdits` is the pattern, one `{from, to, insert}` over
the value's own span, so a document's frontmatter keeps the author's quoting,
spacing and key order. A YAML *printer* would reformat every save.

The parse is small: `---` on line 1, `key: value` lines until the closing
`---`, values either scalar or `[a, b]` or a `- ` list. Put it between markers
(`DOC-FRONTMATTER-BEGIN` / `-END`) beside the two regions already there and
test it in node, `tests/test_doc_tables.py` is the template.

**The Library half is in another file.** `library.js` is not in this agent's
scope and the filter it holds is where "searchable from the Library's filter"
lands; `src/memorymap/api/routes_documents.py` needs nothing for the panel
itself (the frontmatter is in the document's text already) but would need a
field or a query parameter if the filter is to be server-side. Decide which
before starting: a client-side filter over the documents list is one function
in library.js and no migration.

## 2. Item 5, columns and images (not started)

**What the plan asks:** two-column blocks via a `:::columns` fence; image
blocks with width, caption and alignment; paste and drop stay as they are.

- **`:::columns`** meets the same line-break rule as the properties panel: the
  fence spans lines, so the two columns cannot be one replace widget from the
  plugin. What *does* work with the machinery already here is the table's own
  trick: a `Decoration.line` class on each line of the fence, with the CSS
  making the block a two-column grid. `.cm-md-table` (documents.js,
  `docCmTheme`) is the worked example, including the `minmax(0, 1fr)` comment.
- **Image width, caption and alignment** want a syntax decision first, and the
  plan does not make one. The two candidates are Obsidian's
  `![[image.png|300]]` (which the embed widget added in `71cad57` already
  parses the name half of, `DocEmbedWidget`, documents.js) and a `:::figure`
  fence. Obsidian's is one line of code away and portable; record the choice
  in the plan's "Decisions made" before building it.

## 3. Found and not fixed

- **`resolveWikiTarget` (app.js ~8905) cannot resolve a note by its title.**
  It matches a note by *content prefix*, which is the form the `[[` picker
  inserts (the note's opening words verbatim), so a note whose first line is
  `# Its title` resolves as `[[# Its title]]` and not as `[[Its title]]`.
  Anyone typing a link by hand hits it. The fix is one comparison beside the
  existing one, against the content with a leading `#` and spaces stripped;
  it was not made here because app.js was held by another agent.
  `scratchpad/ui-sweeps/docembed.js` notes it at the line where its fixture
  avoids it.
- **`scratchpad/ui-sweeps/editor.js` still describes the retired editor**, as
  `documents-engine.md` §2 says. Untouched again.
- **The cell menu is a `kebabMenu` with ten items and no grouping.** Rows,
  columns and alignment read as one list of ten. `kebabMenu` has no separator
  today; adding one is a change to the shared recipe (and to DESIGN.md), which
  is why it was not done inside this work.

## 4. Not verified

- **Chromium only**, at 1440 and 390. No other browser and no touch device;
  the table's cell menu in particular is a 28px target inside the text.
- **The fallback textarea path.** The table model is engine-independent and
  `docTableDispatch` has a branch for it, but nothing was driven with
  `docCmBroken` set; the same is true of the embeds, which need `mapPreview`
  and `entryItem` and would simply not draw in a textarea.
- **Multi-line `$$…$$`** is deliberately not rendered (the line-break rule
  above). Single-line `$$…$$` is.
- **A table inside a callout or a list item.** The parse finds tables by
  pipe-bearing lines, so an indented table inside a `>` blockquote is not one
  as far as `docTableParse` is concerned. Nobody has asked; it is a real
  shape.
