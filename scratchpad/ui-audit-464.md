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
9. **Open. Tab bar labels move when the selection does.** The active tab is
   bold, so its label widens and every tab after it shifts: "Notes" at
   x=549 on Dashboard, 543 on Notes (6px). Fix: reserve the bold width (a
   hidden bold copy in `::after`, `content: attr(data-label)`). Left to the
   motion agent, who owns the tab bar's sliding indicator this round.
10. **Open. Library note cards lose the end of their first sentence.** A
    note's title is its whole first sentence when that is under 140
    characters (`LIBRARY_TITLE_SENTENCE_MAX`), clamped to two lines by CSS;
    the preview then starts at the next sentence, so "...when I thought of
    it as a single owner per value with borrows as loans." is on no card,
    which shows only "#learning". A one-sentence note whose sentence ends
    in `."` takes the other path and shows four lines of bold title. The
    sentence-title was a decision (library.js comment); the fix is a lower
    bound, about 70, so a sentence longer than two lines keeps the 60-char
    cut and the preview carries on from it. Needs the owner's yes.
11. **Fixed. Timeline rows cut at a character count, not at the edge.**
    "Learning Rust: ... borrows as loans. #learn…" ended at x=896 with 430px
    of empty row before the time; the title span is 1248px wide and did not
    overflow, so the "…" was in the text (`PREVIEW_CHARS = 120`,
    routes_timeline.py). After (240): the whole line, ending at x=904,
    `.timeline-row-title`'s own ellipsis left to cut a longer one.
12. **Open. Dashboard widgets' empty states have no action.** Reminders
    ("add one in the Reminders tab"), Boards & maps and eight more are a
    sentence only; the recipe is one sentence and one action. A
    `dashEmpty(body, text, action)` with `data-empty-action` plus a
    `data-empty-tab` the delegated listener switches to first.
13. **Open. Settings switch rows' dividers are wider than the head's
    rule.** A consequence of item 2: the row's hairline now spans the
    hung padding, 9px past the head's underline each side. Inset the
    divider (a `background` line at the padding) if it reads as a fault.
14. **Open. Two disclosure markers.** Settings folds, the help accordion
    and task logs draw a 5x6px CSS triangle in `--muted`; the Library's
    Contents, notes and outlines draw a 16px Phosphor caret. One recipe.
15. **Open. Library counts disagree.** All: "Boards 1"; Boards & maps:
    "All 2" (the empty Default board is in one and not the other).
16. **Open. Chat's "Ask Atlas" suggestion is a two-line capsule on a
    phone** (46px tall, `border-radius: 999px`, 320px wide). Radius-md
    below 600, or a shorter line.
17. **Open. Reminders' quick-set row mixes corners.** "Quick set" at
    `--radius-md` beside two steppers at `--radius-pill` (the stepper's pill
    is on `PILL_CONTROLS` on purpose; the row is the problem, not either
    control).
18. **Open. Import is two steps for one action, three times.** "Choose
    files" then "Import"; "Choose files" then "Import folder"; "Choose
    file" then "Import". One button that opens the picker and imports on
    choosing, the pattern Library's Upload already uses.
19. **Open. Duplicate explanations.** Bookmarks' dock line ("Save links to
    websites you visit often...") and its empty state ("Add a website to
    keep it a click away") say the same thing one above the other.
20. **Open. The phone dashboard's search field stops 19px short** of its
    row's kebab, a gap no other field row has.

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
