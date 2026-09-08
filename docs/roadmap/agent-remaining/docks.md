# Phase 8, the dock grammar: what is left

> Companion to [`../UI_MODERNISATION_PLAN.md`](../UI_MODERNISATION_PLAN.md)
> Phase 8, whose "Built, second sitting" block records what landed. Nothing
> here is dropped; it is deferred, and each item names the file, the id and
> the exact next step so a fresh session can start on any line of it without
> re-deriving the context.

## How to pick this up

```bash
scratchpad/ui-sweeps/serve.sh 8799 /tmp/mm-docks          # its own port and data dir
BASE=http://127.0.0.1:8799 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
  node scratchpad/ui-sweeps/seed.js                       # once per data dir
cd scratchpad/ui-sweeps
BASE=http://127.0.0.1:8799 SCRATCH=/tmp/mm-docks PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node subdocks.js    # inventory
BASE=http://127.0.0.1:8799 SCRATCH=/tmp/mm-docks PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node dockprobe.js   # behaviour
BASE=http://127.0.0.1:8799 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node setheads.js                          # Settings heads
BASE=http://127.0.0.1:8799 SCRATCH=/tmp/mm-docks PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node errors.js      # must be 0 at all widths
```

Gates after every surface: `node --check` on any touched JS;
`.venv/bin/python -m pytest -q tests/test_dock_grammar.py tests/test_frontend_ids.py
tests/test_frontend_handlers.py tests/test_style_scale.py tests/test_ui_signatures.py
tests/test_icon_only_buttons.py tests/test_icon_label_gap.py`; CSS brace balance;
`errors.js` 0 findings at 1440/1024/390. Add each finished surface's
`data-dock-name` to `ON_THE_GRAMMAR` in `tests/test_dock_grammar.py`.

---

## 1. The keyboard pass the acceptance criteria still ask for

**File to create:** `scratchpad/ui-sweeps/keys.js`
**Named by:** UI_MODERNISATION_PLAN.md Phase 8, "Acceptance".

`dockprobe.js` covers half of it already: Escape closes an open dock menu
and returns focus to its own summary, at 1440 and 390, for every dock that
has a menu. What is not covered is the other half the plan states: Tab into
a dock and arrow across it. Grammar rule 8 asks for `role="toolbar"` with a
**roving tabindex**, and no dock has one: every control is in the tab order
individually, so tabbing through the Library head costs six presses instead
of one.

Next step, in order:

1. Write `keys.js`: for each `[data-dock-name]`, focus the element before
   the dock, press Tab, and record which element takes focus and how many
   Tabs it takes to leave the dock. Print one row per dock. That is the
   baseline, and it will show 5-11 stops per dock.
2. Then decide whether to implement roving tabindex. It is one delegated
   `keydown` on `[role="toolbar"]` in `frontend/app.js` beside the existing
   delegated `.dock-menu` handlers (search `details.dock-menu` to find
   them), plus `tabindex="-1"` on every dock control but the active one.
   **Weigh it first:** a roving toolbar that a screen reader user does not
   expect is worse than six tab stops, and every dock here also contains a
   text input, where arrow keys mean "move the caret". The honest options
   are (a) roving tabindex with inputs excluded, (b) drop
   `role="toolbar"` for `role="group"` and keep plain tabbing, which is what
   these rows behave like. Record the decision either way.

## 2. Seven visible controls per row

**Rule:** UI_MODERNISATION_PLAN.md Phase 8, rule 5. **Measured at 1440 in
the running app**, counting the way the grammar counts: a segmented control
is one control, an enhanced select is one (not its shell plus its opener), a
`details.dock-menu` is one, and anything with no box does not count.

| Dock | Visible controls | Over? |
| --- | --- | --- |
| reminders | 2 | no |
| library-skills | 3 | no |
| library-links | 4 | no |
| library-docs | 5 | no |
| library-media (Images) | 5 | no |
| library-contents | 5 | no |
| timeline | 6 | no |
| chat | 6 | no (4 of them are seen: two are `visually-hidden` proxies) |
| library | 7 | at the ceiling |
| library-boards | 7 | at the ceiling |
| library-media (Files) | 7 | at the ceiling |
| notes | 8 | **over by one** |
| graph | 9 | **over by two** |

Two are over, and neither came from this sitting.

`notes` is eight: `#note-search`, `#notes-filter-menu`, `#note-sort`, the
view segment, `#select-btn`, `#notes-refresh`, `#search-help`,
`#notes-more-menu`. It was nine until `#notes-expand-all` moved into the
kebab this sitting.

`graph` is nine: `#graph-concept-maps`, `#graph-search`,
`#graph-trace-toggle`, `#graph-view-menu`, the saved-views select,
`#graph-add-node`, `#graph-refresh`, `#graph-help-toggle`,
`#graph-more-menu`. The plan's own target for it (item 2 under "The work,
surface by surface") is 9 or fewer visible, down from 28, so it has hit the
target that section states and misses rule 5's general ceiling by two.
`#graph-concept-maps` is a `.dock-link` in the identity zone rather than a
control, which is arguably an eighth-plus-a-link rather than a ninth
control; decide that before moving anything.

**Next step for notes:** move `#select-btn` (frontend/index.html, in the
notes dock's `.dock-actions`) into `#notes-more-menu` as a
`doc-dock-menu-item`, above the "Notes per page" `.dock-menu-section`. Its
listener is `$("select-btn")` in `frontend/app.js`; the delegated
`.dock-menu` handler closes the menu after the click, which is right for
entering select mode. Check afterwards that the batch bar (`#batch-bar`)
still appears and that `#batch-cancel` returns the button's label to
"Select".

**Next step for graph:** settle whether `#graph-concept-maps` counts, since
it is a link to a sibling surface in the identity zone and not a control on
this list. If it counts, `#graph-trace-toggle` is the one to fold into
`#graph-view-menu` (it is a mode, and that menu already holds the modes).

## 3. The Dashboard hero

**Deferred by the owner, not by judgement.** The owner prefers the
banner-style hero (wordmark eyebrow, large greeting, large accent clock) and
it was being restored on `main` while this branch ran. **Do not touch**
`.dash-hero`, `.dash-wordmark`, `.dash-greeting`, `.dash-clock*` in
`frontend/css/03-dashboard-widgets.css`, the hero markup in
`frontend/index.html` (`#dash-hero`, around line 488), or `dashboard.js`'s
`renderEmblem($("dash-hero-emblem"), …)` call.

What was checked and is fine, so nobody re-checks it: the 24 dashboard
widget head rows are one shape, measured in the running app: `h2` at
16px/650, `gap: 9.6px`, `justify-content: space-between`, no controls in
any of them. That is the `.card > .row:has(> h2)` recipe the brief asks be
kept, and it is kept.

Still open on that tab if the hero work ever resumes: `.dash-toolbar` holds
`#dash-widgets-open` and `#dash-edit`, two ghost buttons with no zone
structure, sitting between the stats strip and the grid.

## 4. The whiteboard top bar

**Owned by another branch.** `#wb-topbar` in `frontend/index.html` and
`frontend/whiteboard.js`. 17 controls at two heights (32/36) measured by
`docks.js`. Plan item 5 under "The work, surface by surface" has the
target: identity (back, board select, rename) left, search, the five menus
kept but at one height and one gap, minimap/Library/fullscreen as
utilities right, the map controls as a context chip plus a `Layout` menu.
Do not start it until that branch has merged.

## 5. `.sidebar-head`, and why it was left

**Files:** `frontend/index.html` (three rows: `#chat-sidebar` line ~1134,
`#sidebar` line ~523, the documents sidebar ~2172),
`frontend/css/05-sidebars-themes.css` line 17.

Not converted, and this is the reason: `.sidebar-head` carries
`min-height: var(--sidebar-toggle-size)`, a negative
`margin-top: calc(var(--sidebar-toggle-inset) - var(--card-pad-y))` that
brings the row up to meet the absolutely positioned collapse toggle, and
`padding-right: var(--sidebar-toggle-lane)` reserving that toggle's lane.
Two of those three exist because of reports: the three sidebar headings
rendering misaligned, and New-chat clashing with the collapse button.
Converting one of the three sidebars would reintroduce both.

Measured: the Chats head is already 36px, the same height the Chat
conversation header now is, which is what "one height" was asking for.

**If a future session does want them on the grammar,** the only safe route
is all three at once, with `.dock` gaining the three sidebar properties
behind a `.dock.is-sidebar` modifier, and `heads.js` run before and after to
prove the three headings still share one y.

## 6. Smaller things found, measured, and not fixed

- **The 44px primary at ≤720.** Every dock's one filled button measures
  44px on a phone against the row's 36px, from the app-wide
  `button.small { min-height: 44px; min-width: 44px }` in
  `frontend/css/02-chat-graph.css` line ~2334. It is a deliberate touch-target
  floor and it predates this phase; the ghost and icon-only controls beside it
  are 36. Either the floor should apply to all of them or to none, and
  deciding that is a Phase 9 (responsive by device) question, not a
  Phase 8 one. Do not "fix" it by capping the primary: that lowers a hit
  target below the accessibility guideline the rule cites.
- **Settings headings sit at two left edges**, 529px and 546px, measured
  across all seventeen sections with `setheads.js`. That is
  `.settings-group`'s own `padding: 1rem`
  (`frontend/css/04-chat-dock-appearance.css` line ~1543): a heading that
  heads a group starts at the group's content edge, one that heads a section
  starts at the section's. Two levels of nesting rather than drift, so it was
  left. If a session decides one edge is right, the change is to the twelve
  headings that are direct children of `.settings-section`, not to the rule.
- **"Advanced response settings"** sits 27px right of its siblings because it
  is inside a `<summary>` (`#sampling-box`, `frontend/index.html` ~line 5209)
  and the disclosure marker is in front of it. Structural. Fixing it means
  styling the marker, which is a `<details>` question, not a dock one.
- **`#library-media-refresh` is the boards landing's refresh button.** The id
  says "media" and the control reloads boards. It is wired in
  `frontend/whiteboard.js`. Renaming it is a two-file change with no user
  visible effect, so it was left; the brief said ids unchanged.

## 7. Things this sitting changed that a later session should know about

- `enhanceSelect` (`frontend/app.js`) now mirrors a `<select>`'s `hidden`
  class and attribute onto the shell it wraps it in. Two selects needed it
  (`#library-media-read`, `#update-version-select`); every other select in
  the app inherits it. If a select ever needs to be hidden while its
  stand-in stays visible, that is now impossible by construction, which is
  intended.
- `tests/test_dock_grammar.py` counts a filled button only when it is a
  **direct child of a zone**, matching `.dock > * > button` in the
  stylesheet. Keep the two definitions together: if the CSS selector ever
  deepens, the lint has to as well.
- `tests/test_chat_dock.py`'s `_block()` takes a regex now rather than a
  literal opening tag, because a locator that breaks when an element gains
  an unrelated class reports a false failure.
