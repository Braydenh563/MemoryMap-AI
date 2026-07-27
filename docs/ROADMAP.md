# MemoryMap AI — work plan

Everything outstanding, in the order I'd do it. Written so a fresh session can
pick up without re-deriving context.

Each item says **why** it matters, not just what to build — the reasoning is
the part that's expensive to reconstruct.

---

## How to work on this repo

- `PYTHONPATH=src python -m pytest` — 486 tests, fully offline, no Ollama needed
- `ruff check .` — matches CI
- `node --check frontend/app.js` — the frontend is one large plain-JS file, so a
  syntax check is worth running after every edit

**Drive the app in a browser before claiming anything works.** Chromium is
preinstalled at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, but the
Python package is not — `pip install playwright` first. Most of the bugs fixed
in the last session were invisible to the test suite and obvious in ten seconds
of clicking: a header that wrapped on every laptop-sized window, a dropdown that
rendered blank, jump-to-note doing nothing, four different control heights in
one row.

**Installing dependencies in a fresh sandbox:** `download.pytorch.org` is blocked
by the network policy, so `pip install -r requirements.txt` stalls on torch.
Install the non-ML subset from PyPI instead (fastapi, uvicorn, SQLAlchemy,
python-dotenv, requests, numpy, bcrypt, cryptography, python-multipart, pytest,
httpx, ruff), plus `pip install --force-reinstall cffi` — the system
`cryptography` needs a `_cffi_backend` that isn't present by default, and three
test files fail to collect without it.

### Traps worth knowing about

1. **Don't guess element ids.** Query generically — "what became visible after
   this click?" — or check the id in `index.html` first.
2. **The test fakes override more than you expect.** `FakeEmbeddingService`
   overrides `embed_text` wholesale, so a test of the embedding cache passed
   while proving nothing. Check what the fake actually replaces.
3. **Reduced motion kills every animation.** Any animation that carries
   *meaning* (a progress indicator) needs a non-motion fallback, or it freezes
   and reads as a rendering fault.
4. **`git checkout <file>` to undo a bad edit discards everything uncommitted in
   that file.** Commit before experimenting.
5. **A POST response can lie about stored state.** SQLAlchemy returns the object
   still in memory, so a serialisation bug only appears on the next read from
   disk. The UTC timestamp bug hid behind exactly this — assert on the LIST
   response, not the create response.
6. **Later CSS with equal specificity silently wins.** `position: relative` on
   `#chat-sidebar`, declared 600 lines later for the resize handle, quietly
   un-stuck a `position: sticky` rule. When a style "doesn't apply", grep for
   the property rather than re-declaring it.
7. **The Notes tab is sub-tabbed.** Anything that scrolls to a note must call
   `showNotesSection("browse")` first, or it scrolls to an element inside a
   `display: none` section and appears to do nothing.
8. **Check `main` before building.** Two sessions independently built web-search
   privacy, curated colour sets, and notebook-access tools. Merging them cost
   more than coordinating would have.
9. **The test suite cannot see any of the above.** Every UI bug listed below
   passed 480+ green tests.

---

## Done recently — don't redo

**Bugs fixed** (each reproduced and verified in a browser):

| Symptom | Actual cause |
| --- | --- |
| Settings screens cut off, unscrollable | Modal grid row sized to content, so the scroll pane grew past the dialog and was clipped |
| Page scrolled behind open dialogs | No scroll lock; now one observer derives it from whichever overlay is visible |
| Dashboard empty until Edit layout was opened and cancelled | `switchTab` runs before auth, so widgets painted from 401s and never retried |
| "Thinking… Thinking about your week…" | `typingDots()` renders its own label under reduced motion; the caller appended a second |
| Agent answers arrived in one lump | The loop called the non-streamed `chat_tools` — the default chat path was the only one that didn't stream |
| No metadata when tools were used | The meta line was gated on prose existing |
| Couldn't switch search engines "early" | The picker lived inside the Ollama-only block, including the built-in option that needs no Ollama |
| Movement dropdown blank | `bg-motion` missing from `APPEARANCE_DEFAULTS`, so the value was `undefined` |
| "Ask about this" did nothing | It prefilled text for a model that cannot open a URL; now backed by a real `read_url` tool |
| Top bar out of alignment | Header wrapped at every width 720–1400px; after the first fix, clipped "Reminders" from 900–1300px |
| Jump-to-note dead from search, graph, wiki links | `flashEntry` scrolled to a card inside a `display:none` sub-tab |
| Ask query disappeared | The box was cleared on submit, leaving an answer with nothing saying what it answered |
| Reminder controls misaligned | Four different heights (44/42/41/40px), so "centred" gave four different tops |
| Chat + document sidebars scrolled away | A later ID rule set `position: relative`, outranking the sticky rule |
| **Reminder 5 min ahead read as 10 hours overdue** | SQLite drops the timezone; JS parses naive date-times as *local*. Fixed with a UTC-aware column type covering every table |

**Features added:** 10 curated themes layered over `main`'s 7 palettes
(`your change → theme → default`, with separate "reset theme" and "clear my
changes") · Settings → Account with password change (`vault.rewrap` existed and
was called by nothing) · `--reset-password` CLI · agent step timeline
(thinking → tool → tool → answer, persisted with the turn) · `read_url` tool ·
Agent mode rename · split date/time reminder fields with presets, ±15m/±1d
nudges and a plain-English readout · auto-growing capture and magic-add boxes ·
jump-to-note after capture · name nudge on the dashboard ·
`start-desktop.bat` / `./start.sh --desktop`

**Security/privacy:** the User-Agent named the app to every site searched or
read — now a common browser string, no cookie jar, no Referer, DNT/Sec-GPC,
POST so queries stay out of request lines, tracking params stripped from result
URLs. DNS-rebinding hole in the reader closed by pinning the validated IP on
each redirect hop. Six `except: pass` blocks around embeddings now log, so a
broken backend is visible instead of silently shrinking search.

**CodeQL triage** (from the alert list the user shared): the two Critical SSRF
alerts are inherent to the reader feature and already guarded — the one real gap
was the DNS-rebinding TOCTOU, now closed. Log injection is handled by sanitising
at the buffer. The rest (cyclic imports, empty excepts, unused global) are code
quality, and the assert-with-side-effect ones were real test bugs, now fixed.

---

## 1. Live log console (started, not finished)

**Why.** Asked for directly: the Logs screen should read "like the terminal
running in the background, with key errors flagged", not a list you refresh by
hand.

**What exists.** `core/logbuffer.py` is a 500-record ring buffer attached to the
root logger and uvicorn's. It now sanitises each message to one printable line
(so a chat question or a page title can't forge a row) and keeps tracebacks in a
separate `trace` field for a fold.

**What's left.**

- Stream `/logs` while the section is open — an EventSource endpoint is cleaner
  than polling, and the app already streams NDJSON elsewhere
- Follow/tail mode with autoscroll, pausing the moment the user scrolls up
- Level filter (all / warnings / errors) and a text filter
- Render the `trace` field in a fold under its record
- Merge the browser-side `browserLogs` ring buffer into the same view, tagged by
  source, so one screen answers "what just happened"
- Count errors since the screen was last opened and badge the nav item

---

## 2. Quick wins

Small, self-contained, each removing a visible annoyance:

- **SearXNG install path.** `preferred_backend()` returns Docker if the binary
  exists, else source (which needs `git`). With neither, "download SearXNG"
  can't proceed at all — that is what "I can't download searxng" means. Add a
  `pip install searxng` path so no-Docker-and-no-git still works, and show
  install progress in the UI instead of raising it as an error toast.
- **Notes sidebar sticky**, matching chat and documents (same pattern, same
  `--header-h` offset).
- **Empty chats can't be deleted** — a conversation with no turns has no delete
  affordance.
- **Copy button per code block** in chat answers.
- **Conversation search** by content, not just title.
- **Document outline / table of contents** from the headings, plus word-count
  goal and reading time.

---

## 3. Chat page: Chat / Agent / Browse sub-tabs

**Why.** Asked for directly. The page mixes three activities in one column, and
the web panel is bolted on top of the message list.

**Shape.**

- **Chat** — plain grounded Q&A
- **Agent** — tool-calling with its own controls: which tools are allowed this
  turn, max rounds, visible plan/progress, and a stop that keeps what it already
  did
- **Browse** — web search results, reader view, page history

Cross-linking is the point: the agent hands a page to Browse, Browse hands a page
to the chat. Web-search gating should be independent — a Browse-only mode where
the section works even when the chat/agent `web_search` tool is off.

**On the "in-built browser".** In the browser-served app this can only be an
`<iframe>`, and most sites send `X-Frame-Options`/`frame-ancestors` that refuse
to load in one — it would fail on exactly the sites worth opening. Proxying and
rewriting pages server-side is effectively writing a browser, and re-introduces
every tracker the privacy work removed. So the reader view stays the web path,
and a genuine embedded browser belongs in the desktop shell, whose webview can
navigate anywhere. **This ties §3 to §7.**

---

## 4. Library tab: chats, documents, images, archive

**Why.** Asked for directly. Everything that isn't a note lives only in its own
tab, and there is no archive at all.

**Order matters — images first, since the gallery is a view over what they
store:**

1. **Image support.** Paste or drop an image into a note or document. The
   `attachments` table and `routes_files.py` already store files, so this is
   mostly a paste handler plus rendering. Decide inline markdown (`![](…)`) vs a
   separate attachment list — inline keeps exports portable, the same reasoning
   behind the markdown toolbar. Documents have no attachment support at all yet.
2. **Archive.** A state between "active" and "binned", for things you want out
   of the way but not deleted. Applies to notes, chats and documents: one
   `archived_at` column per table, an additive migration.
3. **Library tab.** One place showing stored images, documents, chats and
   archived items, with previews, sorting and search.

---

## 5. Documents

- **AI chat bar inside the document** — ask it to write or change things in
  place, rather than through the edit dialog
- **A real document browser** — the sidebar list is not a gallery
- **Attach documents to notes**, and **expand a note into a document**
- **Document history** — notes have `EntryRevision`; documents have none, and the
  AI edit overwrites on accept
- **Outline / table of contents**, word-count goal, reading time

---

## 6. OpenAI-compatible backends (LM Studio, llama.cpp, Jan, vLLM)

**Why.** Asked for directly. LM Studio serves an OpenAI-compatible API on
`http://localhost:1234/v1`, and so do llama.cpp's server, Jan, vLLM — and Ollama
itself. **One provider gets all of them**, rather than an LM Studio special case.

**Shape.** Generalise `ai/ollama_client.py` into a provider interface. This is
real work, not a URL swap: the streaming shape and the tool-call shape both
differ from Ollama's. Provider + base URL configurable in Settings → Models,
with capability detection for tools and streaming, so a backend that can't do
tool calls degrades to plain Q&A exactly as a tool-less Ollama model does today.

Best done together with the async-httpx refactor in §10 — both rewrite the same
client, and doing them separately means touching the streaming path twice.

---

## 7. Desktop packaging

**Why.** Asked for: "run as a professional product".

**Recommendation: not Electron.** The app is Python + static files; Electron
would bundle a second runtime (~150 MB) and a Node toolchain to deliver what
`--desktop` already does in-process via pywebview, and Python would still need
shipping alongside it. Alternatives weighed: Tauri and Wails (Rust/Go shells,
tiny binaries, but neither solves shipping Python), Neutralino (immature), plain
PWA (already supported via `manifest.webmanifest` + `sw.js`).

**Plan.** Harden the existing pywebview mode — single instance, native menus,
tray, graceful port fallback when 8000 is taken, first-run flow — then
PyInstaller one-file builds for Windows/macOS/Linux. pywebview's webview is also
where the genuine embedded browser from §3 becomes possible.

---

## 8. Open bug list (reported, not yet fixed)

Every one of these was seen in the running app. Reproduce before fixing —
several earlier "bugs" turned out to be a different component moving underneath
the one being blamed.

**Chat rendering**

- ~~**Numbered lists always render `1.`**~~ FIXED. A blank line between items
  closed the `<ol>`, and models write "1.\n\n2.\n\n3." far more often than
  they write it tightly, so every item started a new list at 1. A blank line now
  only ends a list if what follows isn't another item of the same kind, and an
  `<ol>` keeps its starting number.
- ~~**Assistant content too far right / rail overlap**~~ FIXED. The rail padded
  each step's own box, so the `<details>` marker and the tool chips sat on top
  of the circles; the container now has a gutter of its own. Long URLs get
  `overflow-wrap: anywhere` so they stay inside the bubble.
- **The thinking disclosure arrow and the tool-use boxes overlap the agent
  timeline's circles and connector line.** The rail was added with
  `padding-left: 1.15rem` on step children; `<details>` draws its own marker in
  that space. Give the rail its own gutter rather than padding the children.
- **Thinking boxes vanish on reload.** NOT yet fixed — reading the code did not
  reveal it, so reproduce first. They *are* saved (`steps` carries
  `{kind:"thinking"}`, and `timeline.replay` handles that kind). Suspects, in
  order: turns saved before `steps` existed fall back to `message.thinking`;
  `serialise()` reads `holder.children` and could miss a step; or the turn is
  never persisted because `chatConv.id` was still null. Log what
  `GET /conversations/{id}` actually returns before changing anything.
- **A long URL breaks out of the chat bubble on the right.** Needs
  `overflow-wrap: anywhere` on bubble content.

**Web search / reader**

- **Web search returns nothing in some environments** — pages won't show up.
  Reported as working under the hosted Python desktop environment, which
  strongly suggests egress/proxy differences rather than parser breakage.
  Diagnose by logging the actual HTTP status and body length from
  `_search_duckduckgo` before assuming the parse failed. DuckDuckGo also
  rate-limits and occasionally serves a challenge page to non-browser clients;
  if that is what's happening, SearXNG (§2) is the real fix, not a parser tweak.
- **"Ask about this" wrecks the layout**: the page renders very wide, forces a
  long horizontal scrollbar, and scales everything up. Almost certainly the
  reader's `<pre>` blocks and long unbroken strings escaping their container.
  Constrain the reader/answer width and let code blocks scroll inside
  themselves.
- **Improve the extracted page's visual rendering** generally — it now carries
  heading levels, so it can be laid out as a real document (typographic scale,
  measure capped around 70ch, blockquotes, lists, code).

**Appearance**

- **Switch search engines at will.** Still reported as not freely switchable.
- **With a theme or palette selected, the individual colour/font controls below
  sometimes can't be changed.** Suspect the layering: a manual write may be
  landing but being immediately re-derived from the theme. Reproduce by picking
  a theme, then a font, then checking `localStorage` and the computed value.

**Elsewhere**

- ~~**Documents show "Invalid Date"**~~ FIXED, and it was a regression from the
  UTC timestamp fix: `relativeTime` did `iso + "Z"` unconditionally, so once
  timestamps carried `+00:00` it built `"…+00:00Z"`. There were also *two*
  `relativeTime` definitions, one shadowing the other — the dead one is gone and
  parsing now lives in a single `parseServerTime`.
- ~~**Dashboard "Search notes" goes to the wrong place**~~ FIXED — it focused a
  box inside the hidden "browse" sub-tab, the same trap `flashEntry` hit.
  **Still to do:** audit the remaining quick-access buttons the same way.
- ~~**Capture textbox short until clicked**~~ FIXED. `autoGrow` measured
  `scrollHeight` while the section was `display:none` (always 0);
  `showNotesSection` now re-measures once the section is visible.
- **Desktop app: the menu-bar buttons overlap the "MemoryMap AI" title.** The
  pywebview window is narrower than the breakpoint that hides the wordmark.
- **Sketches don't open from the graph** when their node is clicked.

---

## 9. The graph — make it a tool, and give it a look

**Why.** Asked repeatedly: "expand on the capabilities of the graph", "more
utility and ways to use and visualise my notes", "it's still kinda plain — it
needs more life and design style". `main` made it keyboard-operable; it is still
a plain force-directed blob that doesn't fill its own panel.

**Visual identity — offer several map styles**, not one:

- **Galaxy / starfield** — categories as spiral arms, notes as stars sized by
  access count, links as faint filaments. The dashboard's "notebook
  constellation" widget already proves the aesthetic works.
- **Sea chart** — islands per category, notes as landmarks, links as shipping
  routes, unlinked notes adrift. Parchment palette pairs with it.
- **Subway map** — orthogonal edges, categories as lines. Best for dense,
  heavily-linked notebooks.
- **Mind map / radial tree** — one note at the centre, everything else by hops.
- Plain force-directed stays the default; the rest are a picker.

**Fit and framing.** It should size to its panel and re-fit on resize, with
zoom-to-fit, zoom controls, and a minimap for large notebooks.

**Utility it still lacks:**

- Filter by category, tag or date range; double-click to focus a neighbourhood
- **Paths between two notes** — the question a graph is uniquely good at
- Cluster detection, with "name this cluster" handed to the AI
- Orphans and hubs surfaced explicitly
- Create a link by dragging one node onto another
- Timeline scrub — play the notebook's growth
- PNG/SVG export of the current view
- A `related_notes(id, depth)` tool so the model can walk links, not just
  similarity

---

## 10. Timeline tab, and time-aware notes

**Why.** Asked for directly, and it is the most substantial new idea in the
backlog. Notes say "today", "yesterday", "last week", "two days ago" — phrasing
that is correct when written and misleading forever after. Today nothing records
what those phrases *resolved to*.

**Two halves, and the first is worth doing alone:**

**A. Resolve relative time at capture.** When a note is saved, extract temporal
expressions and store the absolute date each one resolved to, alongside
`created_at`. Then:

- Show it inline — "yesterday" with the real date on hover, or a subtle chip
- Tag notes that contain relative time, so they're findable as a class
- Let the AI answer "what did I mean by *last week* in that note?" correctly
- Let it suggest actions on stale ones ("this said 'tomorrow' three weeks ago —
  did it happen?")

Do the extraction with a deterministic parser first (`reminder_parser` already
does something similar for reminders) and only fall back to the model, so it
works with Ollama off.

**B. A Timeline tab.** An event tree of what has happened, is happening, and
will happen:

- Notes place themselves on it by their resolved dates, not just creation date
- Reminders and their completion appear as events
- The AI can add events, and link notes to them
- Past / present / future as one continuous view, zoomable from days to years
- Branches for parallel threads, since "everything that is, has, and will
  happen" is a tree, not a line

**Data shape:** a new `events` table (`title`, `at`, `precision`, `kind`,
`entry_id?`, `source`), plus `entry_dates` for resolved expressions. Both
additive.

---

## 11. Performance, accuracy and AI efficiency

**Why.** Asked: "make sure all the code, processes, and AI usage is fully
optimised and efficient", and "more ways to make the program and AI more
accurate, usable, capable, and faster".

**Measure first** — there is no profiling in the repo, so where a chat turn
spends its time is currently a guess.

- **Prompt reuse.** Every agent round resends the whole message list; Ollama's
  `keep_alive` and prompt-prefix reuse are never set.
- **Cap tool output.** Return previews by default, full text only on request.
- **Hybrid retrieval** (semantic + keyword, reciprocal-rank fusion) — a
  well-established accuracy win, and the keyword search already exists.
- **Re-ranking** with a small cross-encoder over the top-20, behind a setting.
- **Batch embeddings** — the backfill embeds one note at a time.
- **Warm the model** so the first chat doesn't pay the load cost.
- **Frontend**: `app.js` is ~12k lines parsed on every load, and
  `renderEntries` rebuilds the entire list on any change.
- **Context warning** as the window fills — the per-turn cost is already shown.

---

## 12. Does the AI know it is an agent?

**Why.** Asked: "does it know it is an agent and can use tools and skills freely
and in multiple turns if necessary?" and later, "I need agents to use tools more
and better if they are required."

**Honest answer: partly.** `TOOLS_GUIDE` says tools exist and forbids claiming a
save that didn't happen. The loop runs to `MAX_ROUNDS = 6`. What it is *not*
told:

- That taking several rounds deliberately is expected — plan, act, check, answer
- That skills exist at all (the tools are there; the prompt never mentions them)
- What to do when a tool fails — the error is returned with no guidance, so
  small models give up or repeat the same call
- That a search snippet is rarely enough and `read_url` exists
- What the user can already see (the step timeline), so it stops re-narrating

**Add:** an explicit `plan` step rendered at the top of the timeline; a
"required tools" hint for requests that clearly need one; and a nudge when the
model answers a notebook question without having searched.

---

## 13. Web search effectiveness

- **Query expansion** — two or three phrasings, results fused
- **Read before answering** — tell the model a snippet is rarely enough
- **Cite sources** with the domains actually read
- **Per-turn result cache**
- **SearXNG as the recommended default** once §2's install path works — better
  results *and* better privacy than scraping DuckDuckGo HTML, and likely the
  real fix for the "no results" bug in §8

---

## 14. More tools worth adding

`create_document` / `edit_document` (the AI can read documents but not write
them) · `related_notes(id, depth)` (§9) · `move_notes` (bulk re-file) ·
`merge_notes` · `export_notes` · `find_similar(note_id)` · `stats` ·
`add_event` / `list_events` (§10) · `set_preference` over a small allowlist so
"make your answers shorter" works.

---

## 15. Appearance: more of everything

Asked for: "more options for the appearances — fonts, colours, sizing, themes,
palettes."

- **Fonts**: beyond system/serif/mono — a curated set including a dyslexia-
  friendly face, plus per-surface choice (UI vs note body vs code)
- **Sizing**: independent UI scale and reading size; line-height and measure
  (line width) controls, which matter more for long notes than font size
- **Colours**: per-surface accents, a custom palette builder (pick a base,
  derive the set), and import/export of a palette as JSON
- **More themes and palettes**, and a "surprise me" that generates a coherent
  one
- **Live preview** while hovering a theme, before committing
- Fix the reported bug where individual controls resist change under a theme
  (§8)

---

## 16. Sweeping UI quality-of-life

- **Undo toasts** for anything soft-deleted, instead of confirm dialogs
- **Optimistic UI** — a saved note appears instantly and reconciles
- **Consistent empty states** and loading skeletons
- **Keyboard**: `/` focuses search, `g`+letter jumps tabs, Escape closes every
  overlay
- **Bulk selection** in the note list
- **"What changed" after an AI action** — chips say what ran, not what it did
- **Confirm on close** with unsaved text
- **Relative timestamps** everywhere, absolute on hover
- **Dashboard**: audit every quick-access button actually lands where it says,
  and add the ones that are missing (§8 has one confirmed wrong)

---

## 17. Use cases the app can't serve yet

- **Meeting notes** — record/transcribe into a note (Whisper is already a
  dependency), extract action items into reminders. Highest-value single
  addition.
- **Reading and research** — the Browse section (§3) plus highlights saved as
  notes back-linked to their source
- **Journalling** — a daily-note pattern; the pieces exist, nothing ties them
- **Task management** — reminders are not tasks (no sub-tasks, projects, or
  "someday"). Commit to it or stay deliberately out.
- **Study / revision** — spaced repetition; access-count and embeddings are
  already stored
- **Sharing one note or document** — no export-one-thing path today
- **A second device** — single-user by design; sync is a much larger decision
  and should be stated as out of scope rather than left implied

---

## 18. Agent quality

The registry is now 28 tools and reaches the whole notebook, documents and chat
history. What's still weak:

- No plan/progress for a multi-step job — the step timeline shows what happened,
  not what remains
- No way to stop an agent turn mid-way and keep what it already did
- A tool that fails is reported, but the model isn't told how to recover
- `_CLAIM_PATTERN` catches "I saved it" when no write tool ran — worth extending
  to other claim types

---

## 19. Accessibility audit

Deserves one deliberate pass rather than more ad-hoc fixes:

- Focus traps in overlays are inconsistent (some cycle, some don't)
- Colour contrast unverified against WCAG AA for the *new* palettes and themes,
  particularly the glass surfaces
- Screen-reader pass; several dynamic regions announce nothing
- Audit remaining meaningful animations for `prefers-reduced-motion` fallbacks

---

## 20. Backend

- **Async httpx client** — touches the streaming path, which is what makes chat
  feel responsive, so a subtle regression wouldn't show up in tests. Do it with
  §6.
- **Alembic migrations** — the additive auto-migrator cannot rename or drop, and
  won't survive a real schema change
- **Session TTL** — tokens live in memory and never expire

---

## Answers to questions already raised, so they aren't re-asked

**Is it one user per app?** Yes. One `users` row, one bcrypt password, gating
every route. Separate notebooks are separate `MEMORYMAP_DATA_DIR`s, not separate
accounts.

**Forgot password?** Two different answers. Ordinary notes are *not* encrypted by
the password — they are plain SQLite rows and come back untouched, via
`python -m memorymap --reset-password`. Private notes *are*: their key is derived
from the password, so without it nobody can recover them, including that command.
The UI and the command both say so before you commit. No backdoor was added, on
purpose.

**Does the AI use my name in the greeting?** Yes, when `display_name` is set in
Preferences. The AI-written path weaves it in about 75% of the time
(`NAME_USE_CHANCE`); the handwritten fallback path always appends it. It was
empty by default and buried among a dozen fields, which is why it looked like
the feature didn't exist — the dashboard now offers to set it once, then stops
asking.

**Themes vs palettes?** Palettes own colour only (7, each with a matched light
and dark set). Themes own everything else — light/dark, font, density, radius,
glass — and *select* a palette rather than carrying colours of their own. They
had to be reconciled: both were writing the accent, and `[data-palette]` rules
come later in the stylesheet, so a theme's colour silently lost.

**Open question for the user:** two pickers on one screen may still be one too
many. The alternative is folding them into ~15 complete looks. Left split,
because "same layout, different colours" is a real thing to want — worth
confirming.
