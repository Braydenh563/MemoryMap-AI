# Wrap-up ledger, 2026-09-27 (INBOX 431)

The owner's target: every request below finished cleanly, polished, nothing
half done, by the middle of the next session. The container restarted at
about 16:10Z and stopped the three agents mid-task; their work up to then is
committed. This is the complete list of what they still held, so nothing is
dropped. Tick an item only when it is measured working, not when it is
written.

## Carry-over to the next PR (0.3.4): top priority, before any new work

Everything the owner asked for that is not finished, not verified, or was
deferred when usage ran out at release. Pick these up first, in this order.
The owner, at release: "make sure you log my latest request and everything
left to be tackled and finished top priority at the start of the next pr".
Every item below is finished, measured and ticked before any other plan
work starts.

1. [x] **frontend/js/ move.** Done 2026-10-03, redone from the checklist (the
   old WIP branch was gone): 50 scripts in `frontend/js/`, `sw.js` stays at the
   root (a service worker only controls pages under its own path). Paths,
   lazy modules, workers, tests, gate, CI and docs updated;
   `tests/test_script_paths.py` checks every script path resolves.
2. **Full local suite** (`scripts/gate.sh --full`) was not run at release;
   CI ran the suite on every push and was green on 8c5afd6.
3. **Not reproduced, need the owner's case:** the Atlas guide panel's '?'
   doing nothing; the Ask citation missing after a heading on a reopened
   answer (a regression test exists).
4. **Deferred:** an arm rig for the generated faces that can cross in front
   of the body (hands on hips, clasped hands, hand to chest).
5. **Not verified in a browser:** the companion's wander-off-and-return
   branch; Atlas walk, float and wave on the real companion (checked on a
   stand-in); the feminine lie-down bed (the check drew the masculine look);
   the easing between lie and curl frames; the desktop window (webview) and
   the tour; error states, long lists and every notice kind (the seeded
   notebook never reaches them); the Documents dock with a document open.
6. **Found, not fixed:** the "Show more" link on one-line note cards
   (not reproduced 2026-10-03: no visible Show more on any short card at
   1440, PR 162); the
   round capsule on note link chips (a deliberate design, review it).
7. **Masculine Atlas lower body** (the owner, at release, with a close-up):
   "too straight and pointy and not flowy, it should be a main thick whisp in
   the middle and then smaller and thinner ones streaming off on the
   sides". Today it is several parallel straight spikes. Target: one thick
   central wisp that tapers softly, with thinner curved strands peeling off
   both sides, all with gentle S-curves and a slow sway; no hard points.
   **Done 2026-10-03 (INBOX 435 (3), with the owner's four follow-ups:
   thicker sub-wisps, clean joins, "not spider legs", full hip width and a
   dominant middle).** One S-curved main wisp leaving the torso at the
   hips' width (18.3px against the hips' 18.6px at Large) and two
   sub-wisps branching from it at y 71 and 82, each half the trunk's width
   there (ratio 2.03 both), one arc each, different lengths; every wisp one
   silhouette (one path per paint, nonzero), so no join shows; Bezier
   stems with round tips, no `L`. Sway: the lower layer's existing
   compositor drift, all wisps together (a second layer for the sub-wisps
   would stack translucency at the joins). `test_atlas_shape.py` (two
   tests, one measuring the built paths in node); proofs
   `scratchpad/shots/atlas-tail/` (`atlaswisp.js`), before and after,
   light and dark, Medium and Large, twelve poses, the large view and
   join close-ups.
8. **The owner at release, with screenshots:** (a) verified 2026-10-03
   (PR 162: active Select reads 7.69:1 light, 8.01:1 dark); was: the notes dock's Select
   toggle when active has poor contrast (a filled accent square with a
   faint check); check every toggled icon button; (b) done (right: 08-consistency.css
   orders today's count after the button, so it ends in the column every
   other day's count draws at the end; the count had floated 729px short of
   the end at 1440 because both it and the button carried an auto margin;
   after, 0px at 1440 and 900, the button 8px before it; a phone draws the
   table, no heads) "Start today's note"
   sits beside "Today": decide left or right against the Timeline's
   other heads, and measure; (c) done (index.html: Quick set,
   steppers, Reset, readout, in that order; the readout's 15rem reserve and
   the pair's auto margin gone. At 1440 the pair sat at the row's end, 725px
   past the readout text, and moved 101.5px left when Reset appeared; after,
   it follows Quick set by 8px at x 139.9 in every state, centres level
   (cy 16), the readout 8px after; at 1093 (the sheet) and 390 it wraps
   left-aligned, nothing overflowing) the reminder steppers float mid-row
   with a gap: align them to the row's grid next to the time readout; (d) mind
   map node background fill: nodes are outline-only; add a fill option
   (done: mind map topics have a Fill, alone or with the branch) (the node colour recipe, a tinted fill) if it does not exist; (e) the
   owner says the README shots were not retaken: they were in c947ebe on
   this branch, so check what the owner is viewing (main, or a cache) and
   confirm the shots show the new UI.
9. **Feminine Atlas front hair** (the owner at release, with close-ups: the
   swept-back crown reads as thin parallel lines with a star circlet over a
   bald-looking dome): "the front head hair on the feminine atlas needs a
   slightly better redesign". Fuller hair mass over the crown, soft locks
   with depth and shading, not line strokes; keep the circlet subtle.
10. **The owner at release, more UI notes (screenshots in the session):**
    (a) done: reminders bar Reset beside the steppers;
    (b) the OCR workspace: the AI reading block leaves little room for the
    blocks below; make sections collapsible (or cap the reading and scroll);
    (c) Atlas floats in empty space when the Find anything dialog is open;
    it should hide, or perch on the dialog's edge, while a modal is up;
    (d) done (08-consistency.css: the card view's meta row takes
    `--space-3` above it whatever sits there; box gap 6.4px under the text,
    8 under Show more, 6.4 under a file row before, 8 under each after;
    decided as "too tight" because the owner's same-release ask was room
    around Show more): a small gap between a note card's text and its
    metadata row;
    (e) verified working 2026-10-03 (PR 162: the edit form's strip 88 to
    46px and back): the note edit form's "fit toolbar on one row" toggle does nothing;
    (f) done, already (0.3.32, `.entry-related-row` stretches the chip;
    measured 2026-10-03, no code change: chip and Link 32/32px at 1440, 44/44
    at 390 touch, centres 0px apart, in the edit form's Related panel and
    the card's Similar panel, both themes): related-note badges and their
    Link buttons are different heights;
    (g) done, already (04-chat-dock-appearance.css `.help-chat-prose`
    headings take `--text-h3`; measured 2026-10-03, no code change: the
    "Skills" title, an h5 from renderMarkdown, 18.4px/600 against a 14.72px
    body, 1.25x, in the toggled "From the help" view and the no-model
    answer): help answers, "From the help": the entry title ("Skills") is
    tiny against the body; give it heading size;
    (h) checked in CSS, not in a browser: no button has a plain `:focus` rule, so the ring is `:focus-visible` only (keyboard); the documents formatting toolbar: it overflows to a "..." menu by
    design (DESIGN.md), not a scroll; confirm the focus ring on "..." only
    shows on keyboard focus;
    (i) done (library.js watchLibraryColumns defers a frame; verify the notice is gone in Files): find the ResizeObserver in the Library's Files view that trips the
    browser's "loop completed with undelivered notifications" notice (now
    filtered from the error log in app.js) and defer its write a frame.
    (j) the enlarged viewer: a generated face (not Atlas) stays on one
    expression; it should blink, change mood and emote there like the
    companion does (the Atlas viewer already does);
    (k) widget drag on the dashboard swaps back and forth while dragging:
    add hysteresis (a dead zone past the midpoint and a short dwell);
    (l) the companion's perch in the chat sidebar looked unsupported
    (floating beside a conversation row); check the perch edges there.
    (n) **done 2026-10-03, PR 162** (`tests/test_recency_questions.py`;
    the prompt is right, a 1.5B model still misreads it): "Show me my last entry" answered with an older note (the owner at
    release): chat and Ask give the model no dates for their notes (only
    the weekly digest passes `written`, librarian.py `_written_hint`), so it
    guesses from the source numbering. Pass created and edited dates for
    every note in the Ask and chat prompts ("written 3 Sept, edited 25
    Sept"), and route "last/latest/newest note" questions to the recency
    walker tool (newest first) rather than retrieval; the answer should say
    whether it means newest written or last edited.
    (o) Atlas's replies use no capitals: make lowercase style an optional
    persona quirk (off by default), not the persona's fixed voice.
    (m) Windows installer: review and test the installer and the packaged
    app end to end (install, first run, update, uninstall) in a scratch
    copy; and add close and minimise buttons to the packaged app's splash
    window (the owner at release).
10d. **From the owner's first run of the packaged Windows app (0.3.4,
    first of all):** (1) the bootloader splash is off in 0.3.31 (it drew a
    blank "tk" window); a pre-Python card tested on Windows is still wanted;
    (2) no sign for a desktop user whether the app is starting, started or
    failed, and a port already in use prints logs to a console only: show
    launch progress and errors in the window or a dialog, and say plainly
    when it moved to another port; (3) a fresh dashboard says 9 widgets are
    on it but draws none until a note exists, and scrolls far past its empty
    content: draw every widget's empty state and fit the page to its
    content; (4) on an empty dashboard, offer a recommended layout in a popup.
10c. **Last requests at release, not done (0.3.4, top of the list):**
    (1) done (menus.js `wireEscapedActionMenu` floors an escaped
    `.select-menu` at the trigger's width; measured on 13 selects across
    Library, Timeline, Notes, Chat: ten narrower before, Items per page
    131.5px under 215.6px, every one at least its trigger after, 216/215.6):
    custom select menus narrower than their trigger (Library "Items per
    page"): every `enhanceSelect` menu at least the trigger's width;
    (2) done (08-consistency.css `.chip > .ph-lead { translate: 0 0.1em }`:
    a flex child ignores `.ph`'s vertical-align; icon ink centre minus the
    words' ink centre -1.84/-2.00/-0.84px before, -0.50/-0.66/+0.50 after,
    dark within 0.67): chat "Ask again:" chips: history icon and text not
    vertically centred;
    (3) done (chat.js `toggleWebPanel` draws the menu from the last known
    engine before the status call; built in the opening task, visible 5ms
    after open, from 44 to 108ms here and seconds on a Docker machine):
    the Web search sidebar's "..." button appears seconds after the
    sidebar opens (built after an async status fetch; build it with the head);
    (4) dragging the companion to hang from the top bar drops it onto the
    elements below (`nameMarkBuddyDrop`: a drop under the header's bottom
    edge should give a `hang` spot);
    (5) the companion's perches on the Chat tab need a pass as a whole (the
    owner: "a lot of the perch spots in the chat need to be fixed and
    refined"): walk every spot it takes there (sidebar rows, the composer,
    the dock, the messages column, the status bar) in a sweep and fix each.
    The sidebar perch (see 10 l): on the Chat tab it
    stands just above the status bar but is glued to a panel that scrolls,
    so it drifts with the chat's scroll instead of sitting on the bar;
    prefer the status bar's own `legs`/stand spot there, which never scrolls;
    (6) graph labels: with Labels on the map is busy; consider labelling
    only notes with 2+ links unless zoomed in;
    (7) gone 2026-10-03: Preview is replaced by the Live/Source switch
    (PR 162). Was: Notes, Capture: Preview crushes the line-number gutter to a sliver
    (the gutter keeps its column in preview, or hides with it).
    Done at release: thinking words rotate 1.5x slower; "Writing the answer"
    sits beside the dots, tips under them; Name with Atlas toasts its start
    and result; the notifications unread dot is drawn whole.
10b. **More from the owner at release, not done:** (p) the Settings head's
    small avatar showed an older look (not reproduced; every look path calls
    `repaintOwnFace`; a repaint on Settings open now covers it; check a custom
    own character, `characterRendererFor`, whose mark may cache); (q) the
    companion's glow stays full size when it hides behind the status bar or
    a panel edge (clip or fade the glow with the body); (r) the enlarged
    viewer lacks the corner companion's mood changes and emotes (see 10 j);
    (s) move `frontend/*.js` into `frontend/js/` (see item 1);
    (t) the board overview (navigator) is "really laggy now, especially on
    the mind map". Not the navigator's own redraw: measured 1.35ms a frame
    on a 60-topic map (`scratchpad/ui-sweeps/navlag.js`; caching its boxes
    only took it to 1.23). Profile a drag on the overview end to end
    (`wbNavigatorJump` then `wbCenterOn`, the zoom handler's `wbCullNow` and
    `wbUpdateSelectionBar`, the companion's own scroll and resize
    followers) with a Performance trace, on the owner's size of map.;
    (u) the companion's far travel has a poof (stars), a zip and a walk
    now (`nameMarkBuddyFarWay`); the owner asked for a portal and a
    distinct teleport too: add a portal (a ring opens, it steps through,
    one opens where it lands) as a fourth far way.;
    (v) done for the board and graph shots (dark); retake the map shot in the
    dark theme: filled cards now take readable ink (`wbCoreInkFor`,
    `scratchpad/ui-sweeps/cardink.js`), and the README leads with dark.
11. **Docs:** move INBOX 431 to HISTORY once items 1 to 6 are closed; the
   HANDOVER "Now" line then points at the next plan step.

## Held on a branch, not merged

- [x] `worktree-agent-afcb1b439a4c52dcd` last commit is a WIP (finished and merged by the Sonnet agent) (notes density,
  status bar under 680px, note-cards.js and four stylesheets). Its lint set
  fails; finish it, gate it, then merge.

## Atlas (atlas.js)

- [x] Sleeping arms: no arm resting on the orbit rings; doze standing,
  sleep on the perch floor, hanging, half tucked away, or lying down.
  `atlasarms.js` (the share of each arm on the rings' band, in the rig's
  units): sleepy arms were up to 67% on the rings (the eye-rub turned
  outward), her held-out arm 69% when dozing seated and 41% lying. Now
  every sleepy variant, standing, hanging, curled, seated and lying, is at
  most 10%: dozing hangs tucked (v0), half tucked away hands together low
  (v1), a hand across to the eye (v2). The poses' own choice of where to
  sleep is avatars.js's, not changed here.
- [x] Base "silver" button and select restyle, app-wide, at the base rules
  (default button, `.small`, `.icon-only`, `select`; there is no
  `.secondary` class): quiet fills, ghost icon buttons, custom select
  chevron, 32px (44px touch). `btnquiet.js`, 10 surfaces light and dark at
  1093: icon ghosts filled at rest 5-14 per surface to 0, small under 32px
  1-4 to 0, standing edges under 3:1 1-6 to 0 (3 left are the dashboard
  toolbar and chat dock, quiet tier by design). Light "Add" no longer reads
  as a field: accent-tinted face, weight 600, accent icon. Settings group
  rows pad the chevron inside the highlight. The reminder nudges are two
  `.stepper` pills ("− 15 min +", "− 1 day +"), 32px (44 at 390), arrow
  keys nudge, Shift a day, the readout fades (`stepper.js`). The magic-add
  hint no longer wraps and clips: every `textarea[rows="1"]` keeps its hint
  on one row (`onerowhint.js`: 61/42 before, 42/42 at 1093 and 390).
- [x] Manage categories panel redesign: the dialog head recipe, search plus
  "New category" in one row, quiet rows (dot, name, count pill, hover
  kebab), multi-select bulk bar, no double scrollbar, listbox keyboard.
  The owner's alignment pass (`managecats.js`, light and dark, 1093 and
  390): title, '?' and close on one centre line (was 4.8px off); filter and
  New category one height (32, 44 at 390; was 36.8 and 32, tops 6px apart)
  and one radius; a magnifier and a clear; one focus ring; the
  description 10px under the head (was 5); arrows and Space select, the
  bulk bar shows; no inner scroller at 1093.
- [x] Feminine hair, the owner after 0bcfd1a: "I want to add a bit more
  texture to the start of the long hair on the feminine atlas, also I dont
  like the forehead hair part. it gives off school girl vibes and not astral
  cosmic beauty vibes". Replace the centre-parted fringe (two rounded
  curtains) with an astral crown: hair swept back off the brow into the
  mass, a luminous hairline, fine flowing strands and star-dust glints at
  the roots (texture), perhaps a circlet of tiny stars or a crescent;
  elegant, ethereal, not cute. Check full size, companion size, the icon.
  Done: no parting, one high hairline arc lit as a soft band and a fine
  line, five hair-fine strands swept up and back with a light line each
  (the texture), dust at the roots, a circlet of stars on a thread with a
  larger middle star. `atlasportrait.js` (HEAD=1 for the 200px head),
  light and dark: full 240, head 200 and 64, companion 64x92, icon 24.
- [x] The lie pose's nebula cushion reads as a bed, not a thin band.
  Under lie, lie-2 and curl the host's ground shadow becomes an 18px lilac
  nebula pillow with three stars (`#nm-buddy:has(.atl-figure)` only), and
  lying flat it sits under the body (the torso spans 69 to 90 of the
  host's 92px; the bed 78 to 96). Seen on the real companion with
  `atlasbed.js` (it places `#nm-buddy` inside its rider), light and dark.
- [x] Masculine lower-body wisps read more masculine: fewer, broader,
  straighter-falling streams with a firmer taper (not the feminine
  flowing tendrils), heavier and slower in the sway. Three near-straight
  streams at 8.2, 9.6, 8.2 (were 6.2, 7.6, 6.2 in S curves), a taper that
  holds then closes (`lowerTaper: "firm"`), a straight inner stream, and
  `atl-lower-sway-heavy` (2.4 to 3 degrees at 1.25s against her 4 to 5 at
  0.68s). `atlaswaist.js`, light and dark, stand, sit, lie, float, walk.
- [x] The owner: "smoothen and blend the line between the main body and the
  lower body whisps on atlas masculine and feminine". No visible seam at the
  waist: the torso fill fades into the wisps through a shared gradient or
  mask (no hard edge or outline across the join), the wisps emerging from
  under the torso. Check both looks, every pose, and while swaying.
  Done: every wisp is rooted 6 units up inside the torso and the lower
  group fades in over 52 to 60 (`lowerin`) under the torso's 54 to 63
  fade, so no flat root or veil edge shows. `atlaswaist.js ZOOM=1` (12x on
  the waist): the curved hem line and flat stream tops before, a ramp
  after, both looks; poses and three sway frames at 5x.
- [x] Idle, walk (masculine glide with a trailing wisp), float and wave per
  look. `atlasgait.js` (animation names on the char box, body, lower and
  arm, and the rise per walk cycle): walking was the companion's hop per
  step; now a glide, his low and slow (`atl-glide-heavy`, 1.5px, 1.25s)
  with his streams trailing away from the way he goes (`atl-lower-trail`
  on `--nmb-lean`), hers lighter with a rock (3.4px). Found on the way:
  the skirt never swung in a walk, carry or kick, and Atlas never ran its
  own wave or scratch (both out-ranked on specificity); fixed. Idle: she
  sways on her own slower clock. Float: her level arm drifts down (hand
  51.8,50) instead of up over the rings. Wave: hers beside her head (hand
  48.8,28.4), where the generic wave crossed her face. Not seen on the real
  companion (a stand-in `#nm-buddy`, as for the bed).
- [x] Masculine prop hand offset (bell, lantern about 6 units off). The
  props were drawn about one grip for every look; each look now names its
  own (`propHand`). `atlasprop.js`, gap from the prop's top to the hand's
  outline: masculine bell 2.1 to 1.6, lantern 3.9 to 0.4; feminine (found on
  the way) bell 18.4 to 0.7, lantern 17.9 to 0.6.
- [x] Category tools added to `WRITE_TOOLS`, with a test. They were in
  already (create, rename, merge, delete); the test added pins every
  registered tool named for categories other than `list_categories`.
- [x] Split suggestion: an "Ask AI" option on the utility model. It was
  there (`?ai=true`, `utility_model()`, tested with the tags as fallback);
  now the button is disabled and `aria-busy` while it asks, and the answer
  is one `--text-sm` line (it was two body paragraphs, 120px). `catsplit.js`.
  The split's note rows showed an 80-character slice cut mid-sentence;
  now the note's plain words clamped to two lines with an ellipsis and the
  whole text as the row's title.
- [x] Arm variants 1 and 2 per mood checked; feminine arms legible small.
  `atlasarms.js` over every mood and variant, `atlasmoodgrid.js` for the
  sheet. Fixed: the head scratch (confused) left the hand out at shoulder
  height over the rings (72%), now beside the head in both looks; shy's
  swung-out variant clasps; her arms carry a fine rim line, legible at
  92px (`fem-arms-92-after.png`). Left as designed: raised arms of delight
  and surprise cross the rings' band, and her held-out seed-sowing arm.
- [x] A sleepy Atlas startled by any click or held Ctrl (three reports): the
  input listener only records input now; a poke wakes it over 2.4s and it
  stays up 45s; dozing eases over 3s. `atlaswake.js`: 11 of 50 frames
  surprised before, 0 after. The `.atl-easing` CSS is the companion agent's.
- [x] A poke's mood snapped back after 1.8s (the companion agent's report):
  it now holds 3.8s and eases back over 1.2s with `.atl-easing`
  (`atlaswake.js`: shy 0 to 3500ms, easing 3750 to 4750ms, calm after).

## Companion (avatars.js)

Sweeps in `scratchpad/ui-sweeps/`, measured at 1093x614 unless named.

- [x] Emotes and acts on click ease back: an act's face lets go over 1.8s
  (`nmb-easing`); companionactease.js, a cheer's eyes 104ms before, 1307ms.
  Atlas's own poke moods (atlas.js `ATLAS_POKES`) still snap back after
  1.8s: the Atlas agent's, with `atlasEase`.
- [x] Covers content: top edges only, rows inside a card are not ledges,
  every perch it would take is measured for words (`nameMarkBuddyWordsUnder`),
  0.75 of its size to fit a small clean perch, else tucked behind the bar.
  perchwords.js, four tabs by six scroll positions, chosen and settled:
  15 of 38 bad before, 0 after; 1440x900 0 of 38.
- [x] Tab switch: gone in the same frame as its tab (11 frames on the new
  tab before, 0); the materialise drifts onto its perch; out of sight no
  longer cancels the follow (it stayed away until the next switch).
- [x] Chat switch: a perch that goes is replaced in 250ms (perchgone.js,
  floated 2241ms before, 257ms).
- [x] Tab switch arrives by a walk, climb or materialise; a fade under
  reduced motion or Fades only; companiontabswitch.js passes with motion
  auto, reduced, Performance mode on and auto, Fades only, Always.
- [x] Never over text; perchtext.js 0 square px on every arrival, no poof
  after arriving (and perchwords.js above).
- [x] Lean: leanflick.js, 0 changes in a 5s 2Hz sweep, a held pointer
  leans once (a face by `--nmb-tilt`, Atlas by `data-lean`).
- [x] Perf auto keeps travel; Companion movement hint names the reason,
  now also what Always overrides (OS, app).
- [x] Avatar lab pin: labpin.js, the pick stays, no cap standing.
  companion-sim has no mood picker; its auto beats are off by default.
- [x] Persona and profile circles: personaclip.js, every face `circle(50%)`.
- [x] Create your avatar: makeavatar.js, the hint, the Profile maker and the
  companion menu row.
- [x] Saved companions: buddypresets.js, apply, rename, delete.
- [x] Small buttons: perchbuttons.js, every button still takes its click
  under it (middle and top).
- [x] Atlas hooks wired: `data-lean`, `data-atlas-variant` (per new place;
  a lie-down's side), lie-1 > lie-2 > lie and back, sit > curl-1 > curl and
  back, kept across a carry (companionlie.js).
- [ ] Deferred: an arm rig that can cross in front of the body (not small:
  the arms are separate svg roots behind the body in every look).
- [x] Sleep and clicks (companion side): a poke wakes it over seconds
  (eyes open over 1.25s, was 122ms), awake 45s, drowsy before sleep, a
  second poke pouts, a third is grumpy and comes down through a pout; a
  click near it only stirs it; a calm budget (one sudden act in 60 to 90s,
  none while typing or scrolling). atlassleepinput.js COMPANION_ONLY=1 and
  companionsleeptab.js pass. atlas.js's startle is fixed (afd8fb3), and a
  poke on the companion now wakes Atlas's face too (it stayed shut: the
  click lands on the face's box, not `.nm-atlas`); atlassleepinput.js in
  full: 0 frames off "sleepy" for Ctrl held, clicks near and a tab click,
  eyes open 1255ms after a poke, awake 20s later.
- [x] Sleep across moves and tabs: carried asleep by a fade, in by a fade,
  lying or curled on arrival; companionsleeptab.js 0 awake frames of 466
  (83 walking asleep before).
- [x] Ctrl held: 40 of 40 frames still asleep, no startle (atlassleepinput.js).
- [x] Perch rules (the Weekly digest report): see "Covers content".

## App (Sonnet)

- [x] Thinking words UI is broken (owner screenshots): the dots, a long
  line, then the phrase far right and off-centre, with an annoying pulse.
  Root cause found by isolating the element (element-scoped screenshots,
  yellow/lime background probes): `.typing-dots span` (three rules plus two
  `!important` "always motion" ones) matched the rotating word too, since
  it is just a fourth `<span>` in the same row appended by
  `startThinkingWordRotation`. The word inherited a dot's 0.45rem circle
  stretched to its own 233px `min-width` (a flattened `border-radius: 50%`
  pill — the "line"), `background: var(--muted)` painted solid across it,
  and `dot-bounce` running on it (the "pulse") — all three symptoms, one
  leak. Fixed at the cause: the three real dots now get their own
  `.typing-dot` class (chat.js) and every dot rule (both files) is scoped
  to it, so a future span in this row can't be caught the same way. Also
  bold, with a static text-shadow glow, added on top of (not replacing)
  the crossfade `tests/test_thinking_words_rotation.py` already tests
  (opacity 0/0.85, a 2px rise): that transition was never the reported
  bug, only the leak was, so it stays exactly as tested. An explicit
  writing-phase fade replaces the one the word used to borrow from the
  dots' own rule. Measured: dots, word, no line, rotation still swaps
  text every ~2.5-3.5s, light and dark
  (`scratchpad/ui-sweeps/thinkingwords.js` reproduces it standalone via
  `progressLine`, no model needed). Same fix covers chat, Ask
  (capture-ask.js) and the popup agent (palette.js): all three call the
  same `typingDots`/`startThinkingWordRotation`.
- [ ] Atlas guide panel: its '?' button does nothing; wire it. **Not
  reproduced.** Opened the panel from the status bar (1093, >=680px) and
  from the phone's More sheet (390), light and dark: clicking
  `[data-help-for="help-chat-help"]` (moved into the sheet head by
  `openHelpChat`) opens `#help-chat-help` correctly every time, through the
  same `wireHelpPopover` (menus.js) every other help toggle uses; measured
  the popover's box each time (416x249 desktop, 366x298 phone), never
  hidden or zero-sized. Added `scratchpad/ui-sweeps/guidehelp.js` to lock
  this in and to give the owner's next report something to run first. If it
  recurs, it needs the exact steps (which entry point, what was open
  already, mobile or desktop) since nothing in the obvious paths breaks it.
- [x] Chat attach popup (Notes/Documents/Files/Images/Maps): redesign on
  the new recipes. Two of the six were already met (the source tabs are
  already the shared `.seg` every sub-tab strip uses; the footer is a flex
  sibling outside the list's own scroller, so it never scrolled away).
  Added: a `.dialog-head` (a note icon, "Attach", a `.dialog-head-btn`
  Close, where there was only Escape/click-away/Done before), a
  `.search-field` well with a leading magnifying-glass glyph (generalised
  from the Web panel's own `.web-search-field`, now a reusable class pair
  rather than a second copy keyed to new ids), and `flex: none` on the
  row's chip so a long name can never squeeze it onto a second line. Rows
  already had the check, the name and the chip; only the wrap guard was
  missing. Measured at 1093, light and dark: dialog head, close works,
  search icon shows, chips hold one line.

  **Phone stacking, found then fixed** (the owner: "fix the attach popup's
  phone-width empty-state stacking (small)"). Root cause was not stacking
  at all: `#tab-chat` (the scrolling ancestor) has `overflow-y: auto`, and
  at 390 the composer wraps into several rows, tall enough that the
  popover's own `bottom: calc(100% + 0.5rem)` (relative to the small
  attach button inside that tall dock) landed its top half above where
  the ancestor's own scroll viewport painted -- present in the DOM, a real
  box from `getBoundingClientRect`, invisible on screen the whole time,
  with the chat's empty state showing through where it should have been.
  Fixed the way `openChatDockMore` already fixes the identical shape for
  the answer-length disclosure: on a phone the popup moves into an
  `openSheet` bottom sheet instead (its own `.dialog-head` hidden, the
  sheet's head already carries a title and Close), with the matching
  `.attach-card > #note-picker-panel` reset (`10-responsive.css`, mirroring
  `.chat-answers-card`'s own) and a `min-height: 0` so the list's own
  scroll can actually engage inside the sheet's `66dvh` cap (measured:
  1870px tall without it). Also found and fixed along the way: the click-
  away guard closed the sheet on every click inside it (the panel is no
  longer a `.note-picker` descendant once moved), and `.search-field`
  shrank to 20px in the column layout without its own `flex: none` (both
  general fixes, not phone-only patches). Measured, light and dark: the
  sheet opens, the popup is topmost, tabs and typing keep it open, its own
  Close and the scrim both dismiss it (`scratchpad/ui-sweeps/chatattach.js`,
  extended with a phone pass).
- [x] `settings-close` onto the dialog-head recipe; the ratchet reaches 0.
  Already landed (index.html's `#settings-close` carries `dialog-head-btn`
  inside a `.dialog-head-actions` wrapper); verified against
  `tests/test_ui_recipes.py -k dialog_head` (passes) rather than rebuilt.
  DESIGN.md's own row still called it "the named holdout"; corrected.
- [x] At least 4 realistic multi-line notes above the fold at 1093x614.
  Measured with `scratchpad/ui-sweeps/notesdensity.js`: was 3 whole cards
  plus one partial (113px/card) after the merged WIP; now 4 whole (91px/
  card), light and dark. The last ~13px/card came from the "Show more"
  button's `inline-flex` (the button base recipe) sitting in an anonymous
  block wrapper whose strut takes the *inherited* line-height, not its own
  smaller one; scoped override to `display: block` for the card view.
- [x] Status bar under 680px: one row, extras in a "more" menu. **Measured
  fine, no menu needed** (the owner's decision, 2026-09-27): at 819 down to
  600 the bar is one row with no horizontal overflow (`scrollWidth ===
  clientWidth` at every width; the `state` zone's own shrink rule already
  absorbs the space).
- [x] Sweeps at 1093: errors.js and docks.js, fix what they find. Clean:
  `WIDTHS=1093 errors.js` found 0 errors, 0 layout findings across every
  tab and Settings section; `docks.js` (its own 1440, unparametrised) found
  every dock's controls at one consistent height each, nothing to fix.
- [x] Verify the rotating thinking words render and rotate (chat, capture
  ask, palette) with no row jump; the backend half exists. Covered by the
  thinking-word fix above: rotation measured swapping text every ~2.5-3.5s
  with no width jump (`thinkingWordMinWidth`) and, now the dot-style leak is
  gone, no row-height jump either. All three surfaces share
  `startThinkingWordRotation`.
- [x] Ask citation missing after a heading on a reopened answer: not
  reproduced; regression test added. Already true on this head
  (`tests/test_citation_after_heading.py`, passing): reproduction attempted
  through the real pipeline and not found; the test holds the shape as a
  regression guard. Needs the owner's real answer if seen again.

- [x] Status bar under 680px: measured, no overflow from 600 to 819px; no menu needed (decided 2026-09-27).
- [x] Sweeps at 1093: errors.js and docks.js, fix what they find. Final
  pass: errors 0 at 1093, 1440 and 390 in both themes; contrast 0 but one
  at 390 light (a settings row's hover stuck on a phone, fixed); touch 0 at
  390 both themes; docks one height per row.
  ask, palette) with no row jump; the backend half exists.
  reproduced; regression test added. Needs the owner's real answer if seen
  again.- [x] Settings > Privacy verdict notice ("Nothing left this computer."):
  affordance and alignment (a coordinator drop, not in the original list).
  Icon was a couple of px off the text's optical centre (`.notice`'s own
  `align-items: flex-start`, there for a *wrapping* notice, scoped fixed to
  `center` for this one-line status); added a `.linklike` "See the full
  list" wired to `openSettingsModal`'s own deep-link scroll+ring, so the
  status now leads somewhere. Not done, flagged for an owner decision: no
  border (it is `.notice`'s documented shared shape, "two tones and no
  more") and a filled icon (no `-fill` glyph anywhere in the vendored
  Phosphor set, regular weight only) both need a recipe change, not a
  one-line fix.
- [x] README: showcase data (clusters, webs, loose notes, reasoned and plain
  links), dark shots of every main feature, one dark/light split, the Atlas
  section (title, headline, short intro, a mood image), the rest polished.
  Done after the owner confirmed the Atlas art and the button restyle had
  landed (7b8bc52).

  A fresh showcase notebook (57 notes over six categories, spread across
  six months via `seed-timeline.js` + `seed-timeline.py`, then eight
  coherent notes on top via `seed-readme.js` so they sort newest first;
  two boards via `seed-boardrich.js` and `seed-boards.js`; two images, one
  PDF, three reminders), linked with `seed-graph-links.js SPARSE=1` for
  clusters, hubs and a third of notes left loose per category, plus ten
  extra links posted with no `reason` for a mix of reasoned (`.graph-edge
  -reasoned`) and plain edges. Measured: the graph shot reads 57 notes, 69
  links, six visible clusters with hubs sized by degree and several
  genuinely unlinked satellites.

  All 22 existing screenshots retaken (`scratchpad/ui-sweeps/readmeshots.js`,
  SKIP=ocr since this sandbox has no Tesseract; `ocr.png` untouched). Eight
  main features retaken a second time with `THEME=dark` and copied in as
  `<name>-dark.png` (dashboard, notes, chat, graph, library, documents,
  timeline, reminders); a light/dark split (`theme-split.png`, the
  dashboard shot's left half from the light capture and right half from
  the dark one, PIL) leads the dark set. A new `## Meet Atlas` section
  (title, headline, a cropped `atlasDraw(420, 'happy', 'full')` portrait,
  three sentences) sits after "What it does"; its old paragraph there is
  now one line pointing at the new section, so the two do not repeat each
  other. `graph.png`/`graph-dark.png` and the Atlas portrait quantised to
  a 256-colour palette (PIL, `convert('P', palette=Image.ADAPTIVE)`) to
  clear the 400 KB budget (Brief 16's trap): 730 KB and 759 KB down to
  262 KB and 222 KB, no visible banding. `tests/test_readme_freshness.py`
  and `tests/test_docs_layout.py` both green (the screenshot orphan check
  included: every new file is shown, nothing shown is missing).

## Deferred to the next release (usage ran out, 2026-09-27)

The move was started on `worktree-agent-a3d063b0e2b8673ac` (WIP, unverified,
not merged). Finish, verify and merge it first thing next session.

## Was: last, once no agent is editing JS

- [x] Move `frontend/*.js` into `frontend/js/`, one mechanical commit:
  index.html script tags and `?v=` stamps, `LAZY_MODULES` paths, the static
  route, `tests/_app_js.py` and every test reading a frontend file by path,
  the tools pages, packaging; a test that every script path resolves; the
  app boots with 0 console errors.

## Later, not for this release

- Mood and act cross-fades beyond what exists; the remaining 22.x items.

## Before calling it done

- [x] Final pass, first half: a bug scan of the branch's frontend since
  91056d6 (fixed: lightbox zoom left on the other viewer; a split sent
  twice and a textless note breaking the split sheet; Back declined at
  Leave without saving left the address and stack on the old tab,
  unsavedback.js; Compare drawn twice; a companion shown again born
  mid-nap), `tests/test_final_pass_bugs.py`. Found, not changed (a
  decision, not a bug): the capture box's draft counts as unsaved work,
  so every tab switch with a draft asks "Leave without saving?" though
  the draft is kept and the tab switch loses nothing.

- [x] App-wide consistency pass after the button, select and stepper
  restyle: every surface uses the same recipes (buttons, selects, dialog
  heads, menus, notices, chips, spacing and radius tokens); a sweep lists
  every hand-built control and each is moved onto its recipe or its
  ratchet in tests/test_ui_recipes.py. Light and dark, 1093, 1440, 390.
  `consistency.js` (every control on every surface and Settings section
  against the live tokens): 36 off the radius tiers to 0 at all three
  widths (fields and selects on the button's corner, header icons off
  2px); `dialogheads.js` and `sheetheads.js`: every recipe dialog and sheet
  title 4.8px off its X to 0; `headrows.js`: sidebar heads that wrapped
  their action (32px) and two Settings headings (3px) to 0; `rowhover.js`:
  hovered Settings rows' hints 3.85:1 light / 3.23:1 dark to 4.77 / 5.29;
  `notices.js`: one notice recipe in view. Menus and dialog-head closes
  were already ratcheted. Ratchets added for fields, dialog titles and row
  hovers. The devibe pass (`devibe.js`, `surfaceshots.js`): the
  glassmorphism-violet shadow scale, the Create picker's head, "1
  reminders", "about about memorymap", a lone 0 on Today, Library previews
  opening mid-word, phone stat tiles, one "...". Not covered: states the
  seeded notebook never reaches (errors, long lists, every notice).
- [ ] `scripts/gate.sh --full` green; CI green on the head.
- [ ] INBOX 431 resolved to HISTORY; CHANGELOG lines present; README fresh.
- [x] PR 157's title and description updated to cover the whole branch.
