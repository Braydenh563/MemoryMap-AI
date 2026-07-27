# Changelog

All notable changes to MemoryMap AI are recorded here. The format is loosely
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project follows a "waves and phases" development history (see the milestones
below). Versioning is `0.x` while the app stabilises.

## [Unreleased]

### Added

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

### Fixed

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
