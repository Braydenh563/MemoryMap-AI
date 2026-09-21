# MemoryMap AI: the work plan

This file is the entry point to the plans. It is short on purpose: the
detail lives in `docs/roadmap/`, and what is finished lives in
[roadmap/HISTORY.md](roadmap/HISTORY.md) (every section number in a code
comment resolves through HISTORY's index). The standing backlog is
[roadmap/BACKLOG.md](roadmap/BACKLOG.md); the judgements and competitor
reads are [roadmap/ANALYSIS.md](roadmap/ANALYSIS.md), including the
licence constraint: this project is AGPL-3.0, so odysseus's AGPL code may
come in with its notices and nothing may go out to an MIT project.

**The standing caveat:** every provider test runs against a fake transport.
Plain SSE streaming and one streamed tool call are verified against a real
socket (`scratchpad/fake_openai_server.py`); real inference, concurrent
tool calls, Ollama's native tool-call dialect and every claim about how a
real small model responds are not. UI claims are checkable (Chromium is in
the sandbox); model behaviour claims mostly are not. Reproduce, or say
plainly that you could not.

The sections this file carried from earlier sessions (the three "start
here" blocks, the older live list, §87 to §90, the four tiers) are in
HISTORY under "ROADMAP archive, 2026-09-14", verbatim. Everything still
open from them is in the plans, `roadmap/agent-remaining/OPEN.md`, or
BACKLOG; nothing was dropped in the move.

## The plan documents, in one list (read this before opening any of them)

Eleven plans and a handful of reference files live under `docs/roadmap/`.
Work from the plans, in this order; look things up in the rest.

| Work from these (in this order) | Where it stands, 2026-09-14 |
| --- | --- |
| [roadmap/HANDOVER.md](roadmap/HANDOVER.md) | The standing orders, the "Now" line, and "How to proceed after PR 149". Read first, every session. |
| [roadmap/INBOX.md](roadmap/INBOX.md) | The owner's open reports, each with an owner. Bugs first. Under twenty items by lint. |
| [roadmap/agent-remaining/OPEN.md](roadmap/agent-remaining/OPEN.md) | Every open item the agent files left, by surface, with file, id and next step. The 38 finished files are in `roadmap/archive/agent-remaining/`. |
| [roadmap/WORLD_CLASS_PLAN.md](roadmap/WORLD_CLASS_PLAN.md) | The consistency contract (all lints), the backend moves (B1, B3, B5 built; B2 half built; B4, B6 to B8 open), the inventions (I4 built, I9 built including its Settings section; I1 first pass with its
manual run wired; I2, I3, I5 to I8 open), the audit A1 to A9 (this PR), and section 18, the next horizon H1 to H8. |
| [roadmap/SESSION_BRIEFS.md](roadmap/SESSION_BRIEFS.md) | The operating protocol and one brief per session. Brief 33 is the PR after this one. |
| [roadmap/UI_MODERNISATION_PLAN.md](roadmap/UI_MODERNISATION_PLAN.md) | Phases 0 to 10 built. Open: Phase 8's three docks over the seven-control ceiling, Phase 11 items 1 to 9 (the phone done properly). |
| [roadmap/DOCUMENTS_PLAN.md](roadmap/DOCUMENTS_PLAN.md) | Phases 0 to 3 built. Open: Phase 3 item 4's Library filter, Phase 4 (the connected document), Phases 5 to 8. |
| [roadmap/GRAPH_PLAN.md](roadmap/GRAPH_PLAN.md) | Phases 1 to 4 and 6 built. Open: Phase 5 (positions on views, the `?since=` cursor), Phase 6's node panel redesign, the local pane's Show switches, 6b the minimap. |
| [roadmap/MINDMAP_PLAN.md](roadmap/MINDMAP_PLAN.md) | Phases 1 to 5 built; the ring and control audit of 2026-09-13 night landing in this PR. Open: what the mapux agent's remaining file lists. |
| [roadmap/CHAT_PLAN.md](roadmap/CHAT_PLAN.md) | Phases 1 to 4 built except Phase 1's other half (which note grounds a sentence, blocked on Brief 12's eval fixtures) and Phase 4's harness items. |
| [roadmap/TIMELINE_PLAN.md](roadmap/TIMELINE_PLAN.md) | Phases 1 to 4 built. Open: section 7's two measurements. |
| [roadmap/WHITEBOARD_PLAN.md](roadmap/WHITEBOARD_PLAN.md) | Phases 1 to 4 built. Open: decision 7's other half, the phone context bar comparison, sketch handles at zoom, the arrange panel items. |
| [roadmap/AGENT_SKILLS_REFORM.md](roadmap/AGENT_SKILLS_REFORM.md) | Phases A to D built; D unverified against a real model (section 9 of WORLD_CLASS_PLAN, the dev-only runner, is the blocker). |

| Reference (look things up, do not start from) | |
| --- | --- |
| [roadmap/HISTORY.md](roadmap/HISTORY.md), [roadmap/BACKLOG.md](roadmap/BACKLOG.md), [roadmap/ANALYSIS.md](roadmap/ANALYSIS.md), [roadmap/MODERNISATION_AUDIT.md](roadmap/MODERNISATION_AUDIT.md) | What is built (with every retraction), the standing backlog (section 115 is the professional-use block), the judgements, the measured audit. |
| [roadmap/PLAN.md](roadmap/PLAN.md), [roadmap/AUDIT.md](roadmap/AUDIT.md), [roadmap/REDESIGN.md](roadmap/REDESIGN.md), [roadmap/FABLE_BRIEF.md](roadmap/FABLE_BRIEF.md) | Superseded; each says so in its first line. |
| [DESIGN.md](DESIGN.md), [ARCHITECTURE.md](ARCHITECTURE.md) | The design system (lint-enforced) and how the pieces fit. |

## How to proceed after PR 149

PR 144 (0.3.0) closed the UI modernisation, the per-surface redesigns, the
audit of 2026-09-13 and the owner's reports to INBOX 222. **PR 149 closed
the week of outside changes and a night of measured fixes**: the whiteboard
restored from a codemod that deleted ten live functions, the Windows console
windows, the Tesseract probe, INBOX 225, 226, 232, 238, 246, 256, 257, 259
and 260, and I9's Settings section, which had a complete backend and no
screen at all.

**The thing that PR taught, worth carrying into the next one.** A scan of
every route the app serves against every path the frontend fetches
(`scratchpad/probe_dead_routes.py`) found a whole plan item built, tested
and unreachable, plus three more routes with no caller. Nothing in the
suite could see it, because every piece of it passed. Run that probe at the
start of a session that is about to build something new, and run the three
sweeps that were added with it: `keyboard.js` walks the tab order,
`requests.js` fails on a request that answers 4xx where nobody is told, and
`leaks.js` watches listeners and nodes per round.

What comes next, in order, each its own PR:

1. **Read, in this order, at the start of every session:** `CLAUDE.md`,
   HANDOVER's standing orders and "Now" line, INBOX, `OPEN.md` for the
   surface in hand, the plan for that surface. Merge any agent worktree
   with commits not on the branch before anything else.
2. **The speed budget first** (WORLD_CLASS_PLAN 18, H7): boot JS under
   1 MB compressed, first paint under 300 ms, every long list virtualised.
   It makes every later measurement honest.
3. **The professional-use block** (BACKLOG 115, WORLD_CLASS_PLAN H6):
   import from Obsidian, Notion and Apple Notes; print and PDF export;
   keyboard-complete; WCAG AA; bulk operations; encrypted export. Rows 1,
   2, 7 and 10 first.
4. **Empty `OPEN.md` surface by surface**, taking the plan's open phase
   with it: Documents (Phase 4), Graph (Phase 5, the node panel), the phone
   (UI Phase 11), then Chat Phase 1's other half once Brief 12's fixtures
   exist.
5. **The horizon** (WORLD_CLASS_PLAN 18): H1 the night shift finished, H2
   evidence cards and open questions, H3 the model bench, H4 the notebook
   as a local service, H8 time travel and the margin reader, H5 sync.
6. **Section 9's dev-only llama.cpp runner** at the first quiet moment: it
   is the single blocker behind every "not verified against a real model"
   line in the plans.

The rules that do not change: decisions in a plan's "Decisions made" are
not remade; a mid-work report goes into INBOX verbatim and is triaged at
the next boundary; a built phase's block moves to HISTORY the same commit;
no new plan documents; every claim carries a number from a sweep.

## Next up, ranked by what it unlocks

1. H7 the speed budget (unlocks honest numbers for everything after).
2. BACKLOG 115 rows 1, 2, 7, 10 (unlocks trust for daily professional use).
   Row 7, keyboard-complete and WCAG AA, has its first tool now:
   `scratchpad/ui-sweeps/keyboard.js` walks the tab order and passes, so
   that row starts from a measured baseline rather than from nothing.
3. `OPEN.md` Documents and Graph sections with their plan phases.
4. UI Phase 11, the phone done properly.
5. H1 to H4 in that order; H8; H5 last. H1's manual half is wired now
   ("Read my notes now", Settings, "What it learned"), so H1 is the
   remaining kinds (tensions, duplicates, entities, dates) and the bulk
   routes I9's table has buttons waiting for.
6. The three things PR 149 left deliberately undone, each with its reason
   written where it belongs: right-drag to pan the board (INBOX 258, the
   acceptance test is written and failing in
   `scratchpad/ui-sweeps/wbrightpan.js`), the faded-notes-near-this route
   with nowhere to put it (INBOX 261, it wants a note detail view this app
   does not have), and B1's event feed with no activity strip reading it.

## How to work on this repo

- `pytest tests/`: 3,500+ tests in 294 files, fully offline, no Ollama needed
  (`pytest.ini` sets `pythonpath = src`); ten to fifteen minutes, so the
  routine local gate is `bash scripts/gate.sh --changed` and CI runs the rest.
- `ruff check .` — matches CI.
- `node --check frontend/app.js` — one large plain-JS file; run after every edit.
- **Install non-ML deps by hand** (see root `CLAUDE.md`) — do not install
  `torch` or `sentence-transformers`; both have failed to install cleanly in
  past sessions and the suite passes without them (semantic search falls
  back to keywords; tests that care use a fake embedding backend).
- **Drive the app in a browser before claiming a UI change works.** Chromium
  + Playwright are in the sandbox. Launch with `service_workers="block"` or
  `sw.js` serves a cached `app.js` and you'll be testing yesterday's code.
  Assert on measured geometry (`scrollWidth - clientWidth`), not screenshots.
- **Collect the console while driving.** The app sends a strict CSP; a
  refused style/script/fetch shows up *only* in the console — no failed
  request, no thrown error, the thing just silently doesn't happen.

### Traps that have each cost real time

1. **Don't guess element ids** — check `index.html` or query generically.
2. **`git checkout <file>` discards uncommitted work in that file.** Commit
   before experimenting.
3. **A POST response can lie about stored state** — SQLAlchemy returns the
   in-memory object; assert on the next GET, not the create response.
4. **`utcnow() + offset` is a lie with a timezone attached** — it tags UTC on
   a value that actually holds local wall-clock. Build the user's clock as
   `utcnow().astimezone(timezone(offset))`.
5. **The Notes tab is sub-tabbed.** Anything that scrolls to a note must call
   `showNotesSection("browse")` first, or it targets an element inside
   `display: none`.
6. **The app sends a strict CSP; a violation is reported only in the console.**
   No failed request, no thrown error. An injected `<style>` tag won't apply
   (use `adoptedStyleSheets`), `style=""` in `index.html` won't apply (use a
   class in one of `frontend/css/*.css`), and a script from off-origin is
   refused outright.
7. **CSS automatic minimum sizing is the usual cause of a wide page.** A
   `1fr` grid track or a flex item with default `min-width: auto` refuses to
   shrink below its content; `overflow-x: auto` on the child does nothing
   until every ancestor has an explicit floor.
8. **A POSIX idiom can mean something else on Windows, silently** —
   `os.kill(pid, 0)` terminates on Windows rather than probing; the sandbox
   is Linux, so this class of bug never reproduces here.
9. **A control that "does nothing" is usually working** — check the
   *computed* result. Most reported cases wrote correctly and were then
   overridden by CSS source order, a status poll repainting, or living in a
   hidden section.
10. **This suite cannot see any of the above.** Every UI bug this project has
    found passed a fully green test run first.

Full historical detail for every trap above — the original report, the
diagnosis, the fix, and what verification could and couldn't cover — is in
[roadmap/HISTORY.md](roadmap/HISTORY.md).
