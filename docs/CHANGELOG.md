# Changelog

All notable changes to MemoryMap AI are recorded here. The format is loosely
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project follows a "waves and phases" development history (see the milestones
below). Versioning is `0.x` while the app stabilises.

## [Unreleased]

### Added — an allowlist for note attachments

Reported directly: `POST /entries/{id}/files` (the generic "attach a file"
button on a note) had no file-type validation at all — anything uploaded,
video included. `/media/upload` (pasted/dropped images) already had a real
allowlist for a stored-XSS reason specific to that route; this one is
broader (attachments download rather than render inline) but still refuses
video, audio and executable shapes with a clear 415, while covering images,
PDF, common office formats, and text/code files. Audio specifically is
tracked as a real feature to add (BACKLOG §75 — capture, playback, a
library page) rather than a permanent refusal.

### Changed — a themed dialog for the document word-count goal

Was a bare `window.prompt()` — functional, but the only dialog in the app
with no app styling, font or theme at all. Reported directly. Now a `card
space-dialog` matching every other small dialog in the app (the space
create/rename/delete ones, the documents-storage one).

### Fixed — three UI issues at the top of the Documents sidebar

All reported directly, with a photo. (1) The document title input had no
floor on how far it could shrink, so on a narrow window it was crushed to
a few illegible pixels before the toolbar ever wrapped its buttons onto
their own row — given a real minimum width, the toolbar now wraps instead.
(2) The four new help-tooltip circles (below) rendered as ovals, not
circles, everywhere except the Graph/Timeline tabs — `--control-h`, the
custom property they sized themselves against, is only declared in a
handful of scopes, and silently resolved to nothing everywhere else,
falling back to `button.small`'s asymmetric padding. Fixed with a literal
size instead of a token that isn't always in scope. (3) The Documents/
Outline pill toggle's "Recent"/"+ New" row was reserving the same
right-side clearance for the collapse toggle that the tab strip above it
already reserves, even though the toggle only ever appears once — "+ New"
sat well short of the sidebar's real edge with dead space beside it. Given
its own clearance instead, plus a little extra beyond the bare minimum for
visual breathing room next to the toggle.

### Fixed — the sidebar collapse toggle escaping to the page's top-left on a phone

Reported directly: the collapse toggle (Notes, Chat and Documents sidebars
alike) could render pinned near the very top of the viewport, over the app
header, instead of in its own sidebar's corner. The toggle is `position:
absolute`; two separate mobile breakpoints set its sidebar to `position:
static` to disable the desktop sticky behaviour, and `static` doesn't
establish a positioning context for an absolutely-positioned child, so the
toggle fell through to the page's own initial containing block. `position:
relative` disables sticky the same way while still containing the toggle.

### Removed — two dead files at the repo root

`find_emojis.py` was an unreferenced one-off debugging script (scanned
`app.js` for stray emoji during a past cleanup pass); `mkdocs.yml`
configured a docs site nothing builds — no CI step, no Makefile target, no
`mkdocs` dependency anywhere, and the real GitHub Pages site is the
hand-built `docs/index.html` renderer. Asked for directly.

### Added — help tooltips on Timeline and the three Library subtabs

Asked for directly, matching the existing Graph tab pattern. The Timeline
toolbar and the AI Skills, Whiteboards and Image Gallery subtabs each had a
permanently-visible subtext paragraph explaining what the screen does;
replaced each with a `?` icon button (native `title` tooltip on hover, a
click-to-open panel for the full explanation) so the space is available for
content on every later visit instead of repeating itself. The four new
toggles and the original `#draft-help` one now share a single
`initHelpToggle()` function in `app.js` instead of four more copies of the
same click/outside-click/Escape listener trio. Verified live: all five
panels are hidden by default, open correctly positioned under their button,
and close on outside-click and Escape.

### Fixed — sketch/attachment images rendering below a note's metadata

Reported directly ("attached sketches are below note metadata"). The note
card built its attachment thumbnails and appended them to the list item
*after* the metadata footer was already appended, so images and sketches
always rendered under the category/date line instead of above it. Fixed by
inserting the attachment row before the metadata element rather than
appending after it. Verified live: attachments now render above the
metadata footer in the note list.

### Fixed — two error-prevention gaps

Asked for directly. `deleteAskHistoryTurn` deleted a Q&A permanently with
no confirmation or undo — its own "clear all" sibling already confirms,
this didn't. Now it does. A reminder's `due_at` could be set in the past
(create and edit both) with no check, silently creating a reminder that
could never usefully fire — `POST /reminders` and `PUT /reminders/{id}`
now reject one more than a minute in the past (a small clock-skew/latency
allowance, not real slack) with a clear 422.

### Fixed — Library thumbnails for pasted/dropped images, not just sketches

Asked for directly ("make the sketches render... the same as how images are
visually displayed"). Found the opposite of the assumed direction: sketches
already got a Library thumbnail (a real `Attachment`), but a note with a
pasted or dropped image — inline markdown in the note's own text, no
`Attachment` row — got none at all, and its title/preview showed the raw
`![alt](url)` syntax literally. Root cause: `routes_library.py`'s
`thumb_by_entry` only ever looked at `Attachment` rows, and `_clip()` never
stripped inline markdown the way `routes_graph.py`'s node-label preview
already did.

Fixed by factoring the shared fix out (`manager.strip_inline_markdown`,
reused by both `routes_graph.py` and `routes_library.py` instead of two
near-duplicate regexes) and adding a `thumb_url` fallback — the note's own
first inline image, same URL shapes the note editor itself already renders
— checked only when there's no `Attachment` thumbnail, so a sketch's own
drawing always wins over anything mentioned in its caption. Extended to the
recycle bin and archive views too, which had no thumbnails of either kind
before. Verified live: a pasted-image note and a sketch note both show
correct thumbnails in grid and list view, with clean (non-markdown) titles.

### Added — pagination for `GET /entries`

Requested directly ("that is a real app feature... probably needed for
real world use"). `GET /entries` was genuinely unbounded — every note in
the notebook, every load, no matter its size. Now takes `limit`/`offset`
(default page 1000, hard ceiling 5000) and reports the true total via an
`X-Total-Count` header. `entry/manager.py` grew matching params on all
three list functions plus three new count helpers — additive, so every
existing in-process caller is unaffected.

`app.js`'s `loadEntries()` fetches pages in a loop, painting the first
page immediately and filling the rest in the background; every one of
`allEntries`'s ~30 read sites needed zero changes, since it still ends up
exactly as complete as it always was once loading finishes. Caught and
fixed in the same pass, by grepping every `/entries` call site rather than
assuming the new default was safe everywhere: three dashboard widgets each
independently re-fetched the whole list and would have silently truncated
past 1000 notes (wrong tag counts, most seriously) — now they reuse
`allEntries` instead. Also removed dead code found the same way: `copyLogs()`
built and fetched an `/entries` URL it never used.

Verified live: seeded 2500 notes, confirmed exactly 3 page requests fire,
`allEntries` and the status bar both land on the true total, all rows
render, and the dashboard's widgets show correct totals with zero console
errors.

### Fixed — backend hardening pass

Requested directly ("harden the backend, make sure it's robust"); found by a
targeted audit rather than guessed at, each verified live before being
called fixed:

- `GET /graph/local/{id}?depth=` had no upper bound; the BFS loop ran
  `range(depth)` regardless, so a large `depth` blocked this single-worker
  server's one request thread for real wall-clock time — a trivial DoS on a
  personal-notebook app. Now `Query(ge=1, le=6)`, plus the loop breaks as
  soon as its frontier empties instead of finishing out the range.
- `GET /timeline?days=` had no upper bound either, and fed straight into
  `timedelta(days=days)` — a large enough value raised an unhandled
  `OverflowError` (Python int too large to convert to C int), surfacing as a
  raw 500 instead of a clean error. Now `Query(ge=0, le=40000)` (0 still
  means "everything").
- `POST /import/markdown` capped each file's size but not how many files one
  request could carry, unlike its sibling `/import/document`
  (`MAX_DOCUMENT_IMPORT_NOTES`). Now capped at `MAX_IMPORT_FILES = 500` with
  a clear 422 past that, rather than unbounded work per request.
- Wiki-link resync failures in `create_entry`/`update_entry` were swallowed
  with no logging — the embedding-refresh block three lines above both of
  them explicitly logs on failure ("logged rather than swallowed" is the
  comment right there), and the wiki-link block didn't follow its own
  neighbour's pattern. A real link-resolution bug was invisible in both the
  UI and Settings → Logs; now it isn't.
- `searxng_manager._run_streaming`'s deadline was only checked *between*
  output lines — a child process that went quiet without exiting (a stalled
  download, a hung subprocess) blocked the call forever no matter what
  `timeout` said. Reads the pipe from a background thread into a queue now,
  so the deadline is checked on a real poll loop even when nothing is being
  read. Reproduced the actual hang locally before and after the fix.

### Added — Windows installer

- A real installed build for Windows: `packaging/windows/memorymap.spec`
  (PyInstaller, onedir) and `packaging/windows/installer.iss` (Inno Setup,
  per-user install — no admin prompt). `release.yml` now builds and attaches
  it to the GitHub Release whenever a `v*` tag is pushed. Unsigned for now
  (see README's Windows install note); ships to GitHub Releases only.
- `core/config.py` and `api/app.py` both located `frontend/` and the app
  icon via a path relative to the source file's own position, which assumes
  a `src/` layer a PyInstaller bundle doesn't have — both now branch on
  `sys.frozen` and resolve against the bundle's own extraction root instead.
  Notes now default to `%APPDATA%\MemoryMap AI` (or the platform
  equivalent) only for a frozen build; a source checkout is unaffected.

### Added — system tray, update check

- **System tray for the desktop window.** Closing the window now minimizes it
  to a tray icon instead of quitting; the tray menu is Open / View Logs /
  Restart / Quit. `pystray` + `Pillow` join `pywebview` as the `desktop`
  extra (`core/extras.py`) and are bundled into the Windows installer. Missing
  or unusable on the running platform (no display, package not installed) is
  a soft fallback, not a crash — the window just closes for real, same as
  before.
- **"Check for updates" (Settings → About).** Off by default, same reasoning
  as web search. A `GET /update/check` endpoint compares the running version
  against GitHub's latest release tag; the checkbox, a "Check now" button,
  and a silent startup check (toasts only when a newer version genuinely
  exists) are all new. Caught live rather than merely reasoned about: the new
  `update_check_enabled` preference wasn't declared on `PreferencesBody`, so
  the PUT silently dropped it, and `get_preferences()`'s hand-built response
  dict never echoed it back either — both fixed.

### Fixed / Added — CodeQL cleanup, extract-notes feature, a real private-note leak, design pass

- **Security.** All 81 open CodeQL alerts closed. Separately: a private
  note's ciphertext was reaching the AI in four places once a link, card, or
  reminder referencing it predated the note being marked private
  (`set_private` doesn't touch existing references) — the weekly digest,
  `audit_vague_links`, the whiteboard `read_whiteboard`/`search_whiteboard`
  agent tools, and a reminder's entry preview. All four now respect the
  private-note guard; each has a regression test.
- **Extract notes** (new). Turn selected text — in the Writing Room, a
  Document, or a whiteboard multi-selection — into one or more AI-drafted
  notes, auto-filed and auto-linked with real generated reasons, previewed
  before anything is written. Reuses the janitor's filing/merge judgement
  and the librarian's link-reason generation rather than new logic.
- **Design.** An elevation (`--shadow-sm/md/lg`) and motion
  (`--motion-fast/base/slow`) token scale, replacing a dozen hand-written
  `box-shadow` values and ten distinct transition durations app-wide. A
  live mic-level meter on the dictation buttons, driven by `AnalyserNode`
  off the same stream the recorder already opens. Library/Timeline empty
  states brought in line with the rest of the app; a Library card no longer
  duplicated a titled note's title into its own preview line.
- **Perf.** Two O(n) full-table-scan-shaped bugs fixed: the reevaluate
  endpoint's linked-entry lookup now queries ids instead of loading and
  decrypting every note, and the whiteboard no longer re-parses every
  sketch's JSON on every drag frame.
- **Docs.** ~1,000 lines of resolved ROADMAP/BACKLOG items moved into
  `docs/roadmap/HISTORY.md`; both live docs now hold only open work.

### Fixed / Added — work-recovery session: icon system, spaces, timeline, chat dock, link reasons

A previous session's work was lost; the recovery attempt had left the app
with a broken icon system and several silently-dead features. Baseline was
16 failing tests, not 2 — six of them because the link-reason feature had
never run once (`provider.run_prompt` does not exist).

- **Icons.** The Phosphor stylesheet was vendored but never linked — no icon
  in the app rendered. All 367 colour emoji replaced app-wide (frontend and
  backend tool/skill labels) with Phosphor glyphs via a `ph:name` label
  marker (`setLabel()`) for the ~300 that live in JS string literals rather
  than markup. `lucide.min.js` and its dead branch removed.
- **CSS correctness.** Five custom properties used but never declared
  (`--surface-2`, `--text-main`, `--card-hover`, `--radius-3`,
  `--accent-alpha-1`) — an undeclared property invalidates its whole
  declaration, so the workspace menu had no background and timeline cards no
  radius. A literal `\n` inside a `:root[data-glass="off"]` selector list
  invalidated that entire rule.
- **Spaces.** Rebuilt switcher (markup had been deleted by a bad regex, CSS
  and JS left behind); create/rename/delete hardened — reserved ids can no
  longer be claimed, icon values are validated (were interpolated unescaped
  into a class name), delete reassigns every `WorkspaceMixin` model instead
  of four hardcoded ones and no longer reads a deleted ORM row.
- **Timeline grid.** Cards rebuilt with a header (when, and why), a title
  (the note's first line) and a clamped preview measured by scrollHeight,
  not a CSS clamp that does not engage in the real engine. Column banding
  and a full-height sticky band label. Grid build was O(bands × buckets ×
  notes); now one pass per band into a Map.
- **Chat dock.** Skills folded into one dropdown (selector, Auto|Manual
  pace, Run) instead of four loose controls. Plan is a toggle applied on
  the way out of `sendChatMessage`, so Enter and suggestion chips honour it
  too — previously only its own button sent a plan.
- **Link reasons.** `audit_vague_links` rewritten onto
  `librarian.generate_link_reason` (the old call target did not exist);
  rejects reasons that are themselves vague; commits once per batch instead
  of once per link; retry-limited. `_deduce_reason` no longer makes a
  blocking model call inside the link-creation request path. The backfill
  endpoint now runs the AI pass after the embedding pass, so "Give links a
  reason" writes an actual reason instead of the literal string "similar in
  meaning" for every link. Each suggestion row gets its own editable reason
  field. Background audit confirmed reached from `_run_optimization` with a
  dedicated `auto_link_reason_audit` preference (was previously untested
  that the pass reached the audit at all).
- **Security.** `_unlink_notes` bypassed the private-note guard that
  `link_notes` immediately above it enforces — it could unlink and reveal
  the existence of a private note the caller cannot read.
- **Dashboard.** Widget preview rows: `safeMdSlice` returned the empty
  string whenever an unpaired markdown marker was the first character
  (`cut.slice(0, cut.lastIndexOf(marker))` with index 0), rendering as a
  bare "…" — now falls back to a plain-text slice. Block markdown (headings,
  lists) rendered as literal syntax because the widgets used the inline-only
  renderer; now strip block syntax and show the note's first line as a
  title. A widget-picker modal (roadmap item 26) on top of the existing
  `dashboard_layout` preference and inline edit mode, not a second store.
- **Graph.** Fit-to-view computed its bounding box from node centres
  (ignoring radius/halo/label), used a flat 60px margin regardless of
  container size, and clamped only the zoom-in direction — one distant
  outlier collapsed the whole graph to a scale of 0.07. Padded by rendered
  node extent, container-relative margin, clamped both directions.
- **Whiteboard.** A note card showed 100 characters of escaped plain text
  with no way to see the rest. Now full note, real markdown, clamped past a
  height cap with a Show more/less control matching the notes list.
- **Documents.** Full-height sticky sidebar (was shrink-wrapped to its
  content by a duplicate `#doc-sidebar` rule later in the file that re-set
  `align-self: start`). The storage-path disclosure moved into a dialog
  behind a link-styled button — ~370px back to the document list.
- **Sidebars.** Categories, Chats and Recent headers now sit level with
  their collapse toggle — the toggle is positioned against the card's
  border box, the heading row started at the content box, `--space-6`
  lower, with nothing keeping the two in step.
- **Misc.** `!err?.name === "AbortError"` parsed as `(!err?.name) ===
  "AbortError"`, always false, so no network failure was ever logged to
  Settings → Logs. The Capture textarea reported `scrollHeight: 0` while its
  tab was hidden and sized itself to nothing, only correcting on focus. The
  theme toggle showed a fixed half-circle in both modes; now shows the mode
  you will get (sun for light, moon for dark). Vault key rotation, added
  all-or-nothing with a test proving an interrupted rotation leaves every
  note readable under the old key. Launchers give every network call an
  explicit timeout and tell a network failure apart from a real one, so no
  internet degrades to a one-line message instead of a hang. Library image
  rename (was entirely missing) and a title-regeneration notification (was
  silently dropped by the mute filter, since it is the result of a button
  the user just pressed, not background chatter).


### Fixed / Added — whiteboard redo & select, highlighter persistence, arc-label spacing, touch input (roadmap §11, §15)

- Whiteboard: a redo stack (Ctrl+Y / Ctrl+Shift+Z, toolbar button), and a
  real single-item Select tool (was folded into Pan) with Delete/Backspace
  and Escape support.
- Whiteboard: a highlighter stroke's width/opacity is now saved and
  restored correctly — it previously reloaded as a plain full-opacity 3px
  line, losing the tool's whole point.
- Whiteboard: an arrow tool (shaft + arrowhead as one path/one undo entry).
  **Its live drag-to-save path was not confirmed working this session** —
  see HANDOVER.md for why, and check this first next session.
- Graph (arc view): labels were re-reported as reading like they belonged
  to the wrong node — widened node spacing, shortened the label limit, and
  steepened the label tilt so a label's own reach stays under one node-step.
  Category labels also now get an accent colour, not just bold, so they
  read as a distinct kind of label.
- Whiteboard and graph: switched from mouse events to pointer events (the
  sketch pad already did this) so touch and pen input work, not just a
  mouse — not verified against real touch hardware, reasoned from the
  event model.

### Changed — licence: MIT → AGPL-3.0

MemoryMap is now under the **GNU Affero General Public License v3.0**. The
licence text is the official one from the FSF, unmodified.

What it means in practice:

- Anyone may use, study, modify and share it.
- Anything built on it must be released under the AGPL too, with source.
- **§13, the clause that makes it AGPL rather than GPL:** if someone modifies
  MemoryMap and lets other people use it *over a network*, they must offer
  those users the modified source. Plain GPL would not require that, because
  running a service is not distribution. For an app whose premise is "your
  notebook, on your machine", this is the licence saying what the product
  already says.

**One consequence worth flagging, because it inverts a documented constraint:**
ANALYSIS.md §34a said "odysseus is AGPL, MemoryMap is MIT, no code crosses in
either direction." Half of that is now lifted — odysseus's AGPL code *may* come
in, carrying its notices and attribution — and the other half is tighter:
nothing from here can go out to an MIT project. §34a is rewritten to say so.

Updated: `LICENSE`, the pyproject classifier, the README badge and footer,
ANALYSIS.md §34a, and the cross-reference line in every roadmap file and
CLAUDE.md.


### Fixed — the owner's reported list

Diagnosed in the running app rather than from the report. Full triage, with
what was checked and found already correct, in [ROADMAP.md §41](docs/ROADMAP.md).

- **Trace on the graph is rebuilt.** Reported as "annoying and pretty much
  unusable". `traceModeActive` was set and consulted nowhere, so the map never
  responded to a click and both ends had to be picked from `<select>` elements
  listing every note in the notebook by its opening words. Two clicks on the
  map now, with a readout instead of a form: Swap for the other direction,
  Undo for one step back rather than a reset, Escape to leave, crosshair
  cursor so the mode looks like one.
- **The autonomous-tasks switch turned itself off.** Two controls write that
  preference and the one on the skills panel saved straight to the server
  without updating `prefsCache` — so the next `savePrefs`, which rebuilds the
  whole object from the DOM, read the other checkbox and switched it back.
- **Light/dark stopped affecting the page background** after using the colour
  scheme selector. The builder computes a page colour *for a mode* and stored
  only the current one, written inline on `<html>`, where it outranks every
  `[data-mode="dark"]` rule. Both are stored and re-picked on mode change.
- **Whiteboard:** dragging a card sent no `board_id`, so a card on a named
  board was silently moved to the global one, and a 404 left it on screen
  unsaved; the board list showed "Note 25" because it read two fields an entry
  does not have; the library panel covered its own toggle so it could not be
  closed; the selected tool had no visual indicator; the zoom controls sat
  behind the agent activity monitor.
- **Skill descriptions** were clipped to one line by `.persona-preview`'s
  `white-space: nowrap` (reported twice).
- **The documents sidebar** crushed its own document list to two rows, because
  the outline and help block below it never shrink.
- Tags / Recycle bin / Activity removed from the notes sidebar, as asked.

### Added

- **A text box in "What it remembers".** `save_user_preference` is the model's
  way in; this is the one people reach for first.

### Checked and found correct — not changed

- **Password, token and secret storage.** bcrypt with a per-password salt;
  `secrets.token_hex(32)` session tokens held in memory and swept on expiry;
  private notes encrypted with a key wrapped by a password-derived key.
- The three sketch swatches reported as identical are three distinct colours.
  The real defect underneath is the highlighter at 5% opacity.


### Audited — a week of another agent's work, brought to a mergeable state

`fix/Antigravity-Audit` arrived with 8 commits, ~9,600 insertions and no test
files. It had **90 failing tests and 20 ruff errors** against a `main` whose
only two failures were a self-inflicted time bomb in a dated test. Everything
below is that audit. Full reasoning in [ROADMAP.md §40](docs/ROADMAP.md); the
three new features it brought are documented in §39.

#### Reverted

- **`POST /chat/stream` is NDJSON over a plain POST again**, not a WebSocket.
  The rewrite shared the request's SQLAlchemy Session with a producer thread
  (Sessions are not thread-safe) and closed it twice, leaked that thread when a
  client hung up, had to be mounted outside `dependencies=locked` and reimplement
  auth by hand, and replaced a transport the same-origin policy protects with
  one it does not — so any page the user had open could drive the agent. It
  also accounted for ~70 of the 90 failures. Two genuine improvements from the
  rewrite were kept: mid-stream `error` events, and tool-error logging.
- **`generate_skill` removed.** It wrote unvalidated AI-authored skills straight
  into preferences, bypassing `save_skill`'s schema check, built-in-name guard,
  tool-name validation and `MAX_SKILLS` — and called `config.save_preference`,
  a method with no definition anywhere, so it could only ever have raised.

#### Fixed — security and privacy

- **The AI could tag and link private notes.** `tag_note` and `link_notes` grew
  batch arguments and stopped routing through `_require_note`, the one place
  that refuses a private note. The batch feature is kept; the guard is back.
- **`/media/upload` and `/media/{filename}`** noted as a hardening item — the
  filename is whitelisted so there is no traversal, but uploads are served
  same-origin with no type restriction.

#### Fixed — data loss and correctness

- **JSON export silently dropped `is_deleted`**, so every note in the recycle
  bin would have re-imported as a live note.
- **Semantic search returned nothing after an embedding-model change.** Every
  stored vector was stacked into one array; a notebook holding two widths
  mid-reindex raised on the ragged list and took every query down with it. The
  same crash, plus an N×N memory blowup, was in the graph's similarity edges
  and in link suggestions — all three now go through one blocked,
  dimension-safe `embeddings.similar_pairs`.
- **`?semantic=true` threw away its own ranking**, returning matches in
  notebook order, and swallowed a cold embedding model as "here is your whole
  notebook" instead of a 503.
- **Notes sharing an uppercase tag stopped being neighbours** — the tag index
  was keyed lowercase and intersected against unfolded tags.
- **`search_notes` scaled its ceiling with the context window**, so a 128k
  model could pull 768 note previews into a single tool result.
- **`find_similar_notes` was listed in `WRITE_TOOLS`**, so a pure read cleared
  the agent's read-dedup ledger and counted as work for the claim checker.
- **`ask_user` was culled from small models**, leaving them to guess — the
  exact failure that tool exists to prevent.
- **The memory stream was injected unbounded into the system prompt** on every
  round, past the `PROSE_BUDGET_CHARS` guard that exists to stop that. Now
  capped at 600 characters, newest-first, and never fatal when unavailable.

#### Fixed — features that had never executed once

- **The background librarian was never started.** `app.py` imported
  `autonomous` and called nothing, so the interval, the on/off switch and three
  task toggles in Settings were wired to a loop that did not run.
- **`clean_orphaned_vectors` did not exist.** The call sat inside an
  `except Exception` wide enough to swallow the `AttributeError`. Now
  implemented, and it returns a count.
- **`VACUUM` moved onto an autocommit connection.** Through a `Session` it
  works only while it is the first statement — pysqlite defers its BEGIN — and
  raises once anything has read or written, which is the state the background
  pass leaves behind.
- **`trigger-autonomous` had no guard**, so each press started another agent
  loop against the same notebook.
- **Thirty-five inline `style` attributes in index.html, and five more inside
  app.js template literals**, all refused by the app's own
  `style-src 'self'` CSP and therefore rendering as no styling at all.

#### Fixed — the interface

- **Every card, field and dialog in the app had no border and no shadow.**
  `border-style` and `shadow-intensity` — two new Settings controls — were
  missing from `APPEARANCE_DEFAULTS`, so `undefined` and `NaN` were written
  into two CSS custom properties on `<html>`. Both are invalid where they are
  *used*, which is an `!important` rule matching `.card`, `input`, `textarea`,
  `select`, `.modal` and `.sidebar`, and the `rgba()` inside `--glass-shadow`.
- **`.glass` erased the background of every `card glass` element** by pointing
  at `--bg-glass`, a token no theme declares. The command palette showed an
  input and a hint floating over the page with no surface behind them.
- **Thirteen further undeclared tokens** (`--card-bg`, `--text`, `--panel`,
  `--shadow-sm/md`, `--border-light`, `--sw-*`, …) across 23 dead declarations,
  now aliased to the real theme-aware tokens.
- **Graph Trace threw a ReferenceError.** It moved from two `<select>`s to
  click-two-notes and left three references to the locals the selects filled.
- **Picking a sketch colour left the eraser armed** — the button was renamed
  and one call kept the old id, swallowed by an optional chain.
- **Tags / Recycle bin / Activity** lost their markup but kept their click
  handlers; the sidebar shortcuts are back.
- `applyThemeChoice(undefined)` stamped `data-theme="undefined"` onto `<html>`.

#### Added — tests and lints

46 tests across `test_whiteboard.py`, `test_autonomous.py` and
`test_antigravity_regressions.py`; 28 of the 32 applicable ones fail against
the original branch. Four lints, each closing a gap where nothing was looking:
every appearance setting has a default; no token is used undeclared without a
fallback; the inline-style ban covers app.js; and the dated search tests own
their own clock.


### Fixed — agent robustness pass

- **A skill/plan step now hands the next step the actual notes and
  documents it touched, not just its own prose summary.** Reported as the
  agent "losing the plot half way through a job": a step's own narration
  ("tagged the relevant notes") was all the next step ever saw, so a later
  step needing "those notes" had nothing to act on but a sentence.
  `skill_runner._step_answer` now appends the real ids from the step's own
  `change` events.
- **A skill step that created a document could produce a change whose
  `note_id` was actually that document's id.** `agent.py` read every
  write tool's result `"id"` field and called it a note id unconditionally;
  `create_document`'s `"id"` is a document's. The chat UI's existing View
  button (§21/§22) would then navigate to the wrong note, or nowhere.
  `agent._change_note_id`/`_change_document_id` now resolve each tool's id
  from the field it actually uses.

### Added — §37G, §37I, §37K

- **A document importer.** `markitdown` had been an installable extra with
  nothing calling it since it was added; Settings → Import & export now has
  an "Import a document" button (PDF, Word, slides) alongside the existing
  markdown importer. A converted file with more than one top-level heading
  becomes one note per heading — a deck or a document with real chapters —
  otherwise the whole thing is one note, capped at 25 notes per upload.
- **The sketch pad accepts a background image.** An "🖼️ Add image" button
  draws a chosen photo onto its own canvas layer beneath the pen strokes, so
  drawing over a screenshot or a photo works the way annotating one would be
  expected to. The Eraser now clears pixels to transparent rather than
  painting white, so erasing a stroke reveals the image underneath instead of
  punching a white hole through it.
- **`compress_chat`, an agent tool.** The agent can now ask to compress the
  older part of a long conversation — `POST /chat/compress`'s summarising
  logic, reused rather than duplicated — but the turn still ends on a review
  card the user approves before it replaces anything, the same human-gated
  flow the manual Compress button already used. Deciding *not* to let the
  agent auto-apply its own summary was the point: a summary nobody can
  correct is one they have to trust blindly.
- **A handful of emoji were missing their colour variation selector**
  (⚡️ ✖️ ▶️ ☑️ ⚠️), rendering as thin text-style glyphs on some platforms next
  to fully-qualified emoji in the same row — the same bug one of them was
  already fixed for once, audited across the rest of the frontend.

### Fixed — a second round of reported UI bugs

- **Quick sketch's Close button darkened the background instead of closing.**
  `#sketch-overlay` sat at `z-index: 60`, the toast/popup tier; the "close
  without saving?" confirm dialog is a `.modal-overlay` at `z-index: 55` and
  painted behind it. Lowered to 55, matching every other modal.
  `#improve-overlay` had the identical latent bug and is fixed alongside it.
- **Dropdown arrows clashed with option text app-wide.** The shared
  `input`/`select` rule gave equal padding on both sides, with nothing
  reserved for the browser's own arrow. Every `<select>` now gets a painted
  chevron in reserved padding, not just the chat dock's.
- **The notes-list toolbar's controls were four different heights.** Same fix
  as the Library toolbar: one declared `--control-h` for the filter box, the
  sort select and both buttons.
- **The category sidebar's ✎/🗑 buttons overlapped the note count** instead of
  replacing it — `background: inherit` was meant to hide the count underneath
  but a glass card is never fully opaque. The count now fades out exactly
  when the actions fade in.
- **A stale login token produced a toast storm before the lock screen.**
  Every parallel bootstrap request hitting the same 401 toasted its own
  "Couldn't load X: Locked" on top of the lock screen that had already,
  correctly, explained the one real state. The 401 now carries a marker the
  bootstrap loop checks before toasting.
- **First load now defaults to the Dashboard**, not Notes. Only the fallback
  changed — a returning visit still opens on whichever tab was last active.

### Roadmap

- §37 triages a longer list of reported work (chat dock density, a
  resizable/refined web panel, a UI zoom setting, the graph toolbar, sketch
  image/document upload, llama.cpp wiring, chat compression as an agent tool,
  a real Timeline fix, emoji rendering) in priority order, and corrects three
  stale claims in the roadmap's own top-level priority sections — including
  "the Library tab" listed as an open Tier 3 item after it had been built and
  partly deleted.

### Removed — the three panels the Library replaced (roadmap §36G)

**The first surface this project has taken away rather than added.** The Notes
sidebar's 🗑, 📜 and 🏷 buttons opened the Library, but `#bin-panel`,
`#activity-panel` and `#tags-panel` were still in the markup and still
rendered, so each of those three things had two implementations — and the
bin's two could disagree about what was in it, because each fetched its own
list. Gone with them: `renderBin`, `renderActivity`, `renderTags`, `showPanel`,
the `#bin-empty` handler and `entryItem`'s `options.bin` branch.

- **Reading a binned note in full** is what had to exist first, and is the only
  reason the bin panel had outlived its chip: a Library card shows a preview,
  which is the wrong thing to decide "restore or delete for good?" from. A
  Library card now opens a read-only reader with the note's own markdown,
  Restore, and Delete for good.
- `GET /entries/{id}?deleted=true` reaches into the bin when the caller asks.
  An ordinary read still 404s on a binned note, and reading one does **not**
  count towards "most accessed".
- "Kept for N days" moved to the Library's bin bar. It was the one thing the
  panel said that the Library did not.

### Added

- **Embedding models you can see and remove** (Settings → Optional extras).
  Which models are on this machine, their real size on disk, where the cache
  is, and download / re-download / remove. Answers a question the logs made
  look alarming: the model is fetched **once** — the HuggingFace requests on
  every start are checking the copy you already have.
- **A 🧭 Plan button in the chat.** The `make_plan` tool has existed since
  §35K and the only way to reach it was to hope the model chose it. An action
  rather than a toggle: planning costs a round-trip, and "plan this one" is a
  decision about the message in the box.
- **SearXNG can start with the app** (Settings → Web search, off by default).
  Reported as web search "disabling itself" — it was the container going away
  after a reboot, and every search after that fell through to a rate-limited
  DuckDuckGo.
- **The dashboard's launcher is three labelled groups** — Start something, Jump
  to, Run a skill — instead of one grid of seven identical chips doing three
  different jobs. The Library, the Timeline and the command palette are
  reachable from it at last.
- **Optional extras that nothing calls yet are greyed out** and refused
  server-side, with the reason on the card. `markitdown` and
  `llama-cpp-python` install a library the app never imports.

### Changed

- **Web search opens as a column beside the conversation**, not a drawer inside
  the composer dock. Inside the dock it had to be capped at `min(38vh, 20rem)`
  — a search box, a results list and a whole web page in 20rem — reported as
  *"squashed ugly … what it is right now isn't working"*. As a column it needs
  no cap at all, and the reader takes the column over rather than sharing it.
- **The dock's controls are one visual family**: one corner radius, one border,
  one hover, and selects that give up the platform's chrome. A toggle that is
  on now says so with the accent.
- **Switches instead of checkboxes** wherever a checkbox means on-or-off.
  Radios keep `accent-color` — one-of-several is not on-or-off — and
  checkboxes in a *list* stay ticks.
- The **Rediscover** widget renders markdown instead of showing `## Schedule`
  and `**bold**` spelled out.
- The **logs screen** fills its pane instead of stopping at 46vh.

### Fixed

- **The chat dock drew outside its own card.** Measured at 1849×700 with a
  hand-dragged composer: the dock's box ended at y=614 and the composer at
  y=814, with Send below the window. A dragged height is now trimmed to the
  room the card has — measured, not guessed — and the *preference* is never
  rewritten, so the box comes back when there is room.
- **Starting a skill from the dashboard didn't take you to it.** The run began
  and streamed into a tab nobody was looking at.
- **Every sticky sidebar was 22px too tall.** Three rules wrote the same
  `calc` by hand and all three left out the page's bottom padding, so each
  sidebar ended that far under the status bar. Reported twice in one day, for
  two different sidebars, because it was never one sidebar's bug.
- **The graph drew outside its card** when the legend wrapped: a `22rem` floor
  under the map plus a legend as tall as the notebook has categories is more
  than a short window has.
- **The settings search box** was drawn under the nav's scrollbar.
- A second `py/polynomial-redos` in `search/query.py` (CodeQL, high). A
  character class with `*` next to an anchor is the shape to avoid; the linear
  replacement is again the more readable one.

### Fixed — long jobs finish, or say where they stopped (roadmap §35K)

Two reports, one subject: *"the agent struggles with long tasks like skills
then cuts out half way through and has to restart, or it hits a limit for tool
calls which has happened quite a bit."*

- **Rounds are earned now, not granted.** The cap counted rounds, which cannot
  tell a model doing eight useful things from a model doing the same thing
  eight times — and "tag these eight notes" is a search, a read and eight
  writes. A round that makes a successful call it has not already made buys
  another round, up to a ceiling. A model looping on one call earns nothing and
  still stops where it always did.
- **A step that ran out of rounds is no longer ticked off as done.** The runner
  could only see that the step's turn produced text, and "I couldn't finish
  step 1" is text — so a step cut off mid-job was marked ✓ and the next one ran
  on top of half-finished work. It is marked stalled, the run stops there, and
  the result says which step it stopped on.
- **Resume from step N.** A run that stopped picks up where it stopped instead
  of being restarted over notes it has already changed. A turn that ran out of
  rounds gets a **Continue** button, rather than a paragraph asking you to type
  "carry on".

### Added — the agent can plan a big job and work through it (roadmap §35K)

Reported: *"I will say fix my categories and it will only merge two categories
and leave it at that, ignoring the rest."*

A model given one broad instruction does the first part and reports success.
Skills already solved this — each step is its own turn — but only for a job you
had saved as a skill. Now the agent can call **`make_plan`**: it writes 2–6
steps, its turn ends, and the same runner works through them one at a time,
ticking each off and listing what changed with an Undo on each.

A plan is a skill nobody saved, so it looks and behaves exactly like a skill
run. A plan that is too long is refused rather than trimmed, because silently
dropping the end of the job is the failure this exists to prevent.

### Changed — the chat controls moved down to the chat box (roadmap §36B)

Asked for directly: *"moving the majority of the ui controls like the
chat/agent pull, web search and stuff to the bottom bar with the chat input."*

Chat/Agent, Web, answer length, persona, the skill picker and attached notes
now sit in a dock with the message box, so you set them as you write instead of
scrolling back to the top of a long conversation. The chat header keeps what is
about the conversation itself — its name, what it has cost, and Export. The web
and persona panels moved down with the buttons that open them.

### Added — compress a long conversation (roadmap §35I)

Asked for directly: *"there should be a tool as well as a manual command or
something to be able to compress chat context on longer chats so the AI can
better continue."*

**🗜 Compress** in the chat header summarises the earlier messages, shows you
the summary to read and edit, and then sends that in place of them. What it
fixes is not what it sounds like: a long chat never overflowed the model's
window — the oldest messages were quietly dropped to make room — so the model
was forgetting the start of the conversation and re-asking things you had told
it. A summary keeps the gist of ten messages for the price of one.

Nothing is deleted. Every message stays in the conversation and in the saved
transcript; only what the model is *sent* changes, and one Undo puts it back.

### Changed — the chat's controls are one strip, and its header has two levels

The dock under the chat was three stacked bands — skills, controls, then the
message box — which is most of the height of a short conversation. It is one
line now: skills · what the AI may use · how it answers, with everything the
same height so it reads as a single strip. The skill's description moved into
the picker's tooltip, where the steps and tools it uses already were.

The chat header shows the conversation's name as a heading with its token count
and compression state as quiet metadata beneath, instead of a row of things
that all looked like buttons.

### Fixed — the desktop app could keep running an old build

If a button you were told was fixed is still broken, this is why. The frontend
was served with no `Cache-Control` header at all, which lets a cache reuse it
without checking — and the desktop shell has no reload button, its own on-disk
cache, and restarts the process without clearing it. After an update it could
go on running the previous `app.js` indefinitely. The files are now served
`no-cache`, so every start checks for a newer build (and gets a 304 when there
isn't one).

The recycle bin's **Empty now** was the report that led here. It was driven end
to end in a real browser against this server: the confirm dialog opens, the
notes go, the bin comes back empty. The fix has been in the code since §35F —
what was missing was any guarantee you were running it.

### Fixed — reminders were polled twice a minute, not once

A rewrite left the previous poller's timer behind. Both timers ran the new
poller, so the app asked the server for reminders twice as often as intended,
and two polls landing together could announce the same reminder twice.

### Fixed — all seven tabs stay readable

When the tab strip cannot fit beside the app name and the header buttons it now
takes a row of its own, instead of scrolling with "Dashboard" clipped against
the left edge.

### Fixed — the Reminders tab is no longer faded at the edge

Reported: *"the reminders tab in the top bar is partially faded out on the
right."* The tab strip's fade meant "this bar scrolls" rather than "there is
more that way", so the last tab stayed dimmed with nothing hidden behind it.
Each edge now fades only when there is something beyond it, the fade is a fixed
width rather than a share of the bar, and choosing a tab scrolls it into view.

### Added — any OpenAI-compatible backend (roadmap §6)

The headline ask was "support LM Studio". What got built is the **dialect**,
not the product: LM Studio serves the OpenAI API on `localhost:1234/v1`, and so
do llama.cpp's server, Jan, vLLM, and Ollama's own `/v1` surface. One provider
gets all of them, and the only thing that differs between them is an address.

Pick it in **Settings → Models → Model backend**. It applies immediately — no
restart, nothing to put in `.env` — and the setting is saved whether or not the
server is answering yet, because "set the address, then start the server" is
the normal order to do it in.

- **`ai/provider.py` is the new seam.** Everything that was never actually
  about Ollama moved there and is now shared: the think-tag splitter, the
  tool-text gate and the prose-tool-call recovery, the error classes, the
  context ceiling, the neutral `{context_tokens, max_output_tokens}` budget.
  They were *moved*, not copied — a test asserts they are gone from the old
  file, because two copies of a tool-call gate that drift apart is exactly the
  bug this refactor exists to prevent.

- **`OllamaError` is still the error every route catches**, because it is now
  an alias for the neutral `ProviderError` rather than a sibling of it. A new
  parent class would have read as tidier and quietly stopped a dozen existing
  `except OllamaError` handlers firing for the second provider.

- **Streamed tool calls arrive in fragments keyed by an index**, which has no
  Ollama equivalent: arguments come through as partial JSON spread over many
  chunks, and two concurrent calls interleave on the wire. Folding them by
  arrival order instead of by index produces one unparseable blob the moment a
  model asks for two things at once — which small models do constantly.

- **The window a server *loaded* beats the window a model *could* hold.** LM
  Studio reports both; a 128k model loaded at 4k will drop the front of the
  prompt — the system prompt, the part telling it that it has tools — if the
  app budgets against the bigger number. Where nothing is reported at all
  (plain llama.cpp), a known-model table answers, and where that doesn't
  either, the app says "unknown" and budgets conservatively rather than
  inventing a number nobody verified.

- **Tool results are addressed by id.** Ollama accepts `{"role": "tool",
  "tool_name": …}`; the OpenAI shape wants a `tool_call_id` matching an id the
  assistant turn issued. The agent keeps writing one dialect and the client
  translates at the boundary — including the case where a model calls the same
  tool twice in one turn, where matching on name alone leaves a call
  unanswered and the server rejects the whole turn.

- **The trap §6 named, closed.** `tests/test_context_budget.py` asserts all
  four Ollama generation paths send an options block; `tests/test_providers.py`
  now asserts the equivalent for the new provider, against the payloads that
  actually went out. A path that omits `max_tokens` is a model running unbounded
  on the backend's defaults — the bug the context-budget work was spent fixing,
  arriving again through a different door.

- Downloading models is an Ollama capability, so the suggested-downloads panel
  hides itself on the other backends rather than offering a button that cannot
  work, and the status line names whichever backend actually answered instead
  of telling an LM Studio user to go and install Ollama.

### Added — finished background tasks, and a way to quit

**Settings → Background tasks now shows what stopped, not only what is
running.** The old rule was that a finished job isn't a task and a screen that
accumulates them is a log — tidy, and wrong in the one way that matters: a job
that *fails* disappeared at the moment it became interesting. A re-index that
died halfway left exactly the same empty list as one that finished, and the
reason existed only in the log console, a different screen you have to know to
open. Endings are now recorded with their outcome and reason: in memory,
bounded to the last 40, newest first. Cancelling is reported as *cancelled*
rather than failed — a user's own decision in red is how people learn to ignore
red.

**A Quit button** stops the app and its server properly. Until now the ways out
were Ctrl+C in a window the launcher hides, or closing the tab and leaving the
server running — which is why a second start could find its port taken. It is a
POST behind the unlock gate (a GET would be reachable from a link in another
tab), it replies before it signals, and it uses SIGINT rather than a hard exit
so uvicorn's normal shutdown runs and the SearXNG subprocess is torn down by
the code that knows how.

### Changed — many more suggested models, sorted by what your machine can run

Three chat models became twelve, in three tiers — runs-on-anything, 8 GB, and
a mixture-of-experts tier for 16 GB and up — in Settings → Models and in the
README, on the current Gemma 4 and Qwen 3.5 families.

The MoE tier is the one worth explaining rather than just listing:
`gemma4:26b-a4b` holds 26B of weights but computes with 4B of them at a time,
so it downloads like a big model and answers at roughly the speed of a small
one. Judged on download size alone nobody with 16 GB would try it, and it is
the best answer for that machine.

**Sorted smallest-first rather than best-first**, which is the ordering that
matters: someone reading the list is choosing against hardware they already
own, and a quality-sorted list puts the model they can't run at the top and the
one they should start with out of sight. Each says what it is *for* rather than
how good it is, and the README points at the new "Can use tools" row for agent
work — read from the model rather than guessed.

### Added — five notebook-audit skills, and taking a link back out

Asked for: *"a skill that can do a full audit and clean up of my notebook —
linking notes, removing inaccurate links, analysing categories and tags,
retagging, changing categories, moving notes, combining duplicates."*

Built as **five skills rather than one**, and not for tidiness: a skill runs one
step per turn and holds at most ten steps, so a single "audit everything" skill
would either stop half-finished or have steps so broad a 3B model can't tell
whether it has done them. Each job also wants a different toolbox, and the
allowlist is what keeps a run cheap and safe.

- **🩺 Notebook health check** — the audit. Read-only *by construction*: it is
  offered no tool that can write, so a model that ignores "change nothing"
  still can't. Finishes by naming which clean-up skill fixes each problem.
- **🏷 Clean up my tags** — merges plurals, spellings and synonyms via
  `rename_tag`, then removes tags that don't match what a note says.
- **🗂 Reorganise my categories** — proposes a structure first, then creates,
  renames, merges and moves notes into it. `delete_category` is deliberately
  absent: it's destructive, so it would stop a bulk run for a confirm card, and
  merging keeps the notes together rather than scattering them.
- **🔗 Fix my links** — removes connections that don't hold up and adds ones
  that should exist.
- **🧬 Find notes worth combining** — reports the merged note it *would* write
  and links the group. Deciding what to lose isn't a judgement to hand a model
  across a whole notebook.

**`unlink_notes`** is the tool that made the fourth possible. Its absence had a
specific cost: an audit could add a connection and never correct one, so a wrong
link was permanent from inside the app. It is a write but *not* destructive —
no writing is lost, both notes survive, and the result carries the `link_notes`
call that puts it back — because a confirm card on every correction in a tidy-up
run is how people learn to click through confirm cards. (Removing a link by hand
already worked: the `×` on a link chip in Notes.)

### Changed — the graph tool costs half what it did

Asked for: *"the knowledge graph needs to be very solid and token efficient."*
It wasn't. Twelve neighbours came back as full `_note_summary` rows — 200-char
previews, ISO timestamps, `pinned`, `truncated`, and a null `via` on every
one-hop result — **~1,230 tokens for one call**, a third of a 4k window before
the question or the notes.

A graph walk's job is to say *what connects to what*; reading one in full is
`get_note`'s job. Rows now carry an id, a 90-character preview, the category,
how it connects and how far — with tags and `via` omitted when empty rather than
sent as null. **633 tokens**, and a test holds the worst case under 800.

### Changed — skills the model can find, and a budget guard retired

A skill was findable only by the person who remembered writing it. `when_to_use`
is a field now — *when* to reach for a skill, as opposed to what it is — and
`list_skills` reports it along with `step_count` and `changes_notes`, so a skill
that alters the notebook reads differently from one that only summarises. The
note to the model also says plainly that it cannot start a skill itself, because
a model that believes it can will narrate having done so.

**`PROMPT_BUDGET_CHARS` is retired**, on its own instructions. Its comment said
to retire it if it ever needed raising a third time for a tool rather than for
prose — and the third time came in the same session, for one added argument on
`save_skill`. It weighed the *whole* tool registry, and no turn has sent the
whole registry since `within_budget` started fitting the schemas to the model's
reported window. A guard that must be raised every time the app legitimately
grows is not a guard; it is a chore that teaches people to edit the number.

Two assertions replace it, each measuring something real: `PROSE_BUDGET_CHARS`
covers the persona and TOOLS_GUIDE, which nothing trims and which are sent
whole to a 3B model and a 70B one alike; and the existing post-trim test covers
what actually reaches a 4,096-token model. The registry is capped by the
model's real window, per turn, by code that is tested.

### Added — the graph is walkable by the AI (roadmap §9)

Asked directly: *"is the graph an actual knowledge graph? I want it to be one
for the AI to have easily usable and accessible context."*

It was half of one. The edges were real and persisted — explicit links, reply
threads, shared tags — and the graph *view* has drawn them as typed edges since
it was built. What the agent could see was `get_note`'s `links` field: a bare
list of note ids, with no indication of what any of them meant, one note per
tool call. It could add connections and never follow them.

`related_notes` walks the neighbourhood breadth-first to depth 2, capped at 12
notes, and **every result says how it connects** — "linked", "thread: this is a
reply to it", "shares #recipes" — plus how many hops out and which note it hung
off. The typing is the point: "you linked these" and "these share a tag" are
different strengths of evidence, and a flat list of ids hides that. Sharing a
*category* is deliberately not a connection, since nearly every note shares one.

**Potential connections too**, on request: `include_suggestions` adds notes that
*read* alike but were never linked. They come back in their own list, labelled
"NOT linked yet", with an instruction to say so — because the one way this could
mislead is a guess repeated to the user as a fact. Off by default, since a
similarity sweep costs a comparison per note.

### Security — the AI is locked to this machine by default

The backend address is now *refused* if it isn't on this computer or your own
network, rather than allowed with a warning. "100% offline, on your machine"
should be a promise the app keeps, not one it reminds you that you are breaking.

Enforced in two places, and the second is the one that matters:
`preferences.json` is a plain file, and it is what a restored backup or a copied
config brings with it — so checking only at the endpoint would let an address
that never passed through it be used anyway, silently, on every turn. When the
saved address is refused the app falls back to the local default and logs why,
rather than refusing to start: it has to open so the setting can be fixed from
inside it.

Unlocking is a visible switch in Settings → Models, for anyone who genuinely
wants a hosted API.

### Fixed — "'timeout' is not recognized" on Windows

Reported in use, and real. `start.bat` waited three seconds before opening the
browser with `timeout /t 3`, and `timeout` is `System32\timeout.exe` — an
external program, not a `cmd` builtin. On any machine whose `PATH` has lost
System32 it fails outright, and it also refuses to run when its input is
redirected. It now waits with the virtual environment's own Python, which the
script has already created and checked at an absolute path, so it needs nothing
on `PATH` at all.

### Added — peek, colour schemes, and saving a look (roadmap §33)

Three appearance additions, the first two taken from odysseus.

- **Peek.** A checkbox in the Settings title bar fades the panel so a colour
  change can be seen on the page behind it. The technique is the part worth
  copying: the fade is `color-mix` on the *background*, never element
  `opacity` — opacity fades the swatches and the controls too, which makes the
  thing you are trying to judge harder to see rather than easier. It clears
  itself on close and when you leave Appearance, because a panel left
  semi-transparent on the Logs screen reads as a rendering bug.

- **Build a scheme from one colour.** Picking an accent is easy; picking a page
  background that *goes* with it is the part people give up on. Choose a colour
  and a relationship — monochromatic, analogous, complementary, triadic — and
  the two are worked out together: the hue rotates by the amount that
  relationship names, the saturation drops hard (a background carrying the
  accent's full saturation is exhausting to read against), and the lightness
  goes to whichever end the *resolved* mode needs, so it is right under
  "System" too.

- **Save the look you built.** Everything the appearance controls write —
  colours, font, spacing, corners, background, the selected theme — saved under
  a name and applied again in one click. Stored server-side with the rest of
  your preferences rather than in the browser: a look built by hand is a thing
  you would be upset to lose to a cleared cache, and in preferences it rides
  along in the daily backup and is there in the desktop window too.

### Added — the agent can ask instead of guessing (roadmap §33)

Told "delete the one about the beans" when there are three, the agent had
exactly one move: pick one and act. A confident wrong action on someone's
notebook is worse than a question, and the user finds out afterwards.

`ask_user` offers 2-6 options as buttons and **ends the turn** — which is the
feature, not a limitation: the model asked because it does not know what to do
next, so carrying on would mean carrying on with the guess the question exists
to avoid.

- **No state is parked on the server.** The choice is sent as the user's next
  message, so the answer arrives through the ordinary history the model already
  reads. Nothing to expire, nothing lost on a reload, and the exchange saves
  into the conversation like any other.
- **A malformed question is recoverable, not fatal.** A model that offers one
  option, or sends `"yes, no"` as a string instead of a list, has made a fixable
  mistake — the string is parsed, and anything genuinely unusable goes back to
  the model with the reason so the run continues rather than stranding the user.
- **It cannot be run as an ordinary tool.** The handler raises, so a path that
  bypasses the agent loop can't fabricate an answer to a question nobody saw.
- It is offered on every turn, because a request can be ambiguous whatever it
  is about and a keyword rule has nothing to match on. That is only defensible
  while it stays cheap, so the schema is 507 characters and a test holds it
  under 900.

### Added — quick / normal / detailed (roadmap §11)

The prompt side of a turn has been budgeted against the model's real window
since the context work. The **output** side had one number for everything:
`num_predict` was a flat 1,024 whether the question was "when did I write about
beans" or "draft me a summary of the last month". Output tokens are generated
one at a time, so they cost far more wall-clock each than prompt tokens do — a
uniform cap means every short question pays for the possibility of a long
answer.

One picker in the chat toolbar now moves four settings together: the reply cap,
the temperature, the thinking toggle and a length hint in the prompt. They
belong together — capping the reply without telling the model to be brief
truncates it mid-sentence, which reads as a crash rather than as brevity.

- **`normal` is exactly what every turn got before**, and a test says so. It is
  the default, so anything else would mean upgrading silently changed
  everyone's chats.
- **Settings a model can't do are never sent.** Thinking is only ever toggled
  *off*: turning it off on a model with none is a harmless no-op, while turning
  it on where it isn't supported is the request that errors. An unset
  temperature is omitted rather than sent as null — absent means "your default",
  which is what happened before presets existed.
- **The picker is per-turn, the preference is the default.** One quick answer
  doesn't change the setting for every answer after it, but the last choice is
  remembered so someone who works in Quick isn't re-picking it every reload.
- The mode list is served from `GET /chat/modes` rather than duplicated in
  `app.js`, so adding a fourth preset is a change to `ai/presets.py` alone.

### Security — the backend address is the one setting that can leave the machine

Everything else about MemoryMap is local by construction: the server binds to
localhost, the database is a file, nothing phones home. §6 made the chat
backend an address the user types, and the server posts their notes to whatever
it names on every turn. That is a new outbound surface, and it needs the
*opposite* rule from the web reader's.

`websearch._assert_external` refuses anything that isn't public, because it
follows untrusted links and must never probe this machine. A model backend is
supposed to be on localhost or the LAN, so private addresses are the normal
case there and refusing them would break the only thing the setting is for.

- **Refused: non-http(s) schemes, link-local, multicast and unspecified
  addresses.** The one that matters is link-local: `169.254.169.254` is the
  cloud instance-metadata service and the classic credential-theft target, and
  nobody has ever served a language model from it. `::ffff:169.254.169.254` is
  the same address wearing a hat and is refused too.
- **The check order is load-bearing, and getting it wrong is a real hole.**
  Python classes `169.254.0.0/16` as link-local *and* `is_private`, so an
  allow-private rule running first waves the metadata address straight
  through; `::1` is loopback *and* `is_reserved`, so a refuse-reserved rule
  running first rejects the most ordinary backend there is. A test asserts
  both overlaps, so a well-meaning tidy-up of the order fails loudly.
- **A backend on the internet is allowed and said out loud.** Someone who
  deliberately wants a hosted API is entitled to one; what they are not
  entitled to is for it to happen quietly, because the app's headline promise
  is that notes stay on the machine. Settings → Models shows a plain warning
  naming what is being sent where, and it stays until the address changes.
- A name that does not resolve yet is not an error — "set the address, then
  start the server" is the normal order, and a container name resolves only
  once its container is up.

### Security

The roadmap's security tier, worked through end to end. Three of its seven
items turned out to be built already (SQLite WAL mode, the unlock-gate
backoff, and the scrypt KDF behind private notes); all three now have tests,
so the next audit does not have to rediscover them. The other four were real.

- **SearXNG was reachable from the local network when run under Docker.** The
  container was created with `-p 8888:8080`, which publishes on *every*
  interface rather than just this machine — and because Docker installs its
  own firewall rules, a host firewall set to refuse that port never saw the
  packet. SearXNG has no authentication in front of it, so anyone on the same
  network had both a free proxy to the internet and a view of what had been
  searched for. It is now published to `127.0.0.1` only. Port publishing is
  fixed when a container is created, so **a container left behind by an
  earlier version is detected and recreated** rather than started as it was;
  one that cannot be inspected is left alone rather than removed on a guess.
  The from-source path was never affected — it has always set
  `SEARXNG_BIND_ADDRESS=127.0.0.1`.

- **Requests caused by another site's page are refused.** Binding to localhost
  keeps the network out, but not a page open in another browser tab: it can
  have the browser send requests to `http://localhost:8000` on your behalf,
  which is how local dev servers and Ollama itself have been attacked. The API
  now checks the `Origin` (or, failing that, `Referer`) against the host the
  request was actually sent to. Requests carrying neither header still work —
  that is curl, the desktop window, and a shortcut, none of which a browser
  sends an origin for. This closes a window that was widest **before a
  password was set**, when the unlock gate is deliberately open and a
  drive-by `POST /auth/setup` could have claimed a new notebook outright.

- **Sessions expire.** Unlock tokens lived in memory until the app restarted,
  which on a notebook left open for weeks is not a limit. They now expire 12
  hours after last use, and 7 days after being issued however busy they have
  been. Expiry also forgets the private-note key, so an expired session cannot
  leave decrypted notes behind in memory.

- **Every response carries a strict Content-Security-Policy** — no inline
  script or style, no `eval`, and no remote host named anywhere in it. The
  project's existing "no asset from a CDN" rule is what made a policy this
  tight affordable. Alongside it: `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy: no-referrer`, and a `Permissions-Policy`
  disabling geolocation, camera, payment and USB (but deliberately not the
  microphone, which voice capture needs).

### Added

- **The Logs screen is live.** It streams as things happen instead of showing
  whatever was there when you opened it, which is what it was asked to be:
  "like the terminal running in the background, with key errors flagged".
  Alongside that:
  - **Follow** keeps the newest records in view, and pauses the moment you
    scroll up to read something — scrolling back to the bottom resumes it.
  - **Filters** by level (all / warnings / errors), by source, and by text.
    They re-draw what is already on screen rather than refetching, so changing
    one in the middle of an incident cannot lose the records you were reading.
    When a filter hides records it says how many, because "nothing matches"
    and "nothing happened" are different answers.
  - **Tracebacks** fold open under the record they belong to.
  - **Server and browser logs are one list**, tagged by source and ordered by
    time. A browser error and the request that caused it are the same event
    seen from two ends.
  - **Errors that arrive while you are on another screen** show as a count on
    the Logs item in the settings menu.

- **The AI can manage categories, not just use them.** It could already file a
  note into a category but had no way to make one, so asking it to organise
  anything ran into a wall. It now has `create_category`, `rename_category`,
  `merge_categories` and `delete_category` — enough to answer "tidy up my
  duplicate categories" or "file these under a new Recipes category".

  Deleting a category never deletes notes; they're kept and become
  Uncategorised. Merging and deleting ask for your approval before they run,
  because neither can be undone afterwards — nothing records which notes came
  from where. Creating and renaming can be undone, and offer it.

- **Any error in the log can be copied on its own.** Each record has its own
  copy button that takes the traceback with it, and an open traceback has a
  **Copy traceback** button of its own — so getting one error out is a click,
  not a filter-then-select-across-a-scrolling-box. The error count on the Logs
  menu item is clickable and opens the screen already filtered to errors, and
  **Copy all** relabels itself to "Copy 12 shown" whenever a filter is hiding
  something, because copying less than it promised is not something you'd
  discover until you pasted it.

- **A support bundle button** (Settings → Logs). It saves a zip containing the
  log, your settings, app and model status, and how many notes exist — the
  things a bug report needs. Nothing is sent anywhere: the file lands on your
  disk and it is entirely your choice whether to share it.

  Settings are filtered by an **allowlist**, not a denylist. Diagnostic ones go
  in as they are; everything else is described rather than disclosed, so your
  display name appears as `"str, 31 chars"` and never as its value. No note,
  document, chat or reminder content is included at all. The README inside the
  zip says all of this, and suggests skimming the log before sending, since log
  messages can quote things you typed.

- **The results panel says which engine answered, and what that meant.** You
  choose an engine in Settings for a privacy reason, and until now nothing
  reported whether that choice was honoured — under *Automatic* the engine
  that answers is not necessarily the one configured. Searches now report
  "via SearXNG — your own instance, the query stayed on your machine" or
  "via DuckDuckGo — a third party saw this query, but not your notes",
  **including when nothing was found**, which is when it matters most and was
  exactly when the panel used to go quiet. Individual results also name the
  upstream engines SearXNG used to find them: it is a metasearch engine, so
  "via SearXNG" describes where the query was assembled, not who answered it.

- **The log viewer admits when it has forgotten something.** The buffer keeps
  the most recent 500 records and silently discarded the rest, so a busy hour
  and a quiet one looked identical — 500 rows either way, with no way to tell
  whether the top row was the start of the story or the middle of it. It now
  says how many earlier records were dropped and how far back it still
  reaches. Worst in exactly the case the viewer exists for: chasing something
  that keeps failing, where the repetition is what pushed the first occurrence
  out of the window.

- **MemoryMap refuses to start with more than one worker.** Its configuration,
  database handle, log buffer, unlock sessions and SearXNG subprocess are all
  one-per-process; with two workers each silently becomes per-worker, and the
  result is a log showing half of what happened, an unlock that works only
  sometimes, and two workers each believing they own the SearXNG they started.
  None of that fails loudly, so it is refused with an explanation rather than
  warned about. `python -m memorymap` was never able to hit this.

### Changed

- **SearXNG is presented as the recommended way to search**, not "an optional,
  self-hosted search engine" — the one-click install works now, and it needs
  no Docker and no account. The default setting is deliberately still
  *Automatic*, which prefers SearXNG whenever it is running and falls back to
  DuckDuckGo until you have one, so search keeps working on a fresh notebook.
  (*SearXNG only* remains available and still refuses to fall back.)

- **Autocomplete is pinned off in the generated SearXNG settings.** It is the
  one thing in a search UI that leaks without a search being run — a fragment
  of every query goes to a third-party suggestion endpoint as it is typed.
  SearXNG already defaults it off; stating it explicitly means neither a
  hand-edited file nor a changed upstream default can turn it back on.

### Changed

- **The whole prompt is now sized to the model's real context window.** Every
  part of it — the instructions, the tool definitions, your retrieved notes,
  the conversation so far, and the results of anything the AI looks up — used
  to have its own separate limit, and nothing ever added them up. Together they
  came to roughly 11,300 tokens against a window that is commonly 4,096: nearly
  three times too big. When that overflows, the *start* of the prompt is what
  gets discarded, which is the part telling the AI what it can do — so the
  symptom was an assistant that suddenly forgot it had tools, rather than any
  error you could see.

  Each part is now a share of what's actually available, with room kept back
  for the reply. Small models get a tighter, working prompt instead of a broken
  one; large models get **more** than the old limits ever allowed, since those
  were sized for the smallest case and applied to everyone. If notes don't fit,
  the AI is told so it can search for the rest rather than answering as though
  it saw everything.

- **Replies are length-capped, so answers arrive instead of rambling.** Nothing
  bounded the response before. Local models generate one token at a time, so a
  long answer costs far more waiting than a long prompt does.

- **MemoryMap now tells Ollama how much context to allocate.** It previously
  sent no settings at all, so Ollama used its own default — typically 4,096
  tokens — no matter what the model was capable of. Asking for the right window
  is what makes the budgeting above true rather than optimistic. Capped at 8,192
  by default because a larger window costs memory; raise `max_context_tokens`
  in preferences if your machine has room.

- **The AI is given as many tools as its model can actually hold.** The number
  used to be fixed, tuned for a 4,096-token context — which is what Ollama
  falls back to when a model doesn't declare a size, not a fact about any
  particular model. Most current models declare 8k, 32k or far more, and were
  being rationed for no reason; genuinely small ones needed rationing harder
  than one number could express. MemoryMap now asks the model how much room it
  has and fits the tool list to it, keeping the most useful tools when they
  don't all fit and noting in the log what it held back. A 16k model gets
  everything; a 4k model gets a prioritised subset instead of quietly
  overflowing and forgetting it had tools at all.

### Fixed

- **"🎲 Another" in the Rediscover widget often did nothing.** It picked a note
  at random *including the one already on screen*, so a click could land back
  on the same note — 1 in 10 clicks on a ten-note notebook, half of them on
  two notes, and every single one when there was only one note to show. It now
  picks from the others, and says so instead of offering a dead button when
  there's only one note in the notebook.

- **Magic Add put relative reminders out by your whole timezone offset.**
  Reported: *"play league of legends in half an hour"* was scheduled for 10am
  the next day. Two things were wrong.

  The route built your clock as "UTC now, plus your offset" and then labelled
  the result UTC — an aware timestamp claiming `+00:00` while actually holding
  local wall-clock. The AI was told "now is 23:30+00:00" when that `+00:00`
  was a fiction, so when it answered with a timezone of its own (the natural
  thing, having been given one) that answer was trusted as-is and skipped the
  correction. The reminder landed out by exactly your UTC offset — ten hours
  in eastern Australia, which turns half an hour away into 10am tomorrow.
  Anyone on UTC never saw it.

  Separately, *"in half an hour"* was being handed to a 3B model to work out.
  That is arithmetic, and the answer varied with whichever model happened to be
  installed. **"In …" phrases are now resolved by rule before the AI is asked**
  — "in half an hour", "in 20 minutes", "in a couple of hours", "in an hour and
  a half", "in 3 days" and so on — which also means they work **with Ollama
  switched off**, where Magic Add used to refuse outright. Phrases that name a
  time rather than an offset ("at 8pm", "tomorrow morning") still go to the
  model, now inside a timezone frame that is actually true. The time phrase is
  taken out of the reminder text, so it reads "Play league of legends" rather
  than repeating "in half an hour" when it fires.

- **Copy buttons work when the app isn't on localhost.** Every copy in the app
  — a note, an answer, a code block, a log record — used `navigator.clipboard`,
  which browsers only expose in a *secure context*. On `http://localhost` that
  is satisfied, so this looked fine; reach the app at `http://192.168.1.20:8000`
  or through a tunnel and the entire API is `undefined`, and every copy button
  became a no-op that said "couldn't copy". Copying now tries the modern API,
  falls back to the older mechanism that works over plain http, and — if the
  browser refuses both — shows the text in a dialog with it already selected,
  so Ctrl+C still gets it out.

- **Gravity and Spread no longer pretend to work under the tree layouts.**
  Both scale the force simulation, which Tree and Radial tree do not run —
  their positions come from the hierarchy — so the sliders moved, saved their
  value, and changed nothing. They are now disabled and dimmed under those
  layouts, with the reason on hover, and restored when you switch back.

- **Custom CSS works under the new security policy.** Settings → Appearance
  applied your CSS by injecting a `<style>` element, which is precisely what
  the new `Content-Security-Policy` refuses — so the feature would have
  silently stopped working. It now uses an adopted stylesheet, which keeps the
  feature *and* the strict policy; the alternative would have been to permit
  inline styles everywhere, including any injected through note text.

- **Renaming or moving the app folder no longer breaks the launcher.** The
  app is installed into its own `.venv` by absolute path, so a renamed folder
  left the venv pointing at somewhere that no longer exists — and the
  "dependencies already up to date" check, which only watches
  `requirements.txt`, skipped the reinstall that would have fixed it. The
  launch then died with `No module named memorymap`. Both launchers now ask
  the venv whether it can actually import the app, which catches a rename, a
  move, and a half-deleted venv alike.

- **Picking a theme works every time.** A single earlier tweak — one palette,
  one light/dark choice — sat on top of every theme picked afterwards and
  cancelled that part of it, so a theme could appear to do nothing. Choosing a
  theme now clears the manual settings that theme covers, and leaves the ones
  it says nothing about alone.
- **Lagoon and Shallows refined.** Shallows is properly teal rather than
  indigo-tinted, and Lagoon's inset panels and secondary text are no longer
  washed out against their cards.
- **Background tasks shows SearXNG starting**, not just installing. A start
  waits up to 90 seconds for the service to answer — the longest silence in
  the app, and the one thing missing from the screen that exists to explain
  silences.
- **The AI emblem has one home.** It was squeezed into the Notes and Chat
  sidebar headings and absent everywhere else; it now sits in the header next
  to the AI status dot, on screen for every tab.
- **A long note no longer crowds out the rest of your notebook.** Ten notes
  are retrieved so the AI sees ten of them; one note of several pages used to
  fill the prompt on its own. Notes now go in capped, cut with a marker
  telling the AI exactly how to read the rest — which it could already do.
- **A chat's prompt stops moving between rounds.** The clock in the system
  prompt carried microseconds, and that line sits above your notes and the
  conversation so far. Ollama caches the prompt only up to the first
  difference, so every round of every turn re-read the whole thing from
  scratch. It is now to the minute — identical across the rounds of one tool
  loop, which is exactly where the re-reading was costing the most.
- **SearXNG moves to a free port instead of giving up.** Port 8888 is a
  popular number, and "close whatever has it" is advice that assumes you can.
  It now tries 8080, 8081, 8890 and 8899 in turn, and `MEMORYMAP_SEARXNG_PORT`
  picks one yourself. A SearXNG already answering on the wanted port still
  wins over a free one — that is ours from a previous run, and moving would
  start a second copy beside it.
- **The dashboard's widgets no longer go missing on a cold load.** Starting the
  app fetched your notes and rendered the open tab at the same time, so the
  dashboard could draw its brand-new-notebook card over a notebook full of
  notes; switching tabs and back fixed it, which is how it was noticed.

### Added

- **A new document, without leaving the note.** The *Add to document* picker —
  in the capture box and in a note's ⋯ menu — offers **＋ New document…**, so
  a note can go into a document that does not exist yet.
- **The app's icon is the app's icon.** The top bar now shows the favicon, so
  the mark in your browser tab and the mark above the tabs are the same thing.
  The generated emblem stays the hero on the dashboard and appears small and
  animated in the header beside the AI status dot, so it is on screen whatever
  tab you are on.
- **Search operators in the notes filter**: `tag:work`, `cat:recipes`,
  `is:pinned` / `private` / `linked` / `untagged`, `"exact phrase"`, and
  `-exclude`. Plain words now match in any order rather than as one substring.
  The heading shows "3 of 6" while a filter is active, matched words are
  highlighted in the results, and a ? button explains the syntax. All of it
  works with no AI running.
- **Saved filters**: name a filter and keep it as a chip above the notes list.
  Stored as a preference, so it survives a restart.
- **Private notes**: mark any note private and its text is encrypted at rest
  with AES-GCM. The design is an envelope — a random data key encrypts the
  notes, and your password only encrypts that key — so changing your password
  re-wraps 32 bytes instead of re-encrypting every note, which is where an
  interruption could otherwise lose data. Private notes are kept out of search
  and are never given to the AI, and their embeddings are deleted (a vector
  encodes what a note is about, so keeping one would leak the point). The key
  exists in memory only while the app is unlocked. There is no recovery if you
  forget your password — that is inherent to encryption, not a shortcut here.
- **Documents tab**: a markdown editor for long-form writing, with a live
  preview, autosave, `Ctrl+S`/`B`/`I`, `.md` and PDF export, and AI editing.
  Documents are a separate table from notes on purpose — a note is a captured
  thought, a document is something you sit down and write — so they never
  appear in note search or the graph. AI edits are always shown as a proposal
  to accept or reject, never written straight into the file.
- **Writing room** (Notes tab): write loose thoughts, get a drafted note back,
  then edit the draft or add more thoughts and it folds them in without undoing
  your changes. Starts folded so it doesn't add weight to the Notes tab.
- **Attach notes to a chat message**: a 📎 picker with search and multi-select.
  Attached notes go to the model ahead of retrieval and are flagged as chosen
  by you. Binned notes can't be attached.
- **Rename and delete categories**, from the Notes sidebar. Renaming onto an
  existing name merges the two; deleting keeps the notes and moves them to
  Uncategorised. Neither can lose a note.
- **Back-to-top button** on every tab except the graph, and the Notes panels
  (Activity / Tags / Recycle bin) return to the top when opened.
- **Settings navigation is grouped** — the AI, your notebook, system, getting
  help — instead of eleven flat buttons. Appearance is unchanged.
- **Settings → Background tasks shows everything that's running**, not just
  two of them. It knew about re-indexing and model downloads; the embedding
  model loading at startup (a ~90 MB download the first time) and the SearXNG
  install (several minutes) both ran with nothing on that screen to say so —
  which reads as the app being broken rather than busy. The list now comes
  from the server, with a live step for each job, a progress bar where there
  is a real number to show, and a Quit button only on the jobs that can be
  stopped safely.
- **Notes and documents are joined up.** The capture box has an **Add to
  document** picker, so a note can be attached to what you're writing as you
  save it rather than afterwards. The note then carries a 📄 chip that opens
  that document, and the document lists the notes it draws on, each with a
  detach button. Detaching removes the connection and never the note; binning
  a note takes it out of the document's list on its own. A note you wrote
  before the document existed can be added afterwards, too — **📄 Add to a
  document** in a note's ⋯ menu picks from the documents you have, and the ×
  on the note's 📄 chip detaches it again without going to find the document
  first.
- **The graph has layouts.** A picker for how the notes are arranged: the
  force-directed **web** as before, a **tree** — notebook → category → note,
  reading left to right, with a note's replies branching off the note they
  answer — and a **radial tree**, the same shape wrapped into a circle. Most
  notebooks have far more filing than links, and a force graph of
  mostly-unlinked notes is a cloud of dots; a tree shows the structure that is
  actually there. Your choice is remembered.
- **Both trees are legible at the size of a real notebook.** Reported with a
  photo — "the graph tree and radial are a bit hard to read and aren't neat" —
  of 29 notes squeezed into the panel's height at eighteen pixels a row. The
  tree now gives every note the room a label needs and pans if that makes it
  taller than the panel, zooming out only when the whole thing nearly fits;
  labels sit beside their note and above their branch, joined by elbows rather
  than straight diagonals. The radial sizes its rings from the panel and the
  note count instead of a fixed radius, gives each category a wedge of its own
  so a one-note category is not squeezed against its neighbour, and rings by
  depth — notebook, category, note, reply — so a category that happens to
  contain a thread no longer sits a ring in from its siblings.
- **A Timeline tab.** Opening on days by default. Your notes on a time axis, in bands — one per category
  or tag — with the bucket size you choose, from days to years. A note sits
  where it is *about* when it says so ("the beans need netting next week"
  plots on that week, marked 🕓, with the date it was written on hover) and at
  when it was written otherwise. Click any note to open it.
- **Notes remember what "tomorrow" meant.** A note saying "the deadline is
  next Friday" is correct the day it is written and misleading forever after,
  and nothing recorded which Friday it was. Every note's relative time
  phrases — tomorrow, last week, in three days, next Friday, two months ago —
  are now worked out when it is saved and kept beside it, shown as a small
  chip (`🕓 last week → week of Jul 20`) with the full date on hover. The
  phrase is always shown next to the date, because the resolution is a rule
  rather than a fact and you should be able to disagree with it. The AI gets
  them too, so it can answer questions about a note's own dates instead of
  guessing. It is plain pattern-matching, not an AI feature: it works with
  Ollama off, and it can never stop a note being saved. Private notes are
  excluded, and marking a note private removes anything already stored.

### Changed

- **A message is only offered the tools it plausibly needs.** Every tool is
  described to the model again on every round of every message, and all of
  them together were about three quarters of what it read before reaching
  your question — on a small model, most of the window. A question now
  carries the reading tools; "remind me…" adds the reminder ones; "tidy up my
  notes", which could mean anything, still gets everything. Measured: the
  fixed overhead of a typical question drops from ~3,157 tokens to ~1,439.
  It only decides what is *offered* — a tool is never blocked from running —
  and Settings → Tools can turn it off.
- **Skills are jobs now, not saved prompts.** A skill was a name and a string,
  and clicking one dropped that string into the chat box — which is why asking
  the AI to make one only ever produced another sentence. A skill now carries
  ordered **steps**, an explicit **tool allowlist**, and declared **inputs**
  it asks you for before it runs, and `save_skill` accepts all of them so the
  AI can write a real one. Skills with only a prompt keep working exactly as
  before.
  - **Naming a skill's tools makes it work on a small model.** Only those
    tools are offered for the run — 1,963 characters of schema for "Auto-tag
    my notes" instead of the full registry's 10,215 — and calling anything
    outside the list is refused rather than merely discouraged. That leaves
    far more of a 4k context window for the actual question.
  - **Running one is a job, not a paragraph.** Each step is its own turn, so
    the steps tick off as they finish, and a step that fails is named with the
    reason instead of the run quietly doing less than it claimed.
  - **A run ends in what changed** — every note it wrote, with a button to see
    it and a button to put it back. Nothing is taken on trust from the model's
    own account of what it did.
  - **A skill asks for what it needs first.** "Draft an email" has a box for
    who it's to and what it's about, instead of spending a chat round asking.
  - The ten built-in skills moved out of the frontend and are served by the
    API, so the AI can list and run them too — it used to answer "you have no
    skills" while ten were on screen.

### Fixed

- **SearXNG couldn't be imported on Windows at all.** With the install
  finally finishing, the start died on `ModuleNotFoundError: No module named
  'pwd'` — a POSIX-only module SearXNG imports at the top of one file. It is
  the only such import in the whole package, and the only thing it's used for
  is naming the current user in an error message that can't be reached without
  a Valkey database. A stand-in module now goes into SearXNG's own virtualenv
  where the platform hasn't got one.
- **The install said it had worked when it hadn't.** Its final check was
  `import searx`, which passed on Windows while the thing that actually runs —
  `searx.webapp` — could not be imported. It checks that now, using the same
  settings a real start uses.
- **The chat box couldn't grow.** It was a one-line `<input>`, so a
  three-sentence question scrolled sideways inside a box the width of the chat
  pane and you couldn't read what you'd written before sending it. It now
  grows with the text up to a cap. Enter still sends; **Shift+Enter** writes a
  newline, which a single-line box couldn't offer at all.
- **One long note filled the whole list.** Notes past about ten lines are now
  clamped with a fade and a "Show more", so the list stays a list. Only notes
  that genuinely overflow get one — a note you can already read in full never
  grows a button.
- **The app was naming the wrong embedding model.** Settings → Models said
  "Built-in (all-MiniLM)" — it had been `BAAI/bge-small-en-v1.5` for two
  changes, and the only way to find out was to watch it download from Hugging
  Face in the log. Reported by someone who did exactly that. The name now
  comes from the running service rather than a string in the interface, so it
  cannot drift again, and the built-in option says it downloads on first use
  instead of claiming it needs no download.
- **The SearXNG install had no progress and no output**, so a working install
  and a hung one looked identical for several minutes. It now shows which of
  five stages it is in, a bar that moves (the download reports real bytes),
  and the lines pip is printing as it prints them — which is what actually
  tells you it is alive while a bar sits still. Both appear on the Web search
  screen and in Settings → Background tasks.
- **A finished install left "Installing SearXNG…" on screen** under a badge
  that said "Stopped" — reported with a photo, and the install had in fact
  succeeded. That line now always says something current.
- **SearXNG now installs, starts and answers.** Five separate bugs, none of
  them in its log, because three of them happened before it wrote a line.
  - *`git clone` can never work on Windows.* Four files in the SearXNG
    repository have a colon in the name (`…/searxng.conf:socket`), which
    Windows refuses — git fetches everything and then dies at the checkout,
    leaving a half-written folder behind. `pip install <tarball-url>` unpacks
    the same files, so the no-git path was broken there too. The archive is
    now downloaded and unpacked by the app, skipping the handful of members a
    filesystem can't hold (nginx/uwsgi deployment templates) and any that
    would escape the folder. git is no longer used.
  - *`pip install -e .` can never work anywhere.* SearXNG's setup.py imports
    `searx`, which imports `msgspec`, which pip's isolated build environment
    does not have. The requirements go in first now and the package is built
    with `--no-build-isolation`, as SearXNG's own tooling does.
  - *A plugin killed it at boot.* `tracker_url_remover` downloads a rules file
    from clearurls.xyz during startup and doesn't catch a failure, so an
    offline or proxied machine lost the process before it bound the port. The
    generated settings turn it off; MemoryMap strips tracking parameters
    itself.
- **…and two Windows-only bugs, both a POSIX idiom that means something else
  on Windows.**
  - *"…\data\searxng\src does not appear to be a Python project: neither
    'setup.py' nor 'pyproject.toml' found."* The installer skipped the
    download whenever that folder existed, then handed it to pip. Reinstalling
    made it permanent rather than fixing it: the wipe used
    `rmtree(ignore_errors=True)`, git marks `.git/objects` read-only, Windows
    enforces that — so the writable files went, the folder stayed, and the
    wipe reported success. Now the question asked is whether the folder
    *contains a project*, the wipe clears the read-only bit (moving the tree
    aside if it still can't delete it) and says what survived, and an install
    isn't called done until `import searx` works in the new virtualenv.
  - *"SearXNG started but never answered."* The liveness check was
    `os.kill(pid, 0)` — on Windows any signal but CTRL_C/CTRL_BREAK goes to
    `TerminateProcess`, so checking whether the instance was alive killed it.
    The Web search screen polls status every three seconds, so it was killed
    seconds after every start.
- **One wide code block widened the whole page.** "Ask about this" renders a
  fetched page into the chat, and a wide code block, a nine-column table or a
  long URL pushed the layout sideways: a horizontal scrollbar, and text that
  read as scaled up because every paragraph had been stretched to the width of
  the widest thing on screen. Measured at 1280px, the document was 3425px
  wide. The cause was CSS automatic minimum sizing in two places — a `1fr`
  grid track and a flex item with `min-width: auto` — which is what stopped
  the `overflow-x: auto` already set on code blocks and tables from taking
  effect. Now 0 overflow across six tabs at four widths.
- **The top bar overflowed itself by up to 215px.** The block meant to let the
  tab strip scroll declared `flex`, but so did the base rule ~70 lines later
  at equal specificity, so the tabs stayed rigid at 579px and the header
  controls were squeezed to 76px around 201px of buttons — Settings, the lock
  and the theme toggle pushed out of the window. Worst in the desktop shell,
  whose 1200x800 window lands at 800–960 CSS pixels on a scaled display. The
  documented degradation ladder (wordmark → status pill → tab padding → tabs
  scroll) now actually happens, and the scroll fade is measured rather than
  guessed from a breakpoint.
- **Accent swatches did nothing while any theme was selected.** `[data-accent]`
  rules sit near the top of the stylesheet and `[data-palette]` rules near the
  bottom, both the same specificity — so the palette won on source order, and
  every theme selects a palette. An explicit pick is now an inline custom
  property, which beats both. Clearing an accent also left it applied, because
  `applyAppearance` re-applied every setting except that one.
- **The search-engine radios reset themselves.** Picking one saves nothing —
  "Apply & re-index" does — and the guard against the status poll was a focus
  check, so the moment focus moved the poll put the saved backend back and the
  setting looked stuck.
- **Editing an answer reverted when the chat was reopened.** The edit updated
  the message text, but a reopened chat replays the saved step timeline, which
  kept its own copy of the model's original wording.
- **Sketches couldn't be opened from the graph.** A sketch is a note plus a
  PNG, so its node showed the caption and nothing else — the drawing was
  unreachable from the map. Image attachments now preview in the popup and
  open full size on click.
- **"New note" on the dashboard did nothing** unless you had left the Notes tab
  on the capture section. Focusing an element inside a hidden sub-tab silently
  fails; an audit of every quick link from all three starting sections found
  this one and ten feature-catalog entries with the same fault.
- **Uploads failed with a 500** if the uploads folder had gone missing. For a
  sketch that lost the drawing while keeping the caption.
- **`bg-motion` had two conflicting defaults** in `APPEARANCE_DEFAULTS` after
  two sessions fixed the same blank-picker bug independently; the later one
  silently won, so the documented default was not the one anyone got.
- **Web search reported all its failures the same way.** No egress, a
  rate-limit challenge page, and a genuine no-results page all arrived as an
  empty list, which is why this was repeatedly investigated as a parser bug.
  Status and body length are now logged for every search (never the query),
  and the first two are named for what they are.
- **`pytest` didn't work in a fresh clone** without an editable install, though
  the README and CONTRIBUTING both say to run exactly that.
- **Keyword search only matched contiguous substrings.** "bread proving" found
  a note that "proving bread" did not — word order was something you had to
  guess. It now matches every word in any order across content and tags, and
  ranks results (exact phrase, then tags, then the opening of a note) rather
  than listing them newest-first. With no AI running this is the whole of
  search, not a fallback.
- **AI-only buttons looked usable with no AI.** Improve, Magic Add, Draft it
  and AI edit stayed enabled, so you'd type a note, press the button, wait, and
  get an apology. They're disabled with the reason in the tooltip. Save, Ask,
  search, tags, categories, reminders, documents and the graph are unaffected —
  they work fully without AI.
- **The status pill announced faults instead of capability.** "search AI
  unavailable — see Settings → Logs" pointed at a log viewer; it now reads
  "word search on · AI search unavailable" with the detail in the tooltip.
- **The command palette had gone stale** — it knew nothing about Documents, the
  writing room, or the newer settings screens.
- **The chat answered "hey" with a summary of your notebook.** Every message
  was retrieved-for and then answered "using ONLY the notes provided"; on an
  empty notebook a greeting got "I couldn't find any saved notes matching that
  question". Messages are now routed first, and small talk skips retrieval and
  the agent entirely. Anything the router isn't sure about falls through to the
  previous behaviour.
- **Message metadata was missing whenever tools were on** (the default). The
  agent path never read the token counts out of Ollama's response, so the line
  under each answer lost everything but the model name and elapsed time.
- **Editing a chat message didn't edit anything** — it copied the text into the
  input box and left the original exchange in place, so a one-word correction
  left the typo, the answer to the typo, and the fix all in the thread. The
  bubble is now the editor, and saving clears the replies that followed.
- **Only one of the five background-art styles ever ran.** The dropdown's
  values didn't match the implemented styles, the chosen style was read from a
  key nothing writes, and the draw loop called a method on an undefined
  variable. Two styles had no way to be selected at all. The intensity slider
  now scales the art itself, not just its opacity.
- **The Notes sections wouldn't collapse** and showed two chevrons each: two
  implementations of the feature were both live, so every click toggled twice.
- **Reminders landed at the wrong time.** The due field opened at 9am tomorrow
  rather than now, and Magic Add was given the time in UTC, so every relative
  phrase ("tomorrow evening") resolved against the wrong clock.
- **The graph node popup could hang off the bottom of the map** — it was
  positioned before the note loaded, then grew as its chips and buttons
  rendered.
- **Note timestamps were misaligned** from card to card: two `margin-left:auto`
  in one flex row split the free space between them.
- **Jumping to a note looked like nothing happened** — the highlight started
  fading as the scroll began, so it was gone by the time the note arrived.
- **The markdown export navigated the app away** instead of downloading: a
  plain link carries no auth header, so the server's 401 was rendered in place
  of the app.
- Dependency versions are capped, so an upstream major release can no longer
  break a clean install.

### Added

- **Learnability**: a first-run welcome tour (5 slides, re-runnable), a new
  Settings → Help section, and a searchable "Tools & features" directory of
  everything the app can do (reached from the dashboard quick links).
- **Dashboard welcome banner**: an AI-written greeting (`GET
  /insights/greeting`, cached per time-block, with handwritten fallbacks
  whenever the local model is unavailable), a line summarising your notebook,
  a live clock, and one-tap quick actions. The greeting phrase never contains a
  name — the display name is added from preferences. The Reminders tab shows a
  live clock too, so "now" is always visible.
- **One-click launchers**: `start.bat` (Windows) and `start.sh` (macOS/Linux)
  create the virtualenv, install/update dependencies, copy `.env`, and start
  the app. They re-install only when `requirements.txt` changes.
- **Accessibility**: interactive chips are now real buttons (focusable,
  Enter/Space), and the note-card ⋯ menu supports ↑/↓/Home/End/Esc.
- **Reminders**: priority (low/normal/high) and recurring
  (daily/weekly/monthly) fields, priority colour-coding, automatic rescheduling
  when a recurring reminder is completed, and a "Magic Add ✨" box that turns
  natural language into a reminder via `POST /reminders/parse`.
- **Dashboard**: focus-timer widget (presets + custom minutes), activity
  heatmap (`GET /insights/heatmap`), weighted tag cloud
  (`GET /insights/tag-cloud`), a personalised greeting with a `display_name`
  preference, dense grid packing, and a per-widget Wide/Narrow toggle.
- **Appearance**: regrouped into scannable sections, plus a custom accent
  colour, four new accent presets (Sunset, Ocean, Mint, Grape), a custom page
  background, corner-rounding slider (`--radius`), glass blur-strength slider
  (`--glass-blur`), a Spacious density, five background-art styles (Aurora,
  Constellation, Waves, Floating orbs, Mesh gradient), and an advanced
  custom-CSS box.
- **Chat/AI**: an in-chat web-search toggle, per-exchange delete
  (`DELETE /conversations/{id}/turns/{index}`), in-place regenerate
  (`PUT /conversations/{id}/turns/last`) instead of stacking a second answer,
  tool-activity chips that persist across reloads, four more built-in skills,
  and the `get_current_time` + `summarize_notes` tools.
- **Graph**: Gravity/Spread physics sliders, a click-to-edit node popup, a
  Labels toggle, a plain-language stats line, connection-count tooltips, node
  halos, and highlighted "hub" notes. The dashboard constellation gains a
  caption and a category colour key.
- **Notes**: sticky category sidebar, collapsible Capture / Ask / Browse
  section cards with remembered state, and a richer markdown renderer — GFM
  pipe tables, blockquotes, horizontal rules, `####`–`######` headings,
  `~~strikethrough~~`, task-list checkboxes, and bare URLs.

### Fixed

- **Lower chat latency and a smoother typing indicator.** `/chat/stream` now
  flushes a first byte immediately and runs retrieval inside the stream, so the
  UI no longer appears frozen during a cold-start search. Live-markdown
  re-rendering is throttled to cut main-thread jank on long answers, and
  anti-buffering headers were added.
- The dashboard no longer breaks when a widget renderer is synchronous — one
  failing widget can only spoil its own card.
- Settings checkboxes stacked correctly instead of running together (the
  `display: block` rule targeted the wrong container).
- The Appearance "Glass & effects" toggles no longer stack on one line (stale
  `#settings` / `#prefs-panel` selectors that matched nothing).
- A failed startup call no longer stops the rest of the app from loading, and
  an unreachable server fails fast with a clear message instead of hanging.
- `requirements.txt` — two optional extras were written as literal
  `pip install …` lines, which made pip reject the whole file.

### Added

- Repository documentation & tooling pass: `docs/ARCHITECTURE.md` (a full
  project overview), `CONTRIBUTING.md`, `SECURITY.md`, this changelog, GitHub
  issue/PR templates, and a rewritten README.
- CI upgraded to lint with ruff and run the test suite across Python 3.11, 3.12,
  and 3.13, with concurrency-cancellation and manual dispatch.
- CodeQL static security analysis workflow (push / PR / weekly).
- Dependabot config for weekly pip and GitHub Actions updates.

### Added

- **Uninstall Ollama models from the app.** Settings → Models lists installed
  models with their size and a Remove button; the models in use (chat, utility,
  embeddings) are protected. Backed by a new `/models/delete` endpoint.
- **Keyboard-shortcuts cheat-sheet.** Press `?` (or use the command palette) for
  a dialog of all shortcuts.
- **Dashboard: more widgets & cleaner layout.** New "Top tags" and "Recently
  added" widgets; the "Drag widgets" hint now shows only in edit mode; widget
  bodies are height-capped so one tall widget no longer leaves big gaps; and all
  widgets share one consistent internal spacing.
- **Reminders: snooze, edit, presets.** Snooze (+1h / tomorrow), inline edit,
  quick-due presets, group counts, and bidirectional relative times.
- **Editable skills, persona tooltips.** Edit a saved skill in place (rename and
  all), and hover a persona in the chat picker to see what it does.
- **More appearance options.** Nine accent colours, a Font choice
  (System / Serif / Mono), and a Reduce-motion toggle; subtle button press
  feedback throughout.
- **Action skills — skills that actually *do* things.** Skills can now be
  marked "can make changes": running one turns on the AI's tools for that
  message, so it uses them instead of only answering (destructive steps still
  ask first). Two new tool-using built-ins — 🏷 Auto-tag my notes and
  🔗 Link related notes — and a "can make changes" checkbox when you create
  your own. Action skills are marked with a ⚙ in the chip row.
- **Per-note "Re-evaluate with AI".** A ⋯-menu action on every note that
  re-runs the AI to refresh its confidence (and category, unless you filed it
  yourself) and suggests topic tags and links to related notes — each applied
  with a click, inline on the card. Backed by `POST /entries/{id}/reevaluate`
  and a new `librarian.suggest_tags`; every step is best-effort so it still
  works (with empty suggestions) when the AI is offline.
- **Chat enhancements.** Per-message actions revealed on hover — copy any
  message, **edit & resend** your last question, **regenerate** the last answer
  (re-runs it without a duplicate prompt bubble), and read-aloud; **export a
  conversation to Markdown**; role labels on every bubble; and a friendly
  empty-state welcome so the chat page isn't a blank rectangle.
- **Graph view enhancements.** On-screen zoom controls (＋ / － / fit-to-view)
  so zooming no longer depends on discovering scroll/pinch; hover-spotlight —
  pointing at a note dims everything except it and its directly-linked
  neighbours (shares one dimming pass with search so they never conflict); a
  "Hide unlinked" toggle to declutter the map to just the connected web; and a
  visual pass (accent focus ring + glow on the hovered node, a soft radial
  background wash, smoother node transitions).

### Fixed

- **"Ask your notebook": Retry/Copy/read-aloud buttons overlapped the answer.**
  The answer heading's action buttons used `float: right`, which escaped the
  heading and rendered on top of the answer box whenever the "answered by …"
  chip was long. The heading is now a flex row; the buttons sit inline on the
  right and wrap onto their own line when space is tight.
- **Clearer error when a chat model is picked as the Ollama embedding model.**
  Selecting a generation model as the search engine made Ollama answer
  `/api/embed` with a raw `501 Not Implemented` that gave no hint what was
  wrong. The app now detects this (501 / 400 / "does not support embeddings")
  and tells the user to pick a real embedding model such as `nomic-embed-text`.
- **Windows: `torch_xpu.dll` load failure (WinError 127).** After the
  `sentence-transformers` bump pulled a newer torch, the default Windows wheel's
  Intel GPU library failed to load and semantic search silently fell back to
  keywords. `requirements.txt` now installs the CPU-only torch build on Windows
  (all this app needs, and ~10× smaller); other platforms are unaffected. Added
  a README Troubleshooting section for anyone who already installed the broken
  wheel.
- Cleaned up lint issues flagged by ruff (ambiguous variable name, unused
  imports) so `ruff check` is clean.

### Ideas / not yet

- A GitHub Pages **landing page** (marketing/showcase only — the app itself is a
  local Python server and can't run on Pages).

---

## Development history

MemoryMap AI was built in numbered phases and lettered "waves." This is the
condensed record of what each one delivered.

### Phases 1–5 — Core product

- **Phase 1 — Walking skeleton:** server starts, entries stored in SQLite,
  tests green.
- **Phase 2 — Make the AI real:** auto-categorising janitor + question-answering
  librarian + semantic search, verified end-to-end with a real Ollama model.
- **Phase 3 — Web interface:** capture box, category sidebar, chat panel showing
  the answer *and* the raw results, confidence flags.
- **Phase 3.5 — Model Manager:** pick & download Ollama models in-app; switch the
  embedding backend with a safe automatic re-index.
- **Phase 4 — Core MVP:** single-user unlock, manual overrides, recycle bin,
  entry linking, guided mode, audit viewer, export, preferences.
- **Phase 5 — Quick access + polish:** recent questions, most-used dashboard,
  optional AI profile, glassmorphism UI with dark mode.

### Waves A–I — Platform, power features, hardening

- **Waves A–D — App shell & power features:** tabbed UI, settings modal, log
  viewer, note threads/files/pins/tags, chat tab with personas and saved
  conversations, dashboard, reminders.
- **Wave E — Graph view:** Obsidian-style force-directed map (D3 vendored
  locally).
- **Wave F — Platform:** command palette (Ctrl/Cmd-K), markdown import/export,
  daily local backups + restore, PWA + mobile pass, opt-in web search, sketch pad.
- **Wave G — Agentic tools + skills:** the chat AI can create/tag/pin/link/delete
  notes and set reminders (destructive actions always confirmed), plus one-click
  skills.
- **Wave H — Voice & desktop:** local Whisper dictation (optional), read-aloud,
  and a `python -m memorymap --desktop` window (optional pywebview).
- **Wave I — Hardening:** GitHub Actions CI (offline test suite), accessibility +
  keyboard + loading polish.

### Later waves — UI & graph refinements

- **Wave K:** empty states, streak widget, high-contrast mode, larger tap targets.
- **Wave L:** UI rework — accessibility, usability, design.
- **Wave M:** graph filters + search + pinning, image thumbnails, sharing, batch
  operations.
- **Wave N:** graph fixes + auto-linking, AI writing help, a dedicated utility
  model, a tasks manager.
- **Wave O:** stale-cache and re-lock fixes, brand logo, tool toggles; fixed the
  agent hallucinating note creation; expanded Appearance settings.
