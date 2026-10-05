# World class 1005c: what is built, what is left

Continues worldclass-1005b.md; every record is in HISTORY.md ("From
WORLD_CLASS_PLAN.md ...").

## Built (commits on this branch, in order)

- Section 17: rows 2 tidy categories, 3 filing style, 5 most opened, 6 explain
  this note (earlier commits) and **4 charts from questions** (`ai/stat_charts.py`,
  `answer-chart.js`, the first lazy stylesheet `css/lazy-answer-chart.css`).
- **Row 15**: Remind me on a document, a board, a Library note; Link to another
  on the Library note card (`Reminder.document_id`).
- **Row 33**: section 21 rows 1, 2, 12, 13 (the embedding error is a notice,
  `ollama_problem`, the update size).
- **Row 30**: Move to space and Export selection (`POST /entries/move-space`,
  `POST /export/markdown`), a note's words and reading time, `{clipboard}` and
  `{cursor}` in templates.
- **Row 31**: Paste as note, the AI dot's last-answer line (and its popup kept
  inside the window at 390), Settings, Account, Re-encrypt private notes, the
  Suggested links row (and its CSS moved to `css/lazy-inbox.css`, freeing boot CSS).
- **Row 34**: the 10 minute snooze, and the re-checks (grid drag, tab bar,
  whiteboard menus, tidy past five nodes) as numbers.
- **Row 32**: the navigation and undo audit table, and an Undo for a snooze
  (`PUT /reminders/{id}` `restore`).
- Rows 26 and 28 checked: torch at launch was already a preference; the Phosphor
  subset decided against (HISTORY, "rows 26 and 28").

## Left, in the order to take them

1. **Row 30, the bin for documents and reminders.** A deleted document or
   reminder is gone from the database with a toast Undo; a visible bin needs a
   `deleted_at` on both and every reader (search index, graph, Library, backlinks,
   chat retrieval, attach dialogs, export) filtering it. M, Opus.
2. **Row 31, 97 RapidOCR**: a second engine behind `core/ocr.py`; its
   `engine_status`, the Packages row and ten callers are Tesseract-shaped. M.
3. **Row 31, 79**: the Files tile is 160 px with eight buttons; the redesign
   (one row recipe, the name as the link, a kebab) was not done.
4. **Row 26**: first paint under 300 ms (not measurable here: DOMContentLoaded
   1,130 ms at a load average near 12) and virtualising lists over 200 rows
   (Library, Reminders, Timeline measured at 300 rows, 2026-10-05, `ui-sweeps/s2-1005.js`
   MODE=rows at 1440 under load: reminders 9,756 DOM nodes, scroll p95 24 to 25ms; timeline
   2,148 nodes, p95 19 to 22ms; Library docs 12,090 nodes (40 a card), p95 32 to 42ms, worst
   57 to 66ms; a `content-visibility: auto` row for the Library gave 41ms and 128ms worst on two
   runs, so inconclusive and not applied. Open: the Library card's node count.)
5. **Row 28**: the eleven surface stylesheets lazy (needs `ensureModule` to await
   a sheet; `app.js` is at its gzip cap); the Windows frozen startup.
6. **Row 34**: measured 2026-10-05, nothing to fix. The minimap's NaN rects: `errors.js` on a
   notebook with six boards, 0 errors and 0 NaN writes at 1440 and 390 (not reproduced; the
   renderer was replaced). Row class: a reminder and a note are both `li` in `ul.entry-list`
   with `.entry-meta` inside, the same radius and ground; the padding differs (9.6/12.8px
   against 6.4/16/26.4px, the notes' row carries the expand button) and a reminder has a 3px
   priority edge. One list class, two row shapes, by design.
7. A reminder's done tick and Ask answers do not report to the AI dot or to the
   undo stack respectively (found in the audit, not changed).

## Not verified

- Every sweep is headless Chromium on a sandbox with no model: charts from
  questions and the dot's line against a real model, the clipboard permission in
  the desktop window, Move to space on a board with many cards.
- The gate: `scripts/gate.sh --staged` ran `lints` twice (the working tree and
  the staged copy) at a load average of 10 or more, about 25 minutes a run; to
  keep working meanwhile, the staged copy's lints, `node --check` and ruff were
  run on their own (`/tmp` copy of the gate without the working-tree step) and the
  CI lint list run beside them.
