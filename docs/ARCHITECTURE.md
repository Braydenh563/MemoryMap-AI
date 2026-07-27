# MemoryMap AI — Architecture & Project Guide

> A single place to understand *what MemoryMap AI is, how it's built, and where
> everything lives.* Read this once and you'll be able to find your way around
> the whole codebase.

---

## 1. What it is, in one paragraph

MemoryMap AI is a **100% offline, local-first personal notebook**. You type a
thought; a local AI files it into a category automatically. Later you ask a
question in plain English and get back **both** a conversational answer **and**
the raw notes that matched. Everything — your notes, the search index, the AI
models — runs on your own machine. Nothing is ever sent to the cloud.

The core loop:

```
capture text → AI categorises it → store it → ask a question → chat answer + raw results
```

## 2. Design principles (the rules everything follows)

These are the constraints that shaped every decision. When in doubt, they win.

1. **Offline-first, always.** No feature may depend on a cloud service. The one
   opt-in exception is web search, which is off by default and clearly marked.
   When it *is* on it is built to reveal as little as possible: an ordinary
   browser User-Agent rather than one naming the app, no cookie jar, no
   Referer, DNT/Sec-GPC set, POST so queries stay out of request lines, and
   tracking parameters stripped from result URLs. It has its own settings
   screen (`settings-websearch`) — not a corner of Preferences — because
   every message that has to explain it points there by name.
2. **Degrade gracefully.** If the AI (Ollama) is down, the app still works:
   new notes are filed as `Uncategorised`, search falls back to keywords, and a
   status dot in the header says what the AI is doing. **Saving a note must
   never fail because the AI is unavailable.**
3. **Your data is yours, in plain files.** SQLite + JSON on disk, in a folder
   you can back up, inspect, or delete. Full JSON/CSV/Markdown export built in.
4. **Additive schema migrations.** The database upgrades itself at startup by
   adding new columns in place. Users never delete their database to update.
   (Alembic is deliberately deferred until a column rename/removal is needed.)
5. **Single source of truth for shared state.** Exactly one `ConfigManager` and
   one `DatabaseManager` per process, created in `core/deps.py`. Nothing else
   constructs them.
6. **Destructive AI actions are always confirmed.** The chat agent can act on
   your notebook, but deletes (and similar) pause for a user confirmation
   instead of executing silently.
7. **Tests are fast and fully offline.** Every AI call is faked in `tests/`, so
   the suite needs no GPU, no models, and no network.

## 3. The big picture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (frontend/ — vanilla HTML/CSS/JS, no framework)     │
│   capture · ask · graph · chat · settings · voice · PWA      │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP (same origin, no CORS needed)
┌───────────────────────────▼─────────────────────────────────┐
│  FastAPI app (src/memorymap/api/)                            │
│   routes_* → everything behind a single-user unlock gate     │
└───────┬───────────────────┬───────────────────┬─────────────┘
        │                   │                   │
┌───────▼──────┐   ┌────────▼────────┐   ┌──────▼──────────────┐
│  entry/      │   │  ai/            │   │  search/            │
│  create/read │   │  janitor        │   │  keyword + semantic │
│  + audit log │   │  librarian      │   │  (falls back safely)│
│              │   │  agent + tools  │   │                     │
│              │   │  embeddings     │   └─────────────────────┘
│              │   │  voice          │
└───────┬──────┘   └────────┬────────┘
        │                   │
        │          ┌────────▼────────┐        ┌───────────────┐
        │          │ ollama_client   │───────▶│  Ollama       │
        │          │ (local REST)    │        │  (localhost)  │
        │          └─────────────────┘        └───────────────┘
        │
┌───────▼──────────────────────────────────────────────────────┐
│  core/ — config · database (SQLite) · deps (singletons) ·     │
│          backup · logbuffer                                   │
│  data/ (gitignored): memorymap.db · preferences.json ·        │
│                       uploads/ · backups/                     │
└───────────────────────────────────────────────────────────────┘
```

## 4. Request lifecycle (two examples)

**Capturing a note** (`POST /entries`):

1. The route hands the text to the **janitor** (`ai/janitor.py`).
2. The janitor tries the cheap path first: embed the note and compare it to each
   category's centroid. A clear match files it with no LLM call at all.
3. Borderline or unknown → **one** call to the chat model, which returns a JSON
   category decision.
4. No AI available → `Uncategorised`, confidence `0`. The note is always saved.
5. The entry is written to SQLite, its embedding is stored, and the action is
   recorded in the audit log.

**Asking a question** (`POST /chat/...`):

1. **Search** (`search/`) retrieves candidate notes — semantic when embeddings
   are available, keyword otherwise.
2. The **librarian** (`ai/librarian.py`, strictly read-only) feeds those notes
   to the chat model with a grounding instruction: *answer only from the notes.*
3. The user gets the conversational answer **and** the raw matched notes side by
   side. If the model is offline, they still get the raw notes plus a friendly
   note that the AI answer is unavailable.

**Agentic chat** (`ai/agent.py`) is a superset of the above: the chat model is
offered a tool registry (see §7) and can *act* — create, tag, pin, link notes,
set reminders — looping tool-call → result → repeat until it produces a final
answer. Destructive tools don't execute inline; they emit a `confirm` event to
the UI.

## 5. Directory map

```
MemoryMap-AI-v0/
├── src/memorymap/
│   ├── __main__.py          # entry point: `python -m memorymap [--desktop]`
│   ├── __init__.py          # __version__
│   ├── core/
│   │   ├── config.py        # paths + user preferences (ConfigManager)
│   │   ├── database.py      # SQLAlchemy models + additive auto-migrator
│   │   ├── deps.py          # THE singletons (config, db, ollama, embeddings…)
│   │   │                    #   + store_quietly(): best-effort embed, lives
│   │   │                    #   here because it needs the shared service
│   │   ├── backup.py        # daily local snapshot + restore
│   │   └── logbuffer.py     # in-memory log capture + safe_value() for
│   │                        #   anything untrusted going into a log line
│   ├── entry/
│   │   └── manager.py       # create/read/soft-delete entries, audit log
│   ├── ai/
│   │   ├── ollama_client.py # thin REST client for the local Ollama server
│   │   ├── model_manager.py # list/pull models, pick chat/embedding backend
│   │   ├── embeddings.py    # embedding service + background warm-up
│   │   ├── janitor.py       # LLM prompt #1: file a note into a category
│   │   ├── librarian.py     # LLM prompt #2: answer from retrieved notes
│   │   ├── agent.py         # tool-calling loop (Wave G)
│   │   ├── tools.py         # the agent's tool registry (see §7)
│   │   └── voice.py         # optional local Whisper dictation
│   ├── search/
│   │   ├── search_manager.py# semantic + keyword search, with fallback
│   │   ├── websearch.py     # opt-in web search (off by default) + PROVIDERS
│   │   └── searxng_manager.py # install/start/stop a local SearXNG
│   └── api/
│       ├── app.py           # builds the FastAPI app, mounts frontend, gate
│       ├── schemas.py       # Pydantic request/response models
│       └── routes_*.py      # one router per feature area (see §6)
├── frontend/                # vanilla HTML/CSS/JS SPA + PWA (no build step)
│   ├── index.html · app.js · style.css · sw.js · manifest.webmanifest
│   └── vendor/              # d3.v7, p5 — vendored locally, never a CDN
├── tests/                   # pytest; all AI faked (tests/fakes.py)
├── docs/                    # you are here
├── .github/                 # CI, CodeQL, Dependabot, issue/PR templates
├── requirements.txt · pyproject.toml · pytest.ini
├── .env.example             # copy to .env to relocate data / set OLLAMA_URL
└── README.md · LICENSE · CHANGELOG.md · CONTRIBUTING.md · SECURITY.md
```

## 6. The API surface

The app is a FastAPI server. Every router except `/auth` and `/health` sits
behind the single-user **unlock gate** (`routes_auth.require_unlock`). Routers
are grouped by feature area:

| Router | Prefix | Responsibility |
| --- | --- | --- |
| `routes_auth` | `/auth` | first-run password setup, unlock, lock, change password, account state |
| `routes_entries` | `/entries` | create/read/edit/soft-delete notes, links, related, restore |
| `routes_chat` | `/chat` | ask questions, streaming answers, agentic tools, suggestions |
| `routes_conversations` | `/conversations` | saved chat threads |
| `routes_models` | `/models` | Ollama status, pull models, switch chat/embedding/utility model |
| `routes_settings` | `/` | preferences, audit log, JSON/CSV/Markdown export & import, backups, logs, web search + SearXNG lifecycle |
| `routes_documents` | `/documents` | long-form markdown documents, export, AI edit |
| `routes_duplicates` | `/duplicates` | near-duplicate finder + AI merge |
| `routes_drafts` | `/drafts` | the writing room's compose/rewrite calls |
| `routes_files` | `/` | attachments upload/download/delete |
| `routes_tags` | `/tags` | list/rename/delete tags |
| `routes_graph` | `/` | force-directed graph data + link suggestions |
| `routes_insights` | `/insights` | dashboard: stats, most-accessed, on-this-day, digest |
| `routes_reminders` | `/reminders` | create/list/complete reminders |
| `routes_voice` | `/voice` | local Whisper transcription |
| system | `/health` | liveness + version (open, no unlock) |

Interactive API docs live at `http://localhost:8000/docs` when the app is
running.

## 7. The agent's tools (Wave G)

`ai/tools.py` defines a registry the chat model can call — **28 tools**. Read-only
tools run inline; the two **destructive** ones (`delete_note`, `delete_tag`) emit
a confirmation event to the UI instead of executing.

*Reading the notebook:* `search_notes` · `get_note` · `list_notes` ·
`count_notes` · `list_tags` · `list_categories` · `summarize_notes`

*Reading everything else:* `list_documents` · `get_document` ·
`search_chat_history` · `get_current_time`

*Writing:* `create_note` · `edit_note` · `tag_note` · `pin_note` · `link_notes` ·
`restore_note` · `rename_tag` · `delete_note` ⚠️ · `delete_tag` ⚠️

*Reminders:* `set_reminder` · `list_reminders` · `complete_reminder`

*Skills:* `list_skills` · `save_skill` · `delete_skill`

*Online (opt-in, off by default):* `web_search` · `read_url`

`search_notes` and `list_notes` return **previews**, which is why `get_note`
exists and its description says so — a model that quoted a note from a preview
was quoting a truncation.

### Errors a tool is allowed to explain

Handlers raise **`tools.ToolError`** for failures they mean to explain ("no
note with that id"). Only that text is passed back to the model and out of
`POST /chat/tools/execute` to the user. A bare `ValueError`, `KeyError` or
`TypeError` from inside a handler is something else — whatever `int("abc")`
happened to say — so it is logged here and reported by *shape* instead. A
single `except ValueError` could not tell those apart, and the difference is
the one CodeQL flagged as stack-trace exposure.

### The per-round budget

Everything in this registry is serialised into the `tools` field on **every
round of every turn**, alongside the system prompt. That fixed overhead is
~3,050 tokens, and **77% of it is these schemas, not the prose in
`TOOLS_GUIDE`** — so a verbose new tool description costs more than a verbose
new paragraph.

`agent.PROMPT_BUDGET_CHARS` caps the total and `tests/test_prompt_budget.py`
enforces it. It exists because Ollama defaults to a 4096-token window and
drops overflow from the *front*: a 3B model that overflows loses the system
prompt and stops knowing it has tools, which presents as "the AI won't use
tools" rather than as anything to do with length. Settings → Tools
(`disabled_tools`) is the user-facing escape hatch, and it filters at
`ollama_tools()` — the wire — not just at execution.

**Adding a tool is not free.** If the budget test fails, that is the design
working; either trim, or raise the constant deliberately and say why.

The agent loop (`ai/agent.py`) streams: it calls `chat_tools_stream`, so the
model's prose reaches the user as it is written rather than arriving in one
block when the turn ends. Text that might turn out to be a tool call written
as prose is gated until it is clearly not one, so it is executed rather than
displayed. The UI renders the run as an ordered timeline — thinking, tool
calls and prose in the order they happened — and persists it with the turn.

## 8. Data model

SQLite via SQLAlchemy 2.0 (`core/database.py`). Main tables:

- **users** — single-user unlock (one bcrypt-hashed password). Exactly one
  row: separate notebooks are separate `MEMORYMAP_DATA_DIR`s, not separate
  accounts. The password can be changed from Settings → Account, which
  re-wraps the vault key onto the new password *before* replacing the hash —
  the other order would strand every private note.
- **vault** — the data key for private notes, wrapped with a key derived from
  the password. This is why a forgotten password loses private notes and only
  private notes: everything else is plain rows. `--reset-password` clears the
  credential and says exactly what that costs before it does.
- **categories** — named buckets; each has an embedding centroid used for the
  janitor's cheap-match path.
- **entries** — the notes themselves: `content`, `category_id`, JSON `tags`,
  `ai_confidence` (0–100), `access_count`, `parent_id` (train-of-thought
  threads), `pinned`, `user_filed` (user chose the category → janitor keeps
  hands off), timestamps, and soft-delete (`is_deleted` / `deleted_at`).
- **entry_links** — user- or AI-made connections between two entries (the graph).
- **embeddings** — per-entry vectors, stored as raw `float32` bytes.
- **attachments** — uploaded files, kept in `data/uploads/`.
- **conversations** — saved chat threads. Messages are one JSON column of flat
  user/assistant pairs. An assistant message carries `content` *and* `steps` —
  the run as an ordered timeline (thinking, tool calls, prose). `steps` is what
  the client replays when a chat is reopened; `content` is the flattened text
  used for copying and for the history sent with the next question. **Anything
  that edits an answer has to update both**, or the edit is invisible the
  moment the chat is reopened.
- **entry_revisions** — edit history for notes. Documents have no equivalent
  yet, which is why the AI document edit overwrites on accept.
- **documents** — long-form markdown, separate from notes.
- **reminders** — lightweight reminders the agent can set. Stored UTC-aware:
  SQLite drops timezones and JavaScript parses a naive date-time as *local*,
  which read as a reminder being hours overdue the moment it was set.
- **audit_log** — every meaningful action, shown in Settings → Activity.

**Migrations:** `database.py` runs an additive auto-migrator at startup — new
columns are added to existing databases in place. You never delete your data to
upgrade. Rename/removal-style migrations are out of scope until genuinely needed.

## 8b. Anything that leaves the machine

One module, `search/websearch.py`, owns every outbound request, and it has
three rules that are easy to break by accident. All three have already been
broken once.

**Which engine answers is the user's choice, read in one place.** The
`search_provider` preference is `auto` | `searxng` | `duckduckgo`
(`websearch.PROVIDERS`). `auto` tries SearXNG and falls back; **`searxng`
does not fall back** — reporting a failure is the point, because silently
re-routing to DuckDuckGo defeats running your own instance. Both callers (the
`/websearch` route and the agent's `web_search` tool) read it through
`websearch.settings_from(config)`. Two readers is how the tool ended up
honouring a different setting from the UI.

**Check an address and then connect to that address, not to the name.**
`_searxng_target` and `_pin_url` both resolve once, validate, and hand
`requests` an **IP literal** with the hostname in a `Host` header (and, for
HTTPS, `_PinnedAdapter` to keep SNI and certificate verification intact).
Resolving to check and resolving again to connect leaves a DNS-rebinding
window between the two. The reader path was fixed for this; the SearXNG search
path was not, and kept the hole for months while the *probe* beside it was
pinned correctly.

**A redirect is a new request.** `_get_external` follows hops by hand with
`allow_redirects=False`, re-checking each one, because `allow_redirects=True`
resolves the next hop inside `requests` where no guard can see it — and
"302 → http://127.0.0.1/" walks straight past a check on the first URL.

A configured SearXNG must resolve to this machine or the local network, and
**every** address it resolves to must, not merely one of them.

`search/searxng_manager.py` can install, start and stop an instance. Its
output goes to `data/searxng/searxng.log` — never `DEVNULL`, which is what
made a failed start unexplainable and reduced the error message to a guess
about the port.

Two things in there are Windows-specific and both were wrong in the same way
— a POSIX idiom that means something else entirely on Windows:

- **`os.kill(pid, 0)` does not ask a question on Windows, it terminates the
  process.** Any signal other than `CTRL_C_EVENT`/`CTRL_BREAK_EVENT` is passed
  to `TerminateProcess`, so the liveness check inside `_source_state` — which
  `status()` calls, which the settings screen polls every three seconds —
  killed the instance seconds after starting it and then reported that it
  "started but never answered". `_alive` now goes through
  `OpenProcess`/`GetExitCodeProcess` on Windows and only signals on POSIX.
- **`shutil.rmtree(..., ignore_errors=True)` cannot delete a git checkout on
  Windows**, because git marks `.git/objects` read-only. It deleted everything
  writable, left the folder standing, and reported success — after which
  `data/searxng/src` existed but was no longer a Python project, the installer
  skipped the download because the folder was there, and pip said *"does not
  appear to be a Python project"* about a path the user had never heard of.
  `_remove_tree` clears the read-only bit and retries, moves the tree aside if
  it still can't delete it, and reports what survived instead of pretending.

The rule underneath both: **a folder existing is not the question.**
`is_checkout()` asks whether there is a `setup.py` or a `pyproject.toml` in
it, and installing, starting and `source_installed()` all ask that rather than
`.exists()`. `install_source` also verifies `import searx` in the new venv
before calling the install done, because pip exiting 0 and SearXNG being
runnable are different claims.

**How SearXNG is installed, and why it looks so indirect.** Three separate
things each rule out the obvious approach, and all three were found by running
it rather than by reading:

1. **`git clone` cannot work on Windows, ever.** Four files in the repository
   have a colon in the name (`…/searxng.conf:socket` and three like it). A
   colon separates a drive letter, so git fetches every object and then dies —
   *"fatal: unable to checkout working tree"* — leaving the half-written
   folder that caused the error above. `pip install <tarball-url>` fails the
   same way, because pip unpacks the same files. So the archive is downloaded
   and unpacked *here*, skipping members this filesystem can't hold (they are
   nginx/uwsgi deployment templates — nothing the app runs) and members that
   would escape the directory.
2. **`pip install -e .` cannot work anywhere.** SearXNG's `setup.py` imports
   `searx` to read its version, and `searx/__init__.py` imports `msgspec` —
   which does not exist in pip's isolated build environment. It fails with
   `ModuleNotFoundError` before declaring a single requirement. So
   `requirements.txt` is installed first and the package is then built with
   `--no-build-isolation`, which is what SearXNG's own `manage` script does.
3. **The generated `settings.yml` turns off `tracker_url_remover`.** That
   plugin downloads a rules file from `rules1.clearurls.xyz` *during startup*
   and does not catch a failure, so an offline or proxied machine loses the
   process before it binds the port — "started but never answered" again.
   `websearch.strip_tracking` already does that job locally.

Verified end to end in this sandbox except the download itself (the proxy
blocks the URL): the archive unpacks to a real tree, installs, starts, serves
its JSON API, and `websearch.probe_searxng` returns True against it.

## 9. AI stack

- **Chat model:** any model installed in **[Ollama](https://ollama.com)**
  (default `llama3.2`). Talked to over the local REST API via
  `ai/ollama_client.py`. Used by the janitor, librarian, and agent.
- **Embeddings:** default `all-MiniLM-L6-v2` via `sentence-transformers`
  (~90 MB, auto-downloads on first use). Optionally switch the backend to an
  Ollama embedding model; notes re-index automatically with a progress bar.
- **Voice (optional):** local Whisper via `faster-whisper` for the 🎙 buttons.
- **Warm-up:** embeddings load in a background thread at startup so the first
  request isn't slow; the header pill tracks *ready / warming up / rebuilding
  index / off.*

Everything AI-related is designed to be *absent*: the app is fully usable with
Ollama stopped and no optional extras installed.

## 10. Frontend

A single-page app in **vanilla HTML/CSS/JS — no framework, no build step.**
Served as static files by the same FastAPI server (so no CORS is needed). It's
also a **PWA** (`manifest.webmanifest` + `sw.js`) with a mobile pass, a command
palette (Ctrl/Cmd-K), an Obsidian-style force-directed graph (D3, vendored
locally in `frontend/vendor/`), and a sketch pad (p5, also vendored). No asset
is ever loaded from a CDN — consistent with the offline-first rule.

### Driving it in a browser

The test suite cannot see any of this, so verify UI work by running the app.
Chromium is preinstalled at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`;
`pip install playwright` (the browser is already there — do not run
`playwright install`). Launch the context with `service_workers="block"`, or
`sw.js` will serve a cached `app.js`/`style.css` and your change won't be in
the page you are looking at.

Top-level functions in `app.js` are plain globals, so a Playwright
`page.evaluate` can call `switchTab`, `applyThemePreset` or `renderEmbeddingPicker`
directly. Asserting on measured geometry — `scrollWidth - clientWidth`, a
focused element's `offsetParent` — catches far more than a screenshot.

### Invariants worth knowing

1. **The Notes tab has sub-tabs** (`capture` / `ask` / `browse`) and remembers
   the last one in `localStorage`. Anything that focuses or scrolls to an
   element there must call `showNotesSection(...)` first: focusing inside a
   `display: none` section silently does nothing, and the control reads as
   dead. This has caused the same bug four separate times.
2. **CSS automatic minimum sizing is the usual cause of a wide page.** A grid
   track of `1fr` and a flex item of `min-width: auto` both refuse to shrink
   below their content, so one wide code block or table widens its column, the
   page, and every paragraph beside it. `overflow-x: auto` on the child cannot
   take effect until every ancestor has an explicit floor — `minmax(0, 1fr)`
   on the track *and* `min-width: 0` on the item.
3. **Later CSS at equal specificity silently wins.** A media query that sets
   `flex` is undone by a base rule declaring `flex` further down the file. The
   header's tabs were pinned at a rigid 579px this way for a long time, and the
   block that was supposed to free them looked perfectly correct.
4. **Inline styles beat stylesheets, which is how colour layering works.** A
   palette sets `--accent` from a `[data-palette]` rule; an explicitly chosen
   accent is written as an inline custom property so it wins. Two rules of
   equal specificity would otherwise be decided by source order.
5. **The header degrades in a fixed order** as the window narrows: wordmark,
   then the status pill, then tab padding, then the tabs scroll. Its buttons
   never shrink. Breakpoints here are measured, not guessed — the desktop
   shell's window is 1200x800, which is less viewport than it sounds on a
   scaled display.
6. **`prefers-reduced-motion` disables animation**, so any animation carrying
   *meaning* needs a still fallback or it reads as a rendering fault.
7. **p5 measures a canvas as zero inside a `display: none` tab.** Anything
   using `renderEmblem` has to be drawn in its own tab's render, not at
   startup — which is also what makes it redraw when a theme change moves the
   accent.
8. **Note text is user content and is never parsed as markup.** Everything is
   built with `createElement` / `textContent`. `renderNoteText` layers
   `[[wiki links]]`, then `renderInlineMarkdown` (bold, italic, `code`,
   strike — inline only, deliberately), then `highlightInto` for filter
   matches, and all three have to keep working through each other. Block
   markdown is *not* used in the note list: rendered headings and tables make
   it enormous. The dashboard's one-line previews strip the markers instead
   (`notePreviewText`), because a 70-character clip can land mid-tag.
9. **Settings sections are three things that must agree**: an entry in
   `SETTINGS_SECTIONS`, a `<section id="settings-NAME">`, and a
   `<button data-section="NAME">` in the nav. Miss the first and the section
   never hides; miss the third and it is unreachable.

## 11. Configuration

Two knobs, both optional, via `.env` (copy from `.env.example`):

- `MEMORYMAP_DATA_DIR` — where the database, preferences, uploads, and backups
  live (default `data/`).
- `OLLAMA_URL` — where the local Ollama server listens (default
  `http://localhost:11434`).

User-facing preferences (chat model, embedding backend, recycle-bin days, answer
style, optional AI profile, …) live in `data/preferences.json`, managed by
`ConfigManager` and editable from the Preferences screen.

## 12. Testing & CI

- **Run locally:** `PYTHONPATH=src pytest` (≈560 tests, about a minute). Uses a
  throwaway database and fakes every AI call (`tests/fakes.py` +
  `tests/conftest.py`), so it's fast and fully offline.
- **The suite cannot see the UI.** Every layout and wiring bug fixed so far
  passed a fully green run — a header overflowing its own box by 215px, a
  button focusing an element inside a hidden section, an accent picker with no
  effect. Drive the app in a browser before believing a frontend change works;
  §10 says how.
- **Lint locally:** `ruff check .` (and, optionally, `ruff format` to tidy).
- **CI** (`.github/workflows/ci.yml`): lint with ruff, then run the full test
  suite on Python 3.11 / 3.12 / 3.13. No GPU, no Ollama, no models required.
- **CodeQL** (`.github/workflows/codeql.yml`): static security analysis on push,
  PR, and weekly.
- **Dependabot** (`.github/dependabot.yml`): weekly dependency + Action bumps.

## 13. Running it

```bash
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt && pip install -e .
python -m memorymap            # → http://localhost:8000
python -m memorymap --desktop  # same app in its own window (needs pywebview)
```

On first run you choose a password (bcrypt-hashed, stays local). See the
[README](../README.md) for the full walkthrough of each screen.

## 14. Where to look when you want to…

| I want to… | Start here |
| --- | --- |
| Change how notes are categorised | `src/memorymap/ai/janitor.py` |
| Change how questions are answered | `src/memorymap/ai/librarian.py` |
| Add/adjust an agent action | `src/memorymap/ai/tools.py` (+ `agent.py`) |
| Add an API endpoint | the matching `src/memorymap/api/routes_*.py` |
| Add a database column | `src/memorymap/core/database.py` (+ auto-migrator) |
| Change search behaviour | `src/memorymap/search/search_manager.py` |
| Change the UI | `frontend/app.js`, `frontend/style.css` (read §10's invariants first) |
| Work out why a page scrolls sideways | §10 invariant 2 — an ancestor with no `min-width: 0` |
| Change what a saved chat replays | `steps` in `routes_conversations.py` — not just `content` |
| Add a preference | `DEFAULT_PREFERENCES` in `core/config.py`, then `PreferencesBody` + `get_preferences()` in `routes_settings.py` |
| Add a Settings screen | §10 invariant 9 — three places, all three needed |
| Change which search engine answers | `websearch.PROVIDERS` + `settings_from()`; never read the preference directly |
| Add an agent tool | `ai/tools.py`, then run `tests/test_prompt_budget.py` — schemas are 77% of the per-round cost |
| Log something a user or a website typed | `logbuffer.safe_value()` at the call site; `sanitise` only protects the in-app viewer |
| Work out why SearXNG won't start | `data/searxng/searxng.log`, surfaced in Settings → Web search |
| Add a test | `tests/` — copy an existing `test_*.py` and reuse the fakes |

---

*This document tracks the codebase — if you change the architecture, update it in
the same PR.*
