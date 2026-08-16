# The design system

Everything visual in this app is built from the tokens below. This document is
the contract: **new features use these, and `tests/test_style_scale.py` fails
the build if they don't.**

## Why this exists

Reported, after a round of real use:

> *"the way spacing, alignment and margins of all the ui features in each tab
> aren't consistent and it changes each tab. I want the UI across the
> application to be very professional, consistent and clean. not to look like
> it is just a bunch of ai generated slop features joined together."*

That was accurate, and the cause was structural rather than cosmetic. Each tab
was built in its own session, reaching for whatever value looked right at the
time, and `style.css` grew past 5,000 lines with nothing shared underneath it.
Measured before any of this was fixed:

| | Before | After |
| --- | ---: | ---: |
| Distinct spacing values | 25+ | 9 |
| Distinct font sizes | 37 | 10 (+3 hero one-offs) |
| Distinct corner radii | 12 hard-coded px | 3 tiers, all derived |
| Page gutter treatments | 4 across 7 tabs | 1 |

**None of those numbers is the point on its own.** Seven values between 0.3rem
and 0.6rem all mean "a small gap"; nine font sizes between 0.74rem and 0.85rem
all mean "slightly smaller than body text". Two things that are *almost* the
same size, next to each other, is exactly what reads as unconsidered — nothing
lines up, and no value means anything because every one is slightly its own.

---

## The tokens

All defined in `:root` in `frontend/css/00-tokens-shell.css` — the first of
the eight files `style.css` was split into (ROADMAP.md Priority 0 item 2), so
every later file's `var()` calls have it loaded before they need it.

### Spacing — `--space-1` … `--space-9`

```
--space-1: 0.25rem    --space-4: 0.6rem     --space-7: 1.25rem
--space-2: 0.4rem     --space-5: 0.8rem     --space-8: 1.5rem
--space-3: 0.5rem     --space-6: 1rem       --space-9: 2rem
```

Use for every `margin`, `padding`, `gap`, `row-gap` and `column-gap`.

Every step is wrapped in `calc(… * var(--density))`, so the density setting
(Settings → Appearance: compact / comfortable / spacious) tightens or loosens
the **whole interface** with one multiplier. It used to be nine rules in two
places, each re-stating literal paddings for the four components somebody
remembered — `.card`, `.layout`, `.dash-hero`, `.entry-list li` — so "compact"
tightened those four and left every dialog, chip row, toolbar and settings pane
at comfortable. **A density rule that names a component is that regression
coming back**, and the lint says so.

The scale was **extracted, not invented** — the nine steps are the modes of the
distribution that was already in the file, which is why adopting it moved 311
values by no more than 0.1rem each. It is deliberately denser at the small end,
because that is where interface spacing actually lives.

### Type — `--text-xs` … `--text-display`

```
--text-xs:      0.7rem    badges, counters
--text-sm:      0.75rem   dense metadata, small caps labels
--text-base:    0.8rem    secondary UI text
--text-md:      0.85rem   the workhorse — chips, list rows, controls
--text-lg:      0.92rem   form labels, settings copy
--text-body:    1rem      prose, card titles
--text-h3:      1.15rem   panel headings
--text-h2:      1.3rem
--text-h1:      1.7rem
--text-display: 2.2rem
```

Sizes above `--text-display` exist for three single hero elements and are
allow-listed individually in the lint. **A display size is a one-off, not a step
other components may reach for** — if a fourth thing wants 2.4rem, that is a
sign it should be using `--text-display` instead.

### Corners — derived from the user's setting

```
--radius-sm:   calc(var(--radius) * 0.3)   chips, inputs, small controls
--radius-md:   calc(var(--radius) * 0.6)   buttons, inner panels
--radius-lg:   calc(var(--radius) * 0.8)   cards, dialogs
--radius-pill: 999px                       pills, round buttons
```

`--radius` is a **user preference** (Settings → Appearance, 2–16px across the
built-in themes). Before this, ~90 declarations used literal pixels, so choosing
square corners squared the cards and left every chip, popup and button rounded.
Deriving the tiers makes the whole interface respond to one setting, which is a
behaviour fix as much as a consistency one.

The multipliers are chosen so each tier lands within a pixel of the value it
replaced at the default 14px. **Never pin a tier to a constant** — the lint
checks for this, because doing so silently disconnects the slider again.

### The page shell — `--page-gutter`, `--page-top`, `--page-bottom`

```
--page-gutter: var(--space-9)   /* 2rem */
--page-top:    var(--space-6)
--page-bottom: var(--space-9)
```

Applied once, by `.tab-page`. Seven tabs previously drew four different
gutters: the side inset was 2rem in five separate rules, but the space above
the first element was 1rem on Notes and Chat, 0 on Documents, and 0.8rem on
the Dashboard, Reminders and Graph — **each on top of `.tab-page`'s own
0.8rem**, so content began 1.8rem down one tab and 0.8rem down the next.

> **The rule:** a page's own container sets its internal `gap` and nothing
> else. The distance from the window belongs to the shell.

The narrow-screen tightening happens once, in a single media query on `:root`.
Per-page media queries shrinking to different numbers is how the desktop drift
got faithfully reproduced on mobile.

### Colour

The palette is already tokenised and theme-aware — every one of these has a
light and a dark value, and the lint enforces that:

```
--ink   --muted   --border   --card   --accent   --accent-soft   --chip-bg
--ok / --ok-soft      --warn / --warn-soft      --error / --error-soft
```

**Never write `var(--token, #fallback)` for a colour.** That pattern looks like
a safety net and is the opposite of one:

- If the token *doesn't* exist, the fallback is what renders — silently, in
  both themes. `var(--danger, #e2534b)` appeared in six rules and `--danger` was
  declared nowhere, so all six ignored dark mode entirely while looking
  perfectly correct in the stylesheet. The theme-aware `--error` had existed
  the whole time and is a different red in dark mode.
- If the token *does* exist, the fallback is dead code that would let a rename
  keep working while quietly showing the wrong colour.

`var(--text-muted, inherit)` was the same bug, quieter: the token was never
declared, so the text simply inherited and was never muted at all.

Fallbacks are allowed for font stacks and numeric defaults (`--mono`,
`--ui-font`, `--bg-art-opacity`) and for two tokens that legitimately fall back
to another token. Everything else is caught.

Literal colours are still correct in exactly one place: the sketch palette,
where the hex value *is* the data, and the accent presets, which are
definitions.

### Elevation — `--shadow-sm`, `--shadow-md`, `--shadow-lg`

```
--shadow-sm   resting cards, list-row hover, message bubbles
--shadow-md   floating panels, dropdowns, active/lifted tabs (= --glass-shadow)
--shadow-lg   a dragged card, a dialog's own depth — the "off the surface" tier
```

Added by the apple-design audit (ROADMAP §35L) after finding twelve
hand-written `box-shadow` values — six-plus different blur radii, opacities
from 0.05 to 0.5, one tinted family (`rgba(31, 38, 135, …)`, matching
`--glass-shadow`) and one flat-black family living side by side. Most of the
flat-black ones never adapted in dark mode the way `--glass-shadow` already
did, because they weren't built from it. All three tiers are dark-mode-aware
(`--shadow-sm`/`--shadow-lg` scale off `--shadow-intensity`, the same knob
Settings → Appearance already drives; `--shadow-md` is `--glass-shadow`,
already themed). Two literal shadows remain on purpose: the lightbox image's
(its backdrop is always near-black regardless of theme, so a themed shadow
would be wrong there) and the accent-glow on the CTA button family, which
carries the user's chosen accent colour via `color-mix()` rather than the
neutral elevation scale — a coloured glow, not a depth cue.

### Motion — `--motion-fast`, `--motion-base`, `--motion-slow`

```
--motion-fast: 0.12s   hover/press feedback, checkbox/toggle state
--motion-base: 0.16s   the default: colour, background, border, opacity
--motion-slow: 0.2s    a bigger move — panel/sidebar open, card lift
```

Same extraction method as the spacing/type scales: ten distinct transition
durations in the wild (0.08s-0.25s, one written as `120ms`) collapsed to the
three that were actually the modes of that distribution. Applied to every
`transition:` duration in `frontend/css/*.css`; `animation:` keyframe timings
(entrance/exit effects tuned to their own motion, not interactive feedback)
were deliberately left alone rather than mechanically swept, since a
keyframe's duration is part of what makes that specific effect read right,
not a value drifting for no reason.

**Not done, said plainly:** motion is a user setting (`prefers-reduced-motion`)
that only some components still honour, each with its own `@media` block —
see "What is not done yet" below. There is no gesture-driven motion anywhere
in the app yet (drag/resize move the DOM directly; nothing hands off release
velocity into a spring), so nothing here contradicts the apple-design skill's
"avoid fixed-duration transitions for anything gesture-driven" — that rule
doesn't apply until something *is* gesture-driven.

---

## Hierarchy

Levels must be **visibly ordered**, and they were not: `h2` ranged 0.92–1.15rem
depending on where it sat while `h3` was a flat 0.92rem, so in the sidebar a
section title was the same size as the subsections beneath it.

| Level | Size | Treatment |
| --- | --- | --- |
| `.card h2` | `--text-body` | weight 650, tight tracking |
| `.card h3` | `--text-sm` | weight 600, muted, uppercase, loose tracking |
| `.dash-getting-started h2` | `--text-h3` | titles a whole panel, not a card |

Note that `h3` is **smaller** than `h2`, not one step down from it. Small caps
carry the distinction, which frees the size to drop — two sizes 0.08rem apart
cannot signal a level change on their own, and trying to make them was what
made the old hierarchy invisible.

**Use weight, colour and case before reaching for another size step.** The type
scale has ten steps because an interface needs ten *sizes*, not ten *levels*.

---

## Adding a feature

1. **Reach for a token first.** If you are typing a rem value into a `margin`,
   `padding`, `gap`, `font-size` or `border-radius`, stop — there is almost
   certainly a step for it.
2. **A page goes in `.tab-page`** and sets only its internal `gap`.
3. **A panel is a `.card`.** It brings its own padding, radius and shadow. Do
   not re-specify them.
4. **A group of choices is `.check-row`**, not bare labels — each option gets a
   hit area, a hover and a selected state, so the group is scannable without
   hunting for a filled dot.
5. **Confirming something destructive is `confirmDialog(...)`**, never
   `window.confirm` — the desktop shell does not reliably implement it, and a
   button gated behind one that returns `undefined` silently does nothing.
6. **Run the lint.** `pytest tests/test_style_scale.py`.

### When a token genuinely doesn't fit

Add the value to the relevant `ALLOWED` set in `tests/test_style_scale.py`
**with the reason**. There are three entries there today — two indent steps for
the document outline, which must stay evenly spaced relative to each other
rather than land on a scale built for gaps between unrelated things, and a
negative pull-back that cancels a list's own indent exactly.

Being made to write the reason is the entire mechanism. An entry with a vague
reason is a value that should have been snapped to the scale.

---

## Why the lint matters more than the conversion

The conversion is a one-off. Without something that fails, the next tab built
in the next session reaches for whatever looks right at the time, and the drift
starts again — which is exactly how it got here, over six tabs and as many
sessions.

`tests/test_style_scale.py` checks:

- every spacing value is on the scale;
- every font size is on the scale;
- no corner radius is hard-coded in pixels;
- the corner tiers stay expressed in terms of `--radius`;
- no page container draws its own outer gutter;
- the page shell is declared once and used;
- no colour token is used with a fallback;
- every semantic colour has a dark-mode value.

It strips CSS comments before scanning, because the comments in this file
explain layout decisions and therefore quote lengths — `test_frontend_ids.py`
had to learn the same lesson about markup comments quoting ids.

---

## Control height

One more thing has to match for a row of controls to read as a strip rather
than as a pile: **their height.** The chat dock declares `--control-h` and
every select, button and segmented control in it is that tall.

It is deliberately *not* a spacing token. A hit target is a control's own size
— the role `--radius` plays for corners — and snapping it to a gap step would
make it move with the density setting, which is not what density is for.

The failure it prevents is the one this whole document is about: the segmented
control brought its own padding and stood four pixels taller than the selects
beside it. Nothing lines up, no edge agrees with another, and the row reads as
assembled rather than designed — the "slop features joined together" complaint
in miniature, at four pixels.

### And zero the margins, not just the heights

Reported after the first attempt, which had matched the heights and looked
fine in the stylesheet: *"some are higher or lower than each other and
different heights."*

**A margin on a flex item is centred with the item.** `.seg` carries
`margin-bottom: 0.5rem` from the stacked forms it was built for, and under
`align-items: center` those 8px do not become a gap — they sit the control 4px
*above* its neighbours and make its group 8px taller, which pushes the next
group 4px down in turn. Two visible offsets, from one declaration in a rule
three thousand lines away.

> **The rule:** a row of controls neutralises the outside spacing its controls
> arrive with (`margin: 0`), and the row's own `gap` is the only thing between
> them. Anything else means every control added later has to be checked
> against every base rule that might have given it a margin.

The same applies to a control's own vertical padding: keep it horizontally,
give it up vertically, and let the declared height decide.

Where a row's box grows — a chat composer with an autogrowing textarea — align
to `end` rather than `center`, so the buttons stay level with the line the
caret is on instead of drifting up the side of it.

---

## What is not done yet

Recorded honestly, because this document should not read as further along than
it is. See ROADMAP §35L.

- **Most of this has still not been checked in a browser** — but it now *can*
  be, and the parts that were are marked as such. Chromium and Playwright are
  in the sandbox and the app runs on localhost (CLAUDE.md has the recipe). The
  chat header and dock were measured and screenshotted in both themes; the tab
  bar was measured at five widths. Everything else here was reasoned from the
  stylesheet and bounded so no single value moved more than 0.1rem — which is
  not the same as verified. **Look at what you change; it costs a minute.**
- **Motion** is a user setting a few components still ignore. Density is done —
  it is a multiplier over the spacing scale now. Duration is done as of this
  pass (the `--motion-*` scale above); *honouring* `prefers-reduced-motion`
  everywhere is not — still per-component `@media` blocks, not a single rule.
- **The tab bar** is at the width where another tab hurts, which matters for
  the unbuilt Library tab (§4) — decide whether it absorbs existing tabs or the
  bar gains an overflow *before* building it.
- **The timeline's line/branch view needs more than this pass gave it** —
  screenshotted live (9 seeded notes, populated, not empty): the SVG canvas
  reserves a fixed height regardless of content, so a normal note count
  leaves most of the card blank below the spine; the active band has no
  visible label painted on the canvas itself (only in the "N notes · N
  bands" line above it); and notes sharing a bucket stack vertically with no
  jitter or connecting structure, which reads as a pile, not a branch. None
  of this is a token or colour problem — it's `renderTimelineBranch`'s own
  layout math (`app.js`, §10C) sizing the canvas and placing dots without
  regard to how much content is actually in it. A real fix is a layout
  change, not a CSS pass, and risked being a half-implementation attempted
  under this pass's own budget — scoped here instead of guessed at. See
  ROADMAP item 10.
- **The document editor was screenshotted live and looks fine** — title
  field, outline, word count, toolbar, AI edit/extract-notes actions all
  present and visually consistent with the rest of the app. Its real gap is
  the one BACKLOG.md §5 already names (wiki-links, a slash menu,
  live-preview editing, sub-pages) — a feature/product question, not a
  design one, and correctly out of this pass's scope.
