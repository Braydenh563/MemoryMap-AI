# UI polish pass, 2026-09-24 (branch fix/gemini-fixes-5)

Port 8811, data dir /tmp/mm-polish (86 notes, 30 images, 3 reminders).

## Landed

- 0c1efb0 Chat: "no model" said once (the composer notice keeps it, the header
  badge hides while no model runs); the "Ask Atlas: ..." offer is the starters'
  chip (was an 18px underlined link), one builder for empty states and help
  popovers (`atlasSuggestion`).
- 055306c Settings, Appearance: groups are `details.settings-fold` with
  `data-fold-key`, Themes open, state remembered (`wireSettingsFolds`,
  settings.js); new "Atlas and faces" group. 4,022 -> 1,298px. DESIGN.md fold
  row updated; lint `test_a_folded_settings_group_is_keyed_and_remembered`.
- e90aeaa Settings: Keyboard shortcuts 2,621 -> 1,752px, Extras 2,536 ->
  2,044px, Skills 2,615 -> 2,118px (form opens on edit); three package
  descriptions' developer copy removed (extras.py).
- 8e989ea Popups sweep: note card Favourite/Copy/more-actions were
  unpressable (pointer-events inherited from `.entry-meta-end`), fixed;
  notifications panel at 390 x=-34 -> 10..380; dialog buttons and menu rows
  36 -> 44px under the touch floor.

## Left, in order

1. Item C, rest of the sweep: the graph node panel, the whiteboard context
   bar (`#wb-context`), sheets at 390, toasts. Scratch probes that did the
   first half: `popups.js`, `deadbtn.js`, `kebab2.js` in the session
   scratchpad (not committed); rewrite into `scratchpad/ui-sweeps/` if kept.
2. `deadbtn.js` findings not yet triaged: Chat `#chat-export` and
   `#chat-delete` report another element (an `i.ph`) at their centre;
   Library cards near the window bottom are under the status bar footer
   (`FOOTER.edge-fade`), likely scroll-padding rather than a bug; check each.
3. Icon-only buttons in dialogs stay 36px under a coarse pointer (widget
   picker's move/remove, 390): the touch floor rule in 07-whiteboard-misc.css
   excludes `.icon-only`; decide an icon-only floor app-wide.
4. Item D, surface-by-surface pass (Notes list and capture, Chat, Library,
   Timeline, Reminders, Graph panels, Whiteboard bars, Settings sections):
   not started.
5. Settings: the folded summaries with a '?' are 47px, the rest 36px; the
   Skills list rows are ~78px each (20+ built-ins); Packages rows leave a
   16px gap between the title row and the description.

## Not verified

Dark theme and the flat looks for every change above; `touch.js`,
`contrast.js`, `errors.js` sweeps not run; the extras.py copy change was not
seen rendered (server not restarted after it). Full suite not run.
