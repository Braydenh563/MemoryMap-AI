# Wrap-up ledger, 2026-09-27 (INBOX 431)

The owner's target: every request below finished cleanly, polished, nothing
half done, by the middle of the next session. The container restarted at
about 16:10Z and stopped the three agents mid-task; their work up to then is
committed. This is the complete list of what they still held, so nothing is
dropped. Tick an item only when it is measured working, not when it is
written.

## Held on a branch, not merged

- [ ] `worktree-agent-afcb1b439a4c52dcd` last commit is a WIP (notes density,
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
  keys nudge, Shift a day, the readout fades (`stepper.js`). Found, not
  fixed: the magic-add placeholder wraps and clips at one row.
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
  Found, not fixed: the split's note rows are toggle pills whose text is
  cut at two lines.
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
  companionsleeptab.js pass. **Open, atlas.js** (the Atlas agent): its
  global pointerdown/keydown listener still sets every Atlas "surprised"
  for 700ms and snaps back; atlassleepinput.js without COMPANION_ONLY
  measures it (Ctrl held: 40 of 40 frames off "sleepy").
- [x] Sleep across moves and tabs: carried asleep by a fade, in by a fade,
  lying or curled on arrival; companionsleeptab.js 0 awake frames of 466
  (83 walking asleep before).
- [ ] Ctrl held: the companion side holds (0 awake frames); the frozen
  face is atlas.js's listener above, with the Atlas agent.
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
  search icon shows, chips hold one line
  (`scratchpad/ui-sweeps/chatattach.js`). **Found, not fixed**: at 390
  (phone), the panel opens (correct size and position, measured) but the
  Chat tab's own empty-state content paints over it at that width,
  `elementFromPoint` inside the panel's own rect returns the empty state's
  starter chip, not the panel; pre-existing (nothing this change touched
  sits between them), not reproduced at 1093, needs its own look at the
  two components' stacking contexts on a phone.
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
- [ ] Status bar under 680px: one row, extras in a "more" menu. **Measured,
  not a bug**: at 819, 700, 680, 660, 620 and 600 the bar is one row with no
  horizontal overflow (`scrollWidth === clientWidth` at every width; the
  `state` zone's own shrink rule already absorbs the space, DESIGN.md's
  status-bar row). The touch-bar tier already at 600-819.98 (10-responsive
  .css) hides `#status-notes`, `#status-command` and the doorway words, so
  "extras in a more menu" would be recovering access to those rather than
  fixing an overflow, and needs a decision the phone's `PHONE_STATUS_ROWS` /
  `#header-more` pattern cannot just be reused for (widening `PHONE_TABS`
  itself to 680 turns the tab bar, touch gestures and every other
  `PHONE_TABS`-gated behaviour into phone mode too, far past this one bar).
  Left for a design pass: a `#status-bar`-scoped kebab, its own media query,
  and which of the two hidden controls actually count as "extras."
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
- [x] Settings > Privacy verdict notice ("Nothing left this computer."):
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
- [ ] README: showcase data (clusters, webs, loose notes, reasoned and plain
  links), dark shots of every main feature, one dark/light split, the Atlas
  section (title, headline, short intro, a mood image), the rest polished.
  After the Atlas art and the button restyle land.

## Last, once no agent is editing JS (the owner asked for it this release)

- [ ] Move `frontend/*.js` into `frontend/js/`, one mechanical commit:
  index.html script tags and `?v=` stamps, `LAZY_MODULES` paths, the static
  route, `tests/_app_js.py` and every test reading a frontend file by path,
  the tools pages, packaging; a test that every script path resolves; the
  app boots with 0 console errors.

## Later, not for this release

- Mood and act cross-fades beyond what exists; the remaining 22.x items.

## Before calling it done

- [ ] App-wide consistency pass after the button, select and stepper
  restyle: every surface uses the same recipes (buttons, selects, dialog
  heads, menus, notices, chips, spacing and radius tokens); a sweep lists
  every hand-built control and each is moved onto its recipe or its
  ratchet in tests/test_ui_recipes.py. Light and dark, 1093, 1440, 390.
- [ ] `scripts/gate.sh --full` green; CI green on the head.
- [ ] INBOX 431 resolved to HISTORY; CHANGELOG lines present; README fresh.
- [ ] PR 157's title and description updated to cover the whole branch.
