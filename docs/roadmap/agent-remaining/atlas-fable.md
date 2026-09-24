# Atlas character, remaining (agent: the Atlas illustrator, 2026-09-24)

Branch `fix/gemini-fixes-5`, worktree commits merged in order. Files:
`frontend/atlas.js` (the drawing), `frontend/css/08-consistency.css` (the
Atlas block: palette, paint, moods, life), the proof scripts
`scratchpad/ui-sweeps/atlasfable.js` (the reference-style sheet),
`atlastrace.js` (reference, onion skin, render at one scale) and
`atlasfaces.js` (expressions beside the reference grid).

## Where it stands

Built, in order, each committed: the traced proportions from the
"conceptual art" grid; the k-means palette from the sheets
(`scratchpad/palette.py`); the remodel to soft curves (bean head, chubby
limbs, flame tail, galaxy dropped); and the owner's hybrid decision (the
grid's flame ear tufts, wisps, face, constellation, comet tail, nebula
strand, ring clusters; the ghost sheet's oval head and tendril lower body;
the Comet Drifter's streaming mane). The last of these is the working
tree at the time of this note; its proofs are the next step.

## Remaining, in order

1. Proof the hybrid: `atlastrace.js` against `ref34-cell.png` (both
   looks), `atlasfaces.js` against `ref32-faces.png`, and the four sheets
   (`atlas-fable-<look>-<theme>.png`), read against 40.webp and 41.webp,
   iterate on what differs (the mane's flow and translucency, the ear
   tufts' flicks, the tendrils' curl, the strand's weight), commit per
   pass.
2. The owner's pose crops from the grid, in the companion's states (the
   behaviour side is avatars.js, the other agent's file; the drawing side
   is here): sleep curled inside its own tail beside a galaxy panel,
   drowsy with headphones and the strand coiling below, reading on an open
   glowing book with the tail sweeping under it, hang from a bar with both
   arms up and the strand spiralling round the body. The strand and the
   tail already answer `data-pose` and the `nmb-*` states through
   `--atl-tail`; the book and the bar are new props (`nmp-*` slots).
3. The four accent checks and the dark checks of the final sheets; the
   24px icon read (head, ear tufts, eyes) at 20 and 16px.
4. `tests/test_name_mood.py` still asserts `oklch(from var(--accent)` in
   the CSS: it holds (the accent tints the glow); a test for the palette
   being fixed would be the honest replacement.
5. vtracer of 40.webp's cells gave pixel-step contours (279 stacked colour
   blobs, 15k nodes from a 175px cell), unusable as rig parts; the onion
   skin at one scale is the contour check instead. Say so in HANDOVER if
   the method is asked for again.
