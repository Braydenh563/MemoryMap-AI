# The documents editor — a professional dev plan

**Status: written by direct instruction; to be executed after the plans in
[UI_MODERNISATION_PLAN.md](UI_MODERNISATION_PLAN.md),
[AGENT_SKILLS_REFORM.md](AGENT_SKILLS_REFORM.md),
[MINDMAP_PLAN.md](MINDMAP_PLAN.md), [PLAN.md](PLAN.md) and
[REDESIGN.md](REDESIGN.md) are done, in the order
[ROADMAP.md](../ROADMAP.md) gives.** One decision (§4) has to be made before
any of it is built.

## 1. The instruction, verbatim

> Id like you re redesign and reimagine the documents editor, and Id like you
> to expand the documents editor help and suggestions, if something gets
> underlined, I want to be able to click on that and see suggestions. The
> whole documents page and editor needs a professional redesign and
> imagination because it is still reallllly annoying to use, and the ui and
> ux just isn't there, it's missing soooo many features and I need you to
> lay out a full professional dev plan for it so that it takes features from
> top editors like notion, obsidian, onenote, kortex.co etc and even beats
> them. The whole documents editor feels chucked together and then polished
> but from being chucked together and it doesn't feel professionally or
> designed for the modern day user. So many features I expect it to have
> are either downright missing or don't show themselves how they should.

The last sentence is the diagnosis to keep in view: **the gap is as much
features that exist and do not show themselves as features that are
missing.** §2 lists what exists precisely so §3 can say which of those the
plan fixes by *exposure* rather than by building again.

## 2. What exists (checked in the code, not assumed)

`frontend/documents.js` (~5,000 lines), the `.doc-dock` markup in
`index.html` (lines ~2200–2620) and `05-sidebars-themes.css` /
`07-whiteboard-misc.css`.

| Area | What is there | Where |
| --- | --- | --- |
| Views | Live (per-paragraph textareas rendered in place), Source (one textarea), Split, Read | `#doc-view-seg`, `docSetView` |
| Chrome | header (title, file-type select, save status, view segment, formatting toggle, AI edit, extract, ⋯ menu), a 26-control formatting strip (collapsed by default since D1), a status bar (Ln/Col, chars, words, reading time, goal, suggestions, Autocorrect and Suggestions switches), a left sidebar (Documents / Outline tabs, Recent, backlinks) | `.doc-dock-head`, `#doc-toolbar`, `#doc-statusbar`, `#doc-sidebar` |
| Structure | outline from headings, backlinks, `[[` wikilinks with autocomplete, `/` slash menu, connections dialog | `editor.js` `EDITOR_SURFACES`, `doc-outline`, `doc-backlinks` |
| Writing aids | prose checks (repeated words, long sentences, a confident spelling list) with a findings menu at the caret on double/right-click in Source and real underlines in Live (`docMarkLiveFindings`), inline completion from the document's and notebook's own vocabulary, autocorrect, a dictionary, "Check with AI", a word goal | documents.js ~3665–4700 |
| Editing | find & replace (D5), line-number gutters (7.2), indent/dedent/comment toggles, native undo kept through `execCommand('insertText')`, tables/quote/code/divider via the Insert menu (as markdown text) | `docReplaceRange`, `#doc-find-bar`, `mountGutterFor` |
| AI | AI edit (rewrite in place), selection → chat context with offset re-validation, AI review | `doc-ai`, `wrapDocSelection` |
| Files | any text/code file opens in the same editor with syntax highlighting and language detection; PDF/Office open read-only with extracted text; HTML preview pane; export text/markdown/PDF (print) | `docview.py`, `/files/{id}/html-preview` |
| History | revisions stored server-side; a history dialog | `doc-history`, `GET /documents/{id}/revisions` |
| Templates | new from template with `{{date}}`/`{{title}}` | documents.js ~594 |

**In flight as this is written:** D2 (a selection-driven floating toolbar)
and D3 (a document-local undo stack across Live and Source) on a subagent
branch — see HANDOVER.md. Both are absorbed by §5 Phase 1/2 rather than
redone.

## 3. The diagnosis

Three separate problems, and they need three separate answers. Conflating
them is how the editor ended up "chucked together and then polished".

### 3.1 The surface is a `<textarea>`, and everything the user misses follows from that

A textarea's value is a string. It cannot carry a mark, so nothing in
Source view can be underlined, which is why "click the underlined word" is
answered today with "double-click and we look up the caret offset" — the
comment at documents.js ~4626 says so honestly. Live view works around it
with one textarea per paragraph, which is why the caret is lost on a mode
switch, why undo was two stacks (D3), why a selection cannot span two
paragraphs in Live, why there is no drag handle, no block selection, no
inline widget (a chip for a linked note, an embedded map, a rendered
formula), and why tables are markdown text you edit by hand.

Every mainstream editor the instruction names solved this the same way:
**a real editing surface with decorations.** Obsidian's editor is
CodeMirror 6 with the markdown rendered as decorations over the source
("live preview"); Notion is a block model over `contenteditable`; Kortex
and OneNote are contenteditable block editors. None of them edits in a
textarea. §4 is the decision about which of those this app becomes.

### 3.2 The chrome is an inventory, not a design

Measured at 1440 (`scratchpad/…/docks.js`, screenshots
`dock-documents*.png`): the header carries seven kinds of thing in one row
(identity, file type, save status, a four-way view segment, a formatting
toggle, AI edit, extract, a ⋯ menu); the formatting strip has **26
controls in two wrapping rows** even after D1 collapsed it by default; the
status bar mixes measurements (Ln 7, Col 45 · 129 chars · 22 words) with
two settings switches and an action (Set a goal). At 820px (iPad) the strip
becomes three rows and the sidebar clips its own "Recent" label and New
button. It is every control the editor has, laid end to end.

A professional editor's chrome answers three questions and nothing else:
*what am I looking at* (title, where it lives, whether it is saved), *how
am I looking at it* (the view), and *what can I do to what I have selected*
(a toolbar that appears **for a selection**, and a `/` menu for blocks).
Everything else is a menu, a palette or a setting.

### 3.3 Features that exist and do not show themselves

- The findings menu exists and is reachable only by double-click or
  right-click in Source — nothing on screen says so.
- The `/` menu, `[[` links, the connections dialog, revisions, templates,
  the word goal and the dictionary are all behind a key or a ⋯ item with no
  discoverable entry.
- Backlinks render as a list of titles with no context line, so they read
  as a lookup, not as knowledge.
- Split view and Read view are a segment button each, next to Live and
  Source, so a four-way toggle competes with the title for the eye.

## 4. The decision to make first: the editing surface

Three options. The plan below is written for **B**; A is its first step
either way; C is recorded so the next session does not re-derive it.

**A — Keep the textarea, add a backdrop (one session).** The
"highlight-within-textarea" technique: a `div` behind a transparent-ink
textarea, same font, same padding, same wrapping, holding the text with
`<mark>`s where the findings are. Underlines appear in Source; a click
lands in the textarea, sets the caret, and the existing findings menu opens
for the finding at that offset (`docFindingAtOffset` already does this).
Cheap, offline, and it answers the sentence in the instruction directly.
What it does not give: inline widgets, block handles, a single model for
Live and Source, decent tables. **Do this first regardless** — it is the
bridge, and it is measurable in a day.

**B — CodeMirror 6, vendored (recommended).** MIT-licensed, no build step
needed (a single prebuilt bundle under `frontend/vendor/`, ~350 KB, the
licence file beside it, the same way `d3.v7.min.js` and `p5` are vendored
today). It gives, natively and offline: decorations (underlines that are
clickable, widgets, block backgrounds), a real undo history, search and
replace, folding, syntax highlighting for every file type this editor
already opens, line numbers, IME and mobile input that a hand-rolled
contenteditable never gets right, and a plugin API. **Live preview becomes
decorations over the markdown source** — headings rendered as headings,
`**bold**` shown bold with the markers hidden until the caret enters them,
links as chips, images and embeds as widgets — which is exactly Obsidian's
architecture and the one with the most published prior art. Markdown stays
the single source of truth; every existing endpoint, revision, export and
AI action keeps working unchanged. Source view is the same editor with the
decoration set switched off. Split and Read stay as they are.
Cost: the D2/D3 work in flight is partly superseded (CM6 has its own undo
and selection API — D2's toolbar is kept as the *UI*, re-pointed at CM6's
`dispatch`), and `EDITOR_SURFACES`' textarea assumptions in `editor.js`
have to be re-pointed at one adapter (`docSurface()`: get/set text,
selection, replace range) — which is also what finally lets the note
composer and the documents editor share one implementation.

**C — A block editor over `contenteditable` (Notion's model).** Rejected
for this app. It needs a second document model (blocks) beside the
markdown one, a serialiser both ways, and it makes every existing feature
that reads offsets (selection → chat, revisions, the AI edit, exports)
a translation problem. The Notion-style features people actually want
(a `/` menu, drag handles, callouts, toggles, columns) are all achievable
as decorations and widgets in B.

**Made in this document: B, with A as Phase 0.** The ROADMAP entry should
not be started until a session has read CM6's licence into
`frontend/vendor/` and confirmed the bundle loads under this app's CSP
(no `eval`, no inline styles — CM6 injects a stylesheet through the CSSOM,
which the CSP allows; verify before building on it).

## 5. The phases

Each phase ends green, measured, pushed, with a HANDOVER.md entry that
says what was not verified. Measurements use the Chromium sandbox; the
editor sweep is `scratchpad/ui-sweeps/editor.js` (from the D2/D3 branch),
extended per phase.

### Phase 0 — the bridge: click an underline, see suggestions (1 session)

1. **Backdrop underlines in Source** (§4 A). Findings from `docProseFound`
   drawn as `<mark class="doc-finding doc-finding-{kind}">` behind the
   textarea; the mark's kind decides the underline (spelling: wavy red;
   style: wavy blue; repeated word: dotted), the same three the Live view
   already uses so the two views agree.
2. **One click opens the suggestions.** `click` (not only double- or
   right-click) on a finding opens the existing menu at the caret, with the
   suggestions **ranked**: the dictionary's nearest words by edit distance,
   then the notebook's own vocabulary (`docCompleteWords`), then "Add to
   dictionary" and "Ignore in this document". Keyboard: `Alt+Enter` on a
   finding opens the same menu (the VS Code gesture).
3. **A findings count that is a control.** The status bar's "No
   suggestions" becomes a chip — `3 suggestions` — that opens the panel;
   `F8` / `Shift+F8` step through findings (VS Code again). The switches
   (Autocorrect, Suggestions) leave the status bar for Settings → Documents
   and the ⋯ menu; a status bar states, it does not configure.
4. **Suggestions explain themselves.** Every finding carries a one-line
   *why* ("'their' here is probably 'there'": only when a rule is certain;
   "this sentence is 61 words") and the panel groups by kind with counts.
   Acceptance: in Chromium, type a misspelt word in Source → an underline
   appears within 300 ms → one click opens a menu whose first item replaces
   the word → `F8` moves to the next finding; the same in Live.

### Phase 1 — chrome: three questions, three places (1 session)

1. **Header = identity.** Left: a breadcrumb (`Documents › Design system
   notes`) that is also the title field; right: save state as one word
   with a timestamp on hover, the view control, one ⋯. The file-type select
   moves into the ⋯ (it changes once per document); AI edit and extract
   become items in the selection toolbar and the ⋯. Target: **≤ 5 controls
   in the header**, one height (`--control-h-lg`), one baseline.
2. **View = one segmented control, two options in the row, two behind
   it.** Edit / Read as the segment; Split and Source as choices inside
   Edit's menu (a small chevron), remembered per document. Rationale:
   Live is what people mean by "edit"; Source and Split are modes, not
   destinations. (Obsidian: Edit / Read, with Source as a setting.)
3. **Formatting = for a selection, or by `/`.** The 26-control strip is
   retired as a permanent row. D2's floating toolbar is the formatting UI
   (bold, italic, strikethrough, code, link, highlight ▾, heading ▾, quote,
   list ▾, AI ▾); block insertion is the `/` menu with a visible "＋" at the
   start of an empty line (Notion's affordance). The strip survives as an
   opt-in "Always show formatting" setting for people who want it, which is
   what `#doc-toolbar-mode` already remembers.
4. **Status bar = facts and one action.** `22 words · 5 min` on the left,
   `3 suggestions` (a chip) and the goal ring in the middle, `Ln 7, Col 45`
   on the right. Nothing else.
5. **Sidebar = one list, one outline, one panel width.** Documents / Outline
   / Backlinks as three tabs with counts, a collapse that remembers, and at
   ≤ 1100px it becomes a sheet from the left (§5 Phase 6). "Recent" is the
   default sort of the Documents list, not a section of its own.
   Acceptance: `surfaces.js`'s document family reports header ≤ 44px,
   one control height, chrome above the first line ≤ 96px at 1280
   (PLAN D1's own gate), and at 820px the sidebar's labels are unclipped
   (scrollWidth = clientWidth on every sidebar label).

### Phase 2 — the engine: CodeMirror 6 as the surface (2 sessions)

1. Vendor CM6 (`@codemirror/state`, `view`, `commands`, `search`,
   `language`, `lang-markdown`, the languages the file editor already
   detects) as one bundle under `frontend/vendor/codemirror/` with its
   `LICENSE`; a `tests/test_vendor_licences.py` that asserts the licence
   file exists beside every vendored bundle.
2. `docSurface()` — the one adapter every existing feature talks to: text
   get/set, selection get/set, `replaceRange`, `onChange`, `coordsAt`. Every
   `$("doc-content")` read in documents.js and editor.js goes through it.
3. **Live preview as decorations**: headings, emphasis, code, links as
   chips, task checkboxes that toggle, block quotes and callouts with a
   left bar, images and embeds as widgets, hidden markers that reveal when
   the caret enters the range. Source = the same editor with the decoration
   set off.
4. Findings as CM6 decorations (Phase 0's backdrop retired), undo as CM6
   history (D3 retired), find/replace via CM6's search panel restyled onto
   the app's field recipe, folding on headings, the gutters via CM6's line
   numbers. The existing `/` menu, `[[` autocomplete and selection → chat
   re-pointed at the adapter.
   Acceptance: `editor.js` sweep — type in Live, switch to Source, Ctrl+Z
   undoes the Live edit (D3's own gate); a 20k-word document keeps keydown
   → paint < 30 ms (PLAN P4's gate, measurable now); every existing
   documents test passes; `node --check` and the DOM lints green.

### Phase 3 — blocks and structure (1–2 sessions)

1. **Tables** as a real editor: `/table`, Tab between cells, a cell menu
   for add/remove row/column, alignment, rendered in Live, byte-exact
   round trip through Source (PLAN D4's gate).
2. **Callouts and toggles** (`> [!note]` syntax Obsidian uses, rendered
   with an icon and a fold), **footnotes**, **math** (`$…$` via a small
   in-repo MathML renderer, no KaTeX), **task lists with progress** in the
   outline.
3. **Embeds**: `![[note]]`, `![[map]]`, `![[file]]` render the target's
   chip/preview inline — the same `mapChip()`/`mapPreview()` the mindmap
   plan's Phase 3 builds, the note card the chat sources use, the file
   tile the Library uses. One renderer per kind, app-wide.
4. **Properties**: YAML frontmatter shown as a properties panel at the top
   of the document (tags, aliases, date, status, custom keys), editable as
   fields, searchable from the Library's filter.
5. **Columns and images**: two-column blocks via a `:::columns` fence;
   image blocks with width, caption and alignment; paste/drop stays as it
   is.

### Phase 4 — the connected document (1 session)

1. **Backlinks with context**: each backlink shows the sentence around
   the link and a "link back" action; **unlinked mentions** below them.
2. **Block references** (`^block-id`) so a paragraph can be linked and
   embedded from a note, a map node or a chat.
3. **Outline drag-to-reorder** (PLAN D6), breadcrumbs for the heading the
   caret is in, sticky outline that highlights the current section.
4. **Command palette** (`Ctrl+K`) listing every editor action with its
   shortcut — the single biggest fix for "features that do not show
   themselves" — and a `?` shortcut sheet generated from the same table so
   the two cannot disagree.
5. **Daily notes** and **templates gallery** (New ▾ → Meeting / Spec /
   Decision / Weekly review / Daily), templates stored as documents tagged
   `template` (exists) and offered with a preview.

### Phase 5 — review, history and AI (1 session)

1. **Comments and annotations** on a range (`==highlight== %%comment%%`),
   listed in a right panel, resolvable, exported as footnotes.
2. **Version history UI**: a timeline of revisions with a diff view and
   Restore (PLAN D8); an "AI changed this" filter using the per-document AI
   edit log that exists.
3. **AI edit with a diff preview** and accept/reject per hunk (PLAN D11);
   "Check with AI" renders its findings *as findings* (Phase 0's menu),
   not as a paragraph of advice.
4. **Focus and typewriter modes** (PLAN D9), reading typography for Read
   view (measure, leading, a serif option), a print stylesheet.

### Phase 6 — responsive by device (½ session, with UI Phase 9)

- **≥ 1100 (desktop)**: the layout above.
- **820–1100 (iPad landscape, small laptop)**: the sidebar collapses to
  icons and opens as an overlay; the selection toolbar is the only
  formatting UI; the status bar keeps facts only.
- **600–820 (iPad portrait)**: single pane; the sidebar is a sheet from the
  left; the ⋯ absorbs the view control's minor modes.
- **< 600 (phone)**: the editor is the page; a bottom formatting bar that
  sits above the on-screen keyboard (`env(keyboard-inset-height)` where
  available, `visualViewport` otherwise) with the six most-used actions and
  a `/` button; the outline is a sheet from the bottom. Touch targets 44px.
  Acceptance: `errors.js` at 390/820/1024 reports 0 findings on the
  editor; the first line of text is on screen with the keyboard open.

### Phase 7 — export and interchange (½ session)

PDF (via the print stylesheet), HTML (self-contained), DOCX (server-side
via `docview`'s existing readers reversed, or `python-docx` as an optional
extra), Markdown with assets; import of `.docx`/`.html` to markdown. A
document's export options live in the ⋯, with the same names everywhere.

## 6. Competitor matrix (what the plan takes from whom)

| Feature | Notion | Obsidian | OneNote | Kortex | Here today | Plan |
| --- | --- | --- | --- | --- | --- | --- |
| `/` block menu | ✓ | ✓ (plugin) | – | ✓ | ✓ (hidden) | P1 exposes, P3 extends |
| Live preview over markdown | – | ✓ | – | – | partial | P2 |
| Selection toolbar | ✓ | – | ✓ | ✓ | D2 in flight | P1 |
| Click a squiggle → suggestions | ✓ (browser) | ✓ (browser) | ✓ | ✓ | Live only | **P0** |
| Tables editor | ✓ | ✓ | ✓ | ✓ | markdown text | P3 |
| Callouts / toggles | ✓ | ✓ | – | ✓ | partial | P3 |
| Math | ✓ | ✓ | ✓ | – | – | P3 |
| Embeds of other objects | ✓ | ✓ | – | ✓ | – | P3 |
| Properties / frontmatter | ✓ | ✓ | – | ✓ | – | P3 |
| Backlinks with context | – | ✓ | – | ✓ | titles only | P4 |
| Block references | ✓ | ✓ | – | – | – | P4 |
| Command palette | ✓ | ✓ | – | ✓ | – | P4 |
| Daily notes / templates | ✓ | ✓ | – | ✓ | templates | P4 |
| Comments | ✓ | – | – | ✓ | – | P5 |
| Version history with diff | ✓ | ✓ (sync) | ✓ | – | list only | P5 |
| AI edit with diff | ✓ | – | ✓ | ✓ | replace in place | P5 |
| Focus / typewriter | – | ✓ | – | ✓ | – | P5 |
| Works with the plug pulled | – | ✓ | partial | – | ✓ | kept |
| The AI reads *your* notes, locally | – | – | – | – | ✓ | kept — the thing that beats them |

## 7. Files this will touch

`frontend/documents.js` (split into `documents/{surface,chrome,findings,
blocks,connections}.js` — served as-is, `test_frontend_load_order.py`
enforces order), `frontend/editor.js` (the adapter), `frontend/vendor/
codemirror/`, `index.html` (`.doc-dock`), `05-sidebars-themes.css`,
`07-whiteboard-misc.css`, `src/memorymap/api/routes_documents.py`
(properties, comments, block ids), `core/docview.py` (export), tests
under `tests/test_documents_*.py`, `scratchpad/ui-sweeps/editor.js`.

## 8. Acceptance for the whole plan

- The instruction's sentence, literally: an underlined word is clickable
  and shows suggestions, in every view, measured in Chromium.
- Header ≤ 5 controls; chrome above the first line ≤ 96px at 1280; one
  control height in every dock row; 0 `errors.js` findings at 390/820/1024.
- Every row of §6's "Plan" column has a test or a sweep assertion.
- `python -m pytest tests/` green; `ruff`; `node --check` on every file.
- HANDOVER.md says what was not verified — a real vision model, a real
  on-screen keyboard and a real iPad are three things the sandbox cannot
  supply.

## 9. Risks

- **CM6 under the CSP.** Verify first (§4). If it cannot inject its
  stylesheet, ship its CSS as a static file and set `EditorView.styleModule`
  off.
- **The note composer diverging.** The adapter (`docSurface`) is what
  keeps the capture box, the note edit form and the documents editor on
  one implementation; a phase that adds a feature to one and not the
  others has failed the learnability rule in UI_MODERNISATION_PLAN Phase 8.
- **Two undo stacks again.** D3's stack and CM6's history must not both
  be live; Phase 2 retires D3's the day CM6 lands.
- **Prompt budget.** Properties and comments reach the AI as context;
  `agent.PROSE_BUDGET_CHARS` is asserted and stays that way.

---

## Built, Phase 1 (the chrome), 2026-09-09

Measured in Chromium at 1280x800 and 820x800 with `scratchpad/doc-measure2.js`
(a new document open), before and after.

- **Header.** Before: ten controls at four heights (title 44, view
  segment 28, icon buttons 36, a 39). After: title, Edit / Read with a
  chevron for Live, Source and Split, AI edit, and the more menu, every
  one at 36px; the bar is 36px tall at 1280 and wraps to two rows at 820.
  The file-type select, the formatting-strip toggle and Extract moved
  into the more menu (a document changes type once; the strip is opt-in;
  extraction is an action, not a mode).
- **View.** Edit / Read is the segment; Live, Source and Split sit behind
  Edit's chevron and the Edit button returns to the last editing mode
  (Read then Edit lands back in Split when Split was in use: measured).
  The chevron menu is on the dock-menu recipe, so it closes on a pick and
  stays in the viewport.
- **The more menu.** Every row 36px; a row that is on shows a check at its
  right edge with no fill (the tinted rows in the owner's screenshot are
  gone: eleven rows, all `rgba(0,0,0,0)` at rest, the ticked helper
  included); File type is a labelled section at the top; the two typing
  helpers are switch rows.
- **Status bar.** Facts left (counts, goal, suggestions), Ln and Col at the
  right.
- **Chrome above the first line:** 44px at 1280 (gate: 96). Sidebar
  labels: 0 clipped at 820.
- **INBOX 18.** The pinned group at the end of every formatting strip has
  the strip's radius and an opaque ground.

Not done in this phase: the floating selection toolbar as the formatting
UI (item 3; the strip stays opt-in through "Always show formatting"), the
Backlinks tab and counts in the sidebar (item 5), the sheet behaviour at
1100px (Phase 6). Not verified: dark theme (the rules are token-driven),
a real keyboard walk of the chevron menu.

## Built, Phase 2 step 1 (the engine, vendored and verified under the CSP), 2026-09-09

- **The bundle.** `frontend/vendor/codemirror/codemirror.min.js`, one IIFE
  exposing `CM6` with namespaces `state`, `view`, `commands`, `search`,
  `language`, `autocomplete`, `lint`, `markdown`, `javascript`, `python`,
  `css`, `html`, `json`, `yaml`, `highlight` (lezer tags) and the legacy
  stream modes `shell`, `sql`, `toml`, `go`, `rust`, `c`, `cpp`, `csharp`,
  `java`, `kotlin`, `ruby`, `xml`, `diff`, `dockerFile`. 772 KB, 269 KB
  gzipped; no `import()`, no `eval`. Versions pinned in `package.json`
  beside it; `build.sh` rebuilds it (npm plus esbuild, run by hand, the app
  has no build step); `LICENSE` lists every package. Not loaded at boot:
  the editor script-injects it the first time a document opens (INBOX 48's
  shape; `?v=` is not applied to vendor files, the version is in the pin).
- **The CSP check, first as the plan asked.** CodeMirror styles itself
  through style-mod, which for a Document injects a `<style>` tag, and
  `style-src 'self'` refuses that with no error at the constructor: an
  editor with no styling at all, the "policy silently refusing the work"
  shape. The decision: no nonce, no `'unsafe-inline'`. `build.sh` patches
  one line of style-mod so a Document takes the constructed-stylesheet
  branch (`document.adoptedStyleSheets`), which CSP does not treat as
  inline content and which is how Settings custom CSS already works. The
  build fails if the line moves; `tests/test_vendor_licences.py` fails if
  a rebuild loses the patch.
- **Measured in Chromium under the app's real policy** (8784, a script
  injected into the live page): zero `securitypolicyviolation` events,
  zero `<style>` tags added, two adopted sheets, `.cm-editor` styled
  (flex, relative), gutter visible, markdown highlight classes on the
  heading, typing and `Ctrl+Z` through the default keymap working.
- **Licences.** `tests/test_vendor_licences.py`: every directory under
  `frontend/vendor/` has a `LICENSE`, every top-level bundle a
  `<name>.LICENSE.txt` (d3 ISC and p5 LGPL-2.1 notices added; Phosphor's
  MIT file added).

Steps 2 to 4 (the `docSurface()` adapter, Live as decorations, findings,
undo, search, folding and gutters on the engine) are the next Opus brief;
the API surface above is what it builds against.

## Built — Phase 0

Everything in §5 Phase 0 is built and measured in Chromium at 1440x900
against a running app (`scratchpad/ui-sweeps/serve.sh 8800 /tmp/mm-docs0`).
The editor sweep, `scratchpad/ui-sweeps/editor.js`, grew from 35 checks to
89 and is green; the 35 D2/D3 checks it already had still pass unchanged.

### 1. Backdrop underlines in Source view

§4 A, as written. A `div.doc-backdrop` behind a transparent-ink
`#doc-content` holds the same text in the same type and carries a
`<mark class="doc-finding doc-finding-{kind}">` at each finding's range,
built with `createTextNode`/`createElement`. The textarea keeps the caret,
the selection, native undo, IME and the browser's own spellcheck; the
backdrop is what you read.

Metrics are copied through the CSSOM, the way `mountGutterFor` copies the
gutter's, because the CSP refuses an inline `style=`. Measured:

| | |
| --- | --- |
| mark box vs glyph box | dx 0.00px, dy 0.00px on all four findings |
| the same, 60 lines down after a scroll | dx 0.00px, dy 0.00px |
| placement | box left 512.40625px, backdrop left 512.40625px, widths both 691.1875px |
| scrollHeight parity | 1126 vs 1126 |
| selected text through the highlight | darkest glyph (41,54,104) on (198,206,249), about 7.3:1 |

Three details that are not obvious and are worth keeping:

- **Rects, not `offsetLeft`.** Those round to whole pixels and put the
  backdrop 0.41px off the text it draws.
- **A trailing `\n` on every paint.** CSS removes a segment break at the end
  of a block, so a document ending in a blank line is one line shorter on the
  backdrop, and from there the two scroll out of step.
- **Only findings that still match the text are marked.** The prose pass is
  debounced, so between a keystroke and the next pass every offset after the
  caret is stale, and a stale offset draws a squiggle under the wrong word.

`DOC_PROSE_DEBOUNCE_MS` is 150, down from 400. The acceptance ("an underline
within 300 ms") is now the thing that constant decides: the sweep measures
217ms from the last keystroke to the mark existing. The pass itself is cheap
(0.82ms to find findings, 6.3ms for the whole of `renderDocProse`, 0.07ms to
repaint the backdrop, on a 2,629-character document), so the constant is
almost the whole latency.

Live view's marks take the same kind classes, so one word is marked the same
way in both views. Live still marks word-level rules only, because a spacing
finding's span does not exist in rendered HTML.

### 2. One click opens the suggestions

A plain left click opens the finding's menu; the caret has not moved when the
click is dispatched, so the offset is read on the next frame. It does not take
the focus, because a plain click is usually someone putting the caret in a
word to fix it by hand. Double-click and right-click are unchanged and do take
it. `Alt+Enter` opens the menu for the finding under the caret; `F8` and
`Shift+F8` walk the findings and open each one. All three are VS Code's
bindings for these jobs.

**A bug this found, which no amount of reading the source would have.**
The point-to-finding lookup used `document.caretPositionFromPoint`, and inside
a `<textarea>` Chromium returns the offset *within the visual line*, not
within the value: measured, document offset 29 hit-tests as 6, 50 as 5, 60 as
15. On every line but the first, right-clicking a flagged word looked up a
finding hundreds of characters earlier and usually found nothing, which is why
this feature has read as "sometimes it works". Both views now have a real
element where the finding is, so the lookup is a rectangle test against boxes
the browser laid out itself, and the sweep drives a right-click on a finding
that is deliberately not on the first line.

Suggestions are ranked by how much the app actually knows, strongest first:
the rule's own answer, the other half of a UK/US pair, the nearest words in
the dictionary plus the correction list, then the nearest words in your own
writing (`docCompleteWords`). Distance is optimal string alignment
(Damerau-Levenshtein restricted to adjacent transpositions), capped at 2 edits
over at most 3,000 candidates, at most 5 rows. Measured: teh/the 1,
recieve/receive 1, colour/color 1, alpha/omega 3 and so rejected; a word one
edit from `environment` is offered where the menu previously had no answer at
all.

Every finding already carried its one-line *why* (`finding.message`, shown as
`.doc-suggest-why`), which is exactly what §5 item 4 asked for; the sweep now
asserts it is non-empty. "Ignore this for now" is "Ignore in this document"
and the ignore key is scoped to the document id, so the label is true.

### 3. The status bar count is a control

The chip was already a `<button>` with `aria-controls`/`aria-expanded` that
opened the panel; what it lacked was a look that said so, so a real count
takes an edge and a wash while "No suggestions" stays flat.

Autocorrect and Suggestions left `#doc-statusbar` for the document's kebab,
beside the two settings already there. Ids and handlers are untouched; only
the markup moved. The kebab stays open when a switch is pressed, because a
switch has a state you have to see move.

The panel groups by kind with a count on each group (Spelling 6, Repeated
words 2, Style and spacing 2 on the probe document), in a fixed order so the
strongest claim is at the top and the list does not reshuffle between two
openings.

### Bugs found by measuring, not by reading

Each of these was invisible in the source and is now covered by the sweep.

1. **The caret mirror had no border.** `.doc-caret-mirror` set no
   `border-style`, and `border-width` does nothing without one, so the border
   widths `DOC_MIRROR_PROPS` copies computed to 0. Every caret point, and so
   every popup anchored to one, sat 1px left and 1px up; worse, with
   `box-sizing: border-box` and the textarea's width copied, the mirror's
   content box was 2px wider than the textarea's, so a line could wrap one
   character later in the mirror than on screen. Found because the backdrop
   lays the same text out independently and disagreed by exactly 1.00px.
2. **The suggestions panel's rows were centred.** `.doc-prose-jump` is a
   `<button>`, so it takes the app's global `justify-content: center`, and the
   `text-align: left` beside it has nothing to align because the children are
   flex items. Measured: a row starting at x=326 whose first word began at
   x=751.7. Now 7px.
3. **`docNearestWords` marked its own results as already seen**, so every
   ranked candidate rejected itself and the list came back empty.
4. **The line-number gutter**, reported separately with a screenshot (rows
   1..18 below a textarea ending at 11) and fixed across all three editors
   that carry one. Three causes: the column stretched to the flex row's height
   rather than the textarea's (9.6px past the box untouched, 325.4px once the
   resize handle was dragged up, and a clamped scroll that left the numbers
   2.5 lines adrift); the stylesheet's static `padding-top: 0.5rem` against
   the textarea's `--space-4` (1.59px per row, and density-dependent); and
   `applyDocGutter` never applying `has-gutter` to `#doc-content`, so a
   numbered markdown document soft-wrapped while its numbers did not. Row tops
   now match line tops to 0.00px at rows 1, 5, 11, 20 and 30 in the documents
   editor, the capture form and the note edit form, before and after
   scrolling. The gutter also sat 178px away from the code it numbers, because
   the reading measure centres the textarea while the gutter sits at the row's
   left edge; the pair is centred as one thing now, gap 0.0px.

5. **A file-type change never re-ran the prose pass.** `syncDocFileType`
   toggles the code class, the toolbar and the gutter, but `renderDocProse`
   only reached it through `openDocument`. Before Phase 0 that was invisible
   (stale findings sat in a panel nobody had open); with the findings drawn on
   the document, switching an open markdown file to `.py` left squiggles under
   words in code, over a transparent-ink textarea, with the backdrop laying
   text out `pre-wrap` against a `white-space: pre` box.

### Also checked

- **Split** keeps the backdrop exactly on the textarea (dx, dy, dw, dh all
  0.00px); **Rendered** takes it away.
- **Dark theme.** The backdrop paints the dark field colour with
  rgb(231, 233, 238) ink and a matching caret, and the three underline colours
  follow their dark tokens.

### Not verified

- **Native spellcheck alongside ours.** Headless Chromium ships no
  dictionary, so whether the browser's own red squiggle doubles up with the
  backdrop's under the same word could not be observed. `spellcheck="true"`
  is deliberately left on: the browser's dictionary is far larger than this
  app's 40-word list, and its context menu still opens over text with no
  finding under it.
- **IME.** Composition text is not in `value`, so the ink is restored for the
  length of a composition (`compositionstart`/`compositionend`). Reasoned from
  the spec and not driven with a real IME.
- **A real touch device.** Every gesture here was driven with a mouse.
- **Very large documents.** The largest measured is 2,629 characters plus a
  61-line case; the paint is O(text) per keystroke and measured at 0.07ms
  there, but nothing was driven at 5,000 lines.

### What Phase 1 should know

`docSurface()` in §4 B does not exist yet, and Phase 0 has added a second
consumer of the textarea's exact geometry (the backdrop, beside the gutter and
the caret mirror). All three copy metrics through the CSSOM from the same box,
which is three copies of one idea: when CM6 lands, the backdrop and the mirror
both retire into decorations and only the adapter remains.
