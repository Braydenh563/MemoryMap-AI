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
