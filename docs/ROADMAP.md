# MemoryMap AI — work plan

The live priority list, restructured. §1–§38's full narrative (every reported
bug, every "decided against," every dead end) has been condensed into
[roadmap/HISTORY.md](roadmap/HISTORY.md) rather than kept here — this file is
now *only* what's still open, ranked by what it unlocks. Section numbers in
code comments and tests still resolve via HISTORY.md's index.

**The standing caveat:** every provider test runs against a fake transport —
SSE framing and tool-call parsing are implemented from the spec, not verified
against a running Ollama/LM Studio. UI claims are now checkable (Chromium is
in the sandbox); model *behaviour* claims are not — reproduce or say plainly
you couldn't.

## Newest — a mobile/responsive audit, and a blind feature-completeness brainstorm across every screen (read this first, above Priority 0)

### The mobile/responsive audit

Two background agents drove the real app live in headless Chromium across 9
common breakpoints (320×568 through 1920×1080) and all 7 tabs plus Settings,
the command palette, and a modal — the first attempt died mid-run
(infrastructure, not a task problem) and was retried clean. Two real BROKEN
findings, both root-caused and fixed this session, live-verified after the
fix rather than trusted from the diagnosis alone:

1. **Graph's "+ New note" popup rendered its Save/Close/Tags controls below
   the fold at 320×568 and 375×667, with nothing to scroll them into view.**
   Root cause: `placeGraphPopup()` (the *existing*-note popup) sets
   `popup.style.maxHeight` from the map's own box height before measuring,
   so it self-scrolls when tall — its sibling `openGraphNewNote()` (the
   *new*-note popup the audit actually hit) never did, so the popup just
   grew past `#graph-box`'s bounds with `overflow-y: auto` sitting on an
   element that never actually overflowed anything. Fixed by copying the one
   line `openGraphNewNote()` was missing (`graph.js`). **Verified live,
   before/after**: at 375×667, `#graph-new-save`'s bottom went from 701px
   (134px past the 667px viewport, per the audit) to 418px (well within);
   `popup.scrollHeight` (408px) now genuinely exceeds `clientHeight` (174px),
   confirming the internal scroll is doing real work instead of never
   engaging. **A second, more fundamental issue surfaced while verifying,
   not yet fixed**: at 320×568 on a fresh/empty profile, `#graph-box` itself
   renders with `top: 522px` — the Graph tab's own toolbar consumes so much
   of the 568px viewport that the canvas, and therefore the "+ New note"
   button itself, isn't reachable without scrolling first, with no affordance
   hinting that. This is a mobile layout problem with the Graph toolbar
   specifically, separate from the popup bug above, real design work rather
   than a one-line fix, and not addressed this session — next one should
   start here rather than re-deriving it.
2. **A persistent "Agent Activity" panel (`#agent-monitor`, fixed-position,
   `z-index: 1000`) overlapped real content on every tab at 320px width**,
   confirmed visually (not just bounding-box math) — text bled through
   underneath its translucent backdrop on Notes, Graph, and others. Root
   cause: `document.body.classList.toggle("has-agent-monitor", …)` (`app.js`)
   had no matching CSS rule anywhere — a dead hook, the exact "feature that
   never ran once" shape this file's own review-checklist section warns
   about. Fixed in `07-whiteboard-misc.css`: the class now pads the active
   tab's scroll container so content can be scrolled clear of the panel's
   footprint. **This needed two passes to actually work, and the wrong first
   attempt is worth recording**: padding `.tab-page` alone (the general
   scroll container) measurably did nothing for the Notes or Chat tabs
   specifically — `04-chat-dock-appearance.css:147-186` makes `.tab-page` a
   plain flex column for those two and moves the real `overflow-y: auto`
   onto a nested `.layout > main` instead, confirmed by measuring computed
   `padding-bottom` on the wrong element and getting an unchanged value
   before catching it. A second selector targeting that inner container
   fixed it — verified live, computed `padding-bottom` going from `0px` to
   `288px` on Notes' and Chat's real scroll containers once the class is
   set. **Still not addressed**: Graph has no document-flow scroll container
   at all (a pan/zoom canvas), so this class-driven padding can't help it
   the same way — the panel can still temporarily obstruct the map there.
   Also gave the panel `max-width: calc(100vw - 40px)` so its fixed 350px
   width can't itself force horizontal crowding on a narrow screen.

Three more findings, real but lower severity, not fixed this session —
next session, roughly in this order:

3. **SUBOPTIMAL — several toggle/checkbox controls fall under the WCAG
   2.5.8 24×24px minimum tap-target size**, consistently across viewports:
   `#semantic-search-toggle` and `#library-show-binned` (plain native
   checkboxes styled only with `accent-color`, no explicit size — the
   `.accent-check` class that names the intent sets nothing else),
   `#skills-auto-toggle`/`#skills-auto-tag`/`#skills-auto-link` (13×13
   unstyled native checkboxes), two unlabeled checkboxes in Settings, and
   Chat's three quick-suggestion chips (`.chip.chip-interactive`, ~21px
   tall). These aren't one shared component — at least three separate
   styling situations — so this is more than a one-line fix; scope a real
   pass rather than patching pixel values blind.
4. **SUBOPTIMAL — the 7-tab nav bar shows only ~4 tabs at once at
   320–375px width with no scroll affordance.** Confirmed genuinely
   scrollable (not clipped/lost — `scrollWidth` 640px vs `clientWidth`
   294–349px, and the active tab does auto-scroll into view), just
   undiscoverable: nothing hints Library/Timeline/Reminders exist further
   right except a partially-cut label at rest. A fade-mask or scroll-arrow
   hint at the nav bar's trailing edge would close this cheaply.
5. **SUBOPTIMAL — the Graph "+ New note" popup visually overlaps the
   zoom-in/zoom-out/fullscreen toolbar buttons while open** (confirmed
   56–71% bounding-box overlap at 320–412px widths), with no backdrop to
   signal the rest of the canvas is temporarily inactive. Low severity, but
   cheap to fix alongside item 1's toolbar work above.

Confirmed clean at every viewport, so nobody re-audits it: no horizontal
document overflow anywhere, no sub-11px text anywhere, the Settings modal
renders correctly at every width tested (single-column at 320px, sidebar+
content at 768px+), and each tab's own scroll container correctly stops
exactly at the footer's top edge (several "controls cut off near the
bottom" findings from the automated pass turned out to be false positives
from that — reachable by scrolling, not actually clipped).

Two separate passes this session, both driven by the same worry CLAUDE.md
names directly: rebuilding something that already exists. So the method for
the second half was deliberately blind — for each of the app's 9 screens
(Dashboard, Notes, Ask/Chat, Graph, Library incl. Documents/Skills/Media, the
Whiteboard, Timeline, Reminders, Settings) the brainstorm was written first,
from general knowledge of what that *kind* of feature looks like across
well-known apps (Notion, Obsidian, Apple Notes, Todoist, Miro/Excalidraw,
ChatGPT), with the running app deliberately not open — then, only after the
list was written, checked line-by-line against this codebase's actual routes
and frontend code (grep for the concrete symbol, not "I recall this exists").

**The honest headline result: this app is far more complete than a generic
brainstorm assumes.** Of a brainstormed ~140 individual capabilities across
the 9 screens, the large majority already exist — often as a named, documented
feature (`DASH_WIDGETS.streak`, `DASH_WIDGETS["on-this-day"]`,
`DASH_WIDGETS.heatmap`, `DASH_WIDGETS.capture`, note pin/tag/category,
`entry_revisions`/version history with restore, GFM task-list checkboxes as
real checkboxes, `[[link]]`s with AI-deduced reasons, capture templates
(built-in and custom), graph physics/similarity/time-slider/trace/link-suggest,
whiteboard grouping/alignment/rotation/anchors/multi-board, reminder
priority/recurring/presets/nudges, chat regenerate-and-resend, conversation
compression). Re-proposing any of that would be exactly the mistake this
file's own opening paragraph warns about, so it isn't listed below — what
follows is only the gap between the brainstorm and what a targeted grep
actually found, confirmed missing rather than assumed missing.

**Not brainstormed as gaps, on purpose:** collaboration/multi-user editing,
cloud sync, sharing-with-others, and any thumbs-up/down-style feedback meant
to tune model behaviour over time. All four are stock ideas for this *class*
of app but actively wrong for this one — it's 100% offline and single-user by
design (no server to sync through, no account system, no telemetry channel a
feedback signal could even reach), so including them would be brainstorming
against the wrong app rather than this one.

### Gaps found, ranked by value

1. **No OCR for a photographed or scanned image — narrower than first
   reported, see the correction below.** `routes_documents.py` (Library →
   Documents are hand-written markdown, not an upload pipeline) and
   `routes_files.py` (attachments/Media Gallery store opaque blobs) really
   don't read a file's content — but `/import/document`
   (`routes_settings.py:1176-1235`) already does, for PDF, Word, PowerPoint,
   Excel, and HTML, via `markitdown` (an optional extra, `core/extras.py`'s
   `"documents"` entry) — it converts the file to markdown and files one
   note per top-level heading. What's actually still missing, confirmed by
   the `accept` attribute on `#import-document-file`
   (`index.html:3368` — `.pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.html,.htm`,
   no image type) and by there being no OCR library anywhere in
   `src/memorymap/`: a photographed receipt, whiteboard, or scanned page —
   anything that's pixels, not an embedded text layer — still can't be read
   into a note. A local OCR pass (`pytesseract` against a system `tesseract`
   binary — no torch, consistent with this project's dependency rule),
   feeding the same `create_entry`/"Imports" pipeline `import_document`
   already uses, would close the remaining gap. Real, but a materially
   smaller piece of work than first described below.
2. **Vision-capable local models can't be used as vision models.**
   `ai/ollama_client.py` already inspects and records whether the active
   model reports a `vision` capability (`memorymap.ai.ollama_client`), but
   nothing downstream ever uses that flag — `chat-attachments` in the chat
   dock (`index.html:791`) is the note-picker's attached-*notes* list, not a
   file/image upload, and grepping `app.js` for any image-file input wired
   into the chat send path returns nothing. A model this app already detects
   as capable of reading images currently cannot be shown one. Natural
   pairing with gap 1 above (a photo of a document could go through OCR *or*
   straight to a vision model, user's choice) but is a smaller, more
   self-contained piece of work on its own.
3. **The graph has no minimap, no way to save/name a view, and no export.**
   Confirmed the options panel (`#graph-options`, `index.html:1110-1298`)
   covers physics, labels, similarity, entities, orphans, and the time
   slider — genuinely thorough — but there's nothing to re-find a specific
   arrangement once the canvas gets busy (no minimap, `grep minimap` is
   empty across `frontend/`), no "save this layout/filter combination as a
   view," and no export-as-image (unlike the whiteboard, which already
   exports PNG — `whiteboard.js:2024`). Once a notebook has enough notes
   that the force layout becomes visually dense, all three matter; today
   there's no way back to a state other than re-configuring the same toggles
   by hand.
4. **Reminders have no calendar/month view.** The list (`#reminder-groups`,
   `index.html:1436-1543`) has a solid Open/All/Done filter, priority levels,
   recurrence, quick-add presets (30 min through "Next week"), and ±15-minute/
   ±1-day nudges — genuinely thorough for a flat list — but there is no
   month-grid view, so seeing "what's due this week" as a calendar rather
   than a scrolling list isn't possible. The Dashboard's own heatmap widget
   is activity-in-the-past, not due-dates-in-the-future, so it doesn't cover
   this.
5. **Timeline has no "jump to today" and no arbitrary custom date range.**
   `timeline-days` (`index.html:1013-1110`) offers preset lookback windows
   (e.g. "Last year"); grepped for `jump.*today`/`scrollToToday`/`today-
   marker` and for any `date-range`/`daterange` control anywhere in
   `index.html` — both empty. On a long timeline, getting back to "now" or
   picking an arbitrary Jan–Mar window both require manual scrolling/preset
   guessing.

**Second pass, asked for directly** — the brainstorm above covered the 7 tab
screens; this pass covers the features that don't get their own tab: Auth/
security, the command palette, Spaces (workspaces), Duplicates, Drafts,
Insights, Backups, Voice, Tags/Categories, Models, and Conversations. Same
method — brainstorm blind, then check the actual route file and frontend
markup before trusting either "it's missing" or "it's there."

6. **The auto-lock timeout isn't configurable.** `routes_auth.py`'s own
   comment explains the two clocks it runs — `_SESSION_IDLE_TTL = 12 * 60 *
   60` (12 hours unused → locks itself "like a phone does") and
   `_SESSION_MAX_AGE = 7 * 24 * 60 * 60` (a hard weekly ceiling) — both are
   plain module-level constants; grepped the whole backend for any
   preference key that touches either (`"lock`, `lockAfter`, `idleLock`) and
   the frontend for a matching Settings control — nothing either side. For a
   password-protected local notebook, "walked away" is exactly the moment a
   shorter timeout matters most — someone on a shared or public machine has
   no way to make it 5 minutes instead of 12 hours.
7. **The command palette's live note search only matches note body text —
   not titles, and not Documents/Reminders/Conversations — and only by plain
   substring.** Narrower than first reported, see the correction below: it
   already searches as you type. `paletteMatches()` (`app.js:14904-14920`)
   appends up to 6 matching notes below the static command list, filtering
   `allEntries` by `e.content.toLowerCase().includes(lowered)`. Two real
   gaps survive that correction: it checks `e.content` only, never
   `e.title` (a separate field the app already generates via AI — "Generate
   title"/"Regenerate title" in the note's own overflow menu — so a note
   found entirely by its title elsewhere in the app can be invisible here),
   and it doesn't reach Documents, Reminders, or Conversations, each of
   which the palette already deep-links *into* by tab but not *by content*.
8. **No quick "duplicate this note" action.** Not to be confused with
    *duplicate detection* (finding near-identical notes to merge), which is
    a real, well-built feature — `routes_duplicates.py`'s preview/merge
    pair, the Settings "Tidy up duplicates" panel with its similarity
    threshold slider (`index.html:3337-3351`). That's the opposite
    operation from what most note apps also offer alongside it: deliberately
    copying one note as a starting point for a similar one (a new meeting
    note from last week's template, a variant of a recipe). Grepped for a
    per-note "Duplicate"/"Make a copy" action — the only "Copy" found is a
    clipboard-text copy (`app.js:5181`), not a new note.

**Third pass — asked directly, twice, to double-check the above ("make sure
you didn't miss anything, be very particular"), and both times it found real
mistakes, corrected in place rather than left standing.** Of the 10 original
claims, 2 were retracted outright and 2 more were half-wrong and had to be
narrowed. Each was caught by reading one function further than the first
grep had bothered to:

- **A claim of "no graph accessibility alternative" was retracted outright.**
  Originally its own numbered gap. Wrong — `graph.js`'s `initGraphKeyboard()`
  (`graph.js:1859-1927`) is a real, deliberately built non-visual navigation
  layer: `role="application"`, arrow keys move between notes spatially, `n`
  steps through a note's own connections specifically (the relationship
  graph exists to show, which spatial nearest-neighbour wouldn't preserve),
  Enter opens the note, and every move calls `announce()`
  (`app.js:3164-3171`) into a real `aria-live` region with the note's
  preview text, category, and connection count read aloud. That is a
  complete non-visual alternative, just not a *list-shaped* one — the
  original grep (`"graph.*list.view\|accessib"`) missed it because neither
  word appears near the actual implementation. Found by reading graph.js's
  full function index end to end, the second time through.
- **A claim of no PDF/document text extraction was retracted outright.**
  Wrong — `/import/document` (found by actually reading `importDocument()`'s
  network call in `app.js`, not just grepping for library names like
  `pdfplumber` that this codebase doesn't happen to use) already extracts
  PDF/Word/PowerPoint/Excel/HTML into real notes via `markitdown`. What
  survives, narrowed and renumbered as gap 1 above: OCR for *images*
  specifically, which is a materially smaller claim than "no extraction at
  all."
- **A claim that the command palette had no content search was retracted
  outright, then partly reinstated once narrowed.** Wrong as stated — it
  already appends live, substring-matched notes below the static command
  list. It was written from `paletteCommands()` alone, without reading
  `renderPalette`/`paletteMatches`, the two functions that actually call it.
  What survives, narrowed and renumbered as gap 7 above: title text and
  three other content types (Documents/Reminders/Conversations) still
  aren't covered.
- **A claim that Spaces had no per-space export/backup scoping was
  overstated, not wrong outright, and doesn't survive as a gap.** Exports
  were reported as vault-wide with "no space filter." In fact
  `core/database.py`'s `WorkspaceMixin` plus a SQLAlchemy `do_orm_execute`
  listener (`_add_workspace_filter`) transparently scopes *every* query —
  including the export routes, which share the same `get_session`
  dependency — to whichever space the `X-Workspace-ID` header names, unless
  it's explicitly `"all"`. Exports are already correctly scoped to the
  active space. What's true and isn't a bug: the on-disk backup snapshots
  the whole SQLite file, so restoring one restores every space at once —
  but the space-creation dialog's own copy ("your settings, models and
  skills stay shared") says that sharing is intentional, so this reads as
  documented behaviour, not a leak. Moved to "already done" below.

The lesson worth stating plainly, since it's exactly what this file's own
opening paragraph and CLAUDE.md's "check before building" rule are both
about: a grep for a library name, or reading one function in isolation from
what calls it, is not verification. `renderPalette()` calling
`paletteMatches()` calling `paletteCommands()` was three function names away
from where the first pass stopped reading; `initGraphKeyboard()` was sitting
in plain sight in a function-name grep the first pass ran but didn't open;
the workspace filter was one file away. All three would have sent a future
session to build something that already works — which is the one mistake
this entire exercise exists to prevent, so getting caught making it twice in
the same session, on a task about avoiding exactly that, is worth recording
rather than quietly fixing and moving on.

### What was checked and found already done (recorded so nobody re-proposes it)

Dashboard: quick-capture-without-leaving-the-dashboard, a streak counter, a
focus timer, "on this day," a weekly digest, an activity heatmap, a tag
cloud, a "rediscover a random old note" widget, drag-to-reorder with
add/remove and a persisted layout — all in `DASH_WIDGETS`
(`app.js:9154-9171`), not just planned. Notes: pin, tags, categories, GFM
task-list checkboxes rendered as real checkboxes, wikilink-style `[[]]`
linking with AI-deduced reasons and a confidence score, note version history
with restore (`entry_revisions`, `routes_entries.py:660-774`), built-in and
custom capture templates (`app.js:486-520`), recycle bin with configurable
auto-purge. Ask/Chat: saved/browsable conversations, context compression,
regenerate-and-resend, per-message note attachments via a searchable picker,
personas, plan mode, tool/skill use, integrated web search with a reader
view, local dictation. Graph: multiple layouts, colour-by, physics controls,
a time slider, similarity lines, entity nodes, orphan hiding, AI link
suggestions, path tracing between two notes, fullscreen, **and a full
non-visual navigation layer** — `role="application"`, arrow-key movement
between notes, a dedicated key to step through a note's own connections,
and every move announced via `aria-live` with the note's content, category
and connection count (`initGraphKeyboard()`, `graph.js:1859-1927`) — missed
entirely on the first two passes and only found on the third. Library: grid/list
toggle, four sort orders, bulk select/open/restore/delete, a bin with its own
context bar, a separate Skills sub-tab and Media Gallery sub-tab. Whiteboard:
multiple named boards with a switcher, a properties panel, resize, grouping,
alignment/distribute, rotation, arrow-key nudge, undo/redo, real anchor/
connection points, PNG export. Reminders: natural-language "magic add,"
priority, recurrence, quick presets, ±15 min/±1 day nudges. Settings:
high-contrast mode, reduce-motion (with an "auto — follow system" mode), and
a keyboard-shortcuts reference panel all already exist
(`contrast-toggle`/`reduce-motion-toggle`/`shortcut-list-settings`,
`index.html:2861-3045`) — the "Settings" brainstorm produced no gaps at all.
None of the above needs a second look unless a live user report says
otherwise.

**From the second pass:** Auth already separates an idle timeout from a
hard max-age rather than having one crude "session length" (just not
user-facing, per gap 6 above); token transport is a header, not a cookie, on
purpose (no CSRF surface to begin with — see `app.py`'s own docstring).
Duplicates has a real preview/merge flow with a similarity slider and
tag-preserving merges into the recycle bin, not just detection. Drafts
("write a note from rough thoughts") composes and re-titles with the AI, with
a help panel. Insights covers stats, a time-of-day greeting, the heatmap,
tag cloud, "on this day," and a streamed weekly digest. Backups list, restore,
and delete named snapshots, on top of the daily automatic one, all kept local
by design (`backup.py`'s own docstring: "next to the database, never in the
cloud"). Voice covers both a single dictation pass and a longer
record-a-meeting flow, the latter feeding the existing action-item extraction
feature. Tags/Categories both support rename and delete. Models supports
switching the chat and utility models independently, switching provider, and
pulling/deleting models with job cancellation. Conversations support pinning,
retitling, truncating, and editing a specific past answer in place, not just
create/delete. None of this needs a second look either.

**From the third pass's corrections:** PDF/Word/PowerPoint/Excel/HTML import
already exists end-to-end (`/import/document`, `markitdown`, one note per
top-level heading, `routes_settings.py:1176-1235`) — don't rebuild this, only
the image-OCR sliver above is open. The command palette already appends live,
substring-matched note results below its static commands
(`paletteMatches()`, `app.js:14904-14920`) — don't rebuild the search itself,
only its coverage (title text, Documents/Reminders/Conversations) is open.
Spaces already isolate every workspace-scoped query, including all three
export formats, via `WorkspaceMixin` + the `X-Workspace-ID` header
(`core/database.py`) — nothing to build there; only the daily backup covers
every space in one file, and that's by design, not a gap.

## Priority 0 — left unfinished this session, read before anything else

Ended on session-usage limits, not on running out of work. In the order a
fresh session should pick them up:

1. ~~The document-textarea resize gap.~~ **Fixed, but the fix's *effect* is
   unverified — read this before trusting it closed.** `app.js` now detects a
   real manual resize (`mousedown`→`mouseup` height diff on `#doc-content`,
   since nothing else changes its `offsetHeight`) and relaxes `#doc-panes`
   from `flex: 1 1 auto` to `flex: 0 1 auto` once one happens, so the freed
   space should collect at the card's bottom instead of between the textarea
   and `.doc-hint`. **This file's own instruction ("needs a live Chromium
   session to verify... do not ship one unverified") was not fully met**:
   Playwright could not trigger the native resize-handle drag in this
   sandbox's headless Chromium — real mouse events and CDP-level ones alike
   left the textarea's rendered height unchanged, and an isolated minimal
   repro of the same flex structure showed the same thing (the drag *does*
   register — `style="height: …px"` lands on the element — but flex-grow
   visibly re-absorbs it back to 100% in the same layout pass). Whether
   that's this Chromium build, or evidence the original root-cause theory
   needs revisiting, wasn't chased down. **Next session: open the real app in
   a headed/desktop browser, drag the handle, and look** — that's the one
   thing this fix still needs.
2. ~~`app.js`/`style.css`/`index.html` are still monolithic~~ **Both
   mechanically-splittable pieces are now done — `style.css` into eight
   files under `frontend/css/`, `app.js`'s whiteboard and graph-view
   subsystems into `frontend/whiteboard.js`/`frontend/graph.js`.** `index.html`
   stays whole on purpose (splitting it needs a build step, which conflicts
   with this project's no-bundler design). See HISTORY.md for the byte-order
   proof, the load-order gotcha between the two extracted files, and the
   401-burst red herring this surfaced (item 13 below).
3. ~~**Notes/Documents/Graph "extract notes" feature**~~ **Done** — see
   BACKLOG.md §62 for the resolution note (what shipped, and what's UI-only
   and unverified live).
4. ~~A live visual indicator when the mic picks up sound~~ **Done, and the
   exact live-only bug the first pass couldn't catch has since shown up and
   been fixed.** `startMicLevelMeter()` in `app.js` runs an `AnalyserNode`
   off the same `MediaStream` `toggleDictation()` already opened — no new
   permission, no new stream — and writes `--mic-level` (0–1) onto the
   button every frame. `button.recording.live-level` in `02-chat-graph.css`
   swaps the old fixed-cadence pulse for a box-shadow driven straight off
   that value, with a `prefers-reduced-motion` fallback to a static ring.
   Shipped with an honest "**not live-verified** — no real microphone in
   this sandbox" note, since the level would read near-zero either way and
   nothing would look obviously wrong from code alone. **Reported live as
   "the animation doesn't show" and reproduced by reasoning, not by ear**:
   some browsers create a fresh `AudioContext` already `suspended`, even
   from inside a click handler, so the analyser read silence forever —
   `--mic-level` never left 0, and since adding `.live-level` also
   unconditionally kills the old pulse animation (`animation: none`), the
   button just sat flat with no motion of any kind. Fixed with an explicit
   `ctx.resume()` right after construction (a no-op if the context was
   already running). Still not live-verified with a real microphone in this
   sandbox — this is the second time a sandbox-unreachable class of bug has
   shipped from sound reasoning alone; see CLAUDE.md's standing caveat.
5. **The graph tab's traced-path text visualisation at the top of the canvas
   needs a redesign** — asked for directly ("the text ui visualisation of the
   trace path... needs improving and potential redesign"), not scoped. See
   the `.graph-traced-path`/§9 block a little further down this file for
   where it's built; no specific direction was given, so a fresh session
   should look at what it currently renders before proposing a shape.
6. ~~Recent searches / search history / past results in the Ask tab~~ **Done
   — built as a browsable history, not a dropdown.** Clarified directly
   mid-build: *"I want the ask feature to be basically a personal notes
   browser."* See HISTORY.md for what shipped (`AskTurn` table, the
   `/ask-history` routes, and the panel in the Ask card).
7. **faster-whisper reported still failing to install**, pip exiting non-zero,
   from the same live Windows session as the temp-file bug below. Two things
   were fixed blind this session, without seeing the actual pip error: (a)
   `_run_install`/`_run_uninstall` in `core/extras.py` now also log the
   outcome through `logging` (`memorymap.extras`), not just into the
   Background-tasks panel's own `_state.log` — the install failure was
   reported as invisible on the Logs page, and it was: `logbuffer.py` only
   ever sees records that went through Python's `logging` module, and pip's
   captured output never did. (b) unrelated to this pip failure but same
   report: the pin/unpin icon was also fixed — see HISTORY.md's "UI polish
   batch" entry. **The pip install failure itself is still unexplained** —
   no error text was seen, only "pip exited with code 1." If it recurs,
   Settings → Logs should now show it (search "memorymap.extras"); that
   text is what a fresh session needs to actually fix the install rather
   than guess again.
8. **faster-whisper still fails to install, re-reported with a screenshot**:
   the Background-tasks history card still says "pip exited with code 1.
   The log above says why" with no actual pip output visible above it —
   meaning item 7's `logging` fix (routed into Settings → Logs) has not yet
   been confirmed to actually surface the real error either, or the log
   line itself only ever held the summary sentence, never the detail. Not
   yet investigated this session — the `logging`-routing fix landed but
   nobody has since captured the real Settings → Logs output for a live
   failure to confirm it works. Start there before changing anything else.
9. ~~**Asked for directly: extras install/reinstall/remove, embedding-model
   downloads, AI-model downloads, and the `start.bat`/`start.sh` launch
   scripts should all retry and fall back automatically on failure**~~
   **Partly done (HISTORY.md §68).** The design pass this item called for
   turned out already built: `is_network_error()` (a prior session)
   already classifies network-blip vs. real-error vs. report-clearly, it
   just wasn't being retried on. `start.sh`'s pip-install pipeline now
   retries a network-shaped failure automatically (3 attempts, 5s/10s
   backoff), anything else falls straight through unchanged. **Not done,
   on purpose:** `start.bat`'s equivalent (needs a `goto`-based retry
   reaching across an existing parenthesized block, in a file whose own
   header documents a past cmd.exe parsing incident of exactly that
   shape — no cmd.exe in any sandbox so far to verify a control-flow
   change against) and the embedding-model/Ollama-model downloads
   (background-threaded jobs, a materially bigger separate change).
10. **Timeline tab's "line/branch" view — asked for a redesign, "more
    professional" look.** Not scoped, not started. Built around
    `app.js:14517`'s "Timeline: the branch/line view" section; queue after
    the whiteboard.js extraction (item 2) lands, since both touch `app.js`
    and running them concurrently risks a merge conflict.
11. **Document editor — asked to "improve and expand."** Not scoped: no
    specific gaps were named, so a fresh session should look at what it
    currently does (BACKLOG.md §64 already flags it as "behind the rest of
    the app, needs its own pass" — read that first) before proposing
    additions. Same app.js overlap caution as item 10.
12. **Asked directly: run a full pass with the `apple-design` skill to
    refine the frontend's visual design and UI/UX.** A first, narrow pass
    landed earlier (two tabs' empty states, a title-duplication bug — see
    HISTORY.md). **A second, broader pass done this session** — an elevation
    (`--shadow-sm/md/lg`) and motion (`--motion-fast/base/slow`) token scale
    added to DESIGN.md and applied app-wide, collapsing twelve one-off
    `box-shadow` values and ten distinct transition durations into the same
    kind of scale spacing/type already have. Driven against a populated app
    (9 notes, links, 3 reminders, a document, a whiteboard board with 3
    cards — via API, not placeholders), screenshotted light+dark at 1400px.
    Full detail in HISTORY.md's newest entry, including what was screenshotted
    and what wasn't. **Deliberately not done, scoped instead of guessed at:**
    the timeline line/branch view's real layout problem (dead canvas space,
    no on-canvas band labels, same-bucket notes stacking with no
    differentiation — a `renderTimelineBranch` layout change, not a CSS fix,
    see DESIGN.md's "What is not done yet") and a global
    `prefers-reduced-motion` sweep (still per-component, not one rule). The
    document editor was checked live and found already visually consistent —
    its real gap is BACKLOG §5's feature list (wiki-links, slash menu,
    live-preview, sub-pages), a product decision not a design one.
13. ~~A burst of 401s on dashboard/insights endpoints on page load.~~ **Root
    cause found and fixed — the earlier "only on a reused data directory"
    theory above was wrong; it reproduces on every cold load, fresh data dir
    or not, with no server restart or reuse needed at all.** Confirmed via a
    bare Playwright page load with *no login attempted*: `switchTab
    ("dashboard")` and `startReminderWatch()` both ran unconditionally at
    module load, before `initAuth()` ever checks whether a token exists —
    every cold load fired the dashboard's ~20 widget requests plus a
    reminders poll, all with an empty `X-Auth-Token` header, all 401ing
    before the lock screen was even dismissed. `switchTab` is now split into
    `revealTab()` (DOM-only tab visibility, safe to run before a token
    exists) and the data-loading dispatch; the module-level boot call is
    `revealTab("dashboard")`, and `startReminderWatch()` moved into
    `startApp()`, which only runs once a session is confirmed. Verified live:
    the same bare-page-load repro now shows a single `/auth/status` call and
    nothing else. See HANDOVER.md's newest entry for the sandbox-specific
    trap that cost the most time chasing this (`pgrep -f` self-matching its
    own invoking shell — use `lsof -t -i:<port>` instead).

    *(Note: the apple-design-audit session that ran this item's first scoped
    pass was on a worktree branched from the wrong base and briefly reported
    this 401 fix as unmerged/missing. That was a false alarm caused by its
    stale starting point — `8b9b7f6` has been an ancestor of this branch's
    `HEAD` since it landed; nothing to redo here.)
14. ~~**A proper generating/loading spinner, themed to the app**~~ **Done
    (HISTORY.md §68).** `.spinner` (CSS) + `spinnerEl()` (app.js, beside
    `chip()`): reads `--accent`, sized in em, and swaps to a static "…"
    with no animation and no border under `prefers-reduced-motion` rather
    than freezing mid-spin. The one existing ad hoc user (the note
    re-evaluate busy chip) was migrated onto it rather than left as a
    second, still-unguarded ring definition beside the new correct one.

## #0 priority — codebase quality review, still-open items

A dead-code/duplication/complexity audit across backend, `app.js`,
`style.css` and `tests/`, worked over several sessions. Everything confirmed
done — dead code, the `.msg` CSS merge, the `GET /entries` N+1, the tag-cloud
duplicate scan, `on_this_day`'s SQL filter, `janitor.py`'s vectorization, the
`routes_settings.py` split, the pagination-ceiling fix, the Notes-search
debounce, the whole test-suite reorg — has been moved to the "#0 priority"
entry near the end of [roadmap/HISTORY.md](roadmap/HISTORY.md),
re-verified against current source before archiving rather than trusted from
old prose (which had already gone stale once, mid-session — the reason this
split exists at all). What's left, all re-checked against source this pass:

- ~~`whiteboard.js` extraction~~, ~~markdown-renderer merge~~,
  ~~HTTPException dedup~~, ~~`searxng_manager.py` split~~, ~~`all_tags()`
  caching~~ — all done since this list was last written; see HISTORY.md's
  newest entry for what each one actually found (two real bugs surfaced
  fixing the markdown merge alone).
- **`src/memorymap/ai/tools/__init__.py`** — still ~3,360 lines (the `TOOLS`
  registry and the bulk of note-CRUD/agent-orchestration handlers), left
  there deliberately when `_common.py`/`categories.py`/`documents.py`/
  `whiteboard.py` were extracted — it's the most interleaved, most
  load-bearing part of the file. Splitting it further needs its own
  session.
- **`manager.all_tags()`** loads every non-deleted entry with no cap, unlike
  every sibling section of the same responses (all capped at 200 or similar)
  — still true, still low-urgency at this app's realistic notebook sizes.
- **Not re-verified this pass, so not claimed either way** — check against
  source before trusting a "still open" label as much as a "done" one:
  the frontend/backend Big-O findings beyond what's listed above (Log
  filter's per-keystroke rebuild, the note-picker modal's per-keystroke
  filter/sort, `all_tags`'s cap), and feature-gap items 2-4 from the old
  §12 (Notes tab's missing error/retry state, Whiteboard's `aria-label`
  coverage vs Graph's, `GET /documents`'s missing search param).

## Read these two first

| | What's in it |
| --- | --- |
| [roadmap/HANDOVER.md](roadmap/HANDOVER.md) | **The last session's handover.** What changed, what couldn't be checked and why. Read this first. |
| [roadmap/HISTORY.md](roadmap/HISTORY.md) | Everything already built, and every backlog item already closed — with the reasoning, condensed. **Check here before building anything.** Four sessions have rebuilt something that already existed. |
| [roadmap/BACKLOG.md](roadmap/BACKLOG.md) | Standing backlog items not yet promoted to this file's live list. |
| [roadmap/ANALYSIS.md](roadmap/ANALYSIS.md) | Judgements: the odysseus read, and the licence constraint — **this project is AGPL-3.0 now, not MIT**, so §34a's "no code crosses either way" is half-lifted. What was deliberately not taken. Also §59: the claude-obsidian/cognee/graphify read behind items 32–36 below, and §60: a second odysseus read after the repo tripled in size — a real non-atomic-write bug it found, an MCP shape worth copying, and its own admission that the backend isn't better designed. |
| [DESIGN.md](DESIGN.md) | The design system. `tests/test_style_scale.py` enforces it. |

## Next up, ranked by what it unlocks

**One list, four tiers. Work top-down and do not skip.** The failure this
project actually has is not forgetting work — it is a later session picking
something interesting from further down while a correctness bug sits at the
top. If an item is blocked, say so in the handover and take the next one.

The tiers are not equal. Nothing in Tier 2 is worth more than any Tier 1 item.

### Tier 1 — correctness and trust

Things that are wrong, lose work, or make the app feel unreliable.

1. ~~**Meeting transcription errors out.**~~ **Re-confirmed fixed
   (HISTORY.md §50).** A real WAV clip against a live server now gets a
   distinct 503 with a clear cause, not the old mystery error. **Not fully
   verified**: this sandbox's network policy blocks `huggingface.co`, so an
   actual successful transcription still hasn't been observed by any
   session — that's the half still worth checking if this recurs.
2. ~~**"The AI fails to respond while still saying it is writing" — and the
   skill step counted as done.**~~ **Found already done (HISTORY.md §50,
   §41)** — checked the code before rebuilding, per this file's own rule.
3. ~~**Skills producing network errors, or models that cannot run them.**~~
   **Found already done (HISTORY.md §50, §41).**
4. ~~**Contradictions in the agent prompt around small talk.**~~ **Found
   already done (HISTORY.md §50, §41).** Grepped and tested, not assumed —
   see `test_a_bare_yes_is_ordinarily_smalltalk_not_the_agent`.
4a. ~~**Eight preferences saved correctly and were honoured correctly, but
    never came back from `GET /preferences`.**~~ **Fixed (HISTORY.md §49).**
5. ~~**Decide what notifications are for.**~~ **Already done** — audited and
   traced by call site (HISTORY.md), not driven in a browser — say so if
   this is re-reported.
6. ~~**Background tasks that never appear.**~~ **Found already done
   (HISTORY.md §50).** Every `threading.Thread(` call site checked against
   `routes_tasks.collect()`; all nine are covered.
7. **Claim-specificity in the hallucination net.** `agent.unsupported_claims`
   catches a claim with *no* matching write ("I tagged it" when nothing was)
   but not one that mismatches what happened ("I tagged it as Work" when a
   different tag was applied). Needs real model output to tune against, which
   this sandbox cannot provide — named rather than guessed at.
8. ~~**Two backend perf findings.**~~ **Done (HISTORY.md §44).**
9. ~~**A "completed" notification for a background pass the user never
   enabled.**~~ **Done (HISTORY.md §44).**
10. ~~**Every graph layout except Force shows no connections when the Time
    Filter is moved off "All time".**~~ **Fixed and verified live
    (HISTORY.md §50).**
11. ~~**Dragging on empty graph canvas sometimes highlights an unrelated
    note.**~~ **Fixed and verified live (HISTORY.md §50).**
12. ~~**Clicking a whiteboard card or object to select it silently didn't
    work.**~~ **Fixed and verified live (HISTORY.md §57).**
13. ~~**Two features silently shared the same Ctrl+K shortcut.**~~ **Fixed
    (HISTORY.md §57).**

### Tier 2 — half-built features, cheap to finish

Each is already paid for; a small amount of work turns a frustrating surface
into a good one.

8. ~~**Skill runs: an auto/manual mode.**~~ **Done (HISTORY.md §45).**
   **Not built**: the same pause for a plan run (`opts.plan`) — the
   existing Resume-from-failure button was already skill-only before this,
   so extending both to plans is a separate change. **Not verified live** —
   backend tests cover it through a fake model; the checkbox and pause card
   were not driven in a browser.
9. ~~**A reason on every link.**~~ **Done, including a confidence score,
   an editor, backfill, and a visual graph treatment (HISTORY.md §43, §44,
   §61).** `entry_links.reason` (deduced from embedding similarity when
   nobody supplies one, editable/clearable by hand), surfaced on the graph
   edge, in Trace, in `related_notes`, and in link suggestions.
   **Asked for directly, not yet built:** the backfill as an agent-callable
   tool/skill so it can run unattended (see item 31). ~~Also asked for: the
   deduction should weigh temporal words as well as embedding similarity.~~
   **Done.** A pair below threshold on embedding similarity alone now gets
   rescued by `_shares_a_date` (same resolved `EntryDate` day, or written the
   same calendar day) within `TEMPORAL_RESCUE_BOOST` (0.15) of
   `AUTO_REASON_THRESHOLD`, surfaced as its own reason text ("similar in
   meaning, and around the same time") so it reads as a distinct signal, not
   a silently lowered bar. Deliberately can't manufacture a reason alone —
   only rescues a pair the embedding score already put close. Confirmed this
   fires on ordinary "today"/"next Tuesday" phrasing *inside* note text, not
   just an explicit date field — `entry.timewords`' `record_dates()` already
   runs on every save, so no new capture-side code was needed, only the
   rescue logic in `_deduce_reason`. 7 new tests in `test_link_reasons.py`.
10. **The sketch pad.** ~~The highlighter at 5% opacity was effectively
    invisible~~ **Fixed (HISTORY.md §46).** ~~A background colour for the
    canvas~~ **Done (HISTORY.md §46)**, including a real CSS-vs-canvas-pixel
    trap the fix hit — see there. ~~Holding Shift while drawing a shape
    constrains it~~ **Fixed for the rect tool** (forces a square). **Still
    genuinely open**: a
    selection tool (clicking an existing stroke/shape to move, resize or
    delete it; today's tools only ever draw a new one) — the sketch pad is
    pure-raster (`ImageData` snapshots for undo, no discrete stroke
    objects), so this needs a real architecture change, not a small patch,
    unlike the whiteboard's own discrete-object select (item 11). The
    toolbar redesign comes after it, not before.
11. **The whiteboard, properly.** ~~Images, text boxes, resize (8-handle
    corner+edge), grid (lines/dots/isometric)+snap, per-board background
    image, export (PNG/SVG/PDF), clear-board, a redesigned board picker,
    redo, single-item select, undo/redo, per-tool cursors, an eraser,
    keyboard shortcuts, draggable toolbar panels, highlighter+arrow tools,
    a board-colour reset, touch input (pointer events), sketch move+resize,
    copy/paste, multi-select (shift-click/marquee/bulk move/bulk delete),
    grid-snap on every item kind (not just cards), shift-to-constrain a
    drawn shape, Alt to bypass snap for one drag, two more shape types
    (triangle/diamond), arrowhead styles, precise drop placement, a real
    "glitchy and slow to update" perf bug (a full board re-render on every
    card-drag frame), a properties panel (colour/width/arrowhead/fill/
    border/font-size) for the current single selection, card resize
    (8-handle, same as images/text boxes), object grouping (Ctrl+G/
    Ctrl+Shift+G, a persisted `group_id`, click-one-selects-the-whole-group),
    undo/redo extended to cover move *and* resize (not just create/delete),
    arrow-key nudge (grid-step when snap is on, 1px/10px+Shift otherwise),
    alignment tools (left/h-centre/right/top/v-centre/bottom) and distribute
    (horizontal/vertical) for a multi-selection, and rotation (a drag
    handle above the item, Shift snaps to 15°, for cards and objects — see
    "still open" below for why sketches don't have it yet)~~ **all done,
    verified live — see HISTORY.md §53–§55 for the full list and how each
    was verified.**

    **Still genuinely open, ranked by what's actually left.**
    - ~~**Real anchor/connection points**~~, **and dragging an endpoint to
      reattach or detach it,** **Done, verified live (HISTORY.md §56,
      §61).** Found and fixed two real architecture bugs along the way —
      invisible resize/rotate handles still winning the hit-test, and the
      SVG layer rendering under the HTML card layer — see HISTORY.md.
    - ~~**A mind-mapping mode**~~ **Done — see item 25's own entry (Tier 3)
      and HISTORY.md §57.**
    - ~~**AI + whiteboard, three pieces**~~ **Done, verified (HISTORY.md
      §57).** `read_whiteboard`/`search_whiteboard`/`add_whiteboard_card`/
      `add_whiteboard_link`. **Not verified against a live model** — this
      sandbox's standing caveat about provider behaviour applies here too.
    - ~~**Sketch rotation.**~~ **Done, verified live (HISTORY.md §61).**
    - **Image cropping.** Asked about directly; not scoped or built —
      needs a decision on the interaction (a crop rectangle over the full
      image vs. a separate "adjust" mode) before building.
    - ~~**Uploaded images showing in the Library, and a way to delete
      one.**~~ **Done (HISTORY.md §61).** ~~**Orphaned `/media/` garbage
      collection.**~~ **Done.** See item 20a below.
    - ~~**Smart alignment guides while dragging, colour-coded, with
      equal-spacing detection**~~ **Done, verified live (HISTORY.md §58).**
    - ~~**Rectangle select and lasso, export selection**~~ **Done, verified
      live (HISTORY.md §58, §61 for a real lasso/drag-filter bug found and
      fixed along the way).**
    - ~~**Renaming a board, and a Library gallery of every board/mind-map
      and every uploaded image.**~~ **Done (HISTORY.md §61).**
    - ~~**A structured, small-model-friendly "generate a diagram from my
      notes" tool.**~~ **Done (HISTORY.md §61).** `generate_diagram`.
    - ~~**A whiteboard backend/perf pass**~~ **Partly done (HISTORY.md
      §57).** The one real client-side O(cards × notebook size) issue found
      is fixed. **Not done**: a real profile against a large, many-hundred-
      item board — nothing this session was measured against one.
    - ~~**A full line/arrow end-cap system**~~ **Done (HISTORY.md §61).**
12. ~~**Links that are links.**~~ **Already done — corrected, not rebuilt
    (HISTORY.md §47).** Checked before touching anything, per this file's
    own rule — nothing here needed building.
13. ~~**"Take me to the thing the agent just changed," the UI half.**~~
    **All four kinds now done (HISTORY.md §47, §51).** Notes, documents,
    reminders and categories each get a View button on their change row,
    verified live end to end.
14. **Timeline line view, and text placement in grid view.** The grid view's
    text-placement half is **done**: an unprefixed `line-clamp` fixed
    (kept alongside `-webkit-line-clamp`), plus the backend's `preview`
    field truncating with an ellipsis. **Re-reported after that fix, still
    cut off**, not reproduced in this sandbox's Chromium; a defensive
    `max-height` was added as a safety net (HISTORY.md §49-adjacent) but
    this is hardening, not a diagnosis — the next session needs the actual
    browser/OS this is happening in. ~~**Also reported: the line-view's own
    note popup shows no markdown rendering and no sketch/image attachment
    preview.**~~ **Fixed and verified live (HISTORY.md §51).** **Still
    open:** the line view itself — reported as needing a real visual pass
    ("very professional and ready for public use"), and grid view could
    still take general UX polish beyond the text-cropping fix (not scoped
    further — say what specifically, next time it's reported).
15. ~~**Arc view: labels clashing with the connection arcs**~~ **Fixed and
    verified live with a screenshot (HISTORY.md §52), through two rounds
    of re-reports** (tilt direction, then label density/spacing) — the
    second round's fix (`ARC_STEP`/`ARC_LABEL_LIMIT`/tilt angle) was **not
    re-verified with a fresh screenshot** (token budget); worth a check
    first thing next session if this recurs. Category labels also got a
    distinct colour (`fill: var(--accent)`), asked for directly.
16. **Documents in the graph.** They are notes' equal everywhere else.
16a. ~~**The document editor's sidebar, reported directly with
    screenshots.**~~ **Checked and fixed (HISTORY.md §51).** The
    sticky/floating half was stale-by-report, already done. The
    outline-collapses bug was real (a `flex: 0 0 auto` disclosure exempting
    itself from shrinking while the outline above had no floor) and fixed.
16b. ~~**The document editor's bold/italic don't toggle off.**~~ **Fixed
    and verified live (HISTORY.md §51).** `wrapDocSelection` now detects
    and strips existing markers instead of only ever wrapping. **Still
    open**: "a bunch of missing features... could be improved a lot more"
    was named but not itemised — needs a concrete list before more work.
16c. ~~**Images and files still can't be copied, pasted, or dragged into
    notes.**~~ **Two of three already worked — checked live before
    building anything (HISTORY.md §51).** The third path — a file-picker
    button (`📎 Attach`) — was genuinely missing and is now built.
16d. ~~**An optional title field in Capture, and everywhere a note can be
    created.**~~ **Decided and built (HISTORY.md §52).** Writes the leading
    `# {title}` heading line into `content` on save, verified live end to
    end from both Capture and the graph's "+ New note" popup.
16e. **Decision made, not yet built**: both a native-OS picker and a
    built-in in-app palette, same pattern as 16f — a toggle in Settings →
    Appearance picks which one opens. Not scoped further (which inputs get
    the trigger control, where the built-in palette's emoji set/data comes
    from) — do that scoping next to whatever picks up 16f, since both share
    the same Appearance-tab toggle mechanism and are cheaper built together.
16f. **Decision made, not yet built**: an SVG icon set *and* monochrome
    emoji, both available, with a toggle in Settings → Appearance to switch
    between them (not a single fixed replacement). Needs: (1) the actual
    count/categorisation pass (decorative vs. load-bearing) this item
    already called for, (2) an icon set picked and the SVGs wired in
    alongside the existing emoji rather than replacing them outright, (3)
    the CSS monochrome-filter path for the emoji option, (4) the Appearance
    toggle and the app-wide switch it drives. Sizeable — a full session's
    worth, not a quick pass.
    Original ask, kept for context: **a full sweep of emoji usage across
    the app**:
    *"I feel the application is very heavy with emojis, it feels too much
    like AI slop... make sure they are only used professionally and with
    intention, otherwise professional icons are the better way to go."*
    Also considering colourless/monochrome emoji as a middle ground, but
    undecided. This is a design decision affecting most of `index.html` and
    a large fraction of `app.js` (tab icons, button labels, toast prefixes,
    status chips) — not a quick pass. Needs, in order: (1) an actual count
    and categorisation (decorative vs. load-bearing — some emoji are the
    only differentiator between otherwise-identical icons, e.g. the
    notification kind icons), (2) a decision on the replacement (SVG icon
    set vs. monochrome emoji vs. selective removal), (3) then a build pass.
    Doing the build pass before the decision risks redoing the same ground
    twice, which this project's own history (HISTORY.md's repeated "checked
    before building" theme) is precisely the failure mode it keeps warning
    about.
17. ~~**Battery-saver: an indicator and an honest description.**~~ **Done —
    both halves, one already there (the indicator).** The "honest" half had
    a real bug, now fixed: the autonomous loop only re-read
    `battery_efficient_mode`/the toggle/the interval once per scheduled
    tick, so turning either off did nothing until the sleep ran out.
    `autonomous.wake()` now interrupts it.
18. ~~**The full-screen graph's suggested-links list ran off the bottom
    without scrolling.**~~ **Fixed and verified live (HISTORY.md §51).**
    An id-vs-class specificity tie (`#graph-card`'s `overflow: hidden`
    beating a plain `.graph-fullscreen` rule). **"The sketch/image
    toggles" part of this item couldn't be matched to anything in the
    current Options panel** — left unaddressed rather than guessed at.
19. **First-run onboarding, the rest.** Reachability diagnostics are built;
    still open: offering to pull a model, a data-dir writability check,
    seeded example notes so the graph, timeline and dashboard have something
    to show before the first note exists — named by the project's own outside
    review as the highest-leverage version of onboarding. Also asked for
    directly: **a guided application tour** — a click-through walkthrough of
    the tabs and their core actions, distinct from the reachability/seeded-
    notes work above (that's about the notebook having something to show;
    this is about someone new knowing where to look). `#onboarding-overlay`
    already exists as a surface (see CLAUDE.md's login recipe); worth
    checking what it currently does before scoping a tour on top of it.
19a. ~~**The graph toolbar's controls read as one undifferentiated strip.**~~
    **Done (HISTORY.md §44).** Grouped under `.graph-toggle-group` with
    dividers. **Not verified live** — CSS-only, reasoned from the DOM, not
    screenshotted.
19b. **A mute-notifications option, asked for directly**, alongside making
    the toast/notification split clearer: "there can be an option to mute
    notifications except for reminders." Built as
    `notifications_muted_except_reminders` (Settings → Preferences →
    Notifications): `toast()` takes an `exempt` flag (set on the three
    reminder-alert call sites) and returns early for everything else when
    muted; `recordNotification` does the same for the persistent panel,
    keyed off `kind !== "reminder"`. Errors are never muted — silencing a
    real failure would hide the thing muting is least meant to hide. **Not
    built**: mirroring ordinary toasts into the notifications panel (the
    other half of the same message) — every `toast()` call site would need
    a `kind` to avoid flooding the panel with routine "Saved."/"Linked."
    noise, which needs a first pass at which toasts actually belong there
    before it's buildable.

    **Extended (HISTORY.md §49), asked for directly**: a mute toggle inside
    the notifications panel itself (`#notif-mute-toggle`, reads "🔕 Mute" /
    "🔔 Unmute" and `aria-pressed`), not only three screens away in Settings
    — and the bell icon (`#notif-btn`) itself now shows 🔕 instead of 🔔
    whenever muted, so the state is visible without opening anything. Built
    and verified live end to end, which is what caught item 4a's real bug —
    the toggle correctly PUT the preference and correctly re-rendered from
    the response, and *still* showed unmuted, because `GET /preferences`
    (which the PUT response is built from) never echoed the new key back.
    Fixed there, not patched around here.

### Open questions raised this session, not built

- **Should Capture have its own title field**, separate from the leading-
  heading convention §43 already shipped (`manager.extract_title` reads a
  `#`–`######` first line, computed on read rather than stored)? Asked
  directly, including "if the user begins a note with `#` maybe it moves to
  the optional title input" — genuinely a design question in the same shape
  §43 was worked through as, not a bug: a second, separate title field would
  either duplicate the heading-line mechanism (keeping both in sync) or
  replace it (undoing the "read off the note, not enforced" decision §43's
  writeup already recorded). Needs a decision before either is built, not a
  guess.
- **"The dashboard isn't detecting my name."** Traced end to end
  (`renderNameNudge`/`withDisplayName` read `prefsCache.display_name`, and
  `savePrefs` updates both the cache and re-renders the greeting on save) and
  the code reads correct — the nudge is *designed* to show exactly when
  `display_name` is empty, so a fresh profile with no name saved yet showing
  "👋 Add your name" is very likely the feature working as built, not a bug.
  Could not reproduce a case where a name was actually saved and still not
  shown; if it recurs, check `GET /preferences` directly for whether
  `display_name` actually persisted, rather than assuming the render path.
- **The Timeline grid's "text cut off with no ellipsis" report** (§38a item
  2 was believed fixed) was re-investigated live: seeded notes up to 122
  characters at the grid's actual 13rem column width and read
  `getComputedStyle` on every `.timeline-dot`. Two things came out of it,
  neither a confirmed fix: `-webkit-box`'s **computed** `display` resolves to
  `flow-root` in this sandbox's Chromium, not `-webkit-box` — the property
  the existing code comment says is "what this display mode actually reads"
  isn't actually the mechanism in effect here, though clamping still worked
  correctly in every case tested (`scrollHeight === clientHeight`, nothing
  overflowing). Could not reproduce actual clipped, non-ellipsised text with
  any input tried. Worth re-checking with the user's exact note content and
  browser before guessing at a CSS change — this project's own standing rule
  is to reproduce before theorising, and this one didn't reproduce.

### Tier 3 — new capability

Worth doing, and worth doing after the above.

20. ~~**Files and images on notes, and standalone in the Library.**~~ **Done,
    and a stale claim in this item corrected (HISTORY.md §69).** The "still
    not built" gallery over note attachments specifically was checked
    against the actual code before believing it — it already existed
    (the Library's own "Files" filter, `app.js:16985`, download + delete)
    — this item's own text just hadn't been updated to say so, the exact
    trap CLAUDE.md warns about. What was genuinely missing — asked for
    directly — was uploading an image/PDF straight into the Library
    without a note first, and attaching an already-uploaded one to a note
    afterward: an Upload button on the Image Gallery (`POST /media/upload`,
    no note involved), and a new "Attach from Library" note action
    alongside the existing "Attach a file" (which only ever uploads fresh
    from disk) — a picker over `GET /media` that inserts the chosen
    image/PDF's markdown reference into the note's content. General file
    attachments (docs, audio — the `Attachment` model) have no "floating,
    not yet attached to anything" state the way `MediaUpload` does, so
    that half stays exactly as it already worked: through the note first.
20a. ~~**A Library "Media/Images" gallery tab, and garbage-collecting
    orphaned `/media/` files.**~~ **Done.** `core/media_gc.py` reconciles
    every `MediaUpload` against live references in note content (through
    `manager.readable_content`, so an encrypted private note is scanned
    too — decrypted), documents, and whiteboard image objects.
    `GET /media/orphans` lists them, `DELETE /media/orphans` deletes; both
    declared before the existing `/media/{upload_id}` route so the literal
    segment isn't shadowed by the path-parameter one. **Refuses to delete
    anything at all** if any private note couldn't be decrypted (vault
    locked) rather than risk treating "can't check" as "not referenced" —
    the one case where a false orphan means real data loss. 7 tests
    (`test_media_gc.py`), including that locked-vault refusal.
20b. ~~**An "Agent Activity" background-task popup cleanup pass.**~~ **Done
    (HISTORY.md §61).** `.agent-monitor` shared `right: 20px` with several
    whiteboard floating panels; moved to `left: 20px`.
21. ~~**A persona on the welcome messages.**~~ **Done, and extended live
    (HISTORY.md §68).** The Chat tab's empty-state greeting now names the
    active persona ("Chat with your Coach"), matching the dashboard
    greeting and AI replies, which already did. Extended live into a
    second, independent `dashboard_persona` preference (empty = "same as
    Chat"), with its own picker in Settings → Personas.
22. **Meeting recordings as first-class objects**: pause/resume, replay, save
    as a voice note, transcribe in the background. Blocked on Tier 1 item 1.
23. **Notification expansion**: reminders, and opt-in AI nudges from the
    utility model. Blocked on Tier 1 item 5 — decide what they *are* first.
24. **Graph layouts beyond Arc** — mind map, treemap/sunburst, adjacency
    matrix. Each is a materially different rendering approach, not a fourth
    case the existing `layoutHierarchy` machinery covers free. The decorative
    half (skins, minimap, PNG export) is the smaller contained piece if a
    session wants a quicker win. Asked for by name as "an Obsidian-style
    knowledge graph": Obsidian's is a force layout, which this app already
    has — the gap reported is closer to *interaction* (smooth pan/zoom feel,
    node-drag responsiveness, a cleaner minimal aesthetic at rest) than a
    new layout algorithm. Worth reproducing what specifically feels
    different — screenshot the two side by side — before assuming it's this
    item rather than a tuning pass on the existing force simulation.
25. ~~**Mind-mapping — decided: a whiteboard mode, not a third tab.**~~
    **Done, verified live (HISTORY.md §57).**
26. **Widgets: a picker**, and more of them. Customisable sidebars, and note
    view options in the Notes tab. Asked for directly as "a widget management
    hub popup on the dashboard, like a widget marketplace" — the foundation
    is already substantial and worth knowing about before rebuilding it:
    `DASH_WIDGETS` in app.js already registers 17 widgets, `dashboard_layout`
    (order/hidden/wide) is a real preference, and Edit layout mode already
    supports add/remove/reorder/wide-toggle inline on the dashboard. What's
    actually missing is a *dedicated surface* — a button opening a proper
    modal/picker rather than an inline edit mode — and more widgets to fill
    it. A UI-surface change on an existing data model, not new plumbing.
27. **llama.cpp, actually wired in.** A new `ai/provider.py` entry alongside
    Ollama/OpenAI-compatible, a GGUF file picker (files on disk, not a
    registry to pull from), and `core/extras.py`'s `unavailable` string
    removed once it is real. Asked about directly and deferred, not forgotten.
28. **§20's async-httpx refactor.** Deferred so there was always a known-good
    streaming path to bisect against; that reason has expired, and the cost
    grows as more providers touch the sync path.
29. **Better-looking theme previews** in Appearance.
30. **Standing backlog, the rest** — [roadmap/BACKLOG.md](roadmap/BACKLOG.md)
    holds ~65 numbered sections; most are either done (check before
    rebuilding — this file's own repeated lesson), blocked on a design
    decision, or genuinely large. The items below are the ones re-read this
    session that are neither: concretely scoped already, no decision
    blocking them, and not duplicated by anything above. Ranked by impact
    versus how contained the change is, highest first. **MCP support**
    (BACKLOG §29, ANALYSIS §60) is no longer in this list — see item 38.
    30a. ~~**Note-list keyboard navigation**~~ **Done (HISTORY.md §68).** A
        roving tabindex through `#entry-list` — arrows move focus, Enter
        opens the focused note the same way its Edit button does.
        Live-verified: Tab into the list, ArrowDown moves the tab stop,
        Enter opens edit mode.
    30b. **Archive** (BACKLOG §4 item 3, elaborated in §26). One `archived_at`
        column each on notes, chats and documents (additive migration), a
        state between "active" and "binned" for things kept but out of the
        way. Already fully scoped; §26 lists three things that build on it
        afterwards (a "delete everything" control, one assembled "your data"
        page, opt-in auto-archive-by-age) but none of those block this one.
    30c. ~~**Chat metadata not surviving a reload**~~ **Checked before
        building, found already fixed (HISTORY.md §70).** `_turn_messages`
        (routes_conversations.py) persists `stats`/`elapsed_ms` on the
        assistant message, and `openConversation`'s replay
        (`if (message.stats) messageMetaLine(...)`) already renders them —
        both already covered by `tests/test_chat_metadata.py`. Re-verified
        live: single-turn, multi-turn, and a turn with tool chips all show
        the correct meta line after a real reload. Whatever prompted this
        item is either already resolved or a different, unreported bug.
    30d. **OCR text extraction on an uploaded image** (BACKLOG §4 item 1).
        A whiteboard photo or a scanned page attaches today as an opaque
        file nothing reads. Local `pytesseract` (no torch, no cloud call) at
        upload time, fed into the existing keyword index, makes "what was on
        that whiteboard photo from March" answerable. A new pipeline stage
        (extract → index), not a wider drop-handler — the drop-handler side
        of file uploads is already done.
    30e. ~~**Undo toasts for soft-deletes, in place of confirm dialogs**~~
        **Done (HISTORY.md §68).** `batchDelete()` already built the undo
        toast under a real soft delete and *also* gated it behind a
        confirm — removed the confirm, matching the single-note "Move to
        bin" action, which already had none.
    30f. ~~**README and GitHub Pages drift**~~ **Done (HISTORY.md §68).**
        Both had settled into naming pre-rebuild systems as current — README
        pointed at "Settings → Activity"/"Settings → Optional extras" (moved
        to the Library / renamed "Packages"); the Pages site claimed "Six
        tabs" and still listed a standalone Documents tab. Fixed both.
    30g. **A per-chat token meter, and an eval harness** — kept as a pointer
        only, not scoped further here; see BACKLOG.md directly for both.
31. **Expand the autonomous background agent's capabilities.** Asked for
    directly, without a specific gap named — today it does three things
    (`_enabled_tasks` in `ai/autonomous.py`): tag untagged notes, link
    conceptually related ones, flag duplicates. Candidates worth scoping
    before picking one: acting on stale/orphaned notes (nothing currently
    reviews a note nobody has touched in months), running the digest or
    on-this-day surfacing proactively rather than only on request, or
    letting a saved skill run on the same schedule instead of only the three
    fixed tasks. Needs a real "which of these, and why" before building —
    "expand the capabilities" alone isn't a spec.
32. ~~**Keyword search has no IDF weighting and can't use an index.**~~
    **Done.** An external-content FTS5 table (`entries_fts`) replaced the
    leading-wildcard `ILIKE` scan, ranked by `bm25()`. See HISTORY.md/the
    ANALYSIS.md §59-adjacent write-up for detail.
33. ~~**`graph_expansion` is hard-capped at one hop, on purpose.**~~ **Done
    — automatic, not a "search deeper" action.** `GRAPH_EXPANSION_HOP2_LIMIT`,
    tagged `connected_2hop` rather than merged into `connected`.
34. ~~**No entity/concept layer above notes — only note-to-note links.**~~
    **Done, at the scoped-down size this item asked for.** `Entity` +
    `EntityMention` (membership only), `ai/entities.py`, behind
    `auto_entities_enabled` (default off), `GET /graph?include_entities=true`.
    Seven tests (`tests/test_entities.py`), graph rendering checked live.
35. **No vision-capable image understanding.** Confirmed by grep, not
    assumed: `ollama_client.py` already reads a model's `vision` capability
    alongside `tools`/`thinking` from the same `/api/show` call §6 built, but
    nothing consumes it — no code path sends an attached image to a vision
    model. Asked for directly, including how it should be configured:
    auto-detected the same way `tools`/`thinking` already are, with a manual
    override in Settings → Models for OpenAI-compatible backends that don't
    self-report capabilities. Wire into the existing image path (paste/drop/
    attach → `/media/upload`), and run it *alongside*, not instead of, the
    OCR idea already scoped in BACKLOG.md §4 item 1 — the two answer
    different questions and are both cheap once the pipeline exists: local
    OCR (`pytesseract`, no torch, always available) extracts literal text for
    the existing keyword index ("what did that whiteboard photo say"), a
    vision model's description (only when one is configured) covers content
    OCR can't read at all ("what's in that photo"). Needs a decision on
    where the description is stored (a note field vs. a side table) and
    whether the agent narrates "generated from an image" the way whiteboard
    AI actions already disclose their own source.
36. ~~**Q&A answers cite which notes matched, not which claim inside the
    answer's prose came from which note.**~~ **Done, backend and frontend.**
    `ai/grounding.py`'s `ground_answer_sentences` scores each answer
    sentence against retrieved notes by shared words (no second LLM call),
    streamed as `/chat/stream`'s own `grounding` NDJSON event, rendered as
    a small per-source-note chip (`renderAnswerGrounding`). Seven backend
    tests (`test_grounding.py`) plus a live Playwright smoke check — the
    actual "a chip renders and says the right thing" path needs a running
    Ollama this sandbox doesn't have, so say so rather than claim it was
    watched. Narrower than a full claim-ledger (ANALYSIS.md §59) on
    purpose: `match_info`, `unsupported_claims` (Tier 1 item 7) and link
    `reason`/`reason_confidence` (Tier 2 item 9) already cover the other
    three related cases; this is just the direct-Q&A-sentence one.
37. ~~**`preferences.json` isn't crash-safe** (ANALYSIS.md §60).~~ **Done.**
    `core/atomic_io.py`'s `atomic_write_json`/`atomic_write_text` (tempfile +
    fsync + `os.replace`) replaced `ConfigManager.set_preference`'s plain
    `write_text()`. Two tests in `test_core.py`, including one that
    monkeypatches `os.fsync` to raise and confirms the on-disk file is
    untouched and no stray temp file is left — confirmed to fail against the
    pre-fix code via `git stash`.
38. ~~**MCP support, now with a concrete shape to build from**~~ **Done, the
    expose half.** `src/memorymap/mcp_server.py`: a stdio JSON-RPC server
    (`initialize`/`tools/list`/`tools/call`/`ping`) over the existing tool
    registry, run with `python -m memorymap.mcp_server`. Only non-destructive,
    currently-enabled tools are ever listed or runnable — no confirm card
    exists on this path to gate `delete_note` and its five siblings the way
    the chat UI's agent loop does, so the safe default is to never offer them,
    checked even when a client asks for one by name directly. 13 tests
    (`test_mcp_server.py`), including a real `serve()` pass over `StringIO`
    stdin/stdout. Consuming external MCP servers is still the separate,
    harder feature BACKLOG §29 already flagged as needing its own trust
    model; not attempted here.
39. **Passive capture: a fifth autonomous-tasks job that mines chat for
    un-filed facts** (ANALYSIS.md §60). Today a note is only filed on an
    explicit instruction or an explicit tool call — something mentioned in
    passing during an ordinary Q&A turn is never captured. An
    `auto_capture_enabled` job alongside the existing `auto_tag`/`auto_link`/
    `auto_dedupe` three, default off for the same reason those are ("it runs
    the agent against the whole notebook with nobody watching"). Needs
    measuring before it ships, the same discipline already applied to §33's
    semantic-tool-retrieval item — a background job that mis-files something
    nobody asked to capture is a worse failure than one that misses something.

### Tier 4 — deferred, with the reason

Not a dump: each says why it is not Tier 3.

- **`app.js` module split** (29.1k lines now, up from the 20.7k this entry
  was last written against — §60's session). Still worth doing
  *deliberately*, and now with an actual first candidate instead of "pick
  something": the whiteboard is a single unbroken, clearly-marked 5,300-line
  block (`// === WHITEBOARD LOGIC ===` at line 23292 through the next marked
  section at 28586) — the largest coherent subsystem in the file by a wide
  margin, and one a session could plausibly extract to `whiteboard.js` in
  one sitting with the `tests-e2e/` Playwright smoke suite as the safety
  net. Not attempted this session — the risk isn't the extraction itself,
  it's doing it *in the same sitting* as live edits to that exact code (this
  session's whiteboard bug fixes), where a half-done split and a bug fix
  landing in the same diff is much harder to review or revert than either
  alone. Do the split on a quiet day, not appended to a bug-fix session.
  (`style.css`'s own split is done — see Priority 0 item 2 above — and was
  exactly this: its own dedicated pass, not appended to anything else.)
- **A second React frontend.** A second implementation of every screen, kept
  in step by hand, for an app whose brief is "no build step". The cost is not
  the first version — it is every change afterwards having two homes. If the
  motive is component structure rather than React, the split above is cheaper.
- **"Make everything faster."** Not actionable as written, and the measured
  slow paths are fixed: PageRank and the similarity sweep are cached per
  notebook version, three N+1s and two O(n²) traps are gone. The next real
  work needs a profile against a large notebook, not a sweep.
- **Spacing and clashing controls across the app.** Real, and too broad as one
  item. The design tokens and the lints make each instance a small fix; raise
  them as they are noticed rather than as a project.
- **A pass over "the Gemini/antigravity improvements".** Done — see
  HISTORY.md's §40. 46 tests and 4 lints so the next such audit is cheaper.
- **The "full UI audit" umbrella.** Break into dated sub-items as capacity
  allows. The concrete pieces left: a colour-scale pass to match the existing
  spacing/type work, and a widget-density sweep.
- **"Clean up, consolidate and refactor the test files."** Asked again
  (§60's session), so this time checked with the actual method the entry
  above calls for, not re-deferred on the same reasoning twice: grepped
  every `@pytest.fixture` across all 107 files for a name reused in more
  than one — none found. The two closest near-misses (`ollama()` in both
  `test_presets.py` and `test_model_specs.py`) build genuinely different
  mocks, not a copy-paste duplicate. **The finding is that there is no
  finding** — no reinvented fixture, no `test_x`/`test_x_more` pair sharing
  setup, nothing a mechanical merge would safely collapse. The largest files
  at the time (`test_skills.py`, then in the 850-900 line range, and a
  handful of others past 700) were each single-topic and coherent, not
  grab-bags — a size-triggered split would separate a fixture from the
  twenty tests that share it for no reason but the line count. Still
  nothing to do here until a real duplication turns up. (Two of the four
  files originally named here no longer exist under those names — one
  renamed, one split by domain in a later pass — so file names are not
  repeated verbatim; the conclusion doesn't depend on which specific files
  happened to be biggest that day.)

### The rule this section exists to enforce

Anything reported goes in here with a tier, **immediately**, even if nobody is
working on it. This project's failure mode is not forgetting to write things
down — it is writing them somewhere a later session does not read, and then
rebuilding or re-deriving them. One ordered list, in the file every session is
told to open first.

## How to work on this repo

- `pytest tests/` — ~1,600+ tests, fully offline, no Ollama needed
  (`pytest.ini` sets `pythonpath = src`).
- `ruff check .` — matches CI.
- `node --check frontend/app.js` — one large plain-JS file; run after every edit.
- **Install non-ML deps by hand** (see root `CLAUDE.md`) — do not install
  `torch` or `sentence-transformers`; both have failed to install cleanly in
  past sessions and the suite passes without them (semantic search falls
  back to keywords; tests that care use a fake embedding backend).
- **Drive the app in a browser before claiming a UI change works.** Chromium
  + Playwright are in the sandbox. Launch with `service_workers="block"` or
  `sw.js` serves a cached `app.js` and you'll be testing yesterday's code.
  Assert on measured geometry (`scrollWidth - clientWidth`), not screenshots.
- **Collect the console while driving.** The app sends a strict CSP; a
  refused style/script/fetch shows up *only* in the console — no failed
  request, no thrown error, the thing just silently doesn't happen.

### Traps that have each cost real time

1. **Don't guess element ids** — check `index.html` or query generically.
2. **`git checkout <file>` discards uncommitted work in that file.** Commit
   before experimenting.
3. **A POST response can lie about stored state** — SQLAlchemy returns the
   in-memory object; assert on the next GET, not the create response.
4. **`utcnow() + offset` is a lie with a timezone attached** — it tags UTC on
   a value that actually holds local wall-clock. Build the user's clock as
   `utcnow().astimezone(timezone(offset))`.
5. **The Notes tab is sub-tabbed.** Anything that scrolls to a note must call
   `showNotesSection("browse")` first, or it targets an element inside
   `display: none`.
6. **The app sends a strict CSP; a violation is reported only in the console.**
   No failed request, no thrown error. An injected `<style>` tag won't apply
   (use `adoptedStyleSheets`), `style=""` in `index.html` won't apply (use a
   class in one of `frontend/css/*.css`), and a script from off-origin is
   refused outright.
7. **CSS automatic minimum sizing is the usual cause of a wide page.** A
   `1fr` grid track or a flex item with default `min-width: auto` refuses to
   shrink below its content; `overflow-x: auto` on the child does nothing
   until every ancestor has an explicit floor.
8. **A POSIX idiom can mean something else on Windows, silently** —
   `os.kill(pid, 0)` terminates on Windows rather than probing; the sandbox
   is Linux, so this class of bug never reproduces here.
9. **A control that "does nothing" is usually working** — check the
   *computed* result. Most reported cases wrote correctly and were then
   overridden by CSS source order, a status poll repainting, or living in a
   hidden section.
10. **This suite cannot see any of the above.** Every UI bug this project has
    found passed a fully green test run first.

Full historical detail for every trap above — the original report, the
diagnosis, the fix, and what verification could and couldn't cover — is in
[roadmap/HISTORY.md](roadmap/HISTORY.md).
