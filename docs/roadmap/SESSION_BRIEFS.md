# Session briefs: the week's work, written so a smaller model cannot lose the thread

**Status: written by direct instruction as the execution companion to
[WORLD_CLASS_PLAN.md](WORLD_CLASS_PLAN.md) §11.** Each brief below is
complete on its own: the goal, what "done" means, the decisions already
made (do not re-decide them), the exact files and functions, the tests to
write first, the steps in order with the commands, the traps, and what to
report. A session takes ONE brief, reads §0, reads the brief, and starts.
Nothing here needs a design judgement; where one was needed it is written
down, with the reason, so it does not get remade worse under time
pressure.

Back to [../ROADMAP.md](../ROADMAP.md).

---

## 0. The operating protocol (read every session, it is short)

1. **Start.** `git fetch origin claude/epic-ramanujan-8xocc0 && git checkout
   claude/epic-ramanujan-8xocc0 && git pull` (or the branch you were given).
   Read `CLAUDE.md`, then `HANDOVER.md`'s first 100 lines, then this file's
   §0 and your brief. Nothing else before the first commit.
2. **Check the running app before building.** Start it
   (`bash scratchpad/ui-sweeps/serve.sh 8781 /tmp/mm-<brief>`), drive it with
   Playwright (`scratchpad/ui-sweeps/lib.js`, `boot({viewport})`, password
   `testpassword123`, `THEME=dark` for dark; `waitUntil: "domcontentloaded"`
   plus `waitForTimeout`, never `networkidle`). Grep for the feature. If it
   exists, your job is "make it meet the brief", not "rebuild it".
3. **Tests first.** Every brief names its tests. Write them, watch them fail
   for the right reason, then build. A test that passes before you build
   is a test of nothing.
4. **One step, one commit.** Commit after every numbered step with the
   trailer lines the repo requires (see any recent commit). The container
   can restart; uncommitted work is gone.
5. **Measure, do not look.** A claim about the UI needs a number from
   `page.evaluate` (`getComputedStyle`, `getBoundingClientRect`,
   `scrollHeight` vs `clientHeight`) or from `scratchpad/pngpixel.py`. A
   screenshot is for you, not for the report.
6. **Gates before push.** `.venv/bin/ruff check .`, `node --check` on every
   JS file touched, the brief's named tests, then the lints:
   `python -m pytest -q tests/test_style_scale.py tests/test_ui_signatures.py
   tests/test_css_braces.py tests/test_frontend_ids.py
   tests/test_frontend_handlers.py tests/test_dock_grammar.py
   tests/test_docs_layout.py tests/test_asset_cache_busting.py`, then
   `scratchpad/ui-sweeps/errors.js` (0 console errors at 1440, 1024, 390).
   Restart the server after any Python change.
7. **Scope.** The brief is the scope. Something adjacent that is broken
   goes in your report's "found, not fixed" list with the file and line,
   unless it blocks the gate.
8. **Copy.** Sentence case. No em-dashes anywhere (a lint will fail you).
   No "Oops", no exclamation marks. One line of description per section;
   longer help goes behind a `data-help-for` '?' button.
9. **When blocked** (a tool you cannot install, a test that cannot pass on
   the sandbox), do every step that does not depend on it, say exactly
   what blocked you and how you verified that it did, and stop. Never
   skip, disable or weaken a test to get green.
10. **Report** in five lines: status, commits, numbers measured
    (before/after), what could not be verified and why, found-not-fixed.
    Then add the same to `HANDOVER.md` under a dated heading, at the top.

The four failure shapes reviewers look for first (from `CLAUDE.md`), so
you can check your own diff for them: a working thing rewritten into a
riskier thing; a feature that never ran once (grep the call site of
anything new); a guard removed while the shape around it was kept; a
policy silently refusing the work (inline `style=` is rejected by the CSP;
use `el.style.x =` or a class).

---

### Brief 1: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)")

### Brief 2: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

## Brief 3 (Sonnet): the `localStorage` writes through `prefs` (what is left)

Built (triage 2026-10-11, briefs-1011): `frontend/js/prefs.js` with `get`, `has`, `json`, `number`, `bool`, `set`, `remove`; every read through it (`tests/test_prefs_module.py`); `api.upload`/`api.stream` and `tests/test_no_bare_fetch.py`; `tests/test_no_innerhtml_interpolation.py`.
Left: 283 direct `localStorage.setItem`/`removeItem` calls in 49 files outside `prefs.js` (`grep -o 'localStorage\.\(setItem\|removeItem\)' frontend/js/*.js`). Move them onto `prefs.set`/`prefs.remove` file by file, then extend `tests/test_prefs_module.py` to writes with the same allowlist shape (app.js, theme-boot.js, boot-guard.js and the two standalone pages keep theirs). Trap: `prefs.set` must keep a write that throws in private mode silent, as the raw calls are today.

## Brief 4 (Sonnet): the last long paragraphs behind '?' (what is left)

Built (triage 2026-10-11): the Settings two-pane shell (`#settings-nav`, back and forward), the '?' popovers (`data-help-for`), `scratchpad/ui-sweeps/help-popovers.js`.
Left: `python3 scratchpad/help-audit/count.py frontend/index.html` prints TOTAL 28 (and `countjs.py` 1 each in `dashboard.js` and `library.js`). Each keeps one line of 70 characters or fewer; the rest moves verbatim into a `.help-body` behind a `data-help-for` button (standing order 6). Done when both counters print 0 and `help-popovers.js` keeps every popover inside the viewport at 1440 and 390.

### Brief 5: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 6: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 7: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)")

### Brief 8: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

## Brief 9 (Opus): the job runtime, the rest (B2)

Built 2026-10-04 (WORLD_CLASS_PLAN B2, `core/jobstore.py`, `tests/test_jobstore.py`): the `jobs` table, leases with a heartbeat, resume after a real SIGKILL, `GET /jobs`, `GET /jobs/stream`, cancel, for the pool's kinds; the `THREAD_SITES` ratchet in `tests/test_activity.py` holds the thread count.
Left (WORLD_CLASS_PLAN 805 row 3): the other kinds onto it (re-index, embed backfill, auto-file loop as an enqueuer, skill run, import, backup, model pull), and the "Running now" panel reading `/jobs/stream` with one row recipe.

### Brief 10: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 11: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)")

### Brief 12: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)")

### Brief 13: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 14: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 15: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)")

### The quarter's briefs: each item is a row in its plan; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

## What "quality" means for a smaller model here, in one paragraph

Quality is not cleverness; it is not skipping steps. Every brief above is
ordered so that the test exists before the code, the measurement exists
before the claim, and the commit exists before the next step. A session
that follows the order, keeps to the scope, and reports the numbers will
produce work indistinguishable from a larger model's. A session that
reads the goal, guesses the shape, and writes the code in one go will
produce the four failure shapes, every time, whatever the model.

### Brief 16: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 17: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 18: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 19: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)")

### Brief 20: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)")

### Brief 21: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)")

### Brief 22: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)")

### Brief 23: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)")

### Brief 24: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)")

## Briefs 25 to 31: 25, 26 and 28 to 31 built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 27 (Opus): UI Phase 11, the phone

`docs/roadmap/UI_MODERNISATION_PLAN.md` Phase 11. The decisions are made
there. What this session did is the floor, not the phase: 320 to 1024 has no
sideways scroll, every touch target on 16 surfaces is 44px, the chat dock is
20% of the window rather than 38%, and `errors.js` reports 0 findings at 390.
What Phase 11 asks for and nobody has built: the five-item bottom tab bar that
recedes to icons on scroll down and returns on scroll up, More as a sheet, and
every panel becoming a sheet rather than a column. That is the brief.

### Brief 33: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 32: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

## Brief 34 (Opus, two agents): characters, the faces, the companion and Atlas, to the end

**Why this brief exists.** The owner, 2026-09-24, after a day of requests
about faces: "scope out and plan the whole thing with the avatars and
companions now then leave it at that for the agents". This brief is the whole
of that scope. The orchestrator does not add to it; the two agents below work
it to the end, and anything new the owner asks about characters becomes a row
in section 6 here, not a new thread of work.

**Goal.** Every face in the app is a designed character rather than a disc
with things stuck on it; a person can keep a small companion on screen that
feels alive, reacts to what they do, and is never in the way; Atlas is the
best-drawn character in the app. All of it cheap enough for a student laptop.

**Where it stands (read the commits, not this line):** built and merged:
`nameMood` (name reading), the faces, the viewer, pointer-follow, Shuffle and
per-part overrides (`avatar_style`), the corner companion with its menu,
persona faces per chat message, Atlas moods on chat events. Built in agent
worktrees, not yet merged: the character interface (`characterFor`,
`registerCharacter`, 4741aa8), one-silhouette generated characters (d1e74fd),
perches, surfaces and edges, the behaviour picker, drag and drop onto the UI
(4b4f1d4, 39bdb09), Atlas in `frontend/js/atlas.js` (in progress).

### 1. Decisions made (do not remake)

1. One character interface (`characterFor(seed)`, `registerCharacter`, in
   avatars.js above `nameMark`). Every surface draws through it. Atlas is a
   registered character in `frontend/js/atlas.js`.
2. One silhouette per character: head flows into body, chibi proportions
   (head 55 to 60% of height), one outline rule for all parts, features
   placed on the shape, animals with their own ear, snout and tail cues.
   Under 40px a head-only mark, still not a flat disc.
3. The companion is off by default (Appearance, "Corner companion"), shows
   only when unlocked, is either you or the chat persona (Atlas when the
   persona is the default voice).
4. Behaviour is a game-AI picker: one decision every 4 to 12s from a single
   `setTimeout`, weighted by context (perch type, idle time, time of day,
   recent events, persona mood), with cooldowns. Every behaviour is a class
   plus transform/opacity keyframes. No `requestAnimationFrame` loop of its
   own; pointer proximity reuses the pointer-follow tick.
5. Perches are computed from the real UI per tab (a bar's top edge to sit on,
   the header's underside to hang from, a card's top to stand on, a panel's
   edge to peek from), validated against controls it must never cover (back
   to top, chat composer and jump pill, docks, dialogs). A dragged-and-dropped
   spot is remembered per tab, relative to the surface it landed on.
6. Sound reactions only from what a page can know: this app's own audio and
   video elements, text-to-speech and the Media Session state. Never the
   microphone, never other apps.
7. Cost: nothing runs while the companion is hidden, the window is hidden or
   the app is locked; reduced motion keeps poses without loops; animation off
   gives still poses. Target under 1ms of main thread per idle minute beyond
   the face animation already there.

### 2. Done when

- Every face site renders through the interface: persona list, chat picker,
  chat bubbles, profile head, the Settings head button, dashboard mark,
  greeting persona picker, viewer, companion, welcome card.
- A sheet of 12 generated names and Atlas in every expression, at 104px and
  28px, light and dark, has been screenshotted and judged against real
  mascot work, and the judgement is written in the commit or report.
- The companion: turns, sits and dangles its legs, hangs two-handed,
  one-handed and by the feet, peeks shyly from behind a panel edge and ducks
  when the pointer comes near, walks or hops between perches on a tab change,
  reacts while carried and lands on the nearest surface when dropped.
- Context reactions: drowsy at 3 idle minutes, asleep at 8 (z bubbles), wakes
  with a stretch; headphones and a head bob while this app plays sound;
  reading glasses while a long answer streams; a nightcap after 23:00; a
  cheer on a saved note; a startle on an error toast; a bell when a reminder
  is due; an unplugged cable when offline; a wave when the window regains
  focus after a while.
- Atlas: at least 12 expressions mapped to app events, its node ring part of
  its body, an idle layer (breathing, blinks, halo orbit), every companion
  pose and reaction in Atlas's own style, and a readable 16 to 24px head.
- Measured and reported: idle main-thread cost with the companion on and off,
  per 10s with Atlas visible, old against new.
- `tests/test_name_mood.py` still passes; the lints (motion tokens,
  reduced-motion, cheap animations, icon gap, ui recipes) pass; no inline
  `style=`.

### 3. Files

`frontend/js/avatars.js` (the interface, generated characters, companion,
picker, perches), `frontend/js/atlas.js` (Atlas), `frontend/css/08-consistency.css`
(the `nm-`, `nmb-` and Atlas rules), `frontend/index.html` (script tags with
`?v=`, Appearance rows), `frontend/js/settings.js` (Appearance defaults),
`tests/test_name_mood.py`, plus the SCRIPTS lists in tests that name
avatars.js.

### 4. Agents

- **Companion agent** (the generated characters, the companion, the picker,
  perches, drag and drop, context reactions, prop slots). Documents the prop
  slots (head-top, face, hand-l, hand-r) in the interface comment.
- **Atlas agent** (atlas.js). Merges the companion agent's commits as they
  land (merge, not rebase) and draws Atlas's own version of every pose, prop
  and reaction.
- The orchestrator merges, gates and pushes; it does not take on character
  work itself.

### 5. Traps

- A face below 28px must not loop or follow the pointer (the chat bubble
  marks): cost for nothing visible.
- The companion's bubble uses `--modal-bg-opaque`; `--bg` is transparent in
  some looks and made a blank bubble.
- Measure overlaps with `offsetLeft/Top`, not a rect read mid-transition.
- `pkill -f "port N"` kills the calling shell here; run it alone.
- The app.js gzip bound (750KB): character code stays out of app.js.

### 6. Rows added after this brief (the owner's later asks land here)

1. Attention, not pointer-follow (the owner, 2026-09-24: "if the companion
   is sleeping they dont move with every mouse movement but stay still
   unless they get moved very fast ... like realistic npcs"). The companion
   holds a look target with a saccade then a head turn, re-targets only on
   a far move or something salient, ignores the pointer asleep (a close
   flick or click may stir it, sometimes wake it, groggy after), and has a
   slow mood (energy, curiosity, sociability) that leans the picker; poked
   too often it is grumpy for half a minute, ignored long it waves.
   Companion agent. Built: see the commit "Companion: attention, stirring,
   grogginess and a slow mood".
2. Caching (the owner: "can caching be used to reduce the load of
   companion, bg, and other animations??"). Faces drawn once, cut into
   parts, cached as pictures and moved on the compositor; the logo emblem
   already was (a canvas turned by CSS). Built: "Faces are drawn once and
   moved on the compositor".
3. Movable at all times, settling after a drop, calmer (every 20 to 60s,
   which replaces decision 4's 4 to 12s), a shy peek that never flashes,
   and discoverability (catalogue, Help, tour card, one nudge). Built: the
   two commits after row 2.

- The owner, 2026-09-24, with four generated reference sheets: Atlas
  redesigned as a glossy gel water-drop spirit (teardrop head flowing into a
  swept crest, almond eyes, blush, chest star, one or two orbiting rings,
  short constellation tail, star-dust inside the body), plus a male and a
  female version of Atlas and of the companions, chosen in Appearance. With
  the Atlas agent.

- The owner, 2026-09-24 evening, verbatim in parts, for the companion
  agent: "the surfaces I can drag atlas onto are either at the top or
  bottom and nowhere else ... why can atlas only be on some panels or hang
  from some areas and not on other areas of the page or other panels??";
  "I can only drag atlas around by the head, not the body"; "the x button
  being on the companion the whole time is kinda annoying. keep it in the
  right click or hold popup menu"; "let the companions appear smoothly not
  just appear suddenly in different locations"; "atlas startles a lot and
  it's kinda distracting at times because I navigate through the notebook
  so fast"; "the popup menu when right clicking on the companion doesnt
  appear next to the companion or cursor"; "atlas and the companions need
  better ai and behaviour and abilities. they need to be cleaned and
  refined." Built (companion agent): every surface on the tab, the whole figure
  as the handle, no x, no teleports, reactions debounced and startles only
  for error toasts, the menu at the pointer or beside it, errands; and
  "I want atlas to be a companion option regardless": Appearance, Corner
  companion, Atlas. See the commits "Companion: every surface ..." and
  "Atlas is a companion option of its own".

- The owner, 2026-09-24 late, for the companion agent (next free slot):
  "I want the companion to be able to interact with more surfaces. also it
  is still a little jarring with how it moves so much across pages. can it
  be like delayed ... if you are just flicking around pages, it stays on the
  one you've most recently been on the longest, and then if you spend long
  enough on a page, the avatar will get up and teleport to be on your
  current page smoothly and maybe with a slight effect ... smooth,
  unintrusive and clean, maybe even walking from the edge of the screen or
  climbing up a panel to get on top so as to not distract the user ...
  smoother, more life like and better ux so it is a thing that is fun to
  have, not something ... jarring me mentally every time I switch pages."
  Plan: a dwell rule (it stays with the page you spent longest on recently;
  it follows only after about 8 to 12s settled on a new page, never during
  flicking), an arrival that is out of the way (it walks in from the nearest
  screen edge along the bottom bar, or climbs up a panel's side to its top,
  or a soft sparkle-fade in at a quiet perch, chosen by distance and what is
  free), no motion at all while the pointer or typing is active nearby, and
  more surfaces (list rows, cards in grids, chips rows, sidebars, dialogs'
  edges while open).
  The owner, later the same evening, on how it should feel: "like if a user
  is on one page mainly the companion will chill there, maybe entertain
  itself, meditate, fish off a panel, sleep ... if the user goes to a
  different or other different pages it will start to feel left out and
  might want to move to the new page, or if it was sleeping or meditating
  maybe it'll just stay on the other page a bit longer, unless it is
  disturbed by the user in which it'll move over. if the user stays on the
  new page long enough atlas or the companion will make its way onto the
  new page ... flying in, walking or jumping from the side of a screen,
  coming from the roof of the screen, teleporting in etc. whatever matches
  the character traits."
  Plan, added: a settled page gets idle pastimes, cheap and sprite-level
  (meditate, fish off a panel edge, doze, fidget, look around); leaving it
  raises a "left out" need that grows with time on the new page, so the
  follow delay is 8 to 12s awake, longer (about 25 to 40s) while asleep or
  meditating, and immediate when the user disturbs it (click, drag, or
  pointer dwell on it); a small visible cue that it noticed (a glance, an
  ear or crest flick) before it leaves; the arrival picks from the
  character's own set by trait (a flyer flies in, a light one jumps in from
  the side, a climber comes down from the top edge or up a panel, a mystic
  one teleports with a soft fade), never across the user's work area.
  The owner, next: "I dont just want it constantly teleporting or fading
  instantly to a different part of the screen as it is distracting. maybe
  there can be an astral or ghost mode for it to be less obvious that it is
  there?? and it can be dynamically togglable and intent recognition driven
  if the dynamic toggling is on?? it needs a full professional ai behaviour
  design and system ... that is still cheap and affordable."

  Behaviour system design (the spec the companion agent builds to):
  - What exists (avatars.js): one timer (`nameMarkBuddyTick`, every 20 to
    60s), a weighted utility pick (`nameMarkBuddyDecide`) over
    `NAME_MARK_BUDDY_ACTS` shaped by a slow mood (energy, curiosity,
    sociability), drowsy and sleep by idle time, and `nameMarkBuddyCue`
    for app events. Keep all of it. The fault is placement: every tab
    change re-places it after 450ms and 1400ms, and `nameMarkBuddyCheck`
    moves it whenever the tab differs. That goes.
  - Three layers, each a pure function with its own tests:
    1. Perception: counters updated from events the app already fires
       (keydown in an editor, pointer move and dwell, scroll, tab reveal,
       chat streaming, focus mode, `visibilitychange`). They are passive
       listeners that bump a number and read no layout.
    2. Intent (`nameMarkBuddyIntent(signals, now)`), one of: `focus`
       (about 20 or more keys in 30s in an editor or the chat box, or
       Documents focus mode), `reading` (scrolling, little typing),
       `browsing` (3 or more tab changes in 20s), `idle` (no input 60s),
       `away` (hidden or no input 5 min), `engaged` (pointer on the
       companion, drag, click, its menu open). Hysteresis: an intent
       holds at least 5s, and `focus` ends 5s after typing stops.
    3. Behaviour: the existing utility pick for acts, plus a small
       location machine: `settled` (pastimes: meditate, fish off a panel
       edge, doze, fidget, look around) -> `restless` (the noticed cue:
       glance toward the new page, crest or ear flick) -> `travelling` ->
       `arriving` -> `settled`.
  - Home page by dwell: each page keeps a decayed score of time spent on
    it (half-life about 3 minutes); home is the top score. A new drive,
    belonging, rises while the user is off home: full rate awake, 0.3x
    meditating, 0.15x asleep. It follows when belonging is past the
    threshold AND the current page's score is at least 1.5x home's. In
    practice that is 8 to 12s awake, 25 to 40s asleep or meditating,
    never while `browsing`, and at once when `engaged` (a disturbance).
    At most one move every 2 minutes unless disturbed. Covering a
    control still gets a step aside on the same page, never a page jump.
  - Presence, a setting under Appearance > Companion with three values
    (and in its right-click menu): Always visible; Fades while you work
    (the default: astral while the intent is `focus` or `reading`,
    visible otherwise); Always astral. Astral: about 30% opacity, tinted
    toward the palette's violet, a faint rim glow, breathing only (no
    pastimes), `pointer-events: none` so it never catches a click, and
    back to full on hover or on `engaged`. The switch is a 600ms opacity
    and filter transition, never a pop.
  - Travel, never a jump across the screen: the route runs along the
    screen edges and the bottom bar, away from the focus region (the
    focused element's box, the caret's pane, the hovered pane). It
    travels in astral form when presence allows, so the trip is barely
    visible. Arrival is chosen by the character's traits: a flyer flies
    in, a light one hops in from the side edge, a climber comes down from
    the top or up a panel side, a mystic one reforms with a slow 800ms
    dissolve. Only a mystic one ever teleports, and only when the edge
    route is blocked. Travel takes 1.5 to 4s.
  - Cheap by construction: one timer, no rAF except while travelling or
    during an arrival, transform and opacity only, layout read only at a
    decision (at most one per tick), nothing at all while the document is
    hidden. Low power (`hardwareConcurrency <= 4` or `saveData`): half the
    pastimes and presence fades without the glow. Reduced motion: no
    travel animation, an opacity cross-fade only.
  - Tests first, on the pure functions with a fake clock: intent from
    signal sequences; follow timing (awake, asleep, meditating,
    disturbed); no move while browsing; at most one move in 2 minutes.
  - Done when (measured in a Playwright probe, with the numbers in the
    report): flicking across 6 tabs for 60s gives 0 relocations; settled
    12s awake gives 1; asleep, none before 25s; typing 40 keys in the
    editor gives astral within 2s and visible within 6s of stopping; 0
    instant repositions (every move has a travel or arrival phase); tick
    main-thread time under 1ms and no long tasks from the companion.
- The owner, 2026-09-24 evening, verbatim: "refine the avatar generation as
  it is still a little messy and I'm not happy with what is generated when
  I put in my name 'Brayden' or 'Sushicraft563, SushiLord' etc", then "I
  still dont like my hair for 'Brayden' and I want a better aesthetic",
  then "they look a bit too mundane now, they are boring, really common".
  Built (the generated characters, avatars.js): a cue budget (words drive
  at most two cues, one per head, face, held and body slot), people with
  natural skin and hand-drawn hair (twenty styles), presentation chosen in
  Face looks and Your look and never read from a name, and two traits per
  face from its hash. The rules are in `nameMood`'s header; the sheets come
  from `scratchpad/ui-sweeps/facesheet.js`. See the commits "Faces: ...".
  Open: `namemarks.js` finds one pair of 23 names under its 15% floor
  (13.9%), since neighbouring natural skin tones differ less than the gel
  colours did.

## Briefs 35 to 42: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 34 continues (Opus, high): Atlas and the companion
INBOX 742 and 743 and the owner's list ("atlas's arm movements on both
versions need a lot better animating as they are basically permanently in a
downward arc except for when hanging"; "experiment with more tail behaviour
and movement as well, and give the rings, as well as nebular flow and lower
body subtle animations that are all cheap"; "the companion doesn't really have
any variation in how it moves around at various distances"; "more mouse
interaction with the companion like rubbing its head, flipping it upside
down"; "the behaviour of the companion is not often reflected in the enlarged
view"). Numbers: mood changes per session before and after; layouts and
paints per second at rest (companionperf.js); the arm's angle range over a
walk cycle.

Second part (INBOX 752, the owner: "better npc behaviour at the level of real life ... so incredibly smoothe between everything and every event"): one behaviour model for the companion and every avatar, a state machine whose every transition blends (no pose snaps: each joint eases over 120 to 400 ms through the same curve table), idle variation drawn from a weighted pool that never repeats within five picks, reactions to every app event (save, error, reminder, the model thinking, a long task, the lock screen) with a reaction budget per minute, a gaze and lean toward what the person is doing, and the enlarged view driven by the same state. Numbers: transitions per minute that snap (bar 0, measured by sampling joint angles at 60 Hz in `companionperf.js`), distinct idle motions per ten minutes (bar 12), reaction latency from event to first frame (bar under 100 ms), long tasks per second at rest (unchanged from the first part).

### Brief 43: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 44: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)"); part 2 is WHITEBOARD_PLAN's expansion row 5 and `agent-remaining/drawio-1010.md`

### Brief 45 part 2 (Opus, high): structure and complexity, acted on

Part 1 (the census, WORLD_CLASS_PLAN 24) is built. Left (`agent-remaining/census-1010.md`): split `whiteboard.js` (21,567 lines; `initWhiteboard` 3,730 lines) and `documents.js` along their seams with no behaviour change (the lints and `wbregress.sh` prove it); fold the 133 duplicated blocks into recipes; remove the 40 Python dead-def candidates (24.3) that a grep confirms; judge the structural decisions as decision rows with their numbers.

## Briefs 46 to 55: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

## Briefs 56 to 59 (2026-10-10, Fable): the design review

From UI_MODERNISATION_PLAN Phase 13 (the principles table, the surface
table, decisions 9 to 22, the phases). Brief 56 first and alone.

### Brief 56: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 57: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 58 (Opus, high): the stylesheet's structure (13b)
`08-consistency.css` and `10-responsive.css` dissolved into the component
files; the 236 unused selectors removed; decisions 18 and 19 with ratchets.

### Brief 59 (Opus, high): the surfaces (13c)
`index.html`, `status.js`, `capture-ask.js`, `notes-list.js`, `chat.js`,
`phone-shell.js`, the CSS they own; decisions 20 to 22; help moves with the
UI in the same commits.

## Briefs 60 to 63 (2026-10-10, Fable): the backend review

From WORLD_CLASS_PLAN 26 (the layer table, decisions 55 to 62, the phases)
and 27 (features and popups; its rows name Briefs 42, 47 to 55 and 59).

### Brief 60: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 61 (Opus, high): services for whiteboard and files (26b)
`api/routes_whiteboard.py` to `whiteboard/service.py`, `api/routes_files.py`
to `files/service.py`; no behaviour change; route tests prove it.

### Brief 62 (Opus, high): data out of code (26c)
`ai/question_noise.py`, `ai/composer_tables.py`, the help topics and the
taxonomy as JSON under `src/memorymap/data/`, lazy and cached;
`tests/test_import_time.py`; the composer eval unchanged.

### Brief 63 (Opus, high): the runners and the embedder (26d)
`ai/agent.py` `run_agent` and `ai/skill_runner.py` `_run_one_step` as state
machines; `ai/embeddings.py` lazy load and idle unload with its setting;
`ai/tools/` one file per family.

## Briefs 64 to 68: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

## Briefs 69 to 71: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

## Briefs 72 to 75: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

## Briefs 76 to 84 (from 72a and 72b): built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

## Brief 85 (Opus): the launch splash, reimagined (INBOX 834)

The owner 2026-10-11, verbatim (screenshot: the PS1 launcher window, a checklist, a green WinForms bar, four bordered buttons): "also I still dont get why the app cant have a loading splash?? other apps do it but every time we have tried it with the windows installer, it has failed and you ahve said \"the windows installer cant have one\" or smth like that". Measured: three splashes exist (`scripts/splash.ps1`, `_LOADING_HTML` in `__main__.py`, `#boot-splash` in index.html); the first reads as an installer, so the owner did not recognise it as one (the 2026-10-11 rule: a question is a learnability bug).
Decisions: (a) the PS1 window becomes a splash: borderless, rounded, the brand mark centred, one status line, a slim accent bar (no green system bar), no buttons at rest; Details, Copy diagnostics and Cancel appear only on a slow start (over 10 s) or a failure, as quiet links. (b) The checklist shows on first install, an update, or a failure; an ordinary start shows only the line. (c) The desktop window opens on `_LOADING_HTML` in the same look the moment the server is spawned, and the PS1 splash closes when it shows, so there is one continuous splash. (d) `#boot-splash` matches it. Tests: `test_launch_splash.py`, `test_desktop_launcher.py`; measured on Windows is not possible here: say so.

### Brief 86: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (Brief 86)")

## Brief 87 step 2 (Opus): build the top two vendor candidates (INBOX 833)

Step 1 is built: ANALYSIS.md "Vendor candidates, 2026-10-11" (26 candidates by licence, size and cost; top five named). Left: build the top two, measured (TTS voice quality by a listening pair, dictation word error on 20 fixture clips), each as an optional package under the packages system so the suite never reaches for it. The editor, board and map polish half belongs to WHITEBOARD_PLAN E5 (canvasdepth3).

## Brief 88 (Opus): Atlas and the companions, alive (INBOX 835)

The owner 2026-10-11, verbatim (screenshots: a faint prop glyph on Atlas; Atlas with the orbit ring): "what is this on the atlas companion?? sometimes when icons appear on atlas it is hard to see them or make them out. and every time I try throwing the companion across the screen, it just bounces off a panel and back to the top, I want it to do that, but vary how much it does that. like I want more life, biological motion, natural motion, movement, transitions, actions and more from the companions and atlas. also more atlas variations for each gesture, movement, position, emotion and more."
Decisions: (a) a prop or icon on Atlas (`atlasPropsFrame`, atlas-life.js; the props in atlas.js) is drawn at 3:1 against Atlas's body with a dark keyline, at least 14 px, and names itself in the companion's tooltip; measured with `contrast.js` on each prop. (b) A throw keeps its bounce but varies: restitution and friction drawn per throw from a range, spin from the release velocity, a squash on impact scaled by speed, a slide or a tumble on a shallow hit, a settle with a small overshoot; never the same path twice for the same fling (`avatars.js` near 5587 and 6008). (c) Biological motion: breathing, weight shift, follow-through on hair and tail (secondary motion lagging the body), ease curves from DESIGN's motion tokens, idle variety on a schedule with no repeat in a row. (d) Three or more variants per gesture, emotion, movement and pose, chosen without repeating the last. Reduced motion keeps the crossfades. Long tasks at rest held to the census numbers (CHAT_PLAN "Placed from Brief 60").

## Brief 89 (Sonnet): Add tags on lightly tagged notes (INBOX 836)

Built: HISTORY.md, "Moved from the plans, 2026-10-11 (Brief 89)".

## Brief 90 (Sonnet, standing): the owner's own typos as composer fixtures (INBOX 837)

The owner 2026-10-11, verbatim: "also make sure that for all future conversations, all my spelling mistakes and grammar issues in all these and future prompts in these sessions are checked against the composer to see if it can properly understand them, if not, add the capability and understanding  with response variations."
Decisions: (a) `tests/fixtures/owner_typos.json` holds the owner's real misspellings and run-ons from their prompts, each with the reading it should get ("hwo do I" how do I, "redeisgn", "knoe", "ro", "wierd", "ahve", "cna", "suer", "doesn follow", "thes ebuttons", "a nd", "proffesionalising", "westen australia"); (b) `question_noise.repair` and the composer's routing are tested against every entry, and a miss is fixed in the engine, never by special-casing the string; (c) each session appends the owner's new typos (standing; HANDOVER note); (d) an answer to a repaired question varies its acknowledgement ("Reading that as ..."), never the same words twice in a row.

## Brief 91 (Sonnet, ownerfix2): the owner's small UI reports, 2026-10-11 afternoon (INBOX 838 to 842)

Built: HISTORY.md, "Moved from the plans, 2026-10-11 (Brief 91)".

## Brief 92 (Opus, after the queue): the whole-app pass the owner asked for (INBOX 843)

Verbatim: "I need you to clean up more ui around the app, make it consistent, make it all clean, make it all modern, professional, devibecoded, RESPONSIVE, not squashed, dynamic, a good experience, satisfying to use and look at, understandable adn learnable, accessible, fully wired up (no featrues not working or broken), and also just really clean and polished." and "I need you to keep hacking away at the features and utility and things in key features, UI/UX, small things that make the app feel truly polished, proper information architecture, no ui clashes, a clean experience after first downloading the app, making sure the guided tour fully works and doesnt get cancelled after first install and the welcome tour. the quality of the agentic harness, maximise the composer, ti should have sooo much utility, responses should be clean and human readable. everything should be done for the user, fully managable and togglable, fully transparent and readable, instinctive to use, fully guided and more. can we upgrade some of the themes?? can we vendor any repositories for ui elements and design or smth like with the glass aesthetic and other ui elements?? use free element libraries and compare them to the elements in this app to make sure there are no bugs or issues??"
Decisions: (a) first run is tested end to end: a fresh data dir, the welcome, the guided tour to its last step with no cancel (an E2E spec that fails if the tour closes early), at 1440 and 390; (b) an element-by-element comparison against free reference libraries (Radix UI behaviour, shadcn/ui, Open Props, the WAI-ARIA APG patterns) for menu, select, dialog, tabs, toggle, slider, tooltip, popover, toast: keyboard, focus, ARIA and states, each gap a fix with a test; nothing vendored unless ANALYSIS's licence rule and the boot caps allow it; (c) themes: two existing themes upgraded and the glass look checked against Apple's Liquid Glass guidance already in UI_MODERNISATION Phase 10; (d) the composer and harness work stays in CHAT_PLAN rows B1 to B40 (Atlas agent); (e) the rest runs through Briefs 57 to 59 and the uisweep findings, measured.

State (triage 2026-10-11): (c) went into Brief 95 (themes95, merged); (d) stays in CHAT_PLAN; (e) Brief 57 is built, 58 and 59 are open above. Left here: (a) the first-run tour E2E and (b) the element comparison.

### Brief 93: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 94: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

## Brief 95 (Opus): themes, dug deep (INBOX 858)

Verbatim: "can you really dig deep and create some truly good themes?? upgrade existing themes (keep the classic and quiet utilitarian the same. add more colour options. maybe even a custom picker, add more animated background options, make them varied from simple, to complex, heavy, and light, maybe even visually rate them?? make sure there is no high volumes of calculations, no glitches, everything is fast to run, no high complexity. polish mroe ui. maximise ux"
Decisions: Classic and Quiet utilitarian untouched (a pixel test pins them). Every other theme reviewed against contrast (0 low on the 44 surfaces, both modes) and given a real palette pass; new accents plus a custom accent picker (any colour, the app derives soft, surface, hover and text tones and refuses a pick below 4.5:1 with the nearest passing tone). Animated backgrounds: a set graded light to heavy, each labelled with a cost badge (Light, Medium, Heavy, measured: CPU ms per frame at 1440 and frames held at 60) and a preview; CSS or one canvas at reduced frame rate, paused when hidden or under reduced motion, never above 2 ms per frame on the reference machine; Brief 92 (c) folds in.

### Brief 96: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

## Brief 97 (Opus, after Atlas): the composer as the place to go, the graph maker (INBOX 860)

Verbatim: "does that vendored networkx repo/library help improve the knowledge graph and the visual graph itself?? can we generate more statisitcal graphs for statistics?? could we add a graph maker where the user can plug in values or have data and then manually make a graph, table or diagram, or have the ai plug in pasted data and then generate a diagram which is downloadable, customisable, and more?? I want the way the composer shows infoa dn retrieves info to be very stylised and visually readable. very professional. stuff like that. mass composer upgrades, for the chat, the ask tab, the help guide, and then everywhere else it is used for application utility functions. it needs to be insanely good and basically be the go to whenever the user needs help, needs to find something, do a quick search web read, access a specific object (the composer will return a hyperlinked card for it or smth), for asking things like timexones, measurement conversion, any and all maths, restructuring and properly formatting thing, code formatting, and more. like generateing files and templates, visualising data, ocrring file sand images, providing nav links, and mroe. I cant think of everything so expand on this and implement it. the ai should be able to do all fo this and do it even better."
Answer recorded: networkx is not in the app (the Gemini session vendored it; Brief 35 dropped it for 60 lines of metrics in `notebook_stats.py`, ANALYSIS); the visual graph's layout is d3 in `graph-worker.js`, which networkx would not change.
Decisions: (a) a chart maker: paste or type values (CSV, a table, a list), pick bar, line, area, pie, scatter, histogram or table, style it (the theme's palette, titles, axes, labels), export SVG, PNG and CSV, save to a note or a board; the composer builds the same chart from pasted data ("chart this"); drawn in SVG with no new dependency unless the boot caps and licence rule allow one. (b) Notebook statistics as charts (notes per week, by category, tags, links), on Stats. (c) The composer's answer shapes: object cards (a note, board, map, document, setting) as hyperlinked cards, tables, unit and zone answers as a result block, maths with its working, formatted code, nav links; the CHAT_PLAN B rows carry the parity across chat, Ask, the Guide and utility surfaces. (d) New utilities enumerated in the brief's first step (conversions, zones, maths, formatting, templates, file generation, OCR from the composer, a quick web read), each with fixtures and a no-model answer.

- INBOX 870, verbatim: "can you also add some longer sentence joiners and intros, things between sentences, at the start, and at the end of sentences tp composer responces?? one or two words between directly giveing me what I can see from the notes on the right on the ask tab feels like the response is completely useless and gives me nothing. idk it just still feels basic." Given to the atlas agent first (an answering opening, joining clauses, a close that adds a pattern, gap or next step, varied); what it leaves comes here.

## Brief 98 (Opus): goals and lists (INBOX 861)

Verbatim: "should we add a feature where the user can enter goals for both long term and short term?? paired with a todo list and list feature. all of this will be integrated with all the existing feature, the application, the composer, and the ai should also be able to recognise things like this written by the user anywhere and should be able to suggest things like add ing things mentioned in chats and notes etc to goals or lists."
Exists: reminders (dated, `routes_reminders.py`), checklists inside notes (the composer counts ticked items), the suggestions inbox; no goals, no standalone lists.
Decisions (recommendation taken, standing order 3): yes. (a) Goals: a title, short or long term (a horizon: this week, this month, this year, someday), an optional why, progress from linked items; (b) lists: named lists of items (a todo list is a list whose items tick), an item may carry a date (then it is also a reminder, one record, not two), a note link and a goal; (c) one Goals and lists surface in the sidebar, with a quiet count on Today; (d) recognition: a deterministic extractor over notes and chat turns ("I want to", "my goal is", "need to", "todo", "remember to", "- [ ]") proposes items into the suggestions inbox with the source quoted and one click to add or dismiss (and "don't suggest from this note"); the model, when on, only refines wording; (e) the composer reads and acts on them ("what are my goals this month", "add milk to shopping", "tick call mum"), with no-model answers and fixtures; agent tools for list and goal CRUD; (f) Help, the Guide's topics and the manual move with it. Tests first: model and routes, the extractor's table of 40 phrasings including the owner's typos, the composer fixtures.

### Brief 99: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

### Brief 100: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

## Brief 101 (Sonnet, three agents): the found-not-fixed ledger, placed (the owner: "make sure you cover all bugs and issues found and not fixed as well")

The reqaudit pass (2026-10-11) found 41 found-not-fixed rows with no plan row, brief or BACKLOG line. Each is placed here or in the brief that owns its surface.
- **101a, room:** built (room101, merged 2026-10-11; what is left in `agent-remaining/room101-1011.md`).
- **101b, data correctness:** binned notes imported with an old `deleted_at` are purged by the startup sweep; a monthly repeat from the 31st sticks on the 28th; the reminder edit form cannot change an alert; load-more leaves a new range at 100 rows; a reminder's action token dies with the process (a restart ends open notifications' buttons); private notes and multi-space exports untested; Agent Undo-the-run then Ctrl+Z re-runs an applied inverse; Agent Stop only between steps.
- **101c, first run (the owner 2026-10-07):** optional packages in the installer show no progress and cannot be minimised or cancelled (install on first launch as a background task with Stop); an empty or partial `models--BAAI--bge-small-en-v1.5` is treated as present and fails `EmbeddingCacheBroken` (self-repair as a visible task, the rows say "Files missing" with Reinstall); the janitor warms an unchosen default chat model ("llama3.2 failed"; first launch chooses from installed models); the Python runtime reloads on every document opened (5.9 to 7.0 s cold).
- **Into owning briefs:** notes leaving the graph vanish (Brief 100); Atlas whole-body speed and `setAtlasMood` cost (Brief 88); `rowActions` for meetings, suggestions inbox, tag manager, the tool-confirm pair and the Connections Link button, sidebar Comments/Linked from rows, `smallButton` names by tooltip (Brief 92); the composer's quoting answers, "at least" past 24 notes, steps for the top 20 how-tos, other tabs' starters, "pin note 12", a trailing backslash in the user's bubble (atlas, Brief 97); chat and agent turns never announced, the Guide/drafting/review without narrated lines, a lint for `egress.purpose` (Brief 99's scan reports, then a Sonnet follow-up); skill budgets drawn and declared (Brief 97); the reset per Settings group and `settings-reset` in a help group (Brief 92); free lines drawing the shaft through hollow ends, Edit data placeholders, table column widths, hidden-layer eye (canvasdepth3); the map's More sheet at 390 and retidy cost at 200 topics (canvasdepth3); Week Monday-first only and words-written counting only new notes (Brief 92); Translate en to es only (Brief 97); live captions without a Quick access tile (voiceup V6); constellation yellow stars 2.1:1, the capture box's 2.4px first-click shift, the Notes rows/cards toggle 28x24 (Brief 93 follow-up); filing for journal notes with no tag word, turn-downs counting notes not offers (Brief 99); calendar touch drag and 1,000-note month, Last-year range; live sync between two windows; Windows and macOS reminder actions (Brief 92, measured on the owner's machine only); the code palette's shortcuts and snippet residues (Brief 92); meeting speaker names (voiceup).
- **For the owner:** which elements "these elements are ugly and not even the same height" (2026-10-11 03:38Z, one screenshot) means; whether the OCR "squashed text box" (INBOX 803 item 4) still happens; what "liks" and "mut" meant.

## Brief 102 (Opus, lansafe): LAN safe by default on any network (INBOX 867)

The owner uses an iPhone. Recommendation taken (standing order 3): everything automatic, each with a manual override in Settings, Other devices.
- **Allowed networks.** Turning the switch on remembers this network (gateway hardware address plus subnet, read locally, best effort; Windows also reads the network's Public/Private category). At launch on a network not on the list, other devices stay off and Settings and the bell say so, with "Allow on this network". Override: "Allow on any network" (off by default). Windows' Public category never opens without asking.
- **New-device approval.** The first sign-in from a device over the network is held until this computer allows it (a notice with Allow and Deny); allowed devices are remembered and listed with Remove. Override: "Ask before a new device signs in" (on by default).
- **Clients from private addresses only.** The LAN port refuses a client whose address is not private, shared or link-local (a forwarded port, a public-address network). Override: none.
- **The iPhone flow.** The lock screen, reached over the network, offers "Install the certificate" (the profile download) and the steps; Settings shows a QR code of the address if one fits the scripts budget, else the address large and copyable.
- Tests first; the real-socket harness is `tests/test_lan_serve.py`. Not verifiable here: a real iPhone, Windows' category.

### Brief 103: built; moved to HISTORY.md ("Moved from the plans, 2026-10-11 (SESSION_BRIEFS triage, briefs-1011)")

## Brief 104 (Opus, after atlas): typos read in context, not as slang (INBOX 869)

The composer's spelling repair picks a reading by probability: candidates (the word, edits of it, joins and splits) are scored by an edit likelihood (keyboard distance, transposition, doubled letters) times a context score (the notebook's own word pairs, then the lexicon's), and a slang or shortened reading wins only when the context supports it. The owner's typos (Brief 90 fixtures) are the gold set; the measure is the share read right before and after, with no regression on correctly spelt questions.
