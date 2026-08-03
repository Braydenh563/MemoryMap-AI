# Session handover

> **The other four:** [ROADMAP.md](../ROADMAP.md) (live work) · [BACKLOG.md](BACKLOG.md) (§1–§29) · [ANALYSIS.md](ANALYSIS.md) (§30–§34, including the AGPL/MIT constraint) · [HISTORY.md](HISTORY.md) (already built).

## Latest session: §37's four remaining clarifying-question items, all four asked and built

Started by checking the running app and git history against the previous
handover before touching anything — confirmed §38 items 3–7 (Arc layout,
Timeline branch/line, meeting notes, onboarding diagnostics) were already
merged (PR #70), and found one real staleness bug in the process: §37C's
density pass (the ⚙ disclosure collapsing the dock to one row) had already
shipped in commit `46df305`, but ROADMAP.md still listed all three of its
sub-items as open and named it "start here next" — corrected in place, and
checking the remaining two sub-items in Chromium found the dock already at a
single 103px-tall row, so no further work was needed there.

That left §37's four items explicitly blocked on a clarifying question
(37G, 37H, 37I, 37K) — the previous handover's own instruction was "ask, then
schedule," so this session did: asked all four in one batch. Three came back
with a build decision; the fourth (37H, llama.cpp) came back "not this
session." All four now closed out or correctly deferred:

- **§37G, both halves.** The sketch pad's canvas is now two layers —
  `#sketch-bg-canvas` for an uploaded image, `#sketch-canvas` for pen strokes
  above it. The Eraser switched from painting white to
  `globalCompositeOperation: "destination-out"`, so erasing a stroke reveals
  the photo underneath instead of punching a white hole through it — checked
  with a pixel read (`alpha: 0` on the stroke layer, the image's own colour
  on the background layer) rather than assumed from reading the canvas code.
  Save composites both layers into one PNG attachment; the *downloaded*
  attachment was fetched back through the real API and visually confirmed to
  show the photo, the stroke, and the eraser gap. Separately: `POST
  /import/document` (`routes_settings.py`, next to the existing markdown
  importer) turns a PDF/Word/slide file into notes via `markitdown` — one
  note per top-level heading when there's more than one, capped at 25 per
  upload. `core/extras.py`'s `documents` extra lost its `unavailable` flag,
  since there's now a real button behind it. Verified two ways: the whole
  suite fakes `markitdown_available`/`convert_to_markdown` (the package isn't
  in CLAUDE.md's install recipe, same as faster-whisper), and separately
  `pip install markitdown` (lightweight, unlike torch/sentence-transformers)
  and a real conversion end to end, both via the API directly and driven
  through the actual Settings → Import & export UI in Chromium.
- **§37I.** `compress_chat` joined `ask_user`/`run_skill`/`make_plan` in
  `ai/tools.py`'s `HANDOFFS` table. Decided with the user: still hand off to
  a human for review rather than auto-apply — the agent's turn ends on a
  `compress_review` SSE event, and `app.js`'s new `onCompressReview` opens
  the *same* `showCompressReview` panel the manual Compress button already
  fills in, so the two paths share one review UI rather than two that could
  drift. The summarising logic moved from `routes_chat.py` into
  `tools.summarise_turns`, shared by both the endpoint and the tool — the
  route's own tests (which pin its exact 502-vs-503 status codes) stayed
  green through the move.
- **§37K.** Decided: the bounded reading (the variation-selector audit), not
  a font swap or an accessibility mode. Swept `app.js`/`index.html` for the
  classic list of emoji with a text-default presentation and added the
  missing U+FE0F wherever one appeared in UI-visible text — left comments
  alone, since a comment rendering as a thin glyph costs nothing.
- **§37H.** Asked directly whether to spend this session on it (a full
  backend session: a new `ai/provider.py` entry, a GGUF file picker); the
  user said no. Still queued, unchanged.

ROADMAP.md's §37 subsections, its own priority-order list, and §38's item 9
are all updated in place to match — a session that reads only the "next
steps" list at the bottom would otherwise see 37G/37I/37K as still open.
Stayed under the 2,000-line lint the whole way by trimming as it went, not by
skipping the correction.

Full `pytest tests/` (~1,600+ tests), `ruff check .`, and `node --check
frontend/app.js` all green. **What's next:** §37H (llama.cpp, still needs its
own session) and §37L (the "full UI audit" umbrella — break into dated
sub-items, don't start a session on the phrase itself). Beyond §37, §38's own
item 8 (the `app.js` module split) is the next standing item — see its own
note below about why "ride in on sub-tabs" may need re-thinking now that §3
turned out to be substantially done a different way.

---

## Previous session: four reported bugs, then §38's ranked list worked straight through

Started with three quick user-reported UI bugs, found a second session
mid-edit on the same branch fixing one of them (the web-result buttons) —
resolved by asking the user, who kept this session going and stopped the
other. From there, worked §38's ranked priority list top to bottom without
stopping to ask, per the standing authorisation recorded lower in this file.
Seven commits, each with its own full pytest run, `ruff check .`, and real
Chromium verification (a running `uvicorn` + Playwright with a fake
microphone device where audio was involved) before being pushed.

**The three reported bugs, fixed first:**

1. **Web search result buttons squeezed the title/snippet column.**
   `.web-result-actions` was `display: flex` (row); two buttons made the
   grid's `auto` actions column as wide as both combined. Changed to
   `flex-direction: column; align-items: stretch`, and unified the ↗ link's
   bespoke pill styling with the 💬 button's `.ghost.small` look — the two
   were different radii/padding/weights stacked directly on top of each
   other, which is likely what "need to be better formatted" was pointing at
   in the follow-up round.
2. **Notes sidebar height grew without bound.** `syncNotesSidebarHeight`
   mirrored `main`'s `offsetHeight` into the sidebar's `min-height` via a
   `ResizeObserver` on `main` — but growing the sidebar grows the shared
   grid row (`align-items: stretch`), which grows `main`'s *stretched*
   height, which re-fires the observer with a bigger number. Classic
   self-triggering feedback loop. Deleted the JS entirely; `.layout`'s own
   `align-items: stretch` plus the CSS floor already produces the right
   height with nothing to loop. Verified stable across repeated
   measurements and tab-away-and-back with 25 seeded notes — the exact
   interaction a previous handover flagged as untried.
3. **No back-to-top button on Chat.** The existing button already existed
   app-wide, keyed off `.tab-page`'s own scroll position — but the chat
   page's own `.tab-page` never scrolls (the *messages* pane does), so the
   button was permanently invisible there without ever being in the
   exclusion list. Made the button chat-aware: it now tracks and scrolls
   `#chat-messages` specifically when that tab is active.

**A second round of feedback** (chat dock "bulky", web buttons still
"need better formatting", web panel "a little wider") turned out to already
be written up, reasoned through and ranked in `ROADMAP.md §37C`/`§37D` from
a previous session — built rather than re-derived: a `⚙` disclosure now
holds the answer-length/persona pair (collapses the dock from two wrapped
rows to one at normal widths), the two action buttons `align-items: stretch`
to equal width, and `#web-panel`'s default width moved up a clamp step and
gained a `min-width` floor after profiling showed `flex-shrink` was quietly
pulling it below even its *old* minimum in a moderate window.

**Then §38's ranked list, in order — items 3 through 7:**

- **§9, the graph's Arc layout.** A previous session deliberately did not
  start any new graph layout, flagging the integration risk across drag,
  zoom-to-fit, hover-adjacency, the trace overlay and the physics sliders.
  Built as a third case inside the *existing* `layoutHierarchy`/
  `hierarchyPath`/`frameTree` machinery rather than a new rendering path, so
  it inherited all of that integration the same way tree/radial already
  share it, instead of re-earning it. Scoped to the filing hierarchy
  (category/`parent_id`), matching tree/radial's own convention, not
  `entry_links` — a deliberate departure from BACKLOG.md §9's original "arc
  = links as arcs" line, written up there as such rather than silently
  reinterpreted. Mind map, treemap/sunburst and adjacency matrix are still
  unbuilt; none of them reuse today's static-hierarchy shape for free the
  way Arc did, so each is its own scoping question.
- **§10C, the Timeline's branch/line view.** A `View: Grid / Line` picker;
  the line reuses the grid's own category/tag bands rather than §9's
  separate cluster-detection endpoint — a deliberate scoping call, written
  up in BACKLOG.md §10, over the original sketch's "linked-note cluster"
  option. **Found and fixed a real bug while verifying in Chromium**: the
  spine and branch-stub SVG lines have `fill: none` but are still
  hit-tested along their stroke by default, and a deep band's stub runs
  *past* every shallower lane on its way down — painted later, it silently
  ate clicks meant for their dots. `pointer-events: none` on all three
  decorative line types fixed it. This is the same shape of bug this file's
  own trap list already warns about (a private stacking/hit-testing quirk
  no amount of reading the code would have surfaced) — driving it in a
  browser is what found it.
- **§17, meeting notes.** Record → transcribe → review → save, a new
  `/voice/transcribe-meeting` endpoint (300MB ceiling, vs. the existing
  spoken-note endpoint's 25MB) sharing one `_transcribe_upload` helper with
  it. **Action-item extraction — the feature's other half — was
  deliberately not built**: it needs a real model call parsing free text
  into several structured reminders, and this sandbox has neither
  faster-whisper nor a running Ollama to check a new prompt's behaviour
  against. Verified everything that could be verified without either: the
  full record → (mocked) transcribe → review → save round trip in Chromium
  with `--use-fake-device-for-media-stream`, the timer ticking in real
  time, the graceful "faster-whisper not installed" path (genuinely true
  here), and the saved note existing via the API with the right tag.
- **§27, onboarding diagnostics.** A new "Your setup" slide reports Ollama
  reachability and where the notebook lives/how big it is — needed **no new
  backend**, since `/models/status` and `/storage` already existed and
  already power the header pill and Settings → Data. Placed second (before
  the capture slide), so a first capture landing in `Uncategorised` reads as
  "Ollama isn't on yet" rather than "broken". The former "Explore your
  graph" slide now also names the Timeline's Line view, closing
  ANALYSIS.md's "product differentiation" gap with existing slide
  machinery. Offering to pull a model, a `MEMORYMAP_DATA_DIR` writability
  check, and the name/first-note/model-choice steps are still open —
  BACKLOG.md §27 draws the line precisely.

**What's next, and why this session stopped here rather than continuing
down the list:** §38's remaining two items both genuinely need something
this session couldn't supply itself. **Item 8, the `app.js` module split**,
is a large mechanical refactor of a ~20k-line file with no single
obviously-safe next slice — the roadmap's own sequencing says it should
ride in on the sub-tabs work, which hasn't started as its own initiative.
**Item 9, the rest of §37** (37G sketch image-upload vs. markitdown, 37H
llama.cpp wiring, 37I compress-as-agent-tool, 37K emoji rendering, 37L the
full-UI-audit umbrella) each explicitly need one clarifying question
answered before they can be scoped at all, per §37's own writeup — guessing
at the answer rather than asking would be exactly the kind of ungrounded
work this file's standing caveats warn against.

**What I could not check, unchanged from previous sessions**: anything
involving a real model's actual behaviour (Arc's and the Timeline line
view's *rendering* was verified with real seeded data; the meeting
recorder's *transcription* itself was not, for the reason above), and the
desktop shell.

---

## Same session, continued again: four reported bugs, fixed as a bounded side-trip

After §38's audit and its first three items landed, four real bugs were
reported live against this branch (not `main` — confirmed before touching
anything, since a mismatch there would have meant the fixes were already in
and just unmerged). Treated deliberately as **contained work**, not a new
priority list, given the whole point of this session was that §35–37 kept
doing exactly that. All four are in ROADMAP.md §38a with the full reasoning;
short version:

1. **Notes sidebar gap** — an uncommented `align-self: flex-start` silently
   overrode the "stretch, not start" fix .layout's own comment already
   describes, plus a fixed-height CSS var that couldn't grow past its own
   guess. Fixed with a `ResizeObserver` mirroring `main`'s real height.
2. **Timeline text still cut off** — §37J's column widen wasn't enough
   against a 120-char preview at 2 lines; 13rem + 3 lines gets close to the
   full text instead of a marginal gain.
3. **A tagged note missed because the remembered date was wrong** — "that
   joke... two weeks ago" (actually three) hard-filtered to empty. Added an
   un-dated subject-only fallback, labelled `outside_range` so it's never
   mistaken for an in-window match — deliberately the mirror image of a
   fallback already rejected in the code for good reason (dropping the
   *subject* and keeping the date instead), not a reopening of that decision.
4. **A second O(n²) trap**, found because the user asked for a backend
   sweep after the third fix: `GET /entries/link-suggestions` called a full
   embedding scan once per entry. Rewritten to fetch every vector once and
   compare pairs in memory, matching `routes_graph._similarity_edges`'s
   already-correct shape.

**Storage was also checked** (asked for directly): ARCHITECTURE.md §8 now
has real numbers from `scripts/scale_test.py` — ~350MB at 200,000 notes with
real embeddings, attachments/`entry_revisions`/`audit_log` flagged as the
parts that don't scale with note count and weren't sized this pass.

**Also fixed while checking accuracy**: README.md's "Next up" list was stale
(items already done, like the Library tab work, still listed as pending) and
its Whisper claim was wrong — `faster-whisper` already powers single-note
dictation, it's *longer* transcription that's unbuilt. Corrected in
README.md and the two spots in ROADMAP.md that repeated the same claim.

Full suite green, `ruff` clean, all new/existing tests covering the four
fixes pass. **Next: back to §38's own list** — item 3 (graph layouts,
properly scoped for its own session) or item 4 (Timeline branch/line view).

---

## Same session, continued: the roadmap was re-audited and re-prioritised

The user pushed back, correctly: three sessions in a row (§35 → §36 → §37) had
kept extending the newest polish batch instead of touching the other 34
sections underneath it. Asked for the roadmap to be honestly re-prioritised
and then worked through **without stopping to ask** — treat that as standing
authorisation for this and future sessions to keep pulling from
[ROADMAP.md §38](../ROADMAP.md#38-where-this-actually-stands--the-backlog-audit)
until told otherwise.

**What happened:** a full audit of BACKLOG.md (§1–§29) and ANALYSIS.md
(§30–§34) against the actual code, not the backlog's own prose. Found real
staleness in both directions — §4 (Library tab), §11 (hybrid retrieval), §16
(status bar, listed twice) in BACKLOG.md, and §33/§34 in ANALYSIS.md were all
marked open for things that are built, including the project's own outside
review's #1 recommendation ("finish the agentic loop") being satisfied by
`run_skill`/`make_plan` without ever being marked so. Each is corrected in
place, not just noted in ROADMAP.md. §38 is the new live front door and
supersedes §37's own priority list; **read §38 first**, before anything else
in this file including the section below.

**§38's first item is done too, same session:** the notebook was actually
scale-tested (`scripts/scale_test.py`, a generated fixture up to 50,000
notes), not just flagged as untested. Found two real N+1 query patterns —
`GET /graph` resolving each note's category with its own `session.get()`
call, `search_manager.semantic_search` materialising a full `Entry` ORM
object for every embedded note just to score most of them away — profiled,
not guessed at (10,000 category lookups were 87% of one `GET /graph` call's
time on a 10k-note notebook). Both fixed the same way: score or match against
raw ids first, fetch the real `Entry` rows only for what survives. Real
numbers at 50k notes: `GET /graph` 19s→1.8s, chat's search 6.6s→0.5s, the
`related_notes` agent tool's neighbour-suggestion call ~20s→1.3s. Pinned by
`tests/test_scale_query_counts.py` (a query *count*, not a timing — timing
assertions are flaky under CI load). Full writeup, including what's still
open (`GET /graph?similarity=true` is a real O(n²) — 30 seconds at just 2,000
notes — and is off by default rather than fixed), is in ANALYSIS.md §34,
item 2.

**§38's second item is done too:** a headless Playwright smoke suite,
`tests-e2e/` (own `package.json`, doesn't touch the no-build-step frontend),
wired into `.github/workflows/ci.yml` as a new `e2e` job. Verified locally
against a real running app before being trusted, not just authored — and it
paid off immediately: it caught that "documents" is in `app.js`'s own `TABS`
array but has had no `#tab-btn-documents` in the nav bar since §36F replaced
it with Library, which a test written from the array alone (what a first
draft did) would have silently gotten wrong. Covers every tab actually
reachable from the bar for console errors, uncaught exceptions and
horizontal overflow, plus one real interaction (capture a note, see it in
Browse).

**§38 item 3 (graph layouts) was checked, not built — a deliberate stop, not
a skip.** `renderGraph()` is tightly integrated across drag, zoom-to-fit,
hover-adjacency, the trace overlay and the physics sliders; a new layout
means plugging into all of that, not writing one D3 function. Attempting it
at the tail end of an already long session risked exactly the
half-integrated feature CLAUDE.md warns against, so it's written up in
ROADMAP.md §38 as needing its own session with room to verify visually
against every one of those interactions — the same shape of call as §37E's
design-spike recommendation, not an excuse.

**§38 item 5 (Chat/Agent/Browse) turned out to be substantially done
already**, checked rather than assumed either way: the Ask/Request mode
toggle, the web panel column and `make_plan`'s ticked-step display satisfy
its substance through a different — and per §36G's own reasoning, better —
shape than literal sub-tabs. One small real gap noted in BACKLOG.md §3 (no
user-facing tool-allowlist/max-rounds control in Agent mode) and left
unbuilt as not worth its own session. **Next: §38 item 3 (graph layouts, now
properly scoped) or item 4 (Timeline branch/line view).**

**The corrected order, top of it:** scale-test the notebook past a few
hundred notes (cheap, flagged by the outside review, never done), a headless
Playwright smoke suite in CI (the actual fix for "every layout bug passed a
green run"), graph layouts beyond tree/radial, the Timeline branch/line view,
Chat/Agent/Browse sub-tabs, meeting-notes/transcription, onboarding
diagnostics, then the `app.js` module split riding in on the sub-tabs work.
Full reasoning for each is in §38.

---

## Previous entry in this session: §37's top five, done

Worked §37's own priority list in order, straight through 37B–37E. **37B
decided (no lock-screen Quit button — the LAN-DoS trade-off wasn't worth a
convenience button, decided with the user directly). 37D.1, 37J, 37F and 37E
are built and verified in Chromium** — details and reasoning are in
ROADMAP.md's §37B/§37D/§37F/§37J/§37E, updated in place rather than duplicated
here. **Next up per §37's own ranking: 37C, the chat dock density pass** —
37C's own note says to re-look at it only after 37E ships, which it now has.

**37F had a real surprise worth internalising**: most of "the graph toolbar is
bulky" was already fixed the *day before* that section was written
(`3e77f57`) — the roadmap text describing twelve controls in one row was
stale the moment it was committed. Checking the running app first (not just
grep, an actual look) is what caught it; building against the roadmap
paragraph instead would have redone finished work. The one genuine gap —
Trace as a permanent row — was real and is now fixed.

**37E (zoom) turned out to need less new design than its own write-up
expected**, because a check answered the "which CSS mechanism" question before
any prototype branch was needed: `data-fontsize="small"/"large"` already
scales the root font in production, and control heights/icons are already in
rem, so a root-`font-size` percentage was already proven to reach everything.
The one real design question — zoom fighting Text size over the same
`font-size` property, not zoom fighting density as §37E's write-up predicted —
was solved with one multiplying custom property (`--zoom`, composed via
`calc()`), not a rethink of either control.

**What I could not check:** anything about a real model (unchanged, standing
caveat), and the desktop shell. Everything UI in this session's five items
*was* driven in Chromium — screenshots, a resize drag measured before and
after, root `font-size` measured in the DOM at three zoom levels, full page
reloads to confirm `graph-trace-open`/web-panel-width/zoom persistence
(including via the server-mirrored `ui_state` path, not just `localStorage`),
and a full `pytest tests/` (~1,600 tests) plus `ruff check .` green after each
batch.

---

Written at the end of the session that **deleted three surfaces**, moved web
search out of the chat dock, added embedding-model management, and — in a long
follow-on round the same session — fixed six more reported bugs and triaged a
much bigger list into [ROADMAP.md §37](../ROADMAP.md#37-reported-in-one-session--the-second-big-batch-reprioritised).
Everything here is either a fact you can check or a thing I could not check and
am saying so about.

**Start at [Where to start next](#where-to-start-next--ranked-with-the-reason).**
That section now leads with §37 — read it first, the ranked list below it is
what came before.

---

## Read this before you touch anything

**Every UI fix this session was measured in Chromium first, and the
measurement was the fix each time.** Not a slogan — the record:

| Reported as | What the browser said |
| --- | --- |
| "the ui issue with the bottom dock" | Dock box ending at y=614, composer at y=814. 200px outside the card, Send below the window. |
| "the web search panel dock is squashed ugly" | A search box, a results list and a whole web page inside `min(38vh, 20rem)`. |
| "the graph is out of the main ui panel again" | `min-height: 22rem` under the map + a two-row legend > a 700px window. |
| "the notes sidebar too" (a second sidebar, same day) | Both were 22px too tall. One `calc`, written by hand in three rules, each missing the page's bottom padding. |
| "the embedding model doesn't redownload every time, right?" | Right — those are HuggingFace *metadata* requests, not the weights. |
| "quick sketch's Close button just darkens the background" | Confirm dialog at z-index 55, sketch overlay at z-index 60 — the dialog painted behind it. `elementFromPoint` on the confirm card returned the sketch card underneath it. |
| "before signing in, a popup says failed to load entries" | A stale token in `localStorage` fires a dozen bootstrap requests before unlock; each 401 correctly showed the lock screen *and* was separately toasted. |

A bug reported twice on two different
surfaces is usually one bug in a shared expression (the sidebar heights, both
missing the same padding term), and a bug that darkens a whole screen with no
visible dialog is usually two elements at the same z-index tier fighting over
which paints on top, not something actually broken inside the dialog itself.
`--page-sticky-h` names the first kind now; look for the second kind — a
private `z-index` outside the shared 55/60 tiers — before assuming a reported
"nothing happens" click is a logic bug.

The app runs on localhost and the sandbox has Chromium. **Reproduce first.**

---

## The traps that will cost you an hour each

1. **Any `100vh`/`vh` sum is already wrong.** Unchanged from the last
   handover and it bit twice more this session — `46vh` for the logs list and
   `min(38vh, 20rem)` for the web panel, both of which were guesses at how
   much of the window some *other* furniture was using. **Anything sized
   against the window goes through `--page-viewport` or `--page-sticky-h`.**
   Better still, size it against the box it is actually in: the chat sidebar
   needs no arithmetic at all now, because its grid area is already exactly
   the right height.

2. **A flex parent that can shrink, with children that cannot, does not clip
   — it overflows.** `.chat-dock` was `flex: 0 1 auto` with every child at
   `flex: 0 0 auto`. The box shrank; the contents did not; they drew straight
   through the bottom of the card, and the card's rounded corner cutting
   across the middle of a control is what that looks like. **If a container
   is allowed to shrink, something inside it has to be allowed to shrink too,
   or it must not be allowed to shrink at all.**

3. **A stacking context you cannot see.** `backdrop-filter` creates one. So
   does `position: absolute` with any `z-index`. Fix by lifting the *owning*
   element (`.menu-open`), never the menu. Still true, still the first thing
   to check when a menu is reported behind something.

4. **A lint that slices a fixed number of characters will fail on a
   comment.** `test_frontend_ids.py` did, and a lint that fails on prose is a
   lint people learn to weaken. It slices to the end of the function now.

5. **Two overlays at a private `z-index: 60` will eat a nested confirm
   dialog.** `#sketch-overlay` and `#improve-overlay` both sat above
   `.modal-overlay`'s shared `z-index: 55` — the same tier toasts and popups
   use, for a reason that had nothing to do with either overlay. Any modal
   that might one day open a `confirmDialog()`/`promptDialog()` on top of
   itself has to be at 55, not 60, or the confirm paints underneath it and
   looks like a click that did nothing. **Grep for `z-index: 60` before
   building a new full-screen overlay** — it is currently only toasts, the
   command palette, the notification panel and the AI-status popup, and none
   of those ever open a nested dialog on top of themselves; a new overlay
   that copies the number without copying that property is this bug again.

6. **A per-step `.catch()` in a bootstrap loop will re-report a session-wide
   condition as N separate failures.** `startApp()`'s `step()` helper toasts
   whatever error each parallel request throws, which is right for a request
   that actually failed on its own and wrong for "the token expired," which
   `api()` already announces once by showing the lock screen. **Any error
   that is really "this whole session is in state X," not "this one call
   failed," needs a marker property** (`error.isLockout` is the one example
   now) so a generic retry/report loop can tell the two apart — the loop
   cannot know from the error's `.message` alone.

---

## What is now true that wasn't

### The three panels are gone (§36G) — the first surface this project removed

`#bin-panel`, `#activity-panel`, `#tags-panel`, `renderBin`, `renderActivity`,
`renderTags`, `PANELS`, `showPanel`, the `.panel-close` wiring, the
`#bin-empty` handler and `entryItem`'s `options.bin` branch.

The prerequisite was **reading a binned note in full** (`#binned-overlay`,
`GET /entries/{id}?deleted=true`), which was the one thing the panel could do
that a Library card could not. §36G now records the rule that came out of it:
*a surface may be replaced without being deleted, but only for as long as it
can still do something its replacement cannot — so write that thing down when
the replacement ships, because it is the whole of the remaining work.*

### Web search is a column, not a drawer in the dock

The dock is a control strip and its job is to stay short. A reading surface
inside it had to be capped, and the cap made it unusable — the two symptoms
(pushing the composer off the bottom, then being too small to read) were the
same mistake from either side. As a column beside the conversation it needs no
cap at all, and you can read a source and type about it at once.

**`fitComposerToDock` is the other half.** A hand-dragged composer height is a
preference and is kept as one: only the *applied* height is trimmed to the
room the card has, never `localStorage`, so the box comes back to what you
dragged it to the moment the window is big enough. It iterates, because one
subtraction does not converge — the message list grows into the height the
composer gives back.

### Optional extras and embedding models are one screen

Both are "things downloaded to this machine, with a way to undo it".
`core/extras.py` and `core/embedmodels.py` share a security property that must
survive any change: **the request names an allowlist entry, never a package or
a repo id.** It matters more for models, because removal deletes a directory.
HuggingFace's `org/name` → `models--org--name` flattening is itself the
traversal defence — it looks like formatting, so there is a test saying so.

`unavailable` on an extra greys the button out **and** refuses the request
server-side. The greyed button is a courtesy; the refusal is the rule.

### A 🧭 Plan button, and skills that take you to themselves

`make_plan` has existed since §35K with no way to ask for it. The button sends
what you typed with a sentence asking for a plan — a sentence rather than a
request flag, because the planning path is the model's own tool and a second
route into it could drift from the first.

`startSkill` now switches to the chat tab. It did not, so a skill started from
the dashboard streamed into a tab nobody was looking at.

### A second round: six more reported bugs fixed, a much longer list triaged

The same session, after the handover above was mostly written, took a long
follow-on list of reports. Six were small and clear enough to fix on the spot
(§37A: the sketch close bug, the app-wide select-arrow fix, the notes-list
toolbar heights, the category-actions/count clash, the pre-auth toast noise,
the dashboard-first-load default) and are described with their reasoning in
[ROADMAP.md §37](../ROADMAP.md#37-reported-in-one-session--the-second-big-batch-reprioritised).
The rest — a chat-dock density pass, a resizable/refined web panel, a UI zoom
setting, the graph toolbar, sketch image/document upload, llama.cpp, chat
compression as an agent tool, a real Timeline fix, emoji rendering, and the
"full UI audit" umbrella — is triaged there too, in priority order.

**One deliberate non-decision:** a Quit button on the lock screen was asked
for and is not built. It needs `/shutdown` reachable without the unlock
token, which is a real trade-off (§37B) — building it silently inside a batch
of forty other fixes would have hidden a decision about the auth model that
deserves to be made in the open.

**The roadmap's own top-level "here's what to do" sections had also drifted**,
and this was the session that found it: "Priority map" listed the Library tab
as an open Tier 3 item after it had been built *and* had panels deleted from
it. All three legacy priority sections (`Next session: start here`, `Do these
next`, `Priority map`) now carry a correction note pointing at what's actually
still open, and the fully-closed security-audit tier moved to HISTORY.md so
ROADMAP.md stayed under its own 2,000-line lint.

---

## What I could not check, and you should not assume

1. **Anything involving a real model.** Unchanged, and still the standing
   caveat. The 🧭 Plan button's instruction text has never been tried against
   a running Ollama — the *machinery* is the proven §35K path, but whether a
   7B model reliably reaches for `make_plan` when asked in those words is
   untested. It is one string, `PLAN_PREFIX` in `app.js`.
2. **The embedding-model download itself.** `huggingface_hub` is not
   installed in the sandbox (it arrives with `sentence-transformers`, which
   must not be installed here), so `can_download()` is false and every test
   covers the refusal path, the allowlist and the size calculation. **The
   happy path — `snapshot_download` actually fetching a model — has never
   run.** It is four lines; look there first if a download misbehaves.
3. **SearXNG autostart.** No Docker in the sandbox. The preference, the
   plumbing and the startup hook are wired and the thread is started; the
   container coming up is unverified.
4. **The desktop shell and Windows.** Unchanged.
5. **The graph's new world box.** The clamp that keeps nodes in frame used to
   clamp to the *viewport*, which is wide and short — so repulsion pushed
   outwards, the walls pushed back, and seventeen notes settled into a
   lattice. Reported as *"the graph nodes are like locked into a box"*, which
   is exactly what it was. The world is `1.8 ×` the frame now, so the forces
   decide the shape and the clamp only bounds the endless drift it was written
   for. **The reasoning is solid and I could not observe it** — the sandbox
   reclaimed the server three times at the end of the session. `ruff`, the
   full suite and `node --check` pass; the change is one constant and two
   comparisons in the tick handler. Look at it first if the graph is reported
   wrong, and if 1.8 is too loose the fit will simply start further out.
6. **The Library's ⋯ menu positioning.** Reported this session as "off in
   positioning" on the cards view. I could not reproduce it before the session
   ended — `.menu-wrap` is already `position: relative`, so `right: 0` should
   anchor the menu to the ⋯ button, and what the screenshot shows may be the
   menu correctly covering the card *below* rather than being mispositioned.
   **Not fixed, and not investigated to a conclusion.** Measure it with
   `elementFromPoint` before changing anything.
7. **"The notes sidebar keeps changing its height slightly, increasing the
   gap at the bottom."** Checked and *not* reproduced: `#sidebar`'s height
   measured identically 1.5 seconds apart, idle, on the browse section with
   two categories. That is not the same as confirming there is no bug — it
   means whatever triggers it is an interaction I did not try (switching
   sub-tabs and back, a widget re-render after `loadCategories()`'s
   deliberately-unawaited fetch resolves late, a tag-suggestion refresh). The
   sidebar's own height rule (`height: var(--page-sticky-h)`, fixed this
   session) should make this structurally impossible now regardless of cause
   — it no longer sizes to its own content — but say so only after it is
   re-reported, don't assume it's already covered.

---

## Where to start next — ranked, with the reason

**A second, larger batch arrived after most of this handover was written —
start with that.** It is triaged and ordered in
[ROADMAP.md §37](../ROADMAP.md#37-reported-in-one-session--the-second-big-batch-reprioritised),
at the user's explicit request to reprioritise before doing anything else.
Six items in it are already fixed this session (§37A) and verified in
Chromium; the rest is ranked in §37's own "Priority order for the next
session" list at the end of that section. The short version, so you don't have
to follow the link immediately:

1. **§37B — a five-minute decision with the user**, before anything else: does
   the lock screen get a working Quit button, which means an unauthenticated
   `/shutdown`-equivalent route. The trade-off (local-only vs LAN exposure) is
   written out in full there. Two other things are blocked on the answer.
2. **§37D.1** — make the web panel resizable. `makeSidebarResizable()` already
   does this for three sidebars; the web panel isn't in that function's list
   yet, and it doesn't size itself the way the other three do (a `flex` clamp
   rather than a grid column), so it needs the drag-handle treatment adapted
   rather than a one-line addition.
3. **§37J — the Timeline.** Genuinely broken, not merely unpolished: clipped
   two-line chips in ~88px columns, showing raw `**markdown**` syntax via
   `textContent` instead of `renderMarkdown`. **One correction to make before
   starting:** the overlapping-labels screenshot in that same report is the
   *Graph* tab, already fixed this session by widening the simulation's world
   box (below) — don't re-diagnose it as a Timeline bug.
4. **§37F — the graph toolbar.** Four bands of chrome (heading+search,
   layout/colour, trace row, legend) before the map on the one tab whose job
   is the map. Same grouping technique §36B already proved twice.
5. **§37E — a UI zoom setting.** The single highest-leverage item on the list
   (asked for because a 13" laptop needs ~80% browser zoom to see the app
   comfortably) but it needs a real design spike first — `zoom` vs a root
   `font-size` percentage vs `transform: scale`, each with different
   interactions with `--page-viewport`/`--page-sticky-h`. §37E has the
   trade-offs written out; do the spike before committing to an approach.
6. **§37C — the chat dock, again.** Two sessions have fixed real bugs in it
   without the "bulky" report going away, which means what's left is a density
   pass, not a bug — and §37C says to re-look at it *after* §37E ships, since
   some of "bulky" may resolve once zoom exists.
7. **§37I — compress-as-an-agent-tool.** Needs one design decision first (does
   the agent's own compression skip the human review step the feature was
   built around, or hand off mid-run?) — §37I lays out both sides.
8. **§37G / §37H / §37K** each need one clarifying question answered before
   they can be scoped (sketch image-upload vs the markitdown PDF-importer
   already on the books; llama.cpp wiring, which is a full backend session;
   what "change how emoji render" actually means). Ask, then schedule.
9. **§37L** is the umbrella "full UI audit" ask — deliberately not a task to
   start a session with. Break it into dated sub-items as capacity allows, the
   way §36 itself was built up piece by piece.

### Also still open, from before this batch

#### 1. The document editor, now that it is not a tab

It is reached only from the Library. That frees it to stop being a page laid
out around a list that has left: a wider writing column, and the outline and
"notes it draws on" panels earning their place beside the text instead of
sitting folded shut under a switcher. Asked for directly and still only half
done — the sidebar is fixed, the editor itself is untouched.

#### 2. The Library's ⋯ menu, properly measured

See caveat 6 above. It is a live report and it is unresolved. Half an hour
with `elementFromPoint` settles whether there is a bug at all, which is worth
more than a blind fix.

#### 3. §36G's bookshelf theme, the next two pieces

The spine is built. Next: **shelf rows** with a rule under each group when
sorting by kind, and an **empty state drawn as an empty shelf**. The rule to
hold to is in §36G — anything decorative that makes a card harder to scan
loses to the scan.

#### 4. markitdown, and the sketch pad's image upload — now linked (§37G)

`markitdown` wants a "bring in a PDF as notes" button; §37G's sketch-pad ask
("upload documents and images") may be asking for exactly that button, or for
something scoped inside the sketch pad only — worth confirming with the user
which, since the two are different amounts of work. `llama-cpp-python`'s wiring
is now §37H, with its own scope written out (a new provider, a GGUF file
picker — budget a full session).

#### 5. Two things that are decided, so do not re-derive them

- **Absorbing the Notes tab into the Library: no.** Reasoning in §36G. The
  Library *manages*, the Notes tab *works*.
- **The tab bar is the right length.** It wraps below ~1350px, measured.

#### 6. The largest untouched things

**§9's decorative half** (skins, minimap, PNG/SVG export of the current view)
and **§10's `events` table**, so the Timeline's bands can be events and places
rather than only categories and tags. §37J is a nearer-term Timeline pass and
should probably happen first, since it fixes what's broken before adding what's
missing.

---

## Practical notes for the next session

- **Running the app:** `PYTHONPATH=src MEMORYMAP_DATA_DIR=<scratch> .venv/bin/python -m uvicorn memorymap.api.app:create_app --factory --port 8781`.
  The `PYTHONPATH` is required and is not in CLAUDE.md's recipe. **Restart it
  after any Python change.** Start it with `setsid … < /dev/null &` — a plain
  `&` in this sandbox dies with the shell that launched it, which cost this
  session three restarts.
- **Do not install torch** or `sentence-transformers`. The suite passes
  without both, and `huggingface_hub` is absent for the same reason.
- **Driving it:** a small `drive.js` that launches Chromium, does first-run
  setup and skips the onboarding overlay is the whole harness.
  `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, require
  `/opt/node22/lib/node_modules/playwright`.
- **`fetch()` inside `page.evaluate` will 401.** The app's `apiJson` adds the
  unlock token; a bare `fetch` does not, and a 401 in a probe looks exactly
  like a feature that does not work. Call `apiJson` from the page instead —
  it is a module-scope function and is reachable as a bare identifier.
- **A dragged composer height is mirrored to the server** (`ui_state`), so it
  survives a fresh browser profile. Clearing `localStorage` alone will not
  reset it, which will confuse a screenshot.
- **Graph traps, still true:** press the `.graph-core` circle, not the
  `.graph-node` group; a module-scope `let` is not a property of `window`.
- **`elementFromPoint` is how you prove a stacking bug.**
- **Lints that are load-bearing:** `test_style_scale.py`,
  `test_frontend_ids.py`, `test_frontend_handlers.py`, `test_docs_layout.py`,
  `test_docs_site.py`, `test_ui_state.py`, `test_chat_dock.py`. If one fails
  it has found something — **except** when it has found a comment, which
  happened this session; fix the lint's brittleness, not the prose.
- **`test_docs_site.py` mirrors CHANGELOG/CONTRIBUTING/SECURITY into `docs/`.**
  Editing the root copy fails the build until you `cp` it across.
- **CI runs `ruff check .`** and CodeQL. CodeQL has now found two
  `py/polynomial-redos` in `search/query.py` in consecutive sessions; both
  times the fix was `str.split` and a set. **A character class with `*` or
  `+` next to an anchor is the shape to avoid.**
