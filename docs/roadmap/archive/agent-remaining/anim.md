# Agent: cheap animations, INBOX 308

Worktree `.claude/worktrees/agent-anim` on `worktree-agent-anim`, cut from
`claude/open-sections-a-b`. Port 8808, data dir `/tmp/mm-anim`
(`bash scratchpad/ui-sweeps/serve.sh 8808 /tmp/mm-anim`).

The owner, verbatim: "I also think we need to make sure that all animations
for things are done the cheapest they can be to reduce cost in the browser and
devices. like using transform etc etc."

Everything asked for is built, measured, and moved to HISTORY. Nothing below
blocks any of it.

## Done

Commits `abbbe09` (the probe, with the baseline), `59c40e9` (the boot splash),
`52f605f` (the other two), `bf08e0c` (the lint, DESIGN.md and the gate), plus
the docs commit that follows them.

The audit in INBOX 308 was right: of 111 `transition:` declarations in
`frontend/css/`, three named a layout property, and no `@keyframes` outside
the boot splash did. So this was surgery, not a sweep. The three, and what
each turned out to be:

| Where | What it was | What it is now |
| --- | --- | --- |
| `00-tokens-shell.css`, the boot splash bar | `transition: width` plus a 2.4s `@keyframes` on `width`. **121 layouts and 6.76ms of layout time for one crawl**, median of three runs against a control floor of 3 | full-width fill, `transform: scaleX()` from a left origin, the track keeping the geometry and clipping the ends. **0 layouts, 0.01ms.** Painted box identical: 158.4px inside a 176px track at the end of the crawl, flush left, 4.8px tall |
| `03-dashboard-widgets.css`, the Loose ends meter | `transition: width var(--motion-slow)`, which **could never fire**: `renderLooseEnds` sets `--dash-loose-pct` while the element is detached and appends it after, so its first style is its final one. Replaying that order in the running app fires no `transitionrun`; changing the property on an element already in the document does, and nothing does that | deleted, with the measurement and the scaleX recipe left in its place as a comment |
| `10-responsive.css`, `#phone-tab-dock` | `transition: height`, and it **does** run: at 390, `data-receded` walks the box 57.59px to 44px across twelve frames, a median 15 layouts and 1.0ms against a floor of 0 | kept. A real box changing size with content in it: `translateY` takes the bottom off a 44px touch target, `scaleY` squashes the icons. The reason is written at the declaration, which is what the lint asks for |

`tests/test_cheap_animations.py` is new and in the gate's lint set: a
`transition` or `@keyframes` naming width, height, top, right, bottom, left,
margin, padding (longhands, logical and min/max forms included) or `all` fails
unless a `/* ... */` comment of at least five words ends on the line above.
Checked against the fault it is for, six probes added to
`00-tokens-shell.css` and removed again: the old width transition, a keyframe
with `margin-left`, `transition: all`, a `padding-inline-start` longhand and a
bare `/* */` above a height transition all failed with file and line; a real
sentence above a height transition passed, and `border-width` and
`stroke-width` did not fire.

`scratchpad/ui-sweeps/animcost.js` is new and in the gate's sweep list. It
holds `/auth/status` open so the splash stays up for its whole crawl (the slow
cold start the crawl exists for), reads `LayoutCount` and `LayoutDuration`
from CDP rather than frame deltas, and runs a control pass with the animation
off so the figure is attributable to the bar. It returns a verdict as well as
a reading: at most 8 attributable layouts, and the fill still painting as a
fraction of its track flush with the left edge. Checked both ways, 0 findings
on this head and exit 1 (118 layouts) against the stylesheet before the
conversion.

## Decisions made

- **`box-shadow` is not in the lint.** Ten transitions animate it. It
  repaints, it does not relayout; it is the app's hover treatment on every
  button and card; the cheaper form (a pseudo-element carrying the shadow,
  animated on `opacity`) adds a box to every one of those surfaces. A rule
  that fires on the ordinary correct thing is one people learn to suppress.
  Written in the lint's own docstring so it is not remade. If shadow repaints
  ever show up in a measurement, the answer is that measurement and a plan
  entry, not a widening of the rule.
- **The escape is a comment, not an allowlist in the test.** The reason has to
  be readable where the trade is made. An allowlist of selectors in a test
  file rots the moment the stylesheet moves.
- **The boot splash fill gives up 2.4px of rounding on its leading edge.** The
  track already clips with the pill radius, so the left end is still round; a
  scaled box scales its own radius into an ellipse that visibly distorts as
  the bar moves, which is worse than a squared leading edge inside a rounded
  track.
- **The dead meter transition was deleted, not converted.** Deleting a
  declaration that never ran beats converting it, and nobody asked for the
  meter to animate.

## Not verified

- **Nothing was looked at.** Every claim here is a number from
  `getBoundingClientRect`, `getComputedStyle` or Chrome's own layout counters.
  The 2.4px the splash bar's leading edge gives up is arithmetic (999px
  clamped to half of a 0.3rem bar), not a pixel read from a screenshot.
- **The layout counts come from headless Chromium in this sandbox.** The
  counts themselves are exact, and the direction (121 to 0) is far outside any
  noise, but the millisecond figures are this machine's.
- **The phone dock recede was measured in an emulated phone context** (390,
  `isMobile`, `hasTouch`), not on a real device.

## Remaining, none of it started

- **`box-shadow` on the glass surfaces has never been measured.** The decision
  above is reasoned from what it costs in principle (a repaint, not a layout)
  and from the churn a rule would cause. Nobody has put a number on a shadow
  transition over a `backdrop-filter` surface, which is the one case where the
  repaint is genuinely expensive because the blur behind it repaints with it.
  `animcost.js` is the shape of the probe that would answer it: hold a hover,
  count `Performance.getMetrics`'s paint counters with and against
  `data-glass="off"`.
- **`filter` and `backdrop-filter` are not covered by the lint either**, and
  unlike `box-shadow` that is an omission rather than a decision: nothing in
  `frontend/css/` transitions them today, so there was nothing to measure and
  no fault to check a rule against. If one is ever added, it belongs in the
  same lint with the same escape.
- **The remaining 108 transitions were not each re-read.** The audit in INBOX
  308 counted them by property and found them all on transform, opacity or
  colour; that count was taken as given rather than repeated, and the lint now
  holds the line for all of them anyway.
