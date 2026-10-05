# The open-ledger pass, 2026-10-05

A pass over `OPEN.md` section by section (Documents, Graph, Notes and
capture, Library, Timeline, Chat and popup agent, Settings and help, App
wide, Backend, the rest). Stopped part way by a change of task (INBOX 599,
the Settings heads and the popup shell). Each closed row is in HISTORY.md,
"OPEN.md rows closed, 2026-10-05 (the open-ledger pass)".

## Built

- Documents, the word menu measures its own width before it is placed:
  reproduced at 390 (256 of 316px), fixed (`wordmenuwidth.js`). 0ffce20.
- Library, a Files row asks for a PDF first page the server cannot draw:
  `has_pages` on `GET /media`, the tile asks on it alone (`pdfpagereq.js`).
  ce14cdb.
- Settings and help, toggle rows onto one recipe: the gap was the last
  difference (`togglerows.js`). 6fe8021.

## Closed as already built or decided

- Library, the fold chip at 82% of the column: built by INBOX 279 (60px of
  179.4px, `foldchip.js`).
- Library, the six descriptions at six heights and the two pictures at two
  sizes: decided in UI_MODERNISATION_PLAN's Phase 7 amendments.

## Marked "Needs"

- Library, a PDF's reading from outside the app: needs a local model.

## Where the pass stopped

Settings and help: the next row is "The OCR workspace head could not be
measured". Not yet worked: the rest of Settings and help, App wide, Backend,
Sweeps and tooling, the carried rows, Not verified, and the Chat section's
rows (each already annotated as needing a model or a decision; their notes
were not yet rewritten as "Needs:"). Documents, Graph, Notes and capture and
Timeline hold no open row.

## Then: INBOX 599 and 606 (the coordinator's change of task)

Measured with `settingsheads.js`, `popupinv.js` (now with foot fields),
`noteeditform.js` and `noteeditflow.js`, at 1440 and 390, light and dark.

- Library, AI skills dock: 90px in two rows at 1100 and 820, now 50px and one
  row at 1440, 1280 and 1100 (the sort an icon picker, the segment's words
  leave a dock under 58rem); a dock under 700px keeps INBOX 450's planned
  break. 0338280.
- Settings: 21 panes opened on a bare 18.4px title row (Logs on a dock with a
  12px title, Background tasks on none) with the index as a second strip;
  now 20 open on a `.dock` (16px title, the index inside it, '?' last, 50px,
  one row at 1440; two panes take two rows at 390), the dock sticky. Packages
  keeps its fold head (its first group has the pane's name). 16645fe.
- Popups: the shell was already one (head 32, radius 8, padding 16/20); the
  feet were not: button heights {32, 38/40, 40/38} to {32} at 1440, filled
  first in 2 feet to 0, 2 feet at the left to 0. ef33b6f.
- Note edit form (606): three frames to one surface; tags a comma field to
  chips; category a select to its chip; Save then Cancel mid-row to Cancel
  then Save at the foot's right; 2 boxed Link buttons and a boxed Attach a
  link to 0 boxed (a quiet + per note, an icon in the foot); 554 to 507px
  tall at 390, and New note no longer floats over Save there. ce7481d.

Left from this round: the Settings pane docks hold only title, index and
'?'; a pane's own primary action (New persona, Add your own) still lives in
its fold, not the dock (a per-pane design pass). Improve writing's foot
buttons stay 32px under touch at 390 (pre-existing; its card is not a
`.modal-overlay`, so the touch floor rule misses it, and the boot CSS budget
has 5 bytes left). Not verified: the desktop window; a real tag-suggestion
pick in the edit form (the suggest list arrives as "tag, " and commits, read
from tag-suggest.js, not driven).
