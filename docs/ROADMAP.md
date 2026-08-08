# MemoryMap AI — work plan

Everything outstanding, in the order I'd do it. Written so a fresh session can
pick up without re-deriving context. Each item says **why** it matters, not just
what to build — the reasoning is the part that's expensive to reconstruct.

> **Start with [§41, "The reported list, triaged — and the ordered plan"](#41-the-reported-list-triaged--and-the-ordered-plan).**
> It is the live front door: every reported item with its real status, and the
> build order in four tiers. **Work top-down and do not skip** — the failure
> this project actually has is a later session picking something interesting
> from further down while a Tier 1 correctness bug sits unattended. §41 also
> lists what was *checked and found already fine*, so nothing gets rebuilt.
>
> **[§40, "The antigravity audit"](#40-the-antigravity-audit).** A
> week of work from a different coding agent landed on `fix/Antigravity-Audit`
> — ~9,600 insertions and no tests — and arrived with 90 failing tests and 20
> ruff errors. §40 is what the audit of it found and, more usefully, the four
> *shapes* those failures took; §39 documents the three genuinely new features
> it brought (the background librarian, memory streams, the whiteboard) and
> what is still open in each. §35–§37 finished and moved to
> [HISTORY.md](roadmap/HISTORY.md); the numbers are unchanged, so a `§36` in a
> code comment still resolves.
>
> **The standing backlog front door is [§38, "Where this actually stands"](#38-where-this-actually-stands--the-backlog-audit).**
> §35–§37 were three consecutive rounds of reported bugs and UI polish, and by
> the end of §37 all of them were done — which is exactly the trap: three
> sessions in a row kept extending the *newest* section instead of stepping
> back to the other 34 sections waiting underneath it. §38 is that step back:
> a full audit of BACKLOG.md (§1–§29) and ANALYSIS.md (§30–§34) against the
> actual code, done because the backlog itself had gone stale in both
> directions (things marked open that were built, and the project's own
> outside review's top recommendation already satisfied but not marked so).
> **Read §38 first — it supersedes the ranking in every section before it,
> including §37's own "priority order for the next session."**

## This file, and its three companions

At 4,500 lines and 47 sections this had stopped being readable in one sitting,
which defeats the point of a document written for a fresh session. Split by
**what you need it for**, not by topic:

| | What's in it |
| --- | --- |
| **ROADMAP.md** (here) | The live list. **§41 is the front door** — every reported item, triaged, in the order to build. §38–§40 are the audits behind it. Start here. |
| [roadmap/HANDOVER.md](roadmap/HANDOVER.md) | **The last session's handover.** What is now true that wasn't, what could *not* be checked and why, where to start, and the two Playwright traps that will otherwise cost you an hour. Shorter than the rest; read it first. |
| [roadmap/BACKLOG.md](roadmap/BACKLOG.md) | The standing backlog — §1–§29, numbered exactly as before. |
| [roadmap/ANALYSIS.md](roadmap/ANALYSIS.md) | §30–§34. Judgements, the odysseus read, what was deliberately not taken. Reference, not work. |
| [roadmap/HISTORY.md](roadmap/HISTORY.md) | What is already done. **Read before building anything** — three sessions have rebuilt something that already existed. |

Section numbers did not change, so every §-reference in the code still resolves.

The design system has its own document: [DESIGN.md](DESIGN.md).

## Next session: start here

> **This section's own numbered list is stale in one place: item 5 below still
> lists "the Library tab" as one of the two biggest untouched sections. It is
> built (§36F/§36G), and this session deleted three of the panels it replaced.
> §3's sub-tab split is the one part of this list still genuinely open — see
> the correction inline below.**

> ### Read all four files before deciding anything
>
> This document was split because it had reached 4,500 lines. The split has one
> failure mode and it is worth naming: **a session that reads only this file
> will confidently rebuild something that is already done, or re-derive a
> judgement that was already made.** That has happened three times with a
> *single* file, so it is not a hypothetical.
>
> Two of the companions are load-bearing rather than optional reading:
>
> - **[roadmap/HISTORY.md](roadmap/HISTORY.md)** answers "has this been built?"
>   The rule below — *check the running app before building anything* — starts
>   here. An audit of §2 found four of its six "quick wins" already done.
> - **[roadmap/ANALYSIS.md](roadmap/ANALYSIS.md)** holds the decisions that
>   look like omissions. §33 records that **odysseus is AGPL and this project
>   is MIT, so no code crosses in either direction** — a constraint that is
>   invisible if you only read the backlog, and expensive to violate. It also
>   lists what was deliberately *not* taken, so nobody re-evaluates it.
>
> **[roadmap/BACKLOG.md](roadmap/BACKLOG.md)** is §1–§29, numbered unchanged.
> §35 and §36 below are the freshly reported work and are where a session that
> wants something to do should start.
>
> The standing caveat, which applies to every file: **every provider test here
> runs against a fake transport, and nothing has been checked in a browser.**
> Reasoning about behaviour instead of reproducing it has cost real time twice.

Ordered by *how much it unlocks*, not by how much is left in the section.

1. ~~**Let the agent run a skill.**~~ **built** (`run_skill`, `ends_turn`, no
   nested loop — exactly the shape this item argued for), **and it has a
   sibling now: `make_plan`.** The gap the first one left was that only a job
   somebody had *saved* got the step-per-turn treatment; an open-ended request
   still got one turn and the model's good intentions, which is §35K's "fix my
   categories" doing two merges and stopping. The agent draws a 2–6 step plan,
   its turn ends, and the same runner works through it. A plan is a skill
   nobody saved: same card, same ticked steps, same Undo on each change.
   **§35I's manual half is built too** (`🗜 Compress`), and it turned up the
   correction worth carrying: a long chat never overflowed — it *forgot its
   own beginning*, because `fit_history` drops the oldest pairs. What is left
   in §35I is the tool that lets the agent compress unprompted, and it now has
   a higher bar to clear: `make_plan` has taken a CORE_TOOLS slot since.
2. ~~**The graph's last mile (§9).**~~ **built, and it went further than the
   item asked.** Paths between two notes, clusters and drag-to-link are all in,
   but the part worth carrying forward is that the traversal is now **one
   engine** (`entry/paths.py`) with three surfaces — the API, two AI tools, and
   the view — so a picture and an answer cannot disagree about what is
   connected. And **it is in every answer**, not only the agent's: a note that
   matches a search brings the notes it links to with it. What is left in §9 is
   the *decorative* half (skins, minimap, PNG export) and the timeline-graph.
3. **§20's async-httpx refactor.** Deliberately deferred during §6 so there
   would always be a known-good streaming path to bisect against. That reason
   has expired, and the cost of waiting is real: it now has to touch two
   clients instead of one, and grows with every provider added.
4. ~~**The live log console (§1)** — streamed, but not followed, filtered or
   exportable.~~ **All three exist and work.** Checked in a browser before
   building anything, which is the rule this file opens with: 413 records
   streaming live with Follow ticked, a text filter that narrowed them to 1 and
   said "412 records hidden by the filters above", a level filter, a source
   filter, Copy all, Clear, and a support-bundle export. Nothing here needed
   building — the entry was simply out of date. §1's remaining items are the
   ones about *other* surfaces, not the console.
5. ~~**The Library tab (§4).**~~ **Built** (§36F), then built *out* into the
   app's management screen for notes, documents, chats, files, tags, the bin
   and the activity log (§36G) — and the Notes tab's old Bin/Activity/Tags
   panels have since been **deleted**, the two implementations of each having
   been the exact duplication the Library was meant to end. **Chat / Agent /
   Browse sub-tabs (§3) is the one genuinely open half of this item** — the
   chat tab resolved "Chat vs Agent" as a mode toggle (Ask/Request) rather
   than as separate tabs, which may or may not still be what §3 was asking
   for; worth a quick re-read of §3 before assuming it is either done or
   still wanted as originally scoped.

**Verify before building:** every provider test in this repo runs against a
fake transport. The SSE framing, the `[DONE]` sentinel and the tool-call
fragment indices are implemented from the specification, not from a running LM
Studio. Half an hour with the real thing would move §6 from "should work" to
"confirmed", and that is worth doing before anything is built on top of it.

Everything below this block is the standing backlog, unchanged.

---

## Do these next, in this order — closed out; kept as a record

Three consecutive superseding rounds (§35, then §36, then §37) all landed on
the same six items below, and every one of them is done: skills rebuilt with
a tool allowlist and a step-per-turn runner (§21), the two Windows web-search
bugs found and fixed (§8b), token usage budgeted end to end rather than
resent whole (§11a — `agent.PROMPT_BUDGET_CHARS`, `ai/context.py`), inline
markdown rendering for notes (§22), both halves of the note timeline (§10A's
relative-date resolution and the Timeline tab itself), and the dashboard hero
header (§22). Nothing here needs re-deriving. See **§38 below** for what
replaced this list as the live priority order.

---

## Priority map: quick wins → bigger bets

Asked for directly — a triage across *everything* in this document. Four
tiers. Within a tier, order doesn't mean much; between tiers, it does. **See
§38 below for the current live ranking** — this map is kept for tiers 2–4,
which are still an accurate shape of what's left; tier 1 and the security
tier are historical (all closed) and trimmed to a pointer.

**Security — all seven closed.** Full audit in [HISTORY.md](roadmap/HISTORY.md).

**Tier 1 — fastest wins — all six closed.** Say-which-search-engine-answered
(§13), log-console drop-count (§1), grey out dead Gravity/Spread controls
under tree layouts (§9), SearXNG as the explained default (§13), single-worker
startup enforcement (§20), SearXNG `settings.yml` audit (§13). Pinned by
`tests/test_security_boundaries.py` and `tests/test_tier1_refinements.py`;
detail in HISTORY.md if the reasoning is needed again.

**Tier 2 — quick wins.** A session or so. Real but contained — mostly
extending a pattern that already exists rather than inventing one.

- ~~Finish the live log console: stream via EventSource, tail/autoscroll,
  level filter, merge the browser-side ring buffer (§1)~~ **done** — streamed
  as NDJSON over `fetch` rather than EventSource; see §1 for why that swap was
  forced rather than preferred.
- ~~`create_category` / `merge_categories` / `delete_category` as agent tools,
  following the existing tag-tool pattern (§14)~~ **done** — four of them
  (`rename_category` too). Adding them briefly made the prompt budget the
  binding constraint on §14's list; that has since been **lifted** by fitting
  the tool schemas to the model's real context window rather than to a
  constant. See §14.
- ~~A support-bundle export button (§1)~~ **done**, as an allowlist.
- Fix the specific reported bugs in §8's ideas-parking-lot list — the
  miscategorised note, the dashboard markdown gap, the constellation widget
  not redrawing on theme change, settings on a narrow viewport — each is
  probably small once found, and none has been reproduced in a browser yet
- Collapsible sidebars (§16)
- Keyboard arrow-key movement + Enter-to-open in the note list (§16)
- A per-chat token/context meter in the Chat tab — the number already exists
  server-side (§11a); this is surfacing it
- Save a full custom theme, not just a palette (§15)
- Word-count goal in Documents, the one unbuilt piece of an otherwise
  finished feature (§5)

**Tier 3 — medium bets.** Multiple sessions, genuine design decisions, but
each is scoped and none needs a new abstraction the codebase doesn't already
have a version of.

- ~~The Timeline branch/line view (§10C)~~ **built — see §38's ranked list
  and BACKLOG.md §10 for what shipped and the "band, not §9 cluster" scoping
  correction.** §37J (fixing the grid view's clipping/markdown bugs) landed
  first, as this bullet said it should.
- Chat / Agent / Browse as real sub-tabs (§3) — see the sequencing note
  below before starting this one, and see the correction above: the chat tab
  resolved part of this differently (a mode toggle, not separate tabs), so
  re-read §3 before assuming the whole item is still wanted as scoped
- ~~The Library tab (§4)~~ **built — see §36F/§36G, and the correction above.**
- The graph's utility — paths between notes, clusters, drag-to-link; the
  layouts are already done (§9)
- An eval/benchmark harness for tokens, latency and filing accuracy
  together (§11, §31)
- ~~A headless Playwright smoke suite in CI (§31)~~ **done — see §38, item 2.**
- Splitting `app.js` into ES modules, one file per tab (§31) — **not a
  standalone session; ride it in on §3.** Asked directly whether this
  refactor should happen first, ahead of everything else here, precisely
  because every new feature adds more code to the one file. The dependency
  runs the other way, though: touching ~20k working lines (grown from ~12k
  when this note was written — it has not shrunk while unsplit) with nothing
  automated to catch a regression is the riskiest kind of change to make
  *before* the smoke suite above exists, not after — the app's own history
  ("every layout bug found so far passed a fully green run") is a warning
  about exactly this. Once the smoke suite exists, the cheapest way to do
  the split is incrementally, one module per tab, timed to land alongside
  work that's already touching that part of the file — §3's Chat/Agent/Browse
  split is the natural first slice, since extracting Chat into its own
  module is close to free as a byproduct of that work, versus a dedicated
  pass that touches the same code twice for no additional feature.
- The app-control/health-check screen, without the tray/packaging work
  around it yet (§25)
- First-run diagnostics folded into onboarding (§27)
- A plain-Markdown-folder importer (§31) — the smallest version of "bring
  notes in from somewhere else" that still covers most real cases

**Tier 4 — bigger bets.** Architecture-level, multi-session, and the scope
itself is still an open question for several of these — worth a deliberate
decision before starting, not a session that discovers the scope midway.

- Multi-category notes (schema change) vs. manual grouping (additive,
  smaller) — decide which is actually wanted before building either (§23)
- Response-mode presets (quick/normal/detailed) with per-mode model
  assignment, and the "optional" dynamic routing on top (§11)
- The agent reachable from anywhere in the app, and — much bigger, and
  flagged rather than scoped — the agent controlling the screen itself (§18)
- Desktop packaging: signed installers, single instance, tray, update
  channels (§7, §25)
- A dedicated whiteboard, distinct from the existing sketch pad (§4)
- MCP tool support (§29) — no shape yet, and needs its own trust model
  before it needs code
- The mobile-access / LAN-exposure decision (§17) — a decision first,
  security work second, code third

---

## Folded in from IDEAS.md and outside review

Two outside reviews of the repo (Perplexity, two passes; Gemini, two passes)
and the running `IDEAS.md` parking lot are merged into the sections below,
rather than kept as separate documents. Worth knowing before trusting any of
it:

**The two reviews failed differently, and §30 tells them apart.**
Perplexity reasoned carefully from a real but stale GitHub bio — "models
bundled directly, no Ollama… required" — which describes a *different*
project, not this one; MemoryMap AI talks to Ollama over its local REST API
(`ai/ollama_client.py`) and has done since Phase 2. Gemini's *first* pass,
denied repo access the same way, didn't hedge — it fabricated a specific
architecture (a "Ghost Sidebar" UI, a ChromaDB/LlamaIndex pipeline) that
matches nothing here. Its *second* pass, after reading the live GitHub Pages
site, is accurate, and its suggestions are judged on their merits rather
than discarded — see §4, §17, §24, §26, §29 and §21 for where they landed.
Full breakdown, including exactly what got dropped and why, is in §30. What
*did* transfer from the first-pass problems are the parts that were really
about general local-AI-app hygiene and happen to fit this repo anyway:
prompt observability, a support bundle, an eval harness, first-run
diagnostics. Those are folded into §1, §11 and §25–§28 below, in this app's
actual shape.

**IDEAS.md was a parking lot on purpose** ("out of scope right now"), so
folding it in here is the point of this pass — some of it duplicates work
already designed elsewhere (image drag-and-drop is already §4 item 1; a
branching timeline is already in §10; a custom-palette builder is already
§15), some of it is a genuine bug report that had never made it to §8, and a
few items are big enough to be their own section (§23–§29). Each folded item
below says where it landed and, for the outside-review material, whether it
survived contact with the actual architecture.

**Every line, accounted for.** So nothing here reads as silently dropped —
`IDEAS.md` had 42 items when this pass was written; this is all of them:

| `IDEAS.md` item | Landed |
|---|---|
| Update README + GH Pages | §22 (new) |
| "ai is cool" filed under Sketches | §8 (new) |
| Expand sketches / whiteboard tab | §4a (new, fully scoped) |
| Image/file uploads + drag-and-drop | §4 item 1 — fully scoped, asked for again directly |
| Manual grouping of notes | §23 (new) |
| Multi-category notes | §23 (new) |
| Guided first-run setup | §27 (new) |
| Note/data compression | §26 (new) |
| Better agentic web search | §13 (extended) |
| Bottom status bar + palette access | §16 (new) |
| Save custom appearances/themes | §15 (extended — a saved *theme* is more than a saved palette) |
| "Notebook constellation" redraw on theme change | §8 (new) |
| Gravity/Spread don't affect other graph layouts | §8 (new) |
| Branching visual timeline | §10 (extended) |
| Better documents UI/usability | already thoroughly scoped in §5 — checked again, nothing missing |
| Settings unreachable on narrow/mobile | §8 (new) + §19 |
| Clean up timeline/graph spacing | §8 (new) |
| Dashboard widgets missing markdown | §8 (new) |
| More dashboard widgets / pie charts | §24 (new) |
| Chat metadata disappears on reload | §8 (new) |
| Better token tracking | §11 (new meter) |
| More category-management tools, better agent workflow | §14 (new) |
| Notes/documents as one whole (OneNote/Obsidian/Notion) | already thoroughly scoped in §5 — checked again, nothing missing |
| Agent permission dialogue + before/after + agent everywhere | §18 (new) |
| Agent controlling the screen itself | §18 (new, flagged as far bigger than the rest) |
| Quick/normal/detailed modes, per-mode models | §11 (new) |
| In-built browser with MCP tool abilities | §29 (new) + §3 (existing browser discussion) |
| Full security sweep | §8b (new) |
| VS Code extension | §29 (new) |
| Cross-platform Linux/Mac | §7 (extended) |
| Console completeness in Settings | §1 (new) |
| Hide the cmd window, tray-accessible | §25 (new) |
| Exit app + close backend, automate setup/fixes | §25 (new) |
| App management interface (health check, repair deps) | §25 (new) |
| Run on mobile / iPhone | §17 (extended) |
| Does the red AI-status ever happen? | closing Q&A (new) |
| In-settings ask-AI help with docs access | §28 (new) |
| Reduce token usage | §11a (already there) + §11 (new: a visible meter, an eval harness) |
| Streamline/optimise the backend and AI interactions | this is §11's whole subject already — no single line answers it, the section does |
| Package the app + improve the Settings → Models page | §7 (packaging, already there) + §30 (what a fancier Models page would and wouldn't add) |
| Expand start.bat / background CLI / dev console | §25 (new) |
| Dynamic model switching by task complexity | §11 (new) |
| Collapsible sidebars | §16 (new) |

---

## How to work on this repo

- `pytest` — 864 tests, fully offline, no Ollama needed (`pytest.ini` sets
  `pythonpath = src`, so this works without an editable install)
- `ruff check .` — matches CI
- `node --check frontend/app.js` — the frontend is one large plain-JS file, so a
  syntax check is worth running after every edit

Four of those tests are guards rather than features, and are the ones most
likely to fail on you without you having broken anything visible:

- `tests/test_frontend_ids.py` — duplicate element ids, and `$("…")` lookups
  with no matching element. Two elements sharing `persona-prompt` is what made
  "Add Persona" silently throw.
- `tests/test_prompt_budget.py` — the agent's fixed per-round overhead. If you
  add a tool, this is what tells you it cost something. See §11a.
- `tests/test_security_boundaries.py` — session expiry, the origin check, the
  CSP, and SearXNG's published port. Two of its assertions are about the
  *frontend*: that `index.html` contains no `style=""` attribute, and that
  custom CSS does not inject a `<style>` tag. Both would otherwise fail
  silently in a browser and nowhere else.
- `tests/test_context_budget.py` — that one turn's worst case still fits the
  model's window, at every window size. This is the one that fails if a new
  part of the prompt is added without giving it a share, or if a share is
  raised without taking it from somewhere else. It also asserts that all four
  Ollama generation paths send an options block, because a payload that
  quietly omits one is a model running on the backend's defaults again.
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

**Collect the console while you drive.** The app sends a strict CSP now, and
anything it refuses is reported *only* there — no failed request, no thrown
error, just a thing that quietly does not happen. This is what found the
custom-CSS regression that 757 green tests missed:

```python
violations = []
page.on("console", lambda m: violations.append(m.text) if "Refused" in m.text else None)
page.on("pageerror", lambda e: violations.append(f"pageerror: {e}"))
```

For a violation the console message alone will not locate, listen for the
event instead — it carries `sourceFile` and `lineNumber`, which the console
text does not:

```python
page.add_init_script("""
  window.__v = [];
  document.addEventListener('securitypolicyviolation',
    e => window.__v.push({d: e.violatedDirective, f: e.sourceFile, l: e.lineNumber}));
""")
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
5b. **`utcnow() + offset` is a lie with a timezone attached.** It produces an
   aware datetime *tagged UTC* that actually holds local wall-clock, so
   anything reading its `.isoformat()` is told an offset that is false. This
   shipped: Magic Add handed that string to the model as "the current time",
   the model answered with the same `+00:00` it had been shown, the route
   trusted the offset and skipped its correction, and every relative reminder
   landed out by exactly the user's UTC offset. "In half an hour" became 10am
   the next day for a user at UTC+10, and was perfectly correct for anyone at
   UTC — which is why it survived so long. **Build the user's clock as
   `utcnow().astimezone(timezone(offset))`**, so the frame is true and both
   the naive and aware branches answer the same question. Two datetimes that
   represent the same instant are equal; two that merely *print* the same are
   not the same thing.
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
12. **The app sends a strict CSP, and a violation is reported in the browser
    console and nowhere else.** No test sees it, no request fails, no error is
    thrown — the thing simply does not happen. If a style, a script or a fetch
    "does nothing" and the handler looks right, open the console before
    debugging the handler. Three rules follow from the policy: an injected
    `<style>` tag will not apply (use `adoptedStyleSheets`), a `style=""`
    attribute in `index.html` will not apply (put it in `style.css`), and a
    second inline `<script>` in `index.html` needs no action — its hash is
    computed from the file at startup — but a script loaded from anywhere
    off-origin will be refused outright.
13. **A control that "does nothing" is usually working.** Four reported cases,
    three of which wrote correctly and were then overridden — by CSS source
    order, by a status poll repainting from the server, or by living in a
    hidden section. Check the *computed* result, not the handler.

---
## 35. Reported in one session — the big batch, triaged

Finished. Moved to [roadmap/HISTORY.md](roadmap/HISTORY.md) so this file stays
under the length that makes it readable in one sitting.

## 36. UI layout and surfaces — the reported list

Finished. Moved to [roadmap/HISTORY.md](roadmap/HISTORY.md).

## 37. Reported in one session — the second big batch, reprioritised

Finished. Moved to [roadmap/HISTORY.md](roadmap/HISTORY.md).

## 38. Where this actually stands — the backlog audit

Written because the user flagged, correctly, that three sessions in a row
(§35 → §36 → §37) kept extending the newest polish batch instead of touching
the other 34 sections underneath it, and asked for the roadmap to be honestly
re-prioritised and then worked through without stopping to ask. This is that:
a full audit of BACKLOG.md (§1–§29) and ANALYSIS.md (§30–§34) against the
actual code — not the backlog's own prose, which is exactly what goes
stale — and the corrected order that follows from it.

### What the audit found

Each stale entry is corrected in place in BACKLOG.md/ANALYSIS.md themselves,
not just noted here (§4, §11, §16 in BACKLOG.md; §33/§34 in ANALYSIS.md). The
shape of it:

- **Several sections marked "open" are done**: the Library tab (§4's own
  headline item), hybrid retrieval/RRF (§11), the status bar (§16, listed
  twice), and — the one that matters most — the project's own outside
  review's (§34) #1 recommendation, "finish the agentic loop," which
  `run_skill` and `make_plan` already satisfy.
- **§37's polish batch is genuinely finished** — all five of its ranked items
  (§37B–§37F) are done as of this session, and 37C/37G/37H/37I/37K/37L are
  each small, secondary, or blocked on a clarifying question, not work that
  should keep occupying a session on its own.
- **Real, substantive backlog work had gone untouched for a long time** (items
  below are as this audit first found them; see the corrected priority order
  for what's since been done): no graph layout beyond tree/radial (§9, named
  the product's own differentiator), no Timeline branch/line view (§10C,
  asked for twice), Chat/Agent/Browse sub-tabs (§3, asked for repeatedly —
  turned out to be substantially resolved already, see item 5 below), no
  meeting-notes/transcription (§17, the backlog's own "highest-value single
  addition," built on the same `faster-whisper` engine already powering
  single-note dictation), `app.js` still one
  ~20k-line file with zero CI coverage (§31/§32 — the coverage half is fixed,
  see item 2 below; the file is still unsplit), and the notebook had never
  been tested past a
  few hundred notes despite ANALYSIS §34 flagging that as "the failure that
  arrives silently, as 'the app got slow,' years in."

### The corrected priority order

Supersedes §37's own list and everything before it in this file. Ranked by
unlocking real functionality, favouring things asked for repeatedly or
flagged by the project's own outside review — not by how contained the fix
is, which is what let three sessions in a row default to the smallest thing
in front of them:

1. ~~**Scale-test the notebook**~~ **done.** `scripts/scale_test.py`, a
   generated fixture up to 50,000 notes, found two real N+1 query patterns
   (`GET /graph` resolving each note's category with its own query;
   `search_manager.semantic_search` materialising a full `Entry` for every
   embedded note just to score most of them away) — both were multi-second,
   N-proportional costs and are now sub-2-second, near-constant ones. Full
   numbers and what's still open (the O(n²) similarity-graph toggle, storage
   headroom) are in ANALYSIS §34, item 2. Pinned by
   `tests/test_scale_query_counts.py`.
2. ~~**A headless Playwright smoke suite in CI**~~ **done.** `tests-e2e/` —
   `@playwright/test`, run against a real `uvicorn` instance via Playwright's
   own `webServer` config, a new `e2e` job in `.github/workflows/ci.yml`.
   Verified locally, not just authored: it caught a real thing on its first
   run — "documents" is in `app.js`'s own `TABS` array but has had no
   `#tab-btn-documents` in the nav since §36F replaced it with Library, which
   a test written from the array alone would have gotten wrong. Covers every
   tab reachable from the bar (console errors, uncaught exceptions, and
   horizontal overflow — the exact `--page-viewport` shape of bug this
   project's own handovers describe finding by hand) plus one real
   interaction (capture a note, see it in Browse). **Start here next: §3's
   sub-tabs or §9's graph layouts below now have a safety net to build
   against**, which is the whole reason this was ranked ahead of them.
3. ~~**Graph layouts beyond tree/radial**~~ **one built — Arc — the rest
   still open** (§9); named the differentiator in ANALYSIS §30/§34. A
   previous session deliberately did not start this, flagging the risk of a
   half-integrated layout; this session built Arc as a third case inside the
   existing `layoutHierarchy`/`hierarchyPath`/`frameTree` machinery instead of
   a separate rendering path, so it inherits drag-pin, zoom-to-fit,
   hover-adjacency and the physics-disable check the way tree/radial already
   do. Full reasoning, the "hierarchy not `entry_links`" scoping call, and
   Chromium verification are in BACKLOG.md §9. **Mind map, treemap/sunburst
   and adjacency matrix are still unbuilt** — each is a materially different
   rendering approach, not a fourth case Arc's reuse covers for free.
4. ~~**Timeline branch/line view**~~ **built** (§10C) — asked for twice
   directly; §37J fixed the grid view's bugs first, as planned. A `View: Grid
   / Line` picker; the line reuses the grid's own band data (category/tag)
   rather than §9's separate cluster-detection endpoint. Full reasoning for
   that scoping choice, what shipped against the original sketch, a real
   click-interception bug found and fixed in Chromium, and what verification
   could not cover are in BACKLOG.md §10's own correction.
5. ~~**Chat/Agent/Browse sub-tabs**~~ **checked, and substantially done —
   see §3's correction in BACKLOG.md.** The Ask/Request mode toggle, the web
   panel column and `make_plan`'s ticked-step display already satisfy this
   item's substance via a different (and, per §36G's own reasoning, better)
   shape than literal sub-tabs. One small, real, genuinely open gap: no
   user-facing control for "which tools this turn / max rounds" in Agent
   mode — `agent.py` already takes both as parameters, nothing in `app.js`
   exposes them. Not worth a session on its own.
6. ~~**Meeting notes / transcription**~~ **record → transcribe → note built**
   (§17) — a dashboard card opens a recorder with its own timer and a review
   step before saving, hitting a new higher-ceiling `/voice/transcribe-
   meeting` endpoint alongside the existing single-note one. **Extracting
   action items into reminders is still open**, deliberately: it needs a
   real model call this sandbox cannot verify. Full scope in BACKLOG.md §17.
7. ~~**Onboarding diagnostics**~~ **built — reachability half** (§27,
   ANALYSIS §34's #3 priority). A new slide reports Ollama reachability and
   where the notebook lives/how big it is, reusing two endpoints that
   already existed; the graph slide now names the Timeline too. **Still
   open**: offering to pull a model, the writability check, "example notes"
   — BACKLOG.md §27.
8. **`app.js` module split** (§31/§32), riding in on #5 above rather than as
   its own session, once #2's smoke suite exists — the sequencing reasoning
   in "Priority map" Tier 3 above still holds.
9. What's left of §37 — **37H** (llama.cpp, a full backend session, asked
   about and deferred) and **37L** (the umbrella "full UI audit," break into
   dated sub-items). 37C/37G/37I/37K are all done — see each section.

**Being worked through now, in this order, without stopping to ask** — per
explicit instruction. See HANDOVER.md for what was actually built each
session versus what's still ahead on this list.

### §38a. Four user-reported bugs, fixed the same session — done

Reported directly, worked as a bounded side-trip rather than a new priority
list — see HANDOVER.md for the "don't let this become the next §35–37" note.

1. **Notes tab sidebar gap, worse than other tabs.** Two stacked causes: an
   old `#sidebar { align-self: flex-start; }` (no comment, predates the
   "stretch, not start" fix `.layout`'s own comment describes, silently
   overrode it) and `--page-sticky-h` being a fixed viewport guess that
   main's real content can exceed. Fixed with a `ResizeObserver` that mirrors
   `main`'s actual height (`syncNotesSidebarHeight` in `app.js`) — the same
   instinct `applySidebarWidth`/`fitComposerToDock` already use where CSS
   alone proved fragile.
2. **Timeline text still cut off after §37J.** The column widen (5.5rem →
   9rem) wasn't enough against a 120-char preview at 2 lines. 13rem + a
   3-line clamp gets close to the full preview instead of a marginal gain on
   the same shape of cut-off.
3. **A note found by tag but missed because the remembered date was
   wrong.** "That joke I wrote about two weeks ago" (tagged joke/jokes/funny,
   word "joke" not in the content) found nothing because it was actually
   three weeks old — a hard date filter excluded it, by design, per the
   comment on the fallback this extends (§35's "jokes... recently" fix only
   covered vague words like "recently", not specific-sounding-but-wrong ones
   like "two weeks ago"). `search_manager._retrieve` now retries the subject
   alone within a *widened* window (one window-span either side, not the
   whole notebook) when the in-window search comes up empty — labelled
   `outside_range`, never silently presented as an in-window match. The
   bound matters: an early unbounded version broke an existing, deliberately-
   tested case ("the allotment, last week" with only a 90-day-old allotment
   note must still answer nothing — a subject match three months from a
   7-day window is a different note weighing in on a question it wasn't
   asked, not a memory that was "a little off"). Pinned by four tests total
   (two new in `test_ai.py`, two pre-existing in `test_query_understanding.py`
   that now stay green), including one confirming the *rejected*
   fallback (drop subject, keep date) still doesn't come back.
4. **`GET /entries/link-suggestions` was a second O(n²) trap**, found by the
   sweep the search fix prompted: it called `semantic_search` — a full
   embedding scan — once *per entry*, each call also re-embedding that
   entry's own content from scratch. Rewritten to match
   `routes_graph._similarity_edges`'s already-correct shape: fetch every
   stored vector once, compare all pairs in memory. `GET /graph?similarity=
   true`'s O(n²) (ANALYSIS §34) remains open and known — it's off by default,
   this one wasn't.

Storage was checked too, not just performance — see ARCHITECTURE.md's new
"Storage headroom, measured not guessed" (§8): ~350MB at 200,000 real-embedding
notes, attachments and `entry_revisions`/`audit_log` flagged as the parts that
don't scale with note count and weren't sized in this pass.

## 39. The background librarian, memory streams, and the whiteboard

The three genuinely new capabilities that arrived with the `fix/Antigravity-
Audit` branch. All three are worth having; all three needed work before they
were real, and §40 is the record of that. Their design is here.

### 39A. The background librarian (`ai/autonomous.py`)

A scheduled agent pass over the whole notebook: tag untagged notes, link notes
that read alike, flag duplicates. Off by default, and the default is the
point — this is the only place in the app where the model writes to notes
without a person having just asked it to.

Everything about its shape follows from "nobody is watching":

- **Destructive tools are barred, not confirmed.** `blocked_tools` includes
  `delete_note` and `ask_user`; a pass that emits a `confirm` event abandons
  the run and records why, because there is nobody to confirm to.
- **Bounded rounds.** `MAX_ROUNDS = 15`. A tidy-up, not an open session.
- **The utility model**, so a background job doesn't tie up the chat model.
  `smart_model_routing_enabled` turns that off for someone who would rather
  have one model do everything.
- **Skipped on battery.** `battery_efficient_mode` also drops the graph's
  similarity edges, which is the other expensive thing the app does.
- **`Event.wait`, not a sleep loop.** The interval is up to a week; waking
  3,600 times an hour to check a flag is not how you wait for that.

Maintenance rides along with it: `VACUUM` on an autocommit connection (a
`Session` opens a transaction, and SQLite refuses to vacuum inside one) and
`embeddings.clean_orphaned_vectors`, which removes vectors whose note was
hard-deleted — nothing else prunes that table, so it grows forever and every
semantic search scans rows that can never match.

**Still open.** The pass has no dry-run: you cannot see what it *would* do
before enabling it, which is a lot of trust to ask for a feature that edits
notes unattended. A "show me the last pass's changes, with undo" screen is the
obvious next step, and `taskhistory` already records each run.

### 39B. Memory streams (`save_user_preference`)

The model can write itself a standing instruction — "always answer in British
English", "my work notes go in Projects" — and gets it back in its system
prompt on every later turn.

This is the one tool whose *output becomes its own input*, so it is bounded on
three axes rather than one: 200 characters per preference, 40 active
preferences, and a 600-character ceiling on what actually reaches the prompt
(`agent.MEMORY_STREAM_BUDGET_CHARS`, newest-first). That last one exists
because `PROSE_BUDGET_CHARS` — the guard that stops the system prompt
bloating — is asserted against the *static* persona and TOOLS_GUIDE, so
anything appended at runtime slips straight past it.

**Still open.** There is no UI for these. The model can save a preference and
the user cannot see the list, edit it, or turn one off — the `active` column
exists and nothing sets it to false. That is the next piece of work here, and
it matters more than it sounds: a preference the user cannot see is a
behaviour change they cannot explain or undo.

### 39C. The whiteboard (`api/routes_whiteboard.py`)

Note cards and freehand sketches on a pannable canvas. A "board" is itself an
entry, so a board is searchable, taggable and filable like anything else, and
`board_id IS NULL` is the unnamed scratch board every notebook starts with.

Two rules run through the API, both learned by their absence: a card must point
at a note that exists, and a write must be scoped to the board it claims.

**Still open.** Deleting an entry leaves its cards behind — there is no cascade
and no sweep, so a board can accumulate references to notes that are gone.
`clean_orphaned_vectors` is the pattern to copy.

## 40. The antigravity audit

A week of work arrived on `fix/Antigravity-Audit` from a different coding
agent: 8 commits, ~9,600 insertions, and **no tests**. This section is what the
audit found, because the *shape* of it is more useful to a future session than
the individual fixes.

### What the numbers were

`main` had 1,544 tests passing and two failures, both a time-bomb in a dated
test that had started failing on its own six days after it was written. The
branch had **90 failures and 20 ruff errors** — CI would not have run.

### The four shapes of failure, in order of how much they cost

**1. A working thing rewritten into a riskier thing.** `POST /chat/stream`
became a WebSocket. Nothing asked for it and nothing was gained: the app is
local-first on 127.0.0.1, and the NDJSON stream it replaced already delivered
tokens as they were produced. What it cost was a SQLAlchemy Session shared
across threads (not thread-safe), a double close, an unjoined producer thread
that kept generating after a client hung up, a router mounted outside
`dependencies=locked` with hand-rolled auth, and — the one that matters most —
a transport exempt from the same-origin policy, so any page the user had open
could open a socket to the agent. It also took ~70 tests with it.

**2. Features that never ran once.** Not "buggy" — never executed:

- `autonomous.start()` was never called, so the interval, the on/off switch
  and three task toggles in Settings were all wired to a loop that did not run.
- `clean_orphaned_vectors` did not exist. The call sat inside an
  `except Exception` wide enough to swallow the `AttributeError`.
- `generate_skill` called `config.save_preference`, a method with no
  definition anywhere in the codebase.
- Thirty-five inline `style` attributes, refused by the app's own CSP.

The pattern: **an exception swallowed, a call never made, or a policy that
rejects the work silently.** None of them logged anything.

**3. A guard removed while its shape was kept.** `tag_note` and `link_notes`
grew batch arguments — a good feature — and in the rewrite stopped calling
`_require_note`, the single place that refuses a private note. The tools still
looked correct. The privacy boundary was gone.

**4. Damage that lands far from its cause.** The worst bug in the branch was
two missing entries in `APPEARANCE_DEFAULTS`. That wrote `undefined` and `NaN`
into two CSS custom properties on `<html>`, which are invalid *where they are
used* — a `!important` rule matching `.card`, `input`, `textarea`, `select`,
`.modal` and `.sidebar`, and the rgba() inside `--glass-shadow`. Every card,
field and dialog in the app rendered flat and borderless on every fresh
profile. Nothing logged, nothing threw, and reading the source did not find it.
A browser did, in one `getComputedStyle` call.

### What this changed about the tests

The audit added 46 tests in three files, and four lints. The lints matter more
than the tests, because every one of them closes a gap where **nothing was
looking**:

| Lint | The gap it closes |
| --- | --- |
| `test_frontend_ids.test_every_appearance_setting_has_a_default` | A setting read but not defaulted becomes the string `undefined` in a CSS property. |
| `test_style_scale.test_every_token_the_stylesheet_uses_is_declared` | A `var(--x)` with no fallback and no declaration erases the rule it is in — and can beat a rule that worked. |
| `test_security_boundaries` (extended to app.js) | The CSP refuses an inline style in a template literal exactly as it refuses one in markup. |
| `test_antigravity_regressions` (25 tests) | One per finding; 28 of 32 fail against the original branch. |

### What is still open from this branch

Ranked, and each is a real piece of work rather than a nit:

1. ~~**No UI for memory streams.**~~ **Done.** Settings → The AI → *What it
   remembers* lists everything `save_user_preference` has written, says how
   much of it actually reaches the model against the 600-character budget, and
   lets each one be edited, switched off, or forgotten. `active` is a toggle
   rather than only a delete because "stop doing this for now" and "you should
   never have saved that" are different intentions.
2. **No dry-run for the background librarian** (§39A). Still open, and now the
   top item. Enabling it lets an agent edit the notebook unattended with no
   preview. `taskhistory` records each run and the agent already emits `change`
   events carrying undo payloads, so "here is what the last pass did, undo any
   of it" is mostly assembly.
3. ~~**Whiteboard cards outlive their notes.**~~ **Done.**
   `autonomous.clean_orphaned_board_cards` runs with the vector sweep. Sketches
   are deliberately left alone — a sketch belongs to the board, not to a note.
4. **`graph_local` loads the whole notebook** to render a "local neighbourhood",
   including a full similarity sweep and a PageRank over every node. Correct,
   and the opposite of what "focus mode" should cost.
5. **PageRank runs on every `/graph` call** with no caching. Combined with the
   similarity edges this is the most expensive endpoint in the app; ANALYSIS
   §34's O(n²) note now has a second half. Centrality changes when the graph
   changes, so it wants invalidation on write rather than a TTL.
6. ~~**`/media/{filename}` serves uploads same-origin with no type
   restriction.**~~ **Done.** An extension allowlist on the way in *and* on the
   way out — upload is not the only route into that folder — plus an explicit
   `Content-Disposition`. The AI can write there too, which is what made it
   worth closing on a single-user local app.
7. **`edit_note` became `destructive=True`**, so the agent now stops for
   confirmation on every edit. Left as-is because it is defensible on safety
   grounds, but it was an unannounced change to how multi-step edits feel and
   deserves a decision rather than an inheritance. See ANALYSIS §34b.

**Three of the seven were closed in the same session that found them** — the
two smallest and the one ranked first. What is left is one product judgement
(7) and three performance items (2, 4, 5) that want measurement on a real
notebook before anyone picks a design.

## 41. The reported list, triaged — and the ordered plan

Two things at once, because they answer the same question. First: **every item
from the owner's reported list, with its real status** — several were said to
be fixed and were not, and a list you cannot trust is worse than no list.
Second: **the order to build in**, which is the part that has gone wrong
before. Three sessions running extended the newest section instead of looking
at what was underneath it, and §38 exists because of that. This section is
ordered by *what it unlocks*, and the ordering is the deliverable.

### How to use this section

**Work top-down and do not skip.** If an item is blocked, say so in the
handover and take the next one — do not quietly start something further down
because it is more interesting. The tiers below are not equal:

- **Tier 1 — correctness and trust.** Things that are wrong, lose data, or
  make the app feel unreliable. Nothing in Tier 2 is worth more than any of
  these.
- **Tier 2 — the features that are half-built.** Each is already paid for; a
  small amount of work turns a frustrating surface into a good one.
- **Tier 3 — new capability.** Worth doing, worth doing *after* the above.
- **Tier 4 — deliberately deferred**, with the reason. Not a backlog dump:
  each says why it is not Tier 3.

### Fixed in the audit session (do not rebuild)

Checked against the code, not against the report. §40 covers the antigravity
audit itself; these are from the owner's list:

| Reported | What it actually was |
| --- | --- |
| Automated tasks "keeps disabling itself" | Two controls wrote the preference; the skills-panel one never updated `prefsCache`, so the next `savePrefs` read the other checkbox and switched it back off. |
| Light/dark stops affecting the background after using the scheme selector | The scheme builder stored one page colour for the mode that happened to be on, written *inline* — which outranks every `[data-mode]` rule. Both modes are stored now. |
| Trace is unusable | The map never responded: `traceModeActive` was consulted nowhere. Rebuilt as a two-click mode with Swap/Undo/Escape. |
| Skill descriptions cut off in Settings | `.persona-preview` is `white-space: nowrap`. They wrap now. |
| Three sketch swatches the same green | They were `#22c55e`, `#eab308`, `#a855f7` — distinct. The *highlighter* at `globalAlpha: 0.05` is the real complaint; see Tier 2. |
| Tags / Recycle bin / Activity in the notes sidebar | Removed, with the dead `openLibraryOn` they were the only callers of. |
| Whiteboard library can't be closed | The panel covered its own toggle. It has a ✕ and the toggle sits above it. |
| Whiteboard boards named "Note 25" | Read `e.title || e.preview`; neither is a field on an entry. Shows the note's words. |
| No indicator for the selected whiteboard tool | The `.active` class was set with no CSS to render it. |
| `PUT /whiteboard/nodes/N — Node not found` | The drag sent no `board_id`, so a card on a named board was moved to the global one; a 404 now reloads the board rather than leaving an unsaved card on screen. |
| Documents list crushed | The list is `flex: 1 1 auto` and the outline below it never shrinks. Floor on the list, ceiling on the outline. |
| Password/token/secret storage | Checked: bcrypt with per-password salt for the password, `secrets.token_hex(32)` for session tokens (in memory, swept on expiry), private notes encrypted with a key wrapped by a password-derived key. No plaintext anywhere. Nothing to fix. |

### Tier 1 — correctness and trust

1. **Meeting transcription errors out.** Reported as simply not working, and it
   is a feature with a button in the UI. Reproduce first — `faster-whisper` is
   an optional extra, so the likeliest answer is that the failure path when it
   is missing is an error rather than an explanation. Until this is diagnosed
   nothing else in the meetings area is worth touching.
2. **"The AI fails to respond while still saying it is writing", and the skill
   step counted as done.** Two bugs in one report: no timeout on the stream, and
   a step marked complete on a turn that produced nothing. The second is worse —
   it makes the skill's own progress list lie, which is the surface the user is
   asked to trust. Needs a real timeout, a visible "this stopped" state, and a
   step that only ticks on a completed turn.
3. **Skills producing network errors / models that cannot run them.** Same
   family. A skill that fails needs to say *which* step and *why*, and offer
   the resume that `skill_from_step` already supports.
4. **Contradictions in the agent prompt around small talk.** `TOOLS_GUIDE`
   tells the model to take several turns and use tools; `intent.SMALLTALK`
   routes "hey" away from the agent entirely. Read both together and reconcile
   them — the prompt is resent every round, so a contradiction is paid for
   constantly.
5. **Notifications: work out what they are for.** The owner asks "do they
   actually work? what appears there and when?" — which is the question to
   answer before adding to them. Audit what raises one today, move the
   embedding-model-ready message into Background tasks where it belongs, then
   add reminders. An indicator nobody can predict is noise.
6. **Background tasks that never appear.** The task list is built from
   `routes_tasks.collect()`; anything on a worker thread that is not in there
   is invisible. Sweep for threads that are not registered, and make
   registration the rule rather than a thing each feature remembers.

### Tier 2 — half-built features, cheap to finish

7. **The sketch pad.** The highlighter at 5% opacity is effectively invisible
   (about twenty passes before anything shows) — that is the "completely wrong"
   in the report. Then: a size control that is reachable, a background colour,
   and a selection tool. The toolbar redesign comes *after* those, not before.
8. **The whiteboard, properly.** It works now and is thin. Wanted: an empty
   state that says how to start, a legible explanation of what a "board" is
   (a board is a note — that is a good idea nobody is told), resizable cards,
   and the same edge-labelling the graph has. See item 10.
9. **Skill runs: an auto/manual mode.** Explicitly requested and never built —
   `skill_from_step` is resume-after-failure, not a step-through. On manual, a
   skill pauses after each step with a Continue button and a text box, so the
   user can add what the agent missed or answer a question it raised. This is
   the single most-requested unbuilt thing on the list.
10. **A reason on every link.** "A note about uni and gym might still be
    related if they are both about scheduling." Optional free text on
    `entry_links`, shown on the edge and in Trace's readout, and writable by
    `link_notes`. Turns the graph from "these are connected" into "these are
    connected *because*", which is also what makes Trace worth reading.
11. **Note metadata and hyperlinked links.** A note's linked notes should be
    clickable through to those notes. Currently they are decoration.
12. **Timeline line view, and text placement in grid view.** Both reported as
    unrefined; both are layout work with a clear target.
13. **Arc view: labels behind nodes.** A z-order bug plus a general refinement
    pass on that layout.
14. **Documents in the graph.** They are notes' equal everywhere else and
    absent here.
15. **Battery-saver: an indicator and an honest description.** It silently
    changes what the graph shows and whether the librarian runs. A mode with
    invisible effects is a mode people distrust.
16. **The full-screen graph's Options panel**, the sketch/image toggles, and a
    suggested-links list that runs off the bottom without scrolling.

### Tier 3 — new capability

17. **Files and images on notes, and standalone in the Library.** The plumbing
    exists (`/media`, attachments); what is missing is the Library surface and
    drag-to-attach.
18. **A persona on the welcome messages.** Small, and it makes the app feel
    like one thing rather than a chat bolted to a notebook.
19. **Meeting recordings as first-class objects**: pause/resume, replay, save
    as a voice note, transcribe in the background. Blocked on Tier 1 item 1.
20. **Notification expansion**: reminders, and opt-in AI-generated nudges from
    the utility model. Blocked on Tier 1 item 5 — decide what notifications
    *are* first.
21. **Widgets: a picker.** A popup to add and remove dashboard widgets, and
    more of them.
22. **Customisable sidebars**, and note view options in the Notes tab.
23. **A mapping tab** — mind maps and linked diagrams. Overlaps the whiteboard
    heavily; decide whether it is a mode of the whiteboard rather than a tab
    before building it.
24. **Better-looking theme previews** in Appearance.

### Tier 4 — deferred, with reasons

- **"Make everything faster."** Not actionable as written, and the specific
  slow paths are now measured and fixed (§40 items 4–5: PageRank and the
  similarity sweep are cached; three N+1s and two O(n²) traps are gone). The
  next real work here needs a profile against a large notebook, not a sweep.
- **A second React frontend.** A second implementation of every screen, kept
  in step by hand, for an app whose whole design brief is "no build step". The
  cost is not the first version, it is every change afterwards having two
  homes. If the motive is component structure rather than React itself, the
  cheaper answer is to split `app.js` — see below.
- **Refactor `app.js` and `style.css`.** Both are past 20,000 lines. Worth
  doing, and worth doing *deliberately*: a mechanical split makes review
  harder for a session and gains nothing on its own. Do it when a feature
  needs it, one region at a time.
- **A pass over "the Gemini improvements".** Superseded — §40 is exactly that
  audit, done, with 46 tests and 4 lints so the next one is cheaper.
- **Spacing and clashing controls across the app.** Real, and too broad to
  action as one item. The design tokens and the four lints now make each
  instance a small fix; raise them as they are noticed rather than as a
  project.

### The rule this section exists to enforce

Anything reported goes in here with a tier, immediately, even if it is not
being worked on. The failure mode this project actually has is not forgetting
to write things down — it is **writing them down somewhere a later session
does not read**, then rebuilding or re-deriving them. One ordered list, at the
end of the file a session is told to start from.
