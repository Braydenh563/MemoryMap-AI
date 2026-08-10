# MemoryMap AI — read this first

A 100% offline, local-first notebook where a local AI files your notes and
answers questions about them. Python + FastAPI backend, vanilla JS frontend,
SQLite. No build step: `frontend/app.js` and `frontend/style.css` are served
as-is.

## Before you build anything

**Check the running app first.** Three separate sessions have independently
rebuilt something that already existed, and an audit of one roadmap section
found four of its six "quick wins" already done. Ten seconds of `grep` is
cheaper than a session of rework.

# EMPHASIS ON THESE INSTRUCTIONS
1. Check the running app before building. You said: {"Three sessions rebuilt existing work. It's the single most expensive recurring mistake in this project's history."}
2. You can't see a browser — say what you couldn't verify. You said: {"Everything visual I did this session is reasoned, not observed. A session that forgets this will report UI work as done when it's untested."}

## Where things are written down

| File | What it answers |
| --- | --- |
| [`docs/roadmap/HANDOVER.md`](docs/roadmap/HANDOVER.md) | **Read this first.** The last session's handover: what changed, what could not be verified and why, where to start, and the traps that cost an hour each. |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | The live list, plus §35 and §36 — the freshly reported work. |
| [`docs/roadmap/BACKLOG.md`](docs/roadmap/BACKLOG.md) | The standing backlog, §1–§29. |
| [`docs/roadmap/ANALYSIS.md`](docs/roadmap/ANALYSIS.md) | §30–§34, §59, §60. Judgements and competitor reads — **including the licence constraint. This project is AGPL-3.0 now, so odysseus's AGPL code may come in (with its notices); nothing may go out to an MIT project.** §59 is a second, unrelated read (claude-obsidian/cognee/graphify, all permissively licensed) behind ROADMAP.md items 32–36 (32/33/34 now built; 36 backend-only, see HANDOVER.md). §60 is a second odysseus read, behind ROADMAP.md items 37–39. |
| [`docs/roadmap/HISTORY.md`](docs/roadmap/HISTORY.md) | What is already built. Read it before starting anything. |
| [`docs/DESIGN.md`](docs/DESIGN.md) | The design system. Any CSS work has to follow it; `tests/test_style_scale.py` fails the build otherwise. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the pieces fit. |

The roadmap was split because it passed 4,500 lines. **Section numbers did not
change**, so a `§21` in a code comment still resolves — but a session that
reads only `ROADMAP.md` will miss finished work and settled decisions. All four
files cross-link, and `tests/test_docs_layout.py` enforces that.

## The standing caveat

**Every provider test runs against a fake transport.** SSE framing and
tool-call fragment indices come from reading the spec, not from a running LM
Studio. Reasoning about behaviour instead of reproducing it has cost real time
more than once — when something is reported broken, reproduce it before
theorising, and say plainly when you could not.

**The UI half of that caveat is now lifted, and you should use it.** The
sandbox has Chromium and Playwright, and the app runs on localhost:

```bash
# setsid, not plain &. `pkill -f uvicorn` kills your own shell here (same
# process group, exit 144) — start it detached and leave it running.
setsid env PYTHONPATH=src MEMORYMAP_DATA_DIR=<scratch>/appdata \
    .venv/bin/python -m uvicorn memorymap.api.app:create_app \
    --factory --port 8781 > <scratch>/server.log 2>&1 < /dev/null &
# then drive it: node script.js, requiring
# /opt/node22/lib/node_modules/playwright, with PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
```

**Two Playwright traps, each worth an hour:** `waitUntil: "networkidle"` never
settles against this app — it polls reminders, model status and tasks, so
`goto` and `reload` both time out at 30s. Use `domcontentloaded` plus an
explicit `waitForTimeout`. And the login is *one* field in two modes, not a
setup/confirm pair: fill `#lock-password`, click `#lock-submit`.

Unlock with the password you set on first run, skip `#onboarding-overlay`, and
you can click, measure and screenshot. One sitting of this found three bugs
that reading the source had not: a static-file cache header that let the
desktop app run yesterday's `app.js` (which is why a fixed button gets
reported broken *again*), a reminder poll running on two timers, and a tab
clipped off the left edge. **Measure and look before you claim a UI change
works — and still say plainly what you did not check.**

A later sitting found the worst UI bug in the project's history the same way,
and it is the best argument for this rule: two settings were missing from
`APPEARANCE_DEFAULTS`, so `undefined` and `NaN` were written into two CSS
custom properties, and **every card, field and dialog in the app rendered flat
and borderless on every fresh profile.** Nothing logged, nothing threw, and the
source reads as correct at every single line involved. One `getComputedStyle`
found it. The shape to remember: *a value that is invalid where it is used, not
where it is set, does its damage nowhere near the code that caused it.*

## Reviewing work that came from somewhere else

A week of another agent's work was merged-in and audited (§40). It was not bad
work — the features were good ideas and several are now core — but it arrived
with 90 failing tests, and the failures had four recurring shapes. Look for
these first, in this order, because they are cheap to check and expensive to
miss:

1. **A working thing rewritten into a riskier thing**, with no stated reason.
   `/chat/stream` became a WebSocket: nothing gained, and it cost thread-safety,
   the auth gate and the same-origin policy.
2. **Features that never ran once.** Not buggy — never executed. A `start()`
   never called, a function that does not exist called inside a broad `except`,
   a method name that appears nowhere else in the codebase. Grep for the call
   site of anything new before believing it works.
3. **A guard removed while the shape around it was kept.** Two tools grew batch
   arguments and quietly stopped calling `_require_note`, which is the only
   thing that refuses a private note. The code still looked right.
4. **A policy silently refusing the work.** Thirty-five inline `style`
   attributes, all rejected by this app's own CSP, all invisible until a
   browser was pointed at them.

**Run the suite against the base branch first.** Knowing `main` had exactly two
failures — both a time-bomb in a dated test, not the other agent's doing — was
what made "everything else here is new" a fact rather than a guess.

## Working here

- **Do not install torch, and do not install `sentence-transformers` (which
  pulls it in).** It has failed to install in several sessions and costs a long
  time before it does. You said: {"When installing dependencies in prev
  sessions torch hasn't installed properly so skip it."} The suite passes
  without both — semantic search falls back to keywords, and the tests that
  care use a fake embedding backend. Install the rest by hand rather than
  `-r requirements.txt`:

  ```bash
  python3 -m venv .venv && .venv/bin/pip install fastapi "uvicorn[standard]" \
      SQLAlchemy python-dotenv requests numpy "fsspec[http]" bcrypt \
      cryptography python-multipart pytest httpx ruff
  ```

- `python -m pytest tests/` — ~1,600 tests, ~3 minutes, all green. Keep it that way.
- **Restart the server after any Python change.** A stale uvicorn is why a
  correct fix "didn't work" twice in one session — the browser was running the
  old code and the diff looked wrong.
- `.venv/bin/ruff check .` before pushing — **CI runs it and it fails the
  build.** CI also runs CodeQL, which has caught a real polynomial-ReDoS in
  code written the same session; an anchored `[…]+$` is the shape to avoid.
- Running the app needs `PYTHONPATH=src`, which the recipe below omits:
  `PYTHONPATH=src MEMORYMAP_DATA_DIR=<scratch> .venv/bin/python -m uvicorn memorymap.api.app:create_app --factory --port 8781`
- `node --check frontend/app.js` after any JS edit; there is no bundler to catch you.
- Several tests are **lints, not behaviour tests**, and exist because browsers
  and this Python suite cannot see the DOM: `test_style_scale.py` (design
  tokens), `test_frontend_ids.py` (duplicate ids), `test_frontend_handlers.py`
  (duplicate event listeners), `test_docs_layout.py` (the roadmap split). If
  one fails, it has found something real — fix the cause, don't widen the rule.
- Comments here explain **why**, at length, and match that. A comment that
  restates the code is noise; one that records the failure it prevents is why
  this codebase is maintainable by a fresh session.
- Prompt text is budgeted: `agent.PROSE_BUDGET_CHARS` is asserted, because
  every sentence added to the system prompt is resent on every round.
