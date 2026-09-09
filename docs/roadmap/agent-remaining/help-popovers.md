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
- Four more sections (worktree `agent-a6db54045f3f6f144`, commits
  `2f9b4c0`, `6084fb7`, `dc0e2b8`, `4783734`, all `scripts/gate.sh
  --changed` clean, not pushed): Background tasks (Running now,
  Autonomous background AI, Battery-efficient mode), Templates, What it
  remembers, Appearance's Themes and Status bar groups. Two of these
  (Templates, What it remembers) had no heading of their own at the
  top level, so one was added matching the settings nav's own label,
  to give the "?" trigger the `.help-head` recipe's usual home, the
  same eyebrow style every nested settings-group heading already uses.
  Each verified in Chromium: opens on the "?", shows the full original
  paragraph (inline `<em>`/`<strong>` preserved where the source had
  it), sits inside the viewport at 1440x900, closes on a second click.
  index.html count: 53 to 45.

## Next steps, in order (the owner's screenshots first)
1. ~~Running now; Autonomous background AI; Battery-efficient mode.~~ Done.
2. Tesseract OCR head: title + Installed chip + Reinstall/Remove on one
   row at 1440 and 1024, wrapping only at 390 (the wrap itself is fixed,
   see agent-remaining/wrap-sweep.md report 4); its per-extra caveat
   paragraph to a popover is NOT done. This is a different shape from
   every other item on this list: the caveat text is built by
   `renderExtras()` in app.js, one row at a time from server data, not
   static markup in index.html, so `count.py` (which reads index.html
   only) never counts it and a fix needs a dynamically-created
   trigger/panel pair per row rather than a static edit. Worth deciding
   first whether a package's one or two sentences of caveat really is
   "a wall of prose" this task is about, or whether it is already the
   right length for what it is.
3. ~~Personas~~ (its two paragraphs are already under 120 chars, never a
   `count.py` hit, nothing to do). ~~Templates~~, ~~the What it
   remembers pair~~ done above. Left: Links head; Writing suggestions
   panel; the editor footer hint ("Saves automatically...").
4. Everything else `count.py` still lists (45 remaining), five sections
   per commit. Note: `#settings-tools` ("Tools it can use", "How many
   are offered at once", "Small model mode") is INBOX 83, owned by a
   named agent ("Fable, now") per that entry; check it is not already
   converted on the branch before touching it, to avoid a collision.
5. The two JS strings (`dashboard.js`, `library.js`).
6. Toggle rows onto one recipe (no lavender-filled bars).
7. `scratchpad/ui-sweeps/help-popovers.js`: open every '?' on Settings,
   assert each popover rect is inside the viewport at 1440 and 390.
8. Gate: both counters print TOTAL 0; lints; errors.js 0.
