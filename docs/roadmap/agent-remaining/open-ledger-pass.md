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
