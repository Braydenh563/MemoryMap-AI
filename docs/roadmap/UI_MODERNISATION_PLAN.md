# UI modernisation — the dev plan for the next session

> Companions: [ROADMAP.md](../ROADMAP.md) (live list — this plan is its top
> priority) · [HANDOVER.md](HANDOVER.md) (what the last session measured and
> left) · [../DESIGN.md](../DESIGN.md) (the rules this plan extends) ·
> [BACKLOG.md](BACKLOG.md) · [HISTORY.md](HISTORY.md) · [ANALYSIS.md](ANALYSIS.md)

## The instruction, verbatim

> fix instances like this where there are hard rectangle box background
> colours behind rows. and there are still a lot of inconsistencies in ui
> style, sizing, alignment, positioning, spacing, gaps, margins, colour, style
> aesthetic etc. also sometimes when oeping dropdown menus or panels like for
> tooltips or in the formatting toolbars, the panels will flicker somewhere
> else on the screen then appear in the right place. now that you have done
> the structure fix. I need you to do a consistency fix, and also adjust the
> larger mass spacing and panels for the app. it needs to be professional and
> usable, not overly performative. the aesthetic needs to fit, not just be a
> crude imitation of modern aesthetics. I need you to modernise the ui.

And: "the ui needs to be modernised and proffesionalised for the whole
application ... the application still feels fake, vibe coded and not ready
for professional use. some things feel performative and not at professional
standards in the ui and ux."

## What "fake / vibe coded / performative" means here, concretely

Read against the measurements the last session took (HANDOVER.md, "This
session"), the feeling has five measurable causes. Every phase below attacks
one of them and is judged by a count, not by looking at a screenshot.

1. **Many recipes for one thing.** 17–21 button signatures on a tab; two
   eyebrow recipes; three seg recipes; row gaps of 4/6.4/8/9.6/16px; head
   rows 28/38/40px tall; two card radii. A professional UI has one of each,
   and the eye reads the difference as "assembled from parts".
2. **Decoration doing the work of structure.** Borders inside borders,
   sheen, blobs, shadows and glass everywhere, because tone and whitespace
   were never trusted to group things. Surface tiers started this; it is not
   finished (chips, fields, popovers, the whiteboard panels, the chat dock).
3. **Uneven mass.** 18px card padding on a 1100px card; 12/10/18px shell
   gaps (now one gutter); a hero that is 150px tall for a greeting; widgets
   with 47px of head for one line. Modern layouts are generous at the shell
   and dense inside the component, not the other way round.
4. **Things that move when they should not.** Menus that paint before they
   are placed (fixed for toolbar menus; audit the rest), rows that change
   shape on hover, transitions on layout properties.
5. **Copy and states that are not designed.** Empty states as one grey line,
   errors as toasts, loading as nothing, labels in three tones of voice.

## Rules for the whole plan

- **Measure, change, re-measure.** `scratchpad/ui-sweeps/` holds the sweep
  scripts from the last session (`buttons.js`, `borders.js`, `caps.js`,
  `segs.js`, `rows.js`, `space.js`, `heads.js`, `lib.js`). Each prints a
  signature table per tab. A phase is done when its count is what the phase
  says, in both themes, on the default palette. Run:
  `SCRATCH=<dir> BASE=http://127.0.0.1:<port> PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/<x>.js`
- **Tokens only.** No new px/rem values; `tests/test_style_scale.py` fails
  otherwise. If a phase needs a value the scale lacks, add the token with a
  comment saying which measurement asked for it.
- **Subtract before adding.** Every phase first removes a recipe, a border,
  a shadow, a size — and only then adjusts what is left.
- **One commit per phase, pushed, with the before/after counts in the
  message.** The user's usage is finite; a session that ends mid-phase must
  leave a green, pushed head.
- **Not performative:** no new gradients, glows, animations, badges or
  "AI sparkle" anywhere in this plan. The glass stays where it reads as
  material (the shell, a floating panel) and goes where it reads as effect.

## Phase 0 — tooling and acceptance gates (½ session)

1. Add `tests/test_ui_signatures.py`: a static lint that counts distinct
   `gap:`/`padding:` values on `.row`-class selectors and distinct
   `border-radius` values on surface selectors, with a ceiling the later
   phases lower. It cannot see the DOM; it stops regressions between
   sessions.
2. Add a `make ui-sweep` (or a `scratchpad/ui-sweeps/all.sh`) that runs every
   sweep against a running app and writes the tables to one file, so
   before/after is one diff.
3. Screenshot set: every tab + every Settings section, light and dark, 1440
   and 1024 wide, into the scratchpad. Same script each session.

## Phase 1 — mass and layout (1 session)

Target: the app reads as one shell with rooms in it, not as cards on a
gradient.

1. **Shell.** One gutter (`--page-gutter`, done) — extend to the dashboard
   grid gap, the Library grid gap, and the gap between the sub-tab strip and
   its content (measured 24/17/8px). Status bar and top bar: same height
   family (`--header-h`), same horizontal padding as the page gutter so the
   logo, first tab, sidebar edge and first card edge share one x.
2. **Card system.** `.card` padding to `--space-6/--space-7` on ≥1100px
   content columns (measured 16/20px everywhere, which is dense for a full-
   width panel and right for a widget). Define two card sizes only:
   `.card` (panel) and `.card.compact` (widget, sidebar). Kill card-in-card:
   `.card .card` becomes a tone (`--surface-2`), never a bordered pane.
3. **Dashboard.** Hero from 150px to one row (greeting · date · time · name),
   quick actions become the first widget row, stat tiles fold into the
   Stats widget. Widget head row: 32px, title + one action, no border below.
4. **Sidebars.** One width token, one head row (28/38px measured → one),
   list rows at `--target-min` with tone hover, no bordered rows.
5. **Max reading width.** `.entry-list.is-rows` already caps the measure;
   apply the same `--measure` token to chat bubbles, document preview, the
   Contents page and Settings prose (currently 100% of a 640px column, fine;
   100% of a 1100px column, not).

Acceptance: `space.js` shows one card padding per card size, one card gap,
one shell gutter; head rows at one height; screenshots side by side.

## Phase 2 — component consistency (1–2 sessions)

Target: one recipe per component family, counted.

| Family | Now (measured) | Target |
| --- | --- | --- |
| Buttons | 13–21 signatures per tab | 4: filled, tonal, plain, icon-tonal (+ danger colour) |
| Rows (`.row`, toolbars) | gaps 4/6.4/8/9.6/16px | 2: `--space-3` inside a control group, `--space-4` between groups |
| Head rows | 28/38/40px | 1: `--control-h` |
| Chips/badges | ~6 recipes (tag, link, status, count, filter, inline) | 2: static tag (tone, no border) and interactive filter chip (tonal button) |
| Fields | inputs with border+inset; selects with border+shadow | 1: recessed well, `--field-inset`, no drop shadow |
| Segmented | 3 | 2: tab strip (well) and choice (chip well) — done, keep |
| Menus/popovers | action-menu, select-menu, doc-dock-menu, help-popover, graph panels — 5 shells | 1 `.popover` shell: `--modal-bg-opaque`, `--border`, `--glass-shadow`, `--radius-md`, hidden-until-placed |
| Dialogs | modal-card + 4 one-off panels | 1 |
| List rows | entry-list li, library-card, bookmark-row, extras-row, setting-row | 2: card row (tone) and divider row |

Method per family: run the sweep, read the signature table, pick the winner
(the one most used, already on tokens), rewrite the others onto it, delete
the one-off rules, re-run. Record each family's before/after count in the
commit.

## Phase 3 — typography, colour, glass restraint (½ session)

1. Type: `--text-md` for control labels everywhere (measured 0.85/0.92rem
   one-offs remain in Settings labels and library meta). Muted text at one
   colour, one opacity — no `opacity: 0.75` on top of `--muted`.
2. Colour: the accent is for the one filled action, selection, and links.
   Remove accent from decorative borders, dots and icons that are not
   interactive. Status colours (`--ok/--warn/--error`) only on status.
3. Glass: keep `backdrop-filter` on the top bar, sidebars, floating panels
   and sticky strips. Remove it from widgets and list cards (tone instead) —
   the measured blur layer count drops again and the page stops shimmering.
   Sheen: off by default; the setting stays.
4. Background: the blobs at half strength by default; a professional product
   has a quiet page.

## Phase 4 — motion and placement (½ session)

1. Every floating panel opens through one path: measure → place → reveal.
   The toolbar menus do (`.is-placed`); port the same class to
   `.action-menu`, `.select-menu`, `.help-popover`, the graph panels and the
   whiteboard floating panel, and the chat model panel.
2. No transitions on `left/top/width/height`; opacity and transform only,
   ≤ `--motion-base`. Hover changes tone, never size or shape.
3. Focus rings: one recipe (`--accent` 2px offset) on every interactive
   element; verify with a keyboard-walk script.

## Phase 5 — per-surface passes (1 session each, in this order)

1. **Settings** — the most visited and the most measured; apply phases 1–3
   and the #129 list (spacing, hierarchy, proximity per page).
2. **Notes** (Browse, Capture, Write, Ask) — #132; the capture toolbar's
   density; the row list as the reference list component.
3. **Chat** — dock, sidebar, bubbles; #35's odysseus-style shape as the
   target, kept restrained.
4. **Library** — All/Documents/Files/Images/Links/Contents rows onto the two
   list-row recipes; #101.
5. **Dashboard** — phase 1's hero and widget head; widget internals onto the
   compact card.
6. **Graph, Timeline, Reminders** — toolbars onto the row recipe; the graph's
   floating panels onto the popover shell.
7. **Whiteboard and Documents editor** — panel chrome onto the popover
   shell; the toolbar strip as the reference toolbar; #133, #134.

## Phase 6 — designed states and copy (½ session)

1. Empty states: icon + one sentence + one action, one component, used by
   every list. 2. Loading: skeleton rows for lists, a spinner only inside a
button. 3. Errors: inline under the control that failed; toasts only for
background work. 4. Copy: sentence case everywhere except eyebrows; verbs on
buttons; no exclamation marks; one voice (DESIGN.md gets a "Voice" section).

## Verification, every phase

- Sweep tables before/after in the commit message.
- Screenshots, light and dark, both widths, looked at *and* measured (pixel
  samples for any colour claim, `scrollHeight` for any clipping claim).
- `python -m pytest tests/` green; `ruff`; `node --check`.
- The four traps in CLAUDE.md still apply: stale server, stale `app.js`, a
  screenshot is not a measurement, "already exists" is where triage starts.

## Phase 7 — the reports from the v0.2.2 round that are still open

Each one was triaged against the running app this session; these are the ones
that need building rather than fixing.

1. **The lightbox is an image viewer showing a document.** Reported: "the
   lightbox needs improving for file and pdf previews, no sections or info are
   below it really compared to the images." An image gets caption, read text,
   badges and usage under it; a PDF gets the page and nothing else. It should
   carry the same block, plus what only a document has: page count, which pages
   have been read, and a way into the OCR Workspace at that page.
2. **Line numbers as a setting, in all three editors.** The wrap bug is fixed
   (v0.2.2) but the gutter still appears only for code files in Documents, and
   the note capture and edit panels have no gutter at all. Wanted: one toggle,
   remembered, working for any file type, in all three.
3. **Captioning for documents, not just photographs.** Reported: "image
   captioning, how it is done and displayed needs to be refined for pdf
   documents and other similar documents. with graphs, images and diagrams in
   them." A page of slides is not a photograph: the caption prompt, and where
   the answer is shown, both assume one image with one subject. Needs a
   per-page, per-figure model and a place to show it that is not a single line
   under a thumbnail.
4. **Region select → read just that.** Asked as a question, and it is a good
   one: "can there be a way for the user to manually outline and single out
   regions on a pdf or similar document and then the ai will read what is in
   those regions?? like maybe the user can outline a graph or diagram on a pdf
   slide and then the user cna get the image or ocr model to analyse and caption
   that thing." The workspace already draws region boxes from Tesseract and
   already has a page raster; this is a drag-to-draw on that layer, a crop, and
   the existing read/caption call on the crop. Scoped small, high value.
5. **The Files sub-tab has to show more than a row can hold.** OCR text for a
   long document does not fit where a photo's caption fits; the row needs a
   summary plus a way to open the reading, not a clamped paragraph.
6. **The agent activity panel** — see
   [AGENT_SKILLS_REFORM.md](AGENT_SKILLS_REFORM.md) Phase C, which owns it.

### Built — items 1, 3, 4 and 5

Four commits, one per item, each measured at 1440 in Chromium against a
seeded 3-page PDF. **Item 2 (line numbers as a setting) landed separately**
(`mountGutterFor` in documents.js, commit 68a81d1: one remembered choice in
the capture box, the note edit form and the documents editor).

**1 — the lightbox shows a document like a document.** The document path
now goes through the *same* `.lightbox-info` panel and the same `renderInfo`
as an image (it never called it at all before, so an attachment PDF showed
whatever the previous item had left there), plus what only a document has:
page count and how many pages have a stored reading in the facts line, one
`.chip` per page marked read/unread and clickable, and a page readout with
prev/next in the actions bar kept in sync by a scroll listener. "Read text
with AI" opens the workspace **at the page you are on** —
`openOcrWorkspace(image, images, page)`. Measured: chips 1/2/3 at 24px,
stepper "Page 1 of 3" → "Page 3 of 3" and back via a chip, actions bar
scrollWidth 844 = clientWidth 844 and scrollHeight 28 = clientHeight 28
(eleven controls, one row); an image shows no chips and no stepper.

**3 — captioning for documents.** `PAGE_CAPTION_PROMPT` (ai/captioning.py)
names the page ("page 4 of 18"), asks about figures/charts/diagrams/tables,
forbids transcribing and forbids describing the page as an object. Stored
per page on `PageRead.caption`/`caption_model` — two writers, never one with
a flag, so a describe cannot clear a reading. `POST
/files/{id}/page-caption` and `/media/{id}/page-caption`. Shown per page: a
labelled "Figures" block under each page's reading in the workspace, and the
*current page's* caption, reading and bylines in the lightbox instead of the
file's single caption and every page's joined text. Describe works for a
document now (it was images-only, so a deck of charts could not be described
anywhere). A described-but-unread page is not counted as read.

**4 — region select.** Drag on the page in the workspace and a small offer
appears under the rectangle: Read text, Describe. Own drag layer (the
region-box layer is `display:none` whenever Regions is unticked); the boxes
layer is pointer-transparent and the boxes put `pointer-events` back, so a
reader's box is still clickable — measured with an injected box. The crop is
cut in the browser at the page's own resolution and posted to `POST
…/region-read`; nothing is stored. Measured: a 55% × 30% drag produced a
440×180 PNG out of an 800×600 raster, multipart with its own boundary; the
offer rendered 408×43 inside the pane, three 28px buttons, no overflow; the
answer came back as a focusable card (`tabIndex -1`, `activeElement`) tagged
"Page 1 · region"; a second region stacked; Escape cleared the rectangle and
left the workspace open, a second Escape closed it.

**5 — the Files row.** The clamped paragraph is gone for files (an image
keeps its editable box). The row shows the first sentence on one line,
"N pages read · N words" under it, and an "Open reading" action that opens
the lightbox at the reading — first page that has one, info panel scrolled
into view, `.lightbox-text` focused. `pages_read` is a new field on both
gallery payloads. Measured at 1440 and 1024: `.library-image-tile`
scrollHeight 311 = clientHeight 311, summary exactly 1 line, no "Show more",
and the same with a 500-character reading whose first sentence runs 160
characters.

**What was NOT verified.** There is no OCR engine and no vision model in
this sandbox, so **nothing here was ever run by a real reader.** Specifically:

- `page_caption_text` and the new `PAGE_CAPTION_PROMPT` ran only against the
  fake transport (`tests/test_page_captions.py`) — what a real vision model
  answers to that prompt is untested, which is the one thing item 3 is
  actually about.
- `_describe_page` and `_read_region`'s model branches ran only with
  `vision_ocr.vision_ocr_text` / `captioning.page_caption_text` stubbed
  (`tests/test_region_read.py`). The Tesseract branch of `_read_region` never
  ran at all — the binary is not installed.
- In the browser, every page reading and page caption on screen was written
  straight into `PageRead` rows, which is what a real read stores; the
  region round trip was driven end to end against a stubbed 200 (the client
  half is real, the answer is not) and against the live 409 the app gives
  when no model is running.
- `pypdfium2` + `Pillow` were installed into `.venv` so PDF pages would
  actually render — without them the whole viewer degrades to "no pages" and
  none of this is visible. They are the documented optional extra, not a new
  dependency.
- Only the default palette in light mode was screenshotted. Dark mode, the
  other seven palettes and `[data-glass="off"]` were **not** looked at; the
  new popover was added to the glass-off selector list by rule, not by
  observation.

## Phase 8 — control docks: one grammar for every tab's head (2 sessions)

**The instruction, verbatim** (after Phases 0–7 were built):

> I would like you to go through the tabs and subtabs and features and
> redesign the controls and elements often in the top docks or bottom docks
> professionally. A lot of them just feel like buttons and elements chucked
> at the top of the main panels. […] So many of the main control elements at
> the top of each tab or subtab feel soo fake and rudimentary, not
> professional, they aren't aligned, they just feel like features there and
> note intentionally designed. Use all your ui and ux skills, features need
> to be properly grouped, use drop downs if you see fit but don't over use
> them, think spacing, alignment, hierarchy, learnability (A MUST! ALL
> ELEMENTS AND CONTTOLS OF THE SAME TYPE AND FUNCTION NEED TO BE, ACT, AND
> PLACED THE SAME APP-WIDE), accessibility.

**Measured at 1440 before this phase** (`scratchpad/…/docks.js`, one row
per dock: controls, distinct control heights, kinds):

| Dock | Controls | Heights | What the eye reads |
| --- | --- | --- | --- |
| Graph toolbar | 28 | 1 / 24 / 25 / 32 | two segments, a select, five buttons, a filled "New note" *and* "Concept maps" in the head row, a count and a legend below — every feature the tab has, in a row |
| Library head + toolbar | 2 + 16 | 18 / 30 / 36 | two switches, a segmented sort **and** a sort select saying the same thing, a view segment, a filter select, then eleven chips |
| Notes toolbar | 14 | 32 / 36 | title, refresh, Select, view segment, search, Semantic, help, sort, page size |
| Whiteboard top bar | 17 | 32 / 36 | back, board select, rename, add, layout select, then search, minimap, five menus, Library, fullscreen |
| Documents header + strip | 9 + 26 | 28 / 32 / 36 | see DOCUMENTS_PLAN.md §3.2 |
| Timeline toolbar | 9 | 24 / 32 | View, a select, Today, Options, Highlight, a filter, a count, help |
| Reminders | 1 + 8 + 4 | 28 / 44 | a magic row, eight presets, four due buttons — three rows of ghost buttons |
| Chat | 1 + 6 | 28 / 36 | a filled New, then a toolbar of six at a different height |

Seven docks, seven layouts. Phases 1–5 fixed the *recipes* (heights,
radii, gaps); what they did not fix is the **grammar** — what goes where,
in what order, in what kind of control — and that is what "chucked at the
top" means.

### The dock grammar (the rule the whole phase enforces)

One dock, three zones, read left to right, the same on every tab and every
sub-tab:

```
[ Title · context ]  [ Search ]  [ Filter ▾ ] [ Sort ▾ ] [ View ⋮⋮ ]   ·   [ Primary ] [ ⋯ ]
   identity            find        narrow       order      how          ·     act      more
```

1. **Identity first**: the title (or breadcrumb) and, when the surface has
   one, its context chip (the board's name, the space, a count). Never a
   control.
2. **Find, narrow, order, view — in that order, always.** Search is the
   first control after the title on every list surface. Filters are one
   `Filter ▾` popover (the Notes sheet from Phase 5 is the model) or a chip
   row *below* the dock, never both. Sort is one select, never a segment
   and a select. View is one segmented control with icons (rows / cards /
   grid), never text.
3. **One primary action, at the right, filled.** `New note`, `New
   document`, `New board`, `Send`. A second filled button in a dock is a
   defect. Everything else is ghost or icon-only.
4. **Utilities at the far right, in a fixed order**: refresh, help, ⋯.
   Refresh is always the same icon in the same place; help is always last.
5. **Seven visible controls per row, then overflow.** An eighth goes into
   `⋯` or a named popover (`Options ▾`, `Insert ▾`). Menus are for verbs
   that are used sometimes; a verb used every minute stays in the row.
6. **One height, one baseline, two gaps.** `--control-h-lg` for every
   control in a dock, `--space-3` inside a group, `--space-4` between
   groups (Phase 2's numbers), the group boundary drawn by gap alone —
   never by a rule or a border.
7. **The same control does the same thing everywhere.** A segmented
   control changes *view*; a select changes *sort or filter*; a switch is a
   *setting* and lives in a popover or in Settings, not in a dock; a chip
   is a *filter you can see*. A control that breaks this on one tab is
   moved, not styled.
8. **Accessible by construction**: every dock is `role="toolbar"` with
   roving tabindex (arrow keys move between controls), every icon-only
   control has `aria-label` and a tooltip, every popover is
   `aria-expanded`/`aria-controls`, focus returns to the opener on close,
   contrast ≥ 4.5:1 measured with `pngpixel.py`.

### The work, surface by surface

Each is one commit, before/after inventory in the message, driven in
Chromium at 1440 / 1024 / 820 / 390.

1. **The lint first.** `tests/test_dock_grammar.py`: statically, for every
   element marked `data-dock`, at most one `.primary`/filled button, no
   `input[type=checkbox]` outside a popover, no text-only segmented control,
   and the utilities in order. `scratchpad/ui-sweeps/docks.js` becomes the
   runtime sweep: controls per row, heights per row, zone order.
2. **Graph** (worst first): title + count; search; `Layout ▾` and
   `Colour ▾` as one `View ▾` popover holding both segments and the
   options; saved views as one select with save/delete inside it; `Refresh`,
   `Export` into `⋯`; one primary (`New note`); `Concept maps` becomes a
   link in the identity zone. 28 → ≤ 9 visible.
3. **Library** (All and every sub-tab, one recipe): title; search; `Filter
   ▾` (semantic, include bin, kind); one sort select; one view segment;
   `＋ Create`; refresh; help. The chip row stays *below* as the visible
   filter. The duplicate segmented sort goes. Sub-tabs (Documents, Boards,
   Images, Files, Links, Contents, Skills) take the identical zones with
   their own words.
4. **Notes**: the toolbar from Phase 5 already has search-first and a
   filters sheet at ≤ 600; apply the sheet at every width as `Filter ▾`, one
   sort select, the view segment, `Select` into `⋯`.
5. **Whiteboard**: identity (back · board select · rename) left; search;
   the five menus stay (they are verbs used sometimes) but at one height
   and one gap; minimap, Library, fullscreen as utilities right; the map
   controls (chip, layout, Tidy) as the context chip and a `Layout ▾`.
6. **Documents**: DOCUMENTS_PLAN.md Phase 1 owns the editor's own chrome;
   the *Documents list* dock follows item 3.
7. **Timeline, Reminders, Chat, Dashboard**: Timeline onto the grammar
   (View segment with icons, `Options ▾`, search, Today as the primary);
   Reminders' three rows of ghost buttons become one row (the magic field)
   plus one `Presets ▾` popover, with the due chips as the visible filter;
   Chat's toolbar at the dock height with `New chat` as the one filled
   control; the Dashboard hero's clock and greeting as identity, its two
   quick actions as primary + ghost.
8. **Settings sections** already have one form recipe (Phase 5.1); their
   heads take the grammar's identity zone only.

Acceptance: `docks.js` reports **one height per dock**, zone order correct
on every tab and sub-tab, ≤ 7 visible controls per row, exactly one filled
control per dock; `test_dock_grammar.py` green; `errors.js` 0 findings at
all four widths; a keyboard-only pass (Tab into each dock, arrows across
it, Enter opens a popover, Escape closes it and returns focus) scripted in
`scratchpad/ui-sweeps/keys.js`.

## Phase 9 — responsive by device, on purpose (1 session)

**The instruction, verbatim:** "Also intentional and adjusted design that
alters specifically for smaller resolutions like for iPad, tablet, iPhone
etc."

Phase 5's phone work was reactive — each 390px finding fixed where it was
found. This phase makes the breakpoints a design, stated once:

| Width | Device | What changes, app-wide |
| --- | --- | --- |
| ≥ 1100 | desktop, iPad landscape with a sidebar | the layout above; sidebars open |
| 820–1100 | iPad landscape, small laptop | sidebars collapse to icons; docks keep seven controls; whiteboard properties panel becomes a sheet |
| 600–820 | iPad portrait | one column; sidebars are sheets from the left; docks keep identity + search + `Filter ▾` + primary, the rest in `⋯`; two-up card grids |
| < 600 | iPhone | the phone rules from Phase 5, applied to every tab: strips scroll, one control row, the primary action pinned bottom-right as a floating button, bottom docks (chat composer, the documents formatting bar) above the on-screen keyboard |

Rules: touch targets 44 × 44 CSS px at < 820 (`--target-min` steps up in
the 820 media block, not per component); `env(safe-area-inset-*)` on the
top bar, the status bar and every bottom dock; `hover:` styles gated behind
`@media (hover: hover)`; the tab bar becomes a bottom tab bar at < 600
(thumb reach), with the top bar keeping identity and utilities only;
`prefers-reduced-motion` honoured in the same block.

Acceptance: `errors.js` at **390, 820, 1024 and 1440**, 0 findings on
every tab and sub-tab; `all.sh` gains `WIDTH=820`; a `touch.js` sweep
(Playwright `hasTouch`, `isMobile`) taps every dock control on Notes,
Library and Chat at 390 and asserts each hit target ≥ 44px and that no tap
lands on two controls; screenshots at all four widths in the shots set.

## Not in this plan

New features. The plan is subtraction and alignment; the feature backlog
(BACKLOG.md) waits until the shell is quiet.
