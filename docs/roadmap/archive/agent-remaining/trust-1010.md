# trust-1010: T0 findings for Briefs 72a, 72b and 73

Measured 2026-10-10 with `scratchpad/ui-sweeps/undo.js`, `reach.js`, `overlap.js` and `measure-writes.py`; the table is WORLD_CLASS_PLAN 28.4. One row per finding, selector or file first.

## Rule 1, undo (Brief 73 builds, 72a and 72b deepen)

- Settings, every switch and choice: 13 pressed, 0 undone by Ctrl+Z (`settings-controls.js` has the only `pushUndo`; 48 write functions in `settings*.js` and `prefs.js`, 3 with an undo path).
- Reminders: "Add" and "Mark done" push nothing (`shell-reminders.js`; 7 write functions, 3 with an undo path); Ctrl+Z restores neither.
- Documents: "Delete" shows a toast Undo, but Ctrl+Z goes to the open editor's history (`surfaceHistory` in `status.js`, the Documents branch) so the deleted document stays deleted; "Archive" and "Start a new document" push nothing (21 write functions, 5 with an undo path).
- Mind map "Add a top-level topic": the board stack grows by one, Ctrl+Z leaves the lists differing (`/whiteboard/` state not equal to before); unverified which list.
- Chat "Save this chat as a document": creates a document, no undo (`chat.js`; 28 write functions, 7 with an undo path).
- Whiteboard 43 write functions, 14 with an undo path; mind map 25 and 7; graph 21 and 9; library 30 and 9; dashboard 9 and 1; timeline 5 and 1 (`measure-writes.py --list SURFACE` names the gaps).
- Not reached by the sweep: right-click menus, keyboard-only acts (Tab for a branch), controls that open a picker and then need a second choice (note "Move to another category", "Add tags"), and library delete (all 14 pressed in the library were views or pickers). The 25 pressed actions are a floor on what is exposed, not the whole surface; `measure-writes.py` is the full-coverage count.
- Documents were not probed in the dark run (the list had not loaded when the sweep opened it), and the mind map "Add a top-level topic" undid in one light run and not another: re-run both before quoting them.

## Rule 7, overlap (Brief 72a for the notes list and board, 72b for the rest)

- `#wb-tool-group span.wb-tool-section-label`: text 49 to 56px past its box at 820, 1024 and 1440 on the whiteboard and the mind map (36 nodes counted as overflow and as clipped text).
- `#entry-list div.entry-meta.note-meta`: 64 to 72px wider than its card at 320 and 390 (one per note, 33 to 42 nodes); `#entry-list li` 24 to 48px at 320.
- `#select-btn span.dock-word` 40px and `#notes-filter-menu span.dock-word` 32px clipped at 320 to 1024: the labelled-to-icon collapse hides words by clipping instead of removing them (may be intended; if so the rule needs the exception written down).
- `button#notes-tidy.ghost.small` 4px at every width; `#tab-notes div.layout` 4px at 320 to 1024.
- Dashboard: 3 overflow and 1 clipped text at 320 and 390, 2 overflow at 820 and wider (selectors in the sweep output, not yet named here).
- Docks: 0 sibling intersections in 12 surfaces at 5 widths (at 390: 81 bars and 266 sibling pairs examined), so the dock grammar holds; the counts that fail are text and content boxes.
- Counts scale with the number of seeded notes (the notes list repeats one finding per card): the table in 28.4 was taken on 13 to 23 notes.

## Rule 2, reach (Brief 72b for the surfaces, 73 for the palette)

- Crawl: 55 destinations found from the dashboard (1, 14, 36, 3 and 1 at depths 0 to 4, crawl complete to depth 4), 1 deeper than 3, 16 with no palette command (of 80 commands); dark: 55 destinations, 1 deeper than 3, 14 without a command.
- Palette rows missing (heuristic word match, the destination and its click path): 1  Notifications: # unread (muted except reminders); 1  Atlas files it for you; 1  Draw, then keep it as a note; 2  Chat > About this chat; 2  Chat > Search everything and jump anywhere (Ctrl+K); 2  Library > Boards & maps; 2  Library > Bookmarks; 2  Library > Contents; 2  Settings > Search and index; 2  Settings > What it learned; 2  Settings > Web search; 2  Atlas files it for you > Manage categories; 2  Answered from your notes > About the Use AI switch; 3  Notes > Writing room > Write from notes you already have, up to six of; 3  Library > Contents > Probe documentDocument·# sections·#h ago; 3  Atlas files it for you > Manage categories > About managing categories.
- Deeper than 3 (light): 4  Library > Contents > Probe documentDocument·# sections·#h ago > Outline.
- The crawl presses navigation-looking controls only and one item of each repeated list; a destination absent from it is "not found by the crawl", not proof it is missing. Sub-tabs on one page share candidates, so a button seen on the first sub-tab is not pressed again on the others.

## T0 numbers (moved from WORLD_CLASS_PLAN 28.6 at the merge, 2026-10-10)

Measured by Brief 74 against a seeded notebook, 1440 by 900 for undo and reach. Sweeps: `undo.js`, `reach.js`, `overlap.js` and `measure-writes.py` in `scratchpad/ui-sweeps/`; findings by selector in `agent-remaining/trust-1010.md`.

| Surface | Undo, light: pressed / actions / undone | Code: write functions / with an undo path | Overlap, light: overflow/clipped at 320, 390, 820, 1024, 1440 |
| --- | --- | --- | --- |
| notes list | 13 / 2 / 2 | 16 / 10 | 39/2 4/2 5/2 5/2 2/0 |
| note editor | 14 / 1 / 1 | 21 / 11 | 47/2 4/2 5/3 8/5 5/3 |
| documents | 13 / 3 / 0 | 21 / 5 | 0/0 0/0 1/0 1/0 0/0 |
| whiteboard | 14 / 1 / 1 | 43 / 14 | 2/0 2/0 9/7 8/7 8/7 |
| mind map | 12 / 2 / 1 | 25 / 7 | 1/0 0/0 5/5 5/5 6/5 |
| graph | 3 / 0 / 0 | 21 / 9 | 0/0 0/0 0/0 0/0 0/0 |
| timeline | 3 / 0 / 0 | 5 / 1 | 0/0 0/0 0/0 0/0 0/0 |
| library | 14 / 0 / 0 | 30 / 9 | 1/0 1/0 1/0 1/0 0/0 |
| settings | 16 / 13 / 0 | 48 / 3 | 2/1 0/0 0/0 0/0 0/0 |
| dashboard | 7 / 0 / 0 | 9 / 1 | 3/1 3/1 2/0 2/0 2/0 |
| chat | 8 / 1 / 0 | 28 / 7 | 0/0 0/0 0/0 0/0 0/0 |
| reminders | 7 / 2 / 0 | 7 / 3 | 0/0 0/0 0/0 0/0 0/0 |
| total | 124 / 25 / 5 | 274 / 80 | 95/6, 14/5, 28/17, 30/19, 23/15 |

- **Rule 1.** A control counts as an action when pressing it changes the notebook (an API snapshot before and after, ids and timestamps stripped) and as undone when Ctrl+Z restores that snapshot; redo matched on all 5 that undid. Dark: 16 actions, 3 undone (documents were not probed in dark). Not undone: all 13 settings switches, reminder add and mark done, document delete (Ctrl+Z goes to the editor history), archive and new document, chat "Save this chat as a document", mind map "Add a top-level topic". Documents, mind map and the pickers are a floor: right-click menus and two-step pickers were not walked.
- **Rule 2.** 55 destinations found from the dashboard (1, 14, 36, 3 and 1 at depths 0 to 4, crawl complete to depth 4), 1 deeper than 3, 16 with no palette command (of 80 commands); dark: 55 destinations, 1 deeper than 3, 14 without a command. Palette match is by words (70% of a label's words in one command), so it can miss or over-credit; the crawl does not see right-click menus or controls shown only on selection.
- **Rule 2, no palette command:** Notifications: # unread (muted except reminders); Atlas files it for you; Draw, then keep it as a note; Chat > About this chat; Chat > Search everything and jump anywhere (Ctrl+K); Library > Boards & maps; Library > Bookmarks; Library > Contents ....
- **Rule 7.** Docks: 0 sibling intersections at every width (81 bars, 266 pairs examined at 390). The failures are text and content boxes: `#wb-tool-group span.wb-tool-section-label` (56px at 820 and up), `#entry-list div.entry-meta.note-meta` (72px at 320 and 390), `#select-btn span.dock-word` (40px), `#notes-filter-menu span.dock-word` (32px), `button#notes-tidy` (4px, every width). Dark: 74, 19, 27, 28, 21 overflow and 5, 5, 17, 19, 15 clipped. Counts scale with the number of notes (the list repeats a finding per card).
- **Not verified:** WebKit and a real phone (rule 8); a run with no model (rule 12); the sweeps ran on a loaded machine with 13 to 23 notes; undo and overlap numbers vary by a few between runs of the same theme (data-dependent).
