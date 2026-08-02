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

## Where things are written down

| File | What it answers |
| --- | --- |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | **Start here.** The live list, plus §35 and §36 — the freshly reported work. |
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

**Every provider test runs against a fake transport, and no UI change has ever
been checked in a browser** (the dev sandbox has no display). SSE framing and
tool-call fragment indices come from reading the spec, not from a running LM
Studio. Reasoning about behaviour instead of reproducing it has cost real time
more than once — when something is reported broken, reproduce it before
theorising, and say plainly when you could not.

## Working here

- `python -m pytest tests/` — ~660 tests, ~3½ minutes, all green. Keep it that way.
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
