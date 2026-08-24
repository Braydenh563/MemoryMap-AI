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

## What is open right now — start here

Six sessions of finished narrative used to sit above this line. It has moved
to [roadmap/HISTORY.md](roadmap/HISTORY.md)'s "§80 to §86" index, because a
live work plan should open with what is *live* — and because this file has a
2,000-line ceiling that `tests/test_docs_layout.py` enforces, and narrating
completed work at the top is how it got there.

**Before starting anything below, read
[roadmap/HISTORY.md](roadmap/HISTORY.md).** Four sessions have now rebuilt
something that already existed, and the two most recent near-misses were both
caught by one grep: the Reminders calendar view (listed as a gap, already
built and wired) and the graph's own non-visual keyboard layer. A grep miss
and a real gap look identical from the outside.

**Start at [§88](#88--the-live-report-backlog-the-kortexeden-read-and-the-appjs-split).**
It is the current work queue: §88.1 is everything reported and still open, in
order; §88.2 is the Kortex/Eden read; §88.3 is the `app.js` split, which is the
priority once §88.1 and §88.2 are done; §88.4 is the context/memory analysis.
**§88.0 lists what was already fixed — check it before fixing anything.**

**A fifteen-ask report plus a second round of ideas landed together — all of
it, with its audit verdicts and a located handoff list, is [§87](#87--the-connected-notebook-pass-the-editor-layer-and-everything-reported-with-it)
below. Five of those fifteen were already built; §87.1 says which, and where.**

### The live list

Everything genuinely open, ranked. Items 1–2 are the ones with real substance.

1. **Vision-capable models still cannot be shown an image.** `ai/ollama_client.py`
   already has the generic `capabilities()`/`supports()` pair, and Ollama
   reports `vision` in that list for a multimodal model — so the detection
   half exists and nothing downstream ever uses it. Confirmed missing by grep
   over `app.js`: no image-file input is wired into the chat send path at all
   (`chat-attachments` in the chat dock is the note-picker's attached-*notes*
   list, not a file upload). Needs: an image input on the composer, multipart
   handling on the chat route, and the provider layer passing images through
   in whatever shape each backend expects — that last part is the real work,
   and it is why this is the largest item left. Pairs naturally with the OCR
   path, which already exists (`core/ocr.py`): a photo of a page could go to
   OCR *or* to a vision model, the user's choice.

2. **Notes-tab pagination with page-aware note links** — BACKLOG §77, and
   **not** the same as the windowing built in §86. That made the list render
   incrementally while staying one continuous scroll; this is the *user-facing*
   page-size control and page selector that was asked for directly. Its hard
   half is unchanged and still unscoped: a wiki-link click has to land on the
   right *page*, which depends on the sort and filter currently active, not
   just the note's id. Real routing logic; deserves its own design pass.

3. **The Timeline's line view needs a real visual pass** — reported as needing
   to look "very professional and ready for public use", and never scoped
   beyond that. Say what specifically, next time it is reported. The grid
   view's text-cropping half is done; a re-report after that fix was never
   reproduced in this sandbox's Chromium and needs the actual browser/OS it
   happens on.

4. **The Documents editor is behind the rest of the app** (BACKLOG §64). Also
   still open there: `GET /documents` has no search parameter, and the
   whiteboard's `aria-label` coverage lags the Graph's.

5. **Claim-specificity in the hallucination net.** `agent.unsupported_claims`
   catches a claim with *no* matching write ("I tagged it" when nothing was)
   but not one that mismatches what happened ("I tagged it as Work" when a
   different tag was applied). Needs real model output to tune against, which
   this sandbox cannot provide.

6. **Guided first-run tour**, and the rest of onboarding: offering to pull a
   model, a data-dir writability check, and seeded example notes so the graph,
   timeline and dashboard have something to show before the first note exists
   — named by the project's own outside review as the highest-leverage version
   of onboarding. `#onboarding-overlay` already exists as a surface.

7. **Alembic migrations.** The additive auto-migrator cannot rename or drop,
   and will not survive a real schema change. Nothing has needed it yet, which
   is exactly why it is still here.

8. **What happens when Ollama hangs, rather than errors.** The app handles
   Ollama being *off* gracefully; a request that never returns is a different
   failure and a likelier one on this hardware — a model loading for the first
   time can leave a request pending indefinitely. Wants a timeout with a real
   message rather than an unbounded spinner.

9. **Crash-safe recovery for an interrupted re-index or model download.**
   Unknown whether it resumes cleanly or leaves half-written state; worth
   checking directly rather than assuming either way.

10. **macOS release packaging.** Linux is done; macOS is not.

10a. **faster-whisper will not install, and nobody has yet seen the real
    error.** Reported twice from a live Windows session, the second time with
    a screenshot: the Background-tasks card says "pip exited with code 1. The
    log above says why" and there is no pip output above it. A fix landed to
    route `core/extras.py`'s install output through Python `logging` (so
    `logbuffer.py` can see it and Settings → Logs can show it), because pip's
    captured output never went through `logging` and was therefore invisible
    on the Logs page. **That fix has never been confirmed to surface anything**
    — no session has captured the real Settings → Logs output from a live
    failure since. Next step is not a code change: it is one run on the
    machine that fails, searching the Logs page for `memorymap.extras`, and
    pasting what it says. Everything before that is guessing, and two sessions
    have already guessed.

11. **Sorting and grouping saved chats** — conversations sort by recency and
    nothing else. The data to sort by (model, token cost, timestamps) is
    already stored per turn, so this is a list-rendering job.

12. **The Documents Library sub-tab needs a full visual redesign.** Reported
    directly and bluntly: "SOOOO ugly and not consistent with the other
    application design style ui and other pages." This is the same gap
    §88.1 item 8 already named ("cards, metadata layout and empty state all
    unstyled beyond the basics") but the report this time is stronger and
    specifically contrasts it against the rest of the app's design language
    — worth treating as its own pass rather than folded into item 8's
    general "give it a look" note. Start by screenshotting it beside a
    polished Library sub-view (All, or Whiteboards after its own pass) to
    name concretely what differs, per this file's own rule about vague
    visual reports.

13. **Back/forward navigation still misses most navigation types.** Reported
    directly, and traced to source rather than guessed at: `recordTabVisit`
    (`app.js`) has exactly two call sites — one in `switchTab` (top-level
    tabs) and one in `showNotesSection` (Notes' four sub-tabs). Everything
    else that feels like navigating is invisible to it: Library's own
    sub-tabs (All/Documents/Whiteboards/Image Gallery/AI Skills — this is
    also item 12 below, "Back/forward across the Library's own sub-tabs"),
    opening/closing a document in the editor, entering/exiting Graph focus
    mode, and switching between saved chat conversations. The `{tab,
    section}` shape `recordTabVisit`/`showNotesSection` already use is the
    pattern to extend to each — Library's sub-tab handler (`whiteboard.js`)
    is the cheapest first step since it is already scoped as item 12.

### Smaller, and genuinely cheap

- **`ai/tools/__init__.py` is still ~3,360 lines** — the `TOOLS` registry plus
  most note-CRUD and agent orchestration. Left deliberately when the other
  four modules were extracted; it is the most interleaved part of the file and
  needs its own session.
- **`manager.all_tags()` has no cap**, unlike every sibling section of the
  same responses. Now cheap on a cache miss (§86 made it a column-only
  select), so this is lower urgency than it was, not gone.
- **Mirroring ordinary toasts into the notifications panel** — the other half
  of the mute feature. Every `toast()` call site needs a `kind` first, or the
  panel floods with routine "Saved." noise.
- **A `prefers-reduced-motion` audit of the remaining meaningful animations**,
  and a screen-reader pass over the dynamic regions that announce nothing
  (BACKLOG §19; the focus-trap and tap-target halves are now done).
- **Colour-contrast verification against WCAG AA** for the newer palettes and
  the glass surfaces specifically. Never actually measured.

### New this session, not yet scoped

- **The Library grid and the Notes list now share `renderIncrementally`, and
  the Timeline and log console deliberately do not.** The Timeline is a CSS
  grid whose cell order *is* its layout; the log console is already capped and
  its follow mode needs the newest rows, which an from-the-top renderer would
  never paint. Both decisions are commented at the call site. If a third list
  ever wants windowing, check which shape it is first.
- **33 CSS selectors look orphaned to a naive sweep and are not** — they are
  built by template (`heat-${n}`, `library-${kind}`, `priority-${p}`,
  `result-reason-${r}`, `plan-step-${s}`, `outline-h${n}`, `graph-edge-${k}`).
  Three genuinely dead rules were removed in §86. Anyone re-running that sweep
  should expect the same 33 false positives rather than deleting them.
- **`GET /entries?semantic=true` is now called from two places** (the Notes
  tab and the Library). If a third appears, the fetch-and-cache shape in
  `refreshLibrarySemantic` is the one to extract.

## §88 — the live-report backlog, the Kortex/Eden read, and the app.js split

**This section is the next session's work queue, in order.** §88.1 is what was
reported and is still open; §88.2 is the competitor read the user asked for;
§88.3 is the app.js split, which is the priority *after* §88.1 and §88.2 are
done; §88.4 is the context/memory/harness analysis.

Everything here was reported live in one long session. What was fixed in that
same session is in §88.0 so nobody re-fixes it.

### 88.0 Fixed already — do not re-fix

| Report | Cause |
| --- | --- |
| "Run Skill buttons in the AI Skills library are broken" **and** the `app.js:10495` console error | One line, two symptoms: `startSkill(skill.name)` passed the name *string* where the skill object was expected **and** omitted `values`, so `Object.values(undefined)` threw. Now `runSkill(skill)` |
| "The documents subtab cards don't even do anything" | `openDocument()` loaded correctly but the Documents *page* stayed hidden behind the Library tab. Needed `switchTab("documents")` first |
| "The Open button on a selected draft does nothing" | `openLibraryItem` had no branch for the `draft` kind, which arrived with the new Drafts chip. `flashEntry` already knew how to reveal a draft |
| "There's no way to publish a draft as a proper note" | There was — the draft chip — labelled "click to clear the label", which names the mechanism and not the outcome. Relabelled |
| "The `/` command popup isn't scrollable and disappears when I try" | A capture-phase `scroll` listener saw the menu's *own* wheel event and closed it. Now ignores scrolls inside the menu, plus `overscroll-behavior: contain` |
| "The top menu bar shifts when I open the settings modal" | `scrollbar-gutter: stable` was applied **only** under `.modal-open`, so opening a dialog *added* a gutter that had not been there a frame earlier. Now reserved permanently |
| "Weird small circles left hanging when I change where links connect" | Link endpoint handles are appended to `#wb-overlay-zoom-group`; **both** existing clears only swept `#wb-zoom-group`. Every render appended a group and none was removed. One `wbClearSketchHandles()` now clears both layers |
| "Tune semantic search should show at all times" | The control lived inside `#chat-results`, which is `hidden` until an answer exists — so the thing that changes how search behaves could only be reached *after* running one. Moved to the ask row |
| "The export folder rows have no gap" | `.row`'s gap applies *within* a row, not between two of them. `.settings-row-spaced` |
| "The documents sub-tab search box is a different height" | Same failure DESIGN.md names for the graph strip: an `<input>`'s own padding outgrows a button unless the row sets one height. `--control-h` applied to that head |
| "The skill-logs sidebar should be sticky and viewport-height" | `#skills-sidebar` had **no CSS at all** — it carried `card glass` but not `sidebar-panel`, so it scrolled away with the page |
| "The new-chat button clashes with the collapse button" | The collapse toggle is absolutely positioned at the sidebar's top-right and the heading row's trailing button sits in the same place. The head now reserves `--sidebar-toggle-lane`, a token that already existed for exactly this |
| "Back/forward should handle sub-tabs too" | History entries are now `{tab, section}`; `showNotesSection` records one. Verified: browse → back → capture → back → ask → forward → capture |
| Whiteboard "janky and uncomfortable" | `renderWhiteboard()` (a full d3 join over every item) was called from **48 sites**; one action touches several. All now coalesce into one rAF via `wbScheduleRender()` |
| "Make link creation on the graph offer a kind, a reason, and a cancel" | Built — see §87.5's typed links, now shipped as `EntryLink.link_type` plus the drag-to-link dialog |
| "The dashboard widgets are completely broken" **and** `Unhandled promise rejection: TypeError: Cannot read properties of null (reading 'replace')` | One bug, reported as two. §88.0's own `startSkill` fix (row above) stopped new corruption but never cleaned up what it had already written: `JSON.stringify` turns `undefined` into `null` inside an array, so a profile that ran a skill during that bug's window carried a permanent `null` in `recentSkills`. `withoutLeadingEmoji()` called `.replace()` on it unguarded, on every dashboard render, before the widget grid populated. Fixed at all three points — write guard, a self-healing read-side filter that rewrites the cleaned list (so an already-affected profile repairs itself on next load), and a defensive coercion — reproduced and verified live in this sandbox's Chromium |
| Categories sidebar heading smaller than Chats/Documents | A stale ID-selector `#sidebar h2 { font-size: var(--text-lg) }` outranked the unified `.card h2` (§35L) by specificity for this one sidebar. Removed |
| "The docked ui at the top of the graph needs a cleanup" (second pass) | "+ New note" grouped with the "?" help button instead of bookending the strip alone; Layout/Colour segmented controls split into two labelled groups (they shared one with no "Colour" label); Minimap moved into the Options panel with the other "tuned once" settings |
| Skill Logs sidebar still not full height after the first fix | Same bug `.doc-sidebar` already hit once: `align-self: start` + `max-height` alone is a ceiling with no floor. Applied `.doc-sidebar`'s complete pattern (`align-self: stretch`, `height: 100%`, `max-height: var(--page-sticky-h)`, flex column, list scrolls not the card) instead of the partial version tried first |
| Link-kind dialog ("How are these connected?") text unreadable in dark theme | `.link-kind-option` overrode `background` to transparent but not `color`, so it kept the global `button` rule's `color: var(--on-accent)` — `#0d1017` in dark theme, meant for text on that same rule's bright accent fill, not a transparent button. Added `color: var(--ink)` |
| Back-to-top button "too much to the left" on Notes, displaced on Library | `positionScrollTopForNested` always pulled the button in from the panel's own edge, stacking a second margin on top of the page's own — Notes has no right-side element to clear at all. Now only pulls in when a real right-side panel (the Skill Logs sidebar) is actually present; otherwise matches every other tab's flat offset |

### 88.1 Reported and still open — work this list top-down

**Tier A — broken behaviour.**

1. **"The AI randomly fails in the Ask sub-tab saying it isn't available."**
   The user notes they set the chat model to their *utility* model, and that is
   very likely relevant: two model slots exist (`chat_model`,
   `utility_model`) and a slot pointing at a model the backend has not loaded
   reports unavailable. **Reproduce before theorising** — check
   `/models/status` and which slot `routes_chat` actually reads. Related:
   `GET /models/status — signal timed out` in the same log, which suggests the
   status poll itself is timing out and the UI is reading that as "no AI".
   These may be one bug.
2. **`Unhandled promise rejection: TypeError: Cannot read properties of null
   (reading 'replace')`.** Not yet located — no line number was captured. Next
   session should reproduce with the console open and get one; grep for
   `.replace(` on values that can be null (`prefsCache` fields and
   `doc.title` are the likely shapes).
3. **The notebook constellation canvas keeps disappearing.** ARCHITECTURE §10
   already documents the general version of this bug (p5 measures a canvas as
   zero inside a hidden tab and must redraw on theme change). The widget was
   fixed once for theme changes; this is a *second* trigger. Check what else
   hides/reshows the dashboard.
4. **The new-chat button disappeared from the Ask tab.**
5. **The AI Skills sub-tab "is just very unfinished and nothing really
   works."** Confirmed in passing: its **Schedule** button is a literal
   placeholder (`toast("Scheduler functionality coming soon!")`). Needs its own
   audit pass — treat "nothing works" as a scope, not a bug.
6. **The graph is slow and janky to move around.** Still **not diagnosed** and
   deliberately not guessed at. Profile a pan and a node drag *separately*
   before changing anything — the whiteboard's equivalent had one specific
   cause, and HISTORY §71 already took the cheap wins here.

**Tier B — UI/UX, each concrete.**

7. **Back/forward across the Library's own sub-tabs.** The Notes sub-tabs are
   done (§88.0); the Library's `#library-subtabs` handler lives in
   `whiteboard.js` and does not record history yet — same `{tab, section}`
   shape.
8. **The Documents Library sub-tab needs a visual redesign.** Its search-box
   height is fixed (§88.0); the *look* of the list is still the plain one this
   session shipped — cards, metadata layout and empty state all unstyled
   beyond the basics.
9. **The Whiteboards Library sub-tab is bland** — same pass.
10. **The graph dock may get too tall and squish the graph.** Now three
    deliberate rows; if it grows again, the answer is an overflow menu rather
    than a fourth row.
12. **The minimap needs a visual and usability upgrade** (its corner is now a
    user setting, but the map itself is unchanged).
13. **Graph node labels show raw callout syntax** (`Review > [!tip] Remem…`).
    The label builder should strip block markers the way `extract_title`
    already strips a leading `#`.
17. **Timeline line view redesign** — the concrete design is §87.6: threads as
    tributaries off a time trunk, using `Entry.parent_id`, which that view
    currently ignores entirely.
18. **Semantic search ignores time words** ("recents"). Belongs in
    `ai/intent.py`, which already classifies `needs_retrieval`.

**Tier C — the big editor feature, worth its own session.**

19. **A hybrid live-rendering document editor.** Asked for precisely: "a mix
    between the straight md editor and the rendered version where it renders as
    the user finishes typing… if you click on the line or the section it will
    unrender until unselected, in which it will rerender." This is the
    Obsidian Live Preview / Typora model.

    **This is not a small change and must not be started casually.** The
    current editor is a `<textarea>` plus a separate rendered preview pane, and
    everything built on it assumes that: `applyMarkdown`, `wrapDocSelection`,
    find/replace, the `/` menu's caret maths, the `[[` autocomplete, autosave.
    A live-preview editor is a `contenteditable` or a block-based document
    model, and every one of those has to be re-implemented against it.

    **Recommended path: a per-block editor, not a whole-document
    contenteditable.** Render each block (paragraph, heading, callout, list) as
    rendered HTML; the block containing the caret swaps to a plain textarea
    holding that block's markdown; blur re-renders it. That keeps the existing
    textarea machinery working *inside one block at a time* rather than
    replacing it, and it is exactly the "unrender the section you are on"
    behaviour asked for. Do it behind a Settings toggle, with the current
    editor as the default until it is proven.

### 88.2 Kortex / Eden — what is worth taking, and what is not

Two analyses were supplied. Eden is Kortex's successor and is a **cloud,
social-media** product; the user's instruction is explicit: *"make sure to keep
everything local, I don't want the cloud stuff."* So the social corpus, the
multi-platform scheduler, the creator index and the affiliate system are all
**out** — not because they are bad, but because they are the half of Eden that
cannot exist in a local-first notebook.

**Already built here — do not "add" these:** an MCP server
(`src/memorymap/mcp_server.py`), markdown export, a document/notes split, AI
synthesis over the notebook, saved prompts (skills), audio (read-aloud), and a
web reader with highlight capture.

**Worth taking, ranked by value per unit of effort:**

1. **Boards hold *references*, never copies.** Eden's single best structural
   idea, and it is the honest answer to the still-open **note clusters** ask
   (§87.3): a cluster is a *board of references* — nothing is duplicated, a
   note can be on many boards, and removing it from one changes nothing else.
   This app already has a whiteboard with `group_id`; the missing piece is that
   a board can hold a *reference to a note* as a first-class citizen.
2. **Drag from an item's connection dot onto empty canvas to spawn a chat
   already connected to it.** The whiteboard already has real anchor points and
   AI actions; this joins them into one gesture and is the single most
   compelling interaction in either product.
3. **The pane system** — open anything in a side pane while writing, and keep
   research/chat visible beside the draft. The document editor already has a
   sidebar; this generalises it to "open *any* item in a pane".
4. **Custom AI = instructions + chosen knowledge sources**, with **"use when"
   rules** so the assistant knows when to reach for a source. This is a direct
   upgrade to the existing skills/personas: today a skill is a prompt, and the
   gap is attaching a *bounded* knowledge set to it. Local equivalent of
   sources: selected notes, documents, boards and tags — never creators.
5. **The interview technique.** Kortex's "interview me, then help me apply
   this" prompt pattern extracts the *user's* ideas instead of generating
   generic text. Cheap: it is a skill, not a feature.
6. **Reader-mode capture with citations preserved.** Partly built (the web
   reader); the missing half is that a highlight becomes its own first-class
   item with its source link intact.
7. **Audio overview of a notebook/document**, generated locally with the
   existing read-aloud voices and saved as a file. The private-RSS half is
   cloud and should be dropped; the "listen to my research" half is not.
8. **Automation pipelines** — user-facing trigger→action rules. The autonomous
   agent already does four fixed jobs; this is the same machinery with a UI.

**Explicitly not taken:** the social corpus and outlier detection, multi-platform
scheduling, auto-DM, creator-as-voice-clone, pooled team credits, affiliate
links. All require a cloud service and other people's data.

**On the UI/UX quality the user admired:** the concrete, copyable parts are
(a) keyboard-first navigation with visible shortcuts, (b) one primary loop
stated plainly — capture → discover → write, (c) panes instead of modal
context-switching, and (d) restraint: few controls visible at rest, more on
demand. This session's graph-toolbar work is (d); the pane system is (c).

### 88.3 The app.js split — the priority after §88.1 and §88.2

**Do this next, and deliberately.** `app.js` is ~27,400 lines.
`graph.js` (3.0k), `whiteboard.js` (5.9k) and now `editor.js` (~0.9k) are
already out, so the pattern is proven three times over.

Order, easiest and most self-contained first:

1. **`documents.js`** — the document editor (`app.js:7331-8127` before this
   session's edits): autosave, outline, find/replace, preview, AI edit,
   export. It has clear seams and one entry point (`openDocument`).
2. **`library.js`** — the Library (`app.js:19209+`), which already has its own
   sub-tab switcher living in `whiteboard.js` (an accident worth fixing while
   splitting).
3. **`dashboard.js`** — widgets, masonry, the generative art.
4. **`settings.js`** — the settings modal, logs console, appearance.

**The rules that make it safe**, all learned here: never split in the same diff
as a behaviour change; load order is load-bearing only where a file is read at
*parse* time (see index.html's own note on why `graph.js` must precede
`app.js`); and add every new file to `tests/test_frontend_handlers.py`'s
`_source()` — a lint that cannot see a file cannot catch anything in it.

### 88.4 Context, memory and harness engineering — an analysis

Asked for directly. What exists, and where the real headroom is.

**What exists.** Retrieval is `search_manager.retrieve_detailed`
(`routes_chat.py`), gated by `ai/intent.py`'s `needs_retrieval` so a chat turn
that needs no notes does not pay for a search. The system prompt is budgeted
and **asserted** (`agent.PROSE_BUDGET_CHARS`) because every sentence is resent
each round. Conversations can be compressed (§35I). Tools are a fixed registry
in `ai/tools/`. There is a "what the AI remembers" surface (§39B).

**The five real gaps, in order of value:**

1. **Retrieval is single-shot and similarity-only.** Candidates come from
   embedding cosine; there is no re-ranking, no query expansion, and no second
   pass when the first returns nothing useful. The cheapest meaningful upgrade
   is **hybrid retrieval** — combine the existing FTS keyword index with the
   vector search and merge by reciprocal rank. Both indexes already exist.
2. **The graph is not used for retrieval.** This app's differentiator is that
   it *knows how notes connect*, and the chat context is assembled by
   similarity alone. Once §87.5's `link_type` is populated, expand retrieval
   along strong edges from the top hits — `entry/paths.py` already walks them.
   This is the single highest-value item on this list.
3. **Memory is a surface, not a system.** There is no tiered notion of
   "always in context" (a small durable profile), "retrieved when relevant"
   (the notebook), and "this conversation only". A short, user-editable
   always-on memory block — explicitly capped and shown in Settings — is a
   contained change with a large effect on how the assistant reads.
4. **No token accounting per stage.** The prompt budget is asserted, but there
   is no measurement of how much of a real context window goes to system
   prompt vs. retrieved notes vs. history. Instrument it before tuning it; a
   per-turn breakdown makes every later decision evidence-based. (BACKLOG's
   per-chat token meter is the same idea.)
5. **Tool retrieval is all-or-nothing.** Every tool definition is sent every
   round. §33 already scoped semantic tool retrieval and rightly said it needs
   measuring first — item 4 is the prerequisite.

**One caution that applies to all five.** Every provider test in this repo runs
against a fake transport, and this sandbox has no reachable model. Retrieval
quality changes cannot be evaluated here at all. Build the measurement (item 4)
and a small fixed question set *first*, or every one of these becomes a change
nobody can prove helped.

## §87 — the connected-notebook pass: the editor layer, and everything reported with it

Fifteen asks arrived in one message, then a second round of ideas on top. This
section is the whole of it, **audit-first**: every ask was checked against the
source *before* being scoped, because this project's most expensive recurring
mistake is rebuilding something that already exists. **Five of the fifteen
turned out to be already built or half-built.** Those rows are the most
valuable part of this section — they are what stops a sixth session rebuilding
them.

### 87.1 The audit — do not rebuild these

| Ask | Verdict | Where it already lives |
| --- | --- | --- |
| Slash commands | ABSENT (now built, 87.2) | BACKLOG §64 confirmed it |
| Callout boxes / frames | ABSENT (now built, 87.2) | `renderMarkdown`'s blockquote branch had no `[!kind]` sniffing |
| Wiki-links | PARTIAL | Worked in notes (`renderNoteText`) and doc preview (`layerDocWikiLinks`) — but two *different* resolvers, `[[` autocomplete on `#entry-content` only, and no create-on-miss. Backend hook: `sync_wiki_links`, `entry/manager.py:1496` |
| Gravity / spread sliders | **ALREADY BUILT** | `index.html:1263-1269`, applied `graph.js:1255-1273`, persisted. Known gap: no effect under tree/radial (BACKLOG §536) |
| Move nodes freely | PARTIAL | Drag exists (`graph.js:1411-1476`) but **clears `fx/fy` on drop**. Double-click pin exists (`:1496-1508`) but is **never persisted** |
| Hide nodes / groups | PARTIAL | Category-legend hide, orphan hide and time filter all exist. **No per-node hide, no marquee** — a full marquee exists only in `whiteboard.js:3167-3320` |
| Graph → whiteboard | ABSENT | But **both auto-layout engines already exist**: `ai/tools/whiteboard.py:263-432` and `wbMindMapSpanningTree` |
| Custom graph configurations | **ALREADY BUILT** | Saved views, `graph.js:2839-2958` |
| Document outline / sections | PARTIAL | `renderDocOutline` existed; jumping was caret-based and `renderMarkdown` emitted no heading ids |
| Document → notes | **ALREADY BUILT** | `#doc-extract` → `openExtractPreview`, backend `source_document_id`. Note→doc too (`expandNoteIntoDocument`) |
| Parent / child notes | **ALREADY BUILT** | `Entry.parent_id`, `core/database.py:198`, commented "a child continues its parent". Rendered nested, walked by pathfinding, feeds staleness |
| Thought continuation | PARTIAL | "Continue" exists **on note cards** (`app.js:1877`, posts `parent_id`). **Not in Capture** |
| Capture: manual link picker | ABSENT | `saveEntry` posts only `{content, tags, category, document_ids}` |
| Suggest links + editable reasons | **ALREADY BUILT — in the Graph tab** | `#link-suggest-btn` → `loadLinkSuggestions` (`app.js:21358-21500`), confidence + editable reason + Link/Dismiss. **Relocate, do not rebuild** |
| Note clusters | ABSENT as specified | See 87.5 — four adjacent concepts exist and none fits |
| AI link quality | PARTIAL | Candidates are **pure embedding cosine** (`routes_entries.py:476-502`); the LLM only writes the reason afterwards (`ai/links.py:97-185`). `EntryLink` is untyped |
| Ask latency | NOT a frontend bug | Explicit submit, so debounce is correctly absent. Cost is `search_manager.retrieve_detailed` + model streaming. No client answer cache |
| Loading animations | PARTIAL | `spinnerEl`, `typingDots`, shimmer skeletons and progress bars all exist with reduced-motion fallbacks. **Uncovered:** graph link-suggestions fetch, Library semantic refresh, note-picker search |
| Documents editor "behind the app" | **STRONGER THAN ROADMAP CLAIMED** | Already had autosave + beforeunload guard, word goal, preview, AI edit, extract-notes, find/replace, md/PDF export, outline sidebar |
| Features feel disconnected | STRUCTURAL | **Documents was not in the tab bar** — `TABS` carried it but `revealTab` aliased it to Library |
| Whiteboard "janky" | **ROOT CAUSE FOUND** | `renderWhiteboard()` is a full d3 data-join over every item, called from **49 sites**, no dirty flag, no rAF batching, drag handlers re-allocated inside the render |

### 87.2 Built this session

- **`frontend/editor.js`** (new file — deliberately not more of `app.js`; see
  Tier 4 on why a split must not share a diff with live edits). The `/` menu:
  caret-anchored popup measured with a mirror div, four command groups
  (blocks/frames, links/references, AI actions, templates), ranked matching,
  and **one delegated listener per event** rather than per-textarea — which is
  why `ALLOWED_DOUBLES` in `test_frontend_handlers.py` needed no new entry.
- **Callouts**, `> [!kind] Title`, eight kinds. Syntax chosen because it
  degrades to an ordinary blockquote in any other reader — portability is the
  premise of a local-first notebook that stores plain markdown. Body is
  markdown-rendered, so a callout can hold lists and code.
- **Heading anchors** in `renderMarkdown`, de-duplicated per render.
- **Transclusion `![[note]]`**, notes only and deliberately so: `GET /documents`
  returns no content, and `renderMarkdown` runs on every streamed chat chunk,
  so a fetch in that path is a request storm waiting to happen.
- **One wiki resolver** (`resolveWikiTarget`) replacing the note-only and
  document-only pair, so `[[name]]` finally means the same thing in every pane.
- **Create-on-miss**: clicking an unresolved link offers to create the note or
  the document. **User-confirmed, never background** — silently materialising
  notes from typos is exactly what the autonomous agent is careful not to do.
- **Documents promoted to a real tab**, reversing §36F. That reversal is
  commented at both sites rather than silently applied: §36F correctly removed
  a *second list*; what it did not anticipate is that being reachable only
  *through* another tab is what made the feature read as second-class.
- **`test_frontend_handlers.py` extended to scan `editor.js`** — a lint that
  cannot see a file cannot catch anything in it.

### 87.3 Tags as first-class objects — the decision behind note clusters

The cluster ask ("group notes for a purpose, without affecting links") has
**four adjacent concepts that each fail it**: *spaces* partition (a note is in
exactly one, others vanish), *categories* are one-per-note, *whiteboard
`group_id`* is board items only, and the graph's own "clusters" are **computed
connected components** — the literal opposite of link-independent. *Tags* are
the only many-per-note, user-defined, link-independent thing already here.

So the recommendation is **not a fifth concept — promote tags**. Today
`Entry.tags` is a JSON array of strings (`database.py:189`). First-class means
a `Tag` table (id, name, description, colour, created_at) plus an association
table, and it buys, in one change:

- **Rename a tag everywhere at once.** Today a rename means rewriting the JSON
  array on every note that carries it.
- **Merge two tags** (`work` / `Work` / `work-stuff`) — the single most common
  real tag-hygiene job, and currently impossible without a script.
- **A description and a colour**, which the graph can then key off.
- **A tag becomes an object**, so it can be a node, collapse, and be saved in a
  view — which is what the cluster ask actually wanted.

**Two warnings, both load-bearing:**

1. **This makes Alembic (live-list item 7) a real prerequisite, not a
   nice-to-have.** A new table plus a one-time backfill of every note's JSON
   array is precisely the change the additive auto-migrator "cannot rename or
   drop" warning is about. Do not start this while migrations are hand-rolled.
2. **Keep `entry.tags` working as a property.** Every read path in the app and
   the AI tools reads it as a list of strings. If the promotion changes that
   shape, the blast radius is the whole codebase; if it stays a hybrid
   property over the new rows, it is contained.

### 87.4 Grouping the graph by tag — the real problem is the many-to-many

Asked for directly. Worth stating plainly: **the rendering is the easy half.**
`graph.js` already colours by category and already has hierarchy layouts. The
actual design problem is that a note has **one** category but **many** tags, so
"group by tag" is ambiguous for every multi-tagged note. Three honest options:

- **(a) Primary tag** — first tag wins. Trivial, and quietly wrong for the
  notes that matter most (the well-tagged ones).
- **(b) Tag supernodes** — each tag is a node; notes link to their tags. A note
  with three tags sits between three anchors and the force layout does the
  rest. Composes with 87.3, and is the closest to what was asked for.
- **(c) Duplicate the note per group** with ghost edges. Reads well, but two
  dots for one note breaks every count and every selection.

**Recommendation: (b)**, and only after 87.3 — a supernode needs a tag object
to *be*.

### 87.5 Link strength and typed links (extends the Phase D work)

Asked for directly and it is a good idea, partly because **half the field
already exists**: `EntryLink.reason_confidence` is a float that today only ever
holds an embedding cosine score. Generalising it into a composite strength over
several signals is the natural next step:

| Signal | Where it already is |
| --- | --- |
| Embedding similarity | `routes_entries.py:476-502` |
| Explicit `[[wiki link]]` | `sync_wiki_links` — should be the **strongest**; the user typed it on purpose |
| Thread parent/child | `Entry.parent_id` — structural, not inferred |
| Shared tags (Jaccard) | `Entry.tags`, better after 87.3 |
| Same category | `Entry.category_id` |
| Temporal proximity | `created_at` — written the same afternoon is a real signal |

**Two design calls to make before writing any of it:**

1. **Store the components, not just the number.** This app already learned that
   "these are related" is not good enough — that is why link *reasons* exist. A
   single blended 0.72 is the same mistake in numeric form. Store the
   contributing signals so the UI can say *"shared tags (work, q3), same
   category, written the same day"*. That is also what makes the score
   debuggable when it is wrong.
2. **Store explicit, compute derived.** An explicit link's type and strength
   belong in the row. Shared-tag and same-category strength changes every time a
   tag changes, so storing it means an invalidation problem; compute those at
   query time, which is what `_similarity_edges` already does for similarity.

**And the part that makes it worth doing:** `entry/paths.py`'s traversal is
currently unweighted, so "trace a path between these two notes" treats a
throwaway similarity edge and a hand-typed wiki link as equal. Weighting the
traversal by strength improves *both* the Trace feature and the AI's context
retrieval, which share that code. That is the payoff — not the number itself.

### 87.6 The Timeline line view — a concrete design, at last

Live-list item 3 has said "needs a real visual pass" and nothing more, twice.
Here is the specific version, and it comes from joining two things already in
the repo that nobody has connected:

- `IDEAS.md` asks for **"a visual timeline like a branching line with off
  shoots"**.
- `Entry.parent_id` **already stores exactly that branch structure** — threads,
  where a child continues its parent. The line view currently ignores it
  entirely and renders one flat chronological line.

So the design is: **the trunk is time; a thread is a tributary.** A note with
children sprouts a branch that runs alongside the trunk and rejoins nowhere —
it just ends where the thread ended. No new data, no new endpoint; the branch
structure is a `parent_id` walk the pathfinder already knows how to do
(`entry/paths.py:189-191`). Everything else (curve style, density, labels) is
polish on top of a structure that finally means something.

### 87.7 General visual pass — what is actually worth doing

Grounded in the audit rather than invented, and marked where already tracked:

- **Loading states on the three uncovered surfaces** (87.9 item 4). The
  primitives all exist; this is application, not design.
- **Colour contrast has never been measured against WCAG AA** — already an open
  live-list item, still true, and now with more surfaces (callouts add eight
  tinted backgrounds that nobody has measured text against).
- **Emoji vs. icons is a *pending decision*, item 16f** — and note that this
  session's callouts and `/` menu use emoji, consistent with the app as it
  stands today. If 16f lands on an SVG set, `CALLOUT_KINDS` in `editor.js` is a
  single data table and the `/` menu's labels are one more; both are cheap to
  convert, which is why they were written as data.
- **Empty states**, unscoped and worth a sweep: what the graph, timeline and
  dashboard show before the first note exists is already named as the
  highest-leverage onboarding work.
- **The whiteboard has no minimap** though the graph now does — an asymmetry,
  not a bug.

### 87.7b Reported live during this session — fixed, with what was measured

- **The minimap covered the zoom buttons.** Reported, then measured rather
  than assumed: at 1400×900 the minimap spanned x1160–1338 and the zoom
  buttons x1298–1334, and at z-index 5 against their 2 it won outright.
  **Its corner is now a user setting** (the user's own suggestion, and the
  right one — no corner is free on every layout: the toolbar owns the top, the
  agent monitor bottom-left, the zoom buttons bottom-right). Default top-left.
  Verified: `overlapsZoom: false`, the choice persists, "off" hides it.
- **The graph toolbar was a flat run of a dozen equally-weighted controls**
  that wrapped into a mostly-empty second row. Now five labelled groups with
  hairline separators. Measured after: 5 groups, 2 rows, **every control 32px**
  (the one-height rule DESIGN.md states for this strip), no horizontal
  overflow. The minimap's visibility and position were **merged into one
  control** rather than added as a second — the redesign should not be paid
  for with more clutter.
- **Back/forward between pages**, in the status bar as asked, visually
  distinct from undo/redo (caret icons vs. u-turn arrows, plus a divider —
  they move you between pages; undo/redo change your notes). Deliberately not
  `pushState`: this is a single page with no routing, so browser history
  entries would let its Back button walk out of the app entirely. Verified
  including the browser rule that a new visit mid-stack discards what was
  ahead.
- **40 form controls had no accessible name at all** — mostly whiteboard
  ones, which confirms the roadmap's own note that the whiteboard's
  `aria-label` coverage lags the graph's. All 40 now carry a name and a
  tooltip; a re-run of the audit reports zero remaining. Worth recording how
  that number was reached: a naive sweep flagged **212 buttons**, but a
  visible text label *is* an accessible name, so a tooltip on a button that
  says "Save" is noise rather than a fix. Filtering to controls with no
  visible text left 9, of which 7 are labelled at runtime by
  `paintStatusItem` — the genuine gap was the form controls, not the buttons.
- **"The search relevance settings section stays highlighted permanently."**
  Real, and a good example of the shape this codebase keeps meeting. Three
  places add a `flash` class; two clear it on a 2,700 ms timer and this one
  never did. It looked harmless because the animation ends on `transparent`,
  so on an ordinary machine the highlight fades and the stuck class is
  invisible — but under `prefers-reduced-motion: reduce` the stylesheet
  deliberately swaps the animation for a **static** outline and background,
  and with nothing removing the class that highlight is permanent. Fixed by
  giving it the same cleanup its two siblings already had, and verified with
  the browser context set to `reducedMotion: "reduce"`.

### 87.7d The Library restructure, and the Documents-tab reversal

Decided with the user, and worth recording because it **reverses a decision
made earlier the same session** — Documents was promoted to a top-level tab
and then moved back.

The reason the reversal is right: the original complaint ("documents feel
inaccessible") was diagnosed as *depth of click*, and it was not. The Library
sub-tab labelled **"Documents" actually showed everything** — notes, chats,
files and documents together — so the one place a person would look for their
documents was the one place with no documents-only view. Promoting a top-level
tab treated the symptom; giving Documents its own Library section treats the
cause.

What changed:

- Library sub-tabs are now **All · Documents · Whiteboards · Image Gallery ·
  AI Skills**. The first kept its `library-view-documents` id (referenced in
  several places; a rename buys nothing) and is now labelled "All".
- **Documents gets its own section**, `library-view-docs`, with title search,
  a new-document button and word/updated metadata. It reuses `GET /documents`
  and `openDocument()` rather than adding an endpoint or a second path into
  the editor.
- **Drafts stopped being a sub-tab and became a chip** in the All view's
  filter row. A draft is a state a note is in, not a separate kind of object.
  This needed a real backend collector (`_drafts()` in `routes_library.py`),
  **not** a relaxed filter: drafts are deliberately excluded from `_notes()`
  because "draft notes appear as regular notes in the main library" was
  reported and fixed once already. They carry `kind: "draft"` so the chip
  finds them while "Everything" still does not show them.
- The top-level Documents tab is gone and `revealTab`'s
  documents→library button alias is restored, with a comment recording both
  the promotion and the reversal so it is not re-derived.

Verified live: the main tab is absent, the five sub-tabs read in the right
order, the Drafts chip appears in the filter row, and the Documents section
renders and opens documents. Zero console errors.

**One process note worth keeping.** The Drafts chip first measured `0` and the
cause was not the code: `routes_library.py` had changed and **uvicorn had not
been restarted**. That is CLAUDE.md's own documented trap, hit while working
from the file that documents it.

### 87.7c Reported live, NOT yet built — next session starts here

1. **The graph is slow and janky to move around.** Reported directly and not
   yet diagnosed. Do not guess: this is the same shape as the whiteboard's
   jank, which turned out to have one findable cause (a full re-render on
   every frame), so **profile it before theorising**. `graph.js` already had a
   force/render tuning pass (HISTORY §71) that fixed two concrete re-render
   bugs, so the cheap wins may already be taken — start by measuring frame
   cost during a pan and during a drag, separately.
2. **The saved-view select truncates to "No saved vi…"** in the redesigned
   toolbar. Cosmetic, one width rule.
3. **Graph node labels show raw callout syntax** — a note starting with a
   callout renders its label as `Review > [!tip] Remem…`. The label builder
   should strip block markers the way `extract_title` strips a leading `#`.
4. **Semantic search ignores time words.** Reported: typing "recents" did not
   bias results by recency, only by meaning. This is `IDEAS.md`'s own
   long-standing ask ("a slight ai nudge for the semantic notes search, so if
   I ask 'what notes did I save in the last two days'…"). The retrieval path
   is `search_manager.retrieve_detailed` (`routes_chat.py:333-374`); a
   temporal-intent pass that detects recency/date words and applies a
   `created_at` filter or a recency weight alongside the vector score is the
   shape. Note `ai/intent.py` already exists and already classifies
   `needs_retrieval`, so this belongs there rather than in a new module.
5. **The graph minimap "can no longer be hidden or shown."** The toggle button
   became a dropdown with **Off** as its first option, and that dropdown is
   verified working (`MINIMAP -> off hides it: true`). So either this is a
   stale cached bundle — the service worker serving an older `app.js`, which
   this repo has been caught by before — or the dropdown is simply less
   discoverable than the button was. If it is re-reported after a hard
   refresh, the answer is discoverability, and the fix is a visible toggle
   next to the position select rather than folding both into one control.
6. **Timeline line view redesign** — the concrete design is §87.6 above
   (threads as tributaries off a time trunk, using `Entry.parent_id`, which
   the view currently ignores entirely). Still unbuilt.

### 87.8 Still open from this pass, mine to finish

- Backlinks panel ("what links here") — edges already stored by
  `sync_wiki_links`; a query plus a sidebar section.
- Whiteboard render scheduler (the 49-call-site fix above).
- Typed links / `link_type` as the first slice of 87.5.
- Graph performance (§87.7c item 1) — now ahead of the whiteboard scheduler in
  priority, because it was reported live and the whiteboard's cause is at
  least already known.

### 87.9 Handoff list — each item already located, none needs re-deriving

1. **Capture: manual link picker + suggest-links button.** Reuse
   `loadLinkSuggestions` (`app.js:21358-21500`) and its editable-reason rows.
   **Do not write a second suggester.** Links apply after save (a note needs an
   id), so hold a pending set and flush it in `saveEntry` (`app.js:4380`).
2. **Capture: "continues from…" picker.** `Entry.parent_id` and its validation
   already exist (`routes_entries.py:183-216`). A note-picker plus one field.
3. **Graph: persist node positions, add per-node hide.** Stop clearing `fx/fy`
   at `graph.js:1473-1474` when free layout is on; persist pins beside the
   other per-device graph state (`GRAPH_VIEWS_KEY`, `graph.js:2839`). Add a
   right-click node menu as the one surface for hide/pin/expand/open.
4. **Loading states** for the graph link-suggestions fetch (`app.js:21358`),
   Library semantic refresh (`app.js:19437`) and note-picker search. Respect
   the existing reduced-motion fallbacks.
5. **Ask: a client-side answer cache** keyed on question + notebook version.
   **Say in the handover that the real latency is server-side retrieval** —
   this makes a repeat feel instant, nothing more. Do not claim a fix.
6. **Graph → whiteboard.** Marquee-select in the graph first (port
   `whiteboard.js:3167-3320`), then hand the ids to the **existing** layout
   engines (`ai/tools/whiteboard.py:263-432`).
7. **Document → graph / whiteboard**, building on `openExtractPreview`.
8. **Ctrl+K as a true omni-jump.** The palette exists (`app.js:17486-17620`);
   widen its index to notes, documents, boards and saved graph views.
9. **Unlinked mentions.** Scan **titles only** or it floods, and **offer, never
   auto-apply**. Reuse the accept/dismiss row from `loadLinkSuggestions`.
10. **Document sub-pages.** Notes have `parent_id`; documents do not. One
    nullable additive column plus nesting in `#doc-list`.
11. **AI-authored callouts.** Let the agent emit `> [!question]` blocks. Note
    `agent.PROSE_BUDGET_CHARS` is **asserted** — the prompt has a budget.

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

**This tier is empty, and that is the point of saying so.** Every item that
was here has been fixed and re-verified against source; the resolutions are in
[roadmap/HISTORY.md](roadmap/HISTORY.md). Two carry a caveat worth keeping
rather than a clean tick:

- **Meeting transcription** now fails with a distinct 503 and a clear cause
  rather than a mystery error — but **no session has ever observed a
  successful transcription**, because this sandbox's network policy blocks
  `huggingface.co`. If it is re-reported, that is the untested half.
- **Notifications** were audited and traced by call site rather than driven in
  a browser. Say so if the behaviour is re-reported.

The one genuinely open correctness item, **claim-specificity in the
hallucination net**, is item 5 of the live list at the top of this file — it
needs real model output to tune against, which this sandbox cannot provide.

### Tier 2 — half-built features, cheap to finish

Each is already paid for; a small amount of work turns a frustrating surface
into a good one.

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
    - **Image cropping.** Asked about directly; not scoped or built —
      needs a decision on the interaction (a crop rectangle over the full
      image vs. a separate "adjust" mode) before building.
    - ~~**A whiteboard backend/perf pass**~~ **Partly done (HISTORY.md
      §57).** The one real client-side O(cards × notebook size) issue found
      is fixed. **Not done**: a real profile against a large, many-hundred-
      item board — nothing this session was measured against one.
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
    has. ~~The interaction half — smooth pan/zoom feel, node-drag
    responsiveness, a cleaner minimal aesthetic at rest — done this
    session (HISTORY.md §71): a tuning pass on the existing force
    simulation, not a new layout algorithm, per this item's own note that a
    new algorithm probably wasn't the actual gap.~~ **New layouts
    themselves are still open** — nothing above touched that part.
26. ~~**Widgets: a picker.**~~ **Already done and live-verified this
    session (checked before building, not after) — the `dash-widgets-dialog`
    modal (index.html), its own comment already citing "roadmap §26", was
    merged in from elsewhere and was never re-checked against this item.**
    Playwright: clicking "Widgets" opens the dialog with all 17
    `DASH_WIDGETS` rows, the search box filters them, a row's Add/Remove
    button flips the widget on the dashboard in real time (confirmed the
    grid actually lost the card, not just the row's own label), and "Done"
    closes it. Zero console errors. Still open, and genuinely unscoped:
    **more widgets to fill the picker** — customisable sidebars, and note
    view options in the Notes tab were the other two asks bundled into this
    item and neither has a concrete list yet.
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
    30b. ~~**Archive, for notes.**~~ **Done** (commit `4825e70`, this file's
        own tracking never got updated when it landed — caught this session
        by checking the running app before assuming the item was still
        open, per CLAUDE.md's own top rule). `Entry.archived_at`
        (additive auto-migration), `POST /entries/{id}/archive`/`/unarchive`,
        `GET /entries?archived=true`, a Library "Archived" filter chip +
        overview tile (`_shelved()` in `routes_library.py` — deliberately
        named apart from the pre-existing `_archive()`, which is actually
        the bin under an earlier, different naming decision; both
        docstrings cross-reference the collision so it can't cause
        confusion again), and a Notes-tab "Archive" action next to (not
        grouped with) "Move to bin". 13 backend tests
        (`test_archive.py`, `test_library.py`) plus live Playwright
        verification at the time. **Re-verified this session**: archived a
        fresh note via the API, confirmed it appears under the Library's
        Archived chip with the right count, zero console errors.
        **Deliberately scoped to notes only** — chats and documents (BACKLOG
        §4 item 3 also names both) are the real remaining work, one
        `archived_at` column and one pair of routes each, same shape as the
        notes version above to copy from. §26 lists three things that build
        on the full archive afterwards (a "delete everything" control, one
        assembled "your data" page, opt-in auto-archive-by-age) but none of
        those block extending to chats/documents first.
    30c. ~~**Chat metadata not surviving a reload**~~ **Checked before
        building, found already fixed (HISTORY.md §70).** `_turn_messages`
        (routes_conversations.py) persists `stats`/`elapsed_ms` on the
        assistant message, and `openConversation`'s replay
        (`if (message.stats) messageMetaLine(...)`) already renders them —
        both already covered by `tests/test_chat_metadata.py`. Re-verified
        live: single-turn, multi-turn, and a turn with tool chips all show
        the correct meta line after a real reload. Whatever prompted this
        item is either already resolved or a different, unreported bug.
    30d. ~~**OCR text extraction on an uploaded image**~~ (BACKLOG §4 item
        1). **Done, verified live (HANDOVER.md's latest entry).** Local
        `pytesseract`/Tesseract (no torch, no cloud call), on a background
        thread so the upload response never waits on it. Fed into the
        Library's own Image Gallery search (new — that tab had no search
        box before) rather than the notes' `entries_fts` index this item's
        own text originally pointed at — a `MediaUpload` isn't an `Entry`,
        and that index's triggers are wired to the `entries` table
        specifically, so this was the honest integration point, not the
        literal one. `tesseract` is a system binary `pip` can't install;
        degrades to "no OCR text" cleanly when it's missing, documented in
        INSTALL.md. "What was on that whiteboard photo from March" is now
        answerable by typing a word from the photo into that search box.
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
    conceptually related ones, flag duplicates. ~~Candidates worth scoping
    before picking one: acting on stale/orphaned notes~~ — **chosen and
    built this session (HISTORY.md §72)**: `entry/staleness.py`'s
    `find_stale_orphaned_notes()`, a new deterministic pass in
    `_run_optimization()` behind its own `auto_stale_review_enabled`
    preference (off by default, like entities), tags a qualifying note
    `stale` rather than acting on it further — nobody's watching an
    unattended pass, so the same caution `blocked_tools` already applies
    to `delete_note` applies here too. **Checked live this session, and a
    real bug found in the process**: `auto_stale_review_enabled` had a live
    Settings checkbox but was never declared on `PreferencesBody` —
    Tier 1 item 4a's exact bug shape, just missed on this one preference —
    so every attempt to turn it on silently did nothing, which is why it
    could never be end-to-end verified before now. Fixed (field declared,
    echoed back from `GET /preferences`, added to `_AUTONOMOUS_PREFS`), then
    verified for real: backdated a note's `updated_at` 200 days in the
    database directly, enabled the preference through the real route,
    triggered a pass via `POST /tasks/trigger-autonomous`, and the note came
    back tagged `stale`. Two new regression tests. The other two candidates
    — proactive digest/on-this-day surfacing, and letting a saved skill run
    on the same schedule — are still open.
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
40. **Help page overhaul, plus an embedded mini AI chat for in-app guidance.**
    Asked for directly, in detail, across several messages — logged here
    before being built, not yet started. Two parts:
    - **The docs/guides half.** Today's Help is thin. Wants proper docs and
      guides in-app: hyperlinks, tutorials, step-by-step instructions, and
      quick-access links into the actual menus/commands/settings a topic
      describes (the same "jump straight to the setting and highlight it"
      pattern item 83/§82's search-relevance links already established —
      reuse that mechanism rather than inventing a second one).
    - **The mini AI chat half**, specified precisely:
      - Lives in the Help/Settings area, small and basic by design, not a
        second full Chat tab.
      - Uses the user's already-configured **utility model** (not the main
        chat model), specialised via its own system prompt for app guidance
        only — answering "how do I…" / troubleshooting, not general Q&A over
        the notebook.
      - Can hand back **hyperlinked badges** pointing at specific app
        features (same quick-access-link mechanism as the docs half).
      - **No persisted history at all** — asked for directly: not saved to
        the database, not listed anywhere past chats are. The *current*
        chat persists only within the user's current session (survives a
        tab switch, does not survive "start a new help chat" or the session
        ending) — likely a plain in-memory/module-state or `sessionStorage`
        pattern, not `conversations`/`ChatMessage`, since those are exactly
        the persistence this was asked to avoid.
      - Model parameters tuned for **speed and accuracy over creativity** —
        low temperature, no extended thinking, a tight prompt/context
        budget (this repo already asserts `agent.PROSE_BUDGET_CHARS` for the
        same reason: every sentence in a system prompt is resent every
        round, and a help chat that's slow to answer "how do I turn off web
        search" defeats its own purpose).
    Not scoped further than this — no route names, no component layout — on
    purpose: worth a full session's own design pass rather than a rushed
    half-build, and the auto-update framework (item 83) was an explicit
    prerequisite gate for starting this one, now cleared.

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
