# appsync-1011 (WORLD_CLASS 25f, appearance follows the person): what is left

Built: 13 appearance keys added to `MIRRORED_UI_EXTRAS` (ai-tools.js); `perf` alone stays per machine and keeps the "This browser" chip. Tests: tests/test_appearance_sync.py; two-context check: scratchpad/ui-sweeps/appsync.js.

- No live sync between two open windows: a change in one shows in the other after a reload, not instantly (ai-tools.js `seedUiStateFromServer` runs once at boot).
- First load after this upgrade: a browser with no `ui-synced` record treats its present local values as its own unsent changes, so a stale second browser pushes its look to the notebook once (ai-tools.js `seedUiStateFromServer`).
- `ui_state` bound raised 60 to 80 keys (routes_settings.py `_small_ui_state`); 55 keys are mirrored now.
- Not verified: the desktop (pywebview) profile, a real second computer; only two Chromium contexts on one server.
