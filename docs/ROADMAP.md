# MemoryMap AI — work plan

Everything outstanding, in the order I'd do it. Written at the end of a long
session so a fresh one can pick up without re-deriving context.

Each item says **why** it matters, not just what to build — the reasoning is
the part that's expensive to reconstruct.

---

## How to work on this repo

- `PYTHONPATH=src python -m pytest` — 402 tests, fully offline, no Ollama needed
- `ruff check .` — matches CI
- `node --check frontend/app.js` — the frontend is one large plain-JS file, so a
  syntax check is worth running after every edit

**Drive the app in a browser before claiming anything works.** Chromium and
Playwright are preinstalled (`/opt/pw-browsers/chromium`). Several bugs this
session were invisible to the test suite and obvious in ten seconds of clicking:
the document editor you couldn't type in, the frozen typing dots, the export
that navigated the app away.

### Traps worth knowing about

1. **Don't guess element ids.** I produced four false bug reports by querying
   selectors that didn't exist and reading the empty result as "broken". Query
   generically — "what became visible after this click?" — or check the id in
   `index.html` first.
2. **The test fakes override more than you expect.** `FakeEmbeddingService`
   overrides `embed_text` wholesale, so a test of the embedding cache passed
   while proving nothing. Check what the fake actually replaces.
3. **Reduced motion kills every animation.** Two blanket rules set
   `animation-iteration-count: 1` on everything. Any animation that carries
   *meaning* (a progress indicator) must have a non-motion fallback, or it
   freezes and reads as a rendering fault.
4. **`git checkout <file>` to undo a bad edit discards everything uncommitted in
   that file.** I lost a finished change that way and only half-restored it.
   Commit before experimenting.

---

More user notes: 
- The background art still wont move
- The keybinds section for keyboard shortcuts is missing. 
- When I click on the notes tab, there is a visual flicker at the bottom of the top menu bar for a second or two
- better structure and visualise the opened page text from web search

- Improve and remake the chat page ui to be impressive and the best it can be??
- I want to improve the document preview md formatting
- I want the web search to be as private as possible. make it untraceable/untrackable
- Make sure that the ai in the chat can read documents and chat history. 
- allow the at to view, manage and create skills.
- Fix the chat page. it is barebones, things like the sidebar arent even the right matching height, there are barely any features and it looks bland. 
- The write with ai function in notes still deletes my original text in the "your thoughts" text box
- a betetr way to manage widgets. also more widgets pls
- Expand the appearences tab and implement an option to sleect from preset and curated visual themes
- Expand on the capabilities of the graph

## 1. The AI can't reach your notes (highest priority)

**The problem.** The model only ever sees what semantic search hands it — five
similarity hits. It cannot answer "how many notes do I have about X", can't work
through a category, and can't be pointed at a specific note. Every other AI
feature is limited by this, so it comes first.

**What to build.** New agent tools in `src/memorymap/ai/tools.py`:

- `get_note(id)` — one note in full
- `list_notes(category=…, tag=…, since=…, limit=…, offset=…)` — paging, so a
  large notebook is walkable rather than truncated
- `search_notes(query)` — the existing keyword search, exposed to the model
  (it's word-based and ranked now, so it's genuinely useful)
- `count_notes(category=…, tag=…)` — cheap aggregate, no content in the response
- `list_categories()` / `list_tags()` already exist; make sure they return counts

**The hard part is context budget, not the tools.** A notebook of 5,000 notes
will not fit in a local model's window. Decisions needed:

- Cap what any one tool call can return, and tell the model the cap was hit so
  it pages rather than silently seeing a truncated notebook
- Return previews (first ~200 chars) for list calls, full text only for
  `get_note`
- Track approximate tokens across a turn and stop adding rather than overflow

**Non-negotiable:** private notes must stay out of every one of these, exactly
as they're excluded from retrieval today. There are tests for this pattern in
`tests/test_private_notes.py` — copy the approach.

### Agent quality, once it can reach things

The loop in `src/memorymap/ai/agent.py` already runs several rounds and several
tools per round, so "do a string of tasks" is structurally there. What's weak:

- No plan/progress shown for a multi-step job — you see tool chips appear with
  no sense of how many steps remain
- No way to stop an agent turn mid-way and keep what it already did
- A tool that fails is reported but the model isn't told how to recover
- `_CLAIM_PATTERN` catches the model claiming it saved something when no write
  tool ran — a good safety net, and worth extending to other claim types

---

## 2. Chat UI

You said it's "very basic and bare bones" next to other AI interfaces. Concretely
missing:

- **Streaming stop/regenerate parity** — Stop exists, but there's no "continue"
  and no branching between regenerated answers
- **Message-level editing of *answers*** (question editing now works)
- **Copy code blocks** — no per-block copy button
- **Conversation search** — no way to find a chat by content, only by title
- **Conversation folders / pinning** — the list is flat and grows forever
- **Token/context usage** shown per conversation, not just per message
- **System-prompt visibility** — you can pick a persona but not see what it says
- **Attachments in chat** beyond notes (images, documents — see §4 and §5)
- **Empty chats can't be deleted** — you reported this; the empty-response fix
  adds a Delete button, but a *conversation* with no turns still needs one

---

## 3. Documents

- **AI chat bar inside the document** — ask it to write or change things in the
  current document, in place, rather than through the edit dialog
- **A real document browser** — the sidebar list is not a gallery; no previews,
  no sorting, no search
- **Attach documents to notes**, and **expand a note into a document** (both
  directions: a note that outgrew itself becomes a document; a document can be
  referenced from a note)
- **Document history** — notes have edit history now (`EntryRevision`);
  documents have none, and the AI edit overwrites on accept
- **Outline / table of contents** from the headings
- **Word-count goal** and reading time

---

## 4. Images

- **Paste an image** into a note or document and have it stored and rendered
- Attachments already exist for notes (`routes_files.py`) — this is mostly a
  paste handler plus rendering, not new storage
- Documents have no attachment support at all yet
- Decide on inline markdown (`![](…)`) vs a separate attachment list; inline
  keeps the export portable, which is the same reasoning behind the markdown
  toolbar

---

## 5. Gallery and archive

- **Gallery** — one place showing stored images, documents and chats, with
  previews. Currently each lives only in its own tab
- **Archive** — a state between "active" and "binned", for things you want out
  of the way but not deleted. Applies to notes, chats and documents
- Worth doing *after* §4, since the gallery is mostly a view over what §4 stores

---

## 6. First-run and empty states

A brand-new notebook shows twelve "nothing here yet" widgets on the dashboard
and empty lists everywhere else. Each individual message is fine; together they
make a working app look broken on the day someone starts using it.

- Dashboard should show a compact getting-started card instead of a grid of
  empty widgets until there's something to show
- The graph, duplicates and history screens all need a first-run state that
  explains what will appear there rather than just saying it's empty
- (Checked: the welcome tour *is* already replayable, from Settings → Help and
  from the features browser. Nothing to do there.)

---

## 7. Accessibility audit

I've added live regions, focus management and keyboard paths piecemeal. It
deserves one deliberate pass rather than more ad-hoc fixes:

- **The graph is mouse-only** — the one tab that fails a keyboard-first test
- Focus traps in overlays are inconsistent (some cycle, some don't)
- Colour contrast unverified against WCAG AA, especially the glass surfaces
- Screen-reader pass over the whole app; several dynamic regions announce
  nothing
- `prefers-reduced-motion` now has a real fallback for the typing indicator, but
  other meaningful animations should be audited the same way

---

## 8. Mobile

Never tested. Everything this session was driven at 1440px. The layout has
breakpoints but they're unverified — the sidebars, the document editor's split
panes, and the graph are the likely problems.

---

## 9. Backend

- **Async httpx Ollama client.** The one large refactor left. It touches the
  streaming path, which is what makes chat feel responsive, so a subtle
  regression here wouldn't show up in tests. Deliberately not started at the end
  of a long session — give it a fresh one.
- **kNN-based janitor filing** — currently the janitor asks the model to pick a
  category; nearest-neighbour over existing embeddings would be faster and work
  offline
- **Alembic migrations** — there's an additive auto-migrator that adds missing
  columns. It cannot rename or drop, and won't survive a real schema change
- **Multi-user / session TTL** — single-user by design today; tokens live in
  memory and never expire

---

## 10. Notes tab structure

Still four stacked cards (Capture, Write with AI, Ask, Browse). The writing room
folds by default so it doesn't add weight, and sections are collapsible — but
sub-tabs would fix it properly rather than mitigating it.

---

## Already done — don't redo

Merged to `main` (PRs #20, #21, #22) or on
`claude/widget-stacking-searxng-lgwn2k`:

**Fixes:** branch merge and the CodeQL work · the reader broken by an autofix
host allowlist · chat answering "hey" with a note dump · message metadata
missing whenever tools were on · Notes sections not collapsing (two
implementations fighting) · only one of five background art styles ever running
· reminder times resolved against UTC · graph popup clipping · misaligned
timestamps · jump-to-note highlight invisible · markdown export navigating the
app away · document editor that couldn't be typed in · empty AI replies with no
error or buttons · frozen typing dots under reduced motion · SearXNG choosing
Docker when the daemon was stopped · writing room destroying your original text
· every note saved without AI being labelled "AI 0% — check this", which
accused perfectly good notes of being suspect

**Features:** documents tab · writing room · note attachments in chat · category
rename/delete · private notes (AES-GCM, envelope design) · note edit history ·
duplicate finder with AI merge · `[[wiki links]]` + autocomplete · rebindable
shortcuts · resizable sidebars · search operators + saved filters · markdown
toolbar · AI cancellation · SearXNG without Docker · WAL + embedding backfill

**Verified working with no AI at all:** all 17 dashboard widgets, all six tabs,
all 11 settings sections. This property is worth protecting — check it after any
AI-adjacent change.
