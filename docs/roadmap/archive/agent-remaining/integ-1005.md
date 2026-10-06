# integ-1005 (integration branch, resume after restart)

Done:
- WIP 1115e84 finished (1251fba). Merged: claude/notes-flow-rebuild up to 941ae1d (2290942, 97923ca, 143b240, 88227db, 6382169, f22bd43, 941ae1d), worktree-agent-ad3584a6daa4a586d (backlog), worktree-agent-a5fc003aee83305a1 (search, boot slimming). One alembic head (b4e8d2a6f1c9).
- worktree-agent-a79a18324e9d9899e (292636f) recorded with `-s ours` (3732b05): it built world-class rows 3 to 6, 12, 13, 15, 21, 30, 31, 34 a second time, beside the integration's ae597ce (24 conflicted files, duplicate modules). The integration's implementation is kept; its one new behaviour, Undo for a snooze (2d867a1), is ported (bc9fe0a).
- The note edit form: 616's redesign in note-edit-panels.js (lazy, a stand-in), its word count with the reading time; closeNoteForm with it.
- Lazy moves for the boot budget: renderEditForm, closeNoteForm, the embedding models list, the full backup's handlers, deleteProfile, mergeNamedPrompts, addSkill, the Settings bar's New listener, the privacy tables, placeTemplateCaret, atlasStartersFor, refreshAfterCategoryChange; the companion's menu and enlarged view in a new companion-menu.js; Atlas's rig changes ported into atlas-motion.js. Caps lowered to the measure: boot JS 589,100, total 321,000, app.js 14,300, guards 279, lets 704.
- A boot error the Atlas merge brought (atlasState read by setAtlasMood before atlas-motion.js loads) fixed: atlasState is at boot again.
- Sweeps: noteedit616.js 0 findings at 1440 light and 390 dark; noteeditflow.js all passed (fresh data, one bookmark seeded); a session check of the companion menu, enlarged view, Atlas figure and atlas-life.js load at 1440 and 390, no page errors.

Left:
- "Link all above 70%" (a749b9d): the control already existed on the kept row (`linkSure`); ported what it lacked (the confirm, an honest "Linked n of m", a failed link stays listed, the help line), s2 agent, `tests/test_link_all_sure.py`. The lazy-inbox.css move was not ported.
- A note type made through `POST /note-types` before the list was read, then deleted, loses its id on Undo: not reproduced (nothing seeds note types), pinned by a test, s2 agent.
- autonomous.py's module-level stop flag: `reset_state()`, called by `create_app` and by a conftest autouse fixture (s2 agent).
- `gate.sh --changed` selects most of the suite on this branch; the targeted runs stood in for it.
