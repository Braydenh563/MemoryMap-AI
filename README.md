# MemoryMap AI

> **Your thoughts, mapped by a local AI — 100% offline, on your machine.**

[![CI](https://github.com/Braydenh563/MemoryMap-AI-v0/actions/workflows/ci.yml/badge.svg)](https://github.com/Braydenh563/MemoryMap-AI-v0/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Braydenh563/MemoryMap-AI-v0/actions/workflows/codeql.yml/badge.svg)](https://github.com/Braydenh563/MemoryMap-AI-v0/actions/workflows/codeql.yml)
[![Python](https://img.shields.io/badge/python-3.11%20%7C%203.12%20%7C%203.13-blue)](pyproject.toml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A **100% offline, local-first** personal notebook: type a thought, a local AI
files it automatically, and later you ask a question in plain English and get
back *both* a conversational answer *and* the raw matching records.

The core loop:

```
capture text → AI categorises it → store it → ask a question → chat answer + raw results
```

Everything runs on your machine — nothing is ever sent to the cloud.

## Contents

- [Why MemoryMap AI?](#why-memorymap-ai)
- [Requirements](#requirements)
- [Setup](#setup)
- [Run it](#run-it)
- [Troubleshooting](#troubleshooting)
- [Run the tests](#run-the-tests)
- [Where your data lives](#where-your-data-lives)
- [Project layout](#project-layout)
- [Documentation](#documentation)
- [Build status](#build-status)
- [Operations notes](#operations-notes-wave-i-decisions)
- [License](#license)

## Why MemoryMap AI?

Note apps make *you* do the filing. MemoryMap AI flips that around:

- **Just capture.** Type a thought and a local AI files it into the right
  category for you — matched by meaning, decided by the chat model, or your own
  choice in guided mode.
- **Ask, don't dig.** Plain-English questions return a conversational answer
  *and* the raw notes that back it up, side by side.
- **It's genuinely yours.** No account, no cloud, no telemetry. Your notes are a
  plain SQLite file in a folder you control, with one-click JSON/CSV/Markdown
  export. The app binds to localhost only and never phones home.
- **It still works when the AI is off.** No Ollama? Notes are filed as
  `Uncategorised`, search falls back to keywords, and a header pill tells you
  what the AI is doing. Saving a note never fails.

New here and want the full tour of how it's built? See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Requirements

- Python 3.11 or newer
- [Ollama](https://ollama.com) for the local chat model (optional but
  recommended — capture and keyword search work without it; you only need it
  for auto-categorising and chat answers)

To set up the AI after installing Ollama:

```bash
ollama pull llama3.2     # the default chat model (~2 GB)

or use the following recommended models:
- ollama pull granite4.1:3b
- ollama pull lfm2.5 -> Specifically LFM2.5-8B-A1B if pulling from Hugging Face
- ollama pull gemma4:e2b
- ollama pull qwen3.5:2b
```
*See my Hugging Face Profile: https://huggingface.co/braydenh563*

The default *embedding* model (`all-MiniLM-L6-v2`, for semantic search)
downloads itself automatically (~90 MB) the first time it's needed — no
Ollama pull required.

## Quick start (one click)

Don't want to remember the commands? Use the bundled launcher — it creates
the virtual environment, installs everything, and starts the app for you,
then just runs it on every launch after that:

- **Windows:** double-click **`start.bat`** (or run `start.bat` in a terminal).
- **macOS / Linux:** run **`./start.sh`**.

The first run installs dependencies (a few minutes); after that it skips
straight to launching and opens <http://localhost:8000> in your browser.
It re-installs automatically only when `requirements.txt` changes.

Prefer to do it by hand? The manual steps are below.

## Setup

```bash
# 1. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Install dependencies + the app itself (editable mode)
pip install -r requirements.txt
pip install -e .
# ^ don't forget the dot — it means "install the app in THIS folder"

# 3. Optional: copy the example env file and tweak it
cp .env.example .env             # Windows: copy .env.example .env
```

## Run it

```bash
python -m memorymap             # browser tab at http://localhost:8000
python -m memorymap --desktop   # the same app in its own window
```

The desktop window needs the optional `pywebview` (`pip install pywebview`);
without it the app falls back to a browser tab rather than failing. The
one-click launchers cover both — `start.bat` / `./start.sh` for a tab, and
`start-desktop.bat` / `./start.sh --desktop` for a window, which install
`pywebview` on demand.

Then open <http://localhost:8000> — on first run you'll be asked to choose a
password (bcrypt-hashed, stays on your machine), and after that the app is:

- **Capture** — type a thought; the AI janitor files it and tells you *how*
  (matched by meaning, decided by the chat model, or your own choice in
  guided mode). Low-confidence filings are flagged for review.
- **Ask** — plain-English questions return a conversational answer *and* the
  raw matching records side by side, with recent questions one click away.
- **Correct anything** — edit content/category/tags, link related entries,
  soft-delete to a recycle bin (auto-clears after 30 days, configurable).
- **⚙ Models** — see whether Ollama is running, switch the chat model
  instantly, download suggested models with progress bars, or switch the
  embedding backend (your notes re-index automatically with progress).
- **Preferences** — answer style, recycle-bin days, an optional profile the
  AI can use for personal answers (opt-out + delete any time), and JSON/CSV
  export of everything.
- **Activity** — the audit log of every meaningful action.
- **Account & security** — change your password or PIN (private notes move
  across automatically), see how many sessions are open, and lock everywhere.

### One notebook, one password

MemoryMap is single-user by design: one `users` row, one password, everything
on this machine. To keep separate notebooks, point the app at a different data
folder (`MEMORYMAP_DATA_DIR`) rather than creating a second account.

**If you forget the password**, there is no reset link inside the app — one
there would just be a way in for anyone at the keyboard. Run:

```bash
python -m memorymap --reset-password
```

It asks you to confirm, then clears the password so you can set a new one.
Two very different things happen to your notes, and the command says which
before you commit:

- **Ordinary notes are not encrypted** by your password — they are plain rows
  in SQLite and come back untouched.
- **Private notes are.** Their key is derived from the password, so without it
  they cannot be decrypted by anyone, including this command. The reset loses
  them, and it tells you how many you have first.

### Web search privacy

Web search is off by default and is the only feature that leaves the machine.
When it is on, it sends an ordinary browser User-Agent rather than one naming
this app, keeps no cookies between searches, sends no `Referer`, sets the DNT
and Sec-GPC signals, uses POST so queries stay out of request lines and logs,
and strips tracking parameters (`utm_*`, `fbclid`, `gclid`, …) from result
URLs. Pointing it at a local SearXNG instance keeps more of the query on your
own network still.

The interactive API explorer still lives at <http://localhost:8000/docs>.

If Ollama isn't running, everything still works — new entries are filed as
`Uncategorised`, search falls back to keywords, and the header pill tells you
what the AI is doing (ready / warming up / rebuilding index / off).

#### Install Faster-Whisper for Speech-To-Text
```
cd [MemoryMap-AI Directory]
.venv\Scripts\activate
pip install faster-whisper
```

## Troubleshooting

### "Search engine problem … torch_xpu.dll … WinError 127" (Windows)

You'll see a banner like *"The specified procedure could not be found. Error
loading …\torch\lib\torch_xpu.dll"* and semantic search quietly falls back to
keywords. The app is fine — this is torch's default Windows wheel shipping an
Intel GPU library (`torch_xpu.dll`) that can't load on your machine. This app
only needs the **CPU** build of torch.

**Fresh installs are already handled:** `requirements.txt` now installs the
CPU-only torch on Windows, so a clean `pip install -r requirements.txt` won't
hit this.

**Already installed the broken wheel?** Swap it for the CPU build (either of
these works):

```powershell
# Option A — reinstall the CPU-only torch (keeps the built-in engine)
pip uninstall -y torch
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

Then restart the app — semantic search comes back.

**Or go torch-free:** in **Settings → Models**, download **`nomic-embed-text`**
and set it as the embedding backend. It runs entirely through Ollama, needs no
torch at all, and your notes re-index automatically. Full details are always in
**Settings → Logs**.

## Run the tests

```bash
pytest
```

Tests use a throwaway database and (from Phase 2) mock all AI calls, so they
run fast and fully offline.

## Where your data lives

Everything is stored in the `data/` folder (gitignored):

- `data/memorymap.db` — the SQLite database
- `data/preferences.json` — your settings

**Schema upgrades:** the app upgrades your database automatically at startup
(new columns are added in place — your notes are never touched). You do NOT
need to delete `data/memorymap.db` when updating.

## Project layout

```
src/memorymap/
├── __main__.py          # starts the app
├── core/                # config, database, shared singletons
├── entry/               # create/read entries + audit log
├── ai/                  # (Phase 2) ollama client, janitor, librarian, embeddings
├── search/              # (Phase 2) keyword + semantic search
└── api/                 # FastAPI app + routes
frontend/                # (Phase 3) HTML/CSS/JS, no framework
tests/                   # pytest suite
```

For a full walkthrough — the request lifecycle, the data model, the AI stack,
and where to look to change any given thing — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — the whole project explained:
  design principles, how a request flows, the data model, the AI stack, and a
  "where do I look to change X?" map.
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — how to set up, test, and open a PR.
- **[SECURITY.md](SECURITY.md)** — the security model and how to report issues.
- **[CHANGELOG.md](CHANGELOG.md)** — what changed, wave by wave.

## Build status

- [x] **Phase 1 — Walking skeleton:** server starts, entries stored in SQLite, tests green
- [x] **Phase 2 — Make the AI real:** auto-categorising janitor + question-answering librarian + semantic search
  *(verified end-to-end with a real Ollama model)*
- [x] **Phase 3 — Web interface:** capture box, category sidebar, chat panel with answer + raw results, confidence flags
- [x] **Phase 3.5 — Model Manager:** pick & download Ollama models in-app, embedding switch with safe re-index
- [x] **Phase 4 — Core MVP:** single-user unlock, manual overrides, recycle bin, entry linking, guided mode, audit viewer, export, preferences
- [x] **Phase 5 — Quick access + polish:** recent questions, most-used dashboard, optional AI profile, glassmorphism UI with dark mode
- [x] **Waves A–D — App shell & power features:** tabbed UI, settings modal, log viewer, note threads/files/pins/tags, chat tab with personas and saved conversations, dashboard, reminders
- [x] **Wave G — Agentic tools + skills:** the chat AI can create/tag/pin/link/delete notes and set reminders for you (destructive actions always confirmed), plus one-click skills
- [x] **Wave E — Graph view:** Obsidian-style force-directed map (D3 vendored locally)
- [x] **Wave F — Platform:** command palette (Ctrl/Cmd-K), markdown import/export, daily local backups + restore, PWA + mobile pass, opt-in web search, sketch pad
- [x] **Wave H — Voice & desktop:** local Whisper dictation (optional), read-aloud, `python -m memorymap --desktop` window (optional pywebview)
- [x] **Wave I — Hardening:** GitHub Actions CI (offline test suite), accessibility + keyboard + loading polish

## Operations notes (Wave I decisions)

- **Schema migrations:** the additive auto-migrator in `core/database.py`
  covers everything so far (new columns are added to old databases at
  startup; users never delete their data). **Alembic is deliberately
  deferred** until a column rename/removal is actually needed — don't do
  renames/removals casually.
- **Encryption at rest:** **SQLCipher is deferred** — it needs a native
  dependency on every platform for a single-user local file. If your
  notes are sensitive, use your OS's disk encryption (BitLocker /
  FileVault) which protects the whole data folder today.
- **CI:** `.github/workflows/ci.yml` lints with ruff and runs the full pytest
  suite on Python 3.11/3.12/3.13 on every push/PR. The suite mocks Ollama and
  embeddings, so CI needs no GPU, no models, and no network beyond pip.
  `.github/workflows/codeql.yml` adds static security analysis, and Dependabot
  keeps dependencies and Actions current.

## License

Released under the [MIT License](LICENSE).
