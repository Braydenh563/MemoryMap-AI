# Atlas character, remaining (agent: the Atlas illustrator, 2026-09-26)

Branch `fix/gemini-fixes-5`, worktree commits merged in order. Files:
`frontend/atlas.js` (the drawing; `ATLAS_TUNE`, `atlasBuild`, `atlasRetune`
for the lab), `frontend/css/08-consistency.css` (the Atlas block: palette,
paint, poses, moods, life, the avatar hosts, the tune tokens),
`frontend/index.html` and `frontend/app.js` (the avatar hosts and Find
anything's Atlas rows), `src/memorymap/api/app.py` (the `/tools` mount),
`tools/avatar-lab.{html,css,js}` and `tools/companion-sim.{html,css,js}`
(the owner's benches). Proof scripts in `scratchpad/ui-sweeps/`:
`atlastrace.js` (reference, onion skin, render), `atlasgrid.js` (every pose
beside its cell of the sprite grid; ZOOM and POSES), `atlasfable.js` (the
sheet), `atlasavatar.js` (the avatar in its three surfaces), `atlastune.js`
(the tune reaches the drawing), `atlaslab.js` and `atlassim.js` (the
benches run without errors), `atlasprobe.js` (where the companion is). The
proofs the owner sees are in the main repo's `scratchpad/shots/`
(gitignored), prefixed `atlas-r3-` (`trace`, `grid`, `sheet-feminine-dark`,
`tune`, `lab-<view>`, `sim-<step>`).

## Where it stands (round 4, performance)

The companion's Atlas is five stacked SVG layers (`atlasDrawFigure`:
back, tail, body, lids, front) whose idle loops run on the layer roots
(breathe, sway, blink, shimmer: compositor transforms and opacity, with
will-change), with the loops inside a drawing off in the layers, the
gradients and clips in one shared hidden `<svg class="atl-defs">` per
look, the star specks one path each, and every loop paused off screen
(`atl-off`) and on a hidden tab (`data-atlas-hidden`). Measured with
`companionperf.js` (6s idle, dashboard): Atlas idle went from +45 ms/s
of main thread over the page with it off (20 layouts a second) to +1
ms/s and 0 layouts; nodes 508 to 426; the four-pose grid differs from
round 3 by 0.48% of pixels above 24/255 and 0.001% above 96/255 (the
diff image `atlas-r4-grid-diff.png`). The one avatars.js hook: the
tempo pacer skips animations whose target is an SVG root
(`SVGSVGElement`), since stepping them would put them back on the main
thread. The simulator now gives the companion the app's tab list, a
Beat (its behaviour runner), a Trip (its placement asked to look near a
random panel) and auto beats alternating the two.

## Where it stood after round 3 (the owner's second batch, INBOX 426 v and bb)

Built and committed: a silhouette per pose (round 2) with three new acts
the companion can call (`nmb-act-meditate`, `nmb-act-juggle`,
`nmb-act-map`); the anatomy (tapered limbs with small rounded paws, a
slight contrapposto, no drawn outline but a soft glow); the tail longer
with a swoosh; the strand as a galaxy ribbon (gradient, lit edge, clouds,
twist, a pale stream); the heart star as the logo's hub with linked
minor stars; the feminine look after the female sheets (fins, long
constellation hair, slender, a mermaid lower body in two ribbons, the
galaxy-seed gesture, lilac skin); the face-led icon under 28px;
`window.ATLAS_TUNE` with `atlasRetune`; the avatar lab reworked (served
at /tools/avatar-lab.html or as a file; both looks, moods, sizes, poses,
light and dark grounds, a reference overlay, characters by seed with the
Your look pickers, live tune knobs and CSS, A and B snapshots, JSON
export and import); the companion simulator with the real companion on a
mock page, a trace, fast scroll, moving panels and a stand-in menu.

## Remaining, in order

1. The companion simulator's stand-in menu lists the real items but says
   nothing about where app.js's menu lands; the companion's blink on the
   layered figure is the lids layer, which mirrors the head's mood tilt
   and the think and attend turns but not a turn from another act (a
   blink during a head shake sits a few px off); the ring drift and the
   per-glint twinkles are off at companion size (the front layer shimmers
   as one instead).
2. The owner's read of round 3 will name the next round: the trace
   proofs put the masculine at 88% of the sprite's height and the
   feminine's hair a third shorter than the definitive stand's.
3. Three CSP "inline style" warnings on the lab's console come from a
   `style` attribute set somewhere in avatars.js's generated faces (not
   the lab's code); harmless there, worth a grep by the companion agent.
4. Settings, Appearance, Atlas look shows "masculine" while nothing is
   stored even when Face looks is feminine (Atlas then follows Face looks):
   an "auto (follow Face looks)" option in that select would say so.
5. The feminine look has no legs, so the companion's leg animations
   (walk, kick, dangle) move nothing on it; a ribbon sway on
   `.atl-lower` under the same classes would answer them.
6. `tests/test_name_mood.py` still asserts `oklch(from var(--accent)` in
   the CSS: it holds (the accent tints the glow); a test for the fixed
   palette would be the honest replacement.
7. A `--changed` gate on this branch selects 338 test files (most of the
   suite) because the diff against origin/main is the whole branch; each
   run is 40 minutes and more. Gating against the branch's own base would
   make the per-step gate what standing order 5a means.
