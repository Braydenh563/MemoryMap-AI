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
same size, next to each other, is exactly what reads as unconsidered, nothing
lines up, and no value means anything because every one is slightly its own.

---

## The tokens

All defined in `:root` in `frontend/css/00-tokens-shell.css`: the first of
the eight files `style.css` was split into (ROADMAP.md Priority 0 item 2), so
every later file's `var()` calls have it loaded before they need it.

### Spacing: `--space-1` … `--space-9`

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
remembered, `.card`, `.layout`, `.dash-hero`, `.entry-list li`: so "compact"
tightened those four and left every dialog, chip row, toolbar and settings pane
at comfortable. **A density rule that names a component is that regression
coming back**, and the lint says so.

The scale was **extracted, not invented**: the nine steps are the modes of the
distribution that was already in the file, which is why adopting it moved 311
values by no more than 0.1rem each. It is deliberately denser at the small end,
because that is where interface spacing actually lives.

### Type: `--text-xs` … `--text-display`

```
--text-xs:      0.7rem    badges, counters
--text-sm:      0.75rem   dense metadata, small caps labels
--text-base:    0.8rem    secondary UI text
--text-md:      0.85rem   the workhorse, chips, list rows, controls
--text-lg:      0.92rem   form labels, settings copy
--text-body:    1rem      prose, card titles
--text-h3:      1.15rem   panel headings
--text-h2:      1.3rem
--text-h1:      1.5rem   (was 1.7rem; INBOX 446 (5))
--text-display: 2.2rem
```

**The interface's own size is `--text-lg`** (INBOX 446 (5)): `body` sets
it, so anything without a size of its own (a tab label, an empty state, a
sidebar row, inherited prose) draws at 14.7px, not the browser's 16px
default. A note's preview in the list is `--text-lg` too. `--text-body`
stays for a document's prose and a card title, which say so explicitly.

Sizes above `--text-display` exist for three single hero elements and are
allow-listed individually in the lint. **A display size is a one-off, not a step
other components may reach for**: if a fourth thing wants 2.4rem, that is a
sign it should be using `--text-display` instead.

### Corners: derived from the user's setting

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
replaced at the default 14px. **Never pin a tier to a constant**: the lint
checks for this, because doing so silently disconnects the slider again.

### The page shell: `--page-gutter`, `--page-top`, `--page-bottom`

```
--page-gutter: clamp(var(--space-3), 1.2vw, var(--space-6))   /* 16px at 1440 */
--page-top:    var(--page-gutter)
--page-bottom: var(--page-gutter)
```

All four edges are one number (INBOX 425: "there is a lot of space lost
because of these margins and floating panels"); the gutter was 2rem a side
and 2rem at the bottom before that.

Applied once, by `.tab-page`. Seven tabs previously drew four different
gutters: the side inset was 2rem in five separate rules, but the space above
the first element was 1rem on Notes and Chat, 0 on Documents, and 0.8rem on
the Dashboard, Reminders and Graph, **each on top of `.tab-page`'s own
0.8rem**, so content began 1.8rem down one tab and 0.8rem down the next.

> **The rule:** a page's own container sets its internal `gap` and nothing
> else. The distance from the window belongs to the shell.

The narrow-screen tightening happens once, in a single media query on `:root`.
Per-page media queries shrinking to different numbers is how the desktop drift
got faithfully reproduced on mobile.

### Colour

The palette is already tokenised and theme-aware, every one of these has a
light and a dark value, and the lint enforces that:

```
--ink   --muted   --border   --card   --accent   --accent-soft   --chip-bg
--accent-text
--ok / --ok-soft      --warn / --warn-soft      --error / --error-soft
```

**Words in the accent are `--accent-text`, never `--accent`** (0.3.3). The
accent is picked as a fill, and a fill colour fails as text: measured over
every palette, accent and mode, the raw accent was under 4.5:1 as a word on
228 of 348 combinations (rose on paper, 3.35:1 for a link). `--accent-text`
is the accent pulled to a readable lightness in each mode (`oklch(from ...)`
in `00-tokens-shell.css`, the accent itself where the browser lacks relative
colour), lowest 4.71:1. Links, an accent label, a count in the accent: the
token. Borders, rings, fills and `accent-color`: the accent itself.
`tests/test_accent_text.py` fails on a `color:` that reaches the raw accent,
in a stylesheet or in a CodeMirror theme object.

**Never write `var(--token, #fallback)` for a colour.** That pattern looks like
a safety net and is the opposite of one:

- If the token *doesn't* exist, the fallback is what renders, silently, in
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

### Elevation: `--shadow-sm`, `--shadow-md`, `--shadow-lg`

```
--shadow-sm   resting cards, list-row hover, message bubbles
--shadow-md   floating panels, dropdowns, active/lifted tabs (= --glass-shadow)
--shadow-lg   a dragged card, a dialog's own depth, the "off the surface" tier
```

Added by the apple-design audit (ROADMAP §35L) after finding twelve
hand-written `box-shadow` values, six-plus different blur radii, opacities
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
neutral elevation scale, a coloured glow, not a depth cue.

### Motion: `--motion-fast`, `--motion-base`, `--motion-slow`

```
--motion-fast: 0.12s   hover/press feedback, checkbox/toggle state
--motion-base: 0.16s   the default: colour, background, border, opacity
--motion-slow: 0.2s    a bigger move, panel/sidebar open, card lift
```

Same extraction method as the spacing/type scales: ten distinct transition
durations in the wild (0.08s-0.25s, one written as `120ms`) collapsed to the
three that were actually the modes of that distribution. Applied to every
`transition:` duration in `frontend/css/*.css`; `animation:` keyframe timings
(entrance/exit effects tuned to their own motion, not interactive feedback)
were deliberately left alone rather than mechanically swept, since a
keyframe's duration is part of what makes that specific effect read right,
not a value drifting for no reason.

**The curves, and the rule that holds all of this (INBOX 399 (4)).** Three
curves beside the three durations: `--ease-out` (`cubic-bezier(0.2, 0.8, 0.2,
1)`, the default: a control that answers the pointer arrives at once and
settles), `--ease-in-out` (a thing that travels between two resting places)
and `--ease-spring` (one overshoot, for a knob or a pop, never a surface; the
switches' knob uses it). Every `transition` names a duration token and a curve
token, or `linear`; never `transition: all`; an item with no curve runs on
`ease` and fails the lint too. `tests/test_motion_tokens.py`. Measured before:
125 transitions on `ease`, eleven raw durations, four hand-written curves.

**A hover is a colour, never a `filter`** (INBOX 405). `button:hover` was
`filter: brightness(1.07)` on every button: too small to read as a state, and a
compositing layer per hover that re-rasterised the text (the chat's "Jump to
latest" pill flickered in the desktop window). A solid button goes one step
deeper, `--accent-surface-hover`, through `--button-ground` so only buttons
that kept the solid ground receive it; any other ground takes `--hover-veil` as
a `background-image` or a background. `scratchpad/ui-sweeps/f2-hover.js` forces
`:hover` on every drawn button of every tab and lists those that change
nothing: 101 of 571 with the filter gone, 0 after (the selected segment and
tab excepted, which need none).

**Not done, said plainly:** motion is a user setting (`prefers-reduced-motion`)
that only some components still honour, each with its own `@media` block,
see "What is not done yet" below. There is no gesture-driven motion anywhere
in the app yet (drag/resize move the DOM directly; nothing hands off release
velocity into a spring), so nothing here contradicts the apple-design skill's
"avoid fixed-duration transitions for anything gesture-driven", that rule
doesn't apply until something *is* gesture-driven.

**What moves, and what never does (INBOX 459 (2)).** The owner asked for
"cheap css animations to things like the horizontal pill selectors and
sidebars ... but dont over do it". Motion here says one thing: *this is the
same thing, somewhere else now*. So a selection travels, a panel arrives from
the edge it lives on, and nothing moves to decorate.

- **A selection that moves between options** glides: one indicator per strip
  (the strip's `::before`, CSS-anchored to its `.active` option) travels
  `--motion-slow` on `--ease-in-out`, and the label's colour changes on the
  same clock so white text never sits on an empty well. Every `.seg` (not
  `.seg-multi`, whose options are independent), the Notes and Library
  sub-tabs and the Settings nav. **The top bar's tabs are the one measured
  indicator** (the owner, 2026-10-04, asking again for "a slight css sliding
  animation ... cheap but looks professional"): `.tab-glide`
  (`tabGlideInit`, shell-reminders.js) takes the active tab's box at once and
  moves by a `transform` animation from where it was drawn, so every engine
  glides (the anchored recipe needs `anchor-scope`) and a frame lays out
  nothing; `scratchpad/ui-sweeps/tabglide.js`: transform only, lands to 0px,
  one layout a click over reduced motion's, none under reduced motion. Measured
  (`scratchpad/ui-sweeps/glide.js`, 8 clicks a strip at 1440): 200ms on
  every click, lands on the option to 0.0px, 10 to 12 extra layouts a click
  over a control with the transition off, 0.3 to 0.6ms each (moving
  `.active` by hand on the Notes view toggle: 15 layouts and 4.2 to 6.2ms
  against 2 and 0.6ms without the transition).
- **A sidebar folding to its rail** sets its column at once, as before; its
  contents leave toward the rail (`--motion-fast`) and arrive from it
  (`--motion-slow`) by `opacity` and `transform`, the hover-peek the same way
  after its wait, and the rail's sideways name fades in as they go. Focus
  mode's two side panels come in from their window edge (`@starting-style`,
  `opacity` and `translate`); closing is instant. Measured
  (`scratchpad/ui-sweeps/sidemotion.js`): opacity and transform only, and no
  layouts the control does not have (14 against 14 on Notes, 2 against 1 on
  Chat, per fold).
- **A page arriving** (a tab switch) fades in over `--motion-fast` by
  `opacity` alone; the page leaving does not fade, so two pages are never on
  screen at once. Measured: 120ms on every switch, no layouts of its own; 20
  switches by real clicks, 305 to 321 layouts with the whole pass against 140
  with it off (the glide's share), frame p95 33 to 50ms either way in this
  sandbox, which is its CPU, not the pass. With glass on, a glass pixel
  converges smoothly through the fade and ends where it rests (slowed 20x:
  242 to 249, no step at the end; background art off).
- **Already there, kept:** a menu opens out of its opener's corner by a
  `clip-path` circle (10-responsive.css: a transform would be measured into
  its placement), a help popover drops 4px in, a toast leaves the way it
  came. **Not added:** a row fading in or out of a list. The lists re-render
  whole on a filter keystroke, so CSS cannot tell a new row from a redrawn
  one, and every row fading on every keystroke is the decoration this
  section rules out.
- **Never:** a width, height, margin or padding in motion; a page's own
  scroll; anything on first paint (a transition needs a before, and a strip
  or panel drawn for the first time has none); a loop.
- **Reduced motion**, the system's or Appearance's: every one of these is
  instant (the two blankets in 02-chat-graph.css zero every transition,
  pseudo-elements included; `glide.js` REDUCED=1 and APPEARANCE=1 measure
  the indicator landing on the first frame).

The recipe row is "Motion" in the index below; `tests/test_motion_recipes.py`
holds it.

---

## Glass & materials

Every floating or resting surface in the app commits to one of two opacity
tiers, this was itself the subject of a full audit (a user-supplied
checklist's Part B) that found and fixed real drift, so the rule below is
enforced, not aspirational.

```
--card          55% opaque: a page surface, meant to be seen *through*
--modal-bg      96-98% opaque: floats over arbitrary content, must stay legible
--glass-blur    18px: the one blur radius; do not hand-pick a px value
--glass-shadow  the one popup/floating shadow (= --shadow-md)
--glass-border  the one glass-surface border colour
```

**The rule:** anything that floats *over* other content, a popup, a
dropdown menu, a folded-away options panel, a toolbar strip drawn on top of
a canvas, declares all four together: `background: var(--modal-bg)`,
`backdrop-filter: blur(var(--glass-blur)) saturate(150%)` (+ `-webkit-`
mirror), `box-shadow: var(--glass-shadow)`, `border: 1px solid
var(--glass-border)`. A page-level surface that content scrolls *inside*,
a card, a sidebar, uses `--card` instead. Mixing the two, or picking a
one-off blur radius or shadow, is the bug this section exists to prevent:
found live in `.whiteboard-floating-panel`, `.graph-trace`/`.graph-options`,
and `.timeline-band` (three different blur radii, 8px, 12px, and the
18px token, across three tabs was the most visible version of the
problem), all fixed by conforming to the rule above rather than by
inventing a third option.

### Surface tiers, and the border budget

Measured before this existed, on Settings → Tools it can use: the modal drew
a hairline, the group inside it drew a hairline, and all 54 rows inside the
group drew one more, three nested boxes, each saying "this is a thing" with
the same 1px line, so none of them said anything. Skills, Personas, Templates
and the Notes list had the same shape at two deep.

```
--surface-1  the pane: .card, .modal-card, a popover. Glass, and the only
             tier that may carry a hairline or a rim.
--surface-2  a group inside a pane (.settings-group, .entry-list li). A faint
             ink tint, no border.
--surface-3  a row inside a group, or a hover (.provider-option, a list
             inside a settings group). One step deeper.
--divider    the line *between* rows in a list (.setting-row, .extras-row).
             Lighter than --border: a separator, not an edge.
```

**The rule:** a line on the outermost surface only; everything inside it is
grouped by tone and whitespace. Inner rows keep a `1px solid transparent`
border so their geometry does not move and so `[data-contrast="on"]` can
colour the line back in (`02-chat-graph.css`). A selected row is a fill
(`--accent-soft`), never a fill plus an accent edge, the edge was the
innermost of the three lines above. `--surface-2` is tinted with ink rather
than white on purpose: a white tint (`--inner`) is invisible on the
near-white modal, which is where most groups live.

A sticky row inside a tinted group (`.tool-filter-row`) has to composite the
tint over the opaque modal colour, not paint the modal colour alone,
otherwise it shows as a lighter slab inside the group.

### Where the blur is allowed to be

Measured at 1366x768 (`scratchpad/ui-sweeps/weight.js`, INBOX 49): with
every `.card` blurred, the blurred area at rest was 32% of the viewport on
the dashboard and over 80% on the notes, chat and graph tabs, a full-screen
filter pass per scroll on an integrated GPU, and all it blurred was the
page art, which is already a soft gradient. So a content panel (`.card`,
`.dash-hero`, `.sidebar-panel`, the status bar) keeps the fill, the border
and the rim and has **no `backdrop-filter`**. Blur belongs where something
scrolls under a surface or where the surface floats over content: the top
bar, the sticky sub-tab strips, `.card.glass`, the dialogs, popovers,
docks, the graph's zoom pill, `.scroll-top`. With the animated background
on, the cards frost it again (`:root[data-bg-art="on"] .card`): that is
the one place a card blur shows something, and the owner asked for it. The gate, kept by
`tests/test_perf_mode.py` and the sweep: under 10% of the viewport blurred
at rest on every tab (measured 6 to 10% after). **A dialog the size of the
window whose own pane scrolls blurs nothing** (Settings): a blur is redrawn
on every frame anything inside its surface moves, and Settings' overlay and
card were two window-sized passes, 83 to 100ms a scrolled frame with glass
on against 16.7 without (`scratchpad/ui-sweeps/scrolljump.js`); the overlay
keeps its dim and the card takes `--modal-bg-opaque`.

**Performance mode** (Settings, Effects & accessibility; the `perf`
preference, `auto | on | off`) takes the rest off: `data-glass="off"`,
`data-motion="reduced"` and the graph worker resting twice as long between
ticks, without rewriting the person's own glass and motion choices. "Auto"
turns it on for a machine reporting 2 cores or 4 GB or fewer, or an OS
`prefers-reduced-transparency` setting, and says so once in a toast.
`theme-boot.js` resolves the same rule before first paint.

### Turning it off

`:root[data-glass="off"]` is a standing user preference (Settings →
Appearance), not a special case to special-case around. It swaps `--card`
to `--modal-bg`'s opaque value and zeroes `backdrop-filter` on an explicit
selector list, currently 35+ selectors covering every popup, toolbar and
floating panel named above. **Adding a new glass surface means adding it to
that list too**: a panel missing from it stays glassy even with the
setting switched off, which is how three of the Part B violations were
found (the fix and the fallback drifted independently because they lived in
different rules).

### Palettes

Eight curated palettes, each with an explicit light and dark pair,
`:root[data-palette="X"]` / `:root[data-palette="X"][data-mode="dark"]`:
**Aurora** (default, no attribute needed), **Parchment**, **Sage**,
**Ocean**, **Lagoon**, **Ember**, **Plum**, **Carbon**. Carbon is the
"quiet, non-glassy" option some users want, it does not override
`--glass-opacity`/`--glass-blur` itself (it is still built from the same
glass system as the other seven), so reaching that quiet, flat look is
**Carbon palette + the Glass-off toggle together**, not a hard-coded
exception baked into one palette. Composing two orthogonal settings this
way is deliberate: a palette-specific override would be a second, competing
mechanism for the same effect the toggle already provides everywhere else.

---

## The recipe index: use these, nothing else

The owner, after a run of "the menu is crushed", "the panel clips", "the
buttons feel separate": every one of those came from a surface built by
hand instead of from the recipe the rest of the app uses. A new piece of
UI starts here. If the need is not in this table, the recipe is added to
this table and its lint in the same commit as the feature, never after.

| You need | Use | Guarded by |
| --- | --- | --- |
| A dialog of choices that each make something (a template, a starting shape) | the choices as quiet rows (`button.ghost.doc-template-choice`, `role="radio"` in a `role="radiogroup"` list: name over a one-line hint) in a `.doc-template-body` grid beside a preview column that shows **what the chosen row would create**, rendered by the same function that creates it (`showDocTemplatePreview` through `docTemplateFill` and `renderMarkdown`), inert and `aria-hidden` because every row already says what it is; the preview is clipped with a fade, never a second scroller, and left out below 44rem. **Choosing is not making** (INBOX 410): a click chooses a row, drawn from `aria-checked` on `--accent-soft` with the name in `--accent` and a check glyph (never the fill alone; the pointer's row is the ghost tint), and only the dialog's one filled button (Use this template, after Cancel), Enter on the list or a double click makes it; the arrows walk the rows with a roving tab stop, the first row is chosen on open so one Enter still works, and the preview follows the choice rather than the pointer. The Capture box's note templates are the same dialog (`#note-template-dialog`, `openNoteTemplateDialog` in app.js), its preview the text `noteTemplateFill` would write | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/doctplpreview.js`, `scratchpad/ui-sweeps/templatepick.js`, `tests/test_note_template_picker.py`, `scratchpad/ui-sweeps/notetemplatepick.js` |
| A row elsewhere that names a control (Tools and features, the palette, Find anything's actions, a deep link) | the row declares `tab`, `reveal` or `act`, never a closure; a `reveal` names one entry in `REVEAL_TARGETS` (settings-panes.js), which `revealFeature` opens (tab, lazy bundle, the menu, panel or dialog the control is in) and rings with `flashRevealed` (`.feature-reveal`, the same ring as `.flash-target.flash`); a feature the notebook cannot show yet rings the control that makes one (`fallback`), never nothing | `tests/test_catalogue_reveal.py`, `scratchpad/ui-sweeps/deeplinks.js` |
| A second-level tab strip (Notes: Your notes, Capture, Write with Atlas, Ask; Library: All to Contents; the document sidebar's Documents and Outline; INBOX 522) | `.tabs-line` on a `role="tablist"` (never `.seg`, never in a card): words on the page, a hairline under the strip (an inset shadow, so a scrolling strip clips it with its own padding box), a 2px `--accent-text` line under the chosen tab (`::after`, a `transform`, so no weight change and no neighbour moves), quiet hover (`--hover-veil` and ink), one height `max(--control-h-body, --target-min)`, one `--space-1` gap, one `--space-5` padding, **no icons** (aria carries the meaning; the strips were icon on Notes and bare on Library). A sticky strip is bare at rest and takes the card's glass only under `[data-scrolled="1"]`. **The top bar keeps its pills and `.tab-glide`**: the frame is a well, the level under it is text, so two levels never read as one. The top bar's well hugs its tabs in every layout (`#tab-bar` never has a flex grow; centring is auto margins) | `tests/test_ui_recipes.py` (`test_every_second_level_strip_is_a_tabs_line`, `test_a_tabs_line_is_never_boxed_again`, `test_the_top_bar_well_never_grows_to_fill_the_gap`), `scratchpad/ui-sweeps/subtabs.js`, `subtabs2.js`, `tabstretch2.js` |
| A connection with the sentence it is said in (a document's Backlinks and Unlinked mentions; a note's Connections column and sheet, GRAPH_PLAN KG1) | `docBacklinkContext(row)` (menus.js): the server's `context` with `hit_start` and `hit_end` marked by a `<mark>` on the found-text recipe, two lines then an ellipsis (`.doc-backlink-context`), under its `.connection-row` or `.doc-backlink-title`; an action goes under it in `.doc-backlink-foot` as a `smallButton` (`.doc-backlink-action`); a write sends the offsets to the server, which refuses a span that moved (409) rather than guessing | `tests/test_note_backlinks_kg1.py`, `tests/test_doc_backlinks.py`, `scratchpad/ui-sweeps/kg1rail.js`, `docbacklinks.js` |
| Suggestions a person decides one by one (links to add, tensions, names to merge, link types: GRAPH_PLAN KG9) | **One sheet, never a panel per kind**: `openSuggestionsInbox(kind)` (suggestions-inbox.js, lazy) on `openSheet` with the dialog head and its '?', a `.seg` of the kinds on one row at every width, each tab carrying its count as quiet text (`.inbox-count`), arrows walking the tabs; under it one line of description and the kind's rows (`.inbox-row`: a title, the sentence via `docBacklinkContext` when there is one, the reasons each with its percentage (`.link-suggestion-why`), then a foot of a confidence chip, the one accept as a `smallButton` and a dismiss X). A decided row leaves, the count drops and the focus moves to the next row; an accept or a dismissal is a correction (`/learned/corrections` or the kind's own route), never browser state. A new kind of suggestion is a tab here. **A thing's own page** (an entity, `openEntityPage` in entity-page.js) is the same sheet: the name as the title, its facts as the `sub` line, a `kebabMenu` of its edits before the close, then `.entity-section`s under quiet headings, mentions as `.inbox-row`s with the sentence marked | `tests/test_suggestions_inbox_kg9.py`, `tests/test_entities_kg5.py`, `scratchpad/ui-sweeps/kg9inbox.js`, `kg5entity.js` |
| A card about a group drawn on a canvas (a graph topic, KG6) | a panel in the graph overlay's column on its shared shell (`.graph-overlay .graph-topic` beside `.graph-trace-result`, the glass rule in 08-consistency.css), right-aligned at `min(24rem, 100%)`: a head of a colour dot, the name, a quiet count and an icon X; one muted line of facts; the answer with `aria-live`; a model step behind its own `smallButton` with a Stop while it runs (an `AbortController`), never on open. Opened from the group's legend entry, closed by the X or by leaving the mode that drew it | `tests/test_topic_summary_kg6.py`, `scratchpad/ui-sweeps/kg6summary.js` |
| A named region on the graph canvas (a topic, GRAPH_PLAN KG6) | `gcDrawTopicHulls` (graph-canvas.js): a convex hull of the region's dots padded by radius plus 10, dashed 1.5px at 0.45 and filled at 0.06 in the region's colour, under the links; its name in `--ink` on a `--card` plate at 0.88 edged in the colour (never the colour as text: a light hue is under 3:1), above the hull's top point and clamped to its width; full tab only, behind a colour rule rather than a switch | `tests/test_topics_kg6.py`, `scratchpad/ui-sweeps/kg6topics.js` |
| A short list you check, put in order and save once (Quick access's manager, `quickAccessManage` in quick-access.js; INBOX 524) | The Attach picker's rows (`note-picker-row`, `note-picker-check`, the real checkbox visually hidden) in two groups inside one `space-dialog`: **what is on is checked and first, in its order**, the rest below, a count in each heading. A tick changes a draft; **nothing is saved until Done** (Cancel, X, Escape and the backdrop keep what was there), and a cap refuses with a message rather than a disabled row. The search narrows both groups and stays. Order by **drag, Alt+Up and Alt+Down on a row, and two small move buttons** (the single-pointer alternative to a drag, WCAG 2.5.7; always shown under `(hover: none)`); the list is one tab stop that the arrows walk and Enter is Done. The pure helpers (`quickAccessMoved`, `quickAccessReslotted`) are tested in node | `tests/test_quick_access.py`, `scratchpad/ui-sweeps/quickmanage.js`, `quickdrag.js` |
| A tab or sub-tab's control bar | `.dock` with `.dock-identity`, `.dock-group`, `.dock-actions`; seven controls at most, one filled | `tests/test_dock_grammar.py`, `scratchpad/ui-sweeps/docks.js` |
| A palette of many tools (a drawing bar, where every control is a tool rather than one of seven choices) | `.wb-tool-section` around one `.wb-tool-section-label` and one `.wb-tool-section-row`, all of them in one bar; the group boundary is the hairline `.wb-tool-section + .wb-tool-section` draws in `--divider`, and nothing sits in the bar outside a section. Used by the whiteboard rail and the sketch pad's toolbar | `tests/test_ui_recipes.py` |
| Text typed in place on the board (a text box, a topic, a shape's text) | `wbBeginTextEdit(el)` makes the element a plain-text editor and focuses it, `wbEditedText(el)` reads it back with its line breaks, `wbEndTextEdit(el)` (or removing the element) ends it; Enter and Escape finish, Shift+Enter breaks the line, the editor's own keydown stops propagation so the board's keys never act on what is typed. A shape's text is an SVG `<text class="sketch-label">` in the shape's own group (`wbPaintShapeLabel`), typed through `.wb-shape-label-editor` in the card layer (WHITEBOARD_PLAN decision 12); a connector's label (`.wb-link-label`, decision 13) is typed through the same editor, `wbOpenSketchLabelEditor`, one line | `tests/test_ui_recipes.py` (`test_board_text_is_made_editable_in_one_place`), `scratchpad/ui-sweeps/wbshapetext.js` |
| A menu behind a button | `kebabMenu(items, ariaLabel)` in sheets-selects.js (positions, clamps, escapes clipping, closes on outside click) or `details.dock-menu` in markup. **Past five rows it is grouped**: an item carries `group`, a name, and the menu draws a hairline (`.menu-sep`, `role="separator"`) wherever that name changes. The name is not printed, because a heading over every three rows makes a ten-row menu seventeen rows tall and what makes a list scannable is the break rather than the word; an item with no `group` behaves exactly as before, so a short menu declares nothing. **An item with `items` is a submenu**: the row flies its own list out beside it (`buildMenuGroupButton`, menus.js: clamped to the window, escaped from a clipping ancestor, opened in place in the phone's sheet), for a choice of several settings behind one row (the companion's Companion, Atlas look, Size and Settings). **Below 600 it is an action sheet**: `openKebabSheet` moves the menu into the sheet recipe (rows full width at the thumb, groups and keyboard kept, a group row opening in place) and puts it back on close; the note row's own ⋯ (`entryOverflowMenu`) does the same, and a menu at the pointer stays at the pointer. **Every menu keeps the keys**: ↓ and ↑ on an open menu's button land on its first and last row, ↑ ↓ Home End walk the rows, Escape closes it and gives the focus back to its button, and a menu that closes with the focus inside it hands the focus back rather than dropping it on `body`. A built menu gets this from `wireMenuKeyboard` (options count as rows, and the menu owns its Escape); a `details` menu or a menu written in markup gets it from app.js's one delegated handler (`menuRowsOf`), so a new one needs no wiring of its own. **One left column**: a section label, a select in a section and a row's icon start on the row recipe's `--space-5`, and a row's leading icon is a 1.25em box so the labels after it line up | `tests/test_ui_recipes.py` (hand-built menus may not multiply; a long menu is grouped), `tests/test_menu_keyboard.py`, `scratchpad/ui-sweeps/menus.js` |
| A dock's one filled action that has a choice inside it (the Boards and maps dock's New: Whiteboard or Mind map) | A `details.doc-dock-menu.dock-menu.dock-menu-flip` in the actions zone whose `summary.small.dock-menu-primary` is the filled control (a plus, the word in a `.toolbar-word` span, a `.dock-menu-caret`; the summary's own `aria-label` is its name at a phone's width) and whose rows are `button.doc-dock-menu-item`s keeping the ids the standalone buttons had, so every caller that presses them still can. Each row is its icon, then a `.dock-menu-item-text` holding the word and under it one muted line saying what it makes (`.dock-menu-item-hint`, `--text-xs`, `--muted`): a tooltip is never seen on a touch screen. One menu instead of two create buttons: a dock holds one filled action, and a second kind of the same thing is a row, not a neighbour. Used by Boards and maps (WORLD_CLASS_PLAN 507) | `tests/test_dock_help_507.py`, `tests/test_dock_grammar.py` |
| A toolbar with more tools than one row holds (the formatting strips) | It wraps (the default), or, in its one-row mode and on a phone, it stays one row and **folds what does not fit** behind a More disclosure in the strip's own end group: `fitDocToolbarRow` (documents.js) measures the row on every width change (`ResizeObserver`), folds tools from the end with `.doc-toolbar-over` until the group ends inside the strip, and More (`.doc-toolbar-more`, `aria-expanded`, titled with the count) wraps the strip to show them in place, the real controls with their own menus rather than copies. **Never a sideways scroller and never a pinned group over the tools**: the scroller hid everything past the edge behind a scrollbar, and the sticky group sat on Insert (INBOX 426 a). Measured by `scratchpad/ui-sweeps/doctoolbarfit.js`: every control inside the strip and none overlapping, at 360, 768, 1024, 1280 and 1600 | `tests/test_doc_toolbar_reach.py`, `scratchpad/ui-sweeps/doctoolbarfit.js` |
| A list you manage (rows you select, several at once, and act on: the Manage categories panel, and the tag manager, `openTagsSheet` in tag-manager.js, which reuses its classes) | a `role="grid"` `aria-multiselectable="true"` of quiet rows (`role="row"`, `aria-selected`), **never a listbox**: an option may hold nothing interactive and each row carries its ⋯ (axe-core's nested-interactive, INBOX 433). The first cell (`role="gridcell"`, the roving stop, named "Work, 3 notes") holds a colour dot or icon, the name (ellipsised) and its note count as quiet muted text after it ("Hobbies · 10", never a pill: INBOX 466); the last cell is a ghost `kebabMenu` shown on hover or focus and always under `(hover: none)`, reached with Right and left with Left; a roving tab stop (arrows, Home, End), Space selects, Enter opens the row's content, F2 renames, Delete deletes, the context-menu key opens the ⋯; a click selects (Ctrl or Shift adds). Selected rows raise a sticky footer of what can be done to them together. Above the list, one tool row: a filter field, the Sort by select (Name, Most notes, Recently used; remembered), one `.library-chip` toggle for the hardly used (Used once, Empty) and the one create action, all at one height; under it, look-alike names (`manageLookAlikes`: case, spaces, hyphens and a plural set aside) as one Merge each, three at most, with Not now. The count after a name is a quiet button that opens its notes (`manageCountButton`), out of the tab order. These helpers live in tag-manager.js and the categories panel loads it first (INBOX 504). The card sizes to its content up to its cap and the list is its only scroller. Head: the reference dialog head | `tests/test_nested_interactive.py`, `tests/test_manual_parity.py`, `scratchpad/ui-sweeps/catgrid.js`, `catpanel.js` (session scratchpad) |
| A choice among colours (the Manage categories Colour item) | **The swatch picker**, `swatchPicker` in categories-panel.js, opened by `pickCategoryColour` in a sheet under a one-line preview (a dot and the name). A `role="radiogroup"` of round swatches, six to a row, and one worded Automatic below that clears the choice. Each swatch is a `role="radio"` button with `aria-checked`, an `aria-label` and a `title` that name the colour, painted by `--swatch` through the CSSOM (never `style=`). The checked one is a Tab stop; arrows, Home and End move the focus and the check together, Enter, Space or a click commits and closes, Escape leaves the choice as it was. The checked swatch is a ring in `--ink` outside a gap in the card's ground, so the choice is a shape and not only a colour, and the focus ring sits outside it. **The hues are `CATEGORY_PALETTE` (notes-list.js), twelve that each clear 3:1 as a dot on the lightest and darkest ground of both themes**, so one hex serves light and dark; the server keeps the same keys (`CATEGORY_PALETTE_KEYS`) and refuses anything but a key or `#rrggbb`. A chosen colour is read through `categoryColour(name, automatic)` and nothing else: dots and chips are painted by `paintCategoryDot` (so a later choice repaints them where they stand), the graph's scale by `graphCategoryScale`, the dashboard by `categoryColour`; a change fires `categorycolours` and the map and dashboard redraw. A new row of colours is this recipe with its own palette, never a second row of buttons | `tests/test_ui_recipes.py` (only `swatchPicker` draws a swatch; every swatch is named; focus and checked are visible), `tests/test_category_colour.py` (contrast, every surface asks the one function), `scratchpad/ui-sweeps/catcolour.js` |
| A list of choices picked by typing or browsing (the "/" block menu, the command palette, a suggest list) | **The rich picker**, rich-picker.js, taken out of the "/" menu (the owner: "I reallllllyyyy like the design of this popup panel menu for the / commands. can we do more similar design styles elsewhere in the app??"). A `.rich-picker-list` (`role="listbox"`, the one scroller, a thin scrollbar, overscroll contained) of rows built by `richPickerRow({icon, label, about, keys, query})`: a 2rem square outlined icon tile (`tint` wears a callout kind's ink, `face` puts a face in it), a title over one muted line of what it does, the typed letters marked, and a right-aligned keycap holding the way to do it without the picker (the markdown the row writes, or the chord that runs it, read from the live `shortcuts` table). Groups are `richPickerGroup(name)`, pinned while their rows scroll. One row is `.active` (a soft accent fill, rounded): the keyboard and the pointer both move it, and there is no separate `:hover` fill, so two rows are never lit. A `.rich-picker-preview` pane beside the list, filled by `richPickerPreview`, **only where a preview says something** (the block it writes, what a command does and its key, a note's first lines) and only from 44rem up. The picker keeps its own position, width and keyboard code; the row, the group, the keycap and the pane are the recipe's. A dialog whose choices are walked by Tab takes the same row as a button (`richPickerRow({tag: "button", role: null})`, the Library's Create picker), filled on hover and focus instead. Drawn by the "/" and "[[" menu, the command palette (keycaps from `chord`, a registry name, or the tab's M-letter jump; the line from the row's `about` or the same `reveal`'s line in `featureCatalog`) the Library's Create picker and the `m` guide (`chordGuideGroup`: Go to and Do as button rows, each keycap drawn as a key in one column, the current tab marked, a hint line at the foot, on the popover shell). A list that opens from a typed token ("/", "[[") is the editor menu in every surface, placed at the caret by `editorPlaceMenu`, never a list in the flow under the box. Find anything's rows are search results (a rendered two-line snippet, a date) and keep their own shape. Not for a menu behind a button or at the pointer: that stays `kebabMenu` | `tests/test_ui_recipes.py` (only rich-picker.js stamps the anatomy's classes; every listed picker draws through `richPickerRow`; hand-built `role="option"` rows may only fall), `scratchpad/ui-sweeps/slashmenu.js`, `richpicker.js` (every converted picker at 1440 and 390, light and dark) |
| A menu at the pointer (right-click, long-press) | `openMenuAtPoint(items, ariaLabel, x, y)` in markdown.js: the same `kebabMenu`, given a one-pixel transparent anchor in a `.pointer-menu-host` parked where the pointer was | `tests/test_ui_recipes.py` (a pointer-anchored menu is the recipe, not a second menu shape) |
| The keys and clicks a list is expected to keep (a row or card that has its own ⋯) | Nothing per list: app.js's delegated section "the conventions a list is expected to keep". A right-click, or a hold on a phone, on a row in `ROW_MENU_HOSTS` opens that row's own ⋯ items at the pointer (`kebabMenu` keeps them on `wrap.rowMenu`), except on a field, a link or a text selection; F2 runs the row's own Rename; the arrow keys, Home and End move between the items of an `ARROW_NAV_LISTS` list by where they are drawn; Shift+click on a tick sets the run since the last tick; and while a select bar is showing (or the Notes select mode is on) Escape, Ctrl+A and Delete press that bar's own Done, Select all and Delete, never from inside a field. A new list with a ⋯ joins by its selector in those tables, not by a listener of its own | `tests/test_library_pass2.py`, `scratchpad/ui-sweeps/listconventions.js` |
| A menu bar over a canvas (the board's Insert, Edit, Arrange, View, Board) | One `.wb-board-menu-wrap` per menu: a `[data-wb-menu-toggle]` ghost button carrying `aria-haspopup`, `aria-expanded` and `aria-controls`, and a `.wb-board-menu` written in markup rather than built by `kebabMenu`, because its rows are not all commands (the View menu holds a colour well, a grid select and four switches, which a command list cannot carry). What markup must not decide is the ARIA: `wbStampMenuRoles` (whiteboard.js) stamps every row at boot, `.wb-menu-item` as `menuitem`, `.wb-menu-section` as `group`, a row wrapping a native control as `none`, and `wireMenuKeyboard` then gives the menu the arrows, Home, End and an Escape that hands the focus back to its toggle. Measured before that existed: five menus, `role="menu"` on each and nought `role="menuitem"` inside, ArrowDown moving no focus. UI_MODERNISATION_PLAN Phase 8 makes this bar the seven-control ceiling's one exception, and the exception is the toggles only: everything else in the bar still answers to seven, which is six today | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/wbtopbar.js` |
| A right-click on a phone | `wireLongPress(target, handler, {selector})` in navigation.js: touch only, 500ms, cancelled by a move, and it swallows the `mousedown`, `mouseup` and `click` that the lift synthesises, so a hold does one thing rather than two (measured on the graph: holding a node opened its menu and lifting the finger opened that node's panel in front of it, taking the focus with it). What it opens is `openMenuAtPoint`, which asks for the focus again on the next frame, because Chromium takes it straight back out while the gesture is still in flight. Every `contextmenu` listener in app.js, documents.js and graph-canvas.js is counted against a `wireLongPress` call in the same file | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/graphphone.js` |
| A canvas on a phone (the graph, the board, the map) | One finger belongs to the tool in hand (draw, select, marquee); **two fingers are always the camera**, pan and zoom, whatever the tool is, because no tool in this app is drawn with two and a phone otherwise has to go and find a Pan tool before it can move the view (measured on the board: a pinch scaled it by 1.000 with Select in hand). A hold is the right-click (`wireLongPress`), and a hold on empty canvas is the gesture that needs a modifier key on a desktop (the graph's lasso). A palette of tools is a sheet below 600, holding the rail's own markup moved in and put back on close, never a second copy of it | `scratchpad/ui-sweeps/graphphone.js`, `scratchpad/ui-sweeps/wbphone.js` |
| The top bar on a phone | Three controls below 600: the space switcher, notifications and one `kebabMenu` (`#header-more`, `initPhoneHeaderMore` in phone-shell.js) holding theme, Settings, Lock and Quit; the four desktop buttons are hidden by 10-responsive.css's Phase 11 band, never removed. Every control in it, and every menu row below 820, is `--target-min` tall | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/phonehead.js` |
| A primary action on a phone | The dock's one filled button, floated: its id in `FAB_IDS` (phone-shell.js), and `floatPrimaryActions` moves it out of the dock onto the page as `.dock-fab` below 600 (fixed, bottom right, above the tab bar and the safe area, pill radius, `--target-min`) and back above. It hides while the surface it opens is already showing (`.tab-page:has(#capture:not(.hidden)) > #notes-new-note.dock-fab`) | `scratchpad/ui-sweeps/phonecapture.js` |
| A swipe on a phone row | `initRowSwipe(list, {right, left})` (phone-shell.js), touch only, below 600: the row's children slide on `--swipe-x`, the row's own `::before` (`--accent-soft`) and `::after` (`--error-soft`) fill the gap with the words the row carries in `data-swipe-right` and `data-swipe-left` (a direction with no word never arms), the underlay saturates past `ROW_SWIPE_ARM` (88px), and a lift-off past it presses the row's own control: a note's star (`.favourite-btn`) or the menu's own `binNoteWithUndo`; a reminder's Done checkbox. A swipe is never the only way to an action and never a second copy of one; `touch-action: pan-y` leaves the vertical drag to the page | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/phoneswipe.js` |
| A sidebar on a phone | Below 600 the sidebar is the edge sheet it already is below 820, parked fully off screen, and it opens from a `.dock-nav` button at the leading edge of its own dock's head (`mountPhoneSidebarOpeners` in phone-shell.js, one row per `SIDEBAR_IDS` entry), never from a rail: the page beside it takes the full width. Above 600 the tablet keeps the 52px rail and the sheet's own toggle | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/phonesidebar.js` |
| A menu item | `makeMenuItem("ph:icon Label", title, run)` | same |
| The address of an object (a note, document, board, map, chat), to open it in the app | **Copy app link**: `appLinkMenuItem(kind, id)` (router.js) in the object's own ⋯, in the copy group beside Copy title; a markup menu (the document editor's, the board's Board menu) has one button calling `copyObjectAddress(kind, id)`. The address is `routeHashFor` (the router's one table) behind origin and path. A `[[wiki link]]` row is named **Copy wiki link**, so the two are never "Copy link". A pasted address of this origin and a known route renders as a same-window link (`appAddressHash`, router.js; drawn by notes-list.js) | `tests/test_router.py` |
| A card or row that opens something and carries controls of its own (a tick, a ⋯) | **the accessible card**: the card is a plain box (an `<article>`, never `role="button"` and never a Tab stop), and its title is the one control that opens it, made by `cardOpener(title, open, name)` (menus.js): a button by role, a Tab stop, Enter and Space. `.card-open::after` stretches the title's press over the card (08-consistency.css), so a click anywhere still opens it; the host is `position: relative` and `isolation: isolate`, and its own controls are lifted above the overlay at `z-index: 2`. The host keeps its click listener and each control stops its own press. A control inside a control is what axe-core's `nested-interactive` (WCAG 4.1.2) counted 35 times on the Library's cards (INBOX 433). Used by the Library's cards, the board cards and the Documents rows; the arrow keys move between `.card-open`s (`ARROW_NAV_LISTS`) | `tests/test_nested_interactive.py`, `scratchpad/ui-sweeps/cardopen.js`, `axe.js` |
| A dropdown of values | a plain `<select>`; `enhanceSelect` restyles every one at boot | `tests/test_frontend_handlers.py` |
| A picker in a toolbar that is an action, not a setting (a colour to apply, whose resting text is only its own name) | the same `<select>` with `data-select-icon="ph-…"`: `enhanceSelect` puts the icon in the opener and `.select-opener-icon` clips the word (never `display: none`), so the face is an icon and a caret and the name is still the select's `aria-label`, its `title` the hover text. A worded button in a strip that has to hold one row carries its word in a `.toolbar-word` span, clipped the same way below the band where the row would wrap, and takes the icon-only square there | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/notetoolbar.js` |
| Focus on a `<select>` | `focusSelect(select)` in sheets-selects.js. **Never `select.focus()`**: `enhanceSelect` takes the native control out of the tab order (`tabindex="-1"`, `aria-hidden`), so the direct call focuses an aria-hidden element or nothing at all, silently. Measured across seven tabs: all thirteen reachable selects would have taken the focus onto the hidden control. The same goes for a `keydown` bound to a select, which never fires. | `scratchpad/ui-sweeps/selectfocus.js` (it cannot be a lint: what decides is what the variable holds at runtime, not what the source says) |
| Help longer than one line | one line in place, the rest behind a `data-help-for` '?' button and a `.help-body` popover | `tests/test_ui_signatures.py` |
| The model's reasoning, anywhere it is shown (Chat, the popup agent, Ask, the Guide, the writing room) | **The one Thinking fold**, `thinkingFold()` in chat-agent.js (`thinkingFoldIn(host)` for a fixed host in the page): a `details.agent-step.thinking-fold` whose `summary.fold-summary` is the steps and sources folds' own disclosure (an icon and the word Thinking, `--text-sm`, muted, a hover ground) and whose `.thinking` body is the steps fold's rail in the body face, muted, capped at 12rem and scrolling. Open while the model reasons, folded when a tool runs or the answer starts. Never a second builder, a fold in the markup or a surface's own body style (INBOX 457) | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/bubbleparts.js` |
| An assistant's answer bubble (Chat, the popup agent) | The head (avatar and name, `.msg-role`), then one `.agent-steps` column holding the thinking fold, the steps fold and the answer in that order with the column's gap between them and no margins of their own, then the Sources panel (`chatSourcesPanel`: cards in Chat and Ask, one-line rows through its `row` hook in the popup agent, keyed on kind and id so a note found and then opened is one row), then the one muted facts line (`messageMetaLine`, a long model id cut short with the whole id on its title), then the action row, which hangs under the bubble in room of its own and never over what follows (INBOX 458) | `scratchpad/ui-sweeps/bubbleparts.js` |
| A pane that follows a stream (a transcript, a reasoning body) | `keepAtBottom(el)` in chat-agent.js on every write, never `scrollTop = scrollHeight`: it follows only while the reader is at the bottom, lets go the moment they wheel, drag or key upward, and follows again once they are back at the bottom (INBOX 458) | `scratchpad/ui-sweeps/bubbleparts.js` |
| A preview of a cited source (what a numbered mark in an answer stands for) | `openCitationPeek` in capture-ask.js: a `.help-popover.citation-peek` lifted to `<body>` and placed by `placeHelpPopover`, so the shell, caret, tier and flip are the help popover's and only the content is its own. One at a time; hover or focus shows it while the pointer or focus stays, a press keeps it (and on touch is the only way in); Escape (captured and spent, so a streaming answer is not also stopped), a press elsewhere, or the mark scrolling out of its transcript closes it. The whole preview (number, title, the grounded passage marked in its context, as characters) is one button that opens the note, with the note's facts and a worded Open beside it in the foot. A mark never navigates on its own press. **A cited note's pictures** sit beside its numbered chip under Grounded in (`groundingThumbs` in capture-ask.js, INBOX 502): one `.answer-grounding-item` of the chip and up to three `button.answer-grounding-thumb` squares (2rem, `--target-min` under a coarse pointer), lazy, alt from the server's `picture_alts` (caption, else the reading) or the Markdown alt, each opening the note's pictures in the lightbox; a `+n` for the rest | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/citepeek.js` |
| A date picked from a month (the Timeline strip's month label) | `renderTimelineMonthPop` in timeline.js: a static `.timeline-monthpop` panel wired once with `wireHelpPopover` to a `button[aria-haspopup="dialog"]`, so the shell, caret, tier and Escape are the help popover's. The grid is a `role="group"` of buttons with one Tab stop (roving `tabindex`): arrows a day or a week, Home and End the week's ends, Page Up and Page Down a month, Escape returns the focus to the button. A day past today is `disabled`, the days already on screen are tinted, a dot marks a day with a page; a day is 44px under a coarse pointer at 390 (the panel's width is its own, nothing else). A pick moves what is on screen and focuses it; it does not act | `tests/test_daily_strip.py`, `scratchpad/ui-sweeps/daystrip.js` |

| Why a thing was chosen, as up to three measured reasons (an evidence card, a cited passage) | `evidenceSignals` / `evidenceBlock` in capture-ask.js: a `.evidence-signals` grid of name, a 4px `.evidence-signal-track` on `--border` with an `--accent` fill set by `el.style.width`, and the percent in tabular figures, each `--text-xs` `--muted`; the track is `role="img"` with the name and percent as its label. **A signal the app did not measure is left out, never drawn empty** (an empty bar reads as "no match"). A verdict line above it (`.evidence-verdict`, `--ink` when supported, `--muted` when partly). The evidence view (`renderEvidenceView`) is the same block on `.answer-evidence-card`s beside each sentence, one column below 600 | `tests/test_evidence_spec.py`, `scratchpad/ui-sweeps/evidence.js` |
| A group of settings folded away until it is wanted | `details.settings-fold`: the `<summary>` carries the group's own label and **no control**: a button in a summary is a control inside a control (axe-core's nested-interactive, WCAG 4.1.2; INBOX 433). A head's '?' is the first child of a `div.fold-help-wrap` around the fold, `button.graph-help-toggle.fold-help`, and the summary keeps `<span class="fold-help-slot" aria-hidden="true">` where it was; `placeFoldHelp` (settings.js) draws the button over its slot, so the head looks exactly as it did (`scratchpad/ui-sweeps/foldhelp.js`). The graph's "Unpin all" is the one action left in a summary, a ratchet in `tests/test_nested_interactive.py`. The flat resting summary, the chevron and the hover fill come from 08-consistency.css's disclosure rules, which name the families by class, so a fold added to one of those four rules and not the others has no chevron or no hover. Open is remembered where it is a property of how the surface is used rather than of one visit. **A whole group of a long pane folds the same way**: `details.settings-group.settings-fold` with a unique `data-fold-key`, the group's `h3` in the `<summary>` (and its one '?' beside it, as above), the first group `open` in the markup; `wireSettingsFolds` (settings.js) keeps each key's open state per browser, a '?' in a closed head opens its group, and a deep link through `openSettingsModal` opens the fold it lands in. Closed, a group is one 51px row. Used by Settings' advanced groups, by the long panes (Appearance, Keyboard shortcuts, Extras, Skills) and by the graph's options panel, whose three tuned-once sections (Physics, Groups, Minimap) are folds | `tests/test_ui_recipes.py` |
| A disclosure marker (the thing that says a row folds: a Settings fold, the help accordion, a task log, the Library's Contents, notes and outlines) | **One caret**: Phosphor `ph-caret-down` at 1em of its row, in the row's own colour, turned `rotate(-90deg)` while closed and upright when open, on `--motion-fast` (none under reduced motion). In markup it is `<i class="ph ph-caret-down contents-caret">`; on a `<summary>` it is the `::before` that 08-consistency.css's disclosure rule draws ("The chevron the native marker was hiding"), so a new fold family joins that rule's list rather than drawing its own. Never a triangle or chevron built from borders (INBOX 464 (14): a 5x6px border triangle in Settings beside the Library's 16px caret) | `tests/test_disclosure_marker.py` |
| Choosing files to bring in (an import, an upload) | **One step**: a ghost button carrying the verb ("Import files", "Import a folder", "Upload") over a hidden `input[type="file"]` it clicks; choosing the files starts the work. The picker's own Cancel is the way out before; after, a toast with Undo (`toastAction`) puts it back, for an import by binning exactly the notes it made (`undoImport` in settings-data.js, from the ids `/import/markdown` and `/import/document` return). Never the browser's own "Choose files" box beside a second button that does the work (INBOX 464 (18): three imports in Settings, Data were two steps each) | `tests/test_import_one_step.py` |
| An on/off setting | `label.setting-check` with the switch first. **The switch stands on the group's text edge**: in a Settings group the row hangs its padding and edge outside the column (08-consistency.css, INBOX 464), so the switch lines up with the head, labels and hints and the hover fill bleeds into the group's padding; measured before, all 130 switch rows sat 9px inside the column | `scratchpad/ui-sweeps/switches.js`, `scratchpad/ui-sweeps/switchalign.js` |
| Asking for the password for one action (unlocking private notes, turning sign-in off) | `askPasswordPrompt({title, message, submitLabel, submit})` in app.js: the lock screen's own card in `data-mode="prompt"`, lifted above the dialogs (`.lock-prompt`, z-index 1045), with "Not now" and Escape as the way out; `submit` throws to put its message under the field. Never a second password form: the four `type="password"` fields are the lock card's and Change password's three | `tests/test_lock_boundary.py` |
| Two to four exclusive choices | `.seg` with `aria-pressed` | `tests/test_ui_signatures.py` |
| Two to four toggles that belong to one question (a filter set that is always all of them, none of them removable), in a row with space for them | `.seg.seg-multi`: the same well, `aria-pressed` on **every** segment rather than on one, never wrapping, the word beside the icon above 1200 and hidden (not dropped) below it so the accessible name is the same at every width. Not a row of chips: a chip is a filter you can take off | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/timelinedock.js` |
| The same set in a row that is already full, or whose labels are words rather than glyphs | A `details.dock-menu` whose summary is a ghost button saying what the filter is set to ("Kinds: all", "Kinds: notes, boards"), holding one `.doc-dock-menu-check` row per member (icon, word, checkbox). One width at every zoom, where a well of four is as wide as its four labels: the Timeline's was 441px of a dock that also holds a search box, a view switch and Options, and at 150% zoom it collided with them (INBOX 214). The rows are `.doc-dock-menu-check` so the menu stays open while you tick them, and a `change` handler, not `click`, since a checkbox inside its own `<label>` fires both | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/chrome214kinds.js` |
| A brief confirmation | `toast(text)`; with one action, `toastAction(text, label, fn)` | |
| The state of an optional engine a surface depends on (Tesseract for the OCR workspace: can it run, in which language, and one action when it cannot) | **The engine line**, `ocrEngineMount(host, {readers, settings, onChange})` in ocr-engine.js (a lazy piece): one `.ocr-engine-line` of a state chip (`.extras-installed` colours when ready, `.ocr-engine-chip.is-warn` when not), one muted sentence that names the cause and what still works, and **the one control that fits the state**: the language `select` when it can run, a filled Install button when it cannot, a `progress` bar with the installer's own step while it installs (followed from `GET /extras`, the Packages panel's source), and Try again plus the reason when it fails. The status is the server's (`ocr.engine_status`, carried by `GET /ocr-readers`), never inferred from an installer's exit code, and the same object draws the workspace's line and, as `settings: true`, only the language choice in the Packages row, which keeps its own Install, Reinstall and Remove: one place manages it, the other shows it. A read that cannot run says so and says what to do (`ocrChooseReader`: the other engine takes it and the message names both, or an instruction); it never answers with a success over nothing | `tests/test_ocr_engine_ui.py`, `tests/test_ocr_engine.py`, `scratchpad/ui-sweeps/ocrflow.js` |
| Something is working on it (an AI call, a download, a long read: any inline wait that is not a skeleton and not the chat's reply dots) | **One ring, `.spinner`**, drawn by `spinnerEl()` or, inside any label, the `ph:spin` marker: `setLabel(el, "ph:spin Reading…")`, `chip("ph:spin Filing…")`. It is 1.15em of the text beside it (the size `.ph` gives an icon), a `--spinner-stroke` (2px) border, `--accent-text` (the one colour that holds contrast on the page and on `--accent-soft`; `currentColor` made a 2px ring in a muted line vanish; the only two exceptions are a filled button, where it takes the button's text colour because accent on accent would vanish, and a danger button, whose ring is its red like its icons), one turn per `--spinner-turn` (0.9s). **Reduced motion** keeps the ring and pulses its opacity (`--spinner-pulse`, 1.8s), never a frozen ring and never a swapped glyph; progress motion "always" still turns it. **A button** is busy through `setBusy(button, true, "Saving…")` and `setBusy(button, false)`, which disables it, sets `aria-busy`, puts the ring first and puts back exactly what was there; never `disabled` plus a hand-set label. **Copy**: sentence case, one real `…` or none, never `...`, no em-dash; "Saving…" for a write that settles at once may stay words, anything that waits on a model, the network or a download carries the ring. Not this recipe: the skeleton (`showSkeletons`), the chat reply dots (`typingDots`, the model's answer on its way, in a bubble), the companion's poses, the boot splash | `tests/test_spinner_recipe.py` (no second turn keyframe, no `circle-notch`, no `...`, no hand-set `aria-busy` on a button, every animation name has a `@keyframes`), `scratchpad/ui-sweeps/spinners.js` |
| When a job last ran and how it went (a maintenance action, a background pass, an import) | **The last-run line**: `<p class="status job-line" role="status" data-job-line="<kind>"></p>` beside the job's control (or `jobLineEl(kind)` for a control built at runtime), filled by `refreshJobRuns` in settings.js from `GET /jobs/last-runs`, one record per kind kept by `core/jobruns.py`. Quiet `.status` text, "Last run 2h ago · succeeded · 412 notes indexed", the exact time and the duration on hover; **red (`.error`) only on a failure, and then it says why**; a stop is "stopped", never red; running is the `.spinner` ring and "Running…" (the line polls itself while it shows). A new job adds its kind to `jobruns.KINDS`, wraps its work in `with job_run(kind) as run:` and sets `run.result`; the Background jobs overview lists it with no frontend change | `tests/test_job_runs.py` (every line names a known kind; every kind is written by a job), `scratchpad/ui-sweeps/joblines.js` |
| A dialog | `.card.modal-card` (settings-sized) or `.card.space-dialog` (small), opened through the app's modal helpers, never a bare `<dialog>` with its own chrome | `tests/test_ui_signatures.py` |
| A sheet (a panel that arrives from an edge, which is what a phone gets instead of a column) | `openSheet({label, name, build})` in phone-shell.js: a `.modal-overlay.sheet-overlay` holding a `.card.modal-card.sheet-card`, so the scrim, the z-index tier and the backdrop press are the dialog's own. It comes from the bottom edge at every width, names itself in an `h2.sheet-title` with an X (`.sheet-close`) beside it in a `.sheet-head`, closes on that X, on Escape (captured) and on a backdrop press, takes focus on open and hands it back to the opener on close, holds its rows in a `.sheet-list` of full-width `.sheet-row` buttons at `--target-min`, and pads its foot with `env(safe-area-inset-bottom, 0px)`. Two sheets predate the recipe (`.sidebar-sheet-open`, `.graph-popup-sheet`) and are the only hand-built ones allowed. They stay hand-built on purpose, and the reason is the recipe's own boundary: `openSheet` builds a **modal bottom** sheet out of nothing, and those two are **in-place** sheets, elements already on the page that become one inside a band. Moving them onto it would cost each the thing it was built for (the sidebar keeps a rail on screen with its opener on it, which is the way back; the graph's is deliberately not modal, so the map it came from stays visible). What an in-place sheet does share is the dismissal, through `wireInPlaceSheetDismissal` in sheets-selects.js: captured Escape, a press outside, and focus back on the opener. One variant exists, `corner` (Atlas, the guide panel): a chat is a column, so above 600px it takes a reading width and **floats**, one inset on both edges, all four corners on `--radius`, and its foot padded like a card rather than with `.sheet-card`'s home-indicator inset; below 601px it is the bottom sheet again, because in a 390px window the corner is the window. A variant that touches an edge keeps the edge sheet's geometry; one that does not, does not. A second variant, `page` (the note opened on a phone, `openNotePage` in phone-shell.js; the Library reader below 600, `ocrPhonePage`): the whole screen, no cap, no rounded top, the close relabelled as a back chevron, and the surface's own actions in a `.thumb-bar` at its foot, **moved** there from wherever the wide layout keeps them and moved back above 600, never a second copy. A surface that already is a `.modal-overlay` dialog takes the variant's two classes rather than being rebuilt on `openSheet`, and the stamping is written in app.js whatever file owns the surface: the variant class is the loophole otherwise, and `tests/test_ui_recipes.py` fails any other file that writes one | `tests/test_ui_recipes.py` (hand-built sheets may not multiply; the corner variant floats), `scratchpad/ui-sweeps/phonemore.js`, `scratchpad/ui-sweeps/guidepanel.js` |
| A bar of actions above the on-screen keyboard (what a phone gets instead of a toolbar it cannot reach) | `.thumb-bar`: fixed to the bottom edge, `role="toolbar"` with its own label, shown by a `max-width: 600px` block and nothing else, every control at 44px, and its bottom padding a `max()` of `env(keyboard-inset-height)`, `var(--keyboard-inset)` (app.js writes it from `visualViewport` once, for everything) and `env(safe-area-inset-bottom)`. **Never its own `visualViewport` listener.** Used by the documents editor's phone bar | `tests/test_ui_recipes.py` |
| A floating panel over a canvas | `.card.glass` plus the panel on the `[data-glass="off"]` list | `tests/test_ui_recipes.py` |
| One surface given the whole window (the documents editor's focus mode) | A class on the tab page (`#tab-documents.doc-focus`): `position: fixed; inset: 0` over the top bar and the tab strip, every other band of chrome `display: none`, the content at its own measure and centred, and no blur on a window-sized card. What is left is **one** floating `.card.glass` pill (`#doc-focus-bar`, `role="toolbar"`): what this is, its one live fact, and a **worded Exit**. **Nothing the page offers is out of reach from it** (INBOX 426 a, b): a Tools toggle (`#doc-focus-tools`, `aria-pressed`) brings back the dock and the formatting strip in their own places, and a Suggestions toggle (`#doc-focus-prose`, `aria-expanded`) opens the writing panel as a side panel fixed to the window's right edge while the page gives up that room, and a Sidebar toggle (`#doc-focus-sidebar`, `aria-pressed`, INBOX 453 (1)) is its mirror on the left: the document list and outline as a panel fixed to the window's left edge on the solid modal ground, the page giving up the room, both panels starting at `--doc-focus-panel-top`, under the pill; below 600 the three keep their icons and their names move to `aria-label` and title, and the pill gives up the word count (400) then the save state (340) before it overflows. Escape closes the sidebar first and leaves the mode on the next press; below 720 opening one side panel closes the other. It fades by opacity alone after an idle wait, comes back on a pointer move, a hover or a keyboard focus, and stops animating under reduced motion. Escape leaves only when nothing else spent it (`defaultPrevented`, `activeOverlay()`, an open menu); a key that has a meaning there (F11) is scoped to the page being shown. Remembered in `sessionStorage` (the mode, Tools and Sidebar), never for good: a fresh launch never opens chrome-less; the restore runs after the file has loaded (`onDomReady`), not inline, where a `const` further down the file threw into the swallowing `catch`. The browser's Fullscreen API is an extra button on the pill, shown only where `document.fullscreenEnabled` | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/docfocus.js` |
| A grip you drag on a canvas (a resize corner, a link's end, a line's waypoint) | A circle or box filled in the thing's own colour and stroked in `var(--card)`, `cursor: move`, and **`transform-box: fill-box; transform-origin: center; transform: scale(var(--wb-inv-zoom))`**, which is what keeps a grip one size to the hand at every zoom (a link's bend grip was the one that did not: 24px across at 2x against 12px at 1x). It takes the pointer only while it is revealed, by selecting what it belongs to or by pointing at it: an invisible grip with `pointer-events: auto` swallows the press meant for the line under it, which has now happened twice, to the mid-line `+` and to the map's own waypoint. Its `pointerdown` stops propagating, or the canvas pans under the drag, and it carries a `<title>` saying both its gestures. Used by `.wb-resize-handle`, `.wb-link-endpoint-handle`, `.wb-link-bend-handle`, `.wb-map-edge-handle` | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/mindmapcurve.js` |
| A ring of actions around a canvas item (a radial) | A pie menu: `.wb-map-radial` cut into `.wb-map-radial-slot` **sectors**, never buttons laid on a band (the owner: "not just buttons sitting ontop of it"). Each slot is a button the size of the whole ring, placed with `left`/`top` from `--wb-radial-outer` and **never** with `translate` (the press cue owns it), clipped to its wedge by the `clip-path: path()` `wbFitMapRadialBand` writes, which also clips its hit area; its icon and word are a `.wb-map-radial-face` at the wedge's middle. The ring's `::before` annulus shows through a 1.5px gap and a 1px rim as the dividers. The hole holds the item (`wbSizeMapRadial` sizes it from the item's box) and a ring slid in from an edge pans the board with it, so the hole never loses its item. Hover and focus fill the sector; focus also gets the edge the ring draws (`wbMarkMapRadialSector`), because an outline is clipped away. `role="toolbar"`: the arrows walk the sectors (an arrow with the ring open enters it), Enter or Space runs one, Escape closes and hands the focus back to the board. A menu opened from a sector hangs from the sector's own box (`wbMapRadialSectorRect`), never the button's, which is the whole ring | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/mapradialfit.js`, `scratchpad/ui-sweeps/mapradialmore.js` |
| Any surface that blurs | on the `[data-glass="off"]` list, radius from `--glass-blur`, never a px | `tests/test_ui_recipes.py`, `tests/test_style_scale.py` |
| A control added to the bottom status bar | one of the bar's three zones, in this order: `state` (what the app is holding or doing, left end, the only zone that shrinks), `tools` (the doorways: the palette hint, the agent, the guide, Find, the clock) and `control` (back, forward, history, undo, redo). **A new control goes in `tools`**, which is the only zone that grows, and it grows leftwards from `control`, which owns the right end and has fixed membership. Written as `data-status-zone` on a direct child of `#status-bar`; nothing sits in the bar outside a zone. The rule exists because the bar was a flat list and every control added to it was appended at the right end: measured at 1440, that had pushed undo and redo 391px and the navigation group 467px off the end, which is what the owner reported (INBOX 307). Below 600 the bar is not on screen: `dockPhoneStatus` (phone-shell.js) moves Back, Undo and the AI dot into the header, every other control is a row of the header menu through `PHONE_STATUS_ROWS` (the row presses the bar's own button) or, for Reminders, Ask the agent and Guide, the tab bar's More sheet, and the bar comes back only while a job, an activity, offline or power saver is showing, so **a new control also gets a `PHONE_STATUS_ROWS` entry** | `tests/test_status_bar_grammar.py`, `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/uitrio.js`, `scratchpad/ui-sweeps/phonechrome.js` |
| A button | the ramp below: filled (one per surface), ghost, icon-only with `aria-label` | `tests/test_dock_grammar.py` |
| Stepper (a value moved by a fixed unit: a reminder's time by 15 minutes or a day) | `<div class="stepper" role="group" aria-label="Move the time by …">`: a `button.ghost.small.icon-only.stepper-btn` minus, a `.stepper-unit` naming the unit ("15 min"), a plus; each button with its own `aria-label` and `title` ("15 minutes earlier"). One quiet pill (`--btn-quiet-bg`, the hairline as an inward outline so the pill is the buttons' 32px), no dividers; round ghost buttons, the tint on hover and a deeper one pressed. Arrow keys nudge while it is focused, Shift+arrow by the larger unit; the readout it changes fades in (`.stepper-fresh`). Two steppers sit in a `.stepper-pair`, which wraps as a unit | `tests/test_ui_recipes.py` (`test_the_quiet_button_recipe_holds`) |
| A Clear control on a box people type into (Capture, Quick note, Ask, Chat, the popup agent) | `button.ghost.icon-only.small.field-clear.hidden#<box>-clear` with `ph-eraser`, `aria-label="Clear"` and `title="Clear"`, in the box's own foot or row (Capture: `.note-composer-foot`, left of the count; Quick note: left of its action row; Ask, Chat and the agent: right after the field), never a floating control. `frontend/js/field-clear.js` (lazy) shows it only while the box holds something and wipes the words (Capture also its title, tags and staged files); the **Undo** is `toastAction("Cleared.", "Undo", ...)`, or a `.link-button` on the status line where a modal dialog or the agent overlay would cover the toast. Undo puts the words back in front of anything typed since. Escape is not touched | `tests/test_field_clear.py`, `scratchpad/ui-sweeps/` (session scratchpad) |
| A chip | `.chip`; a chip is a fact, never an action (an action is a button). **Its words are always a `.ph-text` span** (`chip()` wraps bare text), trimmed to the x-height band (`text-box: trim-both ex alphabetic`), so the row's own centring puts the words, plain or beside an icon, on the chip's centre line in any UI font; the icon is centred in its box (`.ph-lead`, `--ph-ink-dy` for the few glyphs whose ink is off-centre), one `--space-1` gap between them, a `:where(.chip)` height floor of 1.125rem that every family's own floor beats. A new chip family states its own floor if its height was its line box. Never a hand-set `translate` on a chip's icon | `tests/test_badge_recipe.py`, `scratchpad/ui-sweeps/badgealign.js` (every chip family by ink at 3x: icon and words against the chip's centre, gap, padding, rows of chips; `badgetry.sh` tries a stylesheet in another UI font first) |
| Another surface of the app embedded in somebody's text (a board or a map as an object in a note or a document) | one `.note-embed` frame, the same dashed frame a transcluded note wears, because the reader has to be able to see that this is not their own writing. Inside it the whole card is one `<button>` (`.board-embed-open`, padding on the button rather than the frame, or the press stops short of the edge it is drawn inside), the picture comes from `mapPreview(board, {size: "card"})` and nothing else, the facts line is `.library-file-meta` carrying `mapCountLabel`, and the reference is written by `boardEmbedMarkdown` so the "/" menu and the board's own "Add to a note" cannot spell the same object two ways. **A target that is gone leaves a tombstone**, `.board-embed-gone` naming what was there, never a card that quietly disappears: the reference carries its title for exactly this. And a miss is not a tombstone until the index has been refreshed once (`loadMapBoardIndex(true)`), because a board made a minute ago is missing from an index built before it | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/noteobject.js` |
| A fact on a facts line that is also the way in (the picture card's reading) | `.library-chip` on a `<button>`, sitting on the line beside the facts it belongs to. It opens the surface where the thing can be read, **never the card it is on**: a 180px tile has no room to hold a transcription, and a `<details>` that tried took the card from 240.7px to 416.3px and set the height of its five neighbours with it (INBOX 279). Its size comes from its own class, because a rule led by a facts line's handle may not carry a `font-size`: that rank is `.library-file-meta`'s alone | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/libreadingfoot.js` |
| A dialog's head (any modal or popup panel) | **The Documents AI assistant's head is the reference** (the owner, 2026-09-27: "I actually reallly like the design of the document editor's ai assistant popup panel. especially with the design of the close, history,a nd tooltip buttons"): the title, then its `data-help-for` '?' right beside it, then, pushed right, an all-icon group of `button.icon-only.ghost.small.dialog-head-btn` (history or other tools, Close last), each `aria-label`led and `title`d, a visible `:focus-visible` ring, 32px on desktop and 44px under touch/coarse pointer (`--dialog-head-btn-size`, its own token: `--target-min` drives ~150 other rules across the app, so raising its floor was not this task's to do). Below: a `.seg` pill when the dialog has modes, one line of description, then the input row with one filled action. `.dialog-head` / `.dialog-head-actions` / `.dialog-head-btn` (08-consistency.css), rolled out to doc-ai, Notifications, Earlier versions, Connections, the bin, Keyboard shortcuts, Tools & features, Meeting notes, Improve writing, Quick sketch, Settings (`settings-close`) and now the chat attach popup (`note-picker-close`), which had neither a name nor a way out of its own before | the dialog-head ratchet in `tests/test_ui_recipes.py` |
| A search field with a leading icon (a real input that filters in place, not a fake field that opens a dialog like `#dash-find`) | `.search-field` (the well: border, ground, inset, one `:focus-within` ring) holding a `.search-field-icon` glyph and a `.search-field-input`, which turns its own box off so there is one field, not a box in a box (with two classes, `.search-field > .search-field-input`, at rest, hover and focus: one class lost to `input[type="search"]` whenever the field was not focused and drew a second, offset box, INBOX 485) ("the bar is the field", the Finder's recipe, 07-whiteboard-misc.css). Generalised from the Web panel's `#web-query`/`#web-stop`-keyed `.web-search-field` (03-dashboard-widgets.css) when the chat attach popup needed the same shape and a second copy keyed to new ids would have been the wrong fix; the Web panel keeps its own ids for now, unmigrated | `scratchpad/ui-sweeps/chatattach.js`, `attachkeys.js`, `tests/test_ui_recipes.py` |
| A popup window or panel (a dialog, a sheet, a floating panel, a popover: the owner, 2026-10-03, INBOX 456: "make sure all the popup windows and panels are the same design and style") | **Three tiers, each with one shell, and the head above for the first two.** **Dialog and sheet** (a scrim, a head, a way out: `.modal-card`, `.space-dialog`, `.sheet-card`, the two palettes): `--radius` (a sheet's bottom corners 0), a 1px `--glass-border`, `--glass-shadow`, `--card-pad-y`/`--card-pad-x`, the dim behind it is `var(--scrim)` and nothing else (it was four values, and Find anything painted the opaque page and hid the app), an inset of `--space-8` from the window at every width (a native `<dialog>` is `max-width: calc(100vw - 2 * var(--space-8))`, so it is the same width as a `.modal-overlay` one on a phone), and a small dialog is `min(34rem, ...)` unless it names its own width. **Panel** (floats over the page with no scrim and still has a head and a way out: the notifications panel, the agent activity panel, the node popup, the guided tour's card, the board overview, the Attach picker): `--radius`, `--panel-pad` (`--space-5`) on every side, the same head. **A multi-select picker** (the Attach picker, INBOX 467 and 485) is that panel at one height for every source, with a `.seg` of sources (each tab carrying a count of what it holds), a `.search-field`, and rows drawn by one renderer (`notePickerRow`): a leading tile (`richPickerTile`, the file's own glyph) or the picture, the name over one muted line of facts (a note's category is a dot in its own colour and quiet text, `.note-picker-category`, never a filled chip; then when, size, where it is used), and a check ring at the right edge that fills with the accent when the row is on, the row taking `--accent-soft`; the real checkbox is in the row, visually hidden, so Space ticks it. Pictures are a grid of the pictures. The list is one tab stop: arrows walk it (and the grid by its columns, and the tabs), Enter is Done, Escape closes. Loading, empty (with its one action) and "showing 60 of N" are rows in the list's place. The dialog footer (`.space-dialog-actions`: the count at the left in quiet text, a ghost Clear, the one filled Done); on a phone it is a sheet of fixed height with the strip on one row. **Popover** (anchored to what opened it, no head, no way out of its own: menus, the help popover, the chat model panel, the clock, a '?' panel): the one popover shell, `--radius-lg`, because it is the smaller surface. **The head is `.dialog-head`** for all of the first two tiers: the title is `.dialog-head-title` (16px, 600, `--ink`, on any tag: `.card h3` is the 12px uppercase eyebrow and a head written as an `h3` or a `strong` used to inherit it), its '?' and every utility and the Close are `.dialog-head-btn` (32px, 44 under touch), **Close last, always an icon**: a worded Cancel in a head (the skill runner's) is the X, and a form's own Cancel stays in its foot as well. A small dialog's markup is `<div class="dialog-head"><h2 class="dialog-head-title">…</h2><span class="dialog-head-actions"><button … data-close-dialog="id">`. `openSheet` stamps all of it on every sheet. Not tiers on purpose: the welcome wizard (it is slides, not a head), the confirm alert (a question and its answers), the Ctrl+K palette (an input and a list), the lightbox (a media viewer on its own dark ground, 82% black, with a round white X: a picture is not a card) and the in-page columns (Ask history, the notes rail, the Web panel, the board's Library), which are cards in the page and keep the panel-head recipe | `tests/test_ui_recipes.py` (every small dialog opens with the head; every popup `*-close` is `dialog-head-btn`, with the in-page closes frozen in `IN_PAGE_CLOSE_DRIFT`; the last declared radius of every dialog and panel is `--radius`; the panel tier is padded `--panel-pad`; every dim is `--scrim`), `scratchpad/ui-sweeps/popupinv.js` (42 surfaces at 1440 and 390, light and dark; `popupcmp.py` counts the distinct values per property), `scratchpad/popup-inventory.md` |
| A panel head inside a card (a title with something to do beside it) | `h3.panel-head`: identity, then **at most one** chip, then an all-icon `aria-label`led action group; the row is `nowrap` and the chip is the only zone that may shrink (it ellipsises, with the whole phrase on its `title`). Every ancestor between the chip and the card needs `min-width: 0` or the head simply grows past its column | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/askhead.js` |
| A side pane that searches and reads (the chat tab's Web panel) | The `h3.panel-head` recipe whose one fact is a state **dot** (`.web-engine-dot`, `role="img"`, its words on the `title` and the `aria-label`, never a chip) and whose actions are a `kebabMenu` of the engine's commands and the close; one `.web-search-field` well holding the glyph, the input with its own box turned off (the Finder's "the bar is the field") and a Stop that shows only while something is loading, Enter searching and ArrowDown handing the focus to the list; results on the list-row recipe (a letter tile for the site, never a fetched favicon, then source, title and snippet, one kebab that is also the right-click); and a reader that is the pane's **one** scroller: a back link and the address's tools over the title, one action row of the filled primary and icons, and the page as prose at `--doc-measure` with no box drawn round it. Ctrl+F there is the app's find bar scoped to the page (`openGlobalFind({scope})`), not a second find | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/webpanel.js`, `scratchpad/ui-sweeps/webpanelflow.js` |
| A list row you can act on without leaving the list (a finding in the writing panel) | the row is a `<li>` holding a head row and one `.doc-prose-answers` box: the control carries `aria-expanded`, the row takes `aria-current="location"` and is painted from it, one row is open at a time, the answers are the same controls the matching popover draws (one builder, never a second set), and the open row is brought into view with the list's own `scrollTop`. A list row never opens a popover over the content it is about | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/prosepanel.js` |
| A popup placed in the window's own coordinates (a menu at a word, a completion list at the caret, a toolbar dropdown) | it is a child of `body` while it is open and goes back on a comment placeholder when it closes, and its position is **set, measured and corrected by the difference** (`docPlaceFixed` in documents.js, `clampToolbarMenu`'s second pass in app.js), never trusted. **And it is anchored to the thing it is about, asked again, never to an element held from the gesture** (INBOX 421 c): a press that moves the caret makes the Live view redraw that line, and a held element is then detached and measures `0,0,0,0`, which put the word menu at the top of the window. `docFindingAnchor` asks the live mark, then the engine's coordinates for the finding's span, and a rect with nothing in it opens nothing; the menu re-anchors on the engine's own update (`docScheduleSuggestFollow`), and a caret the engine has not drawn (`coordsAt(...).offscreen`) is scrolled into view before a popup is placed at it. A `position: fixed` element takes its frame from the nearest ancestor carrying a `filter`, `transform` or `backdrop-filter`, and `.card` carries one whenever the background art is on: measured with the art on, a word menu asked for `left 952` and drew at `1245`, 45px past the right edge of the window, inside a stacking context no z-index could lift it out of | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/spellwide.js`, `scratchpad/ui-sweeps/menuanchor.js` |
| One feature drawn on several surfaces (the writing suggestions: the underline, the word menu, the panel, the dictionary) | one name in the copy, one builder per drawn object (`docFindingLine` for a finding: the kind dot in that kind's underline colour, the flagged words, then the reason, in that order everywhere; `docSuggestAnswers` for its answers), and one scope each: the underline says **where**, the menu answers **this occurrence**, the panel answers **the document**, the dialog holds the **standing rules**. No surface does another's job, and a second copy of either builder is how the four came to disagree in the first place | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/prosepanel.js` |
| A list that says where you are in something (an outline, a page strip) | the row you are on takes `aria-current` (`"location"` inside a document) and is painted **from that attribute**, `--accent-soft` plus a weight step, never colour alone and never a fill plus an accent edge; if the list scrolls, the marked row is brought into view by adjusting that box's own `scrollTop`, never `scrollIntoView` (it walks every scrolling ancestor, the page included) | `tests/test_ui_recipes.py` |
| A row in a list | `.timeline-row`'s shape, on `--row-h` and `--row-gap`: a grid of mark, content and actions, the content column the only one that grows, a transparent 1px border so the hairline it gains under the pointer moves nothing, and the ground arriving with the pointer rather than an edge drawn around every row. **A row's actions are one right-hand cell, centred on the whole row** (`align-self: center`) and always shown: never hidden until the pointer arrives, never hugging the card's top corner, and on a phone on their own line below the content rather than over the tick (Settings' templates, skills and personas, Reminders). A row with a mark and a title over one line of facts is the Library's Contents (`.contents-row`, INBOX 496): the mark a 2rem square, the facts `metaLine` | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/badges.js` |
| A note that is only on this device (saved while the server was away, waiting in the outbox) | **The pending note row**: `li.pending-note` at the top of `#entry-list`, drawn by `renderPendingNoteRows` in quick-note.js with the saved card's own title, text and `#tag` chips, one `chip item-label` that says "Waiting to save" (`ph:cloud-slash`, a title that says where it is kept), and **no actions that need the server** (no menu, no buttons). It is redrawn on every write to the outbox and goes when the note is sent; hidden under a filter. Not a toast: a note that is not saved yet has to be seen where the saved ones are | `tests/test_pending_note_rows.py` |
| A long list (hundreds of rows in one scroller) | each row takes `content-visibility: auto` with `contain-intrinsic-size: auto <its median height>` (07-whiteboard-misc.css, beside the board's culling), so a row more than half a window off screen is not styled, laid out or painted, and `auto` remembers the height it last drew at. Never on a row being edited, holding an open `<details>` or holding focus (containment clips what the row paints, and an editor's toolbar menu opens past it); a row's own menus are fine, `kebabMenu` sends them to `<body>`. Built with a date or a number in it, the row uses a formatter made once, never `toLocale*String` per row (each call builds a new `Intl.DateTimeFormat`). And a script that measures many rows reads them all and then writes them all, never both per row | `tests/test_css_invalidation.py`, `scratchpad/ui-sweeps/f2-trace.js` |
| A file attached to a note (a note's own file, a file its text links, a picture staged in Capture, a file waiting for Save, the read-only copy in a document, the graph's panel or the timeline) | `attachmentCard(spec)` in notes-list.js (`fileCard(name, url, size)` for a read-only surface): one `.att-card`, whatever the kind. A tile (the picture, or the kind's glyph on a tint of `--att-tint`), the whole name on up to two lines (`-webkit-line-clamp: 2`, `overflow-wrap: anywhere`, the full name on the `title`; never one line cut mid-word), and one facts line (`library-file-meta att-card-meta`: kind, size, the day it was added). **The card is the button that opens the file** (the lightbox for a picture or a document, a native player opening out under the card for a recording); everything else is one `kebabMenu`, grouped: Open, Download, Rename, Describe with AI (disabled with its reason when `aiIsOff()`), Edit description, Annotate a copy (pictures), Copy as a link, Remove. Rename and Remove appear only where the file is written down (`textarea` + `markdown`, or `attachment` + `onChange`); removing from a note's text offers Undo and deletes the bytes only once nothing uses them. Several cards sit in an `.att-cards` grid. What a click does is the lazy piece attachment-actions.js (`attachmentAction`), off the boot budget | `tests/test_attachment_cards.py`, `scratchpad/ui-sweeps/attachcards.js` |
| One line of facts about the thing a row or card names | `.library-file-meta` plus a handle of its own: short statements, dot separators, `--text-xs`, `--muted`, one rank. Never a block per fact, which is what all three of the Library's "this needs a redesign" reports turned out to be | `tests/test_ui_recipes.py` |
| A bar of actions for the things you have selected | `.library-contextbar.selectbar`: the count first, every action inside one `.library-contextbar-end` group, and `position: sticky` at `--selectbar-top` so the bar stays with you while the selection lasts. The ground is the accent tint stacked over `--modal-bg-opaque`, never the tint alone: a 14% wash reads right at rest and turns into a window once the list scrolls under it | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/selstick.js` |
| Two versions of the same text, and what changed between them | `docRenderDiff(host, ops)` over `docDiffLines` in documents.js: one `.doc-diff-line` per line inside the app's `.diff-viewer` box, a marker column so every line starts on one edge, unchanged runs counted in a `.doc-diff-gap` rather than printed, `.diff-added` / `.diff-removed` for the ink (the same two colours the chat's before/after card uses), and a `.doc-diff-hunk-head` per change where a change can be kept or skipped. One builder: the history dialog and the AI edit panel are the same object at two moments, and a second builder is how they would come to disagree about what a change is | `tests/test_document_diff.py` |
| Empty state | `.empty-state` with one sentence and one action | |
| A mark generated from a name (a persona, the person) | `nameMark(seed, size)` in app.js: deterministic from the name, drawn as SVG from the categorical palette, never fetched. A persona's goes through `fillPersonaMark`; an assistant reply in the chat draws its writer's (saved per turn) through `paintPersonaAvatar`, which keeps the live emblem for the app's own voice. **The person's** is seeded by `userMarkSeed()` (the profile's display name, or "You"), and its holder carries `data-user-mark="<size>"` so `paintUserMarks()` redraws every one of them at once when the preferences arrive or are saved: the chat's own bubbles (`.msg-user-mark`), the Settings head and the profile's head (`.profile-mark`). Never a `ph-user` glyph, an `<img>` or a second builder | `tests/test_ui_recipes.py` |
| A notice: one line the app says about what is on screen (the search index is stale, this answer is mostly the model) | `.notice`, with `.notice-warn` for something worth doubting (08-consistency.css). An icon from the vendored set as its first child, through `setLabel`, then one short line. A notice annotates what is beside it; an error is a toast, help is `data-help-for`, and `.empty-state` replaces content rather than annotating it. Two tones and no more, because a third needs a rule for when to use it. Neither tone uses a warn *fill*: a filled band over an answer reads as a failed answer, and an answer with less behind it than usual is not a failure. Added 2026-09-21 with CHAT_PLAN Phase 1's low-support line, which was the second surface to need one; the first, `.reindex-stale`, was built inline and now uses this | `tests/test_ui_recipes.py` |
| An icon-only control | a `title` as well as an `aria-label`, saying the same thing. An `aria-label` alone answers a screen reader and nobody else: somebody looking at a row of glyphs with a mouse has no way to find out what any of them do short of pressing one. A control that is disabled says why in that title too, since a greyed thing with no reason reads as the app being broken rather than as something not being ready | `scratchpad/ui-sweeps/vibecheck.js` |
| A surface whose data did not arrive | `surfaceFailed(el, what, retry)` in navigation.js, on the surface's own `.empty-state` element, cleared by `surfaceRecovered(el)` on the next good read; `loadSurface(el, what, run)` wraps a loader that throws. Never the empty state, which is a claim about the person's notes that a failed request is no basis for: measured with every request failing, four surfaces said "Your notebook is empty" over a full notebook and the dashboard printed "0 this week". A figure that could not be read is an en-dash with the reason on its `title`, never 0 | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/vibefail.js` |
| A guided tour of the interface (a card that points at a real control, over a dimmed page) | a step in `TOUR_SECTIONS` (tour.js): a selector, a side and one sentence, in a section. The card is `.card.tour-card`, `role="dialog" aria-modal="true"` so app.js's own Tab trap holds focus in it, placed by the window-coordinates rule above (set, measured, corrected, and **measured again every frame the card is up**, `tourWatchFrame`: a control that moves with no scroll or resize, content loading above it or a layer settling, is followed, and a layer drawn anywhere but where it was asked is placed again), flipped to the opposite side and clamped rather than ever covering the control it names, and a step whose element is missing, hidden **or not really on screen** is dropped from the run so the "3 of 7" counter renumbers rather than promising a step that is not coming. **A cut-out is never drawn outside the window**: a hole placed off the page leaves the dim with nothing to surround, which is what a target off the right edge produced (INBOX 280, measured at 2000x1140: `right - left` went negative, `width: -994px` was dropped as invalid, and the cut-out kept the previous step's 708px width at x 2994). `tourSpotlight` checks the clamped box before writing it and answers whether it drew one; when it did not, the card is centred and nothing is dimmed. Each step switches to its target's tab and Notes sub-tab first and then **waits** for the target to be on screen (`tourWaitForTarget`, up to 1.5s of frames), because a tab's content is fetched after `switchTab` resolves and a step measured too early is dropped for having nothing to point at, which from outside reads as a tour that never leaves the page you were on. Which tab is showing is asked of the pressed tab button, never of `localStorage` alone. The dim is a **cut-out**, and it is painted by **four `.tour-block-panel`s around the hole**, not by one sheet and not by a shadow cast out of the hole. `#tour-spot` paints no background and draws only the ring, so the described control is the page itself at full strength; the four panels carry `var(--scrim)`, take the presses so a step cannot be taken out from under its own card, and leave the hole pressable (a tour that says "press Save" and eats the press teaches that Save is broken). **The dim belongs on the panels because that is the only shape a probe can read.** It used to be `#tour-spot`'s own `box-shadow` spread 100vmax, whose reach depended on `vmax` and on its own corner radius inflated by the spread; `tourdim.js` and `test_ui_recipes.py` were both green while the owner photographed an undimmed band three times, because both were checking the four rectangles and the four rectangles were transparent. The panels are laid out from the same box as the cut-out and sized from `max(clientWidth, innerWidth)` so the scrollbar gutter is covered, and `tourdim.js` now walks `elementsFromPoint` over the window. **The step card is opaque**, `linear-gradient(var(--card), var(--card))` on `var(--modal-bg-opaque)`, the app's recipe for a surface whose legibility cannot depend on what is behind it: a plain `.card` is a 55% fill and the dashboard clock read through the step's own text. The way out is visible: an icon-only `.ghost.small` X in the card's head, `aria-label="Close the tour"`, beside the count, with Skip on the actions row and Escape both still ending the same run. **Before every step the tour closes whatever is open over the page** (`tourClearTheWay`: Settings, the palettes, the features browser, the shortcut sheet, every `openSheet` sheet through its own X, open dock menus) **and a control with something else drawn over it is not on screen** (`tourCovered`, five points through `elementsFromPoint`, skipping the tour's own layers): with the Atlas guide open every step used to light the guide instead of its control, which is what "broken on all the slides except the first one" was. A control that moves behind another one at a narrow width names it as the step's `or`, with an `orText` that says where it went (Settings and Timeline are in More on a phone), and a chrome step that is not drawn at this size at all is left out before the count is written, so the counter never changes mid-run. **On a phone the card is a sheet**, the window's width less its gutters, docked to the edge away from the control (`tourSheetPlace`). Keys aimed at a field outside the card are the field's, because the lit control can be typed in. A new subject is a section in that one table (the replay buttons in Settings, help and guide build themselves from it), never a second tour. **Sections chain and walk in** (INBOX 398): every main feature has a section of three to five cards on its own controls, never on its tab button; a run starts at a section and plays every later one, the count is per section ("Graph", "2 of 4"), and a section's last card offers "Next: Chat" as the primary with Finish as the ghost. A step says what it needs rather than doing it by hand: `tab`, `notes`, `library` (a sub-tab), `wb` (the boards list, or the newest board or map opened, never one made), `settings` (the modal opened at a section and kept open for that section's steps only), `need` (a question about the notebook, settled as the section starts so its count never changes), `unless` with `unlessText` (what a card says instead when that answer is no: the maps section with no map says so on its one card) and `media` (a step that exists on one side of a breakpoint). A control inside a closed `<details>` counts as hidden (a dock folds controls into its ⋯ below 1100 and 600, and the folded list keeps a layout box while nothing is painted), so such a step names the menu it folds into as its `or`, with words that say so; a settings step opens the `details.settings-fold` its control is in, and the tour folds it again when it ends | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/tour.js`, `tourdim.js` (the dim is painted, at every point), `toursteps.js` (every step of every section at 1440 and 390); `tour.js` walks every step of every section at 1440x900, 1184x760 and 390x844, with overlays open, a resize across the phone breakpoint and typing in the lit control |
| Two panes showing one document (a source pane beside its rendered pane) | the two are kept on the same place by a **line-to-block map**, never by a scroll fraction. `renderMarkdown` (navigation.js) stamps every block it draws with the source line it came from (`data-src-line`); `docScrollAnchors` (documents.js) pairs each stamp with that line's top in the editor (CodeMirror's `lineBlockAt`, which answers for the whole document, not `coordsAtPos`, which answers null off screen) and the block's own **rect, corrected by the pane's rect and scroll**, in the preview, never `offsetTop`, which is taken from the nearest positioned ancestor and ran 218px past the truth at 1440, 230px at 1024 and 146px with the sidebar collapsed (INBOX 281); the sync interpolates between the two nearest pairs and carries the end segments' slopes outwards. The stamps count lines in the string the preview rendered, so the title prefix and the stripped frontmatter are undone through `docPreviewLineShift`. A fraction is exact at both ends and wrong in the middle, because a picture is one line of source and four hundred pixels of preview and every such block shifts everything below it in one pane only: measured on a five-section document, the preview was 282, 292, 266, 404 and 550px out at the five headings, growing downwards. With the map: 0, 75, 0, 0, 0. The fraction stays as the fallback for a surface with no line map of its own | `tests/test_ui_recipes.py` |
| A syntax error or a completion list in a code document | CodeMirror's own linter, lint gutter and completion list, mounted by `docCodeTools` (documents.js) for code types only and never in Plain, and restyled in `docCmTheme` onto the tokens: the underline is the prose findings' wavy line in the kind's ink (`--error`, `--warn`, dotted `--muted` for a note), the gutter mark a dot in the same ink outside the line numbers, the hover and the list on `--modal-bg-opaque` because words laid over code must not read through, the chosen row `--accent-soft`. Checked where a real parser is: the browser for JSON (`docJsonErrorAt`), JavaScript, TypeScript and CSS (the Lezer tree), the server for Python, TOML, XML and YAML (`POST /documents/check-syntax`); never by running the file. **A fix for one** is an `action` on its diagnostic: drawn by the hover card as a `.cm-diagnosticAction` button on `--accent-soft` (never the library's dark slab), and listed at the caret by Alt+Enter through `openMenuAtPoint` with the two formats beneath, fixes first; never on Ctrl+., which the shortcut registry gives to stopping an answer. A fix is recomputed from the text when chosen (`docCodeFixNow`), never applied from offsets taken at lint time. **Pairs and Enter** are `closeBrackets` and the indent service in the same compartment (`docCodeEditing`), so they follow the file type and Plain exactly as the diagnostics do. **The list opens as you type** in a code type (`docCompletionExtras`, same compartment; prose keeps an inert completer): the language's own rows, Emmet rows in HTML where markup starts a line or follows a tag and in CSS where a declaration starts (detail "Emmet", the expansion previewed in `.cm-completionInfo` on `--modal-bg-opaque`), and after a CSS property's `: ` that property's own values only. The chosen row's rest is drawn after the caret as `.cm-ghostText` in `--muted`, taken with Tab; Enter stays the list's, Escape closes both. **A colour value** in CSS (and an HTML file's `<style>`) has a `.cm-color-swatch` before it, found from the tree: 0.8em square in the colour on a `--border` hairline at `--radius-inner`, and a click opens the browser's own colour picker, the pick written back in the value's own form (`docCssColorFormat`). **A name's one line** (a CSS property, an HTML element or attribute) is on the diagnostics' own hover card as `.cm-hover-doc`: the name in code type, the line in `--text`, a property's values in `--muted`; the lines are this app's own words (`DOC_HOVER_*`), never MDN's. **Indentation guides** are a `--border` hairline at the left edge of each indent step of the leading whitespace (`.cm-indent-guide`, one mark per step, never stepped in `ch`, which is not the code face's space); **bracket pairs** take `.cm-bracket-0` to `-2` by depth, `--accent`, `--syntax-keyword` and `--warn` each mixed 70% with `--text`, and a bracket in a string, comment, regex or HTML text is not one. **A code file's outline and breadcrumb are its symbols** (`docCodeSymbols`, the headings' own shape and rows), which jump and never move. **Sticky scroll** pins the enclosing scopes' first lines as `.cm-sticky`, an overlay on `--modal-bg-opaque` with a `--border` hairline and `--shadow-sm`, laid over the scroller rather than a panel (a panel resizes the scroller and the text jumps), each row column for column over the code. **Run** (`#doc-code-run`, a ghost small button beside Format, Ctrl+Shift+Enter) opens `.cm-run-panel` under the editor: a head row of ghost small worded buttons (Run again, Stop, Clear, Close) with the status in `--muted`, an HTML file's page in a sandboxed frame above a code-type log, rows on a `--border` hairline, errors and warnings in `--error`/`--warn` on their soft grounds, each row's `Line N` a link back; the code runs only in `/documents/run-sandbox` (`api/run_sandbox.py`), never in the app's own origin. **Format** is one ghost `#doc-code-format` button in the document's dock, shown for code types where the markdown strip is hidden (the two swap in `syncDocFileType`), with Shift+Alt+F and a palette row reaching the same `docFormatCode`: refused with a toast naming the line when the file does not parse, one undo step when it does | `tests/test_ui_recipes.py`, `tests/test_syntax_check.py`, `tests/test_code_editing.py`, `tests/test_code_completion.py`, `scratchpad/ui-sweeps/doccode.js`, `scratchpad/ui-sweeps/doccodeedit.js`, `scratchpad/ui-sweeps/doccomplete.js`, `scratchpad/ui-sweeps/doccodevs.js`, `scratchpad/ui-sweeps/doccodevs2.js` |
| Text the editor writes for you in a prose document (an expansion, a shortcode, a closing pair) | one more row kind in the prose list that already exists (`#doc-complete-list`, `renderDocComplete`), never a second popup at the caret: `li.doc-complete-fill` with the trigger in `<b>` and what it writes as `.doc-complete-detail` in `--muted` at `--text-xs` (a shortcode leads with `.doc-complete-glyph`), expansions above word rows; the chosen row's first line drawn after the caret as the code side's `.cm-ghostText`; Tab takes any row and **Enter only an expansion** (a guessed word never takes Enter). A trigger that is also a common word (`now`, `date`, `todo`, `hr`) counts only on a line of its own; `lorem` and `:shortcode` count anywhere. The strings are the `PROSE-FILL` region of documents-prose.js, pure, run in node. Pairs and smart punctuation are one `inputHandler`, never inside code, smart punctuation off unless Settings, Preferences turns it on | `tests/test_prose_autofill.py`, `scratchpad/ui-sweeps/proseautofill.js` |
| A menu that inserts a block where you are writing (the "/" menu, in every editing surface) | the one `#editor-menu` popup (editor.js): a `#editor-menu-list` listbox of rows from `editorBlockRows`, grouped in `EDITOR_GROUP_ORDER` (Recent, Basic, Structure, Callouts, Media, Embeds, Advanced, AI, Templates) under pinned `.editor-menu-group` headings; a row is `.editor-menu-tile` (the icon), the name over one `about` line, and the markdown it writes as a `kbd.editor-menu-keys`; `#editor-menu-preview` beside the list from 44rem renders the row's `sample` through `renderMarkdown`, inert. Search is `editorFuzzyRank`; arrows, Home and End, Tab and Shift+Tab between groups, Enter, Escape; the pointer moves the highlight only when it moves. A block needing a second choice asks in the same popup (the code block's `` ``` `` language step), never a dialog. A new block is a row in `editorBlockRows` plus its spelling below, in notes and documents alike unless it needs a document to mean anything | `tests/test_md_blocks.py`, `scratchpad/ui-sweeps/slashmenu.js`, `scratchpad/ui-sweeps/slashicons.js` |
| A block in somebody's markdown (a callout, columns, a contents list, a rule, a cited quote, display maths, an embedded document) | a spelling any other markdown reader shows legibly (`> [!kind]`, `:::columns`, `[TOC]`, `***`, `> -- Name`, `$$ $$`, `![[Title]]`), parsed only in the `MD-BLOCKS` region of app.js and drawn by its one builder (`mdCalloutElement`, `mdColumnsElement`, `mdTocElement` and `mdFillTocs`, `mdRuleElement`, `mdQuoteElement`, `mdMathElement`, `mdDocumentCard`), which the note card, `renderMarkdown` and the document's Live view all call, each passing its own text renderer. A callout kind is a row in `CALLOUT_KINDS` (icon, label, one line, aliases) and one ink in 05-sidebars-themes.css set as `--callout-accent` and mixed from the palette tokens; the tint, edge and icon tile are derived from it. **In the Live view a callout shows its kind once** (INBOX 486): the icon with a caret is the kind picker (`calloutMenuItems`), the first line's own text is the title (the kind's name stands in, muted, only when there is none), `>` and `[!kind]` never show there whatever the caret does (Source shows them), and an empty body carries a hint (`calloutHint`, "Write the note") that is not text; the "/" row writes the kind's name as the title and leaves the body empty with the caret in it. The HTML export's stylesheet (`DOC_EXPORT_CSS`) styles each block too | `tests/test_md_blocks.py`, `scratchpad/ui-sweeps/blocksrender.js`, `callouthead.js` |
| Acting on a rendered block (change its kind, fold, edit, copy, delete) | the block bar (`docBlockBarShow`, documents.js): a solid `.doc-block-bar` of `smallButton`s at the block's top right while the pointer is on it, lifted to body and placed by `docPlaceFixed`; the callout's kind is its own tile opening `calloutMenuItems` through `openMenuAtPoint`, the same list the Live view's `.cm-md-callout-kindbtn` opens. Every change is written through the surface after checking the source line is the block, and a delete offers Undo in its toast | `scratchpad/ui-sweeps/blockbar.js` |
| Spacing, type, radius, shadow, motion | the tokens above; a px in a stylesheet is a lint failure | `tests/test_style_scale.py` |
| A transition, a hover | a `--motion-*` duration and an `--ease-*` curve on every transition, never `all`; a hover is a colour (`--accent-surface-hover` for a solid button, `--hover-veil` over any other ground), never a `filter` | `tests/test_motion_tokens.py`, `scratchpad/ui-sweeps/f2-hover.js` |
| Motion (a selection that moves, a panel that opens) | **What moves is the compositor's**: `opacity`, `transform`/`translate`/`scale`, a colour, on the `--motion-*` tokens. **A selection** is the one indicator recipe (08-consistency.css, "motion: the selection glides"): the strip's `::before` anchored with `position-anchor: --glide` to the `.active` option, inside `@supports (anchor-scope: --a)`, `--motion-slow` `--ease-in-out`; a strip gets it by being a `.seg` (or joining that rule's list), never by script, the top bar's tabs alone excepted (`.tab-glide`, a measured box moved by `transform`, see Motion), and a family whose chosen option has its own corner or fill sets `--glide-radius`, `--glide-fill`, `--glide-ring` there. Its four insets are the one layout property in motion in the app, the trade written at the rule. **A panel** keeps its column or placement instant and moves only its contents: `aside[data-resizable]`'s children by `opacity` and `transform` toward the rail, a fixed side panel by `@starting-style` from its edge. **A page** fades in (`.tab-page`, `--motion-fast`, `opacity`) and leaves at once. **Never** a width or height in motion, nothing on first paint, nothing under reduced motion (instant) | `tests/test_motion_recipes.py`, `tests/test_cheap_animations.py`, `scratchpad/ui-sweeps/glide.js`, `tabglide.js`, `sidemotion.js` |
| A notification (toast) | `toast`, `toastAction` or `toastProgress` in status.js; it arrives and leaves by fading with 4px of travel (`toast-in`, `toast-out`, on `translate`), and every way out goes through `dismissToast`, never `note.remove()`, so none of them vanishes between two frames. **A toast yields to the focused control it covers** (WCAG 2.4.11): status.js's `focusin` listener puts `is-yielding` on `#toast-box` when a toast overlaps the control Tab just reached, and `#toast-box.is-yielding > .toast` fades to 0.12 and takes no clicks until focus moves off it; the box itself takes no clicks beside a narrow toast below 1100px, only its toasts do | `scratchpad/ui-sweeps/f2-skel.js`, `scratchpad/ui-sweeps/zoom.js` | `scratchpad/ui-sweeps/f2-skel.js` |
| A list whose first rows are on their way | `showSkeletons(list, n)` before the fetch and `clearSkeletons(list)` after it (app.js): the `.skeleton` placeholders at the height of the list's own rows, `aria-busy` while they show, only ever into an empty list; the list's own render replaces them. Never a spinner or a blank card where the shape of the content is known | `scratchpad/ui-sweeps/f2-skel.js` |
| An animation of anything | `transform` and `opacity`, never `width`, `height`, `top`, `left`, `margin` or `padding`. A bar that fills is a full-width box scaled from a left origin inside a track that clips (`.boot-splash-progress-fill`, 00-tokens-shell.css), never a box that grows: measured, the width version cost 121 layouts for one 2.4s crawl and the scaled one costs none. A box that genuinely does change size with content in it keeps its transition and states the reason in a comment on the line above, as `#phone-tab-dock` does | `tests/test_cheap_animations.py`, `scratchpad/ui-sweeps/animcost.js` |
| Copy | sentence case, no em-dashes, no exclamation marks, one line per section (a Settings pane's own description is at most 88 characters, which is one line at its 68ch cap) | `tests/test_no_em_dashes.py`, `tests/test_settings_pane_intro.py`, `scratchpad/ui-sweeps/paneintro.js` |
| A long Settings section's own index (jump links over a pane of four or more group heads and at least one and a half windows) | `nav.settings-index` built by `settingsIndexBuild` (settings-find.js, loaded on the first open of Settings): the pane's `h3` group heads as `button.settings-index-link`, sticky at the top of the pane on `--modal-bg-opaque` (never a tint alone: a translucent strip turns into a window once the pane scrolls under it), the Quiet button tier, and the head you are at marked from `aria-current="location"` (`--accent-soft` plus a weight step, never colour alone). A press scrolls the pane's own `scrollTop` to the head just under the strip (never `scrollIntoView`) and focuses the head. It exists only where it earns its place and is removed otherwise | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/settingsnav.js` |
| The settings a typed word matches (the search field in Settings' nav) | `ul.settings-results` under the field, one `button.settings-result` per setting (its own words over `Section · Group`), capped at eight, rows the Quiet tier; a press opens the section and rings the setting with `flashRevealed`, the way a catalogue row lands. Down from the field walks the rows, Enter opens the first. The section filter above them stays: the two answer different questions | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/settingsnav.js` |
| A model you can download, install or use (the Models screen's suggested downloads, and any model named by hand) | **The model card**, `article.model-card` built by `buildModelCard` (settings-models.js): a surface-3 tile in the group's surface-2 (no border), the name (`h5`), the group's starting pick as a `.chip` beside it, one line of purpose, one `.library-file-meta` line of facts (size on disk, the memory it asks for), what it is good at, the fit chip (`Fits`, `Tight fit`, `Too big here`, estimated from this computer's memory by the server, never in the client), what it is doing now (`Installed`, `In use for chat`), and a foot with **one primary action** (Download, Use for chat, Retry, or Cancel download while it runs) and a `kebabMenu` for the rest (Copy name, Remove). Cards are grouped by purpose under an `h4` and one line, in a `.model-grid`; the group's starting pick is the one filled button in its group, every other primary is tonal. A download shows its progress inline (`progress.model-progress` with a decimal "34% 1.0 GB of 3.0 GB") and is cancelled from the same card. Cards are **kept, not rebuilt, on every poll** (a signature per card; progress updates in place), or the open menu and the focus inside it are lost | `tests/test_ui_recipes.py`, `tests/test_model_cards.py`, `scratchpad/ui-sweeps/modelcards.js` |
| A model named by hand (Download another model) | One field and a Check name button under the cards; the answer is a sentence in `#custom-model-note` saying what the name is (an Ollama library model, a community model, a Hugging Face repository), where it downloads from and any warning, and the card for it, the same card as above, so progress and Cancel are the same. The check is `POST /models/inspect`, the same function `/models/pull` refuses with (`model_cards.inspect_model_name`): no network, no claim of a size | `tests/test_model_cards.py`, `scratchpad/ui-sweeps/modelcards.js` |
| A group head in Settings (the heading that names a whole `.settings-group`, e.g. "Model per feature", "Which ones it may use") | an `h3`/`h4` at `--text-lg`/650/`var(--text)`, sentence case, with a muted `--divider` line under the head (`#settings-modal .settings-group h3/h4`, 01-forms-settings.css). **Not** the `.card h3` eyebrow (12px, uppercase, muted): that recipe is for a minor label under a card's own title, and a `.settings-group` sits inside `.modal-card` so it inherited the eyebrow by descent alone, the same weak style as every subordinate label in the app on the one heading someone's eye has to land on when scanning a long page. **Inside its group**: a head after the pane title stands in a `.settings-group` (or a fold, a dock, the profile head), never loose on the pane (INBOX 464: ten were, at 12px) | `tests/test_style_scale.py`, `tests/test_settings_group_heads.py`, `scratchpad/ui-sweeps/groupheads.js` |
| Words in the accent colour (a link, an accent label) | `color: var(--accent-text)`, never `var(--accent)`, which stays for fills, borders and rings (Colour, above) | `tests/test_accent_text.py`, `scratchpad/ui-sweeps/accenttext.js` |
| The edge of anything you aim at that is not text (a text field, a select opener, a selected segment or option, an interactive chip, an icon on a fill) | **3:1 against the ground it stands on, through tokens only** (WCAG 1.4.11; INBOX 464). A field, a select opener and a suggestion chip draw `border: 1px solid var(--control-edge)` (a step stronger than `--ghost-btn-border`, the quiet button's measured hairline, because a field also sits on a settings group's grey well; `[data-contrast="on"]` makes it `--ink`); its hover is `color-mix(in srgb, var(--accent-text) 60%, var(--control-edge))`, never a pale accent mix, which measured 2.3:1 and was weaker than the resting edge. A selected segment (flat looks) is its 11% fill **plus** `box-shadow: inset 0 0 0 1px var(--control-edge)`; the tint alone measured 1.25:1. A chosen radio option row (`.check-row`, `.provider-option`) carries `inset 0 0 0 1px var(--accent-text)` because its input is hidden and the tint (1.15:1) was the only cue. A tab strip's active tab may rely on a heavier weight instead of a ring. An icon is never dimmed by `opacity` (`.ph-trail` was 0.7 and a muted caret measured 2.8:1): it takes its label's colour, or `--muted`. **Counted apart, a decision rather than a failure**: the borderless writing surfaces (the note title and body, the Ask line, the Writing room's tags and instruction, a document's title) have no edge of their own; the card or composer around them and their focus ring carry them, and `contrastui.js` lists them as `field-bare` so the list stays visible | `scratchpad/ui-sweeps/contrastui.js` (icons, SVG icons, focus rings, fields, checks, toggles, selected states, chips, text outside `.tab-page`; every tab, sub-tab, Settings section and main overlay, 1440 and 390, both themes, `CONTRAST=on`), `tests/test_control_edge.py` |
| The app's mark in an empty state or a head | an element with an id on `EMBLEM_SLOTS` (phone-shell.js), drawn by `renderBrandLogo` and turning with it; never a generic icon standing in for the mark | `tests/test_emblem_slots.py` |
| Atlas, anywhere it is drawn | `atlasAvatar(size, mood)` for head and shoulders, `atlasDraw(size, mood, level)` for the figure (atlas.js), or a `data-atlas-avatar="<px>"` host that `atlasDressMarks` fills, which keeps a plain icon as its fallback in the markup; each follows Settings, Appearance, Atlas style and Atlas look at once. Never a picture of Atlas, which would not follow either. Its gradients live in shared `svg.atl-defs` hosts, so a drawing moved out of the document loses its fill | `tests/test_name_mood.py`, `tools/avatar-lab.html` (every mood, pose and size on one page) |
| The assistant's head on a reply or a guide mark | `paintAssistantAvatar(holder, size)` (chat-agent.js; a reply head goes through `paintPersonaAvatar`, which sends the app's own voice here and keeps every other persona's generated face). It reads Settings, Appearance, Assistant avatar (`atlas`, the default, or `emblem`: the logo's p5 sketch drawn once and copied, assistant-avatar.js, still under Reduce motion) and repaints the open heads when it changes. The same head (`.msg-role.msg-role-assistant`: face, then name) opens Ask's answer (`.answer-title`), the writing room's draft (`.draft-head-label`; static `[data-assistant-head]` holders, `paintAssistantHeads`) and every guide row (`assistantHeadRow`), in the row the old title or label held, so no row grows. Never `atlasAvatar`/`atlasDraw` or a second emblem for a reply head | `tests/test_ui_recipes.py` (`test_an_assistant_head_asks_one_function_for_its_face`) |
| A character on the page (the corner companion) | the one companion, `#nm-buddy` (avatars.js): it chooses its own perch from the page's ledges and obstacles, rides with the panel it is on, and is placed, sized, recalled and hidden from its own menu and Appearance's Corner companion. A new surface does nothing for it: controls (buttons, fields, tabs, links, an editor) are kept clear by `NAME_MARK_BUDDY_NEVER_COVER`, and a new kind of control it must not sit on joins that list rather than moving the companion by hand. **It stacks with its perch**: perched on something that scrolls under a bar, it goes under that bar with it (`.nm-buddy-shutter`, `nameMarkBuddyRideClip`); perched on the bar itself it stays in front. **Enlarged, it is itself**: a double-click moves the companion's own element into its large view (`nameMarkBuddyVisit`), still doing what it was doing, and home again on Close; never a second drawing of it | `tests/test_companion_motion.py`, `tests/test_companion_stacking.py`, `tests/test_companion_toggle.py`, `scratchpad/ui-sweeps/companionscroll.js`, `companionpin.js`, `companionmenu.js`, `companionstack.js`, `companiontoggle.js`, `companionchat.js`, `companionviewer.js`, `companionfade.js` |
| A row of facts about a card where some facts open a list (a skill's "3 steps", "4 tools") | One `.skill-card-facts` row, every fact one `--skill-fact-h` box on one baseline: a plain fact is a `.chip`, a fact that opens is a `button.skill-fact-toggle` carrying `aria-expanded` and `aria-controls` and a trailing caret that turns. What it opens is a `.skill-fact-panel` *after* the row at the card's full width, never inside it, so opening one never moves another fact (INBOX 450: a `<details>` in the row pushed "4 tools" onto a line of its own). A list of identifiers in a panel is `code.skill-tool-token`, the code chip, at the fact height. Cards of uneven height are dealt into columns in reading order (`skillColumnCount`, like `libraryColumnCount`), never a grid whose rows stretch to their tallest card | `tests/test_ui_recipes.py`, `scratchpad/ui-sweeps/skills450.js` |
| A note's details line (category, score, tags, suggestions, the dates it mentions, links, the time) | **One line, never two**: `.entry-meta.note-meta` is `nowrap`, and `fitNoteMetas` (note-cards.js, one shared `ResizeObserver`, every line reset, read and folded in three passes so a list costs two layouts) folds what does not fit from the end: suggestions then tags into one "+N" chip (`.note-meta-more`, a press lists them through `openMenuAtPoint`, each row doing what its chip does), then the word facts keep their icon and lose their words (`.is-icon`, the words on the `title`), then they ellipsise; the category gives way last. **The time is the line's last fact at its right edge on every card**, never in the head row (the corner is the actions', and a time that faded there on hover was INBOX 446). A new fact on the line is a `.chip` with a `ph:` icon, so it can fold | `tests/test_note_meta_line.py`, `scratchpad/ui-sweeps/notemeta.js`, `scratchpad/ui-sweeps/notemetamore.js` |
| A word saying where an item came from ("Built-in", "Edited", "Yours", "you set this", "from the model", "default"), **or what state it is in** ("Installed", "Stopped", "Not ready yet", "Fits", "Tight fit", "In use for chat", "confirms first", "online": INBOX 461 (1)) | `chip item-label`, 11px muted type in a hairline box, one line, never a fill, on every surface; `is-yours` adds the accent edge and ink for "you made or changed this" (and "in use"), `is-ok` an ok edge and icon for ready, `is-warn` the warn edge and ink for a request to look. Beside a heading it centres on the heading's text (measured within 0.7px by `badgeinv.js`). Not this recipe: a count (a number pill), a reading badge laid over a picture (it needs a ground), a fact on a facts line (`.chip.item-fact`), and the dashboard's "Editing layout", which is words by the owner's call. A model card's labels are a row of their own above its actions, one line (INBOX 468). A named item in a list (Settings' templates, skills, personas) is the row (title, label, facts, description) beside its actions, which are a right-hand column centred on the whole item and always shown | `tests/test_badge_recipe.py`, `scratchpad/ui-sweeps/badges.js`, `scratchpad/ui-sweeps/badgeinv.js`, `scratchpad/ui-sweeps/modelcardfoot.js` |

The sweeps that say whether a new surface matches the rest are
`errors.js`, `contrast.js` (text), `contrastui.js` (everything that is not
text: icons, edges, focus rings, selected states), `docks.js`, `touch.js`,
`menus.js` and `kebab-viewport.js` under `scratchpad/ui-sweeps/`; a UI change is not
done until they are green and its numbers are in the commit message.

## Taken from Liquid Glass and the Human Interface Guidelines (2026-09-09)

Read from Apple's own pages (the Liquid Glass overview, "Adopting Liquid
Glass", and the HIG's materials, layout, toolbars, menus, sheets,
popovers, typography, colour, motion, buttons, tab bars, sidebars, search
and accessibility pages). What transfers to a web app with its own tokens,
what we already do, and what we deliberately leave.

### The one idea worth the most

Liquid Glass "forms a distinct functional layer for controls and
navigation elements that floats above the content layer". "Don't use
Liquid Glass in the content layer." "Use Liquid Glass effects sparingly ...
limit these effects to the most important functional elements." That is
INBOX 49's decision word for word: blur on the top bar, the sub-tab
strips, docks, menus, popovers and dialogs; never on a content card. The
one exception Apple names is ours too: "controls in the content layer with
a transient interactive element like sliders and toggles ... take on a
Liquid Glass appearance when a person activates it" (the switch knob and
the slider thumb light up on drag, nothing else in a card blurs).

### Rules adopted, with the token or recipe they land on

1. **Two glass variants.** Regular: "blurs and adjusts the luminosity of
   background content to maintain legibility of text"; use it "when
   components have a significant amount of text, such as alerts, sidebars,
   or popovers". Clear: "highly translucent ... for components that float
   above media backgrounds", with "a dark dimming layer of 35% opacity"
   when the content behind is bright. Ours: `--glass-filter` is the regular
   variant (blur plus saturate plus a luminosity lift); `--glass-filter-clear`
   (blur only) is the clear one, for a panel over the animated background
   or an image; take one of the two tokens, never a literal. A
   `.glass-clear` class (`--card` at 30%, paired with a `--glass-scrim` of
   35% ink when light) is added with the first surface that floats over
   media, in that commit. Never a third variant: `tests/test_ui_recipes.py`
   freezes the literals and fails on a new one.
2. **Scroll edge effect.** "Optimize for legibility when content scrolls
   beneath controls": the bar over a scroll region fades a soft edge under
   itself as content passes. Ours: `.dock`, `.notes-subtabs`,
   `.library-subtabs` and `header#top-bar` take a 16px `box-shadow` in
   `--scroll-edge`, shown only while the region is scrolled
   (`data-scrolled="1"`, set by one listener in app.js on the single bar
   whose bottom edge is against the top of the region that scrolled: it
   picks by measuring, because three bars can be stacked over one list and
   only the last of them has anything passing behind it). **A shadow, not
   the `::after` gradient this rule was first written as**: an absolutely
   positioned pseudo-element extends its bar's scrollable overflow, which
   turned `#notes-subtabs` into a 60/44 vertical scroller, and clipping it
   back hides the gradient with it. Built, INBOX 100.
3. **Concentric corners.** "Rounded shapes that are concentric to their
   containers": an inner radius is the outer radius minus the padding
   between them. Ours: `--radius-inner: calc(var(--radius) - var(--space-3))`
   and a lint that a `.card` child with its own radius uses it. INBOX 101.
4. **Vibrant colour on glass.** "Use vibrant colors on top of materials";
   "Use color sparingly, especially on glass"; "Avoid applying a similar
   color to toolbar item labels and content layer backgrounds". Ours:
   `--text` on a blurred surface already measures 14 to 15:1 (no
   `--text-on-glass` token was needed); accent only on the one filled
   control per surface.
5. **Toolbars group by function, icons over text.** "Group items that
   perform similar actions ... maintain consistent groupings"; "don't mix
   text and icons across items that share a background"; "Provide an
   accessibility label for every icon"; "Use the prominent style for key
   actions such as Done or Submit" (one). Ours: the dock grammar (three
   zones, hairline dividers, seven controls, one filled) is this rule; the
   lint holds it; a group is all icons or all text, never mixed.
6. **Menus.** "Prefer listing important or frequently used menu items
   first"; "Use menu item icons sparingly and with purpose"; "Consider
   using a checkmark to show that an attribute is currently in effect";
   "Show people when a menu item is unavailable"; "Prefer displaying a menu
   near the content it controls"; and, new: "an action sheet originates
   from the element that initiates the action". Ours: `kebabMenu` orders
   by frequency, the check mark on-state exists, disabled items stay
   visible and dimmed, and every menu anchors to its opener (never the
   screen edge).
7. **Buttons.** "Keep the number of prominent buttons to one or two per
   view"; "Use style, not size, to distinguish the preferred choice";
   "Don't assign the primary role to a button that performs a destructive
   action"; help buttons are "circular, consistently sized buttons that
   contain a question mark" and "avoid displaying text that introduces a
   help button". Ours: the ramp, Bin is never filled, the `data-help-for`
   '?' is round and unlabelled.
8. **Sheets and popovers.** "Show one popover at a time"; "Make a popover
   only big enough to display its contents"; "Avoid displaying popovers in
   compact views" (a sheet on a phone instead); half sheets are "inset
   from the edge of the display to allow content to peek through" and go
   opaque at full height. Ours: one popover open at a time (the outside
   click closes the rest), popovers become bottom sheets under 640px, a
   sheet has `--space-3` inset and the regular glass until it fills the
   height, then `--modal-bg`.
9. **Lists breathe.** "Organizational components like lists, tables, and
   forms have a larger row height and padding. Sections have an increased
   corner radius to match the curvature of controls." Ours: `--row-h`
   steps up one token at comfortable density; `.settings-group` radius is
   `--radius-lg`. (Apple also moved section headers to title case; we keep
   sentence case, the owner's rule.)
10. **Tab bar and sidebar.** "Use a tab bar to support navigation, not to
    provide actions"; "Don't disable or hide tab bar buttons"; "Consider
    automatically hiding and revealing a sidebar when its container window
    resizes"; tab bars can "recede when a person scrolls". Ours: the phone
    tab bar shrinks to icons on scroll down and returns on scroll up
    (UI Phase 9); the sidebar auto-hides under 1100px and is never hidden
    by default on desktop.
11. **Search.** "Place search at the top when there's no bottom toolbar";
    "Use tokens to filter by common search terms"; "Consider showing
    suggested search terms". Ours: INBOX 99e's operators become tokens in
    the Notes search box, suggestions under it.
12. **Motion.** "Don't add motion for the sake of adding motion";
    "Consider using fades when you need to relocate an object"; controls
    "fluidly morph into menus and popovers". Ours: a button that opens a
    menu scales the menu from the button's rect (`--motion-base`, spring
    easing), a fade for anything that moves more than its own width, and
    every one of these is off under Reduce motion and Performance mode
    except the progress indicators.
13. **Accessibility settings are inputs, not exceptions.** "People can ...
    turn on accessibility settings that reduce transparency or motion";
    "Make sure all your app's colors work well in light, dark, and
    increased contrast contexts"; "Let people use the keyboard alone".
    Ours: `prefers-reduced-transparency` turns Performance mode on,
    `prefers-contrast` sets `data-contrast`, every menu and dialog walks
    by keyboard (contrast.js and touch.js are the gates).
14. **Extra-large controls.** Controls "feature an option for an
    extra-large size, allowing more space for labels". Ours:
    `--control-h-xl` for the primary action on a phone sheet and the
    capture Save.

### Deliberately not taken

Refraction and lensing (a displacement filter on every glass surface is
the one effect measured as too costly on an integrated GPU; the lit rim
stands in for it), layered app icons, the background extension effect
under sidebars (our sidebar is a content panel, not glass), title-case
section headers.

### Where this goes next

INBOX 100 (scroll edge effect), 101 (concentric radius token and lint),
102 (clear variant: the token, built 2026-10-04), 103 (menus
morph from their opener; sheets inset and opaque at full height), 104
(phone tab bar recedes on scroll); UI Phase 9 carries 104. Each is a
half-day for Opus with the measurement named on its INBOX line.

## Buttons: the ramp

Three tiers, and a view should be readable from them alone:

| Tier | Recipe | Use |
| --- | --- | --- |
| **Filled** | `button`: accent fill, `--on-accent` text, the accent glow | The one action a surface is *for*. One per card or dialog, a dashboard of widgets has one per widget (Save, Start), not one for the page. A Settings page is one surface however many groups it has: one filled at most, the rest `ghost` (`tests/test_ui_recipes.py`; Import & export had five). A dialog whose action changes with its stage (Suggest then Replace, Record then Save) writes the later button `ghost` and hands the one fill over with `stagePrimary(first, later, laterTurn)` (app.js); `tests/test_consistency_contract.py` holds every modal and pane to one, with no allowance. |
| **Tonal** (quiet since 2026-09-27) | `button.ghost`: a `--btn-quiet-bg` face (the field's white in light, a breath of white in dark), a 1px `--ghost-btn-border` edge measured to 3:1 against its ground, no shadow; `--ghost-btn-bg` under the pointer, `--ghost-btn-bg-hover` pressed, a 2px accent ring on focus-visible; a 32px floor (`--button-min-h`, 44 under touch). An `.icon-only`/`.icon-button` standing alone is a ghost: no fill, no edge, the glyph in `--muted`, the tint and `--ink` on hover | Every other action that stands on its own: a card's one-off control, a panel, a popover, a dialog. |
| **Quiet** | the same button inside something that already frames it, a dock, a card's `.entry-actions` run, a floating whiteboard panel: no fill, no edge, no shadow, a tint and an edge under the pointer | A *run* of actions. The container is the affordance; the tint is the state. |
| **Plain** | tab-bar buttons, `.linklike`, `.status-item`: no fill at rest, a tint on hover | Navigation and inline actions that sit in running text or a strip that is already a well. |

**The tonal/quiet split is the answer to one report made three times**, most
recently "all the buttons need to actually look like buttons with affordance,
not just shapes with text in them". The edge was tried, then removed on a
real measurement (22 outlined-and-shadowed buttons in one Notes toolbar,
beside outlined inputs and an outlined card, is three lines of texture), then
asked for again, because removing it left every button in the app a flat tint:
a silhouette with no rim, which is precisely a shape with text in it.

Both measurements are right and they are about different buttons. So the
split is not what the button is, it is **whether anything already frames
it**. On its own, a button draws its own edge and its own small lift. In a
dock, a whiteboard panel, or a run of row actions on a card, the frame is
already drawn and the button stays quiet until the pointer arrives. Measured
after the split: the 52 outlined boxes a note list put on screen went to 0,
and the largest remaining run of tonal buttons anywhere is 5.
`[data-contrast="on"]` puts an edge on the quiet tier too.
`tests/test_ui_recipes.py` pins the tonal recipe so a fourth pass cannot
flatten it again.

**The tonal tier draws no shadow, and the reason is dark mode.**
`--shadow-sm` is seven times heavier in dark than in light, because a shadow
over a #0e1017 page has almost no contrast to work with, and it was sized
for a panel. Under a 28px control it measures `rgba(0, 0, 0, 0.35)`, and
eight of those in one strip is a row of dark rims: reported as "the border
shadow on elements like these are too strong". The hairline is what makes a
tonal button read as pressable; a lift is what made it read as heavy. The
filled tier keeps its glow, and there is one of those per surface.

A selected toggle (`.active`) is the filled recipe: on is the accent, not a
darker tonal.

**Segmented controls are two things, and they are drawn differently on
purpose.** A *tab strip* (`[role="tablist"]`: the tab bar, the Notes and
Library sub-tabs) sits on the surface, the tab bar is a `--field-inset`
well, the sub-tab strips are `.tabs-line` (text and a 2px line, no box; see
the recipe index). A *choice control* (`.seg`,
`.segmented-control`: view toggles, sort, Ask/Agent) is a `--chip-bg` well
with no edge, whatever else it is inside. Measured: 28 `.seg` groups were
already that, and the Graph's layout/colour pickers plus the chat dock's
mode switch were the three drawn as cards, now conformed, not given a
third recipe.

**A segmented track's corner comes from this table and nowhere else.**
Measured 2026-09-21 and 2026-09-23 (`scratchpad/ui-sweeps/segradius.js`):
five track radii, none written down, so every new toggle picked the nearest
token. `tests/test_ui_recipes.py` (`test_a_segmented_track_is_rounded_by_the_table`)
fails a rule that rounds a track any other way.

| Where the control stands | Track radius | At the default 14px |
| --- | --- | --- |
| A choice control on its own: a form, a card, a popup, the document view and history toggles, the assistant's verbs | `--radius-choice` | 15.4px |
| A boxed tab strip (the OCR rail's `#ocr-rail-switch`; the tab bar is on the same token; the Notes and Library strips are `.tabs-line` now and have no track) | `--radius-strip` | 11.2px |
| Inside a `.dock` bar: the bar's corner, which its buttons already use | `--radius-md` | 8.4px |
| Inside the chat dock, where every control is a pill | `--radius-pill` | 999px |
| A `.tabs-line` strip (`#notes-subtabs`, `#library-subtabs`, `#doc-sidebar-tabs`) | `0` | 0 |

The third row is the one-corner-per-row rule (08-consistency.css): a 15.4px
well beside 8.4px buttons in the same bar was two radii in one strip, which
is what that rule was written to remove. So the toolbar toggles keep the
bar's corner rather than folding into the choice row, and the chat dock's
pills are the same rule in a row of pills.

**Pills are rare, and never dashed.** The owner, 2026-09-23 (INBOX 394 h):
"are these pills a sign of ai vibe coding??" Yes: a fully round capsule on
every control is one of the clearest generated-UI tells, a dashed one most of
all. Measured before (`scratchpad/ui-sweeps/pills.js`, 1440, light): 90
controls in 14 groups drawn as capsules, including the Library's kind row and
the Boards filter (navigation), the Write tab's starters and the dashboard's
Jump to row (actions), and every category and fact chip. The rule:

| What it is | Corner |
| --- | --- |
| A navigation or filter row you pick one of (`.library-chip`: the Library kinds, the Boards filter, Reminders' Open/All/Done) | `--radius-md`, the button's corner, with the selected one filled |
| An action (the Write tab's starters) | `--radius-md`: it is a button |
| A label: a category, a tag, a fact (`.chip`, `.dock-chip`, the skill facts, a legend entry) | `--radius-sm` |
| A capsule | Only where `PILL_CONTROLS` in `tests/test_ui_recipes.py` names it with its reason: the chat composer's row, a round icon button, a floating bar over a canvas, a count badge, a switch |

A dashed edge means an empty slot you can fill (a drop zone, an unset trace
end), never "this one is special": a skill is marked by its lightning icon.
A chip does not lift on hover; its tone changes.

**A choice control's selected segment is `--accent-surface` behind
`--on-accent`, with no shadow, whichever of the two forms it is.** The
radio-backed form (`.segmented-control`: `#doc-ai-verb`, `#graph-layout`) is
the same object as the button-backed one (`.seg`) and the recipe index has no
room for a second reading of it. Reported as INBOX 107d, "I want to get rid of
and redesign these mini menu bars ... they desperately need a modern redesign
or alternative". Measured beside `#doc-view-seg` on one screen before
(`scratchpad/ui-sweeps/segbars.js`): track radius 8.4px against 15.4px,
padding 2.4px against 4px, segments 26px tall at 12px type against 28px at
16px, and a selected state of `rgba(79,109,245,0.14)` behind `--ink` plus a
`0 2px 8px` drop shadow, against a solid accent behind white. A 14% tint
behind body-coloured text is not a selected state you can see across a popup,
and a segment inset in a well does not cast a shadow out of it. The answer to
"redesign or alternative" was neither: it was `.seg`'s numbers. What stays
particular to the radio form is only the plumbing, the visually hidden
`input[type="radio"]` that gives the group its native arrow-key navigation.

**Form rows share a label column.** `--form-label-col` (9rem; `-wide`, 11rem,
for Search relevance) is the width every `.setting-label` reserves, so the
controls in adjacent rows start on one edge.

## Icons

Phosphor (`<i class="ph ph-*">`) is the default for every icon in the app.
One deliberate, narrower exception: **download/export actions use a plain
Unicode arrow glyph** (`⬇`, `⭳`) instead, chat export, both document
export buttons, the whiteboard export button, and the settings support-
bundle download all do this consistently. It reads as inconsistent seen in
isolation; checked across all five call sites before touching any of them,
it is the app's actual (if quiet) convention for this one action family,
not drift, leave it alone rather than "fixing" it to Phosphor.

---

## Hierarchy

Levels must be **visibly ordered**, and they were not: `h2` ranged 0.92–1.15rem
depending on where it sat while `h3` was a flat 0.92rem, so in the sidebar a
section title was the same size as the subsections beneath it.

| Level | Size | Treatment |
| --- | --- | --- |
| `.card h2` | `--text-body` | weight 600, tight tracking, **a heading: names a thing** (was 650, which a font with static weights, Segoe UI and most system faces, resolves to Bold 700: every card title drew a step heavier than designed) |
| `.card h3`, `.eyebrow`, `.nav-group-label`, `.launch-label` | `--text-sm` | weight 600, muted, uppercase, 0.04em, **an eyebrow: labels a section of controls** |
| `h4.setting-subhead` | `--text-md` | weight 600, sentence case, a subdivision inside an eyebrow's group |
| `.dash-getting-started h2` | `--text-h3` | titles a whole panel, not a card |

**Eyebrow vs heading.** An eyebrow labels a *section of controls* (THEMES,
WHICH ONES IT MAY USE, THE AI, START SOMETHING); a heading names a *thing*
(All notes, Recently added, a note's title). They are never both capitals,
a subdivision under an eyebrow is `h4.setting-subhead` in sentence case, not
a second run of caps (About → Updates was two stacked caps labels of the
same weight before this, and read as rivals). There is one eyebrow recipe,
measured: the app had two (12px/600/0.04em on cards, 11.2px/700/0.06em at
75% opacity on the Settings nav and the dashboard launch rows) doing the
same job in two voices. The one place caps sit directly over a title is the
dashboard hero's wordmark kicker, which is branding, not a section label.

Note that `h3` is **smaller** than `h2`, not one step down from it. Small caps
carry the distinction, which frees the size to drop, two sizes 0.08rem apart
cannot signal a level change on their own, and trying to make them was what
made the old hierarchy invisible.

**Use weight, colour and case before reaching for another size step.** The type
scale has ten steps because an interface needs ten *sizes*, not ten *levels*.

---

## Adding a feature

1. **Reach for a token first.** If you are typing a rem value into a `margin`,
   `padding`, `gap`, `font-size` or `border-radius`, stop, there is almost
   certainly a step for it.
2. **A page goes in `.tab-page`** and sets only its internal `gap`.
3. **A panel is a `.card`.** It brings its own padding, radius and shadow. Do
   not re-specify them.
4. **A group of choices is `.check-row`**, not bare labels, each option gets a
   hit area, a hover and a selected state, so the group is scannable without
   hunting for a filled dot.
5. **Confirming something destructive is `confirmDialog(...)`**, never
   `window.confirm`: the desktop shell does not reliably implement it, and a
   button gated behind one that returns `undefined` silently does nothing.
6. **Run the lint.** `pytest tests/test_style_scale.py`.

### When a token genuinely doesn't fit

Add the value to the relevant `ALLOWED` set in `tests/test_style_scale.py`
**with the reason**. There are three entries there today, two indent steps for
the document outline, which must stay evenly spaced relative to each other
rather than land on a scale built for gaps between unrelated things, and a
negative pull-back that cancels a list's own indent exactly.

Being made to write the reason is the entire mechanism. An entry with a vague
reason is a value that should have been snapped to the scale.

---

## Why the lint matters more than the conversion

The conversion is a one-off. Without something that fails, the next tab built
in the next session reaches for whatever looks right at the time, and the drift
starts again, which is exactly how it got here, over six tabs and as many
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
explain layout decisions and therefore quote lengths, `test_frontend_ids.py`
had to learn the same lesson about markup comments quoting ids.

---

## Surfaces, tiles, chips and the popover shell (UI modernisation, Phases 1-3)

Added by the modernisation pass; every rule here was measured before and
after in Chromium (`scratchpad/ui-sweeps/`), and `tests/test_ui_signatures.py`
ratchets the counts so they cannot drift back.

- **Two card sizes, as tokens.** `.card` sets `--card-pad-y`/`--card-pad-x`
  (panel: `--space-6`/`--space-7`, was `--space-7`/`--space-8` before INBOX 446 (5)); `.card.compact`, `.sidebar-panel` and
  `.dash-widget` set both to `--space-6`. Anything that has to cancel the
  padding to reach the card edge (the sidebar head row) references the token,
  never a step. The 720px block tightens the tokens, not `padding`.
- **A card inside a card is a tone** (`--surface-2`, transparent edge, no
  shadow, no blur), never a second bordered pane.
- **One head row.** `.card > .row:has(> h2)` is `--control-h-lg` tall with
  `--space-5` under it, and the `h2` drops its own bottom margin. The sidebar
  collapse toggle is `--control-h-lg` square, so the sidebar head, the
  Library head and a widget head are one height.
- **The shell's inset is `--page-gutter` everywhere**: the top bar, the
  status bar and the page share one x for the logo, the first card and the
  first status item.
- **Rows have two gaps.** `--space-3` inside a control group, `--space-4`
  between groups. The two 60-control formatting strips (`.doc-toolbar`,
  `.note-toolbar`) are the one `--space-1` exception.
- **One button radius**: `--radius-md`, from the base `button` rule. Tiles
  (`.quick-link`, `.start-step`) are one recipe: `--card` fill,
  `--glass-border`, `--radius-md`, no shadow, `--accent-soft` on hover; a tile
  inside a card is `--surface-2`.
- **The interactive filter chip** (`.library-chip`, the chat composer's
  Skills/Web/Plan): `--chip-bg` tint, transparent 1px edge, pill radius;
  active is the filled recipe. Not an outlined pill.
- **The floating control** (`.scroll-top`, `.graph-zoom`): `--card` fill,
  `--glass-border`, `--glass-shadow`, `--radius-md`; the buttons inside a
  strip are plain. **The help dot** is the one round icon button, on purpose
  (every "?" in the app is it).
- **One popover shell.** `.action-menu`, `.select-menu`, the toolbar menus,
  the nav-history menu, the chat model panel, the help popover and the AI
  status popup share one rule at the end of `07-whiteboard-misc.css`:
  `--modal-bg-opaque`, `--border`, `--radius-lg`, `--glass-shadow`, no blur.
  The notifications panel takes that ground, edge and shadow but is a
  **panel** (`--radius`, `--panel-pad`, the dialog head): see "A popup
  window or panel" in the recipe index. Opaque because CLAUDE.md records the ghost-text
  bug the 96% tint caused over the note editor. A new floating surface joins
  that selector list; it does not declare its own shell.
- **Glass is material, not effect.** `backdrop-filter` stays on the top bar,
  status bar, sidebars, sub-tab strips, panels and floating controls, and is
  off on dashboard widgets and library cards (measured 28 → 4 blurred layers
  on the Dashboard, 25 → 5 on the Library). Background art defaults to 45%.
- **One control size.** Text fields and selects read `--text-md` from the
  base rule; a textarea is a writing surface and reads `--text-body`.
- **Hover changes tone, never position.** No `translateY`/`scale` on hover;
  no transitions on `left/top/width/height` except a progress bar filling.
- **One focus ring**: the base `:focus-visible` (2px `--accent`, 2px offset).

## Control height

```
--control-h-lg: 2rem    /* 32px, was 2.25rem (INBOX 446 (5)) */
--control-h-body: 2.25rem /* 36px, the composers' rows (Capture, Write with AI, Ask, Chat, a document's AI card), was a literal 2.5rem */
--target-min:   1.75rem /* 28px; 2.75rem (44px) under a coarse pointer or below 820 */
```

**Measured against native references** (`scratchpad/ui-sweeps/density.js`,
1440x900): 36px was the commonest control on every tab, against 28 to 32px
in Apple Notes, Things, Linear and Obsidian. The top bar's tabs and the
Notes and Library sub-tab strips are segmented controls, so their segments
take `--target-min` in a 2.4px or 4px well and their labels `--text-md`;
the top bar is 48px (was 56).

One more thing has to match for a row of controls to read as a strip rather
than as a pile: **their height.** The chat dock declares `--control-h` and
every select, button and segmented control in it is that tall.

It is deliberately *not* a spacing token. A hit target is a control's own size
(the role `--radius` plays for corners), and snapping it to a gap step would
make it move with the density setting, which is not what density is for.

The failure it prevents is the one this whole document is about: the segmented
control brought its own padding and stood four pixels taller than the selects
beside it. Nothing lines up, no edge agrees with another, and the row reads as
assembled rather than designed, the "slop features joined together" complaint
in miniature, at four pixels.

### And zero the margins, not just the heights

Reported after the first attempt, which had matched the heights and looked
fine in the stylesheet: *"some are higher or lower than each other and
different heights."*

**A margin on a flex item is centred with the item.** `.seg` carries
`margin-bottom: 0.5rem` from the stacked forms it was built for, and under
`align-items: center` those 8px do not become a gap, they sit the control 4px
*above* its neighbours and make its group 8px taller, which pushes the next
group 4px down in turn. Two visible offsets, from one declaration in a rule
three thousand lines away.

> **The rule:** a row of controls neutralises the outside spacing its controls
> arrive with (`margin: 0`), and the row's own `gap` is the only thing between
> them. Anything else means every control added later has to be checked
> against every base rule that might have given it a margin.

The same applies to a control's own vertical padding: keep it horizontally,
give it up vertically, and let the declared height decide.

Where a row's box grows (a chat composer with an autogrowing textarea), align
to `end` rather than `center`, so the buttons stay level with the line the
caret is on instead of drifting up the side of it.

### Where this is applied

The pixel figures in this list (45px, 36.8px, 2.3rem, 40px) are what each
row measured on the day it was fixed, at the old 36px control; the rule they
illustrate stands, and every one of these rows now reads `--control-h`
(32px) or `--control-h-body` (36px).

Not every toolbar has been through this yet, treat a row that hasn't as a
gap, not as a deliberate exception, and give it its own `--control-h` before
adding a control to it:

- `.chat-dock-controls` (`04-chat-dock-appearance.css`), the original.
- `.graph-toolbar` (`03-dashboard-widgets.css`), shared by the Graph and
  Timeline tabs' primary rows. Added after measuring a real ~15px gap
  between the search/select controls (45px, from the global form-field rule)
  and the buttons beside them (~30px), close enough to pass a glance, wrong
  enough to fail a ruler. Covers `select`, `input[type=text|search]`,
  `button`, and `.segmented-control` so a text input, a select, a button and
  a segmented radio group can all sit in the same row and read as one strip.
- `.graph-options` / `#timeline-options` (`03-dashboard-widgets.css`), the
  folded-away "tuned once" panels behind each tab's Options button. Only
  `button` is height-locked here; sliders and switches are deliberately their
  own native size rather than stretched to match, since forcing a slider
  thumb to a button's hit-box height would misrepresent it as clickable
  chrome rather than a drag control.
- `.library-toolbar` (`00-tokens-shell.css`), shared by the Library tab and
  the Notes tab's "All entries" row (`#browse` in `index.html`; same class,
  reused markup). The rule covered `.library-search`, `select`, `.seg` and
  `.seg button`, but Notes' own toolbar adds two plain `<button class="ghost
  small">`s (`#select-btn`, `#search-help`) that Library's own toolbar
  doesn't have, not inside a `.seg`, so the selector list missed them.
  Measured at 30.39px against the row's 36.8px (`2.3rem`) `--control-h`,
  the same failure shape as `.graph-toolbar`, just the buttons short instead
  of the inputs tall. Fixed by widening `.seg button` to plain `button`,
  which covers both without duplicating a rule.
- `.capture-field-row` (`07-whiteboard-misc.css`), `.draft-controls`
  (`04-chat-dock-appearance.css`) and `.ask-query-row`
  (`07-whiteboard-misc.css`), the Notes tab's Capture, Write-with-AI and
  Ask panels, none audited before this round. All three had the same
  three-heights-on-one-row shape: a `select`/`input` at the global 45.19px
  form-field height, a plain `button` at 40px, and a `.ghost` button at 42px
  (the border, under `box-sizing: border-box`). `2.5rem` (40px) rather than
  the toolbars' `2.3rem`, since these rows carry full-size `Save`/`Draft it`
  actions, not a `.small` toolbar strip.
- `#batch-bar` (`02-chat-graph.css`), the Notes tab's select-mode batch
  action row (`Move to…` / Move / Tag / Delete / Done). The category select
  (45.19px), `.small` `Move` (28.39px) and `.ghost.small` `Tag`/`Delete`/
  `Done` (30.39px) were three more heights on one row. `2rem` here, since
  every control is already `.small`.
- `#reminder-magic-row` (`05-sidebars-themes.css`), the Reminders tab's
  natural-language add row. Smaller than the others (it was a 44px
  `textarea.autogrow` against a 42px `.ghost` `Add` button, 2px) but the same
  shape, fixed by matching the button's height to the textarea's own
  `min-height: 2.75rem`: both are 44px now, and `textarea.autogrow`'s floor is
  shared with the capture box, which has its own 11rem floor above it.
  The tab's main `.reminder-form` row and the filter `.seg` were already
  correct, checked, not assumed, before moving on.

`.doc-toolbar`'s two rows (`04-chat-dock-appearance.css`), the Documents
editor's metadata/actions row and its formatting-button row, named as an
open question in an earlier HANDOVER entry, were measured and are
**already correct**, not a missed instance. The formatting row's buttons are
uniform 29.19px. The metadata row's title input (45.19px) sits beside a
`row space-between`-justified stats/actions group, not edge-to-edge with
it, a `space-between` title-left/actions-right header, not a strip of
controls sharing one boundary, so a height difference there doesn't read as
misalignment the way it does within `.doc-actions` itself (which is
internally uniform, all `.ghost.small`).

---

## What is not done yet

Recorded honestly, because this document should not read as further along than
it is. See ROADMAP §35L.

- **Most of this has still not been checked in a browser**, but it now *can*
  be, and the parts that were are marked as such. Chromium and Playwright are
  in the sandbox and the app runs on localhost (CLAUDE.md has the recipe). The
  chat header and dock were measured and screenshotted in both themes; the tab
  bar was measured at five widths. Everything else here was reasoned from the
  stylesheet and bounded so no single value moved more than 0.1rem, which is
  not the same as verified. **Look at what you change; it costs a minute.**
- **Motion** is a user setting a few components still ignore. Density is done,
  it is a multiplier over the spacing scale now. Duration is done as of this
  pass (the `--motion-*` scale above); *honouring* `prefers-reduced-motion`
  everywhere is not, still per-component `@media` blocks, not a single rule.
- **The tab bar** is at the width where another tab hurts, which matters for
  the unbuilt Library tab (§4), decide whether it absorbs existing tabs or the
  bar gains an overflow *before* building it.
- **The timeline's line/branch view needs more than this pass gave it**,
  screenshotted live (9 seeded notes, populated, not empty): the SVG canvas
  reserves a fixed height regardless of content, so a normal note count
  leaves most of the card blank below the spine; the active band has no
  visible label painted on the canvas itself (only in the "N notes · N
  bands" line above it); and notes sharing a bucket stack vertically with no
  jitter or connecting structure, which reads as a pile, not a branch. None
  of this is a token or colour problem, it's `renderTimelineBranch`'s own
  layout math (`app.js`, §10C) sizing the canvas and placing dots without
  regard to how much content is actually in it. A real fix is a layout
  change, not a CSS pass, and risked being a half-implementation attempted
  under this pass's own budget, scoped here instead of guessed at. See
  ROADMAP item 10.
- **The document editor was screenshotted live and looks fine**: title
  field, outline, word count, toolbar, AI edit/extract-notes actions all
  present and visually consistent with the rest of the app. Its real gap is
  the one BACKLOG.md §5 already names (wiki-links, a slash menu,
  live-preview editing, sub-pages), a feature/product question, not a
  design one, and correctly out of this pass's scope.


---

## The principles this system is an implementation of

Added after a direct instruction: *"I shouldnt be having to tell you to
consider all these ui/ux principles, they should be part of design.md and
you should be sticking to them throughout development."*

That is correct, and the four sections above (spacing, type, corners,
control height) are already three of the four classical CARP principles
wearing implementation names. Naming them, adding the fourth, and, where
possible, giving each a **number a session can measure itself against** is
what this section is for. A principle with no measurement is a preference;
a principle with one is a check.

### C: Contrast

Contrast is what makes a thing look like what it is. The palette carries it
(`--ink` vs `--muted`, `--accent` vs `--chip-bg`), and the failure mode here
has never been "not enough colour", it is **two things that differ slightly
for no reason**, which reads as an accident rather than a distinction.

> **The rule:** if two things are different, make them clearly different. If
> they are the same kind of thing, make them identical. Nothing in between.

Text contrast is 4.5:1 minimum for body copy (WCAG AA), 3:1 for large text
and for the boundary of a control you are meant to find. `--muted` on
`--card` is the pair to check when adding a theme. **Dim by colour, never by
`opacity`**: a label at 0.6 or 0.75 opacity over a light card fell to 3.2 to
4.2:1 (INBOX 433); `--muted` is the quiet colour that still passes.

**Non-text contrast is measured too** (WCAG 1.4.11, 3:1; INBOX 464, "there is
still some colour contrast issues"). `contrast.js` reads text only; `contrastui.js`
reads icon glyphs (with the opacity of every ancestor folded in), icon-sized
SVGs, focus rings (also a wrapper that takes the ring), field, select and
checkbox edges, toggle tracks, a selected segment against its well, interactive
chip edges, and the text outside `.tab-page` (the header, the tab bar). Same
ground rule as `contrast.js` (translucent layers composited, a gradient ground
counted as skipped, never passed), hover read off (the pointer is parked), no
transitions. Run it at 1440 and 390, `THEME=dark`, `CONTRAST=on`, and
`LOOK=<preset>` for the other looks. Measured on the default look, same data, before
and after (INBOX 464): 1440 light 79 findings (37 field edges, 25 selected
states, 6 bare writing surfaces, 6 chips, 3 focus rings, 1 SVG icon, 1 icon),
1440 dark 74, 390 light 51, 390 dark 49, `CONTRAST=on` 79 and 74; after, 0 in
every category except the 4 to 6 bare writing surfaces, which are counted
apart (recipe index, "The edge of anything you aim at").

**WCAG 2.2 AA is the bar** (the level Australian government guidance points
to). Three sweeps check it against a running app, each saying what it cannot
see: `scratchpad/ui-sweeps/axe.js` (axe-core over every tab, sub-tab and
Settings section, both themes), `zoom.js` (200% and 400% reflow, WCAG text
spacing, focus not obscured) and `srtree.js` (Chromium's accessibility tree:
landmarks, headings, live regions, the skip link, dialog focus). No real screen
reader runs in the sandbox; what NVDA, JAWS or VoiceOver say aloud is not
verified by any of them. `tests/test_a11y_wcag22.py` pins what they found.

### A: Alignment

**The weakest part of this app, measured.** Count the distinct left edges of
every visible element wider than 120px on a screen; a composed layout has
two to four. Measured at 1440×900:

| Screen | Distinct left edges |
| --- | ---: |
| Dashboard | **37** |
| Graph | **35** |
| Notes | **32** |
| Library | **25** |
| Reminders | **16** |
| Chat | 13 |
| Timeline | 9 |

Thirty-seven means essentially nothing lines up with anything, and it is the
most likely single cause of *"it feels fake and unprofessional but I cant
place it"*, misalignment is felt long before it is seen.

> **The rule:** every element sits on an edge something else already
> established. A new element that needs a new left edge is a sign the layout
> wants a grid, not that the element wants a margin.

This is the acceptance criterion for the shell work in
[roadmap/REDESIGN.md](roadmap/REDESIGN.md) §R6 item 6: **if a change does not
reduce that count, it did not fix the thing it was for.**

### R: Repetition

The token scales *are* repetition, and `tests/test_style_scale.py` enforces
them. The gap they did not cover was **control size**, because a class can
be consistent in its declarations and still render at five heights.

Measured before `--target-min` existed: `button.small` (the most-used
control class in the app) rendered at **19, 24, 25, 26 and 30px**, decided
entirely by whether a given button held an icon, a word, or both. Five
heights for one class.

> **The rule:** a control class declares a height (or a floor). Content never
> decides how tall a control is.

### P: Proximity

Related things sit together; unrelated things get a gap. The failure here is
the one the Library screen had: six stat tiles and, directly beneath them,
the same six filters as chips, *adjacent* but not related, because they
were the same control twice.

> **The rule:** before adding a control, find the one that already does it.
> Proximity is meaningless if the neighbours are duplicates.

---

## Voice

One voice, so labels do not read as three people's work (UI modernisation,
Phase 6). Measured before this was written: "No saved chats yet, ask
something!" beside "Nothing of this kind yet." beside "Your notebook is
empty, capture a thought to begin": three tones for one situation.

- **Sentence case** everywhere except eyebrows (`.card h3`, the nav group
  labels), which are the one uppercase recipe.
- **Verbs on buttons**: "Save current look", "Reset to default", "Add",
  "Move to bin". Never "OK", never a noun on its own where a verb fits.
- **No exclamation marks.** Nothing in this app is that exciting.
- **An empty state is one component**: `.empty-state` with an `.empty-icon`,
  an `.empty-title` that says what *would* be here, one sentence saying how
  to get it, and, where a single action exists, one button. Not a grey
  line.
- **Errors say what to do next**, inline under the control that failed;
  toasts are for background work finishing. "Ollama isn't reachable: check
  Settings → Models and try again." (the exact string `skill_runner.py`
  raises), not "Error".
- **Say the thing, not the mechanism.** "Reading the model's own
  specification…" is fine; "Fetching /models/spec" is not.
- **The notebook is "your notebook"; the model is "the AI" or "the model",
  never "I".** The app narrates; the model speaks in the chat and nowhere
  else.

## Hit targets: `--target-min`

```
--target-min: 1.75rem   /* 28px, the floor under every interactive thing */
```

**Icon-only buttons are measured, not listed** (0.3.3): a button with an
icon and no words is only recognisable in a browser, so
`scratchpad/ui-sweeps/iconfloor.js` (in `gate.sh --sweeps`) walks every tab,
a document, a board and Settings in a touch context and fails on any under
44px: 296 measured at 1024, 106 at 390, none under.

Distinct from `--control-h`, and the difference matters: `--control-h` is a
**strip's** declared height, scoped per toolbar, and exists so a row reads as
one strip. `--target-min` is a **global floor** that applies to a control
wherever it sits, including the many that belong to no strip.

WCAG 2.2 AA ("Target Size (Minimum)", 2.5.8) sets 24×24 CSS px. 28px clears
it with room for a border. Measured violations before this token existed:

- `#semantic-search-toggle`, `#library-semantic-toggle`,
  `#library-show-binned`: **32×18**.
- The reminder rows' checkboxes, **13×13**, barely half the floor and
  genuinely fiddly with a trackpad.

**A finger gets 44px wherever it is** (INBOX 392). The token is 2.75rem
below 820 **or under a coarse pointer at any width**: every touch-floor
block is written `@media (max-width: 819.98px), (pointer: coarse)`, because
width is a proxy for the pointer and it fails at 1024, which is an iPad in
landscape (measured with a touch context at 1024x768: search boxes, sub-tabs
and dock buttons at 36px, status items at 28). A block that also changes
layout stays width-only; the floor is split out of it. A mouse at 1024 keeps
28. `tests/test_ui_recipes.py` holds the `:root` declaration to that query.

A `min-height`, never a `height`, so a strip declaring a taller
`--control-h` still wins and a control that wraps to two lines still grows.
**Not a spacing token**, for the reason the control-height section already
gives: a hit target must not move with the density setting.

The one deliberate exception is a control drawn by a sibling, the switch
pattern, where the input is clipped to nothing and the switch is the real
target. Those are excepted by name in `01-forms-settings.css`, not by
accident.

**The painted switches are still 32×18.4, and that is honest rather than a
gap** (MODERNISATION_AUDIT.md Brief 8 measured the three ids above at
32×18.4 after this section first claimed them fixed). The pill's paint must
stay that size, a `min-height` on the input made it a 32×28 slab with the
knob adrift, reported within the hour, so the *target* is a transparent
`::before` on the input that overhangs the pill by 6.4px above and below
(`07-whiteboard-misc.css`): `elementFromPoint` 4px outside the pill returns
the input, and the pill looks exactly as it did.

---

## Motion: and the one rule that is not optional

Durations come from the `--motion-*` scale. Beyond that:

> **Every indefinite animation needs a `prefers-reduced-motion` branch, and
> the branch keeps the information.** Stopping a spinner is right; removing
> the thing it was telling you is not.

Both animations added in this pass follow it: the working ring (`.spinner`)
keeps its place and breathes instead of turning (a slow opacity pulse, the
one movement that travels nowhere), and the streaming caret stays visible and
stops blinking. Someone who asked for less motion is the person least able to
infer "this is still loading" from text quietly appearing. The ring used to
be swapped for a still "…" here, which took the sign away with the motion.

### And the one that costs money on someone else's phone

> **An animation moves `transform` or `opacity`. It does not move `width`,
> `height`, `top`, `left`, `margin` or `padding`.**

Those six make the browser lay the whole page out again on every frame, and
the frames an animation runs on are the ones already least affordable: a cold
boot, a scroll on a phone, a laptop on battery. `transform` and `opacity` are
handed to the compositor, which does not lay anything out.

The difference is measured here, not assumed. `scratchpad/ui-sweeps/animcost.js`
counts the layouts the boot splash's progress bar forces over its 2.4s crawl:
121 when the bar animated `width`, 0 once it became a full-width box scaled
from a left origin, with the same painted geometry to the tenth of a pixel.

The recipe for a bar that fills, since that is the case this keeps coming up
for: the **track** keeps the geometry, the border, the rounded ends and
`overflow: hidden`; the **fill** is `width: 100%` with no radius of its own and
`transform: scaleX(<fraction>)` from `transform-origin: left`. The fill must
not carry the rounded ends, because a scaled box scales its radius into an
ellipse.

`tests/test_cheap_animations.py` fails a `transition` or `@keyframes` that
names one of those properties. The way past it is a reason in a `/* ... */`
comment on the line above, and there is one in the app: `#phone-tab-dock`
(10-responsive.css) really does change size with content inside it, where
`translateY` would take the bottom off a 44px touch target and `scaleY` would
squash the icons. `box-shadow` is not covered, on purpose, and the lint's own
docstring says why.
