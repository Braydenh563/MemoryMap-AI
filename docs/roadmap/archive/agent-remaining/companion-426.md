# Agent: the companion and the faces, INBOX 426 c to g, j to p, w and x

Worktree `.claude/worktrees/agent-a42ac8319ec33be28`, merged with
`origin/fix/gemini-fixes-5` at `9825ee4`. Port 8805, data dir
`/tmp/mm-companion` (`bash scratchpad/ui-sweeps/serve.sh 8805 /tmp/mm-companion`).

## Done

Round 1 (merged at `3165d64`): `7698576` c, j, k (arms, the rude gesture
out); `4ec5ded` d, g, k to p (rides its panel, its own beat, Call back,
menu at it, a new name redraws it); `2c529d7` e (your own character);
`de3c2db` f (what a face holds in its head mark).

Round 2 and 3:

- `54edf3b` followed every frame while its panel animates (transitionrun
  to transitionend), 32.4px adrift over a 2.4s slide before, 0.5 after.
- `05363c9` performance: no filter on the figure, Atlas's SVG animations
  paced at 20 steps a second and held while scrolling, no obstacle sweep
  per wheel step. Atlas idle +190 -> +63ms/s of main thread, scrolling
  +0.46 -> +0.06ms/frame of scripting (later +45ms/s, +0.05).
- `3f3f75c` rides its panel's scroll through a ScrollTimeline (clipped in
  a fixed band, never a child of the app's scroll boxes), leaves with its
  panel, re-perches only on its beat; the poof (370ms) for a jump it must
  make; choosing a perch 176 -> 6ms.
- `6d39201` its menu holds it where it is (84.png: its own behaviours had
  moved it 338px from its open menu).
- `49187cc` expressions (hello, pokes, saved note, error, bell, thinking,
  away, a drift), drawn ahead in idle time; a wave when you are back.
- `22e151e` size (menu, Appearance, a corner handle), light and dark.
- `84810a2` a retired part dropped on read and save (73.png, 90.png); your
  picture enlarges on a double-click.
- `15f7115` namemarks.js under Face looks: Jade/Maya not reproduced under
  15% in any setting (lowest pair anywhere 16.8%).

Sweeps, all in `scripts/gate.sh --sweeps`: `companionscroll.js`,
`companionbeats.js`, `companionperf.js` (CDP metrics, trace, profile),
`companionsmooth.js` (composited frames by screencast), `companionmenu.js`
(58 menus), `companionlife.js`, `profilelook.js`. Proof in the main
checkout's `scratchpad/shots/companion-r3/` (perf before and after, smooth
before and after, expressions, size handle, light and dark, Holding).

## Remaining

1. Atlas still repaints its 455-node SVG twenty times a second at rest
   (paint about 32ms/s, 1.6ms a paint). The drawing is atlas.js's (the
   Atlas agent's); fewer or cheaper animated groups there are the next
   saving. The governor paces it but cannot make a paint cheaper.
2. Riding needs `ScrollTimeline` (Chromium 115+, so WebView2 on Windows);
   WebKitGTK falls back to the script follow, held at the edge. Not driven
   in the desktop window.
3. In composited frames a single frame at a gesture's start or reversal is
   still one frame late (1 to 5% of wheel frames); the rest are exact, and
   the same with the main thread 30ms busy.
4. The size handle is mouse-only by design; keyboard and touch size it
   from the menu and Appearance. A large companion near the window's edge
   can reach past it by the extra 30%.
5. Round 2's hole hunt (touch drag at 390, Call back at every width,
   reduced motion, hidden then shown) was not run as its own pass;
   `companionmenu.js` covers the menu at 390 and from the keyboard.
6. 84.png did not reproduce as a placement bug; the fix is to the one path
   that did reproduce (moving while its menu was open).

Round 4 (`f4f5044`, `e7a57e3`, `7249215`, `a6104d7`): a pin keeps its place
through resizes and is made where it is drawn (`companionpin.js`); the menu
opens at the pointer and stops a move under way (the one 84.png shape that
reproduced: mid-walk and mid-poof, 38 to 142px off); the size handle only
on hover, focus or sizing; the pacer's SVGSVGElement filter kept.

7. `companionmenu.js` once found no menu for a right-click at the bottom
   left at 1440 (1 run in 3, the first after a server restart); not
   reproduced in two more runs.
8. A pin within 160px of the right or bottom edge keeps its distance from
   that edge on a resize; one further in keeps its place. Whether the owner
   reads the first as "moving" is not known.
