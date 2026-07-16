# MemoryMap AI

A **100% offline, local-first** personal notebook: type a thought, a local AI
files it automatically, and later you ask a question in plain English and get
back *both* a conversational answer *and* the raw matching records.

The core loop:

```
capture text → AI categorises it → store it → ask a question → chat answer + raw results
```

Everything runs on your machine — nothing is ever sent to the cloud.

## Requirements

- Python 3.11 or newer
- [Ollama](https://ollama.com) for the local chat model (optional but
  recommended — capture and keyword search work without it; you only need it
  for auto-categorising and chat answers)

To set up the AI after installing Ollama:

```bash
ollama pull llama3.2     # the default chat model (~2 GB)
```

The default *embedding* model (`all-MiniLM-L6-v2`, for semantic search)
downloads itself automatically (~90 MB) the first time it's needed — no
Ollama pull required.

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
python -m memorymap
```

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

The interactive API explorer still lives at <http://localhost:8000/docs>.

If Ollama isn't running, everything still works — new entries are filed as
`Uncategorised`, search falls back to keywords, and the header pill tells you
what the AI is doing (ready / warming up / rebuilding index / off).

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

## Build status

- [x] **Phase 1 — Walking skeleton:** server starts, entries stored in SQLite, tests green
- [x] **Phase 2 — Make the AI real:** auto-categorising janitor + question-answering librarian + semantic search
  *(verified end-to-end with a real Ollama model)*
- [x] **Phase 3 — Web interface:** capture box, category sidebar, chat panel with answer + raw results, confidence flags
- [x] **Phase 3.5 — Model Manager:** pick & download Ollama models in-app, embedding switch with safe re-index
- [x] **Phase 4 — Core MVP:** single-user unlock, manual overrides, recycle bin, entry linking, guided mode, audit viewer, export, preferences
- [x] **Phase 5 — Quick access + polish:** recent questions, most-used dashboard, optional AI profile, glassmorphism UI with dark mode
- [ ] **Phase 6 — Desktop shell** (pywebview window) + optional extras — after 1–5 feel solid in daily use
