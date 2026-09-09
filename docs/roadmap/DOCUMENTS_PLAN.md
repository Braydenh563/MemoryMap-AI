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

### Phase 8 — one editor everywhere (1 session, the owner's ask, 2026-09-09)

The owner: "plan for the note capture and editors in the notes tab, making
a new note from the graph, and anywhere there is a note related capture,
edit or view area with a text box to integrate features similar to the
documents upgrade. The editors need to be consistent in form and
function." Today the app has nineteen textareas in the page and seventeen
more made in script, and five of them are note editors with five
different feature sets: the capture box (`#entry-content`: formatting
strip, `[[` autocomplete, attachments, dictate, improve), the inline note
edit (`app.js` ~3988 and ~15256: a bare textarea), the graph's note popup
and new-note box (`#graph-popup-content`, `#graph-new-content`: bare), the
Write with the AI panes (`#draft-thoughts`, `#draft-text`: bare, the draft
in monospace) and the document (`#doc-content`: the engine after Phase 2).

**Decisions (made here, not remade).**
- One factory, `noteSurface(host, options)`, built on Phase 2's
  `docSurface()` adapter and the same CodeMirror bundle, replaces every
  note editor. Options: `size` (`inline` for a card, `box` for capture
  and popups, `page` for the document), `live` (decorations on or off),
  `strip` (the formatting strip, opt-in as in Phase 1), `findings`,
  `attachments`. The textarea stays as the fallback and as the form value
  carrier (the surface mirrors into it on change), so every existing
  save path, test and handler keeps working unchanged.
- The same features in every surface: Live decorations, `[[` note
  autocomplete, the `/` menu, the selection toolbar (bold, italic, code,
  link, list, ask the AI), undo history, Ctrl+S, `==highlight==`, task
  boxes, paste of images and files into the attachments row where the
  surface has one. What differs is size and chrome, never behaviour.
- One recipe in `09-editor.css`: `.note-surface` with the three size
  variants, the tokens' radius, `--control-h` for the strip, the same
  focus ring; a lint (`tests/test_note_surface.py`) that every note
  textarea in the page carries `data-note-surface` and is mounted through
  the factory (grep the ids), and that no new `<textarea>` for note text
  appears without it.
- The engine loads on the first focus of any surface, once per page.
- The chat composer is not a note editor: it gets `[[` and `/` only, and
  keeps its own recipe (send on Enter).

**8a, capture and the inline note edit** (½ session): `#entry-content` and
the two script-made edit boxes mount the surface (`size: box` and
`inline`); the capture's formatting strip becomes the selection toolbar
with the strip opt-in; attachments, dictate and improve stay. Gate: every
capture test passes; typing in capture with 2,000 notes loaded keeps
keydown to paint under 30 ms; errors.js clean.

**8b, the graph's popups and Write with the AI** (¼ session): the node
popup's editor (GRAPH Phase 6 sizes it four lines minimum) and the
new-note box mount `size: box`; Write with the AI's two panes mount the
surface with `live` on for the draft (no monospace). Gate: graph4b.js
and the write panel's own test.

**8c, the rest** (¼ session): whiteboard note cards edit in a `size:
inline` surface in place of the canvas text field; reminders' magic box
stays plain (it is a sentence, not a note); the skill editor's steps box
gets the `/` menu only. Gate: touch.js and mindmap.js unchanged.

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

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", DOCUMENTS_PLAN.md) on 2026-09-09: a plan holds open work only.

## Built, Phase 2 step 1 (the engine, vendored and verified under the CSP), 2026-09-09

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", DOCUMENTS_PLAN.md) on 2026-09-09: a plan holds open work only.

## Built, Phase 2 steps 2 to 4 (the engine under the editor), 2026-09-09

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", DOCUMENTS_PLAN.md) on 2026-09-09: a plan holds open work only. What is left open from this phase is in `agent-remaining/documents-engine.md`.

## Built — Phase 0

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", DOCUMENTS_PLAN.md) on 2026-09-09: a plan holds open work only.

## Placed from INBOX, 2026-09-09 (the owner's evening batch)

Verbatim, with the reading each one gets. All are Phase 3 or later; the
engine landed in Phase 2, so none of these is a regression from it.

- "the documents edit and read toggle options dont fit in the toggle and go
  out of it at the bottom" (screenshot: Edit / Read pills overflowing their
  segmented control). Where to start, from a partial measurement on
  2026-09-09: `.doc-dock .seg button` (04-chat-dock-appearance.css, about
  line 3258) sets `padding-block: 0`, so each button's box is exactly its
  line box, computed at 24px, inside a `.seg` whose own padding is 4px. That
  leaves the label's fit entirely to the line box, and the buttons carry an
  icon (`ph-lead`) whose own line box is taller than the text's, which is
  the shape that pushes a label past the container's rounded edge. Not
  confirmed against the running app: the dock only exists once a document is
  open, and three attempts to open one from a Playwright probe did not reach
  the editor (the Documents sub-tab activates but `#tab-documents` stays
  hidden), so this is a reading of the rules and not a measurement. Give the
  buttons an explicit centred box at a control-height token rather than
  zeroing their padding, then measure `getBoundingClientRect().bottom`
  against the `.seg`'s at 1440 and 1280.
- "md formatting should go invisible unless i click back on that word or
  section or navigate with backspace, delete or arrow keys etc to where
  those formatting markers are." ~~This is CodeMirror's own cursor-in-range
  test on the Live decorations.~~ **Phase 2 had already built that test**
  (`touched`/`lineTouched` in `docLivePlugin`, repainting on `selectionSet`),
  and it was measured working through all three gestures the owner names.
  What was *not* hidden, found by taking an inventory rather than by reading:
  `---` drew its border **and** its three dashes, and `> [!note]` hid its `>`
  and kept its `[!note]`. Both fixed; `scratchpad/ui-sweeps/cm-reveal.js` is
  the standing inventory and passes. Left as they are, deliberately: list
  bullets, ordered numbers and a fence's ``` (a list with no bullets is not a
  list); tables are Phase 3; a setext heading's `===` underline hides but its
  line gets no heading class, which is a real if small gap.
  **Measured and not fixed:** the caret shifts when a marker reveals. Walking
  left across `A **bold** word`, `coordsAtPos` reads x 560.3, 554, 544.2,
  531.1 and then **559.5** on the press that reveals the markers, a 28.4px
  jump to the right on a leftward keystroke, because the reveal inserts four
  characters to the left of the caret. `EditorView.atomicRanges` is the usual
  answer and is the **wrong** one here: it would make the arrow keys skip the
  hidden marker rather than enter it, and entering it is precisely what this
  sentence asks for.
- "I want to be able to use the documents tab as a plain text editor like
  before as a view option (not the default though)", "and also if I select
  a txt document, and/or other code file document, and these can have line
  numbers as well", "for code files, include code syntax and make it a
  proper code editor like vs code." **Done, 2026-09-09.** The edit menu is
  Live (default), Source, Split, Plain, with Line numbers as a row under
  them; `scratchpad/ui-sweeps/docviews.js` is the standing check and passes
  in both themes. Two of the three were already configuration, one was not:
  - Plain is new. It is the language compartment emptied
    (`docCmViewLanguage`), so no grammar and therefore no highlighting,
    folding by syntax or bracket matching, and everything else untouched.
    Measured: Source colours 2 kinds of token on a markdown file, Plain 0,
    and the document and the engine are the same ones.
  - Line numbers already worked and were unreachable: the only control was
    on the formatting strip, which D1 collapses by default. A second door
    (`#doc-view-gutter`) is in the view menu, on the same remembered
    preference. Measured: a markdown document 0 numbers, 7 after one press,
    0 again; a `.py` file 7 without being asked, from a fresh profile.
  - Code syntax existed and **was unreadable in dark**. The bundle fell back
    to CodeMirror's `defaultHighlightStyle`, a fixed light-page palette with
    no dark variant: every token byte-identical in both themes, a keyword at
    **1.76:1** and a variable name at **1.91:1** against the dark ground
    sampled at `rgb(27, 31, 44)`. `docCmHighlight` maps six roles onto the
    app's own tokens. Now: light 4.56 to 14.62, dark 6.47 to 13.52, all
    above WCAG AA's 4.5.
  Not fixed, and worth knowing: `csv`, `ini`, `php`, `r` and `swift` are
  offered as file types and have no mode in the vendored bundle, so they are
  plain text with numbers. `php` and `swift` would need
  `@codemirror/legacy-modes` entries added to `entry.js` and a rebuild
  (build.sh, node and npm); `r` has no mode in the CodeMirror packages at
  all. Everything else the type list offers does have one.
- "i still cant click on a grammar or misspeled underlined word and see a
  popup like in a realworld editor like obsidian, word, notion, vs code."
  ~~Phase 0 built the underline; the click target and its popover never
  landed.~~ **Measured in a browser on 2026-09-09 and it had landed.** The
  reading above was written without one, which is the second time on this
  surface (see the Edit/Read entry). `scratchpad/ui-sweeps/docsuggest.js`
  is the standing check and passes every assertion: in Live *and* in Source,
  all three underline kinds (repeat dotted, spelling wavy red, style wavy
  blue) draw with `cursor: pointer`; one plain click opens
  `.doc-suggest-menu` anchored to the word (left 470.6 against the mark's
  own left, top 172.8 against its bottom of 168.8) and inside the viewport
  at every finding including one against the right edge; pressing the first
  item rewrites the document ("teh mat" to "the mat"); `Alt+Enter` opens the
  same menu from the keyboard. `long-sentence` draws no underline, which is
  `DOC_FINDING_SKIP` doing what its comment says. Nothing was rebuilt.
  **What would still read as "cant click" and is not covered:** Read view
  has no editing surface and so no marks, and a code file suppresses
  findings entirely. If the report comes back, ask which view it was in
  before touching this code again.
- "redesign and refine the outlines section of the documents tab as well"
  (two screenshots). Measured problems in them: the outline entries are
  centre-aligned and indented by depth in the wrong direction, the empty
  state is a bare heading with nothing under it, References stacks a close
  button above its own select, and "Where are my documents kept?" is a
  full-width underlined link pinned to the bottom like a footer.
- "the whole documents sidebar and ui needs fixing and the document editor
  still needs a lot of refinement and cleaning but its still in development
  so just make sure you cover it all."
