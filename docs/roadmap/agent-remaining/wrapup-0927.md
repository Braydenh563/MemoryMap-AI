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
- [ ] The lie pose's nebula cushion reads as a bed, not a thin band.
  Written, not yet seen in place: under lie, lie-2 and curl the host's
  ground shadow becomes an 18px lilac nebula pillow with three stars
  (08-consistency.css, `#nm-buddy:has(.atl-figure)` only). Not verified on
  the real companion: since it rides inside `#nm-buddy-rider` and
  `#nm-buddy-band`, `atlasposes.js` can no longer place it for a still
  frame (the clip lands off the page); fix that sweep, then look.
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
- [ ] Idle, walk (masculine glide with a trailing wisp), float and wave per
  look.
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
- [ ] Arm variants 1 and 2 per mood checked; feminine arms legible small.
- [x] A sleepy Atlas startled by any click or held Ctrl (three reports): the
  input listener only records input now; a poke wakes it over 2.4s and it
  stays up 45s; dozing eases over 3s. `atlaswake.js`: 11 of 50 frames
  surprised before, 0 after. The `.atl-easing` CSS is the companion agent's.

## Companion (avatars.js)

- [ ] Emotes and acts on click must ease back to the prior state, never
  cut back after a few seconds.
- [ ] Covers content again (sat over the Weekly digest text): size and
  proportion depend on the perch; it scales down where space is small
  and never overlaps text.
- [ ] Tab switch: it stayed visible on the new tab for a split second,
  vanished, then came back with barely an entrance; it must hide on
  leave and arrive with a real entrance, with no startle.
- [ ] Chat switch: it was left floating mid-panel for seconds after its
  perch (a button on an empty chat) went away; re-perch at once.
- [ ] Tab switch: the companion must arrive (walk, hop, climb or portal),
  never just appear. Reproduce with motion auto and reduced.
- [ ] Never perch inside a text block (it sat in the Weekly digest
  paragraph); resolve the final perch before the entrance, no post-appear
  blink. Sweep: settled rect never overlaps a text node in a card.
- [ ] Lean jitter: hysteresis (enter 0.7, leave 0.3), 1.2 to 1.5s dwell,
  smoothed gaze, no lean on flicks. At most 2 lean changes in a 5s 2Hz sweep.
- [ ] Perf auto must not stop companion travel; reduced motion fades instead
  of popping; a "Companion movement" setting (follow, always animate, fades
  only) whose hint names the reason (OS, setting, perf).
- [ ] Avatar lab: a picked motion stays pinned, "Live behaviour" toggle off
  by default; no standing sleep; night cap only when lying or curled.
  Check companion-sim for the same.
- [ ] Settings > Personas: Atlas clipped to its circle (and every persona
  and profile circle).
- [ ] No silent random custom face; "Create your avatar" with a link to
  Settings > Profile where "you" is offered, and in the companion menu.
- [ ] Saved companion presets, on the custom-themes pattern.
- [ ] Small toolbar buttons: perching never blocks the click.
- [ ] Wire the Atlas hooks: `data-lean`, `data-atlas-variant`, `data-pose`
  lie-1, lie-2, lie, curl-1, curl.
- [ ] Deferred unless small: an arm rig that can cross in front of the body.
- [ ] The owner, high priority: "when atlas is sleeping and i click it, it
  opens its eyes and mouth for a sec like it is startled but then falls
  back asleep a second later making it feel like the sleep is fake. it
  needs ot be a gradual fall back asleep. maybe a pout or getting a
  temporarily a little mad if it happens multiple times consecutively or in
  a short time span etc. make sure that random sudden movements dont happen
  too frequently or randomly. it cant be distracting for the user". A click
  asleep wakes it gradually (slow lids, a yawn, a stretch), awake at least
  20 to 30s, drowsiness back over time before sleep over several seconds;
  repeated clicks go sleepy-annoyed (pout, huff), then grumpy, then decay;
  no instant revert. A calm budget: at most one attention-grabbing act
  every 60 to 90s, never while typing or scrolling nearby. Tests: the state
  transitions and the rate cap.
- [ ] The owner: "the companion was sleeping but then when I clicked a
  different tab, for a split second I saw it shoot back up look alive
  suddenly and look surprised". Sleep persists across moves: carried asleep
  (fades or poofs, arrives lying or curled) or woken gradually before a
  walk; no reset to an awake or surprised pose on reposition, remount or
  tab change. Test: sleep plus a tab switch never shows an awake frame.
- [ ] The owner: "the companion gets frozen in its animation and with the
  exact same half lidded half mouth open expression every time when I hold
  down ctrl". Holding Ctrl keeps its live face and animation.
- [ ] The owner, again: Atlas sat over the Weekly digest paragraph, and
  scrolled, looked perched on the status bar. Top edges only, never inside
  a card's content below its heading; every settle validated against text
  rects; on scroll it stays on its edge or hops to a valid one.

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
