# Session handover

> **The other four:** [ROADMAP.md](../ROADMAP.md) (live work) · [BACKLOG.md](BACKLOG.md) (§1–§29) · [ANALYSIS.md](ANALYSIS.md) (§30–§34, including the AGPL/MIT constraint) · [HISTORY.md](HISTORY.md) (already built).

Written at the end of the session that built the status bar and the Library.
Everything here is either a fact you can check or a thing I could not check and
am saying so about.

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

## Where I would start next

1. **§36G, in the order it lists.** The Library's next pieces are named there:
   the old Tags/Activity/Bin *panels* can be deleted once their Library
   versions have every control the panels had, and that is what shortens the
   Notes sidebar for real.
2. **The document editor.** It is reached only from the Library now, so it can
   stop pretending to be a tab — a wider writing column, and the outline and
   linked-notes panels earning their place beside it rather than folded shut
   under a list that has left.
3. **§36G's answer on absorbing Notes is "no", and the reasoning is written
   down.** Do not re-derive it: the Library manages, the Notes tab *works*, and
   putting ticks and bulk bars on the one screen that wants none of them would
   make the Library the app rather than making the app smaller.
4. **§9's decorative half** (skins, minimap, PNG/SVG export) and **§10's
   `events` table** are still the largest untouched things.

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
