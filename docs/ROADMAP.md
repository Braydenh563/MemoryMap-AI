# MemoryMap AI — work plan

Everything outstanding, in the order I'd do it. Written so a fresh session can
pick up without re-deriving context.

Each item says **why** it matters, not just what to build — the reasoning is
the part that's expensive to reconstruct.

## Do these next, in this order

Re-prioritised after a round of use. The ordering is by *how often it gets in
the way*, not by how interesting it is to build.

1. ~~**Skills are not skills** (§21)~~ **rebuilt, and running one is a job
   now.** A skill has ordered steps, a tool allowlist and declared inputs;
   `save_skill` takes steps and tools, so "make me a skill that files my inbox
   notes" has somewhere to put them. Running one executes **a step per turn**,
   ticking each off, naming the step that failed, and ending in a list of what
   changed with an Undo on each. The allowlist is both the safety property and
   the §11a win: a run offers its own tools instead of all 28 (1,963
   characters of schema instead of 10,215). What is left is small — see §21.
2. **Web search still returns nothing** (§8b). **Two causes found and fixed
   this session, both Windows-only, both reported by the user rather than
   found in the log** — see §8b. The install error (`does not appear to be a
   Python project`) and "started but never answered" were the same class of
   mistake: a POSIX idiom that does something else on Windows. Unverified on
   Windows itself — the sandbox is Linux — so the next session should confirm
   with the user before assuming this one is closed.
3. **Token usage in chats** (§11a). Asked directly: "is there a way to reduce
   excessive token usage in the chats?" A 3-turn chat is showing 8.7k tokens.
   The history and the retrieved notes are resent whole on every turn.
   *Measured since:* the fixed overhead alone — system prompt plus all 28 tool
   schemas — is ~3,050 tokens per round, and 77% of that is the schemas, not
   the prose. `agent.PROMPT_BUDGET_CHARS` now caps it and a test enforces the
   cap. ~~The remaining win is offering fewer tools per turn~~ **done, both
   halves.** A skill run offers only the tools it declared (1,963 characters
   of schema rather than 10,215); an ordinary turn is now read for what it
   plausibly needs (`tools.focus_for`), which takes the *fixed* overhead of a
   typical question from ~3,157 tokens to ~1,439. **What is left here is the
   variable half**: the retrieved notes and the history are still resent
   whole on every turn, and nothing has measured which of those dominates a
   real 3-turn chat. Log the prompt-token count per round before cutting.
4. ~~**Markdown rendering for notes** (§22)~~ **done.** Inline only — bold,
   italic, `code`, strike — because `renderMarkdown`'s block elements make a
   note list enormous, which is the problem §22 itself flagged. Wiki links and
   filter highlighting both still work inside emphasis. The dashboard's little
   note lists *strip* the markers instead, since they clip at ~70 characters.
5. ~~**Note timeline** (§10)~~ **both halves built.** Relative time is
   resolved at capture (`entry/timewords.py` → `entry_dates`) and there is a
   **Timeline tab**: a time axis across, bands down the side (category, tag or
   none), and every note plotted at what it is *about* where it says so —
   "the beans need netting next week" sits on that week, marked 🕓 — and at
   when it was written otherwise. What is left is in §10: an `events` table so
   the bands can be events and places rather than only categories and tags.
6. ~~**A hero header on the dashboard** (§22)~~ **done** — emblem and wordmark
   inside the greeting card, hidden below 720px.

**Where this session got to.** Items 1–6 above are all closed. The body
sections below are the backlog now, and the ones with the most left in them
are §9 (the graph's *utility* — paths between notes, clusters, drag-to-link;
the layouts are done), §1 (the live log console), §3 (Chat/Agent/Browse
sub-tabs) and §4 (the Library tab). §5's "attach documents to notes" is done
— see below.

> **Check the running app before building anything here.** This document
> describes intent, and it drifts. An audit of §2 found four of its six "quick
> wins" already built — the sticky sidebar, the per-code-block copy button,
> conversation search by content, and the whole document outline with word
> count and reading time. §5 and §18 each had a completed item still listed as
> outstanding. Three sessions have now independently rebuilt something that
> already existed. Items verified against the code are marked ~~struck
> through~~ with what was found; anything not marked is worth ten seconds of
> grep first.

---

## How to work on this repo

- `pytest` — 560 tests, fully offline, no Ollama needed (`pytest.ini` sets
  `pythonpath = src`, so this works without an editable install)
- `ruff check .` — matches CI
- `node --check frontend/app.js` — the frontend is one large plain-JS file, so a
  syntax check is worth running after every edit

Three of those tests are guards rather than features, and are the ones most
likely to fail on you without you having broken anything visible:

- `tests/test_frontend_ids.py` — duplicate element ids, and `$("…")` lookups
  with no matching element. Two elements sharing `persona-prompt` is what made
  "Add Persona" silently throw.
- `tests/test_prompt_budget.py` — the agent's fixed per-round overhead. If you
  add a tool, this is what tells you it cost something. See §11a.
- the pre-paint theme table in `index.html` drifting from `THEME_PRESETS`.

**Drive the app in a browser before claiming anything works.** Chromium is
preinstalled at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, but the
Python package is not — `pip install playwright` first (do *not* run
`playwright install`; the browser is already there). Launch the context with
`service_workers="block"`, or `sw.js` serves a cached `app.js`/`style.css` and
you will be looking at a page that does not contain your change.

Two things make this much faster than it sounds:

- Top-level functions in `app.js` are plain globals, so `page.evaluate` can
  call `switchTab`, `applyThemePreset` or `renderEmbeddingPicker` directly.
  That turns "does this picker stick?" into a five-line test.
- **Assert on measured geometry, not screenshots.** `scrollWidth - clientWidth`
  found a 2145px overflow and then proved it gone; sweeping widths in 20px
  steps found a header that overflowed itself at every size between 740 and
  1400px. A screenshot shows one width and invites you to squint at it.

Every UI bug in §8 passed a fully green test run.

**A working driver script**, if you want to skip re-deriving one — unlock,
dismiss onboarding, then drive:

```python
page.goto("http://localhost:8000", wait_until="networkidle")
page.wait_for_timeout(800)
if page.locator("#lock-overlay").is_visible():        # NOT #unlock-password
    page.fill("#lock-password", "…"); page.click("#lock-submit")
    page.wait_for_timeout(2500)
if page.locator("#onboarding-overlay").is_visible():  # blocks every click
    page.click("#onboarding-skip")
```

Start the server with `MEMORYMAP_DATA_DIR` pointed at a scratch directory so
you never drive the real notebook. Use the app's own `apiJson` inside
`page.evaluate` rather than raw `fetch` — auth is an `X-Auth-Token` header,
not a bearer token, and a hand-rolled fetch just 401s.

**Installing dependencies in a fresh sandbox:** `download.pytorch.org` is blocked
by the network policy, so `pip install -r requirements.txt` stalls on torch.
Install the non-ML subset from PyPI instead (fastapi, uvicorn, SQLAlchemy,
python-dotenv, requests, numpy, bcrypt, cryptography, python-multipart, pytest,
httpx, ruff), plus `pip install --force-reinstall cffi` — the system
`cryptography` needs a `_cffi_backend` that isn't present by default, and three
test files fail to collect without it.

**There is no general outbound network in the sandbox** — the proxy refuses
anything not explicitly allowed, so you cannot verify a new search-engine
scraper, or anything else that talks to a third-party site, against the real
thing. Don't ship one you couldn't test.

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
10. **CSS automatic minimum sizing is the usual cause of a wide page.** A `1fr`
    grid track and a `min-width: auto` flex item both refuse to shrink below
    their content. `overflow-x: auto` on the child does nothing until every
    ancestor has an explicit floor. This one bug produced three separate
    reports before it was understood.
11. **A POSIX idiom can mean something else on Windows, silently.** Two bugs
    in one module: `os.kill(pid, 0)` terminates the process on Windows rather
    than asking about it, and `shutil.rmtree(ignore_errors=True)` cannot
    delete a read-only file there, so it half-deletes the tree and reports
    success. Both ran on every settings-screen poll. The user runs Windows;
    the sandbox does not, so nothing here reproduces either one.
12. **A control that "does nothing" is usually working.** Four reported cases,
    three of which wrote correctly and were then overridden — by CSS source
    order, by a status poll repainting from the server, or by living in a
    hidden section. Check the *computed* result, not the handler.

---

## Done in the most recent session — read this first

Newest at the top. Everything here is on `main` (or the branch merging into
it), verified, and must not be rebuilt.

**Skills are jobs now, not saved sentences (§21, the top item).** Steps, a
tool allowlist, declared inputs, and a plan drawn in the timeline before
anything runs. `save_skill` takes steps and tools, so the AI can write a real
one. The built-ins moved from `app.js` to `ai/skills.py` and are served from
`GET /skills`.

**And running one is a job, not a paragraph.** `ai/skill_runner.py` executes
one step per turn, so the app knows where it got to: steps tick off as they
finish, a failed step is named with its reason and stops the run, and the run
ends in a list of what changed with **View** and **Undo** on each row. The
undo is a tool call captured before the write and replayed through
`POST /chat/tools/execute`. Every built-in was rewritten as a real job with
steps and declared inputs, asked for in one dialog before the run.

Driven in Chromium: chips load from the server, the editor saves and refuses
a bad skill by name, the input dialog refuses a blank required field, steps
tick and a failure shows its reason, Undo really undoes it, the whole run
replays after a reload, 0px of horizontal overflow, no page errors.
**Don't redo:** the skill schema, the runner, the allowlist plumbing, the
editor, the plan/step/result UI.

**SearXNG installs and runs.** Five separate bugs, three of them fatal on
every OS and none of them visible in the log, because they all happened
before SearXNG wrote a line: the repository cannot be checked out on Windows
(four filenames contain a colon), `pip install -e .` cannot build it at all
(its setup.py imports a runtime dependency), a plugin downloads a file at boot
and kills the process if that fails, `os.kill(pid, 0)` terminates the process
on Windows instead of checking it, and `rmtree(ignore_errors=True)` leaves a
git checkout half-deleted there while reporting success. Verified end to end
here — installed, started, answered its JSON API, passed the app's own probe.
Full write-up in §8b. **The two Windows-specific fixes are unverified on
Windows** — ask the user.

**Web search has its own settings screen now.** It was four controls two
thirds of the way down Preferences, which is why every error message saying
"Settings → Web search" pointed at a screen that did not exist. It is now
`settings-websearch`, listed under "The AI" in the nav, with a real engine
picker: `auto` / `searxng` / `duckduckgo`, stored as the `search_provider`
preference. **"SearXNG only" does not fall back** — that fallback was wrong
for the one person who most wants SearXNG, someone running it so their
queries stay on their own network. The provider list is served from
`GET /websearch/providers` rather than written out in `app.js`, so the radios
cannot offer something the API rejects, and both the HTTP route and the
agent's `web_search` tool read it through `websearch.settings_from(config)`.

**SearXNG is now debuggable, which it was not.** Its stdout and stderr went to
`DEVNULL`, so "SearXNG started but never answered. Check the port isn't in
use." was a guess, and the same guess every time. Output now goes to
`data/searxng/searxng.log`, the tail is quoted in the failure and shown in a
fold on the settings screen. Alongside it: a **port answer** (free / held by a
working SearXNG / held by something else — only the last is the user's
problem) and a **↻ Reinstall** button, because a part-finished install makes
`source_installed` say yes while the process dies instantly, and there was no
way back short of deleting folders by hand.

`_reason()` also stopped reporting pip's parting "[notice] To update, run:
… --upgrade pip" as the cause of every failed install. It took the *last*
line; that notice is always last.

**The CodeQL alert list is closed**, and two of the thirteen were real:

- The SearXNG *search* path resolved the hostname to check it and then handed
  the hostname to `requests`, which resolved it again — the DNS-rebinding
  window the reader path closed months earlier, still open here. The probe
  pinned; the search that followed it did not. Both now go through one
  `websearch._searxng_target`.
- `execute_tool` could not tell a message a handler wrote from whatever
  `int("abc")` happened to say, so stray exception text reached the model and
  the UI. Handlers now raise `tools.ToolError`; everything else is logged and
  reported by shape.

The rest were quality: log injection (`logbuffer.safe_value` at the call site
— `sanitise` only ever ran at the ring buffer, so the terminal saw raw text),
three `except: pass` blocks that now say what failed, the
model_manager↔embeddings and deps↔embeddings cycles (a `Protocol` and moving
`store_quietly` to `deps`), and a test asserting `"example.com" in label`.

**There is now a prompt budget.** `agent.PROMPT_BUDGET_CHARS` caps the system
prompt plus all tool schemas, and `tests/test_prompt_budget.py` enforces it.
Measured: ~3,050 tokens per round, **77% of it tool schemas, not prose**. This
matters because Ollama defaults to a 4096-token window and overflow is dropped
from the *front* — so a 3B model that overflows stops knowing it has tools,
and reports as "the AI won't use tools". See §11a.

**Also done:** a favicon that survives 16px (the old one was drawn at 100 and
had no background, so its white nodes vanished on a light tab strip), plus a
maskable icon and PNG fallbacks; inline markdown in the note list (§22); the
emblem and wordmark on the dashboard (§22); a full README rewrite.

**Don't redo:** the README, the favicon/icon set, the web-search settings
screen, the engine picker, the SearXNG port/reinstall/log work, the prompt
budget, note markdown, the dashboard hero.

---

## Done in earlier sessions — don't redo

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

The whole of §8's reported bug list has since been closed as well — see that
section for what each one turned out to be.

**Fixed in the session after that**, each reproduced in Chromium first:

| Reported as | What it actually was |
| --- | --- |
| The thinking arrow clashes with the chain circles | `list-style-position: outside` draws the `<details>` marker *outside* the summary's box — exactly where the rail's gutter is. No gutter width could clear it; the native marker is now removed and redrawn inside the summary |
| "MemoryMap AI" is gone from the top bar | Twice my own doing: I moved the hide breakpoint (1390, then 1080) instead of fixing why it hid. `h1` had `flex: 0 1 auto` + `min-width: 0` with `white-space: nowrap`, so the box shrank below the text and the name printed over "Dashboard" — the original overlap report. Now `flex: 0 0 auto`, visible to the 720px mobile breakpoint |
| "Add Persona" does nothing | Two elements shared the id `persona-prompt` — the Chat tab's peek panel `<div>` and the Settings `<textarea>`. `getElementById` returns the first without complaining, so the handler read `.value` off a div and threw |
| The categories sidebar looks awkward | `.category-actions` was `opacity: 0` but still in the flow, so every category row reserved width for invisible buttons and the "All" row, which has none, did not — the counts marched in and out down the list |
| Web search returns nothing, silently | Three different failures (no egress, a rate-limit challenge page, a genuine empty result) all surfaced as an empty list. Now logged and named separately — confirmed working in use |

**Also added:** the AI status dot — four states now (… grey checking, ✓ green,
! amber, ✕ red). The header pill that spelled the state out
in words is now a coloured circle with a glyph (✓ green / ! amber / ✕ red) and
the sentence on hover, focus or click. It reclaimed the 17.5rem the pill's slot
reserved, which is why all six tabs now fit beside the wordmark at 1200px
without scrolling. Amber, not red, is the state for "no AI at all": this app is
built to degrade gracefully, so running without Ollama is supported rather than
broken, and colouring it red would train you to ignore the indicator. Red is
kept for a model that failed to load or a server that can't be reached.

**Also added:** the Lagoon and Shallows themes (an indigo ground with a teal
accent, dark and light), recovery advice on every failed tool call, and a
prompt that tells the agent multiple rounds are expected. Guard tests now
catch duplicate element ids, `$("…")` lookups with no matching element, and
the pre-paint theme table drifting from `THEME_PRESETS`.

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

Small, self-contained, each removing a visible annoyance.

**Four of these were already done** — checked in the running app rather than
assumed, since three sessions have now rebuilt something that already existed:

- ~~**SearXNG install path**~~ done. Not the `pip install searxng` this section
  suggested: SearXNG doesn't publish to PyPI, so that name is somebody else's
  package. git is only needed to *fetch*, and pip can download and unpack the
  source tarball itself — so it clones when git is there and uses the tarball
  when it isn't. Install progress was already polled and shown inline.
- ~~**Notes sidebar sticky**~~ done — the rule already exists, once, above the
  section that used to duplicate it.
- ~~**Copy button per code block**~~ done, in chat answers.
- ~~**Conversation search** by content~~ done — `conversation_matches` decodes
  the message JSON rather than LIKE-ing the column, so "tent" no longer matches
  every chat by way of the word `content`.

**Still open:**

- **Empty chats can't be deleted.** Saved chats do have a delete action, and
  deleting the last turn deletes the conversation — so this is only about the
  *unsaved* chat in the main pane, which has no affordance but "+ New". Worth
  confirming what was actually meant before building anything.
- **Document outline / table of contents** from the headings, plus word-count
  goal and reading time. The one genuinely unbuilt item here; see §5.

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

Checked against the running app, not assumed:

- ~~**Outline / table of contents**, reading time~~ **done.** `renderDocOutline`
  builds a TOC from `#`–`####`, correctly ignoring a `#` inside a code fence,
  hides itself under two headings, and each entry puts the caret on that line.
  `renderDocStats` shows words and reading time at 220 wpm. Verified in a
  browser: a 461-word document reads "461 words · 2 min read" with four
  correctly-nested headings.
- ~~**Expand a note into a document**~~ **done** — leaves the note untouched
  and says so.
- **Word-count goal** — the one unbuilt part of the outline item. A target you
  set, with progress against it.
- **AI chat bar inside the document** — partly there. `doc-ai-panel` already
  edits a selection or the whole document and shows the result as a proposal.
  What's missing is the *conversational* shape: ask a question about the
  document without it proposing an edit.
- **A real document browser** — the sidebar list is not a gallery
- ~~**Attach documents to notes**~~ **done.** Asked for directly: "a way to
  link documents to new notes I create in the capture tab… the documents and
  notes sections and features need to be more integrated together." The
  capture box has an *Add to document* picker, so the connection is made while
  it is obvious rather than after the note is buried in a list; the note card
  carries a 📄 chip that opens the document; the document lists the notes it
  draws on, each with a detach button. `document_links` is its own table
  because the relationship is many-to-many and neither side owns the other —
  detaching removes a connection, never a note, and binning a note takes it
  out of the document's list on its own.

  Asked again straight afterwards — *"also what about adding a document to a
  note??"* — because a capture-time picker only helps the notes you have not
  written yet, and the ones that turn out to belong to a document are usually
  the old ones. **📄 Add to a document** in a note's ⋯ menu picks from the
  documents that note is not already on, and the × on its 📄 chip detaches it
  from the note's side. Both directions now use the same two routes, so there
  is one behaviour to reason about rather than two.
- **Document history** — notes have `EntryRevision`; documents have no
  equivalent table, and the AI edit overwrites on accept

### Asked for this session, not yet built

A round of use produced four requests about documents at once, and they are
one direction rather than four features: *"I want the documents to be more
like using Obsidian or Notion."* Ordered by how much each one gets in the way.

- **A mini AI chat bar in the document editor.** Asked for directly: *"a mini
  chat bar on the documents page to request the ai to do stuff, like write
  something, edit something specific (the whole document or current selection
  etc)."* This is the biggest of the four and the closest to already existing:
  `doc-ai-panel` edits a selection or the whole document and shows the result
  as a proposal, so the *editing* half is built. What is missing is the
  **conversational** half — a bar you type an instruction into, in place, that
  can either answer about the document or propose an edit to it, and that
  keeps the thread of what you have already asked. Two decisions to make
  before building it: whether it shares `/chat`'s conversation store (a
  document's thread is about the document, so probably its own), and whether
  an instruction with a selection active always means "edit this" (it should
  — ambiguity there is what makes an AI editor feel unpredictable).
- **Upload a file as a document, attached to a note.** Asked as *"I want to be
  able to upload a document to a note"*. Distinct from `📎 Attach a file`,
  which stores a blob against the note and gives you back a download: this
  would take a `.md` or `.txt`, make it a real Document with its text in the
  editor, and link it to the note in one step. The pieces exist — `/files`
  ingests uploads, `/documents` creates, `document_links` joins — so this is
  mostly a route that does the three together, plus deciding what to do with a
  `.docx` or a PDF (probably: refuse politely rather than half-convert).
- **Obsidian/Notion editing.** The editor is a `<textarea>` with a preview
  beside it. What people mean by this request, roughly in order of how much
  each is missed: `[[wiki links]]` between documents (notes already have them
  — the parser is in `renderNoteText`), a `/` command menu at the cursor,
  drag-and-drop images that land as markdown, backlinks ("what links here"),
  and live-preview editing where the markup renders in place instead of in a
  second pane. The last one is the one that would change the feel and also the
  one that means giving up the textarea — worth doing deliberately, and last.
- **Documents on the graph and the timeline.** Asked as *"docs should also
  probably show on the graph and timeline"*. Both views are built around
  `Entry` and would need a second node/point kind. The design question is not
  technical: a document is not a note, and drawing it as one would say the
  wrong thing. On the graph it wants its own shape and to sit where its notes
  are (it is a hub over them, which is exactly what `document_links` records);
  on the timeline it wants to be a band or a marker rather than a dot, because
  a document is written over weeks and a note happens at a moment.

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

## 8. Open bug list

- ~~**Picking a theme did nothing about half the time**~~ **fixed.**
  Appearance has three layers — defaults, the chosen theme, your manual
  tweaks — and `appearancePref` reads them in that order, manual first. That
  is right for a tweak made *after* choosing a theme and wrong for every theme
  chosen afterwards: one earlier change to the palette or the mode sat on top
  of each new theme and silently cancelled that part of it, and with a few
  stored a theme could change nothing visible at all. Picking a theme now
  clears the manual keys *that theme has an opinion about* — so Lagoon drops a
  stored palette and mode but leaves a font size it says nothing about — and
  clears the custom accent with the palette, since an accent picked against
  one palette has no meaning against another.
- ~~**Lagoon and Shallows needed refining**~~ **done.** Shallows was asked for
  as "a teal light one" and was drawn mostly indigo, so its ground and its
  accent pulled against each other; the page is aqua now and the indigo
  survives as the cooler of the two blobs. Lagoon's `--inner` was 5% white,
  which made every inset panel identical to the card it sat in, and `--muted`
  was low enough to grey out secondary text; both lifted, and the page
  gradient runs greener at the bottom so the teal accent reads as lit from
  inside the water rather than printed on it.
- ~~**Background tasks showed nothing while SearXNG started**~~ **fixed.**
  Reported twice — "I still don't think the bg tasks is working". The list was
  right about installs and wrong about the case the user was actually
  watching: a *start* is not an install, it runs in the request thread, and it
  waits up to `START_TIMEOUT` (90s) for the service to answer. That is the
  longest silence in the app from the outside and it was the one thing not on
  the screen built to explain silences. `searxng_manager.starting()` now
  reports it, with the seconds waited against the timeout as a progress bar.
- ~~**The AI emblem was cramped, and only on two tabs**~~ **fixed.** It was
  put inside the Notes and Chat sidebar headings, wedged between a title and a
  button — too big for the row, differently placed on each, and five more tabs
  would have meant five more of those decisions. It has one home now, in the
  header beside the AI status dot, which is what it is about: on screen for
  every tab, one size to get right, and the first thing to drop when the
  header runs out of room on a narrow window.
- ~~**The dashboard's widgets are missing until you switch tabs**~~ **fixed.**
  Reported as *"initially when I load up the app the dashboard widgets are
  missing until I refresh or change tabs and go back on it again"*. `startApp`
  fired `loadEntries` and `refreshActiveTab` as two independent steps, so on a
  cold load the dashboard rendered against an `allEntries` that was still `[]`
  and drew its brand-new-notebook card — which is correct for an empty
  notebook and wrong for one that has simply not arrived yet. The tab render
  now waits for the entries, and the empty-state card is gated on a flag that
  says the fetch has actually happened, because "empty" and "not loaded" are
  indistinguishable from a length alone.


Every reported bug in this section has been reproduced in Chromium and fixed.
What follows is kept as a record of *what each one actually was*, because in
most cases the stated symptom pointed at the wrong component and the wasted
effort is the expensive part to repeat.

**Fixed, with the real cause**

| Reported as | What it actually was |
| --- | --- |
| Numbered lists always render `1.` | A blank line between items closed the `<ol>`, and models write `1.\n\n2.` far more often than tightly |
| Assistant content too far right | The rail padded each step's own box instead of the container |
| Thinking arrow sits on the timeline circles | `list-style-position: outside` draws the marker *outside* the summary's box — exactly where the rail's gutter is, so no gutter width could clear it. Native marker removed and redrawn inside |
| Thinking boxes vanish on reload | Not reproducible. Verified in a browser: live, three-round, and after a real reload the steps round-trip intact. The report predates the step-timeline work that fixed it |
| A long URL escapes the chat bubble | `overflow-wrap: anywhere` on bubble content |
| Documents show "Invalid Date" | A regression from the UTC fix: `relativeTime` appended `"Z"` to a timestamp already carrying `+00:00`. Two definitions existed, one shadowing the other |
| Dashboard "Search notes" goes nowhere | Focused a box inside the hidden `browse` sub-tab |
| Capture textbox short until clicked | `autoGrow` measured `scrollHeight` while the section was `display: none` |
| "Ask about this" wrecks the layout | CSS automatic minimum sizing: a `1fr` grid track and a `min-width: auto` flex item both refuse to shrink below their content, so one wide code block widened the column, the page and every paragraph beside it. 3425px wide at a 1280px viewport |
| Desktop menu-bar buttons overlap the title | The tab strip was pinned at a rigid 579px because a base rule 70 lines below the media query redeclared `flex` at equal specificity. Nothing could yield, so the header overflowed itself by up to 215px |
| Can't switch search engines | The status poll reset the radios as soon as focus moved, because picking one saves nothing until "Apply & re-index" |
| Colour/font controls stuck under a theme | Two causes. `[data-palette]` rules sit below `[data-accent]` rules at equal specificity, so a palette always won and the swatches were dead under every theme; and `applyAppearance` re-applied every setting *except* the accent, so clearing one left it showing |
| Sketches don't open from the graph | A sketch is a note plus a PNG, and the graph popup showed the caption but never the image — the drawing was unreachable from the map |
| Web search returns nothing | Not a parser bug. Three different failures (no egress, a rate-limit challenge page, a genuine empty result) all surfaced as an empty list. Now logged and named separately |

**Found while fixing the above, also fixed**

- Editing an answer reverted when the chat was reopened — the edit updated
  `content`, but replay renders `steps`, which kept the model's original wording.
- Uploading a file 500'd if the uploads folder had gone missing, losing a
  sketch's drawing while keeping its caption.
- `APPEARANCE_DEFAULTS` declared `bg-motion` twice with different values.
- "New note" on the dashboard did nothing unless the Notes tab happened to be
  left on the capture section — the same hidden-sub-tab trap, on the most-used
  button there. Ten feature-catalog entries had it too.
- `.entry-content` used `pre-wrap`, which keeps typed line breaks but cannot
  break inside a word, so one pasted URL widened the note list and the page.
- `pytest` didn't work in a fresh clone without an editable install.

**Still open here**

- **Improve the extracted page's visual rendering.** Not a bug — the reader now
  carries heading levels, so it can be laid out as a real document (typographic
  scale, measure capped around 70ch, blockquotes, lists, code). Grouped with
  §13.

**The lesson worth keeping.** Four of these were "this control does nothing",
and in three of the four the control was working perfectly — the write landed
and was then overridden by CSS source order, a status poll, or a hidden
section. Reading the handler will not show you that. Reproduce in a browser and
measure the *computed* result; it is faster than reading, not slower. The
recurring causes are now written up as invariants in `docs/ARCHITECTURE.md` §10.

---

## 8b. Web search — two Windows bugs found, and what is left

~~**Port 8888 being taken was a dead end.**~~ **fixed.** Asked directly: *"is
there a way to change the port if it is full?? maybe like 8080 or smth"*. The
port report said "close whatever has it", which assumes the user can — often
they cannot, and the thing holding it may be something they need. `start()`
now settles a port first: the wanted one, else 8080/8081/8890/8899, with
`MEMORYMAP_SEARXNG_PORT` to name one. A SearXNG *already answering* on the
wanted port beats a free one, because that is ours from a previous run and
moving would start a second copy beside it.

**Seen in a log this session, not yet fixed:** a start attempt and an install
can be in flight at the same time. The user's log shows `SearXNG didn't answer
within 90s. Its own output was: (nothing — it wrote no output at all)` at
6:54:06, with the install still unpacking at 6:53:12 and writing the `pwd`
shim at 6:54:11 — so the start was waiting 90 seconds for an interpreter that
was still being built. Nothing is broken by this beyond the wasted wait and a
misleading error, but the error is the one the user sees, and it accuses the
wrong thing. `start()` should refuse while `_install_state["running"]` is set
and say the install is still going, rather than time out against it.

The diagnosis from §8 shipped and is working: the app now says "DuckDuckGo is
rate-limiting this app rather than returning results" instead of showing an
empty panel, which is confirmed in use. That was the whole point — the failure
is now legible.

**The fix is SearXNG, and this session found five reasons it couldn't work.**
None was in the log, which is why reading the log first did not find them —
three of the five happen before SearXNG writes a line, and the other two are
Windows-only.

**Read this first: SearXNG now installs, starts, answers its JSON API, and
passes `websearch.probe_searxng`, verified in this sandbox.** Everything below
was reproduced rather than deduced. The one part still unverified is the
download itself, because the sandbox proxy blocks the archive URL.

**3. `git clone` can never work on Windows.** Reported mid-session:
*"Couldn't download SearXNG: fatal: unable to checkout working tree"*. Four
files in the repository have a colon in the name —
`utils/templates/etc/nginx/default.apps-available/searxng.conf:socket` and
three like it. A colon separates a drive letter, so Windows refuses the name,
git fetches every object and then dies at the checkout, **leaving the
half-written folder that produced bug 2 above**. Nothing about it is
transient; retrying could never help. `pip install <tarball-url>` — the
"install without git" path — unpacks the same files and fails the same way, so
both paths were broken there. Fixed by downloading the archive and unpacking
it ourselves, skipping members this filesystem can't hold (they are nginx and
uwsgi deployment templates) and any that would escape the folder. git is no
longer used at all.

**4. `pip install -e .` can never work, on any OS.** SearXNG's `setup.py`
imports `searx` for its version, `searx/__init__.py` imports `msgspec`, and
pip builds in an isolated environment that has neither —
`ModuleNotFoundError: No module named 'msgspec'`, before setup.py can declare
a requirement. `requirements.txt` now goes in first and the package is built
with `--no-build-isolation`, which is exactly what SearXNG's own `manage`
script does.

**5. The `tracker_url_remover` plugin kills the process at boot.** It
downloads a rules file from `rules1.clearurls.xyz` during `init` and does not
catch a failure, so SearXNG exits before binding the port on any machine that
is offline, proxied or slow. Confirmed here: with the plugin on, the process
died in init; with it off (in the generated `settings.yml`) it booted and
answered. MemoryMap strips tracking parameters itself, so nothing is lost.

**And the two Windows-only ones, from earlier in the session** — the same
mistake twice: a POSIX idiom that means something different on Windows.

**1. "SearXNG started but never answered" — we were killing it.** `_alive()`
asked `os.kill(pid, 0)`, the POSIX way to check a process exists without
touching it. On Windows every signal except `CTRL_C_EVENT`/`CTRL_BREAK_EVENT`
is handed to `TerminateProcess`, so that call *ended* the process (exit code
0) and then returned True. `status()` asks `_source_state()`, which asks
`_alive()`, and the settings screen polls `status()` every three seconds — so
a freshly started SearXNG was shot within seconds of starting, every time,
and the app reported that it started and never answered. That is exactly the
symptom this section was named after. `_alive` now uses
`OpenProcess`/`GetExitCodeProcess` on Windows; `_terminate` is the only thing
that signals.

**2. "does not appear to be a Python project" — reported directly:**

    Couldn't install SearXNG: ERROR: file:///C:/Projects/MemoryMap-AI-v0/
    data/searxng/src does not appear to be a Python project: neither
    'setup.py' nor 'pyproject.toml' found.

`install_source` skipped the download when `data/searxng/src` *existed* and
handed the folder to `pip install -e`. Reinstalling didn't help because
`uninstall_source` used `shutil.rmtree(..., ignore_errors=True)`, and git
marks `.git/objects` read-only, which Windows enforces — so the wipe deleted
the writable files, left the folder standing, and said it had removed it. The
next install then found the folder, skipped the clone, and reproduced the
error exactly. Fixed at all three points: `is_checkout()` asks what is *in*
the folder, `_remove_tree()` clears the read-only bit (and moves the tree
aside if it still can't delete it) and reports what survived, and the
installer verifies `import searx` in the new venv before calling it done.

**The two Windows-only fixes are not verified on Windows** — this sandbox is
Linux, and the behaviour that was wrong is precisely the behaviour that
cannot be reproduced here. The tests pin the logic
(`tests/test_searxng_install.py`), but ask the user whether SearXNG now
installs and stays up before treating §8b as closed.

**6. `import pwd` — SearXNG cannot be imported on Windows.** Reported with a
photo: the install finally *finished*, and the start died with
`ModuleNotFoundError: No module named 'pwd'` from `searx/valkeydb.py` line 22.
`pwd` is POSIX-only. It is the **only** POSIX-only import in the whole
package, and the only thing it is used for is naming the current user in one
error message when a Valkey DB connection fails — a branch that is
unreachable unless a Valkey URL is configured, which MemoryMap never does. A
`pwd` stand-in is written into SearXNG's own virtualenv where the platform
hasn't got one; patching SearXNG's source instead would mean matching text
upstream is free to change and re-applying it after every update.

The install's final check was also too shallow to have caught it: `import
searx` passed on Windows and the *start* then died on `searx.webapp`. It
checks `searx.webapp` now, with the same environment a start uses — verifying
against SearXNG's own defaults verifies something nobody runs, since it
refuses to start on its placeholder `secret_key`.

**What is still unknown.** Whether search *results* come back on the user's
machine. Every engine returned "access denied" in the sandbox because the
proxy blocks them, so the one thing this session could not test is the one
thing the feature is for. If results are empty on a real network, the log at
`data/searxng/searxng.log` will now say why — it finally contains the output
of a process that booted properly. Do not theorise ahead of it.

Also present, from earlier sessions: a `↻ Reinstall` button (wipes the venv
and checkout, keeps `settings.yml` and its secret key) and a port line saying
whether 8888 is free, held by a working SearXNG, or held by something else.

The one thing already ruled out: the generated `settings.yml` *does* include
`- json` under `search.formats`, so the 403-from-a-missing-format theory is
not it.

Known from a user screenshot, now fixed: `_reason()` reported pip's parting
"[notice] To update, run: … --upgrade pip" as the cause of a failed install,
because it took the last line and that notice is always last. If an install
failure is being investigated, the message is trustworthy now; it was not
before.

---

## 9. The graph — make it a tool, and give it a look

**Why.** Asked repeatedly: "expand on the capabilities of the graph", "more
utility and ways to use and visualise my notes", "it's still kinda plain — it
needs more life and design style". `main` made it keyboard-operable; it is still
a plain force-directed blob that doesn't fill its own panel.

**Layouts — the shape the notes are arranged in.** Asked for directly: "can
you add different types of graph views… like tree graph diagrams and the
like". These are separate from *styling*: a layout decides where a note goes,
a style decides what it looks like once it is there. Layouts first, because a
force-directed blob is the thing that makes the graph hard to read, and no
amount of styling fixes it.

The notebook has three different structures in it, and each one wants a
different picture:

| Structure | Where it comes from | Layout that shows it |
| --- | --- | --- |
| Hierarchy | category → note, and `parent_id` threads | tree, radial tree, treemap, sunburst |
| Network | `entry_links` (wiki links, AI links) | force, arc diagram, adjacency matrix |
| Sequence | `created_at`, `entry_dates` (§10A) | timeline-graph, growth animation |

- ~~**Tree**~~ **built.** Root → category → note, with a note's replies nested
  under it, so a train of thought reads as one branch. This is the layout the
  request was about, and it is the one that suits a notebook with few links
  and many categories — which is most notebooks before the graph has been
  used much.
- ~~**Radial tree**~~ **built.** The same hierarchy wrapped into a circle:
  denser, and it makes the *shape* of a notebook obvious — a fat arc is a
  category you write in constantly.

  Both were first built by handing d3 the panel's dimensions as a bounding
  box, which is the wrong instruction: `d3.tree().size([...])` divides the
  height by the number of leaves, so a 29-note notebook got eighteen pixels a
  row and printed its labels on top of each other. Reported with a photo —
  *"the graph tree and radial are a bit hard to read and aren't neat"*. The
  fix is a set of rules about **what a label needs**, not about what the panel
  has: the tree uses `nodeSize` and pans when it is taller than the panel
  (zooming out only when the whole thing nearly fits, because a tree you
  scroll beats one you cannot read); the radial computes its rings from the
  note count, the category count and the panel, and rings **by depth** rather
  than by d3-cluster's height — cluster put a category containing a thread one
  ring closer in than its siblings, which is what made the circle look ragged.
  Three collisions only a browser can find were fixed on the way: a stylesheet
  rule beating the `text-anchor` presentation attribute so no side-label ever
  moved, a flipped left-half label whose offset sent it back across its own
  node, and a 55%-transparent label halo that let a thread edge show through
  the words it ran behind. All of it is asserted on measured geometry — the
  labels' real rotated corners, separated by a separating-axis test, because
  the axis-aligned box around diagonal text overlaps when the words do not.
- **Mind map from one note** — pick a note as the root and lay everything else
  out by hops along `entry_links`. Different from the tree above: the
  hierarchy there is filing, here it is connection.
- **Treemap / sunburst** — area as weight, so a category with 200 notes looks
  like one. Best for "where does my writing actually go?", and the only layout
  here that answers a question about proportion.
- **Arc diagram** — notes on one line, links as arcs above it. Ugly for
  browsing, excellent for spotting the one note everything connects to.
- **Adjacency matrix** — no crossing edges at all, so it stays readable when a
  force graph has turned into wool. Worth it only once there are hundreds of
  links.
- **Timeline-graph** — the graph laid out left-to-right by date, links as
  arcs. §10's Timeline tab does the axis; this would do the axis *and* the
  links, which is the one thing neither view has.
- **Subway map** — orthogonal edges, categories as lines. Beautiful and
  genuinely hard: it needs edge routing, which is real work rather than a
  layout call.

**Styling — the same layout, dressed differently.** These are skins over
whichever layout is picked, not layouts of their own:

- **Galaxy / starfield** — notes as stars sized by access count, links as
  faint filaments. The dashboard's "notebook constellation" widget already
  proves the aesthetic works.
- **Sea chart** — islands per category, notes as landmarks, links as shipping
  routes, unlinked notes adrift. Parchment palette pairs with it.
- Plain force-directed stays the default; everything else is a picker.

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

~~**A. Resolve relative time at capture.**~~ **done.** Every note's temporal
phrases are resolved when it is saved (and re-read when its text is edited)
and stored in `entry_dates` with the phrase beside the date — the resolution
is a rule, not a fact, and a reader can only disagree with it if both are
visible. `entry/timewords.py` is deterministic regexes and arithmetic, not a
model call: it runs on every save, including with Ollama off, and is
best-effort so it can never stop a note being saved. Private notes are
excluded, and marking a note private clears what was already stored — the
same reasoning as dropping its embedding.

Handled: today · tonight · this morning/afternoon/evening · tomorrow ·
yesterday · last night · the day before/after · this/last/next week, month,
year · "in N days/weeks/months" · "N days/weeks ago" · "last/next/this/on
<weekday>". Precision is kept, so "last week" shows as a week rather than
being flattened to a day. The weekday rule is written down in the module,
because both readings of "next Friday" exist and consistency is the most that
can be offered.

Shown as a chip on the note (`🕓 last week → week of Jul 20`, with the full
date on hover) rather than marked up inside the text: `renderNoteText`
already layers wiki links, inline markdown and filter highlighting through
each other, and a fourth pass over the same string is where that breaks. The
resolved dates also travel in `get_note`/`search_notes` results, so the model
can answer "what did I mean by *last week* in that note?".

**Still open from A:** tagging notes that contain relative time so they are
findable as a class, and nudging on stale ones ("this said 'tomorrow' three
weeks ago — did it happen?"). Both are queries over `entry_dates` now that
the data exists.

~~**B. A Timeline tab.**~~ **built, first version.** A time axis across, one
band per category or tag down the side (or none), and a bucket size you pick —
day, week, month, year. Every note plots at what it is *about* where §10A
resolved a date from its text, and at when it was written otherwise; a note
moved by what it says is marked 🕓 and says so on hover, because a timeline
that silently relocates notes looks broken rather than clever. Clicking a note
opens it.

Drawn as a CSS grid rather than SVG: every cell is a real element, so it
scrolls, tabs and reads aloud without any of that being hand-built. Bands are
capped at eight plus an "Everything else" lane — a chart with forty lanes is
not a chart.

**Still open here:**

- **Events as bands.** The shape this slots into: one more `group` value, once
  there is an `events` table. Places and themes can be derived from what is
  already stored; events cannot.
- **Reminders and their completion** as points on the axis.
- **Zoom from days to years as a gesture**, rather than a bucket picker, and
  branches for parallel threads — "everything that is, has and will happen" is
  a tree, not a line.

**Data shape:** a new `events` table (`title`, `at`, `precision`, `kind`,
`entry_id?`, `source`), plus `entry_dates` for resolved expressions. Both
additive.

---

## 11. Performance, accuracy and AI efficiency

### Headroom — evaluated, not adopted

Asked: *"is it worth trying to analyse and implement something like headroom
for token efficiency?"* ([headroomlabs-ai/headroom][hr] — Apache-2.0, 62k
stars, active). It compresses tool outputs, logs and RAG chunks before they
reach the model: 60–95% off JSON, 15–20% for coding agents, with benchmark
accuracy held. It is a good project. It is the wrong fit here, for three
reasons that are about **this** app rather than about it:

1. **There is no token bill.** Ollama runs on the user's own machine, so a
   token costs latency and context window, not money. Headroom's headline
   numbers are savings on a metered API.
2. **It would compete for the same CPU.** The compression path wants ONNX
   Runtime and a transformer of its own, running immediately before the local
   LLM on the same hardware. Saving 1–2k tokens of prefill by spending an
   inference pass is very likely net-negative on wall-clock for a 7B model on
   a laptop — and it needs AVX2, which is not a promise this app can make.
3. **The JSON it would compress is the JSON that cannot be compressed.**
   This one was worth measuring rather than assuming, and the measurement
   moved the answer. A representative agent prompt — ten retrieved notes, two
   turns of history, focused tools:

   | Part | Chars | Share |
   | --- | ---: | ---: |
   | System prompt (prose) | 2,521 | 34.4% |
   | History (prose) | 77 | 1.1% |
   | Notes + question (prose) | 1,381 | 18.9% |
   | **Tool schemas (JSON)** | **3,340** | **45.6%** |
   | Total | 7,319 | |

   So the prompt *is* nearly half JSON — more than expected. But that JSON is
   the **tool schemas**, and Headroom compresses tool *outputs*, logs, files
   and RAG chunks. A schema is a contract the runtime parses to constrain the
   model's tool calls; compress it and the calls stop being valid. It is the
   one JSON block in this prompt that has to go verbatim.

   What is genuinely in scope: the notes (18.9% — this is the RAG-chunk case
   Headroom is built for) and the tool results appended during a loop, which
   are already hand-shaped summaries (`_note_summary`: id, preview, category,
   tags, dates). At its own headline 60% on the addressable part, that is
   roughly 11% off the prompt — real, but not the 60–70% the numbers suggest
   at a glance, and not worth ONNX Runtime to get.

   **The 45.6% is still the thing to attack — just not with compression.**
   `focus_for` already took it from 10,215 to 3,340 characters. Getting it
   lower is more schema pruning: shorter descriptions, fewer tools per focus,
   dropping parameters with obvious defaults. That is the highest-leverage
   work left in this section and it costs nothing but care.

Set against a **hard** cost: ONNX Runtime plus a model download, in an app
whose whole proposition is offline, self-contained and light — one that
vendors d3 and p5 locally rather than take a CDN.

**What was worth taking from it, and cost nothing:**

- ~~**Prefix-cache alignment** (their CacheAligner)~~ **done, and it found a
  real bug.** The idea is to keep the front of the prompt byte-identical so
  the provider's KV cache survives. Checking ours against that: the system
  prompt carried `local.isoformat()` — *microseconds* — above the history and
  the notes. Every round of every turn differed from the last, so Ollama's
  prefix cache could never hold anything below that line, and each round of a
  tool loop re-read the entire prompt. Now to the minute, which is identical
  across the rounds of one loop and still correct for everything the app does
  with it ("remind me in 10 minutes" is not resolved to the second).
- ~~**Reversible compression** (their CCR — send a short form, let the model
  fetch the original on demand)~~ **done.** A note now goes into the prompt
  capped at `MAX_NOTE_CHARS` (900), cut with a marker naming the call that
  reads the rest: `… [cut — call get_note(7) to read it in full]`. Safe only
  because the model can undo it, which is the whole idea — and the tools guide
  already told it to call `get_note` before quoting. Most notes are a line or
  two and are untouched; ten notes of 4,000 characters used to be 40,000 and
  now fit the budget.
- **Verbosity steering.** Output tokens are half the latency and are not
  budgeted at all. A style hint already exists; a length hint does not.

**Before any more of this: measure.** §11a was done by counting characters of
tool schema, which is why it worked. "A 3-turn chat shows 8.7k tokens" is not
yet broken down into system / tools / history / notes / question, and until it
is, the next optimisation is a guess.

[hr]: https://github.com/headroomlabs-ai/headroom


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

**§11a — token usage in chats.** Asked directly: "is there a way to reduce
excessive token usage in the chats?" A three-turn conversation showed 8.7k
tokens. Where it goes, cheapest fix first:

- Retrieved notes are re-sent in full on every turn, including turns that are
  a follow-up to the previous answer and need no new retrieval at all.
- `MAX_CLIENT_HISTORY` turns of prior Q&A go up each time, whole.
- Tool results accumulate within a turn (already capped by
  `TOOL_RESULT_BUDGET_CHARS`, but the cap is generous at 24k characters).
- The system prompt is long and grew again this session; it is re-sent every
  round of every turn, which is where Ollama's prompt-prefix reuse and
  `keep_alive` would actually pay.

**Half of this has now been measured, and the answer was not where anyone was
looking.** The *fixed* overhead — system prompt plus every tool schema, sent
before a word of the question, the notes or the history, on each of up to
`MAX_ROUNDS` rounds — is ~12,400 characters, about **3,050 tokens**. Of that,
**9,957 characters (77%) is the tool schemas**, not the prose. Trimming the
guide was the smaller half by a wide margin.

`agent.PROMPT_BUDGET_CHARS` now caps it and `tests/test_prompt_budget.py`
fails the build if it drifts past, because this grows invisibly: every tool
added costs the same budget and nothing else in the suite would notice.

**Why it matters more than the arithmetic suggests.** Ollama defaults to a
4096-token window unless the model declares otherwise, and overflow is dropped
from the *front* — which is the system prompt. A 3B model (granite4.1:3b,
llama3.2:3b, qwen3.5:2b — the ones this is aimed at) that overflows therefore
stops knowing it has tools at all, and reports as **"the AI won't use
tools"**, which is the hardest possible symptom to trace back to a long
prompt. Settings → Tools is the user-facing escape hatch, and there is now a
test proving that switch reaches the wire rather than only the executor.

**The remaining win is offering fewer tools per turn, not trimming more
words.** 28 schemas go up every round whether the question is "how many notes
do I have" or "remind me to call mum". A relevance filter — or a small
always-on core plus an opt-in rest — is worth more than anything left in the
prose. Do it before §21 adds skill tools to the same budget.

Still unmeasured, and still worth measuring before cutting: which of the
*variable* costs above dominates a real 3-turn chat. Log the prompt-token
count per round. Summarising older history is the usual answer, but it costs a
model call, so it should be the last resort rather than the first.

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

**Done since.** `TOOLS_GUIDE` now says that taking several turns is expected
("look something up, read what you found, look up anything still missing, then
answer"), that a search result is a clipped sentence and `read_url` exists,
and that the user can already see the tool timeline so it should stop
narrating its process back to them.

Failed tool calls now carry a `what_to_do` field matched to the failure — a
missing id says to search rather than guess another, a disabled tool says to
stop calling it, bad arguments say to re-read the schema and retry once — and
an identical call that fails twice is told so explicitly. Previously a failure
was a bare `{"error": …}`, and small models either apologised and stopped or
looped on it until the round limit ran out.

**Still to add:** an explicit `plan` step rendered at the top of the timeline
(build it with §21, which needs the same structure); a "required tools" hint
for requests that clearly need one; and a nudge when the model answers a
notebook question without having searched.

**Note the ordering.** None of this fixes "the AI won't make me a skill" —
that fails because `save_skill` can only store a prompt string, so there is
nothing for a better-instructed model to call. §21 first.

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
- ~~Fix the reported bug where individual controls resist change under a
  theme~~ done (§8): a palette always beat an accent on CSS source order, and
  clearing an accent never un-applied it

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
- ~~**Dashboard**: audit every quick-access button actually lands where it
  says~~ done (§8) — every quick link now checked from all three Notes
  sub-tabs. Still worth doing: **add the ones that are missing**

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
- ~~No way to stop an agent turn mid-way and keep what it already did~~ **done**
  — `#chat-stop` aborts the stream, and a partial answer is kept, given its
  action buttons and persisted like any other turn. A turn stopped before it
  wrote anything is left silent deliberately: the user asked for that.
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

## 21. Skills — rebuilt; what is left

**Why.** Reported directly: "the skill system also needs a remake. The way
skills are used currently, and what the skills are at the moment, are
incorrect and are closer to just presaved mini prompts. I keep on trying to
get the AI to make me some skills in the chat but it doesn't recognise that it
needs to use tools and how to properly utilise the workspace."

**That description was accurate**, and the shape has changed. A skill was
`{name, prompt}`; clicking one dropped its prompt into the chat box, and
`save_skill` stored a name and a string — so "make me a skill that files my
inbox notes" could only produce another sentence, because the storage had
nowhere to put the steps. Fixing the prompt alone would not have helped.

**What a skill is now** (`ai/skills.py`, one validator for every way in):

- **prompt** — what it should do. A skill with only this behaves exactly as it
  did before, which is why nothing was lost.
- **steps** — ordered instructions, numbered into the run instruction and
  drawn as a plan at the top of the step timeline before anything runs.
- **tools** — an explicit allowlist. Only those schemas go on the wire and
  anything outside the list is refused at execution, so it is a safety
  property and not just a prompt. It is also §11a: the full registry is 10,215
  characters of schema on *every round*; "🏷 Auto-tag my notes" ships 1,963.
- **inputs** — declared `{{placeholders}}`, asked for before the run. A
  placeholder with no input behind it is refused on save, in the editor and in
  `save_skill` alike, because the alternative is a model handed a literal
  `{{tag}}` inventing a value.

Two decisions worth keeping:

**The built-in skills moved out of `app.js`** and are served from
`GET /skills` with the user's own. The server could not previously resolve a
skill the user clicked, `list_skills` answered "you have none" while ten were
on screen, and every field added to a skill had to be added twice.

**The declared tools are named in the instruction text as well as narrowed on
the wire.** Not redundancy: the reported failure was a model that *had* tools
and did not know it was meant to act, and telling a 3B model "use `tag_note`"
is what makes it reach for one.

**And what running one now does** (`ai/skill_runner.py`):

- **One turn per step.** Not one request carrying a numbered list — that is a
  plan the model may ignore, and a 3B model given four instructions at once
  does the first and narrates the rest. The app knows which step is running,
  so the UI ticks them off as they finish.
- **A step that fails is named**, with the reason, and the run stops there
  instead of ploughing on. §21 asked for exactly this.
- **The run ends in what changed**, not prose claiming something happened:
  a list of every write, each with a **View** and — where an inverse exists —
  an **Undo**. The undo is a tool call captured *before* the write and run
  through `POST /chat/tools/execute`, the same endpoint the confirm button
  uses. It is stripped out of what the model sees, since every field left in
  a tool result is resent on every later round.
- **Every built-in is a real job**: steps, tools, and declared inputs asked
  for in one dialog before the run. "Draft an email" asks who and what
  instead of spending a chat round on it.

**Still to do:**

- **Re-running a past run.** A skill is repeatable; a *run* is not yet
  something you can replay over a different set of notes.
- **Undo the whole run**, rather than one change at a time.
- **Links and reminders have no inverse tool**, so those two changes are
  listed without an Undo. `unlink_notes` / `delete_reminder` would fix it, at
  the cost of two more schemas in the per-round budget (§11a) — worth doing
  when something else needs them too.

---

## 22. Reported in use, not yet done

Small, concrete, each seen in the running app:

- ~~**Notes don't render markdown.**~~ **done** — but read how, before
  extending it. `renderInlineMarkdown` handles bold, italic, `code` and
  strike *only*; `renderMarkdown`'s block elements (headings, tables, lists,
  fences) are deliberately not used in the list, because a list of
  fully-rendered notes gets very tall, which is the problem this section
  itself flagged. Code spans are matched first so `` `**x**` `` stays
  literal, underscore italics are excluded so `snake_case` survives, and
  `[[wiki links]]` and filter highlighting both still work *inside* emphasis.
  The dashboard's little note lists **strip** the markers instead
  (`notePreviewText`) — they clip at ~70 characters, and a clip landing
  mid-`<strong>` is worse than no emphasis. If someone wants block markdown,
  it belongs in an expanded/detail view, not the list.
- ~~**A hero header on the dashboard.**~~ **done** — emblem and wordmark
  inside the greeting card (not above it), hidden below 720px. The emblem is
  drawn in the dashboard's own render, not at startup: p5 measures a canvas
  as zero inside a `display: none` tab, and it has to be redrawn anyway when
  a theme change moves the accent.
- ~~**The chat box can't grow.**~~ **done.** It was an `<input type="text">`,
  which is one line forever: a three-sentence question scrolled sideways
  inside a box the width of a chat pane, so you could not read what you had
  written before sending it. It is a textarea that grows with the text and
  stops at `AUTOGROW_MAX_PX`, the same cap the capture box uses. Enter still
  sends; Shift+Enter is a newline, which a single-line input could not offer
  at all.
- ~~**A long note fills the list.**~~ **done.** One 800-word note pushed
  everything else off the screen, so the list stopped being a list. Anything
  past `LONG_NOTE_CHARS` is clamped with a fade and a "Show more", remembered
  per note for the session. The trigger is the character count, not a measured
  height: the notes list renders inside a `display: none` sub-tab, where every
  measurement is 0 — the trap that has caught four separate features here.
- ~~**SearXNG starts but never answers** — capture its output.~~ The capture
  was done first; the cause was found this session and it was us — the status
  poll's liveness check terminated the process on Windows. See §8b, and
  confirm with the user before calling it closed.

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
