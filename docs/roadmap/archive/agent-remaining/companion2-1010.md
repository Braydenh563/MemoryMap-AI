# companion2-1010: what is left

Agent companion2-1010 (branch `agent/companion2-1010`), Brief 34 continues
(INBOX 742, 743, 752, 772, 773). Built items are in the commits and
CHANGELOG; one line each below.

## Built (measured)

- Faces at small sizes (step 1): one mood sign beside the head and bold brows
  at 28 and 20 px, from a lazy sheet (`frontend/css/atlas-lazy.css`, atlas.js
  `ATLAS_CUES`, `atlasCue`, `atlasSheet`). Distinct faces of 15 by pixel diff
  (atlasfacediff.js and .py, DIFF=96 FRAC=0.03, any channel): light 28px 2 to
  15, 20px 1 to 15; dark 28px 11-13 to 15, 20px 10-11 to 15; both looks.
- Tail at rest on the compositor (step 2): path draws a minute at rest 900
  (15 a second) to 83 (taildraws probe, 88% of the time resting); Atlas idle
  layouts a minute 760 to 534-842 and script 1,930 to 854-1,512 ms over four
  30s runs (companionperf.js IDLE=1, a loaded machine).
- Reduce motion (step 3, INBOX 772): 0 Atlas animations run under the
  system hint (were slowed to 9s); recalcs a minute 171 (hint) and 141 (app
  Reduce, new `x:appreduce` state), layouts 36 and 9.
- Calm's arms (step 4): angle off straight down, full size, both looks: 0 to
  5 degrees in all three variants before, -34 to 56 after (atlasarms.js).
- Smoothness (step 5, atlassmooth.js): reaction latency from the end of the
  debounce to the first frame with the mood: 47, 53, 86, 90 and 169 ms
  (load 5 on four cores, errors.js running); snaps in ten minutes at 60 Hz:
  one (both hands at once, hanging, 261s); distinct in ten minutes: 7 acts,
  7 tail acts, 3 arm variants (17 motions) and 9 moods. Measured only; no
  change was made for step 5.

## Left

- The rest of Atlas's idle cost is the companion's own behaviour, not the
  tail: with the tail and breath switched off, 670 recalcs and 130 layouts a
  minute remain (recalc probe), all from avatars.js timers. Decision 7's 1 ms
  needs the behaviour picker and perch checks profiled next.
- The chest's breath still writes the torso's `scale` 2.5 times a second at
  rest (atlas-life.js `atlasBreathFrame`): a recalc and a layout each. Zero
  needs the torso on its own layer root (a drawing change, `atlasDrawFigure`).
- 104px faces (the welcome, the large view): 2 to 3 of 15 distinct in light by
  the same metric; the cue is drawn only at the head and tiny levels. The
  owner's "I barely get to see atlas change expression" may also mean the
  companion figure (12px face); a cue on the figure is the next step.
- Step 5 not built: one curve table for every joint (120 to 400 ms), the
  idle pool's never-within-five rule and a reaction budget a minute beyond
  the existing 6s gap (avatars.js `NMB_REACT_GAP`). The one snap (both hands
  jumping over 4px out of stillness while hanging, atlassmooth.js) is likely
  the held arms' crossfade (`atlasRigRead`, -158 degrees); one latency trial
  of five was over 100 ms, the frame wait under load.
- Arm angle over a walk cycle not measured (atlasarms.js measures still
  poses; the walk swing is the rig's, atlas-motion.js `atlasRigFrame`).
- `#nm-buddy:has(.atl-figure) .nm-buddy-char` and the lower layer still slow
  to 6s under the hint (08-consistency.css, the block after the chin hand
  rule) rather than stopping: they may carry acts, so left for a driven check.
- Companion movement Full keeps the script loops (tail, rings) under Reduce
  by design (`atlasMotionOK`); the CSS loops stop under the hint regardless.

## Not verified

- A real WebView2 or WebKitGTK window; only headless Chromium.
- Timings: other agents held the load at 4 to 6; counts are load-free, ms
  are not, and the companion's random behaviour moves a 30s idle run by
  half again.
- Trap: a run of `companionperf.js` with `x:appreduce` sets the `motion`
  preference; a later run on the same data dir measured with Reduce on
  until `reduce-motion-toggle` was cleared. Reset before measuring.
