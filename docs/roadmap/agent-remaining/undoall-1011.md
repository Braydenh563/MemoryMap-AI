# undoall-1011: remaining (INBOX 898, undo and redo everywhere)

Ratchets: `tests/test_undo_coverage.py` (EXEMPT only shrinks; no GAP class left; `test_every_step_on_the_stack_has_a_redo`, `NO_REDO` empty). Helpers: `frontend/js/undo-kit.js` (lazy), `wbPushCall` and `wbRecordGesture` (board history), `core/undo_bin.py` (the server's undo bin).

Numbers: GAP entries 89 to 0. EXEMPT keeps only auth, read, send, settings, telemetry, job, inverse, board and purge, a reason each.

Not verified in a browser: see the live sweep `scratchpad/ui-sweeps/undoall.js` and its numbers in the report. A board "call" step is not persisted across a reload by design.

Left, found while doing it:
- `tests/test_no_import_cycles.py` fails on main too (`question_noise` -> `spelling` -> `question_noise`), not from this work.
- Accepting a link type or a merge leaves its `accept_*` correction behind after Undo (the link or merge itself is undone).
- A space made opens with a page reload, which empties the session's Undo (EXEMPT job).
