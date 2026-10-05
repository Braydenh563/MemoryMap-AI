# Design rows 1005: what is done, what is left

Branch `design-rows-1005`. Every item measured with a sweep in
`scratchpad/ui-sweeps/` at 1440 and 390, light and dark, on port 8794.

## Done

1. **INBOX 616, the note edit form** (`noteedit616.js`: 11 findings at 1440
   before, 0 in all four runs after; `noteeditflow.js` all pass). The title
   is large borderless text; a properties line under it holds the category
   chip and the tags as padded chips with Add tag (no well, no '#'); the
   strip is one icon row that never folds (Capture too, `capturestrip.js`);
   Related folds to "N suggested links"; the foot is Attach a link and the
   word count, then Cancel and Save. Attach a link opens the bookmark picker
   (`pickLibraryItemDialog`); it used to draw a select into a hidden panel.
2. **INBOX 618, the top and bottom bars** (`bars618.js`: 11 findings at 1440
   before, 0 in all four after). The space picker a ghost the tabs' shape;
   no stroke on the selected tab; a 28px logo tile; Quit at 0.72 opacity at
   rest; quiet counts; Agent, Guide and Find icon-only with an aria-label;
   the page arrows and undo/redo one group, no divider.
3. **INBOX 620, the quick sketch** (`sketch620.js`: 3 findings at 1440
   before, 0 after). 16px under the head row; the toolbar a borderless
   `--field-inset` tint with no rules between groups; the white ink dot (and
   the black one in dark) ringed.
4. **Settings panes' main action in their bars** (`paneacts.js`, 0 failing
   at 1440 and 390, light and dark). Personas, Skills and Templates carry a
   ghost "+ New ..." in the dock that opens the form, ends an edit and
   focuses Name; below 600 it is its plus on the title's row (Personas'
   dock 154 to 114px at 390). Improve writing at the touch floor was already
   built (06ef110; `improvefoot.js` re-run: every button 44px at 390, both
   themes).

## Left

- Capture's strip wraps to two rows at 390 until the library bundle loads
  (its More lives in that bundle); after it loads it is one row
  (`capturestrip.js` with `LIB=0` shows the first state).
- INBOX 621 (header bars redesign) and 622 (Settings navigation) were placed
  "after 616" with an Opus design agent; not taken here.
- `stripground.js` samples a pixel that lands on an icon at 390; it is a
  1440 sweep.

## Not verified

- The desktop window; a real phone (Chromium touch emulation only).
- Quit's 0.72 opacity contrast is computed (about 3.1:1 light, 5:1 dark on
  the bar's ground), not read from pixels: the icon strokes are too thin to
  sample.
