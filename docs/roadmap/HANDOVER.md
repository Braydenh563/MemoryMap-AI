# Session handover

> **The other four:** [ROADMAP.md](../ROADMAP.md) (live work) · [BACKLOG.md](BACKLOG.md) (§1–§29) · [ANALYSIS.md](ANALYSIS.md) (§30–§34, including the AGPL/MIT constraint) · [HISTORY.md](HISTORY.md) (already built).

Written at the end of the session that built the status bar, the Library and
the optional-extras installer. Everything here is either a fact you can check
or a thing I could not check and am saying so about.

**Start at [Where to start next](#where-to-start-next--ranked-with-the-reason).**
The two items at the top are the ones with the most leverage, and the first of
them is the first chance this project has had to *remove* a surface rather than
add one.

---

## Read this before you touch anything

**Every bug in this session was reproduced in Chromium before it was touched,
and every one of them was different from what reading the code suggested.**
That is not a slogan, it is the session's actual record:

| Reported as | What it actually was |
| --- | --- |
| "the top bar keeps permanently changing layout" | The wrap test measured `scrollWidth` — which the wrapped rule *sets*. It could never un-wrap. |
| "buttons go over the popup options" | The menu's items were *clicking the wrong note's controls*, not merely drawn under them. |
| "jokes I have saved recently doesn't show" | The notebook answered a question about jokes with a **gym routine**. |
| "500 when I tried to empty the bin" | `FOREIGN KEY constraint failed` — four of seven referencing tables were never cleaned. |
| "the web panel pushes the dock off the bottom" | Composer at y=878–931 in a 900px window. Unreachable, not just awkward. |

The app runs on localhost and the sandbox has Chromium. **Reproduce first.** The
recipe is in CLAUDE.md; there are working probe scripts in the notes below.

---

## The three traps that will cost you an hour each

1. **A stacking context you cannot see.** `backdrop-filter` creates one. So
   does `position: absolute` with any `z-index`. A popup inside such an element
   can never rise above a *sibling* of that element, whatever its own z-index
   is. This bit twice in one session — the note cards via `.entry-actions`, the
   Library cards via the blur. **The fix is always to lift the owning element**
   (`.menu-open`), never the menu. If a menu is reported behind something, this
   is the first thing to check and it takes thirty seconds.

2. **Any `100vh` sum is already wrong.** There were four of them, each a guess
   at the app's own furniture (`calc(100vh - 4.5rem)`, `- 9rem`,
   `--page-viewport`). Every one was out by 42px whenever the tab strip wrapped
   to two rows, and out by another 37px once the status bar existed. Two of
   them were what pushed the chat composer under the bar. **Anything sized
   against the window goes through `--page-viewport`**, which now subtracts
   both the header and `--status-bar-h`.

3. **A grid track sized `auto` refuses to shrink below its content.** The chat
   page's row did, so `main` stretched to 804px inside a 713px grid and the
   dock's `flex: 0 1 auto` had nothing to shrink into. `minmax(0, 1fr)` in the
   block axis is the fix, and it is the twin of the `minmax(0, 1fr)` the base
   `.layout` rule already uses for columns and explains at length.

---

## What is now true that wasn't

### There is a status bar, and it owns the bottom of the window (§36D)

Five items, and the test each had to pass: *a state you need at a glance, or a
command you use constantly.* AI status (**moved** down from the header, not
copied — two indicators for one state is worse than either), notebook size,
reminders, the running background job, and the command palette.

**Nothing in it polls.** Every value rides a loop that already existed. A
reminder poll running on two timers is a bug this project has already had and
had to find in a browser; a bar with five values is five chances to repeat it.

It is a real flex child of `<body>`, not a fixed overlay — so nothing overlaps,
no page reserves padding for it, and there is no constant to desynchronise.
`--status-bar-h` is what the fixed controls (back-to-top, toasts) offset from.

**An audit script exists for this** and it is worth re-running after any layout
change: it walks every fixed/sticky element on all seven tabs and reports
anything whose bottom passes the bar. It found the chat sidebar 17px under it.

### The Library is the notebook's management screen (§4, §36F, §36G)

Seven kinds in one call — notes, documents, chats, files, tags, bin, activity —
assembled server-side (`routes_library.py`) for the reason `routes_tasks.py`
gives: a client that stitches its own list from whatever endpoints exist misses
the next kind anyone adds.

It **replaces** rather than joins, which is the whole justification:

- the Documents tab's list and the chat sidebar's list are both here; each kept
  a capped *switcher* (eight recent, no search) because switching mid-work is a
  different job from finding;
- the Notes sidebar's 🗑, 📜 and 🏷 buttons open the Library on their kind;
- the tab bar is the same length it was.

Overview tiles, bulk selection with counted confirmations, grid ⇄ list, and a
coloured **spine** per kind — the bookshelf theme, taken structurally so a
shelf of mixed things is scannable by edge before a title is read.

**Two things only the browser found.** "Everything" was 93% activity log (164
rows against 13 things), so activity is out of the mixed list and lives on its
own chip. And the log read "Edited a preferences" — the verbs were translated
into English and the nouns were not.

### Optional extras install from Settings

Five of them — faster-whisper, pywebview, sentence-transformers, markitdown,
llama-cpp-python — each with install, reinstall and remove, reported through
`/tasks` like every other background job.

**The security property is the design and must survive any change here:** the
request names an entry in the allowlist in `core/extras.py`, and the package
spec is never anything the client sent. `pip install <a name from a request>`
is arbitrary code execution by design, and validating the string afterwards
does not fix it. Four of the ten tests are about exactly that.

Detection is `find_spec` — "can this interpreter import it", not "did pip put
it somewhere". **Reinstall exists because that answers "is it there", not "is
it sound"**: a wheel built for the wrong platform imports and does not work.

### Retrieval reads vague words as leans, not boundaries

`"recently"` was a hard 14-day filter. It **ranks** now and does not exclude;
`"last week"` keeps its teeth. A subject question can no longer be answered by
date alone — that fallback dropped the more specific of two constraints, which
is how the gym note happened. And scaffolding comes off **both ends** of a
question, so "jokes I have saved recently" searches for `jokes` rather than
`jokes I have saved`.

This overturned a previous session's test on purpose. Its reasoning about the
failure it was fixing was right and is kept; its remedy was the bug.

---

## What I could not check, and you should not assume

1. **Anything involving a real model.** Unchanged from the last handover and
   still the standing caveat. In particular the **Normal preset** now carries a
   length hint it never had — the *reasoning* is solid (an empty hint means the
   base prompt decides, and that prompt leans terse) but the wording has not
   been tried against a running Ollama. If answers come back too long, the hint
   is one string in `ai/presets.py`.
2. **The desktop shell.** Everything here was driven in Chromium on localhost.
   Note that eight `window.prompt` calls became `promptDialog` this session —
   DESIGN.md bans `window.confirm` because the shell does not implement it
   reliably, and `prompt` is the same trap. **If renaming worked in the desktop
   app before, it was working by luck; if it did nothing, that is now fixed.**
   Worth confirming with the user either way.
3. **Windows.** §8b's fixes remain unverified on Windows itself.
4. **A big notebook.** `PER_KIND_LIMIT` is 200 per kind and the Library holds
   the whole list client-side to keep filtering instant. That is right for a
   personal notebook and untested at, say, 5,000 notes.

---

## Where to start next — ranked, with the reason

The ordering is by *how much it unlocks or how often it gets in the way*, not
by how interesting it is. Items 1 and 2 are the ones I would actually do first.

### 1. Delete the three old panels the Library replaced — **highest impact, lowest risk**

The Notes sidebar's 🗑 Recycle bin, 📜 Activity and 🏷 Tags buttons now open the
Library, but **the old panels are still in `index.html` and still rendered**
(`#bin-panel`, `#activity-panel`, `#tags-panel`, plus `renderBin`,
`renderActivity`, `renderTags`). So each of those three things currently has
two implementations, which is the exact duplication the Library was built to
end — and the one that bites is the bin, because the Library's version and the
panel's version can disagree about what is in it.

The order that makes this safe:

1. Check the Library's Bin/Tags/Activity have **every** control the panel had.
   Bin: restore, delete-for-good, empty — all three are there. Tags: rename,
   merge-on-rename, remove-everywhere — there. Activity is read-only in both.
2. `openLibraryItem("archived")` still routes to the bin panel to *read* a
   binned note in full. Give the Library card an expand instead, or that is the
   one reason the panel has to stay.
3. Then delete the markup, the render functions and their CSS.

**Expect this to shorten `app.js` by several hundred lines**, which is the real
prize — it is the first time this project has removed a surface rather than
added one.

### 2. The document editor, now that it is not a tab

It is reached only from the Library. That frees it to stop being a page laid
out around a list that has left: a wider writing column, and the outline and
"notes it draws on" panels earning their place beside the text instead of
sitting folded shut under a switcher. Asked for directly ("the documents tab UI
also needs a rework") and only half done — the sidebar is fixed, the editor
itself is untouched.

### 3. §36G's bookshelf theme, the next two pieces

The spine is built. Next, in the order they add most: **shelf rows** with a
rule under each group when sorting by kind, and an **empty state drawn as an
empty shelf** rather than a sentence. The rule to hold to is written in §36G —
anything decorative that makes a card harder to scan loses to the scan.

### 4. Two things that are decided, so do not re-derive them

- **Absorbing the Notes tab into the Library: no.** The reasoning is in §36G.
  The Library *manages*, the Notes tab *works*, and putting ticks and bulk bars
  on the one screen that wants none of them would make the Library the app
  rather than making the app smaller.
- **The tab bar is the right length.** It wraps below ~1350px and that is
  measured, not guessed. Anything that wants to be a tab has to displace one.

### 5. The largest untouched things

**§9's decorative half** (skins, minimap, PNG/SVG export of the current view)
and **§10's `events` table**, so the Timeline's bands can be events and places
rather than only categories and tags.

### Two loose ends from this session, both small

- **`markitdown` and `llama-cpp-python` are installable and unused.** Both
  cards say so in as many words, which is honest but is a debt: the first
  wants a "bring in a PDF as notes" button, the second wants wiring into the
  chat backend beside Ollama.
- **The chat dock still wraps to two rows below ~1200px.** Acceptable — it is a
  genuinely narrow chat column with six control groups — but it is the next
  thing to notice if that strip gains anything else.

---

## Practical notes for the next session

- **Running the app:** `PYTHONPATH=src MEMORYMAP_DATA_DIR=<scratch> .venv/bin/python -m uvicorn memorymap.api.app:create_app --factory --port 8781`.
  The `PYTHONPATH` is required and is not in CLAUDE.md's recipe. **Restart it
  after any Python change** — a stale server is why a fix "didn't work" twice.
- **Do not install torch** or `sentence-transformers`. The suite passes without
  both.
- **Driving it:** a small `drive.js` that launches Chromium, does first-run
  setup and skips the onboarding overlay is the whole harness; every probe is
  ten lines on top of it. `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, require
  `/opt/node22/lib/node_modules/playwright`.
- **Graph traps, still true:** press the `.graph-core` circle, not the
  `.graph-node` group; a module-scope `let` is not a property of `window`, so
  `graphNodesRef` works as a bare identifier inside `page.evaluate` and
  `window.graphNodesRef` is `undefined`.
- **`elementFromPoint` is how you prove a stacking bug.** "Is the menu on
  top?" is not answerable by looking at a screenshot — ask the browser what is
  actually at three points inside the menu.
- **Lints that are load-bearing:** `test_style_scale.py`, `test_frontend_ids.py`,
  `test_frontend_handlers.py`, `test_docs_layout.py`, `test_docs_site.py`,
  `test_ui_state.py`. `test_style_scale.py` gained the four dashboard
  containers and learned to look *inside media queries*, which immediately
  found three more real offenders. If one fails it has found something.
- **CI runs `ruff check .`** and CodeQL. Run ruff before pushing.
