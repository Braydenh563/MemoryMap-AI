# Dock and bar audit, INBOX 478 and 479 (2026-10-04)

The owner: "polish and maximise ui/ux. I want no vibecoded tells. do an audit
of the layout for all page top or bottom dock bars and see if controls can be
better designed, structured, rearranged and more for all features", and "another
devibecode sweep and also another modernisation and proffessionalisation and
ui/ux design sweep".

Checklists used: unslop-ui (its scanner is still not on disk, only SKILL.md is
synced; `scratchpad/ui-sweeps/devibe.js` and `vibecheck.js` are the stand-ins),
ui-ux-pro-max (priorities 1, 2, 4, 5, 9), web-design-guidelines, apple-design
(section 16: familiarity, grouping and mapping, "things that look the same live
in the same place"), frontend-design (restraint), design-system (one token per
role). DESIGN.md overrides them for `frontend/`; where they disagree (Title
Case, bottom navigation of five) DESIGN.md wins.

## Method

- Base `0fa5a81`, server :8871, data `/tmp/mm-a871` seeded with
  `seed-showcase.py` (75 notes, 3 documents, a board, a map, 4 chats).
- `scratchpad/ui-sweeps/barinv479.js` (new, run by `barinv479.sh`): every bar
  on Dashboard, Notes and its four sub-tabs, Chat, Graph, Timeline, Reminders,
  Library and its eight sub-tabs, the documents editor (dock, formatting strip,
  status bar), the board and the map (top bar and tool rail), the Settings head,
  the Logs dock, the popup agent, the top bar and the status bar; at 1440, 1024,
  820 and 390 (390 with touch and a mobile context), light and dark. For each
  bar: its box, its rows, sideways scroll, and every visible control in DOM
  order with its zone, kind, size, glyph, words, radius, weight and font size.
  A `.seg`, a `.select-shell` and a `details` menu count once. 8 JSON files and
  about 600 strip and page screenshots; the 1440, 820 and 390 light pages and
  the 1440 dark pages were looked at.
- `scratchpad/ui-sweeps/dockseams.js` (new): zones that begin a wrapped line and
  still draw the hairline that separates them from the zone before.
- `scratchpad/ui-sweeps/graphcorner.js` (new): overlap of the graph's zoom
  stack, legend and minimap. 0 overlaps at 390 and 820; not a finding.
- A census of the inventory (`census.py` in the session scratchpad): distinct
  radius, weight, font size and height per kind of control across all bars.

The grammar every bar is judged against is UI_MODERNISATION_PLAN Phase 8's
(identity and count, find, narrow, order, view, then the one filled primary,
then refresh, help, more), plus DESIGN.md's dialog head (title, '?', icon
utilities at 32px, Close last), the tool rail (`.wb-rail`, one control height)
and the status bar's three zones.

## Findings, ranked by impact

Status: **fixed** (commit named in the CHANGELOG line) or **open** (with why).

1. **A wrapped dock line starts with a hairline.** Zones are separated by a
   `border-left` hairline (`.dock > * + *`, 08-consistency.css). When a zone
   wraps to a line of its own the hairline goes with it and stands at the start
   of the line with nothing to its left. Measured (`dockseams.js`): 7 docks at
   640 (Notes, Graph, Timeline, Library Documents, Boards & maps, Images and
   Files, Bookmarks), 3 at 768 and 820, 0 at 900 and up. Below 600 the phone
   rule already drops every hairline, and the Skills dock had a hand-made
   exception for its own case; the band between had nothing. **Fixed**
(after: 0 seams at 640, 768 and 820, the same 8 and 4 zones wrapping, so the
mark moved no wrap): a
   measured `data-line-start` on each wrapped zone (one ResizeObserver per
   dock) hides the hairline without changing the box, and a zone that starts at
   the dock's left edge is drawn on that edge.
2. **Settings' head was not on the dialog-head recipe.** Profile, guide, Back
   and Forward at 28x28 beside a 32x32 Close; the title an `h2` at the card's
   own voice rather than `.dialog-head-title`. Every other dialog head is 32px
   utilities (DESIGN.md, "A dialog's head"). **Planned**: the row is
   `.dialog-head`, the title `.dialog-head-title`, the four utilities
   `.dialog-head-btn`.
3. **The map's top bar showed a fact dressed as a pressed toggle.** `#wb-map-chip`
   ("Map") wore `.library-chip.active`, the filter chip's on state: a bordered,
   filled, bold box that reads as a button already pressed, and pressing it does
   nothing. It also says what the picker beside it already says ("Mind map ·
   Portugal trip"). A fact in a bar is `.dock-chip` (the Graph's "75 notes · 87
   links", the Timeline's "88 items · 54 days"). **Planned**: `.dock-chip`.
4. **The map's tool rail had three control heights.** Tools 36px, the '?' 32px,
   the layout picker 28px, in one row (the inventory read the rail as two rows
   because the tops differ). The rail recipe is one control height. **Planned**:
   the picker and the '?' take the tools' 36px.
5. **The wrapped tab strip was a full-width slab.** From 600 to 1199, when the
   seven tabs take a row of their own (`.tabs-wrapped`), the strip was
   `width: 100%`: at 820, a 788px tinted well with 430px of small captions in
   its middle and 180px of empty well either side. A well is drawn round what
   it holds everywhere else (the Notes and Library sub-tab strips, the segment).
   **Planned**: the wrapped strip hugs its tabs and is centred.
6. **Chat was the one tab whose dock had no help.** Every other tab dock ends
   refresh, help, more; Chat's '?' lived in the corner of the empty
   conversation (INBOX 236 moved it there) and is gone the moment a
   conversation has a message. **Open**: moving it is a change to an
   owner-placed control; recommended for INBOX: the same `data-help-for` button
   in `.dock-actions` before the ⋯, the empty state keeping none.
7. **The board picker truncates to its prefix at tablet widths.** At 820 the
   picker reads "Board · ..." (8rem cap below 76rem) with 104px of empty bar
   between it and the search button. **Planned**: the picker keeps its cap and may
   grow into the bar's free width up to its 14rem desktop width.
8. **Zoom controls differ between the graph and the board.** Graph: a vertical
   stack, Zoom in, Zoom out, Fit, Full screen, bottom right. Board and map: a
   horizontal pill, Zoom out, Fit, Zoom in, bottom right, with Full screen in the
   top bar. Each order is the convention for its orientation (a map's stack, a
   canvas's "- 100% +"). **Open**: one orientation for both is a design call
   (recommend the board's horizontal pill on all three canvases, Full screen
   last in it), with its own sweep (`graphphone.js`, `wbphone.js`).
9. **Four docks hold eight controls at 1440**, one over the grammar's seven:
   Notes (search, Filter, sort, view, Select, New note, '?', ⋯), Graph (Concept
   maps, search, View, New note, refresh, '?', gear, ⋯), Boards & maps (search,
   sort, view, New board, New mind map, refresh, '?', ⋯). All are one row at
   1440 and fold below 1100. **Open**: the Graph's gear (Display options) and
   View menu are two doors to view settings on the desktop (the phone already
   has one, the gear); folding View into the gear's panel is the strongest
   candidate. Boards & maps: one "New" with board and mind map inside, as the
   Library's All dock already does with "Create", is the other.
10. **The documents editor's dock is not on the `.dock` recipe.** Its icon
    utilities (view chevron, Focus, ⋯) are outlined squares, every `.dock`'s are
    borderless; its controls are 14.7px against 13.6px in every other dock; its
    segment radius is 8.8px against 4.8px. **Open**: DOCUMENTS_PLAN owns the
    editor chrome, and the outlines were added for a reported dark-mode
    visibility fault ("the kebab button is hard to see"); bringing it onto
    `.dock` needs that report re-measured in dark.
11. **Help parity across the Library sub-tabs.** '?' on Boards & maps, Images,
    Files, AI skills, Contents; none on All, Documents, Bookmarks. Refresh on
    six of eight. **Open**: low impact, needs help copy written.
12. **Files search announced as "Search the image gallery".** The Files sub-tab
    shares the Images dock and its search kept the gallery's accessible name.
    **Planned**: the name follows the sub-tab.
13. **Reminders has two "Add" buttons in one card**: the magic field's ghost
    "Add" and the form's filled "+ Add". **Open**: copy decision (recommend
    "Add" for the form, the wand alone with "Add from this sentence" on its
    title for the magic field).
14. **The Library sub-tab strip stays on screen over an open board or map**
    (38px of chrome, and the board's own Boards button already goes back).
    INBOX 476's decision; **open** there, not duplicated here.

15. **The Dashboard's two stacked ⋯ menus** (INBOX 488, the owner:
    "confusing to have the widget management stuff in the meatball menu button
    above the meatball menu button which covers the quick access"). The dock's
    ⋯ held doing (Continue, skills, Tools & features, Commands) and arranging
    (View, Widgets, Edit layout) in one list, and opened straight down over
    the Quick access row's own ⋯ (Customise, Reset to default) 52px below its
    button. **Fixed**: the dock is search | Customise, ⋯. Customise (a labelled
    ghost button, the `kebabMenu` recipe) holds View, Widgets, Edit layout,
    Edit quick access and Reset quick access in two groups; the ⋯ keeps the
    doing; the Quick access row has no menu of its own. Measured at 1440:
    Customise 129x32 at x=1245, its menu 200x196 under it; 0 menus in the
    Quick access row (was 1). At 390 Customise is its glyph, 44x44, beside
    the ⋯. The Guide's dashboard topic says the same.

Checked and consistent (no finding): one control height per dock at every width
(32px desktop, 44px touch); zone order on every `.dock`; one filled control per
dock; utilities in refresh, help, more order; the status bar's three zones at
1440, 1024 and 820; the Logs dock; the popup agent's head and foot; the graph's
corner at 390 and 820 (no overlap).

## Target layout per bar

`|` is the zone hairline. Bold is the one filled control.

- **Top bar**: mark, space · tabs (centred) · notifications, theme, settings |
  lock, quit. Unchanged. Wrapped (600 to 1199): the strip on its own row,
  hugging its tabs, centred (planned).
- **Status bar**: state | tools | control. Unchanged.
- **Dashboard**: find doorway | Customise, ⋯ (fixed, INBOX 488).
- **Notes**: All notes | search, Filter | sort, view | Select, **New note**, '?',
  ⋯. Target: Select into ⋯ (seven).
- **Notes, Write with Atlas**: title | model, **Draft**, Undo, '?', ⋯. Unchanged.
- **Notes, Capture**: the formatting strip (a toolbar, not a dock). Unchanged.
- **Chat**: thread title and facts | fork, compress, '?', ⋯ (target: '?' added).
  Composer: attach note, attach file, field, dictate, **Send**; second row:
  Skills, Web, Plan | model | Ask/Agent | gear. Unchanged.
- **Graph**: Graph and count | search | View | **New note**, refresh, '?', ⋯
  (target: the gear's options inside View; Concept maps stays an identity link).
- **Timeline**: Timeline and count | search, Kinds | view, Options | **Today**,
  '?'. Unchanged.
- **Reminders**: Your reminders | view | ⋯; status chips below. Unchanged.
- **Library (All)**: title | search, Filter | sort, view | **Create**, refresh, ⋯.
  Target: '?' added.
- **Library sub-tabs**: title | search, filter | sort, view | **New/Upload/Add**,
  refresh, '?', ⋯ on every one (target: help parity).
- **Boards & maps**: target **New** (board, mind map) in place of two buttons.
- **Documents editor**: Documents back, title | Saved | Edit/Read, chevron | AI
  edit | Focus, ⋯ (target: on `.dock`, borderless utilities).
- **Board top bar**: Boards, picker (grows, fixed) | find, overview | Insert,
  Edit, Arrange, View, Board | Library, full screen. Unchanged.
- **Map top bar**: Boards, picker, fact chip (planned) | find, overview | Edit,
  View, Board | Library, full screen.
- **Tool rail (board and map)**: one 36px height (planned for the map).
- **Settings head**: Settings | profile, guide, Back, Forward | Close, all 32px
  (planned).
- **Logs dock, popup agent**: unchanged.

## The de-vibe pass

Sweeps: `devibe.js` (ellipsis characters, straight quotes in the interface's
own copy, emoji used as icons, gradient text, glows on controls at rest,
capsule controls outside the named ones, clipped headings and controls) at 1440
and 390, and `vibecheck.js` (dead controls, leaked values, duplicate ids) on
every tab. Both clean on the base: `devibe.js` 0 findings at 1440 and at 390,
`vibecheck.js` 0 findings (no dead control, no leaked value, no duplicate id).
What a DOM sweep cannot see is below, from the census and the screenshots.

- **Radius, weight and size across every bar** (census over the 1440
  inventory): buttons 4.8px everywhere except the documents dock's segment
  (8.8px) and the round tools on the canvas rail (50%, the rail's own recipe);
  control font 13.6px everywhere except the documents dock (14.7px) and the doc
  status bar (11.2px, a status line); heights 32px on desktop docks, 28px in the
  status bar, 36px in the rail and the chat composer. One finding: the
  documents dock (item 10).
- **Things that shout**: the space switcher is the loudest control in the top
  bar (44px, 600, a bordered tinted face beside 36px tabs), louder than the
  selected tab. Open: Phase 8 asked for "a select-shaped control"; recommend
  the field face (`--field` ground, the 3:1 edge) at the tabs' height.
- **A fact dressed as a control**: the map chip (item 3, planned).
- **Gradients**: the page ground (`--page`) is a three-stop wash per theme, the
  only decorative gradient; unslop-ui's own data says mesh and wash grounds do
  not register as a tell. The app mark is a purple-to-blue tile: the 2024 tell
  by shape, but it is the product's mark, so it is listed, not changed.
- **Emoji as icons, gradient text, unprompted glow**: none (see the sweep).

## Appendix: every bar, control by control

From `barinv479.js`, light theme (dark has the same controls). "moved" means the
control is not in that bar at that width: folded into the ⋯ (below 1100 the
arrange zone, below 600 the `data-fold-narrow` actions), floated as the phone's
primary button, or relabelled (the phone's own names). The status bar's items
read as "filled" because they are `.status-item`, not the button ramp; the
formatting strips' toggles likewise.

### chrome: `#top-bar`

1440: 1440x64, 1 row, 13 controls · 1024: 1024x64, 1 row, 13 controls · 820: 820x124, 2 rows, 13 controls · 390: 390x58, 1 row, 6 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .space-switcher | ghost | 148x44 | circles-four | All spaces | 148x44 | moved | moved |
| 2 | #tab-bar | tab | 119x36 | layout | Dashboard | 77x44 | 77x44 | moved |
| 3 | #tab-bar | tab | 78x36 | note | Notes | 48x44 | 48x44 | moved |
| 4 | #tab-bar | tab | 69x36 | chat-circle | Chat | 44x44 | 44x44 | moved |
| 5 | #tab-bar | tab | 81x36 | graph | Graph | 50x44 | 50x44 | moved |
| 6 | #tab-bar | tab | 88x36 | books | Library | 55x44 | 55x44 | moved |
| 7 | #tab-bar | tab | 100x36 | clock-counter-clockwise | Timeline | 64x44 | 64x44 | moved |
| 8 | #tab-bar | tab | 117x36 | bell | Reminders | 76x44 | 76x44 | moved |
| 9 | .header-controls | icon | 44x44 | bell | Notifications | 44x44 | 44x44 | 44x44 |
| 10 | .header-controls | icon | 44x44 | moon | Switch to dark mode | 44x44 | 44x44 | moved |
| 11 | .header-controls | icon | 44x44 | gear | Settings | 44x44 | 44x44 | moved |
| 12 | .header-controls | icon | 44x44 | lock | Lock the app | 44x44 | 44x44 | moved |
| 13 | .header-controls | icon | 44x44 | power | Quit MemoryMap | 44x44 | 44x44 | moved |

### chrome: `#status-bar`

1440: 1440x37, 1 row, 12 controls · 1024: 1024x37, 1 row, 12 controls · 820: 820x37, 1 row, 11 controls · 390: not shown

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .status-zone | filled | 28x28 |  | AI status: Everything works  | 28x28 | 28x28 | - |
| 2 | .status-zone | filled | 95x28 | note-pencil | Your notebook: click to brow | 95x28 | moved | - |
| 3 | .status-zone | filled | 82x28 | check-circle | 8 open reminders | 82x28 | 46x28 | - |
| 4 | .status-zone | filled | 148x28 |  | Ctrl K Commands | 148x28 | moved | - |
| 5 | .status-zone | filled | 60x28 | magic-wand | Ask | 60x28 | 32x28 | - |
| 6 | .status-zone | filled | 73x28 | compass | Guide | 73x28 | 31x28 | - |
| 7 | .status-zone | filled | 63x28 | magnifying-glass | Find | 63x28 | 32x28 | - |
| 8 | .status-zone | icon | 28x28 | caret-left | Nothing to go back to | 28x28 | 28x28 | - |
| 9 | .status-zone | icon | 28x28 | caret-right | Nothing to go forward to | 28x28 | 28x28 | - |
| 10 | .status-zone | icon | 28x28 | caret-up | Navigation history | 28x28 | 28x28 | - |
| 11 | .status-zone | icon | 28x28 | arrow-u-up-left | Nothing to undo | 28x28 | 28x28 | - |
| 12 | .status-zone | icon | 28x28 | arrow-u-up-right | Nothing to redo | 28x28 | 28x28 | - |

### dashboard: `dashboard`

1440: 1408x50, 1 row, 2 controls · 1024: 999x50, 1 row, 2 controls · 820: 800x50, 1 row, 2 controls · 390: 364x62, 1 row, 2 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .dock-group.dock-find | ghost | 1335x32 | magnifying-glass | Search your notes, documents | 926x32 | 727x32 | 290x44 |
| 2 | .dock-actions | icon | 32x32 | dots-three | More actions | 32x32 | 32x32 | 44x44 |

### notes-browse: `notes`

1440: 1074x50, 1 row, 8 controls · 1024: 737x50, 1 row, 6 controls · 820: 540x90, 2 rows, 6 controls · 390: 364x114, 2 rows, 6 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .dock-group.dock-find | input.search | 293x32 |  | Filter notes. Supports tag:  | 289x32 | 360x32 | 283x44 |
| 2 | .dock-group.dock-find | menu | 92x32 | funnel-simple | Filter | 52x32 | 52x32 | 52x44 |
| 3 | .dock-group.dock-arrange | select | 144x32 | caret-down | Newest first Oldest first Re | moved | moved | moved |
| 4 | .dock-group.dock-arrange | seg(2) | 66x32 | list | How to show notes | moved | moved | moved |
| 5 | .dock-actions | ghost | 97x32 | check-square | Select | 44x32 | 44x32 | 44x44 |
| 6 | .dock-actions | filled | 120x32 | plus | New note | 120x32 | 120x32 | moved |
| 7 | .dock-actions | icon | 32x32 | question | What can I type here? | 32x32 | 32x32 | 44x44 |
| 8 | .dock-actions | menu.icon | 32x32 | dots-three | More | 32x32 | 32x32 | 44x44 |

### notes-browse: `#notes-subtabs`

1440: 1116x38, 1 row, 4 controls · 1024: 779x38, 1 row, 4 controls · 820: 582x38, 1 row, 4 controls · 390: 364x54, 1 row, 4 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | - | tab | 135x28 | books | Your notes | 135x28 | 135x28 | 135x44 |
| 2 | - | tab | 108x28 | pencil-simple | Capture | 108x28 | 108x28 | 108x44 |
| 3 | - | tab | 160x28 | magic-wand | Write with Atlas | 160x28 | 160x28 | 160x44 |
| 4 | - | tab | 78x28 | chat-circle | Ask | 78x28 | 78x28 | 78x44 |

### notes-capture: `#note-toolbar`

1440: 1072x44, 1 row, 12 controls · 1024: 735x44, 1 row, 12 controls · 820: 538x44, 1 row, 12 controls · 390: 328x104, 4 rows, 12 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | - | filled | 32x32 |  | B | 32x32 | 32x32 | 38x38 |
| 2 | - | filled | 32x32 |  | I | 32x32 | 32x32 | 38x38 |
| 3 | - | filled | 32x32 |  | S | 32x32 | 32x32 | 38x38 |
| 4 | - | filled | 49x32 |  | </> | 49x32 | 49x32 | 49x38 |
| 5 | - | icon | 32x32 | highlighter | Highlight | 32x32 | 32x32 | 32x44 |
| 6 | - | select | 45x32 | highlighter-circle | Highlight… Highlight… | 45x32 | 45x32 | 45x38 |
| 7 | - | select | 46x32 | text-a-underline | Text colour… Text colour… | 46x32 | 46x32 | 46x38 |
| 8 | - | icon | 32x32 | eraser | Remove highlight or colour | 32x32 | 32x32 | 32x44 |
| 9 | - | filled | 66x32 | list-bullets | List | 66x32 | 32x32 | 38x38 |
| 10 | - | filled | 73x32 | check-square | Task | 73x32 | 32x32 | 38x38 |
| 11 | - | icon | 32x32 | link | Link | 32x32 | 32x32 | 32x44 |
| 12 | - | filled | 90x32 | code | Source | 90x32 | 32x32 | 38x38 |

### notes-writing-room: `writing-room`

1440: 1074x50, 1 row, 5 controls · 1024: 737x50, 1 row, 5 controls · 820: 540x82, 1 row, 5 controls · 390: 330x146, 2 rows, 5 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .dock-actions | select | 224x32 | caret-down | Inherited: llama3.2 (not con | 224x32 | 224x32 | 224x44 |
| 2 | .dock-actions | filled | 93x32 | magic-wand | Draft | 93x32 | 93x32 | 93x44 |
| 3 | .dock-actions | ghost | 90x32 | arrow-counter-clockwise | Undo | 90x32 | 90x32 | 90x44 |
| 4 | .dock-actions | icon | 32x32 | question | What is this? | 32x32 | 32x32 | 44x44 |
| 5 | .dock-actions | menu.icon | 32x32 | dots-three | More | 32x32 | 32x32 | 44x44 |

### chat: `chat`

1440: 1050x50, 1 row, 3 controls · 1024: 753x50, 1 row, 3 controls · 820: 557x50, 1 row, 3 controls · 390: 364x62, 1 row, 4 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .dock-actions.chat-tool- | icon | 32x32 | git-branch | Fork this conversation | 32x32 | 32x32 | 44x44 |
| 2 | .dock-actions.chat-tool- | icon | 32x32 | arrows-in | Compress the earlier message | 32x32 | 32x32 | 44x44 |
| 3 | .dock-actions.chat-tool- | icon | 32x32 | dots-three | More actions for this conver | 32x32 | 32x32 | 44x44 |

### chat: `.row.chat-composer`

1440: 1032x40, 1 row, 4 controls · 1024: 735x40, 1 row, 4 controls · 820: 539x40, 1 row, 4 controls · 390: 346x48, 1 row, 2 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .note-picker | icon | 36x36 | note | Attach existing notes, docum | 36x36 | 36x36 | moved |
| 2 | - | icon | 36x36 | paperclip | Attach a file | 36x36 | 36x36 | moved |
| 3 | - | icon | 36x36 | microphone | Dictate your question | 36x36 | 36x36 | 44x44 |
| 4 | - | filled | 67x36 |  | Send | 67x36 | 67x36 | 67x44 |

### graph: `graph`

1440: 1390x47, 1 row, 8 controls · 1024: 981x47, 1 row, 7 controls · 820: 782x47, 1 row, 7 controls · 390: 350x111, 2 rows, 4 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .dock-identity | ghost | 157x32 | tree-structure | Concept maps | 43x32 | 43x32 | moved |
| 2 | .dock-group.dock-find | input.search | 208x32 |  | Highlight matching notes in  | 208x32 | 208x32 | 208x44 |
| 3 | .dock-group.dock-arrange | menu | 91x32 | eye | View | moved | moved | moved |
| 4 | .dock-actions | filled | 120x32 | plus | New note | 120x32 | 120x32 | moved |
| 5 | .dock-actions | icon | 32x32 | arrow-clockwise | Reload the map from your not | 32x32 | 32x32 | 44x44 |
| 6 | .dock-actions | icon | 32x32 | question | How to use this map | 32x32 | 32x32 | 44x44 |
| 7 | .dock-actions | icon | 32x32 | gear | Display options | 32x32 | 32x32 | 44x44 |
| 8 | .dock-actions | menu.icon | 32x32 | dots-three | More | 32x32 | 32x32 | moved |

### graph: `#graph-zoom`

1440: 34x130, 4 rows, 4 controls · 1024: 34x130, 4 rows, 4 controls · 820: 34x130, 4 rows, 4 controls · 390: 46x178, 4 rows, 4 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | - | icon | 32x32 | plus | Zoom in | 32x32 | 32x32 | 44x44 |
| 2 | - | icon | 32x32 | minus | Zoom out | 32x32 | 32x32 | 44x44 |
| 3 | - | icon | 32x32 | arrows-out | Fit map to view | 32x32 | 32x32 | 44x44 |
| 4 | - | icon | 32x32 | frame-corners | Full screen | 32x32 | 32x32 | 44x44 |

### timeline: `timeline`

1440: 1366x50, 1 row, 6 controls · 1024: 957x50, 1 row, 5 controls · 820: 758x90, 2 rows, 5 controls · 390: 330x114, 2 rows, 4 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .dock-group.dock-find | input.search | 448x32 |  | Find matching notes | 294x32 | 247x32 | 181x44 |
| 2 | .dock-group.dock-find | menu | 121x32 | funnel | Kinds: all | 121x32 | 121x32 | 121x44 |
| 3 | .dock-group.dock-arrange | seg(2) | 66x32 | list-dashes | Feed or table | moved | moved | moved |
| 4 | .dock-group.dock-arrange | menu | 110x32 | sliders-horizontal | Options | 110x32 | 110x32 | 110x44 |
| 5 | .dock-actions | filled | 92x32 | calendar-blank | Today | 92x32 | 92x32 | moved |
| 6 | .dock-actions | icon | 32x32 | question | How to read this | 32x32 | 32x32 | 44x44 |

### reminders: `reminders`

1440: 1366x50, 1 row, 2 controls · 1024: 957x50, 1 row, 2 controls · 820: 758x50, 1 row, 2 controls · 390: 330x62, 1 row, 1 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .dock-group.dock-arrange | seg(2) | 66x32 | list | List or calendar view | moved | moved | moved |
| 2 | .dock-actions | menu.icon | 32x32 | dots-three | More | 32x32 | 32x32 | 44x44 |

### library-all: `library`

1440: 1366x50, 1 row, 7 controls · 1024: 999x50, 1 row, 5 controls · 820: 800x50, 1 row, 5 controls · 390: 364x114, 2 rows, 4 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .dock-group.dock-find | input.search | 448x32 |  | Search the library | 448x32 | 401x32 | 243x44 |
| 2 | .dock-group.dock-find | menu | 92x32 | funnel-simple | Filter | 92x32 | 92x32 | 92x44 |
| 3 | .dock-group.dock-arrange | select | 144x32 | caret-down | Newest first Oldest first A– | moved | moved | moved |
| 4 | .dock-group.dock-arrange | seg(2) | 66x32 | squares-four | How to show the library | moved | moved | moved |
| 5 | .dock-actions | filled | 98x32 | plus | Create | 98x32 | 98x32 | moved |
| 6 | .dock-actions | icon | 32x32 | arrow-clockwise | Reload the list | 32x32 | 32x32 | 44x44 |
| 7 | .dock-actions | menu.icon | 32x32 | dots-three | More | 32x32 | 32x32 | 44x44 |

### library-all: `#library-subtabs`

1440: 1408x38, 1 row, 8 controls · 1024: 999x38, 1 row, 8 controls · 820: 800x38, 1 row, 8 controls · 390: 364x54, 1 row, 8 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | - | tab | 49x28 |  | All | 49x28 | 49x28 | 49x44 |
| 2 | - | tab | 110x28 |  | Documents | 110x28 | 110x28 | 110x44 |
| 3 | - | tab | 136x28 |  | Boards & maps | 136x28 | 136x28 | 136x44 |
| 4 | - | tab | 82x28 |  | Images | 82x28 | 82x28 | 82x44 |
| 5 | - | tab | 62x28 |  | Files | 62x28 | 62x28 | 62x44 |
| 6 | - | tab | 83x28 |  | AI skills | 83x28 | 83x28 | 83x44 |
| 7 | - | tab | 108x28 |  | Bookmarks | 108x28 | 108x28 | 108x44 |
| 8 | - | tab | 93x28 |  | Contents | 93x28 | 93x28 | 93x44 |

### library-documents: `library-docs`

1440: 1366x50, 1 row, 5 controls · 1024: 957x50, 1 row, 4 controls · 820: 758x50, 1 row, 4 controls · 390: 330x114, 2 rows, 4 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .dock-group.dock-find | input.search | 448x32 |  | Search documents by title or | 448x32 | 359x32 | 309x44 |
| 2 | .dock-group.dock-arrange | select | 144x32 | caret-down | Newest first Oldest first Ti | moved | moved | moved |
| 3 | .dock-actions | filled | 161x32 | plus | New document | 161x32 | 161x32 | 161x44 |
| 4 | .dock-actions | icon | 32x32 | arrow-clockwise | Reload the list | 32x32 | 32x32 | 44x44 |
| 5 | .dock-actions | menu.icon | 32x32 | dots-three | More | 32x32 | 32x32 | 44x44 |

### library-boards-maps: `library-boards`

1440: 1366x50, 1 row, 8 controls · 1024: 957x50, 1 row, 6 controls · 820: 758x90, 2 rows, 6 controls · 390: 330x114, 2 rows, 4 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .dock-group.dock-find | input.search | 448x32 |  | Search boards by title | 348x32 | 448x32 | 309x44 |
| 2 | .dock-group.dock-arrange | select | 144x32 | caret-down | Newest first Oldest first Ti | moved | moved | moved |
| 3 | .dock-group.dock-arrange | seg(2) | 66x32 | squares-four | How to show boards | moved | moved | moved |
| 4 | .dock-actions | filled | 130x32 | plus | New board | 130x32 | 130x32 | 44x44 |
| 5 | .dock-actions | ghost | 163x32 | tree-structure | New mind map | 163x32 | 163x32 | moved |
| 6 | .dock-actions | icon | 32x32 | arrow-clockwise | Reload | 32x32 | 32x32 | moved |
| 7 | .dock-actions | icon | 32x32 | question | What is this? | 32x32 | 32x32 | 44x44 |
| 8 | .dock-actions | menu.icon | 32x32 | dots-three | More | 32x32 | 32x32 | 44x44 |

### library-images: `library-media`

1440: 1366x50, 1 row, 6 controls · 1024: 957x50, 1 row, 6 controls · 820: 758x50, 1 row, 6 controls · 390: 330x114, 2 rows, 6 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .dock-group.dock-find | input.search | 448x32 |  | Search the image gallery | 448x32 | 290x32 | 181x44 |
| 2 | .dock-group.dock-find | menu | 121x32 | funnel | Kinds: all | 121x32 | 121x32 | 121x44 |
| 3 | .dock-group.dock-arrange | select | 144x32 | caret-down | Newest first Oldest first Na | moved | moved | moved |
| 4 | .dock-actions | filled | 102x32 | upload-simple | Upload | 102x32 | 102x32 | 102x44 |
| 5 | .dock-actions | icon | 32x32 | arrow-clockwise | Reload | 32x32 | 32x32 | 44x44 |
| 6 | .dock-actions | icon | 32x32 | question | What is this? | 32x32 | 32x32 | 44x44 |

### library-files: `library-media`

1440: 1366x50, 1 row, 7 controls · 1024: 957x50, 1 row, 6 controls · 820: 758x50, 1 row, 6 controls · 390: 330x114, 2 rows, 6 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .dock-group.dock-find | input.search | 448x32 |  | Search the image gallery | 448x32 | 289x32 | 157x44 |
| 2 | .dock-group.dock-find | select | 144x32 | caret-down | Read or not Read Not read ye | 144x32 | 144x32 | 144x44 |
| 3 | .dock-group.dock-arrange | select | 144x32 | caret-down | Newest first Oldest first Na | moved | moved | moved |
| 4 | .dock-group.dock-arrange | seg(2) | 66x32 | image | How to show files | moved | moved | moved |
| 5 | .dock-actions | filled | 102x32 | upload-simple | Upload | 102x32 | 102x32 | 102x44 |
| 6 | .dock-actions | icon | 32x32 | arrow-clockwise | Reload | 32x32 | 32x32 | 44x44 |
| 7 | .dock-actions | icon | 32x32 | question | What is this? | 32x32 | 32x32 | 44x44 |

### library-ai-skills: `library-skills`

1440: 1050x50, 1 row, 5 controls · 1024: 749x90, 2 rows, 5 controls · 820: 550x90, 2 rows, 5 controls · 390: 330x218, 4 rows, 6 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .dock-group.dock-find | input.search | 273x32 |  | Search your skills | 448x32 | 263x32 | 309x44 |
| 2 | .dock-group.dock-arrange | seg(3) | 318x32 | stack | Which skills to show | 318x32 | 318x32 | 309x44 |
| 3 | .dock-group.dock-arrange | select | 144x32 | caret-down | Yours first Name A → Z Recen | 144x32 | 144x32 | 132x44 |
| 4 | .dock-actions | filled | 116x32 | plus | New skill | 116x32 | 116x32 | 116x44 |
| 5 | .dock-actions | icon | 32x32 | question | What is this? | 32x32 | 32x32 | 44x44 |

### library-bookmarks: `library-links`

1440: 1366x50, 1 row, 4 controls · 1024: 957x50, 1 row, 3 controls · 820: 758x50, 1 row, 3 controls · 390: 330x114, 2 rows, 3 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .dock-group.dock-find | input.search | 448x32 |  | Search saved bookmarks | 448x32 | 399x32 | 309x44 |
| 2 | .dock-group.dock-arrange | select | 144x32 | caret-down | Newest first Oldest first Ti | moved | moved | moved |
| 3 | .dock-actions | filled | 158x32 | plus | Add bookmark | 158x32 | 158x32 | 158x44 |
| 4 | .dock-actions | menu.icon | 32x32 | dots-three | More | 32x32 | 32x32 | 44x44 |

### library-contents: `library-contents`

1440: 1366x50, 1 row, 5 controls · 1024: 957x50, 1 row, 4 controls · 820: 758x50, 1 row, 4 controls · 390: 330x114, 2 rows, 4 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .dock-group.dock-find | input.search | 448x32 |  | Filter the index by title | 448x32 | 448x32 | 309x44 |
| 2 | .dock-group.dock-arrange | seg(4) | 458x32 | folders | How to group the index | moved | moved | moved |
| 3 | .dock-actions | icon | 32x32 | arrow-clockwise | Reload | 32x32 | 32x32 | 44x44 |
| 4 | .dock-actions | icon | 32x32 | question | What is this page? | 32x32 | 32x32 | 44x44 |
| 5 | .dock-actions | menu.icon | 32x32 | dots-three | More | 32x32 | 32x32 | 44x44 |

### library-contents: `#contents-mode`

1440: 458x32, 1 row, 4 controls · 1024: not shown · 820: not shown · 390: not shown

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | - | tab | 129x24 | folders | By category | - | - | - |
| 2 | - | tab | 92x24 | tag | By tag | - | - | - |
| 3 | - | tab | 114x24 | calendar-blank | By month | - | - | - |
| 4 | - | tab | 108x24 | folder-open | By folder | - | - | - |

### documents: `.row.space-between.doc-dock`

1440: 1090x32, 1 row, 7 controls · 1024: 749x32, 1 row, 7 controls · 820: 550x70, 2 rows, 7 controls · 390: 330x94, 4 rows, 8 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .doc-dock-identity | ghost | 125x32 | caret-left | Back to your documents in th | 125x32 | 125x32 | 44x44 |
| 2 | .doc-dock-identity | input.text | 473x32 |  | Document title | 133x32 | 411x32 | 222x32 |
| 3 | .row.doc-actions | seg(2) | 167x32 | pencil-simple | How to view this document | 167x32 | 167x32 | 136x32 |
| 4 | .row.doc-actions | menu.icon | 32x32 | caret-down | How to edit | 32x32 | 32x32 | 44x44 |
| 5 | .row.doc-actions | ghost | 99x32 | magic-wand | AI edit | 99x32 | 99x32 | 44x44 |
| 6 | .row.doc-actions | icon | 32x32 | corners-out | Focus mode: hide everything  | 32x32 | 32x32 | 44x44 |
| 7 | .row.doc-actions | menu | 32x32 | dots-three | More actions for this docume | 32x32 | 32x32 | 44x44 |

### documents: `#doc-statusbar`

1440: 1090x38, 1 row, 2 controls · 1024: 749x38, 1 row, 2 controls · 820: 550x38, 1 row, 2 controls · 390: 330x54, 1 row, 2 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | - | filled | 88x28 | flag | Set a goal | 88x28 | 88x28 | 88x44 |
| 2 | - | filled | 118x28 | eyeglasses | No suggestions | 118x28 | 118x28 | 118x44 |

### documents-format: `#doc-toolbar`

1440: 1090x83, 2 rows, 26 controls · 1024: 749x83, 2 rows, 24 controls · 820: 550x119, 3 rows, 26 controls · 390: 330x59, 1 row, 6 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | - | filled | 40x32 |  | H1 | 40x32 | 40x32 | 40x38 |
| 2 | - | filled | 40x32 |  | H2 | 40x32 | 40x32 | 40x38 |
| 3 | - | filled | 40x32 |  | H3 | 40x32 | 40x32 | 40x38 |
| 4 | - | filled | 32x32 |  | B | 32x32 | 32x32 | moved |
| 5 | - | filled | 32x32 |  | I | 32x32 | 32x32 | moved |
| 6 | - | filled | 32x32 |  | S | 32x32 | 32x32 | moved |
| 7 | - | filled | 49x32 |  | </> | 49x32 | 49x32 | moved |
| 8 | - | filled | 66x32 | list-bullets | List | 66x32 | 66x32 | moved |
| 9 | - | filled | 115x32 | list-numbers | Numbered | 115x32 | 115x32 | moved |
| 10 | - | filled | 73x32 | check-square | Task | 73x32 | 73x32 | moved |
| 11 | - | icon | 32x32 | link | Link | 32x32 | 32x32 | moved |
| 12 | - | menu | 115x32 | highlighter | Highlight, colour and commen | 115x32 | 115x32 | moved |
| 13 | - | menu | 93x32 | plus-square | Insert a block | 93x32 | 93x32 | moved |
| 14 | - | icon | 32x32 | magnifying-glass | Find and replace (Ctrl+F) | 32x32 | 32x32 | moved |
| 15 | - | icon | 32x32 | arrows-out-line-horizontal | Use the full width of the pa | 32x32 | 32x32 | moved |
| 16 | - | filled | 37x32 | text-outdent | Outdent | 37x32 | 37x32 | moved |
| 17 | - | filled | 37x32 | text-indent | Indent | 37x32 | 37x32 | moved |
| 18 | - | filled | 37x32 | arrow-counter-clockwise | Undo (Ctrl+Z) | 37x32 | 37x32 | moved |
| 19 | - | filled | 37x32 | arrow-clockwise | Redo (Ctrl+Shift+Z) | 37x32 | 37x32 | moved |
| 20 | - | menu | 47x32 | text-h | Heading: Headings, from titl | 47x32 | 47x32 | moved |
| 21 | - | menu | 46x32 | quotes | Block: Quotes, callouts, cod | 46x32 | 46x32 | moved |
| 22 | - | menu | 47x32 | text-superscript | More: Underline, superscript | 47x32 | 47x32 | moved |
| 23 | - | menu | 46x32 | plus-circle | Insert: Links, images and no | 46x32 | 46x32 | moved |
| 24 | .doc-toolbar-tools | icon | 32x32 | arrows-left-right | Fit the toolbar on one row,  | moved | 32x32 | moved |
| 25 | .doc-toolbar-tools | icon | 32x32 | list-numbers | Show line numbers | 32x32 | 32x32 | 44x44 |
| 26 | .doc-toolbar-tools | icon | 32x32 | caret-up | Hide the formatting tools | moved | 32x32 | 44x44 |

### board: `#wb-topbar`

1440: 1392x42, 1 row, 11 controls · 1024: 983x42, 1 row, 11 controls · 820: 784x42, 1 row, 11 controls · 390: 348x104, 2 rows, 7 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .wb-topbar-left | ghost | 103x32 | arrow-left | Boards | 103x32 | 103x32 | 95x44 |
| 2 | .wb-topbar-left | select | 336x32 | caret-down | Mind map · Portugal trip (18 | 128x32 | 128x32 | 128x44 |
| 3 | .wb-topbar-right | icon | 32x32 | magnifying-glass | Find a card on this board | 32x32 | 32x32 | moved |
| 4 | .wb-topbar-right | icon | 32x32 | map-trifold | Board overview (Shift+N) | 32x32 | 32x32 | moved |
| 5 | .wb-topbar-right | ghost | 75x32 | plus-square | Insert | 75x32 | moved | moved |
| 6 | .wb-topbar-right | ghost | 60x32 | pencil-simple | Edit | 60x32 | moved | moved |
| 7 | .wb-topbar-right | ghost | 92x32 | stack | Arrange | 92x32 | moved | moved |
| 8 | .wb-topbar-right | ghost | 67x32 | eye | View | 67x32 | moved | moved |
| 9 | .wb-topbar-right | ghost | 75x32 | squares-four | Board | 75x32 | moved | moved |
| 10 | .wb-topbar-right | ghost | 104x32 | note-pencil | Library | moved | moved | moved |
| 11 | .wb-topbar-right | icon | 32x32 | arrows-out | Toggle full screen | 32x32 | 32x32 | moved |

### board: `#wb-tools-panel`

1440: 701x46, 1 row, 17 controls · 1024: 701x46, 1 row, 17 controls · 820: 506x86, 2 rows, 17 controls · 390: 364x53, 1 row, 1 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | #wb-tool-group | icon | 36x36 |  | Select (V) | 36x36 | 36x36 | 125x44 |
| 2 | #wb-tool-group | icon | 36x36 |  | Hand (H) | 36x36 | 36x36 | moved |
| 3 | #wb-tool-group | icon | 36x36 |  | Lasso select (K) | 36x36 | 36x36 | moved |
| 4 | #wb-tool-group | icon | 36x36 |  | Pen (P) | 36x36 | 36x36 | moved |
| 5 | #wb-tool-group | icon | 36x36 |  | Highlighter (M) | 36x36 | 36x36 | moved |
| 6 | #wb-tool-group | icon | 36x36 |  | Eraser (E) | 36x36 | 36x36 | moved |
| 7 | #wb-tool-group | icon | 36x36 |  | Fill (B) | 36x36 | 36x36 | moved |
| 8 | #wb-tool-group | icon | 36x36 |  | Shapes (L/A/R/O/G/D) | 36x36 | 36x36 | moved |
| 9 | #wb-tool-group | icon | 36x36 |  | Sticky note (N) | 36x36 | 36x36 | moved |
| 10 | #wb-tool-group | icon | 36x36 |  | Text box (T) | 36x36 | 36x36 | moved |
| 11 | #wb-tool-group | icon | 36x36 |  | Upload an image onto the boa | 36x36 | 36x36 | moved |
| 12 | #wb-tool-group | icon | 36x36 |  | Straight link (C) | 36x36 | 36x36 | moved |
| 13 | #wb-tool-group | icon | 36x36 |  | Curved link (Shift+C) | 36x36 | 36x36 | moved |
| 14 | #wb-tool-group | icon | 36x36 |  | Delete (X) | 36x36 | 36x36 | moved |
| 15 | #wb-tool-group | icon | 36x36 |  | Undo (Ctrl+Z) | 36x36 | 36x36 | moved |
| 16 | #wb-tool-group | icon | 36x36 |  | Redo (Ctrl+Y) | 36x36 | 36x36 | moved |
| 17 | #wb-tool-group | input.color | 36x36 |  | Ink colour | 36x36 | 36x36 | moved |

### map: `#wb-topbar`

1440: 1392x42, 1 row, 9 controls · 1024: 983x42, 1 row, 9 controls · 820: 784x42, 1 row, 9 controls · 390: 348x104, 2 rows, 6 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .wb-topbar-left | ghost | 103x32 | arrow-left | Boards | 103x32 | 103x32 | 95x44 |
| 2 | .wb-topbar-left | select | 304x32 | caret-down | Mind map · Portugal trip (18 | 128x32 | 128x32 | 128x44 |
| 3 | .wb-topbar-right | icon | 32x32 | magnifying-glass | Find a card on this board | 32x32 | 32x32 | moved |
| 4 | .wb-topbar-right | icon | 32x32 | map-trifold | Board overview (Shift+N) | 32x32 | 32x32 | moved |
| 5 | .wb-topbar-right | ghost | 60x32 | pencil-simple | Edit | 60x32 | moved | moved |
| 6 | .wb-topbar-right | ghost | 67x32 | eye | View | 67x32 | moved | moved |
| 7 | .wb-topbar-right | ghost | 75x32 | squares-four | Board | 75x32 | moved | moved |
| 8 | .wb-topbar-right | ghost | 104x32 | note-pencil | Library | moved | moved | moved |
| 9 | .wb-topbar-right | icon | 32x32 | arrows-out | Toggle full screen | 32x32 | 32x32 | moved |

### map: `#wb-tools-panel`

1440: 614x46, 2 rows, 12 controls · 1024: 614x46, 2 rows, 12 controls · 820: 506x86, 2 rows, 12 controls · 390: 364x53, 1 row, 1 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | #wb-tool-group | icon | 36x36 |  | Select (V) | 36x36 | 36x36 | 125x44 |
| 2 | #wb-tool-group | icon | 36x36 |  | Hand (H) | 36x36 | 36x36 | moved |
| 3 | #wb-tool-group | icon | 36x36 |  | Lasso select (K) | 36x36 | 36x36 | moved |
| 4 | #wb-tool-group | icon | 36x36 | plus-square | Add a top-level topic | 36x36 | 36x36 | moved |
| 5 | #wb-tool-group | icon | 36x36 | crosshair | Show this branch and its nei | 36x36 | 36x36 | moved |
| 6 | #wb-tool-group | icon | 32x32 | question | Where the map's controls liv | 32x32 | 32x32 | moved |
| 7 | #wb-tool-group | select | 157x28 | caret-down | Tree, to the right Tree, to  | 157x28 | 157x28 | moved |
| 8 | #wb-tool-group | icon | 36x36 | broom | Lay every unpinned node out  | 36x36 | 36x36 | moved |
| 9 | #wb-tool-group | icon | 36x36 |  | Cross-link (C) | 36x36 | 36x36 | moved |
| 10 | #wb-tool-group | icon | 36x36 |  | Delete (X) | 36x36 | 36x36 | moved |
| 11 | #wb-tool-group | icon | 36x36 |  | Undo (Ctrl+Z) | 36x36 | 36x36 | moved |
| 12 | #wb-tool-group | icon | 36x36 |  | Redo (Ctrl+Y) | 36x36 | 36x36 | moved |

### settings: `.row.space-between`

1440: 982x32, 1 row, 5 controls · 1024: 934x32, 1 row, 5 controls · 820: 730x32, 1 row, 5 controls · 390: 308x44, 1 row, 2 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .row | icon | 28x28 |  | Your profile | 28x28 | 28x28 | moved |
| 2 | .row | icon | 28x28 | question | Ask Atlas how this app works | 28x28 | 28x28 | 44x44 |
| 3 | .row | icon | 28x28 | caret-left | Back to Library: Portugal tr | 28x28 | 28x28 | moved |
| 4 | .row | icon | 28x28 | caret-right | Nothing to go forward to | 28x28 | 28x28 | moved |
| 5 | .row | icon | 32x32 | x | Close | 32x32 | 32x32 | 44x44 |

### settings-logs: `settings-logs`

1440: 728x50, 1 row, 4 controls · 1024: 680x50, 1 row, 3 controls · 820: 476x90, 2 rows, 3 controls · 390: 302x114, 2 rows, 3 controls

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .dock-group.dock-find | input.search | 285x32 |  | Only show records containing | 323x32 | 346x32 | 280x44 |
| 2 | .dock-group.dock-arrange | seg(2) | 66x32 | list | List or terminal view | moved | moved | moved |
| 3 | .dock-actions | filled | 167x32 | download-simple | Support bundle | 167x32 | 167x32 | 167x44 |
| 4 | .dock-actions | menu.icon | 32x32 | dots-three | More | 32x32 | 32x32 | 44x44 |

### popup-agent: `.row.space-between.command-palette-head`

1440: 598x42, 1 row, 2 controls · 1024: 598x42, 1 row, 2 controls · 820: 598x42, 1 row, 2 controls · 390: not shown

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | .row.help-head | icon | 32x32 | question | About the agent | 32x32 | 32x32 | - |
| 2 | .dialog-head-actions | icon | 32x32 | x | Close | 32x32 | 32x32 | - |

### popup-agent: `.command-palette-foot`

1440: 598x49, 2 rows, 2 controls · 1024: 598x49, 2 rows, 2 controls · 820: 598x49, 2 rows, 2 controls · 390: not shown

| # | Zone | Kind | 1440 size | Glyph | Label | 1024 | 820 | 390 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | #command-palette-use-not | input.checkbox | 32x18 |  |  | 32x18 | 32x18 | - |
| 2 | #command-palette-menu | icon | 28x28 | dots-three | More actions for this conver | 28x28 | 28x28 | - |

