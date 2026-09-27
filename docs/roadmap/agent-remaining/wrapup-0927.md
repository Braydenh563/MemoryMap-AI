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

- [ ] Sleeping arms: no arm resting on the orbit rings; doze standing,
  sleep on the perch floor, hanging, half tucked away, or lying down.
- [ ] Base "silver" button and select restyle, app-wide, at the base rules
  (default button, `.secondary`, `.small`, `.icon-only`, `select`): quiet
  fills, ghost icon buttons, joined steppers (reminder -15m/+15m/-1d/+1d),
  custom select chevron, 32px (44px touch), contrast in both themes.
  A WIP commit exists (DESIGN.md, 01-forms-settings.css, the recipe test);
  finish and measure 10 surfaces, light and dark.
- [ ] Manage categories panel redesign: the dialog head recipe, search plus
  "New category" in one row, quiet rows (dot, name, count pill, hover
  kebab), multi-select bulk bar, no double scrollbar, listbox keyboard.
- [ ] Feminine hair, the owner after 0bcfd1a: "I want to add a bit more
  texture to the start of the long hair on the feminine atlas, also I dont
  like the forehead hair part. it gives off school girl vibes and not astral
  cosmic beauty vibes". Replace the centre-parted fringe (two rounded
  curtains) with an astral crown: hair swept back off the brow into the
  mass, a luminous hairline, fine flowing strands and star-dust glints at
  the roots (texture), perhaps a circlet of tiny stars or a crescent;
  elegant, ethereal, not cute. Check full size, companion size, the icon.
- [ ] The lie pose's nebula cushion reads as a bed, not a thin band.
- [ ] Masculine lower-body wisps read more masculine: fewer, broader,
  straighter-falling streams with a firmer taper (not the feminine
  flowing tendrils), heavier and slower in the sway.
- [ ] Idle, walk (masculine glide with a trailing wisp), float and wave per
  look.
- [ ] Masculine prop hand offset (bell, lantern about 6 units off).
- [ ] Category tools added to `WRITE_TOOLS`, with a test.
- [ ] Split suggestion: an "Ask AI" option on the utility model.
- [ ] Arm variants 1 and 2 per mood checked; feminine arms legible small.

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

- [ ] Thinking words UI is broken (owner screenshots): the dots, a long
  line, then the phrase far right and off-centre, with an annoying pulse.
  Redesign: dots, then the phrase right beside them, bold, a subtle
  glow or shimmer, no pulsing; no stray line; one row, vertically
  centred, same in chat, Ask and the popup agent.
- [ ] Atlas guide panel: its '?' button does nothing; wire it.
- [ ] Chat attach popup (Notes/Documents/Files/Images/Maps): redesign on
  the new recipes (dialog head, quiet segmented tabs, search with icon,
  compact rows with check, name and category chip that never wraps,
  sticky footer).
- [ ] `settings-close` onto the dialog-head recipe; the ratchet reaches 0.
- [ ] At least 4 realistic multi-line notes above the fold at 1093x614.
- [ ] Status bar under 680px: one row, extras in a "more" menu.
- [ ] Sweeps at 1093: errors.js and docks.js, fix what they find.
- [ ] Verify the rotating thinking words render and rotate (chat, capture
  ask, palette) with no row jump; the backend half exists.
- [ ] Ask citation missing after a heading on a reopened answer: not
  reproduced; regression test added. Needs the owner's real answer if seen
  again.
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
