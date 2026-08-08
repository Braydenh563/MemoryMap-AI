<div align="center">

<img src="frontend/favicon.svg" alt="" width="96" height="96">

# MemoryMap AI

**Your thoughts, mapped by a local AI. 100% offline, on your machine.**

[![CI](https://github.com/Braydenh563/MemoryMap-AI-v0/actions/workflows/ci.yml/badge.svg)](https://github.com/Braydenh563/MemoryMap-AI-v0/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Braydenh563/MemoryMap-AI-v0/actions/workflows/codeql.yml/badge.svg)](https://github.com/Braydenh563/MemoryMap-AI-v0/actions/workflows/codeql.yml)
[![Python](https://img.shields.io/badge/python-3.11%20%7C%203.12%20%7C%203.13-blue)](pyproject.toml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

Note apps make *you* do the filing. MemoryMap AI doesn't.

Type a thought and a local AI files it. Later, ask a question in plain English
and get back **both** a conversational answer **and** the raw notes it came
from - so you can check it.

```
capture text  →  AI files it  →  ask a question  →  answer + the notes behind it
```

Everything runs on your own computer. No account, no cloud, no telemetry. Your
notes are a SQLite file in a folder you control.

> **New to the codebase?** [`docs/ARCHITECTURE.md`](https://github.com/Braydenh563/MemoryMap-AI/blob/main/docs/ARCHITECTURE.md) is the
> full tour - how a request flows, the data model, and a "where do I look to
> change X?" map.

## Contents

- [Why this exists](#why-this-exists)
- [What's in it](#whats-in-it)
- [Quick start](#quick-start)
- [Manual setup](#manual-setup)
- [Running it](#running-it)
- [Your notebook, your rules](#your-notebook-your-rules)
- [Privacy and security](#privacy-and-security)
- [Troubleshooting](#troubleshooting)
- [Where your data lives](#where-your-data-lives)
- [Developing](#developing)
- [Project layout](#project-layout)
- [Where it's up to](#where-its-up-to)
- [Documentation](#documentation)
- [License](#license)

## Why this exists

- **Just capture.** Type a thought; a local AI files it into the right category
  - matched by meaning, decided by the chat model, or your own choice in guided
mode. It tells you *which*, and flags the ones it wasn't sure about.
- **Ask, don't dig.** Plain-English questions return an answer *and* the notes
that back it up, side by side. You are never asked to trust a summary you
can't check.
- **It's genuinely yours.** No account, no cloud, no telemetry. Plain SQLite in
a folder you choose, with JSON/CSV/Markdown export built in. The server binds
to localhost and never phones home.
- **It works when the AI doesn't.** No Ollama running? Notes are filed as
`Uncategorised`, search falls back to keywords, and a dot in the header says
what the AI is doing. **Saving a note never fails.**

## What's in it

Seven tabs, all offline:

| Tab           | What it does                                                                                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard** | Greeting, capture streak, at-a-glance counts, an AI digest of your week, an activity heatmap, on-this-day, a focus timer, and a layout you can rearrange                                                 |
| **Notes**     | Capture, browse and ask, as three sub-tabs. Auto-filing, tags, pins, threads, attachments, private notes (encrypted at rest), a recycle bin, revision history, and a search box that understands `tag:work`, `cat:recipes`, `is:pinned`, `"exact phrase"` and `-exclude` |
| **Chat**      | A conversation with your notebook, saved and resumable. **Agent mode** lets it use 35 tools - search and read your notes, walk the connections between them, create, tag, link and unlink, organise, set reminders, open a web page - with destructive actions always confirmed, and an ask-me button when it isn't sure which note you meant. Personas change its voice; the run is shown as a timeline of thinking, tool calls and prose in the order they happened |
| **Graph**     | Your notes as a force-directed map, and a knowledge graph the AI can walk: links, reply threads and shared tags, each labelled with *how* two notes connect. It can also point out notes that read alike and were never linked                |
| **Library**   | Everything you have made, in one place: notes, documents, chats, files, tags, the recycle bin and the activity log. Overview tiles that are also filters, search across titles *and* previews, four sorts, bulk selection with counted confirmations, grid ⇄ list, and a coloured spine per kind so a shelf of mixed things is scannable by edge. The long-form **document editor** opens from here, and so does the **whiteboard** — note cards and freehand sketches on a canvas you can pan and zoom, where a board is itself a note and so is searchable and filable like any other |
| **Timeline**  | Every note plotted on a time axis - at what it's *about* when a phrase like "next week" resolves to a date, and at when it was written otherwise - in bands by category or tag, at a bucket size you pick |
| **Reminders** | Due dates with priority, repeats, snooze and notifications - or type "call mum tomorrow evening" and let the AI schedule it                                                                              |

Plus a **status bar** along the foot of the window — AI state, notebook size,
reminders, the running background job and the command palette, none of which
polls on its own timer — a command palette (`Ctrl`/`Cmd`+`K`), a sketch pad,
local Whisper dictation, read-aloud, opt-in web search that opens as a **column
beside the conversation** with a reader view, 12 themes over 8 colour palettes
with per-setting overrides, a scheme builder that works the colours out from
one you pick, looks you can save by name, 16 built-in skills including a
five-part notebook audit, daily local backups, and a desktop window
(`--desktop`).

Two things run on their own once you switch them on, and both are off by
default because both act without being asked:

- **Search by meaning.** Tick ✨ Semantic beside the notes filter and the
  search stops matching words and starts matching ideas — "things I was worried
  about" finds the note that never uses either word. It needs the embedding
  model from Optional extras.
- **The background librarian.** On an interval you choose, a local agent goes
  through the notebook tagging what is untagged, linking notes that read alike,
  and flagging duplicates. It can never delete anything, it stops rather than
  ask you a question, and it skips itself entirely on battery power. Off until
  you turn it on, and every run is listed in Settings → Background tasks.

The AI can also **remember standing instructions** — tell it "always answer in
British English" and it keeps that across conversations.

**Settings → Optional extras** installs the packages that turn optional
features on — dictation, the desktop window, search-by-meaning — and shows the
**embedding models** on this machine with their real size on disk and a way to
remove them. Nothing there is needed to write, search, tag or organise notes,
and anything that has nothing calling it yet is greyed out and says so.

## Quick start

**You need Python 3.11 or newer.** That's it to get running.

- **Windows** - double-click **`start.bat`**
- **macOS / Linux** - run **`./start.sh`**

The launcher builds the virtual environment, installs everything, starts the
app and opens <http://localhost:8000> (or <http://127.0.0.1:8000>). The first run takes a few minutes; after
that it goes straight to launching, and only re-installs when `requirements.txt` changes.

For the app in its own window instead of a browser tab: `start-desktop.bat`, or `./start.sh --desktop`.

### Adding the AI

MemoryMap works without it - you just get keyword search and `Uncategorised` filing. For auto-filing and chat answers, install [Ollama](https://ollama.com) and pull a model:

```
ollama pull llama3.2
```

Any Ollama model works, and you can switch between them in-app from **Settings
→ Models** without restarting - the same list is there, with a download button
next to each.

**Sorted by size, not by quality**, because the real question is what your
machine can run. Start at the top of the tier that fits your RAM; if answers
feel slow, drop a tier.

**Runs on almost anything** - no GPU needed:

| Model            | Size    | Why                                                    |
| ---------------- | ------- | ------------------------------------------------------ |
| `qwen3.5:2b`     | ~1.6 GB | The lightest one genuinely worth using                 |
| `llama3.2`       | ~2.0 GB | **The default.** Fast, and a good first choice         |
| `granite4.1:3b`  | ~2.1 GB | Strong instruction-following at a small size           |
| `qwen3.5:4b`     | ~2.6 GB | Follows instructions closely - good for agent mode     |
| `gemma4:e2b`     | ~3.5 GB | Fast & more reliable. Try it if bigger models are too slow |
| `gemma4:e4b`     | ~5 GB | Even more reliable, slightly slower. Noticeably better writing than the 2B models |

**8 GB of RAM, or any modern GPU** - the real step up in answer quality:

| Model            | Size    | Why                                                    |
| ---------------- | ------- | ------------------------------------------------------ |
| `llama3.1:8b`    | ~4.9 GB | Better reasoning, and reliable tool calls in agent mode|
| `qwen3.5:8b`     | ~5.2 GB | Best tool use at this size. Thinks, so slower per answer|
| `mistral-nemo`   | ~7.1 GB | Long-document work - a large context window            |
| `gemma4:12b`     | ~7.6 GB | Long-form writing and summarising                      |

**16 GB and up - mixture-of-experts.** Worth understanding before you skip
these on size: `26b-a4b` holds 26B of weights but computes with only 4B of them
at a time, so it downloads like a big model and *answers* at roughly the speed
of a 4B one. If you have the memory, these are the best answers on this page.

| Model             | Size   | Why                                                   |
| ----------------- | ------ | ----------------------------------------------------- |
| `gemma4:26b-a4b`  | ~15 GB | 12B-class speed, far better answers. Needs ~16 GB     |
| `qwen3.5:35b-a3b` | ~20 GB | The most capable here, and still quick. Needs ~24 GB  |

Sizes are Ollama's default quantisation and are approximate. They matter more
than the parameter count: a 7B at Q4 and a 3B at Q8 land in about the same
place on an 8 GB machine.

**For agent mode specifically**, prefer a model Ollama reports as tool-capable -
Settings → Models shows this under "Can use tools", read from the model itself
rather than guessed. `qwen3.5:8b` and `llama3.1:8b` are the most reliable of
the list above; the 2B models can use tools but forget to.

*Some of these, and a few others, are also at
[huggingface.co/braydenh563](https://huggingface.co/braydenh563).*

### Not using Ollama?

**Settings → Models → Model backend** points MemoryMap at anything that serves
the OpenAI API instead - **LM Studio**, **llama.cpp**'s server, **Jan** and
**vLLM** are all the same choice, differing only by address. Pick "LM Studio /
llama.cpp / Jan / vLLM", leave the address blank for the usual one
(`localhost:1234/v1`) or fill in your own port, and press Connect. It applies
straight away; no restart, and nothing to put in `.env`.

Everything works the same on either backend - tool calls, streaming, thinking
models, and the token counts on each message. Two differences worth knowing:
downloading models is an Ollama feature (every other server is handed a model
you already have, so that panel hides itself), and Ollama is the only one that
lets the app *ask* for a context window - elsewhere the window is whatever the
server was started with, so MemoryMap reads it and rations the prompt to fit.

The **embedding** model for semantic search (`BAAI/bge-small-en-v1.5`)
downloads itself the first time it's needed - Settings → Models names whichever
one is actually loaded. No Ollama pull required - and you
can switch to an Ollama embedding model later, with an automatic re-index.

## Manual setup

If you'd rather not use the launcher:

```
# 1. A virtual environment
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Dependencies, then the app itself
pip install -r requirements.txt
pip install -e .                 # the dot matters - it means "this folder"

# 3. Optional: relocate your data or point at a different Ollama
cp .env.example .env             # Windows: copy .env.example .env
```

Optional extras, installed only if you want them:

```
pip install pywebview       # the --desktop window
pip install faster-whisper  # local speech-to-text for the 🎙 buttons
```

## Running it

```
python -m memorymap             # a browser tab at http://localhost:8000
python -m memorymap --desktop   # the same app in its own window
```

Without `pywebview`, `--desktop` falls back to a browser tab rather than
failing.

On first run you choose a password (bcrypt-hashed, stays on your machine).
After that:

- **Capture** - type a thought; the AI files it and says *how*. Low-confidence
filings are flagged for review.
- **Ask** - a conversational answer plus the raw matching notes, side by side.
- **Correct anything** - content, category, tags, links; soft-delete to a
recycle bin that auto-clears after 30 days (configurable).
- **Settings → Models** - whether Ollama is running, switch the chat model
instantly, download suggested models with progress bars, or change the
embedding backend (your notes re-index automatically).
- **Settings → Web search** - off by default. See
[Privacy and security](#privacy-and-security).
- **Settings → Activity** - the audit log of every meaningful action.
- **Settings → Account & security** - change your password or PIN (private
notes move across automatically), see open sessions, lock everywhere.

The interactive API explorer lives at <http://localhost:8000/docs>.

## Your notebook, your rules

### One notebook, one password

MemoryMap is single-user by design: one `users` row, one password, everything
on this machine. To keep separate notebooks, point the app at a different data
folder with `MEMORYMAP_DATA_DIR` rather than creating a second account.

### If you forget the password

There is no reset link inside the app - one there would just be a way in for
anyone at the keyboard. Instead:

```
python -m memorymap --reset-password
```

It asks you to confirm, then clears the password so you can set a new one. Two
very different things happen to your notes, and the command tells you which
before you commit:

- **Ordinary notes are not encrypted** by your password. They are plain rows in
SQLite and come back untouched.
- **Private notes are.** Their key is derived from the password, so without it
nobody can decrypt them - including this command. The reset loses them, and
it tells you how many you have first.

No backdoor was added, on purpose.

## Privacy and security

The whole app is built around one rule: **nothing leaves your machine unless
you explicitly ask it to.** The server binds to localhost, every route except `/health` sits behind the unlock gate, and no asset is ever loaded from a CDN.

**Is the AI itself local? Yes - and it is now enforced, not just intended.**
Every chat and agent request goes to a model server on your own machine, and
**Settings → Models → "Keep the AI on this machine"** is on by default: an
address that isn't on this computer or your own network is *refused*, not
warned about. That check runs both when you set the address and when the app
builds its client at startup, so a hand-edited `preferences.json` or a restored
backup can't quietly route your notes somewhere else. Turning the lock off is a
deliberate click, for people who genuinely want a hosted API.

Being precise about what "local" means here, since it's the whole promise -
three things do touch the network, and none of them is your notes:

| What | When | What goes out |
| --- | --- | --- |
| `ollama pull` | You download a model | The model name, to Ollama's registry |
| The embedding model | Once, on first use | A one-off download of `bge-small-en-v1.5` |
| Web search | Only if you turn it on | Your search words - never your notes |

Your notes, your questions, and everything the AI writes about them stay on
your machine in all three cases. Ollama's own hosted service (`ollama.com`)
would not be local, and the lock refuses it like any other remote address.

**Web search is the single exception** to "nothing leaves", and it is off until you turn it on in **Settings → Web search**. When it is on:

- only your search words leave the computer - never your notes;
- requests send an ordinary browser User-Agent rather than one naming this app,
keep no cookies between searches, send no `Referer`, and set DNT and Sec-GPC;
- queries go by POST, so they stay out of request lines and access logs;
- tracking parameters (`utm_*`, `fbclid`, `gclid`, …) are stripped from result
URLs before you ever see them;
- **your own [SearXNG](https://searxng.org) is the recommended engine**, and
MemoryMap installs and runs it for you in one click - no Docker required, no
account, no setup. The query then never leaves your own network at all. The
default setting, *Automatic*, uses it whenever it is running and falls back to
DuckDuckGo until you have one, so search works out of the box either way;
- the results panel says **which engine actually answered** each search, and
what that meant for the query - so the choice you made in Settings is visible
at the moment it applies rather than only where you set it.

**Opening a page** (the reader view, and the agent's `read_url` tool) is
address-checked on *every* redirect hop and then pinned to the address that
passed, so a page that answers "302 → 127.0.0.1" cannot turn "open this link"
into a probe of your own services. Only text comes back: scripts, styles and
page chrome are stripped server-side, so nothing from a third-party page can
execute anywhere in the app.

**Private notes** are encrypted at rest with a key wrapped by your password,
and are excluded from search, the graph and every AI tool - the model cannot
reach around the front door. The key is derived with **scrypt** (n=2^15), a
deliberately slow, memory-hard function, so a copy of the database file taken
off the machine is not worth guessing at.

**The browser on your own machine is treated as untrusted too.** Binding to
localhost keeps the *network* out; it does nothing about a page open in
another tab, which can ask your browser to send requests to
`http://localhost:8000` on your behalf - this is how local dev servers and
Ollama itself have actually been attacked. So:

- requests that state an origin other than MemoryMap's own are **refused**,
including before you have set a password, when there is otherwise nothing
standing between a stray page and your new notebook;
- a strict **Content-Security-Policy** on every response allows scripts and
styles only from the app itself, no inline code, and **no remote host at
all** - which the "no asset from a CDN" rule above makes possible;
- **sessions expire** - after 12 hours unused, and 7 days regardless - and
expiring forgets the private-note key, not just the token;
- **wrong passwords earn a growing wait**, so a four-character PIN cannot be
guessed at speed;
- the SearXNG instance the app runs for you is published to `127.0.0.1` only,
never the wider network.

`.github/workflows/codeql.yml` runs static security analysis on every push and
weekly. [`SECURITY.md`](https://github.com/Braydenh563/MemoryMap-AI/blob/main/SECURITY.md) has the full model and how to report an
issue.

## Troubleshooting

**Windows: "torch_xpu.dll … WinError 127" and search falls back to keywords**

You'll see a banner like *"The specified procedure could not be found. Error
loading …\torch\lib\torch_xpu.dll"*. The app is fine - this is torch's default
Windows wheel shipping an Intel GPU library that can't load on your machine.
MemoryMap only needs the **CPU** build.

**Fresh installs are already handled:** `requirements.txt` installs the CPU-only
torch on Windows.

**Already installed the broken wheel?** Swap it:

```
pip uninstall -y torch
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

Then restart the app.

**Or go torch-free:** in **Settings → Models**, download `nomic-embed-text` and
set it as the embedding backend. It runs entirely through Ollama, needs no
torch at all, and your notes re-index automatically.

**Web search returns nothing, or says DuckDuckGo is rate-limiting**

Scraping DuckDuckGo gets rate-limited, and the app now says so rather than
showing an empty panel. Waiting a few minutes usually clears it.

The real fix is your own SearXNG instance: **Settings → Web search → Start
SearXNG**. MemoryMap installs it (Docker if you have it, otherwise a virtualenv
of its own), configures the JSON API, and points search at it.

**SearXNG won't start, or starts and never answers**

Everything you need is on **Settings → Web search**:

- **The port line** says whether port 8888 is free, held by a working SearXNG
(fine - MemoryMap will just use it), or held by something else (the only case
you have to go and fix).
- **What SearXNG reported** is a fold with the instance's own output - the
actual traceback, not a guess. It's kept in `data/searxng/searxng.log` too.
- **↻ Reinstall** deletes the downloaded copy and its virtualenv and builds a
fresh one. This is the fix when an install was interrupted, or the Python it
was built against has since been upgraded: it *looks* installed and dies
instantly on start. Your `settings.yml` is kept - it holds the instance's
secret key and any edits you made, and it isn't what breaks.

**The header pill / dot says the AI is off**

That's amber, not red, and it's a supported state: the app is built to degrade.
Capture and keyword search work exactly as normal; only auto-filing and chat
answers need Ollama. Red is reserved for a model that failed to load or a
server that can't be reached - rarer, since it needs Ollama to be *reachable
but failing* rather than simply not running.

**Something looks wrong and I want to see what happened**

**Settings → Logs** is a live view of what the app is doing, without hunting
for a terminal. It streams as things happen, follows the newest records (and
pauses the moment you scroll up to read something), filters by level, source
or text, and folds tracebacks open under the record they belong to. Server and
browser logs appear in one time-ordered list, so an error in the page and the
request behind it sit next to each other. It's memory-only - nothing is written
to disk - in keeping with the rest of the privacy posture, and it says so when
the buffer has had to drop older records rather than leaving a silent gap.

**Got an error you want to send someone?** Every record has its own copy button
that takes the traceback with it, and an opened traceback has a **Copy
traceback** button too - so one error is one click, not a filter plus a careful
drag. The error count on the **Logs** menu item is clickable and opens the
screen already filtered to errors. **Copy all** copies what's on screen and
relabels itself ("Copy 12 shown") whenever a filter is hiding something.

**Reporting a bug?** The **⬇ Support bundle** button on the same screen saves a
zip with the log, your settings, and app and model status - the things a bug
report needs. Nothing is sent anywhere; the file goes to your disk and it's
your choice whether to share it. Free-text settings are listed by name and
length only (your display name appears as `str, 31 chars`), and no note,
document, chat or reminder content is included. There's a README inside
describing exactly what it holds.

## Where your data lives

Everything is in the `data/` folder (gitignored):

| Path                    | What                                 |
| ------------------------| ------------------------------------ |
| `data/memorymap.db`     | The SQLite database - all your notes |
| `data/preferences.json` | Your settings                        |
| `data/uploads/`         | Attachments and sketches             |
| `data/backups/`         | Daily local snapshots                |

Point `MEMORYMAP_DATA_DIR` somewhere else to relocate all of it.

**Schema upgrades happen automatically at startup** - new columns are added in
place, your notes are never touched. You do *not* need to delete `data/memorymap.db` when updating.

## Developing

```
pytest                       # ~560 tests, about a minute
ruff check .                 # what CI lints with
node --check frontend/app.js # the frontend is one plain-JS file
```

Tests use a throwaway database and fake every AI call, so they run fast and
fully offline - no GPU, no models, no network.

**They also cannot see the interface.** Every layout and wiring bug found so
far passed a fully green run: a header overflowing its own box by 215px, a
button focusing an element inside a hidden section, an accent picker with no
effect. Drive the app in a browser before believing a frontend change works - [`docs/ARCHITECTURE.md`](https://github.com/Braydenh563/MemoryMap-AI/blob/main/docs/ARCHITECTURE.md) §10 says how, and lists the
layout traps that keep catching people out.

[`CONTRIBUTING.md`](https://github.com/Braydenh563/MemoryMap-AI/blob/main/CONTRIBUTING.md) covers setup and opening a PR.

## Project layout

```
src/memorymap/
├── __main__.py       # entry point: python -m memorymap [--desktop]
├── core/             # config, database + auto-migrator, singletons, backup, logs
├── entry/            # create/read/soft-delete notes + the audit log
├── ai/               # ollama client, janitor, librarian, agent, tools, embeddings, voice
├── search/           # keyword + semantic search, opt-in web search, SearXNG
└── api/              # FastAPI app + 16 routers, one per feature area
frontend/             # vanilla HTML/CSS/JS + PWA - no framework, no build step
tests/                # pytest; every AI call faked
docs/                 # ARCHITECTURE.md and ROADMAP.md
```

## Where it's up to

Phases 1–5 and waves A–P are done: the walking skeleton, the AI, the web
interface, the model manager, the core MVP, then the app shell, agentic tools,
the graph, the platform work (command palette, backups, PWA, web search, sketch
pad), voice and desktop, hardening, and the depth pass (documents, private
notes, search operators, themes).

Everything the previous version of this section listed as "next up" is built:
the agent can start a skill, the graph traces a path between two notes and
supports drag-to-link, the log console follows and filters and exports, and
**the Library tab exists** — one place for notes, documents, chats, files,
tags, the bin and the activity log, with overview tiles, bulk actions and a
grid/list switch.

Since then, in the order they landed: a rebuilt skill system (ordered steps, a
tool allowlist, an undoable result), SearXNG-backed web search, the Timeline
tab, support for any OpenAI-compatible backend (LM Studio, llama.cpp, Jan,
vLLM), answer-length presets, an AI locked to your machine by default, a
**status bar** that owns the foot of the window, **optional extras** you can
install from Settings, and **embedding models** you can see the size of and
remove.

The most recent work is the first time this project has *removed* a surface
rather than added one: the Notes tab's separate Recycle bin, Activity and Tags
panels are gone, because the Library does all three and two implementations of
a bin can disagree about what is in it.

[`CHANGELOG.md`](https://github.com/Braydenh563/MemoryMap-AI/blob/main/CHANGELOG.md) has it wave by wave.

**Next up**, in order — by how much it unlocks, not how contained the fix is.
A backlog audit found three sessions in a row had been extending the newest
UI-polish batch instead of touching the standing backlog underneath it; most
of that corrected list is now done — Arc joined force/tree/radial as a graph
layout, the Timeline has a branch/line view, meeting notes record → transcribe
→ review → save, onboarding reports Ollama reachability, and `markitdown` now
powers a real "import a document as notes" button in Settings → Import &
export. What's left:

1. **Graph layouts beyond force/tree/radial/arc** — a mind map, treemap or
adjacency matrix. Named this project's own differentiator; arc reused the
existing hierarchy machinery, but each of these is a materially different
rendering approach.
2. **Meeting notes' action-item extraction** — the recorder saves a note
today; turning it into structured reminders needs a real model call this
project's own sandbox can't verify against a running Ollama.
3. **`llama-cpp-python` has nothing calling it.** Greyed out in Settings →
Optional extras and says why: it wants wiring into the chat backend beside
Ollama, a new provider plus a GGUF file picker — its own session's worth of
work.
4. **Onboarding's remaining pieces** — offering to pull a model, a data-dir
writability check, example notes for a first-run screen.

[`docs/ROADMAP.md`](https://github.com/Braydenh563/MemoryMap-AI/blob/main/docs/ROADMAP.md) §38 has the reasoning behind each, which is the
expensive part to reconstruct.

## Documentation

| Document                                                                           | What's in it                                                                                                                             |
| ------------------------------------------------------------------------------------| ------------------------------------------------------------------------------------------------------------------------------------------|
| [`docs/ARCHITECTURE.md`](https://github.com/Braydenh563/MemoryMap-AI/blob/main/docs/ARCHITECTURE.md) | The whole project explained: design principles, request lifecycle, data model, the AI stack, and where to look to change any given thing |
| [`docs/ROADMAP.md`](https://github.com/Braydenh563/MemoryMap-AI/blob/main/docs/ROADMAP.md)           | What's outstanding, in order, and *why* each thing matters. Split into `roadmap/BACKLOG.md`, `roadmap/ANALYSIS.md` and `roadmap/HISTORY.md` |
| [`docs/DESIGN.md`](https://github.com/Braydenh563/MemoryMap-AI/blob/main/docs/DESIGN.md)             | The design system — tokens, scales, and the rules new features are written against                                                        |
| [`CONTRIBUTING.md`](https://github.com/Braydenh563/MemoryMap-AI/blob/main/CONTRIBUTING.md)           | Setup, tests, opening a PR                                                                                                               |
| [`SECURITY.md`](https://github.com/Braydenh563/MemoryMap-AI/blob/main/SECURITY.md)                   | The security model and how to report an issue                                                                                            |
| [`CHANGELOG.md`](https://github.com/Braydenh563/MemoryMap-AI/blob/main/CHANGELOG.md)                 | What changed, wave by wave                                                                                                               |

### Operational decisions worth knowing

- **Migrations are additive.** `core/database.py` adds new columns to existing
databases at startup; users never delete their data to upgrade. **Alembic is
deliberately deferred** until a column rename or removal is genuinely needed.
- **SQLCipher is deferred too.** It needs a native dependency on every platform
for a single-user local file. If your notes are sensitive, your OS's disk
encryption (BitLocker / FileVault) protects the whole data folder today, and
private notes are already encrypted individually.
- **CI** lints with ruff and runs the full suite on Python 3.11, 3.12 and 3.13
on every push and PR. It needs no GPU, no models and no network beyond pip.
CodeQL adds static security analysis; Dependabot keeps dependencies current.

## License

Released under the [MIT License](https://github.com/Braydenh563/MemoryMap-AI/blob/main/LICENSE).
