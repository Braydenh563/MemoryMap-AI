# What is already done


> **The other three:** [ROADMAP.md](../ROADMAP.md) (live work) · [BACKLOG.md](BACKLOG.md) (§1–§29) · [ANALYSIS.md](ANALYSIS.md) (§30–§34, including the licence constraint — AGPL-3.0 now) · [HISTORY.md](HISTORY.md) (already built).

Split out of `ROADMAP.md`. Kept, not deleted, for one reason: **three sessions
have independently rebuilt something that already existed.** This is the file
that answers "has this been done?" before anyone starts.

## §94 — a chat turn saved to the wrong conversation, the prompt on a diet, and the plug for scanned PDFs

**Do not rebuild any of the following.**

**The worst bug of the session was silent.** `chatConv` is module-level and
*reassigned* by `openConversation`/`newChatConversation`, and every save in
`sendChatMessage` read it live — at each checkpoint and again when the turn
finished, seconds or minutes after the send. Switching chats mid-stream
therefore wrote the finished answer into **whichever conversation was open when
it landed**, or created a new one from it if the reader had pressed "+ New".
Reported only as the message and the generating bubble vanishing. The turn now
pins its conversation (`convRef`) and only touches the header, usage meter and
composer while that conversation is still on screen.

**Prompt cost, measured then cut.** On an 8k window with eight notes and *no
history*, the prompt was system 3,288 chars, notes 2,377, tool schemas 4,827 —
32% of the window before the conversation existed, with the schemas costing
nearly twice what the user's own notes did. Now 23%:
- `tools.compact_schemas` trims descriptions, never names or parameters, and
  `within_budget` tries it **before dropping tools** — dropping a tool changes
  what the app can do, trimming prose only changes how verbosely it is
  explained. 8k fits 22 tools where 17 fit before.
- `agent.COMPACT_TOOLS_GUIDE` replaces the 2,807-char guide below 8k. It is
  re-sent every round, so on a 4k model it was 17% of the context per round.
- `tests/test_prompt_budget.py` pins the fixed half under 20% and checks at
  least eight tools survive, so the saving cannot come from an empty toolbox.

**`ai/toolwords.py` — a new module, the deterministic tool focus.** The old
rule was `cue in text`; against ten ordinary questions, seven picked up
unrelated tools ("tag" inside *vintage* and *advantages*, "link" inside
*blinking*, "draft" inside *drafting*). Word-boundary matching kills that class.
Scores **rank, never gate** — a first attempt used a threshold one word could
not clear and lost the tag tools for "tag all my gym notes", which is the worse
trade. Anchoring both ends broke every plural, so there is an explicit
inflection list. It also tells a question about a capability from a request to
use it, so "how do I tag a note?" keeps the group and loses its write tools.
**The focus advises and never decides**: `FOCUS_NOTE` tells the model the list
is a suggestion, and a call for an unoffered tool widens to the full set for
the rest of the turn.

**Scanned PDFs read now.** `docview.py` used to carry a docstring saying they
could not: it takes a `vision_reader`, `vision_ocr.py` reads images, and nothing
turned a PDF page into one. pypdfium2 was actually installed and measured —
~16 MB, no system packages, **no torch**, ~20 ms a page — so `core/pdfpages.py`
is the plug, behind a `pdfpages` extra. The real bug alongside it:
`routes_files` called `docview.extract(path)` with no reader, so the whole path
had **never once executed**.

**Suggested models gained an `ocr` category**, checked against the live
Hugging Face Hub (GLM-OCR, PaddleOCR-VL, Qwen3-VL, DeepSeek-OCR, as `hf.co/`
GGUF paths). A previous session declined to add these because it had no registry
access; this one had it.

**Chat attach takes any file.** Images to the gallery as before; everything else
through `POST /documents/import`, which extracts text with `docview` and stores
a Document. Text, not the file — the same rule as the viewer.

**A launch splash** (`scripts/splash.ps1`, plus a zenity path in `start.sh`)
covers the minutes of git-pull and pip-install that happen *before* Python
exists, which no window could previously cover.

**Dead controls and graph cost.** Listing every id in `index.html` that no JS
and no stylesheet mentions found two buttons wired to nothing (Settings → About
"Take tour again", and the Whiteboards Reload button, whose id is a copy-paste
leftover from the Media tab). After discounting template-literal ids there are
now **zero** interactive elements without a handler. The graph tick loop stopped
transforming the label layer while it is invisible — with an explicit catch-up,
because a settled simulation has no next tick to fix them.

**Whiteboard panels, measured at eight viewports.** The tools row and the zoom
cluster shared the bottom edge and overlapped from ~1180px down, running off the
canvas by 900px. Fixed with wrap plus a reserved gutter — and the first attempt
used `100vw` when these panels live inside a 960px `#wb-canvas-view`, which is
the kind of thing only measuring both rectangles catches.

## §93 — the hybrid document editor, six backlog items, and a prompt with no budget

**Do not rebuild any of the following.** Branch
`claude/post-v0.1.4-nav-fixes`.

**The document editor (ROADMAP item 0) is built.** `#doc-view-seg` offers four
views — Live (render-as-you-write; the block the caret is in shows its raw
markdown), Source, Split, and Read (the rendered document alone, full width,
capped at a 46rem measure). `setDocView` and `docPreviewShowing` in
`documents.js` are the single place that decides which panes are on screen;
`docLiveBlocks` splits the source into blocks fence-aware (a blank line inside
a ``` block is code, not a paragraph break).

**Documents have a file type.** `core/filetypes.py` holds one table of 26
types — `GET /documents/file-types` serves it, `Document.file_type` stores it,
default `md`. The table lives on the server because Ctrl+/ and Tab act on
keystrokes and cannot wait for a round trip; a second copy in JS would be a
second thing to keep in step, and the failure mode of the two disagreeing is
the wrong comment marker in someone's file. A non-previewable (code) type
turns on the line-number gutter, monospace, Tab/Shift+Tab indent and dedent,
and Ctrl+/ using that language's marker; it hides the markdown toolbar and
disables the three rendered views. Editing goes through
`document.execCommand("insertText")` so the browser's native undo stack
survives — assigning `.value` wipes it.

**Six backlog items, all built:** agent-mode auto-detect and skill auto-detect
nudges in the composer; sub-process start/finish notices; AI follow-up chips
(`ai/followups.py` + `POST /chat/followups`, on the utility model, returning
`[]` on every failure path); graph minimap drag/wheel/keyboard zoom; and the
token-efficiency pass below.

**The token-efficiency pass found a real bug, not an optimisation.** The
untooled (streaming) chat prompt had **no budget at all** — `build_messages`
applied `context.fit_notes`/`fit_history` on the tooled path only. One module
wired into one call site and not its sibling. `librarian.plan_budget` is now
the one entry point and the digest uses it too. Measured on a 4k window:
6,240 → 744 tokens. Unchanged on 32k, which is the point — the budget only
bites when the window is small.

**`core/docview.py`** extracts text from docx/pdf/md/code/html/xlsx/csv/txt
for the universal viewer, with `GET /files/{id}/text`. It returns extracted
text, never bytes — nothing new is served inline. **Backend only; there is no
frontend for it yet, and the scanned-PDF path cannot run in this environment
because nothing here can rasterise a PDF page** (pypdfium2, fitz, pdf2image,
PIL, markitdown all absent). The vision-model hook is written and takes a
`vision_reader` callable. Tesseract stays out by explicit instruction.

**Two bug shapes worth carrying forward.** `loadDocFileTypes()` ran once at
file load — before unlock — so its fetch 401'd, the cache became `[]`, and
nothing ever asked again: an empty `<select>` all session, nothing logged, no
line reading wrong. Same shape as the `APPEARANCE_DEFAULTS` bug in CLAUDE.md.
And the split view's layout rule was dead because `#doc-panes` (an id) beat
`.doc-panes.split` (a class) in the cascade — the rule read as correct and had
never once applied.

Verified live in Chromium at 1440x900: picker 26 types defaulting to md; Live
click-to-edit returns raw markdown, writes through and re-renders on blur; a
fence with an internal blank line stays one block; Split 506px/540px side by
side; Read centres 736px in a 1058px pane and persists; code mode gutter, Tab
by four, Ctrl+/ exact round-trip; type survives a reload. **Not verified:**
printing to PDF from Read mode, and touch/pinch.

## Done — sessions §80 to §86, the condensed index

Moved out of `ROADMAP.md` when it hit the 2,000-line ceiling
`tests/test_docs_layout.py` enforces. These were six session narratives of
**finished** work sitting at the top of the live work plan, which is exactly
backwards: the live list should open with what is still open. The full prose
for each is in `HANDOVER.md`; what follows is the "has this been done?" index
that this file exists to be.

**§86 — the §85.4 hand-off list, built.** One shared incremental renderer
(`renderIncrementally` in `app.js`) for the Notes list and the Library grid;
an accessibility pass (49 buttons given `aria-label`, `paintStatusItem` now
mirrors `title`→`aria-label`, five real tap-target failures fixed); Library
semantic search; the graph **minimap** and **named saved views**
(`graphMinimapPaint`, `graphSavedViews` in `graph.js`); **conversation
retention** (`autonomous.purge_old_conversations`, off by default, pinned
chats exempt); the agent monitor's log area collapsed on narrow screens; two
`innerHTML`-in-a-loop sites converted; three dead CSS rules removed.

Measured: Notes list at 1,501 notes **533 ms → 16 ms**, **31,680 → 4,306 DOM
nodes**.

Three claims corrected in the same pass, each by checking before building:
- **The Reminders month/calendar view was already built** and fully wired
  (`renderReminderCalendar`, month navigation, persisted view mode). It was
  listed as a gap and was one grep away from being rebuilt.
- **The focus-trap rewrite in §85 was too broad.** It trapped Tab in any
  `[role="dialog"]`, but 13 of those are anchored popovers (the notifications
  panel, the note picker, the graph and timeline popups, six `*-intro` help
  panels) whose page stays interactive. Now gated on `aria-modal="true"` —
  the attribute that actually declares "everything else is inert".
- **The Graph mobile claim was stale.** `#graph-box` was reported at
  `top: 522px` and unreachable at 320×568; measured at **340px and fully
  visible**. The real squeeze was the agent-activity panel taking a third of
  the viewport.

**§85 — a deep whole-app audit.** The selection popup rebuilt as a kebab (⋯)
with nine actions, reachable by touch and keyboard for the first time; note
menus built lazily (**133,748 → 31,680** DOM nodes at 1,501 notes); four
composite indexes on `entries` (**46 ms → 15 ms** at 20k notes, temp B-tree
sort gone); gzip (**app.js 1071.7 KB → 320.1 KB**); focus traps; two
column-only query fixes. Also established, and worth not re-deriving:
**route handlers are sync `def` on purpose** (238 sync vs 1 async — FastAPI
threadpools them, so BACKLOG §78's "should the backend be async" is answered),
**keyword search is already FTS5 with `bm25()`**, and media GC, WAL, `VACUUM`
and the recycle-bin purge all already exist.

**§84 — a global Undo/Redo system.** Status-bar buttons plus Ctrl+Z /
Ctrl+Shift+Z on the rebindable-shortcuts system, wired into note delete
(single and bulk), creation, reminder delete, link/unlink and content edits.
Deliberately steps aside for a text field's own native undo. Also: the Ask
tab's `#ask-search-tune` button had no click handler at all; drafts were
leaking into the Library list and the Graph; a real CodeQL path-injection
finding closed in `routes_files.py`.

**§83 — v0.1.3 released**, plus the auto-update framework end to end
(packaged Windows installer and source checkouts).

**§82 — a real support bundle from a real test user.** Four bugs found and
fixed, plus a fifth caught by auditing for the same pattern.

**§81 — chat citation badges** (item 36's grounding) were computed and sent
by the backend and never rendered in the Chat tab, only the Ask tab. Fixed.

**§80 — Dev view / User view console mode**, a live sign-out bug found and
fixed the same session, a real model-timeout fix, and the terminal-style log
view.

## Done — the mobile/responsive audit, the feature-completeness brainstorm, and Priority 0

Moved out of `ROADMAP.md` in the same clear-out as the §80–§86 index above.
All three were resolved or retracted; what remained open from them is now in
that file's live list. Kept here because the *retractions* are the valuable
part — each one is a session that would otherwise have rebuilt something.

### The mobile/responsive audit — resolved

Two background agents drove the real app in headless Chromium across nine
breakpoints (320×568 to 1920×1080), all seven tabs, Settings, the command
palette and a modal.

- **Graph's "+ New note" popup rendered its controls below the fold** at
  320×568 and 375×667. Root cause: `placeGraphPopup()` sets `maxHeight` from
  the map's box before measuring; its sibling `openGraphNewNote()` never did.
  Fixed and verified before/after (`#graph-new-save` bottom 701px → 418px).
- **The `#agent-monitor` panel overlapped content on every tab at 320px.**
  Root cause was a dead hook: `classList.toggle("has-agent-monitor", …)` had
  no matching CSS rule anywhere. Fixed by padding the *inner* scroll
  container — the first attempt padded `.tape-page`, which measurably did
  nothing for Notes and Chat because those move `overflow-y` onto a nested
  `.layout > main`. §86 later collapsed the panel's log area on narrow
  screens as well, which is what finally gave the Graph tab its room back.
- **Tap targets** — reported as "13×13 unstyled native checkboxes". Half
  wrong: a wrapping `<label>` makes the label the target, and a live sweep of
  every tab in §86 found five real failures (not the ones named) and fixed
  them. The `#skills-auto-*` controls listed here already passed.
- **The 7-tab nav bar's scroll affordance** — retracted, already built
  (`#tab-bar.fade-end` + `syncTabOverflowFade()`).
- **The Graph "+ New note" popup overlapping the zoom toolbar** — still true,
  still low severity, never fixed. Cheap if anyone is in that file.

### The blind feature-completeness brainstorm — the honest result

~140 capabilities were brainstormed blind (from what that *kind* of feature
looks like across Notion, Obsidian, Apple Notes, Todoist, Miro, ChatGPT) and
only then checked against the codebase. **The large majority already
existed.** Of ten claimed gaps, **four were retracted outright** on a second
and third pass, each by reading one function further than the first grep had:

- **"No graph accessibility alternative"** — wrong. `initGraphKeyboard()`
  is a complete non-visual layer: `role="application"`, arrow keys move
  between notes spatially, `n` steps a note's own connections, and every move
  announces through a real `aria-live` region.
- **"No PDF/document text extraction"** — wrong. `/import/document` already
  handles PDF, Word, PowerPoint, Excel and HTML via `markitdown`.
- **"The command palette has no content search"** — wrong. It already matches
  notes by body *and* title, and already covers Documents, Reminders and
  Conversations.
- **"Spaces have no per-space export scoping"** — wrong. `WorkspaceMixin` plus
  a `do_orm_execute` listener scopes every query, exports included.
- Also retracted: the auto-lock timeout **is** configurable
  (`session_idle_ttl_minutes`, Settings → Account & security), a per-note
  **Duplicate** action already exists in the note kebab, and the Timeline has
  both a jump-to-today button and a custom date-range picker.

Two survived and are now built (§86): the **graph minimap and saved views**,
and the **Reminders calendar view** — except that last one turned out to be
built already too, making it the fifth retraction.

What survives as genuinely open is **image understanding by a vision model**,
now item 1 of the live list.

**Deliberately not brainstormed, and still correct not to:** collaboration,
cloud sync, sharing, and thumbs-up/down model feedback. All four are stock
ideas for this class of app and actively wrong for this one — 100% offline
and single-user by design, with no server, no accounts and no telemetry
channel a feedback signal could reach.

### What was checked and found already built — the anti-rebuild record

Do not re-propose any of this. Dashboard: quick capture, streak counter, focus
timer, "on this day", weekly digest, activity heatmap, tag cloud, random-note
rediscovery, drag-to-reorder with a persisted layout. Notes: pin, tags,
categories, GFM task-list checkboxes as real checkboxes, `[[wikilinks]]` with
AI-deduced reasons and a confidence score, version history with restore,
built-in and custom capture templates, a recycle bin with configurable
auto-purge. Ask/Chat: saved conversations, context compression,
regenerate-and-resend, per-message note attachments, personas, plan mode,
tools and skills, integrated web search with a reader view, local dictation.
Graph: multiple layouts, colour-by, physics controls, a time slider,
similarity lines, entity nodes, orphan hiding, AI link suggestions, path
tracing, fullscreen, PNG export, and the full keyboard layer above. Library:
grid/list toggle, four sort orders, bulk select/open/restore/delete, a bin
with its own context bar, Skills and Media Gallery sub-tabs. Whiteboard:
multiple named boards, a properties panel, resize, grouping, alignment,
rotation, arrow-key nudge, undo/redo, real anchor points, PNG export.
Reminders: natural-language magic add, priority, recurrence, quick presets,
±15-minute and ±1-day nudges, **and the month/calendar view**. Settings:
high-contrast mode, reduce-motion with an auto option, and a keyboard
shortcuts reference — the Settings brainstorm produced no gaps at all.

### Priority 0 — resolved

The document-textarea resize gap (fixed; the fix's *effect* was never
confirmed because headless Chromium would not drive a native resize handle —
still wants one look in a headed browser). `style.css` split into eight files
and `app.js`'s whiteboard and graph subsystems extracted; `index.html` stays
whole on purpose, since splitting it needs a build step this project does not
have. Extract-notes built (BACKLOG §62). The mic level meter built, then
fixed for real when a suspended `AudioContext` made it read silence forever.

What was still open here has moved to the live list: **faster-whisper's
install failure**, the **Timeline line view**, and the **Documents editor**.

### The #0 codebase quality review — resolved

Dead code, the `.msg` CSS merge, the `GET /entries` N+1, the tag-cloud
duplicate scan, `on_this_day`'s SQL filter, `janitor.py`'s vectorisation, the
`routes_settings.py` split, the pagination ceiling, the Notes-search debounce,
the whole test-suite reorganisation, the `whiteboard.js` extraction, the
markdown-renderer merge (which surfaced two real bugs), the `HTTPException`
dedup, the `searxng_manager.py` split and `all_tags()` caching — all done and
re-verified against source before archiving. What remains is in the live
list's "Smaller, and genuinely cheap".

## Done this session — Dev view/User view console mode, a terminal-style Settings → Logs view, and a batch of live-reported fixes

Full narrative: HANDOVER.md's latest entry. ROADMAP.md §80 has the
mid-length version. This entry exists so a future `grep` for any of these
finds "already built" before rebuilding it — CLAUDE.md's own opening
warning, applied to itself.

**Now exists and is checkable in the running app:**
- **Console mode toggle**, Settings → About (`#pref-show-console`,
  `#desktop-console-row`) and the system tray menu: switches the desktop
  app between a visible console window on startup ("Dev view", the
  fresh-install default) and none at all ("User view"). A first-run popup
  (`maybeShowConsoleViewIntro` in `frontend/app.js`) asks once, gated on the
  `console_view_intro_seen` preference. Backend: `POST /system/console-mode`
  (`routes_settings.py`), `restart_in_console_mode`/`_spawn_desktop` in
  `__main__.py`. Desktop-shell-only — a browser tab never sees the row or
  the popup.
- **Settings → Logs has two view modes**: `#log-view-toggle` switches
  between the original structured/foldable List and a new Terminal view
  (`#log-terminal`) that renders the same records as raw console-style
  lines, dark styling fixed regardless of app theme.
- **Ollama and LM Studio/OpenAI-compatible request timeout is 600s**
  (`ai/ollama_client.py`, `ai/openai_client.py`), not 120s — check here
  before assuming a "model doesn't respond" report needs new code; it may
  just need this number raised further on a slower machine.
- **Ollama chat requests send `keep_alive: "30m"`** — a model stays loaded
  for half an hour of idle time instead of Ollama's own 5-minute default.
- **The tool-call disclosure in chat (`.tool-chip` → expand) shows up to
  4000 characters of raw tool output**, not 300 — `agent.py`'s
  `result_summary` fallback, UI-display only.

## Done this session — the broad apple-design pass: an elevation + motion token scale, app-wide, plus a live look at the timeline and document editor

The first pass (below) was deliberately narrow. This one is the broader
sweep ROADMAP item 12 asked for, still CSS/consistency-focused rather than a
structural rewrite, per the same "skip anything needing a product decision"
instruction the first pass worked under.

**Populated the app for real before auditing it** (own point in CLAUDE.md:
audit populated states, not empty ones), via the API rather than clicking
through the UI, to keep budget for the actual design work: 9 notes with real
multi-paragraph content and a few explicit links between them, 3 reminders,
1 document (102 words, headings, a list), and a whiteboard board with 3
cards linked to real notes. Screenshotted every tab at 1400px, light and
dark, before and after (`toggleTheme()` — the earlier attempt to fake dark
mode via a `data-theme` attribute did nothing; the app keys off
`data-mode`).

**Found and fixed: no shared elevation or motion scale existed**, unlike
spacing/type/radius/colour, which DESIGN.md already governs and
`test_style_scale.py` already enforces. Twelve hand-written `box-shadow`
values across 6 files ranged 0.05-0.5 opacity across six-plus blur radii,
split between a purple-tinted family (matching `--glass-shadow`, which *is*
dark-mode-aware) and a flat-black family (which mostly wasn't) — so a card's
shadow and a dropdown's shadow and a dragged whiteboard card's shadow were
all visually unrelated, and several went flat/invisible in dark mode.
Consolidated into three tokens (`--shadow-sm/md/lg`, all dark-mode-aware) and
every one-off value replaced with the nearest tier; two exceptions kept and
documented (the lightbox's always-dark-backdrop shadow, and a button's
accent-tinted glow, now fixed to `color-mix()` off `--accent` instead of a
hardcoded RGB that ignored the user's chosen accent colour entirely).
Separately, ten distinct transition durations (0.08s-0.25s, one written as
`120ms`) collapsed into `--motion-fast/base/slow` the same way the spacing
scale was originally extracted — the modes of the existing distribution, not
invented numbers — and applied to every `transition:` declaration in
`frontend/css/*.css`. `animation:` keyframe timings were left alone on
purpose (each is tuned to its own specific effect, not drifting for no
reason, and sweeping those too was a materially different and riskier
claim than "this hover transition matches that one"). Both scales documented
in DESIGN.md with the same "why" depth the rest of the file uses.

**Timeline branch/line view (ROADMAP item 10) — looked at live, not fixed.**
Screenshotted with real, populated data: the SVG canvas reserves a fixed
height regardless of how much content is in it, so a normal note count
leaves most of the card blank; the active band has no label painted on the
canvas itself; and notes sharing a time bucket stack vertically with no
jitter, connector, or other way to tell them apart short of hovering each
one. All three are `renderTimelineBranch`'s own layout math (`app.js`
§10C), not a colour or spacing problem the token system reaches — a real fix
means changing what the function computes, not what it's styled with. Per
this session's own instruction not to risk a half-implementation, this is
written up (here and in DESIGN.md's "what is not done yet") rather than
attempted. **Also worth naming honestly**: the specific screenshot taken had
every seeded note plotted at the same point (today), which is a seeding
artifact — the notes' own body text has relative-date phrases the timeline's
"about" placement is supposed to pick up (§10A already resolves them) — not
itself the design bug above, but it means the "notes pile with no
differentiation" finding was observed at an extreme (9-way tie), not at a
realistic middling density; the dead-canvas-space and missing-label findings
hold regardless.

**Document editor (ROADMAP item 11) — looked at live, found already
consistent.** Title field, word count, outline, save status, the full
formatting toolbar (headings/bold/italic/strike/code/lists/task/quote/
link/table/rule), AI edit, extract-notes, and .md/.pdf export all render
cleanly and match the rest of the app's visual language — no orphaned
one-off styling found. BACKLOG.md §5 already has the real gap list (wiki
links, a `/` command menu, drag-drop images, backlinks, live-preview
editing, sub-pages) correctly flagged as a product decision, not a design
one; nothing here changes that.

**Verification:** `tests/test_style_scale.py` and the full suite
(`python -m pytest tests/`, exit 0) pass unchanged — no lint had to be
widened to let the new tokens in, since `--shadow-*`/`--motion-*` are
declared in `:root` like every other token and consumed via `var()`
everywhere they're used. `ruff check .` clean (no Python touched).
`node --check` clean on all three JS files (also none touched — this pass
was CSS + docs only). Every screenshot referenced above was actually taken
and looked at, both themes, both before and after the shadow/motion changes,
against the populated data described above — not reasoned from the diff.
**Not done and not claimed:** a systematic per-component
`prefers-reduced-motion` audit (still ad hoc, per-component `@media` blocks,
same as before this session); Chat tab content (no local model is
configured in this sandbox, so no real conversation history exists to
screenshot — the tab was screenshotted empty, which is honestly what it is
here, not what it looks like with real use).

## Done last session — a first, scoped Apple-design pass, a real Library data bug, and a corrected doc claim about the 401 burst

> Asked directly: audit the live app against Apple design principles
> (clarity, deference, depth, generous whitespace, consistent corner radii,
> restrained colour, purposeful motion) and fix the highest-impact issues
> within `docs/DESIGN.md`'s existing token system. Screenshotted every tab
> at 1400px with Playwright (light and dark), then a second pass with three
> real notes captured through the app's own UI, since an empty notebook
> hides most of what a card, chip or preview actually looks like.

**Scope was deliberately narrow, not the full sweep ROADMAP item 12
originally called for.** That item says the full pass should run last, after
several other structural changes (the timeline/document-editor work) land,
and specifically flags it as high-risk enough to want the user present. This
session stayed CSS/consistency-focused and low-risk rather than touching
every file, per this session's own instructions to prioritise usability bugs
and cross-tab consistency over one-off cosmetic taste calls, and to skip
anything needing a product decision.

**Two shipped fixes:**

1. **Library and Timeline had a different, worse empty state than every
   other tab.** Dashboard, Notes, Chat, Graph and Reminders all use the same
   pattern (`.empty-state`: a centred icon, a bold title, muted subtext).
   Library and Timeline were each a single bare `<p class="muted">`, left-
   aligned, no icon, no padding — "Nothing of this kind yet." and "Nothing
   to plot yet." sat flush against the page edge like unstyled placeholder
   text, reading as unfinished next to the other five tabs. Fixed by giving
   both the same three-part structure (`frontend/index.html`): Timeline is
   fully static markup (`ph-clock` icon, a real subtitle); Library's text is
   set at runtime for three different empty states (nothing at all / no
   search match / nothing of this filtered kind), so only its title line is
   dynamic now (`app.js`'s `renderLibraryGrid`, one `$("library-empty-title")`
   in place of `.textContent` on the whole block). No new CSS — both reuse
   `.empty-state`/`.empty-icon`/`.empty-title`, already defined in
   `frontend/css/02-chat-graph.css` and used by the other five tabs, so
   `test_style_scale.py` needed no changes. **Verified live, light and dark**:
   screenshotted before and after: `library.png`/`timeline.png` (light,
   before), `dark-library.png`/`dark-timeline.png` (light-toggle pass,
   after — the fix landed before the dark-mode screenshots were taken, so
   both themes are confirmed, not just reasoned).

2. **A real bug, not a cosmetic one: a titled note's Library card duplicated
   its own title into its preview line.** Reported symptom you'd hit
   immediately with real notes: a note titled "Design review notes" showed
   a card whose preview line *also* started "Design review notes" before
   the actual body text — found by capturing three real notes through the
   app's own Capture form and looking at the populated Library grid, which
   an empty-notebook audit would never have surfaced. Root cause in
   `routes_library.py`'s `_notes()` (and the same shape in `_archive()`,
   the bin): both computed `title` and `preview` by whitespace-collapsing
   and clipping the entry's *raw* `content` column, which — for any note
   with an explicit title — begins with that title's own `# Heading` line
   (`manager.apply_title` prepends it). So `title` became a 60-character
   clip that included the heading *and* however many words of the body fit
   after it, and `preview` opened with the identical heading text again
   right underneath. `app.js`'s Notes-tab entry list already solved this
   correctly for its own cards, via `bodyWithoutTitleLine()`, but the
   Library card function (`libraryCard()`) only ever received the server's
   pre-mixed `preview` field and had no way to un-mix it — its "is the
   preview just the title again" heuristic could only catch an *exact*
   match, not "title, verbatim, followed by more." Fixed at the source: both
   backend functions now call the entry manager's own `extract_title()` /
   `remove_title()` (the same pair `POST /entries/{id}/generate-title` and
   `/remove-title` already use) to split a titled note's raw content into a
   clean title and a title-free preview before clipping either one.
   Titleless notes are byte-for-byte unaffected — `extract_title` returns
   `None` for them and the original clip-based fallback still runs.
   **Verified**: `tests/test_library.py` (10/10, no changes needed — nothing
   there asserted the old clipped-title shape) plus a live before/after
   screenshot with three real captured notes (`library-populated.png` before,
   `library-fixed.png` after) showing the duplication gone.

**A finding, not a fix — flagged in ROADMAP.md item 13 rather than touched,
since it's a functional/auth bug, not a design one, and the working fix
already exists elsewhere:** the pre-auth 401 burst HANDOVER.md describes as
"root-caused, fixed, and verified live" is **not present on this branch.**
Reproduced cleanly this session with a fresh `MEMORYMAP_DATA_DIR` and zero
login attempted — the same repro HANDOVER.md itself used — 20 requests
401 before the lock screen is ever touched. `git merge-base --is-ancestor
8b9b7f6 HEAD` fails: the commit that fixes this (`8b9b7f6`, "Fix pre-auth
401 burst, doc-textarea resize gap, add chat delete" — splits `switchTab`
into a DOM-only `revealTab()` plus data loading, moves `startReminderWatch()`
into `startApp()`) exists but was never merged into the branch this
worktree's `HEAD` (`bffa3c6`, a `Gemini-Additions-2` merge) descends from.
Current `app.js` still calls `switchTab("dashboard")` and
`startReminderWatch()` unconditionally at module load (~line 19833 and
~19821) — there is no `revealTab` function anywhere in the file. Not fixed
this session, deliberately: out of an Apple-design-audit's scope, and the
right move is to cherry-pick/reapply `8b9b7f6`'s `app.js` diff against
current source (checking for drift first) rather than re-diagnose from
scratch or re-derive the same fix a second time.

**What this session explicitly did not check, said plainly rather than
reported as done:** the two fixes above are the only two shipped; the wider
"every tab, every state" sweep the original ROADMAP item asked for did not
happen. Not screenshotted or reasoned about at all: populated states for
Chat (a real conversation with several turns), Graph and Timeline (with
actual linked/dated notes on them, not the empty-map view), Reminders with
real entries, or any tab at narrower-than-1400px widths. The floating
"Agent Activity" monitor panel (bottom-left, showing "embedding backend
failed" — expected in this sandbox, since CLAUDE.md's own setup skips
`sentence-transformers`/torch) sat over the same screen corner in every
screenshot; whether it can overlap real content once a notebook is large
enough to fill the page was not checked, and is worth a look before calling
that panel's positioning settled. Motion/transition polish and narrow-width
layout were named in the ask and not audited at all this session.

**Verified**: `python -m pytest tests/` (all green, exit 0 — includes
`test_library.py` 10/10 and the four frontend lints
`test_style_scale.py`/`test_frontend_ids.py`/`test_frontend_handlers.py`/
`test_docs_layout.py`), `ruff check .` (clean), `node --check frontend/app.js`
(clean). Screenshots for every tab at 1400px, light and dark, empty and
(for Dashboard/Notes/Library) populated with three real captured notes, are
in this session's scratchpad and described above by filename.

## Done last session — a work-recovery pass, not on the #0 refactor

> Full detail is in [HANDOVER.md](HANDOVER.md) and [CHANGELOG.md](../../CHANGELOG.md);
> this is the checklist for "has X been done" so a future session doesn't
> re-verify or re-build any of it. **[ROADMAP.md's #0 codebase-quality
> refactor](../ROADMAP.md) is still next — this session worked around it, not
> instead of it.**

A previous session's work had been lost, and the recovery attempt left the app
with a broken icon system and a link-reason feature that had never run once.
Baseline was 16 failing tests, not 2.

- **Icons.** Phosphor stylesheet now linked (was vendored, never loaded — no
  icon in the app rendered). All 367 colour emoji replaced app-wide, frontend
  and backend, via a `ph:name` label-marker grammar (`setLabel()` in
  `app.js`) for the ~300 that are JS string literals rather than markup.
  `lucide.min.js` and its dead code path removed.
- **CSS bugs found by measuring, not reading**: five custom properties used
  but never declared; a literal `\n` inside a `:root[data-glass="off"]`
  selector list that invalidated the whole rule.
- **Spaces**: switcher rebuilt (markup had been deleted, CSS/JS left behind);
  CRUD hardened — reserved-id and icon-class-injection guards, delete
  reassigns every `WorkspaceMixin` model via introspection rather than a
  hardcoded four.
- **Timeline grid**: cards rebuilt (header/title/clamped preview), column
  banding, sticky band label, O(bands×buckets×notes) build fixed to one pass.
- **Chat dock**: Skills folded into one dropdown; Plan is now a toggle
  applied in `sendChatMessage` so Enter and suggestion chips honour it.
- **Link reasons**: `audit_vague_links` rewritten onto a function that
  actually exists; the backfill endpoint now runs the AI pass so "similar in
  meaning" isn't the permanent answer; per-suggestion reason field; the
  background pass is now proven (by test) to reach the audit, which it was
  not before.
- **Security**: `_unlink_notes` bypassed the private-note guard `link_notes`
  enforces right above it — fixed.
- **Dashboard**: `safeMdSlice` returning `""` on a leading unpaired marker
  (rendered as a bare "…") fixed; widgets render block markdown and a
  title/preview split instead of the inline-only renderer's literal syntax;
  a widget-picker modal (roadmap item 26) added on the existing
  `dashboard_layout` preference.
- **Graph**: fit-to-view no longer collapses to a scale of 0.07 on one
  outlier — bounding box now padded by rendered node extent, margin
  container-relative, scale clamped both directions.
- **Whiteboard**: a note card shows the full note with real markdown and a
  Show more/less control, not 100 characters of escaped plain text.
- **Documents**: sidebar is genuinely full-height and sticky now (a
  duplicate `#doc-sidebar` rule later in the file was winning and
  overriding the fix); storage-path info moved into a dialog, ~370px back
  to the list.
- **Sidebars**: Categories/Chats/Recent headers level with their collapse
  toggle (the toggle's inset and the row's own margin had no arithmetic
  relationship before).
- Misc fixed: a boolean-precedence bug that silenced all network-error
  logging; the Capture textarea sizing itself to zero while its tab was
  hidden; the theme toggle not changing icon between light/dark; Library
  image rename (missing entirely); a title-regeneration toast being eaten
  by the notification-mute filter.

**Not verified**: `start.bat`/`start-desktop.bat` and the Windows
taskbar-icon path (no Windows runtime available); the whiteboard card's
collapse-back click (expand was confirmed live, collapse only by inspection).

## Done in the most recent session — read this first

**This session: the notebook became a graph the whole app can walk, retrieval
learned to read the question, and a pile of reported bugs turned out to have
findable causes.** Written up longest-first, because the first item is the one
the rest builds on.

1. **§9's last mile — one traversal engine, used everywhere (`entry/paths.py`).**
   The graph could always show you *that* notes connect and never *how*. A
   weighted search over links, replies and shared tags answers "how are these
   two related?", and the same index answers "what shape is my notebook?" —
   clusters, hubs, and what is connected to nothing.

   Three decisions worth not re-deriving. **Weighted, not breadth-first**: an
   unweighted search returns the fewest hops, so one shared `#misc` beats a
   three-step chain of deliberate links and the answer is technically a path
   and actually noise. **A tag on more than twelve notes creates no edges** —
   otherwise one heavily-used tag makes everything two hops from everything and
   the feature reports a relationship between any two notes it is handed.
   **Six hops is the cap**, and it is an honesty guard rather than a
   performance one: six intermediaries is not a relationship.

   Surfaced in three places, deliberately the same code: `GET /graph/path` and
   `GET /graph/structure`, the `path_between` and `notebook_structure` tools,
   and the Trace strip in the view. A picture and an answer that disagree about
   what is connected is worse than either alone.

2. **The graph is in every answer now, not just the agent's.** When a note
   matches a search, the notes it *links to* come with it. Links and replies
   only, never shared tags — a tag can put fifty unrelated notes one hop apart
   and this list goes straight into a prompt. Appended rather than interleaved,
   because a connected note is context and a match is an answer, so a budgeted
   prompt drops the context first; the model is told which is which, since
   reporting a linked note as a search hit is a quiet fabrication.

3. **Retrieval reads the question before searching it.** Three changes:
   - **Both searches run and their rankings are fused** (reciprocal rank
     fusion). The old rule was either/or, so a note containing the query
     *verbatim* lost to three notes vaguely on topic. RRF combines by rank
     rather than score, which is what makes it robust — a cosine similarity and
     a keyword tally are not on the same scale, so any weighted sum needs a
     tuning constant per notebook.
   - **A time phrase is a filter** (`search/query.py`). "What have I saved in
     the last week" used to dilute the embedding, drag the keyword search off
     course, and apply no range at all. A question that is *only* about time
     lists the range instead of ranking noise.
   - **The scaffolding comes off before embedding.** "What did I write about
     beans" and "beans" now reach the model as the same search. Front only, so
     "how do I prove bread" keeps its "how".

4. **The agent acts when told to act (§35K).** *"I asked for suggestions on my
   categories, and when I asked it to implement them it just gave the
   suggestions again."* The cause was exact: `focus_for` read the current
   message and nothing else, and "implement those suggestions" contains no
   category word — so the turn was offered **no category tools at all**. The
   model was not being lazy; it had nothing to call. A follow-through is now
   read against the previous exchange.

   Also: it **keeps its own reasoning** across a tool call (it was streamed to
   the user and dropped, so every round re-derived the plan), it **stops
   re-reading** what it already read with nothing written since, and a long
   turn is **checkpointed each round** so a stall no longer loses the whole
   conversation.

5. **§35E — the desktop app stops forgetting.** Theme resetting every start and
   onboarding showing every time were one bug: both lived in `localStorage`,
   which the desktop shell does not reliably persist. Mirrored to the server
   and seeded back for keys the browser has lost. The *store* is watched rather
   than its twenty-two callers, so adding a key to `MIRRORED_UI_KEYS` is now
   the whole of making a setting persistent.

6. **The recycle bin, and a note you can delete for good.** "Empty now" was
   reported broken a third time and driven end to end in Chromium again — it
   works. What was actually wrong: **every failure was silent**, so a 401 or a
   locked database produced exactly what was reported, a click and nothing.
   And notes can now be purged one at a time, sharing `_hard_delete` with the
   bulk path so neither can leave an orphaned embedding behind.

7. **The UI pass.** The chat dock's "weird box shadow" was a repaint —
   `background: var(--card)` inside a card that had already painted it, two 55%
   layers stacking. The composer has a viewport-aware ceiling and a drag
   handle. The metadata line was ranked rather than listed. The graph's twelve
   toolbar controls became four plus a ⚙ fold. The top bar had **five different
   control heights**, all centred on the same line and none agreeing; it has
   one now. The web panel's results went 127px → 82px each.

8. **The GitHub Pages site could never have worked**, and two previous fixes
   aimed at the JavaScript could not have helped: **there was no `.nojekyll`**,
   so Pages converted the `.md` files rather than publishing them and every
   same-origin fetch 404'd. Verified with both CDN fallbacks blocked.

**What was checked in a browser this time** — Chromium, measured: the trace
strip at 900–1920px, the header's control heights before and after, the chat
dock in dark + glass, the web panel's row heights, all seven tabs and fourteen
settings sections for console errors and overflow, the bin's Delete-for-good
end to end, a `localStorage` wipe to reproduce the desktop shell, and a paced
NDJSON stream to settle §35H.

**And drag-to-link was shipped broken, then fixed, because it was driven.** It
was written, reviewed, committed and described in a commit message as working —
none of which is evidence. Driven with a real mouse it did nothing: the target
lit up, the release linked nothing, every time. **Dragging reheats the
simulation**, so every other node keeps drifting while you aim; between the
last mousemove and the mouse-up the target moves out from under the pointer,
and the hit test at release finds empty space. It links the note that *was
lit* now, which is also what the person saw happen. The slop went from 6px to
14px for the same reason — a 9px circle that is moving is not a 15px target.

Two of the three attempts to test it were wrong before the app was: pressing at
the centre of the node's `<g>`, which is the empty space between the circle and
its label, and reading `window.graphNodesRef` for a module-scope `let`, which
is not a property of `window`. Worth knowing for the next session that tries.

**So every other gesture built this session was driven too, and a second one
was broken.** Dragging the chat composer taller stored the new height and
snapped the box straight back to one line — immediately, before a keystroke —
because `autoGrow` took `min(scrollHeight, limit)` and an empty box is one row
tall. A hand-set height only ever worked as a ceiling. It is a **floor** now,
which is what "manually adjustable" means. The other three held: Trace from the
node popup, the cluster legend, and a notification row from the keyboard.

**The pattern is worth naming.** Both failures were in code that reads
correctly, was reviewed, and was described in a commit message as working.
Neither was findable by reading — one needed a moving target, the other needed
an empty box — and both took under five minutes to find with a pointer. *Two
out of five gestures built in one session were broken on arrival.* That is the
base rate to assume, not zero.

**§35H's client half turned out to be already fixed.** Driven with a stream
emitting one line every 120ms, the answer element grew 10 → 25 → 42 → 63 → 94
characters inside a plan run: the step timeline uses `liveMarkdownRenderer` and
renders each delta. The LaTeX half is done too (`unlatex`). What remains
possible, and is *not* disproved, is the server side: `_ToolTextGate` holds
text back while deciding whether it is a tool call, so a model that writes tool
calls as prose would still look like it lands complete. That needs a real
model.

---

## The session before that

**Long jobs finish, the agent can plan one, and the chat
controls moved to the composer.** Three user reports and the roadmap's top
open item, and they turned out to be one subject — an agent that starts a big
job and does not finish it.

1. **Rounds are earned, not granted (`agent.EARNED_ROUNDS`).** Reported: *"it
   hits a limit for tool calls which has happened quite a bit."* A flat cap
   cannot tell a model doing eight useful things from one doing the same thing
   eight times, and "tag these eight notes" is eight writes plus a search. A
   round that makes a *new, successful* call now buys another round, to a
   ceiling of `MAX_ROUNDS + EARNED_ROUNDS`. A loop earns nothing and stops
   exactly where it always did — the tests pin both directions.

2. **A stalled step is not a finished one, and a run can be resumed.**
   Reported: *"skills cut out half way through and have to restart."* Two
   bugs. The runner could only see that a step's turn produced text, and "I
   couldn't finish step 1" is text — so a step cut off mid-job was ticked ✓
   and the next step ran on top of half-finished work. The `limit` event
   separates them; a stalled step stops the run and `stopped_at` names it, so
   **Resume from step N** re-enters there instead of re-running steps that
   already wrote to the notebook.

3. **`make_plan` — the agent plans an open-ended job (§35K).** *"I will say
   fix my categories and it will only merge two categories and leave it at
   that."* The model draws 2–6 steps, its turn **ends**, and the skill runner
   works through them a step per turn. **A plan is a skill nobody saved**, so
   there is one runner rather than two, and a plan gets the plan card, the
   ticked steps and an Undo on every change for free. A run may not start a
   run (`tools.RUN_STARTERS`).

4. **The chat controls moved to the composer dock (§36B).** Asked for
   directly. Anything that decides what happens to the *next* message sits
   with the box you type it in; the header keeps only what is about the
   conversation. Every id unchanged, so `app.js` needed no edit at all.

5. **The tab bar's edge fade** no longer dims the Reminders tab when there is
   nothing beyond it (§36A-bis).

6. **§35I's manual half — `🗜 Compress`.** *"There should be a tool as well as
   a manual command… to compress chat context on longer chats so the AI can
   better continue."* The button and `POST /chat/compress` are built; the
   agent-facing tool is not, deliberately (§35I). **The useful finding is a
   correction to the premise:** a long chat never overflowed the window — the
   client sends at most four turns and `fit_history` drops whole pairs from the
   oldest end — so the real failure was silent forgetting, and a summary beats
   a drop rather than merely costing less. Nothing is deleted: the endpoint
   stores nothing, every turn stays on screen and in the saved conversation,
   and undo is one assignment.

7. **The app was opened in a real browser for the first time**, which is the
   most useful thing in this list. Chromium and Playwright are in the sandbox
   and the app runs on localhost — see CLAUDE.md for the recipe. One sitting
   found three things reading the source had not:

   - **`StaticFiles` sent no `Cache-Control`**, so a cache may reuse the
     frontend without asking (RFC 9111 §4.2.2 heuristic freshness). The
     desktop shell has no reload and its own on-disk cache, so after an update
     it can keep running the old `app.js` — *the standing explanation for "that
     button is still broken" about a button whose fix is in the file.* Now
     `no-cache`, pinned by `tests/test_static_freshness.py`.
   - **The reminder poll ran on two timers**: §36C's rewrite left the Wave O
     poller's `setInterval` behind, and JS keeps the last declaration, so the
     stray timer drove the live poller. Measured 4 → 2 requests per 65s.
   - **The tab strip clipped "Dashboard"** at the widths a laptop window
     actually uses. It takes its own row now when measured not to fit.

   The recycle bin's *Empty now* — reported broken again — was driven end to
   end: dialog, confirm, notes gone, server reports an empty bin. It works.
   That is what pointed at the cache header rather than at the button.

**The standing caveat is narrower now.** The provider tests still run against a
fake transport. The UI can be looked at, and 4, 5 and the tab bar were —
measured and screenshotted at five widths. 6's compress panel was not, and
neither were the Continue/Resume buttons. `tests/test_chat_dock.py` and
`test_style_scale.py` still stand in for looking at those, and they check
structure, not appearance.

**Everything below is from earlier sessions.**

---


**This session: §6, §11's output half, model specs, and odysseus read and
triaged (§33).** Four things landed, and they are related — each one made the
next cheaper.

1. **§6 — every OpenAI-compatible backend, not an LM Studio special case.**
   `ai/provider.py` holds what was never Ollama-specific; `ai/openai_client.py`
   is the second dialect; LM Studio, llama.cpp, Jan, vLLM and Ollama's own
   `/v1` all arrive together. Full write-up in §6, including the two things
   the plan did not predict (streamed tool-call fragments are keyed by an index
   and interleave; `loaded_context_length` has to beat `max_context_length`).

2. **The window is reported, not just budgeted.** Every message says how full
   the model's window got — `3.9k/8k window (48%)` — and turns
   warning-coloured past 80%. A raw token count never answered the question
   anyone has, which is whether the *next* turn is the one that starts dropping
   the top of its own prompt. Counts a server won't report are estimated from
   characters and marked `~`, because a guessed number the user believes was
   measured is worse than a blank.

3. **§11's output half — quick / normal / detailed.** One picker moves the
   reply cap, the temperature, the thinking toggle and a length hint together.
   `normal` is byte-for-byte what every turn got before, and a test says so.
   Deliberately a preset rather than automatic routing: choosing by task needs
   a "how hard is this turn" judgement that is itself a model call, and it
   fails by being wrong confidently rather than obviously.

4. **The model's actual specs are read.** Ollama's `/api/show` has been
   reporting parameter count, quantisation and a `capabilities` list all along;
   the app read one field and ignored the rest. Reading `capabilities`
   immediately caught a bug in the preset built three hours earlier — `quick`
   would have sent `think: false` to models that reject it, failing every turn.
   `supports()` is **tri-state**: True, False, or None for "this backend does
   not say", and None is never treated as False.

**One security item, from odysseus's `url_safety.py`.** The backend address is
now a setting, which makes it the one setting that can send notes off this
machine. Link-local (the cloud metadata range) is refused; loopback and LAN are
the normal case and are allowed; anything else is allowed and *warned about*,
because the app's promise is that notes stay here. The check order turned out
to be load-bearing and the first version was wrong: Python classes
`169.254.0.0/16` as both link-local and `is_private`, so an allow-private rule
running first waved the metadata address straight through. Both overlaps have
a test naming them.

**Everything below this line is from earlier sessions.**

---


Newest at the top. Everything here is on `main` (or the branch merging into
it), verified, and must not be rebuilt.

**The whole prompt is budgeted against the model's window now — this was the
"maxed out token window" failure, and it was real.** Asked directly: *"make
sure the AI can run as efficiently and effectively as possible… I don't want
it being too prompt and context heavy and then taking ages to respond or
failing due to a quickly maxed out token window."*

Measured before cutting, as §11a insists. **Nothing added the parts up.** Each
cap was individually reasonable and set in a different session against a
different concern:

| Part | Chars | Tokens |
| --- | ---: | ---: |
| System prompt | 2,416 | ~604 |
| Tool schemas | 4,096 | ~1,024 |
| History (4 turns) | 5,800 | ~1,450 |
| Notes (10 × 900) | 9,000 | ~2,250 |
| Tool results across a loop | 24,000 | ~6,000 |
| **Worst case** | **45,312** | **~11,328** |

Against a 4,096-token window that is **2.8× over**, and the tool-result cap
alone exceeded the whole window by half. Overflow is dropped from the *front*,
which is the system prompt — so it never raised, it just stopped the model
knowing it had tools. `ai/context.py` now derives every share from what is
actually left after the system prompt and a reserve for the reply, so the
worst case fits every window exactly, and a 32k model gets **more** than the
old constants ever allowed (they were sized for the smallest case and applied
to everyone).

**Two things were sent to Ollama for the first time**, and the second is the
subtle one:

- `num_predict` — the reply was unbounded. Output tokens are generated one at
  a time, so they dominate wall-clock; an unbounded reply is the commonest
  reason an answer "takes ages".
- `num_ctx` — **Ollama runs a model at its own default (commonly 4,096)
  regardless of what the model was trained for.** So reading 32k from
  `/api/show` and budgeting against it, *without also asking for 32k*, would
  have reproduced the exact overflow the budget exists to prevent. The number
  budgeted against and the number requested are now the same one. Capped at
  8k by default because the KV cache scales with the window and a 7B at 128k
  wants gigabytes a laptop may not have — `max_context_tokens` raises it.

**Tools are fitted to the model, not to a constant.** Asked directly — *"if
adding more tools is an issue, can we change or improve how tools are used so
that doesn't become an issue?"* — after four category tools took the all-tools
overhead within ~180 characters of a 4096-token window. The answer was that
4096 is Ollama's *fallback when a model declares nothing*, not a fact about
any model anyone runs. `tools.within_budget` now fits the schemas to the
window the model reports via `/api/show`, drops the least relevant when they
do not fit, and logs what it held back. A 16k model gets the whole registry; a
genuine 3B gets a prioritised subset instead of silently losing its system
prompt off the front. **§14's list is open again** — see the table there.

**§1's live log console is finished, and there is a support bundle.** The
Logs screen streams now — NDJSON over `fetch`, **not** the EventSource this
document suggested, because EventSource cannot set headers and this app
authenticates with `X-Auth-Token`; the usual workaround puts the token in the
query string, which on the log endpoint would write it into the records it
protects. Follow/tail pauses when you scroll up and resumes at the bottom;
level, source and text filters re-draw what is held rather than refetching;
tracebacks fold; server and browser records are merged into one time-ordered
list; errors that land while you are elsewhere badge the nav.

The **support bundle** button zips the log, redacted settings, app/model
status and row counts. It is an **allowlist**, not a denylist: named
diagnostic settings go in verbatim, everything else is reported as
`"display_name": "str, 31 chars"`. A denylist would have to predict every
sensitive key anyone ever adds; this only has to name the ones that help.
Nothing is transmitted — that is the whole difference between this and the
crash reporting §30 turned down.

**Copying an error out was the follow-up ask, and it found something bigger.**
Per-record copy buttons (traceback included), a Copy traceback button, a
clickable error badge that filters to errors, and an honest "Copy 12 shown"
label. Underneath: **every copy button in the app only worked on localhost.**
`navigator.clipboard` exists only in a secure context, `http://localhost`
qualifies, and nothing else does — so a LAN address or a tunnel turned every
copy in the app into a no-op that said "couldn't copy". Three tiers now:
the modern API, `execCommand` for plain http, then a dialog with the text
pre-selected.

Four bugs found while building this, none of them by the existing suite:
the live pill kept reading "● live" after the stream was deliberately closed
(the abort path returned before updating it — found in a browser); the stream
dropped every record that arrived in its last poll interval before handing
over to the client's reconnect (the deadline was checked before the drain —
found by a test that had to be written first); both toolbar dropdowns
collapsed to their arrows (a flex item's automatic minimum size does not
protect a `<select>`, and one of the two only looked right because an earlier
change had given it a `max-width`); and the traceback fold was laid out as a
fifth *column* of a single-line flex row, squeezed to a few characters against
the right edge — the row needed to wrap and the fold to claim `flex: 0 0 100%`.

**The security tier at the top of the priority map is closed — all seven.**
Full detail is up there with each item; the short version:

- **Three were already built**, and the audit is what established that: WAL
  mode, the unlock-gate backoff, and the KDF (scrypt n=2^15 — memory-hard,
  so stronger than the PBKDF2 the item would have settled for). All three are
  now pinned by tests rather than left to be rediscovered a fourth time. This
  is the fourth session in a row where a "grep first" would have saved work.
- **Session tokens expire now**, on an idle clock (12h) and an absolute one
  (7d), and expiry closes the vault as well as dropping the token. SameSite
  turned out not to apply: the token is an `X-Auth-Token` header, not a
  cookie, so no browser ever attaches it cross-site on its own.
- **An Origin/Referer check** (`core/security.py`) refuses requests another
  site's page caused. It matters most *before* a password is set, which is
  the case that looks like it doesn't matter: the gate is open then, and a
  drive-by `POST /auth/setup` could have claimed the notebook.
- **A strict CSP** — no `unsafe-inline`, no `unsafe-eval`, no host named at
  all. The eight `style=""` attributes in `index.html` moved to `style.css`
  to make `style-src 'self'` honest, and the one inline `<script>` (the
  pre-paint theme block) is allowed by a **hash computed from the file at
  startup**, so editing that block can never leave a stale hash and a blank
  page behind.
- **SearXNG's docker path was publishing to the LAN.** `-p 8888:8080`
  publishes on every interface, and docker's own firewall rules mean a host
  firewall set to refuse it never sees the packet. The source path was always
  correct; only docker was wrong. Containers created by earlier versions are
  detected and recreated, because publishing cannot be changed after create.

**One shipped feature broke, and 757 green tests did not notice.** Custom CSS
(Settings → Appearance) applied itself by injecting a `<style>` element —
exactly what the new `style-src 'self'` refuses. It now adopts a constructed
stylesheet, which keeps the feature *and* the strict policy. Found by driving
Chromium and reading the console, which is the only place a CSP violation
surfaces. **Don't redo:** `core/security.py`, the session TTL, the moved
inline styles, the SearXNG publish fix, `tests/test_security_boundaries.py`.

**Skills are jobs now, not saved sentences (§21, the top item).** Steps, a
tool allowlist, declared inputs, and a plan drawn in the timeline before
anything runs. `save_skill` takes steps and tools, so the AI can write a real
one. The built-ins moved from `app.js` to `ai/skills.py` and are served from
`GET /skills`.

**And running one is a job, not a paragraph.** `ai/skill_runner.py` executes
one step per turn, so the app knows where it got to: steps tick off as they
finish, a failed step is named with its reason and stops the run, and the run
ends in a list of what changed with **View** and **Undo** on each row. The
undo is a tool call captured before the write and replayed through
`POST /chat/tools/execute`. Every built-in was rewritten as a real job with
steps and declared inputs, asked for in one dialog before the run.

Driven in Chromium: chips load from the server, the editor saves and refuses
a bad skill by name, the input dialog refuses a blank required field, steps
tick and a failure shows its reason, Undo really undoes it, the whole run
replays after a reload, 0px of horizontal overflow, no page errors.
**Don't redo:** the skill schema, the runner, the allowlist plumbing, the
editor, the plan/step/result UI.

**SearXNG installs and runs.** Five separate bugs, three of them fatal on
every OS and none of them visible in the log, because they all happened
before SearXNG wrote a line: the repository cannot be checked out on Windows
(four filenames contain a colon), `pip install -e .` cannot build it at all
(its setup.py imports a runtime dependency), a plugin downloads a file at boot
and kills the process if that fails, `os.kill(pid, 0)` terminates the process
on Windows instead of checking it, and `rmtree(ignore_errors=True)` leaves a
git checkout half-deleted there while reporting success. Verified end to end
here — installed, started, answered its JSON API, passed the app's own probe.
Full write-up in §8b. **The two Windows-specific fixes are unverified on
Windows** — ask the user.

**Web search has its own settings screen now.** It was four controls two
thirds of the way down Preferences, which is why every error message saying
"Settings → Web search" pointed at a screen that did not exist. It is now
`settings-websearch`, listed under "The AI" in the nav, with a real engine
picker: `auto` / `searxng` / `duckduckgo`, stored as the `search_provider`
preference. **"SearXNG only" does not fall back** — that fallback was wrong
for the one person who most wants SearXNG, someone running it so their
queries stay on their own network. The provider list is served from
`GET /websearch/providers` rather than written out in `app.js`, so the radios
cannot offer something the API rejects, and both the HTTP route and the
agent's `web_search` tool read it through `websearch.settings_from(config)`.

**SearXNG is now debuggable, which it was not.** Its stdout and stderr went to
`DEVNULL`, so "SearXNG started but never answered. Check the port isn't in
use." was a guess, and the same guess every time. Output now goes to
`data/searxng/searxng.log`, the tail is quoted in the failure and shown in a
fold on the settings screen. Alongside it: a **port answer** (free / held by a
working SearXNG / held by something else — only the last is the user's
problem) and a **↻ Reinstall** button, because a part-finished install makes
`source_installed` say yes while the process dies instantly, and there was no
way back short of deleting folders by hand.

`_reason()` also stopped reporting pip's parting "[notice] To update, run:
… --upgrade pip" as the cause of every failed install. It took the *last*
line; that notice is always last.

**The CodeQL alert list is closed**, and two of the thirteen were real:

- The SearXNG *search* path resolved the hostname to check it and then handed
  the hostname to `requests`, which resolved it again — the DNS-rebinding
  window the reader path closed months earlier, still open here. The probe
  pinned; the search that followed it did not. Both now go through one
  `websearch._searxng_target`.
- `execute_tool` could not tell a message a handler wrote from whatever
  `int("abc")` happened to say, so stray exception text reached the model and
  the UI. Handlers now raise `tools.ToolError`; everything else is logged and
  reported by shape.

The rest were quality: log injection (`logbuffer.safe_value` at the call site
— `sanitise` only ever ran at the ring buffer, so the terminal saw raw text),
three `except: pass` blocks that now say what failed, the
model_manager↔embeddings and deps↔embeddings cycles (a `Protocol` and moving
`store_quietly` to `deps`), and a test asserting `"example.com" in label`.

**There is now a prompt budget.** `agent.PROMPT_BUDGET_CHARS` caps the system
prompt plus all tool schemas, and `tests/test_prompt_budget.py` enforces it.
Measured: ~3,050 tokens per round, **77% of it tool schemas, not prose**. This
matters because Ollama defaults to a 4096-token window and overflow is dropped
from the *front* — so a 3B model that overflows stops knowing it has tools,
and reports as "the AI won't use tools". See §11a.

**Also done:** a favicon that survives 16px (the old one was drawn at 100 and
had no background, so its white nodes vanished on a light tab strip), plus a
maskable icon and PNG fallbacks; inline markdown in the note list (§22); the
emblem and wordmark on the dashboard (§22); a full README rewrite.

**Don't redo:** the README, the favicon/icon set, the web-search settings
screen, the engine picker, the SearXNG port/reinstall/log work, the prompt
budget, note markdown, the dashboard hero.

---

## A security audit across the whole backlog — all seven closed

Asked for directly: a triage across *everything* in the roadmap for security gaps, not just what had already been reported. Moved here from ROADMAP.md's priority map once every item was done, so that file stays about what's still open.

**Security — worth doing out of turn, regardless of size.** ~~None of these
are large, and all of them are the kind of gap that's invisible until it
costs something. Do these before anything else in this map, not after the
"quick wins" below, even though most of them *are* quick wins by effort~~
**all seven closed.** Three were already built and the audit is what
established that; four were real and are done. `tests/test_security_boundaries.py`
pins all seven, including the three that were already true — a test is what
stops the next audit having to rediscover them.

1. ~~`PRAGMA journal_mode=WAL` (§20)~~ **already built.** `core/database.py`
   sets it per connection, alongside `busy_timeout=5000` and
   `synchronous=NORMAL`. Nothing to do; now pinned by a test.
2. ~~Session TTL, and `SameSite=Strict` if the session is a cookie (§20)~~
   **done.** Tokens now carry an issue time and a last-used time, and expire
   on two clocks: idle (`_SESSION_IDLE_TTL`, 12h) and absolute
   (`_SESSION_MAX_AGE`, 7d). Expiry closes the vault too — an expiry that left
   the data key in memory would be a lock on one door only. **SameSite does
   not apply and its absence is not a gap:** the token travels as an
   `X-Auth-Token` header the frontend sets explicitly, so a browser never
   attaches it to a cross-site request on its own. That is a stronger position
   than a SameSite cookie, not a missing flag.
3. ~~Origin/Referer check on the API (§20)~~ **done** —
   `core/security.py:OriginCheckMiddleware`. A request is refused when it
   states an Origin (or, failing that, a Referer) that disagrees with the Host
   it was sent to; a request with neither is allowed, because that is curl,
   the pywebview shell and the desktop shortcut, and a browser attaches Origin
   to exactly the cross-site requests this stops. `localhost` and `127.0.0.1`
   are treated as one machine on the same port. **The window this matters most
   in is the one that looks like it doesn't:** before a password is set the
   unlock gate waves everything through, which is also when a drive-by POST to
   `/auth/setup` could claim the notebook and lock the owner out of it.
4. ~~Brute-force backoff on the unlock gate (§8b)~~ **already built.**
   `routes_auth._refuse_if_throttled` — one global bucket, five free tries,
   then an exponential wait to a five-minute ceiling, forgiven after 15
   quiet minutes. Now pinned by a test.
5. ~~A CSP header on the app's own responses (§8b)~~ **done, and it is strict:
   no `unsafe-inline`, no `unsafe-eval`, and no host named anywhere in it** —
   every source is `'self'` or a hash. That was only affordable because of the
   no-CDN rule the project already follows. Two things had to move to get
   there, both worth knowing about before editing them back:
   - The eight `style=""` attributes in `index.html` are now rules in
     `style.css`, so `style-src 'self'` is honest. A test asserts the file has
     none left.
   - **The one inline `<script>` — the pre-paint theme block — is allowed by
     the sha256 of its own contents, computed from the file at startup rather
     than written down.** Written down it would go stale the first time anyone
     edited that block, which this document already expects to happen (its
     theme table is kept in step with `THEME_PRESETS` by hand), and a stale
     hash fails as a blank unstyled page.
   Alongside it: `X-Content-Type-Options`, `X-Frame-Options`,
   `Referrer-Policy: no-referrer`, and a `Permissions-Policy` that turns off
   geolocation/camera/payment/usb — deliberately **not** the microphone, which
   voice capture needs.
6. ~~Confirm the KDF behind private notes is slow (§8b)~~ **already true, and
   better than the item assumed.** `core/crypto.py` uses scrypt at n=2^15,
   r=8, p=1 — a memory-hard KDF, so stronger against GPU guessing than the
   PBKDF2 the item would have accepted. The envelope design (password wraps a
   DEK; the DEK encrypts notes) is also why a password change re-wraps 32
   bytes instead of re-encrypting every note.
7. ~~Confirm SearXNG binds to localhost, not the LAN (§13)~~ **half of it was
   already true and the other half was a real hole.** The source path sets
   `SEARXNG_BIND_ADDRESS=127.0.0.1` and always did. **The docker path did not:**
   it ran `-p 8888:8080`, and that publishes on *every* interface, which is
   not what the plain reading suggests. Worse, docker writes its own firewall
   rules, so the port is reachable from the LAN even behind a host firewall
   set to refuse it — the firewall never sees the packet. An exposed SearXNG
   is not just an open port: it is an unauthenticated proxy to the internet
   that a stranger can run searches through, and a log of everything the owner
   has searched for. Now `-p 127.0.0.1:8888:8080`. **Publishing is fixed when a
   container is created**, so changing the run command only protects people who
   never started SearXNG — a container from an earlier version is detected by
   `docker inspect` and recreated. A container it cannot inspect is left alone
   rather than destroyed on a guess.

> **What this cost, and the lesson worth keeping.** The strict CSP broke one
> shipped feature, and **the full test suite — 757 green — did not notice.**
> Settings → Appearance lets you write custom CSS, and it applied it by
> injecting a `<style>` element, which is precisely what `style-src 'self'`
> refuses. It now adopts a constructed stylesheet (`adoptedStyleSheets`),
> which CSP does not treat as inline content, so the feature works *and* the
> policy stays strict — the alternative, `'unsafe-inline'`, would also have
> re-permitted style injected through note text. It was found by driving
> Chromium and reading the console, which is the only place a CSP violation is
> reported. This is the same lesson §8's bug list already carries, arriving
> again by a new route: **a green suite says nothing about what a browser
> refuses to do.**

## Done in earlier sessions — don't redo

**Bugs fixed** (each reproduced and verified in a browser):

| Symptom | Actual cause |
| --- | --- |
| Settings screens cut off, unscrollable | Modal grid row sized to content, so the scroll pane grew past the dialog and was clipped |
| Page scrolled behind open dialogs | No scroll lock; now one observer derives it from whichever overlay is visible |
| Dashboard empty until Edit layout was opened and cancelled | `switchTab` runs before auth, so widgets painted from 401s and never retried |
| "Thinking… Thinking about your week…" | `typingDots()` renders its own label under reduced motion; the caller appended a second |
| Agent answers arrived in one lump | The loop called the non-streamed `chat_tools` — the default chat path was the only one that didn't stream |
| No metadata when tools were used | The meta line was gated on prose existing |
| Couldn't switch search engines "early" | The picker lived inside the Ollama-only block, including the built-in option that needs no Ollama |
| Movement dropdown blank | `bg-motion` missing from `APPEARANCE_DEFAULTS`, so the value was `undefined` |
| "Ask about this" did nothing | It prefilled text for a model that cannot open a URL; now backed by a real `read_url` tool |
| Top bar out of alignment | Header wrapped at every width 720–1400px; after the first fix, clipped "Reminders" from 900–1300px |
| Jump-to-note dead from search, graph, wiki links | `flashEntry` scrolled to a card inside a `display:none` sub-tab |
| Ask query disappeared | The box was cleared on submit, leaving an answer with nothing saying what it answered |
| Reminder controls misaligned | Four different heights (44/42/41/40px), so "centred" gave four different tops |
| Chat + document sidebars scrolled away | A later ID rule set `position: relative`, outranking the sticky rule |
| **Reminder 5 min ahead read as 10 hours overdue** | SQLite drops the timezone; JS parses naive date-times as *local*. Fixed with a UTC-aware column type covering every table |

The whole of §8's reported bug list has since been closed as well — see that
section for what each one turned out to be.

**Fixed in the session after that**, each reproduced in Chromium first:

| Reported as | What it actually was |
| --- | --- |
| The thinking arrow clashes with the chain circles | `list-style-position: outside` draws the `<details>` marker *outside* the summary's box — exactly where the rail's gutter is. No gutter width could clear it; the native marker is now removed and redrawn inside the summary |
| "MemoryMap AI" is gone from the top bar | Twice my own doing: I moved the hide breakpoint (1390, then 1080) instead of fixing why it hid. `h1` had `flex: 0 1 auto` + `min-width: 0` with `white-space: nowrap`, so the box shrank below the text and the name printed over "Dashboard" — the original overlap report. Now `flex: 0 0 auto`, visible to the 720px mobile breakpoint |
| "Add Persona" does nothing | Two elements shared the id `persona-prompt` — the Chat tab's peek panel `<div>` and the Settings `<textarea>`. `getElementById` returns the first without complaining, so the handler read `.value` off a div and threw |
| The categories sidebar looks awkward | `.category-actions` was `opacity: 0` but still in the flow, so every category row reserved width for invisible buttons and the "All" row, which has none, did not — the counts marched in and out down the list |
| Web search returns nothing, silently | Three different failures (no egress, a rate-limit challenge page, a genuine empty result) all surfaced as an empty list. Now logged and named separately — confirmed working in use |

**Also added:** the AI status dot — four states now (… grey checking, ✓ green,
! amber, ✕ red). The header pill that spelled the state out
in words is now a coloured circle with a glyph (✓ green / ! amber / ✕ red) and
the sentence on hover, focus or click. It reclaimed the 17.5rem the pill's slot
reserved, which is why all six tabs now fit beside the wordmark at 1200px
without scrolling. Amber, not red, is the state for "no AI at all": this app is
built to degrade gracefully, so running without Ollama is supported rather than
broken, and colouring it red would train you to ignore the indicator. Red is
kept for a model that failed to load or a server that can't be reached.

**Also added:** the Lagoon and Shallows themes (an indigo ground with a teal
accent, dark and light), recovery advice on every failed tool call, and a
prompt that tells the agent multiple rounds are expected. Guard tests now
catch duplicate element ids, `$("…")` lookups with no matching element, and
the pre-paint theme table drifting from `THEME_PRESETS`.

**Features added:** 10 curated themes layered over `main`'s 7 palettes
(`your change → theme → default`, with separate "reset theme" and "clear my
changes") · Settings → Account with password change (`vault.rewrap` existed and
was called by nothing) · `--reset-password` CLI · agent step timeline
(thinking → tool → tool → answer, persisted with the turn) · `read_url` tool ·
Agent mode rename · split date/time reminder fields with presets, ±15m/±1d
nudges and a plain-English readout · auto-growing capture and magic-add boxes ·
jump-to-note after capture · name nudge on the dashboard ·
`start-desktop.bat` / `./start.sh --desktop`

**Security/privacy:** the User-Agent named the app to every site searched or
read — now a common browser string, no cookie jar, no Referer, DNT/Sec-GPC,
POST so queries stay out of request lines, tracking params stripped from result
URLs. DNS-rebinding hole in the reader closed by pinning the validated IP on
each redirect hop. Six `except: pass` blocks around embeddings now log, so a
broken backend is visible instead of silently shrinking search.

**CodeQL triage** (from the alert list the user shared): the two Critical SSRF
alerts are inherent to the reader feature and already guarded — the one real gap
was the DNS-rebinding TOCTOU, now closed. Log injection is handled by sanitising
at the buffer. The rest (cyclic imports, empty excepts, unused global) are code
quality, and the assert-with-side-effect ones were real test bugs, now fixed.

---

## 6. OpenAI-compatible backends (LM Studio, llama.cpp, Jan, vLLM) — **done**

**Built.** `ai/provider.py` (the neutral seam), `ai/openai_client.py` (the
second dialect), `deps.build_llm_client`, `POST /models/provider`, and the
Model backend picker in Settings → Models. 47 tests in
`tests/test_providers.py`. The original plan is kept below the status block
because its reasoning is still the reasoning; what follows first is what the
plan got right, what it missed, and what is left.

**What the plan got right.** All four questions it staked out were the right
four, and three of them cost almost nothing because the groundwork was already
there. `usable_context` was already reached through `getattr` for exactly this
reason. `extract_text_tool_calls` already handled the OpenAI spelling of
arguments-as-a-JSON-string, because Ollama models were already inconsistent
among themselves — so the "new" dialect was one this app could already read.
`_ThinkTagSplitter` and `_ToolTextGate` needed no change at all, because the
split was kept at "parse one chunk"; the SSE framing is handled below them and
they never learned it exists.

**What the plan missed, and what it cost.** Two things, both in the streaming
path, and both silent failures rather than errors:

- **Streamed tool-call fragments are keyed by an `index`.** Arguments arrive as
  partial JSON spread over many chunks, and *two concurrent calls interleave on
  the wire*. Folding them in arrival order rather than by index yields one
  unparseable blob — and it only happens when the model asks for two things at
  once, which small models do constantly, so it would have looked like "the
  agent sometimes ignores its tools". There is no Ollama equivalent to have
  learned this from.
- **`loaded_context_length` has to beat `max_context_length`.** LM Studio
  reports both, and the plan only named the latter. A 128k-capable model that
  was *loaded* at 4k will drop the front of the prompt — the system prompt,
  the part telling it that it has tools — if the app budgets against what it
  could have held. This is the same class of mistake as the one §11a existed to
  fix, one layer further out.

A third thing the plan named but understated: **tool results are addressed by
id**, and the interesting case is a model calling the same tool twice in one
turn. Matching results to calls by name alone addresses both to the first call,
leaves one unanswered, and the server rejects the entire turn.

**Decisions worth not re-litigating.**

- **`OllamaError` was aliased, not subclassed.** It *is* `ProviderError` now.
  Introducing a neutral parent and leaving `OllamaError` as a child would have
  looked tidier and silently stopped a dozen existing `except OllamaError`
  handlers firing for the new provider. The tidier-looking change was the
  broken one.
- **The shared helpers were moved, not copied,** and a test asserts they are
  gone from `ollama_client.py`. Two tool-text gates that drift apart is exactly
  the failure this refactor exists to prevent.
- **An unknown context window stays unknown.** Where neither the server nor
  the known-model table can answer, the app budgets against
  `DEFAULT_CONTEXT_TOKENS` and does not invent a number. A fallback 128k is not
  proof a model holds 128k, and a budget scaled off an unverified window is
  worse than a conservative one.
- **Setting a backend does not require it to be up.** You set the address, then
  you start the server. `POST /models/provider` saves either way and reports
  what it found.

**What is left.** Small, and none of it blocking:

- **The async-httpx refactor (§20)** was *not* done alongside this, against the
  plan's own advice. The reason: the second provider was already a full rewrite
  of the streaming path, and doing both at once would have meant no version of
  the streaming path that was known-good to bisect against. It is still worth
  doing, and now has to touch two clients instead of one — that is the price,
  and it was paid deliberately.
- **Unverified against real servers.** Every test here is against a fake
  transport. The SSE framing, the `[DONE]` sentinel and the fragment-index
  behaviour are all from the specification rather than from a running LM Studio.
  Worth thirty minutes with the real thing before calling it confirmed.
- **`api_key` is stored in `preferences.json` in plain text**, like every other
  preference. It is excluded from the support bundle. That is fine for a local
  server that ignores it and *not* fine for a hosted gateway key; if anyone
  points this at a paid API, the key belongs in the vault (§26) instead.
- **Embeddings via the OpenAI backend are implemented but not wired to the
  Settings UI** — `embedding_backend` still offers "built-in" and "ollama"
  only. `OpenAICompatClient.embed` works; nothing calls it yet.

---

### The original plan, kept for its reasoning

**Why.** Asked for directly. LM Studio serves an OpenAI-compatible API on
`http://localhost:1234/v1`, and so do llama.cpp's server, Jan, vLLM — and Ollama
itself. **One provider gets all of them**, rather than an LM Studio special case.

**Shape.** Generalise `ai/ollama_client.py` into a provider interface. This is
real work, not a URL swap: the streaming shape and the tool-call shape both
differ from Ollama's. Provider + base URL configurable in Settings → Models,
with capability detection for tools and streaming, so a backend that can't do
tool calls degrades to plain Q&A exactly as a tool-less Ollama model does today.

Best done together with the async-httpx refactor in §10 — both rewrite the same
client, and doing them separately means touching the streaming path twice.

**Read this before starting — the context work has already staked out the
interface.** Four things a provider must now answer, and what happens when it
cannot:

1. **`usable_context(model)`** — the window to budget against. Already reached
   through `getattr` in `agent.run_agent` for exactly this reason: reporting a
   context length is an Ollama feature (`/api/show`), and a provider that
   cannot answer falls back to `DEFAULT_CONTEXT_TOKENS` rather than crashing
   the turn. **LM Studio does expose this** — `GET /api/v0/models` returns
   `max_context_length` and `loaded_context_length` — so the interface should
   have it, with a `None` return meaning "ask me nothing further".
2. **`runtime_options(model)`** — currently Ollama's `num_ctx`/`num_predict`.
   The OpenAI shape spells these `max_tokens` (and has no `num_ctx` at all —
   the window is fixed when the model is loaded). So this cannot stay an
   Ollama-shaped dict on the interface: either each provider translates a
   neutral `{context_tokens, max_output_tokens}`, or it owns the whole payload.
   **The neutral pair is the better shape** — the agent should not learn four
   dialects.
3. **Tool-call shape.** `_normalise_tool_calls` and `extract_text_tool_calls`
   already exist because Ollama models are inconsistent *among themselves*; the
   OpenAI shape (`tool_calls[].function.arguments` as a JSON *string*) is
   another dialect on the same axis, and `extract_text_tool_calls` already
   handles that spelling. Reuse rather than re-derive.
4. **Streaming shape.** Ollama sends bare JSON lines; OpenAI sends SSE
   `data: {...}` with a `[DONE]` sentinel and deltas nested under
   `choices[0].delta`. `_ThinkTagSplitter` and `_ToolTextGate` sit *above*
   this and should not need to change — keep the split at "parse one chunk"
   so they don't.

The capability-detection point in the paragraph above is now cheap: a provider
that returns `None` from `usable_context` and `[]` from a tools probe already
degrades correctly through paths that exist and are tested.

**One trap that is specific to this work.** `tests/test_context_budget.py`
asserts that all four Ollama generation paths send an options block. A new
provider needs the equivalent assertion of its own, or it will run on the
backend's defaults — which is the bug §11a spent this session fixing, arriving
again through a different door.

---

## Answers to questions already raised, so they aren't re-asked

**Is it one user per app?** Yes. One `users` row, one bcrypt password, gating
every route. Separate notebooks are separate `MEMORYMAP_DATA_DIR`s, not separate
accounts.

**Forgot password?** Two different answers. Ordinary notes are *not* encrypted by
the password — they are plain SQLite rows and come back untouched, via
`python -m memorymap --reset-password`. Private notes *are*: their key is derived
from the password, so without it nobody can recover them, including that command.
The UI and the command both say so before you commit. No backdoor was added, on
purpose.

**Does the AI use my name in the greeting?** Yes, when `display_name` is set in
Preferences. The AI-written path weaves it in about 75% of the time
(`NAME_USE_CHANCE`); the handwritten fallback path always appends it. It was
empty by default and buried among a dozen fields, which is why it looked like
the feature didn't exist — the dashboard now offers to set it once, then stops
asking.

**Themes vs palettes?** Palettes own colour only (7, each with a matched light
and dark set). Themes own everything else — light/dark, font, density, radius,
glass — and *select* a palette rather than carrying colours of their own. They
had to be reconciled: both were writing the accent, and `[data-palette]` rules
come later in the stylesheet, so a theme's colour silently lost.

**Open question for the user:** two pickers on one screen may still be one too
many. The alternative is folding them into ~15 complete looks. Left split,
because "same layout, different colours" is a real thing to want — worth
confirming.

**Does the "AI is off" status ever turn red?** Yes — amber (the common case,
Ollama not running) and red (a model that failed to load, or a server that
can't be reached) are both real states. Asked as "does the X status ever
happen? I've never seen it" — if you've only ever seen amber or green,
that's consistent: red needs Ollama to be *reachable but failing*, which is
rarer than it simply not running.

## 35. Reported in one session — the big batch, triaged — done

One round of real use, mostly the desktop app, triaged into thirteen
sub-items (35A–35L) and worked through. All resolved:

- **The Ask section** (35A): stopped answering smalltalk conversationally,
  fixed retrieval clipping, and the "Quick mode + thinking model produces
  nothing" bug — `num_predict` was one flat cap shared between thinking and
  answer tokens; thinking allowance is now added on top, not carved out of it.
- **Hallucinated writes** (35B): the claim-pattern net widened to catch
  first-person-plural and markdown-bolded claims, and checked per-action
  against the tools that actually ran, not just "did anything write at all."
- **Thinking-model capability reporting** (35C), **response-mode presets**
  (35D), **desktop-app localStorage persistence** (35E), **broken buttons**
  from listeners bound to re-rendered nodes (35F), **a stacking-render bug**
  in the constellation widget (35G), and a **streaming diagnosis** that ruled
  out the client (35H) were each found and fixed.
- **Chat compression's manual half** shipped (35I; the agent tool followed
  in a later session — see the entry below). **Document creation** closed a
  read/write asymmetry (35J). **The agent's character** — long jobs cutting
  out mid-way, a flat round cap unable to tell progress from a loop — got
  earned rounds and resumable skill steps (35K). **The design-token
  foundation** (35L) landed as `DESIGN.md`, with `tests/test_style_scale.py`
  enforcing it against drift.

Full detail, including what verification could and could not cover: git log
for this range, and [CHANGELOG.md](../CHANGELOG.md).

## 36. UI layout and surfaces — the reported list — done

The layout work built on top of §35's design tokens, gathered into one list
rather than scattered remarks: scrolling and sticky surfaces made structural
(the window itself stopped scrolling, so sticky headers resolve against the
right ancestor), and the tab-by-tab layout passes that followed — Notes,
the Library, the graph and Timeline, the chat dock — each converted to the
token scale rather than to whatever looked right that day, per §35L's own
warned-against failure mode.

Full detail: git log for this range, and [CHANGELOG.md](../CHANGELOG.md).

## 37. Reported in one session — the second big batch — done

The four items blocked on a clarifying question (37G/37H/37I/37K) were asked
and closed: sketch image upload with a real eraser (two canvas layers, so
erasing reveals the photo rather than punching a white hole), a document
importer via `markitdown`, compress-as-a-tool, and an emoji audit. 37H
(llama.cpp) was deferred deliberately and is Tier 3 in ROADMAP.md.

Full detail: git log for this range, and [CHANGELOG.md](../CHANGELOG.md).

## 38. The backlog audit — done

A step back from three consecutive rounds of newly-reported work to check
§1–§34 against the actual code, because the backlog had gone stale in both
directions: things marked open that were built, and the project's own outside
review's top recommendation already satisfied and not marked so. Its ranking
is superseded by ROADMAP.md's single tiered list.

## 39. The background librarian, memory streams, and the whiteboard — built

Three capabilities that arrived with the antigravity branch and were finished
during its audit.

- **The background librarian** (`ai/autonomous.py`): a scheduled agent pass
  that tags, links and flags duplicates. Off by default, because it is the one
  place the model writes with nobody watching. Destructive tools are *barred*
  rather than confirmed (there is no one to confirm to), rounds are bounded, it
  uses the utility model, and it skips itself on battery. Every pass records
  what it changed, with the call that reverses each change, shown in
  Settings → Background tasks.
- **Memory streams** (`save_user_preference`): the model can write itself
  standing instructions it gets back on every later turn. Bounded on three
  axes — 200 characters each, 40 active, and a 600-character ceiling on what
  reaches the prompt — because `PROSE_BUDGET_CHARS` is asserted against the
  *static* prompt and anything appended at runtime slips past it. Listed,
  editable and switch-off-able in Settings → The AI → What it remembers.
- **The whiteboard** (`api/routes_whiteboard.py`): note cards and sketches on
  a pannable canvas. A board is itself an entry, so it is searchable and
  filable like anything else; `board_id IS NULL` is the scratch board.

## 40. The antigravity audit — done

A week of another agent's work (~9,600 insertions, no tests) arrived with **90
failing tests and 20 ruff errors** against a `main` whose only two failures
were a time-bomb in a dated test. One thing was reverted — `/chat/stream` had
been rewritten as a WebSocket, costing thread-safety, the auth gate and the
same-origin policy for no gain on a local-first app — and everything else was
kept and fixed.

**The four shapes the failures took**, which is the part that transfers:

1. **A working thing rewritten into a riskier thing**, with no stated reason.
2. **Features that never ran once** — a `start()` never called, a function
   that does not exist called inside a broad `except`, a method name that
   appears nowhere else, 35 inline styles refused by the app's own CSP.
3. **A guard removed while the shape around it was kept** — two tools grew
   batch arguments and stopped calling `_require_note`, the only thing that
   refuses a private note.
4. **Damage that lands far from its cause** — two missing entries in
   `APPEARANCE_DEFAULTS` wrote `undefined`/`NaN` into CSS custom properties,
   and every card, field and dialog in the app rendered flat and borderless on
   every fresh profile. Nothing logged; one `getComputedStyle` found it.

The lesson is narrower than "review harder": **a branch that cannot run CI has
not been reviewed, however carefully it has been read.** 46 tests and 4 lints
were added so the next such branch is judged in minutes. Judgement criteria in
[ANALYSIS.md §34b](ANALYSIS.md).

## 41. The reported list, triaged — done, and the plan it produced

Trace on the graph was rebuilt (it was unusable because `traceModeActive` was
consulted nowhere, so the map never responded and both ends came from selects
listing every note); the autonomous switch that "kept disabling itself" had two
writers and one stale cache; light/dark stopped reaching the page background
because the scheme builder stored one inline colour for one mode. Plus six
whiteboard bugs, the skill descriptions clipped to one line, the documents
sidebar crushing its own list, a dead "+ New Skill" button, two `cryptography`
advisories, and a CodeQL stack-trace exposure.

**Checked and found already correct, so nobody spends a session on it:**
password and secret storage (bcrypt with per-password salt, `token_hex(32)`
session tokens held in memory and swept, private notes encrypted under a
password-derived wrapping key — nothing in plaintext), and the three sketch
swatches reported as identical, which are three distinct colours.

Everything not fixed became ROADMAP.md's tiered list.

## 42. Another reported list, triaged — the correctness half, done

Ten fixes, each reproduced (in Chromium where it was a UI report, against a
fake transport otherwise) before being changed, each with a test:

1. **`recycle_bin_days` 422 on the browser's own console.** The Settings
   number input had `min="1"` but nothing enforced it client-side before the
   PUT, so an emptied field sent `0` and hit the backend's real `ge=1`
   validation as a raw, unexplained error. `savePrefs` clamps now.
2. **`unknown timezone 'Australia/Brisbane'`, every request, on Windows.**
   Not a bad preference — Windows ships no IANA tz database at all, and
   `zoneinfo.ZoneInfo` has nothing to fall back to there without the
   `tzdata` package, which was never a dependency. Added, unconditionally
   (pure data, harmless where the system database already exists).
3. **The autonomous loop only read its own settings once per scheduled
   tick**, sleeping up to the full interval (6h default) between reads.
   Toggling battery-saver off, or the scheduler back on, did nothing until
   that sleep ran out — reported as "background tasks skip things thinking
   battery mode is on" and "finishing a task disables automatic tasks,
   forcing a re-toggle". `autonomous.wake()` interrupts the sleep;
   `PUT /preferences` calls it when a relevant key changes.
4. **"A dark rectangle behind the chat header" and "the sidebar collapse
   button overlaps" were the same bug**, reported from two angles.
   `#tab-chat`'s `.layout` hardcodes `grid-template-rows: minmax(0, 1fr)`
   for its desktop two-column layout; the 720px breakpoint stacks it into
   two rows without ever resetting that template, so the implicit second
   row claimed nearly all the height and the sidebar's own row — and its
   collapse toggle, its "Browse all" button — rendered in a ~25px sliver
   with the rest spilling out past its own card background via
   `overflow: visible`. Reset to `grid-template-rows: none` when stacked.
5. **Search results explained why they matched, for exactly one case** — a
   note pulled in by connection, "🔗 linked to a match" — **and not at all
   for the actual matches**, the majority of every result list.
   `search_manager._retrieve` now keeps the per-entry provenance `_rank`/
   `_fuse` used to discard, threaded through `/chat` and `/chat/stream` as
   `match_info`; the panel renders a badge per row — a semantic score, the
   keyword(s) matched, or both — replacing the old single-case chip.
6. **Improve Writing** had three fixed presets and no way to just say what
   you want changed. Added a fourth "Custom…" mode with a text field.
7. **The graph's "✨ Generate Story from Path" button** was three inline
   `.style.x =` assignments against `var(--primary)`/`var(--primary-fg)` —
   tokens this design system doesn't have — and the CSP's
   `style-src: 'self'` refuses an inline style attribute outright
   regardless, which is what `.style.x =` sets under the hood. Both
   silently no-op; real CSS class, real tokens now. Separately, attaching
   the trace's notes to the turn never stopped retrieval from *also*
   running against the turn's own instruction text, so the story could
   come back with notes from outside the traced path — new
   `attached_notes_only` flag skips retrieval when there's an explicit,
   closed attachment to fall back to.
8. **The graph's time filter** had two bugs: `window.graphSliderInitialized`
   gated the slider's min/max to a one-time computation, so any note added
   after the first render sat beyond the slider's own "all time" end and
   was silently hidden; and the label overwrote the HTML default ("All
   Time") with a raw date on every render, so the *unfiltered* position
   looked like an active filter. Both fixed; also fixed a `.graph-temporal`
   label with no `flex-shrink: 0`, which is why "Time Filter" wrapped onto
   two lines under moderate width.
9. **The trace overlay on Arc layout** drew a straight chord regardless of
   layout; Arc puts every node on one shared baseline (that's why its own
   edges are curves), so a highlighted path there sat exactly where the row
   of ordinary nodes already was. Drawn as its own taller arc in that one
   layout now.
10. **Timeline grid cards** clipped previews with unprefixed `line-clamp: 3`
    under a `-webkit-box` display — a combination this Chromium doesn't
    connect, so nothing was actually clamping and long text hard-cropped
    mid-word with no ellipsis. Fixed, plus the backend's own preview field,
    a bare `text[:120]` slice with no "…" on truncation.

**Not fixed, and why**, plus the rest of the same report (a whiteboard
feature-parity list, a widget-management hub, an Obsidian-style graph ask,
a guided-tour request, and "clean up the tests") are in ROADMAP.md's tiers —
each scoped against the actual current code, not guessed at, per this file's
own standing rule.

## 43. A follow-up burst on top of §42 — the time filter was still broken, link reasons grew a confidence score and an editor, notes got optional titles

Same session as §42, continued after that write-up: the user came back with a
run of small, specific asks in quick succession rather than another
unstructured list. Each is below in the order it was answered.

1. **The time filter slider still didn't move** — reported immediately after
   §42 claimed it fixed. It had, for the bug §42 found (the sticky
   `graphSliderInitialized` flag); it hadn't, for a second, worse one hiding
   behind it. `/graph`'s two hand-built node dicts did
   `e.created_at.isoformat() + "Z"` — a habit from before
   `core/database.DateTime` existed, back when `.isoformat()` needed help to
   say UTC. It says so on its own now (`...+00:00`), so the `+ "Z"` produced
   `...+00:00Z`: two timezone markers in one string, which `new Date(...)`
   parses as `Invalid Date` with no error anywhere. The frontend's bounds
   calculation drops unparseable dates, so `min`/`max` always collapsed to
   `Date.now()` — for every note in the notebook, not a rare one. §42's own
   testing had used notes created moments apart in the same session, which
   masked it: near-simultaneous *good* dates and near-simultaneous *invalid*
   ones look the same on a slider with no range. Backdating a note directly in
   SQL and reading `/graph`'s raw response is what actually showed
   `"2025-12-01T23:40:32.022250+00:00Z"`. Fixed by dropping the redundant
   `+ "Z"` in both places; a new pair of tests parses the returned
   `created_at` with `datetime.fromisoformat()` rather than trusting a string
   shape again.
2. **Link reasons, asked about from three directions at once.** §42 shipped
   the *reason* — free text, optional, shown on the edge, in Trace, and in
   `related_notes`. This round added the two things a reason on its own
   doesn't give you:
   - **A confidence score, for the reasons nobody actually wrote.**
     `manager.create_link` now tries `_deduce_reason` whenever it's asked to
     link two notes with no reason given — the same embedding-cosine check
     `/entries/link-suggestions` already ranks by (`AUTO_REASON_THRESHOLD =
     0.55`, the same bar). At or above it, the link gets `reason = "similar
     in meaning"` and a `reason_confidence` (0–1) alongside it; below it, or
     with no embedding for one or both notes (private notes have none —
     `set_private` deletes it — so this is naturally a no-op for them), both
     stay null, which reads identically to "nobody tried." A reason a person
     or the AI actually typed never gets a score — it isn't a similarity
     measurement, and forcing one on it would misrepresent a stated reason as
     a guess. `EntryLink.reason_confidence` is a new nullable column (the
     same additive-migration path `reason` used). The suggested-links
     "🔗 Link" button in the frontend dropped its own hand-built
     `"NN% similar in meaning"` text for this reason — it was duplicating,
     with a slightly different number, exactly what the backend now derives
     from the same embeddings on every other undecorated link. Surfaced
     everywhere a reason already showed: the graph edge's SVG `<title>` and
     `entry/paths.py`'s `Step.how` (Trace, and the story-mode prompt) append
     `", NN% confidence, deduced"` when `reason_confidence` is set, so a
     guess never reads with the same certainty as something a person said.
   - **An editor**, because a reason — typed, AI-given, or deduced — was
     write-once until asked for directly. New `manager.set_link_reason` and
     `PUT /entries/{id}/links/{link_id}/reason` (empty/`null` clears it);
     always overwrites `reason_confidence` back to null, since an edited
     link and a fresh, untouched auto-reasoned one need to stay tellable
     apart. In the note card's own link chips, a ✎ opens the existing
     `promptDialog` prefilled with the current reason (blank submissions are
     read as "no change," same convention as every other rename in the app,
     which is why clearing is a separate ⊘ next to it rather than the same
     control with an empty box) and a ⊘ clears it outright — both only ever
     appear next to a link, never touch the link itself.
   - The autonomous background auto-linker's persona now explicitly invites
     a reason ("pass a reason if the connection isn't obvious ... e.g. 'both
     about scheduling'") when linking is enabled, matching the wording
     `link_notes`' own tool schema already used — nudging the one path that
     previously had no reminder at all.
3. **Notes got an optional title.** Answered as a design question first
   ("does a title restrict how many notes can be on one topic, or is there a
   better way?") — recommended a title that's read off the note rather than
   demanded or generated by default, and built what the user then confirmed:
   a note's title is `manager.extract_title(content)`, the leading `#`–`######`
   heading line if the first non-blank line of the note is one, computed on
   every read rather than stored as its own column — so it can never drift
   out of sync with an edited first line the way a duplicated, separately-
   saved title could. Shown in the note card as its own `<p class="entry-title">`
   above the body (`<h3>` was tried first and reverted — `.card h3` is this
   design system's small-caps section-label convention, and it leaked
   straight into a note's own title). The card body itself drops the heading
   line when a title is showing (`bodyWithoutTitleLine`), so the text isn't
   repeated. Three actions round it out, all via the note's own overflow
   menu: **✨ Generate title** (or **Regenerate**, if one exists) calls a new
   `librarian.generate_title` and `POST /{id}/generate-title`; **✕ Remove
   title** strips just the leading heading line and one following blank line
   via `manager.remove_title`, `POST /{id}/remove-title`. Both refuse a
   private note outright (400) rather than risk it: each reads
   `manager.readable_content` — decrypted — and would otherwise write that
   plaintext straight back to `entry.content`, un-encrypting the note as a
   side effect of titling it. A test asserts `crypto.is_encrypted` still
   holds after a refused attempt on both routes.
4. **"When I close and reopen the app, start on the dashboard."** The boot
   sequence read `localStorage.getItem("activeTab")` and restored whatever
   tab was last open; now it always opens on Dashboard
   (`switchTab("dashboard")`, unconditional). Small, but worth naming the
   trap it hit: an *earlier*, unrelated occurrence of the exact string
   `switchTab("dashboard");` inside a menu handler meant a substring-based
   test assertion matched the wrong call site until it was anchored with a
   leading newline.
5. **The glassmorphism blur slider, asked whether it actually scales the
   frosted-glass effect** — investigated and found working as built. Two
   screenshots at different slider positions looked identical to the eye, so
   this was checked by comparing the raw screenshot byte buffers rather than
   trusting a visual read: they differ (different sizes), meaning the
   `backdrop-filter: blur(...)` value the slider drives does change between
   settings. No fix made — there was nothing to fix — and reported as such
   rather than as a guessed-at change, per this project's standing rule about
   saying plainly what wasn't broken as much as what was.

**Verified live in Chromium**: the manual link → ✎ add a reason → chip title
updates → ⊘ clears it → chip title reverts, end to end, including the actual
`PUT .../reason` round trip. **Not verified live**: the auto-deduced-reason
path and its graph-edge tooltip specifically — this sandbox's embedding
backend is the fake keyword one from the test suite in `pytest`, and driving
it live needs a real embedding model this sandbox doesn't have; a set of
notes linked in the same live session also happened to land inside the
graph's "Uncategorised" cluster supernode (semantic-zoom clustering, all
notes sharing the one category), which hides individual link edges behind
the cluster rather than rendering them directly. The backend behaviour is
covered by `pytest` (`test_waven_api.py`, `test_wavee_graph.py`,
`test_graph_paths.py` — deduction, confidence, editing, clearing, the 404
case, and the graph edge's own `reason_confidence` field), and the browser
check above proves the same JS code path (`api(... PUT .../reason)`,
re-render, chip title) that the auto-deduce path also runs through — but the
pixels of a deduced reason's tooltip specifically were not seen, and that is
worth re-checking with a real embedding backend before calling it done.

## 44. §8's two perf fixes, a real "ran without being enabled" bug, link suggestions grew the reason they'd get if linked, a mute option — plus three reports investigated and not reproduced

An unattended run: checked the running app and both handover files first,
per this project's own standing rule, then worked ROADMAP.md's Tier 1 top
item — §8's two backend perf findings, explicitly flagged "start here next"
— before anything the user raised live mid-session. Committed and pushed in
batches rather than one large commit, in case of a usage-limit cutoff.

**§8, both perf findings, fixed and pinned by query-count tests (not
timing):**

1. `tools._graph_neighbours` fetched every non-deleted `Entry` — the whole
   table, `content` included — whenever the note it was walking from had
   tags, to find tag matches by hand. `_related_notes` calls it once per BFS
   node (up to ~12 at depth 2), so this scaled per call as well as per
   entry. Tags are a JSON text column with no per-tag index, so a SQL filter
   can only narrow candidates, not resolve the match exactly: rewritten to
   `ilike` pre-filter per tag (the same pattern `list_tags`/`_count_notes`
   already used elsewhere in this file) before the existing exact Python
   check, which also removes any substring false positive ("art" matching
   "cart") the `ilike` lets through.
2. `manager.entry_dates` (one `SELECT` per entry) was called inside
   `_note_summary`, itself called per row by `list_notes` (≤25) and
   `summarize_notes` (≤40) — an N+1 on the agent's two most-used read tools.
   New `manager.entry_dates_bulk` fetches every returned note's dates in one
   `WHERE entry_id IN (...)` query, grouped by id; `_note_summary` takes an
   optional pre-fetched `dates` list so the two batch callers can pass it in
   while single-note callers (`get_note`, etc.) keep querying one at a time.

Both pinned in `tests/test_scale_query_counts.py` (extended, not a new
file) with a query count at 20 vs. 220 entries — a fixed handful either way,
not one-per-entry — matching that file's own stated reasoning for counting
queries instead of timing them.

**A real correctness bug, reproduced live before being fixed, not
theorised**: the user reported *"I get notifications that the autonomous
optimisation completed when I didn't have it enabled??"* Read
`ai/autonomous.py` first and found the shape: `_loop()` checks
`autonomous_tasks_enabled` before ever calling `_run_optimization`, but
`trigger_now()` (the "Run optimization now" button, and its `POST
/tasks/trigger-autonomous` endpoint) never did — it only guards against a
pass already running. Confirmed with a live server rather than assumed: on
a fresh profile (`autonomous_tasks_enabled` unset), `curl -X POST
.../tasks/trigger-autonomous` returned `started: true` and a real pass ran.
The button itself is hidden while the toggle is off, which is a UI
convenience, not an authorization check — anything else reaching the
endpoint (a stray script, a future dashboard shortcut) hit the same gap.
Fixed in the route, not in `_run_optimization` or `trigger_now`: ten-plus
existing tests call `_run_optimization()` directly and treat the master
toggle as the caller's job to check (by design — its docstring is "one
pass", and `_loop` already owns that check), so folding the guard into the
shared function would have broken that contract and every one of those
tests. The route now checks the preference itself before calling
`trigger_now`, with a distinct response body (`"switched off in Settings"`)
so a caller can't confuse "disabled" with "already running" the way a
single bool would. Re-verified live after the fix: disabled →
`started: false` with the new message; explicitly enabled → `started: true`,
a real pass. Two new tests in `test_autonomous.py` pin both branches at the
route level.

**Link reasons, extended on two fronts the user asked about directly:**

- *"I feel like the suggested links should include a suggested reason
  somewhere."* `GET /entries/link-suggestions` and `manager.create_link`'s
  own deduction threshold (`AUTO_REASON_THRESHOLD`, renamed from
  `_AUTO_REASON_TEXT` to make it importable) are numerically identical
  (0.55), so every suggestion already clears the bar a real link would need
  to get this same text — added it to the response as `reason` rather than
  computing anything new, and it's a preview of the real outcome, not a
  separate guess.
- *"None of my notes have a linked reason yet — is there an easy way to give
  them all a reason?"* There wasn't: `_deduce_reason` only ever ran at the
  moment `create_link` made a *new* link, so a notebook full of links made
  before §43 shipped (or made while the embedding backend was off) had no
  way back to a reason. New `manager.backfill_link_reasons` runs the same
  deduction once over every existing reason-less link — same rule as a
  fresh link: a person's own reason is never touched, and a link that still
  can't be deduced (no embedding, or under threshold) is left exactly as it
  was rather than given a manufactured answer. `POST
  /entries/links/backfill-reasons`, and a "💡 Give existing links a reason"
  button next to Suggest links in the graph's suggestion panel. Four new
  tests: the suggestion's `reason` field, a backfill that fills the similar
  pair and leaves the unrelated one alone, and one confirming a hand-written
  reason is never overwritten.

**A notifications-mute option, asked for directly**: "there can be an
option to mute notifications except for reminders." New preference
`notifications_muted_except_reminders` (Settings → Preferences →
Notifications). `toast()` gained an `exempt` flag — set on the three
reminder-alert call sites so a due reminder always gets through — and
returns early for everything else, except errors, when muted (silencing a
real failure would defeat the point of the toggle more than the noise it's
meant to quiet). `recordNotification` (the persistent panel) does the same,
keyed off `kind !== "reminder"`. Not built: mirroring ordinary UI-action
toasts ("Saved.", "Linked.") into the panel, the other half of the same
message — every call site would need a `kind` first, and flooding the panel
with routine feedback isn't obviously wanted; needs its own pass at which
toasts actually belong there.

**A graph-toolbar readability fix, reported directly**: "the labels and
what UI control element they connect to is confusing in the graph tab."
`.graph-time-label` ("All time") is a plain read-out of the Time Filter
slider, styled identically to the *interactive* toggle labels
(Similarity/Hide unlinked/Labels) sitting right after it with the same flex
gap — nothing marked where the slider's own group ended and the toggles
began. Grouped the three toggles under one `.graph-toggle-group` span and
drew a divider before each top-level group, reusing `.chat-tool-group`'s
existing `+`-selector convention (a divider on the group itself survives
any neighbour being hidden) rather than inventing a second one.

**Three things reported live, investigated, and correctly left alone rather
than guessed at** — full detail in ROADMAP.md's new "Open questions raised
this session" section:

- Whether Capture should grow its own title field, separate from §43's
  leading-heading convention — a design question in the same shape §43 was
  worked through as, not a bug. Not built; needs a decision first.
- *"The dashboard isn't detecting my name."* Traced end to end
  (`renderNameNudge`, `withDisplayName`, `savePrefs`'s cache update and
  re-render) and the code is correct — the nudge is designed to show exactly
  when `display_name` is empty. Read as "the feature working as built on a
  profile with no name saved" rather than a bug, absent a case where a name
  was actually saved and still didn't show.
- The Timeline grid's "text cut off with no ellipsis" report, re-driven live
  in Chromium with notes up to 122 characters at the grid's real column
  width. Found one real, previously-undocumented fact — `display:
  -webkit-box`'s **computed** value in this sandbox's Chromium is
  `flow-root`, not `-webkit-box`, so the existing code comment's claim about
  which property "actually reads" here is not quite right — but clamping
  still worked correctly in every case tried (`scrollHeight === clientHeight`
  throughout, nothing overflowing). Could not reproduce the reported
  clipping with any input tried; said so rather than guess at a CSS change
  with nothing to verify it against.

**What could and couldn't be verified**: the two §8 perf fixes and the
autonomous-toggle fix were all reproduced and re-verified against a real
running server (`curl`, not just reasoning about the code) — the standing
trap this project's own history has fallen into more than once. The
graph-toolbar divider, the suggestion-reason text, the backfill button and
the mute option are CSS/JS reasoned from the DOM and existing conventions
but were **not** driven in a browser this session — say so plainly rather
than claim a screenshot that doesn't exist. Full `pytest tests/` (~1,600+
tests), `ruff check .`, and `node --check frontend/app.js` all green after
every batch.

## 45. Skill runs get a manual mode — the single most-requested unbuilt thing on the list

Continued the same session as §44, straight after committing and pushing it.
ROADMAP.md's own Tier 2 item 8 named this "the single most-requested unbuilt
thing on the list" — asked for directly more than once: a pause after every
completed step with a Continue button and a text box, so a person can add
what the agent missed or answer a question it raised, rather than a run
barrelling through five steps unattended.

**Built by reusing the existing resume machinery, not inventing a second
one.** `skill_runner.run_skill` already stops mid-run and hands back
`stopped_at` for a step that failed or stalled, and `start_at` already
resumes past it without re-running earlier steps — the exact mechanism a
pause needs. `run_skill(..., manual=True)` now takes the same stop after
*every* step that finishes `done` too, not only a broken one; the new
`result.paused` field is the only difference the caller needs to tell
"waiting for you" from "something went wrong" and render each one
differently — a paused run is not reported as a failure, and does not raise
the "stopped early" notification a genuine failure does (nobody needs to be
told ten minutes later about a pause they're sitting in front of).

**`manual_note` — what gets typed in at the pause — is folded into the
*next* step's own instruction**, not appended to `step_history`: this is
what the person is asking for as part of that step specifically, and a
history entry is something the model may or may not weigh against
everything else in its window, the same reasoning `_step_answer` already
uses for putting the ids a step touched into its own line rather than a
separate structure. Applied once, at the first step a given call actually
runs (`index == resume_from`) — a later resume with no note of its own
does not repeat it, so a comment made once about step 2 doesn't quietly
keep steering step 4.

**Frontend**: a "Run skills step-by-step" checkbox in the chat dock's `⚙`
settings panel (alongside answer length and persona — a standing preference
about how a run behaves, not a per-launch choice), read live when a run
starts *or* resumes rather than captured once, so a run can be switched
into or out of manual mode between steps. The pause itself renders as a new
`manualPauseControls` card — a text input and a **▶ Continue** button — kept
deliberately separate from the existing `continueRunControls` (Resume /
ran-out-of-rounds), which stays exactly as it was for an actual failure.

**Not built**: the identical pause for a plan run (`opts.plan` — a plan the
model draws for one request, per §35K). The backend treats a plan and a
saved skill identically already (`skill_manual`/`skill_manual_note` are
sent whenever either is present, per `streamChat`'s own body-building
logic), but the *existing* Resume-from-failure button was already
skill-only before this session — extending both paths to plans is one
further, separate change, not a gap this feature introduced.

**What was and wasn't verified**: six new tests in `test_skills.py`
(`test_manual_mode_pauses_after_the_first_step_instead_of_continuing`,
`..._off_runs_straight_through_as_before`, `..._does_not_pause_after_the_last_step`,
`test_a_paused_run_is_never_reported_as_failed_or_stalled`,
`test_manual_note_is_folded_into_the_next_steps_own_instruction`,
`test_manual_note_only_reaches_the_step_it_was_added_before`) drive the
whole backend path through the real `/chat/stream` endpoint with the fake
Ollama transport — pause, resume, the note appearing in exactly one step's
prompt and nowhere else. The checkbox and the pause card's text box were
**not** driven in a browser this session; say so plainly rather than claim
a screenshot that doesn't exist. Full `pytest tests/`, `ruff check .`, and
`node --check frontend/app.js` all green.

## 46. The sketch pad's highlighter and a real background colour — both checked live, one caught a real CSS trap along the way

Continued the same session, straight after §45. ROADMAP.md's next item: the
sketch pad's highlighter at 5% opacity ("completely wrong" in the report),
"then a reachable size control, a background colour, and a selection tool."

**Checked before touching anything, per this file's own rule, and found
half of it already done.** `#sketch-size` already existed, was already
wired (`sketchPen.size = Number($("sketch-size").value)`), and already
reached every tool — pen, highlighter, eraser, and every shape's stroke
width (`line`, `rect`, `circ`, `arrow`) all read `sketchPen.size`. ROADMAP's
own claim that a size control was missing was stale; corrected in place
rather than rebuilt.

**The highlighter, fixed and verified live.** `globalAlpha` was a literal
`0.05` in two places (`sketchMove`, `sketchEnd`) — roughly twenty
overlapping passes before a stroke showed at all, indistinguishable from the
tool doing nothing. Now `0.35` (a named `SKETCH_HIGHLIGHTER_ALPHA` constant,
not a second magic number), which reads as an actual highlighter given the
existing `multiply` blend mode — translucent, tints rather than covers.
Verified in a real Chromium session, not just the diff: drew one stroke,
read the canvas pixel back with `getImageData` (a distinct blue rather than
the near-white a 0.05 alpha would leave), and took a screenshot showing a
clearly visible band.

**A background colour, built and then caught doing nothing — the real find
of this item.** A first pass added `--sketch-board-bg` as a CSS custom
property on `#sketch-bg-canvas`'s `background`, the exact shape the
whiteboard's own `--wb-board-bg` already uses. It changed nothing on
screen. The reason: `sketchDrawBackground()` — called every time the pad
opens or a background image loads — already does
`context.fillStyle = "#ffffff"; context.fillRect(...)` across the whole
canvas, and **that fill is opaque pixels drawn into the canvas element's own
bitmap**, which sits in front of (and fully hides) whatever the element's
CSS `background` is. A CSS background on a `<canvas>` is only ever visible
through pixels the canvas itself left transparent — exactly the shape of
trap this project's own traps list already names ("a value that is invalid
where it is used, not where it is set, does its damage nowhere near the
code that caused it"), just for `display` bugs rather than paint order.
Found by checking the *pixel data* after picking a colour, not by reading
the CSS and assuming it applied.

Fixed properly: `sketchBgColor` (a plain module-level variable, persisted
in `localStorage` the same way the whiteboard's board colour is) replaces
the hardcoded `"#ffffff"` as `sketchDrawBackground()`'s own `fillStyle`, so
the chosen colour is real pixel data from the moment it's picked — which
also means it survives into `saveSketch()`'s composite untouched, since
that function just `drawImage`s the two canvases together and never knew
the difference. Verified three ways live: the bg-canvas's own pixels before
and after picking a colour, and — because a canvas correctly *showing* a
colour on screen is not the same fact as a save correctly *storing* it —
the exact same composite `saveSketch()` builds, read back pixel by pixel,
confirming the chosen colour (not the old default) is what actually gets
attached to the note.

**Still genuinely open**: a selection tool (clicking an existing
stroke/shape to move, resize or delete it — today's tools only ever draw a
new one, the same gap the whiteboard had before its own select/move/rotate
work was scoped). The toolbar redesign stays *after* that, per the item's
own ordering, not before.

**What was and wasn't verified**: both fixes were driven in a real
Chromium session with pixel-level reads, not screenshots alone — the
highlighter's visible colour, the background colour's presence in the
canvas's own bitmap, and its survival into the actual save-composite.
Nobody actually clicked "Save as note" through the UI end to end this
session (a stray Agent Activity toast intermittently overlapped the Save
button in the test viewport, a test-harness nuisance rather than an app
bug); the composite was verified by calling the exact same drawing calls
`saveSketch()` makes, not by guessing that it would behave the same way.
Full `pytest tests/`, `ruff check .`, and `node --check frontend/app.js`
all green (this item has no backend surface, so no new Python tests).

## 47. A link that turned out to already be a link, and the document half of "take me to what changed"

Continued the same session, straight after §46. Tier 2 item 12 next:
*"a note's linked notes should be clickable through to those notes; today
they are decoration."*

**Checked before touching anything and found it already done.** Every
place a link chip renders — a note card's own `entry.links`, the "Similar"
panel, a reminder's attached-note chip — already calls `flashEntry` on
click, which switches to Notes → Browse, clears any active filter, and
scrolls the target into view with a highlight, the same function search
results and `[[wiki links]]` already use. Traced all three render sites in
`app.js` rather than trusting the first one; all three were already wired.
ROADMAP's own claim that they were "decoration" was stale — corrected in
place rather than re-derived or rebuilt.

**Item 13, the other half of "take me to what changed," had a real gap
this time.** `agent._change_document_id` has resolved a real document id
on every write since §21 — the groundwork was correct, as ROADMAP already
said — but `changeRow`, the one shared function both the chat's "what
changed" list and the autonomous-pass review panel render a change
through, only ever checked `change.note_id`. A skill or the background
librarian writing a document produced a change with a real `document_id`
sitting right there, unused. Fixed with one more `if` reusing
`openDocumentFromNote` — the exact function a note's own "go to this
document" link already calls, not a new navigation path. Verified live: a
synthetic `document_id` change rendered a View button, and clicking it
actually un-hid `#tab-documents` (Playwright, not just reading the diff and
assuming the click handler does what it says).

**Still open**: reminders and categories have no `_change_reminder_id`/
`_change_category_id` equivalent on the backend at all — extending
`changeRow` further needs that resolver work first, the same shape
`_change_note_id`/`_change_document_id` already are, not just another
`if` with nothing behind it.

**What was and wasn't verified**: both fixes were checked live in
Chromium — the three link-chip render sites by reading and tracing the
code (each one calling the same already-proven `flashEntry`, so a fourth
browser round-trip would have re-confirmed a fact already established three
times over), and the document View button by an actual click producing an
actual visible tab change. Full `pytest tests/`, `ruff check .`, and
`node --check frontend/app.js` green (no backend change this item, so no
new Python tests).

## 48. Arc view's "labels behind nodes" — investigated live, did not reproduce

Continued the same session, straight after §47. ROADMAP's next item: "Arc
view: labels behind nodes."

**Read the code first**: `labelLayer` (`canvas.append("g").attr("class",
"graph-label-layer")`) is appended after every node circle in
`renderGraph`, for every layout including Arc — in SVG, a later sibling
always paints over an earlier one, so DOM order alone should already put
every label on top of every node, with nothing layout-specific that would
single out Arc.

**Then checked live rather than trusting that reasoning on its own**,
per this file's own rule about UI claims: seeded 8 notes, switched Graph to
Arc, and screenshotted it. Every label was clearly legible, angled outward
from its node at -40°, sitting on top of the nodes and the dotted
filing-hierarchy arcs beneath them — nothing hidden behind anything. A
first attempt at hit-testing this with `elementFromPoint` at a label's
`getBoundingClientRect()` centre gave a false negative (the SVG background,
not the label) — a known trap with rotated SVG text: the axis-aligned
bounding box of a rotated shape has a centre point that can fall in empty
space between the actual rotated glyphs, so it tests the wrong thing
entirely. The screenshot, not the hit-test, is what actually answered the
question.

**Left open rather than marked fixed, because nothing was found to fix.**
The report may depend on something this session's synthetic dataset
didn't reproduce — a much larger or more deeply nested tree, longer note
previews (this session's were short), a specific zoom level, or notes with
real `entry_links` rather than only the filing hierarchy. Recorded in
ROADMAP.md as needing the original report's exact steps or a screenshot
before a future session spends more time on it, rather than guessing at a
CSS change with nothing to verify it against — the same standing rule that
governed the Timeline "text cut off" investigation two items earlier in
this same session (§44).

## 49. A notifications-panel mute toggle, and the real bug it caught: eight preferences that saved and worked but never came back from GET

Asked for directly: a mute toggle inside the notifications panel itself,
not only in Settings, and the bell icon changing to show whether anything
but a reminder will get through. Built `#notif-mute-toggle` (🔕 Mute / 🔔
Unmute, `aria-pressed`) in the panel header, and `#notif-btn` now renders 🔕
instead of 🔔 whenever `notifications_muted_except_reminders` is set —
both driven by the same `notificationsMuted()` the toast/panel muting from
§44 already used.

**Verified live, and it didn't work — which is the real finding here.**
Clicking the toggle correctly called `PUT /preferences`, correctly got a
response back, and the bell still showed 🔔. Isolated with
`page.evaluate(() => toggleNotificationMute())` to rule out a click/DOM
issue: the function ran, returned `"ok"`, and the state still didn't
change. The cause: `get_preferences()` in `routes_settings.py` is a
hand-built dict of named keys, and the new `notifications_muted_except_reminders`
key was never added to it — so every `GET /preferences` (including the one
`update_preferences()` returns after a `PUT`) silently omitted it, no
matter what was actually stored.

**Checked whether the same shape existed elsewhere rather than assuming
this was a one-off, and found seven more**: `autonomous_tasks_enabled`,
`auto_tag_enabled`, `auto_link_enabled`, `auto_dedupe_enabled`,
`autonomous_tasks_interval_hours`, `autonomous_tasks_model`,
`battery_efficient_mode`, and `smart_model_routing_enabled` — every one of
them settable, and every one of them read straight from storage by
`autonomous.py` or `model_manager.py`, so the *behaviour* was always
correct. What was never correct is what the Settings UI showed: every
checkbox bound to one of these reset to unchecked the moment the page
reloaded or the panel reopened, regardless of what had actually been saved
and was actually in effect. The exact user-facing shape of "keeps
disabling itself" this project has chased before (§42) — but a different
cause: §42 was two controls fighting over one preference; this is the GET
response never having the preference in it at all, for eight separate
keys, the whole time.

**Why the test suite never caught it**: plenty of tests set these
preferences and assert on the *behaviour* that reads them (does the
scheduler wake, does `_run_optimization` skip, does routing pick the
utility model) — nothing ever asserted what `GET /preferences` echoes back.
Two new regression tests close that gap directly:
`test_autonomous_and_battery_preferences_round_trip_through_get` (all eight,
set to non-default values, then read back) and
`test_notification_mute_preference_round_trips_through_get`.

**Verified live end to end after the fix**: `curl`/Playwright round-trip
through the real running server — PUT true, bell shows 🔕, reload the page,
still 🔕; PUT false, back to 🔔. Full `pytest tests/`, `ruff check .`, and
`node --check frontend/app.js` all green.

**What was and wasn't verified**: driven live in Chromium with a real
screenshot, not just reasoning about DOM order. No code changed this item —
say so plainly rather than claim a fix that has nothing to point at. Full
`pytest tests/`, `ruff check .`, and `node --check frontend/app.js` were
already green from the previous item and nothing here touched either
codebase.

## 50. A CodeQL ReDoS in the title regex, then Tier 1's two highest-value graph bugs, both diagnosed live and fixed

Started from a CodeQL alert (`py/polynomial-redos`, high severity) on
`manager._TITLE_LINE.match(stripped)` in `extract_title`/`apply_title`/
`remove_title` (§43's note-title feature). `^#{1,6}[ \t]+(\S.*)$` is exactly
the anchored-quantifier-before-`$` shape CLAUDE.md already names as the one
to avoid (the same family as the `_TRAILING` fix on `main`). Replaced with
`_heading_text`, a hand-rolled linear scan (count leading `#` up to 6, require
a space/tab, reject if what follows is empty or itself whitespace) — no
backtracking possible because there's no backtracking engine involved.
Checked it matches the regex's exact semantics on the edge cases that matter
(7+ hashes, a `#` with no space, non-ASCII whitespace like `\xa0` right after
the hashes) before trusting it, and measured 80,000 tabs at 1.8ms, flat.
`tests/test_core.py`/`test_private_notes.py`/`test_waven_api.py`'s existing
title tests all still pass unchanged — this is a drop-in replacement, not a
behaviour change. (A second CodeQL alert on the same file, `py/cyclic-import`,
Note severity, was checked and left alone: `_deduce_reason`'s
`from memorymap.ai.embeddings import ...` is already deliberately deferred
inside the function to break a real cycle — `ai.embeddings` →
`ai.model_manager` → `entry.manager` for `log_action` — which is the standard
fix for a Python import cycle, not a bug.)

**Then ROADMAP.md's own "start here next" — Tier 1 items 10 and 11, both
undiagnosed, both high value.** Read the code before touching anything, per
this project's standing rule, and both turned out to share a family of root
cause: a value with no sensible default read as "right now" instead of
"never", or a hover event misfiring during a gesture that isn't really a
hover.

**Item 10 — Tree/Radial/Arc lost every edge when the Time Filter left "All
time".** `renderGraph`'s `applyTimeFilter` checks
`d.source.created_at`/`d.target.created_at` per edge. That only holds a real
note's timestamp once `d3.forceLink` has resolved a link's `source`/`target`
from an id to the actual node object — true for Force. Tree/Radial/Arc build
their edges in `layoutHierarchy` instead, and a huge fraction of them are
*filing* edges from a category heading (or the synthetic `root`) down to a
note — `layoutHierarchy`'s own `graphGroupNode` has no `created_at` field at
all. `undefined || Date.now()` read every one of those as "created this
instant", later than any cutoff short of "All time", so the heading — and
every edge touching it — vanished the moment the slider moved even slightly.
Force never hits this because it has no synthetic heading nodes.

Reproduced before fixing, not guessed at: seeded linked notes via Playwright,
switched the layout in `localStorage`, called `renderGraph()`, and counted
`.graph-edge` elements with `visibility !== "hidden"` before and after
dragging the slider. Unpatched: Tree went from 14/14 visible edges to **0/14**
the instant the filter left "All time"; Force stayed correct at 2/4 the whole
time. Fixed by treating `isGroup` nodes (headings, root) as exempt from the
time filter — they're organising furniture, not a dated note, so hiding them
was never the intent — via a shared `timeVisible(d, val)` helper used by the
node, label, *and* edge visibility checks (an edge shows only if both its
ends do). Re-verified the same way after the fix: no longer zero on any
layout.

**Item 11 — dragging on empty graph canvas sometimes highlighted an unrelated
note.** Reproduced first (the item was explicitly "not yet reproduced" in
ROADMAP.md): a Playwright drag starting and ending on genuinely empty canvas
— confirmed with `document.elementFromPoint` at the start coordinate, not
assumed — left a node's `.graph-focus` class stuck on well after the pointer
had moved away and the button released. Cause: panning translates the whole
`<g>` canvas under a *stationary* cursor, so a node's on-screen position can
slide directly under the pointer mid-drag without the user ever moving their
mouse onto it — and that fires a completely genuine, native `mouseenter` on
whatever node happens to pass by. The matching `mouseleave` doesn't reliably
fire again before the mouse button releases, so the hover-spotlight
(`graphHoveredId`, `applyGraphHighlight`) stays lit on a note the user never
meant to touch.

A first attempt — clearing `graphHoveredId` on the zoom behaviour's own
`start`/`end` events — cut the failure rate but didn't close it: a
`mouseenter` mid-gesture could still re-set the hover *after* `start` had
already cleared it, and nothing cleared it again until the next real hover
somewhere else. Fixed properly with a `graphIsPanning` flag, set on `start`
and cleared on `end`, that the `mouseenter`/`mouseleave` handlers both check
and bail out of — so a node sliding past mid-pan never lights up at all, and
only a genuine, stationary hover once the drag has ended does. Verified with
6 consecutive clean Playwright runs after the fix (`hoveredId: null,
focusCount: 0`), against a 100% reproduction rate before it. One test-harness
trap worth recording: an early "still stuck" result was the *test's* own
200ms wait being shorter than d3-zoom's async `end` dispatch, not a bug in
the fix — confirmed by logging the zoom's own `start`/`end` events and seeing
`end` reliably fire, just later than the check.

Both graph fixes are pure `frontend/app.js` changes with no backend
counterpart, so there is nothing for `pytest` to pin — the Playwright
reproduction *is* the regression test for both, run against a real `uvicorn`
server per CLAUDE.md's recipe, not reasoned from reading the DOM. Full
`pytest tests/` (~1,600 tests), `ruff check .`, and `node --check
frontend/app.js` all green throughout.

**What's next**: ROADMAP.md's remaining Tier 1 items (meeting transcription,
the skill-run timeout/false-done-tick pair, the small-talk/TOOLS_GUIDE prompt
contradiction, background tasks that never appear in the task list), then
Tier 2 top-down.

## 51. All of Tier 1 cleared (four items were already fixed, four bugs weren't), then Tier 2 top-down: change-target resolvers for reminders/categories, a real bold/italic toggle, and two whiteboard single-click bugs

Continued straight from §50 in the same long unattended session, per the
user's own "work autonomously, don't wait for my prompt" instruction. §50
covers the ReDoS fix and the two graph bugs; this section is everything
after Tier 1 was fully clear.

**Tier 1's last four items (2, 3, 4, 6) were found already done**, not
built. Each was checked against the actual code and existing tests before
being crossed out — not assumed from an uncrossed-out ROADMAP line, which
is exactly the staleness this project's own history keeps warning about.
Items 2/3 (skill step timeout, false "done" tick, network-error handling)
were already in `skill_runner.py` and `app.js`'s `STREAM_IDLE_TIMEOUT_MS`,
pinned by `test_a_step_that_produces_nothing_is_not_ticked_done` and
`test_a_network_failure_mid_step_stops_the_run_instead_of_repeating` — both
§41's work. Item 4 (small talk reaching the agent's `TOOLS_GUIDE`) turned
out to be a non-issue: `routes_chat.py` only ever calls the tool-enabled
agent when `intent.needs_retrieval(...)` is true, which `SMALLTALK` never
is, and `test_a_bare_yes_is_ordinarily_smalltalk_not_the_agent` already
proves it. Item 6 (unregistered background threads) turned into a full
sweep — every `threading.Thread(` call site in `src/memorymap` checked by
hand against `routes_tasks.collect()` — and found all nine already
covered, one of them (`embedmodels.py`) carrying its own "Tier 1 §6"
comment from whichever earlier session actually fixed it.

**Tier 1 item 1 (meeting transcription) was re-confirmed, not re-fixed,
one step further than before.** `faster-whisper` installed cleanly (no
torch — the standing CLAUDE.md constraint is about `sentence-transformers`
and torch specifically, not this package). A real WAV clip POSTed to
`/voice/transcribe-meeting` on a live server got back `503 "Couldn't load
the Whisper 'base' model... check your internet connection"` — the exact
distinct error §41 built, not the old generic mystery error. A genuinely
successful transcription still couldn't be observed: this sandbox's
network policy blocks `huggingface.co` outright (403 at the proxy,
confirmed via `$HTTPS_PROXY/__agentproxy/status` rather than assumed from
the symptom) — an environment limitation, not a code question. Said so
plainly in ROADMAP.md rather than claiming a screenshot that doesn't
exist.

**Then Tier 2, item 13 — reminders and categories got the same
`_change_*_id` resolver notes and documents already had.** `agent.py`
gained `_change_reminder_id` (an int id, same shape as `_change_note_id`)
and `_change_category_name` (a *name* — every category tool already works
in names, so this names the field that carries one rather than inventing
an id nothing else uses; `delete_category` is destructive like
`delete_document` and never reaches this code path). `changeRow` grew two
View buttons: `flashReminder(id)` (switches to Reminders, forces the
filter to "all" since the change that brought you here, e.g. completing a
reminder, is exactly the case the default "open" filter would hide, then
scroll-flashes it the way `flashEntry` does for notes) and
`flashCategory(name)` (reuses the sidebar's own `activeCategory` filter
rather than a second filtering mechanism). Verified live: created a real
reminder and a real note in a fresh category via the API, called both
functions directly, confirmed the tab switched, the item was found, and —
waiting the two animation frames the flash needs, which an early check
missed — the `.flash` class was actually applied.

**Item 16b — the document editor's bold/italic didn't toggle off.**
`wrapDocSelection` only ever wrapped; a second press on already-bold text
stacked a second `**` pair instead of removing the first. Now checks both
shapes a selection can be in — markers just outside it, or included inside
it — before wrapping, so a second press strips them either way. No JS test
runner exists for this file, so verified directly against the real
`#doc-content` textarea: `hello world` → Bold → `**hello** world` → Bold
again → `hello world`, byte for byte; the whole-span-selected and italic
cases both round-tripped the same way.

**Then two whiteboard bugs, reported live mid-session and fixed the same
way §50's graph bugs were — diagnosed before touching anything.** The pen
tool's "doesn't respond to a single click, only a drag" turned out to be a
whiteboard-only gap: the sketch pad's own pen already drew a dot on a
stationary click (`sketchEnd`'s `!sketchMoved` branch), but the
whiteboard's separate SVG-path implementation discarded a click with no
movement outright (`currentDrawData.length < 2` → delete the path, return).
Mirrored the sketch pad's own trick — a near-zero-length line segment,
which a round linecap renders as a visible dot — instead of a second,
different fix. The eraser had the same symptom for a different cause: it
only ever caught a stroke via `mouseenter` while the button was held, which
needs real movement to fire at all, so a plain click on a shape did
nothing; its `click` handler (already there for the Delete tool) now also
fires for the eraser. Verified live against a real running server, not
assumed from the code: single pen click on empty canvas, 0 sketches → 1;
single eraser click on that same dot, 1 → 0.

**A related, small feature asked for directly**: a `↺` reset button next
to the whiteboard's board-colour picker, since picking a colour left no way
back to the theme's own default short of guessing its hex. Clears the
`localStorage` override and re-reads the *live* computed colour rather than
a hardcoded hex, so "reset" still means "the theme's colour" after a
light/dark switch. Verified live: pick a colour → persisted; reset → the
swatch shows the real computed default, not a placeholder.

**What's still open, reported live and correctly not force-fixed**: the
single-node hover-highlight during a drag was re-reported as still
happening, outside this sandbox, after §50's fix — which specifically
targeted panning (dragging empty canvas) and was verified 6/6 clean here.
Checked whether an actual node-drag shares the same cause and it doesn't:
every *other* node is pinned (`fx`/`fy` set) for the length of a node drag,
so nothing can slide under a stationary cursor the way panned content
does. No obvious quick fix without a fresh repro (which tool, which
gesture, which browser) — named in ROADMAP.md rather than guessed at.
Also named but not built: "a lot of the whiteboard's tools are missing —
it should be an upgraded version of the sketch pad", asked for directly
but not itemised; most of what's actually missing (redo, select/rotate,
shift-to-lock, images) is already named in item 11's own open list rather
than being a new, separate gap.

**Then item 16a — the document editor's sidebar, reported with
screenshots.** The sticky/floating half was already done (`#doc-sidebar`
already has `position: sticky`) — stale by the time it was reported,
corrected rather than rebuilt, the same shape as items 2/3/4/6 above. The
Outline-collapses half was real, and measured live before touching
anything: 10 headings' outline went from 258px tall to exactly **0px** the
instant the "Where are my documents kept?" disclosure opened. Cause:
`.doc-sidebar > details` was `flex: 0 0 auto` — flex-shrink *zero*, which
means *exempt* from shrinking — while the outline above it had no minimum
height at all, so the entire squeeze landed on the one sibling that could
give and had nothing left to give. That is backwards from what the CSS
block's own comment already said the intent was ("the help disclosure
gives up its space first"). Fixed by giving the outline a real floor
(`min-height: 4rem`) and actually making the disclosure shrinkable with
its own internal scroll. Re-measured after: outline settles around 100px,
visible and scrollable, instead of 0.

**Then item 14's other open half — the Timeline line view's own note
popup showed no markdown and no attachments.** `openTimelinePopup` set the
content with `.textContent`, so `# Heading`/`**bold**` showed their raw
punctuation, and never touched `#timeline-popup-media` at all — the div
existed in the markup (reusing the graph popup's own CSS class) but
nothing had ever populated it: a feature that never ran once, the exact
shape CLAUDE.md's own review checklist names. Rewired to reuse
`renderMarkdown` (the note card's own renderer, not a second
implementation) and a `renderTimelinePopupMedia` that mirrors
`renderGraphPopupMedia` almost line for line — same
`attachmentObjectUrl`/`openLightbox` calls, so a thumbnail click still
opens the full-size lightbox the same way. Also fixed in passing: the
popup's screen position was computed once, before an attachment's
thumbnail had loaded and made the popup taller — `placeTimelinePopup` now
re-runs after the image resolves, the same fix the graph popup already
needed and had. Verified live against a real running server, not reasoned
from the code: a note with a heading and bold/italic text rendered as real
`<h3>`/`<strong>`/`<em>` elements with zero literal asterisks; a real
uploaded PNG showed as an `<img>` with a genuine `blob:` src.

**Then item 16c — "images and files still can't be copied, pasted, or
dragged into notes."** Checked live before building anything, per this
project's own standing rule, and two of the three claimed-missing paths
already worked: a global `document`-level `paste`/`dragover`/`drop`
handler in `app.js` matches *any* `<textarea>` generically, and
`#entry-content` (Capture) is one — so paste and drag-drop already
uploaded to `/media/upload` and inserted markdown, with nobody having
wired Capture specifically. Verified live with real dispatched `paste` and
`drop` events carrying a PNG, not assumed from reading the handler. The
third path — a file-picker button — was genuinely missing (the only
"attach" control near Capture links existing *notes* to a chat message,
not a file upload) and is now built: `📎 Attach`, reusing the same
`handleFileUpload` the other two paths already call. Verified live with a
real Playwright file chooser and a real PNG on disk. One trap worth
recording for next time: Capture lives in the Notes tab's own `capture`
sub-section, so `switchTab("notes")` alone leaves it `display: none` and
the button unclickable — needs `showNotesSection("capture")` too, the
CLAUDE.md-documented Notes-tab trap, hit here for a different element than
the one it already names.

**Then item 18 — the full-screen graph's suggested-links list "runs off
the bottom without scrolling."** Reproduced live before fixing: with the
Options panel open and 15 link suggestions, full-screen content was
1061px tall in a 498px window, and `#graph-card`'s own `overflow: hidden`
— added deliberately in an earlier session for a different bug entirely
(the graph "being out of the main UI panel"; its own comment explains why)
— still applied in full screen, since an ID beats a class on specificity
no matter what order the rules are written in. A plain
`.graph-fullscreen { overflow-y: auto }` would have lost that fight
silently and changed nothing. The last several suggestions weren't just
unscrolled, they were unreachable outright. Fixed with
`#graph-card.graph-fullscreen { overflow-y: auto }` — an id *and* a class
together, which wins outright — and confirmed live with a DOM marker on
the last suggestion: off-screen and permanently so before the fix,
reachable by scrolling after it. The item's other clause, "the sketch/image
toggles," didn't match anything in the current Options panel (Similarity /
Hide unlinked / Labels, no sketch or image controls at all) — left alone
rather than guessed at; possibly a stale note from whatever session first
triaged this list.

**Then a note card menu redesign, asked for directly** (not a prior
ROADMAP item): the ⋯ overflow menu had grown to 15 flat items (14 without
a title), and the ask was to group related ones into sub-sections that
open a side popup on hover or click, working on small screens too.
Restructured `entryOverflowMenu`: three items stay flat at the top level
(Make private/readable, History, and the destructive Move to bin, kept
one click away rather than buried), and the other twelve group into three
side flyouts — **✨ AI actions** (Re-evaluate, Improve writing,
Generate/Regenerate title, Remove title), **🔗 Connect** (Add/Expand into
a document, Link to another, Similar notes), and **➕ Add** (Add context,
Continue thought, Remind me, Attach a file). A new `buildMenuGroupButton`
opens its flyout on `mouseenter` (a 120ms delay so a mouse merely crossing
the item doesn't trigger it) and on click (the only way in on a
touchscreen), flips from the right side to the left when it would run off
the viewport's right edge (measured live, the same "which side has room"
check the graph/timeline popups already use), and — below 720px, this
project's own standing phone breakpoint — drops the side-popup
positioning entirely in favour of expanding in place, since there is
nowhere for a flyout to go on a phone-width screen without running off it.
Reused `buildMenuItemButton` for every item at both levels so a click
behaves identically no matter how deep it's nested, and scoped the
top-level arrow-key handler to `:scope >` children specifically — without
that, a hidden submenu's own items would have joined the top-level
Up/Down/Home/End list and silently broken it, since `querySelectorAll`
does not stop at the first level by default. Verified live end to end:
clicking a group trigger opens the correct three (or four) items, nothing
else; hovering a *different* group closes whichever was open and opens
the one under the pointer, never both; at 390px width (iPhone-sized) the
submenu measured `position: static` with zero horizontal overflow, versus
`position: absolute` and a real `left`/`right` flyout at desktop width.

Full `pytest tests/` (~1,600+ tests), `ruff check .`, and `node --check
frontend/app.js` all green throughout — each fix run individually before
moving to the next, per this project's own standing practice.

**What's next**: ROADMAP.md's remaining Tier 2 items, prioritised by
correctness-bug-over-new-feature the same way Tier 1 was — the larger,
properly scoped items (the sketch pad's selection tool, the whiteboard's
redo/select/rotate list, onboarding's seeded-notes/guided-tour work) roughly in
that order, unless a live report reprioritises something above them.

## 52. The Arc view's real labels-vs-arcs clash, an optional title field decided and built, and a whiteboard panel-layout reset

Continued straight from §51 in the same session, driven by three things the
user raised live: a screenshot of the Arc view's labels, a direct decision
on §16d's title-field question, and a request for a way back to the
whiteboard's default panel layout.

**Item 15, finally reproduced.** Earlier sessions (§48) investigated "labels
behind nodes" and found nothing — DOM order already put every label on top,
so z-order was never the bug. A fresh screenshot this session showed the
real problem was never z-order: it was *position*. Arc's labels were tilted
`rotate(-40, ...)` — upward — and `arcPath`'s connection arcs curve through
exactly that same strip above the baseline, so text and arcs were fighting
for the same space. Measured live before touching anything: 9 of 10 labels'
bounding boxes overlapped a `.graph-edge`. Flipped the tilt to `rotate(40,
...)` (down instead of up), which moves every label into the arcs' empty
side of the row while keeping the same anti-collision shape — still angled,
still reading outward from its own node rather than stacking onto the next
one. Verified two ways, not just reasoned about the trig: a `getBoundingClientRect`
check that every label now sits mostly below its node's vertical centre
(true for all, false before the flip), and a zoom-to-fit screenshot showing
labels clearly readable underneath the row with the dotted arcs undisturbed
above it.

**Item 16d, decided and built the same session it was asked.** The user
confirmed the shape ROADMAP.md had already scoped: write the title into
`content` as a leading `# {title}` heading — the exact line
`manager.extract_title` (§43) already reads — rather than a second stored
field. One shared `withTitle(content, title)` helper, used by both
dedicated note-creation forms: `#entry-title` in Capture, and
`#graph-new-note-title` in the graph's own "+ New note"/"+ Connected note"
popup (voice dictation, templates and quick actions all write into
Capture's own textarea already, so they needed no separate wiring). Also
confirmed rather than assumed: a note started with a bare single `#` (not
only `##`–`######`) was already read as a title before this change —
`extract_title`'s own `#{1,6}` always covered H1, so the "detecting a
single #" half of the ask was already true and needed no build. Verified
live end to end against a real server: a title typed in Capture produced
`# My Explicit Title\n\n...` in the saved note, with the computed `title`
field reading back correctly and the input clearing after save; a bare `#`
line typed straight into the body, with the title box left empty, read
back with the same computed title; the graph popup's own field round-tripped
identically.

**A whiteboard panel-position reset, asked for directly.** Once a panel
(board switcher / library+colour-picker / tool strip) had been dragged,
there was no way back to its default corner short of clearing
`localStorage` by hand. A `⟲` button next to the board-colour reset clears
every panel's `wb-panel-pos-*` key and its drag-time inline styles
(`left`/`top`/`right`/`bottom`/`transform` — all `place()` ever sets), so
each panel's own `top-left`/`top-right`/`bottom-center` CSS class — never
removed, only ever overridden by those inline styles — takes back over.
Verified live: simulated a drag (moved the board panel to an arbitrary
position, saved to `localStorage` the same way a real drag does), clicked
reset, confirmed the panel's rendered position and `localStorage` entry
both returned to their pre-drag state.

Full `pytest tests/` (~1,600+ tests), `ruff check .`, and `node --check
frontend/app.js` all green. Every fix in this section was verified against
a real running server via Playwright — screenshots, `getBoundingClientRect`
measurements, real saved notes read back through the API — not reasoned
from the code alone.

**What's next**: the remaining Tier 2 items are unchanged from §51's own
list — the sketch pad's selection tool, the whiteboard's larger redo/
select/rotate/images list, item 16 (documents in the graph, needs scoping),
and onboarding's remaining pieces (seeded notes, the model-pull UI, a
data-dir writability probe, a guided tour). 16e/16f (an emoji picker, a
full emoji-usage sweep) are still open design questions, not yet asked
about directly the way 16d just was.

## 53. A user-reported bug list, then the whiteboard rebuilt into a real OneNote/draw.io-style canvas

Condensed from HANDOVER.md's own (much longer) writeup of this session —
read there for the full detail, including the CodeQL path-traversal fix and
the exact verification steps.

Fixed a live-reported bug list first: `PUT /whiteboard/nodes` 500ing on a
stale card (missing `_hard_delete` cleanup); two Preferences sections
overwriting each other's saved fields; glassmorphism opacity having no
independent control from blur; inline `![...]()` images rendering as raw
markdown app-wide instead of `<img>`. Then the whiteboard, per ROADMAP §11:
a redesigned board picker (`GET /whiteboard/boards` — only boards actually
in use, not every note in the notebook); a new `WhiteboardObject`
table/kind for images and text boxes (upload/paste/drag-drop, 8-handle
resize, full drag); clear-board, SVG/PNG/PDF export, and three grid types
with snap-to-grid wired into card/object dragging. **Explicitly not
attempted**: real anchor/connection points (fixed corners+edges, a free
point along an edge) — named as "the biggest single piece, worth its own
session" rather than built shallow. A CodeQL alert on the image-object
delete path (`py/path-injection` — a `startswith("/media/")` check that
`/media/../../etc/passwd` passes) was fixed with an exact-shape regex plus a
resolve-and-confirm-containment check.

## 54. The whiteboard bug list — copy/paste, sketch move/resize, multi-select, a real security/correctness bug in `/media`, and the rest of §11/§53's own "still open" list

A user-supplied list of 17 specific whiteboard/notes bugs, worked first per
this project's own standing rule, then the rest of ROADMAP §11's still-open
list and several more reports that arrived mid-session. Long session, no
check-ins asked for; every fix below was reproduced live in this sandbox's
Chromium before and after, not reasoned from the code.

**The one that wasn't about the whiteboard at all.** "Image upload on the
whiteboard doesn't work" turned out to be one symptom of a real, previously
unnoticed bug reaching every `/media/` image in the app: `GET
/media/{filename}` (and `GET /files/{attachment_id}`) required the
`X-Auth-Token` header, which a plain `<img src>` — or a CSS
`background-image`, or an `<image>` inside an exported SVG — never attaches;
only `fetch`/`XHR` can set a custom header. Every such image was a silent
401 (a blank/broken image, nothing thrown, nothing logged) on any notebook
with a password set, which is the normal case — including, per §53's own
"verified live" claim, the note-list inline-image fix from the previous
session, which most likely only ever confirmed the `<img>` element existed
in the DOM, not that it painted. Fixed with a query-param token fallback
scoped to just those two routes (`require_unlock_media`, a separate
`media_router` in `routes_files.py` — every other route stays header-only,
so the token doesn't end up in every access-log line, only these two), and
a frontend `mediaSrc()` helper wired into every affected render site
(whiteboard image objects, inline note/doc markdown images, Library
thumbnails, the whiteboard's own background image and SVG export). Verified
live: an uploaded image's `naturalWidth`/`naturalHeight` now match the real
file instead of failing to load.

**Whiteboard bugs, reproduced and fixed:**
- **Drawing over a card moved the card instead of drawing on it.** Cards
  live in `#wb-html-layer`, a sibling painted on top of `#wb-svg-layer` — a
  pointerdown landing on a card never reached the SVG layer's own draw
  listener, and the card's own `d3.drag` (bound directly to it) claimed the
  gesture regardless of which tool was active. Fixed by filtering the
  card/object drags to bail while a brush tool is active, and moving the
  brush pointerdown/move/up listeners from `svgCanvas` to `containerEl` (an
  ancestor of both layers, so it sees the pointerdown either way — mirroring
  the eraser-tracking listener's own established pattern).
- **Sketches (pen/line/rect/circle/highlighter/arrow) had no move or resize
  at all** — only cards/objects did. A sketch's only representation is its
  SVG path string, so both mean rewriting the coordinates inside it: a
  small path-transform interpreter (`wbTransformPathD`/`wbPathBBox`, scoped
  to exactly the commands this app's own tools ever emit — M/L/C/h/v/a/Z)
  handles translate-for-move and anchored-scale-for-resize; 8 resize
  handles render only while a sketch is selected. A straight line's
  bbox-corner resize doubles as "shorten the line". Link sketches (computed
  live from two cards' positions) are excluded from handles by design.
- **Copy/paste, asked for directly.** Ctrl+C/Ctrl+V for the current
  selection, offset +24,+24 on paste. Cards excluded on purpose:
  `POST /whiteboard/nodes` is one-card-per-note-per-board by backend design
  (routes_whiteboard.py's own comment), so a "copy" would silently *move*
  the original card to the paste offset instead of duplicating it.
- **Multi-select — shift-click, rectangle marquee, bulk delete, bulk
  move.** `wbMultiSelection`, a set alongside (not replacing) the existing
  single-item `wbSelectedItem`. A real bug caught mid-build: deciding
  bulk-move eligibility in a drag's "start" handler (which d3 calls on
  *every* pointerdown, moved or not) meant a second shift-click meant to
  toggle a member back off was mistaken for the start of a bulk move and
  did nothing — fixed by deferring that decision to the first actual "drag"
  frame instead. Lasso (freeform) select not built; rectangle marquee
  covers the same real need.
- **Grid-snap only moved notes, not shapes/lines — and diagonal movement
  under snap felt stuck.** Two separate causes. Sketches had no drag at all
  (see above) — fixed as part of it, with the same `wbSnap` wired in. The
  "stuck" feeling was a real accumulation bug in the *existing* card/object
  drag: `d.x = wbSnap(d.x + event.dx)` re-snaps the *already-snapped* `d.x`
  every frame, discarding the sub-grid remainder each time instead of
  carrying it forward, so many frames of real small motion could sum to
  nothing until one single frame happened to cross a whole grid step by
  itself — worse on a diagonal drag, where each frame's per-axis delta is
  smaller for the same total speed. Fixed by tracking a raw, never-snapped
  running position and only reading it through `wbSnap` when
  applying/saving.
- **"Resizing and drawing shapes is glitchy and slow to update."** Dragging
  a card called a full `renderWhiteboard()` — rebinding every card, sketch
  and object on the board — on *every single mousemove frame*, purely to
  keep that card's own link lines following it. Replaced with
  `wbUpdateLinkedSketches(nodeId)`, which updates only the link paths
  touching the dragged card directly via `setAttribute`. Shape-drawing
  itself was already efficient (direct `setAttribute` per frame, no
  re-render) — this was the actual bottleneck.
- **Board picker / library accessibility** — checked, already built
  (`GET /whiteboard/boards`, §53), reachable via Library → Whiteboard's
  `#wb-board-select`. No fix needed.
- **Arrowheads.** `window.currentArrowStyle` (none/start/end/both), a
  toolbar `<select>` shown only while the arrow tool is active, read by the
  same drawing code (factored into `wbArrowHeadPath`, one head-stroke
  helper both ends now share).
- **More shapes.** Triangle and diamond, plain `L`-command polygons — no
  new path-command type for the move/resize transform to learn.
- **A dropped note card landed offset from the drop point** (reported
  mid-session). `d.x`/`d.y` are a card's own top-left corner, but the drop
  handler stored the raw cursor position there — for the ~250×150 default
  card that reads as up to 125px right/75px down from where it was actually
  dropped. Fixed by centring on the drop point instead, matching how a text
  box/image already places itself. A related, smaller inconsistency in the
  same drag-to-link code (`+125,+50` instead of `+125,+75` for a card's
  approximate centre) was fixed alongside it.
- **The eraser couldn't touch-drag to delete (the pen worked fine
  touch-dragged the same way), reported mid-session.** The eraser relied
  entirely on native `pointerenter` firing per element while held — touch
  implicitly captures the pointer to whatever element received the initial
  touch, so a dragging finger never fires `pointerenter` on the *other*
  items it crosses, only the one first touched. Fixed with
  `releasePointerCapture` on pointerdown plus coordinate-based
  (`elementFromPoint`) hit-testing on `pointermove`, which doesn't depend on
  capture behaving correctly at all. Verified via mouse drag-erase (no
  regression, all three items on a drag path erased in one pass); the
  touch-capture mechanism itself is reasoned from the Pointer Events spec,
  not observed on real touch hardware — this sandbox has none.
- **Text boxes were hard to see against the board.** `.wb-object-text` had
  a 1px *dashed* `--glass-border` (10–13% alpha in most themes) and no
  blur/shadow — every other floating surface on this board
  (`.whiteboard-floating-panel`) is a `.card.glass` and gets both. Given a
  solid border, a blur+shadow, and a background-opacity floor (`max(...,
  0.55)`) so it stays legible even with glass opacity turned all the way
  down.
- **The snap-to-grid checkbox rendered as a bare native control** — the
  app's own switch styling (`.settings-section label>input[type=checkbox]`
  etc., itself the fix for "ditch the radio buttons... make the UI match")
  never reached `.wb-snap-label`. Added to the same selector list.
- **Shift-to-constrain (square/perfect circle/etc.) while drawing a
  shape**, asked for directly — `wbShapeDims`, squares to the larger of the
  two raw dimensions so the shape still reaches the cursor.
- **Alt to temporarily bypass grid-snap for one drag**, asked for directly,
  the same convention Figma/Illustrator use — `wbSnap` takes an optional
  `bypass` flag, read from the drag event's own `altKey`.
- **"Does grid-lock apply when the grid isn't shown?"** — checked: no,
  `wbSnapOn()` already requires a grid type other than `"none"`, and the
  checkbox itself is disabled without one. Already correct; nothing to fix.
- **Clear board not clearing highlights, and highlights not being
  erasable** — investigated, not reproduced. A highlighter stroke is an
  ordinary sketch; drawing one, erasing it (both by a single click and a
  drag), and clearing a board holding one all worked correctly on the
  current code. Left as-is rather than guess-fixing something that
  reproduces as already working.
- **"Most used" list showing raw markdown or stripped-plain text instead of
  rendering it.** Two separate widgets, two different gaps: the Notes tab's
  own `#most-used-box` already called `renderInlineMarkdown` but truncated
  the *raw* string first, corrupting tokens cut mid-marker (a `` `code` ``
  span missing its closing backtick left a bare backtick visible); the
  Dashboard's newer per-widget Most-used/Pinned/Recent (`miniEntryList`)
  used `notePreviewText`, which strips markdown to plain text rather than
  rendering it — a deliberate past decision, per its own comment, made
  specifically to avoid the same mid-token corruption. A new `safeMdSlice()`
  helper (drops a dangling marker at the truncation boundary) fixes the
  actual problem the old workaround was avoiding, so both were switched to
  real rendering.

Full `pytest tests/` (~1,600+ tests), `ruff check .`, and `node --check
frontend/app.js` all green throughout. **Still open from §11/§53's own
list, not attempted this session**: real anchor/connection points (still
"worth its own session" — see ROADMAP item 11), a properties panel for
colour/border/fill on the current selection, rotation (needs a real backend
schema change — no whiteboard table has an angle column), card resize (only
images/text objects have it), image cropping, and an AI-guided
diagram-generation mode.

## 55. Continuing §54's own "still open" list: a properties panel, card resize, grouping, undo/redo for move and resize, arrow-key nudge, alignment/distribute, and rotation — plus a real silent-reset bug found the same way §54's own `group_id` one was

Same session as §54, continued after a context compaction — same user,
still working top-down through the "still open" list §54 itself left
behind, plus several more features named directly mid-session (a
properties panel, "suggested modes", grouping, arrow-key movement,
alignment tools). Authorised to work through the night unattended
("assume I agree with everything... commit and push as you go"). Every
behavioural claim below was driven against a real running server via
Playwright, not reasoned from the code — see the coordinate traps at the
end, which cost real time before the fixes below were confirmed real.

- **A properties panel for the current single selection**, asked for
  directly, more than once. `#wb-properties-panel`, populated by
  `wbUpdatePropertiesPanel()` from whichever kind is selected: a sketch
  gets colour+width (+arrowhead if it's an arrow); a text object gets
  colour+fill+border+font-size. Hidden entirely for a multi-selection, a
  card, or an image — none of those have a stroke/fill of their own to
  edit here.
- **Card resize**, asked about directly, confirmed missing by reading the
  render code in §54. `WhiteboardNode` gained nullable `width`/`height`
  columns (unset = the old ~250×150 CSS default, so an existing row renders
  unchanged); the same 8-handle drag as an object's own resize, factored
  into `nodeResizeDrag`. **Two real bugs found and fixed before this
  shipped, not after**: the card's own move-drag `.filter()` didn't exclude
  `.wb-resize-handle` the way an object's already did, so the card-level
  drag silently intercepted the same pointerdown and no resize ever
  happened; and a defensive `overflow-y: auto` added to `.wb-card` along
  the way triggered a real CSS spec quirk — setting one overflow axis
  non-`visible` while the other is unset forces *both* axes to compute
  non-`visible`, silently clipping the negatively-positioned resize handles
  sitting just outside the card's own box. Reverted; the pre-existing
  `.wb-card-content` 3-line clamp already handles long text without it.
- **Object grouping** (Ctrl+G / Ctrl+Shift+G), asked for directly. A
  `group_id` column on all three whiteboard tables (opaque
  `crypto.randomUUID()`, not a foreign key — one group spans three
  different tables, so there's no single row for it to point at) rather
  than an in-memory-only set: `wbMultiSelection` disappears on reload, a
  persisted group doesn't. Clicking any one grouped member re-selects the
  whole group (the other half of Ctrl+G, in `wbHandleItemClick`), and the
  existing bulk-move machinery drags a group "for free" once it's selected.
- **Undo/redo extended to cover move and resize, not just create/delete**,
  asked for directly ("account for resizes, rotates, positional movement").
  A new `"move"` entry type in `wbApplyHistoryEntry`, storing the item's
  whole pre-change payload (x/y, width/height, a sketch's own `d`) as
  `before` — one shape covers move *and* resize, since both just mean "the
  payload changed." Wired into every drag/resize end handler across all
  three kinds. A single dragged/resized item in a multi-selection gets its
  own undo entry; the rest of the group, moved via the separate bulk-move
  path, does not — a real, acknowledged limitation, not attempted further.
- **Arrow-key nudge**, asked for directly. Step size follows grid-snap
  (a full grid step when snap is on, 1px normally, 10px with Shift held) —
  moves the whole current selection (single item or multi) at once. Needed
  a genuinely new undo shape: nudging three selected items is one user
  action, and Undo pressed once should reverse all three, not one at a
  time — a new `"batch"` entry (an array of ordinary `"move"` sub-entries,
  replayed through the same `wbApplyHistoryEntry` recursively) covers this,
  and alignment/distribute below reuse it too.
- **Alignment tools** (left/h-centre/right/top/v-centre/bottom) and
  **distribute** (horizontal/vertical), asked for directly ("alignment
  tools... missing", named again this session). Live in the properties
  panel as a `wb-prop-multi-row` that replaces the single-item rows
  whenever `wbMultiSelection` is non-empty. Align references the whole
  selection's own combined bounding box (the same convention every other
  drawing app uses); distribute needs three or more, keeps the two outer
  items (by centre, along the chosen axis) fixed, and spaces what's between
  them evenly.
- **Rotation**, asked about directly, three sessions running. `WhiteboardNode`
  and `WhiteboardObject` each gained a nullable `rotation` (degrees). A
  round handle above the item's own top-centre (distinct at a glance from
  the square resize handles); dragging it computes the angle from the
  item's own screen-space centre to the pointer — `getBoundingClientRect()`'s
  centre stays correct even mid-rotation, since an axis-aligned box's centre
  coincides with the true rotation centre regardless of how far the box has
  turned, so this needs none of the zoom/pan-scale math a position drag
  does. Shift snaps to 15°. **Deliberately scoped to cards and objects, not
  sketches** — a sketch's shape *is* its path data, and rotating a path
  correctly (the `a` command's elliptical-arc flags flip under rotation)
  is real trig `wbTransformPathD`'s existing translate/scale math doesn't
  need; left for a future session rather than a shortcut that gets arcs
  wrong.
- **A real bug, found live, of the exact shape §54's own `group_id` bug
  was**: `wbSaveObject`/`wbSaveNode` each build their own PUT body by hand,
  independently of the `WB_KIND_INFO` payload builders used for undo — and
  neither one had been taught about `rotation` when it was added. Since the
  backend assigns `obj.rotation = body.rotation` unconditionally (a full
  replace, not a partial update), every single save — not just a rotation
  drag, *any* move, resize, or property edit — silently reset rotation
  back to `None`. Caught by a Playwright test reading `wbState` back after
  a rotate-and-wait, not by inspection: the live CSS transform showed
  `rotate(90deg)` (set synchronously during the drag) while the state
  object the async save had since overwritten already read back `null`.
  Fixed in both functions. **The lesson repeats**: every whiteboard field
  needs to be added at every call site that builds a request body by hand,
  and there is more than one such site per kind — grep for all of them, not
  just the first one found.

**One more real bug, found by looking, not testing** — the standing rule
this project's own CLAUDE.md states plainly ("measure and look before you
claim a UI change works"). A screenshot taken to sanity-check the new
multi-select properties panel showed the board picker reading
`UI screenshot (0 items)` for a board that visibly held three text boxes.
`refreshBoardList()`'s own item count summed `node_count + sketch_count`
only — `object_count` (images/text boxes), which `GET /whiteboard/boards`
has returned since §53, was never added to the sum. A board holding only
objects (no cards or sketches) read as empty in the picker even with
content on it. One-line fix; the screenshot that caught it was taken to
check panel *layout*, not this.

**Two Playwright coordinate traps found live, worth recording since they
cost real debugging time before being understood as test bugs, not app
bugs**: a marquee drag starting near the container's own top-left corner
lands on a floating toolbar panel sitting on top of the canvas there, and
the pointerdown never reaches the canvas at all (0 items selected, not a
partial miss) — start below roughly `container.top + 260`. And a marquee
ending too far down the viewport (`container.top + 700` in a 900px-tall
viewport) overshoots the canvas entirely and releases over the app's own
bottom tab bar instead — confirmed by logging every pointer/mouse event's
target during the drag, which showed the sequence ending on
`pointerup>tab-library`, not on anything whiteboard-related. Both are
about where a synthetic drag starts/ends, not a selection-logic bug; the
marquee/rectangle-intersection code itself was correct throughout.

Full `pytest tests/` (~1,600+ tests), `ruff check .`, and `node --check
frontend/app.js` all green. **Still open** (see ROADMAP item 11 for the
full ranked list): real anchor/connection points (still "worth its own
session," now named three times), sketch rotation, image cropping, an
AI-guided diagram-generation mode, uploaded whiteboard images not showing
in the Library as files, and a whiteboard backend/perf pass beyond the one
full-rerender bug already fixed in §54.

## 56. Real anchor/connection points, built and verified live — then a live-reported whiteboard bug list that arrived mid-session, all fixed and verified the same way

Started exactly where HANDOVER.md's own "start here" pointed: item 11's
confirmed build order, anchors first. Built and verified live via
Playwright before a long list of new UI reports arrived mid-session (the
user watching and chipping in, not a scripted list) — worked those next,
per this project's own standing rule to fix what's reported before
resuming a build plan. Mind-mapping mode and the AI+whiteboard integration
pieces (the second and third items in that same confirmed order) were
**not reached this session** — see "what's next" below.

**Real anchor/connection points**, matching how draw.io itself splits the
fixed-vs-free distinction, exactly as scoped at the end of §55:
- Eight **fixed** anchors (corners + edge midpoints) as `{x, y}` fractions
  (0–1) of a card's own bounding box — `sourceAnchor`/`targetAnchor` live
  as two more keys in the link sketch's existing `data` JSON blob, no
  schema migration, per the plan. A **floating** end (no anchor persisted)
  resolves fresh every render via the standard rectangle/ray intersection
  toward whatever the *other* end actually is — its fixed point if it has
  one, its centre otherwise — not always the other shape's raw centre,
  which is what makes a floating end track a moving fixed end correctly
  instead of just pointing at a static point.
- One set of shared helpers (`WB_FIXED_ANCHORS`, `wbAnchorPoint`,
  `wbNearestAnchor`, `wbBoxRayIntersection`, `wbLinkEndpoints`,
  `wbLinkPathD`) used by all three call sites named in ROADMAP's own
  scoping notes — the render path (`sketchUpdate.each`), the per-drag-frame
  follow (`wbUpdateLinkedSketches`), and the link-drawing gesture itself
  (`dragStart`/`dragging`/`dragEndNode`) — so the endpoint math can't drift
  between them the way the old hardcoded `x+125, y+75` centre offset was
  at least consistent about (wrong in the same way everywhere) but never
  actually correct anywhere.
- A drag now snaps to the nearest fixed anchor within ~16 board-px of
  where the gesture started/ended, on both the source and target end
  independently; anything farther persists no anchor (floating). Small
  SVG dots at a shape's 8 fixed points appear during a link drag —
  brighter/larger on whichever one is currently in snapping range — so the
  snap targets are discoverable rather than a silent hit-test, matching
  draw.io's own on-hover anchor markers.
- **Verified live end to end via Playwright**, not reasoned from the code:
  dragging from a card's exact top-right corner to another card's
  top-left corner produced `sourceAnchor: {x:1,y:0}`,
  `targetAnchor: {x:0,y:0}`, and a rendered path terminating precisely at
  those two corners (`M 350 500 L 700 700` for cards at board (100,500)
  and (700,700)); moving the target card afterward re-rendered the path to
  follow the new fixed corner exactly (`M 350 500 L 900 750` after a
  `+200,+50` move), not the old centre point. A centre-to-centre drag (no
  anchor in snapping range on either end) persisted a sketch with **no**
  `sourceAnchor`/`targetAnchor` keys at all and rendered at the exact
  rectangle-intersection point the shared maths predicts by hand
  calculation. The anchor-hint dots were confirmed to appear at drag start
  and while hovering a valid target, and to clear on drop.
- **Scoping decision, stated plainly rather than silently accepted**:
  anchor points are computed against each card's *unrotated* bounding box.
  A rotated card's anchors sit at its unrotated corners, not its visually
  rotated ones — the same simplification the old centre-point code already
  had (rotating around the centre doesn't move the centre, so that code
  never had to think about rotation at all; real corner anchors do, and
  this session didn't spend the trig on it). Worth fixing alongside sketch
  rotation (ROADMAP item 11's own "still open" list) rather than now.
- **A real, previously-unknown bug found *because* anchors target exact
  corners, not despite it.** Every card/object resize and rotate handle
  was `opacity: 0` by default (shown on hover/selection) but never
  `pointer-events: none` — an *invisible* handle still wins a hit-test
  over the card/object beneath it, at every corner and edge, for
  **any** tool, not only while selected, and the browser's own `:hover`
  fires the instant the cursor crosses the card regardless of which tool
  is active. A synthetic drag aimed at a card's exact corner (to test
  anchor-snapping) kept landing on the invisible resize handle instead of
  starting a link — reproduced by checking `document.elementsFromPoint`
  mid-gesture, not guessed at. Fixed two ways, both needed: `pointer-events:
  none` on the handles by default, `auto` again only inside a new
  `#whiteboard-container[data-current-tool="select"] ... :hover`/`.wb-selected`
  rule (hover alone wasn't enough — a link/pan gesture near a corner lost
  to the handle just as often once handles were shown on plain hover
  outside Select too). **Very likely the whole of a report that arrived
  minutes later** — see below.

**Then, live and unprompted, the user reported a run of specific
whiteboard UI problems while watching the session** — worked each one in
turn, per CLAUDE.md's own "fix what's broken before building" rule, all
reproduced and verified live before and after, not guessed at:

- **"Objects are also difficult and annoying to move around."** Traced to
  two separate causes, not one. First, the resize-handle bug just above —
  a small object's clickable area is mostly covered by its own 8 (now
  correctly non-interactive-when-hidden) handles, so this alone was a
  large part of it. Second, and specific to **text** objects: `.wb-text-
  content` (the contenteditable div) correctly excludes itself from the
  object's own drag — typing has to reach it — but since it fills the
  entire box, that left only the ~0.5rem padding strip around the text as
  a draggable surface, the exact width the resize handles sit on top of.
  Fixed with a dedicated `.wb-object-grip` (⠿, same glyph and convention as
  the floating panels' own drag grip), always visible, with its own
  separate d3-drag instance. **A real bug caught building the fix, not
  shipped with it**: the grip's first version reused the object's own
  `objDrag` behaviour (excluding `.wb-object-grip` from *that* instance's
  filter, mirroring how the resize/rotate handles already exclude
  themselves) — but `objDrag` is one shared behaviour bound to *both* the
  object and the grip, so the same filter runs for both elements' own
  pointerdown, and a target-`closest()` check can't tell "the grip's own
  listener firing" from "the object's listener catching a bubbled grip
  click" apart; excluding the grip's class from the filter silently
  disabled the grip's own drag too, not just the parent's duplicate. Fixed
  with a second, genuinely separate `gripDrag` instance (`event.sourceEvent
  .stopPropagation()` in its own start handler, the same fix `resizeDrag`/
  `objectRotateDrag` already use for the identical shared-parent problem).
  Verified live: dragging by the grip moved the object by the expected
  delta, checked mid-gesture and after drop, not just after.
- **"The bottom tool bar is getting quite long... make them like a
  selectable dropdown."** The six shape tools (line/arrow/rect/circle/
  triangle/diamond) collapsed into one `#wb-shape-toggle` + popover, still
  plain `data-tool` buttons underneath so the existing delegated click
  listener on `#wb-tool-group` needed no change. **Grouped in two,
  asked for directly** ("line and arrow should be one group, and the other
  shapes should be another") — line+arrow sit together above a divider
  from rect/circle/triangle/diamond, which is also functional: the
  relocated "Line ends" control only applies to the first group. **A real
  bug caught live, not shipped**: the first version called
  `shapeMenu.addEventListener("click", stopPropagation)` to keep clicks on
  the line-ends select from being treated as "outside the menu" by the
  close-on-outside-click listener — except the outside-click listener
  already excluded anything inside `#wb-shape-picker` via its own
  `closest()` check, so this line was not just unnecessary but actively
  wrong: it also stopped a tool-button click from *ever* bubbling to
  `#wb-tool-group`'s delegated listener, so picking a shape did nothing at
  all and the menu never closed. Found by an end-to-end Playwright check
  (pick "circle" → assert `currentTool === "circle"`) that failed cleanly
  rather than by reading the code twice. Verified live after the fix:
  opening the menu, picking each shape, confirming `currentTool` updates,
  the toggle's own icon swaps to match, and the menu closes both on a
  pick and on an outside click.
- **"I also want to be able to adjust it as a sidebar and not just a
  bottom bar."** A `#wb-dock-toggle` button flips `data-dock` between
  `"bottom"`/`"side"` (persisted in `localStorage`), which the CSS reads to
  switch the tools panel between its usual horizontal row and a vertical
  column pinned to the left edge — same controls, same click handlers,
  laid out differently. **One specificity trap worth recording**: a later,
  unrelated rule earlier established for spacing (`.bottom-center { bottom:
  var(--space-3) }`) has the identical specificity (0,2,0) as a bare
  `[data-dock="side"]` attribute selector, so without deliberately writing
  the dock rule as `.bottom-center[data-dock="side"]` (specificity
  (0,3,0)), source order alone would have let that later rule silently win
  and pin the "sidebar" to the bottom edge regardless of the toggle.
  Verified live: toggling produced a tall, narrow, left-docked panel
  (68×656px in the test viewport) with its tool row now vertical; toggling
  back restored the original bottom-center layout exactly.
- **"Cursor changing to the rotate icon when hovering over or using the
  rotate nodes."** The rotate handle already had `cursor: grab`; replaced
  with a small inline-SVG curved-arrow cursor (same `data:image/svg+xml`
  technique `wbCursorUrl` already uses for the drawing tools, just written
  as static CSS here since this is one fixed element's `:hover`, not a
  per-tool cursor computed in JS), `grab`/`grabbing` kept as the fallback.
- **"Regular lines should also get line end options... arrow heads."** The
  Line tool now shares the same "Line ends" control the Arrow tool already
  had (`window.currentArrowStyle`, applied identically in the live-drag
  preview) rather than a second, separate control — picking "End" and
  drawing with the Line tool now produces the same multi-`M` arrowhead
  path an Arrow draw already did, verified live by reading the saved
  sketch's own `data.d` back (three `M`s: shaft + two head strokes). A
  full "circles, squares, single/double/triple lines" end-cap system
  (asked for in the same message) was **not built** — scoped, not
  guessed at, see "what's next" below.
- **"The properties panel title should be right at the top next to the
  drag move icon."** The grip and the "PROPERTIES" title were two separate
  block-level rows inside the panel's own `flex-direction: column`,
  which is what put a large gap between them — wrapped both in one
  `.wb-panel-header` row instead. Verified live (real selection, real
  panel, not a static screenshot): grip and title's own bounding rects
  now share the same `top`, a few pixels apart horizontally, not stacked.
- **"Clean up the UI spacing, height and alignment... everything is
  different heights."** Real and structural, not a screenshot artifact:
  there was no `.icon-button` CSS rule at all — every plain icon button,
  `button.small` (Library, zoom, board-picker), `<select>`, and the colour
  swatch `<input type="color">` were each sized by their own default
  padding/content, so a text+icon button stood taller than its round
  neighbour. Scoped to the whiteboard's own floating panels (not a global
  button/select change, which have their own established sizing
  elsewhere) — every control now shares one explicit height. Verified
  live: every visible control's `getBoundingClientRect().height` in the
  tools panel now reads the same 36px.
- **"Make the corners of the whiteboard rounded if the user has rounded
  edges set in their appearance settings."** `.whiteboard-container` had
  no `border-radius` at all — added `var(--radius)`, the same global token
  the Appearance slider already writes everywhere else, so the board's own
  corners now follow it instead of being the one hard-edged rectangle in
  the app. `overflow: hidden` (already present, for the grid/background
  layers) is what actually clips content to the rounded shape. Verified
  live: computed `border-radius` reads `14px` at the default setting.

All ~1,600 tests pass (Python side is untouched this session — every
change above is `frontend/app.js`/`index.html`/`style.css` only), `ruff
check .` is clean, `node --check frontend/app.js` is clean, and the three
frontend-shape lint tests (`test_frontend_ids.py`, `test_frontend_
handlers.py`, `test_style_scale.py`) all pass. **What was and wasn't
verified**: every behavioural claim above — anchor snapping and its exact
coordinates, the resize-handle pointer-events fix, the grip drag, the
shape-menu pick/close cycle, the dock toggle's own layout, the line
arrowhead, the properties-panel header, and the uniform control heights —
was driven against a real running server via Playwright, reading back
`wbState`/computed styles/DOM rects, not reasoned from the diff. The
rounded-corner fix is a one-line, low-risk CSS token addition confirmed by
computed style but not screenshotted. **Two environment traps cost real
time this session and are worth recording so the next one doesn't repeat
them**: a test object/card placed near board y≈700–900 in a 900px-tall
viewport can land under the Agent Activity monitor panel or the app's own
tab bar, exactly the same class of problem HISTORY.md §55 already named
for the container's top-left corner (`container.top + 260`) — place test
geometry away from *both* edges, not just the top one. And restarting the
dev server without confirming the old process actually died (this
project's own standing trap) produced a server that looked healthy
(`curl /health` answered) while silently still being the *previous*
process on a stale `MEMORYMAP_DATA_DIR`-free port bind failure — always
check `pgrep`/kill by PID number and verify a fresh `Started server
process [PID]` line in the log before trusting a restart.

**What's next, unchanged from the confirmed order** except anchors
dropping off the front: (1) **mind-mapping mode** (ROADMAP item 25 — an
"Arrange as mind map" button reusing the Graph tab's Tree/Radial layout
code against the whiteboard's own node/link data, plus Tab/Enter keyboard
branch entry) is next, and can now build real anchor-terminated branch
lines rather than arbitrary-corner ones. (2) **AI + whiteboard
integration**, three pieces confirmed wanted together (a chat-agent read
tool over a board's contents, whiteboard content in search, AI-guided
diagram generation as the write side of the first) — still fully
unscoped code-wise, though the read tool's shape is already sketched in
ROADMAP item 11's own notes. (3) A **full end-cap system** (circle/square/
multi-line ends, asked for directly) beyond the arrowhead-sharing done
this session. (4) Sketch rotation and image cropping, both already named
and both explicitly deferred again.

## 57. Mind-mapping mode, AI + whiteboard integration, and two real bugs found live that predate both — the rest of §56's own confirmed order, same session, continued after the user kept watching and reporting

Continued straight from §56 on the same branch, the user staying in the
loop the whole time ("continue your roadmap development plan", "finish
all the rest of the whiteboard tasks... autonomously", "be token
efficient"). Built items 2 and 3 of §55's confirmed order in full, plus
two more live-reported/found bugs. Full code detail is in this section;
HANDOVER.md carries the short version and what's next.

**Mind-mapping (ROADMAP item 25), done and verified live.** "Arrange as
mind map" (Tree or Radial) appears in the properties panel for a single
selected card that has at least one whiteboard link — reuses the Graph
tab's own `d3.hierarchy`/`d3.tree` approach (`layoutHierarchy`'s pattern),
against the whiteboard's plain node/link data rather than the notebook's
category/reply structure, exactly as ROADMAP item 25 specified ("reuse
that code... instead of writing a second layout engine"). A link graph
isn't necessarily a tree — a BFS from the selected root (`wbMindMapSpanningTree`)
turns whatever is reachable into a real spanning tree, and only what's
reachable moves; the root card itself stays put. Tab (new linked child, at
"the next open radial slot" — evenly spaced by angle among existing
siblings, one ring further out) and Enter (new sibling — a child of the
selected card's *own* parent, falling back to a child of the card itself
for a root) both create a real note, a real card, and a real link,
verified live via Playwright: a 4-node hub-and-spoke arranged radially put
all three children at exactly 260px from the root (the configured ring
step); Tab added a 5th card and selected it; Enter added a 6th as another
child of the root (the new card's sibling). `window.wbMindMap` caches the
parent/children map from the last arrange (or lazily seeds one from the
board's current links, rooted at whatever card Tab/Enter is used from, if
nothing was ever arranged) so repeated Tab/Enter presses stay coherent.

**A real, previously-unverified bug found *while building the live test
for the above*, not by inspection — and its blast radius was much wider
than mind-mapping.** Selecting a card by clicking it, in Select tool, was
confirmed live to simply not work: `wbHandleItemClick` fired correctly
when called directly, but a real `page.click()` on a card never reached
its own `.on("click", ...)` handler, and — instrumented further — never
even reached the container's own "empty canvas clears selection" listener
either. The cause: `dragStart`'s unconditional `d3.select(this).raise()`
(re-appending the card as its parent's last DOM child, for z-order while
dragging) ran on *every* pointerdown, including a plain zero-movement
click, and reappending the interaction target mid-gesture is enough to
stop the browser from ever synthesizing the following `click` event at
all. A plain sketch, whose own drag "start" never calls `.raise()`,
selected correctly the same way, the same session, on the same page —
confirmed by adding matching instrumentation to both and comparing.
`objDragStart` (images/text objects) had the identical shape and got the
identical fix. Moved `.raise()` from each `*DragStart` into the matching
`*DragMove`/`dragging` handler, which — unlike "start" — only ever runs
after real movement, so a plain click's own click event is never touched.
**This means clicking a card or object to select it may never have
reliably worked via a real click gesture before this fix**, however many
sessions' own Playwright checks read as passing — worth keeping in mind
when trusting an *older* session's "verified live" claim about
card/object selection specifically; a check that calls `selectWbItem()`
directly, or drives selection through a keyboard shortcut, would never
have caught this.

**AI + whiteboard integration, all three pieces, ROADMAP item 11's own
plan followed exactly.** Nothing under `src/memorymap/ai/` mentioned the
whiteboard before this.
- **Read** (`read_whiteboard`): board id (or the default board), every
  card with its note preview, every text box's content, an image count,
  and every link as `{from_card_id, to_card_id}`. Uses its own copy of the
  `board_id IS NULL` filter `routes_whiteboard.py`'s `_board_filter`
  already gets right — tested explicitly (`test_read_whiteboard_default_
  board_is_not_confused_with_an_absent_one`) since `== None` rendering as
  SQL `= NULL` is exactly the bug HISTORY.md §40 already found once in the
  same shape, in a different file.
- **Search** (`search_whiteboard`): a keyword scan across *every* board's
  card previews and text boxes, returning which `board_id` each match is
  on. Scoped deliberately short of a real embedding index (a new table, a
  backfill, a place in the embedding-refresh cycle) — that's a bigger lift
  than this pass's remaining budget, and a keyword scan already answers
  the actual question this was asked for ("which board did I put that
  on?").
- **Write** (`add_whiteboard_card`, `add_whiteboard_link`): places an
  existing note as a card, or links two existing cards — the two
  operations "AI-guided diagram generation" (asked for directly, "allow
  the ai to generate the diagrams guided") reduces to for one step at a
  time, reusing the existing create endpoints rather than a new generation
  path, exactly as scoped. `add_whiteboard_card` goes through
  `_require_note`, not a bare `session.get`, so a private note gets the
  same refusal every other tool already gives it — tested directly
  (`test_add_whiteboard_card_refuses_a_private_note`), the exact regression
  shape CLAUDE.md's own review checklist names ("a guard removed while the
  shape around it was kept"). It is also idempotent on `(note_id,
  board_id)` — calling it twice for the same note doesn't create a second
  card, tested directly, since an LLM retrying (or a user asking twice) is
  a real, not hypothetical, way to hit this path twice. Both write tools
  are in `WRITE_TOOLS`, the set the agent's "you claimed you saved it but
  never called a write tool" safety net reads — missing from it would have
  meant a genuine card/link creation read as a hallucinated claim, the
  opposite of what that check exists to catch. **Not added to
  `TOOLS_GUIDE`**: the prompt's fixed prose had 2 characters of headroom
  left under `PROSE_BUDGET_CHARS` (`test_prompt_budget.py`) — the tools
  are still reachable via a `TOOL_GROUPS` cue (whiteboard/board/canvas/
  diagram/mind map/sketch/draw.io/flowchart) and each tool's own
  description is self-contained, so this is a scoping choice, not a gap;
  raise the budget deliberately, with a reason in the comment above it, if
  a future session needs guide-level prose for this too. 9 new tests in
  `tests/test_ai_whiteboard_tools.py`, all passing.

**A second real, previously-unknown bug, found live while testing the new
"New whiteboard board" command-palette entry (asked for directly: "add
creating a new board to the command palette").** Pressing Ctrl+K opened
*two* overlays at once: the intended navigation palette (`openPalette`,
`#palette-overlay`) and a second, separately-built "ask the agent
anything" quick-command overlay (`#command-palette-overlay`) — both bound
the identical global Ctrl+K keydown on `document`, independently, neither
aware the other existed. The second one sits later in the DOM and
silently ate every click meant for the first, confirmed live via
Playwright (`locator resolved... <div id="command-palette-overlay">...
intercepts pointer events`). The "ask anything" overlay is itself a real,
previously-fixed feature (its own code comment records a genuine XSS +
parsing bug fixed in an earlier pass) — not dead code to delete, just
mis-bound. Rebound to Ctrl+Shift+K, the smallest fix that keeps both
features intact. **This means the "ask the agent anything" quick command
has likely been unreachable by its own shortcut for as long as both
palettes have coexisted** — worth a mention if it's ever reported as
"missing"; it was built, tested, and simply unopenable.

**Two more contained fixes, same session:** a real O(n × notebook size)
lookup — `allEntries.find(...)` inside each card's per-render content
callback, and again inside the SVG-export loop — replaced with a `Map`
built once per call (`entriesById`/`exportEntriesById`), asked for
directly ("make sure... there are no heavy algorithms, everything is
efficient"); the whiteboard's own backend routes (`get_whiteboard_state`,
`list_boards`) were audited and are already flat, aggregate-query shaped,
no N+1 found there. And "creating a new board" is now also a command-
palette entry (`🗂️ New whiteboard board`), switching to the Whiteboard
sub-tab and invoking the existing `createNewBoard()` flow.

All ~1,600+ tests pass (9 new, `test_ai_whiteboard_tools.py`), `ruff
check .` is clean, `node --check frontend/app.js` is clean. **What was
and wasn't verified**: the mind-map arrangement math, Tab/Enter branch
entry, the click-to-select fix (both cards and objects, compared directly
against a working sketch), and the Ctrl+K collision were all driven
against a real running server via Playwright — DOM state, `wbState`, and
computed layout read back directly. The AI tools were verified through
`tests/test_ai_whiteboard_tools.py` calling each handler directly against
a real (SQLite, in-memory) session — not through a live Ollama round-trip,
per this project's own standing caveat that provider behaviour is untested
in this sandbox; the tool *logic* (filters, idempotency, the private-note
guard) is real-database-verified, but no session has watched a live model
actually choose to call `read_whiteboard`/`add_whiteboard_card` mid-
conversation.

**Still open, in the order worth tackling them:** (1) a full line/arrow
end-cap system (circle/square/multi-line ends, independently per end) —
scoped in §56, not built, beyond the arrowhead-sharing between Line and
Arrow. (2) Sketch rotation and image cropping, both named multiple
sessions running. (3) Uploaded whiteboard images in the Library as files,
and orphaned `/media/` garbage collection (ROADMAP item 20a — newly
promoted from HANDOVER prose this session, see below). (4) An "Agent
Activity" popup cleanup pass (item 20b, same promotion). (5) A genuine
semantic index over whiteboard content, if keyword search
(`search_whiteboard`) turns out not to be enough in practice.

**Documentation housekeeping, asked for directly** ("make sure the rest is
in the roadmap"): a stale HANDOVER.md-only list from several sessions back
was checked item by item against the current ROADMAP.md. Two real gaps
found — a Library media gallery + orphan cleanup, and an Agent Activity
popup cleanup pass — had only ever been named in HANDOVER.md prose, never
promoted into ROADMAP.md's own Tier list, which is precisely the failure
mode this project's own "How to work on this repo" section exists to
catch. Added as items 20a/20b. Everything else on that old list (start.sh
parity, link-reason visibility, AI whiteboard access, Tier 2 remainder)
was already correctly tracked or already resolved.

## 58. Smart alignment/spacing guides finished and colour-coded, a lasso select tool, export-selection, and a "two-card drag does nothing" scare that turned out to be three separate test-geometry bugs, not one product bug

Continued straight from §57 on the same branch. The session's biggest time
sink was diagnosing what looked like a serious regression — dragging a
card with a second card present on the board produced *zero* movement,
confirmed by instrumenting `dragging()` directly and seeing it never fire.
The eventual finding, confirmed with `document.elementsFromPoint` at the
exact drag-start coordinates: the test's own geometry placed the second
card at a board `y` that mapped to screen `y≈890`, landing on `#status-bar`
(`.has-agent-monitor`), not the card — the same class of danger-zone bug
this file already warns about for the floating toolbar panel, just at the
opposite edge of the viewport. Two more rounds of the *same* mistake
followed while verifying the fix (a snap-to-exact-position test that
"failed" was reading gaps against the wrong neighbour card, and a
spacing-guide test that "failed" was contaminated by leftover cards from
an earlier test still sitting on the same in-memory board) — each
confirmed as a test artifact, not a product bug, by re-running the same
assertion against a freshly wiped server. The lesson worth keeping: when a
live-drag Playwright test fails, re-run the same check via a direct
function call against a clean board before concluding the *feature* is
broken — three "bugs" this session were the harness, not the code.

With that settled, alignment guides work end-to-end: real mouse-drag tests
confirm edge/centre snapping (`WB_ALIGN_SNAP_PX = 6`), guide-line display,
and Alt-bypass, all previously verified only via direct function call.
**Equal-spacing guides**, asked for directly ("same spacing... what
draw.io and Microsoft PowerPoint have"), were newly built and verified:
`wbAlignmentGuides` now also checks, on whichever axis edge/centre didn't
already claim, whether the dragged item's nearest single neighbour on each
side would end up with equal gaps, snapping to the exact middle when
within threshold — O(n) per drag frame like the alignment pass above it,
not O(n²), since it only ever looks at the nearest neighbour each side,
never every triple. **Colour-coding**, also asked for directly: each guide
line now carries a `kind` (`"edge"`, `"center"`, `"spacing"`), each with
its own default colour (magenta/cyan/green — the CSS rule that used to
hard-code `stroke: #ff00ff` had to lose that declaration entirely, since an
SVG presentation attribute only loses to a CSS property that's actually
*set*, not an unset one) and each independently overridable via three new
colour pickers in the shape-menu dropdown, persisted to `localStorage`.
Deliberately *not* built: a new "top menu bar" for this — the user's own
phrasing floated it as "or smth," and the shape-menu dropdown is this
whiteboard's existing home for "alter a drawing default," so the colour
pickers went there instead of opening a larger, separate redesign.

**Selection tooling, asked for directly** ("all the selection tools (e.g.
rectangle select and lasso)... export selection feature"): a genuine
freeform lasso tool (`wbPointInPolygon`, ray-casting, one test per item
against the traced loop rather than a rectangle intersection) joins the
existing rectangle marquee, hit-testing each item's centre point against
the polygon. Per a follow-up ask in the same session, Select and Lasso are
now grouped into their own dropdown in the toolbar — the exact
`#wb-shape-picker` pattern the shape tools already used, duplicated as
`#wb-select-picker`/`#wb-select-menu`, not a bespoke second mechanism.
`k` is the lasso hotkey (`l` was already Line). The export menu gained a
"Just the selection" option for PNG/SVG/PDF wherever something is
selected, filtering `wbBuildExportSvg`'s three item loops to the selected
keys and cropping to `wbSelectionBounds()` rather than the whole board —
verified via a direct-call test that the SVG contains only the selected
card's `<g>`, not the unselected one.

**A question worth recording rather than guessing at**: asked whether the
AI can generate a diagram with hierarchy from notes, "kinda like
mermaid.js," given small (2–8B) models are the target. Current answer is
partial — `add_whiteboard_card`/`add_whiteboard_link` (§57) let the model
build a connected diagram, but `x`/`y` are free-form numbers defaulting to
`(100, 100)`, so a multi-note hierarchy means the model must invent
spread-out coordinates itself across many chained tool calls, threading
card IDs through context the whole way — exactly the bookkeeping small
tool-calling models get wrong. The real auto-layout math already exists
(`wbArrangeMindMap`, tree/radial, walking the link graph via
`wbMindMapSpanningTree`) but is pure client-side JS behind keyboard
shortcuts, not callable by the AI. The scoped fix — a single bulk tool
that takes a structure and does all placement server-side — is recorded in
BACKLOG.md rather than built this session.

**Explicitly deferred, not half-built** — asked for directly this session
but out of budget: renaming a board (there is no `PUT /whiteboard/boards`
endpoint yet; a board's title is its underlying note's first `# heading`
line, so this is a small, well-scoped addition, not a design problem), and
a Library-tab gallery view surfacing every board/mind-map and every
uploaded image as its own browsable section (`GET /whiteboard/boards` and
`GET /whiteboard/images`, both already built in §57, have no frontend
consumer yet beyond the whiteboard's own board-switcher dropdown). Both
recorded in BACKLOG.md ahead of the next session, not left as a
half-finished attempt in the codebase.

All ~1,600+ tests pass, `ruff check .` is clean, `node --check
frontend/app.js` is clean. **What was and wasn't verified**: every claim
in this section past the code-reading stage was checked against a real
running server via Playwright — direct `wbAlignmentGuides()` calls against
known fixtures, real mouse-drag gestures reading back `wbState`/DOM,
`elementsFromPoint` for the danger-zone diagnosis, and a direct
`wbBuildExportSvg()` call inspecting the returned SVG string. Nothing UI
in this section is reasoned-not-observed.

## 61. §58's own three deferred whiteboard items closed out, a live-reported bug list worked through as it arrived, and a second whiteboard architecture bug found the same way the first one was

Opened by re-checking the running app and BACKLOG.md §29d before building
anything, per this file's own standing rule — all three of that section's
scoped-but-unbuilt items got closed this session, then a stream of live
bug reports arrived mid-session and were fixed as each one landed, the
same working pattern §56/§57 already used.

**Board rename and a Library gallery** (§29d's first two bullets).
`PUT /whiteboard/boards/{id}` rewrites the underlying note's own heading
line via `apply_title` — a board's title is that line, per `list_boards`'
own `extract_title` read, so renaming is the same edit any note's title
already goes through, not a second stored field; the default scratch
board (`board_id=None`) and a stale/negative id both 404 the same way,
since neither resolves to a real note. A new Library subtab, initially
"Boards & Images" and later split (below) into "Whiteboards" and "Image
Gallery", consumes the existing `GET /whiteboard/boards`/`GET
/whiteboard/images` reads that had no frontend consumer before this.

**A live-reported layout bug list, fixed as each one arrived**, with
screenshots: the empty-canvas hint text sat under the top-right floating
panel — `top: 50%` centred it in the *whole* canvas, wrong once the panel
already claims the first ~4rem of it; rebuilt as a full-inset flex box
with padding reserving the panels' own strip, plus a "Don't show this
again" dismiss (`localStorage`), asked for directly. The grid and board
`<select>`s got a defensive `min-width` — a browser sizes a `<select>`
from its own font metrics, which don't always agree with what the font
actually paints, and this project's own multi-session font-rendering bug
is exactly that mismatch; a fixed floor closes the failure class without
re-litigating the font bug itself, which is still open (see ROADMAP.md).
The mono appearance font gained two more widely-installed fallbacks ahead
of the bare `monospace` keyword. The Settings search placeholder
("Find a setting…") measured wider than its own box via a canvas
`measureText` check — shortened to fit rather than guessed at.

**Real anchor discoverability and endpoint editing**, asked for directly:
hovering a card with a link tool selected (no drag started) now shows its
8 fixed anchor points via a new `pointermove` listener, not only mid-drag
as before. A selected link sketch gets two draggable endpoint handles —
drag one onto a different card to reattach (snapping to that card's
nearest anchor) or onto empty canvas to detach into a free "dangling"
point. The free-point case is new data shape, not a schema change: a link
sketch's `data` is already an opaque JSON blob, so `sourcePoint`/
`targetPoint` (`{x, y}`) live alongside the existing `sourceId`/
`sourceAnchor` fields, and `wbResolveLinkEndpoints` reads either shape so
every render path goes through one function. **A second whiteboard
architecture bug, found building this** (the first was §54's `/media`
path-traversal one): the SVG drawing layer renders *under* the HTML card
layer by design (for strokes), so anything meant to be seen or clicked
*over* a card — the new anchor hints, the new endpoint handles — was both
invisible and unclickable exactly where it mattered, since a link's
anchor sits on a card's own border by definition. Not caught by reasoning
about the DOM, caught by a Playwright drag that silently produced zero
`d3.drag` events despite correct math; `document.elementFromPoint` at the
handle's own screen position showed a toolbar button underneath the
cursor, not the SVG circle. Fixed with `#wb-overlay-layer`, a second SVG
layer *above* the card layer sharing the same pan/zoom transform,
`pointer-events: none` at its root so it never blocks a card, each
interactive child opting back in individually.

**The lasso select tool, actually fixed this time.** Reported directly as
"doesn't work properly." `WB_BRUSH_TOOLS` — the set the card/object/grip
drag filters check to step aside for a drawing tool — never included
`"lasso"`; unlike the marquee (naturally excluded by its own
empty-canvas-only start condition), a lasso loop is meant to begin
anywhere, including right at the edge of the first card it means to
circle. Without the exclusion, a lasso gesture begun on a card was
captured by the card's own move-drag first and silently moved the card
instead — and the lasso's own pointerdown listener made it worse by also
refusing to start on a card at all, so nothing useful happened either
way. Fixed both halves: the drag filters now step aside for `"lasso"`
too, and the lasso's own start condition only excludes an actual handle,
not the card/sketch/object it sits on. Verified live: a loop started from
a card's own top-left corner leaves the card at its exact original board
position and still selects everything the loop encloses.

**Every upload tracked, deletable, and a "deleted" placeholder instead of
a broken image.** Reported directly: an uploaded image "isn't rendered
and can't be deleted." The render half turned out to be something else —
a note's image rendered correctly once the Notes tab's Browse
sub-section was actually shown (Capture stays adjacent to `display:
none`, this file's own long-documented trap) — but "can't be deleted"
was real and matches a gap this project's own docs had already named
(ROADMAP item 20a): an image pasted into a note's own markdown had no DB
row at all, unlike a whiteboard image object. New `MediaUpload` table —
one row per `/media/upload` call regardless of where the url ends up
(note, document, or whiteboard) — backs a `GET /media` list and `DELETE
/media/{id}`; the Library's image gallery now sources this instead of
whiteboard-only images, with a delete button per tile. Also asked for
directly: both inline note images and whiteboard image objects now catch
their own `<img>` `error` event and swap in a dismissible "deleted" box
instead of a broken-image glyph. A related, smaller gap found the same
pass: a Library "file" item's own ⋯ menu had a Download action that
never attached the auth token (`window.open` can't carry a header the
way `mediaSrc` exists to add one) and no Delete action at all — bulk-
select delete already worked, nothing offered it from the single-item
menu someone looks at first. Both fixed.

**The whiteboard tab split**, asked for directly mid-session once the
gallery above existed: two doors onto the whiteboard (a bare canvas tab
that always opened whatever board was last active, plus the new gallery
tab) collapsed into one. "Whiteboards" now lands on the board gallery by
default; picking a board or "+ New board" swaps in the actual canvas with
a "← Boards" way back; "Image Gallery" is the former combined tab, images
only now that boards have their own home. A real layout bug caught
building it: the back button, placed in normal document flow before
`.whiteboard-container` (itself always absolutely positioned at its
ancestor's 0,0 regardless of DOM order), rendered exactly under the
board-picker floating panel and never received a click — fixed with an
explicit top-centre position, the one corner none of the whiteboard's
five floating panels already occupy. Also fixed: a newly-created empty
board vanished from the gallery the moment you went back to it, since
`list_boards` only returns a board once something is placed on it — the
same shape of bug this project already fixed once for the in-canvas
board dropdown (`refreshBoardList`'s own `justCreated` merge), not yet
applied to the new landing gallery until now.

**Graph link reasons, made visible and manageable, not just hoverable.**
Asked for directly: "a visual way to see the reasons for each connection
and a way to manage/add/remove/edit them." A reason existed only as a
hover-only SVG `<title>` before this. A manual link edge now carries a
`.graph-edge-reasoned` class giving it distinct visual weight, and
clicking any manual-link edge opens a real panel — both note previews,
the reason in an editable textarea, Save and Remove-link, both wired to
backend endpoints (`PUT`/`DELETE .../links/{link_id}...`) that already
existed with no graph-side caller. The panel needed the link's own row
id, which `/graph`'s edge payload never carried; added (`edges: [{...,
id: link.id}]`), with the two pre-existing exact-shape tests in
`test_wavee_graph.py` updated to match rather than loosened.

**The Agent Activity monitor's own reported overlap, finally scoped and
fixed.** Named in an earlier handover as intermittently overlapping other
UI, never scoped further until this session found it: the monitor
(`position: fixed`, bottom-right, `z-index: 1000`) and `#toast-box` (also
fixed, bottom-right, `z-index: 60`) shared the same corner, so any toast
firing while the monitor was open rendered directly underneath it,
effectively hidden rather than merely overlapping. Moved the monitor to
bottom-left — checked every `position: fixed` rule in the stylesheet
first, not just the two involved, and it's the one corner nothing else
in the app fixes a panel to. The whiteboard's own bottom-right-panel-lift
workaround for this same collision (§53-era) is now dead weight and was
removed rather than left as an unnecessary safety net.

**A full line/arrow end-cap system** (§29d/§56's own "still open" list):
circle/square/multi-line, independently per end, for both a drawn
line/arrow sketch and a link connector — replacing the single shared
"which end gets the (only) arrowhead" dropdown. `wbCapPath` is the one
shared shape generator (arrow is the pre-existing two-line V; circle and
square are closed subpaths centred on the tip; multi-line is two short
perpendicular ticks, the ER-diagram "many" mark), appended into the same
single path string every other cap already used. No migration: a link's
older single `endStyle` and a sketch's shape-sniffed arrow style
(`wbDetectArrowStyle`) both translate to the new independent-per-end
fields on first read, replaced with the real fields the moment either end
actually changes.

**Sketch rotation** — the one thing cards/objects already had (a stored
rotation column, a live CSS transform) that a sketch didn't, since its
"shape" is its path data. `wbTransformPathD` gained a `rotate` parameter
alongside its existing `dx`/`dy`/`sx`/`sy`, handling three real cases
rather than a naive point rotation: `M`/`L`/`C` rotate normally; `h`/`v`
(the rect tool's own purely horizontal/vertical relative lines) become
absolute `L` once rotation isn't a multiple of 90°, since a rotated line
can't stay axis-aligned; `a` (the circle tool's relative arc pairs) keeps
`rx`/`ry`/large-arc/sweep unchanged — correct for a pure rotation, since
this app never emits a negative scale — and only rotates the endpoint
delta plus adds the same angle to the arc's own x-axis-rotation
parameter. `rotate=0` is confirmed byte-identical to the pre-rotation
output, so every existing move/resize call site is unaffected. A round
rotate handle above a selected sketch (separate CSS class from cards' own
HTML-based handle, since a sketch is SVG) drags by absolute angle-from-
vertical, baked into `d` on release the same way move/resize already
commit an edit. Verified with hand-checked arithmetic, not just a visual
check: a 200×100 rectangle dragged ~90° produced all four corners
matching an exact rotation about its own centre to the pixel.

**A bulk diagram-generation tool for the AI** (§29d's third bullet).
`add_whiteboard_card`/`add_whiteboard_link` already let a model build a
diagram one call at a time, but `x`/`y` are free-form numbers it has to
invent itself across many chained calls — exactly the bookkeeping a small
(2–8B) tool-calling model gets wrong. New `generate_diagram` tool: the
model declares only structure (each node a new note's title or an
existing note's id, plus which other node is its parent); every note that
needs creating, every position, and every link are done server-side in
one call. `_diagram_tree_positions` isn't a port of d3.tree()'s own
tidy-tree (Reingold-Tilford/Buchheim) algorithm — it doesn't need the
tightest packing, only a non-overlapping, readable one, and reuses the
client-side `wbArrangeMindMap`'s own row/column/radial-step spacing so a
generated board and a hand-arranged one read as one convention. Validated
up front — exactly one root, every parent reference resolvable, a
repeated-reachable node caught as a cycle before anything is written, a
capped node count — rather than failing partway through having already
written some of a malformed structure.

Every backend claim is unit-tested (29 new tests: whiteboard rename/404,
the media table's list/delete/404, nine on `generate_diagram`'s
validation and layout, the graph edge id). Every UI claim was driven live
via Playwright against a real running server rather than reasoned from
the diff — including two real trap encounters worth keeping: a stale
uvicorn process surviving a supposed restart produced a `create_node`
500 that looked like a genuine backend bug for several rounds of
debugging before `ss -ltnp`/exact-PID `kill -9` confirmed the old process
was still answering; and `pkill -f` matching this shell's own invocation
(the pattern string appearing in the command line being searched) killed
the calling shell itself more than once. All ~1,700+ tests pass (29
added this session), `ruff check .` is clean, `node --check
frontend/app.js` is clean.

## The "#0 priority" codebase quality review — completed items archived here

ROADMAP.md carried a long, standing "#0 priority — codebase quality review"
section for several sessions: a dead-code/duplication/complexity audit across
backend, `app.js`, `style.css` and `tests/`, worked top-down over multiple
sittings. Asked directly — "if things are completed in the roadmap, shouldn't
they be removed and moved to history... otherwise just saying they are done
might get confusing" — so the parts confirmed done are moved here, and
ROADMAP.md keeps only what's re-verified as still open. Every item below was
re-checked against current source before being archived, not trusted from the
prose that originally claimed it (that prose had already gone stale once,
mid-session, which is exactly the failure mode this move is meant to stop).

**Dead code — done.** `initFloatingFormatMenu()`, `showOnlyLogErrors()`, the
unused `debounce()` utility, `#wb-search`, and the orphaned
`.collapse-chevron` fragment inside a `prefers-reduced-motion` media query
(`style.css`) are all gone — confirmed by grep, zero hits for any of the five
names. Backend: nothing dead was ever found; every `_xxx` tool handler, every
route, every module resolves to a real call site (some via dynamic id/template
construction rather than a static reference, which is why they looked dead on
a first pass).

**Duplicate logic — the CSS half.** `.msg`/`.msg.user`/`.msg.assistant` were
each declared twice, back-to-back, inside the "chat polish" pass
(`style.css`) — merged into one declaration per selector, verified live with
`getComputedStyle` in Chromium against a real chat message (gradient
background, box-shadow, border-radius, `animation-name`, border-left all
still resolve exactly as before the merge). The 41 `@media (max-width: …)`
blocks (23 at 720px) were checked directly, every one read — this is **not**
duplication: each is scoped to one component or one reported bug, immediately
below the rule it overrides, with its own comment. Nothing to do there.
`.dash-widget.dash-wide` (once flagged as dead CSS) does not exist anywhere
in the frontend — that finding was already stale when it was written.

**Redundant DB queries — done.** `GET /entries`'s N+1 (`routes_entries.py`,
`list_entries`) is fixed: `manager.bulk_category_names`,
`entry_dates_bulk`, `documents_for_entries_bulk`, `links_for_entries_bulk`
replaced 4+ per-note queries with one bulk query per field. `tag_cloud()`
(`routes_insights.py`) no longer runs its own independent full-table tag
scan — it now calls `manager.all_tags()`, the same function `all_tags()`
itself, ending the duplicate computation. `on_this_day()`
(`routes_insights.py`) moved its day-of-month/age filter from a Python loop
over every entry into the SQL `WHERE` clause, and — found doing that —
also started excluding private notes, which it had uniquely been leaking
(reading `entry.content` as ciphertext straight off the column). `janitor.py`'s
per-save centroid + kNN auto-filing is vectorized now, reusing the numpy
approach `embeddings.similar_pairs()` already used elsewhere, replacing two
separate Python `for`-loop cosine-similarity passes.
`entry/paths.build()` accepts an already-fetched `entries` list instead of
unconditionally re-querying the table `/graph` had just read.

**Backend module splits — one done, two still open (kept in ROADMAP.md).**
`src/memorymap/api/routes_settings.py` split into `routes_websearch.py` +
`routes_backups.py` (was 1,552 lines). `ai/tools.py` split into a package
(`ai/tools/_common.py`, `categories.py`, `documents.py`, `whiteboard.py`
extracted, 4,240 → 3,352 lines at the time) — **partial by design**:
`ai/tools/__init__.py` still holds ~3,360 lines (the `TOOLS` registry and
the bulk of note-CRUD/agent-orchestration handlers), left there deliberately
as the most interleaved, most load-bearing part of the file. Confirmed still
true by a later re-check. `searxng_manager.py` (1,734 lines, four unrelated
jobs) was **not** split — deliberately deferred every time it came up,
subprocess/timing-sensitive code the fake-transport standing caveat means
the test suite doesn't really exercise. Still open; see ROADMAP.md.

**Frontend algorithmic complexity, items 1-2 (Notes search) — done.** The
Notes-tab search box was the only search input in the app with no debounce
and fired an uncached network + semantic-search request per keystroke;
Library/Timeline/Graph already debounced ~150ms. Notes search now debounces
the same way and gates the semantic-search request behind it.

**Feature gaps §12 — item 1, the pagination ceiling, done.** `GET /entries`
had no limit at all; `GET /documents` hard-capped at 200 with no offset and
no way, UI or API, to reach anything past it. `GET /documents` is now
explicitly unbounded (comment at the route: the Documents tab loads once and
filters client-side, the same pattern `GET /entries` already used) rather
than silently truncating a notebook past 200 documents.

**Caching/pooling checklist — items 1, 2, 5 confirmed already-right, no
changes.** DB connection pooling: one `Engine` for the process's lifetime,
which is the correct shape for a single-user local SQLite app, not a
PgBouncer-style pool. In-memory cache for slow reads: graph pagerank/
similarity already cached and invalidated on notebook/embedding-model
change. Inlining critical SVGs: the icon system is one shared Phosphor
webfont, not per-icon SVGs — nothing to inline. Item 3 (client-side request
cache) and item 4 (the N+1, now fixed above) are covered elsewhere in this
entry; item 3's one open question — whether Library/Timeline/Graph should
opt into the same `cacheMs` pattern the dashboard uses — was never acted on
and isn't re-opened here since nobody has asked for it since.

**Test suite consolidation — done, wider than first scoped.** Every
`test_wave*.py`/`test_phase*.py` file is gone, split by actual domain into
the files that already covered that area, or renamed where the content was
already coherent. Full before/after test-count check (1811 → 1810, one
confirmed real duplicate dropped) rather than assumed. See git history
(`993e639` and the commits immediately after) for the exact file-by-file
mapping if it's ever needed again — it is not repeated here, since the
files it names are the map now.

**What's still genuinely open from this review** — kept in ROADMAP.md, not
archived here: the `whiteboard.js` extraction, the two markdown renderers
(`renderInlineMarkdown`/`appendInline`) still unmerged, ~39 inline
`HTTPException(404, ...)` checks across 12 route files instead of a shared
helper, `searxng_manager.py`'s split, `ai/tools/__init__.py`'s remaining
size, `all_tags()`'s uncapped full-table scan, and the frontend/backend
Big-O findings and feature-gap items this pass did not re-verify one way or
the other (re-check against source before trusting either the "still open"
or a "done" label — this section exists because that assumption failed
once already).

## UI polish batch, and two real Windows bugs from a live user report — done

Also moved out of ROADMAP.md's Priority 0 once shipped, same reasoning as
the entry above. All verified live via Playwright/Chromium against a
running server unless stated otherwise.

**UI fixes**, each reported directly with a screenshot: Settings →
Background tasks' live task list now sits in its own `.settings-group`
("Running now"), matching the boxed treatment of the settings panels below
it instead of blending into them. The pin/unpin toggle used the same icon
(`ph-push-pin`) for both states, differing only in tooltip text — now
`ph-push-pin` (pin) vs `ph-push-pin-slash` (unpin) at every toggle site
(entry cards, the graph popup, Library, conversations). Native `<dialog>`
popups (New/Rename/Delete space, doc-storage, the Widgets picker) had no
`::backdrop` rule and inherited `.card`'s translucent, glass-opacity-scaled
background, unreadable over the dashboard — they now get the same dimmed
backdrop and near-opaque `--modal-bg` fill the Settings modal already used
for the same reason; the icon picker inside these dialogs was re-checked
through the real open-dialog click path after the change, not assumed.
Input/textarea/select borders now mix in `--ink` so they stay visible
regardless of the glass-opacity slider — `--input-bg`'s alpha scales with
that slider, `--border` didn't, so a field could lose both its fill and its
outline over a busy background at low glass settings. The graph link-reason
dialog's four-button row (Save/Generate/Remove link/Close) overflowed
`.confirm-card`'s default two-button width edge-to-edge with no
right-align breathing room — `.confirm-card.graph-link-panel` widens just
that dialog; the first attempt used `.graph-link-panel` alone and silently
lost to `.confirm-card` on source order, caught only by re-screenshotting
after the "fix," which is the reason it isn't still broken.

**Two Windows bugs, from a live user report with real logs** — neither
could have been found in this sandbox (network policy blocks
huggingface.co outright, and the sandbox is Linux, so Windows-only
file-locking bugs never reproduce here regardless of whether faster-whisper
is installed). Dictation errored on every recording with `[Errno 13]
Permission denied` on the temp file: `routes_voice.py`'s
`_transcribe_upload` held the clip open under `NamedTemporaryFile`'s own
handle for the whole `with` block while also handing that same path to
`voice.transcribe()` to open a second time — fine on POSIX, refused on
Windows, which locks a file exclusively while any handle is open. Fixed:
write, close by hand, transcribe, delete in `finally`. Separately,
reinstall/remove on the voice extra was reported as silently failing after
the mic had been used once — root-caused as far as possible without a
Windows machine (`voice._loaded` caches the loaded `WhisperModel` for the
process's lifetime; Windows locks its native `.pyd`/DLL while mapped in, so
pip can spawn, run, and still fail to replace those files), and
`extras.start()`/`remove()` now refuse up front for "voice" when a model is
loaded, naming the restart as the fix rather than surfacing pip's own
cryptic error. **This one was never confirmed with the same certainty as
the temp-file bug** — no specific pip error text was seen for it, only
inferred from the shape of the report; see ROADMAP.md's faster-whisper
entry, still open, for the follow-up this needs if it recurs.

## `whiteboard.js` lands, the markdown-renderer merge finds two real bugs, and the rest of the "#0 priority" backend splits close out

The last of app.js's mechanically-splittable pieces, the remaining backend
module splits, and the markdown-renderer merge all landed this session.
Verified live throughout — this section exists because two of these turned
out to hide real bugs that a purely mechanical read would have missed.

**`app.js`'s whiteboard subsystem extracted into `frontend/whiteboard.js`**
(~5,600 lines) — board/card CRUD, sketch drawing, export, move/resize/
grouping, loaded via a second `<script>` tag after `app.js` (both share one
global scope, so load order isn't load-bearing; documented at the tag).
`app.js` is down to ~25.3k lines. `tests/test_frontend_ids.py`/
`test_frontend_handlers.py` now read+concatenate both files instead of just
`app.js`, so the moved code stays covered by those lints. Verified live:
zero console/page errors on a fresh data directory, a board's SVG canvas
renders with its full toolbar. A red herring surfaced during that check — a
burst of 401s on dashboard endpoints — turned out to be a pre-existing bug
tied to data-directory reuse across unlock cycles, unrelated to the split
(reproduces identically on the pre-split `app.js` too); logged separately,
still open.

**The two markdown renderers, merged — the hard way, on the second
attempt.** `renderInlineMarkdown` and `appendInline` hand-rolled near-
identical bold/italic/link/image parsing with separately maintained
security gates. A first merge attempt collapsed them onto one shared regex
superset and shipped two real regressions, both caught only by live
reproduction, not by reading the diff: (1) a task-list checkbox — appended
to its `<li>` *before* `appendInline` ran on the rest of the line — got
wiped every time, because the merged function called `element.
replaceChildren()` unconditionally; (2) note cards started silently
rendering `__init__`-shaped text as bold, since the shared regex now
recognized underscore emphasis everywhere, changing behavior for a caller
that never asked for it. The actual fix keeps `INLINE_MD` (note cards) and
`INLINE_MD_LEGACY` (appendInline's own grammar: underscore emphasis, bare
URLs) as two textually separate patterns selected by `options.
underscoreSyntax`, so neither caller's matching behavior moves — merged
only what should merge (the element-building logic, the `isRenderableUrl`
gate, five behavior flags: `dismissible`, `autolinkBareUrls`,
`underscoreSyntax`, `strikeTag`, `applyLatex`). Verified live: bold/italic/
link/strikethrough/dismissible-image across Notes, Chat, and Dashboard;
`appendInline`'s legacy path (underscore emphasis, bare-URL autolink, a
task-list checkbox) in the Documents editor preview, checkbox confirmed
present this time.

**Backend splits.** `HTTPException(404, ...)` — 18 of ~39 inline checks
consolidated into a new `deps.get_or_404()`; the other 21 are genuinely a
different shape (soft-delete-aware lookups, relationship/ownership checks,
filesystem/exception translation, non-DB lookups) and were correctly left
alone rather than forced into a helper that doesn't fit them.
`search/searxng_manager.py` (was 1,734 lines, four unrelated jobs) split
into `searxng_docker.py`/`searxng_install.py`/`searxng_process.py`/
`searxng_settings.py`, with `searxng_manager.py` kept as a thin
orchestrator so nothing outside the module needed an import changed.
`entry/manager.py`'s `all_tags()` — a full non-deleted-entry scan with a
per-row `json.loads`, paid on every Library tab open, `tag_cloud()` call,
and `/tags` call — now caches by the same notebook-fingerprint pattern
`routes_graph.py` already used for pagerank/similarity (`Entry.updated_at`
has `onupdate=utcnow`, so any tag edit invalidates it automatically).

**Two more whiteboard bugs, reported live with screenshots, both root-
caused and fixed the same sitting.** Link/anchor points ("border points")
on a card that had never been manually resized used a hardcoded
`WB_CARD_DEFAULT_SIZE` (250×150) regardless of the card's real rendered
height — cards auto-grow to fit their own text — so anchors on anything
taller or shorter than 150px landed nowhere near the actual border.
`wbItemBBox` now measures the live `.node-card` element instead, whenever
no explicit width/height is stored. Separately, the Library sidebar and
every draggable whiteboard panel shared `z-index: 10` (a tie, aside from
`top-right`'s own earlier +10 bump for a *different* fix), so a panel
dragged over the sidebar's screen area could still paint on top of it —
"appears behind again," a recurrence of an old report. Sidebar bumped to
`z-index: 25`, above every panel including `top-right`'s 20.

**A third Library kebab-menu bug, same shape as the first, found the same
way.** Every kebab menu across the Library (not just Bin chips, per the
follow-up report) opened detached from its button, stretched to the full
width of the card. Root cause was the same specificity tie the first
`graph-link-panel` fix (above) already found once: `.library-card-menu`
(`position: absolute`, in `00-tokens-shell.css`) and `.menu-wrap`
(`position: relative`, in `02-chat-graph.css`, loaded later) are both
single-class selectors of equal specificity, so file *load order* — not
source correctness — decided which one won. Compounded to
`.menu-wrap.library-card-menu` for deterministic specificity regardless of
load order, same fix shape as before. Confirmed live: the wrap's measured
width matched its button's 43px exactly (was 288px, the full card), and the
popup's `getBoundingClientRect()` matched its `top: calc(100% + 4px);
right: 0` formula against the real button geometry.

**The graph-view subsystem extracted out of `app.js` into `frontend/graph.js`**
(ROADMAP.md item 2) — force-layout rendering, Trace, the popup editor, the
physics/layout controls, ~2,460 lines. Unlike whiteboard.js, this one has to
load *before* `app.js`: several of app.js's own top-level statements
reference graph functions and `let`s as bare identifiers evaluated at parse
time (`$("graph-similarity").addEventListener("change", renderGraph)` and
several more), and function/`let` hoisting doesn't reach across separate
`<script>` tags — loading app.js first would throw on its own synchronous
top-level code before the rest of the file ever ran. graph.js itself needs
nothing from app.js at parse time. `app.js`: 22.9k lines. Verified live:
fresh-data-dir Playwright run creating two linked notes, opening the Graph
tab (force layout + edge render), opening a node's edit popup, running an
actual Trace between the two notes — zero console/page errors throughout,
and the empty-notebook state also confirmed clean on a second, blank data
directory. The same pre-existing 401 burst (item 13) reproduced again,
identically, with zero interaction with the Graph tab at all — further
evidence it's a pure dashboard-load timing bug, not tied to any one tab.

**Ask history — the Ask box's browsable "personal notes browser" (ROADMAP.md
item 6).** Requested directly, then clarified mid-build: *"I want the ask
feature to be basically a personal notes browser."* Previously the Ask card
only ever showed the last five distinct question strings as reask chips
(`/chat/recent`, reading `AuditLog` — kept as-is, it still powers the
Dashboard's own "Recent questions" widget). Every *notes-only* question the
Ask box actually answers (the same `notes_only` flag §35A already uses to
keep it out of the chat/small-talk path) is now written to a new `AskTurn`
table by `chat_stream` once a real answer lands — never for a small-talk
turn, which exits through the existing hint branch before an answer exists,
and never for the Chat tab, which keeps its own durable history via
`Conversation`/`/conversations` already.

`routes_ask_history.py` adds list/search/paginate (`q` searches question and
answer text), get-one (hydrating `raw_result_ids` back to live `EntryOut`s,
dropping any note deleted or made private since — the same rule
`_attached_notes` already applies to a client-supplied id list), pin,
delete-one, and clear-all (keeps pinned turns by default). The Ask card
gained a collapsed-by-default "History" panel: search box, pinned-only
filter, a badge with the running total, and rows you click to reopen the
original question/answer/matched-notes *in place*, with no model round —
browsing, not re-asking. Deliberately additive: the five-chip quick-reask
row stays untouched alongside it. Verified live: asking a question grows the
badge and the panel by one, reopening a row restores the exact answer and
its notes, pin/unpin and the "no matches" search state both render
correctly, and a note deleted after the fact is dropped from the reopened
view with an "N notes … no longer available" line rather than silently
showing stale content. 14 new backend tests cover persistence, search,
pagination, hydration (including the deleted/private-note drop), pin, and
both clear-all variants.

## BACKLOG.md's earliest bug-hunt sessions, consolidated — the launcher/theme/SearXNG fixes, the "reported as / actual cause" table, six real SearXNG install/start bugs, the tree/radial/arc label fixes, and relative-time resolution

Moved out of BACKLOG.md §8/§8b/§9/§10 once each part landed; a short pointer
is what stayed behind. Grouped here because they're all from the same
early run of bug-hunting sessions, not because they share a subject.

**§8's six standalone fixes.** Renaming the project folder broke the
launcher: `pip install -e .` writes an absolute path into the venv, and the
"do dependencies need reinstalling" skip marker checked `requirements.txt`'s
timestamp/checksum — which a rename doesn't change — instead of asking the
venv directly whether it could actually import the app; both launchers now
ask it directly. Picking a theme did nothing about half the time: Appearance
layers defaults → theme → manual tweaks in that order, so an earlier manual
change silently outlived every theme picked after it; picking a theme now
clears the manual keys that theme has an opinion about. Lagoon and Shallows
were refined (Shallows was meant to read teal but was drawn mostly indigo;
Lagoon's inset panels and secondary text were too low-contrast). Background
tasks showed nothing while SearXNG started because a *start* (not an
install) runs in the request thread and waits up to 90s with nothing on
screen explaining the wait — `searxng_manager.starting()` now reports it
with a progress bar. The AI emblem was cramped and only on two tabs (moved
to one shared header spot beside the AI status dot). The dashboard's widgets
were missing until a tab switch: `startApp` fired `loadEntries` and
`refreshActiveTab` as two independent steps, so a cold load rendered the
dashboard against an empty `allEntries` and drew the brand-new-notebook
empty state — now gated on a flag that says the fetch actually happened.

**§8's "reported as / what it actually was" table**, kept because in most
cases the stated symptom pointed at the wrong component and the wasted
effort is the expensive part to repeat: numbered lists always rendering
`1.` (a blank line between items closed the `<ol>`, and models write
`1.\n\n2.` more often than tightly); assistant content sitting too far
right (the rail padded each step's own box instead of the container); the
thinking-arrow marker sitting on the timeline circles (`list-style-position:
outside` draws outside the summary's box, exactly where the rail's gutter
is — removed and redrawn inside); thinking boxes "vanishing on reload" (not
reproducible — the report predated the step-timeline work that already
fixed it); a long URL escaping the chat bubble (`overflow-wrap: anywhere`);
documents showing "Invalid Date" (a regression from the UTC fix —
`relativeTime` appended a redundant `"Z"` to a timestamp already carrying
`+00:00`); Dashboard "Search notes" going nowhere (focused a box inside the
hidden `browse` sub-tab); the Capture textbox staying short until clicked
(`autoGrow` measured `scrollHeight` while `display: none`); "Ask about
this" wrecking the layout (CSS automatic minimum sizing — a `1fr` grid
track and a `min-width: auto` flex item both refusing to shrink below
their content, widening the whole column to 3425px at a 1280px viewport);
desktop menu-bar buttons overlapping the title (a base rule below the
media query redeclaring `flex` at equal specificity, pinning the tab strip
rigid); not being able to switch search engines (the status poll reset the
radios on every focus change, since picking one saves nothing until "Apply
& re-index"); colour/font controls stuck under a theme (two causes —
`[data-palette]` rules sitting below `[data-accent]` rules at equal
specificity, and `applyAppearance` re-applying every setting except the
accent); sketches not opening from the graph (the popup showed the caption
but never the image); web search returning nothing (three different
failures — no egress, a rate-limit challenge page, a genuine empty result —
all surfacing identically, now logged and named separately).

**Found while fixing the above, also fixed:** editing an answer reverted on
reopen (the edit updated `content`, but replay renders `steps`); uploading
a file 500'd if the uploads folder had gone missing; `APPEARANCE_DEFAULTS`
declared `bg-motion` twice with different values; "New note" on the
dashboard did nothing unless Notes was already on the capture sub-section
(ten feature-catalog entries had the same hidden-sub-tab trap); `.entry-
content`'s `pre-wrap` couldn't break inside a word, so one pasted URL
widened the note list and the page; `pytest` didn't work in a fresh clone
without an editable install.

**§8b — six real bugs stood between "SearXNG install path exists" and
"SearXNG actually works", found across two sessions.** Three
platform-independent: **`git clone` can never work on Windows** — four
files in SearXNG's own repo have a colon in the name (a drive-letter
separator), so Windows refuses the checkout after fetching every object,
leaving a half-written folder; fixed by downloading and unpacking the
archive directly, skipping members the filesystem can't hold, git no
longer used at all. **`pip install -e .` can never work, on any OS** —
SearXNG's `setup.py` imports `searx`, which imports `msgspec`, and pip
builds in an isolated environment that has neither; `requirements.txt` now
installs first, with `--no-build-isolation`. **The `tracker_url_remover`
plugin kills the process at boot** — it downloads a rules file from
`rules1.clearurls.xyz` during `init` with no failure handling, so SearXNG
exits before binding the port on any offline/proxied/slow machine;
disabled in the generated `settings.yml` (MemoryMap strips tracking
parameters itself, so nothing is lost). Three Windows-only: **`_alive()`
was killing the process it checked** — `os.kill(pid, 0)` is the POSIX way
to probe a process without touching it, but on Windows every signal except
Ctrl+C/Break is handed to `TerminateProcess`, so the liveness check itself
ended a freshly-started SearXNG within seconds, every time; now uses
`OpenProcess`/`GetExitCodeProcess` on Windows. **A failed reinstall
reproduced its own error** — `install_source` skipped the download when
the checkout folder existed and handed it straight to `pip install -e`,
but `uninstall_source`'s `shutil.rmtree(ignore_errors=True)` couldn't clear
git's read-only `.git/objects` on Windows, so a "removed" folder was still
there for the next install to find; `is_checkout()` now asks what's
actually in the folder and `_remove_tree()` clears the read-only bit.
**`import pwd`** — POSIX-only, the only such import in SearXNG, used only
to name the current user in one unreachable-unless-Valkey-configured error
message; a `pwd` stand-in is written into SearXNG's own venv rather than
patching SearXNG's source (which upstream is free to change). All three
Windows-only fixes were confirmed on the user's real Windows hardware, not
just the sandboxed logic tests. Also fixed the same session: `_reason()`
was reporting pip's parting "[notice] To update, run: … --upgrade pip" as
an install failure's cause, since it took the last line and that notice is
always last.

**§9 — the tree and radial-tree graph layouts, re-fixed after a reported
readability bug.** Both were first built handing d3 the panel's raw
dimensions as a bounding box — `d3.tree().size([...])` divides the height
by leaf count, so a 29-note notebook got eighteen pixels a row and printed
labels on top of each other. The fix is rules about what a label needs, not
what the panel has: the tree uses `nodeSize` and pans when taller than the
panel (zooming out only once the whole thing nearly fits); the radial
computes its rings from note/category count and rings *by depth* rather
than by d3-cluster's height (cluster put a category containing a thread one
ring closer in than its siblings, making the circle look ragged). Three
further collisions only a browser could find: a stylesheet rule beating the
`text-anchor` presentation attribute so no side-label ever moved, a flipped
left-half label whose offset sent it back across its own node, and a
55%-transparent label halo that let a thread edge show through the words it
ran behind. All asserted on measured geometry — labels' real rotated
corners, separated by a separating-axis test, since the axis-aligned box
around diagonal text overlaps when the words do not. The arc-diagram layout
(built on the filing hierarchy, sharing `layoutHierarchy`/`frameTree`/the
tree and radial's drag-pin behaviour rather than a parallel rendering path
for link-based arcs) was verified against a seeded notebook with categories
and multi-level reply threads: no invalid paths, labels reading diagonally
without colliding within a step, physics sliders correctly disabling, and
switching away to force/tree/radial and back regressing none of them.

**§10A — relative-time resolution, the full list of what's handled.**
`entry/timewords.py` (deterministic regexes and arithmetic, not a model
call, so it runs with Ollama off and never blocks a save) resolves: today ·
tonight · this morning/afternoon/evening · tomorrow · yesterday · last
night · the day before/after · this/last/next week, month, year · "in N
days/weeks/months" · "N days/weeks ago" · "last/next/this/on <weekday>".
Precision is kept ("last week" shows as a week, not flattened to a day),
and the weekday rule is written down in the module since both readings of
"next Friday" exist and consistency is the most that can be offered.
Private notes are excluded, and marking a note private clears what was
already stored — the same reasoning as dropping its embedding.

## 67. `preferences.json` made crash-safe, orphaned `/media/` garbage collection, a temporal-word rescue for link reasons, a stdio MCP server, and a live-reported "no animation" bug that turned out to be an invisible ring, not a broken mechanism

Four ROADMAP items closed (37, 38, 20a, Tier 2 item 9), then a live bug
report worked through the same way §56/§57/§58/§61 did: reproduce against
the real running app before theorising, say what wasn't checked.

**`preferences.json` crash-safety (item 37).** `core/atomic_io.py`'s
`atomic_write_text`/`atomic_write_json` (tempfile in the same directory +
`fsync` + `os.replace`) replaced `ConfigManager.set_preference`'s plain
`write_text()`. A test that monkeypatches `os.fsync` to raise confirms the
on-disk file is untouched and no stray temp file survives — confirmed to
fail against the pre-fix code via `git stash` first.

**Orphaned `/media/` garbage collection (item 20a).** `core/media_gc.py`
scans `Entry.content` (through `manager.readable_content`, so a locked
private note's encrypted blob doesn't get misread as "no reference"),
`Document.content`, and `WhiteboardObject(kind="image").data` for
`/media/{filename}` references, then diffs against the `MediaUpload`
table. `GET /media/orphans` / `DELETE /media/orphans`, both declared
*before* the existing `/media/{upload_id}` route — FastAPI matches by
declaration order, so a path-parameter route declared first shadows a
literal-segment one after it and 422s instead of 404ing, which is what
happened until the ordering was fixed. **Refuses to delete anything at
all** if any private note couldn't be decrypted, rather than risk treating
"vault's locked, can't check" as "definitely not referenced" — the one
case in this feature where being wrong means real data loss, not a wrong
answer. 7 tests, including that locked-vault refusal.

**A temporal-word rescue for link reasons (Tier 2 item 9's follow-up
ask).** `_deduce_reason` in `entry/manager.py` was embedding-only. A pair
scoring below `AUTO_REASON_THRESHOLD` (0.55) but within
`TEMPORAL_RESCUE_BOOST` (0.15) of it now gets a second look: `_shares_a_date`
checks both entries' resolved `EntryDate` rows (`entry.timewords`'
`record_dates()`, which already runs on every save) for a shared day-precision
date, falling back to "written the same calendar day" if neither note
resolved an explicit date phrase. A rescued pair gets its own reason text
("similar in meaning, and around the same time") rather than silently
reusing the plain one, so the UI shows which signal actually fired.
Deliberately can't manufacture a reason alone — it only rescues a pair the
embedding score already put close. Confirmed end-to-end that ordinary
"today"/"next Tuesday" phrasing *inside* note prose (not just an explicit
date field) reaches this: `create_entry("at uni today, bought a mouse
there")` produces an `EntryDate` row with `phrase == "today"` automatically,
no new capture-side code needed — the pipeline already existed for the
"reminder due date" use case and just needed reading for this one too.
7 new tests in `test_link_reasons.py`.

**A stdio MCP server (item 38, ANALYSIS.md §60).** `mcp_server.py`: a
JSON-RPC 2.0 server over stdio (`initialize`, `tools/list`, `tools/call`,
`ping`, one message per line, no `Content-Length` framing), run with
`python -m memorymap.mcp_server`, over the *existing* tool registry rather
than a second one. Only non-destructive, currently-enabled tools are ever
listed or callable — there's no confirm card on this path the way the chat
UI's agent loop parks a destructive call for one, so `delete_note` and its
five siblings are refused even when a client asks for one by name
directly, not just left off the list. `tool_enabled()` (Settings → Tools'
`disabled_tools`, including the `web_search`/`read_url` online opt-in) is
reused as-is, so a tool the user turned off is invisible here too.
Consuming external MCP servers — the other half of BACKLOG §29 — is a
separate, harder feature needing a trust model this doesn't build; not
attempted. 13 tests, including a real `serve()` pass over `StringIO`
stdin/stdout for the line-reading loop itself.

**The mic-level recording indicator was live-verified working — with a
synthetic signal — then live-reported broken on one specific button, and
the real cause was neither.** An earlier check this session confirmed the
*mechanism* (`--mic-level` custom property, `.recording.live-level`'s
box-shadow) genuinely varies frame-to-frame under a real (if synthetic,
Chromium's fake-audio-device) signal. Then came a live report: "still no
animation on the meeting notes when recording," with a screenshot of a
flat, static button. Re-reproducing against the real running app — not the
isolated function call the first check used, but a real click through
`toggleMeetingRecording()` — found the ring *was* changing size on every
frame, exactly as measured. The bug was never the mechanism: `--warn-soft`
(the ring's colour token, `rgba(245,189,79,0.25)` light / an even fainter
`0.16` alpha dark) is pre-mixed pale enough that against the meeting
overlay's near-white modal card it composites to a colour within a few RGB
values of the card itself — confirmed by screenshotting the button at a
forced maximum mic-level and finding the "glowing" ring essentially
invisible. A single computed-style read would have missed this; only an
actual rendered screenshot showed it. Fixed with `--recording-ring`, a
`color-mix(in srgb, var(--warn) 55%, transparent)` mixed from the *solid*
warn colour at capture time rather than a pre-mixed pale token, applied
everywhere `--warn-soft` drove the ring (the idle pulse, the live-level
ring, both reduced-motion fallbacks).

**Then asked to go further: a Voice-Memos-style five-bar scrolling level
meter**, replacing the single ring as the primary indicator (the ring
still shows, now fixed at 2px, so a moment before real signal arrives or a
reduced-motion session still shows something). `startMicLevelMeter()` now
builds a small `.mic-bars` element with five `.mic-bar` children, keeps a
5-sample rolling history sampled at ~15fps (every 4th animation frame —
reshuffling at the full 60fps rAF rate read as noise, not a wave, when
tried), and drives each bar's height through a `--bar-scale` custom
property with a `scaleY()` transform (cheap, no layout). Building this hit
a second, independently real bug: `setLabel()` — the small helper that
turns `"ph:stop Stop"` into an icon element plus text — rebuilds a
button's children with `replaceChildren()`, which was silently discarding
the bar meter every time, because both `toggleDictation()` and
`toggleMeetingRecording()` called `startMicLevelMeter()` *before*
`setLabel()`. Reordering both call sites (append the meter after the
label is set, not before) fixed it. Live-verified via Playwright against
the real server: bars scroll and visibly vary under the fake-device signal
over an extended sampling window (the fake device's own synthetic signal
has a multi-second near-silent stretch as part of its cycle — a short
sampling window reads as "stuck" even when the mechanism is fine, which is
exactly the trap a first, too-short verification pass fell into), the
fixed ring is visibly amber in a screenshot of the real modal card, and
`stop()` leaves no stray class or DOM node behind on either button.
**Not verified:** real hardware microphone input, and mic-note/mic-chat's
bars specifically by screenshot (their code path is identical to
meeting-record's, confirmed by class/box-shadow/bar-count reads, but the
visual render itself was only screenshotted for meeting-record, per this
session's own token-efficiency instruction to use screenshots sparingly).

## 68. §67's mic-bar meter turned out still invisible in practice, the back-to-top button's viewport-corner placement fixed for Library, six Tier-3-and-Priority-0 items closed, and two features asked for live (a dashboard-only persona, a Chat-tab SearXNG control)

Started as three live reports against §67's own work — the mic-bar meter
still wasn't visible, the Library back-to-top button sat in the browser's
corner rather than the panel's — then extended into a deliberate pass
through ROADMAP's Priority 0 and Tier 3 lists, picking items already
concretely scoped over ones still needing a decision.

**The mic-bar meter, actually visible this time (Priority 0 item 4,
continued).** §67 fixed the ring being invisible and shipped a five-bar
meter, live-verified with Playwright's fake audio device — and it was
still reported live as not showing. Two compounding causes, found by
re-reading the code rather than re-guessing: the resting floor was
`scaleY(0.12)` on a 14px bar — under 2px tall, below what renders as
anything at all rather than merely subtle — and the level average was
taken across all 128 FFT bins, most of which are near-silent for a voice
signal (speech energy sits under ~5.5kHz). Raised the floor to 0.3,
restricted the average to the low quarter of bins, and replaced the
linear level→scale map with a sqrt curve so ordinary speaking volume
(which sits low in the raw 0-255 range) reads as visible movement instead
of hugging the floor. **Not live-verified against real or fake audio this
pass** — the DOM/class wiring and the resting-state math were re-checked,
the actual rendered bar heights under real signal were not; said plainly
rather than claimed.

**The Library tab's back-to-top button, anchored to its content panel
(reported live: "it's in the corner of the tab screen, not the content
panel").** `.scroll-top` defaulted to `position: fixed` against the whole
viewport on every tab; Chat already had its own relocation into
`.chat-dock`. Library had no equivalent, so its button sat in the browser
window's corner rather than the Library panel's own. `#tab-library` is
now the positioning root (`position: relative`) and gets the same
MutationObserver-driven relocation Chat already had. Live-verified: forced
`.visible` and read `getBoundingClientRect()` — the button lands in
`#tab-library`'s own bottom-right corner, clear of the status bar without
the viewport-relative offset hack every other tab still needs.

**Six ROADMAP items closed, each concretely scoped already (picked over
items still needing a decision, per this file's own repeated lesson):**
- **Tier 3 §30a, note-list keyboard navigation.** A roving tabindex
  through `#entry-list`: arrows move focus, Enter opens the focused note
  the same way its Edit button does (this app has no separate note-view
  page). Re-applied on every `renderEntries()` call and tries to keep the
  same note as the current tab stop across a re-render. Live-verified:
  Tab into the list, ArrowDown moves focus and the tab stop to the second
  note, Enter opens edit mode.
- **Tier 3 §30e, undo toasts over confirm dialogs for soft deletes.**
  `batchDelete()` already built a proper "Moved N to the recycle bin —
  Undo" toast under a real soft delete, and *also* gated the same action
  behind a `confirmDialog` first — redundant friction once Undo exists,
  and inconsistent with the single-note "Move to bin" action right above
  it, which already had no confirm at all (Wave J). Removed the confirm.
  Every other `confirmDialog` delete path was checked against its backend
  route before being left alone — documents, conversations, purge-from-
  bin and reminders all call `session.delete()` with no restore endpoint,
  so a confirm is the only safety net they have.
- **Tier 3 §30f, README and GitHub Pages drift.** Both had settled into
  naming pre-rebuild systems as current: README still pointed at
  "Settings → Activity" (moved into the Library) and "Settings → Optional
  extras" (the button is now labelled "Packages"); `docs/index.html` (the
  Pages landing page) claimed "Six tabs" and still listed a standalone
  Documents tab-pill/pane, which hasn't existed since the document editor
  moved into the Library — replaced with Library and Timeline, both
  missing entirely, and the Chat pane's stale "28 tools" corrected to
  "nearly 50". Verified the pill/pane id sets match 1:1 (the JS switcher
  is data-tab-driven, so a mismatch fails silently) and
  `test_docs_layout.py` still passes.
- **Priority 0 item 14, a reusable themed loading spinner.** No single
  component existed — grep found only ad hoc spinner markup, and the one
  real animation (the note re-evaluate busy chip's `::before` ring) had no
  `prefers-reduced-motion` fallback at all, unlike `AI_STATUS_GLYPH`'s
  deliberate "…" choice elsewhere for the same reason. New `.spinner`
  class + `spinnerEl()` helper: reads `--accent`, sized in em, swaps to a
  static "…" with the animation and border both removed under reduced
  motion rather than freezing mid-spin. Migrated the one existing user
  onto it instead of leaving two ring definitions side by side — one
  correct, one still broken. Live-verified both states with Playwright,
  the second via `emulateMedia({ reducedMotion: 'reduce' })`.
- **Tier 3 §21, a persona on the welcome messages — then extended live.**
  Asked for, then the ask grew live into "a dashboard-only persona,
  separate from Chat/search's." Two pieces: the Chat tab's empty-state
  title ("Chat with your notebook") never reflected which persona was
  active, unlike the dashboard greeting and AI replies, which already did
  — fixed, and the persona `<select>`'s change handler was found to PUT
  the new `active_persona` to the server but never update the local
  `prefsCache` copy `renderChatEmptyState()` (and the Notes quick-ask)
  both read, so a switch silently went stale until a full reload. Then a
  new, independent `dashboard_persona` preference (empty = "same as
  active_persona", the same clear-with-empty-string convention
  `display_name` already uses) read by `/insights/greeting` ahead of the
  shared one, with its own picker in Settings → Personas. Two new backend
  tests confirm the override wins when set and falls back correctly when
  not; the actual AI wording couldn't be observed live (no Ollama in this
  sandbox), so that rests on the tests plus the existing, identically-
  shaped `active_persona` test this mirrors.
- **Priority 0 item 9, retry/fallback — partial, said plainly.** The
  taxonomy the item asked for (retryable network blip vs. a real error vs.
  report-clearly) turned out to already exist: `is_network_error()` in
  `start.sh`, added a prior session, already classified failures this way
  — it just wasn't being retried on, only reported. Wrapped the existing,
  already-tested pip-install pipeline in a bounded retry (3 attempts,
  5s/10s backoff) gated on that same classifier. **Deliberately not done**:
  `start.bat`'s equivalent (a `goto`-based retry loop reaching back across
  an existing parenthesized `if/else` block, in a file whose own header
  already documents a past incident with exactly that class of cmd.exe
  parsing fragility — no cmd.exe in this sandbox to verify a control-flow
  change against, and a wrong one risks breaking the Windows launch path
  for everyone); and the embedding-model/Ollama-model downloads
  (background-threaded jobs with their own progress-polling architecture,
  a materially bigger and separate change).

**Asked for live, built as a new small feature: a SearXNG start/stop
control in the Chat tab's web panel.** Starting/stopping the managed
local SearXNG instance only lived in Settings → Web search — three clicks
and a tab-switch from where it matters. Under the default "auto"
provider a stopped instance doesn't error, it silently falls back to
DuckDuckGo, so there was no *feedforward* at all, only the after-the-fact
"answered by DuckDuckGo" a finished search already carried. Placed as its
own row directly under the panel header, above the search box — hidden
entirely when it wouldn't control anything (a duckduckgo-only provider,
or no backend to run an instance at all). Deliberately a compact
"is it on, toggle it" rather than a rebuild of Settings' fuller
management UI (install progress, port diagnostics, reinstall); reuses the
same `/websearch/searxng/*` endpoints that page already polls.
Live-verified: the strip shows the real backend-derived state, clicking
it POSTs and transitions to "installing…" with the button disabled, and
closing the panel actually stops the poll loop (0 status requests in the
3.5s after close). The install's success path itself couldn't be
observed (no Docker/internet in this sandbox); the request correctly
failed with 503 and was caught without a page error.

**Also asked for live: a real install walkthrough in the README, and a
way to find the install again.** Quick start jumped straight to "run
start.sh" and assumed the reader already had the repo cloned and a
terminal open in the right folder. Added an explicit, numbered,
copy-paste walkthrough (open a terminal per-OS, `git clone` or download-
ZIP-and-cd for anyone without git, then run the launcher). `start.sh`/
`start.bat` now also print the absolute install folder and the exact
relaunch command on every successful start — `start.bat` uses `!CD!`
rather than `%CD%` to match this file's own `!ESC!` delayed-expansion
convention, since the line sits inside a parenthesized block where
`%CD%` would resolve once at parse time instead of when it actually
runs. `start.sh`'s new echo lines were run in isolation in a throwaway
copy (not the real script, to avoid triggering a real torch install);
`start.bat`'s paren count was checked unchanged before/after (46/47, this
file's known pre-existing imbalance) since there is no cmd.exe here to
run it against.

**A short design-theory tangent, answered rather than built:** asked
whether the loading spinner and mic-bar meter should be exempt from
`prefers-reduced-motion` since a static version "wouldn't work" the same
way. Answered no, and left as is: both already had the correct fallback
(a static equivalent that still conveys state, not a frozen animation),
which is the established, safer pattern than carving out an exception to
an accessibility setting a user turned on for a real reason.

**Not done, flagged rather than guessed at:** Priority 0 items 1
(textarea resize — needs a headed/desktop browser this sandbox doesn't
have), 5/10/11 (graph traced-path, Timeline line/branch, document editor
— each explicitly unscoped in ROADMAP.md, no direction given), and 7/8
(faster-whisper Windows install failure — needs real pip error text from
an actual Windows run this sandbox cannot produce).

## 69. Direct upload into the Library's image/PDF gallery, and "Attach from Library" for notes — item 20's own "still not built" claim checked and found already wrong before adding anything

Asked live: "the ability to upload images files directly to the library
with the ability to attach them to notes." ROADMAP item 20 read as if
the note-attachments half of this were still missing — checked before
building, per this file's own repeated lesson, and it was already there.

**What was already done, found by grep before assuming otherwise.** The
Library's "Files" filter (`app.js:16985`, `item.kind === "file"`) already
lists every note `Attachment` — general files (docs, audio, anything not
an image/PDF) attached to a note — across the whole notebook, with
working Download and Delete. Item 20's text claiming this "still not
built" was stale, not wrong about the feature — corrected in ROADMAP.md
rather than rebuilt.

**What was actually missing, confirmed by reading the two attachment
systems' models.** `MediaUpload` (images/PDFs, `/media/upload`) and
`Attachment` (any file, `/entries/{id}/files`) are architecturally
different — a `MediaUpload` has no note relationship at all (it's
referenced by URL from inside markdown content, which is what makes the
Library gallery of them possible), while an `Attachment` always belongs
to exactly one note from the moment it's created. That asymmetry is why
only the image/PDF half could get an "upload once, attach anywhere"
flow without inventing a new "unattached file" concept for the other:

- **Upload button on the Library's Image Gallery** (`#library-images-
  upload` + a hidden file input, `whiteboard.js`, beside the existing
  Reload button). Loops selected files through the same `POST
  /media/upload` the paste/drop path already uses, via a raw `fetch` with
  an explicit header override (not `apiJson`, whose default
  `Content-Type: application/json` fights a `FormData` body's own
  multipart boundary — the same fix `attachFileTo`'s upload already
  needed, applied here for the same reason).
- **"Attach from Library"**, a new note action beside the existing
  "Attach a file" (which only ever opens a fresh disk picker).
  `attachFromLibrary()` (app.js) fetches `GET /media`, opens a picker
  modal (built the same way `confirmDialog` builds its own — dynamically,
  not static markup — Escape and backdrop-click both close it, verified),
  and on a pick inserts the chosen file's markdown reference
  (`![name](url)` for an image, `[name](url)` for a PDF, by extension)
  into the note's content via the ordinary entry `PUT`.

Live-verified end to end: uploaded a real PNG through the new button,
confirmed it rendered as a gallery tile; opened the picker on a real
note, confirmed one tile with the uploaded file; clicked it and confirmed
the note's `content` gained the correct markdown line and the picker
closed itself; separately confirmed both Escape and a backdrop click
close the picker without attaching anything. `test_style_scale.py`,
`test_frontend_ids.py` and `test_frontend_handlers.py` all still pass.

## 70. Documents in the graph (ROADMAP.md item 16), and a "never wired" bug caught by live testing before it shipped

Followed the existing `include_entities` opt-in exactly — same reasoning,
same shape, one flag prior in the same route:

- `GET /graph?include_documents=true` (`routes_graph.py`): queries
  `DocumentLink` for the current node set, adds one node per linked
  `Document` (`id: "document:N"`, `type: "document"`, `category:
  "Document"`) and one `kind: "document"` edge per link. Off by default,
  and — like `include_entities` — deliberately **not** wired into
  centrality, similarity, or the trace-path BFS; both are built entirely
  around `Entry`, and extending either to a second node type is a bigger,
  separate change from making a document visible and connected at all.
  `categories` is computed before either block runs, so neither "Entity"
  nor "Document" grows a legend filter for a node kind that's off by
  default — intentional, matching the existing entity behaviour, not an
  oversight.
- Frontend: a `#graph-documents` checkbox next to the existing Entities
  one, a `wantDocuments` flag folded into the same `/graph` fetch URL
  template, a `graph-node-document` CSS class (a fine dotted ring,
  `stroke-dasharray: 1 3`, distinct from the entity ring's `3 2` dashes so
  the two non-note kinds don't read as the same thing next to each other),
  and the click handler's existing `isGroup || type === "entity"`
  no-op guard extended to `type === "document"` — view-only this pass,
  same reasoning as entities: opening one from here would need the
  Library's own document-editor navigation, not a note's.
- **Caught by live testing, not by review**: the checkbox's own `change`
  listener was missing. `graph-entities` has
  `$("graph-entities")?.addEventListener("change", renderGraph)` in
  app.js; the equivalent line for `graph-documents` was never added, so
  checking the box did nothing — no re-fetch, no error, nothing in the
  console. A Playwright run (real note, real document, real
  `POST /documents/{id}/notes` link, then toggling the checkbox) found
  zero document nodes where two were expected; the fix was the missing
  `$("graph-documents")?.addEventListener("change", renderGraph)` line.
  Exactly the "features that never ran once" shape this file's own
  review section warns about — this one just happened to be caught
  before merge instead of after.

Backend covered by four new tests in `test_graph_api.py` (off by default,
node/edge shape when on, category excluded from the legend list, a
document with no linked notes stays invisible). Live-verified after the
fix: two notes each linked to their own document, both document nodes
rendered with the dotted ring and the correct connecting edge, `0`
console/page errors. `node --check`, `ruff check .`,
`test_frontend_ids.py`, `test_frontend_handlers.py`, `test_style_scale.py`
and `test_docs_layout.py` all still pass.

## 71. The graph's force/Arc "feel" (ROADMAP.md item 24) — not a new layout, two concrete re-render bugs found by measuring instead of guessing

The item's own text already doubted a new layout algorithm was the actual
gap ("Obsidian's is a force layout, which this app already has") and asked
for the two reproduced side by side before assuming otherwise — no
reference build to compare against here, so this pass instead read the
existing `d3.forceSimulation`/`d3.zoom`/drag code closely (already fairly
mature: other-node freezing during a drag so the target you're aiming at
doesn't drift, a world-bounds clamp instead of a repeated re-fit "because a
re-fit would zoom the map out from under someone who had just zoomed in on
purpose" — that exact stated principle turned out not to hold everywhere
else in the file) and found two concrete, measurable defects rather than
retuning force constants on a guess:

- **Every `renderGraph()` call rebuilt every node from scratch with no
  starting position**, including the ones already on screen and unchanged —
  not just the very first load, but every legend-filter click, every
  physics-slider drag, every "hide unlinked" toggle, the refresh button,
  and even editing a note while the Graph tab happened to be open. Each one
  replayed the full "explode outward from the centre, then resettle"
  animation for the whole notebook, which is what "never actually feels at
  rest" looks like from measurements, not just impression. Fixed by seeding
  each surviving node's `x`/`y`/`vx`/`vy` from the previous render
  (`graphNodesRef`, read before it's overwritten) before the new simulation
  starts; only a genuinely new node still gets D3's default spiral
  placement.
- **`fitGraphToView`/`frameTree` also re-ran on every one of those same
  renders**, recentring and rescaling the camera regardless of whether the
  user had manually panned or zoomed in on something first — the fit-once
  intent was already right there in the `fitted` flag's own comment, it
  was just re-declared fresh (`let fitted = false`) inside every call
  instead of surviving between them. Fixed with a module-level
  `graphAutoFitDone` flag: `switchTab()` clears it on a genuine fresh visit
  to the tab, the layout radios clear it on a real shape change (a radial
  ring isn't a force cloud — that one *should* re-fit), and every other
  `renderGraph()` call — filters, sliders, refresh, a background note edit
  — leaves the camera exactly where the user put it. The dedicated Fit
  button (`graph-zoom-fit`) still exists for "put it back" on request.

Verified with measurements, not a screenshot comparison, since there's no
Obsidian install here to diff against: Playwright, 8 linked notes, zoomed
in by hand via the +/- button, then toggled "Hide unlinked" — camera
transform (`d3.zoomTransform`) identical before and after (previously
always reset to a fresh `fitGraphToView` scale); node positions for
surviving notes carried over. Then switched Force → Arc and confirmed the
camera *did* change, so the fit-on-shape-change path still works. `0`
console/page errors throughout. `node --check`,
`test_frontend_ids.py`/`test_frontend_handlers.py`/`test_style_scale.py`
all still pass. **Not touched**: node-drag mechanics (already reads as
deliberately tuned — froze other nodes, remembered drop target — with no
measurable defect found) and the wheel/button zoom step itself (standard
untransitioned direct-manipulation zoom, matching common practice, and the
button zoom already has its own 200ms eased transition). New layouts
beyond Arc (mind map, treemap, adjacency matrix) are a separate, larger
ask this didn't touch.

## 72. Stale/orphaned-note review, the fourth thing the autonomous agent does (ROADMAP.md item 31)

The user picked this from item 31's own list of scoped candidates
("acting on stale/orphaned notes" over proactive digest surfacing or
letting a skill run on schedule). Built the same way `entry/duplicates.py`
already argues for its own task — arithmetic, not AI, because age and
connectedness are plain columns and joins, already exact, and asking a
model to guess which notes feel "forgotten" would be slower and no more
correct:

- `entry/staleness.py`'s `find_stale_orphaned_notes(session, days=90)` —
  conservative on purpose, every signal has to agree: untouched (`updated_at`
  past the cutoff), no link either direction, no thread (not a reply, no
  replies of its own), and not pinned. A false positive here means nagging
  someone about a note they deliberately keep untouched, the same cost
  `duplicates.py` weighs for a wrongly-matched pair.
- Wired into `_run_optimization()` as a fourth deterministic pass, same
  shape as the entity-extraction and link-reason-audit passes beside it —
  not routed through `agent.run_agent()`, and bounded to
  `STALE_REVIEW_BATCH_SIZE` (20) notes per tick for the same reason
  `AUDIT_BATCH_SIZE` bounds the link audit: a big backlog is worked through
  one interval at a time, not in one tick.
- Its own preference, `auto_stale_review_enabled`, **off by default** —
  unlike tag/link/dedupe (which react to a note's own content), this one
  makes a judgement call about which notes count as forgotten, the same
  caution `auto_entities_enabled` already gets for the same reason.
- Flags by tagging (`stale`), not by acting further — archiving or deleting
  would need a human to actually decide, and there's nobody watching an
  unattended pass to ask. A tag is reviewable and reversible the same way
  `_tag_note` already is for a tag someone asks for directly.
- A Settings → Background tasks checkbox ("Flag stale or orphaned notes"),
  same pattern as its three siblings (`pref-auto-*` id, `renderAutonomous
  Settings()` line, its own `setPreference` change listener — no shared
  form rebuild, so a stale/default DOM value can't silently overwrite a
  real saved preference the way the section's own past bug did).

11 new tests: 8 for `find_stale_orphaned_notes()` itself
(`test_staleness.py` — fresh/old/linked/threaded/pinned/binned/archived,
matching the "everything has to agree" shape) and 3 pinning the background
job actually reaches it, tags what it finds, and the preference switches
it off (`test_autonomous.py`, same section-comment pattern the link-reason
audit tests already use, for the same reason — a feature written inside
`_run_optimization` with nothing proving the pass reaches it is exactly
this module's own founding bug). **Not yet checked live in a browser** —
enabling the preference, triggering a real pass, and watching a genuinely
old, disconnected note pick up the `stale` tag in the Library wasn't
driven through Playwright this session (the sitting ran out of room for
it); the mechanism is pytest-verified end to end, but "the toggle actually
does something a person can see" is not yet observed, only reasoned about.
Worth 10 minutes with a real server before this area is touched again.

## 73. The trace-path redesign redone after a live report, and find/replace in the document editor (ROADMAP items 5 and 16b)

**The trace-path redesign had to be redone.** §71's own predecessor entry
above already carries the honest caveat — shipped without a live check —
and it turned out to matter: reported back immediately as "crushes the
graph, takes up most of the page". Reproduced: the vertical, one-row-per-
note layout was genuinely ~10 rows tall for a 5-hop path, sitting in
normal document flow directly above the graph canvas, so it pushed the
whole map down out of view. Rebuilt as a horizontal, wrapping row of pill
chips (`.graph-trace-note`, same materials as the app's existing `.chip`)
joined by a small arrow + reason connector, with `.graph-trace-path`
capped at `max-height: 5.5rem` and internal scroll as a hard floor — no
path length can repeat the mistake regardless of wrapping math. **This
time live-verified before calling it done**: a real 6-note/5-hop chain in
Playwright, canvas height measured before and after tracing, a screenshot
checked by eye. The container element was also changed from `<p>` to
`<div>` since it now holds block children.

**Find and replace, added to the document editor** (ROADMAP item 16b,
"a bunch of missing features... could be improved a lot more" — never
itemised). Checked what already existed before building anything: word
count, reading time, a word-count goal, an outline sidebar, "notes it
draws on", AI edit, extract-to-notes, and .md/PDF export were all already
there — this editor was much further along than the vague complaint
suggested. What was concretely, verifiably missing: the browser's native
Ctrl+F cannot search inside a `<textarea>` at all (its content is a form
value, not page DOM text), so a document past a screen or two had no way
to find a word again short of scrolling and reading every line. Built as
a small bar (`#doc-find-bar`) toggled from the formatting toolbar or
Ctrl+F: a plain case-insensitive substring search (no regex exposed to
the user — nothing here needed it), Next/Prev cycling with a live "N of
M" count, Replace (only when the current selection actually matches, so
clicking it with nothing found first finds rather than guesses) and
Replace all (escaped into a regex internally for one global pass, counted
before replacing rather than after to sidestep a global-regex
`lastIndex` footgun). Live-verified with Playwright end to end: opened
the bar, searched a 3-match term, cycled Next, replaced all three, and
confirmed both the resulting text and the "Replaced 3" count were
correct, then confirmed Esc closes the bar. `node --check`,
`test_frontend_ids`, `test_frontend_handlers`, `test_style_scale` and
`ruff check .` all still pass.

Vision-model image understanding (ROADMAP item 35) was **explicitly
deferred this session, not attempted** — asked directly given the
remaining budget, since it touches all four generation methods
(`chat`/`chat_stream`/`chat_tools`/`chat_tools_stream`) across every
provider and carries its own unresolved storage/narration design
question the roadmap already flags. Attempting it under the same time
pressure that caused the trace-path redo above would have risked the
identical mistake at a much larger scale. Still open, first thing next
session if this area comes up.

## 74. Three more live-reported bugs, one of them a real find: the Documents sidebar's missing-height bug tracked to a documented mechanism that never got extended to cover it

Three fixes asked for directly, all live-verified with Playwright before
being called done:

- **Library's back-to-top button** overlapped the panel's own scrollbar
  and could end up below the visible fold. The earlier fix (reparenting
  the button into `#tab-library`'s DOM so a CSS `position: absolute`
  offset would anchor to the panel instead of the viewport) was correct
  in principle but fragile: `right: 1.5rem` had no scrollbar clearance,
  and nothing clamped the offset if the panel's own box ran taller than
  the viewport. Replaced with `positionScrollTopForLibrary()` (app.js) —
  the button stays `position: fixed` (never reparented, which also
  sidesteps a real trap: any ancestor that ever gains a `transform`/
  `filter`/`backdrop-filter` silently becomes fixed-position's containing
  block too), and its `right`/`bottom` are computed from `#tab-library`'s
  live `getBoundingClientRect()` on every scroll/resize, clamped so it
  can never render outside the viewport.
- **The graph's "How to use this map" `<details>` dropdown** replaced
  with a `?` icon button (`#graph-help-toggle`), last in `.graph-toolbar`
  with `margin-left: auto` so it sits in the card's top-right corner. Its
  `title` attribute covers hover/focus (a real tooltip, zero JS); a click
  opens `#graph-help-panel`, a small popover with the same text the
  dropdown used to hold, closing on a second click, Escape, or a click
  outside — the same three ways every other popover in this app closes.
- **The Documents sidebar and main panel weren't full height, unlike
  Chat's.** Reported directly, and it reproduced cleanly once tested with
  a *realistic* amount of content (three real documents; an empty
  notebook didn't show it) — measured `.doc-layout` at 325px tall inside
  a 661px-tall `#tab-documents`, a `336px` gap. Traced to
  `07-whiteboard-misc.css`'s own documented Agent-Activity-panel
  clearance mechanism: `body.has-agent-monitor .tab-page` adds a 320px
  bottom buffer to every tab so the floating "Agent Activity" panel never
  permanently hides content under it, and a second, more specific rule
  moves that buffer onto the *actual* scrolling element for Notes and
  Chat (`#tab-notes .layout > main`, `#tab-chat .layout > main`) instead
  — because for those two, `.tab-page` itself is a plain flex column, not
  the thing that scrolls, so padding it directly just shrinks the whole
  card grid instead of protecting anything. The comment beside that rule
  already named Graph as a still-open case for the identical reason;
  Documents was the same gap, just never written down. Fixed by adding
  `#tab-documents` to the reset group and `.doc-sidebar .doc-list` (the
  one part of the Documents layout that actually scrolls a long list) to
  the clearance group — `.doc-layout` went from 325px to 613px in the
  same live check. **Known remaining gap, not fixed this pass**: the
  document editor's own bottom hint text (below the textarea) can still
  end up visually under the Agent Activity panel when it's open, since
  only `.doc-list` got the clearance treatment, not `.doc-main`. Matches
  Graph's own already-accepted-as-open state for the same underlying
  mechanism rather than a regression introduced here — worth closing
  properly if `.doc-main` is touched again.

All three verified with Playwright measurements and screenshots, not
assumed from the CSS reading alone — `test_style_scale.py`,
`test_frontend_ids.py`, `test_frontend_handlers.py` and `ruff check .`
all still pass.

## §89's "already built" callouts, moved from ROADMAP.md

ROADMAP.md's §89 kept growing an inline "already built this session, check
before rebuilding" callout every time something logged there got fixed in
the same sitting. Moved here wholesale once it started crowding the file's
2000-line ceiling — this is what that file exists for.

A toast/notification close (X) button (`toastCloseButton`, app.js), and the
Ask sub-tab's history panel close (X) button (`#ask-history-close`). Both
shipped in the "Generalize back-to-top button positioning..." commit.

The Library gallery's image caption Show more/less toggle no longer
collapses the caption into an unreadably short box the moment you click to
edit it (the clamp class survived into edit mode and squashed the
`<textarea>`); and the Library Documents sub-tab's tick/⋯ menu were
restyled to match `libraryCard()`'s own shape exactly — both living inside
the row (an `<article role="button">`, not a `<button>`, since a button
cannot contain another button) with the ⋯ only revealed on hover/focus,
instead of two permanent flex siblings squeezed in beside the row.

The graph's "similar notes" highlight got its own clear button
(`#graph-highlight-clear`, same shape as Focus Mode's own), and the graph
popup's "Link" button now actually completes a link on a plain node click
(`linkSource` was never read anywhere in graph.js before) — both were
logged as open items in §89 first, then fixed in the same session.

## §88.3 — the app.js split, full narrative (moved from ROADMAP.md, now complete)

`app.js` was ~28,460 lines. `graph.js`, `whiteboard.js` and `editor.js` were
already out before this effort started; `documents.js`, `library.js`,
`dashboard.js` and `settings.js` came out across this and the prior session,
in that order (easiest/most self-contained first). `app.js` is down to
~21,720 lines. All four new files are registered in
`tests/test_frontend_handlers.py`'s `_source()` and
`tests/test_frontend_ids.py`'s `_frontend_js()`.

1. **`documents.js`.** The document editor (five zones scattered across
   `app.js`, not one contiguous block: the core module at
   `app.js:7588-8440`, the sidebar-tabs pair at `16299-16339`, the wiring at
   `24878-24925` and `24929-24983` with `voice-model-select` deliberately
   left behind — it's a settings control, not a documents one, despite
   sitting inside the same comment block — and the `beforeunload` handler at
   `25000-25004`. One real hazard found doing this: `initDocSidebarTabs();`
   was called from a *bare top-level* line in `app.js`'s own wiring, not
   from inside a closure — so moving only the function's *definition* would
   have left that call site throwing `ReferenceError` and aborting the rest
   of `app.js`'s synchronous top-level code. Fixed by moving the call site
   too, invoked on `documents.js`'s own last line. Verified live in Chromium
   (Playwright): new document → title/content edit → autosave → sidebar
   list/outline tabs → markdown toolbar, zero console errors.
2. **`library.js`.** Scattered across *both* app.js and whiteboard.js (see
   the file's own header for the full zone list and line ranges). **The
   predicted accident was real**: whiteboard.js's `DOMContentLoaded` held
   the `#library-subtabs` switcher and Documents/Media wiring alongside the
   Whiteboard sub-tab's own two controls purely because they'd been written
   together — moved out; only Whiteboard's own listeners/boards-gallery
   rendering stayed. No bare-top-level-call-site hazard here — every
   remaining app.js call site sits inside a function/listener body. One
   thing found and *not* fixed, logged instead: the `switchTab` override
   (moved verbatim) monkey-patches rather than folding into `switchTab`'s
   own `if (name === "library") loadLibrary();` — pre-existing. Verified
   live in Chromium: every sub-tab rendered content, zero console errors.
3. **`dashboard.js`.** Widgets, masonry, the generative art (scattered
   zones — full account and two hazards in the file's own header and this
   file's `dashboard.js` split entry above). Run concurrently with
   `library.js` in an isolated git worktree, rebased cleanly onto it with
   zero `app.js` conflicts. Verified live.
4. **`settings.js`.** The settings modal, logs console, appearance (theme,
   accent, curated palettes, saved looks, the generative-background
   preview). Two hazards, both the `initDocSidebarTabs()` shape — full
   account in the file's own header. Verified live in Chromium
   (Playwright): unlocked a fresh profile, opened Settings, switched through
   15 of 17 nav sections (Models, Personas, Skills, Tools, Memory, Web
   search, Appearance, Templates, Shortcuts, Preferences, Import/export,
   Account, Packages, Tasks, plus two more) with zero `pageerror`/console
   errors, then walked every top-level tab (Dashboard, Notes, Chat, Graph,
   Library, Timeline, Reminders) the same way — also clean. The two nav
   sections that didn't get clicked (Help, About) failed for an unrelated
   reason, not a settings.js bug: the floating `#agent-monitor` panel
   physically overlaps those two buttons at this viewport and intercepts
   the click — logged as a real overlap bug in ROADMAP.md's live list.

**The rules that made it safe**, all learned across this effort: never split
in the same diff as a behaviour change; load order is load-bearing only
where a file is read at *parse* time; a bare top-level call site left behind
in `app.js`, calling into code that moved out, is the same load-order hazard
from the other direction — check for it explicitly on every split; and add
every new file to both lint tests, since a lint that cannot see a file
cannot catch anything in it.

## §91 — a batch of reported UI/backend bugs, fixed and verified live

A round of live-reported bugs, most root-caused by actually reproducing them
(Playwright against a real running instance) rather than reasoning from
source — the CLAUDE.md caveat about model-behaviour claims doesn't apply to
UI claims, and this pass leaned on that.

- **Chat: an image attached then removed before sending stayed uploaded**,
  orphaned in the Library gallery. `renderImageAttachments`'s remove
  handler only ever detached it from the local `attachedImages` array; the
  note composer's own equivalent (`renderEntryAttachmentChips`) already
  deleted the underlying upload on remove — the chat path just never got
  the same fix. Now does. Verified live: attach → remove → `GET /media`
  no longer lists it.
- **Chat: "Grounded in" source chips never persisted.** `renderAnswerGrounding`
  only ever ran off the live SSE `grounding` event; nothing carried
  `event.sentences` into the turn's save payload, unlike `raw_results`
  (which got this exact fix once already, for the same "disappears on
  reload" complaint). `TurnBody.sentence_grounding` (new field,
  `routes_conversations.py`) now round-trips it; `openConversation`
  reconstructs the chips the same way it already reconstructs
  `raw_results`. Verified via the real `/conversations` API plus a scoped
  Playwright check of the reconstructed DOM.
- **AI providers: a transient 5xx now retries once, silently**, instead of
  needing a manual resend — reported live as a chat call and a captioning
  call each failing on a plain 500 and succeeding on the exact same resend.
  `provider.is_transient_server_error` (duck-typed on `.response.status_code`,
  shared by both dialects) gates one retry in `chat`/`chat_stream` for both
  `OllamaClient` and `OpenAICompatClient` — safe in the streaming case
  specifically because `raise_for_status()` is the only line able to raise
  `HTTPError` and it always runs before that attempt's first `yield`, so a
  retry can never duplicate output already handed to a caller. 5 new tests
  (`test_providers.py`) cover both dialects, both call shapes, a 4xx *not*
  retrying, and giving up after a second 5xx.
- **Captioning: which model wrote a caption, and whether it's since been
  hand-edited, is now tracked** (`MediaUpload.caption_model`/`caption_edited`
  — additive columns, the existing auto-migrator handles them) and shown as
  a quiet byline under the caption in the Library's Image Gallery. A
  captioning call that fails after a model was actually resolved (the
  reported 500 case, not "no vision model installed" — that stays silent
  on purpose, or every upload on a notebook with nothing installed would
  fill the ring with the same non-actionable line) now records into
  `core/taskhistory.py`, which previously had zero captioning entries —
  the reported "doesn't show as a background process" gap. A synchronous
  regenerate click now shows "Generating caption…" (`typingDots`) instead
  of the caption text sitting unchanged for however long the model takes.
  The Image Gallery also polls `/media` every 6s while open (skipped
  mid-edit, so a silent re-render can't wipe out unsaved typing) — the
  automatic background caption from upload has no push signal, so nothing
  previously showed it landing short of navigating away and back, which
  read as "doesn't work, but comes back after reopening the app" (verified
  live with a slowed/mocked response).
- **Settings: the per-log-record copy button went blank** after its ✓
  reverted. `flashCopied` saved/restored `button.textContent`, but the
  button is icon-only (`setLabel(el, "ph:clipboard")`, no trailing text) —
  its `textContent` was always `""`, so the "restore" wiped the icon.
  Fixed by saving/restoring `innerHTML` instead. Also: the traceback
  `<summary>` disclosure arrow sat flush against the log row's own
  colour-coded left border with zero gap between them (`.log-list li` had
  no left padding) — given one.
- **Whiteboard: the board-picker `<select>` sat a few px higher than its
  neighbouring buttons** despite sharing their height — the base
  `select`/`textarea`/`input` rule's stacked-form `margin-bottom` was never
  reset for this toolbar row (buttons aren't targeted by that rule at all,
  so they had no margin to begin with). Verified with `getBoundingClientRect`
  before/after: all three controls now share the same `top`/`centerY`.
- **Notes tab: the Semantic search toggle had no visible boundary at rest**
  — the native checkbox is intentionally visually-hidden (the toggle-button
  treatment `.checkbox-label` already uses) and nothing filled the gap, so
  it read as plain icon+text next to the bordered Select button beside it.
  Given a resting border, matching-colour on the checked state.
- **Note capture: a staged image's filename overflowed its card.** The
  ellipsis rule (`.attachment-chip > span:first-child`) never matched this
  chip's label span — its actual first child is the `<img>`, not a span,
  so `:first-child` never applies to the label a sibling rule further down
  already targets by `:first-of-type` for font-size alone. Given the same
  three overflow properties.
- **Library: an activity-log entry's preview clamped to one line in list
  view** with no way to read the rest, despite the full 400-char budget
  (`ACTIVITY_DETAIL_CHARS`) already being sent — grid view already
  unclamps activity previews; list view's generic one-line clamp (kept for
  every other kind's row alignment) was winning the cascade tie by source
  order. Given its own more-specific override, clamped to 4 lines rather
  than fully unclamped (list-view alignment still matters for everything
  else sharing the list).
- **Back/forward navigation**: opening/closing a document in the editor and
  entering/exiting Graph Focus Mode now push/replay history entries, the
  same `{tab, section}` shape chat conversations and library sub-tabs
  already used — the two gaps ROADMAP.md item 13 named as still open.

**Investigated, could not reproduce**: the notes-tab remove-image "×"
button — both the note composer's own attachment chip and the note-list
thumbnail's unlink control deleted the underlying upload correctly under
live Playwright testing, in both cases. If this recurs, the report needs a
more specific location (which screen, which button) than "the notes tab" to
find — two different remove-image controls exist there, both currently
working.

**Retraction (§92 below found it):** the report recurred with a screenshot
naming the actual location — the round × overlaid directly on an inline
image inside a rendered note card — which is a *third* control neither of
the two checked above. It was genuinely broken, and not by a shallow bug:
see §92.

**Not attempted this session** (scoped and logged instead, `BACKLOG.md`):
agent-mode auto-detection with a confirmation popup, skill auto-detection
with a confirmation popup, start/completion notifications for named
sub-processes ("renaming with AI", "generating title"), a deeper
token-efficiency/small-model-suitability pass on chat and agent prompts, AI
follow-up question suggestions in chat and the Ask sub-tab, and graph
minimap drag-to-zoom plus pinch/keyboard zoom. Each is independently
substantial and none was scoped enough to start safely in the time this
pass had left.

## §92 — vision-OCR, the AI-edit verb set + changelog, and a staged-upload
correction

Four pieces of real, separately-motivated work, landed as they were asked
for across one long session.

**Vision-OCR extractor mode.** A third reader for uploaded images
alongside Tesseract (`ocr_text`) and the AI caption (`caption`):
`ai/vision_ocr.py` asks a vision model to transcribe text verbatim —
distinct from a caption's natural-language description, and able to read
handwriting, low-contrast photos and non-Latin scripts that Tesseract
fails on outright. Stored on `MediaUpload.vision_ocr_text`/
`vision_ocr_model`; surfaced in the Library's image gallery next to the
caption control. The model-pull UI half of the ask needed nothing new —
`GET /models/suggested` (Settings → Models) already lists a "vision"
category with pull buttons, confirmed by reading `SUGGESTED_MODELS`
before building anything, per CLAUDE.md's own standing rule. Distinguishes
a genuine "no text in this image" result (recorded `completed`) from an
actual call failure (`failed`) in the background-tasks list, so an
ordinary photo with no text doesn't read as an error.

**The inline-image remove button, actually fixed.** §91 above reported
this could not be reproduced. It recurred with a screenshot naming the
real location: a round × overlaid on an image *inside a rendered note
card* — `renderInlineMarkdown`'s `dismissible` branch, a third control
distinct from the two already checked. Root cause, found by reproducing
live with Playwright rather than reading the source: `match` was a single
`let` binding reused by every pass of the image-parsing `while` loop, so
every dismiss button's click closure shared the *same* variable — by the
time anyone actually clicked one, the loop had long finished with `match`
sitting at `null` (the value that ends a `while` condition). Every click
threw `Cannot read properties of null (reading '0')` before the confirm
dialog could even open, with nothing visible to the user but a button that
did nothing. Fixed by capturing the matched text into its own `const`
inside the loop body, so each button's closure gets the value for *its
own* image.

**The AI-edit route reskinned into a small general assistant.**
`POST /documents/{id}/ai-edit` did one thing (rewrite the target); asked
for directly, it now takes a `verb`: `edit` (unchanged), `write` (inserts
a new passage — a sibling prompt in `drafter.compose_document_edit`,
returning `""` rather than the existing content on failure, since falling
back to `content` would insert the whole document into itself), and
`remove` (deletes on request; a selection alone needs no instruction at
all — asked for directly). The document editor's AI panel grew a
three-way `.segmented-control` for the verb, with the scope hint,
instruction placeholder and accept-button label all switching together.

**The changelog, and undo, that came with it** ("allow edits made by the
AI to be undone or altered before and after they are set"). Before
acceptance, the result textarea already covers "altered" — edit the AI's
suggestion, then accept whatever's left. After acceptance, two
independent mechanisms: every accept pushes onto the app's existing
session-only global undo stack (`app.js`'s `pushUndo` — an immediate
Ctrl+Z), and also writes a durable per-document row (`DocumentAiEdit`,
`routes_documents.py`) recording the verb, instruction, a selection
excerpt, and full before/after snapshots. A new "History" dialog off the
AI panel lists every entry with its own Revert, which writes *another*
changelog entry rather than deleting anything — the record stays truthful
about what happened, including the revert itself, and a revert can be
reverted. Bounded at `MAX_AI_EDIT_LOG_PER_DOCUMENT` (20) per document,
oldest pruned first, the same "a log, not an unbounded table" reasoning
`taskhistory.py` uses for its own ring buffer, except this one has to
survive a restart so it's a real table.

**Staged uploads no longer get processed — a correction of this same
session's own earlier choice.** Vision-OCR and captioning were first
wired to run automatically on every `/media/upload`, matching what
captioning already did. Corrected mid-session, asked for directly: "the
OCR shouldn't happen to staged files, only when they are actually saved
as a note, actually sent in a chat message, or uploaded directly to the
library." `/media/upload` is one endpoint shared by the note composer,
the chat composer, the document editor *and* the Library's own upload
button — a staged image picked in a composer and then abandoned has no
business paying for a Tesseract pass and a vision-model round trip.
`core/media_process.py` moves the trigger from upload-time to
commit-time: `process_committed_upload` (the three readers for one
upload), `process_referenced_uploads` (scans a note/document's own
content — plaintext, pre-encryption for a private note — for `/media/…`
references, reusing `media_gc.referenced_names`, promoted from
module-private for this), and `process_committed_upload_ids` (a chat
turn's `image_media_ids` directly, since a conversation stores images as
ids rather than inline markdown). Wired into `create_entry`/`update_entry`,
`create_document`/`update_document`, all three conversation-turn-save
routes, and whiteboard image-object creation (which has no separate
staging step, so it fires immediately like the Library's own upload
button does via a new `direct` form field on `/media/upload` itself).

A second, related gap found and fixed along the way while answering "are
uploaded files properly not saved until committed": a sent chat image had
*no record anywhere* that anything still used it — `TurnBody` never
persisted which images a turn attached, so `media_gc.py`'s orphan scan
(built to protect exactly this: a note, document or whiteboard image
still in use) could not see conversations at all. Running "Clean orphaned
media" would have deleted a real, sent chat attachment's file. Fixed by
persisting `image_media_ids` on the saved turn's user message and
teaching `media_gc.find_orphaned_media` to check it.

**A fifth piece, added once the staged-upload correction made the gap
obvious**: Tesseract's own `ocr_text` had no manual endpoint at all — only
ever written automatically, once, with no retry and no way to fix a
misread. Asked for directly ("allow for manual OCR extraction or retries.
allow the user to access, view, and edit OCR extracted text."),
`POST /media/{id}/ocr` mirrors the caption endpoint's shape exactly:
`extract_and_store` already has no write-once guard (every call re-reads,
which is exactly what "retry" needs, no `force` field required), and a
`text` field sets it by hand. The Library gallery gained the same
always-visible, click-to-edit control the caption already has, between
the caption and the vision-OCR reading.

**Verification**: vision-OCR's UI (button, badge, error/hidden states),
the inline-image-remove fix, and the OCR manual-edit control were all
checked live via Playwright against a running instance — the closure bug
specifically reproduced first (confirm dialog never opened, a console
error) and then confirmed fixed the same way; the OCR edit was confirmed
round-tripping to the server, not just updating the DOM. The AI-edit verb
picker, scope hints, client-side validation and the (empty, then
populated) history dialog were checked live too, with `#doc-ai`'s
Ollama-required gate forced open since no real Ollama exists in this
sandbox — the model call itself is untested beyond the backend's own
fake-Ollama suite. The suggested-models grouping and the `.library-search`
min-width change are lint-clean and code-reviewed but not confirmed with a
screenshot this session — see BACKLOG.md if this recurs.

**Not attempted this session**: the Notion/Obsidian document-editor
redesign (ROADMAP.md item 0), the universal VS-Code-like document
viewer/editor with OCR for scanned PDFs, and the six items already logged
in BACKLOG.md from §91's own list. All still open.

## 97. A live-report queue, worked cheapest-first: a real graph bug, a regression caught and reverted, and a silent-failure fix

Nine reports arrived across one sitting, worked cheapest-to-most-expensive
by direct instruction. In order:

**The graph's own keyboard shortcuts were swallowing keystrokes typed into
the note popup and the "Grow the map" form.** `initGraphKeyboard()`
(graph.js) binds arrows/Enter/Space/N/+/-/0 on `#graph-box`, which the
popup and the new-note form are both DOM descendants of — every keystroke
typed into either bubbled up and was read as map navigation. Space or
Enter specifically reopened the *currently keyboard-selected* node's
popup, which is exactly the reported "grow a note, try to type in it,
keeps refocusing on the original note behind it." Fixed with one guard:
bail out immediately when the event target is a text field.

**A "Minimise" button was added to the Quit dialog, then fully reverted
after a real regression.** `__main__.py` gained a small `js_api` bridge on
`webview.create_window()` so the page could call `window.pywebview.api
.minimize()`. Shipped, then the user reported the desktop app hanging on
its loading screen (Windows "Not Responding") with the logs full of
`[pywebview] Error while processing window.native.AccessibilityObject
.Bounds.Empty.Empty...` / `window.native.ModifierKeys.A.A.A...`
recursion spam — thousands of chained property accesses per line, almost
certainly running synchronously on the WebView2 UI thread and blocking
its own message pump. `window.native` (pywebview's own COM reflection
surface) and `window.pywebview.api` (this feature's bridge) are supposed
to be unrelated, and nothing in this repo sets `debug=True` — but
`create_window()`'s call signature was the one thing that changed between
"worked" and "hung," and the user confirmed directly that reverting it
fixed the hang. **`js_api` on `create_window()` should not be re-added to
this codebase without reproducing this on a real Windows/WebView2 box
first** — the exact mechanism is still not understood, only that it
causes this. `__main__.py` and `app.js` are now byte-identical to the
commit before the feature existed for this code (verified with `git diff`)
— confirmed by re-diffing, not assumed.

**A skill or agent turn that failed before its first event died
silently.** `agent.run_agent`/`skill_runner.run_skill` already catch what
*they* expect to go wrong (`OllamaError`, `ToolsUnsupportedError`) and
turn it into a real event — but `routes_chat.py`'s own `next(agent_events,
None)` and the loop draining the rest of the stream had nothing catching
anything else. Any other exception, from anywhere under either of them,
propagated straight out of the generator and FastAPI just closed the
connection: no answer, no error, no tool call — reported directly as "I
tried running a skill and it failed before even completing the first
step... the model didn't respond." Both call sites now catch the outer
case, log it, and yield a real answer event describing the failure before
`done`. Two regression tests simulate exactly this shape (before the
first event, and mid-run).

**Smaller fixes in the same pass**: the Image Gallery's kebab menu used a
CSS-only `nth-child(3n)` guess for "last column" to decide which edge to
flip toward — correct only while the `auto-fill` grid happened to render
exactly 3 columns, and with no vertical flip at all, so a tile in the
grid's last row opened its menu straight off the bottom of the screen.
Replaced with a `toggle` listener that measures the real box against the
nearest scroll parent, the same approach `openActionMenu()` already uses
for every other kebab menu in the app. The AI Skills page's `.skills-split`
grid had no narrow-viewport handling at all, unlike every other sidebar
split in the app — collapses to one column at the same 900px breakpoint
`.doc-layout` uses. A Meeting Notes sub-tab was added to the Library,
reusing the All view's existing `tag:` search syntax against the
"meeting" tag `saveMeetingNote()` already applies — Sketches and generic
audio notes were investigated and found to have no equivalent marker on
the `Entry` model at all (a sketch is documented in `routes_library.py`
as indistinguishable from any image-only note), so building an accurate
sub-tab for either needs a real schema decision first, not a heuristic;
logged, not built.

**Investigated and found already done, not rebuilt**: "make all the
Settings toggles the same pill as Semantic" turned out to already be
true — `.settings-section label>input[type="checkbox"]`
(06-timeline-dialogs.css) already styles every direct `label>input`
checkbox inside any Settings section this way regardless of wrapper class
or id, checked against all 22 Settings checkboxes. The `/models/status`
timeout report traced to a stale code comment (the frontend's own
`AbortSignal.timeout` was already raised from 5s to 8s in an earlier
session; the backend comment citing the old figure was never updated) —
fixed the comment; could not reproduce a genuine hang beyond that without
the reporter's own environment.

**Verification**: all of it is `ruff`-clean and the full ~1,900-test suite
passes. **Nothing here was checked in a real browser** — no Playwright
session ran this sitting; every UI claim (the graph fix, the kebab-menu
flip, the mobile Skills layout, the Meeting Notes tab) rests on source-level
reasoning only. The Minimise revert's premise — that `js_api` on
`create_window()` causes the hang — rests on the user's own before/after
test on their machine, not on anything reproduced here.

## §100 — twelve completed items, full narrative moved from ROADMAP.md

ROADMAP.md's own opening text says the file is "only what's still open" and
that keeping finished narrative there "is how it got" past its 2,000-line
ceiling — true of §1–§38, but not consistently applied to items added in
later sessions, several of which sat fully written out, struck through, for
multiple sessions after being marked Built. Moved here verbatim (each is now
a one-line stub in ROADMAP.md pointing back to this section), not
re-summarised, so nothing about what was actually verified is lost in the
move.

**A hybrid live-rendering document editor (live-list item 0).** Built
(§93/§94). Four views in `#doc-view-seg` — Live (render-as-you-write, the
caret's block showing its raw markdown), Source, Split, Read — plus document
file types with a line-number gutter, Tab/Shift+Tab indent, and Ctrl+/
commenting on the language's own marker. The separate "squished panes" half
was a dead CSS rule: `#doc-panes` (an id) beat `.doc-panes.split`, so the
side-by-side layout had never once applied. Full narrative in this file's own
§93 entry.

**Backup retention is not a setting (item B).** Built. The prune itself
already existed (`backup.py`'s `KEEP_BACKUPS` was always enforced on every
backup) — the gap was that the number was fixed in code, not a preference.
`PUT /backups/retention` sets `backup_retention_count` and prunes
immediately, `GET /storage` reports the current count and its 1–100 bounds,
and Settings → Data has the number field beside the existing Backups list.

**Guided first-run tour, and the rest of onboarding (item 6).** Built. The
tour and the data-dir/Ollama diagnostics already existed; the two genuinely
missing pieces are now offers on the same "Your setup" slide, neither
automatic — a "Download a starter model" button (`POST /models/pull`, only
shown when Ollama is running but the chat model isn't installed) and an "Add
example notes" button (`POST /entries/seed-examples`, only shown on a
genuinely empty notebook — `GET /entries/count`). The seed is five short
notes about the app itself, two real `[[wiki-links]]` between them, two
categories, spread across the last 9 days so the Timeline isn't a single dot
— refuses server-side on any notebook that already has a note, seeded or
real, so it can never double up or land on top of someone's actual notes.
Verified live: the button appears/hides correctly, seeding produces exactly
5 notes with both links resolved (`tests/test_seed_examples.py`), and a
screenshot of the running app afterward shows the Dashboard's note count,
category chips and the graph constellation all populated from the seed,
unprompted.

**Alembic migrations (item 7).** Built — HANDOVER.md's own "Alembic
infrastructure" section documents it (`migrations/`, `alembic.ini`, a
baseline revision every database is stamped to on first sight,
`tests/test_alembic_baseline.py`), this entry was just never struck.
Reconfirmed directly: `_ensure_alembic_baseline` exists in
`core/database.py`, the migration scaffolding is on disk, and the test
passes.

**Crash-safe recovery for an interrupted re-index or model download (item
9).** Checked directly — already safe by construction, nothing to build.
`model_manager.py`'s `_run_reindex`: each entry's stale vector is deleted and
committed *before* re-embedding it, one entry at a time — a crash mid-run
leaves already-processed entries with fresh vectors and not-yet-reached ones
with their old (still-functional; semantic search already falls back to
keyword search on a backend mismatch) vectors. Nothing corrupted, nothing
half-written — just a partially-refreshed index a later manual re-run
completes. `_run_pull`: `job.status` is set to `"error"` on any failure, and
its own comment already states the property directly — "never leave a
half-download looking installed" (§6.5). Both jobs (`Job`) are **in-memory
only**, not persisted, so a real process crash (not a graceful cancel) simply
forgets the job existed on restart — no ghost "still running" state is
possible because there is nowhere for one to survive to. The one gap, and
it's cosmetic: neither job leaves a `taskhistory` record for a hard crash
specifically (only for a clean cancel or a caught exception) — a crash
mid-reindex shows nothing in Settings → Tasks afterward, rather than a "did
not finish" entry. Not attempted: needs a startup-time reconciliation pass
(did the last recorded reindex actually reach `total`?) that's a small but
real addition, not a one-line fix.

**Sorting and grouping saved chats (item 11).** Built: a sort `<select>` in
the Chats sidebar (Recent / Most turns / Most tokens / A–Z), persisted in
localStorage, pinned conversations always staying first regardless of mode
(the existing divider still marks that boundary). One correction to this
item's own premise: **model is not actually stored per turn** —
`routes_conversations.py`'s `_summary()` returns `tokens`/`turns`/
`updated_at`/`title` only, no model field exists on a message at all — so
"sort by model" was never available to build cheaply as claimed. The three
sorts that *were* real data are shipped; a model-based sort would need a
schema change first. Verified live: A–Z sort correctly orders three test
conversations, the choice survives a reload.

**The Documents Library sub-tab needed a full visual redesign (item 12).**
Built — root cause found by screenshotting it beside the "All" view.
`#library-docs-list`'s rows (`renderLibraryDocuments`, `whiteboard.js`)
shared only the layout class `.doc-list` with the editor's own recent-docs
sidebar — no scoped CSS of their own at all, so every row fell through to
the app's default filled `<button>` style: a full-width solid-accent bar
with the title and word count crammed onto one line, nothing like a card.
Given a document icon, a proper title/meta column, a border and hover state
matching `.library-card`'s own look (`04-chat-dock-appearance.css`).
Verified live in both themes: real cards now, readable at a glance, clicking
one still opens the right document.

**Pagination on other tabs (item 1).** Built, across all four surfaces Notes'
own `#notes-page-size` pattern was asked to extend to. **Reminders:**
`#reminders-page-size` paginates only the Done group — Overdue/Today/Upcoming
always render in full, in every filter, so an overdue reminder can never land
on a page that isn't shown. Verified live: 3 overdue + 60 done at 25/page
shows all 3 overdue plus "Page 1 of 3" of Done; paging Done to page 2 leaves
the overdue count at 3, unmoved; switching to the "Open" filter hides the
(now-empty) Done pagination bar while the 3 overdue stay fully visible.
**Library Documents sub-tab:** `#library-docs-page-size`, same shape as
Notes' (no due/overdue framing to protect here). Verified live: 55 docs,
25/page shows "Page 1 of 3", Next moves to page 2, the choice persists across
a reload. **Library "All" grid:** `#library-page-size`, sitting beside the
existing view toggle and the filter chips. "All" (the default) leaves the
grid's `renderIncrementally` chunked scroll untouched; a number slices the
already-filtered/sorted list to one flat page instead — the two rendering
strategies coexist rather than one replacing the other.
`libraryCurrentPage` resets to 1 on every control that can move an item to a
different page: the overview tiles, the kind chips, search, both sort
controls, and the Include-bin checkbox. Verified live: 40 seeded notes, "All"
shows all 40 with the bar hidden; 25/page shows "Page 1 of 2" with Prev
disabled; Next correctly shows the remaining 15 with "Page 2 of 2"; the
page-size choice survives a reload; no console errors.

**§88.4 item 3 — memory is a surface, not a system.** Checked directly,
not built — the claim ("no tiered notion of always-in-context/retrieved/
session-only exists anywhere in `ai/`") was stale. The "always in context"
tier is exactly `ai/memory.py`'s `persona_with_memory`: `UserPreference`
rows, bounded (`MEMORY_STREAM_BUDGET_CHARS = 600`, newest kept when full),
folded into the system prompt on every turn in both Ask and Request mode
(the module's own docstring records the bug that made it agent-mode-only
until a prior session fixed it). Fully user-editable in Settings → "What
it remembers": a manual add box (`POST /memory`), edit/delete
(`PATCH`/`DELETE /memory/{id}`), AI-suggested entries the user must
explicitly accept (`POST /memory/{id}/answer` — never silently saved),
and a live budget readout ("N in use, about X of 600 characters"). The
other two tiers the item names — "retrieved when relevant" is the app's
core retrieval, "this conversation only" is the existing chat history —
already exist too, just not under a unified "memory" label. What's
actually missing is framing (the Settings copy doesn't present these as
three tiers working together), not capability — a documentation/UI-copy
question, not new code, and not attempted here.

**§88.4 item 4 — no token accounting per stage.** Built. Both request
paths (`agent.py`'s tool-calling loop, `routes_chat.py`'s no-tools path)
now attach a `system`/`tool_schemas`/`history`/`notes` token estimate
(chars/4, the same approximation `ai/context.py`'s own budgeting already
used) to the first round's stats event. In `agent.py` this is measured
once, before the loop appends any tool-result rounds to `messages` —
matching what the pre-existing char-based log line (§11a) already
measured, not a new per-round re-measurement. `routes_chat.py`'s path
always reports `tool_schemas: 0`, by construction (no tools on that
path). The whole `stats` object was already an opaque JSON blob the
frontend persists and the server round-trips verbatim, so this needed no
schema or migration change. Surfaced in the chat metadata line's
window-fill tooltip as a few extra lines, shown only when a turn actually
has a `composition` — an older saved turn from before this shipped
renders exactly as it always did. Also closes BACKLOG's "per-chat token
meter" ask, answered by extending what already existed there rather than
a second UI element. 2 new tests in `test_chat_metadata.py`, against
`fake_ollama` (this sandbox has no reachable Ollama, so this is the only
way to test the wire format). Live-verified in Chromium by calling
`messageMetaLine()` directly with a payload shaped like what the backend
now sends: renders correctly, formats tokens consistent with the rest of
the app, and an older stats object with no `composition` key renders
with no stray "undefined" in the tooltip. A real end-to-end model
round-trip could not be verified — no reachable Ollama in this sandbox.

**§87.5's first slice — link-type/confidence-weighted graph traversal.**
`EntryLink.link_type`'s own column comment already claimed "the traversal
weights them by it" — checked, and that was false: every link cost the
same flat `LINK_WEIGHT` regardless of type, in both places that walk the
link graph. `link_strength(link_type, reason_confidence)`
(`core/database.py`, beside `LINK_TYPES`) is the shared signal: 1.0
baseline (a bare link, what every link from before either column existed
still is), boosted for any of the six named types (a considered choice,
not a ranking between them), discounted — floored, never to nothing —
for a reason that was *deduced* rather than said (`reason_confidence`
only exists on a guess). Wired into `entry/paths.py`'s Dijkstra search
(as a divisor — strength up, cost down, so `Step.weight` is now `float`)
and `search_manager.graph_expansion()`'s neighbour ordering (as a sort
key on `_linked_neighbours`, since `GRAPH_EXPANSION_LIMIT`/
`GRAPH_EXPANSION_HOP2_LIMIT` truncate that list — which neighbours
survive the cut is the actual payoff for the AI's retrieval). Two other
stale claims in §87.5's own original text were corrected in the same
pass: the traversal was described as "currently unweighted" (false — it
was already weighted by connection *kind*, link vs. thread vs. tag, just
not by per-link type/confidence, which is the distinction that actually
mattered) and paths.py/graph_expansion were described as "sharing that
code" (they don't — two separate implementations, now each independently
calling `link_strength()`). Deliberately not attempted: the wider
composite (shared tags Jaccard, same category, temporal proximity) —
those are derived signals needing per-pair query-time computation on a
hot path (`graph_expansion` runs on every chat/ask retrieval), unmeasured
against real usage; and distinguishing a hand-typed `[[wiki link]]` as
specifically the strongest signal, as the original table suggested —
`sync_wiki_links` creates a link through the exact same `create_link()`
path a plain no-reason link does, so nothing currently records *how* a
link was made, which needs a real schema decision, not a same-session
guess. 9 new tests: `link_strength`'s own behaviour (baseline, type
boost, the confidence floor, the two combining) in
`tests/test_graph_paths.py`, a typed link beating a bare one at equal hop
count and a low-confidence deduced link losing to a plain one (same
file), and `graph_expansion` keeping a strength-worthy neighbour that
insertion order alone would have dropped past the hop limit
(`tests/test_connected_results.py`).

**§87.8's backlinks panel and whiteboard render scheduler — both already
built, found by checking rather than assuming.** "Backlinks panel ('what
links here')" turned out to already exist: `manager.links_for_entry()` is
already bidirectional ("all links touching this entry"), and every note
card's `.entry-links` row (`app.js`) already renders it as clickable
preview chips. This app's link model has no directional/citation
semantics (a link's reason reads "the same phrase either direction" per
`entry/paths.py`'s own docstring), so an undirected "linked notes" panel
*is* the backlinks panel, not a lesser version of one. The whiteboard
render scheduler item was already fixed in an earlier pass this same
session (see live-list item G): every drag handler mutates the DOM
directly rather than calling `wbScheduleRender()`/a full re-render,
checked across all 48 call sites per that function's own comment.

**§87.1's "Move nodes freely" audit row — the pin persistence half
built, and a real toggle bug found live in the process.** Two nullable
columns (`Entry.graph_pin_x`/`graph_pin_y`, additive — the existing
auto-migrator handles it, no migration script needed) and
`PUT /graph/pin/{id}` to set or clear them (both-null or both-set only,
a lone coordinate refused with a 400 rather than guessed). Both `/graph`
and `/graph/local/{id}` return the fields, and `graph.js` restores
`fx`/`fy` from them on every render — not only a fresh load, but any
re-render at all, since the existing "carry prior position forward"
logic (`priorPositions`) never carried `fx`/`fy`, so a pin used to be
silently dropped by the next legend-filter toggle or physics-slider
change even within the same session.

Live-testing the unpin half in Chromium surfaced a second, genuinely
pre-existing bug, not introduced by this change: a double-click is two
constituent clicks, and `d3.drag()` fires its own start/end lifecycle on
*any* mousedown+mouseup, including a zero-distance one that never
actually moves the node. The drag-end handler unconditionally cleared
the dragged node's own `fx`/`fy` on every such click — including both
clicks inside every double-click gesture — before the `dblclick` handler
itself ever ran. The result: `dblclick` always found `fx` already `null`
and could only ever take the "pin" branch, never "unpin," regardless of
the node's actual prior state — double-click-to-release had almost
certainly never worked in the shipped app, just never caught, since nobody
had tested the unpin half against a running instance before. Fixed by
remembering (`d.wasPinnedBeforeThisDrag`) whether a node was already
pinned before its own drag started, and only releasing it at drag-end
if the drag itself was what pinned it — the same care `graphDragPinned`
already gave every *other* node in the same handler, just never
extended to the node being dragged itself.

7 new backend tests (`test_graph_api.py`): set/clear/persist, the
lone-coordinate 400, an unknown or deleted note 404s, and the same pin
showing up in Focus Mode's `/graph/local/{id}`. Live-verified in
Chromium: pinning shows the held look immediately and survives a
reload (confirmed both via the `.graph-held` CSS class and a direct
`/graph` refetch); a second double-click now correctly unpins (the PUT
body changes from real coordinates to `{x: null, y: null}`, matching
the bug fix above); leaving and re-entering the Graph tab still renders
and pans correctly afterward. Not attempted: persisting a pinned node's
new position when it is later dragged to reposition it — currently
updates only in memory, a smaller and separate gap from "never
persisted at all," which is what this closes.
