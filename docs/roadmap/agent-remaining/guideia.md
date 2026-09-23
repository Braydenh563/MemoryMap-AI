# Agent: the guide panel and the IA read (INBOX 270 part 4, INBOX 266 part 1)

Worktree `.claude/worktrees/agent-a8ee39a2ead46f2bd`, cut from
`fix/gemini-fixes-5`. Port 8797, data dir `/tmp/mm-agentG2`
(`bash scratchpad/ui-sweeps/serve.sh 8797 /tmp/mm-agentG2`).

## Done

- INBOX 270 part 4, the guide panel redesign (`8316d5a`), measured and held
  by `scratchpad/ui-sweeps/guidepanel.js` (31 checks at each of 1440, 1024
  and 390, light and dark). INBOX 270 resolved to HISTORY.

## Remaining

- INBOX 266 part 1, the usability and IA read: in progress (click table
  below).
- OPEN.md ledger rows in this agent's areas: not started.

## Found, not fixed

- The guide is still a modal sheet: its scrim dims the app, so a person
  reading "Open the Reminders tab" cannot look at the tab while the answer
  is on screen (a badge navigates, but only by leaving the panel). The agent
  activity panel floats with no scrim. Making the corner variant non-modal
  above 600px changes `openSheet`'s focus and backdrop contract for one
  variant, which wants a decision rather than a CSS line.
- Fixed in passing: `tests/test_files_autoread.py::test_a_description_typed_while_the_model_ran_is_kept`
  failed twice in three gate runs and passed alone: the upload route's own
  background reading pass could land its caption inside the test's window.
  The test switches that pass off now.
