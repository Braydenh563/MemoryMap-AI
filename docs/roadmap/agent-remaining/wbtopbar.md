# The board's top bar and the phone board bar: what this run closed, and what is left

> Companions: [OPEN.md](OPEN.md) (the consolidated ledger, struck with these
> numbers) · [../WHITEBOARD_PLAN.md](../WHITEBOARD_PLAN.md) ·
> [../UI_MODERNISATION_PLAN.md](../UI_MODERNISATION_PLAN.md) Phase 8 ·
> [../HISTORY.md](../HISTORY.md), "Moved from the plans, 2026-09-21"
>
> Every number below was measured in a real Chromium against the running app
> with `scratchpad/ui-sweeps/wbtopbar.js`, which is now in `scripts/gate.sh`'s
> sweep list. Nothing here is a screenshot read as a result.

## Closed, with the number that closed it

| Item | Before | After |
| --- | --- | --- |
| `#wb-topbar`'s control count at 1440, 1024 and 820 | 13 controls, 5 menu toggles and 8 others, one row | 11 controls, 5 toggles and **6** others, one row. Rename this board and New board are the Board menu's first section, ids unchanged |
| The bar past its own content box at 390 | scrollWidth 5px past clientWidth, `wb-fullscreen` 11.4px past | **0px**, nothing past |
| The bar past its own content box at 320 | scrollWidth 75px past, `wb-add-note` 33.4px and `wb-fullscreen` 81.4px past, both unreachable | **0px**, nothing past |
| The bar's controls at 390 and 320 | 11, two rows, 104px tall | **7**, two rows, 104px tall. Full screen and Arrange leave below 600: the first is View, Zoom, Full screen, the second is the twelve actions on the context bar above a selection |
| Every control against the 44px touch floor below 820 | 0 under it, but the probe had been reading `--target-min` as 2.75 (it is declared in rem), so the floor it checked was under three pixels | 0 under it, against a floor resolved by laying an element out at the token |
| The five menus' ARIA | `role="menu"` on each, **0** `role="menuitem"` inside; 8/7/10/19/5 buttons with no role; 2/3/3/5/1 children of the menu with a role ARIA does not allow | 8/7/10/4/2 visible items, **0** rogue buttons, **0** bad children, stamped once at boot by `wbStampMenuRoles` |
| The five menus' keyboard | ArrowDown moved no focus in any of them; Escape closed the menu and left the focus on the row that had just vanished | ArrowDown, ArrowUp, Home and End walk the items (`wireMenuKeyboard`, the app's own); Escape closes and hands the focus back to the toggle |
| A menu item that owns its own listener | Rename, New board and the two map rows left the menu open behind the dialog they opened | Any `.wb-menu-item` closes the menu |

Two fixes `wireMenuKeyboard` needed to reach this bar, both in app.js and both
shared: it can now see items inside a `role="group"` as well as a
`.menu-group`, and it skips an item with no box, which the View menu's two map
rows are on an ordinary whiteboard.

Re-checked after the new keydown listener: V, H, R, O, A and T still pick
their tools, Ctrl+F opens the search bar, Shift+N the overview.

## Left, in the order worth taking

1. **The six controls beside the menus are six, not fewer, and two of them are
   duplicates of a View menu switch.** `#wb-search-toggle` and
   `#wb-navigator-toggle` are the same two things as View, Panels, Search and
   View, Panels, Overview, and both already leave the bar below 600. Whether
   they should leave it everywhere is a design call the plan has not made:
   UI_MODERNISATION_PLAN Phase 8 names "find (search, navigator)" as one of
   this bar's zones, so removing them above 600 would be remaking a decision
   rather than taking one. Next step: an INBOX entry with a one-line
   recommendation, per CLAUDE.md standing order 3.
2. **INBOX 47's counting question is still open**, and it is the reason this
   row could only be answered by splitting the count. Does the ceiling count
   the controls a person reasons about (a segmented view toggle is one
   decision) or the DOM elements `docks.js` counts (three, for an enhanced
   select)? Notes and Library are over the ceiling only on the second reading.
   Owner: UI_MODERNISATION_PLAN Phase 8.
3. **The context bar's own menu (`#wb-context-menu`) is stamped and wired by
   the same loop but is not swept.** `wbtopbar.js` measures the five top-bar
   menus; the sixth is the context bar's `⋯`, which only exists over a
   selection. `wbcontextphone.js` is where that sweep belongs.
4. **The OCR workspace head still cannot be measured.** `wbtopbar.js` keeps
   the probe pointed at it and reports "not open in this notebook": the
   workspace exists only once a scanned file is open, and the sweep's notebook
   has no path to one. Unchanged by this run, and the missing piece is still a
   way to get a scanned file into the fixture.

## Not verified

- Only light theme. The bar's surface reading (`--modal-bg` over
  `--glass-border`) is printed at every width but was not compared against
  dark; `contrast.js` covers the text side at 390, 820 and 1440 in both.
- A real screen reader. The ARIA is measured as roles and as focus movement,
  which is what a browser can tell you; what NVDA or VoiceOver announces for
  these menus is reasoned, not observed.
- The three widths between 600 and 820 where Arrange and Full screen are still
  on the bar were measured at 820 only (`wbtopbar820.js`, 0 overflow).
