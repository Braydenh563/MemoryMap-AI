# Agent: the guide panel and the IA read (INBOX 270 part 4, INBOX 266 part 1)

Worktree `.claude/worktrees/agent-a8ee39a2ead46f2bd`, cut from
`fix/gemini-fixes-5`. Port 8797, data dir `/tmp/mm-agentG2`
(`bash scratchpad/ui-sweeps/serve.sh 8797 /tmp/mm-agentG2`).

## Done

- INBOX 270 part 4, the guide panel redesign (`8316d5a`), measured and held
  by `scratchpad/ui-sweeps/guidepanel.js` (31 checks at each of 1440, 1024
  and 390, light and dark). INBOX 270 resolved to HISTORY (`c0398ff`).
- INBOX 266 part 1, the usability and IA read: the click table below, and
  the fixes it found.

## The click table (INBOX 266 part 1, the owner's "3 clicks to anything")

Every row driven in Chromium at 1440x900 from a fresh load of the dashboard
by `scratchpad/ui-sweeps/clicks.js`: a click is a press the script made on a
visible control, typing and the OS file dialog are not counted, and a row
passes only when its end state is on screen. 22 rows, 22 PASS after the
fixes; the "before" column is the same script against the branch head.

| Task | Path | Clicks | Before |
| --- | --- | --- | --- |
| Write a note | Dashboard, New note | 1 | 1 |
| Search everything | Dashboard search field (or Ctrl+P, or Find in the status bar) | 1 | 1 |
| Ask a question of your notes | Dashboard, Ask AI | 1 | **1, into a disabled box with no caret** (no model) |
| Set a reminder | Dashboard, Remind me | 1 | 1 |
| Record a meeting | Dashboard, Meeting notes | 1 | 1 |
| Learn how something works | Status bar, Guide | 1 | 1 |
| Change the dashboard | Widgets | 1 | 1 |
| Switch space or make one | Space switcher | 1 | 1 |
| Change the theme | Header, light/dark | 1 | 1 |
| See the graph / the timeline | The tab | 1 | 1 |
| Edit a note | Notes, the row's pencil | 2 | 2 |
| Import notes from files | Settings, Import & export (then choose files) | 2 | 2 |
| Back up | Settings, Import & export | 2 | 2 |
| Connect a model | Settings, Models (or the Connect button on every AI surface) | 2 | 2 |
| Keyboard shortcuts | Settings, Keyboard shortcuts | 2 | 2 |
| Create a document | Library, Create, New document | 3 | 3 |
| Create a mind map | Library, Create, New concept map (then its name) | 3 | 3 |
| Create a board | Library, Create, New board | 3 | **3, but not from Create**: the picker had no board row, so only via Boards & maps |
| Upload a file | Library, Create, Upload a file | 3 | **3, not from Create** (Files sub-tab only) |
| Take the guided tour | Settings, Help & guide, a tour button (1 from the empty dashboard's card) | 3 | 3 |
| Restore a deleted note | Library, Bin, the note, Restore (Undo in the delete toast is 1) | 4 | 4 |

Restore is the one row over three and is left there on purpose: the fourth
press opens the note so it can be read before deciding, and the immediate
undo is one click from the toast.

### What the read found, and what was fixed (all measured)

1. **Both "Ask" doors on the dashboard led to a disabled box.** "Ask AI" and
   the empty notebook's "Ask your notebook" ("Works on keywords even with no
   AI running") both opened Chat, whose composer is `data-needs-model`. With
   no model: a greyed box, the caret on `<body>`. Fixed: `openAskFromDashboard`
   goes to Notes, Ask when no model is up and Chat when one is, and focuses
   after `switchTab` has finished (dashboard.js).
2. **The Chat tab never said why its box was grey.** Ask, the popup agent and
   the writing desk each carry the one-line "No model is connected" notice
   with its Connect button; Chat, the fourth AI-only surface, had a tooltip.
   Fixed: `#chat-offline`, filled by the same `renderAiOfflineNotice`.
3. **A new notebook's Library said "Nothing of this kind yet."** under
   "Everything 0": the new-notebook test counted the activity log (35 rows
   on an empty notebook) as things made. Fixed: activity does not count, the
   sentence names what to make, a kind names itself ("No meetings yet"), and
   the empty state carries the dock's Create beside the sentence.
4. **Create did not offer a board or an upload.** Seven rows now, in one
   order table (`LIBRARY_CREATE_ORDER`); the sentence that said "Five kinds"
   names no count.

## Remaining

- OPEN.md ledger rows in this agent's areas: not started.

## Found, not fixed

- The guide is still a modal sheet: its scrim dims the app, so a person
  reading "Open the Reminders tab" cannot look at the tab while the answer
  is on screen (a badge navigates, but only by leaving the panel). The agent
  activity panel floats with no scrim. Making the corner variant non-modal
  above 600px changes `openSheet`'s focus and backdrop contract for one
  variant, which wants a decision rather than a CSS line.
- The Chat empty state's "Try asking" chips stay pressable with no model and
  send into the disabled chat. Chat is the grounding agent's area.
- Fixed in passing: `tests/test_files_autoread.py::test_a_description_typed_while_the_model_ran_is_kept`
  failed twice in three gate runs and passed alone: the upload route's own
  background reading pass could land its caption inside the test's window.
  The test switches that pass off now.
