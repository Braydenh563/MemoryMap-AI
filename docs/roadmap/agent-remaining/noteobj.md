# agent-noteobj: INBOX 309, a board or a map as an object in a note, and a note's reminders

Worktree `.claude/worktrees/agent-noteobj`, branch `worktree-agent-noteobj`,
port 8793, data dir `/tmp/mm-noteobj`.

## What the read found (before building anything)

- **A note's typed objects are markdown constructs**, not rows: callouts
  (`> [!kind]`), transclusions (`![[name]]`), tables, math, code, checklists.
  The "/" menu (`frontend/editor.js`, `editorCommands`) inserts text; the
  renderers are `renderNoteText` (note cards) and `renderMarkdown` (documents
  and chat), and **both** route a `![[name]]` line through one function,
  `mdEmbedElement` (app.js ~26828). One change covers all three surfaces.
- **`resolveWikiTarget` already resolves a board** (`{kind: "board"}`), and
  `renderNoteInline` already draws an inline `mapChip` for `[[My map]]`.
  `mdEmbedElement` does **not**: it handles note and document and falls
  through to "Nothing called X yet" for a board. Measured on 8793 before any
  change: `![[board:1|House jobs]]` and a plain board name both render as
  "Nothing called ... yet".
- **`mapPreview(board, {size})`** (app.js ~2056) is the one board/map
  thumbnail renderer, fed by `preview_items`/`preview_edges` from
  `/whiteboard/boards`, indexed by `loadMapBoardIndex`/`mapBoardById`. Reused,
  not rewritten.
- **`Reminder.entry_id` already exists** (`core/database.py`), the
  `set_reminder` tool already takes `note_id` and stores it, `POST /reminders`
  takes `entry_id`, the note card's "Remind me" inline action already passes
  `entry.id`, and a reminder row already shows a chip naming its note
  (`entry_preview`). **The brief's premise that the column is missing is
  wrong; no migration is needed.** What is missing is the other direction:
  no `entry_id` filter on `GET /reminders`, and nothing on the note.

## Done

(filled in per commit)

- Failing sweep `scratchpad/ui-sweeps/noteobject.js`, registered in
  `scripts/gate.sh`. Measured against the unchanged code: 6 findings.

## Left

- `877680b` The object itself: `![[board:12|Title]]` renders a preview card
  from `mapPreview`, opens the board on press, tombstones when the board is
  gone. Measured on 8793: card 104px tall x 733 wide with an svg preview,
  tombstone 88px naming "Old plan", press set `window.currentBoardId` to the
  right board, 0 page errors.
- `b12a161` Doorway one, the "/" menu: "Board or mind map" in Links and
  references, choosing through `pickLibraryItemDialog`'s new opt-in board
  source. Measured end to end on 8793: the menu filters to one row on
  `/board` and the chosen board lands in the box as
  `![[board:1|House jobs]]`.
- `ad0b303` Doorway two, from the board: `#wb-add-to-note` in the board menu
  and "Add to a note" on the Library card's kebab, both through
  `addBoardToNote` and `appendSelectionToNote` (one write path, one undo).
  Measured: the menu row is 146x36, and choosing a note appended
  `![[board:51|House jobs]]` to that note's own text.
- `de74a3b` Half two, the reminders: `GET /reminders?entry_id=` and
  `GET /reminders/counts?ids=`, a `.chip.reminders` on the card and the
  panel under it. No migration: `Reminder.entry_id` already existed, so the
  brief's premise was wrong. Measured on 8793: chip reads "2 reminders" at
  24px, the panel lists both by name.
- `de74a3b` Docs: DOCUMENTS_PLAN section 19 (the read, what was built, five
  decisions, what was deliberately not done), DESIGN.md recipe row for an
  embedded surface, its lint in `tests/test_ui_recipes.py`, CHANGELOG.
- `1d67aad` The `set_reminder` tool's description now says what `note_id` is
  for, so a reminder Atlas makes out of a note keeps the note. The sweep
  types through the engine (`.note-surface .cm-content`) rather than into the
  textarea behind it, which is what a person does and which removed a
  "Selection points outside of document" the old path caused.
- `8309f84` A dead board reference no longer offers to create a note named
  after its address; it says the board is gone. Sweep now also measures the
  object in a document's rendered view, 104px with an svg and no tombstone
  (`0d81135`).

## Left

Nothing in INBOX 309 is outstanding. What is worth doing next, in order:

1. **The board object on a phone is measured but not swept.** At 390x780
   the card is 290x104 with a 112x62 picture and a 115px title, no overflow
   in the card and none on the page, and the button that opens the board is
   102px tall; the reminder chip is 112x24, the same height as the
   references chip beside it. That was a one-off probe, not a step in
   `noteobject.js`: the sweep still runs at 1440 in both themes, and the
   phone reading should be a step in it so it cannot regress unseen.
2. **A board object in the chat transcript.** `renderMarkdown` draws it
   there too and it has never been measured there; a model that writes
   `![[board:12|...]]` back at you would produce one. Same sweep, one more
   step.
3. **`mapChip` for the id form inline.** `[[board:12|House jobs]]` resolves
   and draws the map chip already (measured through the dead-reference case
   only, where it correctly falls back to a wiki link). The live case is
   reasoned, not measured.
4. **A reminder made from a board.** The link this work drew is note to
   reminder; a reminder about a *board* still has nowhere to hang.

## Not verified

- Anything below 820px inside the *sweep*: the phone numbers above are
  from a one-off probe, so they are true today and unguarded tomorrow.
- The desktop shell (`start-desktop.sh`); browser only.
- What a real model does with the `set_reminder` description change. Every
  provider test here runs against a fake transport (CLAUDE.md section 4).
