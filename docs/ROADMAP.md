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

**Start at item 0** in the live list below — the editor rewrite, just
reprioritized to the top. Then [§89](#89--reported-this-session-not-yet-built-start-here-next)
(pagination, a large chat-file-upload redesign, both logged not built) and
[§90](#90--reported-this-session-the-appjs-splits-live-verification-pass-not-yet-built)
(a Settings overlap bug, now fixed; a small-screen/tablet audit, not yet
touched). §88.3, the `app.js` split, is **done**; §88.4 stays **skipped**,
by direct instruction. §88.0 lists what was already fixed — check first.

**A fifteen-ask report plus a second round of ideas landed together — all of
it, with its audit verdicts and a located handoff list, is [§87](#87--the-connected-notebook-pass-the-editor-layer-and-everything-reported-with-it)
below. Five of those fifteen were already built; §87.1 says which, and where.**

### The live list

Everything genuinely open, ranked. **Reprioritized to the top, by direct
instruction, ahead of the numbered items below.**

~~0. **A hybrid live-rendering document editor.**~~ **Built (§93/§94).**
   Four views in `#doc-view-seg` — Live (render-as-you-write, the caret's
   block showing its raw markdown), Source, Split, Read — plus document
   file types with a line-number gutter, Tab/Shift+Tab indent, and Ctrl+/
   commenting on the language's own marker. The separate "squished panes"
   half was a dead CSS rule: `#doc-panes` (an id) beat `.doc-panes.split`,
   so the side-by-side layout had never once applied. Full narrative in
   HISTORY.md §93.

**The new top of the list is item A below (llama.cpp), by direct
instruction.** See BACKLOG.md's "§95 — the forward list" for the full
brainstorm this was drawn from.

**What §94 left undone, in priority order.** Written at the end of that
session so nothing depends on remembering the conversation. Each says *why* it
was not done, because "not done" and "decided against" are different facts.

~~B. **Backup retention is not a setting.**~~ **Built.** The prune itself
   already existed (`backup.py`'s `KEEP_BACKUPS` was always enforced on every
   backup) — the gap was that the number was fixed in code, not a
   preference. `PUT /backups/retention` sets `backup_retention_count` and
   prunes immediately, `GET /storage` reports the current count and its
   1–100 bounds, and Settings → Data has the number field beside the
   existing Backups list.

~~C. **Restart after installing a package, and from Settings → About.**~~
   **The About-page half is built.** `POST /system/restart` is the second
   caller of `restart_in_console_mode` the console-mode switch already used —
   same mechanism, current console visibility preserved rather than flipped
   — behind a "Restart MemoryMap" button in Settings → About, shown only
   once `desktopShell()` confirms there is anything to restart into. **Not
   yet done: wiring it to the Extras install-completion flow specifically**
   (the confirm dialog still just says "needs a restart afterwards" with no
   button appearing once that install actually finishes) — real remaining
   scope, since that means hooking the restart offer into whatever the
   Extras panel polls for a finished install, not reused here.

~~D. **Notes do not render markdown.**~~ **Partly built, and the rest is
   staying out on purpose.** A later session already gave notes real inline
   markdown — bold, italic, code spans, links, images, strikethrough, LaTeX
   (`renderInlineMarkdown`, wired into the note-card list via
   `renderNoteText`) — specifically fixing "notes show raw `**text**`".
   Full block-level markdown (headings, lists, tables, fenced code, the
   `renderMarkdown` chat/documents/digest use) is deliberately still out: a
   note-card list rendered that way "gets very tall very fast," which the
   comment above `renderInlineMarkdown` calls out as the worse problem. Code
   highlighting and mermaid rendering are still genuinely missing everywhere
   (`grep mermaid frontend/` is empty) — that part of BACKLOG §96's "finish
   the rendering story" is still open, just not the notes half.

E. **`app.js` is 22,000 lines.** The clean first extraction is `chat.js`
   (~3,300 contiguous lines: ask, the chat tab, image attachment, the agent
   timeline, the dock disclosure), following the §88.3 pattern that already
   produced documents.js, library.js, dashboard.js and settings.js. Deferred
   because it is a refactor with real regression risk and no user-visible
   gain, and there were functional requests outstanding.

F. **Three things this environment cannot verify**, all needing a real
   Windows/desktop run:
   - `scripts/splash.ps1` renders (Linux sandbox, no PowerShell). Its
     progress bar was reported empty and fixed blind — a WinForms
     ProgressBar drops the themed renderer, and with it the Marquee
     animation, the moment ForeColor or BackColor is set.
   - The four `ocr` suggested models as actual `ollama pull` targets. The
     repos and file sizes were checked against the live Hugging Face Hub;
     nobody has run the pull.
   - Printing to PDF from the document editor's Read mode.

G. **The whiteboard's own refinement pass**, beyond the panel-collision fix.
   Its backend efficiency and feature gaps were never audited.

~~A. **First-class llama.cpp support.**~~ **Steps 1–2 built.** Step 1
   ("say so" in `core/extras.py`) turned out already done, found stale in
   this file rather than in the code. Step 2: `OpenAICompatClient` now
   probes `llama-server`'s own `/props` (`_fetch_props`/`is_llama_cpp`,
   `ai/openai_client.py`) as a fallback context-length source, ranked
   between the per-model catalogue entry and the guess-from-name table —
   plain llama.cpp reports neither `loaded_context_length` nor
   `max_context_length` on `/v1/models`, so this is a real number in place
   of a guess. 2 new tests (`test_providers.py`). **Step 3 (in-process
   `llama-cpp-python`) stays explicitly not done** — the wheel-matrix cost
   this item's own §97 narrative (HANDOVER.md) weighed against it still
   holds, and nothing changed it.
Items 1–2, below, are the ones with real substance after that.

~~1. **Vision-capable models could not be shown an image.**~~ **Built.**
   Composer attachment, vision-model selection and captioning. Full
   narrative in HISTORY.md; kept here as a number so §-references still
   resolve.

2. **Notes-tab pagination with page-aware note links** — BACKLOG §77. Split
   in two, as BACKLOG always said it should be. **The page-size control and
   page selector are built** — `#notes-page-size` / `#notes-pagination` in
   the Notes toolbar, "All" (today's §86 continuous scroll, untouched) as
   the default. See BACKLOG §77 item 1 for the full build note and its one
   accepted trade-off (a thread can split across a page boundary). **Still
   open: the hard half.** A wiki-link click has to land on the right *page*,
   which depends on the sort and filter currently active, not just the
   note's id — real routing logic, now scoped (BACKLOG §77 item 2) but not
   built; the open design question is what to do when the click's origin
   view has different sort/filter/page-size state than whatever's active.

3. **The Timeline's line view needs a real visual pass** — reported as needing
   to look "very professional and ready for public use", and never scoped
   beyond that. Say what specifically, next time it is reported. The grid
   view's text-cropping half is done; a re-report after that fix was never
   reproduced in this sandbox's Chromium and needs the actual browser/OS it
   happens on.

4. **The Documents editor is behind the rest of the app** (BACKLOG §64) —
   the item's own text already said "not scoped in detail here," and §87.1's
   audit found it **stronger than this claim**: autosave, outline, find/
   replace, preview, AI edit, extract-to-notes, and md/PDF export all
   already exist. Live-checked again this session (created a document,
   opened the editor, zero console errors) rather than left as an
   assumption — nothing concretely broken surfaced, and per this file's own
   rule ("say what specifically, next time it's reported"), no speculative
   redesign was invented to fill the gap. **That specific complaint has now
   arrived** — "chucked together basic editor with poor usability and tool
   usage... windows and panes get squished together" — see item 0 at the
   top of the live list, which is where it is now scoped.
   ~~`GET /documents` has no search parameter~~ **Built**: `?q=` matches
   title *and* content (`Document.title.ilike | Document.content.ilike`),
   mirroring a filter `ai/tools/documents.py`'s `_list_documents` already
   had for the AI — the gap was only ever that a person couldn't reach it.
   The Library's Documents search box now sends it server-side instead of
   filtering titles client-side (all it could do — `_summary()` never sent
   a document's body to the browser at all). 5 new tests
   (`test_documents_api.py`).
   ~~The whiteboard's `aria-label` coverage lags the Graph's~~ **Already
   fixed, reconfirmed live rather than trusted**: §87.7b's "40 form
   controls… all now carry a name… zero remaining" claim was checked
   directly this session with a fresh DOM sweep of both the whiteboard
   landing view and an open canvas (85 interactive controls total) — one
   false positive (`#wb-snap-toggle`, a checkbox whose accessible name comes
   from its wrapping `<label>`'s visible text, invisible to a naive
   textContent-on-the-input check) and nothing else. The claim holds.

5. **Claim-specificity in the hallucination net.** `agent.unsupported_claims`
   catches a claim with *no* matching write ("I tagged it" when nothing was)
   but not one that mismatches what happened ("I tagged it as Work" when a
   different tag was applied). Needs real model output to tune against, which
   this sandbox cannot provide.

~~6. **Guided first-run tour**, and the rest of onboarding: offering to pull a
   model, a data-dir writability check, and seeded example notes~~ **Built.**
   The tour and the data-dir/Ollama diagnostics already existed; the two
   genuinely missing pieces are now offers on the same "Your setup" slide,
   neither automatic — a "Download a starter model" button (`POST
   /models/pull`, only shown when Ollama is running but the chat model isn't
   installed) and an "Add example notes" button (`POST /entries/seed-examples`,
   only shown on a genuinely empty notebook — `GET /entries/count`). The
   seed is five short notes about the app itself, two real `[[wiki-links]]`
   between them, two categories, spread across the last 9 days so the
   Timeline isn't a single dot — refuses server-side on any notebook that
   already has a note, seeded or real, so it can never double up or land on
   top of someone's actual notes. Verified live: the button appears/hides
   correctly, seeding produces exactly 5 notes with both links resolved
   (`tests/test_seed_examples.py`), and a screenshot of the running app
   afterward shows the Dashboard's note count, category chips and the graph
   constellation all populated from the seed, unprompted.

~~7. **Alembic migrations.**~~ **Built** — HANDOVER.md's own "Alembic
   infrastructure" section documents it (`migrations/`, `alembic.ini`, a
   baseline revision every database is stamped to on first sight,
   `tests/test_alembic_baseline.py`), this entry was just never struck.
   Reconfirmed directly this session: `_ensure_alembic_baseline` exists in
   `core/database.py`, the migration scaffolding is on disk, and the test
   passes.

8. **What happens when Ollama hangs, rather than errors.** Checked this
   session, not fixed — closer to already-handled than the item implies.
   `OllamaClient.__init__` already sets a 600s request timeout with a
   documented reason (a cold model load on CPU-only hardware can genuinely
   take that long), and every chat/generate call wraps the underlying
   `requests` exception into `OllamaError(f"Chat with '{model}' failed:
   {exc}")`, which `routes_chat.py` already catches. So a hang is bounded and
   does produce a real, if unpolished, message — not silence. What's
   **unverified**, because this sandbox has no reachable Ollama to actually
   hang: whether that message reaches the chat UI as something a user reads
   as "it gave up and here's why" versus a raw exception string, and whether
   ten minutes of a spinner before that message *feels* like "an unbounded
   spinner" regardless of the technical bound. Needs a real slow-loading
   model to observe, not more source reading.

~~9. **Crash-safe recovery for an interrupted re-index or model download.**~~
   **Checked directly — already safe by construction, nothing to build.**
   `model_manager.py`'s `_run_reindex`: each entry's stale vector is deleted
   and committed *before* re-embedding it, one entry at a time — a crash
   mid-run leaves already-processed entries with fresh vectors and
   not-yet-reached ones with their old (still-functional; semantic search
   already falls back to keyword search on a backend mismatch) vectors.
   Nothing corrupted, nothing half-written — just a partially-refreshed
   index a later manual re-run completes. `_run_pull`: `job.status` is set
   to `"error"` on any failure, and its own comment already states the
   property directly — "never leave a half-download looking installed"
   (§6.5). Both jobs (`Job`) are **in-memory only**, not persisted, so a
   real process crash (not a graceful cancel) simply forgets the job
   existed on restart — no ghost "still running" state is possible because
   there is nowhere for one to survive to. The one gap, and it's cosmetic:
   neither job leaves a `taskhistory` record for a hard crash specifically
   (only for a clean cancel or a caught exception) — a crash mid-reindex
   shows nothing in Settings → Tasks afterward, rather than a "did not
   finish" entry. Not attempted: needs a startup-time reconciliation pass
   (did the last recorded reindex actually reach `total`?) that's a small
   but real addition, not a one-line fix.

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

~~11. **Sorting and grouping saved chats** — conversations sort by recency and
    nothing else.~~ **Built**: a sort `<select>` in the Chats sidebar (Recent
    / Most turns / Most tokens / A–Z), persisted in localStorage, pinned
    conversations always staying first regardless of mode (the existing
    divider still marks that boundary). One correction to this item's own
    premise: **model is not actually stored per turn** —
    `routes_conversations.py`'s `_summary()` returns `tokens`/`turns`/
    `updated_at`/`title` only, no model field exists on a message at all — so
    "sort by model" was never available to build cheaply as claimed. The
    three sorts that *were* real data are shipped; a model-based sort would
    need a schema change first. Verified live: A–Z sort correctly orders
    three test conversations, the choice survives a reload.

~~12. **The Documents Library sub-tab needs a full visual redesign.**~~
    **Built — root cause found by screenshotting it beside the "All" view,
    exactly as this item's own note said to.** `#library-docs-list`'s rows
    (`renderLibraryDocuments`, `whiteboard.js`) shared only the layout class
    `.doc-list` with the editor's own recent-docs sidebar — no scoped CSS of
    their own at all, so every row fell through to the app's default filled
    `<button>` style: a full-width solid-accent bar with the title and word
    count crammed onto one line, nothing like a card. Given a document icon,
    a proper title/meta column, a border and hover state matching
    `.library-card`'s own look (`04-chat-dock-appearance.css`). Verified
    live in both themes: real cards now, readable at a glance, clicking one
    still opens the right document. Whiteboards' own pass (item 9 below) is
    unrelated code and still open.

13. **Back/forward navigation still misses most navigation types.** Reported
    directly, and traced to source rather than guessed at. Library's own
    sub-tabs were fixed earlier (§88.1 item 7). **Switching between saved
    chat conversations is now fixed too**: `openConversation` and
    `newChatConversation` each record a `{tab: "chat", section}` entry —
    `"conv:<id>"` or `"new"` — and `stepTabHistory` restores it. This one
    caught and fixed a genuine bug before it shipped, not just a gap: making
    `stepTabHistory` `async` and `await`-ing `openConversation` on that
    branch specifically was necessary — `openConversation` calls
    `recordTabVisit` itself, but only *after* an `await apiJson(...)`, so an
    un-awaited call would let `stepTabHistory`'s own `finally` clear
    `tabHistory.navigating` before that later call ran, turning every single
    Back/Forward through a saved chat into a spurious new history entry.
    Verified live via Playwright: opening two conversations, then stepping
    Back and Forward, restores the right conversation each time with the
    stack length unchanged by the navigation itself.

    Still open: opening/closing a document in the editor, and
    entering/exiting Graph focus mode. Same `{tab, section}` shape to
    extend — worth checking for the same async-ordering trap this one had
    before assuming either is a small change.

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
| Graph toolbar still 3 rows after the first redesign pass | The two hard-split `.graph-toolbar-row`s merged into one flexible row (Options now wraps up rather than living on a pinned second row), and the search/Trace group moved out of the `display: contents` `#graph-toolbar-secondary` wrapper onto the header's own line beside "Graph" — a flex item inside that wrapper would not size to its own content no matter what was tried in CSS, confirmed by direct measurement, not assumption. Down to 2 rows |
| Graph Options panel minimap combobox taller than the buttons beside it | `.graph-options button` got `height: var(--control-h)`; the `<select>` in the same panel never did. Both now measure identically (30.4px) |
| Chat "New" button clashes with the sidebar collapse toggle specifically while collapsed-but-hover-expanded | `.sidebar-collapsed .sidebar-head` zeroes the toggle's reserved padding lane, correct at the true 48px-collapsed width — but the element keeps that class throughout the hover-peek state too, where the toggle visually moves back to its normal `right: 1.25rem`. Reserve restored for that specific hover state |
| Graph node labels show raw callout syntax (`Review > [!tip] Remem…`) | `routes_graph.py`'s `_preview()` stripped a leading `#` heading marker but not a callout's `> [!kind]` opening line. Added `_CALLOUT_MD`, the callout equivalent of the existing `_HEADING_MD` strip |
| "There's a weird black line on the right side of the screen" (desktop/WebView2 build, screenshotted) | Supersedes this table's own earlier row above ("The top menu bar shifts when I open the settings modal") rather than being a new bug: that fix made `scrollbar-gutter: stable` permanent on `<html>` so a real scrollbar disappearing under `.modal-open` wouldn't shift the layout. §36A later moved all scrolling onto each `.tab-page` (body is now unconditionally `overflow: hidden`, and `window.scrollTo` no longer exists in app.js), so `<html>` can no longer show a real scrollbar at all — the gutter that rule reserves is now permanently empty, narrowing `<html>`'s own rendered box by a scrollbar's width and leaving unstyled space at the viewport's right edge that no CSS rule paints, because it sits outside `<html>`'s box entirely. Confirmed directly in this sandbox's Chromium: `document.documentElement`'s rendered width measured a clean scrollbar-width short of `window.innerWidth` with the rule in place, and exactly equal to it with the rule removed — and re-tested opening the real settings modal to confirm no shift returns without it, since body's own `overflow: hidden` is unconditional regardless. `scrollbar-gutter: stable` removed from `01-forms-settings.css`'s `<html>` rule. **Not confirmed in the actual WebView2 shell that reported it** — only that the underlying CSS condition it depends on (a permanently unfillable gutter) is real and now gone |

### 88.1 Reported and still open — work this list top-down

**Tier A — broken behaviour.**

~~1. **"The AI randomly fails in the Ask sub-tab saying it isn't available."**~~
   **A real, evidenced cause found and fixed — not the utility-model theory.**
   `/models/status` used to probe Ollama *twice* per poll: `is_running()`
   (2s timeout) and, inside `_installed_models()`, `list_models()` (5s
   timeout) — both hitting Ollama's own `/api/tags`. Sequentially that is up
   to 7s for one poll, and `refreshModelStatus()` (`app.js`) aborts that exact
   call at a hard 5s. A backend that is genuinely up but momentarily slow
   (mid-generation, a cold model load) could lose that race and read as
   unavailable — which matches the "signal timed out" log line from the same
   report exactly. `routes_models.py`'s `status()` now makes one round-trip
   instead of two (`list_models()` alone tells you both whether Ollama is up
   and what's installed), and the frontend's abort moved to 8s — real
   headroom above the new, lower worst case instead of racing it at the wire.
   **Not verified against a real slow-loading model** (no reachable Ollama in
   this sandbox) — the mismatch itself was confirmed by reading both sides of
   the timeout, not by reproducing the hang. The utility-model theory in the
   original report may still be worth checking if this doesn't fully explain
   a future recurrence.
~~2. **`Unhandled promise rejection: TypeError: Cannot read properties of null
   (reading 'replace')`.**~~ **Fixed** — see §88.0's row; it was
   `recentSkills` carrying a poisoned `null` entry from before §88.0's
   `startSkill` fix, read unguarded on every dashboard render.
~~3. **The notebook constellation canvas keeps disappearing.**~~ **Fixed a
   second, real trigger.** ARCHITECTURE §10's canvas-measures-zero pattern
   was already handled for theme changes (`refreshArtForTheme`); what wasn't
   handled at all was the canvas's own **size** going stale — the sketch had
   no resize handling whatsoever, so `holder.clientWidth` was measured once
   at setup and never re-synced. Added a `ResizeObserver` on the holder
   (not just `p.windowResized`, which alone would miss the Edit-layout
   "Wide" toggle — a card-width change with no window resize event at all).
   Verified live: a window resize, the Wide toggle, and a tab-away-and-back
   cycle all keep the canvas correctly sized and visible, zero console
   errors in any case.
4. **The new-chat button disappeared from the Ask tab.** Traced, not fixed:
   it only shows after a real (non-"hint") answer completes
   (`show("retry-btn", ..., "new-chat-btn")` in `app.js`), and the show logic
   itself is correct — no bug found in it. Most likely the same root cause as
   item 1 above (a hint/unavailable response never reaches that line), which
   this sandbox cannot confirm without a reachable model. If re-reported
   *with* a working AI connection, that would rule this theory out.
5. **The AI Skills sub-tab "is just very unfinished and nothing really
   works."** Audited directly, verified live in Chromium (`library-view-skills`,
   19 skills loaded, zero console errors) rather than trusted from the report.
   The vague complaint does **not** hold up as stated — most of the sub-tab is
   real:
   - **Run Skill** — works. Prompts for inputs when the skill has any, runs it
     in chat.
   - **+ New Skill** — works. Opens Settings → Skills with a blank, focused
     form (deliberately reuses that editor rather than growing a second one).
   - **Skill Logs sidebar** — works, filters the audit log for skill/agent
     actions; correctly shows "No skill execution logs found" on a fresh
     profile.
   - **Autonomous Workers toggle, Auto-tag, Auto-link** — real, wired to
     `setPreference`, not decorative.
   - **Edit / Delete a custom skill** — real, but **only reachable from
     Settings → Skills**, not from a card on this sub-tab. Deliberate (one
     editor, not two) but easy to read as "missing" from this tab alone —
     worth a card-level Edit/Delete shortcut if this gets revisited.
   - **Schedule** — the one genuinely broken piece: a literal placeholder
     (`toast("Scheduler functionality coming soon!")`). This is the same
     surface as the Kortex/Eden "automation pipelines" item (§88.2 item 8) —
     build there, not as a one-off button, so it doesn't get built twice.
~~6. **The graph is slow and janky to move around.**~~ **Profiled, not
   guessed at — two real causes found and fixed, one deeper cost left open.**
   120 seeded notes/40 links, Chromium's CDP `Performance` metrics, pan and
   node drag measured *separately*, and — because this sandbox's VM is fast
   enough to hide real jank — re-measured under `Emulation.setCPUThrottlingRate`
   6× as the standard proxy for lower-end hardware:
   - **Native `:hover` churn during a pan.** `graphIsPanning` already muted
     the *application's* hover logic, but the browser's own `:hover`
     pseudo-class still matches every node the cursor physically sweeps under
     mid-drag, re-triggering `.graph-core`/`.graph-halo`'s CSS transitions —
     invisible to any JS mute because it's browser-level, not app-level.
     Fixed: `canvas.classed("graph-panning", true)` in the same zoom
     `start`/`end` handlers, `.graph-panning .graph-node { pointer-events:
     none }` in CSS. Node drags are unaffected — their own `mousedown`
     already calls `stopPropagation()` before the zoom behaviour's `start`
     ever fires. recalc-style time during a pan dropped measurably
     (unthrottled: 85.7ms → 72.8ms over a fixed gesture).
   - **The much bigger cause: panning or dragging *while the force
     simulation is still cooling*.** Measured directly, 6× throttle: the
     same pan gesture cost **80% main-thread busy** while the simulation was
     still hot (`alpha` ≈ 0.87) versus **57%** after it had settled
     (`alpha` < 0.001) — confirmed by tracking `graphSimulation.alpha()`
     directly over time, not assumed. The tick handler updates every
     node/edge/label position on every tick (~60/sec while running), which
     directly competes with whatever the user is doing — and default decay
     (0.0228) takes ~300 ticks, which under real throttling stretched cooling
     past 15 seconds. That squarely covers "pan right after the graph opens,"
     the single most likely first action a user takes. Fixed:
     `.alphaDecay(0.05)` on the simulation — cools in ~10s instead of ~15–18s
     under the same throttle. This does **not** change where the layout
     settles (the forces decide that, not the decay rate), only how many
     ticks it takes to get there — verified with a screenshot: 120 notes,
     same well-spread layout, nothing broken.
   - **What's still open, and why it wasn't attempted here**: even fully
     cooled, a pan still cost 51–57% main-thread busy under 6× throttle —
     real SVG hit-testing/paint cost over 120+ nodes that neither fix above
     touches. The deeper fix is the tick handler's own O(n) full-graph DOM
     update, the same shape the whiteboard's `wbScheduleRender()` fixed for
     its 49 call sites (HISTORY, this file's own precedent) — skipping
     label/cluster updates on alternate ticks, or a dirty-flag partial
     update, is the next step if this is reported again after these two
     fixes ship. Not attempted this session: it's a structural change to a
     hot path, not a profiling-guided small fix, and deserves the same
     "don't guess, measure first" treatment on its own.
   - All existing graph/frontend tests, `ruff check`, and `node --check
     graph.js` stay green; verified live in Chromium (screenshot, zero
     console errors) both before and after.

**Tier B — UI/UX, each concrete.**

~~7. **Back/forward across the Library's own sub-tabs.**~~ **Built.** The
   click handler (`whiteboard.js`) now calls the same `recordTabVisit("library",
   targetId)` Notes' sub-tabs use; `stepTabHistory` (`app.js`) restores by
   clicking the matching sub-tab button rather than duplicating its
   section-show/whiteboard-landing/gallery-render logic. A bare `{tab:
   "library"}` entry (recorded when the tab itself opens, before any sub-tab
   click) falls back to "All" rather than leaving a stale sub-view on screen.
   Verified live: Whiteboards → back → Documents → back → All → forward →
   Documents, in order.
~~8. **The Documents Library sub-tab needs a visual redesign.**~~ **Built** —
   see the live-list's own item 12, which has the full root cause and fix.
9. **The Whiteboards Library sub-tab is bland** — same pass.
10. **The graph dock may get too tall and squish the graph.** Now three
    deliberate rows; if it grows again, the answer is an overflow menu rather
    than a fourth row.
12. **The minimap needs a visual and usability upgrade.** Checked before
    touching it — it already has more than the vague ask implies: dots are
    coloured by category (`node.colour`, matching the main graph), clicking
    it re-centres the main view there (`initGraphMinimap`'s `jump`
    handler), and the viewport frame is clamped to the box with a comment
    recording the specific "201×39 inside a 168×112 box" edge case that fix
    covers. What looked plain in a screenshot this session was the test
    data (every note "Uncategorised", so every dot is one colour), not a
    gap in the mechanism. Left alone rather than making speculative
    cosmetic changes with no concrete complaint to act on — "say what
    specifically, next time it's reported" is this file's own rule for
    exactly this shape of ask.
~~13. **Graph node labels show raw callout syntax** (`Review > [!tip] Remem…`).~~
    **Fixed** — `routes_graph.py`'s `_preview()` now strips a callout's
    opening line the same way it already strips a `#` heading.
17. **Timeline line view redesign** — the concrete design is §87.6: threads as
    tributaries off a time trunk, using `Entry.parent_id`, which that view
    currently ignores entirely.
~~18. **Semantic search ignores time words** ("recents").~~ **Already
    built — checked before building, found done.** `search/query.py`'s
    `understand()` parses "recently"/"recent" (and "yesterday", "last week",
    "three days ago", "on tuesday", …) into a date range with a `soft` flag,
    and `search_manager._retrieve` uses it: a soft range sorts matches
    newest-first as a tiebreak rather than excluding anything outside a
    fixed window (the code's own comments record "jokes I have saved
    recently" — this exact phrase — as the motivating case that was fixed).
    Verified live rather than trusting the comments: two notes containing
    "jokes", one 3 days old and one 200 days old, given the query "jokes I
    have saved recently" — the 3-day note ranked first. Whoever re-reported
    this hit a real gap somewhere, but it isn't the mechanism itself; likely
    either a phrasing the parser's patterns don't cover, or the chat path
    specifically (`routes_chat.py`) not passing something query.py needs —
    worth asking what exact phrase was typed, next time.

**Tier C — the big editor feature, worth its own session.**

19. **A hybrid live-rendering document editor — moved to item 0 at the top of
    this list.** Asked for precisely: "a mix between the straight md editor
    and the rendered version where it renders as the user finishes typing…
    if you click on the line or the section it will unrender until
    unselected, in which it will rerender" (the Obsidian Live Preview /
    Typora model), and joined this session by a second, separate complaint
    about the current editor's usability and cramped panes. Full scoping —
    why this is not a small change, and the recommended per-block-editor
    path — is at item 0, not duplicated here.

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

~~1. **Boards hold *references*, never copies.**~~ **Already built —
   checked directly, not assumed missing, and this section's own framing
   was stale.** `WhiteboardNode.entry_id` is a plain foreign key, never a
   content copy, and `POST /whiteboard/nodes`' own dedup check is scoped to
   `(entry_id, board_id)` together — not `entry_id` alone — specifically so
   the same note can sit on several boards at once. Verified end to end,
   not just read: the same note added to two different boards produces two
   independent rows; deleting the reference on one board leaves the other
   board's reference and the note itself completely untouched. New
   regression test, `test_the_same_note_can_be_referenced_from_two_boards_
   at_once` (`test_whiteboard.py`) — the two existing whiteboard tests
   nearby cover *moving* a card between boards and *deduping* two drops on
   the *same* board, neither of which exercises two simultaneous
   references, which is the actual claim this item made. This is still the
   honest answer to the open **note clusters** ask (§87.3) — a cluster is a
   board of these references — but there is nothing left to build for the
   reference mechanism itself; what remains, if this is picked up again, is
   UI for a person to *find* a note's other boards from one of them (the
   data already supports the query, nothing surfaces it).
2. **Drag from an item's connection dot onto empty canvas to spawn a chat
   already connected to it.** The whiteboard already has real anchor points and
   AI actions; this joins them into one gesture and is the single most
   compelling interaction in either product. **Scoped this session, not
   built** — real design, not a placeholder: `graph.js`'s connection-dot drag
   already exists for *linking two notes*; the new gesture is the same
   pointer-down-on-a-dot-and-drag start, but releasing over *empty* canvas
   (not another node) instead spawns a floating "start a chat about this"
   affordance at the drop point, and accepting it calls `switchTab("chat")`
   → `newChatConversation()` with that note pre-attached, exactly the
   existing `attachedNoteIds`/`note_ids` mechanism the composer's own note
   picker already populates — no new backend concept, only a new whiteboard
   gesture and its drop-target UI. The real risk is disambiguating this drag
   from the *existing* drag-to-link-another-node gesture and from an
   ordinary pan, at the same anchor point — worth prototyping the hit-test
   before writing the spawn UI, not the other way around. Not attempted
   this session: a new pointer gesture on a canvas that already has pan,
   node-drag, and link-drag sharing the same surface is exactly the kind of
   change §87.7c's own rule ("profile before touching it") argues for
   doing deliberately, and the graph performance work earlier this session
   is a fresh reminder of how much is already happening on that surface.
3. **The pane system** — open anything in a side pane while writing, and keep
   research/chat visible beside the draft. The document editor already has a
   sidebar; this generalises it to "open *any* item in a pane". **Scoped, not
   built.** This is the largest of the four and touches the most surface:
   every full-screen "open X" flow in the app (a note, a document, a chat
   conversation, a whiteboard board) would need a second, pane-sized render
   path alongside its existing full-tab one, and the document editor's
   sidebar — the thing this item generalises — is itself deeply wired to
   `#doc-*` ids specific to the document editor, not a reusable component.
   The honest shape of this as a real project: (a) extract the document
   sidebar into a generic `openInPane(kind, id)` container first, proven on
   the one thing that already has a pane; (b) add exactly one more kind
   (the best-value pairing is a note or a chat beside a document, since
   "research/chat visible beside the draft" was the concrete ask); (c) only
   then consider generalising further. Attempting all of it at once, in the
   same session as five other features, is how a UI architecture change
   ships half-migrated — this needs its own session, deliberately, the same
   caution this file already applies to the hybrid live-rendering editor.
4. **Custom AI = instructions + chosen knowledge sources**, with **"use when"
   rules** so the assistant knows when to reach for a source. This is a direct
   upgrade to the existing skills/personas: today a skill is a prompt, and the
   gap is attaching a *bounded* knowledge set to it. Local equivalent of
   sources: selected notes, documents, boards and tags — never creators.
   **Scoped this session, and the good news found while scoping it: the hard
   half already exists.** `ChatRequest.attached_notes_only` + `note_ids`
   (`routes_chat.py`) is already the exact "a deliberately closed set of
   notes — retrieval finding more is pollution, not help" mechanism this
   item needs; it was built for Trace's "generate a story from this path"
   and never reused. The real remaining work is entirely on the skill side,
   not the retrieval side: add a `sources` field to a skill (`ai/skills.py`'s
   `normalise`/`SkillItem` in `routes_settings.py`) — a list of `{kind:
   "note"|"document"|"tag", id_or_name}` — and have `skill_runner.run_skill`
   resolve it to a concrete `note_ids` list at run start (a tag resolves to
   every note carrying it, at that moment, not a saved snapshot) and pass
   `attached_notes_only=True` alongside it. Documents aren't retrievable
   content today (`routes_documents.py`'s own docstring: documents "never
   appear in note search… unless the user asks for them by name") — a
   document *source* would need its content folded into the skill's prompt
   directly rather than routed through note retrieval, a smaller, separate
   piece. "Use when" rules are the one part with no existing mechanism at
   all: today a skill is picked by name or by `tools.focus_for`'s keyword
   cueing, never by matching a source's stated purpose — that half needs a
   real design decision (a short natural-language rule matched how, by
   whom) this session didn't make.
~~5. **The interview technique.**~~ **Built** — "Interview me about an idea"
   in `ai/skills.py`'s `BUILTIN_SKILLS`, using the existing `ask_user` tool
   for a real back-and-forth mid-run rather than a one-shot prompt.
6. **Reader-mode capture with citations preserved.** Partly built (the web
   reader); the missing half is that a highlight becomes its own first-class
   item with its source link intact.
~~6. **Reader-mode capture with citations preserved.**~~ **The missing half is
   now built.** "Source as metadata, not just folded into body text" —
   `Entry.source_url`/`source_title`, new additive columns, populated by
   `saveSelectionAsNote`'s existing "Save with its source" flow
   (`selectionSource`/`clippingMarkdown`, both unchanged) alongside the
   markdown blockquote+link it already wrote into the body — the body copy
   stays deliberately, so a note is still a plain, portable file with no app
   behind it. A note card now shows a real "🌐 source title" chip that opens
   the page, and the field is real API surface (`GET`/`POST /entries`), not
   something only recoverable by parsing markdown. 3 new tests
   (`test_api_entries.py`).

7. **Audio overview of a notebook/document**, generated locally with the
   existing read-aloud voices and saved as a file. **Scoped this session —
   the framing undersold the gap, and it's worth recording why rather than
   attempting a partial build.** "The existing read-aloud voices" are the
   browser's native `speechSynthesis` (Web Speech API) — real, but it only
   *plays live*; there is no standard browser API to capture that audio to
   a file, and this codebase has no server-side TTS engine at all (no
   pyttsx3, no Piper, nothing — confirmed by grep, not assumed). So this
   isn't "wire an existing capability to a save button," it's "add a new
   local TTS dependency," which is exactly the category of heavy install
   this project has burned time on before (CLAUDE.md's own standing torch/
   sentence-transformers warning). Two honest paths, neither attempted here:
   (a) a lightweight local TTS package (Piper is the most-cited
   CPU-friendly option, ONNX-based, no torch) generating a real audio file
   server-side, replacing `speechSynthesis` for this one feature only,
   evaluated for install cost the same way `core/ocr.py`'s Tesseract
   dependency was; (b) narrow the ask to "record what speechSynthesis
   already plays" via `MediaRecorder` capturing system/tab audio — fragile,
   permission-heavy, and browser-dependent, so a worse fit for a desktop
   app than (a). Recommend (a), sized and evaluated in its own session
   rather than guessed at here.
8. **Automation pipelines** — user-facing trigger→action rules. The autonomous
   agent already does four fixed jobs; this is the same machinery with a UI.
   **Checked, not built — the premise needed correcting first.** `ai/
   autonomous.py` is **one** scheduled pass on **one** fixed interval (default
   6 hours), not four distinct jobs with their own triggers — "four fixed
   jobs" describes what that single pass *does* each time it runs (filing,
   linking, tidy suggestions, digest), not four independently triggerable
   pipelines. A real trigger→action UI needs, at minimum: a rules table
   (trigger type, trigger config, action type, action config, enabled), a
   trigger *types* beyond "every N hours" (this app already has real event
   moments worth hooking — a note saved, a category assigned, a reminder
   fired), and a UI to build/list/toggle/delete rules — none of which exist
   today in any form. This is a genuinely new subsystem, not a UI layered
   on existing machinery as the item's own text implied; sizing it
   honestly is why it wasn't started this session.

**Explicitly not taken:** the social corpus and outlier detection, multi-platform
scheduling, auto-DM, creator-as-voice-clone, pooled team credits, affiliate
links. All require a cloud service and other people's data.

**On the UI/UX quality the user admired:** the concrete, copyable parts are
(a) keyboard-first navigation with visible shortcuts, (b) one primary loop
stated plainly — capture → discover → write, (c) panes instead of modal
context-switching, and (d) restraint: few controls visible at rest, more on
demand. This session's graph-toolbar work is (d); the pane system is (c).

### 88.3 The app.js split — done

All four files (documents.js, library.js, dashboard.js, settings.js) are
split out of app.js (~28,460 → ~21,720 lines) and verified live in Chromium
with zero console errors. Full narrative — line ranges, the four hazards
found and how each was fixed, the rules that made it safe — moved to
[HISTORY.md's own §88.3 entry](roadmap/HISTORY.md#883--the-appjs-split-full-narrative-moved-from-roadmapmd-now-complete)
now that it's finished.

### 88.4 Context, memory and harness engineering — an analysis

Asked for directly. What exists, and where the real headroom is.

**What exists.** Retrieval is `search_manager.retrieve_detailed`
(`routes_chat.py`), gated by `ai/intent.py`'s `needs_retrieval` so a chat turn
that needs no notes does not pay for a search. The system prompt is budgeted
and **asserted** (`agent.PROSE_BUDGET_CHARS`) because every sentence is resent
each round. Conversations can be compressed (§35I). Tools are a fixed registry
in `ai/tools/`. There is a "what the AI remembers" surface (§39B).

**Corrected — items 1 and 2 below were already built by a prior session
(`search_manager.py`, commits `be53bd5`/`03b9a3e`/`a399926`, dated before
this analysis was last read as current) when this list was drafted, and
this section was never updated to say so. Checked directly rather than
trusted, per this file's own repeated rule, and confirmed via `git log`
that the code predates the session that found it stale — not a
same-session miss like a couple of others this file records elsewhere.**

**What's actually still a gap, in order of value:**

1. ~~Retrieval is single-shot and similarity-only.~~ **Already hybrid.**
   `_rank()` calls `_fuse()` — reciprocal rank fusion over the semantic and
   keyword result lists — labelling the result `"hybrid"`, wired into
   `_retrieve()` (every chat/ask question's own retrieval path). Re-ranking
   and query expansion beyond this are the only parts still genuinely open.
2. ~~The graph is not used for retrieval.~~ **Already used.**
   `graph_expansion()` walks linked neighbours of the top hits (and a
   second, weaker hop — ROADMAP item 33, `GRAPH_EXPANSION_HOP2_LIMIT`) and
   is called from `_retrieve()`. §87.5's `link_type`/strength weighting
   (still open, see §87.5 above) would make this walk *smarter*, not bring
   it into existence — it already exists.
3. **Memory is a surface, not a system.** Still genuinely open — no tiered
   notion of "always in context" (a small durable profile), "retrieved when
   relevant" (the notebook), and "this conversation only" exists anywhere
   in `ai/`. A short, user-editable always-on memory block, capped and shown
   in Settings, is a contained change with a large effect on how the
   assistant reads.
4. **No token accounting per stage.** Still genuinely open — `ai/context.py`
   manages a token *budget* (staying under the window), which is a
   different thing from *measuring* how much of a real turn goes to system
   prompt vs. retrieved notes vs. history. Instrument it before tuning
   anything further; a per-turn breakdown makes every later decision
   evidence-based. (BACKLOG's per-chat token meter is the same idea.)
5. **Tool retrieval is all-or-nothing.** Still genuinely open. Every tool
   definition is sent every round. §33 already scoped semantic tool
   retrieval and rightly said it needs measuring first — item 4 above is
   the prerequisite.

**One caution that applies to the three real gaps above.** Every provider
test in this repo runs against a fake transport, and this sandbox has no
reachable model. Retrieval *quality* changes cannot be evaluated here at
all. Build the measurement (item 4) and a small fixed question set *first*,
or every one of these becomes a change nobody can prove helped.

## §89 — reported this session, not yet built (start here next)

Landed live, in one long session, alongside the app.js split's first file
(documents.js — done, see §88.3) and a vision-chat redesign (also done: see
`routes_chat._image_caption_context` — a chat model with no vision of its
own now gets a caption from the resolved vision model folded into the
question, instead of the whole turn silently swapping to a different model).
**Several items below were asked for again after already being built the
same session — check `roadmap/HISTORY.md`'s own "§89's already built
callouts" entry before rebuilding anything that sounds finished.**

**Still open:**

1. **Pagination on other tabs.** Notes already has a page-size selector
   (§88.0's row on it, BACKLOG §77). Asked for on Reminders and the Library
   sub-tabs too — "maybe", the user's own hedge, so scope each independently
   rather than assuming the Notes pattern transfers as-is: Reminders' list
   is chronological with due/overdue framing that pagination could easily
   break (an overdue reminder pushed onto page 2 is a reminder that stops
   being seen), and the Library sub-tabs differ in shape from each other
   (Documents is a flat list, the "All" grid mixes kinds with its own
   filter chips) more than Notes' browse view did.

2. **Uploading a document (not an image) to the chat composer fails
   silently into the transcript.** Reported directly, reproduced in the
   report itself: attaching `README.md` produced no upload and instead
   wrote `*(Failed to upload README.md)*` as if it were the AI's own
   message — an error rendered as chat content rather than surfaced as
   what it is. The fix has several parts, asked for together:
   - The upload failure itself needs surfacing as a toast/notification,
     never as literal text injected into the transcript.
   - **Any file type**, not just images, should be uploadable to chat and
     "readable by the AI" — for a document this almost certainly means
     text extraction (the same shape `core/ocr.py` and
     `ai/captioning.py` already establish for images: extract once,
     store, hand the extracted text to the model as context) rather than
     sending arbitrary bytes.
   - Every upload (any type) should land in the Library and be viewable
     there "no matter the format" — needs a real per-type viewer story,
     not just a download link, for at least the common cases (text/
     markdown, PDF, common office formats — scope which ones directly
     rather than guessing at "any format").
   - **Files should stage, not upload immediately.** A file picked for a
     chat message should show as a small card above the composer (name,
     a file-type icon, an × remove button) and only actually reach
     `/media/upload` (and the Library) when the message is actually
     sent — not before. This is a different lifecycle from the current
     image-attach flow, which uploads on pick.
   - **A per-message attachment cap** — the user suggested 10 as a
     common default but flagged uncertainty about whether that is too
     heavy for this app; measure against `MAX_CHAT_IMAGE_BYTES`-style
     per-file limits and real local-model context budgets before picking
     a number.
   - **Attach an already-uploaded Library file/image to a chat message**,
     the same way a note can already be attached (`body.note_ids`) —
     currently the composer can only attach something just picked from
     disk, not something already in the Library.
   This is a genuinely large feature, not a bug fix — reported with an
   explicit "add this to the roadmap, I'm low on usage" rather than a
   request to build it now. Scope it as its own session: it touches the
   upload route, a new extraction step, the Library's viewer story, and a
   staging-state redesign of the chat composer, none of which should be
   mixed with a smaller fix in the same diff.

3. **Vision-model OCR, as an alternative (or complement) to Tesseract, with
   model-pull suggestions in Settings → Models.** Asked as a question, not
   yet scoped or built. `core/ocr.py` (Tesseract) and `ai/captioning.py`
   (vision-model description) already establish the two shapes this would
   choose between: OCR is "what text is in this image", captioning is
   "what does this image show" — a vision-model OCR mode would follow
   `caption_and_store`'s own write-once/background-trigger pattern, most
   naturally as a per-image *choice* of extractor (Tesseract vs. a vision
   model) rather than a wholesale replacement — raised directly ("might be
   able to negate the need for py tesseract"), and worth resisting: a
   vision model needs a multi-GB download and real per-image inference
   time, where Tesseract is instant, needs no model download at all, and
   matches this project's own standing "no heavy installs" stance
   (CLAUDE.md's torch/sentence-transformers avoidance is the same
   reasoning). Keep both, let the user pick. Named as candidates worth
   checking against the actual Ollama library before committing to any
   (unverifiable from this sandbox — no live internet or Ollama registry
   access): Qwen3-VL if available there (the user's own preference over
   Qwen2.5-VL, and plausibly the stronger current default), else
   Qwen2.5-VL (2B/7B/72B), MiniCPM-V (small, specifically strong at OCR),
   GLM-4V, DeepSeek-VL2, and Moondream (tiny, weaker, for low-spec
   hardware). The user also named "glm-ocr" and "deepseek-ocr" specifically
   — unconfirmed whether those are real, distinctly-named Ollama tags
   separate from the general-purpose VL models above, or shorthand for
   using GLM-4V/DeepSeek-VL2 for OCR; check the actual registry before
   scoping model-pull UI around either name.

4. **A visual indicator on a chat message's own metadata line for which
   mode answered it** (Ask vs. Request/Agent — the segmented control at
   the bottom of the Chat tab, `renderChatModeSeg()`/`setChatMode()` in
   app.js, which maps to `body.use_tools` on the wire). Asked for directly.
   The metadata line already shows the model name and timing (the
   `{"type": "stats", ...}` NDJSON event, rendered alongside `answered_by`)
   — this would add which of the two modes produced that particular
   answer, most naturally read off `use_tools` (or, for a plan/skill run,
   its own distinct label) rather than the *current* toggle state, since a
   conversation can span mode switches and each past message should say
   what it was actually answered with, not what the toggle happens to show
   now.

~~5. **Images pasted, dragged, or dropped into the chat composer don't reach
   the vision-chat staging system at all.**~~ **Built** — the scoping fix,
   the safer of the two options this item's own diagnosis named: the global
   `drop`/`paste` listeners (app.js) matched **any** `<textarea>` by tag
   name alone, `#chat-input` included, routing it through `handleFileUpload`
   (built for the Notes/Document composer — inserts literal
   `![Uploading…]()` markdown into the textarea) instead of
   `attachImageFiles()`/`renderImageAttachments()`, the real card-token
   staging the composer's "＋" button already used. `#chat-input` is now
   excluded from both listeners and given its own branch: image files go
   through `attachImageFiles()`; a non-image file dropped/pasted there gets
   a toast ("only images... right now") instead of broken markdown, since
   real non-image chat uploads are item 2 below, not this fix. **Live
   Chromium verification**: dispatched a real `ClipboardEvent` with an image
   file at `#chat-input` — `attachedImages` populated with a real
   upload id/url, the input stayed empty (no markdown text landed in it),
   zero console errors. Also fixed alongside it, same root cause class: a
   failed upload in the Notes/Document composer (`handleFileUpload`'s own
   catch) used to leave `*(Failed to upload X)*` sitting in the note/document
   content — content is what gets saved, a toast is a notification, and the
   two were conflated the same way the chat composer's placeholder was.

6. **Captioning an image with a vision model should show in the background
   tasks list**, the way other long-running work does. Asked for directly,
   not yet scoped: `ai/captioning.caption_and_store`/`caption_in_background`
   run a real model call (seconds, not instant) with no visible progress
   anywhere in the UI today - find the existing background-tasks mechanism
   (whatever surfaces e.g. imports or backups as in-progress) and register
   a task around the caption call the same way, rather than inventing a
   second progress system.

7. **The Documents editor's "AI edit" feature should become a more general
   AI assistant**, not just an in-place editor of existing text. Asked for
   directly: today it only edits/rewrites what's already on the page; the
   ask is for it to also write new content and remove content on request -
   closer to an agentic assistant for the document than a single "improve
   this selection" action. Not yet scoped - likely touches whatever
   `doc-ai-instruction`/the AI-edit route already is, but "write" and
   "remove" as first-class actions (as opposed to "replace selection with
   edited version") may need a different request/response shape than the
   current edit flow, so scope that before building rather than bolting new
   verbs onto the existing one.

8. **Lightbox prev/next arrow icons read as off-centre.** Reported with a
   screenshot; not yet fixed, and not confirmed live this session (no image
   in this sandbox's test data to open a lightbox against). `.lightbox-nav`
   already centres its child with `display: grid; place-items: center`,
   which centres the icon's own box regardless of `.ph`'s own
   `vertical-align: -0.12em` (that rule only affects inline layout, and has
   no effect inside a grid item) - so if the arrows still look off-centre,
   the cause is more likely the glyphs themselves (ph-caret-left/
   ph-caret-right) not being visually centred within their own em-box in
   the vendored Phosphor font, not a CSS positioning bug. Check by
   measuring the glyph's actual ink bounds against its box in a live
   browser before changing any CSS here.

9. **Settings modal reads as poor contrast / hazy in light mode.** Reported
   with a screenshot; not reproduced. Audited the pipeline this bug class
   would live in (`APPEARANCE_DEFAULTS`/`applyAppearance()`, app.js — where
   the project's worst UI bug to date came from, an unguarded custom
   property computing to the literal string `"undefined"`/`"NaN"`): every
   key has a default, and a fresh profile's Settings modal in forced light
   mode plus glass on (user confirmed glass is on) renders correctly in
   this sandbox. The user's screenshots consistently show a custom teal
   accent, not the default indigo — likely specific to their own accent/
   glass-blur/opacity/shadow values. Need those values, or a live session.

~~10. **Images and sketches attached to a note don't render on the whiteboard
    canvas.**~~ **Built.** `nodeEnter.each` now renders a `.wb-card-thumb`
    above the note text, same priority as `libraryCard()` (library.js):
    `thumb_attachment_id`, then `thumb_url`, then the first image in
    `entry.attachments`. Inline `![...](...)` markdown in `entry.content`
    is deliberately untouched — already renders through `renderMarkdown`, and
    would show twice if this added it too. **Live-verified, not just a
    source-read**: real PNG attached via `POST /entries/{id}/files` — not
    `/media/upload` alone, which is the generic drag-into-markdown upload
    with no entry association and silently returned `attachments: []` —
    added to a board, opened in the browser: `<img>` loaded with real
    dimensions, auth via the query-param fallback, zero console errors.

11. **Whether AI-driven work (image captioning, and AI features generally)
    should run asynchronously as a standing design principle**, not just
    get a background-tasks *indicator* (item 6 above, already logged - this
    is a broader question, not a duplicate of it). Raised as an open
    question, not scoped. `ai/captioning.caption_in_background` already
    demonstrates the shape for at least one feature (a background thread,
    fire-and-forget from the route); worth an actual audit of which AI
    calls in this app are still synchronous/blocking-the-request today
    (chat streaming already isn't, by its nature) before deciding whether
    this becomes a standing pattern applied elsewhere or stays per-feature.

12. **Whiteboard cut, and a right-click/long-press menu for a selection.**
    Asked as a question. Copy/paste already exist (`wbCopySelection`/
    `wbPasteClipboard`, Ctrl/Cmd+C/V) - cut does not (no Ctrl/Cmd+X handler
    anywhere in whiteboard.js). No right-click menu for a selected item
    either; `contextmenu` is only wired to one toolbar toggle button
    (`wbOpenDockedMenu`, with its own touch long-press equivalent already
    built) - that same pattern is the natural template for a selection's
    own copy/cut/delete menu, not a new one.

## §90 — reported this session (the app.js split's live-verification pass), not yet built

~~1. **`#agent-monitor` overlaps two Settings nav buttons and eats their
   clicks.**~~ **Built.** Found live (Playwright, verifying the settings.js
   split): a real 30s click-timeout on "Help"/"About", intercepted by the
   floating `#agent-monitor` panel. More general than Settings alone —
   `.modal-overlay` sat at `z-index: 55`, far below the monitor's `1000`, so
   **every dialog in the app** was partly unclickable under it. Fixed:
   `.modal-overlay` → `z-index: 1010`, matching `.selection-popup`'s
   already-established tier for this exact shape (above the monitor, below
   the toast box's 1050). `#sketch-overlay`/`#improve-overlay` moved with
   it — both are pinned to `.modal-overlay`'s tier so a confirm dialog
   raised from inside either still stacks above it by DOM order, which
   would have broken had only `.modal-overlay` moved. Verified live: both
   buttons click cleanly now, zero console errors.

2. **Small-screen (tablet/phone) layout needs a real audit, not spot fixes.**
   Asked for directly — "better handling and ui structure of smaller device
   sizes... potentially even a whole rearrangement." Not touched this
   session: no viewport-resize testing exists against this app yet, ever;
   every live Playwright check so far ran at a default desktop viewport.
   Audit `docs/DESIGN.md`'s breakpoints against phone (~390px) and tablet
   (~768-1024px) width, surface by surface: the tab bar (overflow-fade
   already exists — check it degrades usably), the 17-section Settings
   modal, the document editor (live-list item 0 — already "squished" at
   *desktop* width), the whiteboard, the dashboard's masonry grid. Measure
   before rebuilding.

3. **Upload any document type (not just images), with a real per-type
   viewer and AI able to read it — even a small model.** Asked for
   directly; logged, not built. Broader than §89.2 below: a real Library
   viewer per type (text/markdown, PDF, office — scope which), plus
   content handed to the model as extracted plain text (`core/ocr.py`/
   `ai/captioning.py`'s own shape) — cheap regardless of model size. Own
   session.

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
~~2. **The saved-view select truncates to "No saved vi…"** in the redesigned
   toolbar.~~ **Already fixed** — `.graph-toolbar #graph-view-picker`
   already carries `min-width: 12.5rem` with a comment recording this exact
   symptom. Verified live: `scrollWidth` (198px) fits inside the rendered
   width (200px), "No saved views" shows in full.
~~3. **Graph node labels show raw callout syntax**~~ **Fixed** — see the
   live list's item 13 above.
~~4. **Semantic search ignores time words.**~~ **Already built** — see the
   live list's item 18 above for what exists (`search/query.py`'s
   `understand()`, wired into `search_manager._retrieve`) and how it was
   verified live this session.
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
