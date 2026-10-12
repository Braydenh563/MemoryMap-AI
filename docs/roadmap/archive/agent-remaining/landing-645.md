# landing-645: the GitHub Pages landing site (INBOX 645, its landing-page step)

Worktree `agent-ae70f802266aea670`, cut from `claude/notes-flow-rebuild`.
Sweeps: `scratchpad/ui-sweeps/landing.js` and `landing-contrast.js` (serve
`docs/` on 8793 first), `landing-behaviour.js` (file://).

## Landed

- bdbad35 `docs/index.html` rebuilt as one static page: hero, core loop,
  feature tour (22 images from `docs/screenshots/`, lightbox), privacy and
  offline, install, models, FAQ, footer links, all absolute GitHub URLs. No
  fetch, no external host, no version, date or count in the copy.
  `tests/test_docs_site.py` rewritten to pin those rules.

## Left

- Nothing on the page. INBOX 645's other steps (docs pass, 0.4.0, final
  scan, PR text) are the orchestrator's.

## Found, not fixed

- `tests/test_motion_tokens.py::test_every_interface_transition_runs_on_the_switch`
  fails on the branch head: `frontend/css/icon-picker.css:57`
  (`.icon-picker-tile`) reads `--motion-*`; it should read `--ui-*`.
- `docs/CHANGELOG.md`, `docs/CONTRIBUTING.md`, `docs/SECURITY.md` were
  mirrored only for the old site's fetch; nothing reads them now. Kept (the
  agent rules write both changelogs); retiring them is the orchestrator's call.

## Not verified

- The live Pages deployment (only a local static server and file://).
- Real Safari and Firefox; Chromium only.
