# chrome2 (port 8801, data dir /tmp/mm-chrome2)

INBOX 234, 230, 233, 231, 236, 235, 237 in that order, on `agent/wip-chrome2`.
Sweeps under `scratchpad/ui-sweeps/`.

## Landed

- 234, Atlas answer badges that name a Settings section open it, `3dbe0e5`
  (`atlasbadge.js`).
- 230, an escaped kebab menu draws above every overlay it can open over,
  z-index 1020 to 2550, `7916d4c` (`palkebab2.js`).
- 233, the document dock's ⋯ is capped to the room under its own top and opens
  upward under 240px, `68d69eb` (`dockebab.js`).
- 231, the popup agent's starters are rows on `--row-h`/`--row-gap` rather than
  bordered pills, `d7d15b7` (`starters.js`, both themes, 1440 and 390).
- 236, the chat welcome's '?' in its top right corner, and wired at all (it had
  never been), `f46d287` (`chatemptyhelp.js`).

## Left, in order (cut by the PR deadline, not by a problem)

- **235, Settings.** Two edits, `frontend/index.html` only, `SETTINGS_SECTIONS`
  untouched: (a) a `var(--space-4)` gap between the Ask Atlas row and the FAQ
  group on the Help page (the row is around `index.html:9117`, the
  `data-goto-section="help"` button's block); (b) the "Advanced response
  settings" group moves above "Installed models" on the Models page, by moving
  the group's block in the markup. Next step: `grep -n "Advanced response"
  frontend/index.html`, move the whole `<div class="settings-group">`, gate
  `--staged`, measure the gap with a sweep at 1440.
- **237, the built-in Librarian persona is Atlas.** `frontend/app.js` near line
  21492 mirrors the backend's built-in personas; rename the built-in card to
  Atlas with the description "Atlas, this notebook's librarian: files, links
  and answers from your notes." on both sides (the backend's built-ins live
  with `resolve_persona_prompt`, `src/memorymap/ai/librarian.py`), keeping the
  id "Librarian" so stored preferences still resolve. Test in
  `tests/test_personas*` or the nearest.

## Found, not fixed

- The chat welcome's '?' was the one help trigger in the app built after boot,
  and `initHelpToggles()` only runs once at boot over the whole document. Fixed
  for that one caller (`f46d287`); anything else built after boot with
  `data-help-for` has the same hole and there is no lint for it.
