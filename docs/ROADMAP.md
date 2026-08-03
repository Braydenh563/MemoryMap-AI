# MemoryMap AI — work plan

Everything outstanding, in the order I'd do it. Written so a fresh session can
pick up without re-deriving context. Each item says **why** it matters, not just
what to build — the reasoning is the part that's expensive to reconstruct.

> **The live front door is [§38, "Where this actually stands"](#38-where-this-actually-stands--the-backlog-audit).**
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
| **ROADMAP.md** (here) | The live list: what to do next, and the two sections of freshly reported work (§35, §36). Start here. |
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

- The Timeline branch/line view (§10C) — new rendering work, but reuses
  §9's clustering and §10A's date data rather than inventing new grouping.
  **§37J is nearer-term and should happen first**: the Timeline's *existing*
  view clips text and doesn't render markdown, which is worth fixing before
  building a second view with the same two bugs in it.
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

Everything below came from one round of real use, mostly in the desktop app.
It is written up before any of it is fixed, because the session that collected
it was running out of room and an unwritten bug report is a bug that gets
rediscovered.

**Read this first: almost none of it is verified here.** The sandbox is Linux
with no Ollama and no pywebview, so "desktop app" and "thinking model" reports
are taken on the user's word. That is not a hedge, it is the same lesson §34
closes on and it has now cost real time twice — see "The standing caveat" at
the end of this section. Where I have found the cause in code, I say so and
name the line. Where I have not, it says **unreproduced**.

---

### 35A. The Ask section is the priority — it is a core feature behaving like a toy

Asked for directly and at length: *"the ask tab should be for reviewing,
revisiting, and searching up/asking about your notes, the chatbot can be for
the chat tab… make sure the ask section works properly and can be used
effectively… it is one of the core features of the program."*

Four separate reports land on this one box, and together they say the Ask
section was built as a cut-down Chat tab rather than as its own thing.

1. **"hey" gets a chatbot answer.** `intent.classify` routes smalltalk away
   from retrieval and `librarian.converse` answers it as an assistant would —
   correct for the Chat tab, wrong here. The Ask box has one job. **The fix is
   not a better classifier**: it is that this box should not offer the
   conversational path at all. A greeting here should say what the box is for
   and get out of the way, which costs no model round and cannot misfire.
   Note that `/chat/stream` is shared by both surfaces, so this is a request
   flag (an "only about the notes" mode), not a change to `classify`.

2. **The retrieved notes look truncated.** Worth confirming before fixing:
   `_prepare` retrieves with `limit=5` and `as_note` passes `entry.content`
   whole, so the truncation is not there — the likely culprits are
   `librarian.build_messages` and `ai/context.py`'s budget, which is *supposed*
   to clip and may be clipping much harder than the window requires. If it is
   the budget, the honest fix is to spend the Ask box's budget differently
   (fewer notes, more of each) rather than to raise the cap: five heavily
   clipped notes are worse than three whole ones for a question about what
   you wrote.

3. **Quick + a thinking model produces nothing at all.** Reported twice, same
   shape both times: it thinks, stops about three-quarters through, and emits
   no answer. This is the most serious item in the whole section — it is a
   total failure, not a degradation. The strong suspicion is `num_predict`:
   §"Do these next" item 3 records it as a flat 1,024 cap, and a thinking
   model spends that budget on *thinking* and then has nothing left for the
   answer. If so the fix is that the cap must be a floor for the answer, not
   a ceiling on both — thinking tokens should not be able to starve the reply.
   See 35D, which is the same bug family from a different angle.

4. **Make it a real feature, not a lesser Chat.** The direction to take: this
   box is for *interrogating the notebook*. That means the things a chat
   window does not do — say which notes it used and let you open them, offer
   a follow-up that narrows rather than continues, filter the search before
   asking, and be honest when the notes do not contain the answer (§34's "an
   answer that says I don't know"). Everything conversational belongs in the
   Chat tab, and removing it from here is what makes room for the rest.

---

### 35B. Hallucinated writes got through the net

The report includes a full transcript: the agent said it had linked notes 12
to 13, 15 and 16, unlinked 28, and suggested retags — narrated in the past
tense, as a numbered list of completed work — having called `related_notes`
once and no write tool at all.

**This is the failure the app most needs not to have**, because it is the one
that quietly destroys trust in everything else. `_CLAIM_PATTERN` exists for
exactly this (`agent.py`, the "Heads up: I described that…" branch) and did
not fire, so the first job is to find out why:

- the pattern very likely does not match "**Linked Notes:** We connected…" —
  it looks for first-person claims like "I saved", and this model wrote "we",
  in a bolded markdown list;
- and the net only runs when `did_write` is false for the *whole turn*. One
  successful `related_notes` call is not a write, so that part should have
  held — meaning the pattern itself is the gap.

Two fixes, and both are worth doing:
1. **Widen the pattern** — "we linked", "we connected", past-tense verbs for
   every write tool, and markdown-bolded headings. Cheap, and testable.
2. **Check the claim against the tools that actually ran**, which is §33's
   "completion verifier" (item 5) arriving early because a real user hit the
   case it was written for. If the turn claims a link and `link_notes` never
   ran, that is knowable without a second model round.

The prompt is also implicated: this model was told what it *could* do and
narrated doing it. §21's finding — that naming the tools in the instruction is
what makes a small model reach for them — is the lever here too.

---

### 35C. "Can Think: No" for a model that thinks

Reported for `gemma4 e2b`. `model_specs`/`supports` read Ollama's `/api/show`
`capabilities` list, which is exactly the mechanism §33 adopted from odysseus
and which caught the `think: false` bug. The likely causes, in order:

- the model genuinely does not declare `thinking` in its capabilities, in
  which case **the UI is wrong to print "No"** — `supports()` returns `None`
  for "can't tell", and §33's own lesson is that *known* is a separate fact
  from *known value*. "No" and "not declared" must not render the same;
- or the capability name differs (`reasoning` vs `thinking`) and the lookup
  misses it.

Either way the immediate fix is the honest one: never print a confident "No"
from an absent declaration. **Unreproduced** — needs a machine with the model.

---

### 35D. The response presets need to be model-aware

Asked directly: *"on the quick setting for the ai settings, it should be like
a flash model, I don't know if it is a good idea to disable thinking or make
it minimal thinking."*

The honest answer is that this is now two questions, and the second one is a
bug (35A.3):

- **Should Quick disable thinking?** Yes for models where it is optional, and
  §33 already found the trap: sending `think: false` to a model that rejects
  it is an error, which is why the capability list gets read first. So Quick
  should ask for no thinking *where the model says that is supported* and
  otherwise leave it alone.
- **`num_predict` must stop being flat.** A single 1,024 cap shared between
  thinking and answer is what plausibly produces "thought, then nothing".
  Quick, Normal and Detailed should each carry their own output budget, and
  the answer needs a reserved floor within it.

This is the item that most deserves a real-model test rather than reasoning
(see the standing caveat).

---

### 35E-bis. ~~"That button is still broken" — the header that explains it~~ — **fixed**

Reported again after §35F fixed it: *"I think the clear trash button is still
broken."* This time the app was **driven in a real browser** (Chromium is
installed in the sandbox; the app runs on localhost) and the flow works end to
end — the dialog opens, Confirm empties the bin, the server reports zero binned
notes. So the fix is in the file and the user is not running it.

**`StaticFiles` sent no `Cache-Control` at all.** A response with neither
`Cache-Control` nor `Expires` may be reused by a cache *without asking*, for a
heuristic fraction of its age (RFC 9111 §4.2.2). In a browser you press reload
and never notice. The desktop shell has no reload, is a WebView2/WebKit
instance with its own on-disk cache, and restarts the *process* without
invalidating any of it — so after an update it can go on running the previous
`app.js` indefinitely. `RevalidatedStatic` now sends `no-cache` (not
`no-store`: the etag still answers 304), and `tests/test_static_freshness.py`
pins it.

**This is the standing explanation for a whole class of report here**, and it
is worth reaching for before re-fixing a button: if the code is right and the
user still sees the old behaviour, ask what they are running.

Two more things the browser found in the same sitting, neither of them
guessable from the source:

- **The reminder poll ran twice.** §36C rewrote `checkDueReminders` further
  down `app.js`; the Wave O version above it was left behind, and JavaScript
  keeps the *last* declaration — so the stray `setInterval` beside the dead one
  was running the live poller on a second 30-second timer. Twice the requests,
  and a race where both polls read the announced-ids list before either wrote
  to it, which announces a reminder twice. Measured before and after: two
  `GET /reminders` per 65 seconds now, four before.
- **It 401'd once per load**, polling before the unlock. The deleted version
  had the `authToken()` guard; it moved across with the deletion.

`tests/test_frontend_handlers.py` gained a check for both.

### 35E. The desktop app is a second product and it is not tested

Every one of these is desktop-only, which is itself the finding: `pywebview`
is a different browser with a different origin and different file APIs, and
nothing in the suite touches it.

- ~~**The theme resets to default on every start.**~~
- ~~**Onboarding shows every time.**~~ **Both fixed, and the guess below was
  right: two symptoms, one storage.** Both lived in `localStorage` and nowhere
  else. The look and the onboarding flag are mirrored into the notebook's own
  preferences (`ui_state`) and seeded back for keys the browser has lost, so a
  shell that does not persist localStorage gets them back and one that does
  never notices. **The store is watched rather than its callers** — twenty-two
  sites write these keys, and a save call added to each would rot the moment
  somebody added the twenty-third. Reproduced and verified by wiping
  localStorage in Chromium between loads.

  Original note, kept for its reasoning: If preferences are
  keyed to an origin that changes per launch (or a storage API pywebview does
  not back), both fall out of one bug. **Find the storage first**; two symptoms
  with one cause is the likely shape.
- **No file-save feature works at all** — the report is "any of the file save
  features in the whole application". Downloads via `<a download>` / blob URLs
  are the usual casualty in an embedded webview, and every export in the app
  uses that path. Needs a save that goes through the *server* (write the file
  and tell the user where it went) rather than through the browser.
- **Markdown export of a chat does not work**, which may be the same download
  problem or may be its own bug. Test it in a browser first to find out which.

**§7 (desktop packaging) is listed in §34 as over-invested, and this section
does not change that** — but it does sharpen it. The app already *ships* a
desktop mode; the argument against §7 was about signing and updaters, not
about leaving the existing mode broken.

---

### 35F. Broken buttons, gathered together

Three reports of the same class — a control that does nothing:

- **The Rediscover widget's buttons, "again"** — the word matters: this has
  regressed at least once before, which means whatever fixed it last time was
  not held by a test.
- **The recycle bin's "Empty now"** (reported twice in one message).
- **The constellation's Regenerate**, "broken and severely glitchy".

Handled as one job, because the cause is probably shared: these are all
handlers bound to elements that are re-rendered, and a listener attached to a
node that a later `replaceChildren` throws away is exactly a button that
silently stops working. The fix that holds is delegation (bind to the
container, not the node) plus a test that would notice — `test_frontend_ids.py`
is the precedent for cheap static checks on this file.

---

### 35G. The constellation renders four or five stacked copies

Screenshotted, so this one is not in doubt. A render that appends instead of
replacing, called once per something — a resize observer, a tab switch, a
theme change. Almost certainly the same root cause as its broken Regenerate
button in 35F, and worth fixing together.

---

### 35H. Streaming and rendering — **the client half is not the problem**

- ~~**Agent steps do not stream.**~~ **The client-side diagnosis below is
  wrong, and it was worth an hour to find out rather than a rewrite.** Driven
  in Chromium against a stream emitting one NDJSON line every 120ms, the answer
  element inside a *plan run* grew 10 → 25 → 42 → 63 → 94 characters: the step
  timeline already routes deltas through `liveMarkdownRenderer`, exactly as the
  plain answer path does. The plan card, the ticked steps and the tool chips
  all appeared in order.

  **What is still possible, and is not disproved:** the *server* side.
  `ollama_client._ToolTextGate` holds prose back while it decides whether the
  text is the beginning of a tool call — which on a model that writes tool
  calls as prose rather than as structured calls would look precisely like
  "lands complete". That needs a real model to see, and it is the thing to
  measure first if this is reported again. **Do not rewrite the timeline.**

  Original note, kept because it is the reasoning that was checked: The server
  yields `answer` deltas per round, so the likely cause is client-side: the
  skill/step timeline buffers a step's text and renders it on completion.
- ~~**Markdown gaps.**~~ **done** — `unlatex` translates the small set of LaTeX
  escapes models reach for, and TOOLS_GUIDE tells the model to write symbols
  plainly. Confirmed in a browser: `$\rightarrow$` renders as →.
  The §22 note applies: this is *inline* rendering, deliberately, and block
  elements are not wanted back.

---

### 35I. Context compression for long chats

Asked for directly: *"there should be a tool as well as a manual command or
something to be able to compress chat context on longer chats so the AI can
better continue."*

This is the missing piece of §11a. Everything there is about the *fixed*
overhead (tool schemas, system prompt) and the *retrieved* half (notes);
nothing addresses a conversation that has simply got long. Two halves, and the
manual one should ship first because it cannot misfire:

- ~~**A button**: "Summarise this chat so far"~~ **built** — `🗜 Compress` in
  the chat header, `POST /chat/compress`.
- **A tool**, so the agent can do it when it notices it is running out of
  window. **Still open.** §33's warning applies: this is another tool in a
  registry §34 says should stop growing, so it has to displace something or
  justify the trim. Note that `make_plan` has since taken a CORE_TOOLS slot,
  which makes the case harder rather than easier — and the manual button now
  covers the case the user actually reported.

**What the built half found, and it changes the framing.** The request assumes
a long chat *overflows*. It does not: the client sends at most the last four
turns and `context.fit_history` drops whole user/assistant pairs from the
oldest end until the rest fits. So the failure is **silent forgetting** — the
model stops knowing what it was told at the start and begins re-asking it.
That is why a summary is strictly better than the current behaviour rather
than merely cheaper: the same few hundred characters carry the gist of ten
turns instead of the whole of one.

The reversible-compression idea §11 adopted for notes is the model to copy:
keep the original, show what was dropped, make it undoable. That is exactly
what shipped — **nothing is deleted.** The endpoint stores nothing and touches
no conversation; the transcript on screen and the saved conversation keep every
turn, and `chatSummary` only changes what is *sent*. Undo is one assignment.
The summary is editable before it is used, because it is about to be the
model's only memory of the first half of the conversation. It is not persisted
across a reload — re-deriving it is one click, and a summary restored against
the wrong thread would be worse than none.

---

### 35J. Smaller, but recorded so they are not lost

- **The agent cannot create a document.** There is `list_documents` and
  `get_document` but no `create_document` — an asymmetry nobody noticed
  because §5's document work was UI-first. This is a genuine gap rather than
  a deliberate limit, and it is the one *new* tool this section asks for.
- **The suggested models' approximate sizes are wrong.** `SUGGESTED_MODELS`
  is hand-written (§33 defends it as the right size of answer against
  odysseus's Cookbook) — but a hand-written number that is wrong is worse
  than no number. Check them against the registry, or drop the sizes.
- **The generative background art is not saved with a custom theme.** It is
  part of a look and should travel with one. Small, and it belongs to whatever
  fix 35E finds for theme persistence.
- **Quick sketch should be expanded.** Asked for directly. Note the tension
  worth resolving *before* building: §34 argues the whiteboard (§4a) is a
  separate product wearing this one's clothes. Expanding the existing sketch
  is the cheap version of that idea and is probably the right size — decide
  which of the two this is before starting.

---

### 35K. "Annoying and slow to get to do things, and then it only does a little"

A second round of reports, and this one is about the agent's *character*
rather than about individual bugs. Recorded together because they have one
theme: the agent is expensive to use and under-delivers on what it is asked.

- **"Note #12" means nothing to the user.** The model says it because every
  tool result carries an id and ids are what the tools take. But the user has
  never seen an id — the UI shows notes by their text. **Every id the model
  says out loud should be accompanied by the note's first few words**, and the
  prompt should say so; the id is the app's handle, not the user's. Cheap, and
  it makes every other answer more legible.

- ~~**A broad instruction gets a token effort.**~~ **built — `make_plan`.**
  Reported: *"I will say fix my categories and it will only merge two
  categories and leave it at that, ignoring the rest."* The counterpart of
  §21's finding about steps, and it took the same fix: the agent draws a 2–6
  step plan, its turn **ends**, and the skill runner works through the plan a
  step per turn. A plan is a skill nobody saved — same plan card, same ticked
  steps, same change list with an Undo on each — so there is one runner, not
  two. §33's "worth building" item 2 (`update_plan`) is closed by this, and
  the framing there was the useful part: it is not a progress indicator, it
  is what makes the model finish the job.

  Three decisions worth not re-deriving. **2–6 steps**: one step is just the
  action, and every step is its own turn on a local machine, so ten steps is
  minutes of generation before the end is visible. **A plan that is too long
  is refused, not truncated** — silently dropping the end of the job is the
  exact failure the tool exists to prevent, arriving from the other end. **A
  run may not start a run** (`tools.RUN_STARTERS`), or each nested one brings
  fresh rounds and the bound on a turn stops meaning anything.

- ~~**Long jobs cut out part-way.**~~ **fixed, and it was two bugs.** Reported
  later than the rest: *"the agent struggles with long tasks like skills then
  cuts out half way through and has to restart, or it hits a limit for tool
  calls which has happened quite a bit."*
  1. **The round cap counted rounds**, which cannot distinguish a model doing
     eight useful things from one doing the same thing eight times. Rounds are
     *earned* now (`agent.EARNED_ROUNDS`): a round making a successful call it
     has not already made buys another, to a ceiling. A loop earns nothing and
     stops where it always did.
  2. **A step that ran out was ticked off as done** — the runner could only
     see that the turn produced text, and "I couldn't finish step 1" is text.
     It is `stalled` now, the run stops there, and `stopped_at` names the step
     so the run can be **resumed from it** rather than restarted over notes it
     has already written to.

- **The token budget skyrockets on these turns**, which is the same bug seen
  from the cost side: rounds of tool results accumulate and every one is
  resent. §11a's fixed-overhead work is done; this is the *conversation* half
  and it is what §35I's compression is for. The two should be built together.

- **The chat bubble's metadata line is not visually appealing.** It has grown
  a field at a time — model, elapsed, tokens, rounds, context percent, whether
  the count was estimated — and never had a pass. Worth doing *after* the
  above, because what it should show depends on what the turns look like.

---

### 35L. The UI has no design system, and it shows

Asked for directly, and it is the sharpest criticism in this document:

> *"the way spacing, alignment and margins of all the ui features in each tab
> aren't consistent and it changes each tab. I want the UI across the
> application to be very professional, consistent and clean. not to look like
> it is just a bunch of ai generated slop features joined together"*

**That description is accurate and the cause is structural.** Every tab was
built in its own session, each one reaching for whatever spacing looked right
at the time, and `style.css` has grown past 5,000 lines with no shared scale
underneath it. The `.hidden` collision fixed this session (§35F's sibling — a
utility class losing to a component class written later in the same file) is
the same disease showing up as a bug rather than as ugliness.

**Started — the foundation is built. See [docs/DESIGN.md](DESIGN.md),** which
is the contract new features are written against. Done so far:

| | Before | After |
| --- | ---: | ---: |
| Distinct spacing values | 25+ | 9 |
| Distinct font sizes | 37 | 10 (+3 hero one-offs) |
| Distinct corner radii | 12 hard-coded px | 3 tiers, all derived from `--radius` |
| Page gutter treatments | 4 across 7 tabs | 1 |

Four of those were invisible as *bugs* and visible as ugliness. The corner one
was both: `--radius` is a user setting ranging 2–16px, and ~90 declarations
ignored it — so choosing square corners squared the cards and left every chip,
popup and button rounded. The page shell was the same shape of problem: content
began 1.8rem down one tab and 0.8rem down the next, because five rules drew the
same 2rem side gutter with five different tops.

`tests/test_style_scale.py` is the part that makes it hold, and it is worth
more than the conversion: without it the next tab reaches for whatever looks
right and the drift restarts, which is precisely how six tabs got here.

**Still open**, in order: colour has had no equivalent pass (surfaces, borders
and states have no documented scale); density and motion are settings a few
components ignore; and **none of this has been checked in a browser** — the
sandbox is Linux with no display, so every change was bounded to move no single
value more than 0.1rem, which is not the same as verified.

**This is not a "polish pass" and should not be attempted as one.** Going tab
by tab making things look nicer produces a seventh inconsistent tab. The order
that actually works:

1. **Extract the scale that already exists implicitly.** Every margin in the
   file is one of about six numbers with drift around them. Write those six as
   custom properties (`--space-1` … `--space-6`), and a type scale beside them.
2. **Convert one tab to use only those tokens**, and keep it as the reference.
   Notes is the right choice — it is the tab named in the same report as
   needing layout work, and the busiest.
3. **Then the rest, one at a time**, each a diff that only replaces hard-coded
   values. A conversion that also redesigns something is a conversion nobody
   can review.
4. **A lint that fails on a raw `px` margin or padding** outside the token
   block, so tab seven cannot reintroduce the problem. This is the step that
   makes it stick; without it this section will be rewritten in six months.

Related requests, all of which should wait for the tokens rather than land on
top of the current state:

- **The top of the dashboard** wants expanding and tidying.
- **A bottom bar**, mentioned before and worth checking IDEAS.md for.
- **The Notes tab layout, especially note metadata** — how a note's category,
  tags, dates and link count are shown. This is the single most-looked-at
  surface in the app.
- **The chat bubble's metadata line** (§35K) is the same problem in miniature.

**And the tab bar itself.** The Library tab (§4) is still unbuilt, and the
question was asked directly: *is it coming, and will the top bar cope?* The
honest answer is that the bar is already at the width where another tab hurts,
so **Library should not be added as a seventh peer.** Either it absorbs
existing tabs (documents and chats are both "things you have", which is what a
library is), or the bar gains an overflow. Deciding that *before* building §4
is much cheaper than deciding it afterwards.

---

### The standing caveat, now with three pieces of evidence

**Every provider test in this repository runs against a fake transport.** The
SSE framing and the tool-call fragment indices come from reading the
specification, not from a running LM Studio. §34 already says this. Two things
have since made it sharper:

- an hour was spent last session attributing a real bug to GitHub's
  infrastructure by reasoning about it instead of reproducing it;
- and this whole section is a list of failures that a fake transport, a Linux
  sandbox and no desktop shell could not have found — 35C, 35D and every part
  of 35E are invisible to the suite as it stands.

The nightly job §34 asks for (pull a small model, run ten real turns through
both providers) would have caught 35D directly. It is no longer a nice-to-have
in the "worth building" list; it is the reason this section exists.

---

## 36. UI layout and surfaces — the reported list

§35L is the *system* (tokens, scales, the lint). This is the **layout** work
that sits on top of it, reported directly and gathered here so it is one list
rather than a dozen remarks scattered through a chat log.

**Order matters between the two.** Every item below is a change to how a
surface is arranged, and each one is cheaper and more likely to stay right once
it is built from tokens rather than from whatever looked correct that day. The
system landed first on purpose.

---

### 36A. ~~Scrolling and sticky surfaces~~ — **both done**

Built. The window no longer scrolls at all: `body` is one viewport tall and
the visible page is its own scroll container, so the scrollbar starts below the
header. That was also the prerequisite for the sticky chat header — sticky
resolves against the nearest scrolling ancestor, and while that was the window,
a header inside a page could not stick to the top of the page. Four sticky
sidebar rules that cleared `--header-h` were updated with it; the header is
outside the scroll container now, so clearing it would offset them twice.

Original notes kept below.

- **The page scrollbar runs behind the top bar.** Screenshotted. The header is
  `position: sticky; top: 0`, so it floats over a window-level scrollbar that
  starts at pixel zero — the bar and the scrollbar visually collide. The fix is
  structural rather than cosmetic: **the window should not be the scrolling
  element.** Make `body` fixed-height and give the page region below the header
  its own `overflow-y: auto`, so the scrollbar begins where the content does.
  Worth doing early because several items below assume a scroll container that
  is not the window — sticky chat headers especially.
- **Chat headers should stay put while a chat scrolls.** Asked for directly.
  Once the scroll container is the message list rather than the window, this is
  `position: sticky` on the conversation header and nothing else. Doing it
  *before* the container change means fighting the window's scroll position,
  which is why these two are one item.

### 36A-bis. ~~The tab bar's fade sat on the Reminders tab~~ — **fixed**

Reported: *"the reminders tab in the top bar is partially faded out on the
right."* Reminders is the last tab, so it wore the whole of two mistakes in
one rule.

- **The fade said "this bar scrolls", not "there is more that way."** Scrolled
  to the end — or overflowing by four pixels — the last tab was dimmed with
  nothing hidden behind it, which reads as a disabled control rather than as a
  hint. It is per *edge* now, painted only on a side with content beyond it,
  and recomputed on scroll as well as on resize.
- **12% of the bar is a whole tab, not an edge.** The ramp is a fixed
  `1.5rem`, so it fades the same amount at every width.

Selecting a tab now scrolls it into view, so the fade is only ever over a tab
you are not using.

**Then a photograph showed the other half of it**, which fading cannot fix:
"Dashboard" clipped to "oard" against the left edge. A tab you have to drag
sideways to read is a tab people stop using. **When the strip cannot fit beside
the wordmark and the header buttons it now takes a row of its own** — measured
(`tabRowSpace`), not a breakpoint, for the same reason the fade is.

Note that the header's `flex-wrap: nowrap` is deliberate and stays: the *old*
wrap dropped `.header-controls` — which carries `margin-left: auto` — onto a
second row pinned right, at almost every laptop width. Here the tab strip is
what moves, by an explicit order and a 100% basis, and only when measured not
to fit.

**Verified in a browser this time** — Chromium is in the sandbox and the app
runs on localhost. At 1920/1600/1440 the tabs sit inline and nothing fades; at
1280 and 1100 the strip takes its own row with all seven readable and the
controls still on row one. Measured, then screenshotted and looked at.

### 36B. The three surfaces that need rearranging, not restyling

Each of these was called out as needing a **new layout**, not a coat of paint.
They are listed smallest-first, and the rule for all three is the same: decide
what the surface is *for* before moving anything, or the result is the same
controls in a different order.

1. **Settings — "the settings are a mess."** ~~Two changes: group by intent,
   and make it searchable.~~ **Half done, and the half that was left turned out
   to be the whole of it.** An audit found the grouping already built — The AI
   / Your notebook / System — so the remaining problem was never arrangement:
   with fourteen sections, finding a control means guessing which one holds it.
   **The filter is built**, and it searches each section's *rendered contents*
   rather than its title, so "corner" finds Appearance and "backup" finds
   Import & export. Text is read live, because several sections are filled in
   by JS after first paint and an index built at startup would search empty
   panels. What is left is the density *within* the longer sections.
2. ~~**The Chat page controls.**~~ **regrouped, then moved to the composer.**
   Asked for directly after the regrouping: *"I was thinking of moving the
   majority of the ui controls like the chat/agent pull, web search and stuff
   to the bottom bar with the chat input."* Correct, and it is the same split
   taken one step further — a control that decides what happens to the **next
   message** (Chat/Agent, Web, answer length, persona, the skill picker,
   attached notes) now lives in a **dock** at the bottom with the input box;
   the header keeps only what is about the **conversation** (its name, its
   cost, export). You set them as you write instead of scrolling back up.

   The web and persona panels moved down with the buttons that open them — a
   toggle at the bottom opening a panel at the top reads as a button that does
   nothing — and the web panel is capped at 45vh inside the dock. Ids are
   unchanged throughout, so `app.js` needed no edit; `tests/test_chat_dock.py`
   pins the arrangement, because nothing else here can see it.

   **Then made compact**, asked for directly: *"make the bottom dock in the
   chat bar cleaner and better structured ui wise so it's not as bulky."* The
   first version was three stacked bands — a skills row, a controls row and the
   composer — which is most of the height of a short conversation. Now one
   strip of four groups, and the two things that made it tall are gone: the
   skill's description (a sentence of running text, clipped mid-word; it is the
   select's tooltip now, where `skillSummary` already puts the steps and tools)
   and a "⚡ Skill:" label beside a select whose placeholder said the same
   thing. One `--control-h` for every select, button and segment is what makes
   it read as a strip — the segmented control had been four pixels taller than
   its neighbours, which is §35L's complaint in miniature.

   **The header became two levels rather than one row of equals**: the title as
   the heading, the token count and the "reading a summary" note as a quiet
   subline under it, and only the two conversation actions on the right. The
   usage chip used to be a filled pill between the title and the buttons, which
   read as a third button and shoved the actions sideways whenever the number
   gained a digit.

   **Then reported off again, and the cause was worth writing down:** *"some
   are higher or lower than each other and different heights."* Matching the
   heights was not enough. **A margin on a flex item is centred with the
   item** — `.seg` carries `margin-bottom: 0.5rem` from the stacked forms it
   was built for, so under `align-items: center` those 8px sat it 4px above its
   neighbours and made its group 8px taller, pushing the next group 4px down.
   Two visible offsets from one declaration three thousand lines away, and the
   second version of the rule reproduced it in a margin of its own. The strip
   zeroes outside spacing for everything in it now; DESIGN.md has the rule.

   The composer was worse and nobody had measured it: 📎 45.2px, the box 49.0,
   🎙 45.2, Send 43.2, three different tops. It has its own `--composer-h`
   (2.75rem — the 44px touch minimum, since this is the row used on a phone)
   and aligns to `end`, so the buttons stay level with the caret's line as the
   box grows rather than drifting up the side of it.

   Measured and screenshotted in a browser, light and dark: dock 3 rows → 1,
   one top and one height per row (strip 30.4px, composer 44px), header 41px
   empty / 59px with metadata.

   Still open: the composer's own controls (📎, 🎙, Send) have not been looked
   at.

   Original note: The toolbar has grown a control at a time —
   Chat/Agent, Web, response mode, persona, peek, export, skill picker, tools
   toggle — and they are all peers in one row despite answering completely
   different questions (*who* is answering, *how hard* it should work, *what it
   may touch*, *what to do with this conversation*). Grouping them by that
   question, and demoting the per-conversation actions (export, peek) out of
   the per-message row, is most of the work.
3. **The Notes tab.** *Metadata done, layout still open.* The card's chips had
   no hierarchy — category, tags, an AI confidence badge and a date all at one
   weight, with the green confidence badge loudest of all despite being the
   least important. Three levels now, at one size, carried by weight and
   colour. And the reported "massive gap between the lines" had a single
   cause: `.entry-meta-end` carried `margin-left: auto`, so once the chips
   filled a line it wrapped and landed alone on the next one — an empty band
   on every card with more than a few tags. The actions moved out of the flow
   to the card's corner.

   **That pattern is worth knowing about**: `margin-left: auto` inside a
   *wrapping* flex row orphans whenever the row fills. It was also in the graph
   toolbar and the chat toolbar's end group; both now reset it at the width
   where wrapping starts. Any new toolbar wants checking for it.

   **The layout half is done now, and the decision it asked for is: the card is
   the note.** Everything else supports it. What the measurement found was not
   "equal weight" but weights *inverted* — a card was 25px of its own note,
   23px of metadata and 21px of link chips, and the chips were the loudest
   thing on it: filled, accent-coloured, weight 600, each carrying the whole
   first line of another note. On a well-linked card the links were wider than
   the note and read first.

   A link is **navigation, not content**. The chips are clipped to 28
   characters with the full text on hover, outlined rather than filled, muted
   until the card is hovered, and their ✕ follows the card's other actions —
   present on hover and focus, out of the way while reading. Scoped to
   `#entry-list`, because the same chip on a reminder or a document *is* the
   subject of its row and quietening those would be the opposite fix.

   Original note: Called out twice — once for layout generally and once
   specifically for **note metadata and how it is visualised** (§35K). This is
   the most-looked-at surface in the app and the hardest to get right; it wants
   a decision about what a note card is *for* at a glance — is it the text, or
   is it the text plus its category, tags, dates, link count and privacy state?

### 36C. ~~Reminders that you actually notice~~ — **built**

Reported: *"reminders when they go off aren't really noticeable and need to be
more evident, maybe through a browser or system/app notification?"*

Correct, and it turned out to be simpler and worse than "not evident enough":
**nothing checked.** A reminder's only surface was the tab badge, painted by
`updateReminderBadge`, which ran only when something happened to call
`loadReminders()`. Unless you reloaded or opened that tab, a reminder came due
and the app said nothing, indefinitely.

Built: a 30-second poll plus a check on window focus and visibility change (for
the machine-was-asleep case), a count in the document title — the one surface
that works while the app is in a background tab, which is where it usually is
— a system notification and a toast, once per reminder, with announced ids kept
in localStorage so a reload does not re-announce everything overdue. Several
due together get one summary rather than three notifications.

**What is left here is the notifications centre** (§36E), as the place fired
reminders accumulate. The three layers as originally planned:

1. **The Notification API**, which is one call and works in both the browser
   and the desktop window. Needs a permission prompt asked at the right moment
   — when a reminder is *set*, not on first load, because a permission request
   with no context is refused by default and cannot easily be asked again.
2. **An in-app presence that does not depend on the tab being focused** — the
   title bar counter, and a sound the user can turn off.
3. **A notifications centre** (asked for separately below) as the place they
   accumulate, so a reminder that fired while the app was closed is not lost.

The honest note: nothing here should fire while the app is not running, which
is a real limit of a local-first app with no background service. Say so rather
than implying otherwise.

### 36D. The dashboard's quick access, and a status bar

- ~~**Expand the quick-access buttons.**~~ **done.** The row orders by how
  often you press each one, and promotes up to two recently-run skills — with
  New note pinned first and Tools & features pinned last, because a row that
  reorders completely is a row you have to re-read every time, and the value of
  a fixed position is that your hand learns it. Skill runs are recorded from
  `startSkill`, so a run the agent started itself (§33) counts too.
- ~~**Make Quit reachable.**~~ **done**, and it uncovered a real bug that
  predates this work: `$("app-quit").addEventListener` had been spliced into
  the middle of `renderChatModeSeg()`, which runs on every chat-mode change —
  so each call bound another listener, and clicking Quit opened one confirm
  dialog per mode switch. `tests/test_frontend_handlers.py` now catches the
  class.

  Original note: Expand the quick-access buttons at the top of the dashboard. They are the
  first thing on the first screen, and there are currently six that were chosen
  early. Worth making them **reflect what you actually do** — most-used
  actions, recently-used skills — rather than a fixed list.
- **A bottom bar, "like in VS Code but stylised for the application."** Worth
  building, with one caveat recorded up front: VS Code's status bar works
  because every item is either a *state you need at a glance* (branch, errors,
  line number) or a *command you use constantly*. A bottom bar filled with
  things that are neither is a permanent strip of decoration. The candidates
  here that genuinely qualify: **AI/backend status** (currently a pill in the
  header), **reminder count**, **notebook size**, **the current background
  task**, and a **command entry point**. That is enough for a bar; anything
  beyond it should have to displace one of those.
- Note that the bar and the header are competing for the same job for some of
  these — the AI status pill in particular. Moving it down is better than
  showing it twice.

### 36E. Notifications centre, and the changelog in-app

- ~~**A notifications centre**~~ **built.** A bell in the header, because an
  event can arrive while you are on any tab and a notification you have to go
  somewhere to find is one you never see. Fired reminders, finished background
  jobs and runs that stopped early collect there, each actionable where there
  is something to act on.

  Three decisions worth not re-deriving. It is **not a second source of
  truth**: a fired reminder is still a row in the reminders table, and opening
  the panel folds in whatever is *currently* overdue — which is the one case an
  event log cannot cover, a reminder that came due while nothing was running to
  notice. It is **not stored server-side**: these are ephemeral and there can
  be many, and the notebook's preferences file is not a log. And it **says on
  screen** that nothing fires while the app is closed, rather than implying
  otherwise.

  Original note, kept: MemoryMap already *produces* all of these events and
  shows each of them in its own way (a toast, a status pill, a step timeline);
  the centre is the place they persist after their moment has passed.
- ~~**Read `CHANGELOG.md` in the app.**~~ **done.** Served from the real file
  and rendered in Settings → About, folded shut. Serving the file is the point:
  a second in-app list would say roughly the same things and drift within a
  release. A packaged build without the file hides the control rather than
  offering one that opens onto nothing.

### 36G. The Library as the app's management area — **the decided direction**

**§36F's two questions are answered and the first version is built** (see
§36F below, and `routes_library.py`). What follows is the direction the user
set immediately afterwards, in their words: *"I want the library to assimilate
the activity and rubbish bin. The library should also probably assimilate
multiple other features. It will be the central management area for the
application."*

That is a bigger claim than §4 made and it is the right one, so it is written
down before anyone builds the next piece against the old, smaller idea.

**What is built.** Documents, chats, files and the bin in one grid; filter
chips with counts; search across titles *and* previews; four sorts; a ⋯ menu
per card (pin/rename/delete for a chat, rename/download/delete for a document,
restore for a binned note, download for a file); an **Include bin** toggle,
off by default, because deleted things are not part of "everything you have
made". Assembled server-side so a new kind appears without touching `app.js`.

**What is next, in order.** *(1 and 2 are done, and 4 has happened: the three
panels are deleted — see the end of this section.)*

1. ~~**The bin, in full.**~~ **done.** The Library shows binned notes and restores them, and
   that is all — the bin panel still owns *Empty now*, the "kept for N days"
   line, and permanent delete. Reported directly: *"in the bin section it
   should have all the features of the rubbish bin."* Those move here, and the
   sidebar's 🗑 button follows the 📚 pattern — it opens the Library on the Bin
   chip rather than opening a second panel.
2. ~~**Activity.**~~ **done.** The audit log is a list of things you did, which is the same
   shape as the Library's list of things you made, and it is currently a panel
   behind a sidebar button that nobody finds. It becomes a kind: `activity`,
   read-only, with the same filter chip and the same card.
3. **Then decide what else.** "Multiple other features" is right in spirit and
   dangerous as an instruction — the Library earns its place by *replacing*
   surfaces, not by collecting them. The test each candidate has to pass is
   §36F's: does moving it here make the app **smaller**? Tags and Saved
   searches both pass (both are finding surfaces, both are behind buttons in
   one sidebar). Reminders does not — a reminder is a thing that happens to
   you, not a thing you go and find.
4. **Then the tab bar.** Once Bin and Activity are here, the Notes sidebar
   loses three of its buttons, and that is the moment to look at the bar again.

**One trap, recorded because it has now cost two sessions.** A popup inside a
card is trapped by the card's stacking context, and `backdrop-filter` creates
one — no `z-index` has to be in sight. The note cards hit it via
`.entry-actions` and the Library cards hit it via the blur; both are fixed by
lifting the *owning element* (`.menu-open`), never the menu. If a menu is
reported behind something, that is the first thing to check.

#### The panels are deleted — the first surface this project has removed

`#bin-panel`, `#activity-panel` and `#tags-panel` are gone from `index.html`,
and `renderBin`, `renderActivity`, `renderTags`, `PANELS`, `showPanel`, the
`.panel-close` wiring, the `#bin-empty` handler and `entryItem`'s
`options.bin` branch are gone from `app.js`.

**Why it was the top item and not merely tidying:** each of those three things
had two implementations, and the bin's two could *disagree about what was in
it*, because each fetched its own list. Two surfaces that can contradict each
other about whether a note still exists is a correctness bug wearing a
duplication costume.

**What had to be built first**, and the one thing that kept the panel alive
past its chip: reading a binned note **in full**. A Library card shows a
preview — right for a grid of mixed things, wrong as the only way to see a
note you are about to destroy, because "restore or delete for good?" is a
question you answer by reading it. So `#binned-overlay`: read-only, the note's
own markdown, Restore and Delete for good, backed by
`GET /entries/{id}?deleted=true`. That read is deliberately opt-in (an
ordinary read still 404s on a binned note) and deliberately does not count
towards "most accessed".

"Kept for N days" came down with it, into the Library's bin bar. It was the
one thing the panel said that the Library did not, and it is the difference
between a bin you trust to clear itself and one you assume you must empty.

**The rule this establishes.** A surface may be replaced without being
deleted, but only for as long as it can still do something its replacement
cannot. Write that thing down when the replacement ships, because it is the
whole of the remaining work — here it was one sentence ("read a binned note in
full") and one overlay.

#### Should the Library absorb Notes and Documents too?

Asked directly, with the honest caveat attached: *"I did have a thought that it
could absorb the notes and documents tab as well but I don't know if that's a
good idea or not."* Here is the reasoning, so the next session does not have to
re-derive it.

**Documents: yes, and it is now done to the same shape as Chat.** *(An earlier
draft of this paragraph said the Documents tab had no list of its own. It did —
the tab button had gone but the full list and its filter box were still in the
sidebar, so there really were two. That is fixed rather than re-described.)*
The filter box moved to the Library, the list is capped at eight recent, and
the sidebar is otherwise about the document you have **open**: its outline, the
notes it draws on, where it is kept. A `📚 Browse all in Library →` button says
where the rest went, exactly as the chat sidebar does.

What is left for the editor itself: it is reached only from the Library now, so
it can stop pretending to be a tab — a wider writing column, and the outline
and linked-notes panels earning their place beside it rather than sitting
folded shut under a list.

**Notes: no — and the reason is not sentiment.** The Library is a *finding and
managing* surface: you arrive knowing roughly what you want and leave having
done something to it. The Notes tab is a *working* surface: capture, ask,
write, browse, four sub-tabs you move between while thinking. Those are
different jobs and the same argument that justified absorbing the others cuts
the other way here — absorbing Notes would not make the app smaller, it would
make the Library the app, with the Library's own management furniture (ticks,
bulk bars, kind chips) sitting on top of the one surface where you want none of
it.

What Notes *should* lose is what it was already lending: its sidebar's Tags,
Recycle bin and Activity buttons now open the Library, and the panels behind
them can go once the Library's versions have every control they had. That is
the absorption worth doing — it shortens Notes without moving it.

**The theme.** Asked for: *"a library bookshelf kinda theme."* The first piece
is built and it is deliberately structural rather than decorative — every card
wears a coloured **spine** down its left edge, one colour per kind, so a shelf
of mixed things is scannable by edge alone before a single title is read. The
next pieces, in the order they add most: shelf *rows* with a rule under each
group when sorting by kind, a warmer paper/board treatment for the card face
that survives both themes, and the grid's own empty state drawn as an empty
shelf rather than a sentence. Anything decorative that makes a card harder to
scan should lose to the scan — this is a management screen wearing a theme,
not a bookshelf that happens to hold data.

### 36F. The Library tab, and the tab bar it has to fit in — **decided, and built**

> **Both questions below are answered.** 1: the Library **absorbs** — it
> replaced the Documents tab and the chat sidebar's list, and the bar is the
> same length it was. 2: therefore no overflow was needed. The chat sidebar
> kept a *switcher* (eight recent, no search) because switching mid-conversation
> is a different job from finding; browsing moved here. See §36G for where it
> goes next.

**The Library (§4) is part of this work, not a separate feature to build
afterwards.** Asked for directly. It is the only major surface still unbuilt,
which makes it the one chance to get a tab right *from* the design system
rather than retrofitted into it — and the test of whether §35L actually holds:
if a new tab built from the tokens still needs its own gutter, its own
heading sizes and its own spacing, the system has not worked.

Two decisions to make before any of it is built, because both are much more
expensive afterwards:

1. **What the Library absorbs.** §4 describes it as chats, documents, images
   and archive. Documents is already a tab; conversations already have a
   sidebar. A "library" that duplicates two surfaces that exist is worse than
   no library — the honest version is that it *replaces* them, and the tab bar
   gets shorter rather than longer.
2. **What the tab bar becomes.** It is already at the width where another tab
   hurts, and the **bottom bar (§36D)** changes what belongs up there anyway.
   Either the Library absorbs tabs as above, or the bar gains an overflow.
   Deciding this while the Library is still on paper is the cheap moment.

Its layout should follow the same rule as §36B: decide what the surface is
*for* first. A library is for **finding something you made before** — which is
a different job from the Notes tab's "work with what I have", and should look
like it: bigger units, more metadata, sort and filter as first-class controls
rather than an afterthought.

---

## 37. Reported in one session — the second big batch, reprioritised

A long list arrived in one sitting, most of it about UI polish. Written up
**before** most of it is built, at the user's explicit request: *"first
reprioritise the roadmap development plan so that all the key features and
fixes are appropriately prioritised and ordered for the next session."* Six
items were small and clear enough to fix the same session — those are marked
**done** with the reasoning, so the next session does not re-derive them. The
rest is ordered by how much it unlocks or how often it gets in the way, the
same rule §36's handover ranking uses, not by how interesting it is.

**Read the standing caveat before touching anything visual.** §35's own
warning still applies to part of this list: nothing here was driven against a
real Ollama, and the desktop shell was not available to reproduce any of it in.
Everything marked **done** below *was* reproduced in Chromium — the two things
kept separate deliberately.

---

### 37A. Done this session

1. ~~**Quick sketch's Close button just darkened the background.**~~ **Fixed
   and verified with `elementFromPoint`.** `#sketch-overlay` sat at
   `z-index: 60` — the toast/notification tier — while `closeSketch()`'s
   "close without saving?" confirm dialog is a `.modal-overlay` at
   `z-index: 55`. Equal or lower z-index paints *behind* a higher one
   regardless of DOM order, so the confirm dialog's own darkened backdrop
   rendered underneath the sketch pad, its card hidden beneath the canvas —
   which is exactly *"darkens the background"* instead of showing a dialog to
   click. Lowered to `z-index: 55`, matching every other modal, so a nested
   confirm (later in the DOM, equal z-index) now correctly paints on top.
   **`#improve-overlay` had the identical latent bug** — same private
   `z-index: 60`, just no confirm dialog wired to it yet — fixed alongside it
   so the next feature that adds one does not rediscover this.
2. ~~**Dropdown/select boxes are tight; the arrow clashes with the text.**~~
   **Fixed at the base `select` rule**, app-wide, not just the chat dock (which
   already had this treatment from the previous session). `appearance: none`
   plus a painted two-line chevron in reserved padding (`--space-8` on the
   inline-end side), so the arrow can never sit under a long option — a
   persona name, "Newest first", a model id.
3. ~~**UI elements above the notes list are different heights.**~~ **Fixed.**
   `.browse-tools` (the filter box, `?`, the sort select, Select) now declares
   one `--control-h: 2.3rem` the way `.library-toolbar` already does — the
   same three-heights-on-one-line bug, same fix, different toolbar. Verified:
   all four controls measure 37px.
4. ~~**Popup buttons in the notes sidebar clash with the category note
   numbers.**~~ **Fixed and verified.** `.category-actions` (✎/🗑) is
   `position: absolute; right: 0.5rem`, overlaying the row on hover; `.count`
   is a normal-flow sibling at the same spot, kept hidden underneath only by
   `background: inherit` — which a glass card is never fully opaque enough to
   guarantee, and `.active`/hover both change the background anyway. The count
   now fades out exactly when the actions fade in (`:has(.category-actions)`),
   rather than trusting paint order to hide it. The touch fallback had a worse
   version of the same bug — `opacity: 1` with no hover on touch meant the
   icons sat on top of the number *permanently*, not just while pointed at —
   fixed by taking the actions out of absolute positioning entirely on
   `(hover: none)`, so the row makes room for both.
5. ~~**Before signing in, a popup says "failed to load entries."**~~ **Fixed
   and verified with a stale-token reload: lock screen shows, zero toasts.**
   A token left over in `localStorage` (server restarted since the last visit)
   makes `startApp()` fire a dozen bootstrap requests in parallel before
   anyone has unlocked anything. Every one hits the same 401, `api()`
   correctly shows the lock screen — and then threw a plain `Error("Locked")`
   that `startApp()`'s per-step `.catch()` *also* toasted, once per step:
   "Couldn't load entries: Locked", "Couldn't load recent questions: Locked",
   and so on, stacked in front of the lock screen that had already, correctly,
   explained the one real state. The 401 error now carries `isLockout = true`
   and the step wrapper skips its own toast when that flag is set — the lock
   screen is the single source of truth for "you are not logged in."
6. ~~**On first load I want it to show the Dashboard.**~~ **Fixed.** Only the
   *fallback* changed — `switchTab(localStorage.getItem("activeTab") ||
   "dashboard")`, was `"notes"`. A returning visit still opens on whichever
   tab was last active; that is the point of remembering it. The odd choice
   was defaulting a genuinely first-ever run, with nothing in the notebook
   yet, to a list with nothing to browse.

### 37B. Decided — no. Skip the lock-screen Quit button

**Answered with the user in the room, as this section asked.** No unauthenticated
`/auth/shutdown` route, no lock-screen Quit button. The trade-off below is why:
on `localhost` a working Quit changes nothing a terminal `Ctrl+C` couldn't
already do, but the app already hints at LAN/phone access elsewhere in
Settings, and an unauthenticated shutdown route is a standing DoS the moment
that happens. Not worth it for a convenience button. Leave `quitApp()`
unwired on the lock screen — its `catch {}` swallowing the 401 is now the
correct behaviour, not a bug to fix.

The original write-up, for the reasoning:

**A Quit button on the lock/login screen.** Asked for, and worth building —
but wiring it to the existing `quitApp()` without a backend change would
silently do nothing: `/shutdown` lives in `routes_tasks.router`, mounted with
`dependencies=locked`, so a click before unlocking hits the same 401 every
other pre-auth request does, and `quitApp()`'s `catch {}` swallows it. Making
the button work means one of:

- **A second, unauthenticated route** (`POST /auth/shutdown`, reusing the
  three-property shutdown documented on the existing endpoint: POST-only,
  behind `OriginCheckMiddleware`, SIGINT not a hard exit). The origin check
  already runs globally and already protects `/auth/setup` before a password
  exists — the exact analogous case — so this does not open a new *kind* of
  hole against a browser-based cross-site attacker.
- **The trade-off that is real:** it removes the requirement to know the
  password before the process can be killed remotely. On `localhost` that
  changes nothing a terminal `Ctrl+C` could not already do — the app's whole
  threat model is single-user, local-first. If MemoryMap is ever bound to
  `0.0.0.0` for phone access (hinted at elsewhere in the settings), an
  unauthenticated shutdown becomes a denial-of-service anyone on the LAN can
  trigger without the password. That is a deliberate choice about the auth
  model, not a UI bug — **make it with the user in the room**, not folded into
  a batch of forty other fixes.

If it goes ahead: reuse the existing SIGINT-via-timer logic (factor it out of
`routes_tasks.shutdown` rather than duplicating it) and mount the new route
in `routes_auth.py`, which already has the pattern for pre-auth endpoints.

### 37C. The chat dock — asked for again, and the reason is worth naming

Reported repeatedly across this list: *"full redesign and improvement of the
bottom dock,"* *"the bottom dock in the chat is verrry bulky and needs re
designing."* Two sessions have now fixed real bugs in it (the overflow that
drew outside the card, the web panel that had to leave, the controls unified
into one visual family, a Plan button added) without it stopping being
reported as bulky — which means **the remaining complaint is about density,
not correctness.** Bug fixes and a density pass are different jobs, and this
one is still owed the second.

Concretely, in the order they'd help most:
1. **Fewer rows at rest.** The skills group, the mode segment, the length/
   persona pair and the composer are four visual bands even though the first
   three now share one strip — collapsing infrequently-changed choices (length,
   persona) behind a single "⚙" disclosure next to Send would leave the
   composer as almost the whole dock on a normal turn, with the rest one click
   away rather than always drawn.
2. **A compact/expanded toggle**, remembered like the composer height already
   is, rather than one fixed density for everyone — the same instinct behind
   the Appearance density setting (37E below), scoped to this one surface.
3. Re-measure against **37E's zoom setting** once it exists: some of "bulky"
   may be "too large for a 13-inch screen at 100%," which a zoom control fixes
   for the whole app rather than one row at a time. Build 37E first and
   re-look at this before spending more effort here.

### 37D. The web panel — resizable, and the reader refined

Landed this session as a column beside the conversation (§36G-adjacent, see
the handover); asked for more work on the same afternoon: *"the web browser
popup still needs some work and I want the web browser sidebar to be
adjustable in width, the in-app render feature needs refining and the popup
buttons need some ui adjustments."* Three distinct asks:

1. ~~**Resizable width.**~~ **Done.** `#web-panel` isn't a grid column like
   the three sidebars `makeSidebarResizable()` handles — it's a flex sibling of
   `#chat-main` inside `<main>`, sized by `flex-basis: clamp(19rem, 30%,
   26rem)` — so it gets its own `makeWebPanelResizable()` rather than a line
   added to the existing function. The handle sits on the panel's *left*
   (leading) edge, the mirror of the sidebars' trailing-edge handles, since
   the panel is the right-hand column. Deliberately does **not** apply an
   inline width on load the way the sidebars do: the `clamp()` is a
   considered default (see the comment above the CSS rule), so only a drag
   overrides it, and Home/dblclick *remove* the inline style rather than
   reapplying a remembered number — the responsive default comes back rather
   than a frozen copy of it. Below the 1100px breakpoint where `#web-panel`
   takes all of `<main>`, the inline override is suppressed (an inline style
   would otherwise beat that media query regardless of screen width) and
   restored via a `matchMedia` listener when the window widens back past it.
   Verified in Chromium: drag either direction moves the panel edge, the
   width survives a reload, and the mobile breakpoint still takes over full
   width regardless of a saved drag.
2. **The reader view "needs refining."** No specifics given — this needs a
   short round of the user actually reading a page in it and saying what is
   wrong (too narrow now that it has a whole column instead of 20rem? typography
   too small? the ← Results / 💬 Ask about this / ＋ Save row cramped?) before
   guessing at a fix.
3. **"Popup buttons need UI adjustments"** — likely the same three
   (← Results, Ask about this, Save as note) now stacked in `.web-reader-actions`
   under the column layout. Worth a screenshot from the user showing the
   specific awkwardness rather than re-deriving blind.

### 37E. A UI zoom setting in Appearance — done

*"my computer is a small 13-inch laptop so I need to go to like 80% browser
zoom to see everything and not have it so squished or narrow."* A real,
common case the app currently has no answer for beyond the browser's own
Ctrl+/Ctrl- — which resets on every launch and is not a MemoryMap setting at
all.

**Built on the third option this section weighed** — a root `font-size`
percentage, not CSS `zoom` or `transform: scale` — because a check made the
choice easy: `data-fontsize="small"/"large"` already scales the root font and
ships today, and control heights/icons are already in rem (§35L's spacing
scale), so a root-font-size change was already proven to reach them for free.
`zoom`'s bad interaction with `--page-viewport`/`--page-sticky-h` and
`transform: scale`'s "shrinks a fixed page instead of fitting more on it"
were real risks the other two carried; this one doesn't.

**The `--density`-vs-zoom collision this section worried about turned out to
be a `--fontsize`-vs-zoom collision instead** — both want the same `font-size`
property; density only touches spacing. Solved with one custom property:
`--zoom` (percent/100, default `1`) multiplies into every `font-size` rule via
`calc()` — `:root { font-size: calc(16px * var(--zoom)); }`, same pattern for
`data-fontsize="small"/"large"` — so "Large text at 80% zoom" and "Normal text
at 100%" land at related, non-fighting sizes. The settings row says so:
*"Combines with Text size above."*

Wired exactly like `radius`/`glass-blur` (`APPEARANCE_DEFAULTS.zoom = "100"`,
in `OVERRIDABLE_KEYS`, mirrored to `ui_state` the same as every other manual
tweak, a 70–130% slider in Settings → Appearance → Typography & layout). No
new persistence mechanism needed.

Verified in Chromium at 1280×800 (the reported 13" case): root `font-size`
measured 16/12.8/20.8px at 100/80/130%, `--zoom` matched (1/0.8/1.3), the
value survived a full reload including via the server-mirrored path (a fresh
browser with empty `localStorage` picked it back up from `ui_state`), and the
chat dock and graph toolbar (§37F) both stayed legible and unclipped at 80%
with real headroom. `test_style_scale.py` (unaffected — margin/padding/gap
only) and the full suite stayed green.

**Not done, worth naming:** JS pixel constants (`SIDEBAR_MIN`/`MAX`,
`WEB_PANEL_MIN`/`MAX` from §37D.1, the timeline's grid-template maths) don't
scale with `--zoom` — container floors, not text sizing, out of scope here.

### 37F. The graph toolbar — bulky, and specifically why — done

*"redesign the ui layout of the controls above the graph as they are very
bulky and take up a lot of space."* **Correction: most of this was already
fixed the day before this section was written** (`3e77f57`, "One control
height in the top bar, and the graph's options folded away") — the
twelve-controls-in-one-row toolbar described below no longer existed by the
time this session picked it up. Toolbar was already one row of nine (heading,
search, Layout, Colour, New note, ⚙ Options, ↻ Refresh), the tuned-once
controls were already folded behind ⚙ Options, and "How to use this map" was
already a closed `<details>`. Check the running app before a roadmap
paragraph, per CLAUDE.md — this section's own premise had gone stale.

**The one real gap — now fixed too:** Trace was still a permanently-drawn
second row, exactly what "belongs behind a toggle" (below) argued for. It now
gets the same ⚙ Options treatment: a `🛣 Trace` toggle button, `#graph-trace`
starts `hidden`, state remembered (`graph-trace-open`, added to
`MIRRORED_UI_EXTRAS` alongside `graph-options-open`) and restored per visit.
One wrinkle: the node popup's "Trace from/to here" buttons call
`setTraceEnd()`, which can fire a trace immediately — a hidden row would make
that click look like it did nothing, so `setTraceEnd()` opens the panel too,
via a `setTracePanelOpen()` shared with the toggle button and the tab-switch
restore. Verified in Chromium: hidden by default, `is-on` highlight on open,
survives a reload.

The shape, still worth keeping: group by question, not list by feature (§36B).
"Layout"/"Colour" answer *how it's drawn*; New note/Options/Refresh answer
*what to do with it*; Trace is its own mode, not a setting left on.

### 37G. Quick sketch — bring in images and documents

*"I want to expand on and improve the quick sketch feature. I want to be able
to upload documents and images."* Two different features wearing one request:

- **Upload an image into the sketch pad**, to annotate over it (mark up a
  screenshot, trace over a photo) rather than only drawing on a blank canvas.
  Scoped to Sketch specifically and a reasonably contained addition — a file
  input, drawn onto the canvas as a background layer before the pen tool
  starts.
- **"Upload documents"** is very likely the same feature the README's "Next
  up" list and `core/extras.py` already name and flag as a debt: `markitdown`
  installs and does nothing, because *"the app has no import button for these
  yet."* Don't build two separate importers — this is the button that extra
  has been waiting for, turning a PDF/Word file/slide deck into markdown and
  bringing it in as a note (or notes). Worth confirming with the user whether
  they meant this, or specifically documents *inside* the sketch pad (e.g., a
  PDF page as a background to annotate) — the two are different amounts of
  work and the wording could mean either.

### 37H. llama.cpp, actually wired in

Flagged as `unavailable` this session in Settings → Optional extras — installs
the library, does nothing, because *"not wired into the chat backend yet."*
Building the wiring is the next-up item the README already names. Shape of the
work: a new provider in the `ai/provider.py` family (alongside the Ollama and
OpenAI-compatible ones), a model file picker (GGUF files are just files on
disk, not a registry to pull from — different UX from both existing
providers), and `core/extras.py`'s `unavailable` string comes off once it is
real. This is a backend feature, not a UI one — budget a full session.

### 37I. Compress the chat — as a tool the agent can call, not only a button

*"make compressing the chat an agent tool so the agent can do it
automatically."* The machinery exists — `POST /chat/compress` already
summarises, `compressChatContext()` already calls it — but it is built as a
**human-gated** two-step flow on purpose: the code comment on
`showCompressReview` is explicit that a summary is shown *before* it is used
because *"a summary you cannot correct is one you have to trust blindly."*

Turning this into an agent tool (alongside `make_plan`, `run_skill`,
`ask_user` in `ai/tools.py`'s `HANDOFFS` table) raises the same tension §35K
already reasoned through for skills: does the agent's own compression skip
the review step (fast, but the safeguard this feature was built around is
gone for exactly the runs where the summary matters most — a long agentic
session compressing its own history) or does it still hand off to a human
mid-run (safe, but "automatically" is the word the user actually used, and a
handoff mid-agent-run is a pause the agent did not ask for)? Decide which
before writing the tool, the way §36G's rule says: write the trade-off down
once, don't re-derive it.

### 37J. The Timeline — narrow columns, clipped text, no markdown, low utility — done

Screenshotted: day columns of `minmax(5.5rem, 1fr)` — about 88px at minimum —
holding note chips clamped to two lines via `-webkit-line-clamp`, rendered
with `textContent` rather than `renderMarkdown`, so a note written with
`**bold**` or a heading shows the raw syntax in the one place it is smallest
and most cramped to read. *"text is cut off, it is tight, not very visually
pleasing, and there is a lack of utility as well as md rendering."*

**Note for whoever picks this up:** the *other* screenshot in this same
report — coloured circles with heavily overlapping labels — is the **Graph**
tab, not the Timeline, and is the lattice bug this session already fixed by
widening the simulation's world box (§36's handover, "the graph's new world
box"). Keep the two separate; re-diagnosing the graph screenshot as a Timeline
bug would rebuild something already done.

The Timeline's real, distinct list, **all three now done and verified in
Chromium** (`renderTimeline`/`timelineDot`/`openTimelineBand` in `app.js`):

1. ~~Markdown-rendered previews~~ **Done, by stripping rather than
   rendering.** A `stripMarkdownPreview()` helper deletes markdown delimiter
   characters (`#`, `` ` ``, `**`, `__`, `~~`, list/quote markers, link
   brackets), not matched opening/closing pairs — the preview is already
   sliced to 120 chars server-side, so a pair can be truncated mid-token, and
   deleting delimiters outright handles that the same as a complete one. Full
   `renderMarkdown` was deliberately **not** used: it builds block-level DOM
   (headings, a fenced-code block with its own copy button) that doesn't
   clamp sensibly to two lines inside a `<button>`. Verified: a note saved as
   `"Buy milk **tomorrow** at the store"` shows as plain words, no `*`.
2. ~~Wider columns~~ **Done.** `minmax(5.5rem, 1fr)` → `minmax(9rem, 1fr)` —
   5.5rem was sized for a bucket's date label, not two lines of note text.
3. ~~More utility~~ **Done, for the "band row does nothing" half.** A band
   name is now a `<button>` that filters Notes → Browse to that band —
   `activeCategory` for a category band (the sidebar's own click pattern),
   `tag:`/`is:untagged` in the search box for a tag band (the Library tag
   card's pattern via `openLibraryItem`), clears filters for the long-tail
   "Everything else" band. **Not done:** seeing a band's whole list without
   scrolling sideways, or reading a note inline without leaving the tab.

### 37K. Emoji rendering — needs a decision, not a guess

*"I want to change how text emoji characters are rendered."* Too open to build
against blind. The one concrete precedent in this codebase is the ⚡️
variation-selector fix (HISTORY: a bare U+26A1 renders as a thin text-style
glyph on platforms whose default presentation for it is text, which beside a
colour 🌐 and 🤖 in the same strip looks like something that failed to load) —
if that is the shape of the complaint, an app-wide audit for emoji missing
their variation selector is a bounded, mechanical fix. But "how they're
rendered" could equally mean: a different emoji *font* entirely (bundling
Twemoji/Noto so the app looks identical across Windows/Mac/Linux rather than
using each OS's native glyphs, which is a real and much bigger asset-and-CSP
decision), or turning emoji into plain-text alternatives for a low-vision/
high-contrast mode. **Ask which, before spending a session on the wrong one.**

### 37L. Dashboard widgets — shorter, and the full-audit umbrella

*"the widgets in the application being a little shorter or not taking up so
much space"* and, separately, the broad ask this whole batch sits under:
*"do a full ui overview, refine and make consistent... make sure the ui is
properly adaptable for all screen sizes and aesthetic configurations."* The
second is not a task, it is a **program** — the same shape as §35L (the
spacing-scale work) and worth exactly that kind of session: pick one
dimension (heights, this time, given how many of 37A–37J are height/spacing
mismatches on adjacent controls), sweep the whole app for it, and — the step
that made §35L stick — add the lint that stops it drifting back. §37E's zoom
setting and a genuine widget-density pass are the two concrete pieces of this
umbrella worth scheduling; "full UI overview" on its own is too broad to start
a session with and should be broken into dated sub-items as each is tackled,
the way §36 itself was.

---

**Priority order for the next session**, all of the above folded in. **Items
1–5 are now done** (37B decided no; 37D.1/37J/37F/37E built, verified in
Chromium) across two sessions picking up this list in order:

1. ~~**37B's decision**~~ **Decided: no.** See §37B.
2. ~~**37D.1** (resizable web panel)~~ **Done.** See §37D.
3. ~~**37J** (Timeline)~~ **Done.** See §37J.
4. ~~**37F** (graph toolbar)~~ **Mostly already done before it was picked
   up** (§37F's correction note); the real gap — Trace as a permanent row —
   is fixed too.
5. ~~**37E** (zoom setting)~~ **Done.** See §37E — built on the root
   `font-size` option, composing with `data-fontsize` via `--zoom`.
6. **37C** (chat dock density pass) — **start here next**, now that 37E has
   shipped, per 37C's own note.
7. **37I** (compress as a tool) — needs the review-step decision first.
8. **37G / 37H / 37K** — each needs one clarifying question answered before
   it can be scoped; ask, then schedule.
9. **37L** — the umbrella program; break into dated sub-items as capacity
   allows, don't start a session on "full UI overview" itself.

---

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
3. **Graph layouts beyond tree/radial** (§9) — mind map / treemap / arc;
   named the differentiator in ANALYSIS §30/§34, and nothing beyond the two
   existing layouts has been built. **Checked this session and deliberately
   not started**: `renderGraph()` is tightly integrated across drag, zoom-to-
   fit, hover-adjacency highlighting, the trace overlay and the physics
   sliders — a new layout means plugging into all of it, not writing one
   D3 function, and doing that at the tail end of a long session risked
   exactly the half-integrated feature CLAUDE.md warns against. Budget this
   as its own session with room to verify visually against every one of
   those interactions, not a slot at the end of another task.
4. **Timeline branch/line view** (§10C) — asked for twice directly; §37J
   already fixed the existing view's bugs, so this is additive, not a second
   pass over the same two problems.
5. ~~**Chat/Agent/Browse sub-tabs**~~ **checked, and substantially done —
   see §3's correction in BACKLOG.md.** The Ask/Request mode toggle, the web
   panel column and `make_plan`'s ticked-step display already satisfy this
   item's substance via a different (and, per §36G's own reasoning, better)
   shape than literal sub-tabs. One small, real, genuinely open gap: no
   user-facing control for "which tools this turn / max rounds" in Agent
   mode — `agent.py` already takes both as parameters, nothing in `app.js`
   exposes them. Not worth a session on its own.
6. **Meeting notes / transcription** (§17) — `faster-whisper` already powers
   the 🎙 single-note dictation buttons; a longer recording transcribed into
   structured notes is a different, larger feature on the same engine, and
   the backlog calls it the highest-value single addition still unbuilt.
7. **Onboarding diagnostics + example notes** (§27) — ANALYSIS §34 ranks
   this its #3 priority: first run today is "install Python, run a script,
   install Ollama, pull a model" with nothing to look at until you do.
8. **`app.js` module split** (§31/§32), riding in on #5 above rather than as
   its own session, once #2's smoke suite exists — the sequencing reasoning
   in "Priority map" Tier 3 above still holds.
9. Everything still open in §37 (37C/37G/37H/37I/37K/37L) — small,
   secondary, or blocked on a clarifying question; pick these up between the
   items above, not instead of them.

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
