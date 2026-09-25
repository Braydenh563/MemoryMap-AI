# Atlas character, remaining (agent: the Atlas illustrator, 2026-09-25)

Branch `fix/gemini-fixes-5`, worktree commits merged in order. Files:
`frontend/atlas.js` (the drawing), `frontend/css/08-consistency.css` (the
Atlas block: palette, paint, moods, poses, life; the avatar hosts near
`.atlas-mark`), `frontend/index.html` (the guide's and the popup agent's
avatar hosts, `data-atlas-avatar`), `frontend/app.js` (Find anything's
Atlas rows carry `mark: "atlas"`). Proof scripts in `scratchpad/ui-sweeps/`:
`atlastrace.js` (reference, onion skin, render at one scale; REF, REF_ORIGIN,
REF_SCALE), `atlasfable.js` (the poses, expressions and icon sheet),
`atlasfaces.js` (expressions beside the grid), `atlasavatar.js` (the avatar
in its three surfaces). The proofs the owner sees are in the main repo's
`scratchpad/shots/` (gitignored): `atlas-trace-<look>-light-a2.png`,
`atlas-fable-masculine-light-b1.png`, `atlas-fable-feminine-dark-a2.png`,
`atlas-avatar-<surface>-light.png`.

## Where it stands (the owner's "LOCK IN" direction, 2026-09-25)

Built and committed, in order: slim light body and small limbs, fluffier
ear tufts, a fuller mane, the cosmic-water ribbon tail (one tapered stem,
two streams weaving inside it, no tongues), the pulsar heart, the strand
curving round the body, Atlas following Face looks (its own Atlas look
setting still wins when stored); the feminine look with long flowing hair
threaded with a constellation and a longer, lighter mermaid ribbon tail;
the reading book of light under the figure, the tail curled asleep and
coiled while drowsy; the head-and-shoulders avatar (`atlasAvatar`,
`atlasDressMarks`) in the Atlas guide's head, the popup agent's head and
Find anything's Atlas rows.

## Remaining, in order

1. Poses the owner picked that need the companion's behaviour side
   (avatars.js, the other agent's file; the drawing answers `data-pose`
   and `nmb-*` classes): hang with both arms up and the strand spiralling
   round the body (a second band path for the hang pose), sleep curled
   inside the tail beside a galaxy panel (a panel prop), wake or stretch,
   meditate (legs crossed, rings lifted), juggling stars (three orbiting
   glints over the raised hands), starry map (a table of constellations
   under the hands). Each is a prop slot (`nmp-*`) plus a CSS pose block.
2. The bust's crop: the face is 45% of the box because the rings are in
   it; the owner may prefer a tighter head crop for the 20px Find anything
   row (a `bust` box of [7, -6, 48, 48] and a `head` fallback under 24px).
3. The four accent checks and the dark checks of the final sheets; the
   24px icon read at 20 and 16px (the sheet's icon row is the check).
4. Settings, Appearance, Atlas look shows "masculine" while nothing is
   stored even when Face looks is feminine (Atlas then follows Face looks):
   an "auto (follow Face looks)" option in that select would say so.
5. `tests/test_name_mood.py` still asserts `oklch(from var(--accent)` in
   the CSS: it holds (the accent tints the glow); a test for the fixed
   palette would be the honest replacement.
6. vtracer of the reference cells gave pixel-step contours (stacked colour
   blobs, 15k nodes from a 175px cell), unusable as rig parts; the onion
   skin at one scale is the contour check instead. Say so in HANDOVER if
   the method is asked for again.
