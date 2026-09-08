# Paragraphs to '?' popovers: remaining (agent paused to save usage, nothing dropped)

Resume with SESSION_BRIEFS.md Brief 4. Worktree `agent-a228ba0fe38c417dc`
(branch `worktree-agent-a228ba0fe38c417dc`, port 8818, data `/tmp/mm-copy`);
its commits `8b8ccd5` and `24d0bf7` are merged into the branch.

## Done
- `initHelpToggles()` in `frontend/app.js`: any `[data-help-for="<id>"]`
  button plus a `.help-body.hidden` panel is wired with no JS (Escape,
  outside click, second click close; focus+Enter opens). Idempotent, so
  call it after a lazy render.
- Settings > Model backend: the two paragraphs moved into a popover; the
  shared `.help-head` / `.help-body` CSS at the end of
  `frontend/css/01-forms-settings.css`.
- `scratchpad/help-audit/count.py` (index.html) and `countjs.py` (JS
  strings): the counters. Baseline: index.html 55, JS 2. After the Model
  backend section: 53 and 2.

## Next steps, in order (the owner's screenshots first)
1. Running now; Autonomous background AI; Battery-efficient mode.
2. Tesseract OCR head: title + Installed chip + Reinstall/Remove on one
   row at 1440 and 1024, wrapping only at 390; its paragraph to a popover.
3. Links head; Personas; Templates; Writing suggestions panel; the editor
   footer hint ("Saves automatically...").
4. Everything else `count.py` lists, five sections per commit.
5. The two JS strings (`dashboard.js`, `library.js`).
6. Toggle rows onto one recipe (no lavender-filled bars).
7. `scratchpad/ui-sweeps/help-popovers.js`: open every '?' on Settings,
   assert each popover rect is inside the viewport at 1440 and 390.
8. Gate: both counters print TOTAL 0; lints; errors.js 0.
