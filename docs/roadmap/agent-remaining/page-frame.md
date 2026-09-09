# The page frame and scroll batch: what is done, what is not

> Six reports about the shell rather than any one feature, each with an owner
> screenshot. Measured against a real Chromium, both themes, 1440x900 and
> 1280x720 unless noted. Server: `bash scratchpad/ui-sweeps/serve.sh <port>
> <data dir>`, seeded with `scratchpad/ui-sweeps/seed.js`.

## Fixed, with the numbers

### 3. AI skills sidebar not 100% height

Owner: *"the ai skill sidebar isnt 100% height."* True, but only once
scrolled. `#library-view-skills` is `#skills-sidebar`'s own `100cqh`
container-query ancestor, and container-query units follow the queried
element's **content** box. `body.scroll-top-visible` was adding
`--scroll-top-clearance` (53.6px measured) as `padding-bottom` to that same
element, so the back-to-top button appearing shrank the very size `100cqh`
reads, while the sidebar's `position: sticky; top: 0` did not move.

Measured at 1440x900, scrolled past 400px (button visible): sidebar
711.4px down to 657.8px, a 53.6px gap opening under its rounded bottom corner
while the scroll area's own border-box stayed 711.4px. Fix: moved the
clearance to `.skills-split > main` (07-whiteboard-misc.css), the column
that actually needs it, the same split `#tab-notes .layout > main` already
uses. After: sidebar stays exactly the scroller's own height (711.4px at
1440x900, 532.1px at 1280x720) at every scroll position tested (0, 450,
800). Screenshot in the commit shows the sidebar reaching the same bottom
edge as the message list beside it, both themes.

Commit: `cab1eac`.

### 5. Dashboard heatmap too small

Owner: *"the heatmap on the dashboard is a little small."* Measured: 2.72px
cells in a 306px-wide widget, since 53 weeks of 3px gaps alone (159px) outweighed
the room the cells themselves got. `--heat-cell-max`/`--heat-gap`
(03-dashboard-widgets.css) are now the one declaration of both numbers;
`dashboard.js` reads them back (`getComputedStyle`) instead of duplicating
them, measures the widget's real available width, and shows however many of
the *most recent* weeks fit at the real cell size, dropping older columns
rather than shrinking every column to fit a whole year. A `ResizeObserver`
repaints on resize, so the "wide" toggle (Edit layout) earns back more real
weeks instead of stretching the same set into bigger gaps.

Measured at 1440x900, default (narrow) widget: cell 2.72px up to 11.70px (the
12px cap), grid height 41px → 104px. Widened: cell 11.77px, 312 cells
(~44 weeks) vs 144 (~20 weeks) narrow. Screenshot in the commit: distinct
rounded squares filling the widget, the busiest-day cell clearly readable.

Commit: `8519ee2`.

### 6. Chat panel shadow reaches into the gap: partly fixed, real cause found

Owner: *"in the chat tab, the main chat panel shadow actually reaches all
the way down on the gap."* `#chat-main` is the one card in the app that is
`height: 100%` of its page, so only `--page-bottom` (24px, both themes, both
widths) ever sits under it. Diffing a shadow-off render against the default
found the standard `--glass-shadow` (12px offset + 32px blur) was still 16
RGB units darker than the bare background at the very last visible row:
real, but clipped mid-fade rather than faded out.

Fix: `#chat-main` now uses `--shadow-sm` (DESIGN.md's own smaller tier,
"resting cards") instead of the floating-panel tier, keeping `--glass-rim`
(the top specular lip is about reading as glass, not about shadow reach).
Not a one-off value: an existing documented tier, chosen because this is
the one card that never floats over a neighbour below it. Measured, dark
theme, x=880: diff peaked at -16 sustained through the last visible row
before; now peaks at -12 on the first row and is 0 by the third.

**Found, not fixed, said plainly why.** Most of what the owner's screenshot
shows is not this card's shadow. `html`'s own fixed background
(`radial-gradient(700px 500px at 85% 90%, var(--blob-b), …)`,
00-tokens-shell.css) sits at that exact screen position on *every* tab, both
themes: confirmed by hiding `#tab-chat .layout` entirely and re-screenshotting,
the identical teal patch, no card present. Chat is the one tab where nothing
sits in front of it (100% height, no neighbour below), so it is the one
place this always-present art is seen unbroken. That art is deliberate (the
owner, an earlier session: *"with the glass, I still want to be able to see
background animations"*), so repositioning or dimming `--blob-b`, or
deciding it should stay exactly as is, is a cross-tab aesthetic call, not a
page-frame fix. **Next step**: if the owner still sees this after the shadow
fix, take it to an Opus session as a `--blob-b` placement/opacity question,
with this file's screenshots as the starting evidence, rather than reopening
the shadow.

Commit: `6502f77`.

## Investigated at length, not reproduced: say plainly, don't invent a fix

### 1. Square page containers

Owner: *"the containers of all the ui in each tab page have hard corner
rectangular edges ... the shadows make the cut off pretty obvious."*

Swept every element (min 60x30px, on-screen) on all 7 tabs plus all 7
Library sub-tabs, for **any** element carrying a `box-shadow` while its own
`border-radius` computed to `0px` on any of its four corners: the exact
shape a rounded shadow "cutting off" against a square box would produce.
Checked at 420px, 1024px, 1280px and 1440px width, both themes, both an
empty profile and the seeded one (13 items): **zero matches, every run.**
Spot-checked the bottom-right corner of six cards individually
(`#chat-main`, `#graph-card`, `#reminder-list-card`, `.dash-hero`, the Notes
"browse" card, the Timeline card) with real screenshots, cropped to the
corner: all cleanly rounded, no artifact.

This branch already carries `de53d90` ("Concentric corners are a token, and
a lint keeps them one", INBOX 101) and the wider radius-tier work in
DESIGN.md section "Corners, derived from the user's setting", both merged into
this worktree from `origin/claude/epic-ramanujan-8xocc0` before this batch
started (this worktree was cut before that work landed, then fast-forwarded
here: see the merge at the top of this session's log). Reading the report
against what actually renders now: it does not reproduce. **Next step**: if
the owner has a fresh screenshot (post this branch's radius work), get the
exact tab and, ideally, the browser's viewport size from them: nothing in
this sweep found a candidate to fix blind.

### 2. Sidebars past the scroll end

Owner: *"the panels and sidebars in windows actually go quite far down below
where the scroll should stop."* Measured every sticky/height-constrained
panel's `getBoundingClientRect().bottom` against its own scroll container's
`bottom`, at 1440x900 and 1280x720:

| Panel | 1440x900 | 1280x720 |
| --- | --- | --- |
| `#sidebar` (Notes, Categories) | -24px (i.e. 24px short, never over) | -24px |
| `#chat-sidebar` | -24px | -24px |
| `#doc-sidebar` (open a document) | -24px | -24px |
| `#skills-sidebar` (Library › AI skills) | **+53.6px over, before the fix** | not separately measured, same mechanism |
| Settings modal's `#settings-nav` | 0px (exact) | 0px (exact) |

Every one of the panels/sidebars whose scroll container is the page itself
(Notes, Chat, Documents, Settings) sits *short* of the scroll end by exactly
`--page-bottom`, never past it, whether scrolled or not. The **one** real
overrun found anywhere in the app was `#skills-sidebar`, see report 3
above, already fixed in commit `cab1eac`. No second offender turned up after
checking every `position: sticky` selector with a height/max-height rule in
`frontend/css/*.css` (23 occurrences; the rest are sticky toolbar strips
with no bottom constraint to overrun). Reading this report against what
renders: report 2 and report 3 describe the same bug from two angles: it is
fixed. **Next step, if the owner still sees an overrun**: get the specific
tab and panel: this sweep did not miss a sidebar, so a fresh report likely
means a fresh regression, not this one recurring.

### 4. Dashboard back-to-top button

Owner: *"no back to top button appears on the dashboard??"* Extensively
tested and could not reproduce: the button correctly shows at scrollTop >
400 on the Dashboard tab in every scenario tried:

- Cold boot (no tab click at all, whatever the app lands on by default)
  and warm boot (explicit `#tab-btn-dashboard` click).
- Empty notebook and the seeded profile (13 items, full widget grid).
- Real mouse-wheel scroll (`page.mouse.wheel`) and programmatic
  `scrollTop` + dispatched `scroll` event.
- Light and dark theme.
- "Edit layout" mode on and off.
- 1440x900.

In every case: `.scroll-top` gets `class="scroll-top visible"`, `opacity:
1`, positioned correctly at the bottom-right of `#tab-dashboard`, not
covered by any element (`coversAFormPrimary` false), and a cropped
screenshot shows it rendered whole, un-clipped, sitting at the corner of the
last visible widget card. `scrollTopTargetEl()` resolves the Dashboard tab
to `scrollingPage()` (`.tab-page:not(.hidden)`, i.e. `#tab-dashboard`
itself) exactly as intended: there is no `NESTED_SCROLL_TABS` entry
diverting it to a different, non-scrolling element, which was the leading
hypothesis going in.

**Said plainly: not verified as broken.** This does not mean the owner
didn't see it: it means this session could not reproduce it after a wide
test matrix, so guessing at a fix would be exactly the "rebuilt without
checking" mistake this project's standing orders warn against. **Next
step**: ask for the viewport size and whether "Performance mode" or
`data-glass="off"` was active when it was seen (untested combination here),
and whether the notebook at the time was genuinely tall enough to need
400px of scroll on that specific window.

## Second batch: three INBOX items (73, 83, 89), fixed and resolved

Merged and pushed by the orchestrator between batches, then fast-forwarded
into this worktree before starting. All three fixed, gated, committed, and
moved out of `INBOX.md` into `HISTORY.md`'s "INBOX resolved, 2026-09-09"
section (`scratchpad/inbox_resolve.py 73 83 89`).

### INBOX 73: mute-notifications toggle disabling itself on close

Owner: *"'Mute notifications except reminders' toggle disables itself when
the settings close."* Reproduced with Playwright route interception rather
than guessed at, in two shapes: (1) check the box, Save, then anything that
re-shows Preferences (closing and reopening Settings does, via
`showSettingsSection` -> `renderPrefs`) fires a fresh GET while the PUT is
still in flight, and the GET can win, replacing `prefsCache` wholesale with
the pre-save value; (2) delaying the PUT leaving the browser at all (a slow
connection) makes a concurrent GET win outright, leaving the checkbox wrong
*forever*, not just mid-flight, since nothing re-reads it once the PUT
does succeed.

Fixed in `frontend/app.js`'s `savePrefs()`/`renderPrefs()`: the built
payload is written into `prefsCache` immediately, before the PUT's await
(closes case 1), and the PUT's own promise is held in
`prefsSaveInFlight`, which `renderPrefs()` awaits before doing its own GET
(closes case 2 outright, rather than narrowing the window). Measured with
the fix: both scenarios end checkbox/cache agreeing (true/true), where
case 2 previously ended false/true and stayed that way. Commit `1422575`.

### INBOX 83: Tools settings' two wall-of-prose paragraphs

Owner: *"Tools settings: the big paragraphs ('How many are offered at
once', 'Small model mode') become '?' popovers."* Done with the existing
`data-help-for` recipe (no JS needed, `initHelpToggles()` already wires
every `[data-help-for]` at boot): one line in place, the original
paragraph behind a "?" that opens a `.help-body` popover, verified live to
open/close correctly and to obey "one popover at a time". Commit `e6e48a9`.

**Other settings sections with the same pattern, not converted (the brief's
own instruction: list them, don't convert them all).** A sweep of every
`<p class="muted">` in the Settings modal at 35+ words, with its nearest
heading (approximate: a few of these may actually belong to the item after
the named heading, this is a start-here list, not a precise catalogue):

| Section | Near | Words |
| --- | --- | --- |
| Models | "Utility model (filing, digest & writing fixes)" | 46 |
| Models | "Reading text (OCR: scanned PDFs, and text in images)" | 35 |
| Skills | "Share" | 67 |
| Skills | "Add your own" | 42 |
| Templates | "Share" | 46 |
| What it remembers | "Add your own" | 40 |
| What it remembers | "Add your own" | 45 |
| Tools | "Add your own" | 39 |
| Appearance | "Status bar" | 40 |
| Packages | "Packages" | 41 |
| Packages | "Embedding models" | 39 |
| Web search | "Your SearXNG instance" | 89 |
| Web search | "Your SearXNG instance" | 35 |
| Background tasks | "Running now" | 39 |
| Data (backups) | "Backups" | 37 |
| Account & security | "If you forget your password" | 62 |

The Web search "Your SearXNG instance" one (89 words) is the longest
survivor and the most obvious next candidate if this list gets picked up.

### INBOX 89: glass sheen strength, opacity and blur

Owner: *"sheen strength, opacity and blur don't do anything."* Measured
all three with `getComputedStyle` against `#top-bar`, a dialog and a
`.card`, glass sheen and the animated background both switched on first
(the card's own blur is conditional on the art being on, INBOX 49, so
testing with it off reads as this bug even when it isn't):

- **Opacity: already correct.** `#top-bar`/`.card` background alpha
  scaled exactly with the slider (0.549 at 100%, 0.0275 at 5%, the same
  ratio); dialogs correctly did not move (`--modal-bg` is a fixed tier,
  never tied to this slider, by design).
- **Blur: correct on dialogs, wrong on the top bar.** Dialog blur measured
  14px -> 30px correctly. `#top-bar` stayed at a hard-coded `blur(18px)`
  the entire time, close enough to `--glass-blur`'s own 14px default that
  only moving the slider ever exposed it. The same literal 18px was on
  `.toast` and the mobile bottom-tabs bar too. All three now read
  `var(--glass-blur)`; top bar measured 14px -> 30px after the fix.
- **Sheen strength: drove nothing.** `--glass-sheen-strength` was
  declared and written by the slider, read by zero CSS: `--glass-catch`
  (the sheen's actual gradient) hard-coded its alpha, even though the
  comment on the sheen's own `.card` rule already claimed it was "scaled
  by `--glass-sheen-strength` through the same color-mix trick
  `--glass-opacity` uses" -- a real feature-never-ran gap between the
  comment and the code. Fixed by actually doing that: a card's own
  `background-image` now measures alpha 0.302 at 100%, 0.151 at 50%, 0 at
  0% in light; 0.0745 down to 0 in dark.

Commit `acb178a`.

## Gate status

Every commit in both batches: `scripts/gate.sh --changed` (lints, `node
--check`, ruff, plus `tests/test_dashboard_layout_cap.py` once it started
matching) all green. Full suite not run (not routine per standing order 5a;
CI covers it on push). Not pushed: the orchestrator merges.
