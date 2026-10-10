# companion-1010: what is left

Agent companion-1010 (branch `agent/companion-1010`), Brief 34 (the companion,
then Atlas) with section 6's rows, OPEN.md's companion and Atlas rows and the
owner's 2026-10-10 list. Built items are in the commits and CHANGELOG; one
line each below.

## Built (measured)

- Rub and flip (INBOX 743): rub to love (Atlas love or shy), shaken while
  carried to 180 degrees, landed upright and dizzy; switches under What it
  does on its own. Driven at 1440 for You and Atlas, 0 page errors.
- Right-click in the enlarged view (owner's list): verified, the menu opens at
  the pointer with Companion, Atlas look and Size (fixed by chatui-1010).
- Face changes in a 3-minute scripted session (companionmoods.js): Atlas 4 to
  12, faces 2 to 5, longest still 78s to 63s; You 7 to 12, faces 4 to 6.
- Idle cost (companionperf.js IDLE=1, ms of script a minute, loaded machine):
  You 737 to 130, Atlas 3,780 to 2,050 (task 34,952 to 14,992, layouts 1,399
  to 769), You locked 808 to 23, Atlas locked 1,886 to 39; hidden was
  already gated (You 6, Atlas 16 to 17); off 32, then 8 and 16 (noise).
- Atlas's ways of moving by distance: 2 to 6 (hop, float, leap, glide, walk,
  poof); hop and leap driven for Atlas, landing on target.

## Left

- Decision 7's "under 1 ms a minute" is not met by Atlas: its tail is a
  script-drawn path (atlas-life.js `atlasTailFrame`), 15 draws a second at
  rest, about 770 layouts a minute. Meeting it needs the tail on the
  compositor (a cached sprite strip, or CSS on layer roots), a drawing change.
- Atlas's faces do not read as different moods (sheet: atlas-sheet-*.png, 15
  moods at 104, 28 and 20 px, both looks, light and dark): at 104 the face is
  about 12 px inside rings and tail, at 28 and 20 the moods are one face.
  Real mascot work changes eyes, brows and mouth boldly, with a mood cue
  (sweat drop, zZ, hearts, "!") that survives at 20 px. Likely the root of "I
  barely get to see atlas change expression" (atlas.js `atlasApply`).
- Under the system's reduce-motion hint Atlas keeps its calm CSS loops (an
  earlier decision, 08-consistency.css:5056): 1,579 style recalcs a minute.
  Decision 7 says reduced motion keeps poses without loops; the owner should
  say which wins. The app's own Reduce setting was not measured.
- Brief 34 second part (INBOX 752): snapping transitions per minute (60 Hz
  joint sampling), 12 distinct idle motions per ten minutes and reaction
  latency under 100 ms were not measured; the latency bar conflicts with the
  1.5s reaction debounce the owner asked for ("atlas startles a lot").
- The owner's "arm movements ... permanently in a downward arc": the arm hold
  now changes on idle ticks (45%), but the arm angle range over a walk cycle
  and at rest was not measured (atlasarms.js has the probe).
- Tail, rings, nebula and lower-body "subtle animations that are all cheap"
  (owner's list): not changed; they exist (atlas-life.js) and are the cost
  above.
- Face sheet (facesheet.js, 12 names, light): one silhouette, one outline,
  readable at 104; crowns spill 6 px past the card's top edge; the gaming
  controller reads as a black block at 104.

## Not verified

- Every "Done when" face site was read in code (`nameMark` goes through
  `characterRendererFor` first), not driven one by one this round.
- Context reactions (drowsy, sleep, headphones, glasses, nightcap, bell,
  offline, wave on focus) are present in avatars.js and were measured by
  earlier sweeps; not re-driven.
- Timings: other agents held the load at 6 to 10 on four cores; counts
  (layouts, recalcs) are load-free, milliseconds are not.
- A WebView2 or WebKitGTK window; a touch rub (mouse and pen only by design).
