# MemoryMap AI — work plan

The live priority list, restructured. §1–§38's full narrative (every reported
bug, every "decided against," every dead end) has been condensed into
[roadmap/HISTORY.md](roadmap/HISTORY.md) rather than kept here — this file is
now *only* what's still open, ranked by what it unlocks. Section numbers in
code comments and tests still resolve via HISTORY.md's index.

## Read these two first

| | What's in it |
| --- | --- |
| [roadmap/HANDOVER.md](roadmap/HANDOVER.md) | **The last session's handover.** What changed, what couldn't be checked and why. Read this first. |
| [roadmap/HISTORY.md](roadmap/HISTORY.md) | Everything already built, and every backlog item already closed — with the reasoning, condensed. **Check here before building anything.** Four sessions have rebuilt something that already existed. |
| [roadmap/BACKLOG.md](roadmap/BACKLOG.md) | Standing backlog items not yet promoted to this file's live list. |
| [roadmap/ANALYSIS.md](roadmap/ANALYSIS.md) | Judgements: the odysseus/AGPL read (odysseus is AGPL, this project is MIT — no code crosses either way), what was deliberately not taken. |
| [DESIGN.md](DESIGN.md) | The design system. `tests/test_style_scale.py` enforces it. |

**The standing caveat:** every provider test runs against a fake transport —
SSE framing and tool-call parsing are implemented from the spec, not verified
against a running Ollama/LM Studio. UI claims are now checkable (Chromium is
in the sandbox); model *behaviour* claims are not — reproduce or say plainly
you couldn't.

## Next up, ranked by what it unlocks

Ordered by *how much it unlocks*, not by how much is left in the section.

1. **`app.js` module split** (~20.7k lines, one file). A Playwright smoke
   suite (`tests-e2e/`) now exists as a safety net, but there's no longer a
   natural "ride-along" feature to split it against — §3's sub-tabs (the
   original planned host) turned out to be substantially done a different
   way (a mode toggle, not separate tabs). Needs a deliberate scoping
   decision (which module first, how to keep it reviewable) before a session
   starts on it, not a default pull.
2. **Graph layouts beyond Arc** — mind map, treemap/sunburst, adjacency
   matrix. The functional half of the graph (paths between notes, clusters,
   drag-to-link, three layouts including Arc) is done; each of these three is
   a materially different rendering approach, not a fourth case the existing
   `layoutHierarchy` machinery covers for free. The decorative half (skins,
   minimap, PNG export) is the smaller, contained piece of this if a session
   wants a quicker win first.
3. **§20's async-httpx refactor** — deliberately deferred so there was always
   a known-good streaming path to bisect against. That reason has expired;
   the cost of waiting keeps growing as more providers touch the sync path.
4. **Claim-specificity in the hallucination net.** `agent.unsupported_claims`
   catches a claim with *no* matching write ("I tagged it" when nothing was
   tagged) but not a claim that doesn't match what actually happened ("I
   tagged it as Work" when a different tag was applied). Needs real model
   output to tune a fix against — this sandbox can't provide that, so it's
   named rather than guessed at.
5. **"Take me to the thing the agent just changed," the UI half.** The
   groundwork is now correct: `agent._change_note_id`/`_change_document_id`
   resolve each write tool's *actual* target rather than assuming every
   result's `"id"` means a note — a real bug (a document's id was being
   read back as a note's), fixed. Still open: a `target` field on every
   write tool's result, and a View button rendered from it in the chat UI
   (`changeRow` in `app.js` already does this for notes; documents,
   reminders and categories need the same). Extend the same
   `_NOTE_ID_FIELD`/`_DOCUMENT_ID_FIELD` pattern to reminders if a report
   ever names that gap specifically.
6. **llama.cpp, actually wired in.** Flagged `unavailable` in Settings →
   Optional extras. A full backend session: a new `ai/provider.py` entry
   alongside Ollama/OpenAI-compatible, a GGUF file picker (different UX —
   files on disk, not a registry to pull from), `core/extras.py`'s
   `unavailable` string removed once real. Asked about directly and
   deferred, not forgotten.
7. **The "full UI audit" umbrella.** Not a task to start a session on
   directly; break into dated sub-items as capacity allows. The concrete
   pieces still worth doing: a colour-scale pass to match the existing
   spacing/type work (surfaces, borders and states have no documented scale
   yet), and a widget-density sweep now that the chat dock's own pass proved
   the shape (fewer rows at rest, checked against real measurements in
   Chromium rather than guessed).
8. **First-run onboarding, the remaining pieces.** Reachability diagnostics
   are built; still open: offering to pull a model, a data-dir writability
   check, and seeded example notes so the graph/timeline/dashboard have
   something to show before the first note is written — named by the
   project's own outside review as the single highest-leverage version of
   onboarding.
9. **Standing backlog, tiers 2–4** — see [roadmap/BACKLOG.md](roadmap/BACKLOG.md)
   for the full list (collapsible sidebars, note-list keyboard nav, a
   per-chat token meter, saved custom themes, an eval/benchmark harness,
   multi-category notes vs. tags, response-mode per-model assignment, desktop
   packaging, a dedicated whiteboard, MCP support). None of these is blocked
   on anything above; pick whichever matches the session's time budget.

## How to work on this repo

- `pytest tests/` — ~1,600+ tests, fully offline, no Ollama needed
  (`pytest.ini` sets `pythonpath = src`).
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
   (use `adoptedStyleSheets`), `style=""` in `index.html` won't apply (use
   `style.css`), and a script from off-origin is refused outright.
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
