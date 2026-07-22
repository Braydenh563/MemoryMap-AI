# Changelog

All notable changes to MemoryMap AI are recorded here. The format is loosely
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project follows a "waves and phases" development history (see the milestones
below). Versioning is `0.x` while the app stabilises.

## [Unreleased]

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
