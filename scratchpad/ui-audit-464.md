# UI audit, INBOX 464 (second half), 2026-10-04

The owner: "do another round of improve and redesign the ui/ux for the
application", with eight skills named. Each skill was loaded and used as a
checklist; DESIGN.md overrides them for `frontend/` (where they disagree:
web-design-guidelines asks for Title Case, DESIGN.md for sentence case;
DESIGN.md wins).

**Method.** A 15-note seed with two documents, a chat and a board
(`/tmp/mm-aud42`). Every tab, every Library sub-tab, 27 Settings sections and
six dialogs (palette, Tools and features, shortcuts, quick note, note and
document templates), at 1440 and 390, light and dark: 188 screenshots, each
of the 1440 light set and the phone set looked at, the dark set sampled. Then
a measurement for each defect named below (sweeps in
`scratchpad/ui-sweeps/`: `groupheads.js`, `switchalign.js`, `paneintro.js`,
plus probes). Fonts in the sandbox are DejaVu, not the owner's system face,
so widths in characters are approximate; every pixel number is from
`getBoundingClientRect`/`getComputedStyle`.

**unslop-ui scanner.** The skill's `scripts/devibe_scan.py` is not on disk
(only SKILL.md is synced, as on 2026-09-1x). A stand-in implementing the
SKILL.md's named high tells (AI-purple gradients, gradient text, untouched
Tailwind/shadcn colours, emoji glyphs in markup and scripts, coloured glows,
autopilot fonts, the cream ground) found 4 high, 0 medium: all four are lines
of the `:shortcode:` emoji table in documents-prose.js, which is data, not
icons, now marked `unslop-ignore` with that reason. 0 after.

## Ranked by impact

Status: **fixed** (with its commit's before/after) or **open**.

1. **Fixed. Settings heads in three voices.** 44 group heads at
   14.7px/650 inside a `.settings-group`; 10 loose on the pane at 12px/600
   (Personas x4, Templates, Skills, Web search x2) and Web search's "Your
   SearXNG instance" at the pane title's 18.4px. After: all in groups at
   14.7px/650. Lint `tests/test_settings_group_heads.py`.
2. **Fixed. Every Settings switch on an edge of its own.** 130 switch rows,
   the switch 9px inside the edge the group's head, labels, fields and hints
   use. After: 0px for the 95 rows in a group's flow. (DESIGN.md "A:
   Alignment".)
3. **Fixed. Settings head wraps on a phone, Close leaves its corner.** At
   390 and 360 the head was 78px with Close at y=64 (62px in from the corner
   at 360); Appearance (Peek) wrapped at 390 even after the first pass.
   After: 44px, Close at y=31, 0px from the corner, at 390/360/320 on
   General and Appearance.
4. **Fixed. Pane descriptions over one line** (standing order 6). Tools 3
   lines, Personas 2, Help 2. After: 1. Lint
   `tests/test_settings_pane_intro.py`.
5. **Fixed. Library previews run blocks together.** "Goals Ship the
   notebook redesign Cut travel spend by 15% Risks The hiring freeze...".
   After: "Goals · Ship the notebook redesign · Cut travel spend by 15% ·
   Risks · The hiring freeze..." (documents list and every Library card).
6. **Fixed. The palette on a phone speaks of a keyboard.** One key-hint
   line and 20 key chips at 390 on a touch screen; the prompt 323px in a
   303px field. After: 0, 0, 274px.
7. **Fixed. File pickers wear the hover face.** The "Choose files" button
   beside its Import: `--ghost-btn-bg` (the tonal hover) at rest, a 0.10
   edge against 0.52, 12px/500 against 13.6px/600. After: identical on all
   seven properties, both themes.
8. **Fixed. Copy that says the same thing twice or points nowhere.**
   Models: "Ollama isn't running" as the status and again one line down.
   Images and Files: the empty state's button was "Capture a note" under a
   dock whose verb is Upload. Reminders: "Add one above" on a phone, where
   nothing is above.
9. **Fixed. Tab bar labels move when the selection does.** The active tab
   was font-weight 600, so its label widened and every tab after it shifted
   ("Notes" at x=549 on Dashboard, 543 on Notes; 6px). The selected label
   now keeps the resting weight and is drawn heavier with
   `-webkit-text-stroke` (paints, does not lay out). After: 0px across all
   seven selections at 1440. The audit's reserve-the-bold-width fix was
   built first and measured worse: the strip 29px wider at 1093 and the
   header on two rows at 900, 1024 and 1200; header heights now match the
   base at every width from 700 to 1440. Lint `tests/test_tab_label_width.py`.
10. **Decided, kept.** Library note cards' sentence-as-title stays (the
    owner's decision; the lower bound is not taken).
11. **Fixed. Timeline rows cut at a character count, not at the edge.**
    "Learning Rust: ... borrows as loans. #learn…" ended at x=896 with 430px
    of empty row before the time; the title span is 1248px wide and did not
    overflow, so the "…" was in the text (`PREVIEW_CHARS = 120`,
    routes_timeline.py). After (240): the whole line, ending at x=904,
    `.timeline-row-title`'s own ellipsis left to cut a longer one.
12. **Fixed. Dashboard widgets' empty states have no action.** Eleven
    widgets were a sentence only. `dashEmpty(body, text, action)` draws the
    recipe with one ghost button carrying `data-empty-action` and
    `data-empty-tab`/`data-empty-sub`, which the delegated listener opens
    and waits for first. Each click measured landing (Add a reminder focuses
    `#reminder-text`, Add a bookmark opens the form on Links, Open boards
    shows the Boards sub-tab). In a card the recipe's padding is a step: an
    empty Favourites card 101px before, 163px after with its button. Lint
    `tests/test_dashboard_empty_actions.py`.
13. **Fixed. Settings switch rows' dividers wider than the head's rule.**
    Measured (`scratchpad/ui-sweeps/switchdivider.js`) on 67 rows: 9px past the head each side
    (58 Tools grid rows on their outer side). The hairline is an inset
    background image now; the hover and checked fills still show. At 390
    the Tools grid track was 272px in a 268px column (4.4px more);
    `minmax(min(17rem, 100%), 1fr)`. After: 0/0 on every row at 1440 and
    390, light and dark. Lint `tests/test_settings_switch_divider.py`.
14. **Fixed. Two disclosure markers.** Settings folds, the help accordion
    and task logs drew a 5x6px border triangle crossed with 07's 2px border
    chevron; the Library drew the 16px Phosphor caret. Every fold now draws
    the caret (`\e136`, 1em, the row's colour, -90deg closed): 11 Settings
    and 95 help summaries at 15x14.7, summary heights unchanged (34/32px).
    DESIGN.md "A disclosure marker"; lint `tests/test_disclosure_marker.py`.
15. **Fixed. Library counts disagree.** Cause: `/whiteboard/boards` always
    returns the default scratch board (`id: null`), `/library` lists boards
    that are notes. One predicate, `libraryListsBoard` (note-cards.js): the
    default board is listed when something is on it. The gallery, its
    counts, its tick sync and the dashboard widget use it. After: Boards 1
    and All 1 / Boards 1. Lint `tests/test_library_board_counts.py` (runs
    the predicate under node).
16. **Fixed. Chat's "Ask Atlas" a two-line capsule on a phone.** Below
    600px every offer takes `--radius-md` (the chat chips' corner beside
    it), and Chat's says "Ask Atlas what it can change": 214x44, one line
    (was 320x46, two lines, 999px). The Notes empty state's longer question
    still wraps at 390, now in a 4.8px corner. Desktop keeps the pill.
17. **Fixed. Reminders' quick-set row mixes corners.** Quick set took the
    steppers' pill in this row (named in `PILL_CONTROLS`, as the chat
    composer's row is): 999px on all three controls, was 4.8px beside 999px.
18. **Fixed. Import is two steps for one action, three times.** One
    button each (Import files, Import a folder, Import a document) opens a
    hidden picker and choosing starts the import; the toast's Undo bins
    exactly the notes made (both endpoints return `ids`). Driven at 1440 and
    390: 2 notes imported with one press, Undo took the library search from
    2 to 0. DESIGN.md "Choosing files to bring in"; lint
    `tests/test_import_one_step.py` (no visible native file input).
19. **Fixed. Duplicate explanations.** Bookmarks' empty state dropped its
    "Add a website to keep it a click away." under the lede that says the
    same: three visible sentences on an empty tab before, two after.
20. **Fixed. The phone dashboard's search field stops 19px short.** The
    desktop hairline's padding on `.dock-actions` (0,2,0) outranked the phone
    reset (0,1,0). After: 9.6px, the dock's gap; every other phone dock the
    same height and control positions.

Not defects, checked: the graph's first 1.4s shows a zoomed camera that
settles to fit all 15 nodes by 6s (an entrance, measured); the highlighted
rows in several stills were the pointer resting where the sign-in button
was; Chat's '?' in the pane's corner is the owner's decision (INBOX 236).

## Sweeps after the fixes (port 8842, the seeded notebook)

- `errors.js`: 0 errors, 0 layout findings at 1440, 1024, 820 and 390.
- `contrast.js`: every tab and Settings section ok, light and dark.
- `axe.js`: 0 findings, light and dark at 1440 (100 and 103 nodes axe
  could not decide, as before).
- `touch.js` at 390: 0 findings. Its "Settings sheet" row measured 0
  controls: it opens Settings by `#settings-btn`, which a phone keeps in the
  header's kebab, so that row measures nothing (the sweep's gap, not this
  change; the head was measured separately, item 3).
- `docks.js`: no dock over its control count or with mixed heights.

## Sweeps after items 9 to 20 (port 8851, the same seeded notebook)

- `errors.js`: 0 errors, 0 layout findings at 1440, 1024, 820 and 390.
- `contrast.js`: every tab and Settings section ok, light and dark.
- `touch.js` at 390: 0 findings (its Dashboard and Settings rows still
  measure 0 controls, the sweep's gap noted above).
- `docks.js`: no dock over its control count or with mixed heights.
- New probe `switchdivider.js`: every Settings switch row's hairline 0/0
  against its head at 1440 and 390.
