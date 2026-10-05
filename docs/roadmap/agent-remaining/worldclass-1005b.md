# World class 1005b: what is built, what is left

WORLD_CLASS_PLAN section 8's open rows, in the plan's order, from `a4f7aac`.

## Built

- **Row 10 (D5): done.** Most of it was KG4. The gate's rest: the graph's
  View, Colour, Note type, and a type's own colour (Note types, ⋯, Colour…).
  Found and fixed: `PUT /entries/{id}/properties` and a note's
  `mentions/link` were 500s since B7 (positional `session` into
  `update_entry`). Record: HISTORY.md, "Moved from the plans, 2026-10-05
  (D5)". Left: the Library grouping notes by type.
- **Row 11, section 17 row 1 (review queue): done.** `is:review`, Accept /
  Refile / Split per card, the count in the Categories widget. Record:
  HISTORY.md, "Moved from the plans, 2026-10-05 (section 17)". Decision
  taken (recommended, not confirmed): the card's 50, not 60.

- **INBOX 598, 602, 596's skeleton part: done** (the coordinator's switch).
  Page-shaped outlines and a named state for Graph, Library, Documents; the
  dashboard's skeleton rows, its filling outline and its in-place refresh on
  a return. Record: HISTORY.md, "Built 2026-10-05: INBOX 598, 602 and 596's
  skeleton part". The INBOX entries are left for the orchestrator to move
  (this brief did not edit INBOX.md). 596's other parts (the library menu
  position, the board sidebar, templates) are the whiteboard agent's.

## Stopped here (switched to INBOX 598, 602, 596 by the coordinator)

- **Row 11, section 17 row 5 (most opened this month): half built, not
  committed to the app.** Parked in `scratchpad/wc1005b-most-opened.md` (three sections):
  `opens.py.txt` (a month-bucketed opens file, `core/opens.py`),
  `routes_entries.patch` (`GET /entries/most-accessed?period=month`, and
  `opens.record` on `GET /entries/{id}`), the test file. Left: count the
  opens the page actually makes (the Notes list never GETs a note: hook
  `flashEntry` and `openNotePage`, and Ask's matches in `routes_chat`), and
  the Most used widget's `.seg` This month / All time. Then the HISTORY
  block and CHANGELOG line.

## Still open, in the plan's order

1. Section 17: rows 3 filing style (S), 6 explain this note (S), 2 tidy
   proposals (M), 4 charts from questions (M).
2. Row 15 (section 1.3): Remind me on documents and boards, Show in graph
   for a document, the Library note card's Remind me and Link to.
3. Row 26 (H7), row 28's rest (torch at launch, the Phosphor subset, lazy
   stylesheets, the Windows frozen startup), rows 30 to 34.
