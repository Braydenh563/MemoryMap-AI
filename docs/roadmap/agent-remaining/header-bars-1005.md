# Header bars 1005: what is done, what is left

Branch: this agent's worktree, cut from `claude/notes-flow-rebuild` at
`68b53a1`. Sweeps in `scratchpad/ui-sweeps/` at 1440 and 390, light and dark,
on port 8813 (8803 was another agent's server) with data dir `/tmp/mm-docks`;
the base measured from an archive of `68b53a1` on 8814.

## Done

1. **INBOX 621, the docks** (`dockgrammar621.js`: 59/58/26/26 fails before at
   1440 light, 1440 dark, 390 light, 390 dark; PASS in all four after). One
   grammar at the `.dock` recipe: no zone hairlines, the title as page head, a
   quiet count, a quiet search field with its magnifier, one segmented style,
   icon ghosts as one trailing run, the filled action last. DESIGN.md's dock
   row and `test_dock_grammar.py` hold it.
2. **INBOX 621, the graph's display options** (`graphpop621.js`): one column,
   one control width, one head style, menu-row actions, no control in a
   summary.
3. **INBOX 622, Settings navigation** (`settingsnav.js`, `settingsgroups622.js`):
   the pane's groups are the sidebar's second level and the phone's jump
   list's; nothing in Settings scrolls sideways at 1440 or 390;
   `test_settings_no_sideways.py`.

## Left

- `settingsnav.js` at 390: "Enter on a nav entry", "an arrow key walks the
  list" and "exactly one nav entry is aria-current" fail on the base as well:
  below 640 the nav buttons are hidden behind the jump list, so the sweep's
  keyboard checks do not apply there. The sweep should skip them below 640.
- Settings, Tools it can use at 390: a tall empty gap between "Tokens per
  step"'s description and its field (seen in a screenshot, not measured, not
  checked against the base).
- `scratchpad/ui-sweeps/dockseams.js` measured the wrapped-line hairlines that
  no longer exist; it is obsolete.
