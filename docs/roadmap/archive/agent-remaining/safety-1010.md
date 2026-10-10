# safety-1010: Brief 51 (never lose a note, 25e, rule 1.8)

## Built

- `tests/test_restore_roundtrip.py`: backup restored into a second app on an empty data dir, zip and sealed; ten kinds compared by rows and every file by hash; all equal, nothing to fix.
- Boot integrity: `backup.check_at_boot` (`PRAGMA quick_check`, 30 ms at 5,000 notes; full check 55 ms), first housekeeping step; `GET /backups/integrity`, `/storage.integrity`; sticky toast plus a `.notice-warn` in Settings, Import & export; `DamagedNotebookError` with the way back when the file cannot be opened at all.
- History's Put this back: `pushUndo` plus the toast's Undo, no confirm (note-history.js, lazy, 0 boot bytes).
- `tests-e2e/specs/draft-recovery.spec.js`: SIGKILL the server, restart, reload; Capture, Quick note and the edit form all come back (1 passed).
- `offerUndo` (status.js) and `tests/test_undo_contract.py` (ratchet 10 to 7); folded: categories, chat delete, import (with redo), Writing desk passes (with redo).

## Left

- `editor.js:inlineAiUndo` (owner's list of six): the inline AI bar's Undo reverts a CodeMirror transaction on unsaved field text, which rule 1.8 gives to the editor's own history. Recommendation: move it to the lint's editor histories rather than the stack (a stack entry outlives the field it would write to). Needs the decision taken.
- `dashboard.js:undoActorFrom` / `activityUndoControl` (and their two helpers) and `note-history.js:undoSkillRun`: an undo of the AI's changes through `POST /events/undo`, which refuses the person's own changes ("Undo works on the AI's changes, not yours", routes_settings.py:1648), so there is no redo to give `pushUndo`. Needs a server redo (re-apply the reversed events) before they can fold.
- `pushDocAiUndo` (documents.js:11084) already calls `pushUndo`; nothing to fold. It has no toast by design (the AI edit log is its second way back).
- The plan row names a "Versions" row; the note menu's existing row is "History" (versions plus every other event). Not renamed: a rename moves help in five places for no new reach. Recommendation: keep "History", record the decision.
- A notice's `go: { settings, focus }` scrolls Settings to the control at 1440 (Back up now at y 499 of 900) but not at 390 (y 1527 of 900): the phone sheet does not scroll to `scrollToId` (settings.js:245). Shared by every notice that opens Settings.
- No backup schedule "shown with the last success" (WORLD_CLASS 4018 row) beyond Settings, About, Health's last backup line.

## Not verified

- A real disk failure or power cut; damage was made by overwriting pages of a copy (three embeddings leaves: opens, notice shows; pages read by the start-up backfill: `DamagedNotebookError`). The desktop launcher's loading window showing the damaged-file words was not driven (only `startup_status.get_phase()` asserted).
- The e2e spec ran locally once (2.0 min); not in CI yet.
- Folds measured with direct calls to the real functions (`deleteCategoryFromPanel`, `chatDeleteUndo`, `undoImport`, `pushDraftUndo`) after an API setup, not by clicking through each surface's own menu.
