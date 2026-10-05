# integ-1005 (integration branch, resume after restart)

Done:
- WIP 1115e84 finished and amended (1251fba): the undo test lists before it makes (the seeded types took the deleted id).
- Merged claude/notes-flow-rebuild 2290942 and 97923ca, worktree-agent-ad3584a6daa4a586d (backlog), worktree-agent-a5fc003aee83305a1 (search, boot slimming). One alembic head (b4e8d2a6f1c9).
- Conflicts: one Show in graph row on a Library document (`showNoteInGraph(id, { document: true })`); the edit form's word count in the new foot; lazy tables unioned; showDetailDialog and addBoardToNote moved by both sides, one copy kept.
- Boot under every cap without raising one: 63 same-bundle guards dropped; renderEditForm and eight one-caller helpers into the lazy files that call them. Measured and set: boot JS 590,758 (cap 590,800), app.js 14,207 (14,300), total 322,228 (322,300), guards 288, lets 705.
- `scratchpad/ui-sweeps/int1005-editlazy.js` 12/12 at 1440 light and 390 dark (edit form via its stand-in, save, Settings handlers, no console errors).

Left:
- INBOX 577 to 587 were already gone from INBOX.md; nothing deleted.
- A note type made through `POST /note-types` before the types list was ever read, then deleted, loses its id on Undo (the seeding on the next list takes id 1).
- `gate.sh --changed` selects 724 files on this branch (most of the suite) and timed out at 1700s; the targeted runs above stood in for it.
