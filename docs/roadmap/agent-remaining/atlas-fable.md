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

## Where it stands (round 3, the owner's second batch, INBOX 426 v and bb)

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

1. The companion simulator's travel: `placeNameMarkBuddy` keeps the
   companion at its corner spot on the mock page; its trips are driven by
   app.js's tab changes and idle beats, which the sim does not have. A
   "beat" control that calls the companion's own scheduler entry, once the
   companion agent names it, would show the motion the owner wants to
   judge. The stand-in menu lists the real items but says nothing about
   where app.js's menu lands.
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
