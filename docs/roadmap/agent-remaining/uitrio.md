# Agent: three owner reports, INBOX 289, 296 and 307

Worktree `.claude/worktrees/agent-uitrio` on `worktree-agent-uitrio`, cut
from `claude/open-sections-a-b`. Port 8806, data dir `/tmp/mm-uitrio`
(`bash scratchpad/ui-sweeps/serve.sh 8806 /tmp/mm-uitrio`). The Files half
needs `scratchpad/ui-sweeps/seed-libtext.js` and then `seed-libtext.py`
against the data dir, or there is an empty state to measure and the numbers
mean nothing.

All three are built, measured before and after, and moved to HISTORY.
Nothing below blocks any of them.

## Done

Commits `55daeb2` (289), `e34fe42` (296), `157e53c` (307), plus the docs
commit that follows them.

The probe is `scratchpad/ui-sweeps/uitrio.js`, one boot covering all three,
registered in `scripts/gate.sh`'s sweep list. 15 checks, all passing. It
measures rather than captures: `getBoundingClientRect`, `getComputedStyle`
and the resolved line box, at 1440 and 390.

| Report | Before | After |
| --- | --- | --- |
| 289, the Files reading box | 64px, 3.56 lines at an 18px line box | 82px, 4.56 lines; the row below the open one starts at 490.3px of 950 at 1440, 806.3px of 844 at 390 |
| 296, the focused hero | banner 47.2px over a 37.2px field, 100.4px of head, 196px of chrome above the widgets | one row, head 47.2px, chrome 158.8px; full and compact unchanged at 157.2 / 99.6px of hero and 593.6 / 427.9px of chrome |
| 307, the status bar's right end | redo 391px and the navigation group 467px from the bar's content edge, seven items in one flat run | zones state, tools, control; redo 0px and the group 76px from the content edge; at 390 the bar scrolls (587px of content in 390px) with the control zone fully in view |

`tests/test_status_bar_grammar.py` is new and in the gate's lint set: the
zones in order, no control loose in the bar, and `control` refusing new
members. Checked against the fault it is for (a sixth button appended after
redo), which it fails. The recipe is a row in `docs/DESIGN.md`'s index.

## Remaining, none of it started

- **The focused head row's breakpoint is a flex basis, not a measurement.**
  `flex: 1 1 20rem` on the search field is what decides where the row gives
  up and stacks. It was measured at 1440 (one row) and 390 (two bands) and
  nowhere between: 820 and 1024 were not measured for this row. If the head
  reads as cramped at a middle width, that basis is the number to move, and
  the probe already prints `oneRow` and `head` per width.

- **The state zone at 390 measured zero wide.** Every item in it is hidden
  at that width by rules that predate this work, so the bar on a phone is
  the two right-hand zones and nothing else. That is not obviously wrong (a
  note count is not worth a phone's line) but it is not a decision anybody
  recorded either, and it means the AI status dot, which is how this app
  says what the local model is doing, is invisible on a phone.

- **INBOX 301, the app-wide navigation and undo contracts**, is the bigger
  job this touches the edge of and is already placed in WORLD_CLASS_PLAN.
  Untouched here on purpose. What this work gives it is a named home for
  both: `data-status-zone="control"`, with a lint that will fail if anything
  else moves in.

- **The dashboard density picker is hidden below 600**, so a person who has
  never opened the app on a desktop cannot reach Focused at all. Pre-existing
  and documented in the CSS; noted because the focused head row is now the
  level's main feature and a phone cannot choose it.
