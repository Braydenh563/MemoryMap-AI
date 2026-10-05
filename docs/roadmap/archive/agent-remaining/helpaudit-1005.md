# Help audit 1005: what is left

Done (standing order 13, help moves with the UI):

- Every `Settings, A, B` path in the Guide, the README and the app's own
  messages is pinned to the nav and panes by `tests/test_help_settings_paths.py`
  (static markup; JS-drawn groups are named in `JS_DRAWN`).
- `scratchpad/ui-sweeps/helpaudit.js` opens all 21 panes and the 80 distinct
  paths in a browser, checks capitalised control phrases against the pane a
  topic names, a list of tab-level claims against each tab, and that every
  `data-help-for` has its target. `helpdump.js` prints a tab's labels.
- Fixed in the help (UI untouched): Settings, Shortcuts and Tools; Account and
  security; What the notebook learned; Settings, Extras; Settings, Import;
  the search engine's pane in the README; Whiteboards and Boards and maps
  (the sub-tab reads Boards & maps); Files & Images (two sub-tabs); Extract
  notes and the Writing Room (Write with Atlas has Split into notes); the
  autonomous-AI badge (Profile to Background tasks); three popover "below"
  pointers that became Settings, Packages; Support to Support bundle; three
  manual-parity "where" strings.

Still open:

1. **UI labels that disagree with each other** (not help, not touched): the
   Library sub-tab reads "Boards & maps" while `selection.js` and the board
   dock's `aria-label` read "Boards and maps"; the palette row in
   `settings-panes.js` reads "Settings → About & updates" for the pane the nav
   calls About. Decide one spelling each, then update the Guide.
2. **Menus drawn on press** are checked by source grep only: the chat "/"
   menu, a message's menu, the board menus, the notes list's menus. A sweep
   that presses each and lists its items would close it.
3. **JS-built popovers** (`manage-cat-help`, `manage-tags-help`, `inbox-help`)
   and the whiteboard and mind map help bodies (`wb-map-places-help` and kin)
   were not read; the board and map agents own them.
4. **Phone widths**: the sweep runs at 1440 only; a pane's content is the same
   at 390, but a control a narrow window moves into a menu is named for the
   wide layout.
