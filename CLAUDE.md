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
| [`docs/roadmap/ANALYSIS.md`](docs/roadmap/ANALYSIS.md) | §30–§34. Judgements and a competitor read — **including that odysseus is AGPL and this project is MIT, so no code crosses in either direction.** |
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
MEMORYMAP_DATA_DIR=<scratch>/appdata .venv/bin/python -m uvicorn \
    memorymap.api.app:create_app --factory --port 8781 &
# then drive it: node script.js, requiring
# /opt/node22/lib/node_modules/playwright, with PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
```

Unlock with the password you set on first run, skip `#onboarding-overlay`, and
you can click, measure and screenshot. One sitting of this found three bugs
that reading the source had not: a static-file cache header that let the
desktop app run yesterday's `app.js` (which is why a fixed button gets
reported broken *again*), a reminder poll running on two timers, and a tab
clipped off the left edge. **Measure and look before you claim a UI change
works — and still say plainly what you did not check.**

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

- `python -m pytest tests/` — ~1,440 tests, ~3 minutes, all green. Keep it that way.
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
