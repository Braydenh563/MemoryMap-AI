# Responsive and Liquid Glass: what is left

Rewritten 2026-09-09 at the end of the Phases 9-and-10 sitting (Brief 21).
The scope of that sitting was narrowed by the owner mid-session: **the
desktop and tablet bands only** (>= 1100, 820-1100, 600-820). The phone
band (< 600) and INBOX 104 were taken out of it entirely and become
**UI_MODERNISATION_PLAN Phase 11**, a session of its own.

What that sitting built is in `HISTORY.md`, "Moved from the plans,
2026-09-09", under UI_MODERNISATION_PLAN: the tab strip fitting its own row
between 600 and 820, INBOX 100 (the scroll edge effect), 101 (the concentric
corner token and its two lints) and 103 (menus opening out of their opener).

Every number below was measured in Chromium against
`bash scratchpad/ui-sweeps/serve.sh 8790 /tmp/mm-8790` seeded with `seed.js`.
Re-measure before changing anything.

## How to reproduce the numbers

```bash
bash scratchpad/ui-sweeps/serve.sh 8790 /tmp/mm-8790      # own port, own data dir
BASE=http://127.0.0.1:8790 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
  node scratchpad/ui-sweeps/seed.js
BASE=… WIDTHS=1440,1024,820,600 node scratchpad/ui-sweeps/errors.js   # background flag
BASE=… WIDTHS=600,660,720,819,1024,1440 node scratchpad/ui-sweeps/tabfit.js
BASE=… node scratchpad/ui-sweeps/scrolledge.js
BASE=… node scratchpad/ui-sweeps/onglass.js      # and THEME=dark
BASE=… node scratchpad/ui-sweeps/contrast.js     # and THEME=dark
BASE=… WIDTH=390 node scratchpad/ui-sweeps/touch.js
```

`tabfit.js`, `scrolledge.js` and `onglass.js` are new this sitting.

## The state at the end of it

- `errors.js`: **0 errors, 0 layout findings at 1440, 1024, 820 and 600**,
  on the base tree and again after each step. No horizontal page scroll at
  any of the four.
- `contrast.js`: **0 low-contrast items in both themes**, seven tabs and ten
  Settings sections. This is also the dark-theme pass the previous list
  asked for (item 10 below is therefore closed for text contrast, and open
  only for the surfaces a ratio cannot see).
- `tabfit.js`: green at 600, 660, 720, 819, 1024, 1440.
- `scrolledge.js`: green on notes, library, timeline, reminders, chat.

---

## 1. Phase 11: the whole phone band (< 600), including INBOX 104

Taken out of Brief 21 by the owner. Everything the previous version of this
file listed for 390 belongs to it and is repeated here so nothing is lost:

- **`#wb-topbar` is 104px at 390**, two rows, the largest remaining piece of
  phone chrome. `#wb-topbar` in `frontend/index.html` (about line 3329),
  `.wb-topbar` in `frontend/css/07-whiteboard-misc.css`. It has seventeen
  controls and no `.dock-more`; the cheapest correct move is the one
  `foldDockArrange` already makes elsewhere. Expect 104 to 44 at both 390
  and 768, which is +60px of canvas at each.
- **Short tab captions below 480.** The captions are hidden there because
  "Dashboard" needs 68px in a 56px column. A `data-short` per tab rendered
  with `content: attr(data-short)` is the fix, but "Dashboard" to "Home" and
  "Reminders" to "Alerts" are copy decisions: **ask before writing either.**
- **The dashboard's `.launch-row-start`** is a column of five 60px
  full-width buttons at 390, 300px of the 419px of quick actions.
  `frontend/css/03-dashboard-widgets.css` near line 1290. Five big shortcuts
  or ten small ones is a product call; measure both.
- **Library at 390**: dock 96px, sub-tab strip 46px and chip row 36px, first
  card at y=341. Folding the chip row into the dock's `Filter` menu below
  600 (`foldSiblingsIntoMenu`) is the shape that already exists.
- **Notes at 390**: dock 96px, search on its own row. The identity zone and
  the search field could share a row if the heading became the field's
  placeholder; that is a design change, sketch it first.
- **The documents editor at 390 was never measured.** Run
  `node scratchpad/ui-sweeps/editor.js` at 390 and add a `documents` row to
  `chrome.js`'s `TABS`.
- **INBOX 104**, the tab bar receding on scroll down and returning on scroll
  up, never hidden.
- **The sheet half of INBOX 103**: a sheet inset by `--space-3` and turning
  `--modal-bg` at full height. Deliberately not built this sitting: the
  sidebar sheets are one rule at `max-width: 819.98px` covering both the
  tablet and the phone, and giving the tablet an opaque sheet while the
  phone keeps a glass one would be worse than either. Build it once, for
  both bands, in Phase 11.

## 2. INBOX 102, and the measurement that changes the question

Open, with its numbers in UI_MODERNISATION_PLAN's placed list. In short:
`--text-on-glass` has nothing to fix (menu rows are 15.25:1 in light and
14.14:1 in dark, and contrast.js finds nothing under 4.5:1 in either theme),
and `.glass-clear` on `.whiteboard-floating-panel` would reverse a recorded
decision. The recommendation there is to build the clear variant *with* a
surface that genuinely floats over media, and to drop `--text-on-glass`
until something measures badly.

## 3. INBOX 94, background animations

Untouched this sitting. `startBgArt` and `BG_ART_BUILDERS` in
`frontend/settings.js` (about line 2496). What the item asks for: a measured
frame cost per style, a still frame under Performance mode, no seams at the
edges, and an intensity slider that changes something visible at every step.
The frame cost is measurable here (`requestAnimationFrame` deltas in
`page.evaluate` with each `bg-style` set through the appearance preference);
the seams need a screenshot of the canvas edges at two window sizes.

## 4. INBOX 60, the dashboard start section

Untouched this sitting, and it is the largest open item in the plan. The
recommendation is written on the item and has not been taken: one "Start"
row that fills the width, the stats as a compact strip with a sparkline for
the week and the streak, the skills row showing the last-run time and a Run
button per skill, a "Continue" tile for the last note or document touched,
with the band's height unchanged. `frontend/dashboard.js` and
`frontend/css/03-dashboard-widgets.css`.

## 5. The tab strip still takes a row of its own from 600 to 1100

Not a bug, and now deliberate, but worth stating because it is 50px of
chrome on every tablet and small laptop: the header is 106px at 600 and 720,
120px at 819 (the 44px targets) and 108px at 1024, against 56px at 1440.
Measured with `tabfit.js`, the strip needs 498px at 600 and 696px at 1024
while the space beside the wordmark and the controls is 171px and 521px, so
it cannot share the row at any width below about 1100 without hiding the
wordmark, which was reported twice. The only untried lever is icons instead
of captions from 820 down; measure before believing it, since seven icon
buttons at 44px plus gaps is already 340px.

## 6. A real iPad, and a real on-screen keyboard

Unchanged and unchangeable here. Every number in the 820-1100 and 600-820
bands is an emulated viewport with `hasTouch`. A real iPad differs in three
ways this cannot see: non-zero safe-area insets, Safari's own chrome moving
as you scroll, and a hardware keyboard changing `hover` and `pointer`
without changing the width. `--keyboard-inset` is verified to be written, to
be `0px` with no keyboard, and to be read by both bottom docks; its
behaviour with a keyboard up is reasoned, not observed.

## 7. A keyboard-only pass at each band

`scratchpad/ui-sweeps/keys.js` exists but has not been run against the
sheets, the folded arrange zone or the menus' new open animation. Three
questions it should answer: does focus enter a sheet when it opens and
return to the toggle on Escape (Escape is wired, focus return only on that
path); is a sort select inside a closed `<details>` still reachable by Tab;
and does the roving tabindex still work on the tab strip.

## 8. Found, not fixed

`menus.js` times out at its last step, clicking a `.select-opener` on Chat
after the model panel has been opened and dismissed. It times out
identically with Reduce motion on, where the menu animation added this
sitting does not run at all, so it is not that change. Nobody has looked at
why.
