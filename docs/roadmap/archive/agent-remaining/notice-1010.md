# notice agent, 2026-10-10 (INBOX 767)

Built: the no-model notice is one row on the `.notice` recipe (status.js `renderAiOfflineNotice`, 03-dashboard-widgets.css `.ai-offline-note.notice`).

- Row height at 1440 is 46.8px, not "one line plus padding" (about 38px): the Connect button's 28.8px target floor sets the row. Left as is; shrinking it would break the touch-target lint.
- The palette is never shown on a phone (`toggleAgentPalette` goes to Chat), so its 390px notice is unmeasured by design.
- Boot CSS cap raised 183,300 to 183,360 (tests/test_boot_budget.py): the row and phone grid net +58 gzipped and no live rule could be removed. The orchestrator may prefer to offset it elsewhere.
- `tests/test_ask_answer_object.py::test_ask_is_never_disabled_when_the_model_is_off` fails on the base branch: `trigger.dataset.needsModel` for the Chat skills trigger (not this change).
