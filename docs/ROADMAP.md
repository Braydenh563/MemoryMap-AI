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

**One list, four tiers. Work top-down and do not skip.** The failure this
project actually has is not forgetting work — it is a later session picking
something interesting from further down while a correctness bug sits at the
top. If an item is blocked, say so in the handover and take the next one.

The tiers are not equal. Nothing in Tier 2 is worth more than any Tier 1 item.

### Tier 1 — correctness and trust

Things that are wrong, lose work, or make the app feel unreliable.

1. **Meeting transcription errors out.** Reported as simply not working, with
   a button in the UI that offers it. Reproduce first: `faster-whisper` is an
   optional extra, so the likeliest answer is that the missing-package path is
   an error rather than an explanation. Nothing else in meetings is worth
   touching until this is diagnosed.
2. **"The AI fails to respond while still saying it is writing" — and the
   skill step counted as done.** Two bugs in one report: no timeout on the
   stream, and a step ticked on a turn that produced nothing. The second is
   worse: it makes the skill's own progress list lie, which is the surface the
   user is asked to trust. Needs a real timeout, a visible "this stopped"
   state, and a step that only ticks on a completed turn.
3. **Skills producing network errors, or models that cannot run them.** Same
   family. A failing skill must say *which* step and *why*, and offer the
   resume `skill_from_step` already supports.
4. **Contradictions in the agent prompt around small talk.** `TOOLS_GUIDE`
   tells the model to take several turns and use tools; `intent.SMALLTALK`
   routes "hey" away from the agent entirely. Reconcile them — the prompt is
   resent every round, so a contradiction is paid for constantly.
5. **Decide what notifications are for.** Asked directly: "do they actually
   work? what appears there and when?" — the right question, and the one to
   answer before adding to them. Audit what raises one today, move the
   embedding-model-ready message into Background tasks where it belongs, then
   add reminders. An indicator nobody can predict is noise.
6. **Background tasks that never appear.** The list is built from
   `routes_tasks.collect()`; anything on a worker thread not registered there
   is invisible. Sweep for unregistered threads and make registration the rule
   rather than something each feature remembers.
7. **Claim-specificity in the hallucination net.** `agent.unsupported_claims`
   catches a claim with *no* matching write ("I tagged it" when nothing was)
   but not one that mismatches what happened ("I tagged it as Work" when a
   different tag was applied). Needs real model output to tune against, which
   this sandbox cannot provide — named rather than guessed at.

### Tier 2 — half-built features, cheap to finish

Each is already paid for; a small amount of work turns a frustrating surface
into a good one.

8. **Skill runs: an auto/manual mode.** Explicitly requested and never built —
   `skill_from_step` is resume-after-failure, not a step-through. On manual, a
   skill pauses after each step with a Continue button and a text box, so the
   user can add what the agent missed or answer a question it raised. **The
   single most-requested unbuilt thing on the list.**
9. **A reason on every link.** "A note about uni and gym might still be
   related if they're both about scheduling." Optional free text on
   `entry_links`, shown on the edge and in Trace's readout, writable by
   `link_notes`. Turns the graph from "these are connected" into "connected
   *because*" — which is also what makes Trace worth reading.
10. **The sketch pad.** The highlighter at 5% opacity is effectively invisible
    (~20 passes before anything shows) — that is the "completely wrong" in the
    report. Then a reachable size control, a background colour, and a
    selection tool. The toolbar redesign comes *after* those, not before.
11. **The whiteboard, properly.** It works and is thin. Wanted: an empty state
    that says how to start, a legible explanation that a board *is a note*
    (a good idea nobody is told), resizable cards, and the edge-labelling the
    graph has — see item 9.
12. **Note metadata, and links that are links.** A note's linked notes should
    be clickable through to those notes; today they are decoration.
13. **"Take me to the thing the agent just changed," the UI half.** Groundwork
    is correct — `_change_note_id`/`_change_document_id` resolve each write
    tool's real target. Still open: a `target` field on every write tool's
    result and a View button rendered from it for documents, reminders and
    categories (`changeRow` already does this for notes).
14. **Timeline line view, and text placement in grid view.** Both reported as
    unrefined; both are layout work with a clear target.
15. **Arc view: labels behind nodes**, plus a refinement pass on that layout.
16. **Documents in the graph.** They are notes' equal everywhere else.
17. **Battery-saver: an indicator and an honest description.** It silently
    changes what the graph shows and whether the librarian runs. A mode with
    invisible effects is a mode people distrust.
18. **The full-screen graph's Options panel**, the sketch/image toggles, and a
    suggested-links list that runs off the bottom without scrolling.
19. **First-run onboarding, the rest.** Reachability diagnostics are built;
    still open: offering to pull a model, a data-dir writability check, and
    seeded example notes so the graph, timeline and dashboard have something
    to show before the first note exists — named by the project's own outside
    review as the highest-leverage version of onboarding.

### Tier 3 — new capability

Worth doing, and worth doing after the above.

20. **Files and images on notes, and standalone in the Library.** The plumbing
    exists (`/media`, attachments); the Library surface and drag-to-attach do
    not.
21. **A persona on the welcome messages.** Small, and it makes the app feel
    like one thing rather than a chat bolted to a notebook.
22. **Meeting recordings as first-class objects**: pause/resume, replay, save
    as a voice note, transcribe in the background. Blocked on Tier 1 item 1.
23. **Notification expansion**: reminders, and opt-in AI nudges from the
    utility model. Blocked on Tier 1 item 5 — decide what they *are* first.
24. **Graph layouts beyond Arc** — mind map, treemap/sunburst, adjacency
    matrix. Each is a materially different rendering approach, not a fourth
    case the existing `layoutHierarchy` machinery covers free. The decorative
    half (skins, minimap, PNG export) is the smaller contained piece if a
    session wants a quicker win.
25. **A mapping tab** — mind maps and linked diagrams. Overlaps the whiteboard
    heavily; decide whether it is a *mode of the whiteboard* rather than a tab
    before building it.
26. **Widgets: a picker**, and more of them. Customisable sidebars, and note
    view options in the Notes tab.
27. **llama.cpp, actually wired in.** A new `ai/provider.py` entry alongside
    Ollama/OpenAI-compatible, a GGUF file picker (files on disk, not a
    registry to pull from), and `core/extras.py`'s `unavailable` string
    removed once it is real. Asked about directly and deferred, not forgotten.
28. **§20's async-httpx refactor.** Deferred so there was always a known-good
    streaming path to bisect against; that reason has expired, and the cost
    grows as more providers touch the sync path.
29. **Better-looking theme previews** in Appearance.
30. **Standing backlog, the rest** — [roadmap/BACKLOG.md](roadmap/BACKLOG.md)
    (note-list keyboard nav, a per-chat token meter, an eval harness,
    multi-category notes, desktop packaging, MCP support). None is blocked on
    anything above.

### Tier 4 — deferred, with the reason

Not a dump: each says why it is not Tier 3.

- **`app.js` module split** (~20.7k lines) and the same for `style.css`. Worth
  doing and worth doing *deliberately* — a mechanical split makes review
  harder for a session and gains nothing on its own. There is no longer a
  natural ride-along feature to split it against, so it needs a scoping
  decision (which module first, how to keep it reviewable) before a session
  starts, not a default pull. The `tests-e2e/` Playwright smoke suite is the
  safety net when someone does.
- **A second React frontend.** A second implementation of every screen, kept
  in step by hand, for an app whose brief is "no build step". The cost is not
  the first version — it is every change afterwards having two homes. If the
  motive is component structure rather than React, the split above is cheaper.
- **"Make everything faster."** Not actionable as written, and the measured
  slow paths are fixed: PageRank and the similarity sweep are cached per
  notebook version, three N+1s and two O(n²) traps are gone. The next real
  work needs a profile against a large notebook, not a sweep.
- **Spacing and clashing controls across the app.** Real, and too broad as one
  item. The design tokens and the lints make each instance a small fix; raise
  them as they are noticed rather than as a project.
- **A pass over "the Gemini/antigravity improvements".** Done — see
  HISTORY.md's §40. 46 tests and 4 lints so the next such audit is cheaper.
- **The "full UI audit" umbrella.** Break into dated sub-items as capacity
  allows. The concrete pieces left: a colour-scale pass to match the existing
  spacing/type work, and a widget-density sweep.

### The rule this section exists to enforce

Anything reported goes in here with a tier, **immediately**, even if nobody is
working on it. This project's failure mode is not forgetting to write things
down — it is writing them somewhere a later session does not read, and then
rebuilding or re-deriving them. One ordered list, in the file every session is
told to open first.

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
