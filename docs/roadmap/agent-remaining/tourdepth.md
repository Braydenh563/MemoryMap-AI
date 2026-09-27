# Agent: the tour, chained and in depth, INBOX 398

Worktree `.claude/worktrees/agent-a586e215ee3227815`, cut from
`fix/gemini-fixes-5`. Port 8798, data dir `/tmp/mm-agentT2`
(`bash scratchpad/ui-sweeps/serve.sh 8798 /tmp/mm-agentT2`).

The owner, verbatim: "Ok your guided tour fix worked! though If I want to do
the other sections of the tour, I have to go into the help settings and click
the other tour section buttons, and they dont guide me through the other main
features."

INBOX 398 is fixed and moved to HISTORY's "INBOX resolved". Nothing below
blocks it.

## Done

- **Chaining** (`frontend/tour.js`, `dad2ff6`): a run is every section from
  the one it starts at to the end; the count is per section; a section's
  last card says "Next: <section>" beside Finish; Back walks into the
  previous section.
- **Depth**: eleven sections, each walking into its feature (the basics,
  Notes, Chat, Graph, Library, Boards, Mind maps, Timeline, Reminders,
  Settings, the status bar). New step fields `library`, `wb`, `settings`,
  `need`, `media`, documented at the head of `TOUR_SECTIONS` and in
  DESIGN.md's tour row. Ids added in `index.html`: `library-subtab-docs`,
  `settings-nav-models`, `settings-nav-appearance`, `settings-nav-help`.
- **Found on the way** (`015da32`): the Library card's select tick sat
  exactly on its ⋯ menu button at `z-index: 1`, so a press on ⋯ ticked the
  card instead of opening its menu.
- **Measured** with `scratchpad/ui-sweeps/tour.js`, extended for chaining,
  at 1440x900, 1184x760, 390x844 and 1600x890 at 1.25.

## Remaining, none of it started

- **The owner's desktop window is the real test.** Every number above is
  headless Chromium on a seeded notebook (40 notes, one mind map).
- **A first-run notebook** (no notes, no boards) is covered only by forcing
  `TOUR_NEEDS.map` false in the sweep; a fresh data dir walk was not run.
  With no entries the Library's "a card's menu" step is left out by its
  `need: "entries"`; not measured.
- **The status bar section is left out on a phone** (the bar is not drawn
  below 600), so a phone run ends at Settings. If the phone should be told
  about Commands, Ask, Guide and Find, the phone's equivalents need naming.
- **`tourdim.js` and `toursteps.js` were not rerun.** They open "basics",
  which now chains on through every section; they may need their walks
  bounded to one section (press Finish at the first section end).
- **Widths between 600 and 1100** (a tablet, a half-screen window) were not
  walked; the `or` controls there (Options for the Timeline view switch,
  More for the reminders' view toggle) were measured only at 390.
