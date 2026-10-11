# firstrun49, 2026-10-11 (WORLD_CLASS_PLAN 25c, Brief 49)

Built: the manual, the first steps, the sample notebook (HISTORY "Moved from
the plans, 2026-10-11 (WORLD_CLASS 25c, Brief 49)"). Left, one line each:

- The first-run queue asks three questions before the dashboard (welcome, recovery key offer, update question): 3 of the 11 acts to a first answer. Folding the recovery offer and the update question into the welcome's last slide would take it to 8. onboarding.js `firstRunTurn` (the queue).
- Sidebar Most used keeps a binned note for up to 30 s (`loadMostUsed`, status.js:1820, `cacheMs: 30000`): seen after Remove the sample notes. Clear the cache on a bin.
- The manual has no deep link from a Guide answer to its topic (`openManual(topicId)` takes one; help-chat.js's answer chips could add "Read in the manual").
- The name field in step one is 13.6px on a phone (the app's input size); check whether iOS zooms on focus (not verified, no device).
- `tests/test_error_toasts.py::test_expected_situations_are_plain_toasts` fails on the base too (a stale EXPECTED entry for whiteboard-interchange.js's "No flowchart found" toast); not touched here.
- `smallButton` (app.js:1767) sets `aria-label` to the title on every button, so a worded button's accessible name is its tooltip, not its words (WCAG 2.5.3, label in name); first-run.js's doors drop it, the rest of the app does not. Fix in app.js once it has bytes to spare: only when the label is an icon alone.
