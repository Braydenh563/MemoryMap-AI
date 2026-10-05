<div align="center">

<img src="frontend/icon-512.png" alt="MemoryMap AI" width="120">

# MemoryMap AI

**A notebook that files itself. Local AI, your machine, nothing sent anywhere unless you ask.**

[![CI](https://github.com/Braydenh563/MemoryMap-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/Braydenh563/MemoryMap-AI/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Braydenh563/MemoryMap-AI/actions/workflows/codeql.yml/badge.svg)](https://github.com/Braydenh563/MemoryMap-AI/actions/workflows/codeql.yml)
[![Latest release](https://img.shields.io/github/v/release/Braydenh563/MemoryMap-AI)](https://github.com/Braydenh563/MemoryMap-AI/releases/latest)
[![Python](https://img.shields.io/badge/python-3.11%20%7C%203.12%20%7C%203.13-blue)](pyproject.toml)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-green)](LICENSE)

</div>

---

Type a thought. A local model files it, tags it and links it to what you
already wrote. Ask a question later and get an answer beside the notes it
came from, sentence by sentence, so you can check it. Everything runs on
your own computer: no account, no cloud, no telemetry. Your notes are one
SQLite file in a folder you control, and the whole app works with no model
running at all.

```
capture a thought
  -> Atlas files it
  -> ask a question
  -> an answer, with the notes behind it
```

<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="The dashboard in the dark theme: a greeting with the note count, reminders and capture streak, a search box, quick actions, and widgets for reminders, recently added notes, favourites, quick capture, boards and recent documents" width="850">
</p>

<p align="center">
  <img src="docs/screenshots/notes.png" alt="Notes: the categories down the left with their counts, and note cards newest first, each with its category, tags and the notes it links to" width="850">
  <br><sub><b>Notes</b>: captured, filed into a category, tagged and linked to what they relate to</sub>
</p>

<p align="center">
  <img src="docs/screenshots/ask.png" alt="Notes, Ask: the question What do I still need to book for Portugal, an answer naming the train tickets and the hire car with a numbered citation after each sentence, and the matching notes beside it" width="850">
  <br><sub><b>Ask</b>: a question to your own notes, answered with a numbered citation to the note behind each sentence</sub>
</p>

<p align="center">
  <img src="docs/screenshots/chat.png" alt="Chat: a saved conversation about a product launch, the answer as a numbered list with citations, the notes it was grounded in, suggested next questions, and the composer with skills, web search, plan and agent mode" width="850">
  <br><sub><b>Chat</b>: ask in plain English, with skills, web search, a plan step and agent mode beside the box</sub>
</p>

<p align="center">
  <img src="docs/screenshots/graph.png" alt="Graph: seventy-five notes as a map coloured by category, with a dense cluster of work notes, a dense cluster of trip notes, a looser web of reading and recipes, a training plan with its branches, and loose notes on their own" width="850">
  <br><sub><b>Graph</b>: dense clusters, loose webs and notes on their own, coloured by category; a link with a reason is drawn in the accent</sub>
</p>

<details>
<summary><b>Sixteen more screenshots</b>: the Library and its Activity view, Timeline, Reminders, Documents and focus mode, a board, a mind map, the command palette, Tools and features, Settings, Your look, the popup agent, the corner companion, light and dark side by side, and a phone</summary>
<br>

<p align="center">
  <img src="docs/screenshots/library.png" alt="Library: chats, boards, mind maps, documents and notes as cards in one grid, with a filter chip per kind and its count" width="850">
  <br><sub><b>Library</b>: everything you have made, in one place</sub>
</p>

<p align="center">
  <img src="docs/screenshots/activity.png" alt="Library, Activity: one line per thing you did, newest first: when, what was done, and the detail" width="850">
  <br><sub><b>Activity</b>: a record of what you did, one line each, beside what you made</sub>
</p>

<p align="center">
  <img src="docs/screenshots/timeline.png" alt="Timeline: notes and reminders in a feed with a header per day, each row with its category, tags and time, and a density strip down the right" width="850">
  <br><sub><b>Timeline</b>: every note and reminder on a time axis</sub>
</p>

<p align="center">
  <img src="docs/screenshots/reminders.png" alt="Reminders: a magic add box, a form with date, time, priority and repeat, quick set steppers, and the list of open reminders, each linked to the note it came from" width="850">
  <br><sub><b>Reminders</b>: due dates with priority and repeats, linked to the note they came from</sub>
</p>

<p align="center">
  <img src="docs/screenshots/documents.png" alt="Documents: a launch brief open in the editor, with headings, a bulleted list and a table, the recent documents beside it and the word count below" width="850">
  <br><sub><b>Documents</b>: a long-form editor with Live, Source, Split and Read views; it reopens where you left off</sub>
</p>

<p align="center">
  <img src="docs/screenshots/focus.png" alt="Documents in focus mode: the page alone under a slim bar, with the writing suggestions panel open beside it" width="850">
  <br><sub><b>Focus mode</b>: the page and nothing else, with the writing checks beside it when you want them</sub>
</p>

<p align="center">
  <img src="docs/screenshots/whiteboard.png" alt="A board: a banner, coloured cards in two columns, and a release flow of shapes with text inside them, joined by connectors labelled yes, no and after a week" width="850">
  <br><sub><b>Boards</b>: cards, shapes that hold text, and connectors that carry a label</sub>
</p>

<p align="center">
  <img src="docs/screenshots/map.png" alt="A mind map of a trip, laid out both ways from the root: numbered branches, topics that are tasks with ticks and a done count on their parent, and a mark on the topics that hold a note" width="850">
  <br><sub><b>Mind maps</b>: numbered branches, topics that are tasks, and a note behind any topic</sub>
</p>

<p align="center">
  <img src="docs/screenshots/palette.png" alt="The command palette: the word launch matching notes, a document, a board and reminders at once, with a preview of the chosen note" width="850">
  <br><sub><b>Command palette</b>: Ctrl/⌘-K reaches a command, a note, a document, a file or a board</sub>
</p>

<p align="center">
  <img src="docs/screenshots/features.png" alt="The Tools and features browser: a search box over grouped rows, each naming one thing the app can do" width="850">
  <br><sub><b>Tools &amp; features</b>: everything the app can do, grouped and searchable</sub>
</p>

<p align="center">
  <img src="docs/screenshots/settings.png" alt="Settings, Appearance: thirteen themes as swatches, with saved looks below and the section list on the left" width="850">
  <br><sub><b>Settings</b>: thirteen themes, your own accent, type, density and corners, and every setting searchable</sub>
</p>

<p align="center">
  <img src="docs/screenshots/your-look.png" alt="Settings, Profile, Your look: the face drawn from the name Maya, Shuffle, and a picker for each part: look, mood, hair, hair colour, skin, clothes, headwear, eyewear and what you hold" width="850">
  <br><sub><b>Your look</b>: a face drawn from your name, and every part of it yours to choose</sub>
</p>

<p align="center">
  <img src="docs/screenshots/agent.png" alt="The popup agent over the Notes tab: Atlas beside the title, the box to ask it to do something, and starters grouped by Capture, Find, Summarise and Remind" width="850">
  <br><sub><b>Popup agent</b>: ask Atlas to do something from any tab</sub>
</p>

<p align="center">
  <img src="docs/screenshots/companion.png" alt="Chat with Atlas as the corner companion, settled beside a saved conversation" width="850">
  <br><sub><b>The corner companion</b>: Atlas, you, a persona or a character of your own, keeping you company on any page</sub>
</p>

<p align="center">
  <img src="docs/screenshots/theme-split.png" alt="The dashboard, the left half in the light theme and the right half in the dark theme, split down the middle" width="850">
  <br><sub><b>Light or dark</b>: every theme comes in both, or follows your system</sub>
</p>

<p align="center">
  <img src="docs/screenshots/phone.png" alt="The Notes tab at phone width in the dark theme: one column of note cards, a New note button and the tab bar along the bottom" width="390">
  <br><sub><b>On a phone</b>: one column, the tabs at your thumb</sub>
</p>

</details>

## Contents

- [Get started](#get-started)
- [What it does](#what-it-does)
- [Meet Atlas](#meet-atlas)
- [The AI, and life without it](#the-ai-and-life-without-it)
- [Your data](#your-data)
- [Documentation](#documentation)
- [Developing](#developing)
- [Status](#status)
- [Licence](#licence)

## Get started

Three ways in. None needs a terminal.

**Windows.** Download `MemoryMap-AI-Setup-*.exe` from the
[latest release](https://github.com/Braydenh563/MemoryMap-AI/releases/latest)
and run it. The app opens in its own window.
[What the SmartScreen prompt means](docs/INSTALL.md#windows-installer).

**Linux.** Download `MemoryMap-AI-*-linux-x86_64.tar.gz` from the same page,
`tar -xzf` it and run `MemoryMap AI`. Needs GTK and WebKit (`python3-gi` and
`gir1.2-webkit2-4.1`, or your distribution's equivalent). A `.zip` of the
same build is there too, but prefer the tarball: a zip does not reliably
carry the executable bit, and some archive managers unpack the launcher
without it, which leaves you with a file that will not start and no
explanation.

**The first launch downloads the search model.** Search by meaning and
filing by meaning use a built-in model that needs the `sentence-transformers`
package. If it is not installed yet, the app installs it by itself the first
time it needs it: a one-time download of several hundred MB (more on
Windows, where it brings torch), which needs the internet and can take
several minutes. Settings, Models, Search engine says when it is running.
Offline, or rather not? Install [Ollama](https://ollama.com), run
`ollama pull nomic-embed-text`, and pick it there instead.

**macOS, or from source on any platform.** Clone the repository and run
`./start-desktop.sh` (on Windows, double-click `start-desktop.bat`), or
`./start.sh` for a browser tab. The launcher builds a private Python
environment, installs everything and opens the app. `--doctor` on either
one checks the machine and prints a table with a fix per row. A
step-by-step version for first-time terminal users is in
[docs/INSTALL.md](docs/INSTALL.md).

Add the AI afterwards: install [Ollama](https://ollama.com) and pull a
model that fits your machine. Which one, from "runs on a laptop with no
GPU" upwards, is in [docs/MODELS.md](docs/MODELS.md). Any OpenAI-compatible
server works too: LM Studio, llama.cpp's `llama-server`, Jan, vLLM.

## What it does

**Capture.** Type, paste, dictate (local Whisper) or draw. The AI picks a
category by meaning, or asks you in guided mode, and says which. Free text
can be split into separate, auto-linked notes. Notes take Markdown inline,
including `[[wiki links]]`, `~~strikethrough~~` and `==highlights==` in
six colours. Quick note (`Alt`+`N`, or the palette) opens over any tab and
saves without leaving it; `#word` in the text tags the note. A note saved
while the server is away is kept on this device, shown in the list as
"Waiting to save" and sent by itself when the server is back, once.

**Ask.** A question returns a conversational answer and the notes behind
it, side by side, with each sentence linked to the note it came from. Chat
is saved and resumable. In Agent mode the assistant has 65 tools to
search, link, organise and act on your notebook; anything destructive
asks first, any change or web request after it has read a web page or a
clipped or imported note asks first too, and every step it takes is shown.

**Keep it tidy.** Each note shows how sure the filing was and the tags it
suggested, one press to keep each (with no AI they come from your own tags
on the notes most like it). Manage categories creates, renames, merges,
splits and deletes categories and moves notes between them, each step
undoable; a tag manager does the same for tags, and a category chip moves
its note in one click. Anything the AI can change, you can change by hand.

**See the shape of it.** The Graph draws your notes as a map, coloured by
category and linked by meaning, with the reason for each link written
down; dense clusters, loose webs and notes on their own each keep the
shape their links give them. The Timeline puts every note and reminder on
a time axis. The Dashboard shows your capture streak, statistics, a weekly
digest and whatever widgets you choose.

**Write at length.** Documents is a long-form editor with Live, Source,
Split and Read views, a formatting toolbar, spelling and style checks you
can click on, version history, focus mode, and code files with line
numbers. A document reopens where you left it: the caret and the place
you were reading.

**Think on a canvas.** A board holds cards, sketches, images and shapes on
a pannable surface. A shape holds text, and a connector can carry a label
("yes", "no"), so a flowchart reads on its own. The board's sidebar holds a
library of shapes, flowchart symbols, arrows, frames and 1,530 icons beside
your own saved pieces, with Layers and Pages (the frames, in presentation
order); a Format panel sets exact place, size, angle, opacity and shadow,
and an elbow connector turns at right angles round the shapes it joins. In
Agent mode the assistant can draw shapes, place library items, and move,
edit or delete what is on a board, asking first. A board can be a **mind
map**: a root topic with branches you grow by hand or from your notes (Tab
adds a child, Enter a sibling, Ctrl+D copies, Ctrl+Z restores a deleted
branch). A topic can be a task with a box to tick, and every topic above it
counts what is done; a topic can hold a note behind it; View, Number the
branches numbers them 1, 1.1, 1.2. Maps export as Markdown, OPML or
FreeMind, tasks and notes included.

**Keep everything in one Library.** Notes, documents, chats, boards, files,
tags, bookmarks (a reading list with Unread and Pinned filters), a Contents
tree of documents and their headings, the AI skills page, the recycle bin
and the activity log. Every image you add is read three ways where each is
available (a caption, a vision-model transcription and Tesseract OCR), all
editable, all searchable. Attach any file to a chat message: images go to a
vision model, and documents, spreadsheets, PDFs and code are imported with
their text extracted. Scanned PDFs are read page by page by an OCR model,
and the OCR workspace lets you check and correct each region before it
becomes a note.

**Remember.** Reminders with priority, repeats and snooze, or type "call
Sam tomorrow evening" and let the AI schedule it.

**Automate.** 21 built-in skills (and your own) run multi-step jobs over
the notebook as a visible checklist, one step at a time, with each tool
call shown. An optional background librarian tags, links and flags
duplicates on a schedule you set. It never deletes anything. Every
background job shows when it last ran and how it went, beside its control
and in Settings, Background tasks.

**Faces for everyone.** Every person and persona gets a small drawn
character read from their name (a mood word, an animal, a costume), and
Settings, Profile, Your look lets you shuffle yours or choose every part:
hair, skin, clothes, headwear, eyewear, what you hold.

**Sign in, or don't.** The notebook asks for its password when it opens, by
default. On a computer only you use, Settings, Account and security can turn
that off: the app opens straight in on this computer, another device on your
network still needs the password, and private notes stay encrypted until you
unlock them.

**Says what went wrong, plainly.** Every error is a sentence that says what
happened and what to do ("No installed model can read images. Install or
pick one in Settings"), never a status code or a field name; the raw text
goes to Settings, Logs.

**Quick to open.** Each stylesheet and script is compressed once per
version and kept on disk, so a start fetches the app in a few milliseconds
a file rather than compressing it again.

Built to be reached by keyboard and screen reader: one main landmark per
tab, named controls, 4.5:1 contrast, a layout that holds at 200% and 400%
zoom, and a switch for single-key shortcuts (WCAG 2.1.4).

Also: a command palette (`Ctrl`/`Cmd`+`K`), a popup agent, read-aloud,
opt-in web search, thirteen themes, each in light or dark,
interface zoom, a guided tour of the real controls, and daily local backups.

## Meet Atlas

<p align="center">
  <img src="docs/screenshots/atlas.png" alt="Atlas, delighted: a small astral figure on a night-sky tile, eyes closed in a wide smile with rosy cheeks and two sparkles, a ring of orbiting stars round its head and a nebula stream curling round its body" width="260">
</p>

<p align="center"><b>The star spirit who keeps your notebook.</b></p>

Atlas files every note you write, answers your questions from your own
notes with the source behind each sentence, and answers "how do I" from the
app's own help. Turn on the corner companion and it keeps you company on any
page, reacting to what you do and dozing when you leave it alone.

## The AI, and life without it

MemoryMap is built around a local model, and built to work when there is
none. With no model running, notes are filed as Uncategorised, search
uses full-text matching with stemming and spelling correction, and every
other feature keeps working. A dot in the header always says what the AI
is doing.

- **Any local model.** Ollama by default; any OpenAI-compatible server by
  setting a URL. Settings > Models shows the sampling parameters and
  starts each at the value the model's own file recommends.
- **A model per feature, if you want one.** Chat, Write with Atlas, the
  documents assistant and the Guide each run on the chat model until you
  give one of them a model of its own, from Settings > Models or from that
  surface's own menu. One button hands them all back.
- **Small models are first-class.** Skills and tool use have a small-model
  mode that gives a 4B model one step and one tool at a time, with
  recovery when it skips a step.
- **Search by meaning** is optional and off by default. Turn it on and
  questions match ideas rather than words, using a local embedding model
  through Ollama.
- **Settings > Packages** installs the optional pieces from inside the app,
  none of them needed for the core: dictation (faster-whisper), the desktop
  window (pywebview), search by meaning (sentence-transformers), scanned PDFs
  (pypdfium2), document import (markitdown), Word export (python-docx), text
  in images (Tesseract OCR), running Python files (Pyodide), and tool calling
  with no model server running (needle, telemetry forced off). The last two
  are pinned downloads checked against a sha256, and work offline once
  installed.

## Your data

Everything lives in one folder: `memorymap.db` (your notes), `preferences.json`,
`uploads/` (attachments and sketches) and `backups/` (daily local
snapshots). Set `MEMORYMAP_DATA_DIR` to put it somewhere else. Export to
JSON, CSV or Markdown from Settings at any time.

Nothing leaves your machine unless you ask it to. The server binds to
localhost, the AI is confined to your own network, web search is off by
default and sends only your search words, and private notes are encrypted
at rest with a key derived from your password. The full model, including
session expiry, the CSRF and CSP protections and what to do if you forget
your password, is in [docs/PRIVACY.md](docs/PRIVACY.md). To report a
vulnerability, see [SECURITY.md](SECURITY.md).

## Documentation

| Document | What it answers |
| --- | --- |
| [INSTALL](docs/INSTALL.md) | The Windows installer, the launcher script, manual setup, updating and uninstalling |
| [MODELS](docs/MODELS.md) | Which model to pick for your machine, and using a backend other than Ollama |
| [PRIVACY](docs/PRIVACY.md) | What touches the network and when, private-note encryption, session security |
| [TROUBLESHOOTING](docs/TROUBLESHOOTING.md) | The common problems and their fixes |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | How the pieces fit: request lifecycle, data model, the AI stack, where to change any given thing |
| [DESIGN](docs/DESIGN.md) | The design system every screen is written against |
| [ROADMAP](docs/ROADMAP.md) | What is open, in order, with the reasoning |
| [CHANGELOG](CHANGELOG.md) | What changed, release by release |
| [CONTRIBUTING](CONTRIBUTING.md) | Setup, tests and opening a pull request |
| [SECURITY](SECURITY.md) | How to report a vulnerability |

## Developing

```
pytest                          # 6,700+ tests, about ten minutes on four cores (-n auto), fully offline
bash scripts/gate.sh --changed  # the routine local gate: lints, node --check, ruff, the tests that name your files
ruff check .                    # what CI lints with
node --check frontend/js/app.js    # the frontend has no build step: check each file you touch
```

The frontend is 64 plain scripts in `frontend/js/` that share one global
scope: 37 load at boot in the order `frontend/index.html` lists them, the
rest on first use; the app's own boot code is `app.js` and the 24 files after
it, one 50,000-line file until 0.3.3.
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) says how load order and the
lazily loaded tabs work.

Tests use a throwaway database and fake every AI call, so they need no
GPU, no model and no network. They also cannot see the interface, so a
frontend change is driven in a real browser before it is called done;
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) says how.

```
src/memorymap/
  __main__.py     entry point: python -m memorymap [--desktop]
  core/           config, database and migrations, backups, logs, crypto
  entry/          notes: create, read, link, soft-delete, the audit log
  ai/             model clients, filing, the agent and its tools, skills, embeddings, voice
  search/         full-text and semantic search, opt-in web search
  api/            the FastAPI app, one router per feature
frontend/         plain HTML, CSS and JavaScript (scripts in js/), served as-is, no bundler
tools/            developer tools for tuning the characters (source checkouts only)
tests/            pytest, every AI call faked
docs/             user documentation, architecture, design system, roadmap
```

Migrations are additive by default: a new column is added the next time
the app opens an older database. Alembic is wired in behind that for the
day a rename or drop is needed. CI runs ruff, CodeQL and the full suite on
Python 3.11 to 3.13 on every push.

## Status

Version 0.3.32. Capture, chat with checkable answers, the graph, documents,
boards and mind maps, the OCR workspace, private notes and themes are
built and stable, with desktop builds for Windows and Linux. New in this
release: Atlas has a body and a second look, a companion keeps you company
on every page, and signing in is optional on your own computer. Since then,
on the way to the next one: shapes that hold text and labelled connectors on
boards, tasks, notes and numbered branches in mind maps, documents that
reopen where you left them, faster starts, and error messages in plain
sentences.

A guided tour (Settings, then Help) walks through the basics one step at a
time. What changed is in [CHANGELOG.md](CHANGELOG.md); what comes next is in
[docs/ROADMAP.md](docs/ROADMAP.md).

## Licence

[GNU Affero General Public License v3.0](LICENSE).

You may use, study, modify and share this, and anything built on it must
stay under the same licence, including a modified copy run as a network
service. That last clause is why the AGPL was chosen: MemoryMap is a
local-first app, and the licence keeps a closed, hosted version of it from
being offered back to the people it was written for.
