# Audit 2026-10-05: frontend (code quality, design system, performance, responsive)

Auditor: Opus agent, port 8832, data dir `/tmp/mm-audit-frontend`, head `64ddf14`.
Notebook: 10 notes for the small runs, then 5,010 notes seeded through `POST /entries`
(4 threads, 1,333 s). Probe scripts are in the session scratchpad
(`perf.js`, `census.js`, `resp.js`, `libreq.js`, `lockleak.js`, `save5k.js`,
`idle.js`, `graphprof.js`, `csscov.js`, `cachecost.js`, `floor.js`,
`contrast2.js`); each finding names the one it came from.
**Load average was 6 to 21 throughout** (other audit agents on the same four
cores): every millisecond below is for comparing, byte counts and request
counts are exact.

## 1. Summary: the five worst things

1. **Every launch is a cold load of 2.4 MB, 64% of the CSS and 46% of the JS being comments**: the per-process boot token makes 0 of 49 assets cacheable across launches (FE-01, FE-02).
2. **Opening the Library list downloads a 15.9 MB uncompressed WASM grammar checker, an 871 KB word list and 2.9 MB of document and whiteboard JS**, because `documents.js` runs the prose checker at load (FE-03).
3. **Graph at 5,000 notes never settles**: 30 s after opening, the layout is still ticking, `drawImage` alone is 7.8 s of main thread, idle busy 44% (FE-04).
4. **Every save refetches the whole notebook**: `loadEntries()` is 27 sequential requests, 5.3 MB of JSON, 3.1 to 3.8 s and up to 1.1 s of long tasks at 5,000 notes, called from 132 sites (FE-05).
5. **The boot budget regressed with nothing to stop it**: own boot JS is 1,384 KB gzipped (1,632 KB with p5), against 1,072 KB claimed on 2026-09-24 and a 1 MB target; no test or `gate.sh` sweep measures it (FE-06).

Positive, measured: no listener or node leak across 160 tab switches at 5,000
notes; every tab except Graph idles at 2% main thread or less with no rAF
loop; text contrast passes in both themes on 36 views; no horizontal document
overflow on any of 40 tab x width combinations; one dead function in 3,950.

## 2. Findings, by severity

### High

**FE-01. Comments are shipped to the browser: 1.7 MB of CSS, 3.5 MB of JS, 328 KB of HTML.**
- Evidence: comment share of what is served (python over the files):
  CSS 2,651,239 bytes, 1,699,964 comment (64%); JS 7,786,571, about 3,550,221 comment (46%); `index.html` 851,545, 328,208 comment (39%).
  Gzipped on the wire: CSS 810 KB, stripped 157 KB; boot JS (own 40 files) 1,294 KB, whole-line comments stripped 589 KB; `index.html` 206 KB, stripped 92 KB.
  Boot transfer measured (`perf.js`): 42 scripts 1,632 KB, 11 stylesheets 821 KB, plus the page.
- Impact: about 1.47 MB of the 2.66 MB a launch transfers is comment text, and the 5.2 MB of raw JS is parsed with it. Combined with FE-02 this is paid on every launch, and on a phone over LAN mode it is the difference between about 1.2 MB and 2.7 MB.
- Severity High. NEW (no plan mentions minifying or stripping).
- Fix: strip at serve time in `RevalidatedStatic` (`src/memorymap/api/app.py`), into the existing precompressed cache, so the files on disk (which the tests read) keep every comment. CSS `/* */` and HTML `<!-- -->` with a small tokenizer that skips strings, `<pre>`, `<textarea>` and `<template>`; JS comments through a small lexer (a whole-line `//` can sit inside a multi-line template literal, so a line regex is not safe on its own; see Brief A). Add a ratchet test on the served gzip sizes. Effort M.

**FE-02. The per-process boot token defeats both the HTTP cache and V8's code cache on every launch.**
- Evidence (`cachecost.js`, one persistent browser profile): cold load 52 fetched, 2,445 KB, lock screen at 775 ms, 227 ms of long tasks; same server process reloaded: 49 of 49 from cache, 1 KB, lock screen 448 ms, 0 long tasks; **server restarted (a new launch)**: 0 from cache, 2,105 KB, 824 ms, 172 ms of long tasks; reloaded again: 375 ms, 0 long tasks. The stamp went `0.3.32-6ac304d8` to `0.3.32-6ac30db6`.
- Impact: every launch of the desktop app or `start.sh` pays a full cold load and a cold parse (about 2x the time to the lock screen here, more on a slow disk or LAN). The token exists to fix a real stale-cache report (CLAUDE.md section 5), but it fixes it by throwing away all caching.
- Severity High. KNOWN as a decision (CLAUDE.md section 5, `dd2d843`); its cost is NEW.
- Fix: stamp each URL with a hash of that file's bytes (computed once at startup, or at precompress time) instead of a per-process token: a changed file gets a new URL, an unchanged one keeps its cache across launches. `tests/test_asset_cache_busting.py` keeps holding the stamp's presence. Acceptance: `cachecost.js` after a server restart shows 49 of 49 from cache. Effort S to M.

**FE-03. Opening the Library tab starts the grammar checker: 15.9 MB WASM, 871 KB word list, six bundled surfaces.**
- Evidence (`libreq.js`): one click on Library fetched `documents-code.js`, `documents-prose.js`, `documents.js`, `whiteboard-map.js`, `whiteboard.js`, `library.js` (893 KB gz, 2,885 KB raw), then `harper-worker.js`, `BinaryModule`, `slimBinary.js`, `/vendor/wordlist/en.txt` (253 KB gz) and `/vendor/harper/harper_wasm_slim_bg.wasm` at **15,935,196 bytes, no content-encoding** (it gzips to 8,051,298). Stack: `renderDocTools()` at `frontend/js/documents.js:16988` (last line of the file, run at load) calls `renderDocProse` which calls `docLoadWordlist` (`documents.js:13666`) and `docGrammarAsk` (`documents-prose.js:84`, `new Worker`), on an empty editor nobody opened. WASM is excluded from gzip on purpose (`app.py:931`, 755 ms to gzip per cold fetch on loopback).
- Impact: browsing the Library (the most-used list after Notes) costs about 17 MB of transfer, a worker and a 16 MB WASM compile. Over LAN mode on a phone this is the single largest cost in the app. First Library visit: 779 to 1,210 ms to quiet, 565 ms of long tasks at 5,000 notes.
- Severity High. NEW.
- Fix: (a) remove the load-time `renderDocTools()` call's prose half: run `renderDocStatusBar()` at load and start the prose checker on the first `openDocument` with non-empty text; (b) let the precompressed cache gzip the WASM once at startup (the 755 ms was per request, a cached `.gz` costs it once per release) or ship a pre-built `.wasm.gz`; (c) split the `library` bundle (`app.js:2208`): `library.js` alone for the Library, documents and whiteboard on first open of one. Acceptance: `libreq.js` shows no harper, wordlist or whiteboard request on a Library visit. Effort M.

**FE-04. Graph at 5,000 notes: the main thread never gets quiet.**
- Evidence (`graphprof.js`, `idle.js`, `perf.js`, 5,011 nodes): 30 s after opening, ticks still advancing (alpha 0.047 at about 24 s), `__graphDebug.tickMs` 70 to 240 ms. CPU profile over 32 s: `drawImage` 7,799 ms, `gcDraw` (`graph-canvas.js:1420`) 961 ms, `gcNodeSprite` (`:848`) 361 ms, `gcDrawNebulae` (`:904`) 195 ms, GC 523 ms. Frame gaps p50 17 ms, p95 67 ms, max 300 ms. Idle 15 s on the tab: **44.4% main thread busy**, 8.8 rAF/s, 139 style recalcs. `perf.js`: first visit did not reach 1.2 s without a long task within 20 s; warm revisit 11.65 s to quiet with 51 long tasks totalling 3,442 ms. `/graph` 419 ms, 107 KB.
- Impact: the plan's target ("5,000 nodes at 60 fps", GRAPH_PLAN section 3) is far off, and the HISTORY claim that "the main thread is roughly 10% busy ... the renderer is not the reason" (measured at 2,000) does not hold at 5,000: the renderer's own `drawImage` is the largest single cost. A laptop fan runs while the Graph tab is merely open.
- Severity High. KNOWN in part (GRAPH_PLAN Phase 1 gate recorded as not met in HISTORY); the 5,000-note numbers and the attribution are NEW.
- Fix: in `graph-canvas.js`, level of detail: below a zoom threshold draw nodes as batched `Path2D` arcs or `fillRect` per colour (one fill per colour, no per-node `drawImage`), sprites only above it; cull with the existing `inView` before every draw, not after; draw at most once per worker tick (a tick is 70 to 240 ms, frames are drawn at 8.8/s, many identical); stop the minimap repaint during the layout. Acceptance at 5,000 notes: `drawImage` under 1.5 s per 30 s profile, idle busy under 15%, p95 frame under 33 ms. Effort M to L.

**FE-05. `loadEntries()` refetches the whole notebook after every save, from 132 call sites.**
- Evidence (`save5k.js`, 5,010 notes): three calls of `loadEntries()`: 3,742 / 3,106 / 3,824 ms, each 27 sequential requests of 200 (`ENTRIES_PAGE_SIZE`, `notes-list.js:3428`), 646 KB wire, 5,312 KB raw JSON, 7 to 8 long tasks totalling 717 to 1,133 ms. One `saveEntry()` moved 5,780 KB raw. Call sites: `grep -c "loadEntries()"` 132; `saveEntry` awaits it (`capture-ask.js:736`), and the filing watcher awaits it again when filing finishes (`capture-ask.js:87`). Heap after Notes at 5,000: 36 MB.
- Impact: at 5,000 notes each save, delete, undo, link and filing completion pulls 5 MB and blocks the main thread up to 1 s; it scales linearly. The list itself is paged (61 `li` rendered), so the cost is the data, not the DOM.
- Severity High. KNOWN in part (BACKLOG 111.1, which describes the load-everything shape at 1,000 per page); the measurement and the per-save cost are NEW.
- Fix: a `upsertEntries(list)` / `removeEntries(ids)` pair in `notes-list.js` that patches `allEntries` from the save/delete response and re-renders, and a `GET /entries?since=<updated_at>` delta for the rest; keep `loadEntries()` for unlock and the explicit refresh button. Convert the save, delete, undo, filing and link paths first (about 20 of the 132). Acceptance: a save at 5,000 notes makes at most 2 requests and no long task over 100 ms. Effort M.

### Medium

**FE-06. Boot JS regressed 29% after the budget was "met", and nothing measures it.**
- Evidence: gzip -6 of the boot set: own 40 files 1,294 KB plus d3 90 KB = 1,384 KB; with p5 (fetched after load on every boot, see FE-07) 1,623 KB; `perf.js` wire total 1,632 KB in 42 files, 5,240 KB raw. WORLD_CLASS_PLAN H7: "boot JS went 1,699 to 1,072 KB ... against the 1 MB line" (2026-09-24), and "`boottime.js` is the gate". `boottime.js` is not in `scripts/gate.sh` (line 279 lists 120 sweeps, not it) and no test bounds a boot asset's size. `avatars.js` (150 KB gz) was split from `app.js` because it "took the gzipped app.js over its size bound" (`index.html:12294`), i.e. the bound was dodged by moving the code to another boot file.
- Impact: the budget is decorative; growth lands silently. Largest boot files gz: avatars 150, settings 71, dashboard 67, notes-list 62, atlas 55.
- Severity Medium. Claimed built and regressed.
- Fix: `tests/test_boot_budget.py` reading the `<script src>` list from `index.html`, gzipping each, failing over a number (start at today's 1,384 KB and ratchet down); lazy-load the decoration (`avatars.js`, `atlas.js`, `bg-art.js`, `tour.js`: about 850 KB raw, 260 KB gz) behind the first paint of a face, the art or the tour. Effort S for the ratchet, M for the moves.

**FE-07. p5 (1 MB raw, 239 KB gz) is still fetched and parsed every boot; d3 (280 KB raw, 90 KB gz) still blocks DOMContentLoaded.**
- Evidence: `/vendor/p5.min.js` is in every boot's resource list (`perf.js`), requested by `ensureP5()` (`phone-shell.js:60`) because the emblem is drawn at boot. `<script src="/vendor/d3.v7.min.js">` at `index.html:12239`, synchronous; `d3.` is used in `graph*.js`, `whiteboard*.js` and three lines of `wiring.js` (1380 to 1382, inside the graph's physics toggle).
- Impact: 330 KB gz and about 85 to 135 ms of parse (the plan's own figure for p5) for decoration and two lazy surfaces.
- Severity Medium. KNOWN (WORLD_CLASS_PLAN H7 "found, not fixed"; MODERNISATION_AUDIT C3 proposed `import()` for both).
- Fix: port the emblem to canvas 2D as `bg-art.js` was; move d3 into the `graph` and `library` lazy bundles (`app.js:2171`). Effort M.

**FE-08. Each lock and unlock stacks another reminder poll and its listeners.**
- Evidence (`lockleak.js`, quiet server, 5,010 notes): requests in an idle 65 s before any lock: `/reminders` 1, `/models/status` 1. After 4 lock/unlock cycles: `/reminders` **5**. Listeners 3,062 to 3,098, CDP nodes 25,696 to 27,578 (about +470 retained per cycle, after GC). Cause: `unlock` calls `startApp()` (`app.js:912`), whose `step("watch reminders", startReminderWatch)` (`app.js:1224`) adds `setInterval(checkDueReminders, 60_000)` plus `focus` and `visibilitychange` listeners (`status.js:699` to 706) with no guard. Any 401 also routes through the lock screen (`app.js:483`, `capture-ask.js:2569`, `chat-agent.js:2725`, `documents.js:16749`), so an expired session does this without the person locking.
- Impact: a desktop window left open for a day polls `/reminders` N times a minute and retains DOM per unlock.
- Severity Medium. NEW.
- Fix: make `startReminderWatch` idempotent (module flag, or keep the interval id and `clearInterval` first; bind the two listeners once at module level). Find the +470 nodes with a heap snapshot diff across one cycle. Acceptance: `lockleak.js` shows `/reminders` 1 per idle minute after 4 cycles and node growth under 50 per cycle. Effort S.

**FE-09. CSS: 2.59 MB shipped, 378 KB of it used.**
- Evidence (`csscov.js`, Chromium CSS coverage, light, 1440, every tab and all 20 Settings panes visited): 2,591 KB, 930 KB once comments are removed, 378 KB used (41% of rule bytes, 15% of what is shipped). 10,241 selector occurrences, 8,278 distinct, 140 selectors defined in four or more places, 160 `!important`. The 2026-09-13 audit measured 1.24 MB of CSS (MODERNISATION_AUDIT C3): it has doubled in three weeks.
- Impact: render-blocking 821 KB gz before the lock screen; every style recalculation walks about 10,000 selectors.
- Severity Medium. NEW (the size, the coverage).
- Fix: FE-01 removes 80% of the bytes; then a coverage sweep in dark, 390 and with menus and the whiteboard open, to list rules no state uses, and delete them in batches with `tests/test_css_braces.py` and the sweeps as the gate. Effort M.

**FE-10. `index.html` is 852 KB and builds 8,906 elements before the lock screen.**
- Evidence: `wc -c` 851,545 (206 KB gz, 39% comments); `document.getElementsByTagName('*').length` 8,906 at boot (9,792 at 5,000 notes); CDP `Nodes` 23,839. Every Settings pane (20), every dialog and every tab's markup is in the page at boot.
- Impact: parse and style of 9,000 elements nobody sees at the lock screen; the pre-auth long tasks were 85, 100 and 90 ms (10 notes) and up to 358 ms under load.
- Severity Medium. NEW.
- Fix: FE-01's comment strip first (206 to 92 KB gz); then move the Settings panes into `<template>` elements cloned on the first `openSettingsModal` (the panes are already lazily wired). Effort M.

**FE-11. Breakpoints are not "stated once": 58 distinct width queries, and two conventions collide at 600 and 720.**
- Evidence: `grep -ohE "\((max|min)-width: ?[0-9.]+(px|rem|em)\)" css/*.css | sort -u | wc -l` = 58. Commonest: 599.98px (51), 819.98px (37), 720px (28), 600px (21), min 600px (15), 1099.98px (7), 640px (6), 900px (5), 40rem (5). `max-width: 600px` and `min-width: 600px` both match at exactly 600 px (21 + 15 rules), and `max-width: 720px` with `min-width: 720px` at 720 (28 + 3).
- Impact: four designed layouts (UI_MODERNISATION_PLAN Phase 9: 600, 820, 1100) became dozens; a 600 px or 720 px window gets both sides' rules.
- Severity Medium. Claimed built (Phase 9, "makes the breakpoints a design, stated once").
- Fix: a lint (`tests/test_breakpoints.py`) allowing only the Phase 9 set (599.98 / 819.98 / 1099.98 and their `min` twins at 600 / 820 / 1100) plus a named allow-list; migrate the 720, 640 and 900 groups. Effort M.

**FE-12. Silent failures on destructive and state-changing actions.**
- Evidence: 272 empty catches (`catch {}`, `.catch(() => {})`, `=> null`). Ones that hide a user's action failing: Forget a memory, `navigation.js:2575`; delete a backup, `settings-data.js:175`; pin, delete and clear question history, `ask-history.js:218, 227, 238`; clear server logs, `settings.js:1109`; tension accept and dismiss toast success even when the POST failed, `suggestions-inbox.js:370, 378` ("Linked as contradicting."); redo of a skill delete and of a bookmark delete, `library.js:2333, 9306`; bulk reminder delete `shell-reminders.js:1113`.
- Impact: the person is told nothing or told the wrong thing; the item reappears on the next render with no explanation.
- Severity Medium. NEW.
- Fix: replace `.catch(() => {})` on mutations with `.catch((e) => toast(e.message, true))` and return early before the success toast; a lint that fails on `method: "(POST|PUT|PATCH|DELETE)"` followed by a silent catch, with an allow-list for beacons. Effort S.

**FE-13. First visits at 5,000 notes: Timeline and Dashboard block for a second.**
- Evidence (`perf.js`, 5,010 notes, load about 14): Timeline first visit `/timeline` 1,302 ms, 12 long tasks, 1,286 ms; Dashboard first visit 13 fetches, 8 long tasks, 815 ms (max 172 ms); Library 7 long tasks 565 ms; unlock to quiet 1,199 ms. At 10 notes the same tabs were 0 to 1 long task.
- Impact: the app feels slow exactly when the notebook is large; the long tasks scale with N.
- Severity Medium. NEW at this size (TIMELINE_PLAN section 7 measured smaller notebooks).
- Fix: profile each with `graphprof.js`'s method; the Timeline likely builds every row before paging. Effort M.

### Low

**FE-14. Desktop controls under the app's own 28 px floor.**
- Evidence (`floor.js`, 1440, `--target-min` = 1.75rem): the view-toggle segments in four docks, `#notes-view-rows`/`-cards`, the Library's two, `#timeline-view-feed`/`-table`, the Reminders' two, all **28 x 24**; Documents Edit/Read 74 x 24 and 82 x 24; interactive category and "Add tags" chips 24 tall; `#chat-title` (a button) 110 x 24.
- Impact: DESIGN.md "Hit targets" says 28 px is "the floor under every interactive thing"; `iconfloor.js` only checks touch contexts (44 px), so the desktop floor has no sweep.
- Severity Low. Claimed (DESIGN.md hit targets).
- Fix: segments in a dock track `min-height: var(--target-min)` with the track growing to 32 + padding, or the track 36; a `floor.js`-style desktop check in `iconfloor.js`. Effort S.

**FE-15. The design census: same role, different numbers.**
- Evidence (`census.js`, 1440 light, 8 tabs, the shell and 20 Settings panes, 1,183 buttons):

| Role | Count | Heights (px: count) | Font sizes | Radii |
| --- | --- | --- | --- | --- |
| icon-only | 711 | 28: 305, 32: 104, 24: 94 (chips), 22: 99 (help links), 14.5: 35, 34.5: 22, 35: 15, 36: 7, 44: 5, others | 12.8, 14.72, 13.6, 12, 16 | 4.8, 2.4, 0, 50%, 999, 6.4 |
| ghost | 133 | 32: 125, 66.5: 7 (day strip), 44: 1 (space switcher) | 13.6, 12.8, 12 | 4.8, 999 |
| filled | 73 | 32: 45, 36: 4, 61.5: 5, 96.5: 13, 19/23: 6 (wiki links) | 14.72, 13.6, 12 | 4.8, 6.4, 2.4 |
| segment | 33 | 24: 12, 32: 21 | 13.6 | 8.8, 999, 2.4 |
| tab | 22 | 36: 22 | 13.6, 16 | 2.4, 4.8 |
| chip | 30 | 24: 27, 28: 3 | 12 | 2.4, 4.8 |

  The same class string `button.ghost.small.icon-only` renders at 21, 28 and 32. Icon glyphs inside buttons at 5 sizes (13.8, 14.72, 15.64, 16.93, 18.4 px). Line-height ratios: 10 distinct (1.50 on 3,726 elements, then 1.25, 1.20, 1.30, 1.45, 1.35, 1.00, 1.60, 1.55, 1.15). Off-token font sizes: only 66 elements (`code` at 12.512 px in Help, 57; `kbd` 11.52, 8). Off-token radii: 1. Docks: one control height per bar on every tab (32), Graph's bar 47 px against 50 elsewhere.
- Doc drift: DESIGN.md "Control height" says the tab bar and sub-tab strips take `--target-min` (28): measured 36. WORLD_CLASS_PLAN 1.2 says `--control-h-lg` is 36 px; DESIGN.md says 2rem (32); docks measure 32.
- Severity Low (the token layer is sound: off-token sizes and radii are near zero; the variance is in which token each role picks). NEW.
- Fix: write the role table above into DESIGN.md as the contract and extend `census.js` into a sweep that fails when a role gains a height. Effort S.

**FE-16. Three relative-time formatters, five download helpers.**
- Evidence: `dashRelativeTime` (`dashboard.js:4105`, "3 hours ago", `new Date(iso)`), `relativeTime` (`sheets-selects.js:1440`, "3h ago", "yesterday", via `parseServerTime`), `relativeWhen` (`shell-reminders.js:1297`, "3 hours ago" and "in 3 hours", `new Date(iso)`). Downloads: `downloadDocumentExport` (`documents.js`), `downloadExport` (`settings-panes.js`), `downloadSupportBundle` (`settings.js`), `downloadJson` and `downloadFromApi` (`skills.js`); `URL.createObjectURL` in 9 files.
- Impact: the same timestamp reads differently on the Dashboard and in a list; two formatters skip the UTC guard the third added after an "Invalid Date" bug.
- Severity Low. NEW. Fix: one `relativeTime(iso, {future})` in `app.js` using `parseServerTime`; one `downloadBlob(blob, name)`. Effort S.

**FE-17. Global-scope coupling.**
- Evidence: 3,950 top-level functions and 700 top-level `let`/`var` in one scope; 371 `typeof X === "function"` guards for calls across files (avatars.js 53, settings.js 39, documents.js 37). Positive: no duplicate top-level function names; only one unreferenced function (`atlasRetune`, `atlas.js:1059`).
- Severity Low. NEW (as a number). Fix: none urgent; the guards are the cost of the lazy bundles. Track the guard count as a ratchet. Effort S.

**FE-18. `field-clear.js` polls every second for the whole session.**
- Evidence: `field-clear.js:111`, `setInterval(..., 1000)` re-syncing every clear button, never cleared; inputs already have `input` listeners.
- Severity Low. NEW. Fix: sync on `input`, `change` and after programmatic value sets (a `fieldClearSync` call where code assigns `.value`). Effort S.

**FE-19. Responsive: small defects only.**
- Evidence (`resp.js`, 8 tabs x 390, 768, 1024, 1440, 1920, touch context under 820): document horizontal overflow 0 everywhere. `.sidebar-collapse-toggle` starts at x = -5 at 768 (Notes, Chat, Documents). Documents at 1024: the sidebar's "Outline" tab cut 7 px and overlapped by the collapse toggle. Library at 390: the sort select and the Rows/Cards toggle have a corner under the kind chips. Under-44 targets at 390: only chips (24 tall), `#chat-title`, `#doc-title` (32). Orphaned headings: 0 at 1440 and 768, 4 at 390 (`settings:models` "Advanced response settings", three skill names). Truncation without a tooltip: 250 `.timeline-row-snippet` at 1440 (the title beside it has one).
- Severity Low. NEW. Fix: per item, S.

### Contrast (no finding)

`contrast.js` light and dark: 0 failures on 36 views each (8 tabs, 9 sub-tabs, the Guide, 20 Settings panes). `contrast2.js` added placeholders (0 under 4.5:1) and text under ancestor opacity (1 marginal: the submenu arrow at 4.50). Caveat: `contrast.js` skips any element with a gradient or image background up its tree, and the whiteboard was skipped (no board in the notebook).

## 3. Claimed built but not

| Claim | Where | What the app does now |
| --- | --- | --- |
| "boot JS went 1,699 to 1,072 KB"; "`boottime.js` is the gate" | WORLD_CLASS_PLAN H7 | 1,384 KB gz own + d3, 1,632 KB with p5; `boottime.js` is not in `gate.sh` and no test bounds it (FE-06). |
| "This phase makes the breakpoints a design, stated once" | UI_MODERNISATION_PLAN Phase 9 | 58 distinct width queries; 600 and 720 both double-match (FE-11). |
| "`--target-min` ... the floor under every interactive thing" | DESIGN.md, Hit targets | 12 desktop controls at 24 px tall (FE-14). |
| Tab bar and sub-tab strips "take `--target-min`" | DESIGN.md, Control height | 36 px (FE-15). |
| `import()` d3 when the Graph tab opens | MODERNISATION_AUDIT C3 (mitigation) | d3 is still a synchronous boot script (FE-07). |
| "the main thread is roughly 10% busy ... the renderer is not the reason" | HISTORY, GRAPH_PLAN Phase 1 numbers | At 5,000 notes: 44% idle busy, `drawImage` 7.8 s of a 32 s profile (FE-04). |

Claims that hold: `leaks.js`'s "0 listeners a round" (160 switches at 5,000 notes: listeners 4,824 to 4,854, nodes flat at 35,084, heap 23.1 to 24.5 MB); "an idle minute is 2 requests" (measured 2); one filled button per dock and one control height per dock (measured on all 7 docks).

## 4. Top 5 execution briefs

### Brief A: strip comments at serve time and ratchet the boot budget (FE-01, FE-06, FE-10)
- Goal: boot transfer from about 2.66 MB to about 1.2 MB with no change to any file on disk.
- Files: `src/memorymap/api/app.py` (`RevalidatedStatic`, its `_precompressed` gzip cache); new `src/memorymap/api/asset_strip.py`; new `tests/test_asset_strip.py`, `tests/test_boot_budget.py`.
- Steps: (1) tests first: strip functions on fixtures (CSS comment inside a string kept; HTML comment inside `<pre>`, `<textarea>`, `<template>` kept; JS whole-line `//` removed, `//` inside a string or a multi-line template literal kept); (2) apply in the precompress step for `.css`, `.js` and `index.html` only, never `vendor/`; (3) `test_boot_budget.py` gzips the served bodies of every `<script src>` and `<link rel=stylesheet>` in `index.html` and fails over today's numbers minus the saving; (4) `node --check` every stripped JS in the test.
- Acceptance: `perf.js` boot `jsWireKB` under 1,000 and `cssKB` under 200; `scripts/gate.sh --sweeps` errors 0; `tests/test_asset_cache_busting.py` green.
- Risks: a JS line starting with `//` inside a multi-line template literal or a regex literal. A naive backtick scan cannot rule this out (backticks in the comments themselves pair up across code and flag hundreds of false candidates), so the JS stripper needs a small lexer (strings, template literals with `${}` nesting, regex literals, comments), proven by a test that the stripped file's token stream equals the original's minus comments, plus `node --check`. CodeQL may flag a regex over HTML, so use a scanner, not one regex.

### Brief B: content-hash asset stamps instead of the per-process boot token (FE-02)
- Goal: a relaunch reuses the browser's cache and code cache; a changed file still gets a new URL.
- Files: `src/memorymap/api/app.py` (`_BOOT_TOKEN`, the stamp splice in `RevalidatedStatic`), `frontend/js/app.js` (`lazyAssetStamp`, `app.js:2242`), `tests/test_asset_cache_busting.py`.
- Steps: (1) test: the stamp for a file is a function of its bytes, stable across two app instances, different after the file changes; (2) compute `sha256(file)[:10]` per local CSS/JS at startup, splice `?v=<version>-<hash>` per URL in the served `index.html`; (3) `lazyAssetStamp` reads the per-file stamp from a small JSON map the page carries, not one shared token; (4) keep `immutable` on stamped URLs.
- Acceptance: `cachecost.js` after a server restart: 49 of 49 from cache, lock screen within 10% of the warm reload. The desktop stale-cache report must still be impossible: edit a CSS file, restart, the new URL is fetched.
- Risks: workers and dynamically inserted scripts (`harper-worker.js`, `ensureModule`) must read the same map; the service worker (`frontend/sw.js`) caching rules.

### Brief C: the Library stops loading documents, whiteboard and the grammar checker (FE-03)
- Goal: a Library visit fetches `library.js` and its data only.
- Files: `frontend/js/documents.js` (line 16988 `renderDocTools()`, `docLoadWordlist` 13666), `frontend/js/documents-prose.js` (`docGrammarAsk` 84), `frontend/js/app.js` (`LAZY_MODULES.library` 2208, `TAB_MODULES` 2229, `LAZY_ENTRY_POINTS`), `src/memorymap/api/app.py` (WASM precompress).
- Steps: (1) a Playwright test or sweep (`libreq.js` shape) that clicks Library and asserts no `harper`, `wordlist`, `whiteboard` request; (2) load-time call becomes `renderDocStatusBar()` only; prose starts in `openDocument` when the text is non-empty; (3) split the bundle into `library` (library.js) and `documents` (documents-code, -prose, documents, whiteboard-map, whiteboard), with entry-point stand-ins for every function the Library calls into them (`grep` the Library's calls first); (4) precompress the WASM once at startup into the gzip cache.
- Acceptance: Library first visit under 200 KB gz of JS; opening a document still checks spelling and grammar (`scratchpad/ui-sweeps/docs-spell.js`, `p2-harper.js` green); `errors.js` 0 on every tab.
- Risks: the bundle order comments in `app.js:2196` say documents.js's top level names functions from the two files before it; a stand-in missed is a ReferenceError on a click, so drive every Library card kind (note, document, board, map, image, file, bookmark).

### Brief D: save without refetching the notebook (FE-05)
- Goal: a save, delete, undo, link or filing completion updates `allEntries` in place.
- Files: `frontend/js/notes-list.js` (`loadEntries` 3449, `_loadEntries`), `frontend/js/capture-ask.js` (`saveEntry` 647 to 760, filing watch 80 to 90), the delete and undo paths (`grep -n "loadEntries()"`), `src/memorymap/api/routes_entries.py` (a `since=` filter if missing).
- Steps: (1) test: with 5,000 notes, `saveEntry` makes at most 2 requests (`save5k.js` shape, or a Python test counting `/entries?` hits through the client); (2) `upsertEntries(entries)` and `removeEntries(ids)` that patch `allEntries`, then `renderEntries()`, `renderSidebar()`; (3) convert the save, delete, restore, undo/redo, filing-done and link paths; (4) leave `loadEntries()` for unlock, refresh and space switch.
- Acceptance: `save5k.js` saveEntry under 300 ms, at most 2 requests, no long task over 100 ms; the Notes list, sidebar counts and category chips update after each converted action (drive each in Playwright).
- Risks: derived caches (`referenceCountsCache`, `reminderCountsCache`, map chips via `ensureMapChipsFor`) must be refreshed for the patched ids; the semantic-search branch of `_loadEntries` keeps its own path.

### Brief E: Graph at 5,000 notes draws less and stops (FE-04)
- Goal: the Graph tab at 5,000 notes settles and idles like the other tabs.
- Files: `frontend/js/graph-canvas.js` (`gcDraw` 1420, `gcNodeSprite` 848, `gcDrawNebulae` 904, `inView` 1446, worker message 3312), `frontend/js/graph.js` (`graphMinimapPaint` 4577), `frontend/js/graph-worker.js`.
- Steps: (1) measure first with `graphprof.js` at 5,000 (seed with the session's `seed5k.py` shape or `scratchpad/graph-fixture.js` at 5,000); (2) draw only on a new worker tick or a transform change (dirty flag); (3) below a zoom threshold draw nodes as one `Path2D` per colour, sprites above it; (4) cull before building the draw list; (5) no minimap repaint while alpha is above the settle line; (6) end the simulation at a tick budget (for example 300 ticks or 20 s) and freeze.
- Acceptance at 5,000 notes: settled within 20 s, idle busy under 5% after settling, `drawImage` under 1.5 s per 30 s, p95 frame under 33 ms during the layout; `scratchpad/ui-sweeps/graph.js` and `graphminimap.js` green; the 2,000-note gate numbers in HISTORY re-measured.
- Risks: label placement and hover hit-testing depend on sprite geometry (`nodeGeometry` in `__graphDebug`); keep the debug snapshot's fields so the sweeps still assert on them.

Smaller, same session if time: FE-08 (idempotent `startReminderWatch`, S), FE-12 (mutation catches toast, S), FE-14 (dock segment floor, S).

## 5. What I could not verify

- Real devices: no phone, no iPad, no Windows WebView2 window; LAN mode transfer costs are inferred from byte counts, not timed over Wi-Fi.
- Timings were taken at load average 6 to 21 on four shared cores; only relative numbers and byte or request counts should be quoted.
- The desktop app's own cache behaviour (`storage_path` profile) was not run; FE-02 was measured in a Playwright persistent profile, which caches the same way Chromium does.
- The whiteboard and mind map were not swept (no board in the notebook); dark-theme census and CSS coverage were not run (light only, 1440 for coverage).
- JS coverage (unused code per bundle) was not computed; the +470 retained nodes per unlock (FE-08) were not attributed with a heap snapshot.
- `resp.js` reported controls inside closed panels as clipped or off screen in some cases (`#timeline-options` at 390 and 768, `#doc-delete` behind the documents status bar); those were checked by screenshot and left out, and a few remaining Low items in FE-19 were not confirmed visually.
- The Graph never settled within the 30 s window, so the time to settle at 5,000 notes is "more than 30 s", not a number.
