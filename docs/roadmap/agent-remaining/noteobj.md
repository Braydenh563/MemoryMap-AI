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

- `<hash>` The object itself: `![[board:12|Title]]` renders a preview card
  from `mapPreview`, opens the board on press, tombstones when the board is
  gone. Measured on 8793: card 104px tall x 733 wide with an svg preview,
  tombstone 88px naming "Old plan", press set `window.currentBoardId` to the
  right board, 0 page errors.
- `<hash>` Doorway one, the "/" menu: "Board or mind map" in Links and
  references, choosing through `pickLibraryItemDialog`'s new opt-in board
  source. Measured end to end on 8793: the menu filters to one row on
  `/board` and the chosen board lands in the box as
  `![[board:1|House jobs]]`.
- `<hash>` Doorway two, from the board: `#wb-add-to-note` in the board menu
  and "Add to a note" on the Library card's kebab, both through
  `addBoardToNote` and `appendSelectionToNote` (one write path, one undo).
  Measured: the menu row is 146x36, and choosing a note appended
  `![[board:51|House jobs]]` to that note's own text.
