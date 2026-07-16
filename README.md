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

Then open <http://localhost:8000> — the web UI: capture thoughts, browse by
category, and ask questions with the AI answer and raw records side by side.
(The interactive API explorer still lives at <http://localhost:8000/docs>.)

- `GET /health` — is the server alive?
- `POST /entries` — store a thought (the AI janitor files it into a category)
- `GET /entries` — read your thoughts back
- `POST /chat` — ask a question in plain English; you get back both a
  conversational answer *and* the raw matching entries

If Ollama isn't running, everything still works — new entries are filed as
`Uncategorised` and `/chat` politely says the AI answer is unavailable while
still returning matching notes.

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

**Note on schema changes (MVP):** there are no database migrations yet. If the
schema changes between versions, delete `data/memorymap.db` and restart — the
app recreates it. (Real migrations arrive once there's real data to preserve.)

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
  *(code + offline tests done — run the real dad-joke test on a machine with Ollama installed)*
- [x] **Phase 3 — Web interface:** capture box, category sidebar, chat panel with answer + raw results, confidence flags
- [ ] **Phase 3.5 — Model Manager** (pick & download Ollama models in-app)
- [ ] **Phase 4 — Core MVP:** login, recycle bin, manual overrides, export
