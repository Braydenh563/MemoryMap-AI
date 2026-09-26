# Agent: the hole poke (INBOX 399 part 2, INBOX 403's menus)

Worktree `agent-a7af0a45a09105e9f`, cut from `fix/gemini-fixes-5`. Port 8813
(8803, the brief's port, was held by another agent's stale server whose
worktree is gone; left alone), data dir `/tmp/mm-agentH2`, seeded with
`seed.js`, `seed-notebook.sh`, `seed-boards.js`, `seed-links.js`,
`seed-images.js` and `seed-file.js`.

Surfaces covered: the chrome (top bar, status bar), every tab and every Notes
and Library sub-tab, an open document, a board and a mind map, and every
Settings pane, at 1440, 1024 and 390, light and dark where the sweep takes a
theme. The sweeps written for it, all in `scratchpad/ui-sweeps/`:

- `menus.js` (rewritten; the old one checked five menus' fill and radius):
  discovers every menu opener on every surface and measures width against
  content, clipping, row height and padding, one left column for icons,
  labels and section labels, groups past five rows, placement against the
  opener, and ArrowDown and Escape.
- `inkcentre.js`: every icon-only button photographed at 4x with its glyph
  painted red; the ink's box against the button's centre.
- `a11yname.js`: controls with no accessible name, and a Tab walk on every
  surface checking the focused control (or its frame) looks different.
- `deadclicks.js`: every safe button pressed once; a press that moves no DOM,
  no request, no focus, no URL and no toast is reported.
- `contrast.js` (fixed): it skipped translucent grounds and could not read
  `color(srgb ...)`, which hid real near-misses and invented a 1.00:1.

## Findings

| Surface | Finding | Measured | Severity | Fixed |
| --- | --- | --- | --- | --- |
| Every select, every Library card ⋯ | Opened with the focus on `body`: the escape-to-body move ran a tick after the focus landed on the first row | `document.activeElement` = body after open, 1440 | High (keyboard) | `a40fd1a` |
| Every select | ArrowDown did nothing: `wireMenuKeyboard` walked menuitems only, and a listbox has options | focus stayed on the chosen row | High (keyboard) | `a40fd1a` |
| Settings, any select | Escape closed the whole Settings window and left the open list floating over the page | menu visible, modal hidden | High | `a40fd1a` |
| 20+ dock menus (`details`), the board's five menus, space switcher, navigation history | No arrow keys at all: ArrowDown left the focus on the button | 258 findings before | High (keyboard) | `a40fd1a`, `3269004` |
| Document ⋯, editor toolbar menus | Escape did not close them (handler matched `.dock-menu` only) | menu still open | Medium | `a40fd1a` |
| Note row ⋯ | ArrowDown in the menu walked the note list instead and took the focus out of the menu | focus on `li` | Medium | `a40fd1a` |
| Selects named by a `<label for>` or `aria-labelledby` | Announced as "Choose an option" | Account's idle lock, Graph's colour | Medium (a11y) | `a40fd1a` |
| Navigation history | Opened 13px clear of its button (every other menu 4 to 6) | 13px | Low | `a40fd1a` |
| Space switcher, navigation history | Escape dropped the focus on `body` | body | Medium | `3269004` |
| Dock menus: Notes, Graph, Library, Reminders, Logs, document ⋯ | Section labels and selects 4.6px left of the command rows' icons | 4.6px | Medium (INBOX 403 alignment) | `8299318` |
| Selects with groups | Group names 4.6px left of their options | 4.6px | Low | `8299318` |
| The board's five menus | Group labels and control rows 12.4 to 13.3px left of the icons | 13.3px | Medium | `8299318` |
| Board Arrange, note ⋯ group rows, document ⋯ group rows | Labels after an icon on 3 x (the glyph's own width sets the column) | up to 5.7px | Medium | `8299318` |
| Note row ⋯ (10 rows), chat ⋯ (8), Library card ⋯ (7), Quick set (8) | Past five rows with no groups (DESIGN.md: grouped past five) | 0 separators | Medium | `3269004` |
| Reminders, Quick set | Opened 19px below its button with rows 8px apart, from the chip row it used to be | 19px, 392px list | Medium | `3269004` |
| Timeline, Options | Two sections both labelled "Show", no divider between them | 2 labels | Medium (IA) | `3269004` |
| Board, shape tool | No keyboard way into the shapes at all; `role="menu"` with no menuitems | nothing opened | High (keyboard) | `3269004`, `ee6289d` |
| Board, shapes (1024) | Escape did not close the shapes (the shared handler closes action menus only) | still open | Medium | `ee6289d` |
| Every phone action sheet (390) | Opened with the focus on the sheet's close button; the arrows went nowhere | 6 sheets | Low | `ee6289d` |
| Board View menu, phone (390, mind map) | `column-count: 1` under a height cap added a column beside the menu: Zoom drew at x 281 to 538 in a menu ending at 280 | scrolls sideways | High | `ee6289d` |
| Folded dock controls (1024, 390) | "Sort and view" label and folded controls 4.6 to 5.2px left of the rows | 5.2px | Low | `ee6289d` |
| Document, How to edit | 240px menu for 113px of rows | 2.1x | Low | `ee6289d` |
| Icon-only buttons, all surfaces | Glyph ink drawn high: mean 0.61px, 27 of 46 past half a pixel, worst 1.5px | 4x pixel capture | Low (INBOX 403 polish) | `ee6289d` (mean -0.19, 13 left) |
| Dashboard | Figures strip "0 day streak" and Streak widget "No streak yet" after an evening of notes; the journal's rule allows today to be empty and says 1 | 0 vs 1 | Medium (a stale number) | `7f09fd0` |
| Default palette, dark | Accent on its soft ground 3.98:1; muted on raised greys 3.76 to 4.34:1 | contrast.js | Medium (a11y) | `31ed25f` |
| Light | `--warn` on its chip 4.48:1 | contrast.js | Low | `31ed25f` |
| Dark | `--error` on a danger button's soft ground 4.21:1 | contrast.js | Low | `31ed25f` |
| contrast.js | Skipped translucent grounds, could not read `color(srgb)`; reported a legible image caption at 1.00:1 and missed the rows above | sweep bug | Medium (tooling) | `60db28a` |
| Board View menu, short desktop window (1024x480, mind map) | The same sideways columns as the phone: 1015px of columns in a 510px menu capped to 280px | scrollWidth 1015 vs 510 | High | `9470b06` (one scrolling column when it overflows) |
| Graph, More at 1024 | ArrowDown from the folded View's summary walked onto a Layout radio inside the closed View and stopped (a closed `details` keeps a layout box) | focus stuck | Medium | `9470b06` |

### Checked and clean

| Area | What was checked | Result |
| --- | --- | --- |
| Console and page errors | `errors.js` at 1440, 1024, 820, 390: every tab, sub-tab and Settings pane | 0 errors, 0 layout findings |
| Reduced motion | `reducedMotion: 'reduce'` context, every tab and Settings: animations over 60ms or infinite | none |
| Dead buttons | `deadclicks.js`: 133 safe buttons on 13 surfaces pressed once each (destructive and creating ones skipped) | 0 changed nothing |
| Accessible names and visible focus | `a11yname.js`: 14 surfaces, the chrome, the status bar, 7 Settings panes, 40 Tab presses each | 0 unnamed controls; 3 focus reports, all fields whose frame shows the focus (the sweep now reads the frame) |
| Touch targets (390) | `touch.js` | every control 44px or more; 4 "covered" were a toast over the Notes sub-tabs at boot (below) |
| Auth boundary | every one of the server's 327 OpenAPI operations called with no token | only `/health`, `/auth/status`, `/auth/setup` (refuses once a password exists: 400), `/auth/unlock`, `/auth/lock` (pops only the token it is given) and `/logs/client` (bounded, documented) answer |
| CSP | response headers on `/` | `script-src 'self'`, `style-src 'self'` (no inline), `object-src 'none'`, `frame-ancestors 'none'`, plus `X-Frame-Options: DENY`, `nosniff`, `no-referrer` |
| Path traversal | `/media/*`, `/media/{meta,text,pdf-info,pdf-page}/*`, `/files/exports/*`, `/backups/*`, `/static`, `/css`, with `..%2f`, `%2e%2e`, `....//` | every one 404 or 405; `delete_backup` also checks `Path(name).name` |
| Upload types | an SVG with `onload` and an HTML file to `/media/upload` | 415 both |
| Error detail | the global handler | "Internal error" with a reference id; the traceback stays in the log |
| Render paths | `test_no_innerhtml_interpolation.py`, `test_markdown_link_schemes.py` in the gate's lint set | pass |

## Remaining (found, not fixed, and why)

| Surface | Finding | Measured | Why not |
| --- | --- | --- | --- |
| Status bar | Back and history arrows' ink still 1.0px high after the nudge | inkcentre.js | Per-glyph shape (carets draw high in their em box); a per-glyph offset table is a design decision for DESIGN.md's icon section, not a sweep fix |
| Chat header, Timeline view switch, lock | Ink 0.63px high after the nudge | inkcentre.js | Same: glyph shape plus baseline rounding at fractional y |
| Phone (390), Notes | A boot toast covers the Notes sub-tabs for its few seconds | touch.js, elementFromPoint hits `div.toast` | A decision already made: INBOX 392 put toasts at the top below 1100 so nothing lands on the tab bar or the composer (10-responsive.css, "Nothing lands on the tab bar"). Transient, and not remade here |
| Board View menu | Right edges of control rows differ by their own inner padding (a ghost select's caret ends 12px before a switch) | 12px | Box edges already align (908px); aligning ink means reworking the ghost select's padding, a component change |
| Reminder rows | The ⋯ is ghost while +1h, tmrw and edit beside it are filled | visual | Mixed button weights in one cluster; the row's hover cluster is a design recipe question |
| Radio groups in menus (Graph layout) | ArrowDown changes the layout rather than walking the menu | by design | Native radio semantics; walking past them would break the control |
| Console | One "Failed to load resource: 404" during the contrast sweep | not in the server log | Not reproduced by a request-logging run over the same tabs |
