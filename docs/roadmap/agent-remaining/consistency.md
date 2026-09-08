# Consistency sweep: what is done, what is left

The brief behind this file is the owner's report, in his words:

> "in a lot of the application areas, each of the menu items and elements feel
> very disconnected and separate, maybe due to their backgrounds or obviousness
> as separate elements", "the dropdown menus and elements in them need to not
> feel disconnected", "the notes top dock feels very squished and the title
> feels like it has no room, I feel like all these top docks need a unified bar
> where the buttons and dropdowns and comboboxes feel a part of that and not
> just separated buttons chucked together at the top of the panel", "there are
> areas where the icons and accompanying text dont align", "consistent design,
> things flowing and feeling connected".

Eight numbered items came out of that. **Nothing here is dropped, only
deferred** - this file is the resume point.

All new CSS from this work is in **`frontend/css/08-consistency.css`**, linked
last in `index.html` and registered in `tests/_css_paths.py` so every CSS lint
covers it. `00-07` are untouched by design: their concatenation order is
load-bearing (`tests/_css_paths.py` says why), and a cross-cutting decision has
no single section it belongs in. **Keep adding to 08 rather than reopening the
earlier files.**

Sweep scripts used, all runnable against a local server:

```bash
bash scratchpad/ui-sweeps/serve.sh 8815 /tmp/mm-menus
BASE=http://127.0.0.1:8815 SCRATCH=/tmp/mm-menus PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
  node scratchpad/ui-sweeps/iconalign.js      # TOL=1 W=1024 THEME=dark all work
```

---

## Status by numbered item

| # | Item | State |
| --- | --- | --- |
| 1 | One menu recipe, no fill at rest | **Done** (`78a309b`) |
| 2 | `details > summary` in a card is a flat header | **Done** (`f266bf5`) |
| 3 | Top docks as one bar | **Mostly done** (`c011779`) - see below |
| 4 | Icon and text alignment | **Done** (`2644ad5`) - see the leftover gaps below |
| 5 | Form footers as one action bar, FAB clearance | **Mostly done** (`baa0616`) - see below |
| 6 | One toggle-row recipe | **Done** (`493aa0b`) |
| 7 | Meta looks like meta | **Mostly done** (`13a625c`) - image chips unverified |
| 8 | No em-dashes in new copy or comments | **Held** - 0 in `08-consistency.css` |

---

## 1. Menus - done, with one surface unverified

Every menu row is now flat: measured 0 of 27 rows across six menus carrying a
non-transparent background at rest, all 34.53px tall with 6.4/12.8px padding.
The recipe is decided by container (shell class plus row class, 0,2,0) rather
than by remembering to add `.menu-item` at each call site.

**Left to verify:** the five whiteboard menus (Insert, Edit, Arrange, View,
Board). The same rules cover them - `.wb-board-menu` and `.wb-export-menu` were
added to the one opaque popover shell and `.wb-menu-item` to the row recipe -
but the board itself could not be opened in the driver in the time available,
so they are reasoned from the cascade and not measured.

- **Next step:** open Library, click the `[role="tab"][data-target="library-view-whiteboard"]`
  sub-tab, open a board, then click each `[data-wb-menu-toggle]` and probe
  `#wb-insert-menu`, `#wb-edit-menu`, `#wb-arrange-menu`, `#wb-view-menu`,
  `#wb-board-menu` for a non-transparent row background at rest. A ready
  script is at `scratchpad/audit-wb.js` in this session's scratchpad; it needs
  the correct "open a board" click, which is what defeated it.

---

## 3. Docks - five done, four surfaces not yet on the recipe

Done and measured, per dock (fills / radii / borders / heights), before to
after:

| Dock | Before | After |
| --- | --- | --- |
| Notes | 5 / 6 / 5 / 4 | 3 / 2 / 4 / 3 |
| Graph | 4 / 5 / 5 / 3 | 3 / 1 / 3 / 2 |
| Timeline | 5 / 5 / 5 / 5 | 3 / 2 / 4 / 3 |
| Reminders | 3 / 2 / 3 / 3 | 3 / 2 / 3 / 3 |
| Library | 5 / 5 / 5 / 2 | 3 / 2 / 4 / 3 |

The bar is `--card` at `1px --border`, radius 11.2px, padding 8/9.6, h=54 on
all five. Only five elements carry `class="dock"` in `index.html` (lines 990,
1744, 1876, 2801, 2914) and all five are done.

### Surfaces named in the brief that are NOT on the recipe

| Surface | Selector | File | Next step |
| --- | --- | --- | --- |
| Chat head | `.chat-dock` | `04-chat-dock-appearance.css:1175` and around | **Owned by another agent this round** (worktree `agent-a9ca1fcf2f7eb318b`). Do not touch until that work lands, then compare its surface against `.dock`'s and reconcile in 08. |
| Dashboard head | `.dash-*` heads | `03-dashboard-widgets.css` | Same agent. Same reconcile step. Note the brief also says do not touch the dashboard hero. |
| Library sub-tab heads (All / Documents / Boards & maps / Images / Files / Links / Contents) | `.library-toolbar`, `#library-view-* .row.space-between` | `07-whiteboard-misc.css` around line 7780 | Same agent. The outer Library dock (line 2914) IS done; these are the per-view heads inside each sub-tab. |
| Documents editor head | `.doc-toolbar` | `05-sidebars-themes.css:1263` | **Partly done.** It already had a bar surface (`--card` fill, edge, radius) since the "fix the toolbar" round, so only its edge colour and radius were moved onto the dock's. Its *controls* are not yet quiet: apply the `.dock > * > button.ghost` half of the recipe, scoped to `.doc-toolbar`, and re-measure fills/radii/borders the way `scratchpad/audit-dock.js` does. Do not touch the documents editor **body** - another agent owns it. |
| Whiteboard top bar | `.wb-topbar` | `07-whiteboard-misc.css:6403` | **Deliberately excluded, and this is a decision to keep, not an omission.** It floats over the canvas, so DESIGN.md's floating-surface rule makes `--modal-bg` with `--glass-border` correct there rather than the dock's `--card` and `--border`. What is still open is the *controls inside it*: `.wb-topbar button` should get the same quiet treatment. |
| OCR workspace header | `.ocr-*` head | `07-whiteboard-misc.css` | Not in the brief, but it is the same shape and `05-sidebars-themes.css:1269` names it alongside `.doc-toolbar` and `.library-head` as having had the same fault. Worth folding in. |

### Also open on the docks

- **1024 wrapping is correct but untuned.** At 1024 Notes and Graph wrap to two
  rows (h=98) and the actions zone lands right-aligned by its own
  `margin-left: auto`, so no stray leading hairline appears. Measured, no
  clipping (`scrollWidth == clientWidth` on all five at 1440 and 1024). If a
  future change makes a zone other than `.dock-actions` wrap first, the
  `.dock > * + *` border-left will show as a stray line at the left edge of the
  second row. The check for that is already in `scratchpad/shot-docks.js`
  (`strayHairline`), keep running it.
- **Dark theme not re-measured after the dock change.** The numbers above are
  light theme at 1440. `THEME=dark` on the same script is the check.

---

## 4. Icon and text alignment - done, two gap families left

Vertical: **0 of 274 icon-and-text controls off by more than 1px**, worst in the
app 0.87px. This half of the report did not reproduce and nothing was changed
for it.

Horizontal: **10 distinct icon-to-label gaps before, 3 after**, with 229 of 243
now on `--space-2` exactly.

**The two that remain:**

| Gap | Count | Where | Next step |
| --- | ---: | --- | --- |
| 8px | 12 | a bare `<summary>` outside the families named in 08 | Find which by re-running `iconalign.js` and reading the `e.g.` line it prints for the 8px bucket; then add that container to the `gap: var(--space-2)` list in 08. |
| 10.4px | 14 | `#space-switcher-btn.ghost.small.space-sw` and siblings; the container gap is already 6.4px and the icon margin is already 0, so the extra 4px comes from something else in the row (most likely a leading space in a text node or a wrapper span with its own margin) | Inspect that button's children directly. This one is a markup question, not a CSS one. |

Also not run: `THEME=dark` and `W=1024` sweeps. The script takes both.

---

## 5. Form footers - one row at 1440, still two at 1024

Done: both `.draft-controls` rows are one line at 1440 with the primary
rightmost, and `coversAFormPrimary` (app.js) guarantees the scroll-to-top
button never comes within `--space-3` of a form's primary, proven on four
cases in the browser.

**Left:**

- **The Writing Room wraps at 1024** (both rows, h=88, 2 lines). The section is
  a two-column layout, so each column is about 340px there and four controls
  cannot fit on one line at any distribution of the space. The real fix is for
  `.draft-columns` to collapse to a single column below about 1100px, which is
  a layout change to a surface this brief did not scope. **Next step:** add a
  `@media (max-width: 1100px)` rule in 08 setting the draft columns to
  `grid-template-columns: 1fr` (or `flex-direction: column`), then re-run
  `scratchpad/verify5.js` at 1024 and confirm `LINES=1` on both rows.
- **The capture attachments row wraps at 1024** (`.capture-field-row`, h=88,
  3 lines): a label, a select and five labelled buttons in about 675px. The
  row is a deliberate split (the comment at `index.html:708` explains why the
  attach family was moved out of the commit row), so the fix is to let the
  five buttons become icon-only below some width rather than to re-merge the
  rows. **Next step:** hide the label text on `#entry-attach-file`,
  `#entry-attach-existing`, `#sketch-btn`, `#mic-note`, `#improve-btn` under a
  media query the way `.wb-topbar .wb-menu-label` already does at 56rem, and
  re-measure `LINES`.
- **The Ask composer** (`.ask-query-row`, h=55, LINES=2 at both widths) was
  measured but not touched. It is `flex-wrap: nowrap` with 5 children, so the
  two "lines" are a taller child rather than a wrap. Confirm that reading
  before changing anything.

---

## 7. Meta chips - skills done, image cards unverified

Done and measured on the Library skill cards: before, four heights (21.2,
31.6, 31.6, 24.8), three radii (15.4, 8.4, 4.2) and three fills (accent-soft,
ghost-btn-bg, chip-bg) for four pieces of the same kind of information in one
card. After: two fills (`--chip-bg` and transparent), the two chips within
1.2px of each other in height, and "Never run." is plain `--muted` text.

**Left to verify:** `.library-image-usage-chip`, `.library-image-model-chip`
and `.library-image-tile .chip` are covered by the same rules but the seeded
notebook has no images, so they are reasoned from the cascade and not measured.

- **Next step:** seed an image (POST an entry with an image attachment, or use
  the Images sub-tab's upload), then run `scratchpad/audit-meta.js` against
  `[role="tab"][data-target="library-view-media"]` and check the chips against
  the persona reference: `--chip-bg`, no border, pill radius, 1.6/9.6 padding,
  12px, `--muted`.

---

## 8. Em-dashes

`08-consistency.css` has **0**. Every comment in it was written with hyphens
after a first pass put 26 in. The wider sweep over the rest of the tree is
somebody else's item and is not started here.

---

## The one bug shape worth carrying forward

Three of the eight items turned out to be the *same* rule doing damage in three
places:

```css
/* 07-whiteboard-misc.css:3640 */
summary:not(.icon-only):not(.icon-button) {
  background: var(--ghost-btn-bg);
  border: 1px solid var(--ghost-btn-border);
  padding: var(--space-2) var(--space-3);
}
```

It gives every `<summary>` in the app a resting tonal fill, an edge and button
padding. Six hundred lines earlier, `07-whiteboard-misc.css:3053` sets a hover
tint on the same selector and its comment says a resting fill was *deliberately
refused* because it "would turn every collapsed section into a button-looking
slab and compete with the real buttons inside them". The later rule wins on
order, so what ships is the thing the first comment predicted.

It surfaced as: the Help accordion rows (item 2), the "Advanced response
settings" header (item 2), and the Skills cards' "2 steps"/"1 tool" chips
(item 7), which are `<summary class="chip skill-fact">` and lost to it 0,2,1
against 0,1,0.

**If a fourth `<summary>` is reported as "looking like a button", this is why.**
The split 08 makes is: a summary in a dock or a toolbar *is* a control in a row
of controls and keeps the fill; a summary that heads a folded section, or that
is marked up as a chip, does not. Add the new case to the flat list in 08 at
(0,3,1) or better so it wins on weight rather than on file order.
